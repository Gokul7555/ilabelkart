import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, CreditCard, Lock, MessageSquare, Package, Send, Truck, User, XCircle } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, Pill, StatusPill } from '../../components/ui';
import { SubStatusPill } from '../../components/OrderBits';
import { CUSTOMER, customerById } from '../../data/customer';
import { vendorById } from '../../data/vendors';
import { fmtDateTime, inr, num } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { lineValue, useCases } from '../../lib/cases';
import { isOpenTicket, slaInfo, useSupport } from '../../lib/support';
import type { Msg } from '../../lib/support';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';
import { DisputeActions, NdrActions } from './actions';
import { EvidenceGallery } from './Disputes';
import { AuditTrailButton } from '../../components/AuditTrail';

const TEMPLATES: Record<string, string> = {
  Cancellation: 'TrimNova orders can’t be cancelled or edited once placed, because each vendor starts production and courier booking straight away. If goods arrive damaged, you can claim within the return window. We’ve asked the vendor to confirm the dispatch date and will update you within 4 hours.',
  Return: 'Only damaged quantity is eligible for return on TrimNova. Excess or unused stock can’t be returned. If any units are damaged, raise a damage claim from the sub-order within the return window and attach photos.',
};

export default function CaseDetail() {
  const { id } = useParams();
  const { tickets, addMessage, patchTicket } = useSupport();
  const { orders, subOrders } = useOrders();
  const { cases } = useCases();
  const { user } = useAuth();
  const { log } = useAudit();
  const toast = useToast();
  const t = tickets.find((x) => x.id === id);
  const [to, setTo] = useState<string>('customer');
  const [text, setText] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  if (!t) return <Navigate to="/support/tickets" replace />;

  const order = orders.find((o) => o.id === t.orderId);
  const sos = subOrders.filter((s) => t.subOrderIds.includes(s.id));
  const c = t.caseId ? cases.find((x) => x.id === t.caseId) : undefined;
  const ndrSo = t.ndrSoId ? subOrders.find((s) => s.id === t.ndrSoId) : undefined;
  const cust = customerById(t.customerId);
  const open = isOpenTicket(t);
  const sla = slaInfo(t.slaDue);
  const me = `${user?.name} (${user?.id})`;

  const send = () => {
    const internal = to === 'internal';
    addMessage(t.id, { by: me, role: 'support', text: text.trim(), internal, to: internal ? undefined : to });
    if (!internal) patchTicket(t.id, { status: to === 'customer' ? 'Awaiting customer' : 'Awaiting vendor' });
    toast('success', internal ? 'Internal note added' : `Message sent to ${to === 'customer' ? 'customer' : vendorById(to)?.name}`);
    setText('');
  };

  const label = (m: Msg) => m.internal ? 'Internal note' : m.role === 'support' ? `To ${m.to === 'customer' ? 'customer' : vendorById(m.to ?? '')?.name ?? 'party'}` : m.role === 'vendor' ? 'Vendor (Support-only)' : m.role;

  // Eligibility: claim inside window + damaged ≤ remaining + delivery verified + evidence present.
  const so = c ? subOrders.find((s) => s.id === c.subOrderId) : undefined;
  const otherClaimed = (pid: string) => cases.filter((x) => x.subOrderId === c?.subOrderId && x.id !== c?.id && x.status !== 'Rejected').reduce((s, x) => s + (x.lines.find((l) => l.productId === pid)?.damagedQty ?? 0), 0);
  const checks = c && so ? [
    { ok: !!so.returnWindowEnds && c.createdAt <= so.returnWindowEnds, label: 'Raised inside the return window', detail: so.returnWindowEnds ? `Window closed ${fmtDateTime(so.returnWindowEnds)}; claim ${fmtDateTime(c.createdAt)}` : 'No window' },
    { ok: c.lines.every((l) => l.damagedQty <= l.deliveredQty - otherClaimed(l.productId)), label: 'Damaged quantity ≤ remaining quantity', detail: c.lines.map((l) => `${num(l.damagedQty)} of ${num(l.deliveredQty - otherClaimed(l.productId))} ${l.unit}`).join(', ') },
    { ok: !!so.delivery?.otpVerified, label: 'Delivery verified with OTP', detail: so.delivery ? `${fmtDateTime(so.delivery.at)} · ${so.delivery.receivedBy}` : 'Not delivered' },
    { ok: c.evidence.length > 0, label: 'Photo / video evidence', detail: `${c.evidence.length} file(s)` },
  ] : [];

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <div className="row wrap" style={{ gap: 10 }}>
        <h1 className="mono" style={{ fontSize: 21 }}>{t.id}</h1>
        <Pill tone="indigo">{t.type}</Pill><StatusPill status={t.priority} />
        <Pill tone={open ? 'blue' : 'grey'}>{t.status}</Pill>
        {open && <Pill tone={sla.past || sla.near ? 'red' : 'grey'}>SLA {sla.label}</Pill>}
        <span className="grow" />
        <AuditTrailButton match={[t.id, t.caseId ?? '', t.ndrSoId ?? '', ...t.subOrderIds]} />
        {open && <button className="btn btn-secondary btn-sm" onClick={() => setCloseOpen(true)}><Lock size={13} /> Close with notes</button>}
      </div>
      <div className="small muted">{t.subject} · opened {fmtDateTime(t.createdAt)}</div>
      {!open && t.closeNote && <Banner tone="success" lead="Closed:">{t.closeNote}</Banner>}

      <div className="checkout-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
        <div className="stack-16">
          {c && (
            <Card title={<>Dispute <span className="mono">{c.id}</span></>} sub={`${c.reason} · status: ${c.status}`}>
              <div className="stack-16">
                <div>
                  <div className="caps muted" style={{ marginBottom: 6 }}>Eligibility check</div>
                  <div className="grid g-2" style={{ gap: 8 }}>
                    {checks.map((k) => (
                      <div key={k.label} className="row small" style={{ alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--radius)', background: k.ok ? 'var(--success-50)' : 'var(--danger-50)' }}>
                        {k.ok ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <XCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                        <div><div className="bold">{k.label}</div><div className="xs">{k.detail}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="caps muted" style={{ marginBottom: 6 }}>Remedy per unit (requested)</div>
                  <table className="tbl">
                    <thead><tr><th>Product</th><th className="right">Damaged</th><th className="right">Refund</th><th className="right">Replace</th><th className="right">Refund value</th></tr></thead>
                    <tbody>{c.lines.map((l) => <tr key={l.productId}><td className="small">{l.title}</td><td className="num">{num(l.damagedQty)}</td><td className="num">{num(l.refundQty)}</td><td className="num">{num(l.replaceQty)}</td><td className="num">{inr(lineValue(l, l.refundQty))}</td></tr>)}</tbody>
                  </table>
                </div>
                <div><div className="caps muted" style={{ marginBottom: 6 }}>Evidence</div><EvidenceGallery files={c.evidence} /></div>
                <DisputeActions c={c} />
                {c.refund && (
                  <Banner tone={c.refund.status === 'Succeeded' ? 'success' : 'info'} lead="Refund request sent to Finance.">
                    <span className="mono">{c.refund.ref}</span> · {inr(c.refund.amount)} · status <StatusPill status={c.refund.status} /> {c.refund.status !== 'Succeeded' && '(not yet paid out)'}
                  </Banner>
                )}
                {c.replacementOrderId && <Banner tone="success" lead="Replacement order:"><span className="mono">{c.replacementOrderId}</span> created at no charge, linked to {c.id}.</Banner>}
              </div>
            </Card>
          )}

          {ndrSo && (
            <Card title={<>Delivery exception <span className="mono">{ndrSo.ndr?.id}</span></>} sub={`${ndrSo.ndr?.attempts} failed attempt(s) · ${ndrSo.ndr?.reason}`}>
              <div className="stack-12">
                <Banner tone="danger">Act within 24 hours. The vendor isn't paid until delivery is confirmed.</Banner>
                <NdrActions so={ndrSo} />
              </div>
            </Card>
          )}

          {(t.type === 'Cancellation' || t.type === 'Return') && (
            <Banner tone="warning" lead={t.type === 'Cancellation' ? 'Policy: orders can’t be cancelled or edited after placing.' : 'Policy: only damaged quantity is eligible.'}
              actions={<button className="btn btn-secondary btn-sm" onClick={() => { setTo('customer'); setText(TEMPLATES[t.type]); }}>Use reply template</button>}>
              {t.type === 'Cancellation' ? 'Explain the policy, chase the vendor for dispatch, and escalate late dispatch to Admin if needed.' : 'Non-damaged returns are not supported.'}
            </Banner>
          )}

          <Card title="Conversation" icon={MessageSquare} sub="Vendors never see buyer messages, and each vendor sees only its own thread">
            <div className="stack-12">
              {t.messages.length === 0 && <div className="small muted">No messages yet.</div>}
              {t.messages.map((m, i) => (
                <div key={i} className={`msg ${m.internal ? 'internal' : m.role}`}>
                  <div className="row xs" style={{ gap: 6 }}>
                    <b>{m.by}</b><span className="muted">· {label(m)}</span><span className="grow" /><span className="muted">{fmtDateTime(m.at)}</span>
                  </div>
                  <div className="small" style={{ marginTop: 3 }}>{m.text}</div>
                </div>
              ))}
              {open && (
                <div className="stack-12" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="row">
                    <span className="small muted">To</span>
                    <select className="select" style={{ height: 32, width: 260 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Recipient">
                      <option value="customer">Customer: {cust?.company}</option>
                      {t.vendorIds.map((v) => <option key={v} value={v}>Vendor: {vendorById(v)?.name}</option>)}
                      <option value="internal">Internal note (Support only)</option>
                    </select>
                  </div>
                  <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder={to === 'internal' ? 'Visible to Support only' : 'Write a message…'} />
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" disabled={text.trim().length < 2} onClick={send}><Send size={13} /> {to === 'internal' ? 'Add note' : 'Send'}</button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="stack-16">
          <Card title="Customer" icon={User}>
            <dl className="kv" style={{ gridTemplateColumns: '80px 1fr' }}>
              <dt>Company</dt><dd>{cust?.company}</dd>
              <dt>Buyer</dt><dd>{cust?.buyer}</dd>
              <dt>Phone</dt><dd className="mono small">{order?.address.phone ?? CUSTOMER.phone}</dd>
              <dt>GSTIN</dt><dd className="mono small">{cust?.gstin}</dd>
            </dl>
          </Card>
          {order && (
            <Card title="Order & payment" icon={CreditCard}>
              <dl className="kv" style={{ gridTemplateColumns: '80px 1fr' }}>
                <dt>Order</dt><dd className="mono">{order.id}</dd>
                <dt>Placed</dt><dd className="small">{fmtDateTime(order.placedAt)}</dd>
                <dt>Payment</dt><dd className="small">{order.payment.method.toUpperCase()} · {order.payment.status}{order.payment.txn && <div className="mono xs muted">{order.payment.txn}</div>}</dd>
                <dt>Total</dt><dd className="mono">{inr(order.total)}</dd>
                <dt>Ship to</dt><dd className="small">{order.address.line}, {order.address.city} {order.address.pin}</dd>
              </dl>
            </Card>
          )}
          <Card title="Sub-orders & shipment" icon={Package}>
            <div className="stack-12">
              {sos.map((s) => (
                <div key={s.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div className="row-between"><span className="mono small bold">{s.id}</span><SubStatusPill status={s.status} /></div>
                  <div className="xs muted">{vendorById(s.vendorId)?.name} · {inr(s.total)}</div>
                  {s.awb && <div className="xs"><Truck size={11} style={{ verticalAlign: -1 }} /> {s.courier} · <span className="mono">{s.awb}</span></div>}
                  {s.delivery && <div className="xs muted">Delivered {fmtDateTime(s.delivery.at)} · OTP verified</div>}
                  {s.refund && <div className="xs">Refund {inr(s.refund.amount)} · {s.refund.status}</div>}
                </div>
              ))}
            </div>
          </Card>
          <Card title="Vendor contact" icon={Building2} sub="Support relays information; vendors don't contact buyers">
            <div className="stack-12">
              {t.vendorIds.map((v) => { const vd = vendorById(v); return (
                <div key={v} className="small">
                  <b>{vd?.name}</b> <span className="mono xs muted">{v}</span>
                  <div className="xs muted">{vd?.city} · Vendor desk +91 22 4{v.slice(-4)} 0000 · orders@{vd?.name.split(' ')[0].toLowerCase()}.in</div>
                </div>
              ); })}
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmWithReason open={closeOpen} onClose={() => setCloseOpen(false)} title={`Close ${t.id}`} confirmLabel="Close ticket"
        description={c && c.status !== 'Resolved' && c.status !== 'Rejected' ? <Banner tone="warning">The linked dispute {c.id} is still open. Decide it first, or close only if it's handled elsewhere.</Banner> : 'The closing note is visible to Support and Admin and stored in the audit log.'}
        onConfirm={(r) => { patchTicket(t.id, { status: 'Closed', closeNote: r }); addMessage(t.id, { by: me, role: 'support', text: `Ticket closed: ${r}`, internal: true }); log({ action: 'Ticket closed', entity: t.id, oldValue: t.status, newValue: 'Closed', reason: r }); toast('success', `${t.id} closed`); }} />
    </div>
  );
}
