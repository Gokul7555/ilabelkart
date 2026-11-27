import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Gives every `.tbl` body cell a `data-label` from its column header, so tables
 * stack into labelled cards on phones (see `.tbl` rules in index.css).
 * Runs on any DOM change inside `root`, so tables rendered later are covered too.
 */
export function useTableLabels(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let frame = 0;
    const label = () => {
      frame = 0;
      el.querySelectorAll<HTMLTableElement>('table.tbl').forEach((table) => {
        const heads: string[] = [];
        table.querySelectorAll<HTMLTableCellElement>('thead th').forEach((th) => {
          const text = (th.innerText || th.textContent || '').trim();
          for (let i = 0; i < (th.colSpan || 1); i++) heads.push(text);
        });
        if (!heads.length) return;
        table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((tr) => {
          let col = 0;
          Array.from(tr.cells).forEach((td) => {
            if (td.colSpan > 1) td.removeAttribute('data-label');
            else if (td.getAttribute('data-label') !== heads[col]) td.setAttribute('data-label', heads[col] ?? '');
            col += td.colSpan || 1;
          });
        });
      });
    };
    label();
    const mo = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(label); });
    mo.observe(el, { childList: true, subtree: true });
    return () => { mo.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [root]);
}
