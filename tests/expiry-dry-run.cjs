// Offline rule and safety checks. No Firebase credentials, network, or outbound sends.
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {collectExpiryRecords,dueReminders,daysUntil,reminderKey}=await import('../scripts/expiry-core.mjs');
 assert.equal(daysUntil('2027-01-01','2026-12-31'),1);
 assert.equal(daysUntil('2027-02-30','2027-02-01'),null);
 for(const n of [30,15,7,1])assert.equal(reminderKey(n),'before-'+n);
 assert.equal(reminderKey(-1),'overdue-1');
 assert.equal(reminderKey(-7),'overdue-7');
 assert.equal(reminderKey(-2),null);
 const records=collectExpiryRecords({clients:[{id:'co',companyName:'Co',tradeLicenseExpiry:'2027-01-30'}],staff:[],companyClients:[]},'2026-12-31');
 assert.equal(dueReminders(records).length,1);
 const scheduler=fs.readFileSync('scripts/expiry-reminders.mjs','utf8');
 const guard=scheduler.indexOf("if(dryRun){");
 const send=scheduler.indexOf("await deliver(",guard);
 assert.ok(guard>=0&&send>guard,'Dry-run guard must be evaluated before any provider delivery');
 assert.match(scheduler.slice(guard,send),/continue;/,'Dry-run skips delivery transactions and provider calls');
 assert.match(scheduler,/if\(!dryRun\)await db\.ref\(\['expiryNotificationEvents'/,'Dry-run must skip Firebase event writes');
 console.log('PASS: offline expiry schedule, linked-client rules, and dry-run no-send/no-write guard');
})().catch(error=>{console.error(error);process.exitCode=1;});
