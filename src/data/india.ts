/** GST state codes (first two digits of a GSTIN). */
export const GST_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '03': 'Punjab', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh', '24': 'Gujarat', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala',
  '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh',
};

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Mock IFSC → bank lookup by bank prefix. */
export const BANKS: Record<string, string> = {
  HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', SBIN: 'State Bank of India', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank',
  YESB: 'Yes Bank', PUNB: 'Punjab National Bank', BARB: 'Bank of Baroda', IDIB: 'Indian Bank', CNRB: 'Canara Bank',
};

/** Demo values that make the mock verifications succeed. */
export const DEMO_KYC = {
  gstin: '27AABCN4567K1Z9',
  pan: 'AABCN4567K',
  ifsc: 'HDFC0001234',
  account: '50200012345678',
  legalName: 'NOVATEX MANUFACTURING PRIVATE LIMITED',
  /** GSTIN that returns a "Cancelled" registration, to demo the failure path. */
  cancelledGstin: '24AAACX9999Q1Z2',
};

export const CERT_TYPES = ['GOTS', 'OEKO-TEX Standard 100', 'FSC', 'GINETEX', 'REACH', 'ISO 9001', 'ISO 14001', 'GRS', 'Bluesign', 'Other'] as const;

export const TRIMINSTA_HUBS = [
  { id: 'WH-MUM-01', name: 'Mumbai · Bhiwandi Hub', city: 'Mumbai' },
  { id: 'WH-TUP-01', name: 'Tiruppur Hub', city: 'Tiruppur' },
  { id: 'WH-DEL-01', name: 'Delhi NCR · Okhla Hub', city: 'New Delhi' },
  { id: 'WH-BLR-01', name: 'Bengaluru · Peenya Hub', city: 'Bengaluru' },
];
