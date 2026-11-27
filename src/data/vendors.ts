import type { VendorDoc } from '../lib/onboarding';

export interface Vendor {
  id: string;
  name: string;
  city: string;
  state: string;
  gstin: string;
  status: 'Active' | 'Frozen' | 'Under review';
  elite: boolean;
  rating: number;
  since: string;
  plan: 'Free' | 'Standard' | 'Premium';
}

export const VENDORS: Vendor[] = [
  { id: 'VN-89420', name: 'NovaTex Manufacturing', city: 'Mumbai', state: 'Maharashtra', gstin: '27AABCN4567K1Z9', status: 'Active', elite: true, rating: 4.8, since: '2026-03-14', plan: 'Standard' },
  { id: 'VN-55102', name: 'ThreadWorks Manufacturing Pvt Ltd', city: 'Tiruppur', state: 'Tamil Nadu', gstin: '33AAFCT2231M1Z4', status: 'Active', elite: false, rating: 4.5, since: '2025-11-02', plan: 'Free' },
  { id: 'VN-61873', name: 'ZipKing International', city: 'New Delhi', state: 'Delhi', gstin: '07AAICZ7781P1ZQ', status: 'Active', elite: true, rating: 4.7, since: '2025-08-21', plan: 'Premium' },
  { id: 'VN-47219', name: 'FuseRight Textiles', city: 'Ahmedabad', state: 'Gujarat', gstin: '24AADCF5512H1Z8', status: 'Active', elite: false, rating: 4.4, since: '2026-01-10', plan: 'Free' },
  { id: 'VN-70334', name: 'Ribbonex India', city: 'Surat', state: 'Gujarat', gstin: '24AAKCR9087E1Z1', status: 'Active', elite: false, rating: 4.3, since: '2026-02-18', plan: 'Standard' },
  { id: 'VN-38851', name: 'AccessoryPlus', city: 'Bengaluru', state: 'Karnataka', gstin: '29AAHCA4410K1ZT', status: 'Active', elite: false, rating: 4.6, since: '2025-09-30', plan: 'Standard' },
  { id: 'VN-52260', name: 'TagTech Solutions', city: 'Pune', state: 'Maharashtra', gstin: '27AABCT6634N1Z3', status: 'Active', elite: true, rating: 4.9, since: '2025-06-12', plan: 'Premium' },
  { id: 'VN-66047', name: 'AuraFastener Industries', city: 'Ludhiana', state: 'Punjab', gstin: '03AAECA1209B1Z6', status: 'Active', elite: false, rating: 4.5, since: '2025-12-05', plan: 'Free' },
];

export const NOVATEX_ID = 'VN-89420';
export const vendorById = (id: string) => VENDORS.find((v) => v.id === id);

/** NovaTex category approvals (Capabilities + Add Product category list). */
export interface CatApproval { categoryId: string; status: 'Approved' | 'Pending' | 'Rejected'; since: string; capacity: number; reason?: string }
export const NOVATEX_CATEGORIES: CatApproval[] = [
  { categoryId: 'woven-labels', status: 'Approved', since: '2026-03-14', capacity: 2500000 },
  { categoryId: 'hang-tags', status: 'Approved', since: '2026-03-14', capacity: 800000 },
  { categoryId: 'elastic', status: 'Approved', since: '2026-05-02', capacity: 150000 },
  { categoryId: 'threads', status: 'Pending', since: '2026-11-22', capacity: 60000 },
  { categoryId: 'rfid-tags', status: 'Rejected', since: '2026-08-19', capacity: 0, reason: 'RFID inlay test report (ISO/IEC 18000-63) required.' },
];

/* ---------- Other vendors' compliance documents (NovaTex's live in the onboarding store) ---------- */

const A = 'Kavya Iyer (AP-1042)';
const cert = (id: string, certType: string, number: string, versions: VendorDoc['versions']): VendorDoc =>
  ({ id, kind: 'CERT', title: `${certType} Certificate`, certType, number, required: false, versions });

export const OTHER_VENDOR_DOCS: Record<string, VendorDoc[]> = {
  'VN-55102': [
    cert('TW-OEKO', 'OEKO-TEX Standard 100', 'SH024 77120', [
      { v: 1, fileName: 'OEKO_77120_2025.pdf', uploadedAt: '2025-11-01T10:00:00+05:30', status: 'Approved', issueDate: '2025-11-11', expiryDate: '2026-11-10', decidedBy: A, decidedAt: '2025-11-03T10:00:00+05:30' },
      { v: 2, fileName: 'OEKO_77120_2026_renewal.pdf', uploadedAt: '2026-11-24T09:15:00+05:30', status: 'Pending', issueDate: '2026-11-11', expiryDate: '2027-11-10' },
    ]),
    cert('TW-ISO', 'ISO 9001', 'QMS-TN-44021', [
      { v: 1, fileName: 'ISO9001_44021.pdf', uploadedAt: '2025-11-01T10:05:00+05:30', status: 'Approved', issueDate: '2025-03-01', expiryDate: '2028-02-28', decidedBy: A, decidedAt: '2025-11-03T10:00:00+05:30' },
    ]),
  ],
  'VN-61873': [
    cert('ZK-REACH', 'REACH', 'RCH-ZK-2026-11', [{ v: 1, fileName: 'REACH_ZipKing.pdf', uploadedAt: '2026-01-04T10:00:00+05:30', status: 'Approved', issueDate: '2026-01-02', expiryDate: '2027-01-01', decidedBy: A, decidedAt: '2026-01-05T10:00:00+05:30' }]),
    cert('ZK-OEKO', 'OEKO-TEX Standard 100', 'SH025 30017', [{ v: 1, fileName: 'OEKO_30017.pdf', uploadedAt: '2026-04-04T10:00:00+05:30', status: 'Approved', issueDate: '2026-04-01', expiryDate: '2027-03-31', decidedBy: A, decidedAt: '2026-04-05T10:00:00+05:30' }]),
  ],
  'VN-47219': [
    cert('FR-OEKO', 'OEKO-TEX Standard 100', 'SH025 51190', [{ v: 1, fileName: 'OEKO_51190.pdf', uploadedAt: '2026-01-08T10:00:00+05:30', status: 'Approved', issueDate: '2026-01-05', expiryDate: '2027-01-04', decidedBy: A, decidedAt: '2026-01-09T10:00:00+05:30' }]),
  ],
  'VN-70334': [
    cert('RX-OEKO', 'OEKO-TEX Standard 100', 'SH025 66301', [{ v: 1, fileName: 'OEKO_66301.pdf', uploadedAt: '2026-02-15T10:00:00+05:30', status: 'Approved', issueDate: '2026-02-10', expiryDate: '2027-02-09', decidedBy: A, decidedAt: '2026-02-17T10:00:00+05:30' }]),
    cert('RX-REACH', 'REACH', 'RCH-RX-0981', [{ v: 1, fileName: 'Ribbonex_REACH_SVHC.pdf', uploadedAt: '2026-11-24T18:30:00+05:30', status: 'Pending', issueDate: '2026-11-01', expiryDate: '2027-10-31' }]),
    { id: 'RX-GST', kind: 'GST', title: 'GST Registration Certificate (address amendment)', number: '24AAKCR9087E1Z1', required: true, versions: [
      { v: 1, fileName: 'GST_REG06_Ribbonex.pdf', uploadedAt: '2026-02-15T10:00:00+05:30', status: 'Approved', decidedBy: A, decidedAt: '2026-02-17T10:00:00+05:30' },
      { v: 2, fileName: 'GST_amendment_new_godown.pdf', uploadedAt: '2026-11-25T11:00:00+05:30', status: 'Pending' },
    ] },
  ],
  'VN-38851': [
    cert('AP-REACH', 'REACH', 'RCH-AP-5512', [{ v: 1, fileName: 'REACH_AccessoryPlus.pdf', uploadedAt: '2025-10-01T10:00:00+05:30', status: 'Approved', issueDate: '2025-09-28', expiryDate: '2027-09-27', decidedBy: A, decidedAt: '2025-10-02T10:00:00+05:30' }]),
    cert('AP-FSC', 'FSC', 'FSC-C201144', [{ v: 1, fileName: 'FSC_C201144.pdf', uploadedAt: '2025-10-01T10:00:00+05:30', status: 'Approved', issueDate: '2025-09-01', expiryDate: '2030-08-31', decidedBy: A, decidedAt: '2025-10-02T10:00:00+05:30' }]),
  ],
  'VN-52260': [
    cert('TT-REACH', 'REACH', 'RCH-TT-7720', [{ v: 1, fileName: 'REACH_TagTech.pdf', uploadedAt: '2025-06-10T10:00:00+05:30', status: 'Approved', issueDate: '2025-06-01', expiryDate: '2027-05-31', decidedBy: A, decidedAt: '2025-06-11T10:00:00+05:30' }]),
    cert('TT-ISO14', 'ISO 14001', 'EMS-MH-11873', [{ v: 1, fileName: 'ISO14001_TagTech.pdf', uploadedAt: '2026-11-23T15:20:00+05:30', status: 'Pending', issueDate: '2026-11-01', expiryDate: '2029-10-31' }]),
  ],
  'VN-66047': [
    cert('AF-REACH', 'REACH', 'RCH-AF-3390', [{ v: 1, fileName: 'REACH_AuraFastener.pdf', uploadedAt: '2025-12-04T10:00:00+05:30', status: 'Approved', issueDate: '2025-12-01', expiryDate: '2027-11-30', decidedBy: A, decidedAt: '2025-12-05T10:00:00+05:30' }]),
  ],
};
