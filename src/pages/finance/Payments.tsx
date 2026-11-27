import { useState } from 'react';
import { Banknote, CheckCircle2, Clock, CreditCard, HelpCircle, Repeat } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, ExportButtons, Kpi, PageHeader, Pill, Tabs } from '../../components/ui';
import { customerById } from '../../data/customer';
import { fmtDate, fmtDateTime, inr } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { useFinance } from '../../lib/finance';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type T = 'captures' | 'cod';
const METHOD: Record<string, string> = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cod: 'COD' };

export default function Payments() {
  const { user } = useAuth();
  const { orders, subOrders, patchOrder } = useOrders();
  const fin = useFinance();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('cod');
  const [query, setQuery] = useState<string | null>(null);
  const me = `${user?.name} (${user?.id})`;

  const real = orders.filter((o) => !o.replacementFor);
  const captured = real.filter((o) => o.payment.status === 'Captured');
  const codPending = real.filter((o) => o.payment.status === 'COD pending');
  const codDone = real.filter((o) => o.payment.status === 'COD remitted');
  const sum = (xs: typeof real) => xs.reduce((a, o) => a + o.total, 0);

  /** Match a courier remittance line to an order by AWB and amount. */
  const lineState = (awb: string, amount: number) => {
    const so = subOrders.find((s) => s.awb === awb);
    const order = so ? orders.find((o) => o.id === so.orderId) : undefined;
    if (fin.matched[awb]) return { kind: 'matched' as const, order, so };
    if (fin.queries[awb]) return { kind: 'query' as const, order, so };
    if (!order) return { kind: 'unknown' as const };
    if (order.payment.method !== 'cod') return { kind: 'notcod' as const, order, so };
    if (!so?.delivery) return { kind: 'undelivered' as const, order, so };
    const diff = Math.round((amount - order.total) * 100) / 100;
    return diff === 0 ? { kind: 'ready' as const, order, so } : { kind: 'mismatch' as const, order, so, diff };
  };

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Banknote} title="Payments & COD Remittance" subtitle="Gateway captures and matching courier COD remittances to orders" actions={<><Pill tone="indigo" strong>FINANCE DESK</Pill><ExportButtons name="payments" /></>} />
      <div className="grid g-4">
        <Kpi icon={CreditCard} tone="green" label="Prepaid captured" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum(captured))}</span>} help={`${captured.length} order(s)`} />
        <Kpi icon={Clock} tone="amber" label="COD pending remittance" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum(codPending))}</span>} help={`${codPending.length} order(s) · blocks vendor payout`} />
        <Kpi icon={CheckCircle2} tone="indigo" label="COD remitted" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum(codDone))}</span>} help={`${codDone.length} order(s)`} />
        <Kpi icon={Repeat} tone="slate" label="No-charge replacements" value={orders.filter((o) => o.replacementFor).length} help="Linked to damage cases" />
      </div>
      <Tabs<T> value={tab} onChange={setTab} tabs={[{ id: 'cod', label: 'COD remittance matching', count: fin.remits.reduce((a, r) => a + r.lines.filter((l) => !fin.matched[l.awb]).length, 0) }, { id: 'captures', label: 'Payment captures', count: real.length }]} />

      {tab === 'cod' && (
        <>
          <Banner tone="info" lead="Why this matters:">a COD order counts as "customer funds reconciled" only after its cash is matched here. Until then the vendor's payout for it stays held.</Banner>
          {fin.remits.map((r) => (
            <Card key={r.id} pad={false} title={<span className="row"><span className="mono">{r.id}</span> · {r.courier}</span>} sub={<>Received {fmtDate(r.date)} · UTR <span className="mono">{r.utr}</span></>} actions={<span className="mono bold">{inr(r.total)}</span>}>
              <table className="tbl">
                <thead><tr><th>AWB</th><th>Order</th><th>Collected</th><th className="right">Remitted</th><th className="right">Expected</th><th>Result</th><th></th></tr></thead>
                <tbody>{r.lines.map((l) => {
                  const st = lineState(l.awb, l.amount);
                  return (
                    <tr key={l.awb}>
                      <td className="mono small">{l.awb}</td>
                      <td>{st.order ? <><span className="mono small">{st.order.id}</span><div className="t-sub">{customerById(st.order.customerId)?.company}</div></> : <span className="xs muted">—</span>}</td>
                      <td className="small">{fmtDate(l.collectedOn)}</td>
                      <td className="num">{inr(l.amount)}</td>
                      <td className="num">{st.order ? inr(st.order.total) : '—'}</td>
                      <td>
                        {st.kind === 'matched' && <Pill tone="green" icon={CheckCircle2}>Matched</Pill>}
                        {st.kind === 'ready' && <Pill tone="blue">Exact match found</Pill>}
                        {st.kind === 'mismatch' && <Pill tone="red">Amount mismatch {inr(st.diff!)}</Pill>}
                        {st.kind === 'notcod' && <Pill tone="amber">Not a COD order (prepaid)</Pill>}
                        {st.kind === 'unknown' && <Pill tone="red" icon={HelpCircle}>Unknown AWB</Pill>}
                        {st.kind === 'undelivered' && <Pill tone="amber">No delivery proof</Pill>}
                        {st.kind === 'query' && <><Pill tone="amber">Query raised</Pill><div className="xs muted">{fin.queries[l.awb]}</div></>}
                      </td>
                      <td className="right nowrap">
                        {st.kind === 'ready' && <button className="btn btn-success btn-xs" onClick={() => {
                          fin.markMatched(l.awb, me); patchOrder(st.order!.id, { payment: { ...st.order!.payment, status: 'COD remitted' } });
                          log({ action: 'COD remittance matched', entity: `${st.order!.id} · AWB ${l.awb}`, oldValue: 'COD pending', newValue: `COD remitted · ${r.id}` });
                          toast('success', 'Matched', `${st.order!.id} is now reconciled`);
                        }}>Confirm match</button>}
                        {['mismatch', 'notcod', 'unknown', 'undelivered'].includes(st.kind) && <button className="btn btn-secondary btn-xs" onClick={() => setQuery(l.awb)}>Raise courier query</button>}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </Card>
          ))}
          <Card title="COD orders awaiting remittance" pad={false}>
            <table className="tbl">
              <tbody>{codPending.map((o) => {
                const so = o.subOrders[0];
                return <tr key={o.id}><td className="mono small">{o.id}</td><td className="small">{customerById(o.customerId)?.company}</td><td className="mono xs">{so.awb ?? '—'}</td><td>{so.delivery ? <Pill tone="amber">Delivered {fmtDate(so.delivery.at)}: cash with courier</Pill> : <Pill tone="grey">{so.status}</Pill>}</td><td className="num">{inr(o.total)}</td></tr>;
              })}</tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'captures' && (
        <Card pad={false}>
          <table className="tbl">
            <thead><tr><th>Order</th><th>Customer</th><th>Method</th><th>Gateway ref</th><th>Placed</th><th className="right">Amount</th><th>Status</th></tr></thead>
            <tbody>{real.slice().sort((a, b) => b.placedAt.localeCompare(a.placedAt)).map((o) => (
              <tr key={o.id}>
                <td className="mono small bold">{o.id}</td><td className="small">{customerById(o.customerId)?.company}</td><td className="small">{METHOD[o.payment.method]}</td>
                <td className="mono xs">{o.payment.txn ?? '—'}</td><td className="small nowrap">{fmtDateTime(o.placedAt)}</td><td className="num">{inr(o.total)}</td>
                <td><Pill tone={o.payment.status === 'Captured' || o.payment.status === 'COD remitted' ? 'green' : 'amber'}>{o.payment.status}</Pill></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      <ConfirmWithReason open={!!query} onClose={() => setQuery(null)} title={`Raise query with courier · ${query ?? ''}`} confirmLabel="Send query"
        description="The line stays unmatched until the courier answers. Nothing is reconciled automatically."
        onConfirm={(r) => { if (!query) return; fin.raiseQuery(query, r); log({ action: 'Courier remittance query raised', entity: `AWB ${query}`, reason: r }); toast('info', 'Query sent to courier'); }} />
    </div>
  );
}
