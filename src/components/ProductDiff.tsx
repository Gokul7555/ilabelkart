import type { ReactNode } from 'react';
import { Pill } from './ui';
import { ProductImage } from './ProductImage';
import { CATEGORY_ATTRS } from '../data/categories';
import { fmtDate, inr, num } from '../lib/format';
import { customerPrice } from '../lib/catalog';
import type { ProductVersion } from '../lib/catalog';

type Row = { label: string; render: (v: ProductVersion) => ReactNode; key: (v: ProductVersion) => string };

function rows(categoryId: string): Row[] {
  const attrDefs = CATEGORY_ATTRS[categoryId] ?? [];
  return [
    { label: 'Title', render: (v) => v.title, key: (v) => v.title },
    { label: 'Description', render: (v) => <span className="small">{v.description || '—'}</span>, key: (v) => v.description },
    { label: 'HSN · Unit', render: (v) => <span className="mono">{v.hsn} · {v.unit}</span>, key: (v) => v.hsn + v.unit },
    { label: 'MOQ · Pack', render: (v) => <span className="mono">{num(v.moq)} · ×{num(v.packMultiple)}</span>, key: (v) => `${v.moq}/${v.packMultiple}` },
    {
      label: 'Price tiers', key: (v) => JSON.stringify(v.tiers),
      render: (v) => (
        <div className="stack-12" style={{ gap: 2 }}>
          {v.tiers.map((t, i) => (
            <div key={i} className="mono small">
              {num(t.min)}{v.tiers[i + 1] ? `–${num(v.tiers[i + 1].min - 1)}` : '+'}: <b>{inr(t.price)}</b>
              <span className="muted"> → buyer {inr(customerPrice(t.price, categoryId))}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Proposed discount', key: (v) => JSON.stringify(v.discount ?? null),
      render: (v) => v.discount ? <span className="small">{v.discount.pct}% · {fmtDate(v.discount.from)} → {fmtDate(v.discount.to)} <Pill tone="amber">Admin approval</Pill></span> : <span className="muted">None</span>,
    },
    {
      label: 'Photos', key: (v) => v.images.join('|'),
      render: (v) => <div className="row wrap" style={{ gap: 6 }}>{v.images.map((img, i) => <ProductImage key={img + i} hue={v.hue} label={v.title} index={i} size={44} radius={8} />)}<span className="xs muted">{v.images.length} photo(s)</span></div>,
    },
    {
      label: 'Shades', key: (v) => JSON.stringify(v.shades),
      render: (v) => v.shades.length ? <div className="row wrap" style={{ gap: 6 }}>{v.shades.map((s) => <span key={s.name} className="row xs" style={{ gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 'var(--radius-sm)', background: s.hex, border: '1px solid var(--slate-200)' }} />{s.name}</span>)}</div> : <span className="muted">—</span>,
    },
    {
      label: 'Attributes', key: (v) => JSON.stringify(v.attributes),
      render: (v) => <div className="small">{attrDefs.map((a) => <div key={a.key}><span className="muted">{a.label}:</span> {v.attributes[a.key] ?? '—'}{a.unit && v.attributes[a.key] ? ` ${a.unit}` : ''}</div>)}</div>,
    },
    {
      label: 'Technical specs', key: (v) => JSON.stringify(v.specs),
      render: (v) => v.specs.length ? <div className="small">{v.specs.map((s) => <div key={s.k}><span className="muted">{s.k}:</span> {s.v}</div>)}</div> : <span className="muted">—</span>,
    },
    { label: 'TDS PDF', render: (v) => v.tds ? <span className="small mono">{v.tds}</span> : <span className="muted">—</span>, key: (v) => v.tds ?? '' },
    { label: 'Lead time', render: (v) => `${v.leadTimeDays} day(s)`, key: (v) => String(v.leadTimeDays) },
    { label: 'TrimInsta', render: (v) => (v.insta ? <Pill tone="solid-orange">Insta</Pill> : <span className="muted">No</span>), key: (v) => String(v.insta) },
  ];
}

/** Side-by-side old (live) vs new (proposed). With no `before`, shows the proposed listing only. */
export function ProductDiff({ before, after, categoryId, onlyChanged }: { before?: ProductVersion; after: ProductVersion; categoryId: string; onlyChanged?: boolean }) {
  const all = rows(categoryId);
  const list = onlyChanged && before ? all.filter((r) => r.key(before) !== r.key(after)) : all;
  return (
    <div className="table-wrap">
      <table className="tbl diff">
        <thead>
          <tr>
            <th>Field</th>
            {before && <th>Live · v{before.v}</th>}
            <th>{before ? `Proposed · v${after.v}` : `Proposed listing · v${after.v}`}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const changed = !!before && r.key(before) !== r.key(after);
            return (
              <tr key={r.label} className={changed ? 'changed' : ''}>
                <td className="field-name">{r.label}{changed && <div><Pill tone="amber">Changed</Pill></div>}</td>
                {before && <td className="old">{r.render(before)}</td>}
                <td>{r.render(after)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
