import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIES } from '../data/categories';
import { VENDORS } from '../data/vendors';
import type { VendorDoc } from './onboarding';

/* ---------------- Commission (CATEGORY-LEVEL ONLY) ---------------- */

export interface CommissionChange { at: string; by: string; from: number; to: number; effective: string; reason: string }
export interface CommissionState { pct: number; scheduled?: { pct: number; effective: string; reason: string; by: string }; history: CommissionChange[] }

/* ---------------- Coupons / discounts ---------------- */

export interface Coupon {
  id: string;
  kind: 'Vendor discount' | 'Platform coupon';
  title: string;
  code?: string;
  vendorId?: string;
  productId?: string;
  pct?: number;
  flat?: number;
  maxDiscount?: number;
  minOrder?: number;
  from: string;
  to: string;
  fundedBy: 'Vendor' | 'TrimNova' | 'Co-funded (split TBD)';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paused';
  reason?: string;
  createdAt: string;
  createdBy: string;
}

/* ---------------- Vendor administration ---------------- */

export interface Applicant { id: string; name: string; city: string; state: string; gstin: string; submittedAt: string; docs: VendorDoc[] }
export interface VendorEvent { at: string; by: string; action: string; reason: string }

const t = (s: string) => `${s}+05:30`;
const AP = 'Kavya Iyer (AP-1042)';

const SEED_COUPONS: Coupon[] = [
  { id: 'DSC-2026-031', kind: 'Vendor discount', title: '5% off #5 Metal Zipper (December)', vendorId: 'VN-61873', productId: 'P-2008', pct: 5, from: '2026-12-01', to: '2026-12-31', fundedBy: 'Vendor', status: 'Pending', createdAt: t('2026-11-22T17:05:00'), createdBy: 'ZipKing International' },
  { id: 'DSC-2026-033', kind: 'Vendor discount', title: '8% off Printed Satin Care Labels', vendorId: 'VN-89420', productId: 'P-1002', pct: 8, from: '2026-12-05', to: '2027-01-05', fundedBy: 'Vendor', status: 'Pending', createdAt: t('2026-11-25T10:00:00'), createdBy: 'NovaTex Manufacturing' },
  { id: 'DSC-2026-027', kind: 'Vendor discount', title: '3% off Non-Woven Fusible Interlining', vendorId: 'VN-47219', productId: 'P-2003', pct: 3, from: '2026-11-01', to: '2026-12-15', fundedBy: 'Vendor', status: 'Approved', createdAt: t('2026-10-28T10:00:00'), createdBy: 'FuseRight Textiles' },
  { id: 'CPN-2026-012', kind: 'Platform coupon', title: 'First procurement order', code: 'TRIMFIRST10', pct: 10, maxDiscount: 2000, minOrder: 5000, from: '2026-10-01', to: '2026-12-31', fundedBy: 'TrimNova', status: 'Approved', createdAt: t('2026-09-25T10:00:00'), createdBy: 'Arjun Kapoor (ROOT-01)' },
  { id: 'CPN-2026-009', kind: 'Platform coupon', title: 'Festive packaging week', code: 'PACK500', flat: 500, minOrder: 20000, from: '2026-10-15', to: '2026-11-05', fundedBy: 'TrimNova', status: 'Paused', createdAt: t('2026-10-10T10:00:00'), createdBy: 'Arjun Kapoor (ROOT-01)' },
];

const SEED_APPLICANTS: Applicant[] = [
  {
    id: 'VN-91207', name: 'Kalpana Elastics Pvt Ltd', city: 'Surat', state: 'Gujarat', gstin: '24AAGCK3381N1Z5', submittedAt: t('2026-11-23T14:10:00'),
    docs: [
      { id: 'KE-GST', kind: 'GST', title: 'GST Registration Certificate', number: '24AAGCK3381N1Z5', required: true, versions: [{ v: 1, fileName: 'GST portal record', uploadedAt: t('2026-11-23T14:00:00'), status: 'Approved', decidedBy: AP, decidedAt: t('2026-11-24T10:00:00') }] },
      { id: 'KE-PAN', kind: 'PAN', title: 'PAN (Company)', number: 'AAGCK3381N', required: true, versions: [{ v: 1, fileName: 'NSDL PAN record', uploadedAt: t('2026-11-23T14:01:00'), status: 'Approved', decidedBy: AP, decidedAt: t('2026-11-24T10:00:00') }] },
      { id: 'KE-OEKO', kind: 'CERT', title: 'OEKO-TEX Standard 100 Certificate', certType: 'OEKO-TEX Standard 100', number: 'SH026 10045', required: true, versions: [{ v: 1, fileName: 'OEKO_10045.pdf', uploadedAt: t('2026-11-23T14:05:00'), status: 'On Hold', issueDate: '2026-06-01', expiryDate: '2027-05-31', reason: 'Scope page missing.', decidedBy: AP, decidedAt: t('2026-11-24T10:05:00') }] },
      { id: 'KE-BANK', kind: 'BANK', title: 'Cancelled Cheque', number: 'ICICI ••2207', required: true, versions: [{ v: 1, fileName: 'cheque.jpg', uploadedAt: t('2026-11-23T14:09:00'), status: 'Approved', decidedBy: AP, decidedAt: t('2026-11-24T10:00:00') }] },
    ],
  },
];

interface State {
  commission: Record<string, CommissionState>;
  coupons: Coupon[];
  vendorStatus: Record<string, 'Active' | 'Frozen'>;
  vendorEvents: Record<string, VendorEvent[]>;
  applicants: Applicant[];
  notified: Record<string, string>; // key → ISO of last reminder
}

const initial = (): State => ({
  commission: Object.fromEntries(CATEGORIES.map((c) => [c.id, { pct: c.commission, history: [] }])),
  coupons: SEED_COUPONS,
  vendorStatus: Object.fromEntries(VENDORS.map((v) => [v.id, v.status === 'Frozen' ? 'Frozen' : 'Active'])),
  vendorEvents: { 'VN-70334': [{ at: t('2026-08-02T12:00:00'), by: 'Arjun Kapoor (ROOT-01)', action: 'Reactivated', reason: 'Shade-matching process audit passed.' }] },
  applicants: SEED_APPLICANTS,
  notified: {},
});

interface Ctx extends State {
  /** Schedule (or immediately apply, if effective ≤ today) a category commission change. */
  setCommission: (categoryId: string, pct: number, effective: string, reason: string, by: string) => void;
  cancelScheduled: (categoryId: string) => void;
  upsertCoupon: (c: Coupon) => void;
  setVendorStatus: (vendorId: string, status: 'Active' | 'Frozen', reason: string, by: string) => void;
  activateApplicant: (id: string, by: string) => void;
  markNotified: (key: string) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.admin.v1';
const today = () => new Date().toISOString().slice(0, 10);

/** Mirror admin state into the shared reference data so pricing and gates pick it up. */
function applyToReference(s: State) {
  CATEGORIES.forEach((c) => { const st = s.commission[c.id]; if (st) c.commission = st.pct; });
  VENDORS.forEach((v) => { const st = s.vendorStatus[v.id]; if (st) v.status = st; });
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => {
    try { const r = localStorage.getItem(KEY); return r ? { ...initial(), ...JSON.parse(r) } : initial(); } catch { return initial(); }
  });

  // Promote scheduled changes whose effective date has arrived.
  useEffect(() => {
    const due = Object.entries(s.commission).filter(([, v]) => v.scheduled && v.scheduled.effective <= today());
    if (!due.length) return;
    setS((st) => {
      const commission = { ...st.commission };
      due.forEach(([id, v]) => {
        const sc = v.scheduled!;
        commission[id] = { pct: sc.pct, history: [...v.history, { at: new Date().toISOString(), by: sc.by, from: v.pct, to: sc.pct, effective: sc.effective, reason: sc.reason }] };
      });
      return { ...st, commission };
    });
  }, [s.commission]);

  useEffect(() => { applyToReference(s); localStorage.setItem(KEY, JSON.stringify(s)); }, [s]);
  // Apply once synchronously on first render too.
  useMemo(() => applyToReference(s), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCommission = useCallback((categoryId: string, pct: number, effective: string, reason: string, by: string) => setS((st) => {
    const cur = st.commission[categoryId];
    if (effective <= today()) {
      return { ...st, commission: { ...st.commission, [categoryId]: { pct, history: [...cur.history, { at: new Date().toISOString(), by, from: cur.pct, to: pct, effective, reason }] } } };
    }
    return { ...st, commission: { ...st.commission, [categoryId]: { ...cur, scheduled: { pct, effective, reason, by } } } };
  }), []);
  const cancelScheduled = useCallback((categoryId: string) => setS((st) => ({ ...st, commission: { ...st.commission, [categoryId]: { ...st.commission[categoryId], scheduled: undefined } } })), []);
  const upsertCoupon = useCallback((c: Coupon) => setS((st) => ({ ...st, coupons: st.coupons.some((x) => x.id === c.id) ? st.coupons.map((x) => (x.id === c.id ? c : x)) : [c, ...st.coupons] })), []);
  const setVendorStatus = useCallback((vendorId: string, status: 'Active' | 'Frozen', reason: string, by: string) => setS((st) => ({
    ...st, vendorStatus: { ...st.vendorStatus, [vendorId]: status },
    vendorEvents: { ...st.vendorEvents, [vendorId]: [...(st.vendorEvents[vendorId] ?? []), { at: new Date().toISOString(), by, action: status === 'Frozen' ? 'Frozen' : 'Reactivated', reason }] },
  })), []);
  const activateApplicant = useCallback((id: string, by: string) => setS((st) => ({
    ...st, applicants: st.applicants.filter((a) => a.id !== id),
    vendorEvents: { ...st.vendorEvents, [id]: [...(st.vendorEvents[id] ?? []), { at: new Date().toISOString(), by, action: 'Activated', reason: 'All required documents approved' }] },
  })), []);
  const markNotified = useCallback((key: string) => setS((st) => ({ ...st, notified: { ...st.notified, [key]: new Date().toISOString() } })), []);

  return <C.Provider value={{ ...s, setCommission, cancelScheduled, upsertCoupon, setVendorStatus, activateApplicant, markNotified }}>{children}</C.Provider>;
}

export function useAdmin(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useAdmin outside AdminProvider');
  return c;
}
