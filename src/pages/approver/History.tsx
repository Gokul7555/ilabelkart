import { useMemo, useState } from 'react';
import { History as HistoryIcon, Lock, Search } from 'lucide-react';
import { Banner, Card, EmptyState, ExportButtons, PageHeader, StatusPill, Tabs } from '../../components/ui';
import { NOVATEX_ID, vendorById } from '../../data/vendors';
import { fmtDateTime } from '../../lib/format';
import { useCatalog } from '../../lib/catalog';
import { useOnboarding } from '../../lib/onboarding';

type Kind = 'all' | 'doc' | 'product';
interface Row { at: string; by: string; kind: 'doc' | 'product'; vendor: string; item: string; decision: string; reason?: string }

/** Built from the records themselves (product history + document versions), so it cannot drift or be edited. */
export default function History() {
  const { products, otherDocs } = useCatalog();
  const { data } = useOnboarding();
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    products.forEach((p) => p.history.filter((h) => h.action.startsWith('Approved') || h.action === 'Rejected').forEach((h) => out.push({
      at: h.at, by: h.by, kind: 'product', vendor: vendorById(p.vendorId)?.name ?? p.vendorId,
      item: `${p.sku} · v${h.v}`, decision: h.action.startsWith('Approved') ? 'Approved' : 'Rejected', reason: h.reason,
    })));
    const docs: [string, typeof data.docs][] = [[NOVATEX_ID, data.docs], ...Object.entries(otherDocs)];
    docs.forEach(([vid, list]) => list.forEach((d) => d.versions.filter((v) => v.decidedBy && v.decidedAt).forEach((v) => out.push({
      at: v.decidedAt!, by: v.decidedBy!, kind: 'doc', vendor: vid === NOVATEX_ID ? (data.gst?.tradeName ?? 'NovaTex Manufacturing') : vendorById(vid)?.name ?? vid,
      item: `${d.title} · v${v.v}`, decision: v.status, reason: v.reason,
    }))));
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [products, otherDocs, data]);

  const shown = rows.filter((r) => (kind === 'all' || r.kind === kind) && `${r.vendor} ${r.item} ${r.by} ${r.reason ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1280 }}>
      <PageHeader icon={HistoryIcon} title="Decision History" subtitle="Every document and listing decision, newest first" actions={<ExportButtons name="approver-history" />} />
      <Banner tone="info" icon={Lock} lead="Immutable log.">Entries can't be edited or deleted. To change an outcome, the vendor submits a new version, which is reviewed as a new entry.</Banner>
      <div className="row-between wrap">
        <Tabs<Kind> value={kind} onChange={setKind} tabs={[
          { id: 'all', label: 'All', count: rows.length },
          { id: 'doc', label: 'Documents', count: rows.filter((r) => r.kind === 'doc').length },
          { id: 'product', label: 'Listings', count: rows.filter((r) => r.kind === 'product').length },
        ]} />
        <div className="input-icon" style={{ width: 280 }}><Search size={15} /><input className="input" placeholder="Search vendor, item, reviewer…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <Card pad={false}>
        {shown.length === 0 ? <EmptyState title="No decisions found" icon={HistoryIcon} /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>When</th><th>Vendor</th><th>Item</th><th>Decision</th><th>Reason / note</th><th>Reviewer</th></tr></thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={i}>
                    <td className="nowrap small">{fmtDateTime(r.at)}</td>
                    <td className="small">{r.vendor}</td>
                    <td><div className="t-name small">{r.item}</div><div className="t-sub">{r.kind === 'doc' ? 'Document' : 'Listing'}</div></td>
                    <td><StatusPill status={r.decision} /></td>
                    <td className="xs" style={{ maxWidth: 360 }}>{r.reason ?? <span className="muted">—</span>}</td>
                    <td className="xs muted nowrap">{r.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
