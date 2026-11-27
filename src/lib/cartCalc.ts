import type { Address } from '../data/customer';
import type { Vendor } from '../data/vendors';
import type { CartItem } from './cart';
import type { Listing } from './marketplace';
import { SHIPPING, factoryStock, gstRate, gstSplit, instaCheck, qtyError, tierIndex, unitPrice } from './pricing';
import type { Fulfilment } from './pricing';

export interface CartLine {
  item: CartItem;
  listing: Listing;
  unitPrice: number;
  amount: number;
  gstRate: number;
  tier: number;
  /** Blocking problems the buyer must resolve. Nothing is changed for them silently. */
  issues: { kind: 'price' | 'qty' | 'insta' | 'blocked' | 'missing'; msg: string }[];
}

export interface CartGroup {
  key: string;
  vendor: Vendor;
  fulfilment: Fulfilment;
  hubName?: string;
  leadTimeDays: number;
  lines: CartLine[];
  subtotal: number;
  shipping: number;
  gst: { cgst: number; sgst: number; igst: number; total: number; intra: boolean };
  total: number;
}

export function buildCart(items: CartItem[], listings: Listing[], addr: Address) {
  const groups = new Map<string, CartGroup>();
  const orphans: CartItem[] = [];
  for (const item of items) {
    const listing = listings.find((l) => l.product.id === item.productId);
    if (!listing) { orphans.push(item); continue; }
    const p = listing.product;
    const up = unitPrice(p, item.qty);
    const issues: CartLine['issues'] = [];
    if (listing.salesBlocked) issues.push({ kind: 'blocked', msg: `Sales paused: ${listing.blockReason}` });
    if (Math.abs(up - item.priceSeen) > 0.001) issues.push({ kind: 'price', msg: `Price changed from ₹${item.priceSeen.toFixed(2)} to ₹${up.toFixed(2)} per ${p.live!.unit}` });
    const ic = instaCheck(p, addr, item.qty);
    if (item.fulfilment === 'insta' && !ic.available) issues.push({ kind: 'insta', msg: `TrimInsta unavailable: ${ic.reason}. Switch to Standard Delivery or change the address.` });
    const avail = item.fulfilment === 'insta' ? ic.hubStock : factoryStock(p);
    const qe = qtyError(p, item.qty, avail);
    if (qe && !(item.fulfilment === 'insta' && !ic.available)) issues.push({ kind: 'qty', msg: qe });
    const line: CartLine = { item, listing, unitPrice: up, amount: Math.round(up * item.qty * 100) / 100, gstRate: gstRate(p), tier: tierIndex(p, item.qty), issues };
    const key = `${p.vendorId}:${item.fulfilment}`;
    const g = groups.get(key) ?? {
      key, vendor: listing.vendor, fulfilment: item.fulfilment, hubName: item.fulfilment === 'insta' ? ic.hubName : undefined,
      leadTimeDays: 0, lines: [], subtotal: 0, shipping: 0, gst: { cgst: 0, sgst: 0, igst: 0, total: 0, intra: false }, total: 0,
    };
    g.lines.push(line);
    g.leadTimeDays = Math.max(g.leadTimeDays, p.live!.leadTimeDays);
    groups.set(key, g);
  }
  const list = [...groups.values()].map((g) => {
    const subtotal = g.lines.reduce((s, l) => s + l.amount, 0);
    const shipping = g.fulfilment === 'insta' ? SHIPPING.instaPerShipment : subtotal >= SHIPPING.standardFreeAbove ? 0 : SHIPPING.standardPerShipment;
    // GST on goods per line rate; shipping taxed at 18%.
    const parts = [...g.lines.map((l) => gstSplit(l.amount, l.gstRate, g.vendor.id, addr)), gstSplit(shipping, 18, g.vendor.id, addr)];
    const gst = parts.reduce((a, x) => ({ cgst: a.cgst + x.cgst, sgst: a.sgst + x.sgst, igst: a.igst + x.igst, total: a.total + x.total, intra: x.intra }), { cgst: 0, sgst: 0, igst: 0, total: 0, intra: false });
    return { ...g, subtotal, shipping, gst, total: subtotal + shipping + gst.total };
  });
  const totals = list.reduce((a, g) => ({ subtotal: a.subtotal + g.subtotal, shipping: a.shipping + g.shipping, gst: a.gst + g.gst.total, total: a.total + g.total }), { subtotal: 0, shipping: 0, gst: 0, total: 0 });
  const blocking = list.flatMap((g) => g.lines.flatMap((l) => l.issues)).length + orphans.length;
  return { groups: list, totals, blocking, orphans };
}
