import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useCases } from './cases';
import { useOrders } from './orders';

export type TicketType = 'Dispute' | 'NDR' | 'Cancellation' | 'Return';
export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus = 'Open' | 'Awaiting customer' | 'Awaiting vendor' | 'Resolved' | 'Closed';

export interface Msg { at: string; by: string; role: 'customer' | 'vendor' | 'support' | 'system'; text: string; internal?: boolean; to?: string }

export interface Ticket {
  id: string;
  type: TicketType;
  subject: string;
  customerId: string;
  orderId: string;
  subOrderIds: string[];
  vendorIds: string[];
  priority: Priority;
  createdAt: string;
  slaDue: string;
  status: TicketStatus;
  caseId?: string;
  ndrSoId?: string;
  messages: Msg[];
  closeNote?: string;
}

export interface RiskFlag {
  id: string;
  kind: 'Vendor' | 'Customer';
  subjectId: string;
  subjectName: string;
  rule: string;
  metric: string;
  evidence: string[];
  raisedAt: string;
  status: 'Open' | 'Reviewed – no action' | 'Freeze recommended to Admin';
  note?: string;
}

export interface Appeal {
  id: string;
  from: 'Vendor' | 'Customer';
  party: string;
  ref: string;
  summary: string;
  at: string;
  status: 'Open' | 'Upheld' | 'Overturned';
  note?: string;
}

const t = (s: string) => `${s}+05:30`;
const S = 'Neha Sharma (Support)';

const SEED_TICKETS: Ticket[] = [
  {
    id: 'TKT-2026-4821', type: 'Dispute', subject: 'Water-damaged hang tags: 1,200 units', customerId: 'CU-30117', orderId: 'ORD-2026-5655', subOrderIds: ['SO-2026-110352'], vendorIds: ['VN-89420'],
    priority: 'HIGH', createdAt: t('2026-11-21T10:15:00'), slaDue: t('2026-11-26T18:00:00'), status: 'Awaiting customer', caseId: 'DSP-2026-0331',
    messages: [
      { at: t('2026-11-21T10:15:00'), by: 'Priya Nair', role: 'customer', text: 'Two cartons arrived wet; about 1,200 tags warped with smudged barcodes.' },
      { at: t('2026-11-25T10:16:00'), by: 'System', role: 'system', text: 'Vendor did not respond within 2 business days. Auto-escalated to Support.' },
      { at: t('2026-11-25T16:30:00'), by: S, role: 'support', text: 'Please upload a close-up photo of 10 damaged tags next to the carton label showing the AWB.', to: 'customer' },
      { at: t('2026-11-25T16:35:00'), by: S, role: 'support', text: 'POD shows no damage remark. Check courier liability once photos arrive.', internal: true },
    ],
  },
  {
    id: 'TKT-2026-4835', type: 'NDR', subject: 'NDR-2026-0091: 3 failed delivery attempts', customerId: 'CU-30145', orderId: 'ORD-2026-5710', subOrderIds: ['SO-2026-110402'], vendorIds: ['VN-66047'],
    priority: 'URGENT', createdAt: t('2026-11-24T13:25:00'), slaDue: t('2026-11-27T08:45:00'), status: 'Open', ndrSoId: 'SO-2026-110402',
    messages: [{ at: t('2026-11-26T08:50:00'), by: 'System', role: 'system', text: 'Delhivery: 3rd attempt failed, consignee not available. Act within 24 hours.' }],
  },
  {
    id: 'TKT-2026-4840', type: 'Cancellation', subject: 'Wants to cancel ZipKing sub-order (wrong slider type)', customerId: 'CU-30117', orderId: 'ORD-2026-5742', subOrderIds: ['SO-2026-110423', 'SO-2026-110424'], vendorIds: ['VN-89420', 'VN-61873'],
    priority: 'MEDIUM', createdAt: t('2026-11-26T08:05:00'), slaDue: t('2026-11-27T08:05:00'), status: 'Open',
    messages: [{ at: t('2026-11-26T08:05:00'), by: 'Priya Nair', role: 'customer', text: 'We ordered auto-lock sliders but need pin-lock. Can we cancel the ZipKing part only?' }],
  },
  {
    id: 'TKT-2026-4838', type: 'Cancellation', subject: 'Care labels not dispatched: buyer asks to cancel', customerId: 'CU-30122', orderId: 'ORD-2026-5731', subOrderIds: ['SO-2026-110398'], vendorIds: ['VN-89420'],
    priority: 'HIGH', createdAt: t('2026-11-25T11:00:00'), slaDue: t('2026-11-26T15:00:00'), status: 'Awaiting vendor',
    messages: [
      { at: t('2026-11-25T11:00:00'), by: 'Vikram Rao', role: 'customer', text: 'Dispatch was promised for 23 Nov. Our line starts on 28 Nov. Please cancel if it can’t ship today.' },
      { at: t('2026-11-25T11:40:00'), by: S, role: 'support', text: 'Please confirm a firm dispatch time for SO-2026-110398 today.', to: 'VN-89420' },
    ],
  },
  {
    id: 'TKT-2026-4829', type: 'Return', subject: 'Return 5,000 excess labels (not damaged)', customerId: 'CU-30163', orderId: 'ORD-2026-5410', subOrderIds: ['SO-2026-110244'], vendorIds: ['VN-89420'],
    priority: 'LOW', createdAt: t('2026-11-24T15:00:00'), slaDue: t('2026-11-28T15:00:00'), status: 'Open',
    messages: [{ at: t('2026-11-24T15:00:00'), by: 'Aditi Kulkarni', role: 'customer', text: 'We over-ordered by 5,000 labels. Can we return the unused ones?' }],
  },
  {
    id: 'TKT-2026-4760', type: 'Dispute', subject: 'Broken slider teeth: 40 units', customerId: 'CU-30122', orderId: 'ORD-2026-5512', subOrderIds: ['SO-2026-110290'], vendorIds: ['VN-61873'],
    priority: 'MEDIUM', createdAt: t('2026-11-12T12:00:00'), slaDue: t('2026-11-14T12:00:00'), status: 'Closed', caseId: 'DSP-2026-0318', closeNote: 'Refund of 40 units approved and executed.',
    messages: [{ at: t('2026-11-23T09:30:00'), by: S, role: 'support', text: 'Approved refund for 40 units.', to: 'customer' }],
  },
];

const SEED_FLAGS: RiskFlag[] = [
  {
    id: 'RF-2026-017', kind: 'Vendor', subjectId: 'VN-70334', subjectName: 'Ribbonex India', rule: 'Vendor complaints in more than 10 distinct orders (time window TBD)',
    metric: '12 distinct orders with complaints', evidence: ['Shade mismatch ×7', 'Short width ×3', 'Late dispatch ×2'], raisedAt: t('2026-11-25T06:00:00'), status: 'Open',
  },
  {
    id: 'RF-2026-018', kind: 'Customer', subjectId: 'CU-30151', subjectName: 'Mafatlal Textiles', rule: 'More than 3 suspicious return claims',
    metric: '4 claims flagged as suspicious', evidence: ['Re-used photos across 2 claims', 'Claims filed on day 7 ×3', 'Damage ratio 3× category average'], raisedAt: t('2026-11-24T06:00:00'), status: 'Open',
  },
];

const SEED_APPEALS: Appeal[] = [
  { id: 'APL-2026-009', from: 'Vendor', party: 'AuraFastener Industries', ref: 'DSP-2026-0302', summary: 'Disputes refund of 300 snaps; says damage happened after delivery and shares factory QC video.', at: t('2026-11-24T12:00:00'), status: 'Open' },
  { id: 'APL-2026-008', from: 'Customer', party: 'Bombay Shirt Co', ref: 'DSP-2026-0297', summary: 'Claim rejected for lack of evidence; now has carton photos with AWB.', at: t('2026-11-22T17:30:00'), status: 'Open' },
];

interface Ctx {
  tickets: Ticket[];
  flags: RiskFlag[];
  appeals: Appeal[];
  patchTicket: (id: string, p: Partial<Ticket>) => void;
  addMessage: (id: string, m: Omit<Msg, 'at'>) => void;
  patchFlag: (id: string, p: Partial<RiskFlag>) => void;
  patchAppeal: (id: string, p: Partial<Appeal>) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.support.v1';

export function SupportProvider({ children }: { children: ReactNode }) {
  const { cases, patch: patchCase, addEvent } = useCases();
  const { orders, subOrders } = useOrders();
  const [state, setState] = useState<{ tickets: Ticket[]; flags: RiskFlag[]; appeals: Appeal[] }>(() => {
    try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : { tickets: SEED_TICKETS, flags: SEED_FLAGS, appeals: SEED_APPEALS }; }
    catch { return { tickets: SEED_TICKETS, flags: SEED_FLAGS, appeals: SEED_APPEALS }; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(state)), [state]);

  /** Rule: vendor silent for 2 business days → case escalates to Support automatically. */
  useEffect(() => {
    cases.filter((c) => c.status === 'Awaiting vendor' && new Date(c.vendorRespondBy).getTime() < Date.now()).forEach((c) => {
      patchCase(c.id, { status: 'Escalated to Support' });
      addEvent(c.id, 'System', 'No vendor response in 2 business days. Auto-escalated to Support.');
    });
  }, [cases, patchCase, addEvent]);

  /** Every case and every failed delivery has a ticket. */
  useEffect(() => {
    const missing: Ticket[] = [];
    cases.forEach((c) => {
      if (state.tickets.some((x) => x.id === c.ticketId)) return;
      missing.push({
        id: c.ticketId, type: 'Dispute', subject: `${c.reason}: ${c.lines.reduce((s, l) => s + l.damagedQty, 0).toLocaleString('en-IN')} unit(s)`,
        customerId: c.customerId, orderId: c.orderId, subOrderIds: [c.subOrderId], vendorIds: [c.vendorId], priority: 'HIGH',
        createdAt: c.createdAt, slaDue: c.vendorRespondBy, status: 'Awaiting vendor', caseId: c.id,
        messages: [{ at: c.createdAt, by: 'Customer', role: 'customer', text: c.description }],
      });
    });
    subOrders.filter((s) => s.ndr && s.status === 'Delivery Failed').forEach((s) => {
      if (state.tickets.some((x) => x.ndrSoId === s.id)) return;
      const o = orders.find((x) => x.id === s.orderId)!;
      missing.push({
        id: `TKT-2026-${4900 + Math.floor(Math.random() * 99)}`, type: 'NDR', subject: `${s.ndr!.id}: ${s.ndr!.attempts} failed attempt(s)`, customerId: o.customerId, orderId: o.id,
        subOrderIds: [s.id], vendorIds: [s.vendorId], priority: 'URGENT', createdAt: s.ndr!.lastAttempt,
        slaDue: new Date(new Date(s.ndr!.lastAttempt).getTime() + 86400000).toISOString(), status: 'Open', ndrSoId: s.id, messages: [],
      });
    });
    if (missing.length) setState((st) => ({ ...st, tickets: [...missing, ...st.tickets] }));
  }, [cases, subOrders, orders, state.tickets]);

  const patchTicket = useCallback((id: string, p: Partial<Ticket>) => setState((st) => ({ ...st, tickets: st.tickets.map((x) => (x.id === id ? { ...x, ...p } : x)) })), []);
  const addMessage = useCallback((id: string, m: Omit<Msg, 'at'>) => setState((st) => ({ ...st, tickets: st.tickets.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { ...m, at: new Date().toISOString() }] } : x)) })), []);
  const patchFlag = useCallback((id: string, p: Partial<RiskFlag>) => setState((st) => ({ ...st, flags: st.flags.map((x) => (x.id === id ? { ...x, ...p } : x)) })), []);
  const patchAppeal = useCallback((id: string, p: Partial<Appeal>) => setState((st) => ({ ...st, appeals: st.appeals.map((x) => (x.id === id ? { ...x, ...p } : x)) })), []);

  return <C.Provider value={{ ...state, patchTicket, addMessage, patchFlag, patchAppeal }}>{children}</C.Provider>;
}

export function useSupport(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useSupport outside SupportProvider');
  return c;
}

export const isOpenTicket = (t: Ticket) => t.status !== 'Resolved' && t.status !== 'Closed';

/** "in 3h 20m" / "Breached 2h ago" and whether it's near (< 4h) or past. */
export function slaInfo(due: string) {
  const ms = new Date(due).getTime() - Date.now();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const span = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
  return { past: ms < 0, near: ms >= 0 && ms < 4 * 3600000, label: ms < 0 ? `Breached ${span} ago` : `in ${span}` };
}
