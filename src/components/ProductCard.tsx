import { Link } from 'react-router-dom';
import { BadgeCheck, Zap } from 'lucide-react';
import { Pill } from './ui';
import { ProductImage } from './ProductImage';
import { categoryById } from '../data/categories';
import { inr, num } from '../lib/format';
import { customerPrice } from '../lib/catalog';
import type { Listing } from '../lib/marketplace';

/** Buyers see a single pre-tax price (commission already included). */
export function ProductCard({ l, layout = 'grid' }: { l: Listing; layout?: 'grid' | 'list' }) {
  const v = l.product.live!;
  const price = customerPrice(v.tiers[0].price, l.product.categoryId);
  const to = `/marketplace/products/${l.product.id}`;
  const cat = categoryById(l.product.categoryId)?.name;
  const chips = (
    <div className="row wrap" style={{ gap: 5 }}>
      {v.insta && <Pill tone="orange" icon={Zap}>6-Hr Insta</Pill>}
      <Pill tone="grey">Standard {v.leadTimeDays * 24}h</Pill>
    </div>
  );

  if (layout === 'list') {
    return (
      <div className="p-row">
        <Link to={to}><ProductImage hue={v.hue} label={v.title} size={92} radius={12} /></Link>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="caps muted">{cat}</div>
          <Link to={to} className="bold" style={{ color: 'var(--text)', fontSize: 14 }}>{v.title}</Link>
          <div className="row wrap small" style={{ marginTop: 4 }}>
            <span className="muted">{l.vendor.name}</span>
            <Pill tone="green" icon={BadgeCheck}>Official Verified Supplier</Pill>
            {l.validCerts.slice(0, 3).map((c) => <Pill key={c} tone="grey">{c}</Pill>)}
          </div>
          <div style={{ marginTop: 6 }}>{chips}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 150 }}>
          <div className="mono bold" style={{ fontSize: 17 }}>{inr(price)}<span className="xs muted" style={{ fontWeight: 500 }}> /{v.unit}</span></div>
          <div className="xs muted">MOQ {num(v.moq)} · SKU <span className="mono">{l.product.sku}</span></div>
          <Link to={to} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>View Details</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-card">
      <Link to={to} className="p-img" aria-label={v.title}>
        <ProductImage hue={v.hue} label={v.title} size="100%" radius={0} />
        {v.insta && <span style={{ position: 'absolute', top: 10, left: 10 }}><Pill tone="solid-orange" icon={Zap}>Insta</Pill></span>}
        {l.vendor.elite && <span style={{ position: 'absolute', top: 10, right: 10 }}><Pill tone="dark" strong>ELITE</Pill></span>}
      </Link>
      <div className="p-body">
        <div className="caps muted" style={{ fontSize: 10 }}>{cat}</div>
        <Link to={to} className="p-name">{v.title}</Link>
        <div className="xs muted">{l.vendor.name}</div>
        <div><Pill tone="green" icon={BadgeCheck}>Official Verified Supplier</Pill></div>
        <div className="row-between" style={{ alignItems: 'baseline', marginTop: 2 }}>
          <span className="mono bold" style={{ fontSize: 16 }}>{inr(price)}<span className="xs muted" style={{ fontWeight: 500 }}> /{v.unit}</span></span>
          <span className="xs muted">MOQ {num(v.moq)}</span>
        </div>
        {chips}
        <Link to={to} className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 'auto' }}>View Details</Link>
      </div>
    </div>
  );
}
