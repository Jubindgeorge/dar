// Read-only V2 source checks. Run with: node tests/v2-readonly-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('styles.css', 'utf8');
const dates = fs.readFileSync('date-utils.js', 'utf8');
const ledger = fs.readFileSync('ledger.js', 'utf8');
const staff = fs.readFileSync('staff.js', 'utf8');
const studio = fs.readFileSync('studio.js', 'utf8');
const purchases = fs.readFileSync('purchase.js', 'utf8');
for (const id of ['doc-date-from','doc-date-to','dash-v2-received','dash-v2-outstanding','dash-v2-unassigned']) {
  assert.match(html, new RegExp('id="' + id + '"'), 'missing UI element: ' + id);
}
assert.match(app, /const matchesDate =/);
assert.match(app, /matchesText && matchesBranch && matchesDate/);
assert.match(app, /window\.getDarV2FinancialOverview = function/);
assert.match(app, /set\('dash-v2-outstanding', currency\(v2\.outstanding\)\)/);
assert.match(styles, /\.v2-filter-date/);
assert.match(html, /date-utils\.js/, 'shared date helper is loaded');
assert.match(html, /Registered Date/, 'client register displays registration date');
assert.match(html, /Latest Work Date/, 'company works directory displays latest work date');
assert.match(html, /Joining Date/, 'staff register displays joining date');
assert.match(html, /Expense Date/, 'expense entry captures transaction date');
assert.match(app, /applyDarDocumentDatePreset/, 'invoice register has quick date presets');
assert.match(app, /amount-desc/, 'invoice register supports amount sorting');
assert.match(dates, /updatedAt/, 'shared audit metadata includes update timestamp');
assert.match(staff, /staff-date-from/, 'staff register supports date filtering');
assert.match(purchases, /purchase-date-from/, 'purchase register supports date filtering');
assert.match(ledger, /transactionDate: date/, 'payment records store transaction date');
console.log('V2 date and audit source checks passed');

assert.match(html, /client-date-from/, 'client date filters');
assert.match(html, /works-date-from/, 'works date filters');
assert.match(html, /expense-date-from/, 'expense date filters');
assert.match(html, /ledger-date-from/, 'ledger date filters');
assert.match(html, /id="p-terms-section"/, 'invoice printout retains the optional terms section');
assert.match(html, /width:50%;max-width:50%/, 'terms section is limited to the left half of the page');
assert.match(html, /p-notes-section[^>]*border:0/, 'notes section has no surrounding border');
assert.match(html, /width:100%;border-collapse:collapse;border-spacing:0;font-size:10px/, 'invoice item table uses the totals summary font size');
assert.match(styles, /#a4-wrapper-element::before\s*\{[\s\S]*?inset:\s*1px;[\s\S]*?border:\s*1px solid #b8860b;/, 'gold page frame is fixed 1px and inset 1px from every paper edge');
assert.match(styles, /@page\s*\{\s*size:A4 portrait;\s*margin:0;\s*\}/, 'print page uses the physical A4 sheet as its coordinate space');
assert.match(styles, /#document-preview-modal::after\s*\{[\s\S]*?position:fixed !important;[\s\S]*?inset:1mm !important;[\s\S]*?border:1px solid #b8860b !important;/, 'print border is fixed to all four physical paper edges on every page');
assert.match(app, /const drawFixedGoldFrame = \(\) => \{[\s\S]*?pdf\.rect\(1, 1, 208, 295\);[\s\S]*?drawFixedGoldFrame\(\);[\s\S]*?drawFixedGoldFrame\(\);/, 'Save PDF draws the same fixed gold frame on every page');

assert.match(styles, /#a4-wrapper-element #p-content-container table,\s*#a4-wrapper-element #p-content-container table th,\s*#a4-wrapper-element #p-content-container table td\s*\{\s*font-size:\s*10px !important;/, 'all invoice table text uses the same 10px size');

assert.match(html, /st-legacy-discount-amt/, 'legacy discount compatibility');
assert.match(app, /exportDarFinancialReport/, 'period report export');
assert.match(app, /duplicateInvoiceDraft/, 'duplicate invoice draft');
assert.match(app, /viewDocumentHistory/, 'document audit history');

assert.match(app, /exportDarFinancialReportPDF/, 'financial report PDF export');
assert.match(app, /buildDarFinancialReportRows/, 'shared daily/monthly/yearly report data');
assert.match(html, /xlsx\.full\.min\.js/, 'XLSX export library loaded');

assert.match(app, /getDarDocumentPaymentStatus/, 'read-only payment status rules');
assert.match(app, /paymentDueDate/, 'overdue requires an explicit due date');
assert.match(html, /dash-v2-payment-status/, 'dashboard displays derived payment status counts');

assert.match(html, /expense-search/, 'expense register supports text search');
assert.match(html, /ledger-search/, 'financial ledger supports text search');
assert.match(app, /window\.duplicateInvoiceDraft\s*=\s*function/, 'duplicate draft action is implemented');
assert.match(app, /window\.viewDocumentHistory\s*=\s*function/, 'document history action is implemented');
assert.match(app, /No additional payment entries recorded/, 'history view handles documents without payments');

assert.match(html, /id="tab-quotations"/, 'quotations have a separate workspace');
assert.match(html, /id="quotation-conversion-modal"/, 'quotation conversion dialog exists');
assert.match(app, /window\.renderQuotationTable\s*=\s*function/, 'quotation register has its own renderer');
assert.match(app, /root\.transaction\(/, 'quotation conversion updates balances atomically');
assert.match(app, /invoicedStageIndexes/, 'stage invoices cannot duplicate already invoiced items');
assert.match(app, /sourceQuotationRef/, 'progress invoices link back to the source quotation');
assert.match(studio, /dar-edit-popup/, 'existing document editing opens as a popup');
assert.match(studio, /Billed stages are locked/, 'stage-linked quotation rows are protected');
assert.match(styles, /@media print/, 'invoice and quotation previews have an A4 print layout');
assert.match(app, /Adv\. Amount/, 'PDF summary displays advance amount');
assert.match(app, /Dis\. %/, 'PDF summary displays discount percentage');


// Executive dashboard checks: additive UI, read-only state calculations, navigation, and mobile layout.
const dashboard = fs.readFileSync('dashboard.js', 'utf8');
const stateSource = fs.readFileSync('state.js', 'utf8');
for (const id of [
  'dash-exec-search','dash-exec-search-results','dash-exec-invoiced','dash-exec-received',
  'dash-exec-outstanding','dash-exec-unpaid','dash-exec-partial','dash-exec-paid',
  'dash-exec-overdue','dash-exec-work-pending','dash-exec-work-progress',
  'dash-exec-work-completed','dash-exec-work-closed','dash-exec-completed-balance',
  'dash-exec-age-30','dash-exec-age-60','dash-exec-age-90','dash-exec-age-90plus',
  'dash-exec-alert-list','dash-exec-recent'
]) {
  assert.match(html, new RegExp('id="' + id + '"'), 'executive dashboard missing: ' + id);
}
assert.match(html, /dashboard\.js/, 'executive dashboard module is loaded');
assert.match(dashboard, /getDarDocumentPaymentStatus/, 'dashboard reuses the shared payment status rules');
assert.match(dashboard, /getDarDocumentPaidAmount/, 'dashboard reuses the shared legacy-safe payment total');
assert.match(dashboard, /norm\(doc\.status\) !== 'draft'/, 'draft invoices are excluded from executive financial totals');
assert.match(dashboard, /tradeLicenseExpiry/, 'dashboard reads company expiry profile fields');
assert.match(dashboard, /otherStaffDocumentExpiry/, 'dashboard reads staff expiry profile fields');
assert.match(dashboard, /window\.viewClientDetail/, 'company search opens company profile');
assert.match(dashboard, /window\.openStaffProfile/, 'staff search opens staff profile');
assert.match(dashboard, /window\.previewInvoiceDocument/, 'invoice search opens the selected invoice preview');
assert.match(dashboard, /window\.openCompanyClientModal/, 'company-client search opens the exact client profile');
assert.ok((stateSource.match(/darRenderExpiryNotifications/g)||[]).length >= 4, 'expiry centre refreshes after company, invoice, staff and company-client Firebase records load');
assert.match(stateSource, /renderDashboardStats\(\)/, 'dashboard refreshes after profile records load');
assert.match(html, /onclick="openStudio\('Invoice'\)"/, 'quick action opens invoice creation');
assert.match(html, /onclick="openStudio\('Quotation'\)"/, 'quick action opens quotation creation');
assert.match(html, /darDashboardOpen\('record-payment'\)/, 'quick action opens the payment entry destination');
assert.match(dashboard, /raw === 'completed'/, 'work completion is based on the manually maintained PRO status');
assert.match(dashboard, /raw === 'closed'/, 'dashboard recognizes explicitly closed work');
assert.match(fs.readFileSync('work-tracking.js', 'utf8'), /'Completed','Closed'/, 'work tracking supports manual closure');
assert.match(styles, /\.dash-quick-grid/, 'executive dashboard quick actions have responsive styling');
assert.match(styles, /@media\(max-width:640px\)/, 'executive dashboard has a mobile layout');
console.log('Executive dashboard source checks passed');
