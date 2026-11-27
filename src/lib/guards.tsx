import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from './auth';
import type { Role } from './auth';
import { useVendorState } from './vendorState';
import { permForPath, useStaff } from './staff';

/** Only the listed roles may enter; others are sent to their own home. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to="/forbidden" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

/** Login/register pages: bounce signed-in users to their home. */
export function GuestOnly() {
  const { user } = useAuth();
  if (user) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

/** Vendor pages that stay locked until Admin activates the account. */
export function RequireActiveVendor() {
  const { status } = useVendorState();
  if (status !== 'active') return <Navigate to="/vendor/onboarding" replace />;
  return <Outlet />;
}

/** Admin console: staff roles only see the screens their permission matrix allows. */
export function RequireAdminPerm() {
  const { user } = useAuth();
  const { can } = useStaff();
  const loc = useLocation();
  const perm = permForPath(loc.pathname);
  if (perm && !can(user, perm)) return <Navigate to="/forbidden" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}
