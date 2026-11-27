import {
  AlertOctagon, BarChart3, Banknote, Boxes, Building2, ClipboardCheck, FileCheck2, FileText, Gauge, History,
  LayoutDashboard, Layers, Package, Percent, Receipt, RotateCcw, Scale, Settings, ShieldAlert,
  ShieldCheck, ShoppingBag, Ticket, Truck, UserCog, Users, Wallet, Warehouse, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../lib/auth';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Vendor items that stay locked until Admin activates the account. */
  lockable?: boolean;
  sub?: boolean;
  badge?: string;
}
export interface NavSection { title?: string; items: NavItem[] }

export const PORTAL_LABEL: Record<Exclude<Role, 'customer'>, { label: string; tone: 'green' | 'indigo' | 'amber' | 'cyan' }> = {
  vendor: { label: 'VENDOR PORTAL', tone: 'green' },
  approver: { label: 'APPROVER', tone: 'cyan' },
  admin: { label: 'ADMIN CONSOLE', tone: 'indigo' },
  support: { label: 'SUPPORT & OPS', tone: 'amber' },
};

export const NAV: Record<Exclude<Role, 'customer'>, NavSection[]> = {
  vendor: [
    {
      items: [
        { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard, lockable: true },
        { to: '/vendor/onboarding', label: 'Onboarding', icon: ClipboardCheck },
        { to: '/vendor/kyc', label: 'KYC & Docs', icon: FileCheck2 },
        { to: '/vendor/capabilities', label: 'Capabilities', icon: Wrench, lockable: true },
        { to: '/vendor/catalog', label: 'My Catalog', icon: Package, lockable: true },
        { to: '/vendor/orders', label: 'Orders', icon: ShoppingBag, lockable: true, badge: '4' },
        { to: '/vendor/settlements', label: 'Settlements', icon: Wallet, lockable: true },
      ],
    },
  ],
  approver: [
    {
      items: [
        { to: '/approver/queue', label: 'Review Queue', icon: ClipboardCheck, badge: '14' },
        { to: '/approver/history', label: 'Decision History', icon: History },
      ],
    },
  ],
  admin: [
    {
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/escalations', label: 'Escalations', icon: AlertOctagon, badge: '5' },
        { to: '/admin/margin', label: 'Margin Mgr', icon: Percent },
        { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
        { to: '/admin/settlements', label: 'Settlements', icon: Wallet },
        { to: '/admin/vendors', label: 'Vendors', icon: Building2 },
        { to: '/admin/config', label: 'Platform Cfg', icon: Settings },
        { to: '/admin/config/staff', label: 'Staff & Roles', icon: UserCog, sub: true },
        { to: '/admin/config/warehouses', label: 'Warehouses', icon: Warehouse, sub: true },
        { to: '/admin/config/audit', label: 'Audit Log', icon: History, sub: true },
        { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { to: '/admin/finance/payments', label: 'Payments & COD', icon: Banknote },
        { to: '/admin/finance/refunds', label: 'Refunds', icon: RotateCcw },
        { to: '/admin/finance/invoices', label: 'Invoices', icon: Receipt },
        { to: '/admin/finance/reconciliation', label: 'Reconciliation', icon: Scale },
      ],
    },
    {
      title: 'WAREHOUSE',
      items: [
        { to: '/admin/warehouse/inbound', label: 'Inbound & Receiving', icon: Truck },
        { to: '/admin/warehouse/inventory', label: 'Inventory & Bins', icon: Boxes },
        { to: '/admin/warehouse/insta', label: 'TrimInsta Ops', icon: Gauge },
      ],
    },
  ],
  support: [
    {
      items: [
        { to: '/support/tickets', label: 'All Tickets', icon: FileText, badge: '23' },
        { to: '/support/disputes', label: 'Return Disputes', icon: RotateCcw, badge: '6' },
        { to: '/support/ndr', label: 'NDR Cases', icon: Truck, badge: '4' },
        { to: '/support/risk', label: 'Risk Flags & Appeals', icon: ShieldAlert },
      ],
    },
  ],
};

export const CUSTOMER_NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/marketplace', label: 'Marketplace', icon: Layers },
  { to: '/account/orders', label: 'My Orders', icon: ShoppingBag },
  { to: '/account/cases', label: 'Cases & Returns', icon: ShieldCheck },
  { to: '/account/profile', label: 'Company Profile', icon: Users },
];
