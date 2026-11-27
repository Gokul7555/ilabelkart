import { useState } from 'react';
import { History } from 'lucide-react';
import { Drawer, Pill } from './ui';
import { fmtDateTime } from '../lib/format';
import { useAudit } from '../lib/audit';

/** Button + drawer listing audit-log entries whose entity mentions any of `match`. */
export function AuditTrailButton({ match, label = 'Audit trail' }: { match: string[]; label?: string }) {
  const { entries } = useAudit();
  const [open, setOpen] = useState(false);
  const list = entries.filter((e) => match.some((m) => m && `${e.entity} ${e.newValue ?? ''}`.includes(m)));
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><History size={13} /> {label} <Pill tone="grey">{list.length}</Pill></button>
      <Drawer open={open} onClose={() => setOpen(false)} title={`${label}: ${match[0]}`}>
        {list.length === 0 ? <div className="small muted">No audit entries yet for this record.</div> : (
          <div className="timeline">
            {list.map((e) => (
              <div key={e.id} className="tl-item done"><span className="tl-dot" />
                <div className="small bold">{e.action}</div>
                <div className="xs muted">{fmtDateTime(e.at)} · {e.actor}</div>
                {(e.oldValue || e.newValue) && <div className="xs"><span className="muted">{e.oldValue ?? '—'}</span> → <b>{e.newValue ?? '—'}</b></div>}
                {e.reason && <div className="xs">“{e.reason}”</div>}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
