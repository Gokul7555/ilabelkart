import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck, ChevronDown, ChevronRight, Download, FlaskConical, MapPin, Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck, Zap,
} from 'lucide-react';
import { Banner, Card, EmptyState, Modal, Pill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { CATEGORY_ATTRS, CLASSIFICATIONS, categoryById } from '../../data/categories';
import { useProfile } from '../../lib/profile';
import { inr, maskGstin, num } from '../../lib/format';
import { customerPrice } from '../../lib/catalog';
import { useListings } from '../../lib/marketplace';
import { factoryStock, gstRate, instaCheck, qtyError, tierIndex, unitPrice } from '../../lib/pricing';
import type { Fulfilment } from '../../lib/pricing';
import { useCart } from '../../lib/cart';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const cart = useCart();
  const listing = useListings().find((l) => l.product.id === id);
  const { addresses: ADDRESSES } = useProfile();

  const [img, setImg] = useState(0);
  const [shade, setShade] = useState<string | undefined>(listing?.product.live?.shades[0]?.name);
  const [fulfil, setFulfil] = useState<Fulfilment>('standard');
  const [qty, setQty] = useState<number>(listing?.product.live?.moq ?? 0);
  const [qtyText, setQtyText] = useState(String(listing?.product.live?.moq ?? ''));
  const [specsOpen, setSpecsOpen] = useState(true);
  const [sampleOpen, setSampleOpen] = useState(false);

  if (!listing) {
    return <div className="card"><EmptyState title="Product not found" action={<Link to="/marketplace" className="btn btn-primary btn-sm">Back to Marketplace</Link>}>This listing may have been removed or is not live yet.</EmptyState></div>;
  }

  const p = listing.product;
  const v = p.live!;
  const cat = categoryById(p.categoryId)!;
  const cls = CLASSIFICATIONS.find((c) => c.id === cat.classification)!;
  const isCustomer = user?.role === 'customer';
  const addr = ADDRESSES.find((a) => a.id === cart.addressId) ?? ADDRESSES[0];
  const insta = instaCheck(p, addr);
  const standardAvail = factoryStock(p);
  const avail = fulfil === 'insta' ? insta.hubStock : standardAvail;
  const err = qtyError(p, qty, avail);
  const up = unitPrice(p, qty || v.moq);
  const ti = tierIndex(p, qty || v.moq);
  const line = Math.round(up * (qty || 0) * 100) / 100;
  const rate = gstRate(p);
  const gst = Math.round(line * rate) / 100;
  const blocked = listing.salesBlocked;
  const low = avail > 0 && avail < p.lowStockAt;
  const base0 = customerPrice(v.tiers[0].price, p.categoryId);

  const setQ = (n: number) => { const x = Math.max(0, n); setQty(x); setQtyText(String(x)); };
  const step = v.packMultiple;

  const requireBuyer = () => {
    if (!user) { nav('/login', { state: { from: loc.pathname } }); return false; }
    if (!isCustomer) { toast('warning', 'Buyer account required', 'Only buyer accounts can place orders.'); return false; }
    return true;
  };

  const addToOrder = () => {
    if (!requireBuyer() || err || blocked) return;
    cart.add({ productId: p.id, qty, shade, fulfilment: fulfil, priceSeen: up });
    toast('success', 'Added to Procurement Order', `${num(qty)} ${v.unit} · ${v.title}`);
  };

  return (
    <div className="stack-16">
      <nav className="small row wrap" aria-label="Breadcrumb" style={{ gap: 4 }}>
        <Link to="/marketplace">Marketplace</Link><ChevronRight size={12} className="muted" />
        <span className="muted">{cls.name}</span><ChevronRight size={12} className="muted" />
        <span className="muted">{cat.name}</span><ChevronRight size={12} className="muted" />
        <span style={{ color: 'var(--text)' }}>{v.title}</span>
      </nav>

      {blocked && <Banner tone="danger" lead="Sales paused.">{listing.blockReason}. You can't order this product until the supplier's compliance is restored.</Banner>}

      <div className="pd-layout">
        {/* Gallery */}
        <div>
          <div className="gallery-main">
            <ProductImage hue={v.hue} label={v.title} index={img} size="100%" radius={0} />
            {v.insta && <span style={{ position: 'absolute', top: 12, left: 12 }}><Pill tone="solid-orange" icon={Zap}>TrimInsta Available</Pill></span>}
          </div>
          <div className="thumbs">
            {v.images.map((name, i) => (
              <button key={name + i} className={img === i ? 'on' : ''} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}: ${name}`}>
                <ProductImage hue={v.hue} label={v.title} index={i} size={64} radius={8} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="stack-16">
          <div>
            <div className="row wrap xs muted" style={{ gap: 10 }}>
              <span>SKU <b className="mono" style={{ color: 'var(--text)' }}>{p.sku}</b></span>
              <span>HSN <b className="mono" style={{ color: 'var(--text)' }}>{v.hsn}</b></span>
              <span>{cat.name}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 750, letterSpacing: '-.015em', marginTop: 6 }}>{v.title}</h1>
            <div className="row" style={{ marginTop: 8, alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 750 }}>{inr(up)}</span>
              <span className="muted small">/ {v.unit} · pre-tax</span>
              {ti > 0 && <span className="mono muted small" style={{ textDecoration: 'line-through' }}>{inr(base0)}</span>}
            </div>
            <div className="small muted">MOQ <b className="mono" style={{ color: 'var(--text)' }}>{num(v.moq)} {v.unit}</b> · pack multiple <b className="mono" style={{ color: 'var(--text)' }}>{num(v.packMultiple)}</b></div>
            <p className="small" style={{ marginTop: 10, color: 'var(--text-2)' }}>{v.description}</p>
          </div>

          <div>
            <div className="caps muted" style={{ marginBottom: 8 }}>Volume pricing</div>
            <div className="row wrap" style={{ gap: 8 }}>
              {v.tiers.map((t, i) => {
                const cp = customerPrice(t.price, p.categoryId);
                const save = i > 0 ? Math.round((1 - cp / base0) * 100) : 0;
                return (
                  <button key={i} className={`tier-card ${ti === i ? 'on' : ''}`} onClick={() => setQ(Math.ceil(t.min / step) * step)} aria-pressed={ti === i}>
                    <div className="xs muted mono">{num(t.min)}{v.tiers[i + 1] ? `–${num(v.tiers[i + 1].min - 1)}` : '+'} {v.unit}</div>
                    <div className="mono bold">{inr(cp)}</div>
                    {save > 0 ? <Pill tone="green">Save {save}%</Pill> : <span className="xs muted">Base price</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <table className="tbl spec-table" aria-label="Tiered price table">
            <thead><tr><th>Quantity ({v.unit})</th><th className="right">Price / {v.unit} (pre-tax)</th><th className="right">You save</th></tr></thead>
            <tbody>{v.tiers.map((t, i) => {
              const cp = customerPrice(t.price, p.categoryId);
              return <tr key={i} style={ti === i ? { background: 'var(--primary-50)' } : undefined}><td className="mono">{num(t.min)}{v.tiers[i + 1] ? ` – ${num(v.tiers[i + 1].min - 1)}` : '+'}</td><td className="num">{inr(cp)}</td><td className="num">{i ? `${Math.round((1 - cp / base0) * 100)}%` : '—'}</td></tr>;
            })}</tbody>
          </table>

          {v.shades.length > 0 && (
            <div>
              <div className="caps muted" style={{ marginBottom: 8 }}>Production shade / colour: <span style={{ color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}>{shade}</span></div>
              <div className="row wrap">
                {v.shades.map((s) => <button key={s.name} className={`swatch ${shade === s.name ? 'active' : ''}`} style={{ background: s.hex }} title={s.name} aria-label={s.name} aria-pressed={shade === s.name} onClick={() => setShade(s.name)} />)}
              </div>
            </div>
          )}

          <Card>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span className="avatar" style={{ width: 42, height: 42 }}>{listing.vendor.name[0]}</span>
              <div className="grow">
                <div className="row wrap"><b>{listing.vendor.name}</b>{listing.vendor.elite && <Pill tone="dark" strong>ELITE</Pill>}</div>
                <div className="xs muted">{listing.vendor.city}, {listing.vendor.state} · <Star size={11} style={{ verticalAlign: -1, color: 'var(--warning)' }} /> {listing.vendor.rating.toFixed(1)}</div>
                <div className="row wrap" style={{ marginTop: 6 }}>
                  <Pill tone="green" icon={BadgeCheck}>Official Verified Supplier</Pill>
                  <span className="xs mono muted">GSTIN {maskGstin(listing.vendor.gstin)}</span>
                  <Pill tone="green" icon={ShieldCheck}>GST Verified</Pill>
                </div>
              </div>
            </div>
            <div className="divider-h" />
            <div className="caps muted" style={{ marginBottom: 8 }}>Compliance certifications</div>
            <div className="row wrap">
              {listing.certs.length === 0 && <span className="xs muted">No certificates on file</span>}
              {listing.certs.map((c) => (
                <span key={c.type} style={{ opacity: c.status === 'Approved' ? 1 : 0.5 }} title={c.status === 'Approved' ? `${c.number ?? ''}` : `Not yet valid: ${c.status}`}>
                  <Pill tone={c.status === 'Approved' ? 'green' : 'grey'} icon={c.status === 'Approved' ? BadgeCheck : undefined}>{c.type}{c.status !== 'Approved' && ` · ${c.status}`}</Pill>
                </span>
              ))}
            </div>
          </Card>

          <Card pad={false} title="Technical Specifications Dossier" actions={<button className="icon-btn light" onClick={() => setSpecsOpen((o) => !o)} aria-label="Toggle specifications" aria-expanded={specsOpen}>{specsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>}>
            {specsOpen && (
              <table className="tbl spec-table">
                <tbody>
                  {(categoryAttrs(p.categoryId, v.attributes)).map(([k, val]) => <tr key={k}><td className="muted" style={{ width: 180 }}>{k}</td><td>{val}</td></tr>)}
                  {v.specs.map((s) => <tr key={s.k}><td className="muted">{s.k}</td><td>{s.v}</td></tr>)}
                  <tr><td className="muted">Dispatch promise</td><td>{v.leadTimeDays * 24} hours from acceptance</td></tr>
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Buy box */}
        <div className="stack-16" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 12px)' }}>
          <Card title="Fulfilment method" icon={Truck}>
            <div className="stack-12">
              <div className="row small">
                <MapPin size={14} className="muted" /><span className="muted">Deliver to</span>
                <select className="select" style={{ height: 30, flex: 1 }} value={addr.id} onChange={(e) => cart.setAddressId(e.target.value)} aria-label="Delivery address">
                  {ADDRESSES.map((a) => <option key={a.id} value={a.id}>{a.label} · {a.pin}</option>)}
                </select>
              </div>
              <label className={`fulfil-opt ${fulfil === 'standard' ? 'on' : ''}`}>
                <input type="radio" name="ful" checked={fulfil === 'standard'} onChange={() => setFulfil('standard')} />
                <div>
                  <div className="bold small">Standard Online Delivery</div>
                  <div className="xs muted">Direct from the vendor's factory, dispatches in {v.leadTimeDays * 24}–{v.leadTimeDays * 24 + 24} hours. Courier assigned by TrimNova.</div>
                  <div className="xs" style={{ marginTop: 3 }}>{standardAvail > 0 ? <span style={{ color: 'var(--success-ink)' }}><span className="stock-dot" aria-hidden />In stock · {num(standardAvail)} {v.unit}</span> : <span style={{ color: 'var(--danger)' }}>Out of stock</span>}</div>
                </div>
              </label>
              <label className={`fulfil-opt ${fulfil === 'insta' ? 'on' : ''} ${insta.available ? '' : 'disabled'}`}>
                <input type="radio" name="ful" disabled={!insta.available} checked={fulfil === 'insta'} onChange={() => setFulfil('insta')} />
                <div>
                  <div className="bold small row" style={{ gap: 5 }}><Zap size={13} style={{ color: 'var(--orange)' }} /> TrimInsta 6-Hour Express</div>
                  {insta.available
                    ? <div className="xs muted">From {insta.hubName} ({insta.km} km) · <span style={{ color: 'var(--success)' }}>{num(insta.hubStock)} {v.unit} at hub</span></div>
                    : <div className="xs" style={{ color: 'var(--danger)' }}>Unavailable: {insta.reason}</div>}
                </div>
              </label>
            </div>
          </Card>

          <Card title="Quantity & pricing">
            <div className="stack-12">
              <div className="stepper-qty">
                <button onClick={() => setQ(Math.max(v.moq, qty - step))} aria-label="Decrease"><Minus size={14} /></button>
                <input value={qtyText} inputMode="numeric" aria-label="Quantity" onChange={(e) => { const t = e.target.value.replace(/\D/g, ''); setQtyText(t); setQty(+t); }} />
                <button onClick={() => setQ(qty < v.moq ? v.moq : qty + step)} aria-label="Increase"><Plus size={14} /></button>
              </div>
              <div className="xs muted">Steps of {num(step)} · minimum {num(v.moq)} {v.unit}</div>
              {err && qty > 0 && <span className="err small">{err}</span>}
              {!err && low && <Pill tone="amber">Low stock: {num(avail)} left</Pill>}
              <div>
                <div className="sum-row"><span>{num(qty || 0)} × {inr(up)}</span><span className="mono">{inr(line)}</span></div>
                <div className="sum-row"><span>GST ({rate}%)</span><span className="mono">{inr(gst)}</span></div>
                <div className="sum-row total"><span>Total payable</span><span className="mono">{inr(line + gst)}</span></div>
                <div className="xs muted">Applied: {ti === 0 ? 'base' : 'tier'} pricing ({num(v.tiers[ti].min)}+ {v.unit}). Shipping calculated in the procurement order.</div>
              </div>
              <button className="btn btn-primary btn-lg btn-block" disabled={blocked || (!!user && !isCustomer) || (!!user && !!err)} onClick={addToOrder}>
                <ShoppingCart size={16} /> {user ? 'Add to Procurement Order' : 'Sign in to order'}
              </button>
              <button className="btn btn-secondary btn-block" disabled={blocked} onClick={() => requireBuyer() && setSampleOpen(true)}><FlaskConical size={15} /> Request Lab Dip / Sample</button>
              <button className="btn btn-ghost btn-block" disabled={!v.tds} onClick={() => toast('success', 'TDS downloaded', v.tds)}><Download size={15} /> {v.tds ? 'Download TDS PDF' : 'TDS not provided'}</button>
              {isCustomer && cart.items.length > 0 && <Link to="/cart" className="small bold" style={{ textAlign: 'center' }}>View Procurement Order ({cart.items.length}) →</Link>}
            </div>
          </Card>
        </div>
      </div>

      <SampleModal open={sampleOpen} onClose={() => setSampleOpen(false)} shades={v.shades.map((s) => s.name)} defaultShade={shade} title={v.title}
        onSubmit={(ref) => toast('success', `Sample request ${ref} sent`, 'The supplier replies through TrimNova Support.')} />
    </div>
  );
}

function categoryAttrs(categoryId: string, attrs: Record<string, string>): [string, string][] {
  return (CATEGORY_ATTRS[categoryId] ?? []).filter((a) => attrs[a.key]).map((a) => [a.label, `${attrs[a.key]}${a.unit ? ` ${a.unit}` : ''}`]);
}

function SampleModal({ open, onClose, shades, defaultShade, title, onSubmit }: {
  open: boolean; onClose: () => void; shades: string[]; defaultShade?: string; title: string; onSubmit: (ref: string) => void;
}) {
  const [kind, setKind] = useState<'labdip' | 'sample'>('sample');
  const [shade, setShade] = useState(defaultShade ?? '');
  const [qty, setQty] = useState('10');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const ok = +qty > 0 && +qty <= 100 && !!date && (kind === 'sample' || note.trim().length >= 5);
  return (
    <Modal open={open} onClose={onClose} title="Request Lab Dip / Sample" icon={FlaskConical}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { onSubmit(`SR-2026-${Math.floor(1000 + Math.random() * 9000)}`); onClose(); }}>Send request</button></>}>
      <div className="stack-12">
        <div className="small bold">{title}</div>
        <div className="tabs">
          <button className={`tab ${kind === 'sample' ? 'active' : ''}`} onClick={() => setKind('sample')}>Stock sample</button>
          <button className={`tab ${kind === 'labdip' ? 'active' : ''}`} onClick={() => setKind('labdip')}>Lab dip (custom shade)</button>
        </div>
        {kind === 'sample' && shades.length > 0 && (
          <div className="field"><label htmlFor="ss">Shade</label><select id="ss" className="select" value={shade} onChange={(e) => setShade(e.target.value)}>{shades.map((s) => <option key={s}>{s}</option>)}</select></div>
        )}
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="sq">Quantity (max 100)</label><input id="sq" type="number" className="input mono" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="field"><label htmlFor="sd">Needed by</label><input id="sd" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="field">
          <label htmlFor="sn">{kind === 'labdip' ? 'Target shade (Pantone / TCX code or description)' : 'Notes (optional)'}</label>
          <textarea id="sn" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'labdip' ? 'e.g. Pantone 19-4052 TCX Classic Blue' : ''} />
        </div>
        <Banner tone="info">Sample charges, if any, are confirmed by the supplier before dispatch. All communication goes through TrimNova Support.</Banner>
      </div>
    </Modal>
  );
}
