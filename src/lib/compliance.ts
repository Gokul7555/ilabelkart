import { CATEGORIES, categoryById } from '../data/categories';
import { NOVATEX_ID, vendorById } from '../data/vendors';
import { displayStatus } from './onboarding';
import type { VendorDoc } from './onboarding';
import type { ProductVersion } from './catalog';
import type { VendorStatus } from './vendorState';

export interface GateCheck { ok: boolean; label: string; detail: string }

/** A vendor's documents: NovaTex lives in the onboarding store, others in the catalog store. */
export function docsForVendor(vendorId: string, novatexDocs: VendorDoc[], otherDocs: Record<string, VendorDoc[]>): VendorDoc[] {
  return vendorId === NOVATEX_ID ? novatexDocs : otherDocs[vendorId] ?? [];
}

/** Valid = latest Approved and not expired. Pending/On Hold/Rejected/Expired never count. */
export const validCertTypes = (docs: VendorDoc[]) =>
  new Set(docs.filter((d) => d.kind === 'CERT' && displayStatus(d) === 'Approved').map((d) => d.certType!));

/** Approver publish gate: every check must pass before Approve & Publish is enabled. */
export function publishGate(opts: {
  vendorId: string; categoryId: string; version: ProductVersion; docs: VendorDoc[]; novatexStatus: VendorStatus;
}): GateCheck[] {
  const { vendorId, categoryId, version, docs, novatexStatus } = opts;
  const vendor = vendorById(vendorId);
  const vendorActive = vendorId === NOVATEX_ID ? novatexStatus === 'active' : vendor?.status === 'Active';
  const cat = categoryById(categoryId);
  const valid = validCertTypes(docs);
  const needs = cat?.certs ?? [];
  const has = needs.filter((c) => valid.has(c));
  const complete = !!version.title.trim() && version.images.length > 0 && /^\d{4,8}$/.test(version.hsn) && version.tiers.length > 0 && version.tiers.every((t) => t.price > 0);
  return [
    { ok: vendorActive, label: 'Vendor is active', detail: vendorActive ? `${vendor?.name ?? vendorId} · Active` : 'Vendor is not active (frozen or under review)' },
    { ok: !!cat && CATEGORIES.includes(cat), label: 'Category is active', detail: cat?.name ?? 'Unknown category' },
    { ok: (cat?.commission ?? 0) > 0, label: 'Commission configured', detail: cat ? `${cat.commission.toFixed(1)}% · category-level` : 'Not configured' },
    {
      ok: needs.length === 0 || has.length > 0, label: 'Compliance valid',
      detail: needs.length === 0 ? 'No mandatory certificate for this category'
        : has.length ? `Valid: ${has.join(', ')}` : `Needs one valid certificate of: ${needs.join(' / ')}`,
    },
    { ok: complete, label: 'Listing complete', detail: complete ? 'Title, HSN, photos and price present' : 'Missing title, HSN, photos or price' },
  ];
}
