import type { Role } from '../lib/auth';

export interface Notice { id: string; title: string; body: string; at: string; tone: 'red' | 'amber' | 'green' | 'blue' | 'indigo'; to?: string }

export const NOTIFICATIONS: Record<Role, Notice[]> = {
  vendor: [
    { id: 'n1', title: 'New sub-order SO-2026-110431', body: 'Raymond Garments Ltd · 2,000 units · accept within 1 business day', at: '2026-11-26T09:12:00+05:30', tone: 'indigo', to: '/vendor/orders' },
    { id: 'n2', title: 'GOTS certificate expires in 12 days', body: 'Upload the renewed certificate to keep the badge and sales active.', at: '2026-11-26T08:00:00+05:30', tone: 'amber', to: '/vendor/kyc' },
    { id: 'n3', title: 'Dispatch overdue: SO-2026-110398', body: 'Lead time promise was 48h. Dispatch now to avoid SLA penalty.', at: '2026-11-25T18:20:00+05:30', tone: 'red', to: '/vendor/orders' },
    { id: 'n4', title: 'Payout released', body: 'Batch SB-2026-047 · UTR HDFC0026112489', at: '2026-11-24T11:05:00+05:30', tone: 'green', to: '/vendor/settlements' },
  ],
  customer: [
    { id: 'c1', title: 'Out for delivery: ORD-2026-5742', body: 'ZipKing International sub-order via BlueDart', at: '2026-11-26T09:40:00+05:30', tone: 'blue', to: '/account/orders' },
    { id: 'c2', title: 'Return window closes in 2 days', body: 'ORD-2026-5698 · raise damage claims before 28 Nov 2026', at: '2026-11-26T08:00:00+05:30', tone: 'amber', to: '/account/orders' },
    { id: 'c3', title: 'Case TKT-2026-4821 updated', body: 'Support requested additional photos.', at: '2026-11-25T16:30:00+05:30', tone: 'indigo', to: '/account/cases' },
  ],
  approver: [
    { id: 'a1', title: '7 product revisions waiting', body: 'Oldest is 2 days old', at: '2026-11-26T09:00:00+05:30', tone: 'amber', to: '/approver/queue' },
    { id: 'a2', title: 'New KYC submission', body: 'Ribbonex India uploaded GST + 3 certificates', at: '2026-11-26T07:45:00+05:30', tone: 'indigo', to: '/approver/queue' },
  ],
  admin: [
    { id: 'd1', title: '3 SLA breaches need action', body: 'Vendor acceptance > 1 business day', at: '2026-11-26T09:30:00+05:30', tone: 'red', to: '/admin/dashboard' },
    { id: 'd2', title: 'Fraud flag raised', body: 'Customer with 4 suspicious returns · Support review pending', at: '2026-11-25T14:10:00+05:30', tone: 'amber', to: '/admin/escalations' },
    { id: 'd3', title: 'Settlement batch ready', body: '₹8,42,310.00 eligible across 6 vendors', at: '2026-11-25T10:00:00+05:30', tone: 'green', to: '/admin/settlements' },
  ],
  support: [
    { id: 's1', title: 'NDR-2026-0091: 3rd attempt failed', body: 'Act within 24 hours — confirm address or RTO', at: '2026-11-26T09:05:00+05:30', tone: 'red', to: '/support/ndr' },
    { id: 's2', title: 'Dispute auto-escalated', body: 'DSP-2026-0331 — vendor did not respond in 2 business days', at: '2026-11-26T08:15:00+05:30', tone: 'amber', to: '/support/disputes' },
  ],
};
