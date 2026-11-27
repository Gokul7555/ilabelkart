import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Banner, OtpInput } from '../../components/ui';
import { useToast } from '../../lib/toast';

type Step = 'email' | 'otp' | 'reset';

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return [
    { score: 0, label: 'Too short', color: 'var(--slate-300)' },
    { score: 1, label: 'Weak', color: 'var(--danger)' },
    { score: 2, label: 'Fair', color: 'var(--warning)' },
    { score: 3, label: 'Good', color: 'var(--info)' },
    { score: 4, label: 'Strong', color: 'var(--success)' },
  ][s];
}

export default function ForgotPassword() {
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const st = strength(pw);

  return (
    <AuthLayout>
      <div className="stack-16">
        <Link to="/login" className="small row"><ArrowLeft size={14} /> Back to sign in</Link>
        <div className="row" style={{ gap: 12 }}>
          <div className="tone-indigo" style={{ width: 42, height: 42, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center' }}><KeyRound size={20} /></div>
          <div>
            <h1>Reset password</h1>
            <p className="muted small">Step {step === 'email' ? 1 : step === 'otp' ? 2 : 3} of 3</p>
          </div>
        </div>
        {error && <Banner tone="danger">{error}</Banner>}

        {step === 'email' && (
          <>
            <div className="field">
              <label htmlFor="em">Registered email</label>
              <input id="em" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.in" autoFocus />
              <span className="hint">Admin accounts reset via the platform owner, not this form.</span>
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => { setStep('otp'); toast('info', 'Code sent', `If ${email} is registered, a code is on its way.`); }}>Send reset code</button>
          </>
        )}

        {step === 'otp' && (
          <>
            <p className="small">Enter the 6-digit code sent to <b>{email}</b>.</p>
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} />
            <button className="btn btn-primary btn-lg btn-block" disabled={otp.length !== 6}
              onClick={() => (otp === '123456' ? setStep('reset') : (setError('Incorrect code.'), setOtp('')))}>Verify code</button>
            <Banner tone="info" lead="Demo:">the code is <span className="mono">123456</span>.</Banner>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="field">
              <label htmlFor="np">New password</label>
              <input id="np" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
              <div className="row" style={{ gap: 4 }}>
                {[1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 'var(--radius-sm)', background: i <= st.score ? st.color : 'var(--slate-200)' }} />)}
                <span className="xs" style={{ color: st.color, marginLeft: 6, width: 60 }}>{st.label}</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="np2">Confirm new password</label>
              <input id="np2" type="password" className={`input ${pw2 && pw2 !== pw ? 'invalid' : ''}`} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              {pw2 && pw2 !== pw && <span className="err">Passwords do not match</span>}
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={st.score < 3 || pw !== pw2}
              onClick={() => { toast('success', 'Password updated', 'Sign in with your new password.'); nav('/login'); }}>Update password</button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
