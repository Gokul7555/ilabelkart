import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NOTIFICATIONS } from '../data/notifications';
import type { Notice } from '../data/notifications';
import { useAuth } from './auth';
import { isOverdue, useOrders } from './orders';
import { isOpenCase, useCases } from './cases';
import { daysToExpiry, displayStatus, useOnboarding } from './onboarding';
import { useCatalog } from './catalog';
import { isOpenTicket, useSupport } from './support';

interface Ctx { items: Notice[]; unread: number; isRead: (id: string) => boolean; markRead: (id: string) => void; markAll: () => void }
const C = createContext<Ctx | null>(null);
const KEY = 'tn.notifRead.v1';

/** Live notifications derived from platform state, plus the role's seeded ones. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subOrders } = useOrders();
  const { cases } = useCases();
  const { data: onb } = useOnboarding();
  const { products } = useCatalog();
  const { tickets } = useSupport();
  const [read, setRead] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(read)), [read]);

  const items = useMemo<Notice[]>(() => {
    if (!user) return [];
    const out: Notice[] = [];
    if (user.role === 'vendor') {
      const mine = subOrders.filter((s) => s.vendorId === user.vendorId);
      mine.filter((s) => s.status === 'Order Placed' && s.fulfilment !== 'insta').forEach((s) => out.push({ id: `v-new-${s.id}`, title: `New sub-order ${s.id}`, body: `${s.lines[0].qty.toLocaleString('en-IN')} ${s.lines[0].unit} · accept within 1 business day`, at: s.placedAt, tone: isOverdue(s.acceptBy) ? 'red' : 'indigo', to: '/vendor/orders' }));
      mine.filter((s) => s.status === 'Accepted' && s.fulfilment !== 'insta' && isOverdue(s.dispatchBy)).forEach((s) => out.push({ id: `v-late-${s.id}`, title: `Dispatch overdue: ${s.id}`, body: 'Dispatch now to avoid an SLA breach.', at: s.dispatchBy!, tone: 'red', to: '/vendor/orders' }));
      cases.filter((c) => c.vendorId === user.vendorId && isOpenCase(c)).forEach((c) => out.push({ id: `v-case-${c.id}`, title: `Damage claim ${c.id}`, body: `${c.status}. Payout for ${c.subOrderId} is held.`, at: c.createdAt, tone: 'amber', to: '/vendor/settlements' }));
      onb.docs.filter((d) => { const n = daysToExpiry(d); return n !== null && n <= 30 && ['Approved', 'Expired'].includes(displayStatus(d)); }).forEach((d) => out.push({ id: `v-cert-${d.id}`, title: `${d.title} ${(daysToExpiry(d) ?? 0) < 0 ? 'has expired' : `expires in ${daysToExpiry(d)} days`}`, body: 'Upload the renewal to keep the badge and sales active.', at: new Date().toISOString(), tone: 'amber', to: '/vendor/kyc' }));
      products.filter((p) => p.vendorId === user.vendorId && p.rejected && !p.pending).forEach((p) => out.push({ id: `v-rej-${p.id}-${p.rejected!.version.v}`, title: `Listing rejected: ${p.sku}`, body: p.rejected!.reason, at: p.rejected!.at, tone: 'red', to: `/vendor/catalog/${p.id}` }));
      out.push(...NOTIFICATIONS.vendor.filter((n) => n.id === 'n4'));
    } else if (user.role === 'customer') {
      const mine = subOrders.filter((s) => s.customerId === user.customerId);
      mine.filter((s) => s.status === 'Out for Delivery').forEach((s) => out.push({ id: `c-ofd-${s.id}`, title: `Out for delivery: ${s.orderId}`, body: `Share delivery OTP ${s.deliveryOtp} with the courier only at handover.`, at: s.events[s.events.length - 1].at, tone: 'blue', to: `/account/orders/${s.orderId}` }));
      mine.filter((s) => s.returnWindowEnds && new Date(s.returnWindowEnds).getTime() > Date.now() && new Date(s.returnWindowEnds).getTime() - Date.now() < 3 * 86400000).forEach((s) => out.push({ id: `c-win-${s.id}`, title: `Return window closing: ${s.orderId}`, body: `Claims for ${s.id} close soon.`, at: s.delivery?.at ?? s.placedAt, tone: 'amber', to: `/account/orders/${s.orderId}` }));
      mine.filter((s) => s.status === 'Delivery Failed').forEach((s) => out.push({ id: `c-ndr-${s.id}`, title: 'Delivery attempt failed', body: `${s.id}: Support will call to confirm your address.`, at: s.ndr?.lastAttempt ?? s.placedAt, tone: 'red', to: `/account/orders/${s.orderId}` }));
      mine.filter((s) => s.refund && s.refund.status !== 'Succeeded').forEach((s) => out.push({ id: `c-rf-${s.refund!.ref}-${s.refund!.status}`, title: `Refund ${s.refund!.status}: ${s.refund!.ref}`, body: `${s.id} · not yet credited`, at: s.refund!.at, tone: 'amber', to: `/account/orders/${s.orderId}` }));
      cases.filter((c) => c.customerId === user.customerId && c.status === 'More evidence requested').forEach((c) => out.push({ id: `c-ev-${c.id}`, title: `Case ${c.ticketId} needs more evidence`, body: 'Support requested additional photos.', at: c.events[c.events.length - 1].at, tone: 'indigo', to: '/account/cases' }));
    } else if (user.role === 'support') {
      tickets.filter((t) => isOpenTicket(t) && t.priority === 'URGENT').forEach((t) => out.push({ id: `s-urg-${t.id}`, title: `Urgent: ${t.subject}`, body: `${t.id} · act within 24 hours`, at: t.createdAt, tone: 'red', to: `/support/tickets/${t.id}` }));
      cases.filter((c) => c.status === 'Escalated to Support').forEach((c) => out.push({ id: `s-esc-${c.id}`, title: `Dispute escalated: ${c.id}`, body: 'Vendor did not respond within 2 business days.', at: c.vendorRespondBy, tone: 'amber', to: '/support/disputes' }));
    } else {
      out.push(...NOTIFICATIONS[user.role]);
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [user, subOrders, cases, onb.docs, products, tickets]);

  const mine = user ? read[user.id] ?? [] : [];
  const isRead = useCallback((id: string) => mine.includes(id), [mine]);
  const markRead = useCallback((id: string) => user && setRead((r) => ({ ...r, [user.id]: [...new Set([...(r[user.id] ?? []), id])] })), [user]);
  const markAll = useCallback(() => user && setRead((r) => ({ ...r, [user.id]: [...new Set([...(r[user.id] ?? []), ...items.map((i) => i.id)])] })), [user, items]);
  return <C.Provider value={{ items, unread: items.filter((i) => !mine.includes(i.id)).length, isRead, markRead, markAll }}>{children}</C.Provider>;
}

export function useNotifications(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useNotifications outside NotificationsProvider');
  return c;
}
