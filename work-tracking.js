/* ERP work tracking extension: uses existing authorized documents records; never changes PDF rendering. */
(function () {
'use strict';
const stages = {
  visa: ['Documents Collected','Offer / Work Permit','Entry Permit / Status Change','Medical Fitness','Emirates ID','Residence Issued','Completed'],
  renewal: ['Documents Collected','Medical (if required)','ID Renewal','Residence Renewal','Completed'],
  cancellation: ['Request Submitted','Labour Cancellation (if applicable)','Immigration Cancellation','Completed'],
  labour: ['Offer Prepared','Submitted','Under Review','Approved','Contract Issued','Completed'],
  id: ['Application','Biometrics (if required)','Processing','ID Issued','Completed'],
  general: ['Not Started','Documents Collected','Submitted','Under Processing','Approved','Completed']
};
const safe = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const docs = () => (typeof state !== 'undefined' && Array.isArray(state.documents) ? state.documents : []);
const money = d => Number(typeof getDarDocumentAmount === 'function' ? getDarDocumentAmount(d) : (d.totalAmount || 0)) || 0;
const paid = d => {
 const amount = typeof window.getDarDocumentPaidAmount === 'function'
   ? window.getDarDocumentPaidAmount(d)
   : Math.max(0, Number(d.advanceAmount ?? d.advanceAmt ?? d.advance ?? 0) || 0);
 return Math.min(money(d), amount);
};
const isPaid = d => money(d)>0 && paid(d)>=money(d)-0.005;
const packageName = d => String(d.packageName || d.title || d.serviceName || 'Unassigned Package');
const company = d => !d.companyName || ['direct clients','direct client','without company','private'].includes(String(d.companyName).trim().toLowerCase()) ? 'Private' : String(d.companyName).trim();
const category = d => /cancel/i.test(packageName(d)) ? 'cancellation' : /renew/i.test(packageName(d)) ? 'renewal' : /labou?r|contract/i.test(packageName(d)) ? 'labour' : /emirates id|identity/i.test(packageName(d)) ? 'id' : /visa|residen|permit/i.test(packageName(d)) ? 'visa' : 'general';
const byId = id => docs().find(d=>d.refCode===id);
const select = (values,current) => values.map(v=>'<option value="'+safe(v)+'"'+(v===current?' selected':'')+'>'+safe(v)+'</option>').join('');
window.darRenderWorkTracking = function () {
 const root=document.getElementById('dar-work-tracking'); if(!root)return;
 root.replaceChildren();
 const table=document.createElement('div');table.className='table-responsive';
 table.innerHTML='<table class="data-table"><thead><tr><th>Date</th><th>Package (Main)</th><th>Service / Invoice</th><th>Company / Client</th><th>Current Stage</th><th>Work Status</th><th>Actions</th></tr></thead><tbody></tbody></table>';
 const tbody=table.querySelector('tbody');
 const filter=document.getElementById('dar-work-status-filter')?.value||'';
 docs().filter(d=>{
   if(d.type==='Quotation')return false;
   const raw=String(d.proStatus||d.workStatus||d.operationalStatus||'').toLowerCase();
   const closed=d.isClosed===true||raw==='closed';
   const completed=raw==='completed'||raw==='complete';
   const progress=raw==='in progress'||raw==='processing';
   if(filter==='pending')return !closed&&!completed&&!progress;
   if(filter==='progress')return progress;
   if(filter==='completed')return completed;
   if(filter==='closed')return closed;
   if(filter==='completed-balance'){
     const total=money(d),balance=Math.max(0,total-paid(d));
     return completed&&balance>0.005;
   }
   return true;
 }).slice().sort((a,b)=>String(b.transactionDate||b.createdDate||b.date||'').localeCompare(String(a.transactionDate||a.createdDate||a.date||''))).forEach(d=>{
   const tr=document.createElement('tr'),id=String(d.refCode||''),step=d.proStage||'Not Started',status=d.proStatus||'Not Started';
   for(const value of [(window.darFormatTableDate ? window.darFormatTableDate(d.transactionDate||d.createdDate||d.date) : String(d.createdDate||d.date||'').slice(0,10)),packageName(d),id+' · '+(d.items||[]).map(i=>i.title||i.serviceName||'').filter(Boolean).join(', '),company(d)==='Private'?(d.clientName||'Private'):company(d),step,status]){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
   }
   const td=document.createElement('td'),button=document.createElement('button');button.className='btn btn-secondary';button.textContent='Update Stage';button.addEventListener('click',()=>window.darEditWorkStage(id));td.append(button);tr.append(td);tbody.append(tr);
 });
 root.append(table);
};
window.darEditWorkStage = function(id){
 const d=byId(id);if(!d)return;
 const root=document.getElementById('dar-work-stage-editor');if(!root)return;
 const available=stages[category(d)],current=d.proStage||available[0];
 root.hidden=false;
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Update Work Stage');
 const priorFocus=document.activeElement;
 const closeEditor=()=>{root.hidden=true;document.removeEventListener('keydown',onEscape);priorFocus?.focus?.();};
 const onEscape=e=>{if(e.key==='Escape')closeEditor();};
 document.addEventListener('keydown',onEscape);
 root.onclick=e=>{if(e.target===root)closeEditor();};
 root.innerHTML='<div class="dar-stage-dialog"><h3>Update Work · '+safe(id)+'</h3><p>'+safe(packageName(d))+'</p><label>Stage <select id="dar-pro-stage">'+select([...new Set([...available,current])],current)+'</select></label><label>Status <select id="dar-pro-status">'+select(['Not Started','In Progress','Waiting for Client','Waiting for Government','On Hold','Rejected','Completed','Closed'],d.proStatus||'Not Started')+'</select></label><label>Remarks <textarea id="dar-pro-note" rows="2"></textarea></label><button class="btn btn-primary" id="dar-pro-save">Save Stage</button> <button class="btn btn-secondary" id="dar-pro-close">Cancel</button></div>';
 root.querySelector('#dar-pro-close').onclick=closeEditor;
 root.querySelector('#dar-pro-stage').focus();
 root.querySelector('#dar-pro-save').onclick=async()=>{
   const stage=root.querySelector('#dar-pro-stage').value,status=root.querySelector('#dar-pro-status').value,note=root.querySelector('#dar-pro-note').value.trim();
   try{
    if(!firebase.auth().currentUser?.emailVerified)throw Error('Verified sign-in required');
    const ref=db.ref('documents/'+id);
    const now=new Date().toISOString(),uid=firebase.auth().currentUser.uid;
    await ref.child('proHistory').push({stage,status,note,updatedAt:now,updatedBy:uid});
    await ref.update({proStage:stage,proStatus:status,proUpdatedAt:now});
    closeEditor();window.darRenderWorkTracking();
   }catch(e){alert('Stage update failed: '+e.message);}
 };
};
window.darRenderCompletedFiles=function(){
 const root=document.getElementById('dar-completed-files');if(!root)return;root.replaceChildren();
 const groups=new Map();
 docs().filter(d=>d.type!=='Quotation' && isPaid(d)).forEach(d=>{const c=company(d);if(!groups.has(c))groups.set(c,new Map());const pk=packageName(d);if(!groups.get(c).has(pk))groups.get(c).set(pk,[]);groups.get(c).get(pk).push(d);});
 if(!groups.size){root.textContent='No fully paid invoices found.';return;}
 for(const [name,packages] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
  const folder=document.createElement('details');folder.className='dar-folder';const summary=document.createElement('summary');summary.textContent='📁 '+name;folder.append(summary);
  for(const [pkg,records] of packages){const sub=document.createElement('details');sub.className='dar-folder';const heading=document.createElement('summary');heading.textContent='📦 '+pkg+' ('+records.length+')';sub.append(heading);
   for(const d of records){const line=document.createElement('div');line.className='dar-archive-row';const label=document.createElement('span');label.textContent=d.refCode+' · '+(d.clientName||'')+' · Expiry: '+(d.archiveExpiryDate||d.visaExpiryDate||'Not set');const btn=document.createElement('button');btn.className='btn btn-secondary';btn.textContent='Set Expiry';btn.onclick=()=>window.darSetExpiry(d.refCode);line.append(label,btn);sub.append(line);}folder.append(sub);
  }root.append(folder);
 }
};
window.darSetExpiry=async function(id){
 const d=byId(id);if(!d||!isPaid(d)){alert('Only fully paid invoices can be archived.');return;}
 const value=prompt('Expiry date (YYYY-MM-DD) for '+id,d.archiveExpiryDate||d.visaExpiryDate||'');
 if(value===null)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))){alert('Enter a valid YYYY-MM-DD date.');return;}
 try{if(!firebase.auth().currentUser?.emailVerified)throw Error('Verified sign-in required');await db.ref('documents/'+id).update({archiveExpiryDate:value,archiveUpdatedAt:new Date().toISOString()});window.darRenderCompletedFiles();}catch(e){alert('Unable to save expiry: '+e.message);}
};
let expiryEvents = null;
let expiryEventsListening = false;
const expiryEsc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function expiryISO(value){
 const normalized=window.darDates?window.darDates.normalize(value):String(value||'').slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(normalized)?normalized:'';
}
function expiryDays(value){
 const date=expiryISO(value);if(!date)return null;
 const today=window.darDates?window.darDates.todayISO():new Date().toISOString().slice(0,10);
 return Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
}
function collectProfileExpiries(){
 const companies=Array.isArray(state.clients)?state.clients:[];
 const staff=Array.isArray(state.staff)?state.staff:[];
 const clients=Array.isArray(state.companyClients)?state.companyClients:[];
 const byCompany=new Map(companies.map(c=>[String(c.id),c]));
 const companyFields=[['tradeLicenseExpiry','Trade Licence'],['establishmentCardExpiry','Establishment Card'],['immigrationLabourCardExpiry','Immigration / Labour Card'],['tenancyContractExpiry','Tenancy Contract'],['otherDocumentExpiry',null]];
 const staffFields=[['passportExpiry','Passport'],['labourCardExpiry','Labour Card'],['visaExpiry','Visa'],['emiratesIdExpiry','Emirates ID'],['otherStaffDocumentExpiry',null]];
 const clientFields=[['passportExpiry','Passport'],['emiratesIdExpiry','Emirates ID'],['visaExpiry','Visa']];
 const out=[];
 companies.forEach(c=>companyFields.forEach(([field,label])=>{
  if(!c[field])return;const days=expiryDays(c[field]);if(days===null||days>30)return;
  out.push({kind:'Company',id:c.id,name:c.companyName||'Company',company:c.companyName||'',field,label:label||(c.otherDocumentName||'Other Company Document'),expiry:expiryISO(c[field]),days,open:()=>c.id&&window.viewClientDetail?window.viewClientDetail(c.id):window.switchTab('clients')});
 }));
 staff.forEach(p=>staffFields.forEach(([field,label])=>{
  if(!p[field])return;const days=expiryDays(p[field]);if(days===null||days>30)return;
  const company=byCompany.get(String(p.companyId))||companies.find(c=>String(c.companyName||'').toLowerCase()===String(p.companyName||'').toLowerCase())||{};
  out.push({kind:'Staff',id:p.id,name:p.fullName||'Staff',company:company.companyName||p.companyName||'',field,label:label||(p.otherStaffDocumentName||'Other Staff Document'),expiry:expiryISO(p[field]),days,open:()=>p.id&&window.openStaffProfile?window.openStaffProfile(p.id):window.switchTab('staff')});
 }));
 clients.forEach(p=>clientFields.forEach(([field,label])=>{
  if(!p[field])return;const days=expiryDays(p[field]);if(days===null||days>30)return;
  const company=byCompany.get(String(p.companyId))||companies.find(c=>String(c.companyName||'').toLowerCase()===String(p.companyName||'').toLowerCase())||{};
  out.push({kind:'Company Client',id:p.id,name:p.name||'Client',company:company.companyName||p.companyName||'',field,label,expiry:expiryISO(p[field]),days,open:()=>p.companyId&&window.viewClientDetail?window.viewClientDetail(p.companyId):window.switchTab('clients')});
 }));
 return out;
}
window.darRenderExpiryNotifications=function(){
 const root=document.getElementById('dar-expiry-notifications');if(!root)return;
 if(!expiryEventsListening && typeof db!=='undefined' && db && firebase.auth().currentUser?.emailVerified){
  expiryEventsListening=true;
  db.ref('expiryNotificationEvents').on('value',snapshot=>{expiryEvents=snapshot.val()||{};if(document.getElementById('dar-expiry-notifications'))window.darRenderExpiryNotifications();},error=>{
   expiryEvents={};const node=document.getElementById('dar-expiry-notifications');if(node){const msg=document.createElement('p');msg.className='dar-hint';msg.textContent='Reminder delivery history unavailable: '+error.message;node.prepend(msg);}
  });
 }
 root.replaceChildren();
 const items=collectProfileExpiries();
 const documentItems=docs().filter(d=>isPaid(d)&&(d.archiveExpiryDate||d.visaExpiryDate)).map(d=>{
  const expiry=expiryISO(d.archiveExpiryDate||d.visaExpiryDate),days=expiryDays(expiry);
  return expiry&&days!==null&&days<=30?{kind:'Invoice / File',id:d.refCode,name:d.clientName||d.companyName||'Client',company:d.companyName||'',field:'archiveExpiryDate',label:'File / Visa',expiry,days,open:()=>window.viewDocumentHistory?window.viewDocumentHistory(d.refCode):window.switchTab('documents'),record:d}:null;
 }).filter(Boolean);
 const all=[...items,...documentItems].sort((a,b)=>a.days-b.days);
 const heading=document.createElement('div');heading.className='dash-section-title';
 const title=document.createElement('h3');title.textContent='Company, Staff & Client Expiries';
 const count=document.createElement('span');count.textContent=all.length+' item(s) due within 30 days or overdue';
 heading.append(title,count);root.append(heading);
 const hint=document.createElement('p');hint.className='dar-hint';hint.textContent='This list reads the saved company, staff and company-client profile expiry dates. Select View Profile to open the source record. Individual reminder delivery history appears where available.';root.append(hint);
 if(!all.length){const empty=document.createElement('p');empty.textContent='No expiry dates are due within 30 days or overdue. Add or check expiry dates in the relevant company or staff profile.';root.append(empty);return;}
 const wrap=document.createElement('div');wrap.className='table-responsive';
 const table=document.createElement('table');table.className='data-table';
 table.innerHTML='<thead><tr><th>Record Type</th><th>Name</th><th>Company</th><th>Document</th><th>Expiry Date</th><th>Time Remaining</th><th>Reminder History</th><th>Action</th></tr></thead><tbody></tbody>';
 const body=table.querySelector('tbody');
 all.forEach(item=>{
  const tr=document.createElement('tr');
  const status=item.days<0?'Expired '+Math.abs(item.days)+' day(s) ago':item.days===0?'Expires today':item.days+' day(s) remaining';
  const eventBranch=item.kind==='Company'?'company':item.kind==='Staff'?'staff':'';
  const event=eventBranch&&item.id?expiryEvents?.[eventBranch]?.[item.id]?.[item.field]?.[item.expiry]:null;
  const history=event?Object.values(event).sort((a,b)=>String(b.checkedAt||'').localeCompare(String(a.checkedAt||'')))[0]:null;
  const historyText=history?(history.status||'Checked')+' · '+Object.entries(history.channels||{}).map(([k,v])=>k.replace('_',' ')+': '+v).join(' / '):'No reminder history logged';
  [item.kind,item.name,item.company||'—',item.label,item.expiry,status,historyText].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
  const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent=item.kind==='Invoice / File'?'Open Invoice':'View Profile';button.addEventListener('click',item.open);action.append(button);tr.append(action);body.append(tr);
 });
 wrap.append(table);root.append(wrap);
};

})();
