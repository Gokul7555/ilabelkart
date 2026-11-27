export type ClassificationId = 'labels' | 'core' | 'finishing' | 'embellish';

export const CLASSIFICATIONS: { id: ClassificationId; name: string }[] = [
  { id: 'labels', name: 'Labels & Tags' },
  { id: 'core', name: 'Core Garment Trims' },
  { id: 'finishing', name: 'Finishing, Packaging & Hardware' },
  { id: 'embellish', name: 'Embellishments, Closures & Safety' },
];

export interface Category {
  id: string;
  name: string;
  classification: ClassificationId;
  subCategories: number;
  products: number;
  /** Category-level commission % — the ONLY place commission is set. Admin › Margin Mgr. */
  commission: number;
  hsn: string;
  /** Certificates a vendor typically needs to sell here (informational). */
  certs: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'woven-labels', name: 'Woven & Printed Labels', classification: 'labels', subCategories: 6, products: 342, commission: 9, hsn: '5807', certs: ['OEKO-TEX Standard 100'] },
  { id: 'rfid-tags', name: 'RFID/NFC Smart Tags', classification: 'labels', subCategories: 3, products: 58, commission: 7, hsn: '8523', certs: ['REACH'] },
  { id: 'hang-tags', name: 'Barcode & Hang Tags', classification: 'labels', subCategories: 5, products: 214, commission: 10, hsn: '4821', certs: [] },
  { id: 'threads', name: 'Sewing Threads', classification: 'core', subCategories: 4, products: 187, commission: 6, hsn: '5401', certs: ['OEKO-TEX Standard 100', 'GOTS'] },
  { id: 'interlinings', name: 'Interlinings & Fusibles', classification: 'core', subCategories: 4, products: 96, commission: 7.5, hsn: '5903', certs: ['OEKO-TEX Standard 100'] },
  { id: 'elastic', name: 'Elastic & Webbing', classification: 'core', subCategories: 5, products: 163, commission: 8, hsn: '5806', certs: ['OEKO-TEX Standard 100'] },
  { id: 'polybags', name: 'Poly Bags & Garment Covers', classification: 'finishing', subCategories: 4, products: 121, commission: 8, hsn: '3923', certs: ['REACH'] },
  { id: 'hangers', name: 'Hangers & Display', classification: 'finishing', subCategories: 3, products: 74, commission: 9, hsn: '3926', certs: [] },
  { id: 'velcro', name: 'Hook & Loop/Velcro', classification: 'finishing', subCategories: 2, products: 45, commission: 8, hsn: '5806', certs: ['OEKO-TEX Standard 100'] },
  { id: 'buttons', name: 'Buttons & Studs', classification: 'embellish', subCategories: 6, products: 298, commission: 9.5, hsn: '9606', certs: ['REACH'] },
  { id: 'zippers', name: 'Zippers & Sliders', classification: 'embellish', subCategories: 5, products: 231, commission: 8.5, hsn: '9607', certs: ['REACH', 'OEKO-TEX Standard 100'] },
  { id: 'sequins', name: 'Sequins & Embellishments', classification: 'embellish', subCategories: 4, products: 89, commission: 11, hsn: '5810', certs: [] },
];

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);

/** GST % by category (HSN-driven). Used for the buyer-side tax breakup. */
export const GST_RATE: Record<string, number> = {
  'woven-labels': 12, 'rfid-tags': 18, 'hang-tags': 12, threads: 12, interlinings: 12, elastic: 12,
  polybags: 18, hangers: 18, velcro: 12, buttons: 18, zippers: 18, sequins: 12,
};

export interface AttrDef { key: string; label: string; options?: string[]; unit?: string }

/** Category-driven attributes shown on the Add Product form. */
export const CATEGORY_ATTRS: Record<string, AttrDef[]> = {
  'woven-labels': [
    { key: 'width', label: 'Width', unit: 'mm' }, { key: 'height', label: 'Height', unit: 'mm' },
    { key: 'weave', label: 'Weave', options: ['Damask', 'Taffeta', 'Satin', 'Printed satin', 'Cotton'] },
    { key: 'fold', label: 'Fold', options: ['Straight cut', 'Centre fold', 'End fold', 'Mitre fold', 'Loop fold'] },
  ],
  'rfid-tags': [{ key: 'chip', label: 'Chip' }, { key: 'freq', label: 'Frequency', options: ['UHF 860–960 MHz', 'HF 13.56 MHz (NFC)'] }, { key: 'size', label: 'Inlay size', unit: 'mm' }],
  'hang-tags': [{ key: 'gsm', label: 'Board GSM', unit: 'gsm' }, { key: 'size', label: 'Size', unit: 'mm' }, { key: 'finish', label: 'Finish', options: ['Matte', 'Gloss', 'Uncoated kraft', 'Soft-touch'] }],
  threads: [{ key: 'tex', label: 'Tex' }, { key: 'length', label: 'Length per cone', unit: 'm' }, { key: 'fibre', label: 'Fibre', options: ['Poly-poly core spun', 'Spun polyester', 'Cotton', 'Viscose', 'Nylon bonded'] }],
  interlinings: [{ key: 'gsm', label: 'Weight', unit: 'gsm' }, { key: 'base', label: 'Base', options: ['Non-woven', 'Woven', 'Knitted'] }, { key: 'adhesive', label: 'Adhesive', options: ['PA', 'PES', 'LDPE', 'HDPE'] }],
  elastic: [{ key: 'width', label: 'Width', unit: 'mm' }, { key: 'stretch', label: 'Stretch', unit: '%' }, { key: 'type', label: 'Construction', options: ['Knitted', 'Woven', 'Braided', 'Jacquard'] }],
  polybags: [{ key: 'size', label: 'Size', unit: 'inch' }, { key: 'micron', label: 'Thickness', unit: 'micron' }, { key: 'material', label: 'Material', options: ['LDPE', 'PP', 'Recycled LDPE', 'Biodegradable'] }],
  hangers: [{ key: 'size', label: 'Size', unit: 'inch' }, { key: 'material', label: 'Material', options: ['Recycled plastic', 'Wood', 'Metal', 'Paperboard'] }],
  velcro: [{ key: 'width', label: 'Width', unit: 'mm' }, { key: 'attach', label: 'Attachment', options: ['Sew-on', 'Self-adhesive', 'Iron-on'] }],
  buttons: [{ key: 'size', label: 'Size', unit: 'mm' }, { key: 'material', label: 'Material', options: ['Brass', 'Zinc alloy', 'Polyester', 'Corozo', 'Shell'] }, { key: 'finish', label: 'Finish' }],
  zippers: [{ key: 'gauge', label: 'Gauge', options: ['#3', '#5', '#8', '#10'] }, { key: 'teeth', label: 'Teeth', options: ['Metal', 'Nylon coil', 'Vislon (moulded)'] }, { key: 'slider', label: 'Slider', options: ['Auto-lock', 'Non-lock', 'Pin-lock', 'Reversible'] }],
  sequins: [{ key: 'size', label: 'Sequin size', unit: 'mm' }, { key: 'width', label: 'Trim width', unit: 'mm' }],
};
