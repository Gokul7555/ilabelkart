import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, ExportButtons, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { CATEGORIES, GST_RATE } from '../../data/categories';
import { VENDORS } from '../../data/vendors';
import { inr, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { caseAmount, useCases } from '../../lib/cases';
import { useCatalog } from '../../lib/catalog';

type T = 'sales' | 'vendors' | 'disputes' | 'gst';
type Range = 'mtd' | '30d' | 'all';

/** Single-series horizontal bars: one hue, thin marks, rounded data-ends, hover value, table alongside. */
function BarList({ rows, format }: { rows: { label: string; value: number; sub?: string }[]; format: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="stack-12" style={{ gap: 6 }} role="list">
      {rows.map((r, i) => (
        <div key={r.label} role="listitem" className="row" style={{ gap: 10, cursor: 'default' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <span className="small" style={{ width: 210, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{r.label}</span>
          <div style={{ flex: 1, height: 22, display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 3 : 0, height: 12, background: 'var(--primary)', borderRadius: '0 4px 4px 0', opacity: hover === null || hover === i ? 1 : 0.45, transition: 'opacity .12s' }} />
            {hover === i && (
              <span style={{ position: 'absolute', left: `min(${(r.value / max) * 100}%, 70%)`, top: -26, marginLeft: 8, background: 'var(--header-bg)', color: 'var(--header-ink)', fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap', zIndex: 2 }}>
                {r.label}: <b className="mono">{format(r.value)}</b>{r.sub && ` · ${r.sub}`}
              </span>
            )}
          </div>
          <span className="mono small" style={{ width: 120, textAlign: 'right', color: 'var(--text)' }}>{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { orders, subOrders } = useOrders();
  const { cases } = useCases();
  const { products } = useCatalog();
  const [tab, setTab] = useState<T>('sales');
  const [range, setRange] = useState<Range>('all');

  const from = range === 'mtd' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() : range === '30d' ? Date.now() - 30 * 86400000 : 0;
  const inRange = (iso: string) => new Date(iso).getTime() >= from;
  const real = orders.filter((o) => !o.replacementFor && inRange(o.placedAt));
  const subs = real.flatMap((o) => o.subOrders.map((s) => ({ s, o })));

  const sales = useMemo(() => CATEGORIES.map((c) => {
    const lines = subs.flatMap(({ s }) => s.lines.filter((l) => products.find((p) => p.id === l.productId)?.categoryId === c.id));
    return { c, gmv: lines.reduce((a, l) => a + l.amount, 0), units: lines.reduce((a, l) => a + l.qty, 0), commission: lines.reduce((a, l) => a + (l.unitPrice - l.basePrice) * l.qty, 0), lines: lines.length };
  }).filter((x) => x.lines > 0).sort((a, b) => b.gmv - a.gmv), [subs, products]);

  const vendorPerf = VENDORS.map((v) => {
    const mine = subs.filter(({ s }) => s.vendorId === v.id).map(({ s }) => s);
    const accepted = mine.filter((s) => s.events.some((e) => e.status === 'Accepted'));
    const acceptOnTime = accepted.filter((s) => (s.events.find((e) => e.status === 'Accepted')?.at ?? '') <= s.acceptBy).length;
    const dispatched = mine.filter((s) => s.handover && s.dispatchBy);
    const dispOnTime = dispatched.filter((s) => s.handover!.at <= s.dispatchBy!).length;
    return {
      v, orders: mine.length, acc: accepted.length ? (acceptOnTime / accepted.length) * 100 : null, disp: dispatched.length ? (dispOnTime / dispatched.length) * 100 : null,
      rejections: mine.filter((s) => s.rejection).length, disputes: cases.filter((c) => c.vendorId === v.id).length, ndr: mine.filter((s) => s.ndr).length,
    };
  }).filter((x) => x.orders > 0);

  const caseStatuses = ['Awaiting vendor', 'Escalated to Support', 'More evidence requested', 'Resolved', 'Rejected'] as const;
  const refundRows = [...subOrders.filter((s) => s.refund).map((s) => s.refund!), ...cases.filter((c) => c.refund).map((c) => c.refund!)];

  const gst = [12, 18].map((rate) => {
    const lines = subs.flatMap(({ s, o }) => s.lines.filter((l) => l.gstRate === rate).map((l) => ({ l, intra: o.address.state === VENDORS.find((v) => v.id === s.vendorId)?.state })));
    const taxable = lines.reduce((a, x) => a + x.l.amount, 0);
    const intra = lines.filter((x) => x.intra).reduce((a, x) => a + (x.l.amount * rate) / 100, 0);
    const inter = lines.filter((x) => !x.intra).reduce((a, x) => a + (x.l.amount * rate) / 100, 0);
    return { rate, taxable, cgst: intra / 2, sgst: intra / 2, igst: inter, cats: CATEGORIES.filter((c) => GST_RATE[c.id] === rate).length };
  });
  const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(0)}%`);

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1240 }}>
      <PageHeader icon={BarChart3} title="Reports" subtitle="Sales, vendor performance, disputes and GST, from the demo order data"
        actions={<><select className="select" style={{ width: 170, height: 32 }} value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Date range"><option value="mtd">This month</option><option value="30d">Last 30 days</option><option value="all">All demo data</option></select><ExportButtons name={`report-${tab}`} /></>} />
      <Tabs<T> value={tab} onChange={setTab} tabs={[{ id: 'sales', label: 'Sales by category' }, { id: 'vendors', label: 'Vendor performance' }, { id: 'disputes', label: 'Disputes & refunds' }, { id: 'gst', label: 'GST summary' }]} />

      {tab === 'sales' && (
        <div className="grid g-2" style={{ alignItems: 'start' }}>
          <Card title="GMV by category (pre-tax)">{sales.length ? <BarList rows={sales.map((x) => ({ label: x.c.name, value: x.gmv, sub: `${num(x.units)} units` }))} format={(n) => inr(n, { decimals: 0 })} /> : <div className="small muted">No orders in range.</div>}</Card>
          <Card title="Table view" pad={false}>
            <table className="tbl">
              <thead><tr><th>Category</th><th className="right">Units</th><th className="right">GMV</th><th className="right">Commission</th></tr></thead>
              <tbody>{sales.map((x) => <tr key={x.c.id}><td className="small">{x.c.name}</td><td className="num">{num(x.units)}</td><td className="num">{inr(x.gmv)}</td><td className="num">{inr(x.commission)}</td></tr>)}</tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'vendors' && (
        <Card pad={false} title="Vendor scorecard" sub="On-time rates below 90% are flagged">
          <table className="tbl">
            <thead><tr><th>Vendor</th><th className="right">Sub-orders</th><th className="right">Accepted on time</th><th className="right">Dispatched on time</th><th className="right">Rejections</th><th className="right">Disputes</th><th className="right">NDR</th><th className="right">Rating</th></tr></thead>
            <tbody>{vendorPerf.map((x) => (
              <tr key={x.v.id}>
                <td className="small bold">{x.v.name}</td><td className="num">{x.orders}</td>
                <td className="num">{pct(x.acc)}{x.acc !== null && x.acc < 90 && <div><Pill tone="amber">Below target</Pill></div>}</td>
                <td className="num">{pct(x.disp)}{x.disp !== null && x.disp < 90 && <div><Pill tone="amber">Below target</Pill></div>}</td>
                <td className="num">{x.rejections}</td><td className="num">{x.disputes}</td><td className="num">{x.ndr}</td><td className="num">{x.v.rating.toFixed(1)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      {tab === 'disputes' && (
        <div className="grid g-2" style={{ alignItems: 'start' }}>
          <Card title="Damage cases by status">
            <BarList rows={caseStatuses.map((st) => ({ label: st, value: cases.filter((c) => c.status === st).length }))} format={(n) => num(n)} />
            <div className="xs muted" style={{ marginTop: 10 }}>Claim value across all cases: <span className="mono">{inr(cases.reduce((a, c) => a + caseAmount(c), 0))}</span></div>
          </Card>
          <Card title="Refunds by status" pad={false}>
            <table className="tbl">
              <thead><tr><th>Status</th><th className="right">Count</th><th className="right">Amount</th></tr></thead>
              <tbody>{(['Pending', 'Failed', 'Unknown', 'Succeeded'] as const).map((st) => {
                const xs = refundRows.filter((r) => r.status === st);
                return <tr key={st}><td><StatusPill status={st} /></td><td className="num">{xs.length}</td><td className="num">{inr(xs.reduce((a, r) => a + r.amount, 0))}</td></tr>;
              })}</tbody>
            </table>
            <div className="xs muted" style={{ padding: '8px 14px' }}>Only Succeeded counts as refunded. Execution is in Finance › Refunds.</div>
          </Card>
        </div>
      )}

      {tab === 'gst' && (
        <Card pad={false} title="Output GST on goods (seller invoices)" sub="Shipping GST excluded · CGST+SGST within a state, IGST across states">
          <table className="tbl">
            <thead><tr><th>Rate</th><th className="right">Categories</th><th className="right">Taxable value</th><th className="right">CGST</th><th className="right">SGST</th><th className="right">IGST</th><th className="right">Total tax</th></tr></thead>
            <tbody>{gst.map((g) => (
              <tr key={g.rate}><td className="bold">{g.rate}%</td><td className="num">{g.cats}</td><td className="num">{inr(g.taxable)}</td><td className="num">{inr(g.cgst)}</td><td className="num">{inr(g.sgst)}</td><td className="num">{inr(g.igst)}</td><td className="num">{inr(g.cgst + g.sgst + g.igst)}</td></tr>
            ))}</tbody>
          </table>
          <div className="xs muted" style={{ padding: '8px 14px' }}>Categories by rate: {CATEGORIES.map((c) => `${c.name} ${GST_RATE[c.id]}%`).join(' · ')}.</div>
        </Card>
      )}
    </div>
  );
}
