import test from 'node:test';
import assert from 'node:assert/strict';
import {collectExpiryRecords,dueReminders,daysUntil,reminderKey} from '../scripts/expiry-core.mjs';

test('validates ISO calendar dates and UAE-day reminder windows',()=>{
 assert.equal(daysUntil('2027-01-01','2026-12-31'),1);
 assert.equal(daysUntil('2027-02-30','2027-02-01'),null);
 for(const n of [30,15,7,1])assert.equal(reminderKey(n),'before-'+n);
 assert.equal(reminderKey(-1),'overdue-1');
 assert.equal(reminderKey(-7),'overdue-7');
 assert.equal(reminderKey(-2),null);
});

test('collects company, staff and linked-client expiry records without copying identity numbers',()=>{
 const clients=[{id:'co1',companyName:'Example LLC',email:'office@example.com',whatsapp:'+971500000001',tradeLicenseExpiry:'2027-01-30',otherDocumentName:'Insurance',otherDocumentExpiry:'2027-02-01',whatsappGroupLink:'https://chat.whatsapp.com/abc'}];
 const staff=[{id:'st1',companyId:'co1',fullName:'Employee One',email:'person@example.com',whatsapp:'+971500000002',passportNumber:'P123456',passportExpiry:'2027-01-30',emiratesIdExpiry:'2027-02-02',otherStaffDocumentName:'Certificate',otherStaffDocumentExpiry:'2027-02-03'}];
 const companyClients=[{id:'cl1',companyId:'co1',name:'Client One',email:'client@example.com',whatsapp:'+971500000003',passportNumber:'SENSITIVE-123',passportExpiry:'2027-01-30',emiratesIdExpiry:'2027-02-04',visaExpiry:'2027-02-05'}];
 const rows=collectExpiryRecords({clients,staff,companyClients},'2026-12-31');
 assert.equal(rows.length,8);
 const passport=rows.find(x=>x.ownerType==='staff'&&x.field==='passportExpiry');
 assert.equal(passport.companyEmail,'office@example.com');
 assert.equal(passport.companyWhatsapp,'+971500000001');
 assert.equal(passport.groupLink,'https://chat.whatsapp.com/abc');
 const linked=rows.find(x=>x.ownerType==='client'&&x.field==='passportExpiry');
 assert.equal(linked.ownerName,'Client One');
 assert.equal(linked.companyName,'Example LLC');
 assert.equal(linked.companyEmail,'office@example.com');
 assert.equal(JSON.stringify(linked).includes('SENSITIVE-123'),false);
 assert.equal(rows.find(x=>x.field==='otherDocumentExpiry').documentType,'Insurance');
 assert.equal(rows.find(x=>x.field==='otherStaffDocumentExpiry').documentType,'Certificate');
 const due=dueReminders(rows);
 assert.equal(due.length,5);
 assert.ok(due.every(x=>x.reminder==='before-30'));
});
