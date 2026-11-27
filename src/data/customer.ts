export interface Address {
  id: string;
  label: string;
  line: string;
  city: string;
  state: string;
  pin: string;
  /** Nearest TrimInsta hub within the ~6 km service zone, if any. */
  hubId: string | null;
  hubKm: number | null;
  contact: string;
  phone: string;
}

export const CUSTOMER = {
  id: 'CU-30117',
  company: 'Raymond Garments Ltd',
  gstin: '27AAACR5055K1Z7',
  state: 'Maharashtra',
  buyer: 'Priya Nair',
  email: 'buyer@raymondgarments.in',
  phone: '+91 98200 41177',
};

export const ADDRESSES: Address[] = [
  { id: 'AD-1', label: 'Thane Unit (default)', line: 'Plot 14, Pokhran Road No. 1, Jekegram', city: 'Thane', state: 'Maharashtra', pin: '400606', hubId: 'WH-MUM-01', hubKm: 4.2, contact: 'Suresh Patil', phone: '+91 98201 33490' },
  { id: 'AD-2', label: 'Bengaluru Unit', line: 'No. 88, 2nd Stage, Peenya Industrial Area', city: 'Bengaluru', state: 'Karnataka', pin: '560058', hubId: 'WH-BLR-01', hubKm: 3.1, contact: 'Anitha R.', phone: '+91 98450 22781' },
  { id: 'AD-3', label: 'Vapi Unit', line: 'GIDC Phase II, Plot 2207', city: 'Vapi', state: 'Gujarat', pin: '396195', hubId: null, hubKm: null, contact: 'Hitesh Desai', phone: '+91 98250 61144' },
];

/** Buyer companies on the platform (vendors only ever see company + city). */
export const CUSTOMERS: { id: string; company: string; city: string; state: string; gstin: string; buyer: string }[] = [
  { id: 'CU-30117', company: 'Raymond Garments Ltd', city: 'Thane', state: 'Maharashtra', gstin: '27AAACR5055K1Z7', buyer: 'Priya Nair' },
  { id: 'CU-30122', company: 'Arvind Fashions', city: 'Bengaluru', state: 'Karnataka', gstin: '29AAECA9922L1Z3', buyer: 'Vikram Rao' },
  { id: 'CU-30145', company: 'Orient Tex', city: 'Tiruppur', state: 'Tamil Nadu', gstin: '33AABFO4410C1Z6', buyer: 'Meena Sundaram' },
  { id: 'CU-30151', company: 'Mafatlal Textiles', city: 'Ahmedabad', state: 'Gujarat', gstin: '24AAACM2201D1Z9', buyer: 'Jignesh Shah' },
  { id: 'CU-30163', company: 'Bombay Shirt Co', city: 'Mumbai', state: 'Maharashtra', gstin: '27AAFCB7781E1Z2', buyer: 'Aditi Kulkarni' },
  { id: 'CU-30170', company: 'Birla Textiles', city: 'Kolkata', state: 'West Bengal', gstin: '19AAACB6610F1Z4', buyer: 'Sourav Ghosh' },
];
export const customerById = (id: string) => CUSTOMERS.find((c) => c.id === id);

/** Minimal ship-to addresses for other buyers (Raymond uses ADDRESSES above). */
export const OTHER_ADDRESSES: Record<string, Address> = {
  'CU-30122': { id: 'AF-1', label: 'Arvind DC', line: 'Survey 41, Bommasandra Industrial Area', city: 'Bengaluru', state: 'Karnataka', pin: '560099', hubId: null, hubKm: null, contact: 'Vikram Rao', phone: '+91 98450 11872' },
  'CU-30145': { id: 'OT-1', label: 'Orient Tex Unit 2', line: '14/2 Kangeyam Road', city: 'Tiruppur', state: 'Tamil Nadu', pin: '641604', hubId: 'WH-TUP-01', hubKm: 5.4, contact: 'Meena Sundaram', phone: '+91 94430 77120' },
  'CU-30151': { id: 'MF-1', label: 'Mafatlal Naroda', line: 'Plot 77, Naroda GIDC', city: 'Ahmedabad', state: 'Gujarat', pin: '382330', hubId: null, hubKm: null, contact: 'Jignesh Shah', phone: '+91 98250 44019' },
  'CU-30163': { id: 'BS-1', label: 'BSC Lower Parel', line: 'Unit 5, Kamala Mills', city: 'Mumbai', state: 'Maharashtra', pin: '400013', hubId: null, hubKm: null, contact: 'Aditi Kulkarni', phone: '+91 98200 66231' },
  'CU-30170': { id: 'BT-1', label: 'Birla Howrah', line: '22 Belilious Road', city: 'Howrah', state: 'West Bengal', pin: '711101', hubId: null, hubKm: null, contact: 'Sourav Ghosh', phone: '+91 98300 51190' },
};
