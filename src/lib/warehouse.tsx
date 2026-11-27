import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type InboundStatus = 'Pending approval' | 'Approved' | 'In transit' | 'Received' | 'Rejected';
export interface InboundLine { productId: string; sku: string; title: string; unit: string; expected: number; counted?: number; damaged?: number; note?: string }
export interface Inbound {
  id: string; vendorId: string; hubId: string; createdAt: string; status: InboundStatus; lines: InboundLine[];
  slot?: string; vehicle?: string; receivedAt?: string; receivedBy?: string; reason?: string;
}
export interface InstaProgress { picked?: { at: string; by: string; bin: string }; packed?: { at: string; packages: number; weightKg: number }; scanned?: { at: string; awb: string } }

export const HUBS_META: Record<string, { address: string; capacityCbm: number; hours: string; staff: number; manager: string }> = {
  'WH-MUM-01': { address: 'Gala 12–16, Rajlaxmi Complex, Kalher, Bhiwandi 421302', capacityCbm: 1800, hours: '07:00–23:00, all days', staff: 14, manager: 'Sanjay Pawar' },
  'WH-TUP-01': { address: 'SF 221, Avinashi Road, Tiruppur 641603', capacityCbm: 900, hours: '08:00–22:00, Mon–Sat', staff: 7, manager: 'K. Murugan' },
  'WH-DEL-01': { address: 'B-44, Okhla Industrial Area Phase II, New Delhi 110020', capacityCbm: 1400, hours: '07:00–23:00, all days', staff: 11, manager: 'Rakesh Yadav' },
  'WH-BLR-01': { address: '3rd Cross, Peenya 2nd Stage, Bengaluru 560058', capacityCbm: 1100, hours: '08:00–22:00, all days', staff: 9, manager: 'Divya Hegde' },
};

/** Rent rate per cbm per month — TBD with client; mock value. */
export const RENT_PER_CBM = 450;

/** Space used by each vendor in each hub (cbm). */
export const SPACE_USED: { hubId: string; vendorId: string; cbm: number }[] = [
  { hubId: 'WH-MUM-01', vendorId: 'VN-89420', cbm: 38.5 },
  { hubId: 'WH-MUM-01', vendorId: 'VN-38851', cbm: 112 },
  { hubId: 'WH-TUP-01', vendorId: 'VN-55102', cbm: 46 },
  { hubId: 'WH-DEL-01', vendorId: 'VN-61873', cbm: 64.2 },
  { hubId: 'WH-BLR-01', vendorId: 'VN-38851', cbm: 71 },
];

const t = (s: string) => `${s}+05:30`;

const SEED_INBOUND: Inbound[] = [
  { id: 'INB-2026-032', vendorId: 'VN-55102', hubId: 'WH-TUP-01', createdAt: t('2026-11-25T16:00:00'), status: 'Pending approval',
    lines: [{ productId: 'P-2002', sku: 'TW-ST-2705', title: 'Poly-Poly Core Spun Thread, Tex 27, 5000 m', unit: 'cone', expected: 400 }] },
  { id: 'INB-2026-031', vendorId: 'VN-89420', hubId: 'WH-TUP-01', createdAt: t('2026-11-22T11:00:00'), status: 'In transit', slot: '2026-11-26T15:00', vehicle: 'MH-04-KF-2218',
    lines: [
      { productId: 'P-1001', sku: 'NTX-WL-2201', title: 'Woven Damask Main Label, 50 × 20 mm', unit: 'pcs', expected: 20000 },
      { productId: 'P-1004', sku: 'NTX-EL-0525', title: 'Knitted Polyester Elastic, 25 mm', unit: 'm', expected: 1000 },
    ] },
  { id: 'INB-2026-029', vendorId: 'VN-61873', hubId: 'WH-DEL-01', createdAt: t('2026-11-18T10:00:00'), status: 'Received', slot: '2026-11-20T10:00', vehicle: 'DL-1L-AB-4402', receivedAt: t('2026-11-20T11:40:00'), receivedBy: 'Rakesh Yadav',
    lines: [{ productId: 'P-2008', sku: 'ZK-MZ-0518', title: '#5 Metal Zipper, Antique Brass, Auto-lock Slider, 18 cm', unit: 'pcs', expected: 6000, counted: 5940, damaged: 0, note: '60 short: one inner carton missing; vendor informed' }] },
];

const SEED_BINS: Record<string, string> = {
  'WH-MUM-01:P-1001': 'MUM-A-03-2', 'WH-MUM-01:P-1004': 'MUM-A-05-1', 'WH-MUM-01:P-2004': 'MUM-C-11-4',
  'WH-TUP-01:P-2002': 'TUP-B-02-3', 'WH-DEL-01:P-2008': 'DEL-A-07-2', 'WH-BLR-01:P-2004': 'BLR-B-04-1',
};

interface State { inbound: Inbound[]; bins: Record<string, string>; insta: Record<string, InstaProgress> }
interface Ctx extends State {
  patchInbound: (id: string, p: Partial<Inbound>) => void;
  setBin: (key: string, bin: string) => void;
  setInsta: (soId: string, p: InstaProgress) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.warehouse.v1';

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(() => {
    const init: State = { inbound: SEED_INBOUND, bins: SEED_BINS, insta: {} };
    try { const r = localStorage.getItem(KEY); return r ? { ...init, ...JSON.parse(r) } : init; } catch { return init; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(s)), [s]);
  const patchInbound = useCallback((id: string, p: Partial<Inbound>) => setS((x) => ({ ...x, inbound: x.inbound.map((i) => (i.id === id ? { ...i, ...p } : i)) })), []);
  const setBin = useCallback((key: string, bin: string) => setS((x) => ({ ...x, bins: { ...x.bins, [key]: bin } })), []);
  const setInsta = useCallback((soId: string, p: InstaProgress) => setS((x) => ({ ...x, insta: { ...x.insta, [soId]: { ...x.insta[soId], ...p } } })), []);
  return <C.Provider value={{ ...s, patchInbound, setBin, setInsta }}>{children}</C.Provider>;
}

export function useWarehouse(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useWarehouse outside WarehouseProvider');
  return c;
}
