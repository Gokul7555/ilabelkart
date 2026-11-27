import { useMemo } from 'react';
import { categoryById } from '../data/categories';
import { NOVATEX_ID, vendorById } from '../data/vendors';
import type { Vendor } from '../data/vendors';
import { useCatalog } from './catalog';
import type { Product } from './catalog';
import { displayStatus, useOnboarding } from './onboarding';
import type { DocStatus } from './onboarding';
import { docsForVendor } from './compliance';
import { useVendorState } from './vendorState';
import { useAdmin } from './admin';

export interface CertBadge { type: string; status: DocStatus | 'Expired'; number?: string; expiry?: string }

export interface Listing {
  product: Product;
  vendor: Vendor;
  /** Shown to buyers: valid (green) + pending/on hold/rejected (faded). Expired certificates are hidden. */
  certs: CertBadge[];
  validCerts: string[];
  salesBlocked: boolean;
  blockReason?: string;
}

/** Buyer-facing view of the catalog: LIVE versions only, never pending edits or commission. */
export function useListings(): Listing[] {
  const { products, otherDocs } = useCatalog();
  const { data } = useOnboarding();
  const { status } = useVendorState();
  const { vendorStatus, commission } = useAdmin();
  return useMemo(() => products.filter((p) => p.live).map((p) => {
    const vendor = vendorById(p.vendorId)!;
    const docs = docsForVendor(p.vendorId, data.docs, otherDocs).filter((d) => d.kind === 'CERT');
    const certs: CertBadge[] = docs
      .map((d) => ({ type: d.certType!, status: displayStatus(d), number: d.number, expiry: d.versions[d.versions.length - 1].expiryDate }))
      .filter((c) => c.status !== 'Expired');
    const validCerts = certs.filter((c) => c.status === 'Approved').map((c) => c.type);
    const needs = categoryById(p.categoryId)?.certs ?? [];
    const vendorActive = p.vendorId === NOVATEX_ID ? status === 'active' : (vendorStatus[p.vendorId] ?? vendor.status) === 'Active';
    let blockReason: string | undefined;
    if (!vendorActive) blockReason = 'Supplier account is not active';
    else if (needs.length && !needs.some((n) => validCerts.includes(n))) blockReason = `Supplier's ${needs.join(' / ')} certificate has expired or is under review`;
    return { product: p, vendor, certs, validCerts, salesBlocked: !!blockReason, blockReason };
  }), [products, otherDocs, data.docs, status, vendorStatus, commission]); // commission: re-price when Admin changes it
}
