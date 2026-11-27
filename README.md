# TrimNova: front-end prototype

B2B2C marketplace for garment trims and packaging in India (INR, GST). It is a complete front-end with realistic mock data and **no backend**: all state lives in the browser's `localStorage`.

The brand name is a single variable in `src/config/brand.ts`.

## Design

Corporate B2B look: teal-700 primary, slate-800 header and footer, emerald accents, and amber, sky, emerald and red for the pending, processing, delivered and cancelled statuses.
- **Theme:** every colour is a CSS variable in `src/index.css`. Dark mode (the sun/moon button in the header) uses the same token names with re-stepped values.
- **Type and shape:** Inter for body text (15px), IBM Plex Sans for headings, tabular numbers for prices. 6px corners, 1px slate-200 borders, and shadows only on hover.
- **Header:** utility bar (phone, email, Request a Quote, GST-registered badge, region), then the main bar (logo, wide search, account, cart), then a category bar with a mega menu.
- **Trust content:** stats, client logos, certifications and case studies are placeholders, marked **Sample** on the page.
- **Images:** product and factory photos are placeholders from placehold.co.
- **Portal navigation:** every portal (Vendor, Approver, Admin, Support, Finance, Warehouse) uses a top menu bar instead of a sidebar.
  - The bar holds the logo block, the grouped menu with count badges, region, quick search, notifications and a user chip.
  - Entries that don't fit move into **More ▾**. On phones the menu opens as a drawer.
- **Components:** sortable tables, tiered price tables, a checkout stepper, breadcrumbs on inner pages, and a sticky Request a Quote button on mobile.
- **Accessibility:** focus rings, skip link and semantic landmarks. All text/background token pairs were checked for WCAG AA (4.5:1) in both themes.
- **Previous look:** the navy/indigo version is saved in `~/reactdevelopment/I_kart_backups/src-navy-indigo`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Demo logins

The login page has a click-to-fill demo-credentials panel.

| Role | Login | Password | Lands on |
|---|---|---|---|
| Vendor | procurement@novatex.in | NovaTex@2024 | Vendor dashboard |
| Customer | buyer@raymondgarments.in | Raymond@2024 | Marketplace |
| Approver | approver@trimnova.in | Approver@2024 | Review queue |
| Admin (Super Admin) | ROOT-01 | AdminRoot@2024, then TOTP `849201` or blank | Admin dashboard |
| Finance staff | finance@trimnova.in | Finance@2024, then TOTP | Payments & COD |
| Warehouse staff | warehouse@trimnova.in | Warehouse@2024, then TOTP | TrimInsta Ops |
| Support | support@trimnova.in | Support@2024 | All tickets |

Guests can browse the marketplace and send a bulk **Request a Quote** (`/quote`) without signing in.

Other demo codes:
- Sign-up and forgot-password OTP: `123456`.
- Courier / delivery-partner handover OTP: `482913`.
- The buyer's delivery OTP is shown on each order.

**Reset demo data** (user menu, top right) restores every seed and keeps you signed in.

## Suggested walkthrough

1. **Vendor › Onboarding › Demo controls › "Restart as a new vendor"**
   - Go through GST → PAN → certificate → plan → bank → submit.
   - Act as the Approver (or use the demo buttons), then activate as Admin.
2. **Vendor › My Catalog**: add a product and watch the "Customer sees ₹X" preview. Editing price creates a revision; changing only stock goes live immediately.
3. **Approver › Review Queue**: compare old vs new. The publish gate blocks ThreadWorks until its OEKO-TEX renewal is approved.
4. **Customer › Marketplace**: open a product, choose a tier and delivery method, then cart (one sub-order per vendor, with a price-change flag) → checkout.
5. **Customer › My Orders**: tracking, delivery OTP, invoice, and a damage claim inside the return window.
6. **Vendor › Orders**: accept, reject, or request partial acceptance; dispatch with OTP handover.
7. **Support**: tickets, disputes (refund / replace / split / reject / ask for evidence), NDR (fix address / start RTO), risk flags.
8. **Admin**:
   - SLA alerts on the dashboard.
   - Escalations, commission per category (Margin Manager), coupons, and vendor freeze/activation.
   - Settlements: the 6 payout conditions, batch creation, and recording a transfer with UTR (a failed transfer stays Pending).
   - Finance and Warehouse screens, Staff & Roles, Reports, and the Audit Log.

## Business rules enforced in the UI

- Customer price = vendor base price + **category** commission. Commission is never shown to buyers or other vendors, and there are no vendor- or product-level overrides.
- Price, photo, description and policy edits need re-approval; stock-only edits don't. A rejected edit never replaces the live version.
- Vendors submit and the Approver publishes. Admin activates a vendor only when every required document is approved.
- One checkout creates one parent order with a sub-order per vendor (and per delivery route), and one invoice per vendor after verified delivery. Orders can't be cancelled or edited.
- OTP handover is mandatory: vendor → courier, hub → partner, courier → buyer.
- TrimInsta is offered only inside a hub's service zone and only when that hub has stock. Couriers are assigned by the system.
- Only damaged quantity can be claimed, within a 5–7 day window. The remedy is set per unit, and a replacement is a new linked order.
- Refund statuses Pending, Failed and Unknown are never shown as Succeeded.
- A vendor is paid only when all 6 conditions pass. Admin pays manually with amount, date, UTR and admin name.
- Fraud flags only flag; Admin freezes after Support review and never auto-bans.
- Every sensitive action requires a reason and writes to the audit log.

## Still open with the client (shown as "TBD")

- Subscription tier names and prices
- Partial-acceptance rule
- Who pays for return logistics
- Refund SLA
- Vendor-flag time window
- SMS and WhatsApp providers
- Hub rent rate
- Registration fee (default **OFF**)
- Other countries

Shipping charges, the COD limit and GST rates per category are placeholder values. They live in `src/lib/pricing.ts` and `src/data/categories.ts`.

## Code map

| Path | What's there |
|---|---|
| `src/index.css` | Design system (tokens and component classes) |
| `src/components/` | Shared UI: cards, KPIs, tabs, pills, banners, modals, OTP, uploader, audit trail |
| `src/lib/` | Mock stores (one React context each, persisted to localStorage) and business rules (`pricing`, `compliance`, `settlements`) |
| `src/data/` | Seed and reference data: categories, vendors, customers, India lookups |
| `src/pages/<area>/` | Screens for auth, vendor, approver, market, account, support, admin, finance and warehouse |
