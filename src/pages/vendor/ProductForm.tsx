import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Boxes, Eye, FileText, Image as ImageIcon, IndianRupee, Layers, ListChecks, Palette, Plus, Save, Send, Tag, Trash2, Truck, Zap,
} from 'lucide-react';
import { Banner, Card, Dropzone, FileChip, PageHeader, Pill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { CATEGORY_ATTRS, GST_RATE, categoryById } from '../../data/categories';
import { NOVATEX_CATEGORIES } from '../../data/vendors';
import { TRIMINSTA_HUBS } from '../../data/india';
import { fmtDate, inr, num } from '../../lib/format';
import { changedFields, customerPrice, totalStock, useCatalog, workingVersion } from '../../lib/catalog';
import type { ProductVersion, Shade, StockLine, Tier } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useOnboarding } from '../../lib/onboarding';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';
import { Switch } from './onboarding/shared';

const UNITS = ['pcs', 'm', 'cone', 'roll', 'set', 'kg'];

interface Form {
  sku: string; categoryId: string; title: string; hsn: string; unit: string; description: string;
  moq: number; packMultiple: number; tiers: Tier[]; shades: Shade[]; attributes: Record<string, string>;
  specs: { k: string; v: string }[]; images: string[]; hue: number; tds?: string;
  discountOn: boolean; discount: { pct: number; from: string; to: string };
  leadTimeDays: number; insta: boolean; stock: StockLine[];
}

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { products, saveVersion, updateStock } = useCatalog();
  const { data: onb } = useOnboarding();
  const toast = useToast();
  const { log } = useAudit();

  const product = id ? products.find((p) => p.id === id && p.vendorId === user?.vendorId) : undefined;
  const approvedCats = NOVATEX_CATEGORIES.filter((c) => c.status === 'Approved').map((c) => c.categoryId);
  const hubLocs = onb.insta.optIn ? onb.insta.hubs.map((h) => `${h} · ${TRIMINSTA_HUBS.find((x) => x.id === h)?.name.split('·').pop()?.trim() ?? h}`) : [];

  const initial = useMemo<Form>(() => {
    const v = product ? workingVersion(product) : undefined;
    if (product && v) {
      return {
        sku: product.sku, categoryId: product.categoryId, title: v.title, hsn: v.hsn, unit: v.unit, description: v.description,
        moq: v.moq, packMultiple: v.packMultiple, tiers: v.tiers.map((t) => ({ ...t })), shades: v.shades.map((s) => ({ ...s })),
        attributes: { ...v.attributes }, specs: v.specs.map((s) => ({ ...s })), images: [...v.images], hue: v.hue, tds: v.tds,
        discountOn: !!v.discount, discount: v.discount ? { pct: v.discount.pct, from: v.discount.from, to: v.discount.to } : { pct: 5, from: '', to: '' },
        leadTimeDays: v.leadTimeDays, insta: v.insta, stock: product.stock.map((s) => ({ ...s })),
      };
    }
    const cat = approvedCats[0] ?? 'woven-labels';
    return {
      sku: '', categoryId: cat, title: '', hsn: categoryById(cat)?.hsn ?? '', unit: 'pcs', description: '',
      moq: 100, packMultiple: 100, tiers: [{ min: 100, price: 0 }, { min: 500, price: 0 }, { min: 2000, price: 0 }],
      shades: [], attributes: {}, specs: [{ k: '', v: '' }], images: [], hue: Math.floor(Math.random() * 360),
      discountOn: false, discount: { pct: 5, from: '', to: '' }, leadTimeDays: 3, insta: false,
      stock: [{ loc: 'Factory · Mumbai', qty: 0 }, ...hubLocs.map((l) => ({ loc: l, qty: 0 }))],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const [f, setF] = useState<Form>(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  if (id && !product) return <Navigate to="/vendor/catalog" replace />;

  const isLive = !!product?.live;
  const cat = categoryById(f.categoryId)!;
  const attrs = CATEGORY_ATTRS[f.categoryId] ?? [];
  const tiers: Tier[] = f.tiers.map((t, i) => (i === 0 ? { ...t, min: f.moq } : t));
  const gst = GST_RATE[f.categoryId] ?? 12;

  /* ---------- validation ---------- */
  const errs: Record<string, string> = {};
  const otherSkus = products.filter((p) => p.vendorId === user?.vendorId && p.id !== product?.id).map((p) => p.sku);
  if (!/^[A-Z0-9-]{4,20}$/.test(f.sku)) errs.sku = '4–20 characters: A–Z, 0–9 and hyphens';
  else if (otherSkus.includes(f.sku)) errs.sku = 'You already have a product with this SKU';
  if (!approvedCats.includes(f.categoryId)) errs.categoryId = 'You are not approved for this category';
  if (f.title.trim().length < 10) errs.title = 'At least 10 characters';
  if (!/^\d{4,8}$/.test(f.hsn)) errs.hsn = 'HSN must be 4–8 digits';
  if (f.description.trim().length < 30) errs.description = 'At least 30 characters';
  if (f.images.length === 0) errs.images = 'Add at least one photo';
  if (!(f.moq > 0)) errs.moq = 'MOQ must be at least 1';
  if (!(f.packMultiple > 0)) errs.packMultiple = 'Pack multiple must be at least 1';
  else if (f.moq % f.packMultiple !== 0) errs.moq = `MOQ must be a multiple of the pack size (${f.packMultiple})`;
  tiers.forEach((t, i) => {
    if (!(t.price > 0)) errs[`tier${i}`] = 'Enter a price';
    else if (i > 0 && t.min <= tiers[i - 1].min) errs[`tier${i}`] = 'Quantity must be higher than the previous tier';
    else if (i > 0 && t.price > tiers[i - 1].price) errs[`tier${i}`] = 'Higher volume can’t cost more per unit';
    else if (i > 0 && t.min % f.packMultiple !== 0) errs[`tier${i}`] = `Use a multiple of ${f.packMultiple}`;
  });
  attrs.forEach((a) => { if (!f.attributes[a.key]?.trim()) errs[`attr_${a.key}`] = 'Required'; });
  if (f.discountOn && (!(f.discount.pct >= 1 && f.discount.pct <= 50) || !f.discount.from || !f.discount.to || f.discount.to <= f.discount.from)) errs.discount = '1–50% with a valid date range';
  if (!(f.leadTimeDays >= 1 && f.leadTimeDays <= 30)) errs.leadTimeDays = '1–30 days';
  if (f.insta && !onb.insta.optIn) errs.insta = 'Opt in to TrimInsta from Onboarding / Capabilities first';
  const valid = Object.keys(errs).length === 0;
  const E = (k: string) => (touched && errs[k] ? <span className="err">{errs[k]}</span> : null);
  const inv = (k: string) => (touched && errs[k] ? 'invalid' : '');

  /* ---------- change detection ---------- */
  const version: Omit<ProductVersion, 'v' | 'submittedAt'> = {
    title: f.title.trim(), hsn: f.hsn, description: f.description.trim(), unit: f.unit, moq: f.moq, packMultiple: f.packMultiple,
    tiers, shades: f.shades.filter((s) => s.name.trim()), attributes: f.attributes, specs: f.specs.filter((s) => s.k.trim() && s.v.trim()),
    images: f.images, hue: f.hue, tds: f.tds, leadTimeDays: f.leadTimeDays, insta: f.insta,
    discount: f.discountOn ? { ...f.discount, status: 'Pending' } : undefined,
  };
  const compareTo = product?.pending ?? product?.live;
  const changes = compareTo ? changedFields(compareTo, { ...version, v: 0, submittedAt: '' }) : [];
  const stockChanged = !!product && JSON.stringify(product.stock) !== JSON.stringify(f.stock);
  const stockOnly = isLive && changes.length === 0 && stockChanged;
  const nothing = !!product && changes.length === 0 && !stockChanged && !product.draft && !(product.rejected && !product.pending && !product.live);
  const by = `${user?.name} (${user?.id})`;

  const submit = (asDraft: boolean) => {
    setTouched(true);
    if (stockOnly) {
      updateStock(product!.id, f.stock, by);
      log({ action: 'Stock updated', entity: product!.sku, oldValue: num(totalStock(product!)), newValue: num(f.stock.reduce((s, l) => s + l.qty, 0)) });
      toast('success', 'Stock saved', 'Live immediately. No approval needed.');
      nav('/vendor/catalog');
      return;
    }
    if (!asDraft && !valid) { toast('error', 'Fix the highlighted fields', `${Object.keys(errs).length} issue(s)`); return; }
    if (asDraft && (!f.sku || errs.sku)) { toast('error', 'Enter a valid SKU to save a draft'); return; }
    const pid = saveVersion({ id: product?.id, vendorId: user!.vendorId!, sku: f.sku, categoryId: f.categoryId, version, stock: f.stock, submit: !asDraft, by });
    if (!asDraft) log({ action: isLive ? 'Product revision submitted' : 'New listing submitted', entity: `${f.sku}`, oldValue: isLive ? `v${product!.live!.v} live` : undefined, newValue: isLive ? `Changed: ${changes.join(', ')}` : 'Pending approval' });
    toast('success', asDraft ? 'Draft saved' : 'Submitted for approval', asDraft ? 'Not visible to buyers.' : isLive ? 'Your live listing stays unchanged until approved.' : 'The Approver will review your listing.');
    nav(asDraft ? '/vendor/catalog' : `/vendor/catalog/${pid}`);
  };

  const preview = tiers.map((t, i) => ({ ...t, max: tiers[i + 1] ? tiers[i + 1].min - 1 : undefined, cust: customerPrice(t.price, f.categoryId) }));
  const save = (i: number) => (i > 0 && tiers[0].price > 0 && tiers[i].price > 0 ? Math.round((1 - tiers[i].price / tiers[0].price) * 100) : 0);

  return (
    <div className="container wide" style={{ maxWidth: 1280 }}>
      <PageHeader icon={product ? Tag : Plus} title={product ? `Edit ${product.sku}` : 'Add Product'}
        subtitle={product ? (isLive ? `Live v${product.live!.v} stays published until your changes are approved` : 'Not yet live') : 'Fill in the listing and submit it for Approver review'} />

      <div className="stack-12" style={{ marginBottom: 16 }}>
        {product?.rejected && (productStatusRejected(product)) && (
          <Banner tone="danger" lead={`Approver comment on v${product.rejected.version.v} (${fmtDate(product.rejected.at)}, ${product.rejected.by}):`}>“{product.rejected.reason}”</Banner>
        )}
        {product?.pending && isLive && <Banner tone="info" lead={`v${product.pending.v} is waiting for approval.`}>Submitting again replaces that pending revision. Live v{product.live!.v} stays published.</Banner>}
        {isLive && (changes.length > 0 ? <Banner tone="warning" lead="Needs re-approval:">{changes.join(', ')}.</Banner>
          : stockChanged ? <Banner tone="success" lead="Stock-only change.">Saves immediately without approval.</Banner> : null)}
      </div>

      <div className="form-layout">
        <div className="stack-16">
          <Card title="Basics" icon={Layers}>
            <div className="grid g-2" style={{ gap: 14 }}>
              <div className="field">
                <label htmlFor="sku">SKU</label>
                <input id="sku" className={`input mono ${inv('sku')}`} value={f.sku} disabled={isLive} onChange={(e) => set('sku', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="NTX-WL-2401" />
                {E('sku') ?? (isLive && <span className="hint">SKU can't change after a listing is live</span>)}
              </div>
              <div className="field">
                <label htmlFor="cat">Category</label>
                <select id="cat" className={`select ${inv('categoryId')}`} value={f.categoryId} disabled={isLive}
                  onChange={(e) => { const c = e.target.value; setF((x) => ({ ...x, categoryId: c, hsn: categoryById(c)?.hsn ?? x.hsn, attributes: {} })); }}>
                  {approvedCats.map((c) => <option key={c} value={c}>{categoryById(c)?.name}</option>)}
                </select>
                <span className="hint">Only categories you're approved for. <Link to="/vendor/capabilities">Request more</Link></span>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="title">Product title</label>
                <input id="title" className={`input ${inv('title')}`} value={f.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="Woven Damask Main Label, 50 × 20 mm" />
                {E('title') ?? <span className="hint">{f.title.length}/120</span>}
              </div>
              <div className="field">
                <label htmlFor="hsn">HSN code</label>
                <input id="hsn" className={`input mono ${inv('hsn')}`} value={f.hsn} maxLength={8} onChange={(e) => set('hsn', e.target.value.replace(/\D/g, ''))} />
                {E('hsn') ?? <span className="hint">GST {gst}% applies to this category</span>}
              </div>
              <div className="field">
                <label htmlFor="unit">Selling unit</label>
                <select id="unit" className="select" value={f.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="desc">Description</label>
                <textarea id="desc" className={`textarea ${inv('description')}`} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Materials, finish, typical use, care…" />
                {E('description')}
              </div>
            </div>
          </Card>

          {attrs.length > 0 && (
            <Card title={`${cat.name} attributes`} icon={ListChecks} sub="Required for this category; buyers filter on these">
              <div className="grid g-2" style={{ gap: 14 }}>
                {attrs.map((a) => (
                  <div key={a.key} className="field">
                    <label htmlFor={`a_${a.key}`}>{a.label}{a.unit && <span className="muted"> ({a.unit})</span>}</label>
                    {a.options ? (
                      <select id={`a_${a.key}`} className={`select ${inv(`attr_${a.key}`)}`} value={f.attributes[a.key] ?? ''} onChange={(e) => set('attributes', { ...f.attributes, [a.key]: e.target.value })}>
                        <option value="">Select…</option>{a.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input id={`a_${a.key}`} className={`input ${inv(`attr_${a.key}`)}`} value={f.attributes[a.key] ?? ''} onChange={(e) => set('attributes', { ...f.attributes, [a.key]: e.target.value })} />
                    )}
                    {E(`attr_${a.key}`)}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Photos" icon={ImageIcon} sub="First photo is the main image. Photo changes need re-approval.">
            <div className="stack-12">
              {f.images.length > 0 && (
                <div className="row wrap" style={{ gap: 10 }}>
                  {f.images.map((img, i) => (
                    <div key={img + i} style={{ position: 'relative' }}>
                      <ProductImage hue={f.hue} size={92} index={i} label={img} />
                      {i === 0 && <span style={{ position: 'absolute', top: 5, left: 5 }}><Pill tone="dark" strong>MAIN</Pill></span>}
                      <button className="icon-btn" style={{ position: 'absolute', top: 2, right: 2, width: 24, height: 24, background: 'var(--overlay)', color: 'var(--header-ink)' }} aria-label="Remove photo"
                        onClick={() => set('images', f.images.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              <Dropzone accept=".jpg,.jpeg,.png,.webp" hint="JPG, PNG or WebP · min 800 × 800 px · up to 8 photos" label="Drag & drop product photos"
                onFiles={(fs) => set('images', [...f.images, ...fs.map((x) => x.name)].slice(0, 8))} />
              {E('images')}
            </div>
          </Card>

          <Card title="Pricing, MOQ & Volume Tiers" icon={IndianRupee} sub="Your base price (pre-tax). TrimNova adds the category commission; GST is added at checkout.">
            <div className="stack-16">
              <div className="grid g-3" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="moq">MOQ ({f.unit})</label>
                  <input id="moq" type="number" min={1} className={`input mono ${inv('moq')}`} value={f.moq || ''} onChange={(e) => set('moq', +e.target.value)} />
                  {E('moq')}
                </div>
                <div className="field">
                  <label htmlFor="pack">Pack multiple</label>
                  <input id="pack" type="number" min={1} className={`input mono ${inv('packMultiple')}`} value={f.packMultiple || ''} onChange={(e) => set('packMultiple', +e.target.value)} />
                  {E('packMultiple') ?? <span className="hint">Buyers order in steps of {f.packMultiple}</span>}
                </div>
                <div className="field">
                  <label htmlFor="bp">Base price / {f.unit}</label>
                  <input id="bp" type="number" step="0.01" min={0} className={`input mono ${inv('tier0')}`} value={tiers[0].price || ''}
                    onChange={(e) => set('tiers', f.tiers.map((t, i) => (i === 0 ? { ...t, price: +e.target.value } : t)))} />
                  {E('tier0')}
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Volume tiers</div>
                <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <table className="tbl">
                    <thead><tr><th>Quantity from</th><th>Range</th><th>Your price / {f.unit}</th><th className="right">Customer sees</th><th></th></tr></thead>
                    <tbody>
                      {preview.map((t, i) => (
                        <tr key={i}>
                          <td style={{ width: 150 }}>
                            <input type="number" className="input mono" style={{ height: 32 }} value={t.min || ''} disabled={i === 0}
                              onChange={(e) => set('tiers', f.tiers.map((x, j) => (j === i ? { ...x, min: +e.target.value } : x)))} />
                          </td>
                          <td className="mono small nowrap">{num(t.min)}{t.max ? ` – ${num(t.max)}` : '+'}</td>
                          <td style={{ width: 170 }}>
                            <input type="number" step="0.01" className={`input mono ${inv(`tier${i}`)}`} style={{ height: 32 }} value={t.price || ''} disabled={i === 0} title={i === 0 ? 'Set via Base price above' : ''}
                              onChange={(e) => set('tiers', f.tiers.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)))} />
                            {i > 0 && E(`tier${i}`)}
                          </td>
                          <td className="num">{t.price > 0 ? inr(t.cust) : '—'} {save(i) > 0 && <Pill tone="green">Save {save(i)}%</Pill>}</td>
                          <td className="right">{i > 0 && <button className="icon-btn light" aria-label="Remove tier" onClick={() => set('tiers', f.tiers.filter((_, j) => j !== i))}><Trash2 size={13} /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {f.tiers.length < 5 && <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => set('tiers', [...f.tiers, { min: (tiers[tiers.length - 1].min || f.moq) * 4, price: 0 }])}><Plus size={13} /> Add tier</button>}
              </div>
              <div className="divider-h" style={{ margin: 0 }} />
              <div className="stack-12">
                <Switch id="disc" checked={f.discountOn} onChange={(v) => set('discountOn', v)} label={<><b>Propose a discount</b> <span className="muted">— needs Admin approval; funded by you</span></>} />
                {f.discountOn && (
                  <div className="grid g-3" style={{ gap: 14 }}>
                    <div className="field"><label htmlFor="dp">Discount %</label><input id="dp" type="number" min={1} max={50} className={`input mono ${inv('discount')}`} value={f.discount.pct} onChange={(e) => set('discount', { ...f.discount, pct: +e.target.value })} /></div>
                    <div className="field"><label htmlFor="df">From</label><input id="df" type="date" className="input" value={f.discount.from} onChange={(e) => set('discount', { ...f.discount, from: e.target.value })} /></div>
                    <div className="field"><label htmlFor="dt">To</label><input id="dt" type="date" className="input" value={f.discount.to} onChange={(e) => set('discount', { ...f.discount, to: e.target.value })} /></div>
                    <div style={{ gridColumn: '1 / -1' }}>{E('discount')}</div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card title="Production Shades / Colours" icon={Palette} sub="Optional. Buyers pick a shade on the product page.">
            <div className="stack-12">
              {f.shades.map((s, i) => (
                <div key={i} className="row">
                  <input type="color" value={s.hex} aria-label="Shade colour" style={{ width: 38, height: 36, border: '1px solid var(--slate-200)', borderRadius: 'var(--radius)', padding: 2, background: 'var(--card)' }}
                    onChange={(e) => set('shades', f.shades.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
                  <input className="input" placeholder="Shade name, e.g. Navy" value={s.name} onChange={(e) => set('shades', f.shades.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <span className="mono xs muted" style={{ width: 64 }}>{s.hex}</span>
                  <button className="icon-btn light" aria-label="Remove shade" onClick={() => set('shades', f.shades.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('shades', [...f.shades, { name: '', hex: '#4f46e5' }])}><Plus size={13} /> Add shade</button>
            </div>
          </Card>

          <Card title="Technical Specifications Dossier" icon={FileText} sub="Key–value rows shown in a collapsible table on the product page">
            <div className="stack-12">
              {f.specs.map((s, i) => (
                <div key={i} className="row">
                  <input className="input" style={{ maxWidth: 220 }} placeholder="Property (e.g. Wash fastness)" value={s.k} onChange={(e) => set('specs', f.specs.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} />
                  <input className="input" placeholder="Value (e.g. Grade 4–5, ISO 105-C06)" value={s.v} onChange={(e) => set('specs', f.specs.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} />
                  <button className="icon-btn light" aria-label="Remove row" onClick={() => set('specs', f.specs.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('specs', [...f.specs, { k: '', v: '' }])}><Plus size={13} /> Add row</button>
              <div className="divider-h" style={{ margin: '4px 0' }} />
              <div className="label">Technical Data Sheet (TDS) PDF</div>
              {f.tds ? <FileChip file={{ name: f.tds, size: 420000 }} onRemove={() => set('tds', undefined)} /> : <Dropzone accept=".pdf" multiple={false} hint="PDF · max 10 MB" label="Upload TDS PDF" onFiles={(x) => set('tds', x[0].name)} />}
            </div>
          </Card>

          <Card title="Stock & Fulfilment" icon={Truck} sub="Stock edits never need approval. Lead time and TrimInsta availability do.">
            <div className="stack-16">
              <div className="stack-12">
                <div className="label">Stock by location</div>
                {f.stock.map((l, i) => {
                  const hub = l.loc.startsWith('WH-');
                  return (
                    <div key={i} className="row">
                      <Boxes size={14} className="muted" />
                      <span className="grow small">{l.loc} {hub && <Pill tone="indigo">Counted on receipt</Pill>}</span>
                      <input type="number" min={0} className="input mono" style={{ width: 150, textAlign: 'right' }} value={l.qty} disabled={hub}
                        onChange={(e) => set('stock', f.stock.map((x, j) => (j === i ? { ...x, qty: Math.max(0, +e.target.value) } : x)))} />
                      <span className="xs muted" style={{ width: 34 }}>{f.unit}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid g-2" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="lt">Dispatch / lead-time promise</label>
                  <div className="input-group"><input id="lt" type="number" min={1} max={30} className={`input mono ${inv('leadTimeDays')}`} value={f.leadTimeDays} onChange={(e) => set('leadTimeDays', +e.target.value)} /><span className="input" style={{ width: 90, display: 'grid', placeItems: 'center', background: 'var(--slate-100)' }}>days</span></div>
                  {E('leadTimeDays') ?? <span className="hint">Shown to buyers; late dispatch is flagged to Admin</span>}
                </div>
                <div className="field">
                  <span className="label">TrimInsta 6-Hour availability</span>
                  <div style={{ paddingTop: 8 }}>
                    <Switch id="insta" checked={f.insta} onChange={(v) => set('insta', v)} label={<><Zap size={13} style={{ verticalAlign: -2, color: 'var(--orange)' }} /> Offer from hubs with stock</>} />
                  </div>
                  {E('insta') ?? <span className="hint">{onb.insta.optIn ? 'Offered only to buyers inside a hub\'s zone when that hub has stock' : 'You have not opted in to TrimInsta'}</span>}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ---------- Live preview ---------- */}
        <aside className="form-aside">
          <Card title="Live preview" icon={Eye}>
            <div className="stack-12">
              <ProductImage hue={f.hue} label={f.title || 'New product'} size="100%" radius={12} />
              <div className="xs muted caps">{cat.name}</div>
              <div className="bold" style={{ fontSize: 14 }}>{f.title || 'Product title'}</div>
              <div className="preview-price">
                <div className="xs pp-sub">Customer sees (pre-tax)</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{tiers[0].price > 0 ? inr(customerPrice(tiers[0].price, f.categoryId)) : '₹—'}<span style={{ fontSize: 12, fontWeight: 500 }}> /{f.unit}</span></div>
                <div className="xs pp-sub">MOQ {num(f.moq)} · packs of {num(f.packMultiple)}</div>
              </div>
              <dl className="kv" style={{ gridTemplateColumns: '1fr auto' }}>
                <dt>Your base price</dt><dd className="mono">{inr(tiers[0].price || 0)}</dd>
                <dt>Category commission</dt><dd className="mono">{cat.commission.toFixed(1)}%</dd>
                <dt>GST at checkout</dt><dd className="mono">{gst}%</dd>
              </dl>
              <p className="xs muted">Commission is set per category by TrimNova and is the same for every vendor. Buyers see one price; they never see the split.</p>
              {f.discountOn && f.discount.pct > 0 && tiers[0].price > 0 && (
                <Banner tone="info" lead="If Admin approves:">{f.discount.pct}% off → {inr(customerPrice(tiers[0].price, f.categoryId) * (1 - f.discount.pct / 100))} /{f.unit}{f.discount.from && f.discount.to ? ` from ${fmtDate(f.discount.from)} to ${fmtDate(f.discount.to)}` : ''}.</Banner>
              )}
              <div className="row wrap">
                {f.insta && <Pill tone="solid-orange">Insta</Pill>}
                <Pill tone="grey">Standard {f.leadTimeDays * 24}h</Pill>
                {f.shades.filter((s) => s.name).slice(0, 5).map((s) => <span key={s.name} title={s.name} style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: s.hex, border: '1px solid var(--slate-200)' }} />)}
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <div className="sticky-actions">
        <span className="xs muted grow">
          {touched && !valid && !stockOnly ? <span style={{ color: 'var(--danger)' }}>{Object.keys(errs).length} field(s) need attention</span>
            : stockOnly ? 'Only stock changed. Saves without approval.' : isLive && changes.length ? `Changed: ${changes.join(', ')}` : 'Submitted listings are reviewed by the TrimNova Approver.'}
        </span>
        <Link to="/vendor/catalog" className="btn btn-secondary">Cancel</Link>
        {!isLive && <button className="btn btn-secondary" onClick={() => submit(true)}><Save size={14} /> Save draft</button>}
        {stockOnly
          ? <button className="btn btn-success" onClick={() => submit(false)}><Boxes size={14} /> Save stock (no approval)</button>
          : <button className="btn btn-primary" disabled={nothing} onClick={() => submit(false)}><Send size={14} /> {nothing ? 'No changes' : isLive ? 'Submit revision for approval' : 'Submit for approval'}</button>}
      </div>
    </div>
  );
}

function productStatusRejected(p: { rejected?: { at: string }; pending?: unknown; live?: { submittedAt: string } }) {
  return !!p.rejected && !p.pending && (!p.live || p.rejected.at > p.live.submittedAt);
}
