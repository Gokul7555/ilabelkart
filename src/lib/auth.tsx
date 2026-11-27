import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Role = 'vendor' | 'customer' | 'approver' | 'admin' | 'support';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  org: string;
  /** Vendor id this user belongs to (vendors are siloed by this). */
  vendorId?: string;
  customerId?: string;
  /** Admin-console staff role (role-gated Finance / Warehouse screens). */
  staffRole?: StaffRole;
}

export type StaffRole = 'Super Admin' | 'Finance' | 'Warehouse';

interface Account {
  login: string;
  password: string;
  totp?: string;
  user: User;
}

/** Mock directory — the demo credentials from the brief. */
export const ACCOUNTS: Account[] = [
  {
    login: 'procurement@novatex.in',
    password: 'NovaTex@2024',
    user: { id: 'VN-89420', role: 'vendor', name: 'Rohan Mehta', email: 'procurement@novatex.in', org: 'NovaTex Manufacturing', vendorId: 'VN-89420' },
  },
  {
    login: 'buyer@raymondgarments.in',
    password: 'Raymond@2024',
    user: { id: 'CU-30117', role: 'customer', name: 'Priya Nair', email: 'buyer@raymondgarments.in', org: 'Raymond Garments Ltd', customerId: 'CU-30117' },
  },
  {
    login: 'approver@trimnova.in',
    password: 'Approver@2024',
    user: { id: 'AP-1042', role: 'approver', name: 'Kavya Iyer', email: 'approver@trimnova.in', org: 'TrimNova Catalogue Quality' },
  },
  {
    login: 'ROOT-01',
    password: 'AdminRoot@2024',
    totp: '849201',
    user: { id: 'ROOT-01', role: 'admin', name: 'Arjun Kapoor', email: 'root@trimnova.in', org: 'TrimNova Platform', staffRole: 'Super Admin' },
  },
  {
    login: 'finance@trimnova.in',
    password: 'Finance@2024',
    totp: '849201',
    user: { id: 'FN-301', role: 'admin', name: 'Meera Pillai', email: 'finance@trimnova.in', org: 'TrimNova Finance', staffRole: 'Finance' },
  },
  {
    login: 'warehouse@trimnova.in',
    password: 'Warehouse@2024',
    totp: '849201',
    user: { id: 'WH-110', role: 'admin', name: 'Sanjay Pawar', email: 'warehouse@trimnova.in', org: 'TrimNova Hub Ops', staffRole: 'Warehouse' },
  },
  {
    login: 'support@trimnova.in',
    password: 'Support@2024',
    user: { id: 'SP-2210', role: 'support', name: 'Neha Sharma', email: 'support@trimnova.in', org: 'TrimNova Support & Ops' },
  },
];

export const HOME_BY_ROLE: Record<Role, string> = {
  vendor: '/vendor/dashboard',
  customer: '/marketplace',
  approver: '/approver/queue',
  admin: '/admin/dashboard',
  support: '/support/tickets',
};

/** Landing page per user (staff roles land on their own desk). */
export function homeFor(u: User): string {
  if (u.role === 'admin' && u.staffRole === 'Finance') return '/admin/finance/payments';
  if (u.role === 'admin' && u.staffRole === 'Warehouse') return '/admin/warehouse/insta';
  return HOME_BY_ROLE[u.role];
}

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: string }
  | { ok: false; needTotp: true };

interface AuthCtx {
  user: User | null;
  login: (login: string, password: string, totp?: string) => LoginResult;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = 'tn.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((login: string, password: string, totp?: string): LoginResult => {
    const acc = ACCOUNTS.find((a) => a.login.toLowerCase() === login.trim().toLowerCase());
    if (!acc || acc.password !== password) return { ok: false, error: 'Invalid credentials. Check your email/ID and password.' };
    if (acc.totp) {
      // Admin: TOTP required; the brief allows a blank code in the demo.
      if (totp === undefined) return { ok: false, needTotp: true };
      if (totp !== '' && totp !== acc.totp) return { ok: false, error: 'Invalid authenticator code.' };
    }
    localStorage.setItem(KEY, JSON.stringify(acc.user));
    setUser(acc.user);
    return { ok: true, user: acc.user };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
