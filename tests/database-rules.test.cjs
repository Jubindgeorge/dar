const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('node:fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let env;
const adminUid = 'DOoTyjTlQQWpW5Q4p6bZfgcyDYr2';
const secondAdminUid = '6J0fXWZkvpgIfw9lj4KH1D5Bh4u2';
const userUid = 'approved-test-user';
const pendingUid = 'pending-test-user';
const auth = (uid, verified = true) => env.authenticatedContext(uid, {email: uid + '@example.com', email_verified: verified}).database();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'dar-rules-ci-test',
    database: {rules: readFileSync('firebase-database.rules.json', 'utf8')}
  });
  await env.withSecurityRulesDisabled(async context => {
    await context.database().ref('clients/example').set({name: 'Sample'});
    await context.database().ref('approvals/' + userUid).set(true);
  });
});
after(async () => { if (env) await env.cleanup(); });

test('anonymous access denied', async () => {
  await assertFails(env.unauthenticatedContext().database().ref('clients').once('value'));
  await assertFails(env.unauthenticatedContext().database().ref('clients/example').set({name:'bad'}));
});
test('both verified admins may read and write', async () => {
  for (const uid of [adminUid, secondAdminUid]) {
    await assertSucceeds(auth(uid).ref('clients/example').once('value'));
    await assertSucceeds(auth(uid).ref('clients/test-' + uid).set({name:'Allowed'}));
  }
});
test('unverified admins denied', async () => {
  await assertFails(auth(adminUid, false).ref('clients').once('value'));
});
test('verified approved user allowed, pending denied', async () => {
  await assertSucceeds(auth(userUid).ref('documents').once('value'));
  await assertSucceeds(auth(userUid).ref('services/allowed').set({name:'ok'}));
  await assertFails(auth(pendingUid).ref('clients').once('value'));
  await assertFails(auth(pendingUid).ref('clients/blocked').set({name:'no'}));
});
test('approved but unverified user denied', async () => {
  await assertFails(auth(userUid, false).ref('documents').once('value'));
});
test('new staff, company-client and purchase collections retain the existing access gate', async () => {
  for (const collection of ['staff','companyClients','suppliers','purchases']) {
    await assertSucceeds(auth(adminUid).ref(collection + '/allowed').set({sample:true}));
    await assertSucceeds(auth(userUid).ref(collection + '/approved').once('value'));
    await assertFails(auth(pendingUid).ref(collection).once('value'));
    await assertFails(env.unauthenticatedContext().database().ref(collection).once('value'));
  }
});

test('users cannot approve themselves', async () => {
  await assertFails(auth(pendingUid).ref('approvals/' + pendingUid).set(true));
  await assertSucceeds(auth(adminUid).ref('approvals/' + pendingUid).set(true));
});
test('signup request owner can submit once only', async () => {
  const ctx = env.authenticatedContext('new-user', {email:'new@example.com', email_verified:false}).database();
  await assertSucceeds(ctx.ref('signupRequests/new-user').set({email:'new@example.com',createdAt:Date.now()}));
  await assertFails(ctx.ref('signupRequests/new-user').set({email:'new@example.com',createdAt:Date.now()}));
  await assertFails(ctx.ref('signupRequests/other-user').set({email:'new@example.com',createdAt:Date.now()}));
});
test('recovery and audit enforce valid writes', async () => {
  const db = auth(adminUid);
  await assertSucceeds(db.ref('deletedRecords/sample').set({
    collection:'clients',recordKey:'example',value:{name:'Sample'},deletedBy:adminUid,deletedAt:Date.now()
  }));
  await assertFails(db.ref('deletedRecords/sample').update({recordKey:'changed'}));
  await assertFails(db.ref('deletedRecords/invalid').set({
    collection:'approvals',recordKey:'x',value:true,deletedBy:adminUid,deletedAt:Date.now()
  }));
  await assertSucceeds(db.ref('activityLog/log1').set({
    action:'delete',collection:'clients',recordKey:'example',actorUid:adminUid,at:Date.now()
  }));
  await assertFails(db.ref('activityLog/log1').remove());
  await assertFails(db.ref('activityLog/log2').set({
    action:'delete',collection:'clients',recordKey:'example',actorUid:pendingUid,at:Date.now()
  }));
});

test('expiry notification events are read-only for verified approved users', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await context.database().ref('expiryNotificationEvents/sample/2027-03-31').set({type:'Reminder'});
    await context.database().ref('expiryReminderDeliveries/sample/2027-03-31/admin').set({status:'sent'});
  });
  for (const uid of [adminUid,secondAdminUid,userUid]) {
    const db=auth(uid);
    await assertSucceeds(db.ref('expiryNotificationEvents/sample').once('value'));
    await assertFails(db.ref('expiryNotificationEvents/sample/2027-03-31').set({type:'tampered'}));
    await assertFails(db.ref('expiryReminderDeliveries/sample').once('value'));
    await assertFails(db.ref('expiryReminderDeliveries/sample').set({status:'tampered'}));
  }
  for (const db of [auth('unapproved-notification-test-user'),auth(userUid,false),env.unauthenticatedContext().database()]) {
    await assertFails(db.ref('expiryNotificationEvents').once('value'));
    await assertFails(db.ref('expiryNotificationEvents/sample').set({type:'bad'}));
  }
});
