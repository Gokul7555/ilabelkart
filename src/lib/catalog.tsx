import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { categoryById } from '../data/categories';
import { OTHER_VENDOR_DOCS } from '../data/vendors';
import type { DocStatus, VendorDoc } from './onboarding';

/* =========================================================
   Types
   ========================================================= */

export interface Tier { min: number; price: number }
export interface Shade { name: string; hex: string }
export interface Discount { pct: number; from: string; to: string; status: 'Pending' | 'Approved' | 'Rejected' }

/** One immutable snapshot of everything that needs approval. Stock is NOT part of it. */
export interface ProductVersion {
  v: number;
  title: string;
  hsn: string;
  description: string;
  unit: string;
  moq: number;
  packMultiple: number;
  /** tiers[0] = { min: moq, price: base price }. */
  tiers: Tier[];
  shades: Shade[];
  attributes: Record<string, string>;
  specs: { k: string; v: string }[];
  images: string[];
  hue: number;
  tds?: string;
  discount?: Discount;
  leadTimeDays: number;
  insta: boolean;
  submittedAt: string;
}

export interface StockLine { loc: string; qty: number }
export interface HistoryEntry { at: string; by: string; action: string; v?: number; reason?: string }

export interface Product {
  id: string;
  vendorId: string;
  sku: string;
  categoryId: string;
  live?: ProductVersion;
  pending?: ProductVersion;
  draft?: ProductVersion;
  rejected?: { version: ProductVersion; reason: string; at: string; by: string };
  stock: StockLine[];
  lowStockAt: number;
  history: HistoryEntry[];
}

export type ProductStatus = 'Draft' | 'Pending' | 'Live' | 'Revision pending' | 'Rejected' | 'Revision rejected';

/* =========================================================
   Helpers
   ========================================================= */

export const basePrice = (v: ProductVersion) => v.tiers[0]?.price ?? 0;

/** Customer price (pre-tax) = vendor base + CATEGORY commission. Never shown to customers as a split. */
export function customerPrice(base: number, categoryId: string): number {
  const c = categoryById(categoryId)?.commission ?? 0;
  return Math.round(base * (1 + c / 100) * 100) / 100;
}

export function productStatus(p: Product): ProductStatus {
  if (p.live && p.pending) return 'Revision pending';
  if (p.live && p.rejected && p.rejected.at > (p.live.submittedAt ?? '')) return 'Revision rejected';
  if (p.live) return 'Live';
  if (p.pending) return 'Pending';
  if (p.rejected) return 'Rejected';
  return 'Draft';
}

export const totalStock = (p: Product) => p.stock.reduce((s, l) => s + l.qty, 0);
/** What the vendor is currently looking at / editing. */
export const workingVersion = (p: Product) => p.draft ?? p.pending ?? p.rejected?.version ?? p.live;

/** Fields that need re-approval when changed, with display labels. */
export const APPROVAL_FIELDS: { key: keyof ProductVersion; label: string }[] = [
  { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'hsn', label: 'HSN' },
  { key: 'unit', label: 'Unit' }, { key: 'moq', label: 'MOQ' }, { key: 'packMultiple', label: 'Pack multiple' },
  { key: 'tiers', label: 'Price & tiers' }, { key: 'images', label: 'Photos' }, { key: 'shades', label: 'Shades' },
  { key: 'attributes', label: 'Attributes' }, { key: 'specs', label: 'Technical specs' }, { key: 'tds', label: 'TDS PDF' },
  { key: 'discount', label: 'Proposed discount' }, { key: 'leadTimeDays', label: 'Lead-time promise' }, { key: 'insta', label: 'TrimInsta availability' },
];

export function changedFields(a: ProductVersion | undefined, b: ProductVersion): string[] {
  if (!a) return APPROVAL_FIELDS.map((f) => f.label);
  return APPROVAL_FIELDS.filter((f) => JSON.stringify(a[f.key]) !== JSON.stringify(b[f.key])).map((f) => f.label);
}

/* =========================================================
   Seed — 12 marketplace categories covered + NovaTex states
   ========================================================= */

const T = (d: string) => `${d}T10:00:00+05:30`;
const AP = 'Kavya Iyer (AP-1042)';

function ver(p: Partial<ProductVersion> & Pick<ProductVersion, 'title' | 'hsn' | 'tiers' | 'unit' | 'moq'>): ProductVersion {
  return {
    v: 1, description: '', packMultiple: 100, shades: [], attributes: {}, specs: [], images: ['front.jpg', 'detail.jpg', 'pack.jpg'],
    hue: 240, leadTimeDays: 3, insta: false, submittedAt: T('2026-04-01'), ...p,
  };
}

const SEED: Product[] = [
  {
    id: 'P-1001', vendorId: 'VN-89420', sku: 'NTX-WL-2201', categoryId: 'woven-labels',
    live: ver({
      title: 'Woven Damask Main Label, 50 × 20 mm', hsn: '58071020', unit: 'pcs', moq: 1000, packMultiple: 500, hue: 255,
      description: 'High-density damask woven label with ultrasonic-cut edges. Soft hand-feel, colour-fast to 60 °C wash. Ideal for shirts and premium knits.',
      tiers: [{ min: 1000, price: 2.4 }, { min: 5000, price: 2.15 }, { min: 20000, price: 2.0 }],
      shades: [{ name: 'Jet Black', hex: '#111827' }, { name: 'Ivory', hex: '#f5f0e1' }, { name: 'Navy', hex: '#1e3a8a' }, { name: 'Maroon', hex: '#7f1d1d' }],
      attributes: { width: '50', height: '20', weave: 'Damask', fold: 'End fold' },
      specs: [{ k: 'Yarn', v: '50D polyester, 100% recycled warp' }, { k: 'Density', v: '120 picks/inch' }, { k: 'Edge', v: 'Ultrasonic cut, non-scratch' }, { k: 'Wash fastness', v: 'Grade 4–5 (ISO 105-C06)' }, { k: 'Max colours', v: '8' }],
      tds: 'TDS_NTX-WL-2201.pdf', leadTimeDays: 3, insta: true, v: 3, submittedAt: T('2026-09-02'),
    }),
    pending: ver({
      title: 'Woven Damask Main Label, 50 × 20 mm', hsn: '58071020', unit: 'pcs', moq: 1000, packMultiple: 500, hue: 255,
      description: 'High-density damask woven label with ultrasonic-cut edges. Soft hand-feel, colour-fast to 60 °C wash. Ideal for shirts, premium knits and denim.',
      tiers: [{ min: 1000, price: 2.65 }, { min: 5000, price: 2.35 }, { min: 20000, price: 2.15 }],
      shades: [{ name: 'Jet Black', hex: '#111827' }, { name: 'Ivory', hex: '#f5f0e1' }, { name: 'Navy', hex: '#1e3a8a' }, { name: 'Maroon', hex: '#7f1d1d' }, { name: 'Forest', hex: '#14532d' }],
      attributes: { width: '50', height: '20', weave: 'Damask', fold: 'End fold' },
      specs: [{ k: 'Yarn', v: '50D polyester, 100% recycled warp' }, { k: 'Density', v: '120 picks/inch' }, { k: 'Edge', v: 'Ultrasonic cut, non-scratch' }, { k: 'Wash fastness', v: 'Grade 4–5 (ISO 105-C06)' }, { k: 'Max colours', v: '8' }],
      images: ['front.jpg', 'detail.jpg', 'pack.jpg', 'on-garment.jpg'],
      tds: 'TDS_NTX-WL-2201_rev4.pdf', leadTimeDays: 3, insta: true, v: 4, submittedAt: '2026-11-24T15:30:00+05:30',
    }),
    stock: [{ loc: 'Factory · Mumbai', qty: 184000 }, { loc: 'WH-MUM-01 · Bhiwandi Hub', qty: 42000 }], lowStockAt: 20000,
    history: [
      { at: T('2026-03-20'), by: AP, action: 'Approved & published', v: 1 },
      { at: T('2026-06-11'), by: AP, action: 'Approved & published', v: 2 },
      { at: T('2026-09-03'), by: AP, action: 'Approved & published', v: 3 },
      { at: '2026-11-24T15:30:00+05:30', by: 'Rohan Mehta (VN-89420)', action: 'Revision submitted', v: 4 },
    ],
  },
  {
    id: 'P-1002', vendorId: 'VN-89420', sku: 'NTX-CL-1180', categoryId: 'woven-labels',
    live: ver({
      title: 'Printed Satin Care Label with GINETEX Symbols', hsn: '58071090', unit: 'pcs', moq: 2000, packMultiple: 1000, hue: 200,
      description: 'Double-side printed satin care label. Wash-care symbols as per ISO 3758.', tiers: [{ min: 2000, price: 0.85 }, { min: 10000, price: 0.72 }, { min: 50000, price: 0.64 }],
      shades: [{ name: 'White', hex: '#ffffff' }, { name: 'Black', hex: '#111827' }], attributes: { width: '30', height: '60', weave: 'Printed satin', fold: 'Loop fold' },
      specs: [{ k: 'Base', v: 'Polyester satin, 2-side' }, { k: 'Ink', v: 'Wash-resistant thermal transfer' }], leadTimeDays: 2,
    }),
    stock: [{ loc: 'Factory · Mumbai', qty: 410000 }], lowStockAt: 50000,
    history: [{ at: T('2026-04-02'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-1003', vendorId: 'VN-89420', sku: 'NTX-HT-3501', categoryId: 'hang-tags',
    live: ver({
      title: 'Kraft Paper Hang Tag with Barcode, 350 GSM', hsn: '48211020', unit: 'pcs', moq: 1000, packMultiple: 500, hue: 30,
      description: 'Uncoated kraft board hang tag with variable barcode/price print and 5 mm eyelet hole.', tiers: [{ min: 1000, price: 3.1 }, { min: 5000, price: 2.75 }, { min: 25000, price: 2.45 }],
      attributes: { gsm: '350', size: '50 × 90', finish: 'Uncoated kraft' }, specs: [{ k: 'Board', v: 'Recycled kraft, 350 GSM' }, { k: 'Print', v: '1–2 colour offset + variable barcode' }], leadTimeDays: 4,
    }),
    stock: [{ loc: 'Factory · Mumbai', qty: 96000 }], lowStockAt: 10000,
    history: [{ at: T('2026-04-05'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-1004', vendorId: 'VN-89420', sku: 'NTX-EL-0525', categoryId: 'elastic',
    live: ver({
      title: 'Knitted Polyester Elastic, 25 mm', hsn: '58062000', unit: 'm', moq: 500, packMultiple: 50, hue: 160,
      description: 'Soft knitted elastic for waistbands and cuffs. Good recovery after 50 cycles.', tiers: [{ min: 500, price: 6.8 }, { min: 2500, price: 6.1 }, { min: 10000, price: 5.6 }],
      shades: [{ name: 'White', hex: '#ffffff' }, { name: 'Black', hex: '#111827' }], attributes: { width: '25', stretch: '140', type: 'Knitted' },
      specs: [{ k: 'Composition', v: '72% polyester, 28% elastane' }, { k: 'Recovery', v: '≥ 92% after 50 cycles' }], leadTimeDays: 3, insta: true,
    }),
    stock: [{ loc: 'Factory · Mumbai', qty: 3200 }, { loc: 'WH-MUM-01 · Bhiwandi Hub', qty: 450 }], lowStockAt: 5000,
    history: [{ at: T('2026-05-06'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-1005', vendorId: 'VN-89420', sku: 'NTX-WL-2310', categoryId: 'woven-labels',
    pending: ver({
      title: 'Woven Size Label Set (XS–XXL), Taffeta', hsn: '58071020', unit: 'set', moq: 500, packMultiple: 100, hue: 290,
      description: 'Six-size taffeta woven label set, centre-folded, colour-coded by size.', tiers: [{ min: 500, price: 4.2 }, { min: 2500, price: 3.8 }],
      shades: [{ name: 'Black on White', hex: '#e5e7eb' }], attributes: { width: '15', height: '30', weave: 'Taffeta', fold: 'Centre fold' },
      specs: [{ k: 'Sizes per set', v: 'XS, S, M, L, XL, XXL' }], leadTimeDays: 4, submittedAt: '2026-11-25T12:10:00+05:30',
    }),
    stock: [{ loc: 'Factory · Mumbai', qty: 12000 }], lowStockAt: 1000,
    history: [{ at: '2026-11-25T12:10:00+05:30', by: 'Rohan Mehta (VN-89420)', action: 'Submitted for approval', v: 1 }],
  },
  {
    id: 'P-1006', vendorId: 'VN-89420', sku: 'NTX-EL-0940', categoryId: 'elastic',
    rejected: {
      version: ver({
        title: 'Jacquard Waistband Elastic, 40 mm', hsn: '58062000', unit: 'm', moq: 300, packMultiple: 50, hue: 120,
        description: 'Custom jacquard logo elastic for boxer and athleisure waistbands.', tiers: [{ min: 300, price: 18.5 }, { min: 1500, price: 16.9 }],
        attributes: { width: '40', stretch: '120', type: 'Jacquard' }, leadTimeDays: 7, submittedAt: '2026-11-18T09:00:00+05:30',
      }),
      reason: 'Photos show a 35 mm elastic but the title and spec say 40 mm. Correct the spec or upload matching photos.',
      at: '2026-11-19T11:20:00+05:30', by: AP,
    },
    stock: [{ loc: 'Factory · Mumbai', qty: 5000 }], lowStockAt: 500,
    history: [
      { at: '2026-11-18T09:00:00+05:30', by: 'Rohan Mehta (VN-89420)', action: 'Submitted for approval', v: 1 },
      { at: '2026-11-19T11:20:00+05:30', by: AP, action: 'Rejected', v: 1, reason: 'Photos show a 35 mm elastic but the title and spec say 40 mm.' },
    ],
  },
  {
    id: 'P-1007', vendorId: 'VN-89420', sku: 'NTX-TT-1012', categoryId: 'elastic',
    draft: ver({ title: 'Cotton Twill Tape, 12 mm', hsn: '58063200', unit: 'm', moq: 1000, packMultiple: 100, hue: 45, tiers: [{ min: 1000, price: 2.1 }], images: [], submittedAt: '' }),
    stock: [], lowStockAt: 1000, history: [],
  },
  /* ---------- other vendors (live = marketplace) ---------- */
  {
    id: 'P-2001', vendorId: 'VN-52260', sku: 'TT-RF-0750', categoryId: 'rfid-tags',
    live: ver({ title: 'UHF RFID Hang Tag Inlay, M750 Chip', hsn: '85235210', unit: 'pcs', moq: 1000, packMultiple: 500, hue: 220, description: 'Retail-grade UHF RFID inlay laminated into a hang tag. Pre-encoded SGTIN-96 available.',
      tiers: [{ min: 1000, price: 18.5 }, { min: 10000, price: 15.9 }, { min: 50000, price: 13.8 }], attributes: { chip: 'M750', freq: 'UHF 860–960 MHz', size: '70 × 14' },
      specs: [{ k: 'Read range', v: 'Up to 8 m (fixed reader)' }, { k: 'Memory', v: '128-bit EPC' }], leadTimeDays: 5 }),
    pending: ver({ title: 'UHF RFID Hang Tag Inlay, M750 Chip', hsn: '85235210', unit: 'pcs', moq: 1000, packMultiple: 500, hue: 220, description: 'Retail-grade UHF RFID inlay laminated into a hang tag. Pre-encoded SGTIN-96 and custom encoding available. ARC-certified for major retail programmes.',
      tiers: [{ min: 1000, price: 18.5 }, { min: 10000, price: 15.9 }, { min: 50000, price: 13.8 }], attributes: { chip: 'M750', freq: 'UHF 860–960 MHz', size: '70 × 14' },
      specs: [{ k: 'Read range', v: 'Up to 10 m (fixed reader)' }, { k: 'Memory', v: '128-bit EPC + 48-bit TID' }, { k: 'Certification', v: 'ARC Spec Q' }], leadTimeDays: 5, v: 2, submittedAt: '2026-11-23T10:40:00+05:30' }),
    stock: [{ loc: 'Factory · Pune', qty: 240000 }], lowStockAt: 20000,
    history: [{ at: T('2025-07-01'), by: AP, action: 'Approved & published', v: 1 }, { at: '2026-11-23T10:40:00+05:30', by: 'TagTech Solutions', action: 'Revision submitted', v: 2 }],
  },
  {
    id: 'P-2002', vendorId: 'VN-55102', sku: 'TW-ST-2705', categoryId: 'threads',
    live: ver({ title: 'Poly-Poly Core Spun Thread, Tex 27, 5000 m', hsn: '54011000', unit: 'cone', moq: 50, packMultiple: 10, hue: 190, description: 'High-tenacity core spun sewing thread for denim and workwear. Low lint.',
      tiers: [{ min: 50, price: 92 }, { min: 250, price: 86 }, { min: 1000, price: 79 }], shades: [{ name: 'Natural White', hex: '#fafaf9' }, { name: 'Indigo', hex: '#312e81' }, { name: 'Black', hex: '#111827' }, { name: 'Khaki', hex: '#a16207' }],
      attributes: { tex: '27', length: '5000', fibre: 'Poly-poly core spun' }, leadTimeDays: 2, insta: true }),
    stock: [{ loc: 'Factory · Tiruppur', qty: 6200 }, { loc: 'WH-TUP-01 · Tiruppur Hub', qty: 800 }], lowStockAt: 500,
    history: [{ at: T('2025-11-10'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2003', vendorId: 'VN-47219', sku: 'FR-NW-4010', categoryId: 'interlinings',
    live: ver({ title: 'Non-Woven Fusible Interlining, 40 GSM', hsn: '59039090', unit: 'm', moq: 200, packMultiple: 50, hue: 170, description: 'Dot-coated non-woven fusible for collars, cuffs and plackets.',
      tiers: [{ min: 200, price: 24 }, { min: 1000, price: 21.5 }, { min: 5000, price: 19.2 }], shades: [{ name: 'White', hex: '#ffffff' }, { name: 'Charcoal', hex: '#374151' }], attributes: { gsm: '40', base: 'Non-woven', adhesive: 'PA' }, leadTimeDays: 3 }),
    stock: [{ loc: 'Factory · Ahmedabad', qty: 28000 }], lowStockAt: 2000,
    history: [{ at: T('2026-01-15'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2004', vendorId: 'VN-38851', sku: 'AP-PB-1216', categoryId: 'polybags',
    live: ver({ title: 'LDPE Garment Poly Bag with Suffocation Warning, 12 × 16"', hsn: '39232100', unit: 'pcs', moq: 2000, packMultiple: 500, hue: 140, description: 'Self-seal LDPE garment bag, 50 micron, printed multilingual suffocation warning.',
      tiers: [{ min: 2000, price: 1.75 }, { min: 10000, price: 1.52 }, { min: 50000, price: 1.38 }], attributes: { size: '12 × 16', micron: '50', material: 'LDPE' }, leadTimeDays: 2, insta: true }),
    stock: [{ loc: 'Factory · Bengaluru', qty: 520000 }, { loc: 'WH-BLR-01 · Peenya Hub', qty: 60000 }], lowStockAt: 50000,
    history: [{ at: T('2025-10-05'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2005', vendorId: 'VN-38851', sku: 'AP-HG-1702', categoryId: 'hangers',
    live: ver({ title: 'Recycled Plastic Shirt Hanger with Clips, 17"', hsn: '39269099', unit: 'pcs', moq: 500, packMultiple: 100, hue: 100, description: 'Black recycled-PP shirt hanger with non-slip clips and size-cube slot.',
      tiers: [{ min: 500, price: 7.2 }, { min: 2500, price: 6.6 }, { min: 10000, price: 6.1 }], attributes: { size: '17', material: 'Recycled plastic' }, leadTimeDays: 3 }),
    stock: [{ loc: 'Factory · Bengaluru', qty: 48000 }], lowStockAt: 5000,
    history: [{ at: T('2025-10-05'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2006', vendorId: 'VN-70334', sku: 'RX-HL-2020', categoryId: 'velcro',
    live: ver({ title: 'Hook & Loop Tape, 20 mm, Sew-on', hsn: '58061000', unit: 'm', moq: 250, packMultiple: 25, hue: 330, description: 'Nylon hook & loop pair for kidswear, bags and medical garments.',
      tiers: [{ min: 250, price: 9.4 }, { min: 1000, price: 8.6 }, { min: 5000, price: 7.9 }], shades: [{ name: 'Black', hex: '#111827' }, { name: 'White', hex: '#ffffff' }, { name: 'Navy', hex: '#1e3a8a' }], attributes: { width: '20', attach: 'Sew-on' }, leadTimeDays: 3 }),
    stock: [{ loc: 'Factory · Surat', qty: 14000 }], lowStockAt: 1500,
    history: [{ at: T('2026-02-20'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2007', vendorId: 'VN-66047', sku: 'AF-SN-1515', categoryId: 'buttons',
    live: ver({ title: 'Brass Snap Button, 15 mm, Antique Finish', hsn: '96062200', unit: 'pcs', moq: 1000, packMultiple: 500, hue: 40, description: 'Four-part brass snap, nickel-free, antique brass finish. Pull strength ≥ 90 N.',
      tiers: [{ min: 1000, price: 3.6 }, { min: 10000, price: 3.2 }, { min: 50000, price: 2.9 }], shades: [{ name: 'Antique Brass', hex: '#a16207' }, { name: 'Gunmetal', hex: '#4b5563' }], attributes: { size: '15', material: 'Brass', finish: 'Antique' }, leadTimeDays: 4 }),
    stock: [{ loc: 'Factory · Ludhiana', qty: 180000 }], lowStockAt: 20000,
    history: [{ at: T('2025-12-10'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2008', vendorId: 'VN-61873', sku: 'ZK-MZ-0518', categoryId: 'zippers',
    live: ver({ title: '#5 Metal Zipper, Antique Brass, Auto-lock Slider, 18 cm', hsn: '96071100', unit: 'pcs', moq: 500, packMultiple: 100, hue: 15, description: 'Closed-end metal zipper for jeans and jackets. Smooth glide, 4,000-cycle tested.',
      tiers: [{ min: 500, price: 14.2 }, { min: 2500, price: 12.9 }, { min: 10000, price: 11.8 }], shades: [{ name: 'Antique Brass', hex: '#a16207' }, { name: 'Nickel', hex: '#9ca3af' }, { name: 'Black Oxide', hex: '#1f2937' }],
      attributes: { gauge: '#5', teeth: 'Metal', slider: 'Auto-lock' }, specs: [{ k: 'Cycle test', v: '4,000 cycles' }, { k: 'Crosswise strength', v: '≥ 500 N' }], leadTimeDays: 3, insta: true }),
    pending: ver({ title: '#5 Metal Zipper, Antique Brass, Auto-lock Slider, 18 cm', hsn: '96071100', unit: 'pcs', moq: 500, packMultiple: 100, hue: 15, description: 'Closed-end metal zipper for jeans and jackets. Smooth glide, 4,000-cycle tested.',
      tiers: [{ min: 500, price: 13.5 }, { min: 2500, price: 12.4 }, { min: 10000, price: 11.2 }, { min: 50000, price: 10.6 }], shades: [{ name: 'Antique Brass', hex: '#a16207' }, { name: 'Nickel', hex: '#9ca3af' }, { name: 'Black Oxide', hex: '#1f2937' }],
      attributes: { gauge: '#5', teeth: 'Metal', slider: 'Auto-lock' }, specs: [{ k: 'Cycle test', v: '4,000 cycles' }, { k: 'Crosswise strength', v: '≥ 500 N' }], leadTimeDays: 3, insta: true,
      discount: { pct: 5, from: '2026-12-01', to: '2026-12-31', status: 'Pending' }, v: 2, submittedAt: '2026-11-22T17:05:00+05:30' }),
    stock: [{ loc: 'Factory · New Delhi', qty: 64000 }, { loc: 'WH-DEL-01 · Okhla Hub', qty: 6000 }], lowStockAt: 5000,
    history: [{ at: T('2025-09-01'), by: AP, action: 'Approved & published', v: 1 }, { at: '2026-11-22T17:05:00+05:30', by: 'ZipKing International', action: 'Revision submitted', v: 2 }],
  },
  {
    id: 'P-2009', vendorId: 'VN-70334', sku: 'RX-SQ-1212', categoryId: 'sequins',
    live: ver({ title: 'Hand-sewn Sequin Trim, 12 mm', hsn: '58109200', unit: 'm', moq: 100, packMultiple: 10, hue: 310, description: 'Hand-sewn cup sequin trim on mesh tape for ethnic wear and occasion dresses.',
      tiers: [{ min: 100, price: 32 }, { min: 500, price: 28.5 }], shades: [{ name: 'Gold', hex: '#ca8a04' }, { name: 'Silver', hex: '#d1d5db' }, { name: 'Rose Gold', hex: '#e11d48' }], attributes: { size: '6', width: '12' }, leadTimeDays: 6 }),
    stock: [{ loc: 'Factory · Surat', qty: 2400 }], lowStockAt: 300,
    history: [{ at: T('2026-02-25'), by: AP, action: 'Approved & published', v: 1 }],
  },
  {
    id: 'P-2010', vendorId: 'VN-55102', sku: 'TW-EM-1202', categoryId: 'threads',
    pending: ver({ title: 'Viscose Embroidery Thread, 120D/2, 5000 m', hsn: '54031000', unit: 'cone', moq: 100, packMultiple: 10, hue: 280, description: 'High-sheen viscose embroidery thread for multi-head machines.',
      tiers: [{ min: 100, price: 118 }, { min: 500, price: 109 }], shades: [{ name: 'Ruby', hex: '#be123c' }, { name: 'Emerald', hex: '#047857' }, { name: 'Gold', hex: '#ca8a04' }], attributes: { tex: '30', length: '5000', fibre: 'Viscose' }, leadTimeDays: 3, submittedAt: '2026-11-21T14:00:00+05:30' }),
    stock: [{ loc: 'Factory · Tiruppur', qty: 3000 }], lowStockAt: 300,
    history: [{ at: '2026-11-21T14:00:00+05:30', by: 'ThreadWorks Manufacturing Pvt Ltd', action: 'Submitted for approval', v: 1 }],
  },
  {
    id: 'P-2011', vendorId: 'VN-66047', sku: 'AF-RS-1210', categoryId: 'buttons',
    pending: ver({ title: 'Plastic Ring Snap Fastener, 12 mm (Kidswear)', hsn: '96062100', unit: 'pcs', moq: 2000, packMultiple: 500, hue: 60, description: 'Lead-free polyacetal ring snaps for baby rompers. Pull-tested to EN 71-1.',
      tiers: [{ min: 2000, price: 1.9 }, { min: 20000, price: 1.6 }], shades: [{ name: 'White', hex: '#ffffff' }, { name: 'Sky', hex: '#7dd3fc' }, { name: 'Blush', hex: '#fbcfe8' }], attributes: { size: '12', material: 'Polyester', finish: 'Matte' }, leadTimeDays: 5, submittedAt: '2026-11-25T09:30:00+05:30' }),
    stock: [{ loc: 'Factory · Ludhiana', qty: 90000 }], lowStockAt: 10000,
    history: [{ at: '2026-11-25T09:30:00+05:30', by: 'AuraFastener Industries', action: 'Submitted for approval', v: 1 }],
  },
];

/* =========================================================
   Store
   ========================================================= */

interface Ctx {
  products: Product[];
  otherDocs: Record<string, VendorDoc[]>;
  /** Vendor saves (draft) or submits a version for approval. Returns the product id. */
  saveVersion: (input: { id?: string; vendorId: string; sku: string; categoryId: string; version: Omit<ProductVersion, 'v' | 'submittedAt'>; stock: StockLine[]; submit: boolean; by: string }) => string;
  /** Stock-only edit: applies immediately, no approval. */
  updateStock: (id: string, stock: StockLine[], by: string) => void;
  approve: (id: string, by: string, note?: string) => void;
  reject: (id: string, by: string, reason: string) => void;
  decideOtherDoc: (vendorId: string, docId: string, status: DocStatus, by: string, reason?: string) => void;
  resetCatalog: () => void;
}

const C = createContext<Ctx | null>(null);
const KEY = 'tn.catalog.v1';
const DKEY = 'tn.otherDocs.v1';

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : SEED; } catch { return SEED; }
  });
  const [otherDocs, setOtherDocs] = useState<Record<string, VendorDoc[]>>(() => {
    try { const r = localStorage.getItem(DKEY); return r ? JSON.parse(r) : OTHER_VENDOR_DOCS; } catch { return OTHER_VENDOR_DOCS; }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem(DKEY, JSON.stringify(otherDocs)), [otherDocs]);

  const now = () => new Date().toISOString();

  const saveVersion: Ctx['saveVersion'] = useCallback((input) => {
    const id = input.id ?? `P-${Date.now().toString().slice(-6)}`;
    setProducts((list) => {
      const existing = list.find((p) => p.id === id);
      const lastV = Math.max(0, existing?.live?.v ?? 0, existing?.pending?.v ?? 0, existing?.rejected?.version.v ?? 0, existing?.draft?.v ?? 0);
      const reuseDraftV = existing?.draft && !existing.pending;
      const version: ProductVersion = { ...input.version, v: reuseDraftV ? existing!.draft!.v : lastV + 1, submittedAt: input.submit ? now() : '' };
      const base: Product = existing ?? { id, vendorId: input.vendorId, sku: input.sku, categoryId: input.categoryId, stock: input.stock, lowStockAt: Math.max(1, input.version.moq * 2), history: [] };
      const next: Product = {
        ...base,
        sku: base.live ? base.sku : input.sku,
        categoryId: base.live ? base.categoryId : input.categoryId,
        stock: input.stock,
        draft: input.submit ? undefined : version,
        // Submitting replaces any older pending revision; the LIVE version is untouched.
        pending: input.submit ? version : base.pending,
        history: [...base.history, { at: now(), by: input.by, action: input.submit ? (base.live ? 'Revision submitted' : 'Submitted for approval') : 'Draft saved', v: version.v }],
      };
      return existing ? list.map((p) => (p.id === id ? next : p)) : [next, ...list];
    });
    return id;
  }, []);

  const updateStock = useCallback((id: string, stock: StockLine[], by: string) => setProducts((list) => list.map((p) => p.id !== id ? p : {
    ...p, stock, history: [...p.history, { at: now(), by, action: `Stock updated → ${stock.reduce((s, l) => s + l.qty, 0).toLocaleString('en-IN')}` }],
  })), []);

  const approve = useCallback((id: string, by: string, note?: string) => setProducts((list) => list.map((p) => {
    if (p.id !== id || !p.pending) return p;
    const pub = { ...p.pending, discount: p.pending.discount };
    return { ...p, live: pub, pending: undefined, rejected: undefined, history: [...p.history, { at: now(), by, action: 'Approved & published', v: pub.v, reason: note }] };
  })), []);

  const reject = useCallback((id: string, by: string, reason: string) => setProducts((list) => list.map((p) => {
    if (p.id !== id || !p.pending) return p;
    // A rejected edit never replaces the live version.
    return { ...p, rejected: { version: p.pending, reason, at: now(), by }, pending: undefined, history: [...p.history, { at: now(), by, action: 'Rejected', v: p.pending.v, reason }] };
  })), []);

  const decideOtherDoc = useCallback((vendorId: string, docId: string, status: DocStatus, by: string, reason?: string) => setOtherDocs((m) => ({
    ...m,
    [vendorId]: (m[vendorId] ?? []).map((d) => {
      if (d.id !== docId) return d;
      const vs = [...d.versions];
      vs[vs.length - 1] = { ...vs[vs.length - 1], status, reason, decidedBy: by, decidedAt: now() };
      return { ...d, versions: vs };
    }),
  })), []);

  const resetCatalog = useCallback(() => { setProducts(SEED); setOtherDocs(OTHER_VENDOR_DOCS); }, []);

  return <C.Provider value={{ products, otherDocs, saveVersion, updateStock, approve, reject, decideOtherDoc, resetCatalog }}>{children}</C.Provider>;
}

export function useCatalog(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useCatalog outside CatalogProvider');
  return c;
}
