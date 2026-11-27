import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileImage, Plus, ShieldCheck, Upload } from 'lucide-react';
import { Banner, Card, Dropzone, EmptyState, PageHeader, Pill, StatusPill } from '../../components/ui';
import { vendorById } from '../../data/vendors';
import { fmtDate, fmtDateTime, inr, num } from '../../lib/format';
import { caseAmount, lineValue, useCases } from '../../lib/cases';
import type { Case, CaseStatus } from '../../lib/cases';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

const TONE: Record<CaseStatus, 'amber' | 'red' | 'blue' | 'green' | 'grey'> = {
  'Awaiting vendor': 'amber', 'Escalated to Support': 'red', 'More evidence requested': 'blue', Resolved: 'green', Rejected: 'grey',
};

export default function Cases() {
  const { user } = useAuth();
  const { cases } = useCases();
  const mine = cases.filter((c) => c.customerId === user?.customerId);
  return (
    <div className="container stack-16" style={{ maxWidth: 1000 }}>
      <PageHeader icon={ShieldCheck} title="Cases & Returns" subtitle="Your damage claims and support tickets. TrimNova Support is your single point of contact."
        actions={<Link to="/account/cases/new" className="btn btn-primary btn-sm"><Plus size={14} /> Raise damage claim</Link>} />
      {mine.length === 0 ? <div className="card"><EmptyState icon={ShieldCheck} title="No cases yet" /></div> : mine.map((c) => <CaseCard key={c.id} c={c} />)}
    </div>
  );
}

function CaseCard({ c }: { c: Case }) {
  const { addEvent, patch } = useCases();
  const { user } = useAuth();
  const toast = useToast();
  const [upload, setUpload] = useState(false);
  return (
    <Card title={<span className="row wrap"><span className="mono">{c.id}</span><span className="muted mono small">{c.ticketId}</span></span>}
      sub={<>Sub-order <Link to={`/account/orders/${c.orderId}`} className="mono">{c.subOrderId}</Link> · {vendorById(c.vendorId)?.name} · raised {fmtDate(c.createdAt)}</>}
      actions={<Pill tone={TONE[c.status]}>{c.status}</Pill>}>
      <div className="stack-16">
        {c.status === 'More evidence requested' && (
          <Banner tone="info" lead="Support needs more evidence." actions={<button className="btn btn-primary btn-sm" onClick={() => setUpload((u) => !u)}><Upload size={13} /> Add evidence</button>}>
            {[...c.events].reverse().find((e) => e.by.includes('Support'))?.text}
          </Banner>
        )}
        {upload && <Dropzone accept=".jpg,.jpeg,.png,.mp4" label="Upload additional evidence" onFiles={(f) => {
          patch(c.id, { evidence: [...c.evidence, ...f.map((x) => x.name)], status: 'Escalated to Support' });
          addEvent(c.id, `${user?.name} (${user?.org})`, `Added ${f.length} file(s): ${f.map((x) => x.name).join(', ')}`);
          setUpload(false); toast('success', 'Evidence added', 'Support has been notified.');
        }} />}
        {c.status === 'Awaiting vendor' && <Banner tone="warning" lead="Waiting for vendor.">If the vendor doesn't respond by {fmtDateTime(c.vendorRespondBy)}, the case escalates to Support automatically.</Banner>}

        <div className="grid g-2">
          <div>
            <div className="caps muted" style={{ marginBottom: 6 }}>Claim · {c.reason}</div>
            <p className="small">{c.description}</p>
            <table className="tbl" style={{ marginTop: 8 }}>
              <thead><tr><th>Product</th><th className="right">Damaged</th><th className="right">Refund</th><th className="right">Replace</th></tr></thead>
              <tbody>{c.lines.map((l) => (
                <tr key={l.productId}><td className="small">{l.title}</td><td className="num">{num(l.damagedQty)}</td><td className="num">{num(l.refundQty)}<div className="xs muted">{inr(lineValue(l, l.refundQty))}</div></td><td className="num">{num(l.replaceQty)}</td></tr>
              ))}</tbody>
            </table>
            <div className="xs muted" style={{ marginTop: 6 }}>Claim value incl. GST: <span className="mono">{inr(caseAmount(c))}</span></div>
            <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
              {c.evidence.map((e) => <Pill key={e} tone="grey" icon={FileImage}>{e}</Pill>)}
            </div>
          </div>
          <div>
            <div className="caps muted" style={{ marginBottom: 6 }}>Activity</div>
            <div className="timeline">
              {[...c.events].reverse().map((e, i) => (
                <div key={i} className={`tl-item ${i === 0 ? 'current' : 'done'}`}><span className="tl-dot" />
                  <div className="xs muted">{fmtDateTime(e.at)} · {e.by}</div><div className="small">{e.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {c.resolution && (
          <Banner tone={c.status === 'Rejected' ? 'danger' : 'success'} lead={`Decision: ${c.resolution.decision}.`}>
            {c.resolution.note}
            {c.refund && <> Refund <span className="mono">{inr(c.refund.amount)}</span> · ref <span className="mono">{c.refund.ref}</span> · <StatusPill status={c.refund.status} /></>}
            {c.replacementOrderId && <> Replacement order <span className="mono">{c.replacementOrderId}</span>.</>}
          </Banner>
        )}
      </div>
    </Card>
  );
}
