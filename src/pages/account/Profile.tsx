import { useState } from 'react';
import { BadgeCheck, Bell, Building2, KeyRound, MapPin, Pencil, Plus, Star, Trash2, UserPlus, Users, Zap } from 'lucide-react';
import { Banner, Card, Modal, PageHeader, Pill } from '../../components/ui';
import type { Address } from '../../data/customer';
import { TRIMINSTA_HUBS } from '../../data/india';
import { useProfile } from '../../lib/profile';
import type { TeamMember } from '../../lib/profile';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

/** Mock zone lookup by PIN prefix (real check uses geocoding; provider TBD). */
function zoneFor(pin: string): { hubId: string | null; km: number | null } {
  const map: [string, string, number][] = [['4006', 'WH-MUM-01', 4.8], ['4213', 'WH-MUM-01', 3.2], ['5600', 'WH-BLR-01', 4.1], ['6416', 'WH-TUP-01', 5.1], ['1100', 'WH-DEL-01', 3.9]];
  const m = map.find(([p]) => pin.startsWith(p));
  return m ? { hubId: m[1], km: m[2] } : { hubId: null, km: null };
}

export default function Profile() {
  const pf = useProfile();
  const { log } = useAudit();
  const toast = useToast();
  const [editCo, setEditCo] = useState(false);
  const [addr, setAddr] = useState<Address | null>(null);
  const [invite, setInvite] = useState(false);
  const [pw, setPw] = useState(false);

  return (
    <div className="container stack-16" style={{ maxWidth: 1000 }}>
      <PageHeader icon={Building2} title="Company Profile" subtitle="Company and GST details, delivery addresses, team and notification preferences" />

      <Card title="Company" icon={Building2} actions={<button className="btn btn-secondary btn-sm" onClick={() => setEditCo(true)}><Pencil size={13} /> Edit</button>}>
        <dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
          <dt>Legal name</dt><dd>{pf.company.name}</dd>
          <dt>GSTIN</dt><dd><span className="mono">{pf.company.gstin}</span> <Pill tone="green" icon={BadgeCheck}>GST Verified</Pill></dd>
          <dt>PAN</dt><dd className="mono">{pf.company.pan}</dd>
          <dt>Industry</dt><dd>{pf.company.industry}</dd>
          <dt>Billing address</dt><dd>{pf.company.billing}</dd>
          <dt>Accounts contact</dt><dd>{pf.company.email} · <span className="mono">{pf.company.phone}</span></dd>
        </dl>
        <div className="xs muted" style={{ marginTop: 10 }}>The GSTIN appears on every vendor's tax invoice. To change it, contact Support; re-verification is required.</div>
      </Card>

      <Card title="Delivery addresses" icon={MapPin} actions={<button className="btn btn-primary btn-sm" onClick={() => setAddr({ id: `AD-${Date.now()}`, label: '', line: '', city: '', state: 'Maharashtra', pin: '', hubId: null, hubKm: null, contact: '', phone: '' })}><Plus size={13} /> Add address</button>}>
        <div className="grid g-3" style={{ gap: 12 }}>
          {pf.addresses.map((a) => (
            <div key={a.id} className="addr-card" style={{ cursor: 'default' }}>
              <div className="row-between"><b className="small">{a.label}</b>{a.id === pf.defaultId && <Pill tone="indigo" icon={Star}>Default</Pill>}</div>
              <div className="xs muted">{a.line}, {a.city}, {a.state} {a.pin}</div>
              <div className="xs" style={{ marginTop: 4 }}>{a.contact} · {a.phone}</div>
              <div style={{ marginTop: 6 }}>{a.hubId ? <Pill tone="orange" icon={Zap}>TrimInsta: {TRIMINSTA_HUBS.find((h) => h.id === a.hubId)?.name.split('·').pop()} · {a.hubKm} km</Pill> : <Pill tone="grey">Standard delivery only</Pill>}</div>
              <div className="row" style={{ marginTop: 8, gap: 4 }}>
                <button className="btn btn-ghost btn-xs" onClick={() => setAddr(a)}><Pencil size={12} /> Edit</button>
                {a.id !== pf.defaultId && <button className="btn btn-ghost btn-xs" onClick={() => { pf.setDefault(a.id); toast('success', 'Default address updated'); }}>Set default</button>}
                {a.id !== pf.defaultId && <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => { pf.removeAddress(a.id); log({ action: 'Address removed', entity: a.label }); toast('info', 'Address removed'); }}><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Team" icon={Users} actions={<button className="btn btn-secondary btn-sm" onClick={() => setInvite(true)}><UserPlus size={13} /> Invite</button>} pad={false}>
        <table className="tbl"><tbody>{pf.team.map((m) => (
          <tr key={m.id}><td><div className="t-name">{m.name}</div><div className="t-sub">{m.email}</div></td><td><Pill tone={m.role === 'Owner' ? 'indigo' : 'grey'}>{m.role}</Pill></td><td><Pill tone={m.status === 'Active' ? 'green' : 'amber'}>{m.status}</Pill></td></tr>
        ))}</tbody></table>
        <div className="xs muted" style={{ padding: '10px 20px' }}>Receiving staff can see delivery OTPs. Accounts staff can download invoices and track refunds.</div>
      </Card>

      <Card title="Notification preferences" icon={Bell} sub="SMS and WhatsApp providers are TBD" pad={false}>
        <table className="tbl">
          <thead><tr><th>Notification</th><th>Email</th><th>SMS</th><th>WhatsApp</th></tr></thead>
          <tbody>{Object.entries(pf.prefs).map(([k, v]) => (
            <tr key={k}><td className="small">{k}</td>{(['email', 'sms', 'whatsapp'] as const).map((ch) => <td key={ch}><input type="checkbox" aria-label={`${k} via ${ch}`} checked={v[ch]} onChange={(e) => pf.setPref(k, ch, e.target.checked)} /></td>)}</tr>
          ))}</tbody>
        </table>
      </Card>

      <Card title="Security" icon={KeyRound}>
        <div className="row-between wrap"><span className="small">Password last changed 12 Aug 2026</span><button className="btn btn-secondary btn-sm" onClick={() => setPw(true)}>Change password</button></div>
      </Card>

      {editCo && <CompanyModal onClose={() => setEditCo(false)} />}
      {addr && <AddressModal a={addr} onClose={() => setAddr(null)} onSave={(a) => { pf.upsertAddress(a); log({ action: 'Address saved', entity: a.label, newValue: `${a.city} ${a.pin}` }); toast('success', 'Address saved'); }} />}
      {invite && <InviteModal onClose={() => setInvite(false)} onSave={(m) => { pf.upsertMember(m); toast('success', 'Invite sent', m.email); }} />}
      <Modal open={pw} onClose={() => setPw(false)} title="Change password" icon={KeyRound} footer={<><button className="btn btn-secondary" onClick={() => setPw(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { setPw(false); toast('success', 'Password changed', 'Other sessions were signed out.'); }}>Update</button></>}>
        <div className="stack-12">
          <div className="field"><label htmlFor="op">Current password</label><input id="op" type="password" className="input" /></div>
          <div className="field"><label htmlFor="np">New password</label><input id="np" type="password" className="input" /></div>
        </div>
      </Modal>
    </div>
  );
}

function CompanyModal({ onClose }: { onClose: () => void }) {
  const pf = useProfile();
  const toast = useToast();
  const { log } = useAudit();
  const [f, setF] = useState(pf.company);
  return (
    <Modal open onClose={onClose} title="Edit company details" icon={Building2}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.billing.trim().length < 15 || !/^\S+@\S+\.\S+$/.test(f.email)} onClick={() => { pf.patchCompany(f); log({ action: 'Company profile updated', entity: f.name }); toast('success', 'Saved'); onClose(); }}>Save</button></>}>
      <div className="stack-12">
        <Banner tone="info">Legal name and GSTIN come from GST verification and can't be edited here.</Banner>
        <div className="field"><label htmlFor="ind">Industry</label><input id="ind" className="input" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} /></div>
        <div className="field"><label htmlFor="bil">Billing address</label><textarea id="bil" className="textarea" value={f.billing} onChange={(e) => setF({ ...f, billing: e.target.value })} /></div>
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="em">Accounts email</label><input id="em" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="ph">Phone</label><input id="ph" className="input mono" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        </div>
      </div>
    </Modal>
  );
}

function AddressModal({ a, onClose, onSave }: { a: Address; onClose: () => void; onSave: (a: Address) => void }) {
  const [f, setF] = useState(a);
  const z = zoneFor(f.pin);
  const ok = f.label.trim().length > 1 && f.line.trim().length > 8 && f.city.trim().length > 1 && /^\d{6}$/.test(f.pin) && f.contact.trim().length > 1 && /^\+?[\d\s]{10,15}$/.test(f.phone);
  const set = (k: keyof Address, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={a.label ? `Edit ${a.label}` : 'Add delivery address'} icon={MapPin}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { onSave({ ...f, hubId: z.hubId, hubKm: z.km }); onClose(); }}>Save address</button></>}>
      <div className="grid g-2" style={{ gap: 12 }}>
        <div className="field"><label htmlFor="al">Label</label><input id="al" className="input" value={f.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. Thane Unit" /></div>
        <div className="field"><label htmlFor="ap">PIN code</label><input id="ap" className="input mono" maxLength={6} value={f.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="aline">Address line</label><input id="aline" className="input" value={f.line} onChange={(e) => set('line', e.target.value)} /></div>
        <div className="field"><label htmlFor="ac">City</label><input id="ac" className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></div>
        <div className="field"><label htmlFor="as">State</label><input id="as" className="input" value={f.state} onChange={(e) => set('state', e.target.value)} /></div>
        <div className="field"><label htmlFor="acn">Receiving contact</label><input id="acn" className="input" value={f.contact} onChange={(e) => set('contact', e.target.value)} /></div>
        <div className="field"><label htmlFor="aph">Phone</label><input id="aph" className="input mono" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        {/^\d{6}$/.test(f.pin) && <div style={{ gridColumn: '1 / -1' }}>{z.hubId ? <Pill tone="orange" icon={Zap}>Inside TrimInsta zone · {z.km} km from {TRIMINSTA_HUBS.find((h) => h.id === z.hubId)?.name}</Pill> : <Pill tone="grey">Outside TrimInsta zones: Standard delivery only</Pill>}</div>}
      </div>
    </Modal>
  );
}

function InviteModal({ onClose, onSave }: { onClose: () => void; onSave: (m: TeamMember) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Buyer');
  return (
    <Modal open onClose={onClose} title="Invite a colleague" icon={UserPlus}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email)} onClick={() => { onSave({ id: `TM-${Date.now()}`, name: name.trim(), email, role, status: 'Invited' }); onClose(); }}>Send invite</button></>}>
      <div className="stack-12">
        <div className="field"><label htmlFor="tn">Name</label><input id="tn" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="te">Email</label><input id="te" className="input" value={email} onChange={(e) => setEmail(e.target.value.trim())} /></div>
        <div className="field"><label htmlFor="tr">Role</label><select id="tr" className="select" value={role} onChange={(e) => setRole(e.target.value as TeamMember['role'])}><option>Buyer</option><option>Accounts</option><option>Receiving</option></select></div>
      </div>
    </Modal>
  );
}
