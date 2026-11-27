import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Camera, Download, FileText, KeyRound, Lock, MapPin, PackageCheck, RotateCcw, ShieldAlert, Truck, Zap } from 'lucide-react';
import { Banner, Card, Pill, StatusPill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { OrderTimeline, ReturnCountdown, SubStatusPill, TrackingModal } from '../../components/OrderBits';
import { OtpHandoverModal } from '../../components/OtpHandoverModal';
import { vendorById } from '../../data/vendors';
import { fmtDateTime, inr, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import type { SubOrder } from '../../lib/orders';
import { isOpenCase, useCases } from '../../lib/cases';
import { useAuth } from '../../lib/auth';
import { usePlatformConfig } from '../../lib/platformConfig';
import { useToast } from '../../lib/toast';
import { DemoPanel } from '../vendor/onboarding/shared';

const METHOD: Record<string, string> = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cod: 'Cash on Delivery' };

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { orders } = useOrders();
  const o = orders.find((x) => x.id === id && x.customerId === user?.customerId);
  const [track, setTrack] = useState<SubOrder | null>(null);
  if (!o) return <Navigate to="/account/orders" replace />;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1100 }}>
      <Card>
        <div className="row wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="caps muted">Parent order</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 750 }}>{o.id}</div>
            <div className="small muted">Placed {fmtDateTime(o.placedAt)} · {o.subOrders.length} vendor sub-order(s)</div>
          </div>
          <dl className="kv" style={{ gridTemplateColumns: '90px 1fr', minWidth: 300 }}>
            <dt>Deliver to</dt><dd className="small"><MapPin size={11} style={{ verticalAlign: -1 }} /> {o.address.label}, {o.address.city} {o.address.pin}</dd>
            <dt>Payment</dt><dd className="small">{METHOD[o.payment.method]} · {o.payment.status}{o.payment.txn && <span className="mono muted"> · {o.payment.txn}</span>}</dd>
          </dl>
          <div style={{ textAlign: 'right' }}>
            <div className="caps muted">Total paid</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 750 }}>{inr(o.total)}</div>
            <div className="xs muted">incl. GST {inr(o.gst)} · shipping {inr(o.shipping)}</div>
          </div>
        </div>
      </Card>
      <Banner tone="info" icon={Lock} lead="Orders can't be cancelled or edited after placing.">For damaged goods, raise a claim on the delivered sub-order within the return window. For anything else, contact TrimNova Support.</Banner>

      {o.subOrders.map((s) => <SubOrderCard key={s.id} s={s} onTrack={() => setTrack(s)} />)}

      <TrackingModal so={track} onClose={() => setTrack(null)} />
    </div>
  );
}

function SubOrderCard({ s, onTrack }: { s: SubOrder; onTrack: () => void }) {
  const { advance, confirmDelivery } = useOrders();
  const { cases } = useCases();
  const { cfg } = usePlatformConfig();
  const { user } = useAuth();
  const toast = useToast();
  const [otpOpen, setOtpOpen] = useState(false);
  const vendor = vendorById(s.vendorId);
  const myCases = cases.filter((c) => c.subOrderId === s.id);
  const openCase = myCases.find(isOpenCase);
  const inWindow = !!s.returnWindowEnds && new Date(s.returnWindowEnds).getTime() > Date.now();
  const delivered = !!s.delivery;
  const shipping = ['Dispatched', 'In Transit', 'Out for Delivery'].includes(s.status);

  return (
    <Card pad={false}
      title={<span className="row wrap"><span className="mono">{s.id}</span><span>· {vendor?.name}</span></span>}
      sub={s.fulfilment === 'insta' ? <span className="row" style={{ gap: 4 }}><Zap size={12} style={{ color: 'var(--orange)' }} /> TrimInsta 6-Hour from {s.hubName}</span> : <span className="row" style={{ gap: 4 }}><Truck size={12} /> Standard Delivery direct from vendor</span>}
      actions={<SubStatusPill status={s.status} />}>
      <div className="card-body stack-16">
        <OrderTimeline so={s} />

        {s.status === 'Rejected' && s.rejection && (
          <Banner tone="danger" lead="Vendor rejected this sub-order:">“{s.rejection.reason}”. A refund of <span className="mono">{inr(s.refund?.amount ?? s.total)}</span> was initiated (ref <span className="mono">{s.refund?.ref}</span>). Refund status: <StatusPill status={s.refund?.status ?? 'Pending'} /></Banner>
        )}
        {s.status === 'Partial Review' && <Banner tone="warning" lead="Partial acceptance requested by vendor.">TrimNova Admin/Support is reviewing it and will contact you before anything changes.</Banner>}
        {s.status === 'Delivery Failed' && <Banner tone="danger" lead="Courier couldn't deliver.">{s.ndr ? `${s.ndr.attempts} attempt(s) failed: ${s.ndr.reason}. ` : ''}TrimNova Support will contact you within 24 hours to confirm the address.</Banner>}

        <div className="grid g-3" style={{ gap: 12 }}>
          <div className="info-tile">
            <div className="caps muted">Shipment</div>
            {s.awb ? (
              <>
                <div className="small"><b>{s.courier}</b> · <span className="mono">{s.awb}</span></div>
                <button className="btn btn-secondary btn-xs" style={{ marginTop: 6 }} onClick={onTrack}><Truck size={12} /> Track shipment</button>
              </>
            ) : <div className="small muted">Courier assigned by TrimNova after the vendor accepts.</div>}
          </div>
          <div className="info-tile">
            <div className="caps muted">{delivered ? 'Proof of delivery' : 'Delivery OTP'}</div>
            {delivered ? (
              <div className="small">
                <div><PackageCheck size={13} style={{ verticalAlign: -2, color: 'var(--success)' }} /> {fmtDateTime(s.delivery!.at)}</div>
                <div className="xs muted">Received by {s.delivery!.receivedBy} · OTP verified</div>
                <div className="xs muted"><Camera size={11} style={{ verticalAlign: -1 }} /> {s.delivery!.photo}</div>
              </div>
            ) : shipping ? (
              <div>
                <div className="mono" style={{ fontSize: 20, letterSpacing: '.2em', fontWeight: 700 }}>{s.deliveryOtp}</div>
                <div className="xs muted"><KeyRound size={11} style={{ verticalAlign: -1 }} /> Share only with the courier at handover</div>
              </div>
            ) : <div className="small muted">Shown here once your shipment is dispatched.</div>}
          </div>
          <div className="info-tile">
            <div className="caps muted">GST invoice</div>
            {s.invoiceNo ? (
              <>
                <div className="small mono">{s.invoiceNo}</div>
                <button className="btn btn-secondary btn-xs" style={{ marginTop: 6 }} onClick={() => toast('success', 'Invoice downloaded', `${s.invoiceNo}.pdf`)}><Download size={12} /> Download</button>
              </>
            ) : <div className="small muted"><FileText size={12} style={{ verticalAlign: -2 }} /> Issued by {vendor?.name} after verified delivery.</div>}
          </div>
        </div>

        <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <table className="tbl">
            <thead><tr><th>Product</th><th className="right">Qty</th><th className="right">Unit price</th><th className="right">Amount</th></tr></thead>
            <tbody>
              {s.lines.map((l) => (
                <tr key={l.productId}>
                  <td><div className="row"><ProductImage hue={l.hue} label={l.title} size={34} /><div><div className="t-name">{l.title}</div><div className="t-sub"><span className="mono">{l.sku}</span>{l.shade && ` · ${l.shade}`} · GST {l.gstRate}%</div></div></div></td>
                  <td className="num">{num(l.qty)} {l.unit}</td>
                  <td className="num">{inr(l.unitPrice)}</td>
                  <td className="num">{inr(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-between wrap small">
          <span className="muted">Items {inr(s.subtotal)} · Shipping {s.shipping ? inr(s.shipping) : 'free'} · GST {inr(s.gst)}</span>
          <b className="mono">Sub-order total {inr(s.total)}</b>
        </div>

        {delivered && (
          <div className="row wrap" style={{ padding: '12px 14px', borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <ReturnCountdown ends={s.returnWindowEnds} />
            <span className="grow" />
            {myCases.map((c) => <Link key={c.id} to="/account/cases" className="btn btn-secondary btn-sm"><ShieldAlert size={13} /> {c.id} · {c.status}</Link>)}
            {inWindow && !openCase && <Link to={`/account/cases/new?so=${s.id}`} className="btn btn-primary btn-sm"><RotateCcw size={13} /> Raise damage claim</Link>}
            {!inWindow && <span className="xs muted">Claims are accepted only within {cfg.returnWindowDays} days of delivery.</span>}
          </div>
        )}

        {user?.role === 'customer' && (shipping) && (
          <DemoPanel>
            {s.status !== 'Out for Delivery'
              ? <button className="btn btn-secondary btn-sm" onClick={() => advance(s.id)}>Courier: next scan ({s.status === 'Dispatched' ? 'In Transit' : 'Out for Delivery'})</button>
              : <button className="btn btn-success btn-sm" onClick={() => setOtpOpen(true)}>Courier: deliver with your OTP</button>}
          </DemoPanel>
        )}
      </div>

      <OtpHandoverModal open={otpOpen} onClose={() => setOtpOpen(false)} title="Delivery handover" from={s.courier ?? 'Courier'} to="Receiver (you)"
        expected={s.deliveryOtp} confirmLabel="Confirm delivery"
        onVerified={() => { confirmDelivery(s.id, `${user?.name ?? 'Receiver'}`, cfg.returnWindowDays); toast('success', 'Delivered', `Return window: ${cfg.returnWindowDays} days. Invoice issued.`); }}>
        <Pill tone="green">Courier enters the OTP you share. Delivery is verified only when it matches.</Pill>
      </OtpHandoverModal>
    </Card>
  );
}
