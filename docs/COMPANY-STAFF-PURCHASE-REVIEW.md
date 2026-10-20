# Company Staff, Client and Purchase Workflow — Review Notes

This change set is isolated on `feature/company-staff-client-invoice-flow`. It must not be merged or deployed until the repository owner approves it.

## Additive changes
- Added a Company Staff Data page with search, company filtering, visa/passport expiry visibility, renewal status, editable staff profiles, and an invoice link.
- Clicking a company name or its Staff Data action opens staff records filtered to that company. The existing company dossier action remains available.
- Added company-linked clients for invoice/quotation entry. A saved company client fills the existing Client Name field; a new client is saved under `companyClients` with the selected company relationship.
- Added a supplier and purchase register under Purchase. Supplier and purchase data are stored separately from existing invoice/quotation data.
- Added collapsible sidebar groups while retaining existing page targets and quick actions.
- Added browser smoke coverage for the new staff and purchase views.

## Invoice and quotation preservation
- No invoice or quotation preview/PDF template markup, CSS, logo, seal, signature, calculation, reference-generation or print/export function was intentionally changed.
- New fields such as `companyClientId`, `staffId`, and `staffCode` are metadata only and are not added to the printed invoice.
- The existing save, preview/print, create-next and back-to-ledger actions remain in place. Staff-work documents receive an additional **Complete Staff Details** action after save.
- Existing Firebase records are not migrated, deleted or rewritten by these changes.

## Firebase deployment requirement
New data uses the following Realtime Database paths:
- `staff`
- `companyClients`
- `suppliers`
- `purchases`

The rules file includes the same verified-user / approved-user access expression already used for the existing `clients` collection. Review and publish the updated rules in the correct Firebase project before testing the new forms. The branch does not publish Firebase rules or change the live database.

## File uploads
The staff form currently stores a secure document reference/URL only. Actual passport or visa file upload requires a private Firebase Storage bucket, access rules, retention policy and deployment configuration; it is deliberately not simulated by storing sensitive documents in Realtime Database.

## Testing and release gates
- JavaScript syntax parsing passed for `app.js`, `staff.js`, `purchase.js`, `studio.js`, `state.js`, `config.js`, and `tests/browser-smoke.cjs`.
- Browser smoke tests have been extended but have not yet been executed in a live browser environment here.
- Before merge, run the repository's Browser and PDF Smoke Tests workflow and test against a non-production Firebase dataset.
- Compare representative invoice and quotation PDFs against the current main-branch outputs. Do not approve merge unless layout, logo, signature/seal, totals and page breaks remain identical.
- Do not merge or deploy without explicit owner approval.
