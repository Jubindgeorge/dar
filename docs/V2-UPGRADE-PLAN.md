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
- [ ] Extend date filters to client, works, expense and ledger tables.
- [ ] Preserve original data ordering and export behavior in every module.
- [ ] Test missing fields and business/staff categorization.

## Stage 4 — Financial insights and payments
- [ ] Read-only dashboard totals: income, expenses, outstanding, and business/staff breakdown.
- [ ] Define and test paid/partial/unpaid/overdue rules; do not rewrite historical amounts.
- [ ] Confirm payment logs, advance amounts, and currency calculations against existing ledger.

## Stage 5 — Workflow and audit
- [ ] Duplicate invoice into a new unsaved draft, never overwrite an original.
- [ ] Review activity history permissions and display.
- [ ] Improve accessible loading states and admin notifications.

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
