import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth, homeFor } from '../lib/auth';

const LABELS: Record<string, string> = {
  marketplace: 'Marketplace', cart: 'Procurement Order', checkout: 'Checkout', 'order-confirmation': 'Order confirmation', quote: 'Request a Quote',
  account: 'Account', orders: 'Orders', cases: 'Cases & Returns', new: 'New', profile: 'Company Profile', notifications: 'Notifications', design: 'Design system',
  vendor: 'Vendor portal', dashboard: 'Dashboard', onboarding: 'Onboarding', kyc: 'KYC & Docs', capabilities: 'Capabilities', catalog: 'My Catalog', edit: 'Edit', settlements: 'Settlements',
  approver: 'Approver', queue: 'Review Queue', history: 'Decision History',
  admin: 'Admin', escalations: 'Escalations', margin: 'Margin Manager', coupons: 'Coupons', vendors: 'Vendors', config: 'Platform Config', staff: 'Staff & Roles', warehouses: 'Warehouses', audit: 'Audit Log', reports: 'Reports',
  finance: 'Finance', payments: 'Payments & COD', refunds: 'Refunds', invoices: 'Invoices', reconciliation: 'Reconciliation',
  warehouse: 'Warehouse', inbound: 'Inbound & Receiving', inventory: 'Inventory & Bins', insta: 'TrimInsta Ops',
  support: 'Support', tickets: 'All Tickets', disputes: 'Return Disputes', ndr: 'NDR Cases', risk: 'Risk Flags & Appeals', forbidden: 'No access',
};
/** Paths that are not pages of their own (crumb shown as text). */
const NOT_PAGES = new Set(['/account', '/admin/finance', '/admin/warehouse']);

/** Auto breadcrumbs for every inner page. Hidden on home pages and where a page renders its own. */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const home = user ? homeFor(user) : '/marketplace';
  if (pathname === home || pathname === '/marketplace' || pathname.startsWith('/marketplace/products/')) return null;
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((p, i) => {
    const path = '/' + parts.slice(0, i + 1).join('/');
    const isId = !LABELS[p];
    return { path, label: LABELS[p] ?? decodeURIComponent(p), isId, link: i < parts.length - 1 && !NOT_PAGES.has(path) };
  });
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <Link to={home} aria-label="Home"><Home size={13} /></Link>
      {crumbs.map((c, i) => (
        <span key={c.path} className="row" style={{ gap: 4 }}>
          <ChevronRight size={12} aria-hidden />
          {c.link ? <Link to={c.path} className={c.isId ? 'mono' : ''}>{c.label}</Link>
            : <span className={c.isId ? 'mono' : ''} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}
