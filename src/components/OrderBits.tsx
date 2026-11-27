import { CheckCircle2, Clock, MapPin, RotateCcw, Truck, XCircle } from 'lucide-react';
import { Modal, Pill, StatusPill } from './ui';
import { fmtDate, fmtDateTime, fmtTime } from '../lib/format';
import { FLOW, flowIndex, isException } from '../lib/orders';
import type { SubOrder, SubStatus } from '../lib/orders';

/** Order sub-status pill. Tones and labels come from lib/status-maps.ts. */
export function SubStatusPill({ status }: { status: SubStatus }) {
  return <StatusPill status={status} />;
}

/** Order Placed › Accepted › Dispatched › In Transit › Out for Delivery › Delivered, with exceptions in red. */
export function OrderTimeline({ so }: { so: SubOrder }) {
  const exc = isException(so.status);
  // For exceptions, the progress reached = last happy-path event recorded.
  const reached = exc
    ? Math.max(...so.events.map((e) => flowIndex(e.status as SubStatus)).filter((i) => i >= 0), 0)
    : flowIndex(so.status);
  const when = (s: string) => [...so.events].reverse().find((e) => e.status === s)?.at;
  return (
    <div>
      <div className="track">
        {FLOW.map((s, i) => {
          const done = i <= reached && !(exc && so.status === 'Rejected' && i > 0);
          const at = when(s);
          return (
            <div key={s} className={`track-step ${done ? 'done' : ''} ${i === reached && !exc ? 'current' : ''}`}>
              <span className="track-dot">{done ? <CheckCircle2 size={14} /> : i + 1}</span>
              <span className="track-label">{s}</span>
              <span className="track-date">{done && at ? `${fmtDate(at).slice(0, 6)}, ${fmtTime(at)}` : ''}</span>
            </div>
          );
        })}
      </div>
      {exc && (
        <div className="row small" style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--danger-50)', color: 'var(--danger-ink)' }}>
          <XCircle size={15} />
          <b>{so.status}</b>
          <span className="grow">{[...so.events].reverse().find((e) => e.status === so.status)?.note ?? ''}</span>
          <span className="xs">{fmtDateTime([...so.events].reverse().find((e) => e.status === so.status)?.at ?? so.placedAt)}</span>
        </div>
      )}
    </div>
  );
}

export function TrackingModal({ so, onClose }: { so: SubOrder | null; onClose: () => void }) {
  if (!so) return null;
  return (
    <Modal open onClose={onClose} title={<>Tracking <span className="mono">{so.awb}</span></>} icon={Truck}>
      <div className="stack-12">
        <div className="row small"><b>{so.courier}</b><span className="muted">· courier assigned by TrimNova</span></div>
        <div className="timeline">
          {[...so.events].reverse().map((e, i) => (
            <div key={i} className={`tl-item ${i === 0 ? 'current' : 'done'}`}>
              <span className="tl-dot" />
              <div className="small bold">{e.status}</div>
              <div className="xs muted">{fmtDateTime(e.at)}{e.place && <> · <MapPin size={10} style={{ verticalAlign: -1 }} /> {e.place}</>}</div>
              {e.note && <div className="xs">{e.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** Damage/return window countdown. */
export function ReturnCountdown({ ends }: { ends?: string }) {
  if (!ends) return null;
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return <Pill tone="grey" icon={RotateCcw}>Return window closed {fmtDate(ends)}</Pill>;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return <Pill tone={d < 2 ? 'amber' : 'blue'} icon={Clock}>Return window: {d}d {h}h left · closes {fmtDate(ends)}, {fmtTime(ends)}</Pill>;
}
