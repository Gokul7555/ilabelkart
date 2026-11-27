import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Circle, Factory, Layers, Plus, Ruler, ShieldCheck, Warehouse, Wrench, XCircle, Zap } from 'lucide-react';
import { Banner, Card, Modal, PageHeader, Pill, StatusPill } from '../../components/ui';
import { CATEGORIES, CLASSIFICATIONS, categoryById } from '../../data/categories';
import { TRIMINSTA_HUBS } from '../../data/india';
import { fmtDate, num } from '../../lib/format';
import { displayStatus, latest, useOnboarding } from '../../lib/onboarding';
import { NOVATEX_CATEGORIES, NOVATEX_ID } from '../../data/vendors';
import type { CatApproval } from '../../data/vendors';
import { useCatalog } from '../../lib/catalog';
import { useVendorState } from '../../lib/vendorState';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';

const HUB_STATE: Record<string, { status: string; skus: number }> = {
  'WH-MUM-01': { status: 'Live', skus: 4 },
  'WH-TUP-01': { status: 'Inbound pending', skus: 0 },
};

export default function Capabilities() {
  const { data } = useOnboarding();
  const { status } = useVendorState();
  const toast = useToast();
  const { log } = useAudit();
  const { products } = useCatalog();
  const [cats, setCats] = useState<CatApproval[]>(NOVATEX_CATEGORIES);
  const liveIn = (catId: string) => products.filter((p) => p.vendorId === NOVATEX_ID && p.categoryId === catId && p.live).length;
  const [reqOpen, setReqOpen] = useState(false);
  const [ops, setOps] = useState({ leadTime: 3, sampleDays: 5, workDays: 'Mon–Sat', maxOrder: 500000, defaultMoq: 500, packMultiple: 100, samples: true, tiers: true });
  const [dirty, setDirty] = useState(false);

  const setOp = <K extends keyof typeof ops>(k: K, v: (typeof ops)[K]) => { setOps((o) => ({ ...o, [k]: v })); setDirty(true); };

  const certs = data.docs.filter((d) => d.kind === 'CERT');
  const liveSkus = cats.reduce((s, c) => s + (c.status === 'Approved' ? liveIn(c.categoryId) : 0), 0);
  const instaChecks = [
    { ok: status === 'active', label: 'Vendor account active' },
    { ok: data.insta.optIn, label: 'Opted in to TrimInsta' },
    { ok: data.insta.hubs.length > 0, label: 'At least one hub selected' },
    { ok: liveSkus > 0, label: 'At least one approved, live product' },
    { ok: data.insta.hubs.some((h) => HUB_STATE[h]?.skus > 0), label: 'Stock received and counted at a hub' },
  ];
  const instaEligible = instaChecks.every((c) => c.ok);

  return (
    <div className="container stack-16">
      <PageHeader icon={Wrench} title="Capabilities" subtitle="What you're approved to sell, your certifications, capacity and fulfilment options" />

      <Card title="Selling Categories" icon={Layers} sub="Selling in a new category needs Approver review. Commission is set per category by TrimNova."
        actions={<button className="btn btn-primary btn-sm" onClick={() => setReqOpen(true)}><Plus size={14} /> Request category</button>} pad={false}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Category</th><th>Classification</th><th>Status</th><th className="right">Live products</th><th className="right">Monthly capacity</th><th className="right">Commission</th></tr></thead>
            <tbody>
              {cats.map((c) => {
                const cat = categoryById(c.categoryId)!;
                return (
                  <tr key={c.categoryId}>
                    <td><div className="t-name">{cat.name}</div><div className="t-sub">HSN {cat.hsn} · {c.status === 'Approved' ? `since ${fmtDate(c.since)}` : `requested ${fmtDate(c.since)}`}</div></td>
                    <td className="small">{CLASSIFICATIONS.find((x) => x.id === cat.classification)!.name}</td>
                    <td><StatusPill status={c.status} />{c.reason && <div className="xs muted" style={{ maxWidth: 240 }}>{c.reason}</div>}</td>
                    <td className="num">{liveIn(c.categoryId)}</td>
                    <td className="num">{c.capacity ? `${num(c.capacity)} units` : '—'}</td>
                    <td className="num">{cat.commission.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g-2">
        <Card title="Certifications" icon={ShieldCheck} sub="Shown to buyers as badges while valid and approved" actions={<Link to="/vendor/kyc" className="btn btn-ghost btn-sm">Manage</Link>}>
          <div className="row wrap">
            {certs.length === 0 && <span className="small muted">No certificates uploaded.</span>}
            {certs.map((d) => {
              const s = displayStatus(d);
              const tone = s === 'Approved' ? 'green' : s === 'Expired' || s === 'Rejected' ? 'red' : 'grey';
              return (
                <span key={d.id} style={{ opacity: s === 'Approved' ? 1 : 0.6 }}>
                  <Pill tone={tone} icon={s === 'Approved' ? BadgeCheck : s === 'Expired' || s === 'Rejected' ? XCircle : Circle}>
                    {d.certType}{s !== 'Approved' && ` · ${s}`}
                  </Pill>
                </span>
              );
            })}
          </div>
          <p className="xs muted" style={{ marginTop: 12 }}>Expired certificates are hidden from buyers and block sales of products that need them. Pending, On Hold and Rejected certificates are not shown as valid.</p>
        </Card>

        <Card title="TrimInsta Eligibility" icon={Zap} actions={instaEligible ? <Pill tone="green" icon={CheckCircle2}>Eligible</Pill> : <Pill tone="amber">Not yet eligible</Pill>}>
          <div className="stack-12">
            {instaChecks.map((c) => (
              <div key={c.label} className="row small">
                {c.ok ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} /> : <Circle size={15} className="muted" />}
                <span style={{ color: c.ok ? 'var(--text)' : 'var(--text-3)' }}>{c.label}</span>
              </div>
            ))}
            {data.insta.hubs.length > 0 && <div className="divider-h" style={{ margin: '4px 0' }} />}
            {data.insta.hubs.map((h) => {
              const hub = TRIMINSTA_HUBS.find((x) => x.id === h)!;
              const st = HUB_STATE[h] ?? { status: 'Inbound pending', skus: 0 };
              return (
                <div key={h} className="row small">
                  <Warehouse size={14} className="muted" /><span className="grow">{hub.name}</span>
                  <span className="xs muted mono">{st.skus} SKUs</span>
                  <Pill tone={st.status === 'Live' ? 'green' : 'amber'}>{st.status}</Pill>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card title="Production, Lead Time & MOQ Policy" icon={Factory} sub="Operational defaults. They pre-fill new listings; each listing can set its own MOQ and lead time."
        footer={<><button className="btn btn-secondary" disabled={!dirty} onClick={() => setDirty(false)}>Discard</button><button className="btn btn-primary" disabled={!dirty} onClick={() => {
          setDirty(false); log({ action: 'Capabilities updated', entity: 'Vendor operational defaults', newValue: `Lead ${ops.leadTime}d · MOQ ${ops.defaultMoq} · pack ${ops.packMultiple}` });
          toast('success', 'Capabilities saved', 'Existing live listings keep their approved values.');
        }}>Save changes</button></>}>
        <div className="grid g-3" style={{ gap: 14 }}>
          <div className="field"><label htmlFor="lt">Standard dispatch lead time</label>
            <div className="input-group"><input id="lt" type="number" min={1} max={30} className="input mono" value={ops.leadTime} onChange={(e) => setOp('leadTime', +e.target.value)} /><span className="input" style={{ width: 80, background: 'var(--slate-100)', display: 'grid', placeItems: 'center' }}>days</span></div>
            <span className="hint">Late dispatch beyond this is flagged to Admin.</span></div>
          <div className="field"><label htmlFor="wd">Working days</label>
            <select id="wd" className="select" value={ops.workDays} onChange={(e) => setOp('workDays', e.target.value)}><option>Mon–Fri</option><option>Mon–Sat</option><option>All days</option></select></div>
          <div className="field"><label htmlFor="mo">Max quantity per order</label>
            <input id="mo" type="number" className="input mono" value={ops.maxOrder} onChange={(e) => setOp('maxOrder', +e.target.value)} /></div>
          <div className="field"><label htmlFor="dm">Default MOQ (units)</label>
            <input id="dm" type="number" min={1} className="input mono" value={ops.defaultMoq} onChange={(e) => setOp('defaultMoq', +e.target.value)} /></div>
          <div className="field"><label htmlFor="pm">Pack multiple</label>
            <input id="pm" type="number" min={1} className="input mono" value={ops.packMultiple} onChange={(e) => setOp('packMultiple', +e.target.value)} />
            {ops.defaultMoq % ops.packMultiple !== 0 && <span className="err">MOQ should be a multiple of the pack size</span>}</div>
          <div className="field"><label htmlFor="sd">Lab dip / sample lead time</label>
            <div className="input-group"><input id="sd" type="number" className="input mono" value={ops.sampleDays} disabled={!ops.samples} onChange={(e) => setOp('sampleDays', +e.target.value)} /><span className="input" style={{ width: 80, background: 'var(--slate-100)', display: 'grid', placeItems: 'center' }}>days</span></div></div>
        </div>
        <div className="row wrap" style={{ marginTop: 14, gap: 20 }}>
          <label className="check"><input type="checkbox" checked={ops.samples} onChange={(e) => setOp('samples', e.target.checked)} /> Accept lab dip / sample requests</label>
          <label className="check"><input type="checkbox" checked={ops.tiers} onChange={(e) => setOp('tiers', e.target.checked)} /> Offer volume tier pricing</label>
        </div>
        <div style={{ marginTop: 14 }}><Banner tone="info" icon={Ruler} lead="Monthly capacity">is set per category above. Buyers never see your capacity; it's used to warn you before you accept orders you can't fulfil.</Banner></div>
      </Card>

      <RequestCategoryModal open={reqOpen} onClose={() => setReqOpen(false)} taken={cats.map((c) => c.categoryId)}
        onSubmit={(id, capacity) => { setCats((c) => [...c, { categoryId: id, status: 'Pending', since: new Date().toISOString(), capacity }]); toast('success', 'Category requested', 'Sent to the Approver.'); }} />
    </div>
  );
}

function RequestCategoryModal({ open, onClose, taken, onSubmit }: { open: boolean; onClose: () => void; taken: string[]; onSubmit: (id: string, capacity: number) => void }) {
  const avail = CATEGORIES.filter((c) => !taken.includes(c.id));
  const [id, setId] = useState('');
  const [cap, setCap] = useState('');
  const [note, setNote] = useState('');
  const cat = categoryById(id);
  const { data } = useOnboarding();
  const haveCerts = new Set(data.docs.filter((d) => d.kind === 'CERT' && latest(d).status === 'Approved').map((d) => d.certType));
  return (
    <Modal open={open} onClose={onClose} title="Request a new category" icon={Plus}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!id || !(+cap > 0) || note.trim().length < 10} onClick={() => { onSubmit(id, +cap); setId(''); setCap(''); setNote(''); onClose(); }}>Submit request</button></>}>
      <div className="stack-12">
        <div className="field"><label htmlFor="rc">Category</label>
          <select id="rc" className="select" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Select…</option>
            {avail.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        {cat && cat.certs.length > 0 && (
          <div className="small">
            <div className="label" style={{ marginBottom: 6 }}>Typically required certificates</div>
            <div className="row wrap">{cat.certs.map((c) => <Pill key={c} tone={haveCerts.has(c) ? 'green' : 'amber'} icon={haveCerts.has(c) ? CheckCircle2 : Circle}>{c}{haveCerts.has(c) ? '' : ' · missing'}</Pill>)}</div>
          </div>
        )}
        <div className="field"><label htmlFor="cp">Monthly capacity (units)</label><input id="cp" type="number" className="input mono" value={cap} onChange={(e) => setCap(e.target.value)} /></div>
        <div className="field"><label htmlFor="nt">Manufacturing capability</label><textarea id="nt" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Machines, in-house processes, existing buyers in this category…" /><span className="hint">Minimum 10 characters</span></div>
      </div>
    </Modal>
  );
}
