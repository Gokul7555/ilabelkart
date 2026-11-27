import { Link } from 'react-router-dom';
import { PhoneCall, Truck } from 'lucide-react';
import { Banner, Card, EmptyState, Pill } from '../../components/ui';
import { customerById } from '../../data/customer';
import { vendorById } from '../../data/vendors';
import { fmtDateTime, inr } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { slaInfo, useSupport } from '../../lib/support';
import { SupportShell } from './SupportShell';
import { NdrActions } from './actions';

export default function Ndr() {
  const { orders, subOrders } = useOrders();
  const { tickets } = useSupport();
  const list = subOrders.filter((s) => s.ndr && (s.status === 'Delivery Failed'));
  const recent = subOrders.filter((s) => s.ndr && s.status !== 'Delivery Failed');
  return (
    <SupportShell>
      <Banner tone="danger" lead="Courier failed to deliver.">Act within 24 hours: confirm the address or initiate RTO. The vendor is NOT paid until delivery is confirmed.</Banner>
      {list.length === 0 && <div className="card"><EmptyState icon={Truck} title="No open NDR cases" /></div>}
      {list.map((s) => {
        const o = orders.find((x) => x.id === s.orderId)!;
        const due = new Date(new Date(s.ndr!.lastAttempt).getTime() + 86400000).toISOString();
        const sla = slaInfo(due);
        const tk = tickets.find((t) => t.ndrSoId === s.id);
        return (
          <Card key={s.id} title={<span className="row wrap"><span className="mono">{s.ndr!.id}</span>{tk && <Link to={`/support/tickets/${tk.id}`} className="mono small">{tk.id}</Link>}</span>}
            sub={<>Order <span className="mono">{s.orderId}</span> · sub-order <span className="mono">{s.id}</span></>}
            actions={<div className="row"><Pill tone="red">{s.ndr!.attempts} attempts failed</Pill><Pill tone={sla.past || sla.near ? 'red' : 'amber'}>Act {sla.label}</Pill></div>}>
            <div className="grid g-3" style={{ gap: 16 }}>
              <dl className="kv" style={{ gridTemplateColumns: '80px 1fr' }}>
                <dt>Customer</dt><dd>{customerById(o.customerId)?.company}</dd>
                <dt>Contact</dt><dd className="small">{o.address.contact} · <span className="mono">{o.address.phone}</span></dd>
                <dt>Address</dt><dd className="small">{o.address.line}, {o.address.city} {o.address.pin}</dd>
              </dl>
              <dl className="kv" style={{ gridTemplateColumns: '80px 1fr' }}>
                <dt>Courier</dt><dd><b>{s.courier}</b> · <span className="mono small">{s.awb}</span></dd>
                <dt>Vendor</dt><dd>{vendorById(s.vendorId)?.name}</dd>
                <dt>Payment</dt><dd className="small">{o.payment.method.toUpperCase()} · {o.payment.status} · {inr(s.total)}</dd>
              </dl>
              <div>
                <div className="caps muted" style={{ marginBottom: 4 }}>Reason</div>
                <div className="small">{s.ndr!.reason}</div>
                <div className="xs muted" style={{ marginTop: 4 }}>Last attempt {fmtDateTime(s.ndr!.lastAttempt)}</div>
              </div>
            </div>
            <div className="caps muted" style={{ margin: '14px 0 6px' }}>Attempts</div>
            <div className="row wrap" style={{ gap: 8 }}>
              {s.events.filter((e) => e.status === 'Delivery Failed').map((e, i) => <Pill key={i} tone="red">{fmtDateTime(e.at)} · {e.note}</Pill>)}
            </div>
            <div className="divider-h" />
            <div className="row-between wrap">
              <NdrActions so={s} />
              <a className="btn btn-ghost btn-sm" href={`tel:${o.address.phone.replace(/\s/g, '')}`}><PhoneCall size={13} /> Call buyer</a>
            </div>
          </Card>
        );
      })}
      {recent.length > 0 && (
        <Card title="Recently handled" pad={false}>
          <table className="tbl"><tbody>{recent.map((s) => <tr key={s.id}><td className="mono">{s.ndr!.id}</td><td className="mono small">{s.id}</td><td><Pill tone={s.status === 'RTO' ? 'red' : 'green'}>{s.status === 'RTO' ? 'RTO initiated' : `Re-attempt · ${s.status}`}</Pill></td></tr>)}</tbody></table>
        </Card>
      )}
    </SupportShell>
  );
}
