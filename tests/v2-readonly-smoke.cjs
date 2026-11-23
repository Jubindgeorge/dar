// Read-only V2 source checks. Run with: node tests/v2-readonly-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('styles.css', 'utf8');
const dates = fs.readFileSync('date-utils.js', 'utf8');
const ledger = fs.readFileSync('ledger.js', 'utf8');
const staff = fs.readFileSync('staff.js', 'utf8');
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
assert.doesNotMatch(html, /section-terms/, 'invoice printout excludes the removed terms box');
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
