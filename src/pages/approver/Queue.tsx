import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Clock, FileBadge, FilePlus2, FileText, GitCompare, PauseCircle, Send, ShieldCheck, XCircle,
} from 'lucide-react';
import { Banner, Card, EmptyState, Kpi, PageHeader, Pill, Tabs } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { ProductDiff } from '../../components/ProductDiff';
import { categoryById } from '../../data/categories';
import { NOVATEX_ID, vendorById } from '../../data/vendors';
import { TODAY, daysBetween, fmtDate, fmtDateTime } from '../../lib/format';
import { changedFields, useCatalog } from '../../lib/catalog';
import type { Product } from '../../lib/catalog';
import { latest, liveVersion, useOnboarding } from '../../lib/onboarding';
import type { DocStatus, VendorDoc } from '../../lib/onboarding';
import { docsForVendor, publishGate } from '../../lib/compliance';
import { useVendorState } from '../../lib/vendorState';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type TabId = 'docs' | 'new' | 'rev';
type Item =
  | { kind: 'doc'; key: string; vendorId: string; vendorName: string; doc: VendorDoc; at: string }
  | { kind: 'product'; key: string; product: Product; at: string };

/** Hours waiting → "2d 4h", toned by SLA (24h amber, 48h red). */
function aging(at: string) {
  const h = Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 3600000));
  const label = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
  return { h, label, tone: (h >= 48 ? 'red' : h >= 24 ? 'amber' : 'grey') as 'red' | 'amber' | 'grey' };
}

export default function Queue() {
  const { user } = useAuth();
  const { products, otherDocs, approve, reject, decideOtherDoc } = useCatalog();
  const { data: onb, decide: decideNovatexDoc } = useOnboarding();
  const { status: novatexStatus } = useVendorState();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('docs');
  const [sel, setSel] = useState<string | null>(null);

  const novatexName = onb.gst?.tradeName ?? 'NovaTex Manufacturing';
  const items = useMemo(() => {
    const docs: Item[] = [];
    onb.docs.filter((d) => latest(d).status === 'Pending').forEach((d) =>
      docs.push({ kind: 'doc', key: `${NOVATEX_ID}:${d.id}`, vendorId: NOVATEX_ID, vendorName: novatexName, doc: d, at: latest(d).uploadedAt }));
    Object.entries(otherDocs).forEach(([vid, list]) => list.filter((d) => latest(d).status === 'Pending').forEach((d) =>
      docs.push({ kind: 'doc', key: `${vid}:${d.id}`, vendorId: vid, vendorName: vendorById(vid)?.name ?? vid, doc: d, at: latest(d).uploadedAt })));
    const nw: Item[] = products.filter((p) => p.pending && !p.live).map((p) => ({ kind: 'product', key: p.id, product: p, at: p.pending!.submittedAt }));
    const rv: Item[] = products.filter((p) => p.pending && p.live).map((p) => ({ kind: 'product', key: p.id, product: p, at: p.pending!.submittedAt }));
    const byAge = (a: Item, b: Item) => a.at.localeCompare(b.at);
    return { docs: docs.sort(byAge), new: nw.sort(byAge), rev: rv.sort(byAge) };
  }, [onb.docs, otherDocs, products, novatexName]);

  const list = items[tab];
  const current = list.find((i) => i.key === sel) ?? list[0];
  useEffect(() => { if (current && current.key !== sel) setSel(current.key); }, [current, sel]);

  const all = [...items.docs, ...items.new, ...items.rev];
  const oldest = all.reduce<string | null>((o, i) => (!o || i.at < o ? i.at : o), null);
  const breached = all.filter((i) => aging(i.at).h >= 48).length;
  const me = `${user?.name} (${user?.id})`;

  const nextAfter = (key: string) => { const idx = list.findIndex((i) => i.key === key); setSel(list[idx + 1]?.key ?? list[idx - 1]?.key ?? null); };

  const onDocDecision = (it: Extract<Item, { kind: 'doc' }>, status: DocStatus, reason: string) => {
    if (it.vendorId === NOVATEX_ID) decideNovatexDoc(it.doc.id, status, me, reason || undefined);
    else decideOtherDoc(it.vendorId, it.doc.id, status, me, reason || undefined);
    log({ action: `Document ${status === 'Approved' ? 'approved' : status === 'On Hold' ? 'put on hold' : 'rejected'}`, entity: `${it.vendorName} · ${it.doc.title} v${latest(it.doc).v}`, oldValue: 'Pending', newValue: status, reason: reason || undefined });
    toast(status === 'Approved' ? 'success' : 'warning', `${it.doc.title}: ${status}`, it.vendorName);
    nextAfter(it.key);
  };

  const onProductDecision = (p: Product, ok: boolean, reason: string) => {
    if (ok) approve(p.id, me, reason || undefined); else reject(p.id, me, reason);
    log({ action: ok ? 'Product approved & published' : 'Product submission rejected', entity: `${p.sku} v${p.pending!.v}`, oldValue: p.live ? `v${p.live.v} live` : 'Not live', newValue: ok ? `v${p.pending!.v} live` : (p.live ? `v${p.live.v} stays live` : 'Rejected'), reason: reason || undefined });
    toast(ok ? 'success' : 'warning', ok ? 'Published' : 'Rejected', `${p.sku} · ${p.pending!.title}`);
    nextAfter(p.id);
  };

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1360 }}>
      <PageHeader icon={ClipboardCheck} title="Review Queue" subtitle="Vendor documents and listings waiting for a decision. Vendors submit; only you publish." />

      <div className="grid g-4">
        <Kpi icon={FileBadge} tone="indigo" label="Vendor documents" value={items.docs.length} help="Pending review" />
        <Kpi icon={FilePlus2} tone="violet" label="New listings" value={items.new.length} help="Not yet live" />
        <Kpi icon={GitCompare} tone="blue" label="Product revisions" value={items.rev.length} help="Live version unchanged until approved" />
        <Kpi icon={Clock} tone={breached ? 'red' : 'amber'} label="Oldest waiting" value={oldest ? aging(oldest).label : '—'} help={breached ? `${breached} item(s) over 48h` : 'Within 48h target'} />
      </div>

      <Tabs<TabId> value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[
        { id: 'docs', label: 'Vendor Documents', count: items.docs.length, icon: FileText },
        { id: 'new', label: 'New Listings', count: items.new.length, icon: FilePlus2 },
        { id: 'rev', label: 'Product Revisions', count: items.rev.length, icon: GitCompare },
      ]} />

      {list.length === 0 ? (
        <Card><EmptyState icon={CheckCircle2} title="Queue clear">Nothing waiting in this tab.</EmptyState></Card>
      ) : (
        <div className="review-layout">
          <Card pad={false} title={`${list.length} waiting · oldest first`}>
            <div style={{ maxHeight: 640, overflowY: 'auto' }}>
              {list.map((it) => {
                const ag = aging(it.at);
                const active = current?.key === it.key;
                if (it.kind === 'doc') {
                  return (
                    <button key={it.key} className={`queue-item ${active ? 'active' : ''}`} onClick={() => setSel(it.key)}>
                      <div className="tone-indigo" style={{ width: 34, height: 34, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><FileBadge size={16} /></div>
                      <div className="grow">
                        <div className="small bold">{it.doc.title} <span className="mono muted">v{latest(it.doc).v}</span></div>
                        <div className="xs muted">{it.vendorName}</div>
                      </div>
                      <Pill tone={ag.tone} icon={Clock}>{ag.label}</Pill>
                    </button>
                  );
                }
                const v = it.product.pending!;
                return (
                  <button key={it.key} className={`queue-item ${active ? 'active' : ''}`} onClick={() => setSel(it.key)}>
                    <ProductImage hue={v.hue} label={v.title} size={34} radius={9} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="small bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                      <div className="xs muted">{vendorById(it.product.vendorId)?.name} · <span className="mono">{it.product.sku}</span></div>
                      {it.product.live && <div className="xs" style={{ color: 'var(--warning)' }}>{changedFields(it.product.live, v).slice(0, 3).join(', ')}</div>}
                    </div>
                    <Pill tone={ag.tone} icon={Clock}>{ag.label}</Pill>
                  </button>
                );
              })}
            </div>
          </Card>

          {current?.kind === 'doc' && <DocReview key={current.key} item={current} onDecide={(s, r) => onDocDecision(current, s, r)} />}
          {current?.kind === 'product' && (
            <ProductReview key={current.key} product={current.product} me={me}
              gate={publishGate({ vendorId: current.product.vendorId, categoryId: current.product.categoryId, version: current.product.pending!, docs: docsForVendor(current.product.vendorId, onb.docs, otherDocs), novatexStatus })}
              onDecide={(ok, r) => onProductDecision(current.product, ok, r)} />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Document review ---------------- */

function DocReview({ item, onDecide }: { item: Extract<Item, { kind: 'doc' }>; onDecide: (s: DocStatus, reason: string) => void }) {
  const d = item.doc;
  const v = latest(d);
  const live = liveVersion(d);
  const ag = aging(item.at);
  const checks = d.kind === 'CERT' ? [
    { ok: !!v.expiryDate && daysBetween(TODAY, v.expiryDate) > 0, label: 'Expiry date is in the future', detail: v.expiryDate ? `${fmtDate(v.expiryDate)} · ${daysBetween(TODAY, v.expiryDate)} days left` : 'Missing' },
    { ok: !!v.issueDate && !!v.expiryDate && v.issueDate < v.expiryDate, label: 'Issue date before expiry', detail: v.issueDate ? fmtDate(v.issueDate) : 'Missing' },
    { ok: !!d.number, label: 'Certificate number present', detail: d.number ?? '—' },
  ] : [
    { ok: true, label: 'Number format valid', detail: d.number ?? '—' },
    { ok: true, label: 'Matches government record', detail: d.kind === 'BANK' ? 'Penny-drop name match' : 'Fetched from source' },
  ];
  return (
    <Card title={<>{d.title} <span className="mono muted">v{v.v}</span></>} sub={<>{item.vendorName} · uploaded {fmtDateTime(v.uploadedAt)}</>} actions={<Pill tone={ag.tone} icon={Clock}>Waiting {ag.label}</Pill>}>
      <div className="stack-16">
        <div className="grid g-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="doc-preview" role="img" aria-label={`Preview of ${v.fileName}`}>
              <div className="row-between"><b style={{ fontSize: 11, letterSpacing: '.08em' }}>{(d.certType ?? d.kind).toUpperCase()}</b><ShieldCheck size={18} style={{ color: 'var(--primary)' }} /></div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{d.kind === 'CERT' ? 'Certificate of Compliance' : d.title}</div>
              <div className="xs muted">Issued to</div>
              <div className="small bold">{item.vendorName}</div>
              <div className="xs mono">{d.number}</div>
              {[90, 76, 84, 60, 88, 70].map((w, i) => <div key={i} className="line" style={{ width: `${w}%` }} />)}
              {v.issueDate && <div className="xs" style={{ marginTop: 'auto' }}>Valid {fmtDate(v.issueDate)} – {v.expiryDate && fmtDate(v.expiryDate)}</div>}
            </div>
            <div className="xs muted" style={{ textAlign: 'center', marginTop: 6 }}>{v.fileName}</div>
          </div>
          <div className="stack-16">
            <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
              <dt>Vendor</dt><dd>{item.vendorName} <span className="mono muted xs">{item.vendorId}</span></dd>
              <dt>Type</dt><dd>{d.certType ?? d.kind}</dd>
              <dt>Number</dt><dd className="mono">{d.number ?? '—'}</dd>
              {v.issueDate && <><dt>Validity</dt><dd>{fmtDate(v.issueDate)} → {v.expiryDate && fmtDate(v.expiryDate)}</dd></>}
              <dt>Version</dt><dd className="mono">v{v.v}{live && live !== v ? ` (replaces live v${live.v})` : ''}</dd>
            </dl>
            <div>
              <div className="caps muted" style={{ marginBottom: 6 }}>Automatic checks</div>
              {checks.map((c) => (
                <div key={c.label} className="row small" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
                  {c.ok ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <XCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                  <div><div>{c.label}</div><div className="xs muted">{c.detail}</div></div>
                </div>
              ))}
            </div>
            {d.versions.length > 1 && (
              <div>
                <div className="caps muted" style={{ marginBottom: 6 }}>Earlier versions</div>
                {d.versions.slice(0, -1).reverse().map((pv) => (
                  <div key={pv.v} className="xs" style={{ marginBottom: 4 }}>
                    <span className="mono">v{pv.v}</span> · {pv.status}{pv.expiryDate && ` · exp. ${fmtDate(pv.expiryDate)}`}{pv.reason && <span className="muted"> · “{pv.reason}”</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DecisionBox
          options={[
            { id: 'Approved', label: 'Approve', icon: CheckCircle2, tone: 'success', needsReason: false },
            { id: 'On Hold', label: 'On Hold', icon: PauseCircle, tone: 'warning', needsReason: true },
            { id: 'Rejected', label: 'Reject', icon: XCircle, tone: 'danger', needsReason: true },
          ]}
          onSubmit={(id, r) => onDecide(id as DocStatus, r)}
        />
      </div>
    </Card>
  );
}

/* ---------------- Product review ---------------- */

function ProductReview({ product: p, gate, me, onDecide }: {
  product: Product; gate: ReturnType<typeof publishGate>; me: string; onDecide: (ok: boolean, reason: string) => void;
}) {
  const v = p.pending!;
  const [onlyChanged, setOnlyChanged] = useState(false);
  const changes = p.live ? changedFields(p.live, v) : [];
  const gateOk = gate.every((g) => g.ok);
  const lastSubmitter = [...p.history].reverse().find((h) => h.action.includes('ubmitted'))?.by ?? '';
  const selfSubmitted = lastSubmitter === me;
  const ag = aging(v.submittedAt);

  return (
    <div className="stack-16">
      <Card title={v.title} sub={<>{vendorById(p.vendorId)?.name} · <span className="mono">{p.sku}</span> · {categoryById(p.categoryId)?.name}</>}
        actions={<div className="row"><Pill tone={p.live ? 'blue' : 'violet'}>{p.live ? `Revision v${p.live.v} → v${v.v}` : 'New listing'}</Pill><Pill tone={ag.tone} icon={Clock}>{ag.label}</Pill></div>}>
        <div className="stack-12">
          <div className="caps muted">Publish gate</div>
          <div className="grid g-2" style={{ gap: 8 }}>
            {gate.map((g) => (
              <div key={g.label} className="row small" style={{ alignItems: 'flex-start', padding: '8px 10px', borderRadius: 'var(--radius)', background: g.ok ? 'var(--success-50)' : 'var(--danger-50)' }}>
                {g.ok ? <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <XCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
                <div><div className="bold">{g.label}</div><div className="xs" style={{ color: 'var(--text-2)' }}>{g.detail}</div></div>
              </div>
            ))}
          </div>
          {!gateOk && <Banner tone="danger" lead="Can't publish yet.">Every gate check must pass. You can still reject with a reason, or wait for the vendor or Admin to fix the blocker.</Banner>}
          {p.live && changes.length > 0 && <div className="row wrap"><span className="xs muted">Changed:</span>{changes.map((c) => <Pill key={c} tone="amber">{c}</Pill>)}</div>}
          {v.discount && <Banner tone="info" lead="Proposed discount">({v.discount.pct}%) is approved separately by Admin in Coupons. Publishing here does not activate it.</Banner>}
        </div>
      </Card>

      <Card title={p.live ? 'Old vs new' : 'Proposed listing'} pad={false}
        actions={p.live && <label className="check xs"><input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} /> Only changed fields</label>}>
        <ProductDiff before={p.live} after={v} categoryId={p.categoryId} onlyChanged={onlyChanged} />
      </Card>

      <Card>
        {selfSubmitted ? <Banner tone="danger" lead="Self-approval blocked.">You submitted this item, so another approver must review it.</Banner> : (
          <DecisionBox
            approveDisabled={!gateOk}
            approveHint={!gateOk ? 'Blocked by publish gate' : undefined}
            options={[
              { id: 'approve', label: 'Approve & Publish', icon: Send, tone: 'success', needsReason: false },
              { id: 'reject', label: 'Reject', icon: XCircle, tone: 'danger', needsReason: true },
            ]}
            onSubmit={(id, r) => onDecide(id === 'approve', r)}
            footnote={p.live ? `Rejecting keeps live v${p.live.v} unchanged.` : 'Rejected listings stay hidden from buyers.'}
          />
        )}
      </Card>
    </div>
  );
}

/* ---------------- Decision box (reason mandatory when required) ---------------- */

function DecisionBox({ options, onSubmit, approveDisabled, approveHint, footnote }: {
  options: { id: string; label: string; icon: typeof CheckCircle2; tone: 'success' | 'warning' | 'danger'; needsReason: boolean }[];
  onSubmit: (id: string, reason: string) => void; approveDisabled?: boolean; approveHint?: string; footnote?: string;
}) {
  const [choice, setChoice] = useState<string>('');
  const [reason, setReason] = useState('');
  const opt = options.find((o) => o.id === choice);
  const needs = !!opt?.needsReason;
  const ok = !!opt && (!needs || reason.trim().length >= 10) && !(choice === options[0].id && approveDisabled);
  const color = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' };
  return (
    <div className="stack-12">
      <div className="caps muted">Decision</div>
      <div className="row wrap">
        {options.map((o, i) => {
          const dis = i === 0 && approveDisabled;
          const on = choice === o.id;
          return (
            <button key={o.id} disabled={dis} title={dis ? approveHint : ''} onClick={() => setChoice(o.id)} className="btn"
              style={{ border: `1.5px solid ${on ? color[o.tone] : 'var(--slate-200)'}`, background: on ? color[o.tone] : 'var(--card)', color: on ? 'var(--on-status)' : color[o.tone] }}>
              <o.icon size={15} /> {o.label}
            </button>
          );
        })}
      </div>
      {opt && (
        <div className="field">
          <label htmlFor="dr">{needs ? <>Reason for vendor <span style={{ color: 'var(--danger)' }}>*</span></> : 'Note (optional)'}</label>
          <textarea id="dr" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={needs ? 'Say exactly what the vendor must fix. They see this note.' : 'Internal note for the audit log'} />
          {needs && <span className="hint">Minimum 10 characters · shown to the vendor and stored in the audit log</span>}
        </div>
      )}
      <div className="row-between wrap">
        <span className="xs muted">{footnote ?? 'Decisions are final and recorded in the immutable history.'}</span>
        <button className="btn btn-primary" disabled={!ok} onClick={() => { onSubmit(choice, reason.trim()); setChoice(''); setReason(''); }}>
          {opt ? `Confirm: ${opt.label}` : 'Choose a decision'}
        </button>
      </div>
      {approveDisabled && <div className="xs row" style={{ color: 'var(--danger)' }}><AlertTriangle size={12} /> {approveHint}</div>}
    </div>
  );
}
