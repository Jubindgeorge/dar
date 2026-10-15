// Offline, no-network expiry scheduler checks. Never reads GitHub secrets or Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('scripts/expiry-reminders.mjs', 'utf8');
const start = source.indexOf('const utcDate = ');
const end = source.indexOf('const email=', start);
assert.ok(start >= 0 && end > start, 'Scheduler helper definitions found');
const context = vm.createContext({});
const helpers = source.slice(start, end) + '\n({utcDate,minusMonth,amount,paid})';
const {utcDate,minusMonth,amount,paid} = vm.runInContext(helpers, context);
assert.equal(minusMonth('2027-03-31'), '2027-02-28');
assert.equal(minusMonth('2028-03-31'), '2028-02-29');
assert.equal(utcDate('2027-02-30'), null);
assert.equal(amount({totalAmount:200}), 200);
assert.equal(paid({advanceAmount:50,paymentLogs:[{amount:150}]}),150);\nassert.equal(paid({advanceAmount:50,advanceIncludedInPaymentLogs:false,paymentLogs:[{amount:150}]}),200);\nassert.equal(paid({advanceAmount:100,paymentLogs:[{amount:100}]}),100);
assert.equal(paid({advanceAmount:50,advanceIncludedInPaymentLogs:true,paymentLogs:[{amount:200}]}),200);
assert.ok(paid({advanceAmount:50,paymentLogs:[{amount:100}]})<200);
console.log('PASS: offline expiry date and payment eligibility checks; no Firebase access, no email sends');
