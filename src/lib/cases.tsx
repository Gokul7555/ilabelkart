import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { RefundStatus } from './orders';

export type CaseStatus = 'Awaiting vendor' | 'Escalated to Support' | 'More evidence requested' | 'Resolved' | 'Rejected';

export interface CaseLine {
  productId: string; title: string; unit: string; unitPrice: number; gstRate: number;
  deliveredQty: number; damagedQty: number;
  /** Remedy per unit: refundQty + replaceQty === damagedQty. */
  refundQty: number; replaceQty: number;
}

export interface CaseEvent { at: string; by: string; text: string }

export interface Case {
  id: string; // DSP-2026-xxxx
  ticketId: string; // TKT-2026-xxxx
  orderId: string;
  subOrderId: string;
  customerId: string;
  vendorId: string;
  createdAt: string;
  reason: string;
  description: string;
  evidence: string[];
  lines: CaseLine[];
  status: CaseStatus;
  vendorRespondBy: string;
  events: CaseEvent[];
  resolution?: { decision: string; note: string; at: string; by: string };
  refund?: { amount: number; status: RefundStatus; ref: string; approvedBy?: string; approvedAt?: string };
  replacementOrderId?: string;
}

export const DAMAGE_REASONS = ['Damaged in transit', 'Manufacturing defect', 'Broken / torn units', 'Stained or soiled', 'Water damage', 'Colour bleeding / fading'];

export const lineValue = (l: CaseLine, qty: number) => Math.round(qty * l.unitPrice * (1 + l.gstRate / 100) * 100) / 100;
export const caseAmount = (c: Case) => c.lines.reduce((s, l) => s + lineValue(l, l.damagedQty), 0);
export const isOpenCase = (c: Case) => c.status !== 'Resolved' && c.status !== 'Rejected';

const t = (s: string) => `${s}+05:30`;

const SEED: Case[] = [
  {
    id: 'DSP-2026-0331', ticketId: 'TKT-2026-4821', orderId: 'ORD-2026-5655', subOrderId: 'SO-2026-110352', customerId: 'CU-30117', vendorId: 'VN-89420',
    createdAt: t('2026-11-21T10:15:00'), reason: 'Water damage',
    description: 'Two of the cartons arrived wet. About 1,200 tags are warped and the barcodes smudged; they won’t scan at our warehouse.',
    evidence: ['carton_wet_01.jpg', 'carton_wet_02.jpg', 'tags_smudged.jpg', 'unboxing.mp4'],
    lines: [{ productId: 'P-1003', title: 'Kraft Paper Hang Tag with Barcode, 350 GSM', unit: 'pcs', unitPrice: 3.03, gstRate: 12, deliveredQty: 10000, damagedQty: 1200, refundQty: 700, replaceQty: 500 }],
    status: 'More evidence requested', vendorRespondBy: t('2026-11-25T10:15:00'),
    events: [
      { at: t('2026-11-21T10:15:00'), by: 'Priya Nair (Raymond Garments Ltd)', text: 'Claim raised for 1,200 damaged units: 700 refund, 500 replacement.' },
      { at: t('2026-11-21T10:16:00'), by: 'System', text: 'Vendor notified. Vendor must respond within 2 business days.' },
      { at: t('2026-11-25T10:16:00'), by: 'System', text: 'No vendor response in 2 business days. Auto-escalated to Support.' },
      { at: t('2026-11-25T16:30:00'), by: 'Neha Sharma (Support)', text: 'Please upload a close-up photo of 10 damaged tags next to the carton label showing the AWB.' },
    ],
  },
  {
    id: 'DSP-2026-0318', ticketId: 'TKT-2026-4760', orderId: 'ORD-2026-5512', subOrderId: 'SO-2026-110290', customerId: 'CU-30122', vendorId: 'VN-61873',
    createdAt: t('2026-11-12T12:00:00'), reason: 'Manufacturing defect',
    description: 'Slider teeth broken on a portion of the zippers.',
    evidence: ['zip_teeth_01.jpg', 'zip_teeth_02.jpg'],
    lines: [{ productId: 'P-2008', title: '#5 Metal Zipper, Antique Brass, Auto-lock Slider, 18 cm', unit: 'pcs', unitPrice: 14.0, gstRate: 18, deliveredQty: 500, damagedQty: 40, refundQty: 40, replaceQty: 0 }],
    status: 'Resolved', vendorRespondBy: t('2026-11-14T12:00:00'),
    events: [{ at: t('2026-11-12T12:00:00'), by: 'Vikram Rao (Arvind Fashions)', text: 'Claim raised for 40 units.' }, { at: t('2026-11-23T09:30:00'), by: 'Neha Sharma (Support)', text: 'Approved refund for 40 units.' }],
    resolution: { decision: 'Refund 40 units', note: 'Photo evidence confirms broken slider teeth on 40 of 500 units.', at: t('2026-11-23T09:30:00'), by: 'Neha Sharma (SP-2210)' },
    refund: { amount: 660.8, status: 'Succeeded', ref: 'RFD-2026-00402' },
  },
];

interface Ctx {
  cases: Case[];
  create: (c: Omit<Case, 'id' | 'ticketId' | 'createdAt' | 'status' | 'events' | 'vendorRespondBy'> & { by: string; vendorRespondBy: string }) => Case;
  addEvent: (id: string, by: string, text: string) => void;
  patch: (id: string, p: Partial<Case>) => void;
}

const Cx = createContext<Ctx | null>(null);
const KEY = 'tn.cases.v1';

export function CasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<Case[]>(() => { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : SEED; } catch { return SEED; } });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(cases)), [cases]);

  const create: Ctx['create'] = useCallback((input) => {
    const at = new Date().toISOString();
    const n = 340 + Math.floor(Math.random() * 600);
    const { by, ...rest } = input;
    const c: Case = {
      ...rest, id: `DSP-2026-0${n}`, ticketId: `TKT-2026-${4830 + Math.floor(Math.random() * 160)}`, createdAt: at, status: 'Awaiting vendor',
      events: [
        { at, by, text: `Claim raised for ${rest.lines.reduce((s, l) => s + l.damagedQty, 0).toLocaleString('en-IN')} damaged unit(s).` },
        { at, by: 'System', text: 'Vendor notified. If the vendor does not respond within 2 business days, the case escalates to Support.' },
      ],
    };
    setCases((xs) => [c, ...xs]);
    return c;
  }, []);
  const addEvent = useCallback((id: string, by: string, text: string) =>
    setCases((xs) => xs.map((c) => (c.id === id ? { ...c, events: [...c.events, { at: new Date().toISOString(), by, text }] } : c))), []);
  const patch = useCallback((id: string, p: Partial<Case>) => setCases((xs) => xs.map((c) => (c.id === id ? { ...c, ...p } : c))), []);

  return <Cx.Provider value={{ cases, create, addEvent, patch }}>{children}</Cx.Provider>;
}

export function useCases(): Ctx {
  const c = useContext(Cx);
  if (!c) throw new Error('useCases outside CasesProvider');
  return c;
}
