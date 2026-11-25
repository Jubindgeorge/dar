import {initializeApp,cert,getApps} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {collectExpiryRecords,dueReminders} from './expiry-core.mjs';
const env=process.env;
for(const key of ['FIREBASE_SERVICE_ACCOUNT_JSON','FIREBASE_DATABASE_URL'])if(!env[key])throw new Error('Missing required secret: '+key);
const credentials=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
if(credentials.project_id!=='dar-al-shams')throw new Error('Unexpected Firebase project');
const databaseURL=env.FIREBASE_DATABASE_URL.replace(/\/$/,'');
if(databaseURL!=='https://dar-al-shams-default-rtdb.firebaseio.com')throw new Error('Unexpected Firebase database URL');
if(!getApps().length)initializeApp({credential:cert(credentials),databaseURL});
const db=getDatabase(),dryRun=env.REMINDER_DRY_RUN==='true';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const email=v=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())?v.trim():'';
const phone=v=>{if(typeof v!=='string')return'';const raw=v.replace(/[ ()-]/g,'');const digits=raw.startsWith('+')?raw.slice(1):raw;return digits.length>=8&&digits.length<=15&&digits[0]>='1'&&digits[0]<='9'&&Array.from(digits).every(c=>c>='0'&&c<='9')?digits:'';}
const safe=v=>String(v||'').replace(/[<>\r\n]/g,' ').slice(0,180);
const hash=v=>{let h=2166136261;for(const c of String(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
async function deliver(ref,send){const tx=await ref.transaction(old=>{if(old?.status==='sent')return;if(old?.status==='sending'&&Date.now()-Date.parse(old.startedAt||0)<3600000)return;return{status:'sending',startedAt:new Date().toISOString()};},undefined,false);if(!tx.committed)return'already-sent-or-in-progress';try{const providerId=await send();await ref.update({status:'sent',sentAt:new Date().toISOString(),providerId:providerId||null});return'sent';}catch(e){await ref.update({status:'failed',failedAt:new Date().toISOString(),error:String(e?.message||e).slice(0,220)});throw e;}}
async function sendEmail(to,subject,text){
 if(env.GMAIL_USER&&env.GMAIL_APP_PASSWORD){
  const nodemailer=await import('nodemailer');
  const transporter=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:env.GMAIL_USER,pass:env.GMAIL_APP_PASSWORD.replaceAll(' ','')}});
  const info=await transporter.sendMail({from:env.REMINDER_FROM_EMAIL||env.GMAIL_USER,to,subject,text});
  return info.messageId||'';
 }
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.REMINDER_FROM_EMAIL,to:[to],subject,text})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error('Resend HTTP '+response.status+': '+(data.message||'email failed'));
 return data.id||'';
}
async function sendWhatsApp(to,params){const version=env.WHATSAPP_GRAPH_API_VERSION||'v23.0';const res=await fetch('https://graph.facebook.com/'+version+'/'+env.WHATSAPP_PHONE_NUMBER_ID+'/messages',{method:'POST',headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to,type:'template',template:{name:env.WHATSAPP_TEMPLATE_NAME,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE||'en'},components:[{type:'body',parameters:params.map(t=>({type:'text',text:safe(t)}))}]}})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error('WhatsApp Cloud API HTTP '+res.status+': '+(data.error?.message||'send failed'));return data.messages?.[0]?.id||'';}
const snapshot=await db.ref().get(),root=snapshot.val()||{};
const records=dueReminders(collectExpiryRecords({clients:Object.entries(root.clients||{}).map(([id,v])=>({id,...v})),staff:Object.entries(root.staff||{}).map(([id,v])=>({id,...v}))},today));
let sent=0,failed=0,skipped=0;
for(const r of records){
 const timing=r.daysUntilExpiry<0?'Expired '+Math.abs(r.daysUntilExpiry)+' day(s) ago':r.daysUntilExpiry===0?'Expires today':'Expires in '+r.daysUntilExpiry+' day(s)';
 const who=r.ownerType==='staff'?r.ownerName+' · '+r.companyName:r.companyName;
 const subject='DAR AL SHAMS · '+r.documentType+' expiry · '+r.ownerName;
 const body=['DAR AL SHAMS DOCUMENT EXPIRY REMINDER','Company / Staff: '+who,'Document: '+r.documentType,'Expiry date: '+r.expiryDate,timing,'Please arrange renewal before service interruption.'].join('\n');
 const targets=[];
 if(r.ownerType==='company'){if(email(r.email))targets.push({channel:'email',role:'company',to:email(r.email)});if(phone(r.whatsapp))targets.push({channel:'whatsapp',role:'company',to:phone(r.whatsapp)});}
 else {if(email(r.email))targets.push({channel:'email',role:'staff',to:email(r.email)});if(email(r.companyEmail)&&email(r.companyEmail)!==email(r.email))targets.push({channel:'email',role:'company-copy',to:email(r.companyEmail)});if(phone(r.whatsapp))targets.push({channel:'whatsapp',role:'staff',to:phone(r.whatsapp)});if(phone(r.companyWhatsapp)&&phone(r.companyWhatsapp)!==phone(r.whatsapp))targets.push({channel:'whatsapp',role:'company-copy',to:phone(r.companyWhatsapp)});}
 const channelStatus={};
 for(const t of targets){
  const configured=t.channel==='email'?Boolean((env.GMAIL_USER&&env.GMAIL_APP_PASSWORD)||(env.RESEND_API_KEY&&env.REMINDER_FROM_EMAIL)):Boolean(env.WHATSAPP_ACCESS_TOKEN&&env.WHATSAPP_PHONE_NUMBER_ID&&env.WHATSAPP_TEMPLATE_NAME);
  if(!configured){channelStatus[t.channel+'_'+t.role]='not-configured';skipped++;continue;}
  const path=['expiryReminderDeliveries',r.ownerType,r.ownerId,r.field,r.expiryDate,r.reminder,t.channel,t.role+'_'+hash(t.to)].join('/');
  try{const status=await deliver(db.ref(path),()=>t.channel==='email'?sendEmail(t.to,subject,body):sendWhatsApp(t.to,[r.ownerName,r.companyName||r.ownerName,r.documentType,r.expiryDate,String(r.daysUntilExpiry)]));channelStatus[t.channel+'_'+t.role]=status;if(status==='sent')sent++;else skipped++;}
  catch(e){channelStatus[t.channel+'_'+t.role]='failed';failed++;console.error('Delivery failed',r.ownerType,r.ownerId,t.channel,e.message);}
 }
 if(!targets.length){channelStatus.no_recipient='missing-contact-details';skipped++;}
 const event={ownerType:r.ownerType,ownerName:safe(r.ownerName),companyName:safe(r.companyName),documentType:safe(r.documentType),expiryDate:r.expiryDate,daysUntilExpiry:r.daysUntilExpiry,reminder:r.reminder,channels:channelStatus,status:Object.values(channelStatus).includes('failed')?'failed':Object.values(channelStatus).includes('sent')?'sent':'needs-configuration',checkedAt:new Date().toISOString()};
 if(!dryRun)await db.ref(['expiryNotificationEvents',r.ownerType,r.ownerId,r.field,r.expiryDate,r.reminder].join('/')).set(event);
 else console.log('DRY RUN',JSON.stringify(event));
}
console.log(JSON.stringify({dateUae:today,dueRecords:records.length,sent,failed,skipped,dryRun}));
if(failed)process.exitCode=1;
