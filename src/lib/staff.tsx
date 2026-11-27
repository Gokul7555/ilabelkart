import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { StaffRole, User } from './auth';

export const PERMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'escalations', label: 'Escalations' },
  { key: 'margin', label: 'Margin Manager' },
  { key: 'coupons', label: 'Coupons & Discounts' },
  { key: 'settlements', label: 'Settlements (payouts)' },
  { key: 'vendors', label: 'Vendors (activate / freeze)' },
  { key: 'config', label: 'Platform Config' },
  { key: 'staff', label: 'Staff & Roles' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'reports', label: 'Reports' },
  { key: 'finance', label: 'Finance desk' },
  { key: 'warehouse', label: 'Warehouse ops' },
] as const;
export type Perm = (typeof PERMS)[number]['key'];
export const STAFF_ROLES: StaffRole[] = ['Super Admin', 'Finance', 'Warehouse'];

export interface StaffMember { id: string; name: string; email: string; role: StaffRole; status: 'Active' | 'Invited' | 'Deactivated'; lastLogin?: string; hub?: string }

const DEFAULT_MATRIX: Record<StaffRole, Record<Perm, boolean>> = {
  'Super Admin': Object.fromEntries(PERMS.map((p) => [p.key, true])) as Record<Perm, boolean>,
  Finance: Object.fromEntries(PERMS.map((p) => [p.key, ['dashboard', 'settlements', 'finance', 'audit', 'reports'].includes(p.key)])) as Record<Perm, boolean>,
  Warehouse: Object.fromEntries(PERMS.map((p) => [p.key, ['warehouse'].includes(p.key)])) as Record<Perm, boolean>,
};

const SEED_STAFF: StaffMember[] = [
  { id: 'ROOT-01', name: 'Arjun Kapoor', email: 'root@trimnova.in', role: 'Super Admin', status: 'Active', lastLogin: '2026-11-26T09:02:00+05:30' },
  { id: 'FN-301', name: 'Meera Pillai', email: 'finance@trimnova.in', role: 'Finance', status: 'Active', lastLogin: '2026-11-26T08:41:00+05:30' },
  { id: 'FN-302', name: 'Rahul Desai', email: 'rahul.d@trimnova.in', role: 'Finance', status: 'Active', lastLogin: '2026-11-25T18:10:00+05:30' },
  { id: 'WH-110', name: 'Sanjay Pawar', email: 'warehouse@trimnova.in', role: 'Warehouse', status: 'Active', hub: 'WH-MUM-01', lastLogin: '2026-11-26T07:05:00+05:30' },
  { id: 'WH-114', name: 'K. Murugan', email: 'murugan@trimnova.in', role: 'Warehouse', status: 'Active', hub: 'WH-TUP-01', lastLogin: '2026-11-26T08:00:00+05:30' },
  { id: 'WH-121', name: 'Divya Hegde', email: 'divya.h@trimnova.in', role: 'Warehouse', status: 'Invited', hub: 'WH-BLR-01' },
];

interface Ctx {
  matrix: Record<StaffRole, Record<Perm, boolean>>;
  staff: StaffMember[];
  can: (u: User | null | undefined, p: Perm) => boolean;
  setPerm: (role: StaffRole, p: Perm, v: boolean) => void;
  upsertStaff: (m: StaffMember) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.staff.v1';

export function StaffProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<{ matrix: Ctx['matrix']; staff: StaffMember[] }>(() => {
    const init = { matrix: DEFAULT_MATRIX, staff: SEED_STAFF };
    try { const r = localStorage.getItem(KEY); return r ? { ...init, ...JSON.parse(r) } : init; } catch { return init; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(s)), [s]);
  const can = useCallback((u: User | null | undefined, p: Perm) => {
    if (!u || u.role !== 'admin') return false;
    return !!s.matrix[u.staffRole ?? 'Super Admin']?.[p];
  }, [s.matrix]);
  // Super Admin always keeps every permission (no lock-out).
  const setPerm = useCallback((role: StaffRole, p: Perm, v: boolean) => role !== 'Super Admin' && setS((x) => ({ ...x, matrix: { ...x.matrix, [role]: { ...x.matrix[role], [p]: v } } })), []);
  const upsertStaff = useCallback((m: StaffMember) => setS((x) => ({ ...x, staff: x.staff.some((y) => y.id === m.id) ? x.staff.map((y) => (y.id === m.id ? m : y)) : [...x.staff, m] })), []);
  return <C.Provider value={{ ...s, can, setPerm, upsertStaff }}>{children}</C.Provider>;
}

export function useStaff(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useStaff outside StaffProvider');
  return c;
}

/** Which permission an admin path needs (longest prefix wins). */
export function permForPath(path: string): Perm | null {
  const map: [string, Perm][] = [
    ['/admin/config/warehouses', 'warehouse'], ['/admin/config/staff', 'staff'], ['/admin/config/audit', 'audit'], ['/admin/config', 'config'],
    ['/admin/finance', 'finance'], ['/admin/warehouse', 'warehouse'], ['/admin/reports', 'reports'], ['/admin/dashboard', 'dashboard'],
    ['/admin/escalations', 'escalations'], ['/admin/margin', 'margin'], ['/admin/coupons', 'coupons'], ['/admin/settlements', 'settlements'], ['/admin/vendors', 'vendors'],
  ];
  return map.find(([p]) => path.startsWith(p))?.[1] ?? null;
}
