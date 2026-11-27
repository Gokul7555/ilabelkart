import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Hexagon, Menu, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bellmenu, RegionChip, UserMenu } from '../layouts/TopBar';
import { BRAND } from '../config/brand';
import type { NavItem } from '../config/nav';
import { homeFor } from '../lib/auth';
import type { User } from '../lib/auth';
import { useOrders } from '../lib/orders';
import { useCatalog } from '../lib/catalog';
import { useSupport } from '../lib/support';
import { VENDORS } from '../data/vendors';
import { customerById } from '../data/customer';

/** Top navigation entry: a direct link, or a dropdown group (Admin: Platform Cfg, Finance, Warehouse). */
export type Entry = { kind: 'link'; item: NavItem } | { kind: 'menu'; label: string; icon: LucideIcon; items: NavItem[] };

/**
 * App bar: logo tile + name + mono caption · pill navigation · region, search, bell, user pills.
 * Sticky and translucent; below lg the nav collapses into the drawer (menu button).
 */
export function AppBar({ user, portalLabel, nav, drawer, onToggleDrawer }: { user: User; portalLabel: string; nav: ReactNode; drawer: boolean; onToggleDrawer: () => void }) {
  return (
      <header className="phdr">
        <div className="phdr-inner">
          <button className="icon-btn menu-toggle" onClick={onToggleDrawer} aria-label="Open menu" aria-expanded={drawer}><Menu size={18} /></button>
          <Link to={homeFor(user)} className="phdr-brand" aria-label={`${BRAND.name} ${portalLabel} home`}>
            <span className="phdr-mark"><Hexagon size={20} strokeWidth={2.4} aria-hidden /></span>
            <span><span className="phdr-name">{BRAND.name}</span><span className="phdr-portal">{portalLabel}</span></span>
          </Link>

          {nav}
          <RegionChip compact />
          <PortalSearch user={user} />
          <Bellmenu />
          <UserMenu chip />
        </div>
      </header>
  );
}

/**
 * Priority+ navigation: shows as many entries as fit, the rest go into "More".
 * Widths are measured from a hidden copy so nothing is clipped or scrolled out of sight.
 */
export function NavPills({ entries, render, more }: { entries: Entry[]; render: (e: Entry) => ReactNode; more: (rest: Entry[]) => ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(entries.length);
  const key = entries.map((e) => (e.kind === 'link' ? e.item.to : e.label)).join('|');
  useLayoutEffect(() => {
    const calc = () => {
      if (!slot.current || !measure.current) return;
      const avail = slot.current.clientWidth - 12;
      const widths = Array.from(measure.current.children).map((c) => (c as HTMLElement).getBoundingClientRect().width + 2);
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= avail) { setFit(widths.length); return; }
      const moreW = 120;
      let used = 0; let n = 0;
      while (n < widths.length && used + widths[n] + moreW <= avail) { used += widths[n]; n++; }
      setFit(Math.max(1, n));
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (slot.current) ro.observe(slot.current);
    return () => ro.disconnect();
  }, [key]);
  const shown = entries.slice(0, fit);
  const rest = entries.slice(fit);
  return (
    <div ref={slot} className="pnav-slot">
      <nav className="pnav" aria-label="Portal navigation">
        {shown.map((e) => <Fragment key={e.kind === 'link' ? e.item.to : e.label}>{render(e)}</Fragment>)}
        {rest.length > 0 && more(rest)}
      </nav>
      <div ref={measure} className="pnav pnav-measure" aria-hidden="true" inert>
        {entries.map((e) => <Fragment key={e.kind === 'link' ? e.item.to : e.label}>{render(e)}</Fragment>)}
      </div>
    </div>
  );
}

/** Dropdown in the top bar. Positioned `fixed` so the scrollable nav doesn't clip it. */
export function NavMenu({ entry, open, onToggle, onClose, active, badges }: {
  entry: Extract<Entry, { kind: 'menu' }>; open: boolean; onToggle: () => void; onClose: () => void; active: boolean; badges: Record<string, number>;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 260) });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); btn.current?.focus(); } };
    const s = () => onClose();
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k); window.addEventListener('resize', s); window.addEventListener('scroll', s, true);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); window.removeEventListener('resize', s); window.removeEventListener('scroll', s, true); };
  }, [open, onClose]);
  const total = entry.items.reduce((a, it) => a + (badges[it.to] ?? 0), 0);
  return (
    <>
      <button ref={btn} className={`pnav-link ${active ? 'active' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        {active && <entry.icon size={16} aria-hidden />}{entry.label}{total > 0 && <span className="pnav-badge">{total}</span>}<ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div ref={menu} className="pnav-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
          {entry.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === '/admin/config'} role="menuitem" className={({ isActive: a }) => (a ? 'active' : '')} onClick={onClose}>
              <it.icon size={15} aria-hidden /> <span className="grow">{it.label}</span>{(badges[it.to] ?? 0) > 0 && <span className="pnav-badge">{badges[it.to]}</span>}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
}

/** Role-aware quick search over the records each portal can see. */
export function PortalSearch({ user }: { user: User }) {
  const nav = useNavigate();
  const { subOrders } = useOrders();
  const { products } = useCatalog();
  const { tickets } = useSupport();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const placeholder = { vendor: 'Search SO, SKU, buyer', approver: 'Search SKU, vendor', admin: 'Search vendor, SO, AWB', support: 'Search ticket, order, AWB' }[user.role as 'vendor'];
  const needle = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (needle.length < 2) return [];
    const r: { key: string; label: string; sub: string; to: string }[] = [];
    const has = (...xs: (string | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(needle));
    if (user.role === 'vendor') {
      subOrders.filter((s) => s.vendorId === user.vendorId && has(s.id, s.awb, customerById(s.customerId)?.company, s.lines[0].sku)).forEach((s) => r.push({ key: s.id, label: s.id, sub: `${customerById(s.customerId)?.company} · ${s.status}`, to: '/vendor/orders' }));
      products.filter((p) => p.vendorId === user.vendorId && has(p.sku, (p.live ?? p.pending ?? p.draft ?? p.rejected?.version)?.title)).forEach((p) => r.push({ key: p.id, label: p.sku, sub: (p.live ?? p.pending ?? p.draft ?? p.rejected?.version)?.title ?? '', to: `/vendor/catalog/${p.id}` }));
    } else if (user.role === 'approver') {
      products.filter((p) => has(p.sku, p.pending?.title, p.live?.title, VENDORS.find((v) => v.id === p.vendorId)?.name)).forEach((p) => r.push({ key: p.id, label: p.sku, sub: `${VENDORS.find((v) => v.id === p.vendorId)?.name}${p.pending ? ' · awaiting review' : ''}`, to: '/approver/queue' }));
    } else if (user.role === 'support') {
      tickets.filter((t) => has(t.id, t.orderId, t.subject, customerById(t.customerId)?.company, ...t.subOrderIds, ...subOrders.filter((s) => t.subOrderIds.includes(s.id)).map((s) => s.awb))).forEach((t) => r.push({ key: t.id, label: t.id, sub: `${t.type} · ${t.subject}`, to: `/support/tickets/${t.id}` }));
    } else {
      VENDORS.filter((v) => has(v.name, v.id, v.gstin)).forEach((v) => r.push({ key: v.id, label: v.name, sub: `${v.id} · ${v.city}`, to: '/admin/vendors' }));
      subOrders.filter((s) => has(s.id, s.awb, s.orderId)).forEach((s) => r.push({ key: s.id, label: s.id, sub: `${s.status} · ${customerById(s.customerId)?.company}`, to: '/admin/settlements' }));
    }
    return r.slice(0, 8);
  }, [needle, user, subOrders, products, tickets]);

  return (
    <div ref={box} className="psearch-wrap">
      <label className="psearch">
        <Search size={16} aria-hidden />
        <span className="sr-only">Search</span>
        <input value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { nav(results[0].to); setOpen(false); setQ(''); } if (e.key === 'Escape') setOpen(false); }} role="combobox" aria-expanded={open && results.length > 0} aria-controls="psearch-results" />
        {q && <button type="button" className="icon-btn light" style={{ width: 22, height: 22, border: 0 }} onClick={() => setQ('')} aria-label="Clear search"><X size={13} /></button>}
      </label>
      {open && needle.length >= 2 && (
        <div className="popover" id="psearch-results" role="listbox" style={{ width: 340 }}>
          {results.length === 0 ? <div className="small muted" style={{ padding: 14 }}>No matches for “{q}”.</div> : results.map((r) => (
            <button key={r.key} role="option" aria-selected="false" className="demo-row" style={{ padding: '9px 14px', display: 'block' }} onClick={() => { nav(r.to); setOpen(false); setQ(''); }}>
              <span className="mono bold" style={{ display: 'block' }}>{r.label}</span><span className="xs muted">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
