import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, ShieldCheck, Truck } from 'lucide-react';
import { Banner, Card, Dropzone, FileChip, PageHeader } from '../../components/ui';
import type { UploadedFile } from '../../components/ui';
import { CATEGORIES } from '../../data/categories';
import { GSTIN_RE } from '../../data/india';
import { useAuth } from '../../lib/auth';
import { useProfile } from '../../lib/profile';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

const UNITS = ['pcs', 'm', 'cone', 'roll', 'set', 'kg'];

/** Bulk RFQ: buyers describe spec + quantity; Support routes it to matching verified suppliers. */
export default function Quote() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const profile = useProfile();
  const { log } = useAudit();
  const toast = useToast();
  const isCustomer = user?.role === 'customer';
  const [f, setF] = useState({
    company: isCustomer ? profile.company.name : '', gstin: isCustomer ? profile.company.gstin : '', name: isCustomer ? user!.name : '', email: isCustomer ? user!.email : '', phone: '',
    category: params.get('cat') ?? '', item: params.get('sku') ?? '', qty: '', unit: 'pcs', frequency: 'One-time', spec: '', pin: '', needBy: '', target: '', consent: false,
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [touched, setTouched] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const errs: Partial<Record<keyof typeof f, string>> = {};
  if (f.company.trim().length < 2) errs.company = 'Company name is required';
  if (f.gstin && !GSTIN_RE.test(f.gstin)) errs.gstin = '15-character GSTIN, e.g. 27AAACR5055K1Z7';
  if (f.name.trim().length < 2) errs.name = 'Contact name is required';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid work email';
  if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10))) errs.phone = '10-digit Indian mobile';
  if (!f.category) errs.category = 'Choose a category';
  if (f.item.trim().length < 4) errs.item = 'Describe the product or give a SKU';
  if (!(+f.qty > 0)) errs.qty = 'Enter the quantity';
  if (!/^\d{6}$/.test(f.pin)) errs.pin = '6-digit delivery PIN';
  if (!f.consent) errs.consent = 'Please accept to continue';
  const ok = Object.keys(errs).length === 0;
  const E = (k: keyof typeof f) => (touched && errs[k] ? <span className="err" id={`${k}-err`}>{errs[k]}</span> : null);
  const aria = (k: keyof typeof f) => (touched && errs[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-err` } : {});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!ok) { toast('error', 'Check the highlighted fields', `${Object.keys(errs).length} to fix`); return; }
    const r = `RFQ-2026-${String(Date.now()).slice(-5)}`;
    setRef(r);
    log({ action: 'Quote requested', entity: r, newValue: `${f.qty} ${f.unit} · ${CATEGORIES.find((c) => c.id === f.category)?.name}` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (ref) {
    return (
      <div className="container stack-16" style={{ maxWidth: 760 }}>
        <Card>
          <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <span className="tone-green" style={{ width: 48, height: 48, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><CheckCircle2 size={24} /></span>
            <div className="grow stack-12">
              <h1 style={{ fontSize: 22 }}>Quote request received</h1>
              <p>Reference <b className="mono">{ref}</b>. We've emailed a copy to {f.email}.</p>
              <ol className="small" style={{ paddingLeft: 18, margin: 0, color: 'var(--text-2)' }}>
                <li>TrimNova Support matches your spec to verified suppliers in {CATEGORIES.find((c) => c.id === f.category)?.name}.</li>
                <li>You get up to 3 quotes within 24 hours, each with MOQ, lead time and pre-tax price.</li>
                <li>Accept a quote to turn it into a normal order, with a GST invoice and OTP-verified delivery.</li>
              </ol>
              <div className="row wrap"><Link to="/marketplace" className="btn btn-primary">Back to marketplace</Link>{!user && <Link to="/register" className="btn btn-secondary">Create a buyer account</Link>}</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container stack-16" style={{ maxWidth: 1080 }}>
      <PageHeader icon={FileText} title="Request a Quote" subtitle="Bulk and custom orders: tell us the spec and quantity, and verified suppliers will quote within 24 hours." />
      <div className="checkout-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
        <form className="stack-16" onSubmit={submit} noValidate>
          <Card title="Your company">
            <div className="grid g-2" style={{ gap: 14 }}>
              <div className="field"><label htmlFor="co">Company name *</label><input id="co" className={`input ${touched && errs.company ? 'invalid' : ''}`} value={f.company} onChange={(e) => set('company', e.target.value)} autoComplete="organization" {...aria('company')} />{E('company')}</div>
              <div className="field"><label htmlFor="gst">GSTIN <span className="muted">(for input tax credit)</span></label><input id="gst" className={`input mono ${touched && errs.gstin ? 'invalid' : ''}`} maxLength={15} value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} {...aria('gstin')} />{E('gstin')}</div>
              <div className="field"><label htmlFor="nm">Contact name *</label><input id="nm" className={`input ${touched && errs.name ? 'invalid' : ''}`} value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" {...aria('name')} />{E('name')}</div>
              <div className="field"><label htmlFor="em">Work email *</label><input id="em" type="email" className={`input ${touched && errs.email ? 'invalid' : ''}`} value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" {...aria('email')} />{E('email')}</div>
              <div className="field"><label htmlFor="ph">Mobile *</label><input id="ph" inputMode="tel" className={`input mono ${touched && errs.phone ? 'invalid' : ''}`} value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98200 41177" autoComplete="tel" {...aria('phone')} />{E('phone')}</div>
            </div>
          </Card>

          <Card title="What you need">
            <div className="grid g-2" style={{ gap: 14 }}>
              <div className="field"><label htmlFor="cat">Category *</label>
                <select id="cat" className={`select ${touched && errs.category ? 'invalid' : ''}`} value={f.category} onChange={(e) => set('category', e.target.value)} {...aria('category')}>
                  <option value="">Select…</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>{E('category')}</div>
              <div className="field"><label htmlFor="it">Product or SKU *</label><input id="it" className={`input ${touched && errs.item ? 'invalid' : ''}`} value={f.item} onChange={(e) => set('item', e.target.value)} placeholder="e.g. Woven damask main label 50×20 mm" {...aria('item')} />{E('item')}</div>
              <div className="field"><label htmlFor="qty">Quantity *</label>
                <div className="input-group"><input id="qty" type="number" min={1} className={`input mono ${touched && errs.qty ? 'invalid' : ''}`} value={f.qty} onChange={(e) => set('qty', e.target.value)} {...aria('qty')} />
                  <label htmlFor="unit" className="sr-only">Unit</label><select id="unit" className="select" style={{ width: 100 }} value={f.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></div>{E('qty')}</div>
              <div className="field"><label htmlFor="fr">Order frequency</label><select id="fr" className="select" value={f.frequency} onChange={(e) => set('frequency', e.target.value)}><option>One-time</option><option>Monthly</option><option>Quarterly</option><option>Per season</option></select></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="sp">Specifications</label><textarea id="sp" className="textarea" value={f.spec} onChange={(e) => set('spec', e.target.value)} placeholder="Size, material, colours (Pantone), finish, fold, compliance needs (OEKO-TEX, FSC, FDA-compliant inks)…" /></div>
              <div className="field"><label htmlFor="tp">Target price ₹/unit <span className="muted">(optional)</span></label><input id="tp" type="number" step="0.01" className="input mono" value={f.target} onChange={(e) => set('target', e.target.value)} /></div>
              <div className="field"><label htmlFor="nb">Needed by</label><input id="nb" type="date" className="input" value={f.needBy} onChange={(e) => set('needBy', e.target.value)} /></div>
              <div className="field"><label htmlFor="pin">Delivery PIN *</label><input id="pin" inputMode="numeric" maxLength={6} className={`input mono ${touched && errs.pin ? 'invalid' : ''}`} value={f.pin} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} {...aria('pin')} />{E('pin')}</div>
            </div>
            <div className="stack-12" style={{ marginTop: 14 }}>
              <div className="label">Artwork / reference files</div>
              <Dropzone accept=".pdf,.ai,.eps,.svg,.png,.jpg" hint="PDF, AI, EPS, SVG, PNG or JPG · max 25 MB each" label="Drag & drop artwork, tech packs or photos" onFiles={(x) => setFiles((p) => [...p, ...x].slice(0, 8))} />
              {files.map((fl, i) => <FileChip key={fl.name + i} file={fl} onRemove={() => setFiles((p) => p.filter((_, j) => j !== i))} />)}
            </div>
          </Card>

          <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} {...aria('consent')} /> <span>TrimNova may share this spec (not my contact details) with verified suppliers to get quotes.</span></label>
          {E('consent')}
          <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary btn-lg"><FileText size={16} /> Submit quote request</button></div>
        </form>

        <aside className="stack-16">
          <Card title="How quoting works">
            <ul className="stack-12" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="row small" style={{ alignItems: 'flex-start' }}><Clock size={16} style={{ color: 'var(--primary-ink)', flexShrink: 0 }} /> Up to 3 quotes within 24 hours</li>
              <li className="row small" style={{ alignItems: 'flex-start' }}><ShieldCheck size={16} style={{ color: 'var(--primary-ink)', flexShrink: 0 }} /> Only GST- and compliance-verified suppliers</li>
              <li className="row small" style={{ alignItems: 'flex-start' }}><Truck size={16} style={{ color: 'var(--primary-ink)', flexShrink: 0 }} /> 48-hour dispatch on stock items; TrimInsta in hub zones</li>
            </ul>
          </Card>
          <Banner tone="info" lead="Need it today?">Many list items ship in 6 hours with TrimInsta. <Link to="/marketplace?delivery=insta#results">Browse Insta items</Link></Banner>
        </aside>
      </div>
    </div>
  );
}
