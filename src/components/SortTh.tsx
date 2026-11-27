import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

/** Sort rows by a named accessor; click a header again to flip direction. */
export function useSort<T, K extends string>(rows: T[], get: Record<K, (r: T) => string | number>, initial?: { key: NoInfer<K>; dir: SortDir }) {
  const [sort, setSort] = useState<{ key: K; dir: SortDir } | null>(initial ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const f = get[sort.key];
    return [...rows].sort((a, b) => {
      const x = f(a); const y = f(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en-IN', { numeric: true });
      return sort.dir === 'asc' ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const by = (key: K) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  return { sorted, sort, by };
}

/** Accessible sortable column header (button inside <th>, aria-sort on the th). */
export function SortTh<K extends string>({ k, sort, by, children, right }: { k: K; sort: { key: K; dir: SortDir } | null; by: (k: K) => void; children: ReactNode; right?: boolean }) {
  const active = sort?.key === k;
  const dir = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th aria-sort={dir} className={right ? 'right' : undefined}>
      <button type="button" className="th-sort" onClick={() => by(k)} aria-sort={active ? dir : undefined}>
        {children}{active ? (sort!.dir === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />) : <ArrowUpDown size={12} aria-hidden style={{ opacity: 0.5 }} />}
      </button>
    </th>
  );
}
