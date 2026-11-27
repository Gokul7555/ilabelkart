import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronRight, Clock, HelpCircle, RotateCcw, Send, XCircle } from 'lucide-react';
import { Banner, Card, ExportButtons, Kpi, Modal, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { customerById } from '../../data/customer';
import { fmtDateTime, inr } from '../../lib/format';
import { useOrders } from '../../lib/orders';
import type { RefundStatus } from '../../lib/orders';
import { useCases } from '../../lib/cases';
import { useFinance } from '../../lib/finance';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

interface Row { ref: string; source: string; customerId: string; amount: number; status: RefundStatus; method: string; approved: boolean; approvedBy?: string; set: (s: RefundStatus) => void }
type F = 'open' | RefundStatus | 'all';
const METHOD: Record<string, string> = { upi: 'UPI (original VPA)', card: 'Original card', netbanking: 'Net banking (original account)', cod: 'NEFT to buyer bank (COD order)' };

export default function Refunds() {
  const { user } = useAuth();
  const { orders, subOrders, patchSub } = useOrders();
  const { cases, patch: patchCase } = useCases();
  const fin = useFinance();
  const { log } = useAudit();
  const toast = useToast();
  const [f, setF] = useState<F>('open');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [exec, setExec] = useState<Row | null>(null);

  const methodOf = (orderId: string) => METHOD[orders.find((o) => o.id === orderId)?.payment.method ?? 'card'];
  const rows: Row[] = [
    ...subOrders.filter((s) => s.refund).map((s) => ({
      ref: s.refund!.ref, source: `${s.status === 'RTO' ? 'RTO' : s.status === 'Rejected' ? 'Vendor rejection / cancellation' : 'Partial acceptance'} · ${s.id}`, customerId: s.customerId,
      amount: s.refund!.amount, status: s.refund!.status, method: methodOf(s.orderId), approved: !!s.refund!.approvedBy, approvedBy: s.refund!.approvedBy,
      set: (st: RefundStatus) => patchSub(s.id, { refund: { ...s.refund!, status: st } }),
    })),
    ...cases.filter((c) => c.refund).map((c) => ({
      ref: c.refund!.ref, source: `Damage claim · ${c.id}`, customerId: c.customerId, amount: c.refund!.amount, status: c.refund!.status, method: methodOf(c.orderId),
      approved: !!c.refund!.approvedBy || c.refund!.status === 'Succeeded', approvedBy: c.refund!.approvedBy, set: (st: RefundStatus) => patchCase(c.id, { refund: { ...c.refund!, status: st } }),
    })),
    ...fin.legacy.map((l) => ({ ref: l.ref, source: l.source, customerId: l.customerId, amount: l.amount, status: l.status, method: l.method, approved: true, approvedBy: 'Arjun Kapoor (ROOT-01)', set: (st: RefundStatus) => fin.patchLegacy(l.ref, st) })),
  ];
  const by = (s: RefundStatus) => rows.filter((r) => r.status === s);
  const total = (xs: Row[]) => xs.reduce((a, r) => a + r.amount, 0);
  const list = rows.filter((r) => f === 'all' || (f === 'open' ? r.status !== 'Succeeded' : r.status === f));
  const toggle = (ref: string) => setOpen((x) => { const n = new Set(x); if (n.has(ref)) n.delete(ref); else n.add(ref); return n; });

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={RotateCcw} title="Refund Execution" subtitle="Execute approved refunds and record the gateway's real response" actions={<><Pill tone="indigo" strong>FINANCE DESK</Pill><ExportButtons name="refunds" /></>} />
      <div className="grid g-4">
        <Kpi icon={Clock} tone="amber" label="Pending" value={<span className="mono" style={{ fontSize: 18 }}>{inr(total(by('Pending')))}</span>} help={`${by('Pending').length} refund(s)`} />
        <Kpi icon={XCircle} tone="red" label="Failed" value={<span className="mono" style={{ fontSize: 18 }}>{inr(total(by('Failed')))}</span>} help={`${by('Failed').length} · retry needed`} />
        <Kpi icon={HelpCircle} tone="slate" label="Unknown" value={<span className="mono" style={{ fontSize: 18 }}>{inr(total(by('Unknown')))}</span>} help={`${by('Unknown').length} · check with gateway`} />
        <Kpi icon={CheckCircle2} tone="green" label="Succeeded" value={<span className="mono" style={{ fontSize: 18 }}>{inr(total(by('Succeeded')))}</span>} help={`${by('Succeeded').length} refund(s)`} />
      </div>
      <Banner tone="warning" lead="Only Succeeded is a completed refund.">Pending, Failed and Unknown are shown as they are, both here and to buyers. A refund runs only after Admin approval (Escalations).</Banner>
      <Tabs<F> value={f} onChange={setF} tabs={[
        { id: 'open', label: 'Open', count: rows.filter((r) => r.status !== 'Succeeded').length }, { id: 'Pending', label: 'Pending', count: by('Pending').length },
        { id: 'Failed', label: 'Failed', count: by('Failed').length }, { id: 'Unknown', label: 'Unknown', count: by('Unknown').length },
        { id: 'Succeeded', label: 'Succeeded', count: by('Succeeded').length }, { id: 'all', label: 'All', count: rows.length },
      ]} />
      <Card pad={false}>
        <table className="tbl">
          <thead><tr><th style={{ width: 24 }}></th><th>Refund</th><th>Source</th><th>Customer</th><th>Destination</th><th className="right">Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((r) => {
            const att = fin.attempts[r.ref] ?? [];
            return (
              <Fragment key={r.ref}>
                <tr className="clickable" onClick={() => toggle(r.ref)}>
                  <td>{open.has(r.ref) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="mono small bold">{r.ref}</td>
                  <td className="small">{r.source}</td>
                  <td className="small">{customerById(r.customerId)?.company}</td>
                  <td className="xs">{r.method}</td>
                  <td className="num">{inr(r.amount)}</td>
                  <td><StatusPill status={r.status} />{!r.approved && <div><Pill tone="amber">Awaiting Admin approval</Pill></div>}</td>
                  <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                    {r.status === 'Succeeded' ? <span className="xs muted">Done</span>
                      : !r.approved ? <Link to="/admin/escalations" className="btn btn-ghost btn-xs">Approve in Escalations</Link>
                        : <button className="btn btn-primary btn-xs" onClick={() => setExec(r)}><Send size={12} /> {r.status === 'Pending' ? 'Execute' : r.status === 'Failed' ? 'Retry' : 'Check status'}</button>}
                  </td>
                </tr>
                {open.has(r.ref) && (
                  <tr><td></td><td colSpan={7} style={{ background: 'var(--surface-2)' }}>
                    {att.length === 0 ? <span className="xs muted">No execution attempts yet.{r.approvedBy && ` Approved by ${r.approvedBy}.`}</span> : att.map((a, i) => (
                      <div key={i} className="xs" style={{ marginBottom: 3 }}><StatusPill status={a.result} /> {fmtDateTime(a.at)} · {a.by}{a.gatewayRef && <> · <span className="mono">{a.gatewayRef}</span></>}{a.note && ` · ${a.note}`}</div>
                    ))}
                  </td></tr>
                )}
              </Fragment>
            );
          })}</tbody>
        </table>
      </Card>

      {exec && <ExecModal r={exec} onClose={() => setExec(null)} onDone={(result, note) => {
        const gatewayRef = `PGR-${String(Date.now()).slice(-5)}`;
        fin.addAttempt(exec.ref, { at: new Date().toISOString(), by: `${user?.name} (${user?.id})`, result, gatewayRef, note });
        exec.set(result);
        log({ action: `Refund ${exec.status === 'Unknown' ? 'status check' : 'executed'}`, entity: exec.ref, oldValue: exec.status, newValue: result, reason: note });
        toast(result === 'Succeeded' ? 'success' : result === 'Failed' ? 'error' : 'warning', `Refund ${result}`, exec.ref);
      }} />}
    </div>
  );
}

function ExecModal({ r, onClose, onDone }: { r: Row; onClose: () => void; onDone: (res: RefundStatus, note: string) => void }) {
  const [res, setRes] = useState<RefundStatus>('Succeeded');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  return (
    <Modal open onClose={() => !busy && onClose()} title={`${r.status === 'Unknown' ? 'Check status' : r.status === 'Failed' ? 'Retry refund' : 'Execute refund'} · ${r.ref}`} icon={Send}
      footer={<><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { onDone(res, note.trim() || (res === 'Succeeded' ? 'Gateway confirmed' : res === 'Failed' ? 'Gateway returned failure' : 'No final response')); onClose(); }, 900); }}>{busy ? 'Waiting for gateway…' : 'Send to gateway'}</button></>}>
      <div className="stack-12">
        <dl className="kv"><dt>Amount</dt><dd className="mono">{inr(r.amount)}</dd><dt>Destination</dt><dd>{r.method}</dd><dt>Source</dt><dd className="small">{r.source}</dd></dl>
        <div className="demo-panel">
          <div className="caps" style={{ color: 'var(--demo-ink)', marginBottom: 6 }}>Demo: gateway response</div>
          <div className="row wrap">{(['Succeeded', 'Failed', 'Unknown'] as RefundStatus[]).map((x) => (
            <label key={x} className="check small"><input type="radio" name="gw" checked={res === x} onChange={() => setRes(x)} /> {x}</label>
          ))}</div>
        </div>
        <div className="field"><label htmlFor="rn">Note</label><input id="rn" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bank response code, remarks" /></div>
      </div>
    </Modal>
  );
}
