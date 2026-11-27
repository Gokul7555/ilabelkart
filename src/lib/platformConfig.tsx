import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/** Admin-controlled platform settings. Edited in Admin › Platform Cfg (Phase 7). */
export interface PlatformConfig {
  /** Approved requirement says registration is free → default OFF. Open with client (TBD). */
  registrationFeeOn: boolean;
  registrationFee: number;
  gstRate: number; // % on platform fees
  returnWindowDays: number; // 5–7
  /** TrimInsta service-zone radius per hub, km (~6 by default). */
  zones: Record<string, number>;
  /** Subscription tiers — names & prices are TBD with client. */
  tiers: { name: string; price: string }[];
  /** Notification rules: event → channels. Providers TBD. */
  notify: Record<string, { email: boolean; sms: boolean; whatsapp: boolean }>;
}

export const NOTIFY_EVENTS: { key: string; label: string; to: string }[] = [
  { key: 'order_placed', label: 'Order placed', to: 'Buyer + vendor' },
  { key: 'accept_sla', label: 'Acceptance SLA about to breach', to: 'Vendor' },
  { key: 'dispatched', label: 'Dispatched / out for delivery', to: 'Buyer' },
  { key: 'delivered', label: 'Delivered (with invoice)', to: 'Buyer' },
  { key: 'ndr', label: 'Delivery failed (NDR)', to: 'Buyer + Support' },
  { key: 'dispute', label: 'Damage claim raised / decided', to: 'Buyer + vendor' },
  { key: 'cert_expiry', label: 'Certificate expiring in 30 / 7 days', to: 'Vendor' },
  { key: 'payout', label: 'Payout released (with UTR)', to: 'Vendor' },
]

const DEFAULTS: PlatformConfig = {
  registrationFeeOn: false, registrationFee: 5000, gstRate: 18, returnWindowDays: 7,
  zones: { 'WH-MUM-01': 6, 'WH-TUP-01': 6, 'WH-DEL-01': 6, 'WH-BLR-01': 6 },
  tiers: [{ name: 'Free', price: 'TBD' }, { name: 'Standard', price: 'TBD' }, { name: 'Premium', price: 'TBD' }],
  notify: Object.fromEntries(['order_placed', 'accept_sla', 'dispatched', 'delivered', 'ndr', 'dispute', 'cert_expiry', 'payout'].map((k) => [k, { email: true, sms: ['ndr', 'accept_sla', 'dispatched'].includes(k), whatsapp: false }])),
};
const KEY = 'tn.platformConfig';

interface Ctx { cfg: PlatformConfig; update: (p: Partial<PlatformConfig>) => void }
const C = createContext<Ctx>({ cfg: DEFAULTS, update: () => {} });

export function PlatformConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<PlatformConfig>(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(cfg)), [cfg]);
  return <C.Provider value={{ cfg, update: (p) => setCfg((c) => ({ ...c, ...p })) }}>{children}</C.Provider>;
}

export const usePlatformConfig = () => useContext(C);
