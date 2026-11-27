import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Banner, OtpInput } from '../../components/ui';
import { useToast } from '../../lib/toast';

const DEMO_OTP = '123456';

export default function VerifyOtp() {
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const st = loc.state as { email: string; mobile: string; kind: 'customer' | 'vendor' } | null;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(30);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!st) return <Navigate to="/register" replace />;
  const locked = tries >= 5;

  const verify = () => {
    if (otp === DEMO_OTP) {
      toast('success', 'Account verified', st.kind === 'vendor' ? 'Sign in to start vendor onboarding.' : 'Sign in to start procuring.');
      nav('/login', { replace: true });
    } else {
      setTries((n) => n + 1);
      setError(`Incorrect code. ${Math.max(0, 4 - tries)} attempt(s) left.`);
      setOtp('');
    }
  };

  return (
    <AuthLayout>
      <div className="stack-16">
        <div className="row" style={{ gap: 12 }}>
          <div className="tone-indigo" style={{ width: 42, height: 42, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center' }}><MailCheck size={20} /></div>
          <div>
            <h1>Verify your account</h1>
            <p className="muted small">We sent a 6-digit code to <b>{st.email}</b> and <b className="mono">+91 {st.mobile.slice(0, 2)}•••••{st.mobile.slice(-3)}</b>.</p>
          </div>
        </div>
        {error && <Banner tone="danger">{error}</Banner>}
        {locked ? (
          <Banner tone="danger" lead="Too many attempts.">For your security, verification is locked for 15 minutes.</Banner>
        ) : (
          <>
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} />
            <button className="btn btn-primary btn-lg btn-block" disabled={otp.length !== 6} onClick={verify}>Verify</button>
          </>
        )}
        <div className="row-between small">
          <Link to="/register">Change details</Link>
          {wait > 0 ? <span className="muted">Resend code in <span className="mono">0:{String(wait).padStart(2, '0')}</span></span>
            : <button className="btn btn-ghost btn-sm" onClick={() => { setWait(30); toast('info', 'New code sent'); }}>Resend code</button>}
        </div>
        <Banner tone="info" lead="Demo:">the code is <span className="mono">{DEMO_OTP}</span>.</Banner>
      </div>
    </AuthLayout>
  );
}
