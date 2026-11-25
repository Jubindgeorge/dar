export const REMINDER_OFFSETS=[30,15,7,1];
export const COMPANY_EXPIRY_FIELDS=[['tradeLicenseExpiry','Trade Licence'],['establishmentCardExpiry','Establishment Card'],['immigrationLabourCardExpiry','Immigration / Labour Card'],['tenancyContractExpiry','Tenancy Contract'],['otherDocumentExpiry','Other Company Document']];
export const STAFF_EXPIRY_FIELDS=[['passportExpiry','Passport'],['labourCardExpiry','Labour Card'],['visaExpiry','Visa'],['emiratesIdExpiry','Emirates ID']];
export function parseISODate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const d=new Date(value+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value?d:null;}
export function daysUntil(expiry,today){const a=parseISODate(expiry),b=parseISODate(today);return a&&b?Math.round((a-b)/86400000):null;}
export function reminderKey(days){if(REMINDER_OFFSETS.includes(days))return 'before-'+days;if(days<0&&(days===-1||Math.abs(days)%7===0))return 'overdue-'+Math.abs(days);return null;}
export function collectExpiryRecords({clients=[],staff=[]},today){
 const result=[];
 for(const c of clients){if(!c?.companyName)continue;for(const [field,label] of COMPANY_EXPIRY_FIELDS){const expiry=c[field],days=daysUntil(expiry,today);if(days===null)continue;result.push({ownerType:'company',ownerId:String(c.id||''),ownerName:String(c.companyName),companyId:String(c.id||''),companyName:String(c.companyName),field,documentType:field==='otherDocumentExpiry'?String(c.otherDocumentName||label):label,expiryDate:expiry,daysUntilExpiry:days,email:c.email||'',whatsapp:c.whatsapp||'',groupLink:c.whatsappGroupLink||''});}}
 const byId=new Map(clients.map(c=>[String(c?.id||''),c]));const byName=new Map(clients.map(c=>[String(c?.companyName||'').trim().toLowerCase(),c]));
 for(const p of staff){if(!p)continue;const c=byId.get(String(p.companyId||''))||byName.get(String(p.companyName||'').trim().toLowerCase())||{};for(const [field,label] of STAFF_EXPIRY_FIELDS){const expiry=p[field],days=daysUntil(expiry,today);if(days===null)continue;result.push({ownerType:'staff',ownerId:String(p.id||''),ownerName:String(p.fullName||'Staff member'),companyId:String(c.id||p.companyId||''),companyName:String(c.companyName||p.companyName||''),field,documentType:label,expiryDate:expiry,daysUntilExpiry:days,email:p.email||'',whatsapp:p.whatsapp||'',companyEmail:c.email||'',companyWhatsapp:c.whatsapp||'',groupLink:c.whatsappGroupLink||''});}}
 return result;
}
export function dueReminders(records){return records.map(r=>({...r,reminder:reminderKey(r.daysUntilExpiry)})).filter(r=>r.reminder);}
