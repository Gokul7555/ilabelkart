import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homeFor, useAuth } from './lib/auth';
import type { Role } from './lib/auth';
import { AuditProvider } from './lib/audit';
import { ToastProvider } from './lib/toast';
import { VendorStateProvider } from './lib/vendorState';
import { GuestOnly, RequireAdminPerm, RequireRole } from './lib/guards';
import { PortalLayout } from './layouts/PortalLayout';
import { MarketLayout } from './layouts/MarketLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForgotPassword from './pages/auth/ForgotPassword';
import Onboarding from './pages/vendor/Onboarding';
import KycDocs from './pages/vendor/KycDocs';
import Capabilities from './pages/vendor/Capabilities';
import Catalog from './pages/vendor/Catalog';
import ProductForm from './pages/vendor/ProductForm';
import ProductView from './pages/vendor/ProductView';
import ApproverQueue from './pages/approver/Queue';
import ApproverHistory from './pages/approver/History';
import { CatalogProvider } from './lib/catalog';
import { CartProvider } from './lib/cart';
import { OrdersProvider } from './lib/orders';
import { CasesProvider } from './lib/cases';
import { SupportProvider } from './lib/support';
import { AdminProvider } from './lib/admin';
import { SettlementsProvider } from './lib/settlements';
import { FinanceProvider } from './lib/finance';
import { WarehouseProvider } from './lib/warehouse';
import { StaffProvider } from './lib/staff';
import { ProfileProvider } from './lib/profile';
import { NotificationsProvider } from './lib/notifications';
import StaffRoles from './pages/admin/StaffRoles';
import Reports from './pages/admin/Reports';
import Profile from './pages/account/Profile';
import Quote from './pages/market/Quote';
import { ThemeProvider } from './lib/theme';
import Payments from './pages/finance/Payments';
import Refunds from './pages/finance/Refunds';
import Invoices from './pages/finance/Invoices';
import Reconciliation from './pages/finance/Reconciliation';
import InboundPage from './pages/warehouse/Inbound';
import InventoryPage from './pages/warehouse/Inventory';
import InstaOps from './pages/warehouse/Insta';
import WarehousesPage from './pages/warehouse/Warehouses';
import AdminDashboard from './pages/admin/Dashboard';
import Escalations from './pages/admin/Escalations';
import Margin from './pages/admin/Margin';
import Coupons from './pages/admin/Coupons';
import AdminVendors from './pages/admin/Vendors';
import AdminSettlements from './pages/admin/Settlements';
import PlatformConfigPage from './pages/admin/PlatformConfig';
import AuditLog from './pages/admin/AuditLog';
import VendorSettlements from './pages/vendor/Settlements';
import SupportTickets from './pages/support/Tickets';
import SupportDisputes from './pages/support/Disputes';
import SupportNdr from './pages/support/Ndr';
import SupportCaseDetail from './pages/support/CaseDetail';
import SupportRisk from './pages/support/Risk';
import MyOrders from './pages/account/Orders';
import OrderDetail from './pages/account/OrderDetail';
import RaiseClaim from './pages/account/RaiseClaim';
import Cases from './pages/account/Cases';
import VendorOrders from './pages/vendor/Orders';
import VendorDashboard from './pages/vendor/Dashboard';
import MarketplaceHome from './pages/market/Home';
import ProductDetail from './pages/market/ProductDetail';
import Cart from './pages/market/Cart';
import Checkout from './pages/market/Checkout';
import Confirmation from './pages/market/Confirmation';
import { PlatformConfigProvider } from './lib/platformConfig';
import { OnboardingProvider } from './lib/onboarding';
import { RequireActiveVendor } from './lib/guards';
import DesignSystem from './pages/DesignSystem';
import { Forbidden, NotFound, NotificationCentre } from './pages/SystemPages';

const ALL: Role[] = ['vendor', 'customer', 'approver', 'admin', 'support'];

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user) : '/marketplace'} replace />;
}

/** Shared pages render inside whichever shell the signed-in role uses. */
function RoleLayout() {
  const { user } = useAuth();
  return user?.role === 'customer' ? <MarketLayout /> : <PortalLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuditProvider>
            <PlatformConfigProvider>
            <OnboardingProvider>
            <VendorStateProvider>
            <CatalogProvider>
            <CartProvider>
            <OrdersProvider>
            <CasesProvider>
            <SupportProvider>
            <AdminProvider>
            <SettlementsProvider>
            <FinanceProvider>
            <WarehouseProvider>
            <StaffProvider>
            <ProfileProvider>
            <NotificationsProvider>
              <Routes>
                <Route path="/" element={<Home />} />

                {/* Auth */}
                <Route element={<GuestOnly />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-otp" element={<VerifyOtp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>

                {/* Marketplace — browsing is public; buying requires a customer login */}
                <Route element={<MarketLayout />}>
                  <Route path="/marketplace" element={<MarketplaceHome />} />
                  <Route path="/marketplace/products/:id" element={<ProductDetail />} />
                  <Route path="/quote" element={<Quote />} />
                  <Route element={<RequireRole roles={['customer']} />}>
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmation/:id" element={<Confirmation />} />
                    <Route path="/account/orders" element={<MyOrders />} />
                    <Route path="/account/orders/:id" element={<OrderDetail />} />
                    <Route path="/account/cases" element={<Cases />} />
                    <Route path="/account/cases/new" element={<RaiseClaim />} />
                    <Route path="/account/profile" element={<Profile />} />
                  </Route>
                </Route>

                {/* Vendor */}
                <Route element={<RequireRole roles={['vendor']} />}>
                  <Route element={<PortalLayout />}>
                    <Route path="/vendor" element={<Navigate to="/vendor/dashboard" replace />} />
                    <Route path="/vendor/onboarding" element={<Onboarding />} />
                    <Route path="/vendor/kyc" element={<KycDocs />} />
                    {/* Locked until Admin activates the vendor */}
                    <Route element={<RequireActiveVendor />}>
                      <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                      <Route path="/vendor/capabilities" element={<Capabilities />} />
                      <Route path="/vendor/catalog" element={<Catalog />} />
                      <Route path="/vendor/catalog/new" element={<ProductForm />} />
                      <Route path="/vendor/catalog/:id" element={<ProductView />} />
                      <Route path="/vendor/catalog/:id/edit" element={<ProductForm />} />
                      <Route path="/vendor/orders" element={<VendorOrders />} />
                      <Route path="/vendor/settlements" element={<VendorSettlements />} />
                    </Route>
                  </Route>
                </Route>

                {/* Approver */}
                <Route element={<RequireRole roles={['approver']} />}>
                  <Route element={<PortalLayout />}>
                    <Route path="/approver" element={<Navigate to="/approver/queue" replace />} />
                    <Route path="/approver/queue" element={<ApproverQueue />} />
                    <Route path="/approver/history" element={<ApproverHistory />} />
                  </Route>
                </Route>

                {/* Admin (+ Finance & Warehouse role-gated screens) */}
                <Route element={<RequireRole roles={['admin']} />}>
                  <Route element={<PortalLayout />}>
                    <Route element={<RequireAdminPerm />}>
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/escalations" element={<Escalations />} />
                    <Route path="/admin/margin" element={<Margin />} />
                    <Route path="/admin/coupons" element={<Coupons />} />
                    <Route path="/admin/settlements" element={<AdminSettlements />} />
                    <Route path="/admin/vendors" element={<AdminVendors />} />
                    <Route path="/admin/config" element={<PlatformConfigPage />} />
                    <Route path="/admin/config/staff" element={<StaffRoles />} />
                    <Route path="/admin/reports" element={<Reports />} />
                    <Route path="/admin/config/warehouses" element={<WarehousesPage />} />
                    <Route path="/admin/config/audit" element={<AuditLog />} />
                    <Route path="/admin/finance/payments" element={<Payments />} />
                    <Route path="/admin/finance/refunds" element={<Refunds />} />
                    <Route path="/admin/finance/invoices" element={<Invoices />} />
                    <Route path="/admin/finance/reconciliation" element={<Reconciliation />} />
                    <Route path="/admin/warehouse/inbound" element={<InboundPage />} />
                    <Route path="/admin/warehouse/inventory" element={<InventoryPage />} />
                    <Route path="/admin/warehouse/insta" element={<InstaOps />} />
                    </Route>
                  </Route>
                </Route>

                {/* Support & Ops */}
                <Route element={<RequireRole roles={['support']} />}>
                  <Route element={<PortalLayout />}>
                    <Route path="/support" element={<Navigate to="/support/tickets" replace />} />
                    <Route path="/support/tickets" element={<SupportTickets />} />
                    <Route path="/support/tickets/:id" element={<SupportCaseDetail />} />
                    <Route path="/support/disputes" element={<SupportDisputes />} />
                    <Route path="/support/ndr" element={<SupportNdr />} />
                    <Route path="/support/risk" element={<SupportRisk />} />
                  </Route>
                </Route>

                {/* Any signed-in role, rendered in that role's own shell */}
                <Route element={<RequireRole roles={ALL} />}>
                  <Route element={<RoleLayout />}>
                    <Route path="/notifications" element={<NotificationCentre />} />
                    <Route path="/design" element={<DesignSystem />} />
                    <Route path="/forbidden" element={<Forbidden />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </NotificationsProvider>
            </ProfileProvider>
            </StaffProvider>
            </WarehouseProvider>
            </FinanceProvider>
            </SettlementsProvider>
            </AdminProvider>
            </SupportProvider>
            </CasesProvider>
            </OrdersProvider>
            </CartProvider>
            </CatalogProvider>
            </VendorStateProvider>
            </OnboardingProvider>
            </PlatformConfigProvider>
          </AuditProvider>
        </AuthProvider>
      </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
