# DAR AL SHAMS ERP — V2 staged upgrade plan

> V2 upgrade branch. Preserve the existing portal UI, Firebase data model compatibility, and all invoice/quotation PDF rendering, calculations, signatures, seals, and logos. Do not deploy or change Firebase rules without explicit owner approval.

## Stage 1 — Safety and backup
- [ ] Verify current Firebase rules and test export permissions for approved administrators.
- [ ] Design admin-only JSON backup with timestamp, schema version, and integrity manifest.
- [ ] Keep restore disabled until dry-run validation, explicit confirmation, and rollback testing exist.
- [ ] Never put credentials, service-account keys, or live financial data in this repository.

## Stage 2 — Mobile experience
- [ ] Audit sidebar, financial tables, service catalog, and invoice studio at iPhone widths.
- [ ] Fix overflow and tap-target sizing without changing printed invoice/quotation styles.
- [ ] Add mobile regression screenshots.

## Stage 3 — Dates, search and filters
- [x] Add a shared date utility and DD/MM/YYYY table display.
- [x] Display dates in client, invoice, company/staff works, client dossier, staff, purchases, expenses, payment logs and accounts ledger.
- [x] Store createdDate, transactionDate, updatedAt and updatedBy on new/edited records where supported; preserve original creation dates.
- [x] Add quick date presets and multi-field sorting to the invoice register.
- [x] Add date-range filters to invoice, purchase and staff registers.
- [x] Extend date filters to client, works, expense and ledger tables.
- [x] Add period-grouped financial CSV exports without mutating source records.
- [ ] Test missing fields and business/staff categorization.

## Stage 4 — Financial insights and payments
- [x] Read-only dashboard totals: income, expenses, outstanding, and business/staff breakdown.
- [x] Define paid/partial balance calculations as read-only derived values; do not rewrite historical amounts.
- [ ] Confirm payment logs, advance amounts, and currency calculations against existing ledger.

## Stage 5 — Workflow and audit
- [x] Duplicate invoice into a new unsaved draft, never overwrite an original.
- [x] Add per-document created/updated/payment activity history display using existing metadata.
- [x] Add accessible labels and responsive filter/report controls; existing admin notifications retained.

## Required release gates
- [ ] Browser, Firebase emulator, CodeQL, and PDF smoke tests pass.
- [ ] Pixel-compare representative original invoice and quotation PDFs.
- [ ] Manual iPhone Safari checks and Firebase permissions checks pass.
- [ ] Admin approves any new Firebase rules separately.
- [ ] Owner explicitly authorizes merge and deployment.


## V2 implementation notes
- Current work is isolated on `feature/dar-portal-v2-dates` for review; it is not deployed.
- Legacy records are not bulk-migrated. Missing historical dates remain blank/unknown rather than being guessed.
- Existing `createdDate` is retained on edits; the invoice studio date is stored as `transactionDate`.
- `updatedBy` uses the signed-in user's email or UID; no new Firebase rules are required for this additive metadata.


## Latest invoice release candidate
- [x] Compact A4 gold frame (6mm × 7mm inner padding), 9px item table and tighter row spacing.
- [x] Boxed subtotal row and Advance Payment summary row; invoice print surface does not include Notes, Taxable Amount, Payment Status or Balance Due.
- [x] Discounts entered as a percentage for new/edited records; legacy fixed-value discounts remain readable and preserved.
- [x] Three approved terms are wrapped in a compact half-width gold-bordered box.
- [x] Invoice references use sequential DAS-YYYY-0001 numbering; quotations use QTN-YYYY-0001 numbering.
- [x] Invoice duplicate action opens an unsaved copy with no copied payments or original reference.
- [x] Record history shows creation, update and payment metadata in the portal, not on the printed customer invoice.
- [x] Daily/monthly/yearly financial CSV report export added.
- [ ] Manual PDF visual comparison and mobile Safari verification remain release gates.
