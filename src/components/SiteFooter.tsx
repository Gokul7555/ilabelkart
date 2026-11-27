import { Link } from 'react-router-dom';
import { BadgeCheck, Mail, Phone } from 'lucide-react';
import { Logo } from './Logo';
import { BRAND } from '../config/brand';
import { CLASSIFICATIONS } from '../data/categories';
import { CONTACT } from '../layouts/TopBar';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="stack-12">
          <Logo />
          <p style={{ maxWidth: 320 }}>B2B marketplace for garment trims, labels and packaging from verified Indian manufacturers. GST invoices on every order.</p>
          <div className="row"><Phone size={14} /> <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>{CONTACT.phone}</a></div>
          <div className="row"><Mail size={14} /> <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
          <div className="row wrap" style={{ gap: 6 }}>
            {['ISO 9001', 'FSC', 'FDA-compliant inks'].map((c) => <span key={c} className="cert-badge"><BadgeCheck size={12} /> {c}</span>)}
            <span className="xs" title="Placeholder certifications for the demo">(sample)</span>
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>{CLASSIFICATIONS.map((c) => <li key={c.id}><Link to={`/marketplace?cls=${c.id}#results`}>{c.name}</Link></li>)}</ul>
        </div>
        <div>
          <h4>Buyers</h4>
          <ul>
            <li><Link to="/quote">Request a Quote</Link></li>
            <li><Link to="/account/orders">Track orders</Link></li>
            <li><Link to="/account/cases">Damage claims (5–7 day window)</Link></li>
            <li><Link to="/register">Open a business account</Link></li>
          </ul>
        </div>
        <div>
          <h4>Suppliers</h4>
          <ul>
            <li><Link to="/register?type=vendor">Become a vendor</Link></li>
            <li><Link to="/login">Vendor portal sign-in</Link></li>
            <li><span>TrimInsta warehousing</span></li>
            <li><span>Compliance & KYC</span></li>
          </ul>
        </div>
      </div>
      <div className="legal">
        <span>© 2026 {BRAND.name} · {BRAND.domain}</span>
        <span>GSTIN <span className="mono">{CONTACT.gstin}</span></span>
        <span>Prices are pre-tax; GST shown at checkout</span>
        <span className="grow" />
        <span>Terms · Privacy · Grievance officer</span>
      </div>
    </footer>
  );
}
