import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileImage, Film, Image as ImageIcon } from 'lucide-react';
import { Banner, Card, EmptyState, Modal, Pill } from '../../components/ui';
import { customerById } from '../../data/customer';
import { vendorById } from '../../data/vendors';
import { fmtDate, fmtDateTime, inr, num } from '../../lib/format';
import { caseAmount, isOpenCase, useCases } from '../../lib/cases';
import type { CaseStatus } from '../../lib/cases';
import { SupportShell } from './SupportShell';
import { DisputeActions } from './actions';

const TONE: Record<CaseStatus, 'amber' | 'red' | 'blue' | 'green' | 'grey'> = { 'Awaiting vendor': 'amber', 'Escalated to Support': 'red', 'More evidence requested': 'blue', Resolved: 'green', Rejected: 'grey' };

export function EvidenceGallery({ files }: { files: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="row wrap" style={{ gap: 8 }}>
        {files.map((f, i) => {
          const video = /\.(mp4|mov)$/i.test(f);
          return (
            <button key={f + i} onClick={() => setOpen(f)} aria-label={`Open ${f}`} style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer' }}>
              <div style={{ width: 78, height: 64, borderRadius: 'var(--radius)', background: 'var(--slate-100)', border: '1px solid var(--border)', color: 'var(--text-3)', display: 'grid', placeItems: 'center'}}>
                {video ? <Film size={20} /> : <ImageIcon size={20} />}
              </div>
              <div className="xs muted" style={{ width: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</div>
            </button>
          );
        })}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ?? ''} icon={FileImage} size="lg">
        <div style={{ aspectRatio: '16 / 10', borderRadius: 'var(--radius)', background: 'var(--slate-100)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
          {open && /\.(mp4|mov)$/i.test(open) ? <Film size={48} /> : <ImageIcon size={48} />}
        </div>
        <div className="xs muted" style={{ marginTop: 8 }}>Evidence preview (mock). EXIF, upload time and uploader are kept with the case.</div>
      </Modal>
    </>
  );
}

export default function Disputes() {
  const { cases } = useCases();
  const [showClosed, setShowClosed] = useState(false);
  const list = cases.filter((c) => showClosed || isOpenCase(c)).sort((a, b) => Number(b.status === 'Escalated to Support') - Number(a.status === 'Escalated to Support') || a.createdAt.localeCompare(b.createdAt));
  return (
    <SupportShell>
      <Banner tone="warning" lead="Auto-Escalation:">if a vendor fails to respond within 2 business days, the case escalates here. Support's decision is final. Only damaged quantity is eligible, within the return window.</Banner>
      <label className="check small"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show resolved / rejected</label>
      {list.length === 0 && <div className="card"><EmptyState title="No active disputes" /></div>}
      {list.map((c) => (
        <Card key={c.id}
          title={<span className="row wrap"><span className="mono">{c.id}</span><Link to={`/support/tickets/${c.ticketId}`} className="mono small">{c.ticketId}</Link></span>}
          sub={<>Order <span className="mono">{c.orderId}</span> · sub-order <span className="mono">{c.subOrderId}</span> · raised {fmtDate(c.createdAt)}</>}
          actions={<Pill tone={TONE[c.status]}>{c.status}</Pill>}>
          <div className="grid g-2" style={{ gap: 20 }}>
            <div className="stack-12">
              <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
                <dt>Customer</dt><dd>{customerById(c.customerId)?.company}</dd>
                <dt>Vendor</dt><dd>{vendorById(c.vendorId)?.name}</dd>
                <dt>Reason</dt><dd>{c.reason}</dd>
                <dt>Vendor reply</dt><dd className="small">{c.status === 'Awaiting vendor' ? <>due {fmtDateTime(c.vendorRespondBy)}</> : 'No response (escalated)'}</dd>
              </dl>
              <p className="small" style={{ color: 'var(--text-2)' }}>“{c.description}”</p>
              {c.lines.map((l) => (
                <div key={l.productId} className="small">{l.title}: <b className="mono">{num(l.damagedQty)}</b> of {num(l.deliveredQty)} {l.unit} damaged · asks refund {num(l.refundQty)}, replace {num(l.replaceQty)}</div>
              ))}
            </div>
            <div className="stack-12">
              <div className="row-between"><span className="caps muted">Disputed amount (incl. GST)</span><span className="mono bold" style={{ fontSize: 18 }}>{inr(caseAmount(c))}</span></div>
              <div className="caps muted">Evidence</div>
              <EvidenceGallery files={c.evidence} />
            </div>
          </div>
          <div className="divider-h" />
          <div className="row-between wrap"><DisputeActions c={c} /><Link to={`/support/tickets/${c.ticketId}`} className="btn btn-ghost btn-sm">Open case detail →</Link></div>
          {c.resolution && <div style={{ marginTop: 10 }}><Banner tone={c.status === 'Rejected' ? 'danger' : 'success'} lead={c.resolution.decision}>{c.resolution.note} · {c.resolution.by}{c.refund && <> · refund {inr(c.refund.amount)} ({c.refund.status})</>}{c.replacementOrderId && <> · replacement <span className="mono">{c.replacementOrderId}</span></>}</Banner></div>}
        </Card>
      ))}
    </SupportShell>
  );
}
