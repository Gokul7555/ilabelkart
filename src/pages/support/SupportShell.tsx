import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertOctagon, Headset, RotateCcw, Siren, Ticket, Truck } from 'lucide-react';
import { Kpi, PageHeader } from '../../components/ui';
import { isOpenTicket, useSupport } from '../../lib/support';
import { isOpenCase, useCases } from '../../lib/cases';
import { useOrders } from '../../lib/orders';

/** Shared header, KPI row and tab bar for the Support & Ops pages. */
export function SupportShell({ children }: { children: ReactNode }) {
  const { tickets } = useSupport();
  const { cases } = useCases();
  const { subOrders } = useOrders();
  const open = tickets.filter(isOpenTicket);
  const disputes = cases.filter(isOpenCase);
  const ndr = subOrders.filter((s) => s.status === 'Delivery Failed');
  const tabs = [
    { to: '/support/tickets', label: 'All Tickets', icon: Ticket, count: open.length },
    { to: '/support/disputes', label: 'Return Disputes', icon: RotateCcw, count: disputes.length },
    { to: '/support/ndr', label: 'NDR Cases', icon: Truck, count: ndr.length },
  ];
  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Headset} title="Support & Operations" subtitle="Customer & vendor helpdesk, dispute resolution & delivery exceptions" />
      <div className="grid g-4">
        <Kpi icon={Ticket} tone="indigo" label="Open tickets" value={open.length} help={`${tickets.length} total`} />
        <Kpi icon={Siren} tone="red" label="Urgent" value={open.filter((t) => t.priority === 'URGENT').length} help="Act within 24 hours" />
        <Kpi icon={AlertOctagon} tone="amber" label="Active disputes" value={disputes.length} help={`${disputes.filter((c) => c.status === 'Escalated to Support').length} escalated to you`} />
        <Kpi icon={Truck} tone="blue" label="NDR cases" value={ndr.length} help="Failed deliveries" />
      </div>
      <nav className="tabs" aria-label="Support sections">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <t.icon size={14} /> {t.label} <span className="count">{t.count}</span>
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
