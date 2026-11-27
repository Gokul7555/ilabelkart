import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ADDRESSES, CUSTOMER } from '../data/customer';
import type { Address } from '../data/customer';

export interface TeamMember { id: string; name: string; email: string; role: 'Owner' | 'Buyer' | 'Accounts' | 'Receiving'; status: 'Active' | 'Invited' }
export interface Company { name: string; gstin: string; pan: string; industry: string; billing: string; phone: string; email: string }

interface State {
  company: Company;
  addresses: Address[];
  defaultId: string;
  team: TeamMember[];
  prefs: Record<string, { email: boolean; sms: boolean; whatsapp: boolean }>;
}

const INIT: State = {
  company: { name: CUSTOMER.company, gstin: CUSTOMER.gstin, pan: 'AAACR5055K', industry: 'Apparel manufacturing (shirts, suiting)', billing: 'Raymond House, Pokhran Road No. 1, Jekegram, Thane 400606, Maharashtra', phone: CUSTOMER.phone, email: 'accounts@raymondgarments.in' },
  addresses: ADDRESSES,
  defaultId: 'AD-1',
  team: [
    { id: 'TM-1', name: 'Priya Nair', email: 'buyer@raymondgarments.in', role: 'Owner', status: 'Active' },
    { id: 'TM-2', name: 'Suresh Patil', email: 'stores.thane@raymondgarments.in', role: 'Receiving', status: 'Active' },
    { id: 'TM-3', name: 'Lakshmi Menon', email: 'accounts@raymondgarments.in', role: 'Accounts', status: 'Active' },
  ],
  prefs: {
    'Order updates': { email: true, sms: true, whatsapp: false },
    'Delivery OTP & out-for-delivery': { email: false, sms: true, whatsapp: true },
    'Invoices': { email: true, sms: false, whatsapp: false },
    'Cases & refunds': { email: true, sms: true, whatsapp: false },
  },
};

interface Ctx extends State {
  patchCompany: (p: Partial<Company>) => void;
  upsertAddress: (a: Address) => void;
  removeAddress: (id: string) => void;
  setDefault: (id: string) => void;
  upsertMember: (m: TeamMember) => void;
  setPref: (k: string, ch: 'email' | 'sms' | 'whatsapp', v: boolean) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.profile.v1';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => { try { const r = localStorage.getItem(KEY); return r ? { ...INIT, ...JSON.parse(r) } : INIT; } catch { return INIT; } });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(s)), [s]);
  const patchCompany = useCallback((p: Partial<Company>) => setS((x) => ({ ...x, company: { ...x.company, ...p } })), []);
  const upsertAddress = useCallback((a: Address) => setS((x) => ({ ...x, addresses: x.addresses.some((y) => y.id === a.id) ? x.addresses.map((y) => (y.id === a.id ? a : y)) : [...x.addresses, a] })), []);
  const removeAddress = useCallback((id: string) => setS((x) => ({ ...x, addresses: x.addresses.filter((a) => a.id !== id) })), []);
  const setDefault = useCallback((id: string) => setS((x) => ({ ...x, defaultId: id })), []);
  const upsertMember = useCallback((m: TeamMember) => setS((x) => ({ ...x, team: x.team.some((y) => y.id === m.id) ? x.team.map((y) => (y.id === m.id ? m : y)) : [...x.team, m] })), []);
  const setPref = useCallback((k: string, ch: 'email' | 'sms' | 'whatsapp', v: boolean) => setS((x) => ({ ...x, prefs: { ...x.prefs, [k]: { ...x.prefs[k], [ch]: v } } })), []);
  return <C.Provider value={{ ...s, patchCompany, upsertAddress, removeAddress, setDefault, upsertMember, setPref }}>{children}</C.Provider>;
}

export function useProfile(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useProfile outside ProfileProvider');
  return c;
}
