import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Boxes, History, Pencil, Tag } from 'lucide-react';
import { Banner, Card, PageHeader, Pill } from '../../components/ui';
import { ProductImage } from '../../components/ProductImage';
import { ProductDiff } from '../../components/ProductDiff';
import { categoryById } from '../../data/categories';
import { fmtDate, fmtDateTime, num } from '../../lib/format';
import { productStatus, totalStock, useCatalog, workingVersion } from '../../lib/catalog';
import { useAuth } from '../../lib/auth';
import { StockModal } from './Catalog';

export default function ProductView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { products } = useCatalog();
  const [stockOpen, setStockOpen] = useState(false);
  const p = products.find((x) => x.id === id && x.vendorId === user?.vendorId);
  if (!p) return <Navigate to="/vendor/catalog" replace />;

  const v = workingVersion(p)!;
  const st = productStatus(p);
  const tone = st === 'Live' ? 'green' : st.includes('ejected') ? 'red' : st === 'Draft' ? 'grey' : st === 'Revision pending' ? 'blue' : 'amber';

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1180 }}>
      <PageHeader icon={Tag} title={v.title} subtitle={<><span className="mono">{p.sku}</span> · {categoryById(p.categoryId)?.name}</>}
        actions={<>
          <button className="btn btn-secondary btn-sm" onClick={() => setStockOpen(true)} disabled={!p.live && !p.pending}><Boxes size={14} /> Stock · {num(totalStock(p))}</button>
          <Link to={`/vendor/catalog/${p.id}/edit`} className="btn btn-primary btn-sm"><Pencil size={14} /> Edit</Link>
        </>} />

      <div className="row wrap">
        <Pill tone={tone}>{st}</Pill>
        {p.live && <span className="small muted">Live <span className="mono">v{p.live.v}</span> since {fmtDate(p.live.submittedAt)}</span>}
        {p.pending && <span className="small muted">· <span className="mono">v{p.pending.v}</span> submitted {fmtDateTime(p.pending.submittedAt)}</span>}
      </div>

      {p.rejected && (st === 'Rejected' || st === 'Revision rejected') && (
        <Banner tone="danger" lead={`Approver comment on v${p.rejected.version.v}:`}
          actions={<Link className="btn btn-danger btn-sm" to={`/vendor/catalog/${p.id}/edit`}>Fix & resubmit</Link>}>
          “{p.rejected.reason}” <span className="muted">· {p.rejected.by}, {fmtDate(p.rejected.at)}{p.live ? `. Live v${p.live.v} is unaffected.` : ''}</span>
        </Banner>
      )}
      {p.pending && p.live && <Banner tone="info" lead="Revision under review.">Buyers continue to see live v{p.live.v} until the Approver publishes v{p.pending.v}.</Banner>}

      <Card title={p.pending && p.live ? 'Live vs proposed revision' : p.pending ? 'Submitted listing' : 'Listing'} pad={false}
        actions={<div className="row">{v.images.slice(0, 4).map((img, i) => <ProductImage key={img + i} hue={v.hue} label={v.title} index={i} size={30} radius={7} />)}</div>}>
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

      {stockOpen && <StockModal product={p} onClose={() => setStockOpen(false)} />}
    </div>
  );
}
