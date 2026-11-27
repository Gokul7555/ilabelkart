import { useState } from 'react';
import { CheckCircle2, Pause, Play, Plus, Ticket, XCircle } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, Modal, PageHeader, Pill, StatusPill, Tabs } from '../../components/ui';
import { CATEGORIES } from '../../data/categories';
import { vendorById } from '../../data/vendors';
import { fmtDate, inr } from '../../lib/format';
import { useAdmin } from '../../lib/admin';
import type { Coupon } from '../../lib/admin';
import { useCatalog, customerPrice } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

type T = 'vendor' | 'platform';

export default function Coupons() {
  const { coupons, upsertCoupon } = useAdmin();
  const { products } = useCatalog();
  const { log } = useAudit();
  const toast = useToast();
  const [tab, setTab] = useState<T>('vendor');
  const [act, setAct] = useState<{ c: Coupon; to: Coupon['status'] } | null>(null);
  const [create, setCreate] = useState(false);
  const list = coupons.filter((c) => (tab === 'vendor' ? c.kind === 'Vendor discount' : c.kind === 'Platform coupon'));

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={Ticket} title="Coupons & Discounts" subtitle="Approve vendor-proposed discounts and run platform coupons. Every row shows who funds it."
        actions={<button className="btn btn-primary btn-sm" onClick={() => setCreate(true)}><Plus size={14} /> New platform coupon</button>} />
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'vendor', label: 'Vendor-proposed discounts', count: coupons.filter((c) => c.kind === 'Vendor discount' && c.status === 'Pending').length },
        { id: 'platform', label: 'Platform coupons', count: coupons.filter((c) => c.kind === 'Platform coupon').length },
      ]} />
      {tab === 'vendor' && <Banner tone="info" lead="Vendor-funded.">The discount comes out of the vendor's base price; TrimNova commission is still calculated on the category rate. Nothing goes live until you approve.</Banner>}
      {tab === 'platform' && <Banner tone="warning" lead="TrimNova-funded.">Platform coupons reduce the buyer's total and are paid from TrimNova commission. Vendor payouts are unaffected. Co-funded splits are TBD.</Banner>}

      <Card pad={false}>
        <table className="tbl">
          <thead><tr><th>Offer</th><th>{tab === 'vendor' ? 'Vendor · product' : 'Code'}</th><th className="right">Value</th><th>Validity</th><th>Funded by</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((c) => {
            const p = products.find((x) => x.id === c.productId);
            const price = p?.live ? customerPrice(p.live.tiers[0].price, p.categoryId) : undefined;
            return (
              <tr key={c.id}>
                <td><div className="t-name">{c.title}</div><div className="t-sub mono">{c.id}</div></td>
                <td className="small">{tab === 'vendor' ? <>{vendorById(c.vendorId ?? '')?.name}<div className="t-sub mono">{p?.sku}</div></> : <span className="mono bold">{c.code}</span>}</td>
                <td className="num">{c.pct ? `${c.pct}%` : inr(c.flat ?? 0, { decimals: 0 })}{c.maxDiscount && <div className="xs muted">max {inr(c.maxDiscount, { decimals: 0 })}</div>}{c.minOrder && <div className="xs muted">min order {inr(c.minOrder, { decimals: 0 })}</div>}{price && c.pct && <div className="xs muted">{inr(price)} → {inr(price * (1 - c.pct / 100))}</div>}</td>
                <td className="small nowrap">{fmtDate(c.from)} → {fmtDate(c.to)}</td>
                <td><Pill tone={c.fundedBy === 'Vendor' ? 'orange' : c.fundedBy === 'TrimNova' ? 'indigo' : 'grey'}>{c.fundedBy}</Pill></td>
                <td><StatusPill status={c.status === 'Paused' ? 'On Hold' : c.status} />{c.reason && <div className="xs muted" style={{ maxWidth: 200 }}>{c.reason}</div>}</td>
                <td className="right nowrap">
                  {c.status === 'Pending' && <><button className="btn btn-success btn-xs" onClick={() => setAct({ c, to: 'Approved' })}><CheckCircle2 size={12} /> Approve</button>{' '}<button className="btn btn-outline-danger btn-xs" onClick={() => setAct({ c, to: 'Rejected' })}><XCircle size={12} /> Reject</button></>}
                  {c.status === 'Approved' && <button className="btn btn-secondary btn-xs" onClick={() => setAct({ c, to: 'Paused' })}><Pause size={12} /> Pause</button>}
                  {c.status === 'Paused' && <button className="btn btn-secondary btn-xs" onClick={() => setAct({ c, to: 'Approved' })}><Play size={12} /> Resume</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>

      <ConfirmWithReason open={!!act} onClose={() => setAct(null)} danger={act?.to === 'Rejected'} title={`${act?.to === 'Approved' ? 'Approve' : act?.to === 'Rejected' ? 'Reject' : 'Pause'} ${act?.c.id ?? ''}?`} confirmLabel="Confirm"
        description={act?.c.kind === 'Vendor discount' && act.to === 'Approved' ? 'Funded by the vendor. It goes live on its start date and is shown to buyers as a discount.' : undefined}
        onConfirm={(r) => { if (!act) return; upsertCoupon({ ...act.c, status: act.to, reason: r }); log({ action: `Discount ${act.to.toLowerCase()}`, entity: `${act.c.id} · ${act.c.title}`, oldValue: act.c.status, newValue: act.to, reason: r }); toast('success', `${act.c.id}: ${act.to}`); }} />
      {create && <CreateCoupon onClose={() => setCreate(false)} onSave={(c) => { upsertCoupon(c); log({ action: 'Platform coupon created', entity: `${c.id} · ${c.code}`, newValue: c.pct ? `${c.pct}%` : inr(c.flat ?? 0) }); toast('success', 'Coupon created', c.code); setTab('platform'); }} />}
    </div>
  );
}

function CreateCoupon({ onClose, onSave }: { onClose: () => void; onSave: (c: Coupon) => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ title: '', code: '', type: 'pct' as 'pct' | 'flat', value: '', max: '', min: '', from: '', to: '', category: '' });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const ok = f.title.trim().length > 3 && /^[A-Z0-9]{4,16}$/.test(f.code) && +f.value > 0 && (f.type === 'flat' || +f.value <= 50) && f.from && f.to > f.from;
  return (
    <Modal open onClose={onClose} title="New platform coupon" icon={Ticket}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { onSave({
        id: `CPN-2026-0${Math.floor(13 + Math.random() * 80)}`, kind: 'Platform coupon', title: f.title.trim() + (f.category ? ` (${CATEGORIES.find((c) => c.id === f.category)?.name})` : ''), code: f.code,
        pct: f.type === 'pct' ? +f.value : undefined, flat: f.type === 'flat' ? +f.value : undefined, maxDiscount: f.max ? +f.max : undefined, minOrder: f.min ? +f.min : undefined,
        from: f.from, to: f.to, fundedBy: 'TrimNova', status: 'Approved', createdAt: new Date().toISOString(), createdBy: `${user?.name} (${user?.id})`,
      }); onClose(); }}>Create coupon</button></>}>
      <div className="grid g-2" style={{ gap: 12 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="ct">Title</label><input id="ct" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
        <div className="field"><label htmlFor="cc">Code</label><input id="cc" className="input mono" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="TRIMNEW15" /></div>
        <div className="field"><label htmlFor="cty">Type</label><select id="cty" className="select" value={f.type} onChange={(e) => set('type', e.target.value)}><option value="pct">Percentage</option><option value="flat">Flat ₹</option></select></div>
        <div className="field"><label htmlFor="cv">{f.type === 'pct' ? 'Percent (max 50)' : 'Amount ₹'}</label><input id="cv" type="number" className="input mono" value={f.value} onChange={(e) => set('value', e.target.value)} /></div>
        <div className="field"><label htmlFor="cm">Max discount ₹ (optional)</label><input id="cm" type="number" className="input mono" value={f.max} onChange={(e) => set('max', e.target.value)} /></div>
        <div className="field"><label htmlFor="cmin">Min order ₹ (optional)</label><input id="cmin" type="number" className="input mono" value={f.min} onChange={(e) => set('min', e.target.value)} /></div>
        <div className="field"><label htmlFor="ccat">Category (optional)</label><select id="ccat" className="select" value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label htmlFor="cf">From</label><input id="cf" type="date" className="input" value={f.from} onChange={(e) => set('from', e.target.value)} /></div>
        <div className="field"><label htmlFor="cto">To</label><input id="cto" type="date" className="input" value={f.to} onChange={(e) => set('to', e.target.value)} /></div>
        <div style={{ gridColumn: '1 / -1' }}><Pill tone="indigo">Funded by TrimNova</Pill></div>
      </div>
    </Modal>
  );
}
