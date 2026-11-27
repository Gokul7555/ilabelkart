import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, IndianRupee, Package, Palette, ShieldCheck, Wallet,
} from 'lucide-react';
import {
  Banner, Card, ConfirmWithReason, Dropzone, EmptyState, ErrorState, ExportButtons, FileChip, Kpi,
  Modal, OtpInput, PageHeader, Pill, SkeletonRows, StatusPill, Tabs,
} from '../components/ui';
import type { UploadedFile } from '../components/ui';
import { fmtDate, fmtTime, inr } from '../lib/format';
import { useToast } from '../lib/toast';
import { useAudit } from '../lib/audit';

const COLORS = [
  ['Primary · #35a64d', 'var(--primary)'], ['Hover', 'var(--primary-600)'], ['Tint', 'var(--primary-50)'], ['Secondary · slate-800', 'var(--heading)'],
  ['Accent · emerald-500', 'var(--accent)'], ['Pending · amber', 'var(--warning)'], ['Processing · sky', 'var(--info)'], ['Cancelled · red', 'var(--danger)'],
];

/** Living style guide — every shared component in one place (Phase 1 deliverable). */
export default function DesignSystem() {
  const toast = useToast();
  const { log } = useAudit();
  const [tab, setTab] = useState<'held' | 'eligible' | 'paid'>('held');
  const [modal, setModal] = useState(false);
  const [reason, setReason] = useState(false);
  const [otp, setOtp] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);

  return (
    <div className="container stack-20">
      <PageHeader icon={Palette} title="Design System" subtitle="Tokens and shared components used by every TrimNova portal" actions={<ExportButtons name="design-tokens" />} />

      <Card title="Colour tokens">
        <div className="grid g-4">
          {COLORS.map(([n, c]) => (
            <div key={n} className="color-chip"><div className="c" style={{ background: c }} /><div className="t"><b>{n}</b></div></div>
          ))}
        </div>
      </Card>

      <Card title="Typography & formats">
        <div className="grid g-2">
          <div className="stack-12">
            <h1 style={{ fontSize: 21 }}>Page title 21/700</h1>
            <h3 style={{ fontSize: 14 }}>Card title 14/650</h3>
            <p>Body 13px — dense, readable portal text.</p>
            <p className="caps muted">Small caps label</p>
          </div>
          <dl className="kv">
            <dt>Money</dt><dd className="mono">{inr(47283960)}</dd>
            <dt>Unit price</dt><dd className="mono">{inr(2.4)} /unit</dd>
            <dt>Date</dt><dd>{fmtDate('2026-11-05')}</dd>
            <dt>Time</dt><dd>{fmtTime('2026-11-05T23:59:00')}</dd>
            <dt>IDs</dt><dd className="mono">SO-2026-110423 · ORD-2026-5742 · TKT-2026-4821</dd>
          </dl>
        </div>
      </Card>

      <div className="grid g-3">
        <Kpi icon={Clock} tone="amber" label="Held balance" value={<span className="mono">{inr(184520)}</span>} help="In return window or open dispute" />
        <Kpi icon={CheckCircle2} tone="green" label="Eligible balance" value={<span className="mono">{inr(96340.5)}</span>} help="Ready for next payout batch" />
        <Kpi icon={Wallet} tone="indigo" label="Paid balance" value={<span className="mono">{inr(4728396)}</span>} help="All-time net disbursed" />
      </div>

      <Card title="Tabs, pills & buttons">
        <div className="stack-16">
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: 'held', label: 'Held Balance', count: 4 }, { id: 'eligible', label: 'Eligible Balance', count: 2 }, { id: 'paid', label: 'Paid Balance', count: 18 },
          ]} />
          <div className="row wrap">
            {['In Window', 'Open Dispute', 'Eligible', 'Paid', 'URGENT', 'HIGH', 'MEDIUM', 'LOW', 'Approved', 'Pending', 'On Hold', 'Rejected'].map((s) => <StatusPill key={s} status={s} />)}
            <Pill tone="solid-orange">Insta</Pill>
            <Pill tone="green" icon={ShieldCheck}>Official Verified Supplier</Pill>
            <Pill tone="dark" strong>ELITE</Pill>
          </div>
          <div className="row wrap">
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-secondary">Secondary</button>
            <button className="btn btn-ghost">Ghost</button>
            <button className="btn btn-success">Approve</button>
            <button className="btn btn-outline-danger">Reject</button>
            <button className="btn btn-danger">Freeze</button>
            <button className="btn btn-primary" disabled>Disabled</button>
            <button className="btn btn-secondary btn-sm">Small</button>
          </div>
        </div>
      </Card>

      <div className="stack-12">
        <Banner tone="info" lead="Why is my money held?">6 conditions must be met before a sub-order becomes eligible for payout.</Banner>
        <Banner tone="warning" lead="Auto-Escalation:">if a vendor fails to respond within 2 business days, the case escalates to Support.</Banner>
        <Banner tone="danger" lead="Courier failed to deliver.">Act within 24 hours — confirm address or initiate RTO.</Banner>
        <Banner tone="success" lead="Healthy.">All payment gateways and courier APIs operational.</Banner>
      </div>

      <Card title="Table" pad={false} actions={<ExportButtons name="sample" />}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Sub-order #</th><th>Product</th><th>Delivered</th><th className="right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td className="mono">SO-2026-110423</td><td><div className="t-name">Woven Damask Label</div><div className="t-sub">NTX-WL-2201 · 5,000 units</div></td><td>05 Nov 2026</td><td className="num">{inr(12000)}</td><td><StatusPill status="In Window" /></td></tr>
              <tr><td className="mono">SO-2026-110398</td><td><div className="t-name">Cotton Twill Tape 12mm</div><div className="t-sub">NTX-TT-1012 · 2,000 m</div></td><td>02 Nov 2026</td><td className="num">{inr(8640)}</td><td><StatusPill status="Open Dispute" /></td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g-2">
        <Card title="Unlocked step" icon={Package}><p className="small">Active card content.</p></Card>
        <Card title="PAN Verification" icon={IndianRupee} locked lockHint="Unlocked after GST verification"><p className="small">Locked content.</p></Card>
      </div>

      <div className="grid g-2">
        <Card title="Evidence uploader">
          <div className="stack-12">
            <Dropzone onFiles={(f) => setFiles((x) => [...x, ...f])} />
            {files.map((f, i) => <FileChip key={i} file={f} onRemove={() => setFiles((x) => x.filter((_, j) => j !== i))} />)}
          </div>
        </Card>
        <Card title="OTP handover input">
          <div className="stack-12">
            <OtpInput value={otp} onChange={setOtp} />
            <p className="xs muted" style={{ textAlign: 'center' }}>Entered: <span className="mono">{otp || '—'}</span></p>
          </div>
        </Card>
      </div>

      <Card title="Overlays, toasts & audit">
        <div className="row wrap">
          <button className="btn btn-secondary" onClick={() => setModal(true)}>Open modal</button>
          <button className="btn btn-outline-danger" onClick={() => setReason(true)}><AlertTriangle size={14} /> Confirm with reason</button>
          <button className="btn btn-secondary" onClick={() => toast('success', 'Saved', 'Your changes were submitted for approval.')}>Success toast</button>
          <button className="btn btn-secondary" onClick={() => toast('error', 'Payment failed', 'No amount was captured.')}>Error toast</button>
        </div>
      </Card>

      <div className="grid g-3">
        <Card title="Empty"><EmptyState title="No sub-orders yet">New orders will appear here.</EmptyState></Card>
        <Card title="Loading"><SkeletonRows /></Card>
        <Card title="Error"><ErrorState onRetry={() => toast('info', 'Retrying…')} /></Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Example modal" footer={<button className="btn btn-primary" onClick={() => setModal(false)}>Done</button>}>
        <p className="small">Modals close with Esc or by clicking outside.</p>
      </Modal>
      <ConfirmWithReason open={reason} onClose={() => setReason(false)} danger confirmLabel="Freeze vendor" title="Freeze vendor account?"
        description="The vendor's listings are hidden and payouts paused until reactivated."
        onConfirm={(r) => { log({ action: 'Vendor frozen (demo)', entity: 'Vendor VN-00000', oldValue: 'Active', newValue: 'Frozen', reason: r }); toast('warning', 'Vendor frozen', 'Audit log entry written.'); }} />
    </div>
  );
}
