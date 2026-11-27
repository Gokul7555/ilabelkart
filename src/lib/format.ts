const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Indian grouping: ₹4,72,83,960.00 */
export function inr(n: number, opts: { decimals?: number; symbol?: boolean } = {}): string {
  const { decimals = 2, symbol = true } = opts;
  const s = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
  return (symbol ? '₹' : '') + s;
}

/** Compact INR for KPIs: ₹4.73 Cr, ₹12.4 L */
export function inrCompact(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n, { decimals: 0 });
}

export function num(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

function toDate(d: string | Date): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

/** 05 Nov 2026 */
export function fmtDate(d: string | Date): string {
  const x = toDate(d);
  return `${String(x.getDate()).padStart(2, '0')} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

/** 11:59 pm */
export function fmtTime(d: string | Date): string {
  const x = toDate(d);
  let h = x.getHours();
  const m = String(x.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function fmtDateTime(d: string | Date): string {
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}

/** Fixed "today" for the demo so mock data stays consistent. */
export const TODAY = new Date('2026-11-26T10:30:00+05:30');

export function daysBetween(a: string | Date, b: string | Date): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

export function maskGstin(g: string): string {
  return g.slice(0, 2) + '•••••' + g.slice(7, 11) + '•' + g.slice(12);
}
