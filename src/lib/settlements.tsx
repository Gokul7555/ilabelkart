import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Case } from './cases';
import { isOpenCase } from './cases';
import type { Order, SubOrder } from './orders';
import { vendorAmount } from './orders';

/* =========================================================
   The 6 payout conditions — vendor money is held until ALL pass
   ========================================================= */

export interface Condition { key: string; label: string; ok: boolean; detail: string }
export type SettleStatus = 'Paid' | 'In Batch' | 'Open Dispute' | 'In Window' | 'Awaiting COD' | 'Awaiting delivery' | 'Eligible';

export interface Batch {
  id: string;
  vendorId: string;
  createdAt: string;
  createdBy: string;
  subOrderIds: string[];
  amount: number;
  status: 'Pending' | 'Paid';
  transfer?: { amount: number; date: string; utr: string; admin: string; at: string };
  attempts: { at: string; result: 'Success' | 'Failed'; note: string; admin: string; utr?: string }[];
}

export const CONDITION_LABELS = [
  'Delivery verified (OTP proof of delivery)',
  'Return / damage window has ended',
  'Customer funds reconciled (prepaid captured or COD remitted)',
  'GST invoice exists for the sub-order',
  'No open dispute on the sub-order',
  'Not already paid',
];

export function conditions(so: SubOrder, order: Order | undefined, cases: Case[], batches: Batch[]): Condition[] {
  const paid = batches.some((b) => b.status === 'Paid' && b.subOrderIds.includes(so.id));
  const openCase = cases.find((c) => c.subOrderId === so.id && isOpenCase(c));
  const windowOver = !!so.returnWindowEnds && new Date(so.returnWindowEnds).getTime() < Date.now();
  const funds = order?.payment.status === 'Captured' || order?.payment.status === 'COD remitted';
  return [
    { key: 'delivery', label: CONDITION_LABELS[0], ok: !!so.delivery?.otpVerified, detail: so.delivery ? `Delivered ${so.delivery.at.slice(0, 10)}, OTP verified` : 'Not delivered yet' },
    { key: 'window', label: CONDITION_LABELS[1], ok: windowOver, detail: so.returnWindowEnds ? (windowOver ? 'Window closed' : `Open until ${so.returnWindowEnds.slice(0, 10)}`) : 'Starts on delivery' },
    { key: 'funds', label: CONDITION_LABELS[2], ok: funds, detail: order ? `${order.payment.method.toUpperCase()} · ${order.payment.status}` : '—' },
    { key: 'invoice', label: CONDITION_LABELS[3], ok: !!so.invoiceNo, detail: so.invoiceNo ?? 'Issued after verified delivery' },
    { key: 'dispute', label: CONDITION_LABELS[4], ok: !openCase && so.status !== 'Disputed', detail: openCase ? `${openCase.id} · ${openCase.status}` : 'None' },
    { key: 'paid', label: CONDITION_LABELS[5], ok: !paid, detail: paid ? 'Already paid' : 'Not paid' },
  ];
}

export function settleStatus(so: SubOrder, order: Order | undefined, cases: Case[], batches: Batch[]): SettleStatus {
  if (batches.some((b) => b.status === 'Paid' && b.subOrderIds.includes(so.id))) return 'Paid';
  if (batches.some((b) => b.status === 'Pending' && b.subOrderIds.includes(so.id))) return 'In Batch';
  const c = conditions(so, order, cases, batches);
  if (!c[0].ok) return 'Awaiting delivery';
  if (!c[4].ok) return 'Open Dispute';
  if (!c[1].ok) return 'In Window';
  if (!c[2].ok) return 'Awaiting COD';
  if (!c[3].ok) return 'Awaiting delivery';
  return 'Eligible';
}

/** Vendor payable = base amount − refunded units at base price (replacement cost owner TBD). */
export function payable(so: SubOrder, cases: Case[]): { gross: number; deductions: number; net: number } {
  const gross = vendorAmount(so);
  const deductions = cases.filter((c) => c.subOrderId === so.id && c.status === 'Resolved').reduce((s, c) =>
    s + c.lines.reduce((a, l) => a + l.refundQty * (so.lines.find((x) => x.productId === l.productId)?.basePrice ?? 0), 0), 0);
  return { gross, deductions, net: Math.round((gross - deductions) * 100) / 100 };
}

/* =========================================================
   Store
   ========================================================= */

const SEED: Batch[] = [
  {
    id: 'SB-2026-047', vendorId: 'VN-89420', createdAt: '2026-11-23T10:00:00+05:30', createdBy: 'Arjun Kapoor (ROOT-01)', subOrderIds: ['SO-2026-110244'], amount: 32000, status: 'Paid',
    transfer: { amount: 32000, date: '2026-11-24', utr: 'HDFC0026112489', admin: 'Arjun Kapoor', at: '2026-11-24T11:05:00+05:30' },
    attempts: [{ at: '2026-11-24T11:05:00+05:30', result: 'Success', note: 'NEFT confirmed by bank statement.', admin: 'Arjun Kapoor', utr: 'HDFC0026112489' }],
  },
];

interface Ctx {
  batches: Batch[];
  createBatches: (groups: { vendorId: string; subOrderIds: string[]; amount: number }[], by: string) => Batch[];
  recordTransfer: (id: string, t: { amount: number; date: string; utr: string; admin: string; result: 'Success' | 'Failed'; note: string }) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.settlements.v1';
let seq = 48;

export function SettlementsProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>(() => { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : SEED; } catch { return SEED; } });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(batches)), [batches]);

  const createBatches = useCallback((groups: { vendorId: string; subOrderIds: string[]; amount: number }[], by: string) => {
    const at = new Date().toISOString();
    const made: Batch[] = groups.map((g) => ({ id: `SB-2026-${String(seq++).padStart(3, '0')}`, vendorId: g.vendorId, createdAt: at, createdBy: by, subOrderIds: g.subOrderIds, amount: g.amount, status: 'Pending', attempts: [] }));
    setBatches((b) => [...made, ...b]);
    return made;
  }, []);

  /** Manual payout. A FAILED transfer keeps the batch Pending. */
  const recordTransfer: Ctx['recordTransfer'] = useCallback((id, t) => setBatches((bs) => bs.map((b) => {
    if (b.id !== id) return b;
    const at = new Date().toISOString();
    const attempt = { at, result: t.result, note: t.note, admin: t.admin, utr: t.utr || undefined };
    return t.result === 'Success'
      ? { ...b, status: 'Paid', transfer: { amount: t.amount, date: t.date, utr: t.utr, admin: t.admin, at }, attempts: [...b.attempts, attempt] }
      : { ...b, attempts: [...b.attempts, attempt] };
  })), []);

  return <C.Provider value={{ batches, createBatches, recordTransfer }}>{children}</C.Provider>;
}

export function useSettlements(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useSettlements outside SettlementsProvider');
  return c;
}
