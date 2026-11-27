import { Fragment, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, FileCheck2, Plus, Upload } from 'lucide-react';
import { Banner, Card, Dropzone, EmptyState, ExportButtons, FileChip, Kpi, Modal, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import type { UploadedFile } from '../../components/ui';
import { CERT_TYPES } from '../../data/india';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { daysToExpiry, displayStatus, latest, liveVersion, useOnboarding } from '../../lib/onboarding';
import type { VendorDoc } from '../../lib/onboarding';
import { useToast } from '../../lib/toast';
import { DocStatusPill, ExpiryChip, ReuploadModal, certDateError } from './onboarding/shared';

type Filter = 'all' | 'certs' | 'identity' | 'action';

const needsAction = (d: VendorDoc) => {
  const s = displayStatus(d);
  const days = daysToExpiry(d);
  return s === 'Rejected' || s === 'On Hold' || s === 'Expired' || (days !== null && days <= 30 && s === 'Approved');
};

export default function KycDocs() {
  const { data } = useOnboarding();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [reup, setReup] = useState<VendorDoc | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const docs = data.docs;
  const expiring = docs.filter((d) => { const n = daysToExpiry(d); return n !== null && n >= 0 && n <= 30 && displayStatus(d) === 'Approved'; });
  const expired = docs.filter((d) => displayStatus(d) === 'Expired');
  const shown = docs.filter((d) =>
    filter === 'all' ? true : filter === 'certs' ? d.kind === 'CERT' : filter === 'identity' ? d.kind !== 'CERT' : needsAction(d));

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="container stack-16">
      <PageHeader icon={FileCheck2} title="KYC & Docs" subtitle="Verification and compliance documents, every version, and expiry tracking"
        actions={<><ExportButtons name="kyc-documents" /><button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Plus size={14} /> Add certificate</button></>} />

      <div className="grid g-4">
        <Kpi icon={CheckCircle2} tone="green" label="Approved" value={docs.filter((d) => displayStatus(d) === 'Approved').length} help="Live and valid" />
        <Kpi icon={Clock} tone="amber" label="Pending review" value={docs.filter((d) => latest(d).status === 'Pending').length} help="With the Approver" />
        <Kpi icon={AlertTriangle} tone="amber" label="Expiring ≤ 30 days" value={expiring.length} help="Renew before expiry" />
        <Kpi icon={AlertTriangle} tone="red" label="Action needed" value={docs.filter((d) => ['Rejected', 'On Hold', 'Expired'].includes(displayStatus(d))).length} help="Rejected, on hold or expired" />
      </div>

      {expired.map((d) => (
        <Banner key={d.id} tone="danger" lead={`${d.title} has expired.`}
          actions={<button className="btn btn-danger btn-sm" onClick={() => setReup(d)}><Upload size={13} /> Upload renewal</button>}>
          The {d.certType} badge is hidden and sales of products that need it are blocked until a renewed certificate is approved.
        </Banner>
      ))}
      {expiring.map((d) => (
        <Banner key={d.id} tone="warning" lead={`${d.title} expires in ${daysToExpiry(d)} days`}
          actions={<button className="btn btn-warning btn-sm" onClick={() => setReup(d)}><Upload size={13} /> Upload renewal</button>}>
          ({fmtDate(liveVersion(d)!.expiryDate!)}). On expiry the badge is hidden automatically and sales are blocked. Renewals need Approver review, so upload early.
        </Banner>
      ))}

      <Tabs<Filter> value={filter} onChange={setFilter} tabs={[
        { id: 'all', label: 'All documents', count: docs.length },
        { id: 'certs', label: 'Certificates', count: docs.filter((d) => d.kind === 'CERT').length },
        { id: 'identity', label: 'GST, PAN & Bank', count: docs.filter((d) => d.kind !== 'CERT').length },
        { id: 'action', label: 'Needs attention', count: docs.filter(needsAction).length },
      ]} />

      <Card pad={false}>
        {shown.length === 0 ? <EmptyState title="Nothing here" icon={FileCheck2}>No documents match this filter.</EmptyState> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th style={{ width: 28 }}></th><th>Document</th><th>Live version</th><th>Latest upload</th><th>Expiry</th><th></th></tr></thead>
              <tbody>
                {shown.map((d) => {
                  const live = liveVersion(d);
                  const cur = latest(d);
                  const isOpen = open.has(d.id);
                  return (
                    <Fragment key={d.id}>
                      <tr className="clickable" onClick={() => toggle(d.id)}>
                        <td>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td>
                          <div className="t-name">{d.title} {d.required && <Pill tone="grey">Required</Pill>}</div>
                          <div className="t-sub mono">{d.number}</div>
                        </td>
                        <td>{live ? <><span className="mono">v{live.v}</span> <StatusPill status={displayStatus(d) === 'Expired' ? 'Expired' : 'Approved'} /></> : <span className="xs muted">None yet</span>}</td>
                        <td>
                          {cur !== live ? <><span className="mono">v{cur.v}</span> <DocStatusPill doc={d} /><div className="xs muted" style={{ maxWidth: 260 }}>{cur.reason}</div></>
                            : <span className="xs muted">Same as live</span>}
                        </td>
                        <td><ExpiryChip doc={d} /></td>
                        <td className="right" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" disabled={cur.status === 'Pending'} title={cur.status === 'Pending' ? 'A version is already waiting for review' : ''} onClick={() => setReup(d)}>
                            <Upload size={13} /> Re-upload
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td></td>
                          <td colSpan={5} style={{ background: 'var(--surface-2)' }}>
                            <div className="caps muted" style={{ marginBottom: 8 }}>Version history</div>
                            <div className="timeline">
                              {[...d.versions].reverse().map((v) => (
                                <div key={v.v} className={`tl-item ${v === live ? 'done' : ''}`}>
                                  <span className="tl-dot" />
                                  <div className="row wrap">
                                    <span className="mono bold">v{v.v}</span>
                                    <StatusPill status={v.status} />
                                    {v === live && <Pill tone="indigo" strong>LIVE</Pill>}
                                    <span className="xs muted">{v.fileName}</span>
                                  </div>
                                  <div className="xs muted">
                                    Uploaded {fmtDateTime(v.uploadedAt)}
                                    {v.issueDate && <> · valid {fmtDate(v.issueDate)} → {fmtDate(v.expiryDate!)}</>}
                                    {v.decidedBy && <> · decided by {v.decidedBy}{v.decidedAt && ` on ${fmtDate(v.decidedAt)}`}</>}
                                  </div>
                                  {v.reason && <div className="xs" style={{ color: v.status === 'Rejected' ? 'var(--danger)' : 'var(--text-2)' }}>“{v.reason}”</div>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ReuploadModal doc={reup} onClose={() => setReup(null)} />
      <AddCertModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddCertModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { upsertDoc } = useOnboarding();
  const toast = useToast();
  const [type, setType] = useState('GRS');
  const [no, setNo] = useState('');
  const [issue, setIssue] = useState('');
  const [expiry, setExpiry] = useState('');
  const [file, setFile] = useState<UploadedFile | null>(null);
  const err = certDateError(issue, expiry);
  const ok = !!no.trim() && !!file && !err;
  return (
    <Modal open={open} onClose={onClose} title="Add compliance certificate" icon={Plus}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => {
        upsertDoc({ id: `DOC-${Date.now()}`, kind: 'CERT', title: `${type} Certificate`, certType: type, number: no.trim(), required: false,
          versions: [{ v: 1, fileName: file!.name, uploadedAt: new Date().toISOString(), status: 'Pending', issueDate: issue, expiryDate: expiry }] });
        toast('success', 'Certificate submitted', 'Badge appears on your listings once approved.');
        setNo(''); setIssue(''); setExpiry(''); setFile(null); onClose();
      }}>Submit for review</button></>}>
      <div className="stack-12">
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="at">Type</label><select id="at" className="select" value={type} onChange={(e) => setType(e.target.value)}>{CERT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label htmlFor="an">Certificate no.</label><input id="an" className="input mono" value={no} onChange={(e) => setNo(e.target.value)} /></div>
          <div className="field"><label htmlFor="ai">Issue date</label><input id="ai" type="date" className="input" value={issue} onChange={(e) => setIssue(e.target.value)} /></div>
          <div className="field"><label htmlFor="ae">Expiry date</label><input id="ae" type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
        </div>
        {(issue || expiry) && err && <span className="err small">{err}</span>}
        {file ? <FileChip file={file} onRemove={() => setFile(null)} /> : <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} />}
      </div>
    </Modal>
  );
}
