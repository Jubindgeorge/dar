// Offline expiry rule tests; no Firebase credentials, network, or outbound sends are used.
const assert=require('node:assert/strict');
(async()=>{
 const {collectExpiryRecords,dueReminders,daysUntil,reminderKey}=await import('../scripts/expiry-core.mjs');
 assert.equal(daysUntil('2027-01-01','2026-12-31'),1);
 assert.equal(daysUntil('2027-02-30','2027-02-01'),null);
 for(const n of [30,15,7,1])assert.equal(reminderKey(n),'before-'+n);
 assert.equal(reminderKey(-1),'overdue-1');assert.equal(reminderKey(-7),'overdue-7');assert.equal(reminderKey(-2),null);
 const clients=[{id:'co1',companyName:'Example LLC',email:'office@example.com',whatsapp:'+971500000001',tradeLicenseExpiry:'2027-01-30',otherDocumentName:'Insurance',otherDocumentExpiry:'2027-02-01',whatsappGroupLink:'https://chat.whatsapp.com/abc'}];
 const staff=[{id:'st1',companyId:'co1',fullName:'Employee One',email:'person@example.com',whatsapp:'+971500000002',passportNumber:'P123456',passportExpiry:'2027-01-30',emiratesIdExpiry:'2027-02-02',otherStaffDocumentName:'Certificate',otherStaffDocumentExpiry:'2027-02-03'}];
 const rows=collectExpiryRecords({clients,staff},'2026-12-31');
 assert.equal(rows.length,5);
 const passport=rows.find(x=>x.field==='passportExpiry');
 assert.equal(passport.companyEmail,'office@example.com');assert.equal(passport.companyWhatsapp,'+971500000001');
 assert.equal(passport.groupLink,'https://chat.whatsapp.com/abc');assert.equal(JSON.stringify(passport).includes('P123456'),false);
 assert.equal(rows.find(x=>x.field==='otherDocumentExpiry').documentType,'Insurance');
 assert.equal(rows.find(x=>x.field==='otherStaffDocumentExpiry').documentType,'Certificate');
 const due=dueReminders(rows);assert.equal(due.length,2);assert.equal(due[0].reminder,'before-30');
 console.log('PASS: expiry dates, 30/15/7/1 and overdue windows, company/staff contacts, and safe metadata');
})().catch(error=>{console.error(error);process.exitCode=1;});
