const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/index.html',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const storage={clients:{'test-client':{name:'Test Client'}},documents:{'test-doc':{total:250}},services:{'test-service':{name:'Repair'}},monthlyExpenses:{'test-expense':{amount:20}},deletedRecords:{},activityLog:{}};
   let counter=0, exported=null;const messages=[];
   const original={db:window.db,alert:window.alert,download:window.darDownloadJSON,firebase:window.firebase};
   window.alert=m=>messages.push(m);
   window.darDownloadJSON=(name,payload)=>{exported={name,payload}};
   const read=path=>path.split('/').reduce((obj,k)=>obj?.[k],storage);
   const put=(path,value)=>{const keys=path.split('/');let obj=storage;for(let i=0;i<keys.length-1;i++)obj=obj[keys[i]]??={};if(value===null)delete obj[keys.at(-1)];else obj[keys.at(-1)]=JSON.parse(JSON.stringify(value))};
   window.db={ref:(path='')=>({once:async()=>({val:()=>read(path),exists:()=>read(path)!==undefined}),push:()=>({key:'test-key-'+(++counter)}),update:async updates=>Object.entries(updates).forEach(([p,v])=>put(p,v)),limitToLast:()=>({once:async()=>({val:()=>read(path)})})})};
   window.firebase.database.ServerValue.TIMESTAMP=1728892800000;
   try {
    await window.exportDarBackup();
    const before=JSON.stringify(storage.documents['test-doc']);
    await window.safeDeleteDarRecord('documents','test-doc');
    const deleted=storage.documents['test-doc']===undefined;
    const trashIds=Object.keys(storage.deletedRecords);
    const auditedDelete=Object.values(storage.activityLog).some(x=>x.action==='delete');
    await window.restoreDarRecord(trashIds[0]);
    return {exported:!!exported,format:exported?.payload.format,collections:Object.keys(exported?.payload.data||{}).sort(),deleted,trashCount:trashIds.length,auditedDelete,restored:JSON.stringify(storage.documents['test-doc'])===before,trashEmpty:Object.keys(storage.deletedRecords).length===0,auditedRestore:Object.values(storage.activityLog).some(x=>x.action==='restore'),messages};
   } finally {window.db=original.db;window.alert=original.alert;window.darDownloadJSON=original.download;window.firebase=original.firebase}
  });
  assert.equal(result.exported,true);
  assert.equal(result.format,'dar-al-shams-backup-v1');
  assert.deepEqual(result.collections,['clients','documents','monthlyExpenses','services']);
  for(const k of ['deleted','auditedDelete','restored','trashEmpty','auditedRestore'])assert.equal(result[k],true,k);
  console.log('PASS: backup export, atomic soft-delete, audit, restore (isolated browser database mock)');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
