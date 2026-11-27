import { useState } from 'react';
import { CheckCircle2, Gauge, PackageCheck, ScanLine, Timer, Zap } from 'lucide-react';
import { Banner, Card, EmptyState, PageHeader, Pill } from '../../components/ui';
import { SubStatusPill } from '../../components/OrderBits';
import { OtpHandoverModal } from '../../components/OtpHandoverModal';
import { ProductImage } from '../../components/ProductImage';
import { customerById } from '../../data/customer';
import { TRIMINSTA_HUBS } from '../../data/india';
import { fmtTime, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import type { SubOrder } from '../../lib/orders';
import { useWarehouse } from '../../lib/warehouse';
import { useCatalog } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

const PARTNER_OTP = '482913';

export default function InstaOps() {
  const { subOrders } = useOrders();
  const [hub, setHub] = useState('all');
  const active = subOrders.filter((s) => s.fulfilment === 'insta' && ['Order Placed', 'Accepted'].includes(s.status) && (hub === 'all' || s.hubName === hub))
    .sort((a, b) => a.placedAt.localeCompare(b.placedAt));
  const recent = subOrders.filter((s) => s.fulfilment === 'insta' && !['Order Placed', 'Accepted'].includes(s.status)).slice(0, 6);
  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={Gauge} title="TrimInsta Operations" subtitle="6-hour express: accept, pick, pack, scan, then OTP handover to the delivery partner" actions={<Pill tone="amber" strong>WAREHOUSE OPS</Pill>} />
      <div className="row-between wrap">
        <Banner tone="warning" icon={Timer} lead="6-hour promise.">The clock starts when the order is placed. Hand over within 2 hours so the partner has time to deliver inside the zone.</Banner>
        <select className="select" style={{ width: 240, height: 32 }} value={hub} onChange={(e) => setHub(e.target.value)} aria-label="Hub">
          <option value="all">All hubs</option>{TRIMINSTA_HUBS.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
        </select>
      </div>
      {active.length === 0 && <div className="card"><EmptyState icon={Zap} title="No TrimInsta orders waiting" /></div>}
      {active.map((s) => <InstaCard key={s.id} s={s} />)}
      {recent.length > 0 && (
        <Card title="Recently handed over" pad={false}>
          <table className="tbl"><tbody>{recent.map((s) => <tr key={s.id}><td className="mono small">{s.id}</td><td className="small">{s.hubName}</td><td><SubStatusPill status={s.status} /></td><td className="xs muted">{s.handover ? `Handover ${fmtTime(s.handover.at)}` : ''}</td></tr>)}</tbody></table>
        </Card>
      )}
    </div>
  );
}

function InstaCard({ s }: { s: SubOrder }) {
  const { accept, dispatch } = useOrders();
  const { products, updateStock } = useCatalog();
  const wh = useWarehouse();
  const { user } = useAuth();
  const { log } = useAudit();
  const toast = useToast();
  const prog = wh.insta[s.id] ?? {};
  const hubId = TRIMINSTA_HUBS.find((h) => h.name === s.hubName)?.id ?? '';
  const line = s.lines[0];
  const bin = wh.bins[`${hubId}:${line.productId}`] ?? '';
  const [binScan, setBinScan] = useState('');
  const [pk, setPk] = useState({ packages: 1, weightKg: 2 });
  const [awbScan, setAwbScan] = useState('');
  const [otp, setOtp] = useState(false);
  const me = `${user?.name} (${user?.id})`;

  const due = new Date(new Date(s.placedAt).getTime() + 6 * 3600000);
  const left = due.getTime() - Date.now();
  const leftLabel = left <= 0 ? `Overdue by ${Math.ceil(-left / 60000)} min` : `${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m left`;

  const steps = [
    { label: 'Accepted at hub', done: s.status === 'Accepted' },
    { label: 'Picked', done: !!prog.picked },
    { label: 'Packed', done: !!prog.packed },
    { label: 'Label scanned', done: !!prog.scanned },
    { label: 'OTP handover', done: false },
  ];

  return (
    <Card title={<span className="row"><span className="mono">{s.id}</span><Pill tone="solid-orange" icon={Zap}>Insta</Pill></span>}
      sub={<>{s.hubName} → {customerById(s.customerId)?.company} · placed {fmtTime(s.placedAt)} · deliver by {fmtTime(due.toISOString())}</>}
      actions={<Pill tone={left <= 0 ? 'red' : left < 2 * 3600000 ? 'amber' : 'green'} icon={Timer}>{leftLabel}</Pill>}>
      <div className="stack-16">
        <div className="row wrap" style={{ gap: 6 }}>
          {steps.map((st, i) => <Pill key={st.label} tone={st.done ? 'green' : 'grey'} icon={st.done ? CheckCircle2 : undefined}>{i + 1}. {st.label}</Pill>)}
        </div>
        <div className="row" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <ProductImage hue={line.hue} label={line.title} size={44} />
          <div className="grow"><div className="small bold">{line.title}</div><div className="xs muted"><span className="mono">{line.sku}</span> · {num(line.qty)} {line.unit}{line.shade && ` · ${line.shade}`}</div></div>
          <div style={{ textAlign: 'right' }}><div className="caps muted">Bin</div><div className="mono bold">{bin || '—'}</div></div>
        </div>

        {s.status === 'Order Placed' && (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { accept(s.id, `${s.hubName} (${me})`); log({ action: 'TrimInsta order accepted at hub', entity: s.id }); toast('success', 'Accepted at hub', 'Stock reserved.'); }}>Accept & reserve stock</button>
          </div>
        )}

        {s.status === 'Accepted' && !prog.picked && (
          <div className="row wrap">
            <ScanLine size={16} className="muted" /><span className="small">Scan bin to confirm pick</span>
            <input className="input mono" style={{ width: 170, height: 32 }} placeholder={bin || 'Bin code'} value={binScan} onChange={(e) => setBinScan(e.target.value.toUpperCase())} />
            <button className="btn btn-ghost btn-xs" onClick={() => setBinScan(bin)}>Demo: scan</button>
            <button className="btn btn-primary btn-sm" disabled={!bin || binScan !== bin} onClick={() => { wh.setInsta(s.id, { picked: { at: new Date().toISOString(), by: me, bin } }); toast('success', 'Picked', `${num(line.qty)} ${line.unit} from ${bin}`); }}>Confirm pick</button>
            {binScan && binScan !== bin && <span className="err small">Wrong bin. Expected {bin}.</span>}
          </div>
        )}

        {prog.picked && !prog.packed && (
          <div className="row wrap">
            <PackageCheck size={16} className="muted" /><span className="small">Pack</span>
            <label className="row small">Packages <input type="number" min={1} className="input mono" style={{ width: 80, height: 32 }} value={pk.packages} onChange={(e) => setPk({ ...pk, packages: +e.target.value })} /></label>
            <label className="row small">Weight kg <input type="number" min={0.1} step="0.1" className="input mono" style={{ width: 90, height: 32 }} value={pk.weightKg} onChange={(e) => setPk({ ...pk, weightKg: +e.target.value })} /></label>
            <button className="btn btn-primary btn-sm" disabled={pk.packages < 1 || pk.weightKg <= 0} onClick={() => { wh.setInsta(s.id, { packed: { at: new Date().toISOString(), ...pk } }); toast('success', 'Packed'); }}>Confirm pack</button>
          </div>
        )}

        {prog.packed && !prog.scanned && (
          <div className="row wrap">
            <ScanLine size={16} className="muted" /><span className="small">Scan shipping label</span>
            <input className="input mono" style={{ width: 200, height: 32 }} placeholder={s.awb} value={awbScan} onChange={(e) => setAwbScan(e.target.value.toUpperCase())} />
            <button className="btn btn-ghost btn-xs" onClick={() => setAwbScan(s.awb ?? '')}>Demo: scan</button>
            <button className="btn btn-primary btn-sm" disabled={awbScan !== s.awb} onClick={() => { wh.setInsta(s.id, { scanned: { at: new Date().toISOString(), awb: awbScan } }); toast('success', 'Label verified'); }}>Confirm label</button>
          </div>
        )}

        {prog.scanned && (
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-success btn-sm" onClick={() => setOtp(true)}>OTP handover to {s.courier}</button>
          </div>
        )}
      </div>

      <OtpHandoverModal open={otp} onClose={() => setOtp(false)} title={`Hub handover · ${s.id}`} from={s.hubName ?? 'Hub'} to={`${s.courier} rider`} expected={PARTNER_OTP} confirmLabel="Verify OTP & hand over"
        onVerified={() => {
          dispatch(s.id, { by: me, packages: prog.packed!.packages, weightKg: prog.packed!.weightKg, at: new Date().toISOString() });
          const p = products.find((x) => x.id === line.productId);
          if (p) updateStock(p.id, p.stock.map((st) => (st.loc.startsWith(hubId) ? { ...st, qty: Math.max(0, st.qty - line.qty) } : st)), `${me} · TrimInsta ${s.id}`);
          log({ action: 'TrimInsta handover (OTP verified)', entity: s.id, oldValue: 'Accepted', newValue: `Dispatched · ${s.courier} ${s.awb}` });
          toast('success', 'Handed over', 'Hub stock deducted; buyer notified.');
        }} />
    </Card>
  );
}
