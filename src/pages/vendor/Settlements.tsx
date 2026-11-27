import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, Info, Wallet, XCircle } from 'lucide-react';
import { Banner, Card, EmptyState, Kpi, Modal, PageHeader, Pill, Tabs } from '../../components/ui';
import { fmtDate, inr, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { useCases } from '../../lib/cases';
import { CONDITION_LABELS, conditions, payable, settleStatus, useSettlements } from '../../lib/settlements';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

type T = 'held' | 'eligible' | 'paid';

export default function VendorSettlements() {
  const { user } = useAuth();
  const { orders, subOrders } = useOrders();
  const { cases } = useCases();
  const { batches } = useSettlements();
  const toast = useToast();
  const [tab, setTab] = useState<T>('held');
  const [learn, setLearn] = useState(false);
  const [why, setWhy] = useState<string | null>(null);

  // Own sub-orders only.
  const rows = useMemo(() => subOrders.filter((s) => s.vendorId === user?.vendorId && s.delivery && !orders.find((o) => o.id === s.orderId)?.replacementFor).map((s) => {
    const o = orders.find((x) => x.id === s.orderId);
    const st = settleStatus(s, o, cases, batches);
    const batch = batches.find((b) => b.subOrderIds.includes(s.id));
    return { s, st, conds: conditions(s, o, cases, batches), pay: payable(s, cases), batch };
  }).sort((a, b) => b.s.delivery!.at.localeCompare(a.s.delivery!.at)), [subOrders, orders, cases, batches, user]);

  const held = rows.filter((r) => ['In Window', 'Open Dispute', 'Awaiting COD', 'Awaiting delivery'].includes(r.st));
  const eligible = rows.filter((r) => r.st === 'Eligible' || r.st === 'In Batch');
  const paid = rows.filter((r) => r.st === 'Paid');
  const total = (xs: typeof rows) => xs.reduce((a, r) => a + r.pay.net, 0);
  const list = tab === 'held' ? held : tab === 'eligible' ? eligible : paid;
  const whyRow = rows.find((r) => r.s.id === why);

  const pill = (r: (typeof rows)[number]) => {
    switch (r.st) {
      case 'In Window': return <Pill tone="amber" icon={Clock}>In Window</Pill>;
      case 'Open Dispute': return <Pill tone="red" icon={AlertTriangle}>Open Dispute</Pill>;
      case 'Awaiting COD': return <Pill tone="amber">Awaiting COD remittance</Pill>;
      case 'Awaiting delivery': return <Pill tone="grey">Awaiting delivery proof</Pill>;
      case 'Eligible': return <Pill tone="green" icon={CheckCircle2}>Eligible</Pill>;
      case 'In Batch': return <Pill tone="blue">In payout batch {r.batch?.id}</Pill>;
      case 'Paid': return <div><Pill tone="indigo">Paid</Pill><div className="xs mono muted">UTR {r.batch?.transfer?.utr}</div><div className="xs muted">{r.batch?.transfer && fmtDate(r.batch.transfer.date)}</div></div>;
    }
  };

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={Wallet} title="Settlements" subtitle="Track your held, eligible, and paid balances"
        actions={<button className="btn btn-secondary btn-sm" onClick={() => toast('success', 'Statement downloaded', `Settlement_${user?.vendorId}_Nov-2026.pdf`)}><Download size={14} /> Download statement</button>} />
      <div className="grid g-3">
        <Kpi icon={Clock} tone="amber" label="Held balance" value={<span className="mono">{inr(total(held))}</span>} help="In return window or open dispute" />
        <Kpi icon={CheckCircle2} tone="green" label="Eligible balance" value={<span className="mono">{inr(total(eligible))}</span>} help="Ready for next payout batch" />
        <Kpi icon={Wallet} tone="indigo" label="Paid balance" value={<span className="mono">{inr(total(paid))}</span>} help="All-time net disbursed" />
      </div>
      <Banner tone="info" icon={Info} lead="Why is my money held?" actions={<button className="btn btn-secondary btn-sm" onClick={() => setLearn(true)}>Learn more</button>}>
        6 conditions must be met before a sub-order is paid: delivery verified, return window over, customer funds reconciled, invoice issued, no open dispute, and not already paid.
      </Banner>
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'held', label: 'Held Balance', count: held.length }, { id: 'eligible', label: 'Eligible Balance', count: eligible.length }, { id: 'paid', label: 'Paid Balance', count: paid.length },
      ]} />
      <Card pad={false}>
        {list.length === 0 ? <EmptyState icon={Wallet} title="Nothing in this balance" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Sub-order #</th><th>Product</th><th>Delivered</th><th>Return window expires</th><th className="right">Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>{list.map((r) => (
                <tr key={r.s.id}>
                  <td className="mono small bold">{r.s.id}</td>
                  <td><div className="t-name small">{r.s.lines[0].title}</div><div className="t-sub"><span className="mono">{r.s.lines[0].sku}</span> · {num(r.s.lines[0].qty)} {r.s.lines[0].unit}</div></td>
                  <td className="small nowrap">{fmtDate(r.s.delivery!.at)}</td>
                  <td className="small nowrap">{r.s.returnWindowEnds ? fmtDate(r.s.returnWindowEnds) : '—'}</td>
                  <td className="num">{inr(r.pay.net)}{r.pay.deductions > 0 && <div className="xs muted">after {inr(r.pay.deductions)} refunds</div>}</td>
                  <td>{pill(r)}</td>
                  <td className="right"><button className="btn btn-ghost btn-xs" onClick={() => setWhy(r.s.id)}>{r.conds.filter((c) => c.ok).length}/6 conditions</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="xs muted">Amounts are your base price (pre-tax) minus approved damage refunds. GST and TCS adjustments are shown on the statement. Who bears replacement and return-logistics cost is TBD.</div>

      <Modal open={learn} onClose={() => setLearn(false)} title="When do I get paid?" icon={Info}>
        <div className="stack-12 small">
          <p>TrimNova releases a sub-order's payout only when <b>all 6</b> conditions pass. Payouts go out in batches by bank transfer, and each payment shows its UTR.</p>
          <ol style={{ paddingLeft: 18, margin: 0 }} className="stack-12">{CONDITION_LABELS.map((c) => <li key={c}>{c}</li>)}</ol>
          <Banner tone="warning">A disputed sub-order stays held until Support decides. Approved refunds are deducted from your payout.</Banner>
        </div>
      </Modal>
      <Modal open={!!whyRow} onClose={() => setWhy(null)} title={<>Conditions · <span className="mono">{whyRow?.s.id}</span></>}>
        <div className="stack-12">{whyRow?.conds.map((c) => (
          <div key={c.key} className="row small" style={{ alignItems: 'flex-start' }}>
            {c.ok ? <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
            <div><div>{c.label}</div><div className="xs muted">{c.detail}</div></div>
          </div>
        ))}</div>
      </Modal>
    </div>
  );
}
