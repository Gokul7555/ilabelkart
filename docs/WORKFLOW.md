# TrimNova: How the Whole System Works

As of 27 Nov 2026. Online copy (with comments): https://claude.ai/artifact/24qCMuRJjjJBfnXg3Kg5vj

---

## 1. Overview

TrimNova is a B2B marketplace where Indian garment makers buy trims (labels, threads, zippers, buttons, packaging) from verified vendors. Prices are in INR and every order has GST invoices.

The app today is a complete front-end with sample data. There is no real server: all data lives in the browser, so it resets with **Reset demo data** in the user menu.

**How to run it**

1. Open a terminal in the project folder `I_kart`.
2. Run `npm install` (first time only), then `npm run dev`.
3. Open the address it prints, usually http://localhost:5173.

**Demo logins** (the login page fills these in when you click a row)

| Role | Login | Password |
| --- | --- | --- |
| Vendor | procurement@novatex.in | NovaTex@2024 |
| Buyer (customer) | buyer@raymondgarments.in | Raymond@2024 |
| Approver | approver@trimnova.in | Approver@2024 |
| Admin | ROOT-01 | AdminRoot@2024, then code 849201 or blank |
| Finance staff | finance@trimnova.in | Finance@2024, then code 849201 |
| Warehouse staff | warehouse@trimnova.in | Warehouse@2024, then code 849201 |
| Support | support@trimnova.in | Support@2024 |

Other demo codes: sign-up and password-reset OTP `123456`; courier handover OTP `482913`. Each order page shows its own delivery OTP.

**Current status:** all 9 build phases are done, and every screen uses the new layout (top app bar, page header with eyebrow, stat cards, filter chips, card tables, two-column detail pages).

---

## 2. Who does what

There are 7 kinds of users. Each one signs in on the same login page and lands on their own home screen.

| Role | What they do | Lands on |
| --- | --- | --- |
| Buyer (customer) | Browses products, places orders, tracks delivery, raises damage claims, asks for bulk quotes | Marketplace |
| Vendor | Completes onboarding, lists products, accepts and dispatches orders, tracks payouts | Vendor dashboard |
| Approver | Checks vendor documents and product listings, then approves or rejects them | Review queue |
| Support | The only contact point for buyers. Handles tickets, damage disputes and failed deliveries | All tickets |
| Admin | Runs the platform: commission, coupons, vendors, payouts, settings, staff | Admin dashboard |
| Finance staff | Matches payments, runs refunds, issues invoices, reconciles money | Payments & COD |
| Warehouse staff | Receives stock into TrimInsta hubs, manages bins, packs 6-hour orders | TrimInsta Ops |

Important separations:

- Vendors see only their own data. They never see other vendors, buyer contact details or commission of other categories.
- Buyers never see commission. They see one price per unit, before GST.
- Nobody approves their own work. Vendors submit, the Approver publishes, Admin activates.

---

## 3. Vendor journey: from sign-up to selling

A vendor can sell only after the Approver accepts every required document and Admin activates the account. Until then, Dashboard, Capabilities, Catalog, Orders and Settlements stay locked.

1. **Sign up.** The vendor registers with company name, contact, email and mobile, then confirms with an OTP.
2. **Module 01: KYC & Compliance.**
    1. Enter GSTIN and press Verify. The app shows legal name, state and status. Only an Active GSTIN can continue.
    2. Enter PAN. It must match the PAN inside the GSTIN.
    3. Upload at least one compliance certificate (GOTS, OEKO-TEX, FSC, REACH and others) with issue and expiry dates. Expired certificates are refused.
    4. If Admin has switched the registration fee ON, the vendor pays it here (default OFF).
3. **Module 02: Partnership Plan.** Choose Free, Standard or Premium (names and prices still TBD) and accept the agreement. Plans boost ranking; they are not advertising.
4. **Module 03: TrimInsta & Payment.** Optionally choose warehouse hubs for 6-hour delivery. Add bank details, verify with a Rs 1 test deposit, upload a cancelled cheque, then **Submit for review**.
5. **Document review.** The Approver marks each document Approved, On Hold or Rejected (a reason is required). The vendor re-uploads anything on hold or rejected.
6. **Activation.** When every required document is Approved, Admin presses **Activate**. All vendor screens unlock.

**After activation, KYC & Docs** keeps every document with its version history. Certificates expiring within 30 days show a warning. On expiry the badge disappears and sales of products that need that certificate stop until a renewal is approved.

---

## 4. Product listing: add, review, publish

A product goes live only after the Approver publishes it. Edits to price, photos, description or policy need approval again; stock changes do not.

1. **Vendor adds a product** in My Catalog: SKU, HSN, category (only categories the vendor is approved for), title, photos, description, unit, MOQ, pack size, price tiers, shades, technical specs, TDS PDF, stock per location, lead time and TrimInsta option.
2. **Live price preview.** The form shows "Customer sees Rs X (pre-tax)". That is the vendor's base price plus the category commission.
3. **Submit for approval.** The listing waits in the Approver's queue as a New Listing.
4. **Approver checks the publish gate** (all must pass): vendor is active, category is active, commission is set, a valid certificate exists for the category, and the listing is complete.
5. **Approve & Publish** makes it live on the marketplace. **Reject** needs a reason, which the vendor sees on the product.

**Editing a live product**

- Changing price, photos, description, tiers, discount, lead time or TrimInsta creates a *revision*. Buyers keep seeing the live version until the Approver publishes the revision. A rejected revision never replaces the live one.
- Changing only stock saves at once, with no approval.
- A proposed discount also needs Admin approval in Coupons; publishing the listing does not switch it on.

---

## 5. Buyer journey: browse to order

One checkout can include many vendors. The buyer pays once and gets one parent order, split into one sub-order per vendor and delivery route.

1. **Browse.** Anyone can search by name, SKU or HSN, filter by category, certificate, delivery type, MOQ and price. Buying needs a buyer login.
2. **Product page.** Shows photos, price tiers (bigger quantity, lower price), shades, supplier card, certificates, specs and stock. The buyer picks:
    - **Standard delivery:** straight from the vendor's factory, courier chosen by the system.
    - **TrimInsta 6-Hour:** from the nearest hub, only if the address is inside the hub zone (about 6 km) and the hub has stock.
3. **Quantity rules.** At least the MOQ, in steps of the pack size, and not more than stock.
4. **Procurement Order (cart).** Grouped by vendor and route, each with shipping and GST (CGST + SGST in the same state, IGST across states). If a price changed since adding, the buyer must accept the new price; nothing is changed silently.
5. **Checkout steps.** Delivery address, delivery type check, payment (UPI, card, net banking, or COD only up to Rs 50,000). The buyer must tick that orders cannot be cancelled or edited after placing.
6. **Confirmation.** Shows the parent order number (ORD-...) and each vendor sub-order (SO-...).

**Bulk quotes.** Anyone can use **Request a Quote** for custom specs or large volumes. They get a reference number (RFQ-...) and Support finds matching suppliers.

---

## 6. Order fulfilment: accept to delivered

Every hand-over of goods needs a 6-digit OTP, so each step has proof. The normal path is Order Placed, Accepted, Dispatched, In Transit, Out for Delivery, Delivered.

```
Order placed ──> Vendor accepts ──> Dispatched ──> In transit ──> Delivered
(buyer pays)     (within 1 day)     (OTP to        (courier       (OTP from buyer:
                   │    │            courier)        scans)         invoice issued,
                   │    │                              │            return window starts)
          partial  │    │ reject              attempt  │  ▲ address          │ damaged
                   ▼    ▼                     fails    ▼  │ fixed            ▼
          Partial request  Rejected             Delivery failed          Damage claim
          (Admin decides)  (full refund)        (Support, 24 hours)      (inside the window)
                                                        │ not fixed           │ after 2 days
                                                        ▼                     ▼
                                                 Returned (RTO)          Support decides
                                                 (vendor not paid)       (refund or replace)
```

**Standard delivery (vendor ships)**

1. **Vendor decides within 1 business day:**
    - **Accept.** The system sets a dispatch-by date from the lead time and assigns the courier (the vendor cannot choose).
    - **Reject** with a reason. The buyer gets a full refund (status Pending until Finance pays it).
    - **Partial acceptance** with a reason. This is never automatic; it goes to Admin/Support to decide.
2. **Dispatch.** The vendor enters packages and weight, then types the OTP shown in the courier rider's app. The AWB number is filled in automatically.
3. **Courier moves it** through In Transit and Out for Delivery.
4. **Delivery.** The buyer gives their delivery OTP to the courier. Only a matching OTP marks it Delivered.
5. **After delivery:** the vendor's GST invoice is issued and the return window (7 days by default) starts.

**TrimInsta 6-Hour (hub ships)**

1. The hub accepts the order and reserves stock.
2. Warehouse staff pick it by scanning the bin, pack it, and scan the AWB label.
3. They hand it to the delivery partner with an OTP. Hub stock goes down at that moment.
4. Delivery works the same as above, inside 6 hours.

**Exceptions:** Rejected, Partial Review, Delivery Failed, RTO (return to origin) and Disputed show in red on every timeline. Late dispatch and late acceptance are flagged to the vendor and to Admin.

**Buyers can never cancel or edit an order** after placing it. For damaged goods they raise a claim (next section).

---

## 7. Damage claims and returns

Only damaged quantity can be claimed, and only inside the return window after a verified delivery. Extra or unwanted stock cannot be returned.

1. **Buyer raises a claim** from the delivered sub-order: how many units are damaged (up to what was delivered minus earlier claims), the damage type, a description and at least one photo or video.
2. **Remedy per unit.** For each damaged unit the buyer chooses refund or replacement. A claim can mix both.
3. **Vendor has 2 business days** to respond. If the vendor stays silent, the case moves to Support automatically.
4. **Support decides,** and the decision is final:
    - **Approve refund:** the refund goes to Finance with status Pending.
    - **Replacement:** a new linked order is created at no charge and follows the normal fulfilment flow.
    - **Split by unit:** some units refunded, some replaced.
    - **Reject** with a reason shown to the buyer.
    - **Request more evidence:** the buyer uploads more photos and the case returns to Support.
5. **Money effect.** While a claim is open, the vendor's payout for that sub-order is held. Approved refunds are taken off the vendor's payout.

Every claim gets a dispute number (DSP-...) and a support ticket (TKT-...). The buyer follows it in **Cases & Returns**.

---

## 8. Failed delivery (NDR)

When the courier cannot deliver, Support must act within 24 hours. The vendor is not paid until delivery is confirmed.

1. The courier reports a failed attempt (for example: address incomplete, phone unreachable). The sub-order shows **Delivery Failed** and a ticket opens automatically.
2. Support calls the buyer and picks one action:
    - **Confirm address correction:** save the corrected address and phone. The courier re-attempts delivery.
    - **Initiate RTO** (return to origin) with a reason: the goods go back to the vendor. If the buyer paid online, a refund goes to Finance as Pending. For COD orders no refund is due.
3. Who pays for the return trip is still TBD with the client.

---

## 9. Money flow: payments, refunds, vendor payouts

The buyer pays TrimNova once. TrimNova keeps the category commission and pays each vendor manually, only after 6 conditions are met.

**Prices**

- Buyer price before tax = vendor base price + category commission. Commission is set per category only, never per vendor or product.
- GST and shipping are added at checkout. Mock shipping: Rs 180 per vendor shipment (free above Rs 25,000), Rs 350 per TrimInsta shipment.

**Collecting money (Finance)**

1. Online payments (UPI, card, net banking) are captured at checkout.
2. For COD, the courier collects cash and later sends a remittance statement. Finance matches each line by AWB and amount. Only an exact match can be confirmed; anything else gets a query to the courier.

**Refunds (Finance)**

1. Refunds come from vendor rejections, Admin cancellations, damage claims and RTO.
2. Admin approves each refund in Escalations, then Finance executes it.
3. The gateway answers Succeeded, Failed or Unknown. Only **Succeeded** counts as refunded. Failed can be retried; Unknown needs a status check.

**Vendor payouts (Admin)**

A delivered sub-order becomes payable only when all 6 conditions pass:

1. Delivery verified with OTP.
2. Return window has ended.
3. Customer money is in (online captured, or COD remitted).
4. GST invoice exists.
5. No open dispute.
6. Not already paid.

Admin selects eligible sub-orders and generates a settlement batch (one per vendor). After the bank transfer, Admin records amount, transfer date, UTR and admin name. A failed transfer is logged and the batch stays Pending. Vendors see Held, Eligible and Paid balances, with the UTR on paid items.

Vendor payout = base price x quantity, minus approved damage refunds. GST/TCS adjustments and replacement costs are still TBD.

---

## 10. Admin, Finance and Warehouse controls

Admin screens change platform-wide rules. Every change asks for a reason and is written to the audit log.

| Screen | What it is for |
| --- | --- |
| Dashboard | Platform totals and 4 SLA alerts: late acceptance, late dispatch, certificates expiring in 30 days, vendors with no sellable products |
| Escalations | Partial-acceptance decisions, review of vendor rejections, refund approvals, freeze recommendations from Support |
| Margin Manager | Commission % per category, with an effective date. A future date schedules the change |
| Coupons | Approve or pause vendor discounts (vendor pays) and create platform coupons (TrimNova pays) |
| Vendors | Activate new vendors (only when all documents are approved), freeze or reactivate with a reason |
| Settlements | 6-condition check, payout batches, recording transfers with UTR |
| Platform Config | Return window (5, 6 or 7 days), TrimInsta zone radius per hub, registration fee on/off, plan names and prices, notification rules |
| Staff & Roles | Staff list and a permission matrix that controls which screens Finance and Warehouse staff can open |
| Reports | Sales by category, vendor scorecard, disputes and refunds, GST summary |
| Audit Log | Every sensitive action: who, when, old value, new value, reason. It cannot be edited |
| Finance: Payments & COD | Payment list and COD remittance matching |
| Finance: Refunds | Execute approved refunds and record the gateway result |
| Finance: Invoices | Seller invoices per sub-order, monthly commission invoices, hub rent invoices |
| Finance: Reconciliation | Money collected vs money owed per order, and vendor payables |
| Warehouse: Inbound | Approve vendor stock transfers into hubs, then count on arrival and record shortages or damage |
| Warehouse: Inventory & Bins | Hub stock by bin, reserved vs available, low stock, space used and rent |
| Warehouse: TrimInsta Ops | Accept, pick, pack, scan and hand over 6-hour orders against the clock |

**Risk flags.** The system flags a vendor with complaints in more than 10 orders, or a buyer with more than 3 suspicious claims. A flag never bans anyone. Support reviews it and may recommend a freeze; only Admin can freeze.

---

## 11. Key business rules at a glance

These rules are built into the screens. Changing any of them is a business decision, not only a design change.

1. Buyer price = vendor base price + category commission. Commission is per category only and is never shown to buyers.
2. Price, photo, description and policy edits need re-approval. Stock-only edits do not. A rejected edit never replaces the live version.
3. Vendors submit, the Approver publishes, Admin activates. Nobody approves their own work.
4. Admin activates a vendor only when every required document is Approved.
5. One checkout gives one parent order, one sub-order per vendor (and route), and one invoice per vendor after verified delivery.
6. Buyers cannot cancel or edit an order after placing it.
7. Every hand-over uses an OTP: vendor to courier, hub to partner, courier to buyer.
8. Standard delivery couriers are assigned by the system. TrimInsta works only inside a hub zone and only with hub stock.
9. Return window is 7 days by default (Admin can set 5 to 7). Only damaged quantity can be claimed. Each unit is refunded or replaced.
10. Refund statuses Pending, Failed and Unknown are never shown as Succeeded.
11. Vendors are paid only when all 6 payout conditions pass. Admin pays manually and records amount, date, UTR and name. A failed transfer stays Pending.
12. Support is the buyer's only contact. Vendors never talk to buyers directly.
13. Risk flags only flag. Admin freezes after Support review; nothing is banned automatically.
14. Every sensitive action needs a reason and is written to the audit log.

---

## 12. Open items still to decide

These show as "TBD" or as placeholder values in the app. Tick each one when the client decides, and note the answer under it.

- [ ] Partnership plan names and monthly prices (Free / Standard / Premium are placeholders)
- [ ] Registration fee for vendors: on or off (currently off, Rs 5,000 + 18% GST if switched on)
- [ ] Rule for partial acceptance of orders
- [ ] Who pays for return shipping (RTO) and for replacements
- [ ] Refund time promise to buyers
- [ ] Time window for the vendor complaint flag (more than 10 orders in how long?)
- [ ] SMS and WhatsApp providers for notifications
- [ ] TrimInsta hub rent rate (placeholder Rs 450 per cbm per month)
- [ ] Shipping charges and the COD limit (placeholders Rs 180, Rs 350 and Rs 50,000)
- [ ] Onboarding for countries other than India
- [ ] Final brand name: TrimNova or ilabelkart
- [x] Approval of the new layout (applied to all screens on 27 Nov 2026)

---

## 13. How to ask for a change

A clear request names the screen, the role, what happens now and what should happen instead.

**Copy this template**

```
Screen: (for example Vendor > Orders, or Buyer > Checkout)
Role: (Vendor / Buyer / Approver / Support / Admin / Finance / Warehouse)
Now: (what happens today)
Wanted: (what should happen)
Rule affected?: (yes/no - which rule from section 11)
Priority: (High / Medium / Low)
```

**Where each part lives in the code** (folder `I_kart/src`)

| What | File or folder |
| --- | --- |
| Brand name and domain | `config/brand.ts` |
| Colours, sizes, shapes (light and dark) | `index.css` |
| Menu items per role | `config/nav.ts` |
| Status colours and labels | `lib/status-maps.ts` |
| Prices, shipping, COD limit, GST split | `lib/pricing.ts` |
| Categories, commission, GST rates | `data/categories.ts` |
| Sample vendors, buyers, orders | `data/` and `lib/orders.tsx` |
| Payout conditions | `lib/settlements.tsx` |
| Screens for each role | `pages/vendor`, `pages/market`, `pages/account`, `pages/approver`, `pages/support`, `pages/admin`, `pages/finance`, `pages/warehouse` |
| Shared parts (cards, tables, pills, top bar) | `components/` |

After any change, run `npm run build` to check it still compiles, then test the screen in the browser.
