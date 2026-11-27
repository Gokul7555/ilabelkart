import { useEffect, useMemo, useRef, useState } from 'react';
import { useTableLabels } from '../components/TableLabels';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Lock, MoreHorizontal } from 'lucide-react';
import { AppBar, NavMenu, NavPills } from '../components/AppBar';
import type { Entry } from '../components/AppBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { NAV, PORTAL_LABEL } from '../config/nav';
import type { NavItem } from '../config/nav';
import { useAuth } from '../lib/auth';
import type { User } from '../lib/auth';
import { useVendorState } from '../lib/vendorState';
import { useCatalog } from '../lib/catalog';
import { useOnboarding, latest } from '../lib/onboarding';
import { isOverdue, useOrders } from '../lib/orders';
import { isOpenTicket, useSupport } from '../lib/support';
import { isOpenCase, useCases } from '../lib/cases';
import { permForPath, useStaff } from '../lib/staff';


const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Turns the sidebar config into top-bar entries: `sub` items fold into their parent, titled sections become dropdowns. */
function buildEntries(user: User, can: (p: NonNullable<ReturnType<typeof permForPath>>) => boolean): Entry[] {
  if (user.role === 'customer') return [];
  const allowed = (it: NavItem) => user.role !== 'admin' || !permForPath(it.to) || can(permForPath(it.to)!);
  const out: Entry[] = [];
  NAV[user.role].forEach((sec) => {
    const items = sec.items.filter(allowed);
    if (!items.length) return;
    if (sec.title) { out.push({ kind: 'menu', label: title(sec.title), icon: items[0].icon, items }); return; }
    items.forEach((it, i) => {
      const subs: NavItem[] = [];
      for (let j = i + 1; j < items.length && items[j].sub; j++) subs.push(items[j]);
      if (it.sub) return;
      if (subs.length) out.push({ kind: 'menu', label: it.label, icon: it.icon, items: [{ ...it, label: `${it.label} · overview` }, ...subs] });
      else out.push({ kind: 'link', item: it });
    });
  });
  return out;
}

export function PortalLayout() {
  const { user } = useAuth();
  const { status } = useVendorState();
  const { can } = useStaff();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useTableLabels(mainRef);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  useEffect(() => { setDrawer(false); setOpenMenu(null); }, [loc.pathname]);

  /* ---------- live count badges ---------- */
  const { products, otherDocs } = useCatalog();
  const { data: onb } = useOnboarding();
  const { subOrders } = useOrders();
  const { tickets, flags } = useSupport();
  const { cases } = useCases();
  const badges = useMemo<Record<string, number>>(() => {
    if (!user) return {} as Record<string, number>;
    const pendingDocs = [...onb.docs, ...Object.values(otherDocs).flat()].filter((d) => latest(d).status === 'Pending').length;
    return {
      '/approver/queue': pendingDocs + products.filter((p) => p.pending).length,
      '/vendor/orders': subOrders.filter((x) => x.vendorId === user.vendorId && x.fulfilment !== 'insta' && (x.status === 'Order Placed' || (x.status === 'Accepted' && isOverdue(x.dispatchBy)))).length,
      '/admin/escalations': subOrders.filter((x) => x.status === 'Partial Review' || (x.status === 'Rejected' && !x.adminNote)).length
        + [...subOrders.map((x) => x.refund), ...cases.map((c) => c.refund)].filter((r) => r && r.status !== 'Succeeded' && !r.approvedBy).length
        + flags.filter((f) => f.status === 'Freeze recommended to Admin').length,
      '/support/tickets': tickets.filter(isOpenTicket).length,
      '/support/disputes': cases.filter(isOpenCase).length,
      '/support/ndr': subOrders.filter((x) => x.status === 'Delivery Failed').length,
      '/support/risk': flags.filter((f) => f.status === 'Open').length,
    };
  }, [user, onb.docs, otherDocs, products, subOrders, cases, flags, tickets]);

  if (!user || user.role === 'customer') return null;
  const portal = PORTAL_LABEL[user.role];
  const portalLabel = user.staffRole && user.staffRole !== 'Super Admin' ? `${user.staffRole.toUpperCase()} DESK` : portal.label;
  const vendorLocked = user.role === 'vendor' && status !== 'active';
  const entries = buildEntries(user, (p) => can(user, p));
  const isActive = (to: string) => (to === '/admin/config' ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(`${to}/`));

  const linkEl = (it: NavItem, onClick?: () => void) => {
    const locked = vendorLocked && it.lockable;
    const n = badges[it.to] ?? 0;
    if (locked) return <span key={it.to} className="pnav-link locked" title="Unlocked after Admin activates your account" aria-disabled="true"><Lock size={13} aria-hidden /> {it.label}</span>;
    return (
      <NavLink key={it.to} to={it.to} end={it.to === '/admin/config'} onClick={onClick} className={({ isActive: a }) => `pnav-link ${a ? 'active' : ''}`}>
        {({ isActive: a }) => <>{a && <it.icon size={16} aria-hidden />}{it.label}{n > 0 && <span className="pnav-badge" aria-label={`${n} pending`}>{n}</span>}</>}
      </NavLink>
    );
  };

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <AppBar user={user} portalLabel={portalLabel} drawer={drawer} onToggleDrawer={() => setDrawer((d) => !d)}
        nav={<NavPills entries={entries} render={(e) => e.kind === 'link' ? linkEl(e.item) : (
          <NavMenu key={e.label} entry={e} open={openMenu === e.label} onToggle={() => setOpenMenu((m) => (m === e.label ? null : e.label))} onClose={() => setOpenMenu(null)}
            active={e.items.some((it) => isActive(it.to))} badges={badges} />
        )} more={(rest) => (
          <NavMenu key="__more" entry={{ kind: 'menu', label: 'More', icon: MoreHorizontal, items: rest.flatMap((e) => (e.kind === 'link' ? [e.item] : e.items)) }}
            open={openMenu === '__more'} onToggle={() => setOpenMenu((m) => (m === '__more' ? null : '__more'))} onClose={() => setOpenMenu(null)}
            active={rest.some((e) => (e.kind === 'link' ? isActive(e.item.to) : e.items.some((it) => isActive(it.to))))} badges={badges} />
        )} />} />

      {/* Mobile drawer: same entries, stacked */}
      <aside className={`sidebar drawer-only ${drawer ? 'open' : ''}`} aria-label="Portal navigation" aria-hidden={!drawer}>
        <div className="sb-brand"><span className="phdr-portal" style={{ color: 'var(--logo-accent)' }}>{portalLabel}</span></div>
        {entries.map((e) => e.kind === 'link' ? (
          <NavLink key={e.item.to} to={e.item.to} className={({ isActive: a }) => `sb-link ${a ? 'active' : ''} ${vendorLocked && e.item.lockable ? 'locked' : ''}`} onClick={(ev) => vendorLocked && e.item.lockable && ev.preventDefault()}>
            <e.item.icon size={16} /> {e.item.label}{(badges[e.item.to] ?? 0) > 0 && <span className="badge">{badges[e.item.to]}</span>}
          </NavLink>
        ) : (
          <div key={e.label} className="sb-nav">
            <div className="sb-section">{e.label.toUpperCase()}</div>
            {e.items.map((it) => <NavLink key={it.to} to={it.to} end={it.to === '/admin/config'} className={({ isActive: a }) => `sb-link sub ${a ? 'active' : ''}`}><it.icon size={15} /> {it.label}</NavLink>)}
          </div>
        ))}
      </aside>
      <div className={`scrim ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />

      <main id="main" className="portal-main" ref={mainRef}>
        <Breadcrumbs />
        <ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary>
      </main>
    </>
  );
}

