import { useState } from 'react';
import { CheckCircle2, FileQuestion, MapPin, Repeat, SplitSquareHorizontal, Undo2, XCircle } from 'lucide-react';
import { Banner, ConfirmWithReason, Modal } from '../../components/ui';
import { inr, num } from '../../lib/format';
import { lineValue, useCases } from '../../lib/cases';
import type { Case } from '../../lib/cases';
import { useOrders } from '../../lib/orders';
import type { SubOrder } from '../../lib/orders';
import { useSupport } from '../../lib/support';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

/** Support's decision on a dispute is final. Refunds go to Finance as Pending; replacements are new linked orders. */
export function DisputeActions({ c, compact }: { c: Case; compact?: boolean }) {
  const { patch, addEvent } = useCases();
  const { subOrders, setStatus, placeReplacement } = useOrders();
  const { tickets, patchTicket, addMessage } = useSupport();
  const { user } = useAuth();
  const { log } = useAudit();
  const toast = useToast();
  const [mode, setMode] = useState<null | 'refund' | 'replace' | 'reject' | 'evidence' | 'split'>(null);
  const me = `${user?.name} (${user?.id})`;
  const so = subOrders.find((s) => s.id === c.subOrderId);
  const ticket = tickets.find((t) => t.caseId === c.id);
  const closed = c.status === 'Resolved' || c.status === 'Rejected';

  const resolve = (split: { productId: string; refund: number; replace: number }[], decision: string, note: string) => {
    const at = new Date().toISOString();
    const lines = c.lines.map((l) => { const s = split.find((x) => x.productId === l.productId)!; return { ...l, refundQty: s.refund, replaceQty: s.replace }; });
    const refundAmt = Math.round(lines.reduce((s, l) => s + lineValue(l, l.refundQty), 0) * 100) / 100;
    const replaceLines = lines.filter((l) => l.replaceQty > 0).map((l) => ({ productId: l.productId, qty: l.replaceQty }));
    let replacementOrderId: string | undefined;
    if (replaceLines.length && so) replacementOrderId = placeReplacement(c.id, so, replaceLines).id;
    patch(c.id, {
      lines, status: 'Resolved', resolution: { decision, note, at, by: me },
      refund: refundAmt > 0 ? { amount: refundAmt, status: 'Pending', ref: `RFD-2026-${String(Date.now()).slice(-5)}` } : undefined,
      replacementOrderId,
    });
    addEvent(c.id, me, `${decision}. ${refundAmt > 0 ? `Refund ${inr(refundAmt)} sent to Finance (status: Pending). ` : ''}${replacementOrderId ? `Replacement order ${replacementOrderId} created.` : ''}`);
    if (so) setStatus(so.id, 'Delivered', `Dispute ${c.id} resolved: ${decision}`);
    if (ticket) { patchTicket(ticket.id, { status: 'Resolved' }); addMessage(ticket.id, { by: me, role: 'support', text: `Decision: ${decision}. ${note}`, to: 'customer' }); }
    log({ action: 'Dispute decided', entity: c.id, oldValue: c.status, newValue: decision, reason: note });
    toast('success', `${c.id} resolved`, decision);
  };

  const all = (kind: 'refund' | 'replace') => c.lines.map((l) => ({ productId: l.productId, refund: kind === 'refund' ? l.damagedQty : 0, replace: kind === 'replace' ? l.damagedQty : 0 }));
  const units = c.lines.reduce((s, l) => s + l.damagedQty, 0);

  if (closed) return <div className="xs muted">Decision recorded. Cases are final once resolved.</div>;

  return (
    <>
      <div className="row wrap" style={{ gap: 6 }}>
        <button className="btn btn-success btn-sm" onClick={() => setMode('refund')}><CheckCircle2 size={13} /> Approve refund</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setMode('replace')}><Repeat size={13} /> Replacement</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setMode('split')}><SplitSquareHorizontal size={13} /> Split by unit</button>
        <button className="btn btn-outline-danger btn-sm" onClick={() => setMode('reject')}><XCircle size={13} /> Reject</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setMode('evidence')}><FileQuestion size={13} /> {compact ? 'More evidence' : 'Request more evidence'}</button>
      </div>

      <ConfirmWithReason open={mode === 'refund'} onClose={() => setMode(null)} title={`Approve refund for all ${num(units)} damaged unit(s)?`} confirmLabel="Approve refund"
        description={<>Refund of <b className="mono">{inr(c.lines.reduce((s, l) => s + lineValue(l, l.damagedQty), 0))}</b> (incl. GST) goes to Finance with status <b>Pending</b>. Support's decision is final.</>}
        onConfirm={(r) => resolve(all('refund'), `Refund ${num(units)} unit(s)`, r)} />
      <ConfirmWithReason open={mode === 'replace'} onClose={() => setMode(null)} title={`Replace all ${num(units)} damaged unit(s)?`} confirmLabel="Create replacement order"
        description="A new linked order is created at no charge for the same vendor. It goes through acceptance, dispatch and OTP handover like any order."
        onConfirm={(r) => resolve(all('replace'), `Replace ${num(units)} unit(s)`, r)} />
      <ConfirmWithReason open={mode === 'reject'} onClose={() => setMode(null)} danger title={`Reject ${c.id}?`} confirmLabel="Reject claim"
        description="The buyer is told the reason. The sub-order returns to Delivered, and the vendor's payout is no longer held for this dispute."
        onConfirm={(r) => {
          const at = new Date().toISOString();
          patch(c.id, { status: 'Rejected', resolution: { decision: 'Claim rejected', note: r, at, by: me } });
          addEvent(c.id, me, `Claim rejected: ${r}`);
          if (so) setStatus(so.id, 'Delivered', `Dispute ${c.id} rejected`);
          if (ticket) { patchTicket(ticket.id, { status: 'Resolved' }); addMessage(ticket.id, { by: me, role: 'support', text: `Your claim was not approved: ${r}`, to: 'customer' }); }
          log({ action: 'Dispute rejected', entity: c.id, oldValue: c.status, newValue: 'Rejected', reason: r });
          toast('warning', `${c.id} rejected`);
        }} />
      <ConfirmWithReason open={mode === 'evidence'} onClose={() => setMode(null)} title="Request more evidence" confirmLabel="Send to customer"
        description="Your message is shown to the buyer on their case. The case stays open."
        onConfirm={(r) => {
          patch(c.id, { status: 'More evidence requested' }); addEvent(c.id, me, r);
          if (ticket) { patchTicket(ticket.id, { status: 'Awaiting customer' }); addMessage(ticket.id, { by: me, role: 'support', text: r, to: 'customer' }); }
          log({ action: 'Evidence requested', entity: c.id, reason: r });
          toast('info', 'Request sent to customer');
        }} />
      {mode === 'split' && <SplitModal c={c} onClose={() => setMode(null)} onSubmit={(s, note) => {
        const rf = s.reduce((a, x) => a + x.refund, 0); const rp = s.reduce((a, x) => a + x.replace, 0);
        resolve(s, `Split: refund ${num(rf)}, replace ${num(rp)}`, note);
      }} />}
    </>
  );
}

function SplitModal({ c, onClose, onSubmit }: { c: Case; onClose: () => void; onSubmit: (s: { productId: string; refund: number; replace: number }[], note: string) => void }) {
  const [refund, setRefund] = useState<Record<string, number>>(Object.fromEntries(c.lines.map((l) => [l.productId, l.refundQty])));
  const [note, setNote] = useState('');
  const split = c.lines.map((l) => ({ productId: l.productId, refund: Math.min(l.damagedQty, refund[l.productId] ?? 0), replace: l.damagedQty - Math.min(l.damagedQty, refund[l.productId] ?? 0) }));
  const amt = c.lines.reduce((s, l, i) => s + lineValue(l, split[i].refund), 0);
  return (
    <Modal open onClose={onClose} title={`Split remedy by unit · ${c.id}`} icon={SplitSquareHorizontal} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={note.trim().length < 10} onClick={() => { onSubmit(split, note.trim()); onClose(); }}>Confirm decision</button></>}>
      <div className="stack-12">
        <Banner tone="info">The buyer asked for the split shown. You can change it; refund + replacement always equals the damaged quantity.</Banner>
        <table className="tbl">
          <thead><tr><th>Product</th><th className="right">Damaged</th><th>Refund units</th><th className="right">Replace units</th><th className="right">Refund value</th></tr></thead>
          <tbody>{c.lines.map((l, i) => (
            <tr key={l.productId}>
              <td className="small">{l.title}</td>
              <td className="num">{num(l.damagedQty)}</td>
              <td style={{ width: 140 }}><input type="number" min={0} max={l.damagedQty} className="input mono" style={{ height: 32 }} value={split[i].refund} onChange={(e) => setRefund((x) => ({ ...x, [l.productId]: Math.max(0, +e.target.value) }))} /></td>
              <td className="num">{num(split[i].replace)}</td>
              <td className="num">{inr(lineValue(l, split[i].refund))}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="row-between small"><span className="muted">Refund to Finance (Pending)</span><b className="mono">{inr(amt)}</b></div>
        <div className="field"><label htmlFor="sn">Decision note <span style={{ color: 'var(--danger)' }}>*</span></label><textarea id="sn" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this split; shown to the buyer and stored in the audit log" /></div>
      </div>
    </Modal>
  );
}

/** NDR: act within 24 hours. Confirm a corrected address (re-attempt) or initiate RTO. */
export function NdrActions({ so }: { so: SubOrder }) {
  const { orders, setStatus, patchSub } = useOrders();
  const { tickets, patchTicket, addMessage } = useSupport();
  const { user } = useAuth();
  const { log } = useAudit();
  const toast = useToast();
  const [addrOpen, setAddrOpen] = useState(false);
  const [rto, setRto] = useState(false);
  const [line, setLine] = useState('');
  const [phone, setPhone] = useState('');
  const [landmark, setLandmark] = useState('');
  const me = `${user?.name} (${user?.id})`;
  const order = orders.find((o) => o.id === so.orderId)!;
  const ticket = tickets.find((t) => t.ndrSoId === so.id);
  const prepaid = order.payment.status === 'Captured';
  if (so.status !== 'Delivery Failed') return <div className="xs muted">Action taken: {so.status === 'RTO' ? 'RTO initiated' : 'address corrected, re-attempt scheduled'}.</div>;

  return (
    <>
      <div className="row wrap" style={{ gap: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={() => { setLine(order.address.line); setPhone(order.address.phone); setAddrOpen(true); }}><MapPin size={13} /> Confirm Address Correction</button>
        <button className="btn btn-outline-danger btn-sm" onClick={() => setRto(true)}><Undo2 size={13} /> Initiate RTO</button>
      </div>
      <Modal open={addrOpen} onClose={() => setAddrOpen(false)} title={`Confirm address · ${so.ndr?.id}`} icon={MapPin}
        footer={<><button className="btn btn-secondary" onClick={() => setAddrOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={line.trim().length < 10 || !/^\+?[\d\s]{10,15}$/.test(phone)} onClick={() => {
          patchSub(so.id, { ndr: { ...so.ndr!, reason: `${so.ndr!.reason} → corrected by Support` } });
          setStatus(so.id, 'In Transit', `Address corrected by Support (${line.trim()}${landmark ? `, near ${landmark}` : ''}). Re-attempt scheduled with ${so.courier}.`);
          if (ticket) { patchTicket(ticket.id, { status: 'Resolved' }); addMessage(ticket.id, { by: me, role: 'support', text: `Address confirmed with buyer; re-attempt requested from ${so.courier}.` }); }
          log({ action: 'NDR address corrected', entity: `${so.ndr?.id} / ${so.id}`, oldValue: order.address.line, newValue: line.trim() });
          toast('success', 'Re-attempt scheduled', `${so.courier} notified with the corrected address.`); setAddrOpen(false);
        }}>Confirm & request re-attempt</button></>}>
        <div className="stack-12">
          <Banner tone="info">Confirm the address with the buyer by phone before saving. The courier gets the corrected address and phone.</Banner>
          <div className="field"><label htmlFor="al">Address line (include unit / floor)</label><input id="al" className="input" value={line} onChange={(e) => setLine(e.target.value)} /></div>
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="lm">Landmark</label><input id="lm" className="input" value={landmark} onChange={(e) => setLandmark(e.target.value)} /></div>
            <div className="field"><label htmlFor="ph">Receiver phone</label><input id="ph" className="input mono" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
        </div>
      </Modal>
      <ConfirmWithReason open={rto} onClose={() => setRto(false)} danger title={`Initiate RTO for ${so.id}?`} confirmLabel="Initiate RTO"
        description={<>The shipment returns to the vendor. The vendor isn't paid for this sub-order. {prepaid ? <>The buyer's refund of <b className="mono">{inr(so.total)}</b> goes to Finance as <b>Pending</b>.</> : 'COD was not collected, so no refund is due.'} Return-logistics cost owner is TBD.</>}
        onConfirm={(r) => {
          setStatus(so.id, 'RTO', `Return to origin initiated by Support: ${r}`);
          if (prepaid) patchSub(so.id, { refund: { amount: so.total, status: 'Pending', ref: `RFD-2026-${String(Date.now()).slice(-5)}`, at: new Date().toISOString() } });
          if (ticket) { patchTicket(ticket.id, { status: 'Resolved' }); addMessage(ticket.id, { by: me, role: 'support', text: `RTO initiated: ${r}` }); }
          log({ action: 'RTO initiated', entity: `${so.ndr?.id} / ${so.id}`, oldValue: 'Delivery Failed', newValue: 'RTO', reason: r });
          toast('warning', 'RTO initiated', so.id);
        }} />
    </>
  );
}

