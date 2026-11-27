import { Link, Outlet, useLocation } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { StoreHeader } from './TopBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SiteFooter } from '../components/SiteFooter';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';

/** Customer-facing shell: utility bar, main bar, category bar + mega menu, footer. */
export function MarketLayout() {
  const { user } = useAuth();
  const { items } = useCart();
  const loc = useLocation();
  const fab = !['/quote', '/checkout', '/cart'].includes(loc.pathname);
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <StoreHeader cartCount={!user || user.role === 'customer' ? items.length : undefined} />
      <main id="main" className={`mk-main ${fab ? 'has-fab' : ''}`}>
        <Breadcrumbs />
        <ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary>
      </main>
      <SiteFooter />
      {fab && <Link to="/quote" className="btn btn-primary btn-lg rfq-fab"><FileText size={16} /> Request a Quote</Link>}
    </>
  );
}
