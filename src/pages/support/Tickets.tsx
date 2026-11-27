import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Search } from 'lucide-react';
import { Banner, Card, EmptyState, ExportButtons, Pill, StatusPill } from '../../components/ui';
import { customerById } from '../../data/customer';
import { fmtDateTime } from '../../lib/format';
import { isOpenTicket, slaInfo, useSupport } from '../../lib/support';
import type { TicketType } from '../../lib/support';
import { SupportShell } from './SupportShell';
import { SortTh, useSort } from '../../components/SortTh';

const TYPE_TONE: Record<TicketType, 'red' | 'violet' | 'amber' | 'blue'> = { Dispute: 'red', NDR: 'violet', Cancellation: 'amber', Return: 'blue' };
const PRIO = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function Tickets() {
  const { tickets } = useSupport();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | TicketType>('all');
  const [showClosed, setShowClosed] = useState(false);

  const list = tickets
    .filter((t) => (showClosed || isOpenTicket(t)) && (type === 'all' || t.type === type))
    .filter((t) => `${t.id} ${t.orderId} ${t.subOrderIds.join(' ')} ${customerById(t.customerId)?.company} ${t.subject}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(!isOpenTicket(a)) - Number(!isOpenTicket(b)) || PRIO[a.priority] - PRIO[b.priority] || a.slaDue.localeCompare(b.slaDue));

  const { sorted, sort, by } = useSort(list, {
    ticket: (t) => t.id, customer: (t) => customerById(t.customerId)?.company ?? '', type: (t) => t.type, priority: (t) => PRIO[t.priority], sla: (t) => t.slaDue, status: (t) => t.status,
  });

  return (
    <SupportShell>
      <Banner tone="info" icon={Info} lead="Single Customer Channel.">Buyers contact TrimNova Support only. Vendors never talk to buyers directly or see other vendors' data; you relay what each party needs.</Banner>
      <div className="row-between wrap">
        <div className="input-icon" style={{ width: 360 }}><Search size={15} /><input className="input" placeholder="Search ticket, order, sub-order or customer" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="row wrap">
          <select className="select" style={{ height: 32, width: 170 }} value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Ticket type">
            <option value="all">All types</option><option>Dispute</option><option>NDR</option><option>Cancellation</option><option>Return</option>
          </select>
          <label className="check small"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show resolved/closed</label>
          <ExportButtons name="support-tickets" />
        </div>
      </div>
      <Card pad={false}>
        {list.length === 0 ? <EmptyState title="No tickets" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><SortTh k="ticket" sort={sort} by={by}>Ticket</SortTh><SortTh k="customer" sort={sort} by={by}>Customer</SortTh><SortTh k="type" sort={sort} by={by}>Type</SortTh><SortTh k="priority" sort={sort} by={by}>Priority</SortTh><SortTh k="sla" sort={sort} by={by}>SLA deadline</SortTh><SortTh k="status" sort={sort} by={by}>Status</SortTh></tr></thead>
              <tbody>
                {sorted.map((t) => {
                  const sla = slaInfo(t.slaDue);
                  const open = isOpenTicket(t);
                  return (
                    <tr key={t.id} className="clickable" onClick={() => nav(`/support/tickets/${t.id}`)}>
                      <td><div className="mono bold">{t.id}</div><div className="t-sub"><span className="mono">{t.orderId}</span> · {t.subject}</div></td>
                      <td><div className="small bold">{customerById(t.customerId)?.company}</div>{t.vendorIds.length > 1 && <div className="t-sub">{t.vendorIds.length} vendors involved</div>}</td>
                      <td><Pill tone={TYPE_TONE[t.type]}>{t.type}</Pill></td>
                      <td><StatusPill status={t.priority} /></td>
                      <td className="nowrap">
                        <div className="small" style={{ color: open && (sla.past || sla.near) ? 'var(--danger)' : undefined, fontWeight: open && (sla.past || sla.near) ? 650 : undefined }}>{fmtDateTime(t.slaDue)}</div>
                        {open && <div className="xs" style={{ color: sla.past || sla.near ? 'var(--danger)' : 'var(--text-3)' }}>{sla.label}</div>}
                      </td>
                      <td><Pill tone={open ? (t.status === 'Open' ? 'blue' : 'amber') : 'grey'}>{t.status}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </SupportShell>
  );
}
