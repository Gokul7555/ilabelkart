import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ShoppingBag } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Banner, Tabs } from '../../components/ui';

type Kind = 'customer' | 'vendor';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function Register() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [kind, setKind] = useState<Kind>(params.get('type') === 'vendor' ? 'vendor' : 'customer');
  const [f, setF] = useState({ company: '', gstin: '', name: '', email: '', mobile: '', pw: '', pw2: '', terms: false });
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const errors: Partial<Record<keyof typeof f, string>> = {};
  if (!f.company.trim()) errors.company = 'Company name is required';
  if (f.gstin && !GSTIN_RE.test(f.gstin.toUpperCase())) errors.gstin = 'GSTIN must be 15 characters, e.g. 27AABCR1234F1Z5';
  if (!f.name.trim()) errors.name = 'Contact name is required';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errors.email = 'Enter a valid work email';
  if (!/^[6-9]\d{9}$/.test(f.mobile)) errors.mobile = 'Enter a 10-digit Indian mobile number';
  if (f.pw.length < 8 || !/[A-Z]/.test(f.pw) || !/\d/.test(f.pw)) errors.pw = 'Min 8 chars with an uppercase letter and a number';
  if (f.pw2 !== f.pw) errors.pw2 = 'Passwords do not match';
  if (!f.terms) errors.terms = 'Please accept the terms';
  const valid = Object.keys(errors).length === 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    nav('/verify-otp', { state: { email: f.email, mobile: f.mobile, kind } });
  };

  const err = (k: keyof typeof f) => touched && errors[k] ? <span className="err">{errors[k]}</span> : null;

  return (
    <AuthLayout>
      <form onSubmit={submit} className="stack-16" noValidate>
        <div>
          <h1>Create your account</h1>
          <p className="muted" style={{ marginTop: 4 }}>Registration is free. You'll verify your email and mobile with a one-time code.</p>
        </div>
        <Tabs<Kind> block value={kind} onChange={setKind} tabs={[
          { id: 'customer', label: 'I buy trims', icon: ShoppingBag },
          { id: 'vendor', label: 'I sell trims', icon: Building2 },
        ]} />
        {kind === 'vendor' && (
          <Banner tone="info" lead="Vendor accounts">are activated by TrimNova only after GST, PAN and required compliance documents are approved. You'll complete this in Onboarding after sign-up.</Banner>
        )}
        <div className="field">
          <label htmlFor="company">{kind === 'vendor' ? 'Legal business name' : 'Company name'}</label>
          <input id="company" className={`input ${touched && errors.company ? 'invalid' : ''}`} value={f.company} onChange={set('company')} placeholder={kind === 'vendor' ? 'NovaTex Manufacturing' : 'Raymond Garments Ltd'} />
          {err('company')}
        </div>
        {kind === 'customer' && (
          <div className="field">
            <label htmlFor="gstin">GSTIN <span className="muted">(optional — needed for input tax credit)</span></label>
            <input id="gstin" className={`input mono ${touched && errors.gstin ? 'invalid' : ''}`} maxLength={15} value={f.gstin} onChange={(e) => setF((x) => ({ ...x, gstin: e.target.value.toUpperCase() }))} placeholder="27AABCR1234F1Z5" />
            {err('gstin')}
          </div>
        )}
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="name">Contact person</label>
            <input id="name" className={`input ${touched && errors.name ? 'invalid' : ''}`} value={f.name} onChange={set('name')} />
            {err('name')}
          </div>
          <div className="field">
            <label htmlFor="mobile">Mobile</label>
            <div className="input-group">
              <span className="input" style={{ width: 56, display: 'grid', placeItems: 'center', background: 'var(--slate-100)' }}>+91</span>
              <input id="mobile" className={`input mono ${touched && errors.mobile ? 'invalid' : ''}`} inputMode="numeric" maxLength={10} value={f.mobile} onChange={(e) => setF((x) => ({ ...x, mobile: e.target.value.replace(/\D/g, '') }))} />
            </div>
            {err('mobile')}
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" className={`input ${touched && errors.email ? 'invalid' : ''}`} value={f.email} onChange={set('email')} />
          {err('email')}
        </div>
        <div className="grid g-2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" className={`input ${touched && errors.pw ? 'invalid' : ''}`} value={f.pw} onChange={set('pw')} autoComplete="new-password" />
            {err('pw')}
          </div>
          <div className="field">
            <label htmlFor="pw2">Confirm password</label>
            <input id="pw2" type="password" className={`input ${touched && errors.pw2 ? 'invalid' : ''}`} value={f.pw2} onChange={set('pw2')} autoComplete="new-password" />
            {err('pw2')}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.terms} onChange={set('terms')} />
          <span>I agree to the {kind === 'vendor' ? 'Vendor Partnership Agreement' : 'Buyer Terms'} and Privacy Policy.</span>
        </label>
        {err('terms')}
        <button className="btn btn-primary btn-lg btn-block">Continue — verify with OTP</button>
        <div className="small muted" style={{ textAlign: 'center' }}>Already registered? <Link to="/login" className="bold">Sign in</Link></div>
      </form>
    </AuthLayout>
  );
}
