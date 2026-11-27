import { Link, Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Truck, Zap } from 'lucide-react';
import { Banner, Card, Pill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { vendorById } from '../../data/vendors';
import { fmtDateTime, inr, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';

const METHOD: Record<string, string> = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', cod: 'Cash on Delivery' };

export default function Confirmation() {
  const { id } = useParams();
  const { orders } = useOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return <Navigate to="/marketplace" replace />;

  return (
    <div className="container stack-16" style={{ maxWidth: 900 }}>
      <Card>
        <div className="row" style={{ gap: 16 }}>
          <div className="tone-green" style={{ width: 52, height: 52, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center' }}><CheckCircle2 size={26} /></div>
          <div className="grow">
            <h1 style={{ fontSize: 20, fontWeight: 750 }}>Order placed</h1>
            <div className="small muted">Parent order <b className="mono" style={{ color: 'var(--text)' }}>{o.id}</b> · {fmtDateTime(o.placedAt)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono bold" style={{ fontSize: 20 }}>{inr(o.total)}</div>
            <div className="xs muted">{METHOD[o.payment.method]} · {o.payment.status}{o.payment.txn && <> · <span className="mono">{o.payment.txn}</span></>}</div>
          </div>
        </div>
      </Card>

      <Banner tone="info" lead={`${o.subOrders.length} vendor sub-order(s) created.`}>Each vendor accepts and dispatches separately. You'll get one GST invoice per vendor after delivery is verified. Orders can't be cancelled or edited.</Banner>

      {o.subOrders.map((s) => (
        <Card key={s.id} pad={false}
          title={<span className="row"><span className="mono">{s.id}</span> · {vendorById(s.vendorId)?.name}</span>}
          sub={s.fulfilment === 'insta' ? <span className="row" style={{ gap: 4 }}><Zap size={12} style={{ color: 'var(--orange)' }} /> TrimInsta 6-Hour from {s.hubName}</span> : <span className="row" style={{ gap: 4 }}><Truck size={12} /> Standard: waiting for vendor acceptance (within 1 business day)</span>}
          actions={<Pill tone="blue">{s.status}</Pill>}>
          {s.lines.map((l) => (
            <div key={l.productId} className="row" style={{ padding: '10px 20px', borderBottom: '1px solid var(--slate-100)' }}>
              <ProductImage hue={l.hue} label={l.title} size={40} />
              <div className="grow"><div className="small bold">{l.title}</div><div className="xs muted"><span className="mono">{l.sku}</span> · {num(l.qty)} {l.unit}{l.shade && ` · ${l.shade}`}</div></div>
              <span className="mono small">{inr(l.amount)}</span>
            </div>
          ))}
          <div className="row-between" style={{ padding: '10px 20px' }}>
            <span className="xs muted">Shipping {s.shipping ? inr(s.shipping) : 'free'} · GST {inr(s.gst)}</span>
            <span className="mono bold">{inr(s.total)}</span>
          </div>
        </Card>
      ))}

      <Card>
        <dl className="kv">
          <dt>Deliver to</dt><dd>{o.address.label}: {o.address.line}, {o.address.city} {o.address.pin}</dd>
          <dt>Billing GSTIN</dt><dd className="mono">{o.billingGstin}</dd>
        </dl>
      </Card>

      <div className="row wrap">
        <Link to="/account/orders" className="btn btn-primary"><FileText size={15} /> Track in My Orders</Link>
        <Link to="/marketplace" className="btn btn-secondary">Continue shopping</Link>
      </div>
    </div>
  );
}
