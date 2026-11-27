import { GST_RATE, categoryById } from '../data/categories';
import { TRIMINSTA_HUBS } from '../data/india';
import { vendorById } from '../data/vendors';
import type { Address } from '../data/customer';
import { customerPrice } from './catalog';
import type { Product } from './catalog';

/** Mock shipping rates (pricing not specified in the brief — configurable). */
export const SHIPPING = { standardPerShipment: 180, standardFreeAbove: 25000, instaPerShipment: 350 };
/** Mock COD eligibility rule — configurable. */
export const COD_LIMIT = 50000;

export type Fulfilment = 'standard' | 'insta';

/** Index of the tier that applies for this quantity. */
export function tierIndex(p: Product, qty: number): number {
  const t = p.live!.tiers;
  let idx = 0;
  t.forEach((x, i) => { if (qty >= x.min) idx = i; });
  return idx;
}

/** Customer unit price (pre-tax) for a quantity, including the category commission. */
export function unitPrice(p: Product, qty: number): number {
  return customerPrice(p.live!.tiers[tierIndex(p, qty)].price, p.categoryId);
}

export const gstRate = (p: Product) => GST_RATE[p.categoryId] ?? 12;

/** Factory (non-hub) stock available for Standard delivery. */
export const factoryStock = (p: Product) => p.stock.filter((l) => !l.loc.startsWith('WH-')).reduce((s, l) => s + l.qty, 0);
export const hubStock = (p: Product, hubId: string) => p.stock.filter((l) => l.loc.startsWith(hubId)).reduce((s, l) => s + l.qty, 0);

export interface InstaCheck { available: boolean; reason?: string; hubName?: string; hubStock: number; km?: number }

/** TrimInsta: nearest hub, only inside the ~6 km service zone, and only with stock. */
export function instaCheck(p: Product, addr: Address, qty = 0): InstaCheck {
  if (!p.live?.insta) return { available: false, reason: 'Not offered for this product', hubStock: 0 };
  if (!addr.hubId) return { available: false, reason: `${addr.city} ${addr.pin} is outside every TrimInsta service zone (~6 km)`, hubStock: 0 };
  const hub = TRIMINSTA_HUBS.find((h) => h.id === addr.hubId)!;
  const stock = hubStock(p, addr.hubId);
  if (stock <= 0) return { available: false, reason: `Out of stock at ${hub.name}`, hubName: hub.name, hubStock: 0, km: addr.hubKm ?? undefined };
  if (qty > stock) return { available: false, reason: `Only ${stock.toLocaleString('en-IN')} available at ${hub.name}`, hubName: hub.name, hubStock: stock, km: addr.hubKm ?? undefined };
  return { available: true, hubName: hub.name, hubStock: stock, km: addr.hubKm ?? undefined };
}

/** Quantity rules: MOQ, pack multiple, stock. Returns an error message or null. */
export function qtyError(p: Product, qty: number, available: number): string | null {
  const v = p.live!;
  if (!Number.isFinite(qty) || qty <= 0) return 'Enter a quantity';
  if (qty < v.moq) return `Minimum order is ${v.moq.toLocaleString('en-IN')} ${v.unit}`;
  if (qty % v.packMultiple !== 0) return `Order in packs of ${v.packMultiple.toLocaleString('en-IN')} (e.g. ${(Math.ceil(qty / v.packMultiple) * v.packMultiple).toLocaleString('en-IN')})`;
  if (qty > available) return available <= 0 ? 'Out of stock' : `Only ${available.toLocaleString('en-IN')} ${v.unit} available`;
  return null;
}

/** GST split: CGST+SGST within the same state, IGST across states. */
export function gstSplit(amount: number, rate: number, vendorId: string, addr: Address) {
  const tax = Math.round(amount * rate) / 100;
  const intra = vendorById(vendorId)?.state === addr.state;
  return intra ? { intra, cgst: tax / 2, sgst: tax / 2, igst: 0, total: tax } : { intra, cgst: 0, sgst: 0, igst: tax, total: tax };
}

export const categoryName = (id: string) => categoryById(id)?.name ?? id;
