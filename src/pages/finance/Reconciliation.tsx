import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { Banner, Card, ExportButtons, Kpi, PageHeader, Pill, Tabs } from '../../components/ui';
import { customerById } from '../../data/customer';
import { VENDORS } from '../../data/vendors';
import { inr } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { useCases } from '../../lib/cases';
import { payable, settleStatus, useSettlements } from '../../lib/settlements';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type T = 'orders' | 'payables';

export default function Reconciliation() {
  const { orders } = useOrders();
  const { cases } = useCases();
  const { batches } = useSettlements();
  const [tab, setTab] = useState<T>('orders');

  const rows = orders.filter((o) => !o.replacementFor).map((o) => {
    const subs = o.subOrders;
    const vendorGross = subs.reduce((a, s) => a + s.lines.reduce((b, l) => b + l.basePrice * l.qty, 0), 0);
    const commission = subs.reduce((a, s) => a + s.lines.reduce((b, l) => b + (l.unitPrice - l.basePrice) * l.qty, 0), 0);
    const refunds = subs.reduce((a, s) => a + (s.refund?.amount ?? 0), 0) + cases.filter((c) => c.orderId === o.id && c.refund).reduce((a, c) => a + c.refund!.amount, 0);
    const refundsDone = subs.reduce((a, s) => a + (s.refund?.status === 'Succeeded' ? s.refund.amount : 0), 0) + cases.filter((c) => c.orderId === o.id && c.refund?.status === 'Succeeded').reduce((a, c) => a + c.refund!.amount, 0);
    const collected = o.payment.status === 'Captured' || o.payment.status === 'COD remitted' ? o.total : 0;
    const variance = Math.round((collected - (collected ? vendorGross + commission + o.shipping + o.gst : 0)) * 100) / 100;
    const status = !collected ? (o.payment.method === 'cod' ? 'Awaiting COD' : 'Not collected') : Math.abs(variance) > 0.05 ? 'Variance' : refunds > refundsDone ? 'Refund open' : 'Reconciled';
    return { o, vendorGross, commission, refunds, refundsDone, collected, variance, status };
  });
  const sum = (k: 'collected' | 'vendorGross' | 'commission' | 'refunds') => rows.reduce((a, r) => a + r[k], 0);

  const payables = VENDORS.map((v) => {
    const subs = orders.flatMap((o) => o.subOrders.filter((s) => s.vendorId === v.id && s.delivery && !o.replacementFor).map((s) => ({ s, o })));
    const bucket = (pred: (st: string) => boolean) => subs.filter(({ s, o }) => pred(settleStatus(s, o, cases, batches))).reduce((a, { s }) => a + payable(s, cases).net, 0);
    return { v, held: bucket((st) => ['In Window', 'Open Dispute', 'Awaiting COD', 'Awaiting delivery'].includes(st)), eligible: bucket((st) => st === 'Eligible'), inBatch: bucket((st) => st === 'In Batch'), paid: bucket((st) => st === 'Paid') };
  }).filter((p) => p.held + p.eligible + p.inBatch + p.paid > 0);

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Scale} title="Reconciliation" subtitle="Money in (captures and COD) against money owed (vendor payables, commission, GST, shipping, refunds)" actions={<><Pill tone="indigo" strong>FINANCE DESK</Pill><ExportButtons name="reconciliation" /></>} />
      <div className="grid g-4">
        <Kpi icon={CheckCircle2} tone="green" label="Collected" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum('collected'))}</span>} help="Captured + COD remitted" />
        <Kpi icon={Scale} tone="indigo" label="Vendor payables (gross)" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum('vendorGross'))}</span>} help="Base price × qty" />
        <Kpi icon={Scale} tone="violet" label="Commission" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum('commission'))}</span>} help="Category-level" />
        <Kpi icon={Clock} tone="amber" label="Refund liabilities" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum('refunds'))}</span>} help="All statuses" />
      </div>
      <Tabs<T> value={tab} onChange={setTab} tabs={[{ id: 'orders', label: 'Order reconciliation', count: rows.filter((r) => r.status !== 'Reconciled').length }, { id: 'payables', label: 'Payables review', count: payables.length }]} />

      {tab === 'orders' && (
        <Card pad={false}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Order</th><th>Customer</th><th className="right">Collected</th><th className="right">Vendor gross</th><th className="right">Commission</th><th className="right">Shipping</th><th className="right">GST</th><th className="right">Refunds</th><th className="right">Variance</th><th>Status</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.o.id}>
                  <td className="mono small bold">{r.o.id}</td><td className="small">{customerById(r.o.customerId)?.company}</td>
                  <td className="num">{inr(r.collected)}</td><td className="num">{inr(r.vendorGross)}</td><td className="num">{inr(r.commission)}</td><td className="num">{inr(r.o.shipping)}</td><td className="num">{inr(r.o.gst)}</td>
                  <td className="num">{r.refunds ? <>{inr(r.refunds)}<div className="xs muted">{inr(r.refundsDone)} done</div></> : '—'}</td>
                  <td className="num" style={{ color: Math.abs(r.variance) > 0.05 ? 'var(--danger)' : undefined }}>{inr(r.variance)}</td>
                  <td><Pill tone={r.status === 'Reconciled' ? 'green' : r.status === 'Variance' ? 'red' : 'amber'} icon={r.status === 'Variance' ? AlertTriangle : undefined}>{r.status}</Pill></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'payables' && (
        <>
          <Banner tone="info">Vendor payables by settlement state. Pay through <Link to="/admin/settlements">Settlements</Link> once all 6 conditions pass.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Vendor</th><th className="right">Held</th><th className="right">Eligible</th><th className="right">In batch</th><th className="right">Paid</th></tr></thead>
              <tbody>{payables.map((p) => (
                <tr key={p.v.id}><td className="small bold">{p.v.name}</td><td className="num">{inr(p.held)}</td><td className="num" style={{ color: p.eligible ? 'var(--success)' : undefined }}>{inr(p.eligible)}</td><td className="num">{inr(p.inBatch)}</td><td className="num">{inr(p.paid)}</td></tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
