import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarClock, FlaskConical, RefreshCw, Upload } from 'lucide-react';
import { Banner, Dropzone, FileChip, Modal, Pill, StatusPill } from '../../../components/ui';
import type { UploadedFile } from '../../../components/ui';
import { TODAY, daysBetween, fmtDate } from '../../../lib/format';
import { daysToExpiry, displayStatus, latest, liveVersion, useOnboarding } from '../../../lib/onboarding';
import type { VendorDoc } from '../../../lib/onboarding';
import { useToast } from '../../../lib/toast';
import { useAudit } from '../../../lib/audit';

export function DocStatusPill({ doc }: { doc: VendorDoc }) {
  return <StatusPill status={displayStatus(doc)} />;
}

export function ExpiryChip({ doc }: { doc: VendorDoc }) {
  const d = daysToExpiry(doc);
  const v = liveVersion(doc) ?? latest(doc);
  if (d === null || !v.expiryDate) return <span className="muted xs">No expiry</span>;
  if (d < 0) return <Pill tone="red" icon={CalendarClock}>Expired {Math.abs(d)}d ago</Pill>;
  if (d <= 30) return <Pill tone="amber" icon={CalendarClock}>{d} days left</Pill>;
  return <span className="xs muted nowrap">Valid till {fmtDate(v.expiryDate)}</span>;
}

/** Validates certificate dates the same way everywhere. */
export function certDateError(issue: string, expiry: string): string | null {
  if (!issue || !expiry) return 'Issue and expiry dates are required';
  if (expiry <= issue) return 'Expiry date must be after the issue date';
  if (daysBetween(TODAY, expiry) < 0) return 'This certificate has already expired — expired certificates cannot be uploaded';
  if (daysBetween(TODAY, issue) > 0) return 'Issue date cannot be in the future';
  return null;
}

/** Upload a new version. The current live (approved) version stays live until the new one is approved. */
export function ReuploadModal({ doc, onClose }: { doc: VendorDoc | null; onClose: () => void }) {
  const { addVersion } = useOnboarding();
  const toast = useToast();
  const { log } = useAudit();
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [issue, setIssue] = useState('');
  const [expiry, setExpiry] = useState('');
  useEffect(() => { setFile(null); setIssue(''); setExpiry(''); }, [doc]);
  if (!doc) return null;
  const isCert = doc.kind === 'CERT';
  const dateErr = isCert ? certDateError(issue, expiry) : null;
  const live = liveVersion(doc);
  const cur = latest(doc);

  return (
    <Modal open onClose={onClose} title={`Re-upload: ${doc.title}`} icon={Upload}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!file || !!dateErr} onClick={() => {
          addVersion(doc.id, { fileName: file!.name, issueDate: issue || undefined, expiryDate: expiry || undefined });
          log({ action: 'Document re-uploaded', entity: `${doc.title} (${doc.id})`, oldValue: `v${cur.v} · ${cur.status}`, newValue: `v${cur.v + 1} · Pending` });
          toast('success', 'New version submitted', 'Sent to the Approver for review.');
          onClose();
        }}>Submit v{cur.v + 1} for review</button>
      </>}>
      <div className="stack-16">
        {cur.reason && <Banner tone={cur.status === 'Rejected' ? 'danger' : 'warning'} lead={`${cur.status}:`}>{cur.reason}</Banner>}
        {live && <Banner tone="info" lead="Live version stays active.">v{live.v} remains in use until the new version is approved. A rejected upload never replaces it.</Banner>}
        {isCert && (
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field"><label htmlFor="ri">Issue date</label><input id="ri" type="date" className="input" value={issue} onChange={(e) => setIssue(e.target.value)} /></div>
            <div className="field"><label htmlFor="re">Expiry date</label><input id="re" type="date" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
          </div>
        )}
        {isCert && (issue || expiry) && dateErr && <span className="err small">{dateErr}</span>}
        {file ? <FileChip file={file} onRemove={() => setFile(null)} /> : <Dropzone multiple={false} onFiles={(f) => setFile(f[0])} />}
      </div>
    </Modal>
  );
}

/** Clearly-labelled demo panel; simulates actions owned by other roles. Not part of the product. */
export function DemoPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="demo-panel">
      <button className="row" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', width: '100%' }} onClick={() => setOpen((o) => !o)}>
        <FlaskConical size={14} style={{ color: 'var(--demo-ink)' }} />
        <span className="caps" style={{ color: 'var(--demo-ink)' }}>Demo controls</span>
        <span className="xs muted">simulate actions by Admin / Approver — not part of the product UI</span>
        <RefreshCw size={12} style={{ marginLeft: 'auto', color: 'var(--demo-ink)', transform: open ? 'none' : 'rotate(90deg)' }} />
      </button>
      {open && <div className="row wrap" style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; id?: string }) {
  return (
    <label className="row" style={{ cursor: 'pointer', gap: 10 }} htmlFor={id}>
      <span style={{ position: 'relative', width: 36, height: 20, borderRadius: 999, background: checked ? 'var(--primary)' : 'var(--slate-300)', transition: 'background .15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--card)', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
      </span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      {label && <span className="small">{label}</span>}
    </label>
  );
}
