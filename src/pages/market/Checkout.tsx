import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Building, CreditCard, Landmark, Lock, MapPin, ShieldCheck, Smartphone, Truck, Wallet, Zap } from 'lucide-react';
import { Banner, Card, PageHeader, Pill } from '../../components/ui';
import { CUSTOMER } from '../../data/customer';
import { useProfile } from '../../lib/profile';
import { BANKS } from '../../data/india';
import { inr, num } from '../../lib/format';
import { useCart } from '../../lib/cart';
import { useListings } from '../../lib/marketplace';
import { buildCart } from '../../lib/cartCalc';
import { COD_LIMIT } from '../../lib/pricing';
import { useOrders } from '../../lib/orders';
import type { PayMethod } from '../../lib/orders';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';

export default function Checkout() {
  const cart = useCart();
  const listings = useListings();
  const { place } = useOrders();
  const nav = useNavigate();
  const toast = useToast();
  const { log } = useAudit();
  const { addresses: ADDRESSES } = useProfile();
  const addr = ADDRESSES.find((a) => a.id === cart.addressId) ?? ADDRESSES[0];
  const { groups, totals, blocking } = buildCart(cart.items, listings, addr);

  const [method, setMethod] = useState<PayMethod>('upi');
  const [upi, setUpi] = useState('raymondgarments@hdfcbank');
  const [card, setCard] = useState({ no: '', exp: '', cvv: '', name: '' });
  const [bank, setBank] = useState('HDFC');
  const [ack, setAck] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [simulateFail, setSimulateFail] = useState(false);

  if (cart.items.length === 0 && !busy) return <Navigate to="/cart" replace />;

  const codOk = totals.total <= COD_LIMIT;
  const payValid =
    method === 'upi' ? /^[\w.-]{2,}@[a-z]{2,}$/i.test(upi)
      : method === 'card' ? card.no.replace(/\s/g, '').length === 16 && /^\d{2}\/\d{2}$/.test(card.exp) && /^\d{3}$/.test(card.cvv) && card.name.trim().length > 2
        : method === 'netbanking' ? !!bank : codOk;
  const canPay = step === 3 && blocking === 0 && ack && payValid && !busy;

  const pay = () => {
    if (!canPay) return;
    setBusy(true); setFailed(null);
    // Single payment attempt: button locked until the gateway answers. No double charge on retries.
    setTimeout(() => {
      if (simulateFail && method !== 'cod') {
        setBusy(false);
        setFailed('The bank declined the payment. No amount was captured. Your procurement order is saved, so you can try again or pick another method.');
        return;
      }
      const order = place({
        customerId: CUSTOMER.id, address: addr, billingGstin: CUSTOMER.gstin,
        payment: method === 'cod' ? { method, status: 'COD pending' } : { method, status: 'Captured', txn: `PG${Date.now().toString().slice(-10)}` },
        subOrders: groups.map((g) => ({
          vendorId: g.vendor.id, fulfilment: g.fulfilment, hubName: g.hubName, leadTimeDays: g.leadTimeDays,
          lines: g.lines.map((l) => ({ productId: l.listing.product.id, sku: l.listing.product.sku, title: l.listing.product.live!.title, qty: l.item.qty, unit: l.listing.product.live!.unit, shade: l.item.shade, unitPrice: l.unitPrice, basePrice: l.listing.product.live!.tiers[l.tier].price, amount: l.amount, gstRate: l.gstRate, hue: l.listing.product.live!.hue })),
          subtotal: g.subtotal, shipping: g.shipping, gst: g.gst.total, total: g.total,
        })),
        subtotal: totals.subtotal, shipping: totals.shipping, gst: totals.gst, total: totals.total,
      });
      log({ action: 'Order placed', entity: order.id, newValue: `${order.subOrders.length} sub-order(s) · ${inr(order.total)}` });
      cart.clear();
      toast('success', 'Order placed', order.id);
      nav(`/order-confirmation/${order.id}`, { replace: true });
    }, 1500);
  };

  return (
    <div className="stack-16">
      <PageHeader icon={Lock} title="Checkout" subtitle="Secure single payment for every vendor in your procurement order" />
      <ol className="co-steps" aria-label="Checkout progress">
        {['Procurement Order', 'Delivery address', 'Delivery type', 'Payment', 'Confirmation'].map((label, i) => {
          const state = i === 0 || i < step ? 'done' : i === step ? 'current' : '';
          return <li key={label} className={state} aria-current={i === step ? 'step' : undefined}><span className="n">{state === 'done' ? '✓' : i + 1}</span>{label}</li>;
        })}
      </ol>
      <div className="checkout-layout">
        <div className="stack-16">
          {step === 1 && (<>
          <Card title="Delivery address" icon={MapPin}>
            <div className="grid g-3" style={{ gap: 10 }}>
              {ADDRESSES.map((a) => (
                <button key={a.id} className={`addr-card ${a.id === addr.id ? 'on' : ''}`} onClick={() => cart.setAddressId(a.id)} aria-pressed={a.id === addr.id}>
                  <div className="bold small">{a.label}</div>
                  <div className="xs muted">{a.line}, {a.city}, {a.state} {a.pin}</div>
                  <div className="xs" style={{ marginTop: 4 }}>{a.contact} · {a.phone}</div>
                  <div style={{ marginTop: 6 }}>{a.hubId ? <Pill tone="orange" icon={Zap}>Insta zone</Pill> : <Pill tone="grey">Standard only</Pill>}</div>
                </button>
              ))}
            </div>
            <div className="divider-h" />
            <dl className="kv"><dt>Bill to</dt><dd>{CUSTOMER.company}</dd><dt>GSTIN</dt><dd className="mono">{CUSTOMER.gstin}</dd></dl>
          </Card>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={() => setStep(2)}>Continue to delivery</button></div></>)}

          {step === 2 && (<>
          <Card title="Delivery type" icon={Truck} sub="Set per item in your procurement order. Each vendor and route becomes a separate sub-order.">
            <div className="stack-12">
              {groups.map((g) => (
                <div key={g.key} className="row" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  {g.fulfilment === 'insta' ? <Zap size={16} style={{ color: 'var(--orange)' }} /> : <Truck size={16} className="muted" />}
                  <div className="grow">
                    <div className="small bold">{g.vendor.name}</div>
                    <div className="xs muted">{g.fulfilment === 'insta' ? `TrimInsta 6-Hour from ${g.hubName}` : `Standard: dispatch within ${g.leadTimeDays * 24}h, courier assigned by TrimNova`} · {g.lines.length} item(s)</div>
                  </div>
                  <span className="mono small">{inr(g.total)}</span>
                </div>
              ))}
              {blocking > 0 && (
                <Banner tone="danger" lead="Some items can't be delivered as chosen to this address." actions={<Link to="/cart" className="btn btn-danger btn-sm">Review items</Link>}>
                  For example, TrimInsta isn't available outside hub zones. We won't switch the method for you.
                </Banner>
              )}
            </div>
          </Card>
          <div className="row-between"><button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" disabled={blocking > 0} onClick={() => setStep(3)}>Continue to payment</button></div></>)}

          {step === 3 && (<>
          <Card title="Payment" icon={Wallet}>
            <div className="stack-12">
              {([
                ['upi', 'UPI', Smartphone, true, ''],
                ['card', 'Credit / Debit card', CreditCard, true, ''],
                ['netbanking', 'Net banking', Landmark, true, ''],
                ['cod', 'Cash on Delivery', Building, codOk, `Available only for orders up to ${inr(COD_LIMIT, { decimals: 0 })} (rule TBD)`],
              ] as const).map(([id, label, Icon, enabled, why]) => (
                <label key={id} className={`fulfil-opt ${method === id ? 'on' : ''} ${enabled ? '' : 'disabled'}`}>
                  <input type="radio" name="pm" disabled={!enabled} checked={method === id} onChange={() => setMethod(id)} />
                  <div className="grow">
                    <div className="row bold small"><Icon size={15} /> {label}</div>
                    {!enabled && <div className="xs" style={{ color: 'var(--danger)' }}>{why}</div>}
                    {method === id && id === 'upi' && (
                      <div className="field" style={{ marginTop: 8 }}><label htmlFor="upi">UPI ID</label><input id="upi" className="input mono" value={upi} onChange={(e) => setUpi(e.target.value)} /></div>
                    )}
                    {method === id && id === 'card' && (
                      <div className="grid g-2" style={{ gap: 10, marginTop: 8 }}>
                        <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="cn">Card number</label><input id="cn" className="input mono" inputMode="numeric" maxLength={19} placeholder="4111 1111 1111 1111" value={card.no} onChange={(e) => setCard({ ...card, no: e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ') })} /></div>
                        <div className="field"><label htmlFor="ce">Expiry (MM/YY)</label><input id="ce" className="input mono" maxLength={5} placeholder="08/29" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></div>
                        <div className="field"><label htmlFor="cv">CVV</label><input id="cv" className="input mono" type="password" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} /></div>
                        <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="cnm">Name on card</label><input id="cnm" className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></div>
                      </div>
                    )}
                    {method === id && id === 'netbanking' && (
                      <div className="field" style={{ marginTop: 8 }}><label htmlFor="nb">Bank</label><select id="nb" className="select" value={bank} onChange={(e) => setBank(e.target.value)}>{Object.entries(BANKS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
                    )}
                    {method === id && id === 'cod' && <div className="xs muted" style={{ marginTop: 6 }}>Pay the courier at delivery. Vendors are paid only after the COD amount is remitted to TrimNova.</div>}
                  </div>
                </label>
              ))}
              <label className="check" style={{ marginTop: 6 }}>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>I understand that <b>orders can't be cancelled or edited after they are placed</b>. Damaged quantity can be claimed within the return window after delivery.</span>
              </label>
              <label className="check xs muted" style={{ border: '1px dashed var(--demo-border)', borderRadius: 'var(--radius)', padding: '6px 8px', background: 'var(--demo-bg)' }}>
                <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} /> Demo: simulate a declined payment
              </label>
            </div>
          </Card>
          <div className="row-between"><button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button><span className="xs muted">Review the summary, then pay.</span></div></>)}
        </div>

        <aside className="stack-16" style={{ position: 'sticky', top: 'calc(var(--topbar-h) + 12px)' }}>
          <Card title="Summary">
            {groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 10 }}>
                <div className="small bold">{g.vendor.name}</div>
                {g.lines.map((l) => <div key={l.item.key} className="sum-row xs"><span className="muted" style={{ maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{num(l.item.qty)} × {l.listing.product.live!.title}</span><span className="mono">{inr(l.amount)}</span></div>)}
              </div>
            ))}
            <div className="divider-h" />
            <div className="sum-row"><span>Items (pre-tax)</span><span className="mono">{inr(totals.subtotal)}</span></div>
            <div className="sum-row"><span>Shipping</span><span className="mono">{totals.shipping ? inr(totals.shipping) : 'Free'}</span></div>
            <div className="sum-row"><span>GST</span><span className="mono">{inr(totals.gst)}</span></div>
            <div className="sum-row total"><span>Total payable</span><span className="mono">{inr(totals.total)}</span></div>
            {failed && <div style={{ marginTop: 12 }}><Banner tone="danger" lead="Payment failed.">{failed}</Banner></div>}
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 14 }} disabled={!canPay} onClick={pay}>
              {busy ? 'Processing payment…' : method === 'cod' ? 'Place order (COD)' : `Pay ${inr(totals.total)}`}
            </button>
            {step < 3 ? <div className="xs muted" style={{ textAlign: 'center', marginTop: 6 }}>Complete the steps on the left to pay</div> : !ack && <div className="xs muted" style={{ textAlign: 'center', marginTop: 6 }}>Tick the confirmation above to continue</div>}
            <div className="row xs muted" style={{ marginTop: 10, justifyContent: 'center' }}><ShieldCheck size={12} /> One parent order · {groups.length} vendor sub-order(s) · one invoice per vendor after delivery</div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
