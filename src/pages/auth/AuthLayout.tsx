import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Truck, Wallet, Zap } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { BRAND } from '../../config/brand';

const FEATURES = [
  { icon: BadgeCheck, title: 'Verified suppliers only', body: 'GST, PAN and compliance certificates reviewed before any product goes live.' },
  { icon: Zap, title: 'TrimInsta 6-Hour', body: 'Express delivery from the nearest hub inside the service zone.' },
  { icon: Truck, title: 'One order, many vendors', body: 'Single checkout, vendor sub-orders and a GST invoice per vendor.' },
  { icon: Wallet, title: 'Protected payouts', body: 'Vendor money is released only after delivery is verified and the return window closes.' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <Link to="/marketplace" style={{ textDecoration: 'none' }}><Logo size={24} /></Link>
        <img className="hero-photo" src="https://placehold.co/1040x455/334155/CBD5E1/png?font=ibm-plex-sans&text=Trims+warehouse+%C2%B7+placeholder" alt="Trims warehouse (placeholder photo)" />
        <div className="stack-12">
          <h2>India's Premier <em>Garment Trims</em> Marketplace</h2>
          <p className="lead">Labels, threads, zippers, packaging and more — from verified Indian manufacturers, with GST-compliant invoicing.</p>
        </div>
        <div className="features stack-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="auth-feature">
              <div className="af-icon"><f.icon size={17} /></div>
              <div><b>{f.title}</b>{f.body}</div>
            </div>
          ))}
        </div>
        <div className="xs" style={{ color: 'var(--header-ink-2)', marginTop: 'auto' }}>© 2026 {BRAND.name} · {BRAND.domain}</div>
      </aside>
      <div className="auth-panel">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
