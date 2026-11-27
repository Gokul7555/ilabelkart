import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ADDRESSES, OTHER_ADDRESSES } from '../data/customer';
import type { Address } from '../data/customer';
import type { Fulfilment } from './pricing';

/* =========================================================
   Types
   ========================================================= */

export type PayMethod = 'card' | 'upi' | 'netbanking' | 'cod';
export type RefundStatus = 'Pending' | 'Failed' | 'Unknown' | 'Succeeded';

/** Happy path, in order. */
export const FLOW = ['Order Placed', 'Accepted', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered'] as const;
export type FlowStatus = (typeof FLOW)[number];
export type ExceptionStatus = 'Rejected' | 'Partial Review' | 'Delivery Failed' | 'RTO' | 'Disputed';
export type SubStatus = FlowStatus | ExceptionStatus;

export interface OrderLine {
  productId: string; sku: string; title: string; qty: number; unit: string; shade?: string;
  /** Buyer unit price (pre-tax, includes category commission). */
  unitPrice: number;
  /** Vendor's base unit price — what vendors see. */
  basePrice: number;
  amount: number; gstRate: number; hue: number;
}

export interface TrackEvent { at: string; status: string; note?: string; place?: string }

export interface SubOrder {
  id: string;
  orderId: string;
  customerId: string;
  vendorId: string;
  fulfilment: Fulfilment;
  hubName?: string;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
  leadTimeDays: number;
  status: SubStatus;
  events: TrackEvent[];
  placedAt: string;
  acceptBy: string;
  dispatchBy?: string;
  courier?: 'Delhivery' | 'BlueDart';
  awb?: string;
  handover?: { at: string; by: string; packages: number; weightKg: number; otpVerified: true };
  deliveryOtp: string;
  delivery?: { at: string; receivedBy: string; otpVerified: boolean; photo: string };
  rejection?: { at: string; reason: string };
  partial?: { at: string; reason: string; lines: { productId: string; qty: number }[] };
  ndr?: { id: string; attempts: number; reason: string; lastAttempt: string };
  invoiceNo?: string;
  returnWindowEnds?: string;
  refund?: { amount: number; status: RefundStatus; ref: string; at: string; approvedBy?: string; approvedAt?: string };
  adminNote?: string;
}

export interface Order {
  id: string;
  customerId: string;
  placedAt: string;
  address: Address;
  billingGstin: string;
  payment: { method: PayMethod; status: 'Captured' | 'COD pending' | 'COD remitted' | 'No charge'; txn?: string };
  /** Replacement orders link back to the case that created them. */
  replacementFor?: string;
  subOrders: SubOrder[];
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
}

export type NewSubOrder = Pick<SubOrder, 'vendorId' | 'fulfilment' | 'hubName' | 'lines' | 'subtotal' | 'shipping' | 'gst' | 'total' | 'leadTimeDays'>;

/* =========================================================
   Helpers
   ========================================================= */

const DAY = 86400000;
/** Add business days (Sunday is the only weekly holiday here). */
export function addBusinessDays(fromIso: string, days: number): string {
  const d = new Date(fromIso);
  let left = days;
  while (left > 0) { d.setTime(d.getTime() + DAY); if (d.getDay() !== 0) left--; }
  return d.toISOString();
}
export const isOverdue = (iso?: string) => !!iso && new Date(iso).getTime() < Date.now();
export const isException = (s: SubStatus) => !(FLOW as readonly string[]).includes(s);
export const flowIndex = (s: SubStatus) => (FLOW as readonly string[]).indexOf(s);
export const vendorAmount = (so: SubOrder) => so.lines.reduce((s, l) => s + l.basePrice * l.qty, 0);
/** Courier is assigned by the system, never chosen by the vendor. */
export const assignCourier = (soId: string): 'Delhivery' | 'BlueDart' => (parseInt(soId.slice(-2), 10) % 2 ? 'BlueDart' : 'Delhivery');
const awbFor = (c: 'Delhivery' | 'BlueDart', soId: string) => (c === 'Delhivery' ? `DLV${soId.slice(-6)}${'4471'}` : `BD${soId.slice(-6)}IN`);
const otp6 = () => String(Math.floor(100000 + Math.random() * 900000));

/* =========================================================
   Seed data
   ========================================================= */

const L = (productId: string, sku: string, title: string, qty: number, unit: string, basePrice: number, unitPrice: number, gstRate: number, hue: number, shade?: string): OrderLine =>
  ({ productId, sku, title, qty, unit, basePrice, unitPrice, amount: Math.round(unitPrice * qty * 100) / 100, gstRate, hue, shade });

function totals(lines: OrderLine[], fulfilment: Fulfilment) {
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const shipping = fulfilment === 'insta' ? 350 : subtotal >= 25000 ? 0 : 180;
  const gst = Math.round((lines.reduce((s, l) => s + (l.amount * l.gstRate) / 100, 0) + shipping * 0.18) * 100) / 100;
  return { subtotal, shipping, gst, total: subtotal + shipping + gst };
}

const t = (s: string) => `${s}+05:30`;
const ev = (status: string, at: string, note?: string, place?: string): TrackEvent => ({ status, at: t(at), note, place });

function so(p: Omit<SubOrder, 'subtotal' | 'shipping' | 'gst' | 'total' | 'deliveryOtp'> & { deliveryOtp?: string }): SubOrder {
  return { ...totals(p.lines, p.fulfilment), deliveryOtp: p.deliveryOtp ?? '371904', ...p };
}

function order(id: string, customerId: string, placedAt: string, subs: SubOrder[], payment: Order['payment']): Order {
  const address = customerId === 'CU-30117' ? ADDRESSES[0] : OTHER_ADDRESSES[customerId];
  const sum = (k: 'subtotal' | 'shipping' | 'gst' | 'total') => subs.reduce((s, x) => s + x[k], 0);
  return { id, customerId, placedAt: t(placedAt), address, billingGstin: '', payment, subOrders: subs, subtotal: sum('subtotal'), shipping: sum('shipping'), gst: sum('gst'), total: sum('total') };
}

const DAMASK = (qty: number, shade = 'Navy') => L('P-1001', 'NTX-WL-2201', 'Woven Damask Main Label, 50 × 20 mm', qty, 'pcs', 2.15, 2.34, 12, 255, shade);

const SEED: Order[] = [
  // 1) Two-vendor order: NovaTex delivered (in return window) + ZipKing out for delivery
  order('ORD-2026-5742', 'CU-30117', '2026-11-21T11:40:00', [
    so({
      id: 'SO-2026-110423', orderId: 'ORD-2026-5742', customerId: 'CU-30117', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [DAMASK(5000)], status: 'Delivered', placedAt: t('2026-11-21T11:40:00'), acceptBy: t('2026-11-22T11:40:00'), dispatchBy: t('2026-11-24T18:00:00'),
      courier: 'Delhivery', awb: 'DLV1104234471', handover: { at: t('2026-11-22T16:05:00'), by: 'Rohan Mehta (VN-89420)', packages: 2, weightKg: 6.5, otpVerified: true },
      delivery: { at: t('2026-11-24T14:32:00'), receivedBy: 'Suresh Patil (Stores)', otpVerified: true, photo: 'POD_110423.jpg' },
      invoiceNo: 'INV-NTX-2026-0912', returnWindowEnds: t('2026-12-01T23:59:00'),
      events: [
        ev('Order Placed', '2026-11-21T11:40:00'), ev('Accepted', '2026-11-21T15:10:00', 'Accepted by vendor'),
        ev('Dispatched', '2026-11-22T16:05:00', 'OTP handover to Delhivery verified', 'Andheri East, Mumbai'),
        ev('In Transit', '2026-11-23T07:20:00', 'Arrived at hub', 'Bhiwandi Gateway'), ev('Out for Delivery', '2026-11-24T09:15:00', 'Out for delivery', 'Thane DC'),
        ev('Delivered', '2026-11-24T14:32:00', 'Delivered · OTP verified · received by Suresh Patil', 'Thane'),
      ],
    }),
    so({
      id: 'SO-2026-110424', orderId: 'ORD-2026-5742', customerId: 'CU-30117', vendorId: 'VN-61873', fulfilment: 'standard', leadTimeDays: 3,
      lines: [L('P-2008', 'ZK-MZ-0518', '#5 Metal Zipper, Antique Brass, Auto-lock Slider, 18 cm', 2500, 'pcs', 12.9, 14.0, 18, 15, 'Antique Brass')],
      status: 'Out for Delivery', placedAt: t('2026-11-21T11:40:00'), acceptBy: t('2026-11-22T11:40:00'), dispatchBy: t('2026-11-25T18:00:00'),
      courier: 'BlueDart', awb: 'BD110424IN', handover: { at: t('2026-11-24T12:30:00'), by: 'ZipKing International', packages: 3, weightKg: 18, otpVerified: true },
      events: [
        ev('Order Placed', '2026-11-21T11:40:00'), ev('Accepted', '2026-11-22T10:02:00'),
        ev('Dispatched', '2026-11-24T12:30:00', 'OTP handover to BlueDart verified', 'Okhla, New Delhi'),
        ev('In Transit', '2026-11-25T02:10:00', 'In transit', 'Delhi Air Hub'), ev('Out for Delivery', '2026-11-26T09:40:00', 'Out for delivery', 'Thane'),
      ],
    }),
  ], { method: 'upi', status: 'Captured', txn: 'PG2611401173' }),

  // 2) Delivered (window closing) + vendor-rejected sub-order with a PENDING refund
  order('ORD-2026-5698', 'CU-30117', '2026-11-17T10:05:00', [
    so({
      id: 'SO-2026-110371', orderId: 'ORD-2026-5698', customerId: 'CU-30117', vendorId: 'VN-38851', fulfilment: 'insta', hubName: 'Mumbai · Bhiwandi Hub', leadTimeDays: 2,
      lines: [L('P-2004', 'AP-PB-1216', 'LDPE Garment Poly Bag with Suffocation Warning, 12 × 16"', 10000, 'pcs', 1.52, 1.64, 18, 140)],
      status: 'Delivered', placedAt: t('2026-11-17T10:05:00'), acceptBy: t('2026-11-18T10:05:00'), courier: 'Delhivery', awb: 'DLV1103714471',
      handover: { at: t('2026-11-17T11:10:00'), by: 'WH-MUM-01 Picker', packages: 4, weightKg: 22, otpVerified: true },
      delivery: { at: t('2026-11-21T15:48:00'), receivedBy: 'Suresh Patil (Stores)', otpVerified: true, photo: 'POD_110371.jpg' },
      invoiceNo: 'INV-APL-2026-0477', returnWindowEnds: t('2026-11-28T23:59:00'),
      events: [ev('Order Placed', '2026-11-17T10:05:00'), ev('Accepted', '2026-11-17T10:20:00', 'Hub accepted'), ev('Dispatched', '2026-11-17T11:10:00', 'OTP handover: hub → delivery partner'), ev('In Transit', '2026-11-17T11:30:00'), ev('Delivery Failed', '2026-11-17T16:00:00', 'Consignee premises closed'), ev('Out for Delivery', '2026-11-21T10:05:00', 'Re-attempt'), ev('Delivered', '2026-11-21T15:48:00', 'OTP verified')],
    }),
    so({
      id: 'SO-2026-110372', orderId: 'ORD-2026-5698', customerId: 'CU-30117', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [L('P-1004', 'NTX-EL-0525', 'Knitted Polyester Elastic, 25 mm', 2500, 'm', 6.1, 6.59, 12, 160, 'Black')],
      status: 'Rejected', placedAt: t('2026-11-17T10:05:00'), acceptBy: t('2026-11-18T10:05:00'),
      rejection: { at: t('2026-11-17T17:30:00'), reason: 'Black shade dye lot exhausted; next lot in 3 weeks.' },
      refund: { amount: 0, status: 'Pending', ref: 'RFD-2026-00418', at: t('2026-11-17T17:31:00') },
      events: [ev('Order Placed', '2026-11-17T10:05:00'), ev('Rejected', '2026-11-17T17:30:00', 'Rejected by vendor · refund initiated')],
    }),
  ], { method: 'card', status: 'Captured', txn: 'PG1711054482' }),

  // 3) Delivered with an OPEN DISPUTE (auto-escalated)
  order('ORD-2026-5655', 'CU-30117', '2026-11-14T09:20:00', [
    so({
      id: 'SO-2026-110352', orderId: 'ORD-2026-5655', customerId: 'CU-30117', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 4,
      lines: [L('P-1003', 'NTX-HT-3501', 'Kraft Paper Hang Tag with Barcode, 350 GSM', 10000, 'pcs', 2.75, 3.03, 12, 30)],
      status: 'Disputed', placedAt: t('2026-11-14T09:20:00'), acceptBy: t('2026-11-15T09:20:00'), dispatchBy: t('2026-11-18T18:00:00'),
      courier: 'Delhivery', awb: 'DLV1103524471', handover: { at: t('2026-11-17T15:00:00'), by: 'Rohan Mehta (VN-89420)', packages: 2, weightKg: 14, otpVerified: true },
      delivery: { at: t('2026-11-20T12:10:00'), receivedBy: 'Suresh Patil (Stores)', otpVerified: true, photo: 'POD_110352.jpg' },
      invoiceNo: 'INV-NTX-2026-0887', returnWindowEnds: t('2026-11-27T23:59:00'),
      events: [ev('Order Placed', '2026-11-14T09:20:00'), ev('Accepted', '2026-11-14T13:00:00'), ev('Dispatched', '2026-11-17T15:00:00', 'OTP handover verified'), ev('In Transit', '2026-11-18T08:00:00'), ev('Out for Delivery', '2026-11-20T09:00:00'), ev('Delivered', '2026-11-20T12:10:00', 'OTP verified'), ev('Disputed', '2026-11-21T10:15:00', 'Damage claim DSP-2026-0331 raised')],
    }),
  ], { method: 'netbanking', status: 'Captured', txn: 'PG1411209921' }),

  // 4) New order awaiting NovaTex acceptance (today)
  order('ORD-2026-5768', 'CU-30117', '2026-11-26T09:12:00', [
    so({
      id: 'SO-2026-110431', orderId: 'ORD-2026-5768', customerId: 'CU-30117', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 4,
      lines: [L('P-1003', 'NTX-HT-3501', 'Kraft Paper Hang Tag with Barcode, 350 GSM', 2000, 'pcs', 3.1, 3.41, 12, 30)],
      status: 'Order Placed', placedAt: t('2026-11-26T09:12:00'), acceptBy: t('2026-11-27T09:12:00'), deliveryOtp: '552018',
      events: [ev('Order Placed', '2026-11-26T09:12:00')],
    }),
  ], { method: 'upi', status: 'Captured', txn: 'PG2611091277' }),

  // 5) Mafatlal: acceptance SLA breached (> 1 business day)
  order('ORD-2026-5751', 'CU-30151', '2026-11-24T10:30:00', [
    so({
      id: 'SO-2026-110429', orderId: 'ORD-2026-5751', customerId: 'CU-30151', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [DAMASK(10000, 'Jet Black')], status: 'Order Placed', placedAt: t('2026-11-24T10:30:00'), acceptBy: t('2026-11-25T10:30:00'),
      events: [ev('Order Placed', '2026-11-24T10:30:00')],
    }),
  ], { method: 'netbanking', status: 'Captured', txn: 'PG2411308810' }),

  // 6) Arvind: LATE DISPATCH (accepted, past dispatch-by)
  order('ORD-2026-5731', 'CU-30122', '2026-11-20T14:00:00', [
    so({
      id: 'SO-2026-110398', orderId: 'ORD-2026-5731', customerId: 'CU-30122', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 2,
      lines: [L('P-1002', 'NTX-CL-1180', 'Printed Satin Care Label with GINETEX Symbols', 20000, 'pcs', 0.72, 0.78, 12, 200, 'White')],
      status: 'Accepted', placedAt: t('2026-11-20T14:00:00'), acceptBy: t('2026-11-21T14:00:00'), dispatchBy: t('2026-11-23T18:00:00'),
      courier: 'Delhivery', awb: 'DLV1103984471',
      events: [ev('Order Placed', '2026-11-20T14:00:00'), ev('Accepted', '2026-11-21T11:00:00', 'Accepted · dispatch by 23 Nov')],
    }),
  ], { method: 'cod', status: 'COD pending' }),

  // 7) Bombay Shirt Co: accepted, dispatch due in future
  order('ORD-2026-5760', 'CU-30163', '2026-11-25T16:45:00', [
    so({
      id: 'SO-2026-110427', orderId: 'ORD-2026-5760', customerId: 'CU-30163', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [L('P-1004', 'NTX-EL-0525', 'Knitted Polyester Elastic, 25 mm', 1500, 'm', 6.8, 7.34, 12, 160, 'White')],
      status: 'Accepted', placedAt: t('2026-11-25T16:45:00'), acceptBy: t('2026-11-26T16:45:00'), dispatchBy: t('2026-11-29T18:00:00'),
      courier: 'BlueDart', awb: 'BD110427IN',
      events: [ev('Order Placed', '2026-11-25T16:45:00'), ev('Accepted', '2026-11-25T18:20:00')],
    }),
  ], { method: 'upi', status: 'Captured', txn: 'PG2511454471' }),

  // 8) Orient Tex: AuraFastener — NDR with 3 failed attempts
  order('ORD-2026-5710', 'CU-30145', '2026-11-18T12:00:00', [
    so({
      id: 'SO-2026-110402', orderId: 'ORD-2026-5710', customerId: 'CU-30145', vendorId: 'VN-66047', fulfilment: 'standard', leadTimeDays: 4,
      lines: [L('P-2007', 'AF-SN-1515', 'Brass Snap Button, 15 mm, Antique Finish', 10000, 'pcs', 3.2, 3.5, 18, 40, 'Antique Brass')],
      status: 'Delivery Failed', placedAt: t('2026-11-18T12:00:00'), acceptBy: t('2026-11-19T12:00:00'), dispatchBy: t('2026-11-22T18:00:00'),
      courier: 'Delhivery', awb: 'DLV1104024471', handover: { at: t('2026-11-21T11:00:00'), by: 'AuraFastener Industries', packages: 2, weightKg: 31, otpVerified: true },
      ndr: { id: 'NDR-2026-0091', attempts: 3, reason: 'Consignee address incomplete: unit number missing; phone unreachable', lastAttempt: t('2026-11-26T08:45:00') },
      events: [ev('Order Placed', '2026-11-18T12:00:00'), ev('Accepted', '2026-11-18T16:00:00'), ev('Dispatched', '2026-11-21T11:00:00', 'OTP handover verified', 'Ludhiana'), ev('In Transit', '2026-11-22T05:00:00'), ev('Delivery Failed', '2026-11-24T13:20:00', 'Attempt 1: address incomplete'), ev('Delivery Failed', '2026-11-25T12:05:00', 'Attempt 2: phone unreachable'), ev('Delivery Failed', '2026-11-26T08:45:00', 'Attempt 3: consignee not available')],
    }),
  ], { method: 'cod', status: 'COD pending' }),

  // 9) Birla: delivered early Nov — return window over (ELIGIBLE for payout)
  order('ORD-2026-5588', 'CU-30170', '2026-11-03T10:00:00', [
    so({
      id: 'SO-2026-110301', orderId: 'ORD-2026-5588', customerId: 'CU-30170', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [DAMASK(8000, 'Ivory')], status: 'Delivered', placedAt: t('2026-11-03T10:00:00'), acceptBy: t('2026-11-04T10:00:00'),
      courier: 'BlueDart', awb: 'BD110301IN', handover: { at: t('2026-11-05T15:00:00'), by: 'Rohan Mehta (VN-89420)', packages: 3, weightKg: 9, otpVerified: true },
      delivery: { at: t('2026-11-08T13:00:00'), receivedBy: 'Sourav Ghosh', otpVerified: true, photo: 'POD_110301.jpg' },
      invoiceNo: 'INV-NTX-2026-0851', returnWindowEnds: t('2026-11-15T23:59:00'),
      events: [ev('Order Placed', '2026-11-03T10:00:00'), ev('Accepted', '2026-11-03T12:00:00'), ev('Dispatched', '2026-11-05T15:00:00'), ev('In Transit', '2026-11-06T06:00:00'), ev('Out for Delivery', '2026-11-08T09:00:00'), ev('Delivered', '2026-11-08T13:00:00', 'OTP verified')],
    }),
  ], { method: 'card', status: 'Captured', txn: 'PG0311003318' }),

  // 10) Bombay Shirt Co: delivered in Oct — already PAID
  order('ORD-2026-5410', 'CU-30163', '2026-10-20T10:00:00', [
    so({
      id: 'SO-2026-110244', orderId: 'ORD-2026-5410', customerId: 'CU-30163', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [L('P-1002', 'NTX-CL-1180', 'Printed Satin Care Label with GINETEX Symbols', 50000, 'pcs', 0.64, 0.7, 12, 200, 'Black')],
      status: 'Delivered', placedAt: t('2026-10-20T10:00:00'), acceptBy: t('2026-10-21T10:00:00'),
      courier: 'Delhivery', awb: 'DLV1102444471', handover: { at: t('2026-10-22T15:00:00'), by: 'Rohan Mehta (VN-89420)', packages: 5, weightKg: 12, otpVerified: true },
      delivery: { at: t('2026-10-24T11:00:00'), receivedBy: 'Aditi Kulkarni', otpVerified: true, photo: 'POD_110244.jpg' },
      invoiceNo: 'INV-NTX-2026-0733', returnWindowEnds: t('2026-10-31T23:59:00'),
      events: [ev('Order Placed', '2026-10-20T10:00:00'), ev('Accepted', '2026-10-20T13:00:00'), ev('Dispatched', '2026-10-22T15:00:00'), ev('In Transit', '2026-10-23T06:00:00'), ev('Out for Delivery', '2026-10-24T09:00:00'), ev('Delivered', '2026-10-24T11:00:00', 'OTP verified')],
    }),
  ], { method: 'upi', status: 'Captured', txn: 'PG2010003301' }),
  // 11) Arvind: TagTech requested PARTIAL acceptance → Admin/Support decision
  order('ORD-2026-5764', 'CU-30122', '2026-11-25T11:20:00', [
    so({
      id: 'SO-2026-110428', orderId: 'ORD-2026-5764', customerId: 'CU-30122', vendorId: 'VN-52260', fulfilment: 'standard', leadTimeDays: 5,
      lines: [L('P-2001', 'TT-RF-0750', 'UHF RFID Hang Tag Inlay, M750 Chip', 30000, 'pcs', 15.9, 17.01, 18, 220)],
      status: 'Partial Review', placedAt: t('2026-11-25T11:20:00'), acceptBy: t('2026-11-26T11:20:00'),
      partial: { at: t('2026-11-25T17:40:00'), reason: 'Chip shortage: can supply 18,000 now; balance 12,000 only after 20 Dec.', lines: [{ productId: 'P-2001', qty: 18000 }] },
      events: [ev('Order Placed', '2026-11-25T11:20:00'), ev('Partial Review', '2026-11-25T17:40:00', 'Partial acceptance sent to Admin/Support for decision')],
    }),
  ], { method: 'netbanking', status: 'Captured', txn: 'PG2511200457' }),
  // 12) Bombay Shirt Co: delivered COD, window over, but COD NOT yet remitted → held (Awaiting COD)
  order('ORD-2026-5620', 'CU-30163', '2026-11-08T10:00:00', [
    so({
      id: 'SO-2026-110330', orderId: 'ORD-2026-5620', customerId: 'CU-30163', vendorId: 'VN-89420', fulfilment: 'standard', leadTimeDays: 3,
      lines: [L('P-1003', 'NTX-HT-3501', 'Kraft Paper Hang Tag with Barcode, 350 GSM', 6000, 'pcs', 2.75, 3.03, 12, 30)],
      status: 'Delivered', placedAt: t('2026-11-08T10:00:00'), acceptBy: t('2026-11-09T10:00:00'),
      courier: 'Delhivery', awb: 'DLV1103304471', handover: { at: t('2026-11-10T15:00:00'), by: 'Rohan Mehta (VN-89420)', packages: 2, weightKg: 9, otpVerified: true },
      delivery: { at: t('2026-11-12T12:30:00'), receivedBy: 'Aditi Kulkarni', otpVerified: true, photo: 'POD_110330.jpg' },
      invoiceNo: 'INV-NTX-2026-0866', returnWindowEnds: t('2026-11-19T23:59:00'),
      events: [ev('Order Placed', '2026-11-08T10:00:00'), ev('Accepted', '2026-11-08T12:00:00'), ev('Dispatched', '2026-11-10T15:00:00'), ev('In Transit', '2026-11-11T06:00:00'), ev('Out for Delivery', '2026-11-12T09:00:00'), ev('Delivered', '2026-11-12T12:30:00', 'OTP verified · COD collected by courier')],
    }),
  ], { method: 'cod', status: 'COD pending' }),

  // 13) Raymond: TrimInsta from Bhiwandi hub — accepted at hub, waiting for pick
  order('ORD-2026-5771', 'CU-30117', '2026-11-26T10:05:00', [
    so({
      id: 'SO-2026-110435', orderId: 'ORD-2026-5771', customerId: 'CU-30117', vendorId: 'VN-89420', fulfilment: 'insta', hubName: 'Mumbai · Bhiwandi Hub', leadTimeDays: 1,
      lines: [DAMASK(2000, 'Jet Black')], status: 'Accepted', placedAt: t('2026-11-26T10:05:00'), acceptBy: t('2026-11-26T10:35:00'), dispatchBy: t('2026-11-26T13:05:00'),
      courier: 'Delhivery', awb: 'DLV1104354471', deliveryOtp: '640218',
      events: [ev('Order Placed', '2026-11-26T10:05:00'), ev('Accepted', '2026-11-26T10:07:00', 'Auto-accepted at WH-MUM-01 (stock reserved)')],
    }),
  ], { method: 'upi', status: 'Captured', txn: 'PG2611050012' }),

  // 14) Orient Tex: TrimInsta from Tiruppur hub — just placed
  order('ORD-2026-5772', 'CU-30145', '2026-11-26T10:40:00', [
    so({
      id: 'SO-2026-110436', orderId: 'ORD-2026-5772', customerId: 'CU-30145', vendorId: 'VN-55102', fulfilment: 'insta', hubName: 'Tiruppur Hub', leadTimeDays: 1,
      lines: [L('P-2002', 'TW-ST-2705', 'Poly-Poly Core Spun Thread, Tex 27, 5000 m', 60, 'cone', 86, 91.16, 12, 190, 'Indigo')],
      status: 'Order Placed', placedAt: t('2026-11-26T10:40:00'), acceptBy: t('2026-11-26T11:10:00'), deliveryOtp: '118402',
      events: [ev('Order Placed', '2026-11-26T10:40:00')],
    }),
  ], { method: 'card', status: 'Captured', txn: 'PG2611100488' }),
];

// The rejected sub-order's refund equals its own total.
SEED[1].subOrders[1].refund!.amount = SEED[1].subOrders[1].total;

/* =========================================================
   Store
   ========================================================= */

interface Ctx {
  orders: Order[];
  subOrders: SubOrder[];
  place: (o: Omit<Order, 'id' | 'placedAt' | 'subOrders'> & { subOrders: NewSubOrder[] }) => Order;
  accept: (soId: string, by: string) => void;
  reject: (soId: string, reason: string) => void;
  requestPartial: (soId: string, lines: { productId: string; qty: number }[], reason: string) => void;
  dispatch: (soId: string, h: { by: string; packages: number; weightKg: number; at: string }) => void;
  /** Demo/courier webhook: move a shipped sub-order one step forward. */
  advance: (soId: string) => void;
  confirmDelivery: (soId: string, receivedBy: string, windowDays: number) => void;
  setStatus: (soId: string, status: SubStatus, note: string) => void;
  patchSub: (soId: string, patch: Partial<SubOrder>) => void;
  /** Replacement = a NEW linked order at no charge, same vendor, for the replaced units. */
  placeReplacement: (caseId: string, source: SubOrder, lines: { productId: string; qty: number }[]) => Order;
  patchOrder: (orderId: string, patch: Partial<Order>) => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.orders.v4';
let seq = 110440;

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : SEED; } catch { return SEED; } });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(orders)), [orders]);

  const now = () => new Date().toISOString();
  const mapSub = useCallback((soId: string, fn: (s: SubOrder) => SubOrder) =>
    setOrders((os) => os.map((o) => (o.subOrders.some((s) => s.id === soId) ? { ...o, subOrders: o.subOrders.map((s) => (s.id === soId ? fn(s) : s)) } : o))), []);

  const place: Ctx['place'] = useCallback((o) => {
    const id = `ORD-2026-${5800 + Math.floor(Math.random() * 190)}`;
    const placedAt = now();
    const full: Order = {
      ...o, id, placedAt,
      subOrders: o.subOrders.map((s) => ({
        ...s, id: `SO-2026-${seq++}`, orderId: id, customerId: o.customerId, status: 'Order Placed', placedAt,
        acceptBy: addBusinessDays(placedAt, 1), deliveryOtp: otp6(), events: [{ status: 'Order Placed', at: placedAt }],
      })),
    };
    setOrders((xs) => [full, ...xs]);
    return full;
  }, []);

  const accept = useCallback((soId: string, by: string) => mapSub(soId, (s) => {
    const at = now();
    const courier = assignCourier(soId);
    return { ...s, status: 'Accepted', dispatchBy: addBusinessDays(at, s.leadTimeDays), courier, awb: awbFor(courier, soId), events: [...s.events, { status: 'Accepted', at, note: `Accepted by ${by} · courier ${courier} assigned by system` }] };
  }), [mapSub]);

  const reject = useCallback((soId: string, reason: string) => mapSub(soId, (s) => {
    const at = now();
    return { ...s, status: 'Rejected', rejection: { at, reason }, refund: { amount: s.total, status: 'Pending', ref: `RFD-2026-${String(Date.now()).slice(-5)}`, at }, events: [...s.events, { status: 'Rejected', at, note: 'Rejected by vendor · refund initiated' }] };
  }), [mapSub]);

  const requestPartial = useCallback((soId: string, lines: { productId: string; qty: number }[], reason: string) => mapSub(soId, (s) => {
    const at = now();
    return { ...s, status: 'Partial Review', partial: { at, reason, lines }, events: [...s.events, { status: 'Partial Review', at, note: 'Partial acceptance sent to Admin/Support for decision' }] };
  }), [mapSub]);

  const dispatch = useCallback((soId: string, h: { by: string; packages: number; weightKg: number; at: string }) => mapSub(soId, (s) => ({
    ...s, status: 'Dispatched', handover: { ...h, otpVerified: true },
    events: [...s.events, { status: 'Dispatched', at: h.at, note: `OTP handover to ${s.courier} verified · ${h.packages} pkg, ${h.weightKg} kg` }],
  })), [mapSub]);

  const advance = useCallback((soId: string) => mapSub(soId, (s) => {
    const next: Record<string, SubStatus> = { Dispatched: 'In Transit', 'In Transit': 'Out for Delivery' };
    const n = next[s.status];
    return n ? { ...s, status: n, events: [...s.events, { status: n, at: now(), note: n === 'In Transit' ? 'Arrived at origin hub' : 'Out for delivery' }] } : s;
  }), [mapSub]);

  const confirmDelivery = useCallback((soId: string, receivedBy: string, windowDays: number) => mapSub(soId, (s) => {
    const at = now();
    const ends = new Date(Date.now() + windowDays * DAY); ends.setHours(23, 59, 0, 0);
    const vendorCode = s.vendorId === 'VN-89420' ? 'NTX' : s.vendorId.slice(-3);
    return {
      ...s, status: 'Delivered', delivery: { at, receivedBy, otpVerified: true, photo: `POD_${soId.slice(-6)}.jpg` },
      invoiceNo: `INV-${vendorCode}-2026-${String(Date.now()).slice(-4)}`, returnWindowEnds: ends.toISOString(),
      events: [...s.events, { status: 'Delivered', at, note: `Delivered · OTP verified · received by ${receivedBy}` }],
    };
  }), [mapSub]);

  const setStatus = useCallback((soId: string, status: SubStatus, note: string) =>
    mapSub(soId, (s) => ({ ...s, status, events: [...s.events, { status, at: now(), note }] })), [mapSub]);
  const patchSub = useCallback((soId: string, patch: Partial<SubOrder>) => mapSub(soId, (s) => ({ ...s, ...patch })), [mapSub]);

  const placeReplacement = useCallback((caseId: string, src: SubOrder, lines: { productId: string; qty: number }[]) => {
    const parent = orders.find((o) => o.id === src.orderId)!;
    const id = `ORD-2026-R${Math.floor(100 + Math.random() * 900)}`;
    const at = now();
    const soLines = lines.filter((l) => l.qty > 0).map((l) => {
      const o = src.lines.find((x) => x.productId === l.productId)!;
      return { ...o, qty: l.qty, unitPrice: 0, amount: 0 };
    });
    const sub: SubOrder = {
      ...src, id: `SO-2026-${seq++}`, orderId: id, lines: soLines, subtotal: 0, shipping: 0, gst: 0, total: 0, status: 'Order Placed', placedAt: at,
      acceptBy: addBusinessDays(at, 1), dispatchBy: undefined, courier: undefined, awb: undefined, handover: undefined, delivery: undefined, rejection: undefined,
      partial: undefined, ndr: undefined, invoiceNo: undefined, returnWindowEnds: undefined, refund: undefined, deliveryOtp: otp6(),
      events: [{ status: 'Order Placed', at, note: `Replacement for ${caseId} (no charge)` }],
    };
    const ord: Order = { ...parent, id, placedAt: at, payment: { method: parent.payment.method, status: 'No charge' }, replacementFor: caseId, subOrders: [sub], subtotal: 0, shipping: 0, gst: 0, total: 0 };
    setOrders((xs) => [ord, ...xs]);
    return ord;
  }, [orders]);

  const patchOrder = useCallback((orderId: string, patch: Partial<Order>) => setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, ...patch } : o))), []);

  const subOrders = orders.flatMap((o) => o.subOrders);
  return <C.Provider value={{ orders, subOrders, place, accept, reject, requestPartial, dispatch, advance, confirmDelivery, setStatus, patchSub, placeReplacement, patchOrder }}>{children}</C.Provider>;
}

export function useOrders(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useOrders outside OrdersProvider');
  return c;
}
