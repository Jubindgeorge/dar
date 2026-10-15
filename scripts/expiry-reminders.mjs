// Scheduled expiry reminders. Server-side only; never import this into GitHub Pages.
// Requires FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_DATABASE_URL, RESEND_API_KEY,
// REMINDER_FROM_EMAIL and ADMIN_REMINDER_EMAIL as GitHub Actions secrets.
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const required = ['FIREBASE_SERVICE_ACCOUNT_JSON','FIREBASE_DATABASE_URL','RESEND_API_KEY','REMINDER_FROM_EMAIL','ADMIN_REMINDER_EMAIL'];
for (const name of required) if (!process.env[name]) throw new Error('Missing required secret: '+name);
const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (credentials.project_id !== 'dar-al-shams') throw new Error('Unexpected Firebase project');
const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (databaseURL.replace(/\/$/, '') !== 'https://dar-al-shams-default-rtdb.firebaseio.com') throw new Error('Unexpected database URL');
initializeApp({credential:cert(credentials),databaseURL});
const db=getDatabase();
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const utcDate = iso => { if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return null;const d=new Date(iso+'T00:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===iso?d:null; };
const minusMonth = iso => {
 const d=utcDate(iso);if(!d)return null;
 const year=d.getUTCFullYear(),month=d.getUTCMonth(),day=d.getUTCDate();
 const base=new Date(Date.UTC(year,month-1,1));
 const last=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();
 base.setUTCDate(Math.min(day,last));return base.toISOString().slice(0,10);
};
const amount=d=>{for(const n of [d.totalAmount,d.totalAmt,d.total,d.amount]){if(n===null||n===undefined||n==='')continue;const v=Number(String(n).replace(/,/g,''));if(Number.isFinite(v))return v;}return 0;};
// Legacy invoices may contain the same advance both in advanceAmount and paymentLogs.\n// Without an explicit marker, treat the higher of the two as confirmed (never sum ambiguously).\nconst paid=d=>{
 const logs=Array.isArray(d.paymentLogs)?d.paymentLogs:Object.values(d.paymentLogs||{});
 const advance=Number(d.advanceAmount??d.advanceAmt??0)||0;
 const logged=logs.reduce((sum,p)=>sum+(Number(p?.amount)||0),0);
 return Math.max(0,d.advanceIncludedInPaymentLogs===true?logged:d.advanceIncludedInPaymentLogs===false?advance+logged:Math.max(advance,logged));
};
const email=v=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?v.trim():null;
const company=d=>d.companyName&&!['direct clients','direct client','private','without company'].includes(String(d.companyName).toLowerCase().trim());
async function send(to,subject,body){
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.REMINDER_FROM_EMAIL,to:[to],subject,text:body})});
 if(!res.ok)throw new Error('Resend returned HTTP '+res.status);
}
async function once(ref,to,subject,body){
 const claim=await ref.transaction(current=>{
  if(current?.status==='sent')return;
  if(current?.status==='sending' && Date.now()-Date.parse(current.startedAt||0)<3600000)return;
  return {status:'sending',startedAt:new Date().toISOString(),to};
 },undefined,false);
 if(!claim.committed)return false;
 try{await send(to,subject,body);await ref.update({status:'sent',sentAt:new Date().toISOString()});return true;}
 catch(e){await ref.update({status:'failed',error:String(e.message).slice(0,200),failedAt:new Date().toISOString()});throw e;}
}
const snapshot=await db.ref('documents').get();
let processed=0,failed=0;
for(const [id,d] of Object.entries(snapshot.val()||{})){
 if(!d||!/invoice/i.test(String(d.type||''))||!/^[A-Za-z0-9_-]{1,80}$/.test(id))continue;
 // Only explicitly archived, fully paid invoices are eligible. Legacy visa expiry alone is insufficient.
 const expiry=d.archiveExpiryDate;
 if(!utcDate(expiry)||!(amount(d)>0&&paid(d)>=amount(d)-0.005))continue;
 const reminderDate=minusMonth(expiry);
 if(today<reminderDate||today>expiry)continue;
 const title=String(d.packageName||d.title||'Package').slice(0,150);
 const subject='DAR AL SHAMS · Expiry reminder · '+id;
 const body='Package: '+title+'\nInvoice: '+id+'\nExpiry: '+expiry+'\nPlease review the renewal requirements.';
 const base=db.ref('expiryReminderDeliveries/'+id+'/'+expiry);
 // Never guess recipient emails from unrelated fields. A missing address is reported to admin.
 const recipients=[['admin',email(process.env.ADMIN_REMINDER_EMAIL)],['recipient',email(company(d)?d.companyEmail:d.clientEmail)]];
 for(const [role,to] of recipients){
  if(!to){if(role==='recipient')await db.ref('expiryNotificationEvents/'+id+'/'+expiry).update({type:'Email Missing',packageName:title,invoiceRef:id,expiryDate:expiry,createdAt:new Date().toISOString()});continue;}
  try{if(await once(base.child(role),to,subject,body))processed++;}
  catch(e){failed++;console.error('Reminder failed',id,role,e.message);}
 }
 await db.ref('expiryNotificationEvents/'+id+'/'+expiry).update({packageName:title,invoiceRef:id,expiryDate:expiry,reminderDate,updatedAt:new Date().toISOString()});
}
console.log('UAE date:',today,'emails sent:',processed,'failures:',failed);
if(failed)process.exitCode=1;
