import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TODAY, daysBetween } from './format';

export type DocStatus = 'Approved' | 'Pending' | 'On Hold' | 'Rejected';
export type DocKind = 'GST' | 'PAN' | 'CERT' | 'BANK';

export interface DocVersion {
  v: number;
  fileName: string;
  uploadedAt: string;
  status: DocStatus;
  issueDate?: string;
  expiryDate?: string;
  reason?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface VendorDoc {
  id: string;
  kind: DocKind;
  title: string;
  /** For certificates: GOTS, OEKO-TEX… */
  certType?: string;
  number?: string;
  required: boolean;
  versions: DocVersion[];
}

export type PlanId = 'free' | 'standard' | 'premium';

export interface OnboardingData {
  gst?: { gstin: string; legalName: string; tradeName: string; state: string; status: 'Active'; regDate: string; type: string };
  pan?: { pan: string; name: string };
  feePaid: boolean;
  feeTxn?: string;
  module1Done: boolean;
  plan?: PlanId;
  agreementAccepted: boolean;
  module2Done: boolean;
  insta: { optIn: boolean; hubs: string[] };
  bank?: { holder: string; account: string; ifsc: string; bankName: string; branch: string; verified: boolean };
  submittedAt?: string;
  activatedAt?: string;
  docs: VendorDoc[];
}

/* ---------- helpers ---------- */

export const latest = (d: VendorDoc) => d.versions[d.versions.length - 1];
/** The live version is the latest APPROVED one — a rejected/pending re-upload never replaces it. */
export const liveVersion = (d: VendorDoc) => [...d.versions].reverse().find((v) => v.status === 'Approved');

export function daysToExpiry(d: VendorDoc): number | null {
  const v = liveVersion(d) ?? latest(d);
  return v?.expiryDate ? daysBetween(TODAY, v.expiryDate) : null;
}

/** Status shown to people: Expired overrides Approved once the live version lapses. */
export function displayStatus(d: VendorDoc): DocStatus | 'Expired' {
  const live = liveVersion(d);
  const cur = latest(d);
  if (live && live.expiryDate && daysBetween(TODAY, live.expiryDate) < 0 && cur.status === 'Approved') return 'Expired';
  return cur.status;
}

export const allRequiredApproved = (docs: VendorDoc[]) =>
  docs.length > 0 && docs.filter((d) => d.required).every((d) => latest(d).status === 'Approved');

/* ---------- seed: NovaTex (already active) ---------- */

const ap = (v: number, fileName: string, uploadedAt: string, extra: Partial<DocVersion> = {}): DocVersion => ({
  v, fileName, uploadedAt, status: 'Approved', decidedBy: 'Kavya Iyer (AP-1042)', decidedAt: uploadedAt, ...extra,
});

export const NOVATEX_SEED: OnboardingData = {
  gst: { gstin: '27AABCN4567K1Z9', legalName: 'NOVATEX MANUFACTURING PRIVATE LIMITED', tradeName: 'NovaTex Manufacturing', state: 'Maharashtra', status: 'Active', regDate: '2017-07-01', type: 'Regular' },
  pan: { pan: 'AABCN4567K', name: 'NOVATEX MANUFACTURING PRIVATE LIMITED' },
  feePaid: false,
  module1Done: true,
  plan: 'standard',
  agreementAccepted: true,
  module2Done: true,
  insta: { optIn: true, hubs: ['WH-MUM-01', 'WH-TUP-01'] },
  bank: { holder: 'NOVATEX MANUFACTURING PVT LTD', account: '50200012345678', ifsc: 'HDFC0001234', bankName: 'HDFC Bank', branch: 'Andheri East, Mumbai', verified: true },
  submittedAt: '2026-03-10T11:20:00+05:30',
  activatedAt: '2026-03-14T16:05:00+05:30',
  docs: [
    { id: 'DOC-GST', kind: 'GST', title: 'GST Registration Certificate', number: '27AABCN4567K1Z9', required: true, versions: [ap(1, 'GST_REG-06_NovaTex.pdf', '2026-03-10T11:00:00+05:30')] },
    { id: 'DOC-PAN', kind: 'PAN', title: 'PAN Card (Company)', number: 'AABCN4567K', required: true, versions: [ap(1, 'PAN_AABCN4567K.pdf', '2026-03-10T11:02:00+05:30')] },
    { id: 'DOC-GOTS', kind: 'CERT', title: 'GOTS Certificate', certType: 'GOTS', number: 'CU 1046789', required: true, versions: [
      ap(1, 'GOTS_CU1046789_2025.pdf', '2025-12-10T10:00:00+05:30', { issueDate: '2025-12-08', expiryDate: '2026-12-08' }),
    ] },
    { id: 'DOC-OEKO', kind: 'CERT', title: 'OEKO-TEX Standard 100', certType: 'OEKO-TEX Standard 100', number: 'SH025 189432', required: false, versions: [
      ap(1, 'OEKO_SH025189432_2025.pdf', '2025-02-20T10:00:00+05:30', { issueDate: '2025-02-15', expiryDate: '2026-02-14' }),
      ap(2, 'OEKO_SH025189432_2026.pdf', '2026-02-12T10:00:00+05:30', { issueDate: '2026-02-15', expiryDate: '2027-02-14' }),
    ] },
    { id: 'DOC-ISO', kind: 'CERT', title: 'ISO 9001 Certificate', certType: 'ISO 9001', number: 'QMS-IN-88213', required: false, versions: [
      ap(1, 'ISO9001_QMS88213.pdf', '2026-03-10T11:05:00+05:30', { issueDate: '2025-07-01', expiryDate: '2028-06-30' }),
    ] },
    { id: 'DOC-FSC', kind: 'CERT', title: 'FSC Chain of Custody', certType: 'FSC', number: 'FSC-C178123', required: false, versions: [
      { v: 1, fileName: 'FSC_C178123.pdf', uploadedAt: '2026-11-10T09:00:00+05:30', status: 'Rejected', issueDate: '2026-10-01', expiryDate: '2031-09-30', reason: 'Certificate scope does not cover paper hang tags. Upload the scope annex.', decidedBy: 'Kavya Iyer (AP-1042)', decidedAt: '2026-11-12T14:00:00+05:30' },
      { v: 2, fileName: 'FSC_C178123_with_scope.pdf', uploadedAt: '2026-11-24T16:40:00+05:30', status: 'Pending', issueDate: '2026-10-01', expiryDate: '2031-09-30' },
    ] },
    { id: 'DOC-REACH', kind: 'CERT', title: 'REACH Compliance Declaration', certType: 'REACH', number: 'RCH-2026-0412', required: false, versions: [
      { v: 1, fileName: 'REACH_SVHC_report.pdf', uploadedAt: '2026-11-18T12:00:00+05:30', status: 'On Hold', issueDate: '2026-09-15', expiryDate: '2027-09-14', reason: 'Lab report page 3 (SVHC table) is missing. Re-upload the complete report.', decidedBy: 'Kavya Iyer (AP-1042)', decidedAt: '2026-11-19T10:30:00+05:30' },
    ] },
    { id: 'DOC-GIN', kind: 'CERT', title: 'GINETEX Care Labelling Licence', certType: 'GINETEX', number: 'GIN-IN-2207', required: false, versions: [
      ap(1, 'GINETEX_licence_2025.pdf', '2025-11-02T10:00:00+05:30', { issueDate: '2025-11-01', expiryDate: '2026-10-31' }),
    ] },
    { id: 'DOC-BANK', kind: 'BANK', title: 'Cancelled Cheque', number: 'HDFC ••5678', required: true, versions: [ap(1, 'cancelled_cheque_HDFC.jpg', '2026-03-10T11:15:00+05:30')] },
  ],
};

export const EMPTY: OnboardingData = {
  feePaid: false, module1Done: false, agreementAccepted: false, module2Done: false, insta: { optIn: false, hubs: [] }, docs: [],
};

/* ---------- store ---------- */

interface Ctx {
  data: OnboardingData;
  patch: (p: Partial<OnboardingData>) => void;
  upsertDoc: (d: VendorDoc) => void;
  addVersion: (docId: string, v: Omit<DocVersion, 'v' | 'status' | 'uploadedAt'>) => void;
  removeDoc: (docId: string) => void;
  decide: (docId: string, status: DocStatus, by: string, reason?: string) => void;
  reset: (to: 'new' | 'novatex') => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.onboarding';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(() => {
    try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : NOVATEX_SEED; } catch { return NOVATEX_SEED; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data]);

  const patch = useCallback((p: Partial<OnboardingData>) => setData((d) => ({ ...d, ...p })), []);
  const upsertDoc = useCallback((doc: VendorDoc) => setData((d) => ({
    ...d, docs: d.docs.some((x) => x.id === doc.id) ? d.docs.map((x) => (x.id === doc.id ? doc : x)) : [...d.docs, doc],
  })), []);
  const addVersion = useCallback((docId: string, v: Omit<DocVersion, 'v' | 'status' | 'uploadedAt'>) => setData((d) => ({
    ...d,
    docs: d.docs.map((x) => x.id !== docId ? x : {
      ...x, versions: [...x.versions, { ...v, v: x.versions.length + 1, status: 'Pending', uploadedAt: new Date().toISOString() }],
    }),
  })), []);
  const removeDoc = useCallback((docId: string) => setData((d) => ({ ...d, docs: d.docs.filter((x) => x.id !== docId) })), []);
  const decide = useCallback((docId: string, status: DocStatus, by: string, reason?: string) => setData((d) => ({
    ...d,
    docs: d.docs.map((x) => {
      if (x.id !== docId) return x;
      const vs = [...x.versions];
      vs[vs.length - 1] = { ...vs[vs.length - 1], status, reason, decidedBy: by, decidedAt: new Date().toISOString() };
      return { ...x, versions: vs };
    }),
  })), []);
  const reset = useCallback((to: 'new' | 'novatex') => setData(to === 'new' ? EMPTY : NOVATEX_SEED), []);

  return <C.Provider value={{ data, patch, upsertDoc, addVersion, removeDoc, decide, reset }}>{children}</C.Provider>;
}

export function useOnboarding(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useOnboarding outside OnboardingProvider');
  return c;
}
