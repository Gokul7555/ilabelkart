import { useMemo, useState } from 'react';
import { AlertOctagon, CheckCircle2, Clock, Eye, Printer, ShoppingBag, SplitSquareHorizontal, Truck, XCircle } from 'lucide-react';
import { Banner, ConfirmWithReason, Drawer, EmptyState, ExportButtons, Modal, PageHeader, Pill, Tabs, Card } from '../../components/ui';
import { OrderTimeline, SubStatusPill } from '../../components/OrderBits';
import { OtpHandoverModal } from '../../components/OtpHandoverModal';
import { ProductImage } from '../../components/ProductImage';
import { customerById } from '../../data/customer';
import { fmtDate, fmtDateTime, inr, num } from '../../lib/format';
import { addBusinessDays, assignCourier, isOverdue, useOrders, vendorAmount } from '../../lib/orders';
import type { SubOrder, SubStatus } from '../../lib/orders';
import { factoryStock } from '../../lib/pricing';
import { useCatalog } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';

type T = 'new' | 'dispatch' | 'transit' | 'delivered' | 'exceptions';
const TAB_OF: Record<SubStatus, T> = {
  'Order Placed': 'new', Accepted: 'dispatch', Dispatched: 'transit', 'In Transit': 'transit', 'Out for Delivery': 'transit', Delivered: 'delivered',
  Rejected: 'exceptions', 'Partial Review': 'exceptions', 'Delivery Failed': 'exceptions', RTO: 'exceptions', Disputed: 'exceptions',
};
const HANDOVER_OTP = '482913';
const daysLate = (iso?: string) => (iso ? Math.max(1, Math.ceil((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);

export default function VendorOrders() {
  const { user } = useAuth();
  const { subOrders, accept, reject, requestPartial, dispatch } = useOrders();
  const { products } = useCatalog();
  const toast = useToast();
  const { log } = useAudit();
  const [tab, setTab] = useState<T>('new');
  const [view, setView] = useState<SubOrder | null>(null);
  const [acceptSo, setAcceptSo] = useState<SubOrder | null>(null);
  const [rejectSo, setRejectSo] = useState<SubOrder | null>(null);
  const [partialSo, setPartialSo] = useState<SubOrder | null>(null);
  const [dispatchSo, setDispatchSo] = useState<SubOrder | null>(null);

  // Vendor sees ONLY its own sub-orders. Buyer contact details are never shown (Support is the single channel).
  const mine = useMemo(() => subOrders.filter((s) => s.vendorId === user?.vendorId).sort((a, b) => b.placedAt.localeCompare(a.placedAt)), [subOrders, user]);
  const list = mine.filter((s) => TAB_OF[s.status] === tab);
  const count = (x: T) => mine.filter((s) => TAB_OF[s.status] === x).length;
  const lateDispatch = mine.filter((s) => s.status === 'Accepted' && s.fulfilment !== 'insta' && isOverdue(s.dispatchBy));
  const lateAccept = mine.filter((s) => s.status === 'Order Placed' && s.fulfilment !== 'insta' && isOverdue(s.acceptBy));
  const me = `${user?.name} (${user?.id})`;

  const stockShort = (s: SubOrder) => s.lines.filter((l) => { const p = products.find((x) => x.id === l.productId); return p && factoryStock(p) < l.qty; });

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1280 }}>
      <PageHeader icon={ShoppingBag} title="Orders" subtitle="Your vendor sub-orders. Accept within 1 business day and dispatch by the promised lead time, with OTP handover to the courier." actions={<ExportButtons name="vendor-orders" />} />

      {lateDispatch.length > 0 && (
        <Banner tone="danger" lead={`Overdue dispatch: ${lateDispatch.length} sub-order(s).`} actions={<button className="btn btn-danger btn-sm" onClick={() => setTab('dispatch')}>Dispatch now</button>}>
          {lateDispatch.map((s) => `${s.id} (${daysLate(s.dispatchBy)}d late)`).join(', ')}. Late dispatch is reported to TrimNova Admin and affects your ranking.
        </Banner>
      )}
      {lateAccept.length > 0 && (
        <Banner tone="warning" lead={`Acceptance overdue: ${lateAccept.length} sub-order(s)`} actions={<button className="btn btn-warning btn-sm" onClick={() => setTab('new')}>Review</button>}>
          have waited more than 1 business day: {lateAccept.map((s) => s.id).join(', ')}.
        </Banner>
      )}

      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'new', label: 'New', count: count('new') }, { id: 'dispatch', label: 'To dispatch', count: count('dispatch') },
        { id: 'transit', label: 'In transit', count: count('transit') }, { id: 'delivered', label: 'Delivered', count: count('delivered') },
        { id: 'exceptions', label: 'Exceptions', count: count('exceptions') },
      ]} />

      <Card pad={false}>
        {list.length === 0 ? <EmptyState icon={ShoppingBag} title="Nothing here" /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Sub-order</th><th>Buyer</th><th>Items</th><th className="right">Your amount</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((s) => {
                  const buyer = customerById(s.customerId);
                  const deadline = s.status === 'Order Placed' ? s.acceptBy : s.status === 'Accepted' ? s.dispatchBy : undefined;
                  const late = isOverdue(deadline);
                  return (
                    <tr key={s.id}>
                      <td><div className="mono bold">{s.id}</div><div className="t-sub">{fmtDateTime(s.placedAt)}</div></td>
                      <td><div className="small bold">{buyer?.company}</div><div className="t-sub">Ship to {buyer?.city}</div></td>
                      <td style={{ maxWidth: 280 }}>
                        <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.lines[0].title}</div>
                        <div className="t-sub mono">{num(s.lines[0].qty)} {s.lines[0].unit}{s.lines[0].shade && ` · ${s.lines[0].shade}`}{s.lines.length > 1 && ` +${s.lines.length - 1} more`}</div>
                      </td>
                      <td className="num">{inr(vendorAmount(s))}</td>
                      <td className="nowrap">
                        {deadline ? (
                          <>
                            <div className="xs muted">{s.status === 'Order Placed' ? 'Accept by' : 'Dispatch by'}</div>
                            <div className="small" style={{ color: late ? 'var(--danger)' : undefined }}>{fmtDate(deadline)}</div>
                            {late && <Pill tone="red" icon={Clock}>{daysLate(deadline)}d late</Pill>}
                          </>
                        ) : <span className="xs muted">—</span>}
                      </td>
                      <td><SubStatusPill status={s.status} /></td>
                      <td className="right nowrap">
                        {s.fulfilment === 'insta' && ['Order Placed', 'Accepted'].includes(s.status) && <><Pill tone="orange">Fulfilled by TrimNova hub</Pill>{' '}</>}
                        {s.status === 'Order Placed' && s.fulfilment !== 'insta' && <>
                          <button className="btn btn-success btn-xs" onClick={() => setAcceptSo(s)}><CheckCircle2 size={12} /> Accept</button>{' '}
                          <button className="btn btn-secondary btn-xs" onClick={() => setPartialSo(s)}><SplitSquareHorizontal size={12} /> Partial</button>{' '}
                          <button className="btn btn-outline-danger btn-xs" onClick={() => setRejectSo(s)}><XCircle size={12} /> Reject</button>{' '}
                        </>}
                        {s.status === 'Accepted' && s.fulfilment !== 'insta' && <><button className={`btn ${late ? 'btn-danger' : 'btn-primary'} btn-xs`} onClick={() => setDispatchSo(s)}><Truck size={12} /> Dispatch</button>{' '}</>}
                        <button className="btn btn-ghost btn-xs" onClick={() => setView(s)}><Eye size={12} /> View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Accept */}
      <Modal open={!!acceptSo} onClose={() => setAcceptSo(null)} title={`Accept ${acceptSo?.id ?? ''}`} icon={CheckCircle2}
        footer={<><button className="btn btn-secondary" onClick={() => setAcceptSo(null)}>Cancel</button><button className="btn btn-success" onClick={() => {
          accept(acceptSo!.id, me); log({ action: 'Sub-order accepted', entity: acceptSo!.id, oldValue: 'Order Placed', newValue: 'Accepted' });
          toast('success', 'Accepted', `${acceptSo!.id}: courier ${assignCourier(acceptSo!.id)} assigned.`); setAcceptSo(null); setTab('dispatch');
        }}>Accept full order</button></>}>
        {acceptSo && (
          <div className="stack-12 small">
            <p>You're committing to dispatch all items by <b>{fmtDate(addBusinessDays(new Date().toISOString(), acceptSo.leadTimeDays))}</b> ({acceptSo.leadTimeDays} business day lead time).</p>
            <dl className="kv"><dt>Courier</dt><dd>{assignCourier(acceptSo.id)} <span className="muted">(assigned by system)</span></dd><dt>Your amount</dt><dd className="mono">{inr(vendorAmount(acceptSo))}</dd></dl>
            {stockShort(acceptSo).length > 0 && <Banner tone="warning" lead="Stock is lower than ordered:">{stockShort(acceptSo).map((l) => l.sku).join(', ')}. Accept only if you can produce in time; otherwise request partial acceptance.</Banner>}
          </div>
        )}
      </Modal>

      {/* Reject */}
      <ConfirmWithReason open={!!rejectSo} onClose={() => setRejectSo(null)} danger confirmLabel="Reject sub-order" title={`Reject ${rejectSo?.id ?? ''}?`}
        description="The buyer is refunded in full for this sub-order. Frequent rejections affect your ranking and are reviewed by Admin."
        onConfirm={(r) => { reject(rejectSo!.id, r); log({ action: 'Sub-order rejected', entity: rejectSo!.id, oldValue: 'Order Placed', newValue: 'Rejected', reason: r }); toast('warning', 'Sub-order rejected', 'Buyer refund initiated (Pending).'); }} />

      <PartialModal so={partialSo} onClose={() => setPartialSo(null)} onSubmit={(lines, reason) => {
        requestPartial(partialSo!.id, lines, reason);
        log({ action: 'Partial acceptance requested', entity: partialSo!.id, newValue: lines.map((l) => `${l.productId}: ${l.qty}`).join(', '), reason });
        toast('info', 'Sent to Admin/Support for decision', 'Not auto-approved. You will be notified.'); setTab('exceptions');
      }} />

      {dispatchSo && <DispatchModal so={dispatchSo} onClose={() => setDispatchSo(null)} onDone={(h) => {
        dispatch(dispatchSo.id, { ...h, by: me });
        log({ action: 'Dispatched with OTP handover', entity: dispatchSo.id, oldValue: 'Accepted', newValue: `Dispatched · ${dispatchSo.courier} ${dispatchSo.awb}` });
        toast('success', 'Dispatched', `OTP handover to ${dispatchSo.courier} verified.`); setTab('transit');
      }} />}

      <Drawer open={!!view} onClose={() => setView(null)} title={<span className="mono">{view?.id}</span>}>
        {view && (
          <div className="stack-16">
            <div className="row wrap"><SubStatusPill status={view.status} />{view.awb && <span className="xs mono muted">{view.courier} · {view.awb}</span>}</div>
            <OrderTimeline so={view} />
            <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>Buyer</dt><dd>{customerById(view.customerId)?.company}</dd>
              <dt>Ship to</dt><dd>{customerById(view.customerId)?.city}</dd>
              <dt>Fulfilment</dt><dd>{view.fulfilment === 'insta' ? `TrimInsta · ${view.hubName}` : 'Standard'}</dd>
              {view.invoiceNo && <><dt>Invoice</dt><dd className="mono">{view.invoiceNo}</dd></>}
              {view.handover && <><dt>Handover</dt><dd className="small">{fmtDateTime(view.handover.at)} · OTP verified · {view.handover.packages} pkg</dd></>}
            </dl>
            {view.partial && <Banner tone="warning" lead="Partial acceptance under review.">“{view.partial.reason}”</Banner>}
            {view.rejection && <Banner tone="danger" lead="Rejected:">“{view.rejection.reason}”</Banner>}
            {view.ndr && <Banner tone="danger" lead={`${view.ndr.id}: ${view.ndr.attempts} failed attempt(s).`}>{view.ndr.reason}. Support is handling it. You're paid only after delivery is confirmed.</Banner>}
            <div>
              {view.lines.map((l) => (
                <div key={l.productId} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                  <ProductImage hue={l.hue} label={l.title} size={34} />
                  <div className="grow"><div className="small bold">{l.title}</div><div className="xs muted"><span className="mono">{l.sku}</span> · {num(l.qty)} {l.unit}{l.shade && ` · ${l.shade}`}</div></div>
                  <div className="mono small" style={{ textAlign: 'right' }}>{inr(l.basePrice * l.qty)}<div className="xs muted">{inr(l.basePrice)} /{l.unit}</div></div>
                </div>
              ))}
              <div className="row-between" style={{ marginTop: 8 }}><span className="small muted">Your amount (base, pre-tax)</span><b className="mono">{inr(vendorAmount(view))}</b></div>
            </div>
            <div className="caps muted">Events</div>
            <div className="timeline">
              {[...view.events].reverse().map((e, i) => (
                <div key={i} className={`tl-item ${i === 0 ? 'current' : 'done'}`}><span className="tl-dot" /><div className="small bold">{e.status}</div><div className="xs muted">{fmtDateTime(e.at)}{e.place && ` · ${e.place}`}</div>{e.note && <div className="xs">{e.note}</div>}</div>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function PartialModal({ so, onClose, onSubmit }: { so: SubOrder | null; onClose: () => void; onSubmit: (lines: { productId: string; qty: number }[], reason: string) => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  if (!so) return null;
  const lines = so.lines.map((l) => ({ productId: l.productId, qty: qty[l.productId] ?? l.qty }));
  const changed = lines.some((l, i) => l.qty < so.lines[i].qty);
  const valid = changed && lines.every((l, i) => l.qty >= 0 && l.qty <= so.lines[i].qty) && reason.trim().length >= 10;
  return (
    <Modal open onClose={onClose} title={`Partial acceptance · ${so.id}`} icon={SplitSquareHorizontal}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!valid} onClick={() => { onSubmit(lines, reason.trim()); setQty({}); setReason(''); onClose(); }}>Send for decision</button></>}>
      <div className="stack-12">
        <Banner tone="warning" lead="Not auto-approved.">Partial acceptance goes to TrimNova Admin/Support, who decide with the buyer. The rule for this is still being finalised with the client (TBD).</Banner>
        {so.lines.map((l) => (
          <div key={l.productId} className="row">
            <span className="grow small">{l.title} <span className="muted mono xs">ordered {num(l.qty)}</span></span>
            <input type="number" min={0} max={l.qty} className="input mono" style={{ width: 130 }} value={qty[l.productId] ?? l.qty} onChange={(e) => setQty((x) => ({ ...x, [l.productId]: Math.max(0, +e.target.value) }))} aria-label={`Quantity you can supply for ${l.title}`} />
            <span className="xs muted">{l.unit}</span>
          </div>
        ))}
        <div className="field"><label htmlFor="pr">Reason <span style={{ color: 'var(--danger)' }}>*</span></label><textarea id="pr" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Only 6,000 units of Navy available; balance in 10 days" /></div>
      </div>
    </Modal>
  );
}

function DispatchModal({ so, onClose, onDone }: { so: SubOrder; onClose: () => void; onDone: (h: { packages: number; weightKg: number; at: string }) => void }) {
  const toast = useToast();
  const [packages, setPackages] = useState(1);
  const [weight, setWeight] = useState(5);
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [at, setAt] = useState(local);
  return (
    <OtpHandoverModal open onClose={onClose} title={`Dispatch ${so.id}`} from="You (vendor)" to={`${so.courier} rider`} expected={HANDOVER_OTP}
      canSubmit={packages > 0 && weight > 0 && !!at} confirmLabel="Verify OTP & dispatch"
      onVerified={() => onDone({ packages, weightKg: weight, at: new Date(at).toISOString() })}>
      {isOverdue(so.dispatchBy) && <Banner tone="danger" icon={AlertOctagon} lead="Overdue.">Dispatch promised by {fmtDate(so.dispatchBy!)}.</Banner>}
      <div className="grid g-2" style={{ gap: 12 }}>
        <div className="field"><label>Courier</label><input className="input" value={so.courier} disabled /><span className="hint">Assigned by TrimNova. Vendors can't change it.</span></div>
        <div className="field"><label>AWB</label><input className="input mono" value={so.awb} disabled /><span className="hint">Auto-filled from the assigned courier</span></div>
        <div className="field"><label htmlFor="pk">Packages</label><input id="pk" type="number" min={1} className="input mono" value={packages} onChange={(e) => setPackages(+e.target.value)} /></div>
        <div className="field"><label htmlFor="wt">Total weight (kg)</label><input id="wt" type="number" min={0.1} step="0.1" className="input mono" value={weight} onChange={(e) => setWeight(+e.target.value)} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="dt">Dispatch time</label><input id="dt" type="datetime-local" className="input" value={at} onChange={(e) => setAt(e.target.value)} /></div>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={() => toast('success', 'Label & manifest ready', `${so.awb}.pdf`)}><Printer size={13} /> Print shipping label</button>
    </OtpHandoverModal>
  );
}
