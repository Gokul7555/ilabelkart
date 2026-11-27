import { useState } from 'react';
import { Gavel, ShieldAlert, ShieldOff } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, PageHeader, Pill, Tabs } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { useSupport } from '../../lib/support';
import type { Appeal, RiskFlag } from '../../lib/support';
import { useAudit } from '../../lib/audit';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

type T = 'flags' | 'appeals';
type Action = { kind: 'dismiss' | 'recommend'; flag: RiskFlag } | { kind: 'uphold' | 'overturn'; appeal: Appeal } | null;

export default function Risk() {
  const { flags, appeals, patchFlag, patchAppeal } = useSupport();
  const { log } = useAudit();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<T>('flags');
  const [act, setAct] = useState<Action>(null);
  const me = `${user?.name} (${user?.id})`;

  return (
    <div className="container wide stack-16" style={{ maxWidth: 1200 }}>
      <PageHeader icon={ShieldAlert} title="Risk Flags & Appeals" subtitle="Automatic flags for Support review. Flags never ban anyone; only Admin can freeze, after your recommendation." />
      <Banner tone="info" lead="Rules:">a vendor is flagged for complaints in more than 10 distinct orders (time window TBD with client). A customer is flagged for more than 3 suspicious return claims. Support reviews each flag and can recommend a freeze to Admin with a reason.</Banner>
      <Tabs<T> value={tab} onChange={setTab} tabs={[
        { id: 'flags', label: 'Risk flags', count: flags.filter((f) => f.status === 'Open').length },
        { id: 'appeals', label: 'Appeals', count: appeals.filter((a) => a.status === 'Open').length },
      ]} />

      {tab === 'flags' && flags.map((f) => (
        <Card key={f.id} title={<span className="row"><span className="mono">{f.id}</span> · {f.subjectName}</span>} sub={`${f.kind} · raised ${fmtDateTime(f.raisedAt)}`}
          actions={<Pill tone={f.status === 'Open' ? 'amber' : f.status.startsWith('Freeze') ? 'red' : 'grey'}>{f.status}</Pill>}>
          <div className="grid g-2">
            <div className="stack-12">
              <div className="small"><span className="muted">Rule: </span>{f.rule}</div>
              <div className="small bold">{f.metric}</div>
              <div className="row wrap">{f.evidence.map((e) => <Pill key={e} tone="grey">{e}</Pill>)}</div>
              {f.note && <div className="xs muted">Support note: {f.note}</div>}
            </div>
            <div className="row wrap" style={{ justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              {f.status === 'Open' ? <>
                <button className="btn btn-secondary btn-sm" onClick={() => setAct({ kind: 'dismiss', flag: f })}>Reviewed: no action</button>
                <button className="btn btn-danger btn-sm" onClick={() => setAct({ kind: 'recommend', flag: f })}><ShieldOff size={13} /> Recommend freeze to Admin</button>
              </> : <span className="xs muted">Decision recorded. {f.status.startsWith('Freeze') && 'Waiting for Admin.'}</span>}
            </div>
          </div>
        </Card>
      ))}

      {tab === 'appeals' && appeals.map((a) => (
        <Card key={a.id} title={<span className="row"><span className="mono">{a.id}</span> · {a.party}</span>} sub={`${a.from} appeal on ${a.ref} · ${fmtDateTime(a.at)}`}
          actions={<Pill tone={a.status === 'Open' ? 'amber' : a.status === 'Upheld' ? 'grey' : 'green'}>{a.status}</Pill>}>
          <div className="row-between wrap" style={{ alignItems: 'flex-start' }}>
            <div className="small" style={{ maxWidth: 640 }}>{a.summary}{a.note && <div className="xs muted" style={{ marginTop: 4 }}>Decision note: {a.note}</div>}</div>
            {a.status === 'Open' && (
              <div className="row">
                <button className="btn btn-secondary btn-sm" onClick={() => setAct({ kind: 'uphold', appeal: a })}><Gavel size={13} /> Uphold original decision</button>
                <button className="btn btn-primary btn-sm" onClick={() => setAct({ kind: 'overturn', appeal: a })}>Overturn</button>
              </div>
            )}
          </div>
        </Card>
      ))}

      <ConfirmWithReason open={!!act} onClose={() => setAct(null)} danger={act?.kind === 'recommend'}
        title={act?.kind === 'recommend' ? `Recommend freezing ${act.flag.subjectName}?` : act?.kind === 'dismiss' ? 'Close flag with no action?' : act?.kind === 'uphold' ? 'Uphold the original decision?' : 'Overturn the original decision?'}
        confirmLabel={act?.kind === 'recommend' ? 'Send recommendation to Admin' : 'Confirm'}
        description={act?.kind === 'recommend' ? 'Nothing is frozen yet. Admin reviews your recommendation and decides.' : undefined}
        onConfirm={(r) => {
          if (!act) return;
          if ('flag' in act) {
            const status = act.kind === 'recommend' ? 'Freeze recommended to Admin' : 'Reviewed – no action';
            patchFlag(act.flag.id, { status, note: r });
            log({ action: `Risk flag ${act.kind === 'recommend' ? 'escalated to Admin' : 'closed'}`, entity: `${act.flag.id} · ${act.flag.subjectName}`, oldValue: 'Open', newValue: status, reason: r });
            toast(act.kind === 'recommend' ? 'warning' : 'success', status);
          } else if ('appeal' in act) {
            const status = act.kind === 'uphold' ? 'Upheld' : 'Overturned';
            patchAppeal(act.appeal.id, { status, note: `${r} (${me})` });
            log({ action: `Appeal ${status.toLowerCase()}`, entity: `${act.appeal.id} on ${act.appeal.ref}`, oldValue: 'Open', newValue: status, reason: r });
            toast('success', `Appeal ${status.toLowerCase()}`);
          }
        }} />
    </div>
  );
}
