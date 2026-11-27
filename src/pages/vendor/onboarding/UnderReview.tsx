import { useState } from 'react';
import type { ReactNode } from 'react';
import { Clock, FileSearch, Upload } from 'lucide-react';
import { Banner, Card, Pill } from '../../../components/ui';
import { fmtDateTime } from '../../../lib/format';
import { allRequiredApproved, latest, useOnboarding } from '../../../lib/onboarding';
import type { VendorDoc } from '../../../lib/onboarding';
import { useVendorState } from '../../../lib/vendorState';
import { useToast } from '../../../lib/toast';
import { useAudit } from '../../../lib/audit';
import { DemoPanel, DocStatusPill, ReuploadModal } from './shared';

const APPROVER = 'Kavya Iyer (AP-1042)';

export default function UnderReview({ demoExtra }: { demoExtra?: ReactNode }) {
  const { data, decide, patch } = useOnboarding();
  const { setStatus } = useVendorState();
  const toast = useToast();
  const { log } = useAudit();
  const [reup, setReup] = useState<VendorDoc | null>(null);

  const docs = data.docs;
  const counts = {
    approved: docs.filter((d) => latest(d).status === 'Approved').length,
    pending: docs.filter((d) => latest(d).status === 'Pending').length,
    action: docs.filter((d) => ['Rejected', 'On Hold'].includes(latest(d).status)).length,
  };
  const ready = allRequiredApproved(docs);
  const stage = ready ? 2 : 1;

  const simulateReview = () => {
    const firstCert = docs.find((d) => d.kind === 'CERT' && latest(d).status === 'Pending');
    docs.forEach((d) => {
      if (latest(d).status !== 'Pending') return;
      if (d === firstCert && latest(d).v === 1) decide(d.id, 'On Hold', APPROVER, 'Expiry date on the certificate does not match the date entered. Re-upload the current certificate.');
      else decide(d.id, 'Approved', APPROVER);
    });
    toast('info', 'Approver decisions recorded (demo)');
  };
  const approveAll = () => { docs.forEach((d) => latest(d).status === 'Pending' && decide(d.id, 'Approved', APPROVER)); toast('info', 'All pending documents approved (demo)'); };
  const activate = () => {
    patch({ activatedAt: new Date().toISOString() });
    setStatus('active');
    log({ action: 'Vendor activated', entity: `Vendor ${data.gst?.legalName ?? ''}`, oldValue: 'Under review', newValue: 'Active', reason: 'All required documents approved (demo)' });
    toast('success', 'Account activated', 'Your vendor portal is now unlocked.');
  };

  const steps = [
    { label: 'Submitted', sub: data.submittedAt ? fmtDateTime(data.submittedAt) : '' },
    { label: 'Document review', sub: `${counts.approved}/${docs.length} approved` },
    { label: 'Admin activation', sub: ready ? 'Waiting for Admin' : 'After all documents are approved' },
  ];

  return (
    <div className="stack-16">
      <Card>
        <div className="row wrap" style={{ gap: 16 }}>
          <div className="tone-amber" style={{ width: 48, height: 48, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center' }}><FileSearch size={22} /></div>
          <div className="grow">
            <div className="row"><h3 style={{ fontSize: 17 }}>Under review</h3><Pill tone="amber" icon={Clock}>Portal locked</Pill></div>
            <p className="small muted">Usually 1–2 business days. Dashboard, Catalog, Orders and Settlements unlock after Admin activates your account.</p>
          </div>
          <div className="row" style={{ gap: 20 }}>
            <div><div className="caps muted">Approved</div><div className="mono bold" style={{ fontSize: 18, color: 'var(--success)' }}>{counts.approved}</div></div>
            <div><div className="caps muted">Pending</div><div className="mono bold" style={{ fontSize: 18, color: 'var(--warning)' }}>{counts.pending}</div></div>
            <div><div className="caps muted">Action needed</div><div className="mono bold" style={{ fontSize: 18, color: 'var(--danger)' }}>{counts.action}</div></div>
          </div>
        </div>
        <div className="divider-h" />
        <div className="grid g-3" style={{ gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s.label} className="row" style={{ alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: i < stage ? 'var(--success)' : i === stage ? 'var(--primary)' : 'var(--slate-200)', color: i <= stage ? 'var(--on-status)' : 'var(--text-3)' }}>{i < stage ? '✓' : i + 1}</span>
              <div><div className="small bold">{s.label}</div><div className="xs muted">{s.sub}</div></div>
            </div>
          ))}
        </div>
      </Card>

      {counts.action > 0 && <Banner tone="warning" lead="Action needed.">{counts.action} document(s) were put On Hold or Rejected. Read the reviewer's note and re-upload.</Banner>}
      {ready && <Banner tone="success" lead="All documents approved.">Waiting for Admin to activate your account.</Banner>}

      <Card title="Document decisions" sub="Each document is reviewed separately by the TrimNova Approver" pad={false}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Document</th><th>Number</th><th>Version</th><th>Status</th><th>Reviewer note</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => {
                const v = latest(d);
                const needs = v.status === 'Rejected' || v.status === 'On Hold';
                return (
                  <tr key={d.id}>
                    <td><div className="t-name">{d.title}</div><div className="t-sub">{v.fileName}</div></td>
                    <td className="mono small">{d.number ?? '—'}</td>
                    <td className="mono">v{v.v}</td>
                    <td><DocStatusPill doc={d} /></td>
                    <td className="xs" style={{ maxWidth: 280 }}>{v.reason ?? <span className="muted">{v.decidedBy ? `By ${v.decidedBy}` : 'Awaiting review'}</span>}</td>
                    <td className="right">{needs && <button className="btn btn-primary btn-sm" onClick={() => setReup(d)}><Upload size={13} /> Re-upload</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <DemoPanel>
        <button className="btn btn-secondary btn-sm" onClick={simulateReview} disabled={!counts.pending}>Approver: review documents</button>
        <button className="btn btn-secondary btn-sm" onClick={approveAll} disabled={!counts.pending}>Approver: approve all pending</button>
        <button className="btn btn-success btn-sm" onClick={activate} disabled={!ready} title={ready ? '' : 'Enabled only when every required document is Approved'}>Admin: activate vendor</button>
        {demoExtra}
      </DemoPanel>

      <ReuploadModal doc={reup} onClose={() => setReup(null)} />
    </div>
  );
}
