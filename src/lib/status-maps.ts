import {
  AlertTriangle, CheckCircle2, CircleDot, Clock, PackageCheck, PauseCircle, RotateCcw, Truck, XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Pill tones map 1:1 to the existing colour tokens (see .pill.* in index.css). */
export type PillTone = 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'indigo' | 'violet' | 'orange' | 'solid-orange' | 'dark';
export interface StatusStyle { tone: PillTone; icon?: LucideIcon; strong?: boolean; label?: string }

/**
 * Single source of truth: status text → tinted pill (same-hue text, optional icon).
 * Covers settlements, priorities, documents, listings, refunds, vendors and order sub-statuses.
 */
export const STATUS_MAP: Record<string, StatusStyle> = {
  // Settlements
  'In Window': { tone: 'amber', icon: Clock },
  'Open Dispute': { tone: 'red', icon: AlertTriangle },
  Eligible: { tone: 'green', icon: CheckCircle2 },
  Paid: { tone: 'indigo', icon: CheckCircle2 },
  // Priorities
  URGENT: { tone: 'red', strong: true }, HIGH: { tone: 'amber', strong: true }, MEDIUM: { tone: 'blue', strong: true }, LOW: { tone: 'grey', strong: true },
  // Documents / approvals / refunds / vendors / listings
  Approved: { tone: 'green', icon: CheckCircle2 }, Pending: { tone: 'amber', icon: Clock }, 'On Hold': { tone: 'blue', icon: PauseCircle }, Rejected: { tone: 'red', icon: XCircle },
  Active: { tone: 'green' }, Frozen: { tone: 'red' }, Live: { tone: 'green', icon: CircleDot }, Draft: { tone: 'grey' }, Expired: { tone: 'red' },
  Succeeded: { tone: 'green', icon: CheckCircle2 }, Failed: { tone: 'red', icon: XCircle }, Unknown: { tone: 'grey' },
  'Revision pending': { tone: 'blue', label: 'Live · revision pending' }, 'Revision rejected': { tone: 'red', label: 'Live · revision rejected' },
  // Order sub-statuses (pending = amber, processing = sky, delivered = emerald, cancelled/exception = red)
  'Order Placed': { tone: 'amber', icon: Clock, label: 'Awaiting acceptance' },
  Accepted: { tone: 'blue', icon: CircleDot },
  Dispatched: { tone: 'blue', icon: Truck },
  'In Transit': { tone: 'blue', icon: Truck },
  'Out for Delivery': { tone: 'violet', icon: Truck },
  Delivered: { tone: 'green', icon: PackageCheck },
  'Partial Review': { tone: 'amber', icon: AlertTriangle, label: 'Partial · under review' },
  'Delivery Failed': { tone: 'red', icon: AlertTriangle },
  RTO: { tone: 'red', icon: RotateCcw },
  Disputed: { tone: 'red', icon: AlertTriangle },
};

export const statusStyle = (status: string): StatusStyle => STATUS_MAP[status] ?? { tone: 'grey' };
