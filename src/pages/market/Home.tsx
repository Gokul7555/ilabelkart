import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Barcode, CircleDot, FileText, Grip, LayoutGrid, Layers, List, Paperclip, Scissors, Search, Shirt, ShoppingBag,
  SlidersHorizontal, Sparkles, Tag, Truck, Waves, Wifi, X, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '../../components/ui';
import { ProductCard } from '../../components/ProductCard';
import { CATEGORIES, CLASSIFICATIONS, categoryById } from '../../data/categories';
import type { ClassificationId } from '../../data/categories';
import { num } from '../../lib/format';
import { customerPrice } from '../../lib/catalog';
import { useListings } from '../../lib/marketplace';
import type { Listing } from '../../lib/marketplace';

const CAT_ICON: Record<string, LucideIcon> = {
  'woven-labels': Tag, 'rfid-tags': Wifi, 'hang-tags': Barcode, threads: Scissors, interlinings: Layers, elastic: Waves,
  polybags: ShoppingBag, hangers: Shirt, velcro: Grip, buttons: CircleDot, zippers: Paperclip, sequins: Sparkles,
};
const CERT_CHIPS: [string, string][] = [['OEKO-TEX', 'OEKO-TEX Standard 100'], ['GOTS', 'GOTS'], ['FSC', 'FSC'], ['GINETEX', 'GINETEX'], ['REACH', 'REACH']];
type Delivery = 'any' | 'insta' | 'standard';
type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'moq-asc';
const priceOf = (l: Listing) => customerPrice(l.product.live!.tiers[0].price, l.product.categoryId);
const ph = (w: number, h: number, text: string, bg = 'E2E8F0', fg = '475569') => `https://placehold.co/${w}x${h}/${bg}/${fg}/png?font=ibm-plex-sans&text=${encodeURIComponent(text)}`;

/* Sample trust content: the client replaces these with real figures, logos and stories. */
const STATS = [['10M+', 'labels printed'], ['2,500+', 'businesses buying'], ['48-hr', 'standard dispatch'], ['4', 'TrimInsta 6-hour hubs']];
const CLIENTS = ['Apparel exporter', 'FMCG brand', 'Pharma packer', '3PL / logistics', 'Retail chain', 'Denim mill'];
const CERTS = [['ISO 9001', 'Quality management'], ['FSC', 'Responsible paper & board'], ['FDA-compliant inks', 'Food & pharma contact'], ['OEKO-TEX Standard 100', 'Tested for harmful substances'], ['GOTS', 'Organic textile trims']];
const CASES = [
  { ind: 'Apparel export · Tiruppur', title: 'Care labels re-sourced in 9 days for an EU buyer audit', result: 'GINETEX-compliant labels across 40 styles; zero audit findings' },
  { ind: 'FMCG · Pune', title: 'Barcode hang tags with variable data at 2M units/month', result: 'Scan-rate failures down from 1.8% to 0.2%' },
  { ind: 'Pharma · Ahmedabad', title: 'Tamper-evident labels printed with FDA-compliant inks', result: 'Single GST invoice per supplier; batch traceability by SKU' },
];

export default function MarketplaceHome() {
  const listings = useListings();
  const sellable = useMemo(() => listings.filter((l) => !l.salesBlocked), [listings]);
  const [params] = useSearchParams();
  const loc = useLocation();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState(params.get('q') ?? '');
  const [cls, setCls] = useState<Set<ClassificationId>>(new Set(params.get('cls') ? [params.get('cls') as ClassificationId] : []));
  const [cats, setCats] = useState<Set<string>>(new Set(params.get('cat') ? [params.get('cat')!] : []));
  const [certs, setCerts] = useState<Set<string>>(new Set());
  const [delivery, setDelivery] = useState<Delivery>((params.get('delivery') as Delivery) || 'any');
  const [moqMax, setMoqMax] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<Sort>('relevance');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);

  // Header search, mega menu and category bar link here with URL params.
  useEffect(() => {
    setQ(params.get('q') ?? '');
    setCls(new Set(params.get('cls') ? [params.get('cls') as ClassificationId] : []));
    setCats(new Set(params.get('cat') ? [params.get('cat')!] : []));
    setDelivery((params.get('delivery') as Delivery) || 'any');
    if (loc.hash === '#results') setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }, [params, loc.hash]);

  const toggle = <T,>(s: Set<T>, v: T, set: (x: Set<T>) => void) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); set(n); };
  const scrollToResults = () => setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);

  const base = useMemo(() => sellable.filter((l) => {
    const v = l.product.live!;
    const needle = q.trim().toLowerCase();
    if (needle && !`${v.title} ${l.product.sku} ${v.hsn} ${l.vendor.name}`.toLowerCase().includes(needle)) return false;
    if (cls.size && !cls.has(categoryById(l.product.categoryId)!.classification)) return false;
    if (certs.size && ![...certs].every((c) => l.validCerts.includes(c))) return false;
    if (delivery === 'insta' && !v.insta) return false;
    if (moqMax && v.moq > +moqMax) return false;
    if (priceMax && priceOf(l) > +priceMax) return false;
    return true;
  }), [sellable, q, cls, certs, delivery, moqMax, priceMax]);

  const results = useMemo(() => {
    const s = base.filter((l) => !cats.size || cats.has(l.product.categoryId));
    if (sort === 'price-asc') s.sort((a, b) => priceOf(a) - priceOf(b));
    if (sort === 'price-desc') s.sort((a, b) => priceOf(b) - priceOf(a));
    if (sort === 'moq-asc') s.sort((a, b) => a.product.live!.moq - b.product.live!.moq);
    if (sort === 'relevance') s.sort((a, b) => Number(b.vendor.elite) - Number(a.vendor.elite) || b.vendor.rating - a.vendor.rating);
    return s;
  }, [base, cats, sort]);

  const activeCount = cls.size + cats.size + certs.size + (delivery !== 'any' ? 1 : 0) + (moqMax ? 1 : 0) + (priceMax ? 1 : 0) + (q ? 1 : 0);
  const clearAll = () => { setQ(''); setCls(new Set()); setCats(new Set()); setCerts(new Set()); setDelivery('any'); setMoqMax(''); setPriceMax(''); };

  return (
    <div className="stack-20">
      {/* Hero */}
      <section className="mk-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">India's Premier <em>Garment Trims</em> Marketplace</h1>
          <p>Labels, threads, zippers and packaging from verified Indian manufacturers. Tiered bulk pricing, GST invoices per supplier and 6-hour TrimInsta delivery.</p>
          <form className="hero-search" onSubmit={(e) => { e.preventDefault(); scrollToResults(); }} role="search">
            <Search size={18} style={{ color: 'var(--slate-500)', alignSelf: 'center', marginLeft: 8 }} aria-hidden />
            <label htmlFor="hero-q" className="sr-only">Search products</label>
            <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by product name, SKU, or HSN code..." />
            <button className="btn btn-primary btn-lg">Search</button>
          </form>
          <div className="row wrap" style={{ marginTop: 14, gap: 8 }}>
            <label className="chip">
              <Layers size={13} aria-hidden />
              <select aria-label="Category" value={cats.size === 1 ? [...cats][0] : ''} onChange={(e) => { setCats(e.target.value ? new Set([e.target.value]) : new Set()); scrollToResults(); }}>
                <option value="">Category: All</option>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            {CERT_CHIPS.map(([label, type]) => <button key={type} type="button" className={`chip ${certs.has(type) ? 'on' : ''}`} aria-pressed={certs.has(type)} onClick={() => toggle(certs, type, setCerts)}>{label}</button>)}
            <button type="button" className={`chip ${delivery === 'insta' ? 'on' : ''}`} aria-pressed={delivery === 'insta'} onClick={() => setDelivery(delivery === 'insta' ? 'any' : 'insta')}><Zap size={13} /> TrimInsta 6-Hour</button>
            <button type="button" className={`chip ${delivery === 'standard' ? 'on' : ''}`} aria-pressed={delivery === 'standard'} onClick={() => setDelivery(delivery === 'standard' ? 'any' : 'standard')}><Truck size={13} /> Standard Delivery</button>
          </div>
        </div>
        <img className="hero-photo" src={ph(720, 520, 'Label printing press · factory floor', 'CBD5E1', '334155')} alt="Label printing press on a factory floor (placeholder photo)" />
      </section>

      {/* Stats */}
      <section aria-label="TrimNova in numbers">
        <div className="row-between" style={{ marginBottom: 6 }}><span /><span className="sample-tag">Sample figures</span></div>
        <div className="stats-bar">{STATS.map(([v, l]) => <div key={l}><div className="v">{v}</div><div className="l">{l}</div></div>)}</div>
      </section>

      {/* Clients */}
      <section aria-label="Trusted by" className="stack-12">
        <div className="section-head"><span className="caps muted">Trusted by manufacturers across India</span><span className="sample-tag">Sample logos</span></div>
        <div className="logo-strip">{CLIENTS.map((c) => <img key={c} src={ph(240, 80, c, 'FFFFFF', '64748B')} alt={`Client logo placeholder: ${c}`} loading="lazy" />)}</div>
      </section>

      {/* Classifications */}
      <section className="stack-12" aria-labelledby="cls-title">
        <h2 id="cls-title" className="section-title">Shop by Classification</h2>
        <div className="grid g-4">
          {CLASSIFICATIONS.map((c) => {
            const catsIn = CATEGORIES.filter((x) => x.classification === c.id);
            return (
              <button key={c.id} className={`class-tile ${cls.has(c.id) ? 'on' : ''}`} onClick={() => { toggle(cls, c.id, setCls); scrollToResults(); }} aria-pressed={cls.has(c.id)}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 600, color: 'var(--heading)' }}>{c.name}</div>
                <div className="xs muted">{catsIn.map((x) => x.name).join(' · ')}</div>
                <div className="small bold row" style={{ color: 'var(--primary-ink)', gap: 4 }}>{num(catsIn.reduce((s, x) => s + x.products, 0))} products <ArrowRight size={14} /></div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="stack-12" aria-labelledby="cat-title">
        <h2 id="cat-title" className="section-title">Browse by Category</h2>
        <div className="grid g-4" style={{ gap: 12 }}>
          {CATEGORIES.map((c) => {
            const I = CAT_ICON[c.id] ?? Tag;
            return (
              <button key={c.id} className={`cat-tile ${cats.has(c.id) ? 'on' : ''}`} onClick={() => { setCats(new Set([c.id])); scrollToResults(); }} aria-pressed={cats.has(c.id)}>
                <span className="cat-icon"><I size={18} aria-hidden /></span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="bold small" style={{ display: 'block' }}>{c.name}</span>
                  <span className="xs muted tnum">{c.subCategories} sub-categories · {num(c.products)} products</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Results */}
      <section ref={resultsRef} id="results" className="stack-12" style={{ scrollMarginTop: 130 }} aria-labelledby="res-title">
        <div className="row-between wrap">
          <div className="row">
            <h2 id="res-title" className="section-title">Products</h2>
            <span className="small muted" aria-live="polite">{results.length} result{results.length === 1 ? '' : 's'}</span>
            {activeCount > 0 && <button className="btn btn-ghost btn-xs" onClick={clearAll}><X size={12} /> Clear {activeCount} filter{activeCount > 1 ? 's' : ''}</button>}
          </div>
          <div className="row wrap">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}><SlidersHorizontal size={14} /> Filters</button>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" className="select" style={{ height: 34, width: 200 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="relevance">Sort: Relevance</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="moq-asc">MOQ: lowest first</option>
            </select>
            <div className="tabs" style={{ padding: 2 }}>
              <button className={`tab ${layout === 'grid' ? 'active' : ''}`} style={{ padding: '4px 8px' }} onClick={() => setLayout('grid')} aria-label="Grid view" aria-pressed={layout === 'grid'}><LayoutGrid size={14} /></button>
              <button className={`tab ${layout === 'list' ? 'active' : ''}`} style={{ padding: '4px 8px' }} onClick={() => setLayout('list')} aria-label="List view" aria-pressed={layout === 'list'}><List size={14} /></button>
            </div>
          </div>
        </div>
        <div className="mk-body" style={!showFilters ? { gridTemplateColumns: '1fr' } : undefined}>
          {showFilters && (
            <aside className="card card-pad filters" aria-label="Filters">
              <fieldset className="f-group" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="f-title">Classification</legend>
                {CLASSIFICATIONS.map((c) => <label key={c.id} className="check" style={{ marginBottom: 6 }}><input type="checkbox" checked={cls.has(c.id)} onChange={() => toggle(cls, c.id, setCls)} /> {c.name}</label>)}
              </fieldset>
              <fieldset className="f-group" style={{ border: 0, padding: '12px 0 0', margin: '12px 0 0', borderTop: '1px solid var(--border)' }}>
                <legend className="f-title" style={{ float: 'left', width: '100%' }}>Category</legend>
                {CATEGORIES.map((c) => {
                  const n = base.filter((l) => l.product.categoryId === c.id).length;
                  return (
                    <label key={c.id} className="check" style={{ marginBottom: 6, opacity: n || cats.has(c.id) ? 1 : 0.55 }}>
                      <input type="checkbox" checked={cats.has(c.id)} onChange={() => toggle(cats, c.id, setCats)} /><span className="grow">{c.name}</span><span className="xs muted mono">{n}</span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="f-group">
                <div className="f-title">Certification</div>
                {CERT_CHIPS.map(([label, type]) => <label key={type} className="check" style={{ marginBottom: 6 }}><input type="checkbox" checked={certs.has(type)} onChange={() => toggle(certs, type, setCerts)} /> {label}</label>)}
              </div>
              <div className="f-group">
                <div className="f-title">Delivery type</div>
                {([['any', 'Any'], ['insta', 'TrimInsta 6-Hour'], ['standard', 'Standard Delivery']] as const).map(([id, l]) => <label key={id} className="check" style={{ marginBottom: 6 }}><input type="radio" name="dl" checked={delivery === id} onChange={() => setDelivery(id)} /> {l}</label>)}
              </div>
              <div className="f-group"><label className="f-title" htmlFor="moq">Max MOQ</label><input id="moq" className="input mono" type="number" min={0} placeholder="e.g. 1000" value={moqMax} onChange={(e) => setMoqMax(e.target.value)} /></div>
              <div className="f-group"><label className="f-title" htmlFor="pmax">Max price (₹/unit, pre-tax)</label><input id="pmax" className="input mono" type="number" min={0} step="0.5" placeholder="e.g. 20" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} /></div>
            </aside>
          )}
          <div>
            {results.length === 0 ? (
              <div className="card"><EmptyState icon={Search} title="No products match" action={<button className="btn btn-secondary btn-sm" onClick={clearAll}>Clear filters</button>}>Try a broader search or fewer filters, or <Link to="/quote">request a quote</Link> for custom specs.</EmptyState></div>
            ) : layout === 'grid' ? <div className="p-grid">{results.map((l) => <ProductCard key={l.product.id} l={l} />)}</div>
              : <div className="stack-12">{results.map((l) => <ProductCard key={l.product.id} l={l} layout="list" />)}</div>}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="stack-12" aria-labelledby="cert-title">
        <div className="section-head"><h2 id="cert-title" className="section-title">Certified supply chain</h2><span className="sample-tag">Sample</span></div>
        <div className="cert-band">{CERTS.map(([c, d]) => <div key={c} className="cert-item"><BadgeCheck size={20} style={{ color: 'var(--success)', flexShrink: 0 }} aria-hidden /><div><div className="small bold">{c}</div><div className="xs muted">{d}</div></div></div>)}</div>
        <p className="xs muted">Each supplier's certificates are verified individually; expired certificates are hidden and block sales automatically.</p>
      </section>

      {/* Case studies */}
      <section className="stack-12" aria-labelledby="cs-title">
        <div className="section-head"><h2 id="cs-title" className="section-title">Industry case studies</h2><span className="sample-tag">Sample stories</span></div>
        <div className="grid g-3">
          {CASES.map((c) => (
            <article key={c.title} className="case-card">
              <img src={ph(640, 360, c.ind.split(' · ')[0], 'E2E8F0', '475569')} alt={`${c.ind} (placeholder photo)`} loading="lazy" />
              <div className="cc-body">
                <span className="caps muted">{c.ind}</span>
                <h3 style={{ fontSize: 16 }}>{c.title}</h3>
                <p className="small" style={{ color: 'var(--text-2)' }}><b style={{ color: 'var(--success-ink)' }}>Result:</b> {c.result}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* RFQ band */}
      <section className="rfq-band" aria-label="Request a quote">
        <FileText size={28} style={{ color: 'var(--primary-ink)' }} aria-hidden />
        <div className="grow">
          <h2 style={{ fontSize: 19 }}>Need custom labels or volumes above list tiers?</h2>
          <p className="small" style={{ color: 'var(--text-2)' }}>Send your spec, artwork and quantity. Verified suppliers quote within 24 hours, with GST invoices and OTP-verified delivery.</p>
        </div>
        <Link to="/quote" className="btn btn-primary btn-lg">Request a Quote</Link>
      </section>
    </div>
  );
}
