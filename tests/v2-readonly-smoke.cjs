// Read-only V2 source checks. Run with: node tests/v2-readonly-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('styles.css', 'utf8');
for (const id of ['doc-date-from','doc-date-to','dash-v2-received','dash-v2-outstanding','dash-v2-unassigned']) {
  assert.match(html, new RegExp('id="' + id + '"'), 'missing UI element: ' + id);
}
assert.match(app, /const matchesDate =/);
assert.match(app, /matchesText && matchesBranch && matchesDate/);
assert.match(app, /window\.getDarV2FinancialOverview = function/);
assert.match(app, /set\('dash-v2-outstanding', currency\(v2\.outstanding\)\)/);
assert.match(styles, /\.v2-filter-date/);
console.log('V2 read-only UI wiring checks passed');
