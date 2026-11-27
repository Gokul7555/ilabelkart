import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/** Vendor account lifecycle. Portal items marked `lockable` stay locked until 'active'. */
export type VendorStatus = 'onboarding' | 'under_review' | 'active' | 'frozen';

interface Ctx { status: VendorStatus; setStatus: (s: VendorStatus) => void }
const C = createContext<Ctx>({ status: 'active', setStatus: () => {} });
const KEY = 'tn.vendorStatus';

export function VendorStateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VendorStatus>(() => (localStorage.getItem(KEY) as VendorStatus) || 'active');
  useEffect(() => localStorage.setItem(KEY, status), [status]);
  return <C.Provider value={{ status, setStatus }}>{children}</C.Provider>;
}

export const useVendorState = () => useContext(C);
