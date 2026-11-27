import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, Send } from 'lucide-react';
import { Banner, Card, Dropzone, EmptyState, FileChip, PageHeader } from '../../components/ui';
import type { UploadedFile } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { ReturnCountdown } from '../../components/OrderBits';
import { vendorById } from '../../data/vendors';
import { inr, num } from '../../lib/format';
import { addBusinessDays, useOrders } from '../../lib/orders';
import { DAMAGE_REASONS, useCases } from '../../lib/cases';
import type { CaseLine } from '../../lib/cases';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';

export default function RaiseClaim() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { orders, setStatus } = useOrders();
  const { cases, create } = useCases();
  const toast = useToast();
  const { log } = useAudit();

  /** Eligible = mine, delivered, inside the window, no open case on it. */
  const eligible = useMemo(() => orders.filter((o) => o.customerId === user?.customerId).flatMap((o) => o.subOrders)
    .filter((s) => s.delivery && s.returnWindowEnds && new Date(s.returnWindowEnds).getTime() > Date.now()
      && !cases.some((c) => c.subOrderId === s.id && c.status !== 'Resolved' && c.status !== 'Rejected')), [orders, cases, user]);

  const [soId, setSoId] = useState(params.get('so') ?? eligible[0]?.id ?? '');
  const so = eligible.find((s) => s.id === soId);
  const [qty, setQty] = useState<Record<string, { damaged: number; refund: number }>>({});
  const [reason, setReason] = useState(DAMAGE_REASONS[0]);
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [touched, setTouched] = useState(false);

  if (eligible.length === 0) {
    return (
      <div className="container">
        <PageHeader icon={RotateCcw} title="Raise Damage Claim" />
        <div className="card"><EmptyState icon={RotateCcw} title="No sub-orders are eligible right now" action={<Link to="/account/orders" className="btn btn-secondary btn-sm">My Orders</Link>}>
          Claims can be raised only on delivered sub-orders inside the return window, with no claim already open.
        </EmptyState></div>
      </div>
    );
  }

  /** Units already claimed on earlier (non-rejected) cases. */
  const claimed = (productId: string) => cases.filter((c) => c.subOrderId === soId && c.status !== 'Rejected')
    .reduce((s, c) => s + (c.lines.find((l) => l.productId === productId)?.damagedQty ?? 0), 0);

  const lines: CaseLine[] = so ? so.lines.map((l) => {
    const q = qty[l.productId] ?? { damaged: 0, refund: 0 };
    return { productId: l.productId, title: l.title, unit: l.unit, unitPrice: l.unitPrice, gstRate: l.gstRate, deliveredQty: l.qty, damagedQty: q.damaged, refundQty: Math.min(q.refund, q.damaged), replaceQty: Math.max(0, q.damaged - q.refund) };
  }) : [];
  const errs: string[] = [];
  lines.forEach((l) => { const max = l.deliveredQty - claimed(l.productId); if (l.damagedQty > max) errs.push(`${l.title}: at most ${num(max)} ${l.unit} can be claimed`); });
  if (lines.every((l) => l.damagedQty <= 0)) errs.push('Enter the damaged quantity for at least one product');
  if (desc.trim().length < 20) errs.push('Describe the damage (at least 20 characters)');
  if (files.length === 0) errs.push('Upload at least one photo or video as evidence');
  const refundValue = lines.reduce((s, l) => s + l.refundQty * l.unitPrice * (1 + l.gstRate / 100), 0);

  const submit = () => {
    setTouched(true);
    if (errs.length || !so) return;
    const c = create({
      orderId: so.orderId, subOrderId: so.id, customerId: so.customerId, vendorId: so.vendorId, reason, description: desc.trim(),
      evidence: files.map((f) => f.name), lines: lines.filter((l) => l.damagedQty > 0), by: `${user?.name} (${user?.org})`,
      vendorRespondBy: addBusinessDays(new Date().toISOString(), 2),
    });
    setStatus(so.id, 'Disputed', `Damage claim ${c.id} raised`);
    log({ action: 'Damage claim raised', entity: `${c.id} on ${so.id}`, newValue: `${lines.reduce((s, l) => s + l.damagedQty, 0)} unit(s)` });
    toast('success', `Claim ${c.id} submitted`, `Ticket ${c.ticketId}. The vendor has 2 business days to respond.`);
    nav('/account/cases');
  };

  return (
    <div className="container stack-16" style={{ maxWidth: 940 }}>
      <PageHeader icon={RotateCcw} title="Raise Damage Claim" subtitle="Only the damaged quantity is eligible. Choose a refund or a replacement for each unit." />
      <Banner tone="info" lead="How it works:">the vendor has 2 business days to respond, after which the case escalates to TrimNova Support, whose decision is final. Replacements ship as a new linked order. Refunds go to the original payment method (refund timeline TBD).</Banner>

      <Card title="1. Sub-order">
        <div className="stack-12">
          <select className="select" value={soId} onChange={(e) => { setSoId(e.target.value); setQty({}); }} aria-label="Sub-order">
            {eligible.map((s) => <option key={s.id} value={s.id}>{s.id} · {vendorById(s.vendorId)?.name} · {s.orderId}</option>)}
          </select>
          {so && <ReturnCountdown ends={so.returnWindowEnds} />}
        </div>
      </Card>

      {so && (
        <Card title="2. Damaged quantity & remedy per unit" pad={false}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Product</th><th className="right">Delivered</th><th className="right">Claimable</th><th>Damaged</th><th>Refund</th><th className="right">Replace</th></tr></thead>
              <tbody>
                {so.lines.map((l) => {
                  const max = l.qty - claimed(l.productId);
                  const q = qty[l.productId] ?? { damaged: 0, refund: 0 };
                  const set = (patch: Partial<typeof q>) => setQty((x) => ({ ...x, [l.productId]: { ...q, ...patch } }));
                  return (
                    <tr key={l.productId}>
                      <td><div className="row"><ProductImage hue={l.hue} label={l.title} size={34} /><div><div className="t-name">{l.title}</div><div className="t-sub mono">{l.sku}</div></div></div></td>
                      <td className="num">{num(l.qty)}</td>
                      <td className="num">{num(max)}</td>
                      <td style={{ width: 130 }}><input type="number" min={0} max={max} className={`input mono ${q.damaged > max ? 'invalid' : ''}`} style={{ height: 32 }} value={q.damaged || ''}
                        onChange={(e) => { const d = Math.max(0, +e.target.value); set({ damaged: d, refund: Math.min(q.refund || d, d) }); }} /></td>
                      <td style={{ width: 130 }}><input type="number" min={0} max={q.damaged} className="input mono" style={{ height: 32 }} value={q.damaged ? Math.min(q.refund, q.damaged) : ''} disabled={!q.damaged}
                        onChange={(e) => set({ refund: Math.min(q.damaged, Math.max(0, +e.target.value)) })} /></td>
                      <td className="num">{num(Math.max(0, q.damaged - Math.min(q.refund, q.damaged)))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="row-between" style={{ padding: '10px 20px' }}>
            <span className="xs muted">Short or wrong items aren't damage. Contact Support for those.</span>
            <span className="small">Refund value (incl. GST): <b className="mono">{inr(refundValue)}</b></span>
          </div>
        </Card>
      )}

      <Card title="3. What happened">
        <div className="stack-12">
          <div className="field"><label htmlFor="rs">Damage type</label><select id="rs" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>{DAMAGE_REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="field"><label htmlFor="ds">Description</label><textarea id="ds" className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is damaged, how many cartons, and when you found it" /></div>
          <div className="label">Photo / video evidence</div>
          <Dropzone accept=".jpg,.jpeg,.png,.mp4,.mov" hint="JPG, PNG, MP4 or MOV · up to 10 files · include the carton label with the AWB" label="Drag & drop photos or videos" onFiles={(f) => setFiles((x) => [...x, ...f].slice(0, 10))} />
          {files.map((f, i) => <FileChip key={f.name + i} file={f} onRemove={() => setFiles((x) => x.filter((_, j) => j !== i))} />)}
        </div>
      </Card>

      {touched && errs.length > 0 && <Banner tone="danger" lead="Please fix:">{errs.join(' · ')}</Banner>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Link to="/account/orders" className="btn btn-secondary">Cancel</Link>
        <button className="btn btn-primary btn-lg" onClick={submit}><Send size={15} /> Submit claim</button>
      </div>
    </div>
  );
}
