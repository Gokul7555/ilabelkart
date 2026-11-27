import { Fragment, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Landmark, Layers, Wallet, XCircle } from 'lucide-react';
import { Banner, Card, EmptyState, ExportButtons, Kpi, Modal, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { customerById } from '../../data/customer';
import { NOVATEX_ID, vendorById } from '../../data/vendors';
import { fmtDate, fmtDateTime, inr } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import { useCases } from '../../lib/cases';
import { conditions, payable, settleStatus, useSettlements } from '../../lib/settlements';
import type { Batch, SettleStatus } from '../../lib/settlements';
import { useOnboarding } from '../../lib/onboarding';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';
import { AuditTrailButton } from '../../components/AuditTrail';

type T = 'eligible' | 'held' | 'batches' | 'paid';
const TONE: Record<SettleStatus, 'green' | 'amber' | 'red' | 'indigo' | 'blue' | 'grey'> = { Eligible: 'green', 'In Window': 'amber', 'Open Dispute': 'red', Paid: 'indigo', 'In Batch': 'blue', 'Awaiting COD': 'amber', 'Awaiting delivery': 'grey' };

export default function AdminSettlements() {
  const { user } = useAuth();
  const { orders, subOrders } = useOrders();
  const { cases } = useCases();
  const { batches, createBatches, recordTransfer } = useSettlements();
  const { data: onb } = useOnboarding();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('eligible');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rec, setRec] = useState<Batch | null>(null);

  // Only delivered (or disputed after delivery) sub-orders create a vendor balance.
  const rows = useMemo(() => subOrders.filter((s) => s.delivery && !orders.find((o) => o.id === s.orderId)?.replacementFor).map((s) => {
    const o = orders.find((x) => x.id === s.orderId);
    return { s, o, st: settleStatus(s, o, cases, batches), conds: conditions(s, o, cases, batches), pay: payable(s, cases) };
  }), [subOrders, orders, cases, batches]);
  const eligible = rows.filter((r) => r.st === 'Eligible');
  const held = rows.filter((r) => ['In Window', 'Open Dispute', 'Awaiting COD', 'Awaiting delivery'].includes(r.st));
  const pendingBatches = batches.filter((b) => b.status === 'Pending');
  const paidBatches = batches.filter((b) => b.status === 'Paid');
  const sum = (xs: typeof rows) => xs.reduce((a, r) => a + r.pay.net, 0);

  const generate = () => {
    const chosen = eligible.filter((r) => sel.has(r.s.id));
    const byVendor = new Map<string, typeof chosen>();
    chosen.forEach((r) => byVendor.set(r.s.vendorId, [...(byVendor.get(r.s.vendorId) ?? []), r]));
    const made = createBatches([...byVendor.entries()].map(([vendorId, rs]) => ({ vendorId, subOrderIds: rs.map((r) => r.s.id), amount: Math.round(sum(rs) * 100) / 100 })), `${user?.name} (${user?.id})`);
    made.forEach((b) => log({ action: 'Settlement batch generated', entity: `${b.id} · ${vendorById(b.vendorId)?.name}`, newValue: `${inr(b.amount)} · ${b.subOrderIds.length} sub-order(s)` }));
    toast('success', `${made.length} batch(es) created`, made.map((b) => b.id).join(', '));
    setSel(new Set()); setTab('batches');
  };

  const toggle = (id: string) => setOpen((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bank = (vendorId: string) => vendorId === NOVATEX_ID && onb.bank ? `${onb.bank.bankName} ••${onb.bank.account.slice(-4)} · ${onb.bank.ifsc}` : `Verified beneficiary ••${vendorId.slice(-4)}`;

  const table = (list: typeof rows, selectable: boolean) => list.length === 0 ? <EmptyState title="Nothing here" /> : (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr>
          {selectable && <th style={{ width: 30 }}><input type="checkbox" aria-label="Select all" checked={list.every((r) => sel.has(r.s.id))} onChange={(e) => setSel(e.target.checked ? new Set(list.map((r) => r.s.id)) : new Set())} /></th>}
          <th style={{ width: 24 }}></th><th>Sub-order</th><th>Vendor</th><th>Delivered</th><th>Return window</th><th className="right">Payable</th><th>Status</th><th className="right">Conditions</th>
        </tr></thead>
        <tbody>{list.map((r) => (
          <Fragment key={r.s.id}>
            <tr className="clickable" onClick={() => toggle(r.s.id)}>
              {selectable && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.s.id}`} checked={sel.has(r.s.id)} onChange={() => setSel((x) => { const n = new Set(x); if (n.has(r.s.id)) n.delete(r.s.id); else n.add(r.s.id); return n; })} /></td>}
              <td>{open.has(r.s.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
              <td><div className="mono small bold">{r.s.id}</div><div className="t-sub">{customerById(r.s.customerId)?.company}</div></td>
              <td className="small">{vendorById(r.s.vendorId)?.name}</td>
              <td className="small nowrap">{fmtDate(r.s.delivery!.at)}</td>
              <td className="small nowrap">{r.s.returnWindowEnds ? fmtDate(r.s.returnWindowEnds) : '—'}</td>
              <td className="num">{inr(r.pay.net)}{r.pay.deductions > 0 && <div className="xs muted">−{inr(r.pay.deductions)} refunds</div>}</td>
              <td><Pill tone={TONE[r.st]}>{r.st}</Pill></td>
              <td className="num">{r.conds.filter((c) => c.ok).length}/6</td>
            </tr>
            {open.has(r.s.id) && (
              <tr><td colSpan={selectable ? 9 : 8} style={{ background: 'var(--surface-2)' }}>
                <div className="grid g-3" style={{ gap: 8 }}>
                  {r.conds.map((c) => (
                    <div key={c.key} className="row small" style={{ alignItems: 'flex-start' }}>
                      {c.ok ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <XCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                      <div><div>{c.label}</div><div className="xs muted">{c.detail}</div></div>
                    </div>
                  ))}
                </div>
              </td></tr>
            )}
          </Fragment>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={Wallet} title="Settlements" subtitle="Vendor payouts are manual and released only when all 6 conditions pass" actions={<ExportButtons name="settlements" />} />
      <div className="grid g-4">
        <Kpi icon={CheckCircle2} tone="green" label="Eligible" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum(eligible))}</span>} help={`${eligible.length} sub-order(s)`} />
        <Kpi icon={Wallet} tone="amber" label="Held" value={<span className="mono" style={{ fontSize: 18 }}>{inr(sum(held))}</span>} help={`${held.length} sub-order(s)`} />
        <Kpi icon={Layers} tone="blue" label="Batches pending transfer" value={pendingBatches.length} help={inr(pendingBatches.reduce((a, b) => a + b.amount, 0))} />
        <Kpi icon={Landmark} tone="indigo" label="Paid (all time, demo)" value={<span className="mono" style={{ fontSize: 18 }}>{inr(paidBatches.reduce((a, b) => a + b.amount, 0))}</span>} help={`${paidBatches.length} batch(es)`} />
      </div>
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'eligible', label: 'Eligible', count: eligible.length }, { id: 'held', label: 'Held', count: held.length },
        { id: 'batches', label: 'Batches (pending transfer)', count: pendingBatches.length }, { id: 'paid', label: 'Paid', count: paidBatches.length },
      ]} />

      {tab === 'eligible' && (
        <Card pad={false} title="Eligible sub-orders" sub="Click a row to see its 6-condition checklist"
          actions={<button className="btn btn-primary btn-sm" disabled={sel.size === 0} onClick={generate}><Layers size={14} /> Generate Settlement Batch ({sel.size})</button>}>
          {table(eligible, true)}
        </Card>
      )}
      {tab === 'held' && <Card pad={false} title="Held sub-orders" sub="In return window, open dispute or COD not yet remitted">{table(held, false)}</Card>}

      {tab === 'batches' && (
        <>
          <Banner tone="info" lead="Manual payout.">Transfer from the bank portal, then record the amount, transfer date, UTR and your name. A failed transfer keeps the batch Pending so it can be retried.</Banner>
          {pendingBatches.length === 0 && <div className="card"><EmptyState title="No batches waiting for transfer" /></div>}
          {pendingBatches.map((b) => (
            <Card key={b.id} title={<span className="row"><span className="mono">{b.id}</span> · {vendorById(b.vendorId)?.name}</span>} sub={`Created ${fmtDateTime(b.createdAt)} by ${b.createdBy} · to ${bank(b.vendorId)}`}
              actions={<div className="row"><span className="mono bold">{inr(b.amount)}</span><StatusPill status="Pending" /><AuditTrailButton match={[b.id]} label="Trail" /><button className="btn btn-primary btn-sm" onClick={() => setRec(b)}>Record transfer</button></div>}>
              <div className="small">Sub-orders: {b.subOrderIds.map((id) => <span key={id} className="mono" style={{ marginRight: 8 }}>{id}</span>)}</div>
              {b.attempts.length > 0 && <div className="stack-12" style={{ marginTop: 8, gap: 4 }}>{b.attempts.map((a, i) => (
                <div key={i} className="xs" style={{ color: a.result === 'Failed' ? 'var(--danger)' : undefined }}>{a.result} · {fmtDateTime(a.at)} · {a.admin} · “{a.note}”</div>
              ))}</div>}
            </Card>
          ))}
        </>
      )}

      {tab === 'paid' && (
        <Card pad={false}>
          <table className="tbl">
            <thead><tr><th>Batch</th><th>Vendor</th><th>Sub-orders</th><th className="right">Amount</th><th>Transfer date</th><th>UTR</th><th>Recorded by</th></tr></thead>
            <tbody>{paidBatches.map((b) => (
              <tr key={b.id}><td className="mono small bold">{b.id}</td><td className="small">{vendorById(b.vendorId)?.name}</td><td className="mono xs">{b.subOrderIds.join(', ')}</td><td className="num">{inr(b.transfer!.amount)}</td><td className="small">{fmtDate(b.transfer!.date)}</td><td className="mono small">{b.transfer!.utr}</td><td className="xs muted">{b.transfer!.admin}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      {rec && <TransferModal b={rec} onClose={() => setRec(null)} onSave={(t) => {
        recordTransfer(rec.id, t);
        log({ action: t.result === 'Success' ? 'Settlement transfer recorded' : 'Settlement transfer FAILED', entity: `Batch ${rec.id}`, oldValue: 'Pending', newValue: t.result === 'Success' ? `Paid · UTR ${t.utr}` : 'Pending (failed attempt)', reason: t.note });
        toast(t.result === 'Success' ? 'success' : 'error', t.result === 'Success' ? 'Marked Paid' : 'Transfer failed: batch stays Pending', rec.id);
      }} />}
    </div>
  );
}

function TransferModal({ b, onClose, onSave }: { b: Batch; onClose: () => void; onSave: (t: { amount: number; date: string; utr: string; admin: string; result: 'Success' | 'Failed'; note: string }) => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(String(b.amount));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [utr, setUtr] = useState('');
  const [admin, setAdmin] = useState(user?.name ?? '');
  const [result, setResult] = useState<'Success' | 'Failed'>('Success');
  const [note, setNote] = useState('');
  const amountOk = Math.abs(+amount - b.amount) < 0.01;
  const ok = admin.trim().length > 2 && !!date && date <= new Date().toISOString().slice(0, 10) && note.trim().length >= 5
    && (result === 'Failed' || (amountOk && /^[A-Z0-9]{12,22}$/.test(utr)));
  return (
    <Modal open onClose={onClose} title={`Record transfer · ${b.id}`} icon={Landmark}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className={`btn ${result === 'Success' ? 'btn-primary' : 'btn-danger'}`} disabled={!ok} onClick={() => { onSave({ amount: +amount, date, utr, admin: admin.trim(), result, note: note.trim() }); onClose(); }}>{result === 'Success' ? 'Mark as Paid' : 'Record failed attempt'}</button></>}>
      <div className="stack-12">
        <div className="tabs">
          <button className={`tab ${result === 'Success' ? 'active' : ''}`} onClick={() => setResult('Success')}>Transfer succeeded</button>
          <button className={`tab ${result === 'Failed' ? 'active' : ''}`} onClick={() => setResult('Failed')}>Transfer failed</button>
        </div>
        {result === 'Failed' && <Banner tone="danger">The batch stays <b>Pending</b>. Nothing is marked paid.</Banner>}
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="ta">Amount ₹ *</label><input id="ta" type="number" step="0.01" className={`input mono ${amountOk ? '' : 'invalid'}`} value={amount} onChange={(e) => setAmount(e.target.value)} />{!amountOk && <span className="err">Must equal the batch amount {inr(b.amount)}</span>}</div>
          <div className="field"><label htmlFor="td">Transfer date *</label><input id="td" type="date" className="input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="tu">UTR {result === 'Success' && '*'}</label><input id="tu" className="input mono" value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="HDFC0026118833" /><span className="hint">12–22 letters/digits from the bank</span></div>
          <div className="field"><label htmlFor="tn">Admin name *</label><input id="tn" className="input" value={admin} onChange={(e) => setAdmin(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="tnote">{result === 'Failed' ? 'Failure reason *' : 'Note *'}</label><textarea id="tnote" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={result === 'Failed' ? 'e.g. Beneficiary account frozen by bank' : 'e.g. NEFT confirmed in bank statement'} /></div>
      </div>
    </Modal>
  );
}
