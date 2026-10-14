# DAR AL SHAMS ERP — V2 staged upgrade plan

> DRAFT ONLY. Never merge or deploy without explicit owner approval. Do not change invoice/quotation PDF rendering, calculations, signatures, seals, logo, or existing Firebase records.

## Stage 1 — Safety and backup
- [ ] Verify current Firebase rules and test export permissions for approved administrators.
- [ ] Design admin-only JSON backup with timestamp, schema version, and integrity manifest.
- [ ] Keep restore disabled until dry-run validation, explicit confirmation, and rollback testing exist.
- [ ] Never put credentials, service-account keys, or live financial data in this repository.

## Stage 2 — Mobile experience
- [ ] Audit sidebar, financial tables, service catalog, and invoice studio at iPhone widths.
- [ ] Fix overflow and tap-target sizing without changing printed invoice/quotation styles.
- [ ] Add mobile regression screenshots.

## Stage 3 — Search and filters
- [ ] Add non-destructive client/date/reference/amount filters over existing loaded records.
- [ ] Preserve original data ordering and export behavior.
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
