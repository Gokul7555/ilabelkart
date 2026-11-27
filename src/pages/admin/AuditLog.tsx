import { useState } from 'react';
import { History, Lock, Search } from 'lucide-react';
import { Banner, Card, Drawer, EmptyState, ExportButtons, PageHeader, Pill } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { useAudit } from '../../lib/audit';
import type { AuditEntry } from '../../lib/audit';

const ROLE_TONE: Record<string, 'indigo' | 'green' | 'amber' | 'blue' | 'violet' | 'grey'> = { admin: 'indigo', vendor: 'green', support: 'amber', approver: 'blue', customer: 'violet' };

export default function AuditLog() {
  const { entries } = useAudit();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [from, setFrom] = useState('');
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const list = entries.filter((e) => (role === 'all' || e.role === role) && (!from || e.at.slice(0, 10) >= from)
    && `${e.action} ${e.entity} ${e.actor} ${e.reason ?? ''} ${e.oldValue ?? ''} ${e.newValue ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="container wide stack-16" style={{ maxWidth: 1320 }}>
      <PageHeader icon={History} title="Audit Log" subtitle="Every sensitive action: who, when, old and new values, and why" actions={<ExportButtons name="audit-log" />} />
      <Banner tone="info" icon={Lock} lead="Append-only.">Entries can't be edited or deleted, by anyone including Admin.</Banner>
      <div className="row wrap">
        <div className="input-icon" style={{ width: 340 }}><Search size={15} /><input className="input" placeholder="Search action, entity, actor, reason" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="select" style={{ width: 160 }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="all">All roles</option><option value="admin">Admin</option><option value="approver">Approver</option><option value="support">Support</option><option value="vendor">Vendor</option><option value="customer">Customer</option>
        </select>
        <label className="row small">From <input type="date" className="input" style={{ width: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <span className="xs muted">{list.length} entr{list.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <Card pad={false}>
        {list.length === 0 ? <EmptyState title="No entries" icon={History} /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Old → New</th><th>Reason</th></tr></thead>
              <tbody>{list.map((e) => (
                <tr key={e.id} className="clickable" onClick={() => setOpen(e)}>
                  <td className="small nowrap">{fmtDateTime(e.at)}<div className="xs mono muted">{e.id}</div></td>
                  <td className="small">{e.actor}<div><Pill tone={ROLE_TONE[e.role] ?? 'grey'}>{e.role}</Pill></div></td>
                  <td className="small bold">{e.action}</td>
                  <td className="small">{e.entity}</td>
                  <td className="xs">{e.oldValue || e.newValue ? <><span className="muted">{e.oldValue ?? '—'}</span> → <b>{e.newValue ?? '—'}</b></> : '—'}</td>
                  <td className="xs" style={{ maxWidth: 280 }}>{e.reason ?? <span className="muted">—</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.id ?? ''}>
        {open && (
          <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
            <dt>When</dt><dd>{fmtDateTime(open.at)}</dd>
            <dt>Actor</dt><dd>{open.actor}</dd>
            <dt>Role</dt><dd>{open.role}</dd>
            <dt>Action</dt><dd>{open.action}</dd>
            <dt>Entity</dt><dd>{open.entity}</dd>
            <dt>Old value</dt><dd className="mono small">{open.oldValue ?? '—'}</dd>
            <dt>New value</dt><dd className="mono small">{open.newValue ?? '—'}</dd>
            <dt>Reason</dt><dd>{open.reason ?? '—'}</dd>
          </dl>
        )}
      </Drawer>
    </div>
  );
}
