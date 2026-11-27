import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { RefundStatus } from './orders';

export interface RemitLine { awb: string; amount: number; collectedOn: string }
export interface Remittance { id: string; courier: 'Delhivery' | 'BlueDart'; date: string; utr: string; total: number; lines: RemitLine[] }
export interface RefundAttempt { at: string; by: string; result: RefundStatus; gatewayRef?: string; note?: string }
export interface LegacyRefund { ref: string; source: string; customerId: string; amount: number; status: RefundStatus; method: string; createdAt: string }

const t = (s: string) => `${s}+05:30`;

const SEED_REMITS: Remittance[] = [
  { id: 'REM-DLV-2026-1125', courier: 'Delhivery', date: '2026-11-25', utr: 'UTIB0026113001', total: 24774, lines: [
    { awb: 'DLV1103304471', amount: 20574, collectedOn: '2026-11-12' },
    { awb: 'DLV1102999911', amount: 4200, collectedOn: '2026-11-14' },
  ] },
  { id: 'REM-BD-2026-1124', courier: 'BlueDart', date: '2026-11-24', utr: 'ICIC0026112877', total: 18950, lines: [
    { awb: 'BD110301IN', amount: 18950, collectedOn: '2026-11-08' },
  ] },
];

const SEED_LEGACY: LegacyRefund[] = [
  { ref: 'RFD-2026-00377', source: 'Vendor rejection · SO-2026-110219', customerId: 'CU-30151', amount: 14868, status: 'Failed', method: 'Net banking', createdAt: t('2026-11-15T12:00:00') },
  { ref: 'RFD-2026-00391', source: 'Damage claim · DSP-2026-0305', customerId: 'CU-30170', amount: 2240.5, status: 'Unknown', method: 'Card', createdAt: t('2026-11-19T15:30:00') },
];

const SEED_ATTEMPTS: Record<string, RefundAttempt[]> = {
  'RFD-2026-00377': [{ at: t('2026-11-16T10:00:00'), by: 'Finance Desk', result: 'Failed', gatewayRef: 'PGR-88213', note: 'Beneficiary account closed (bank code R03)' }],
  'RFD-2026-00391': [{ at: t('2026-11-20T09:00:00'), by: 'Finance Desk', result: 'Unknown', gatewayRef: 'PGR-88540', note: 'Gateway timeout. No final response received' }],
  'RFD-2026-00402': [{ at: t('2026-11-23T14:00:00'), by: 'Finance Desk', result: 'Succeeded', gatewayRef: 'PGR-88702', note: 'Refunded to original card' }],
};

interface State { remits: Remittance[]; matched: Record<string, { at: string; by: string }>; queries: Record<string, string>; legacy: LegacyRefund[]; attempts: Record<string, RefundAttempt[]> }

interface Ctx extends State {
  markMatched: (awb: string, by: string) => void;
  raiseQuery: (awb: string, note: string) => void;
  addAttempt: (ref: string, a: RefundAttempt) => void;
  patchLegacy: (ref: string, status: RefundStatus) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.finance.v1';

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => {
    const init: State = { remits: SEED_REMITS, matched: {}, queries: {}, legacy: SEED_LEGACY, attempts: SEED_ATTEMPTS };
    try { const r = localStorage.getItem(KEY); return r ? { ...init, ...JSON.parse(r) } : init; } catch { return init; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(s)), [s]);
  const now = () => new Date().toISOString();
  const markMatched = useCallback((awb: string, by: string) => setS((x) => ({ ...x, matched: { ...x.matched, [awb]: { at: now(), by } } })), []);
  const raiseQuery = useCallback((awb: string, note: string) => setS((x) => ({ ...x, queries: { ...x.queries, [awb]: note } })), []);
  const addAttempt = useCallback((ref: string, a: RefundAttempt) => setS((x) => ({ ...x, attempts: { ...x.attempts, [ref]: [...(x.attempts[ref] ?? []), a] } })), []);
  const patchLegacy = useCallback((ref: string, status: RefundStatus) => setS((x) => ({ ...x, legacy: x.legacy.map((l) => (l.ref === ref ? { ...l, status } : l)) })), []);
  return <C.Provider value={{ ...s, markMatched, raiseQuery, addAttempt, patchLegacy }}>{children}</C.Provider>;
}

export function useFinance(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useFinance outside FinanceProvider');
  return c;
}
