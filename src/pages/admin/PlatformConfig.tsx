import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Crown, History, IndianRupee, MapPinned, RotateCcw, Save, Settings, UserCog } from 'lucide-react';
import { Banner, Card, ConfirmWithReason, PageHeader, Pill } from '../../components/ui';
import { Switch } from '../vendor/onboarding/shared';
import { TRIMINSTA_HUBS } from '../../data/india';
import { inr } from '../../lib/format';
import { NOTIFY_EVENTS, usePlatformConfig } from '../../lib/platformConfig';
import type { PlatformConfig as Cfg } from '../../lib/platformConfig';
import { useAudit } from '../../lib/audit';
import { useToast } from '../../lib/toast';

export default function PlatformConfig() {
  const { cfg, update } = usePlatformConfig();
  const { log } = useAudit();
  const toast = useToast();
  const [d, setD] = useState<Cfg>(cfg);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setD((x) => ({ ...x, [k]: v }));

  const changes: string[] = [];
  if (d.returnWindowDays !== cfg.returnWindowDays) changes.push(`Return window ${cfg.returnWindowDays} → ${d.returnWindowDays} days`);
  if (d.registrationFeeOn !== cfg.registrationFeeOn) changes.push(`Registration fee ${cfg.registrationFeeOn ? 'ON' : 'OFF'} → ${d.registrationFeeOn ? 'ON' : 'OFF'}`);
  if (d.registrationFee !== cfg.registrationFee) changes.push(`Registration fee ${inr(cfg.registrationFee)} → ${inr(d.registrationFee)}`);
  Object.keys(d.zones).forEach((h) => { if (d.zones[h] !== cfg.zones[h]) changes.push(`${h} zone ${cfg.zones[h]} → ${d.zones[h]} km`); });
  if (JSON.stringify(d.tiers) !== JSON.stringify(cfg.tiers)) changes.push('Subscription tiers edited');
  if (JSON.stringify(d.notify) !== JSON.stringify(cfg.notify)) changes.push('Notification rules edited');

  return (
    <div className="container stack-16" style={{ maxWidth: 1060 }}>
      <PageHeader icon={Settings} title="Platform Configuration" subtitle="Rules that apply across TrimNova. Every change needs a reason and is written to the audit log."
        actions={<><Link to="/admin/config/staff" className="btn btn-secondary btn-sm"><UserCog size={14} /> Staff & Roles</Link><Link to="/admin/config/audit" className="btn btn-secondary btn-sm"><History size={14} /> Audit Log</Link></>} />

      <Card title="Return / damage window" icon={RotateCcw} sub="How long buyers can claim damaged quantity after verified delivery">
        <div className="row wrap">
          {[5, 6, 7].map((n) => (
            <button key={n} className={`tier-card ${d.returnWindowDays === n ? 'on' : ''}`} style={{ flex: '0 0 120px' }} onClick={() => set('returnWindowDays', n)}>
              <div className="mono bold" style={{ fontSize: 18 }}>{n} days</div>{n === 7 && <span className="xs muted">Default</span>}
            </button>
          ))}
          <span className="xs muted" style={{ maxWidth: 360 }}>Applies to deliveries from the moment you save. Existing windows don't change. Allowed range 5–7 days.</span>
        </div>
      </Card>

      <Card title="TrimInsta service zones" icon={MapPinned} sub="Express is offered only within this radius of a hub that has stock">
        <div className="grid g-2" style={{ gap: 12 }}>
          {TRIMINSTA_HUBS.map((h) => (
            <div key={h.id} className="row" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div className="grow"><div className="small bold">{h.name}</div><div className="xs mono muted">{h.id}</div></div>
              <input type="range" min={3} max={10} step={0.5} value={d.zones[h.id] ?? 6} onChange={(e) => set('zones', { ...d.zones, [h.id]: +e.target.value })} aria-label={`${h.name} radius`} />
              <span className="mono small" style={{ width: 52, textAlign: 'right' }}>{(d.zones[h.id] ?? 6).toFixed(1)} km</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Vendor registration fee" icon={IndianRupee} sub="The approved requirement says registration is free. Keep OFF unless the client confirms (TBD).">
        <div className="stack-12">
          <Switch id="fee" checked={d.registrationFeeOn} onChange={(v) => set('registrationFeeOn', v)} label={<>Charge a one-time platform fee <b>{d.registrationFeeOn ? 'ON' : 'OFF'}</b></>} />
          {d.registrationFeeOn && (
            <div className="row wrap">
              <div className="field" style={{ width: 200 }}><label htmlFor="rf">Fee (₹, before GST)</label><input id="rf" type="number" className="input mono" value={d.registrationFee} onChange={(e) => set('registrationFee', +e.target.value)} /></div>
              <span className="small muted">+ {d.gstRate}% GST = <b className="mono">{inr(d.registrationFee * (1 + d.gstRate / 100))}</b>. Shown as an amber banner in Onboarding Module 01, with "Pay & Proceed".</span>
            </div>
          )}
        </div>
      </Card>

      <Card title="Subscription tiers" icon={Crown} sub="Boost ranking and spotlight placement. Not advertising. Names and prices are TBD with client.">
        <div className="grid g-3" style={{ gap: 12 }}>
          {d.tiers.map((t, i) => (
            <div key={i} className="stack-12" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div className="row-between"><span className="caps muted">Tier {i + 1}</span><Pill tone="amber" strong>TBD</Pill></div>
              <div className="field"><label htmlFor={`tn${i}`}>Name</label><input id={`tn${i}`} className="input" value={t.name} onChange={(e) => set('tiers', d.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></div>
              <div className="field"><label htmlFor={`tp${i}`}>Monthly price</label><input id={`tp${i}`} className="input mono" value={t.price} onChange={(e) => set('tiers', d.tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} /></div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Notification rules" icon={Bell} sub="Which events notify whom, by channel. SMS and WhatsApp providers are TBD." pad={false}>
        <table className="tbl">
          <thead><tr><th>Event</th><th>Recipient</th><th>Email</th><th>SMS</th><th>WhatsApp</th></tr></thead>
          <tbody>{NOTIFY_EVENTS.map((e) => (
            <tr key={e.key}>
              <td className="small">{e.label}</td><td className="xs muted">{e.to}</td>
              {(['email', 'sms', 'whatsapp'] as const).map((ch) => (
                <td key={ch}><input type="checkbox" aria-label={`${e.label} via ${ch}`} checked={d.notify[e.key]?.[ch] ?? false} onChange={(x) => set('notify', { ...d.notify, [e.key]: { ...d.notify[e.key], [ch]: x.target.checked } })} /></td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </Card>

      <div className="sticky-actions" style={{ margin: '0 -28px -48px' }}>
        <span className="xs muted grow">{changes.length ? `${changes.length} unsaved change(s): ${changes.join(' · ')}` : 'No unsaved changes'}</span>
        <button className="btn btn-secondary" disabled={!changes.length} onClick={() => setD(cfg)}>Discard</button>
        <button className="btn btn-primary" disabled={!changes.length} onClick={() => setConfirm(true)}><Save size={14} /> Save changes</button>
      </div>

      <ConfirmWithReason open={confirm} onClose={() => setConfirm(false)} title="Save platform configuration" confirmLabel="Save & log"
        description={<Banner tone="warning">{changes.join(' · ')}</Banner>}
        onConfirm={(r) => { update(d); changes.forEach((c) => log({ action: 'Platform config changed', entity: 'Platform Cfg', newValue: c, reason: r })); toast('success', 'Configuration saved', `${changes.length} change(s) logged`); }} />
    </div>
  );
}
