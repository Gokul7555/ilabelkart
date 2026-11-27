import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Fulfilment } from './pricing';

export interface CartItem {
  key: string;
  productId: string;
  qty: number;
  shade?: string;
  fulfilment: Fulfilment;
  /** Unit price the buyer saw when adding. If the live price changes we ask — never silently substitute. */
  priceSeen: number;
  addedAt: string;
}

interface Ctx {
  items: CartItem[];
  addressId: string;
  setAddressId: (id: string) => void;
  add: (i: Omit<CartItem, 'key' | 'addedAt'>) => void;
  update: (key: string, patch: Partial<CartItem>) => void;
  remove: (key: string) => void;
  clear: () => void;
}

/** Seed: one item whose price has since changed, to demonstrate "no silent substitution". */
const SEED: CartItem[] = [
  { key: 'c1', productId: 'P-1001', qty: 5000, shade: 'Navy', fulfilment: 'standard', priceSeen: 2.34, addedAt: '2026-11-24T10:00:00+05:30' },
  { key: 'c2', productId: 'P-2008', qty: 2500, shade: 'Antique Brass', fulfilment: 'standard', priceSeen: 13.45, addedAt: '2026-11-25T16:00:00+05:30' },
];

const C = createContext<Ctx | null>(null);
const KEY = 'tn.cart.v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : SEED; } catch { return SEED; } });
  const [addressId, setAddressId] = useState<string>(() => localStorage.getItem('tn.addr') ?? 'AD-1');
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem('tn.addr', addressId), [addressId]);

  const add = useCallback((i: Omit<CartItem, 'key' | 'addedAt'>) => setItems((xs) => {
    const same = xs.find((x) => x.productId === i.productId && x.shade === i.shade && x.fulfilment === i.fulfilment);
    if (same) return xs.map((x) => (x === same ? { ...x, qty: x.qty + i.qty, priceSeen: i.priceSeen } : x));
    return [...xs, { ...i, key: `c${Date.now()}`, addedAt: new Date().toISOString() }];
  }), []);
  const update = useCallback((key: string, patch: Partial<CartItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x))), []);
  const remove = useCallback((key: string) => setItems((xs) => xs.filter((x) => x.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  return <C.Provider value={{ items, addressId, setAddressId, add, update, remove, clear }}>{children}</C.Provider>;
}

export function useCart(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
