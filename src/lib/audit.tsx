import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './auth';

export interface AuditEntry {
  id: string;
  at: string; // ISO
  actor: string; // "Arjun Kapoor (ROOT-01)"
  role: string;
  action: string;
  entity: string; // e.g. "Vendor VN-55102"
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

const SEED: AuditEntry[] = [
  { id: 'AUD-90412', at: '2026-11-25T17:42:00+05:30', actor: 'Arjun Kapoor (ROOT-01)', role: 'admin', action: 'Commission updated', entity: 'Category: Zippers & Sliders', oldValue: '8.0%', newValue: '8.5%', reason: 'Quarterly margin review; effective 01 Dec 2026.' },
  { id: 'AUD-90408', at: '2026-11-25T15:10:00+05:30', actor: 'Kavya Iyer (AP-1042)', role: 'approver', action: 'Product revision rejected', entity: 'SKU NTX-WL-2201', oldValue: '₹2.40 /unit', newValue: '₹2.95 /unit', reason: 'Price increase not supported by updated TDS; live version retained.' },
  { id: 'AUD-90397', at: '2026-11-24T11:05:00+05:30', actor: 'Arjun Kapoor (ROOT-01)', role: 'admin', action: 'Settlement transfer recorded', entity: 'Batch SB-2026-047', oldValue: 'Pending', newValue: 'Paid · UTR HDFC0026112489', reason: 'NEFT confirmed by bank statement.' },
  { id: 'AUD-90381', at: '2026-11-23T09:30:00+05:30', actor: 'Neha Sharma (SP-2210)', role: 'support', action: 'Dispute decided', entity: 'DSP-2026-0318', oldValue: 'Open', newValue: 'Refund · 40 units', reason: 'Photo evidence confirms broken slider teeth on 40 of 500 units.' },
];

interface Ctx { entries: AuditEntry[]; log: (e: Omit<AuditEntry, 'id' | 'at' | 'actor' | 'role'>) => void }
const C = createContext<Ctx | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>(SEED);
  const log = useCallback((e: Omit<AuditEntry, 'id' | 'at' | 'actor' | 'role'>) => {
    setEntries((x) => [{
      ...e,
      id: `AUD-${90413 + x.length}`,
      at: new Date().toISOString(),
      actor: user ? `${user.name} (${user.id})` : 'System',
      role: user?.role ?? 'system',
    }, ...x]);
  }, [user]);
  return <C.Provider value={{ entries, log }}>{children}</C.Provider>;
}

export function useAudit(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useAudit outside AuditProvider');
  return c;
}
