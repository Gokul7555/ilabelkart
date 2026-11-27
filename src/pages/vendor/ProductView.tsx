import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Boxes, History, Pencil } from 'lucide-react';
import { Banner, Card, PageHeader, StatusPill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { ProductDiff } from '../../components/ProductDiff';
import { MonoId } from '../../components/kit';
import { categoryById } from '../../data/categories';
import { fmtDate, fmtDateTime, inr, num } from '../../lib/format';
import { basePrice, customerPrice, productStatus, totalStock, useCatalog, workingVersion } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { StockModal } from './Catalog';

/** Vendor product detail: listing + history on the left, status / price / stock meta card on the right. */
export default function ProductView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { products } = useCatalog();
  const [stockOpen, setStockOpen] = useState(false);
  const p = products.find((x) => x.id === id && x.vendorId === user?.vendorId);
  if (!p) return <Navigate to="/vendor/catalog" replace />;

  const v = workingVersion(p)!;
  const st = productStatus(p);
  const cat = categoryById(p.categoryId);
  const base = basePrice(p.live ?? v);

  return (
    <div>
      <PageHeader title={v.title} subtitle={<><MonoId>{p.sku}</MonoId> · {cat?.name}</>}
        actions={<>
          <button className="btn btn-secondary" onClick={() => setStockOpen(true)} disabled={!p.live && !p.pending}><Boxes size={15} /> Update stock</button>
          <Link to={`/vendor/catalog/${p.id}/edit`} className="btn btn-primary"><Pencil size={15} /> Edit listing</Link>
        </>} />

      <div className="detail-layout">
        <div className="stack-16">
          {p.rejected && (st === 'Rejected' || st === 'Revision rejected') && (
            <Banner tone="danger" lead={`Approver comment on v${p.rejected.version.v}:`}
              actions={<Link className="btn btn-danger btn-sm" to={`/vendor/catalog/${p.id}/edit`}>Fix & resubmit</Link>}>
              “{p.rejected.reason}” <span className="muted">· {p.rejected.by}, {fmtDate(p.rejected.at)}{p.live ? `. Live v${p.live.v} is unaffected.` : ''}</span>
            </Banner>
          )}
          {p.pending && p.live && <Banner tone="info" lead="Revision under review.">Buyers continue to see live v{p.live.v} until the Approver publishes v{p.pending.v}.</Banner>}

          <Card title={p.pending && p.live ? 'Live vs proposed revision' : p.pending ? 'Submitted listing' : 'Listing'} pad={false}>
            <ProductDiff before={p.pending ? p.live : undefined} after={p.pending ?? v} categoryId={p.categoryId} />
          </Card>

          <Card title="History" icon={History} sub="Every submission and decision on this product">
            <div className="timeline">
              {[...p.history].reverse().map((h, i) => (
                <div key={i} className={`tl-item ${h.action.startsWith('Approved') ? 'done' : ''}`}>
                  <span className="tl-dot" />
                  <div className="row wrap"><b className="small">{h.action}</b>{h.v && <span className="mono xs muted">v{h.v}</span>}<span className="xs muted">{fmtDateTime(h.at)} · {h.by}</span></div>
                  {h.reason && <div className="xs" style={{ color: h.action === 'Rejected' ? 'var(--danger)' : 'var(--text-2)' }}>“{h.reason}”</div>}
                </div>
              ))}
              {p.history.length === 0 && <div className="small muted">No activity yet.</div>}
            </div>
          </Card>
        </div>

        <aside className="stack-16 detail-aside">
          <section className="kcard">
            <ProductImage hue={v.hue} label={v.title} size="100%" radius={12} />
            <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
              <StatusPill status={st} />
            </div>
            <dl className="kv" style={{ gridTemplateColumns: '110px 1fr', marginTop: 14 }}>
              <dt>Live version</dt><dd>{p.live ? <><MonoId>v{p.live.v}</MonoId> since {fmtDate(p.live.submittedAt)}</> : '—'}</dd>
              <dt>Pending</dt><dd>{p.pending ? <><MonoId>v{p.pending.v}</MonoId> · {fmtDateTime(p.pending.submittedAt)}</> : '—'}</dd>
              <dt>Your price</dt><dd className="mono">{inr(base)} /{v.unit}</dd>
              <dt>Buyer sees</dt><dd className="mono">{inr(customerPrice(base, p.categoryId))} <span className="xs muted">pre-tax</span></dd>
              <dt>Commission</dt><dd className="mono">{cat?.commission.toFixed(1)}%</dd>
              <dt>MOQ · pack</dt><dd className="mono">{num(v.moq)} · ×{num(v.packMultiple)}</dd>
            </dl>
          </section>
          <section className="kcard">
            <div className="kcard-head"><h2>Stock</h2><span className="count-pill">{num(totalStock(p))}</span></div>
            {p.stock.length === 0 ? <div className="small muted">No stock recorded.</div> : p.stock.map((l) => (
              <div key={l.loc} className="arow"><div className="grow small">{l.loc}</div><span className="mono bold">{num(l.qty)} {v.unit}</span></div>
            ))}
            <p className="xs muted" style={{ marginTop: 10 }}>Stock changes go live at once and need no approval.</p>
          </section>
        </aside>
      </div>

      {stockOpen && <StockModal product={p} onClose={() => setStockOpen(false)} />}
    </div>
  );
}
