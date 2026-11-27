import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, Bell, ChevronDown, FileText, Globe, LayoutGrid, LogOut, Mail, Moon, Phone, RefreshCw, Search, ShoppingCart, Sun, User, Zap,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';
import { CATEGORIES, CLASSIFICATIONS } from '../data/categories';
import { homeFor, useAuth } from '../lib/auth';
import { useNotifications } from '../lib/notifications';
import { useTheme } from '../lib/theme';
import { fmtDateTime, num } from '../lib/format';
import { useToast } from '../lib/toast';

const REGIONS = [
  { code: 'IN', name: 'India', domain: BRAND.domain, live: true },
  { code: 'BD', name: 'Bangladesh', domain: 'TBD', live: false },
  { code: 'VN', name: 'Vietnam', domain: 'TBD', live: false },
];
/** Platform contact details shown in the utility bar (mock). */
export const CONTACT = { phone: '+91 22 4890 2200', email: 'sales@trimnova.in', gstin: '27AAJCT4410M1ZQ' };

function useClickAway<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open, close]);
  return ref;
}

export function RegionChip({ compact }: { compact?: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="region-chip" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {compact
          ? <><Globe size={15} aria-hidden /><b>{BRAND.region.code}</b><span className="sr-only">Region: {BRAND.region.name}, {BRAND.domain}</span></>
          : <><Globe size={13} /><span className="tag long">AUTO-SWITCHED REGION:</span><b>{BRAND.region.name} ({BRAND.region.code})</b><span className="long">· {BRAND.domain}</span><ChevronDown size={13} /></>}
      </button>
      {open && (
        <div className="popover" style={{ width: 280 }} role="listbox">
          <div style={{ padding: '10px 14px' }} className="caps muted">Select region</div>
          {REGIONS.map((r) => (
            <button key={r.code} className="demo-row" disabled={!r.live} style={{ padding: '9px 14px', opacity: r.live ? 1 : 0.5, cursor: r.live ? 'pointer' : 'not-allowed' }}
              onClick={() => { setOpen(false); if (r.live) toast('info', `Region: ${r.name}`, `Prices in INR with GST rules for ${r.code}`); }}>
              <b style={{ width: 28 }}>{r.code}</b><span className="grow">{r.name}</span><span className="xs muted">{r.live ? r.domain : 'Other Countries: TBD'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function ThemeMenuItem() {
  const { theme, toggle } = useTheme();
  return <button className="demo-row" style={{ padding: '10px 14px' }} onClick={toggle}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>;
}

export function Bellmenu() {
  const nav = useNavigate();
  const { items, unread, isRead, markRead, markAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell size={18} />{unread > 0 && <span className="dot">{unread}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="row-between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <b>Notifications</b><button className="btn btn-ghost btn-xs" onClick={markAll}>Mark all read</button>
          </div>
          {items.length === 0 && <div className="small muted" style={{ padding: 16 }}>You're all caught up.</div>}
          {items.slice(0, 6).map((n) => (
            <button key={n.id} className={`notif ${isRead(n.id) ? '' : 'unread'}`} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}
              onClick={() => { markRead(n.id); setOpen(false); if (n.to) nav(n.to); }}>
              <span className="n-dot" style={{ background: `var(--${{ red: 'danger', amber: 'warning', green: 'success', blue: 'info', indigo: 'primary' }[n.tone]})` }} />
              <span className="grow"><span className="bold" style={{ display: 'block' }}>{n.title}</span><span className="muted" style={{ display: 'block' }}>{n.body}</span><span className="xs muted">{fmtDateTime(n.at)}</span></span>
            </button>
          ))}
          <div style={{ padding: 10, textAlign: 'center' }}><Link to="/notifications" className="small bold" onClick={() => setOpen(false)}>Open notification centre</Link></div>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ chip }: { chip?: boolean }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(open, () => setOpen(false));
  if (!user) {
    return (
      <div className="row" style={{ gap: 6 }}>
        <Link to="/login" className="btn btn-primary btn-sm"><User size={14} /> Sign in</Link>
        <Link to="/register" className="btn btn-ghost btn-sm long" style={{ color: 'var(--header-ink)' }}>Register</Link>
      </div>
    );
  }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {chip ? (
        <button className="puser" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${user.name}`}>
          <span className="puser-avatar">{(user.role === 'vendor' ? user.org : user.name)[0]}</span>
          <span className="puser-text long"><span className="puser-name">{user.role === 'vendor' ? user.org.split(' ')[0] : user.name.split(' ')[0]}</span><span className="puser-id">{user.id}</span></span>
          <ChevronDown size={14} aria-hidden />
        </button>
      ) : (
        <button className="topbar-user" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
          <span className="avatar sm">{user.name[0]}</span><span className="long">{user.org}</span><ChevronDown size={13} />
        </button>
      )}
      {open && (
        <div className="popover" style={{ width: 260 }} role="menu">
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
            <div className="bold">{user.name}</div>
            <div className="xs muted mono">{user.id}{user.staffRole ? ` · ${user.staffRole}` : ''}</div>
            <div className="xs muted">{user.org}</div>
            <div className="xs muted">{user.email}</div>
          </div>
          <Link className="demo-row" style={{ padding: '10px 14px', textDecoration: 'none' }} to={homeFor(user)} onClick={() => setOpen(false)}><LayoutGrid size={14} /> My home</Link>
          {user.role === 'customer' && <Link className="demo-row" style={{ padding: '10px 14px', textDecoration: 'none' }} to="/account/profile" onClick={() => setOpen(false)}><User size={14} /> Company profile</Link>}
          <Link className="demo-row" style={{ padding: '10px 14px', textDecoration: 'none' }} to="/notifications" onClick={() => setOpen(false)}><Bell size={14} /> Notification centre</Link>
          {user.role !== 'customer' && <Link className="demo-row" style={{ padding: '10px 14px', textDecoration: 'none' }} to="/design" onClick={() => setOpen(false)}><LayoutGrid size={14} /> Design system</Link>}
          {chip && <ThemeMenuItem />}
          <button className="demo-row" style={{ padding: '10px 14px' }} onClick={() => {
            if (!window.confirm('Reset all demo data (orders, catalog, cases, settings) to the original seed? You stay signed in.')) return;
            Object.keys(localStorage).filter((k) => k.startsWith('tn.') && k !== 'tn.session' && k !== 'tn.theme').forEach((k) => localStorage.removeItem(k));
            window.location.reload();
          }}><RefreshCw size={14} /> Reset demo data</button>
          <button className="demo-row" style={{ padding: '10px 14px' }} onClick={() => { logout(); nav('/login'); }}><LogOut size={14} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

/** Storefront header: utility bar → main bar (logo, wide search, account, cart) → category bar with mega menu. */
export function StoreHeader({ cartCount }: { cartCount?: number }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState(new URLSearchParams(loc.search).get('q') ?? '');
  const [mega, setMega] = useState(false);
  const megaRef = useClickAway<HTMLDivElement>(mega, () => setMega(false));
  useEffect(() => setMega(false), [loc.pathname, loc.search]);

  const search = (e: FormEvent) => { e.preventDefault(); nav(`/marketplace?q=${encodeURIComponent(q.trim())}#results`); };

  return (
    <>
      <div className="utilbar">
        <div className="utilbar-inner">
          <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="row" style={{ gap: 5 }}><Phone size={12} /> {CONTACT.phone}</a>
          <a href={`mailto:${CONTACT.email}`} className="row hide-sm" style={{ gap: 5 }}><Mail size={12} /> {CONTACT.email}</a>
          <Link to="/quote" className="row" style={{ gap: 5, fontWeight: 600 }}><FileText size={12} /> Bulk orders: Request a Quote</Link>
          <span className="gst hide-sm"><BadgeCheck size={13} /> GST-registered · <span className="mono">{CONTACT.gstin}</span></span>
          <span className="grow" />
          <RegionChip />
        </div>
      </div>
      <header className="topbar store">
        <div className="topbar-inner">
          <Link to="/marketplace" style={{ textDecoration: 'none' }} aria-label={`${BRAND.name} home`}><Logo /></Link>
          <form className="top-search" role="search" onSubmit={search}>
            <label htmlFor="top-q" className="sr-only">Search products</label>
            <input id="top-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by product name, SKU or HSN code" />
            <button aria-label="Search"><Search size={17} /></button>
          </form>
          <div className="spacer" />
          <ThemeToggle />
          {user && <Bellmenu />}
          {(!user || user.role === 'customer') && (
            <Link to="/cart" className="icon-btn" aria-label={`Procurement order, ${cartCount ?? 0} item(s)`} style={{ color: 'var(--header-ink)' }}>
              <ShoppingCart size={19} />{!!cartCount && <span className="dot" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>{cartCount}</span>}
            </Link>
          )}
          <UserMenu />
        </div>
      </header>
      <nav className="catnav" aria-label="Product categories" ref={megaRef}>
        <div className="catnav-inner">
          <button className="catnav-btn" aria-expanded={mega} aria-controls="mega-menu" onClick={() => setMega((m) => !m)}><LayoutGrid size={15} /> All categories <ChevronDown size={14} /></button>
          {CLASSIFICATIONS.map((c) => <NavLink key={c.id} to={`/marketplace?cls=${c.id}#results`} className={() => (new URLSearchParams(loc.search).get('cls') === c.id ? 'active' : '')}>{c.name}</NavLink>)}
          <NavLink to="/marketplace?delivery=insta#results" className="row" style={{ gap: 5 }}><Zap size={14} /> TrimInsta 6-Hour</NavLink>
          <span className="grow" />
          {user?.role === 'customer' && <><NavLink to="/account/orders">My Orders</NavLink><NavLink to="/account/cases">Cases</NavLink></>}
          <NavLink to="/quote" style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>Request a Quote</NavLink>
        </div>
        {mega && (
          <div className="mega" id="mega-menu">
            <div className="mega-inner">
              {CLASSIFICATIONS.map((cl) => (
                <div key={cl.id}>
                  <h4>{cl.name}</h4>
                  <ul>{CATEGORIES.filter((c) => c.classification === cl.id).map((c) => (
                    <li key={c.id}><Link to={`/marketplace?cat=${c.id}#results`}><span>{c.name}</span><span className="xs muted tnum">{num(c.products)}</span></Link></li>
                  ))}</ul>
                </div>
              ))}
              <div className="mega-cta">
                <div className="bold">Buying in bulk?</div>
                <p className="small muted" style={{ margin: '4px 0 10px' }}>Tell us the spec and quantity. Verified suppliers quote within 24 hours.</p>
                <Link to="/quote" className="btn btn-primary btn-sm btn-block">Request a Quote</Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
