import { Link } from 'react-router-dom';
import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ---------------- Mono IDs ---------------- */

/** IDs, SKUs and codes in JetBrains Mono. `strong` for the primary ID in a row. */
export function MonoId({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <span className={`mono-id ${strong ? 'strong' : ''}`}>{children}</span>;
}

/* ---------------- KPI cards ---------------- */

type Attn = 'red' | 'amber';

/** Small stat: uppercase label + icon top-right, big number, muted caption. Tinted when it needs attention. */
export function StatCard({ label, value, caption, icon: Icon, attention, to }: {
  label: string; value: ReactNode; caption?: ReactNode; icon: LucideIcon; attention?: Attn | false; to?: string;
}) {
  const body = (
    <>
      <div className="stat-top"><span className="stat-label">{label}</span><Icon size={18} className="stat-icon" aria-hidden /></div>
      <div className="stat-value">{value}</div>
      {caption && <div className="stat-cap">{caption}</div>}
    </>
  );
  const cls = `stat ${attention ? `attn-${attention}` : ''}`;
  return to ? <Link to={to} className={cls} style={{ textDecoration: 'none' }}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Minimal sparkline (single series, 2px line, soft area). */
function Sparkline({ data, width = 160, height = 56 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const x = (i: number) => (i / (data.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8);
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trend over ${data.length} periods`} style={{ flexShrink: 0 }}>
      <path d={area} fill="var(--primary-50)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={3.5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
    </svg>
  );
}

/** Hero card (spans 2 rows): label with icon chip, trend chip, big value, caption, sparkline. */
export function HeroStatCard({ label, icon: Icon, value, caption, trend, series }: {
  label: string; icon: LucideIcon; value: ReactNode; caption?: ReactNode; trend?: { pct: number; label?: string }; series: number[];
}) {
  const up = (trend?.pct ?? 0) >= 0;
  return (
    <div className="stat hero">
      <div className="stat-top">
        <span className="row" style={{ gap: 10 }}><span className="icon-chip"><Icon size={17} aria-hidden /></span><span className="stat-label">{label}</span></span>
        {trend && <span className={`trend ${up ? 'up' : 'down'}`}>{up ? <TrendingUp size={13} aria-hidden /> : <TrendingDown size={13} aria-hidden />}{up ? '+' : ''}{trend.pct.toFixed(1)}%{trend.label && <span style={{ fontWeight: 500 }}> {trend.label}</span>}</span>}
      </div>
      <div className="hero-bottom">
        <div>
          <div className="stat-value">{value}</div>
          {caption && <div className="stat-cap" style={{ marginTop: 4 }}>{caption}</div>}
        </div>
        <Sparkline data={series} />
      </div>
    </div>
  );
}

/** Progress card: mono counter "3 / 7", segmented bar, small breakdown caption. */
export function ProgressStatCard({ label, icon: Icon, done, total, segments, caption, to }: {
  label: string; icon: LucideIcon; done: number; total: number; segments: ('on' | 'warn' | 'bad' | 'off')[]; caption?: ReactNode; to?: string;
}) {
  const body = (
    <>
      <div className="stat-top"><span className="stat-label">{label}</span><Icon size={18} className="stat-icon" aria-hidden /></div>
      <div className="stat-value mono" style={{ fontSize: 28 }}>{done} <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>/ {total}</span></div>
      <div className="segbar" role="img" aria-label={`${done} of ${total}`}>{segments.map((s, i) => <span key={i} className={s === 'off' ? '' : s} />)}</div>
      {caption && <div className="stat-cap">{caption}</div>}
    </>
  );
  return to ? <Link to={to} className="stat" style={{ textDecoration: 'none' }}>{body}</Link> : <div className="stat">{body}</div>;
}

/* ---------------- Filter chips ---------------- */

export interface ChipDef<T extends string> { id: T; label: string; count?: number }

/** Row of toggle chips (single-select). */
export function FilterChips<T extends string>({ chips, value, onChange, label = 'Filter' }: { chips: ChipDef<T>[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="fchips" role="group" aria-label={label}>
      {chips.map((c) => (
        <button key={c.id} type="button" className="fchip" aria-pressed={value === c.id} onClick={() => onChange(c.id)}>
          {c.label}{c.count !== undefined && <span className="n">{c.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Action row ---------------- */

/** Rounded muted row: tinted icon tile, bold title + mono ref, muted subtitle, pill CTA. */
export function ActionRow({ icon: Icon, tone, title, refId, subtitle, cta, to, onClick, done, critical }: {
  icon: LucideIcon; tone: 'red' | 'amber' | 'blue' | 'green' | 'indigo' | 'violet'; title: string; refId?: string; subtitle?: ReactNode; cta: string;
  to?: string; onClick?: () => void; done?: ReactNode; critical?: boolean;
}) {
  return (
    <div className={`arow ${critical ? 'critical' : ''}`}>
      <span className={`arow-icon tone-${tone}`}><Icon size={17} aria-hidden /></span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="arow-title">{title} {refId && <MonoId>{refId}</MonoId>}</div>
        {subtitle && <div className="arow-sub">{subtitle}</div>}
      </div>
      {done ?? (onClick
        ? <button type="button" onClick={onClick} className={`btn btn-sm ${critical ? 'btn-danger' : 'btn-secondary'}`}>{cta}</button>
        : <Link to={to ?? '#'} className={`btn btn-sm ${critical ? 'btn-danger' : 'btn-secondary'}`}>{cta}</Link>)}
    </div>
  );
}

/* ---------------- Data table card ---------------- */

export interface Column<R> { key: string; header: string; align?: 'right'; render: (r: R) => ReactNode }

/** Card with title, "View all →", optional chips, and a clean table that stacks into cards on mobile. */
export function DataTableCard<R>({ title, count, viewAll, chips, columns, rows, rowKey, onRowClick, empty = 'Nothing here yet.', footer }: {
  title: string; count?: number; viewAll?: string; chips?: ReactNode; columns: Column<R>[]; rows: R[]; rowKey: (r: R) => string;
  onRowClick?: (r: R) => void; empty?: string; footer?: ReactNode;
}) {
  const onKey = (e: KeyboardEvent<HTMLTableRowElement>, r: R) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(r); } };
  return (
    <section className="kcard">
      <div className="kcard-head">
        <h2>{title}</h2>{count !== undefined && <span className="count-pill">{count}</span>}
        {viewAll && <Link to={viewAll} className="view-all">View all <ArrowRight size={14} aria-hidden /></Link>}
      </div>
      {chips && <div style={{ marginBottom: 12 }}>{chips}</div>}
      {rows.length === 0 ? <div className="small muted" style={{ padding: '16px 4px' }}>{empty}</div> : (
        <table className="dtable">
          <thead><tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'r' : undefined}>{c.header}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={rowKey(r)} className={onRowClick ? 'clickable' : undefined} tabIndex={onRowClick ? 0 : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined} onKeyDown={(e) => onKey(e, r)}>
              {columns.map((c) => <td key={c.key} data-label={c.header} className={c.align === 'right' ? 'r' : undefined}><div className="cell">{c.render(r)}</div></td>)}
            </tr>
          ))}</tbody>
        </table>
      )}
      {footer}
    </section>
  );
}
