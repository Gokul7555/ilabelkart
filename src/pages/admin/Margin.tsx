import { Fragment, useState } from 'react';
import { CalendarClock, History, Lock, Pencil, Percent, X } from 'lucide-react';
import { Banner, Card, Modal, PageHeader, Pill } from '../../components/ui';
import { CATEGORIES, CLASSIFICATIONS } from '../../data/categories';
import type { Category } from '../../data/categories';
import { fmtDate, fmtDateTime, inr } from '../../lib/format';
import { useAdmin } from '../../lib/admin';
import { useCatalog } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function Margin() {
  const { commission, setCommission, cancelScheduled } = useAdmin();
  const { products } = useCatalog();
  const [edit, setEdit] = useState<Category | null>(null);
  const history = Object.entries(commission).flatMap(([id, c]) => c.history.map((h) => ({ ...h, id }))).sort((a, b) => b.at.localeCompare(a.at));
  const { log } = useAudit();
  const toast = useToast();

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={Percent} title="Margin Manager" subtitle="TrimNova commission by category, with effective dates. Customer price = vendor base price + category commission." />
      <Banner tone="info" icon={Lock} lead="Category-level only.">There are no vendor-level or product-level overrides anywhere on the platform. A change applies to every vendor in the category from its effective date. Orders already placed keep their price.</Banner>

      <Card pad={false}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Category</th><th className="right">Live listings</th><th className="right">Commission</th><th>Scheduled change</th><th className="right">₹100 base → buyer</th><th></th></tr></thead>
            <tbody>
              {CLASSIFICATIONS.map((cl) => (
                <Fragment key={cl.id}>
                  <tr><td colSpan={6} style={{ background: 'var(--surface-2)' }}><span className="row small bold"><span style={{ width: 10, height: 10, borderRadius: 'var(--radius-sm)', background: 'var(--primary)' }} />{cl.name}</span></td></tr>
                  {CATEGORIES.filter((c) => c.classification === cl.id).map((c) => {
                    const st = commission[c.id];
                    const live = products.filter((p) => p.categoryId === c.id && p.live).length;
                    return (
                      <tr key={c.id}>
                        <td style={{ paddingLeft: 30 }}><div className="t-name">{c.name}</div><div className="t-sub">HSN {c.hsn} · {c.products} platform listings</div></td>
                        <td className="num">{live}</td>
                        <td className="num"><b style={{ fontSize: 14 }}>{st.pct.toFixed(1)}%</b></td>
                        <td>{st.scheduled ? (
                          <div className="row"><Pill tone="blue" icon={CalendarClock}>{st.scheduled.pct.toFixed(1)}% from {fmtDate(st.scheduled.effective)}</Pill>
                            <button className="icon-btn light" style={{ width: 24, height: 24 }} aria-label="Cancel scheduled change" onClick={() => { cancelScheduled(c.id); log({ action: 'Scheduled commission change cancelled', entity: `Category: ${c.name}`, oldValue: `${st.scheduled!.pct}% from ${st.scheduled!.effective}` }); toast('info', 'Scheduled change cancelled'); }}><X size={12} /></button></div>
                        ) : <span className="xs muted">—</span>}</td>
                        <td className="num">{inr(100 * (1 + st.pct / 100))}</td>
                        <td className="right"><button className="btn btn-secondary btn-xs" onClick={() => setEdit(c)}><Pencil size={12} /> Change</button></td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Change history" icon={History} pad={false}>
        {history.length === 0 ? <div className="small muted" style={{ padding: '14px 20px' }}>No commission changes yet in this demo. The audit log holds earlier changes (e.g. Zippers & Sliders 8.0% → 8.5%).</div> : (
          <table className="tbl">
            <thead><tr><th>When</th><th>Category</th><th className="right">From → To</th><th>Effective</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>{history.map((h, i) => (
              <tr key={i}><td className="small nowrap">{fmtDateTime(h.at)}</td><td className="small">{CATEGORIES.find((c) => c.id === h.id)?.name}</td><td className="num">{h.from.toFixed(1)}% → {h.to.toFixed(1)}%</td><td className="small">{fmtDate(h.effective)}</td><td className="xs">{h.reason}</td><td className="xs muted">{h.by}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>

      {edit && <EditModal cat={edit} current={commission[edit.id].pct} live={products.filter((p) => p.categoryId === edit.id && p.live).length} onClose={() => setEdit(null)}
        onSave={(pct, eff, reason, by) => {
          setCommission(edit.id, pct, eff, reason, by);
          log({ action: eff <= new Date().toISOString().slice(0, 10) ? 'Commission updated' : 'Commission change scheduled', entity: `Category: ${edit.name}`, oldValue: `${commission[edit.id].pct.toFixed(1)}%`, newValue: `${pct.toFixed(1)}% from ${fmtDate(eff)}`, reason });
          toast('success', 'Commission saved', `${edit.name}: ${pct.toFixed(1)}% from ${fmtDate(eff)}`);
        }} />}
    </div>
  );
}

function EditModal({ cat, current, live, onClose, onSave }: { cat: Category; current: number; live: number; onClose: () => void; onSave: (pct: number, eff: string, reason: string, by: string) => void }) {
  const { user } = useAuth();
  const [pct, setPct] = useState(String(current));
  const [eff, setEff] = useState(tomorrow());
  const [reason, setReason] = useState('');
  const n = +pct;
  const today = new Date().toISOString().slice(0, 10);
  const ok = n >= 0 && n <= 30 && n !== current && eff >= today && reason.trim().length >= 10;
  return (
    <Modal open onClose={onClose} title={`Commission · ${cat.name}`} icon={Percent}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => { onSave(n, eff, reason.trim(), `${user?.name} (${user?.id})`); onClose(); }}>{eff <= today ? 'Apply now' : 'Schedule change'}</button></>}>
      <div className="stack-12">
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field"><label htmlFor="cp">New commission %</label><input id="cp" type="number" step="0.1" min={0} max={30} className="input mono" value={pct} onChange={(e) => setPct(e.target.value)} /><span className="hint">Current {current.toFixed(1)}% · allowed 0–30%</span></div>
          <div className="field"><label htmlFor="ce">Effective date</label><input id="ce" type="date" min={today} className="input" value={eff} onChange={(e) => setEff(e.target.value)} /><span className="hint">{eff <= today ? 'Applies immediately' : 'Scheduled'}</span></div>
        </div>
        {n >= 0 && n !== current && (
          <Banner tone="warning" lead="Impact:">a ₹100.00 base price becomes {inr(100 * (1 + n / 100))} for buyers (was {inr(100 * (1 + current / 100))}). This affects {live} live listing(s) in this demo ({cat.products} platform-wide) and every vendor in the category equally. Placed orders don't change.</Banner>
        )}
        <div className="field"><label htmlFor="cr">Reason <span style={{ color: 'var(--danger)' }}>*</span></label><textarea id="cr" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Quarterly margin review; aligns with logistics cost increase" /></div>
      </div>
    </Modal>
  );
}
