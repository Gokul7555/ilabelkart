import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Banner, Modal, OtpInput } from './ui';

/**
 * Mandatory OTP handover (vendor → courier, hub → partner, courier → customer).
 * The receiving party reads the 6-digit code from their app; the handover only completes when it matches.
 */
export function OtpHandoverModal({ open, onClose, title, from, to, expected, children, canSubmit = true, confirmLabel = 'Verify OTP & hand over', onVerified }: {
  open: boolean; onClose: () => void; title: string; from: string; to: string; expected: string;
  children?: ReactNode; canSubmit?: boolean; confirmLabel?: string; onVerified: () => void;
}) {
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [tries, setTries] = useState(0);
  useEffect(() => { if (open) { setOtp(''); setErr(''); setTries(0); } }, [open]);
  const locked = tries >= 3;
  return (
    <Modal open={open} onClose={onClose} title={title} icon={KeyRound}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={otp.length !== 6 || !canSubmit || locked} onClick={() => {
          if (otp === expected) { onVerified(); onClose(); }
          else { setTries((n) => n + 1); setErr(`OTP doesn't match. ${Math.max(0, 2 - tries)} attempt(s) left.`); setOtp(''); }
        }}><ShieldCheck size={15} /> {confirmLabel}</button>
      </>}>
      <div className="stack-16">
        {children}
        <div className="row small" style={{ justifyContent: 'center', gap: 6 }}>
          <b>{from}</b><span className="muted">→</span><b>{to}</b>
        </div>
        <div className="small muted" style={{ textAlign: 'center' }}>Ask <b>{to}</b> for the 6-digit handover OTP shown in their app.</div>
        <OtpInput value={otp} onChange={(v) => { setOtp(v); setErr(''); }} />
        {err && <Banner tone="danger">{err}</Banner>}
        {locked && <Banner tone="danger" lead="Handover locked.">Too many wrong codes. Contact TrimNova Support to reset.</Banner>}
        <Banner tone="info" lead="Demo:">the expected OTP is <span className="mono">{expected}</span>.</Banner>
      </div>
    </Modal>
  );
}
