import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Building2, Check, MapPin, Minus, Plus, ShoppingCart, Trash2, Truck, Zap } from 'lucide-react';
import { Banner, Card, EmptyState, PageHeader, Pill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { useProfile } from '../../lib/profile';
import { inr, num } from '../../lib/format';
import { useCart } from '../../lib/cart';
import { useListings } from '../../lib/marketplace';
import { buildCart } from '../../lib/cartCalc';
import type { CartGroup } from '../../lib/cartCalc';
import { SHIPPING, unitPrice } from '../../lib/pricing';

export default function Cart() {
  const cart = useCart();
  const listings = useListings();
  const nav = useNavigate();
  const { addresses: ADDRESSES } = useProfile();
  const addr = ADDRESSES.find((a) => a.id === cart.addressId) ?? ADDRESSES[0];
  const { groups, totals, blocking, orphans } = buildCart(cart.items, listings, addr);
  const vendors = new Set(groups.map((g) => g.vendor.id)).size;

  if (cart.items.length === 0) {
    return (
      <div className="container">
        <PageHeader icon={ShoppingCart} title="Procurement Order" subtitle="Items from multiple vendors, one checkout" />
        <div className="card"><EmptyState icon={ShoppingCart} title="Your procurement order is empty" action={<Link to="/marketplace" className="btn btn-primary btn-sm">Browse the marketplace</Link>}>Add products to build a multi-vendor order.</EmptyState></div>
      </div>
    );
  }

  return (
    <div className="stack-16">
      <PageHeader icon={ShoppingCart} title="Procurement Order"
        subtitle={`${cart.items.length} item(s) from ${vendors} vendor(s). One payment and one parent order, with a separate sub-order and GST invoice for each vendor.`} />

      <ol className="co-steps" aria-label="Checkout progress">
        {['Procurement Order', 'Delivery address', 'Delivery type', 'Payment', 'Confirmation'].map((label, i) => (
          <li key={label} className={i === 0 ? 'current' : ''} aria-current={i === 0 ? 'step' : undefined}><span className="n">{i + 1}</span>{label}</li>
        ))}
      </ol>
      <div className="checkout-layout">
        <div className="stack-16">
          <Card>
            <div className="row wrap">
              <MapPin size={15} className="muted" />
              <span className="small muted">Delivering to</span>
              <select className="select" style={{ height: 32, maxWidth: 360 }} value={addr.id} onChange={(e) => cart.setAddressId(e.target.value)} aria-label="Delivery address">
                {ADDRESSES.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.city} {a.pin}</option>)}
              </select>
              {addr.hubId ? <Pill tone="orange" icon={Zap}>TrimInsta zone · {addr.hubKm} km</Pill> : <Pill tone="grey">Outside TrimInsta zones</Pill>}
            </div>
          </Card>

          {blocking > 0 && <Banner tone="warning" lead={`${blocking} item(s) need your attention.`}>We never change prices, quantities or delivery methods for you. Review each flagged line before checkout.</Banner>}
          {orphans.length > 0 && (
            <Banner tone="danger" lead="Unavailable:" actions={<button className="btn btn-outline-danger btn-sm" onClick={() => orphans.forEach((o) => cart.remove(o.key))}>Remove</button>}>
              {orphans.length} item(s) are no longer listed.
            </Banner>
          )}

          {groups.map((g) => <GroupCard key={g.key} g={g} />)}
        </div>

        <aside className="stack-16" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 12px)' }}>
          <Card title="Order summary">
            <div>
              {groups.map((g) => (
                <div key={g.key} className="sum-row"><span className="muted">{g.vendor.name} · {g.fulfilment === 'insta' ? 'Insta' : 'Standard'}</span><span className="mono">{inr(g.total)}</span></div>
              ))}
              <div className="divider-h" />
              <div className="sum-row"><span>Items (pre-tax)</span><span className="mono">{inr(totals.subtotal)}</span></div>
              <div className="sum-row"><span>Shipping</span><span className="mono">{totals.shipping ? inr(totals.shipping) : 'Free'}</span></div>
              <div className="sum-row"><span>GST</span><span className="mono">{inr(totals.gst)}</span></div>
              <div className="sum-row total"><span>Total</span><span className="mono">{inr(totals.total)}</span></div>
            </div>
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 14 }} disabled={blocking > 0} onClick={() => nav('/checkout')}>
              Proceed to checkout <ArrowRight size={16} />
            </button>
            {blocking > 0 && <div className="xs" style={{ color: 'var(--warning)', marginTop: 6, textAlign: 'center' }}>Resolve flagged items to continue</div>}
            <div className="xs muted" style={{ marginTop: 10 }}>
              Orders can't be cancelled or edited after you place them. Standard shipping is {inr(SHIPPING.standardPerShipment, { decimals: 0 })} per vendor shipment, free above {inr(SHIPPING.standardFreeAbove, { decimals: 0 })}. TrimInsta is {inr(SHIPPING.instaPerShipment, { decimals: 0 })} per hub shipment. These are mock rates.
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function GroupCard({ g }: { g: CartGroup }) {
  const cart = useCart();
  return (
    <Card pad={false}
      title={<span className="row"><Building2 size={15} className="muted" /> {g.vendor.name}</span>}
      sub={g.fulfilment === 'insta'
        ? <span className="row" style={{ gap: 4 }}><Zap size={12} style={{ color: 'var(--orange)' }} /> TrimInsta 6-Hour from {g.hubName}</span>
        : <span className="row" style={{ gap: 4 }}><Truck size={12} /> Standard: vendor factory → you, dispatch within {g.leadTimeDays * 24}h, courier assigned by TrimNova</span>}
      actions={<Pill tone={g.fulfilment === 'insta' ? 'orange' : 'blue'}>{g.fulfilment === 'insta' ? 'Insta sub-order' : 'Standard sub-order'}</Pill>}>
      <div>
        {g.lines.map((l) => {
          const v = l.listing.product.live!;
          const p = l.listing.product;
          return (
            <div key={l.item.key} style={{ padding: '14px 20px', borderBottom: '1px solid var(--slate-100)' }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <ProductImage hue={v.hue} label={v.title} size={56} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <Link to={`/marketplace/products/${p.id}`} className="bold small" style={{ color: 'var(--text)' }}>{v.title}</Link>
                  <div className="xs muted"><span className="mono">{p.sku}</span>{l.item.shade && ` · Shade: ${l.item.shade}`} · GST {l.gstRate}%</div>
                  <div className="row wrap" style={{ marginTop: 6 }}>
                    <div className="stepper-qty" style={{ width: 160, height: 30 }}>
                      <button onClick={() => cart.update(l.item.key, { qty: Math.max(v.moq, l.item.qty - v.packMultiple), priceSeen: unitPrice(p, Math.max(v.moq, l.item.qty - v.packMultiple)) })} aria-label="Decrease"><Minus size={12} /></button>
                      <input value={l.item.qty} inputMode="numeric" aria-label="Quantity" onChange={(e) => { const n = +e.target.value.replace(/\D/g, ''); cart.update(l.item.key, { qty: n, priceSeen: n ? unitPrice(p, n) : l.item.priceSeen }); }} />
                      <button onClick={() => cart.update(l.item.key, { qty: l.item.qty + v.packMultiple, priceSeen: unitPrice(p, l.item.qty + v.packMultiple) })} aria-label="Increase"><Plus size={12} /></button>
                    </div>
                    <span className="xs muted">{v.unit} · MOQ {num(v.moq)} · packs of {num(v.packMultiple)}</span>
                    {l.tier > 0 && <Pill tone="green">Tier {l.tier + 1} pricing</Pill>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono bold">{inr(l.amount)}</div>
                  <div className="xs muted mono">{inr(l.unitPrice)} /{v.unit}</div>
                  <button className="btn btn-ghost btn-xs" style={{ marginTop: 4, color: 'var(--danger)' }} onClick={() => cart.remove(l.item.key)}><Trash2 size={12} /> Remove</button>
                </div>
              </div>
              {l.issues.map((iss, i) => (
                <div key={i} className="row small" style={{ marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius)', background: iss.kind === 'blocked' ? 'var(--danger-50)' : 'var(--warning-50)', color: iss.kind === 'blocked' ? 'var(--danger-ink)' : 'var(--warning-ink)' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span className="grow">{iss.msg}</span>
                  {iss.kind === 'price' && <button className="btn btn-secondary btn-xs" onClick={() => cart.update(l.item.key, { priceSeen: l.unitPrice })}><Check size={12} /> Accept new price</button>}
                  {iss.kind === 'insta' && <button className="btn btn-secondary btn-xs" onClick={() => cart.update(l.item.key, { fulfilment: 'standard' })}>Switch to Standard</button>}
                  {iss.kind === 'qty' && v.moq > l.item.qty && <button className="btn btn-secondary btn-xs" onClick={() => cart.update(l.item.key, { qty: v.moq, priceSeen: unitPrice(p, v.moq) })}>Set to MOQ</button>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
        <div className="sum-row"><span className="muted">Items</span><span className="mono">{inr(g.subtotal)}</span></div>
        <div className="sum-row"><span className="muted">Shipping ({g.fulfilment === 'insta' ? 'TrimInsta' : 'Standard'})</span><span className="mono">{g.shipping ? inr(g.shipping) : 'Free'}</span></div>
        {g.gst.intra ? (
          <>
            <div className="sum-row"><span className="muted">CGST</span><span className="mono">{inr(g.gst.cgst)}</span></div>
            <div className="sum-row"><span className="muted">SGST</span><span className="mono">{inr(g.gst.sgst)}</span></div>
          </>
        ) : <div className="sum-row"><span className="muted">IGST (inter-state)</span><span className="mono">{inr(g.gst.igst)}</span></div>}
        <div className="sum-row bold"><span>Sub-order total</span><span className="mono">{inr(g.total)}</span></div>
      </div>
    </Card>
  );
}
