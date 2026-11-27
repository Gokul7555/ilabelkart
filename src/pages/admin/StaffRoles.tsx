import { useState } from 'react';
import { Lock, ShieldCheck, UserCog, UserPlus, UserX } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, Modal, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { TRIMINSTA_HUBS } from '../../data/india';
import { fmtDateTime } from '../../lib/format';
import { PERMS, STAFF_ROLES, useStaff } from '../../lib/staff';
import type { StaffMember } from '../../lib/staff';
import type { StaffRole } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type T = 'staff' | 'matrix';

export default function StaffRoles() {
  const { staff, matrix, setPerm, upsertStaff } = useStaff();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('staff');
  const [invite, setInvite] = useState(false);
  const [deact, setDeact] = useState<StaffMember | null>(null);

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={UserCog} title="Staff & Roles" subtitle="Who can use the Admin console, and which screens each role can open"
        actions={<button className="btn btn-primary btn-sm" onClick={() => setInvite(true)}><UserPlus size={14} /> Invite staff</button>} />
      <Tabs<T> value={tab} onChange={setTab} tabs={[{ id: 'staff', label: 'Staff', count: staff.filter((s) => s.status !== 'Deactivated').length }, { id: 'matrix', label: 'Permission matrix' }]} />

      {tab === 'staff' && (
        <Card pad={false}>
          <table className="tbl">
            <thead><tr><th>Staff</th><th>Role</th><th>Hub</th><th>2FA</th><th>Last sign-in</th><th>Status</th><th></th></tr></thead>
            <tbody>{staff.map((m) => (
              <tr key={m.id}>
                <td><div className="t-name">{m.name}</div><div className="t-sub"><span className="mono">{m.id}</span> · {m.email}</div></td>
                <td><Pill tone={m.role === 'Super Admin' ? 'indigo' : m.role === 'Finance' ? 'blue' : 'amber'}>{m.role}</Pill></td>
                <td className="small">{m.hub ? TRIMINSTA_HUBS.find((h) => h.id === m.hub)?.name : '—'}</td>
                <td><Pill tone="green" icon={ShieldCheck}>TOTP</Pill></td>
                <td className="small">{m.lastLogin ? fmtDateTime(m.lastLogin) : <span className="muted">Never</span>}</td>
                <td><StatusPill status={m.status === 'Active' ? 'Active' : m.status === 'Invited' ? 'Pending' : 'Frozen'} /></td>
                <td className="right">{m.id !== 'ROOT-01' && m.status !== 'Deactivated' && <button className="btn btn-outline-danger btn-xs" onClick={() => setDeact(m)}><UserX size={12} /> Deactivate</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      {tab === 'matrix' && (
        <>
          <Banner tone="info" icon={Lock} lead="Enforced in the app.">Sidebar items and routes follow this matrix. Try the Finance or Warehouse demo login. Super Admin always keeps every permission, so nobody can lock the platform out.</Banner>
          <Card pad={false}>
            <table className="tbl">
              <thead><tr><th>Screen</th>{STAFF_ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}</tr></thead>
              <tbody>{PERMS.map((p) => (
                <tr key={p.key}>
                  <td className="small bold">{p.label}</td>
                  {STAFF_ROLES.map((r: StaffRole) => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      <input type="checkbox" aria-label={`${r}: ${p.label}`} checked={matrix[r][p.key]} disabled={r === 'Super Admin'}
                        onChange={(e) => { setPerm(r, p.key, e.target.checked); log({ action: 'Permission changed', entity: `${r} · ${p.label}`, oldValue: e.target.checked ? 'No access' : 'Access', newValue: e.target.checked ? 'Access' : 'No access' }); toast('success', 'Permission updated', `${r}: ${p.label}`); }} />
                    </td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          </Card>
          <div className="xs muted">Approver and Support are separate portals with their own logins; they never get Admin console access.</div>
        </>
      )}

      {invite && <InviteModal onClose={() => setInvite(false)} onSave={(m) => { upsertStaff(m); log({ action: 'Staff invited', entity: `${m.name} (${m.id})`, newValue: m.role }); toast('success', 'Invite sent', m.email); }} />}
      <ConfirmWithReason open={!!deact} onClose={() => setDeact(null)} danger title={`Deactivate ${deact?.name ?? ''}?`} confirmLabel="Deactivate"
        description="Their sessions end immediately. Past actions stay in the audit log."
        onConfirm={(r) => { if (!deact) return; upsertStaff({ ...deact, status: 'Deactivated' }); log({ action: 'Staff deactivated', entity: `${deact.name} (${deact.id})`, oldValue: deact.status, newValue: 'Deactivated', reason: r }); toast('warning', 'Staff deactivated'); }} />
    </div>
  );
}

function InviteModal({ onClose, onSave }: { onClose: () => void; onSave: (m: StaffMember) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('Finance');
  const [hub, setHub] = useState('WH-MUM-01');
  const ok = name.trim().length > 2 && /^[^@\s]+@trimnova\.in$/.test(email);
  return (
    <Modal open onClose={onClose} title="Invite staff" icon={UserPlus}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { onSave({ id: `${role === 'Finance' ? 'FN' : role === 'Warehouse' ? 'WH' : 'AD'}-${Math.floor(130 + Math.random() * 800)}`, name: name.trim(), email, role, status: 'Invited', hub: role === 'Warehouse' ? hub : undefined }); onClose(); }}>Send invite</button></>}>
      <div className="stack-12">
        <div className="field"><label htmlFor="sn">Name</label><input id="sn" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="se">Work email (@trimnova.in)</label><input id="se" className="input" value={email} onChange={(e) => setEmail(e.target.value.trim())} /></div>
        <div className="field"><label htmlFor="sr">Role</label><select id="sr" className="select" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>{STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        {role === 'Warehouse' && <div className="field"><label htmlFor="sh">Hub</label><select id="sh" className="select" value={hub} onChange={(e) => setHub(e.target.value)}>{TRIMINSTA_HUBS.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>}
        <Banner tone="info">They must set up TOTP two-factor sign-in on first login.</Banner>
      </div>
    </Modal>
  );
}
