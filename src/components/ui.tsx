import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertOctagon, AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, Inbox, Info,
  Lock, RefreshCw, UploadCloud, X, XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '../lib/toast';
import { statusStyle } from '../lib/status-maps';
import { useAuth } from '../lib/auth';
import { PORTAL_LABEL } from '../config/nav';
import type { PillTone } from '../lib/status-maps';

/* ---------------- Layout primitives ---------------- */

/**
 * Page header: mono eyebrow with status dot, large bold title, muted one-line subtitle, right-aligned actions.
 * `icon` is accepted for compatibility but the new structure does not render it.
 */
/** Default eyebrow: portal · organisation (e.g. "VENDOR PORTAL · NovaTex Manufacturing"). */
function useDefaultEyebrow(): ReactNode {
  const { user } = useAuth();
  if (!user) return null;
  const portal = user.role === 'customer' ? 'BUYER ACCOUNT'
    : user.staffRole && user.staffRole !== 'Super Admin' ? `${user.staffRole.toUpperCase()} DESK` : PORTAL_LABEL[user.role].label;
  return <>{portal} · {user.org}</>;
}

/**
 * Page header: mono eyebrow with status dot, large bold title, muted one-line subtitle, right-aligned actions.
 * `icon` is accepted for compatibility but the new structure does not render it.
 */
export function PageHeader({ title, subtitle, actions, eyebrow }: {
  icon?: LucideIcon; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode;
}) {
  const fallback = useDefaultEyebrow();
  const eb = eyebrow ?? fallback;
  return (
    <header className="ph">
      <div className="grow">
        {eb && <div className="ph-eyebrow"><span className="dot" aria-hidden />{eb}</div>}
        <h1 className="ph-title">{title}</h1>
        {subtitle && <p className="ph-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, sub, icon: Icon, actions, children, footer, className = '', locked, lockHint, pad = true }: {
  title?: ReactNode; sub?: ReactNode; icon?: LucideIcon; actions?: ReactNode; children?: ReactNode;
  footer?: ReactNode; className?: string; locked?: boolean; lockHint?: string; pad?: boolean;
}) {
  return (
    <section className={`card ${locked ? 'locked' : ''} ${className}`} aria-disabled={locked || undefined}>
      {title && (
        <div className="card-head">
          {Icon && <Icon size={17} className="muted" />}
          <div className="grow">
            <h3>{title} {locked && <Lock size={12} style={{ verticalAlign: -1 }} />}</h3>
            {sub && <div className="sub">{sub}</div>}
            {locked && lockHint && <div className="lock-hint">({lockHint})</div>}
          </div>
          {actions}
        </div>
      )}
      {children && <div className={pad ? 'card-body' : ''}>{children}</div>}
      {footer && <div className="card-foot">{footer}</div>}
    </section>
  );
}

export type Tone = 'indigo' | 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet';

/** Stat card: uppercase label + icon top-right, big number, muted caption. Red/amber tones mark "needs attention". */
export function Kpi({ icon: Icon, label, value, help, tone = 'indigo', mono }: {
  icon: LucideIcon; label: string; value: ReactNode; help?: ReactNode; tone?: Tone; mono?: boolean;
}) {
  const attn = tone === 'red' ? 'tone-red-attn' : tone === 'amber' ? 'tone-amber-attn' : '';
  return (
    <div className={`stat ${attn}`}>
      <div className="stat-top"><span className="stat-label">{label}</span><Icon size={18} className={`stat-icon ${attn ? '' : 'tone'}`} aria-hidden /></div>
      <div className={`stat-value sm ${mono ? 'mono' : ''}`}>{value}</div>
      {help && <div className="stat-cap">{help}</div>}
    </div>
  );
}

/* ---------------- Tabs ---------------- */

export interface TabDef<T extends string> { id: T; label: ReactNode; count?: number; disabled?: boolean; icon?: LucideIcon }

export function Tabs<T extends string>({ tabs, value, onChange, block }: {
  tabs: TabDef<T>[]; value: T; onChange: (v: T) => void; block?: boolean;
}) {
  return (
    <div className={`tabs ${block ? 'block' : ''}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id} role="tab" aria-selected={value === t.id} disabled={t.disabled}
          className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}
        >
          {t.icon && <t.icon size={14} />}
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Status pills ---------------- */


export function Pill({ tone = 'grey', children, icon: Icon, strong }: {
  tone?: PillTone; children: ReactNode; icon?: LucideIcon; strong?: boolean;
}) {
  return <span className={`pill ${tone} ${strong ? 'strong' : ''}`}>{Icon && <Icon size={11} />}{children}</span>;
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const s = statusStyle(status);
  return <Pill tone={s.tone} icon={s.icon} strong={s.strong}>{label ?? s.label ?? status}</Pill>;
}

/* ---------------- Banner ---------------- */

export function Banner({ tone = 'info', lead, children, actions, icon }: {
  tone?: 'info' | 'warning' | 'danger' | 'success'; lead?: string; children?: ReactNode; actions?: ReactNode; icon?: LucideIcon;
}) {
  const I = icon ?? { info: Info, warning: AlertTriangle, danger: AlertOctagon, success: CheckCircle2 }[tone];
  return (
    <div className={`banner ${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <I size={17} className="b-icon" />
      <div className="grow">{lead && <b>{lead} </b>}{children}</div>
      {actions && <div className="b-actions">{actions}</div>}
    </div>
  );
}

/* ---------------- Modal / Drawer ---------------- */

export function Modal({ open, onClose, title, icon: Icon, children, footer, size }: {
  open: boolean; onClose: () => void; title: ReactNode; icon?: LucideIcon; children: ReactNode; footer?: ReactNode; size?: 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          {Icon && <Icon size={18} style={{ color: 'var(--primary)' }} />}
          <h3 className="grow">{title}</h3>
          <button className="icon-btn light" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3 className="grow">{title}</h3>
          <button className="icon-btn light" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1 }}>{children}</div>
      </aside>
    </>
  );
}

/** Every sensitive action: reason is mandatory, then caller writes the audit log. */
export function ConfirmWithReason({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger, minLength = 10 }: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void; title: string;
  description?: ReactNode; confirmLabel?: string; danger?: boolean; minLength?: number;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const ok = reason.trim().length >= minLength;
  return (
    <Modal open={open} onClose={onClose} title={title} icon={AlertTriangle}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={!ok} onClick={() => { onConfirm(reason.trim()); onClose(); }}>{confirmLabel}</button>
      </>}>
      <div className="stack-12">
        {description && <div className="small" style={{ color: 'var(--text-2)' }}>{description}</div>}
        <div className="field">
          <label htmlFor="reason">Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea id="reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why. This is stored in the audit log." autoFocus />
          <span className="hint">Minimum {minLength} characters · recorded with your name, time, old and new values.</span>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- States ---------------- */

export function EmptyState({ icon: Icon = Inbox, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e-icon"><Icon size={24} /></div>
      <h4>{title}</h4>
      {children && <div className="small">{children}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="empty">
      <div className="e-icon tone-red"><XCircle size={24} /></div>
      <h4>{title}</h4>
      <div className="small">We couldn't load this data. Your work is safe.</div>
      {onRetry && <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={onRetry}><RefreshCw size={13} /> Retry</button>}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="stack-12" style={{ padding: 16 }}>
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton" style={{ height: 18, width: `${90 - i * 9}%` }} />)}
    </div>
  );
}

/* ---------------- Export ---------------- */

export function ExportButtons({ name }: { name: string }) {
  const toast = useToast();
  return (
    <div className="row">
      <button className="btn btn-secondary btn-sm" onClick={() => toast('success', 'Excel export ready', `${name}.xlsx downloaded (mock)`)}><FileSpreadsheet size={14} /> Excel</button>
      <button className="btn btn-secondary btn-sm" onClick={() => toast('success', 'PDF export ready', `${name}.pdf downloaded (mock)`)}><Download size={14} /> PDF</button>
    </div>
  );
}

/* ---------------- Upload ---------------- */

export interface UploadedFile { name: string; size: number }

export function Dropzone({ onFiles, accept = '.pdf,.jpg,.jpeg,.png', label = 'Drag & drop files here, or click to browse', hint = 'PDF, JPG or PNG · max 10 MB', multiple = true }: {
  onFiles: (f: UploadedFile[]) => void; accept?: string; label?: string; hint?: string; multiple?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const take = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list).map((f) => ({ name: f.name, size: f.size })));
  };
  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`} role="button" tabIndex={0}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files); }}
    >
      <UploadCloud size={26} style={{ color: 'var(--primary)' }} />
      <div className="bold" style={{ color: 'var(--text)', marginTop: 6 }}>{label}</div>
      <div className="xs">{hint}</div>
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

export function FileChip({ file, onRemove }: { file: UploadedFile; onRemove?: () => void }) {
  return (
    <div className="row" style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)' }}>
      <FileText size={16} className="muted" />
      <span className="grow small bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
      <span className="xs muted">{(file.size / 1024).toFixed(0)} KB</span>
      {onRemove && <button className="icon-btn light" style={{ width: 24, height: 24 }} onClick={onRemove} aria-label="Remove"><X size={13} /></button>}
    </div>
  );
}

/* ---------------- OTP input ---------------- */

export function OtpInput({ length = 6, value, onChange }: { length?: number; value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <div className="otp-boxes">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ''}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            const arr = value.padEnd(length, ' ').split('');
            arr[i] = d || ' ';
            onChange(arr.join('').trimEnd());
            if (d && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => {
            const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (p) { e.preventDefault(); onChange(p); refs.current[Math.min(p.length, length - 1)]?.focus(); }
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- Money & IDs ---------------- */

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`mono ${className}`}>{children}</span>;
}
