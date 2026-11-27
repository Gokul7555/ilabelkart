import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, CheckCircle2, RotateCcw, ShieldOff, SplitSquareHorizontal, XCircle } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, EmptyState, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { customerById } from '../../data/customer';
import { vendorById } from '../../data/vendors';
import { fmtDateTime, inr, num } from '../../lib/format';
import { addBusinessDays, assignCourier, useOrders } from '../../lib/orders';
import type { SubOrder } from '../../lib/orders';
import { useCases } from '../../lib/cases';
import { useSupport } from '../../lib/support';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type T = 'partial' | 'rejections' | 'refunds' | 'freeze';
type PartialDecision = { so: SubOrder; kind: 'approve' | 'full' | 'cancel' } | null;

export default function Escalations() {
  const { user } = useAuth();
  const { subOrders, patchSub, setStatus } = useOrders();
  const { cases, patch: patchCase } = useCases();
  const { flags } = useSupport();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('partial');
  const [dec, setDec] = useState<PartialDecision>(null);
  const [ack, setAck] = useState<SubOrder | null>(null);
  const me = `${user?.name} (${user?.id})`;

  const partial = subOrders.filter((s) => s.status === 'Partial Review');
  const rejections = subOrders.filter((s) => s.status === 'Rejected');
  const refunds = [
    ...subOrders.filter((s) => s.refund).map((s) => ({ key: s.id, kind: s.status === 'RTO' ? 'RTO' : s.status === 'Partial Review' ? 'Partial' : 'Vendor rejection', ref: s.refund!.ref, amount: s.refund!.amount, status: s.refund!.status, approvedBy: s.refund!.approvedBy, who: customerById(s.customerId)?.company, link: s.id, approve: () => patchSub(s.id, { refund: { ...s.refund!, approvedBy: me, approvedAt: new Date().toISOString() } }) })),
    ...cases.filter((c) => c.refund).map((c) => ({ key: c.id, kind: 'Damage claim', ref: c.refund!.ref, amount: c.refund!.amount, status: c.refund!.status, approvedBy: c.refund!.approvedBy, who: customerById(c.customerId)?.company, link: c.id, approve: () => patchCase(c.id, { refund: { ...c.refund!, approvedBy: me, approvedAt: new Date().toISOString() } }) })),
  ];
  const pendingRefunds = refunds.filter((r) => r.status !== 'Succeeded' && !r.approvedBy);
  const freeze = flags.filter((f) => f.status === 'Freeze recommended to Admin');
  const rejectCount = (vendorId: string) => subOrders.filter((s) => s.vendorId === vendorId && s.rejection && Date.now() - new Date(s.rejection.at).getTime() < 30 * 86400000).length;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1280 }}>
      <PageHeader icon={AlertOctagon} title="Escalations" subtitle="Decisions that need an Admin: partial acceptance, vendor rejections, refund approvals and freeze recommendations" />
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'partial', label: 'Partial acceptance', count: partial.length, icon: SplitSquareHorizontal },
        { id: 'rejections', label: 'Vendor rejections', count: rejections.filter((s) => !s.adminNote).length, icon: XCircle },
        { id: 'refunds', label: 'Refund approvals', count: pendingRefunds.length, icon: RotateCcw },
        { id: 'freeze', label: 'Freeze recommendations', count: freeze.length, icon: ShieldOff },
      ]} />

      {tab === 'partial' && (
        <>
          <Banner tone="warning" lead="Rule TBD with client.">Partial acceptance is never auto-approved. Decide with the buyer (via Support): accept the reduced quantity and refund the balance, insist on full fulfilment, or cancel the sub-order with a full refund.</Banner>
          {partial.length === 0 && <div className="card"><EmptyState title="No partial-acceptance requests" /></div>}
          {partial.map((s) => {
            const p = s.partial!;
            const short = s.lines.reduce((a, l) => a + (l.qty - (p.lines.find((x) => x.productId === l.productId)?.qty ?? l.qty)) * l.unitPrice * (1 + l.gstRate / 100), 0);
            return (
              <Card key={s.id} title={<span className="mono">{s.id}</span>} sub={`${vendorById(s.vendorId)?.name} → ${customerById(s.customerId)?.company} · requested ${fmtDateTime(p.at)}`} actions={<Pill tone="amber">Partial Review</Pill>}>
                <div className="stack-12">
                  <div className="small">Vendor's reason: “{p.reason}”</div>
                  <table className="tbl">
                    <thead><tr><th>Product</th><th className="right">Ordered</th><th className="right">Vendor can supply</th><th className="right">Short</th></tr></thead>
                    <tbody>{s.lines.map((l) => { const q = p.lines.find((x) => x.productId === l.productId)?.qty ?? l.qty; return (
                      <tr key={l.productId}><td className="small">{l.title}</td><td className="num">{num(l.qty)}</td><td className="num">{num(q)}</td><td className="num" style={{ color: 'var(--danger)' }}>{num(l.qty - q)}</td></tr>
                    ); })}</tbody>
                  </table>
                  <div className="row-between wrap">
                    <span className="xs muted">Refund for the short quantity if accepted: <b className="mono">{inr(short)}</b> (incl. GST)</span>
                    <div className="row">
                      <button className="btn btn-success btn-sm" onClick={() => setDec({ so: s, kind: 'approve' })}><CheckCircle2 size={13} /> Approve partial</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setDec({ so: s, kind: 'full' })}>Require full fulfilment</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setDec({ so: s, kind: 'cancel' })}>Cancel with full refund</button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}

      {tab === 'rejections' && (
        <Card pad={false}>
          {rejections.length === 0 ? <EmptyState title="No vendor rejections" /> : (
            <table className="tbl">
              <thead><tr><th>Sub-order</th><th>Vendor</th><th>Reason</th><th>Refund</th><th className="right">Rejections (30d)</th><th></th></tr></thead>
              <tbody>{rejections.map((s) => (
                <tr key={s.id}>
                  <td><div className="mono small bold">{s.id}</div><div className="t-sub">{customerById(s.customerId)?.company} · {fmtDateTime(s.rejection!.at)}</div></td>
                  <td className="small">{vendorById(s.vendorId)?.name}</td>
                  <td className="xs" style={{ maxWidth: 280 }}>“{s.rejection!.reason}”{s.adminNote && <div className="muted">Admin: {s.adminNote}</div>}</td>
                  <td>{s.refund ? <><span className="mono small">{inr(s.refund.amount)}</span> <StatusPill status={s.refund.status} /></> : '—'}</td>
                  <td className="num">{rejectCount(s.vendorId)}{rejectCount(s.vendorId) >= 3 && <div><Pill tone="red">Pattern</Pill></div>}</td>
                  <td className="right">{s.adminNote ? <Pill tone="green">Reviewed</Pill> : <button className="btn btn-secondary btn-xs" onClick={() => setAck(s)}>Review</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'refunds' && (
        <>
          <Banner tone="info" lead="Approval ≠ payment.">Approved refunds move to Finance for execution. Their status stays Pending until Finance confirms success. Pending, Failed and Unknown are never shown as Succeeded.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Refund</th><th>Source</th><th>Customer</th><th className="right">Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>{refunds.map((r) => (
                <tr key={r.key}>
                  <td className="mono small">{r.ref}</td>
                  <td className="small">{r.kind} · <span className="mono">{r.link}</span></td>
                  <td className="small">{r.who}</td>
                  <td className="num">{inr(r.amount)}</td>
                  <td><StatusPill status={r.status} />{r.approvedBy && <div className="xs muted">Approved by {r.approvedBy}</div>}</td>
                  <td className="right">{!r.approvedBy && r.status !== 'Succeeded' ? <button className="btn btn-success btn-xs" onClick={() => { r.approve(); log({ action: 'Refund approved for Finance', entity: `${r.ref} (${r.link})`, newValue: `${inr(r.amount)} · still Pending` }); toast('success', 'Sent to Finance', r.ref); }}>Approve</button> : <span className="xs muted">{r.status === 'Succeeded' ? 'Paid out' : 'With Finance'}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'freeze' && (
        <>
          <Banner tone="info" lead="Never auto-ban.">Freezes happen only here or on the Vendors page, after Support's review, with a reason recorded in the audit log.</Banner>
          {freeze.length === 0 && <div className="card"><EmptyState title="No recommendations from Support" /></div>}
          {freeze.map((f) => (
            <Card key={f.id} title={`${f.subjectName} (${f.kind})`} sub={`${f.id} · ${f.metric}`} actions={<Link to="/admin/vendors" className="btn btn-danger btn-sm">Review on Vendors page</Link>}>
              <div className="small">Support note: “{f.note}”</div>
            </Card>
          ))}
        </>
      )}

      <ConfirmWithReason open={!!dec} onClose={() => setDec(null)} danger={dec?.kind === 'cancel'}
        title={dec?.kind === 'approve' ? 'Approve partial acceptance?' : dec?.kind === 'full' ? 'Require full fulfilment?' : 'Cancel sub-order with full refund?'}
        confirmLabel="Confirm decision"
        description={dec?.kind === 'approve' ? 'Order lines are reduced to what the vendor can supply, and the short quantity is refunded (Pending until Finance executes).' : dec?.kind === 'full' ? 'The sub-order is accepted at the full quantity, and the vendor must dispatch everything within the lead time.' : 'The sub-order is cancelled and the buyer refunded in full (Pending until Finance executes).'}
        onConfirm={(r) => {
          if (!dec) return;
          const s = dec.so; const at = new Date().toISOString();
          const ship = { dispatchBy: addBusinessDays(at, s.leadTimeDays), courier: assignCourier(s.id), awb: assignCourier(s.id) === 'BlueDart' ? `BD${s.id.slice(-6)}IN` : `DLV${s.id.slice(-6)}4471` };
          if (dec.kind === 'approve') {
            const lines = s.lines.map((l) => { const q = s.partial!.lines.find((x) => x.productId === l.productId)?.qty ?? l.qty; return { ...l, qty: q, amount: Math.round(q * l.unitPrice * 100) / 100 }; });
            const subtotal = lines.reduce((a, l) => a + l.amount, 0);
            const gst = Math.round((lines.reduce((a, l) => a + (l.amount * l.gstRate) / 100, 0) + s.shipping * 0.18) * 100) / 100;
            const total = subtotal + s.shipping + gst;
            const short = Math.round((s.total - total) * 100) / 100;
            patchSub(s.id, { lines, subtotal, gst, total, ...ship, refund: { amount: short, status: 'Pending', ref: `RFD-2026-${String(Date.now()).slice(-5)}`, at }, adminNote: r });
            setStatus(s.id, 'Accepted', `Partial acceptance approved by Admin: ${r}`);
          } else if (dec.kind === 'full') {
            patchSub(s.id, { adminNote: r, ...ship }); setStatus(s.id, 'Accepted', `Admin requires full fulfilment: ${r}`);
          } else {
            patchSub(s.id, { refund: { amount: s.total, status: 'Pending', ref: `RFD-2026-${String(Date.now()).slice(-5)}`, at }, adminNote: r, rejection: { at, reason: `Cancelled by Admin: ${r}` } });
            setStatus(s.id, 'Rejected', `Cancelled by Admin after partial request: ${r}`);
          }
          log({ action: `Partial acceptance: ${dec.kind}`, entity: s.id, oldValue: 'Partial Review', newValue: dec.kind === 'cancel' ? 'Cancelled' : 'Accepted', reason: r });
          toast('success', 'Decision recorded', s.id);
        }} />
      <ConfirmWithReason open={!!ack} onClose={() => setAck(null)} title={`Review rejection ${ack?.id ?? ''}`} confirmLabel="Save review"
        description="Record your assessment (e.g. valid stock-out, or a pattern to watch). This doesn't change the order."
        onConfirm={(r) => { if (!ack) return; patchSub(ack.id, { adminNote: r }); log({ action: 'Vendor rejection reviewed', entity: ack.id, reason: r }); toast('success', 'Review saved'); }} />
    </div>
  );
}
