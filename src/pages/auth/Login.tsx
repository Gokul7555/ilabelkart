import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Banner, OtpInput } from '../../components/ui';
import { homeFor, useAuth } from '../../lib/auth';
import type { User } from '../../lib/auth';
import { useToast } from '../../lib/toast';

const DEMO: { role: string; login: string; password: string; note?: string }[] = [
  { role: 'Vendor', login: 'procurement@novatex.in', password: 'NovaTex@2024' },
  { role: 'Customer', login: 'buyer@raymondgarments.in', password: 'Raymond@2024' },
  { role: 'Approver', login: 'approver@trimnova.in', password: 'Approver@2024' },
  { role: 'Admin', login: 'ROOT-01', password: 'AdminRoot@2024', note: 'TOTP 849201 (or blank)' },
  { role: 'Support', login: 'support@trimnova.in', password: 'Support@2024' },
  { role: 'Finance', login: 'finance@trimnova.in', password: 'Finance@2024', note: 'Finance@2024 + TOTP' },
  { role: 'Warehouse', login: 'warehouse@trimnova.in', password: 'Warehouse@2024', note: 'Warehouse@2024 + TOTP' },
];

/** Customers may only return to customer pages; other roles go to their home. */
function landing(user: User, from?: string): string {
  const role = user.role;
  if (!from) return homeFor(user);
  const prefix: Record<User['role'], string[]> = {
    vendor: ['/vendor'], customer: ['/marketplace', '/account', '/cart', '/checkout', '/order-confirmation'], approver: ['/approver'], admin: ['/admin'], support: ['/support'],
  };
  return prefix[role].some((p) => from.startsWith(p)) ? from : homeFor(user);
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const from = (loc.state as { from?: string } | null)?.from;
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [totpStep, setTotpStep] = useState(false);
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const attempt = (totpValue?: string) => {
    setBusy(true);
    setError('');
    // Simulated network latency.
    setTimeout(() => {
      const r = login(id, pw, totpValue);
      setBusy(false);
      if (r.ok) {
        toast('success', `Welcome, ${r.user.name}`, r.user.org);
        nav(landing(r.user, from), { replace: true });
      } else if ('needTotp' in r) {
        setTotpStep(true);
      } else {
        setError(r.error);
      }
    }, 450);
  };

  const submit = (e: FormEvent) => { e.preventDefault(); attempt(totpStep ? totp : undefined); };

  return (
    <AuthLayout>
      <form onSubmit={submit} className="stack-16" noValidate>
        {!totpStep ? (
          <>
            <div>
              <h1>Sign in</h1>
              <p className="muted" style={{ marginTop: 4 }}>One login for buyers, vendors and the TrimNova team. We detect your role automatically.</p>
            </div>
            {from && <Banner tone="info" lead="Sign in required.">Please sign in to continue to {from}.</Banner>}
            {error && <Banner tone="danger">{error}</Banner>}
            <div className="field">
              <label htmlFor="login">Email or Admin ID</label>
              <div className="input-icon">
                <Mail size={15} />
                <input id="login" className="input" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} placeholder="you@company.in" autoFocus />
              </div>
            </div>
            <div className="field">
              <div className="row-between">
                <label htmlFor="pw">Password</label>
                <Link to="/forgot-password" className="xs bold">Forgot password?</Link>
              </div>
              <div className="input-icon" style={{ position: 'relative' }}>
                <Lock size={15} />
                <input id="pw" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" style={{ paddingRight: 40 }} />
                <button type="button" className="icon-btn light" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 3, top: 2, width: 34, height: 34, color: 'var(--slate-500)' }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={!id || !pw || busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <div className="small muted" style={{ textAlign: 'center' }}>
              New here? <Link to="/register" className="bold">Create a buyer account</Link> or <Link to="/register?type=vendor" className="bold">become a vendor</Link>
            </div>
            <div className="demo-creds">
              <div className="row" style={{ padding: '2px 8px 6px' }}>
                <KeyRound size={13} style={{ color: 'var(--primary)' }} />
                <span className="caps" style={{ color: 'var(--primary-600)' }}>Demo credentials — click to fill</span>
              </div>
              {DEMO.map((d) => (
                <button type="button" key={d.role} className="demo-row" onClick={() => { setId(d.login); setPw(d.password); setError(''); }}>
                  <span className="role">{d.role}</span>
                  <span className="grow mono" style={{ fontSize: 11 }}>{d.login}</span>
                  <span className="mono muted" style={{ fontSize: 10.5 }}>{d.note ?? d.password}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => { setTotpStep(false); setTotp(''); setError(''); }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div className="row" style={{ gap: 12 }}>
              <div className="ph-icon tone-indigo" style={{ width: 42, height: 42, borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center' }}><ShieldCheck size={20} /></div>
              <div>
                <h1>Two-factor verification</h1>
                <p className="muted small">Admin Console requires a 6-digit code from your authenticator app.</p>
              </div>
            </div>
            {error && <Banner tone="danger">{error}</Banner>}
            <OtpInput value={totp} onChange={setTotp} />
            <button className="btn btn-primary btn-lg btn-block" disabled={busy || (totp.length > 0 && totp.length < 6)}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
            <Banner tone="info" lead="Demo:">use <span className="mono">849201</span>, or leave blank.</Banner>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
