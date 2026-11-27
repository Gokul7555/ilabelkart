import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, CheckCircle2, Clock, Package, Pencil, Plus, Search, XCircle } from 'lucide-react';
import { Banner, Card, EmptyState, ExportButtons, Kpi, Modal, PageHeader, Pill, Tabs } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { SortTh, useSort } from '../../components/SortTh';
import { categoryById } from '../../data/categories';
import { fmtDate, inr, num } from '../../lib/format';
import { basePrice, customerPrice, productStatus, totalStock, useCatalog, workingVersion } from '../../lib/catalog';
import type { Product, ProductStatus, StockLine } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useAudit } from '../../lib/audit';

type Filter = 'all' | 'live' | 'pending' | 'rejected' | 'draft';

const STATUS_TONE: Record<ProductStatus, { tone: 'green' | 'amber' | 'red' | 'grey' | 'blue'; label: string }> = {
  Live: { tone: 'green', label: 'Live' },
  'Revision pending': { tone: 'blue', label: 'Live · Revision pending' },
  'Revision rejected': { tone: 'red', label: 'Live · Revision rejected' },
  Pending: { tone: 'amber', label: 'Pending approval' },
  Rejected: { tone: 'red', label: 'Rejected' },
  Draft: { tone: 'grey', label: 'Draft' },
};

const inFilter = (s: ProductStatus, f: Filter) =>
  f === 'all' || (f === 'live' && (s === 'Live' || s === 'Revision pending' || s === 'Revision rejected'))
  || (f === 'pending' && (s === 'Pending' || s === 'Revision pending'))
  || (f === 'rejected' && (s === 'Rejected' || s === 'Revision rejected'))
  || (f === 'draft' && s === 'Draft');

export default function Catalog() {
  const { user } = useAuth();
  const { products } = useCatalog();
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [stockFor, setStockFor] = useState<Product | null>(null);

  // Vendors only ever see their own products.
  const mine = useMemo(() => products.filter((p) => p.vendorId === user?.vendorId), [products, user]);
  const count = (f: Filter) => mine.filter((p) => inFilter(productStatus(p), f)).length;
  const lowStock = mine.filter((p) => p.live && totalStock(p) < p.lowStockAt);
  const shown = mine.filter((p) => {
    const v = workingVersion(p);
    const hay = `${p.sku} ${v?.title ?? ''} ${categoryById(p.categoryId)?.name ?? ''}`.toLowerCase();
    return inFilter(productStatus(p), filter) && hay.includes(q.toLowerCase());
  });

  const { sorted, sort, by } = useSort(shown, {
    name: (p) => workingVersion(p)?.title ?? '', category: (p) => categoryById(p.categoryId)?.name ?? '', price: (p) => basePrice(workingVersion(p)!),
    moq: (p) => workingVersion(p)?.moq ?? 0, stock: (p) => totalStock(p), status: (p) => productStatus(p),
  });

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1280 }}>
      <PageHeader icon={Package} title="My Catalog" subtitle="Your listings, approval status and stock. Price, photo, description and policy edits need re-approval; stock edits don't."
        actions={<><ExportButtons name="catalog" /><Link to="/vendor/catalog/new" className="btn btn-primary btn-sm"><Plus size={14} /> Add Product</Link></>} />

      <div className="grid g-4">
        <Kpi icon={CheckCircle2} tone="green" label="Live products" value={count('live')} help="Visible on the marketplace" />
        <Kpi icon={Clock} tone="amber" label="Pending approval" value={count('pending')} help="New listings + revisions" />
        <Kpi icon={XCircle} tone="red" label="Rejected" value={count('rejected')} help="See Approver comments" />
        <Kpi icon={Boxes} tone="blue" label="Low stock" value={lowStock.length} help="Below your reorder level" />
      </div>

      {lowStock.length > 0 && (
        <Banner tone="warning" lead="Low stock:">{lowStock.map((p) => `${p.sku} (${num(totalStock(p))} ${p.live!.unit})`).join(', ')}. Orders above available stock can't be accepted. Update stock any time; it doesn't need approval.</Banner>
      )}

      <div className="row-between wrap">
        <Tabs<Filter> value={filter} onChange={setFilter} tabs={[
          { id: 'all', label: 'All', count: mine.length }, { id: 'live', label: 'Live', count: count('live') },
          { id: 'pending', label: 'Pending', count: count('pending') }, { id: 'rejected', label: 'Rejected', count: count('rejected') },
          { id: 'draft', label: 'Drafts', count: count('draft') },
        ]} />
        <div className="input-icon" style={{ width: 280 }}>
          <Search size={15} />
          <input className="input" placeholder="Search SKU, name or category" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card pad={false}>
        {shown.length === 0 ? (
          <EmptyState icon={Package} title={mine.length ? 'No products match' : 'No products yet'} action={!mine.length && <Link to="/vendor/catalog/new" className="btn btn-primary btn-sm"><Plus size={14} /> Add your first product</Link>}>
            {mine.length ? 'Try another filter or search.' : 'Add a product and submit it for approval.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><SortTh k="name" sort={sort} by={by}>Product</SortTh><SortTh k="category" sort={sort} by={by}>Category</SortTh><SortTh k="price" sort={sort} by={by} right>Base price</SortTh><SortTh k="moq" sort={sort} by={by} right>MOQ</SortTh><SortTh k="stock" sort={sort} by={by} right>Stock</SortTh><th>Version</th><SortTh k="status" sort={sort} by={by}>Status</SortTh><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {sorted.map((p) => {
                  const v = workingVersion(p)!;
                  const st = productStatus(p);
                  const s = STATUS_TONE[st];
                  const stock = totalStock(p);
                  const low = p.live && stock < p.lowStockAt;
                  const bp = basePrice(v);
                  return (
                    <tr key={p.id} className="clickable" onClick={() => nav(`/vendor/catalog/${p.id}`)}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <ProductImage hue={v.hue} label={v.title} size={38} />
                          <div style={{ minWidth: 0 }}>
                            <div className="t-name" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                            <div className="t-sub mono">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="small">{categoryById(p.categoryId)?.name}</td>
                      <td className="num">
                        <div>{inr(bp)}<span className="muted" style={{ fontSize: 10 }}> /{v.unit}</span></div>
                        <div className="xs muted" title="Customer price, pre-tax, including category commission">Customer {inr(customerPrice(bp, p.categoryId))}</div>
                      </td>
                      <td className="num">{num(v.moq)}</td>
                      <td className="num">
                        <span style={{ color: low ? 'var(--warning)' : undefined }}>{num(stock)}</span>
                        {low && <div><Pill tone="amber" icon={AlertTriangle}>Low</Pill></div>}
                      </td>
                      <td className="mono small">
                        {p.live && <div>v{p.live.v} live</div>}
                        {p.pending && <div className="muted">v{p.pending.v} pending</div>}
                        {!p.live && !p.pending && <div className="muted">v{v.v}</div>}
                      </td>
                      <td>
                        <Pill tone={s.tone}>{s.label}</Pill>
                        {p.rejected && (st === 'Rejected' || st === 'Revision rejected') && <div className="xs" style={{ color: 'var(--danger)', maxWidth: 220, marginTop: 3 }}>“{p.rejected.reason}”</div>}
                        {p.pending && <div className="xs muted">since {fmtDate(p.pending.submittedAt)}</div>}
                      </td>
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-xs" onClick={() => setStockFor(p)} disabled={!p.live && !p.pending}><Boxes size={12} /> Stock</button>{' '}
                        <Link to={`/vendor/catalog/${p.id}/edit`} className="btn btn-secondary btn-xs"><Pencil size={12} /> Edit</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <StockModal product={stockFor} onClose={() => setStockFor(null)} />
    </div>
  );
}

/** Stock-only edits apply immediately — no Approver re-approval. */
export function StockModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { updateStock } = useCatalog();
  const { user } = useAuth();
  const toast = useToast();
  const { log } = useAudit();
  const [lines, setLines] = useState<StockLine[]>([]);
  const [pid, setPid] = useState<string | null>(null);
  if (product && product.id !== pid) { setPid(product.id); setLines(product.stock.length ? product.stock.map((l) => ({ ...l })) : [{ loc: 'Factory', qty: 0 }]); }
  if (!product) return null;
  const v = workingVersion(product)!;
  const before = totalStock(product);
  const after = lines.reduce((s, l) => s + (l.qty || 0), 0);
  return (
    <Modal open onClose={() => { setPid(null); onClose(); }} title={`Update stock · ${product.sku}`} icon={Boxes}
      footer={<><button className="btn btn-secondary" onClick={() => { setPid(null); onClose(); }}>Cancel</button><button className="btn btn-primary" onClick={() => {
        updateStock(product.id, lines, `${user?.name} (${user?.id})`);
        log({ action: 'Stock updated', entity: `${product.sku}`, oldValue: num(before), newValue: num(after) });
        toast('success', 'Stock updated', 'Live immediately. No approval needed.');
        setPid(null); onClose();
      }}>Save stock</button></>}>
      <div className="stack-12">
        <Banner tone="success" lead="No approval needed.">Stock-only changes go live immediately. TrimInsta hub stock is counted by warehouse staff on receipt.</Banner>
        <div className="small bold">{v.title}</div>
        {lines.map((l, i) => {
          const hub = l.loc.startsWith('WH-');
          return (
            <div key={i} className="row">
              <span className="grow small">{l.loc} {hub && <Pill tone="indigo">Hub · counted on receipt</Pill>}</span>
              <input type="number" min={0} className="input mono" style={{ width: 140, textAlign: 'right' }} value={l.qty} disabled={hub}
                onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, qty: Math.max(0, +e.target.value) } : y)))} />
              <span className="xs muted" style={{ width: 32 }}>{v.unit}</span>
            </div>
          );
        })}
        <div className="row-between small"><span className="muted">Total</span><span className="mono bold">{num(before)} → {num(after)} {v.unit}</span></div>
      </div>
    </Modal>
  );
}
