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
 const logs = Array.isArray(d.paymentLogs) ? d.paymentLogs : Object.values(d.paymentLogs || {});
 const advance = Number(d.advanceAmount ?? d.advanceAmt ?? d.advance ?? 0) || 0;
 // Do not silently double-count an advance explicitly marked as already included in payment logs.
 const included = d.advanceIncludedInPaymentLogs === true;
 return Math.min(money(d),Math.max(0,(included ? 0 : advance) + logs.reduce((s,p)=>s+(Number(p.amount)||0),0)));
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
 docs().filter(d=>d.type!=='Quotation').forEach(d=>{
   const tr=document.createElement('tr'),id=String(d.refCode||''),step=d.proStage||'Not Started',status=d.proStatus||'Not Started';
   for(const value of [String(d.createdDate||d.date||'').slice(0,10),packageName(d),id+' · '+(d.items||[]).map(i=>i.title||i.serviceName||'').filter(Boolean).join(', '),company(d)==='Private'?(d.clientName||'Private'):company(d),step,status]){
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
 root.innerHTML='<h3>Update Work · '+safe(id)+'</h3><p>'+safe(packageName(d))+'</p><label>Stage <select id="dar-pro-stage">'+select([...new Set([...available,current])],current)+'</select></label><label>Status <select id="dar-pro-status">'+select(['Not Started','In Progress','Waiting for Client','Waiting for Government','On Hold','Rejected','Completed'],d.proStatus||'Not Started')+'</select></label><label>Remarks <textarea id="dar-pro-note" rows="2"></textarea></label><button class="btn btn-primary" id="dar-pro-save">Save Stage</button> <button class="btn btn-secondary" id="dar-pro-close">Cancel</button>';
 root.querySelector('#dar-pro-close').onclick=()=>{root.hidden=true;};
 root.querySelector('#dar-pro-save').onclick=async()=>{
   const stage=root.querySelector('#dar-pro-stage').value,status=root.querySelector('#dar-pro-status').value,note=root.querySelector('#dar-pro-note').value.trim();
   try{
    if(!firebase.auth().currentUser?.emailVerified)throw Error('Verified sign-in required');
    const ref=db.ref('documents/'+id);
    const now=new Date().toISOString(),uid=firebase.auth().currentUser.uid;
    await ref.child('proHistory').push({stage,status,note,updatedAt:now,updatedBy:uid});
    await ref.update({proStage:stage,proStatus:status,proUpdatedAt:now});
    root.hidden=true;window.darRenderWorkTracking();
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
window.darRenderExpiryNotifications=function(){
 const root=document.getElementById('dar-expiry-notifications');if(!root)return;
 root.replaceChildren();
 if(!expiryEventsListening && typeof db!=='undefined' && db && firebase.auth().currentUser?.emailVerified){
  expiryEventsListening=true;
  db.ref('expiryNotificationEvents').on('value',snapshot=>{
   expiryEvents=snapshot.val()||{};
   if(document.getElementById('dar-expiry-notifications'))window.darRenderExpiryNotifications();
  },error=>{
   expiryEvents={};
   const node=document.getElementById('dar-expiry-notifications');
   if(node){const msg=document.createElement('p');msg.textContent='Backend reminder status unavailable: '+error.message;node.prepend(msg);}
  });
 }
 const now=new Date();now.setHours(0,0,0,0);
 const items=docs().filter(d=>isPaid(d)&&(d.archiveExpiryDate||d.visaExpiryDate)).map(d=>({d,date:new Date((d.archiveExpiryDate||d.visaExpiryDate)+'T00:00:00')})).filter(x=>!Number.isNaN(+x.date)).filter(x=>{const before=new Date(x.date);before.setMonth(before.getMonth()-1);return now>=before;}).sort((a,b)=>a.date-b.date);
 if(!items.length){root.textContent='No expiry reminders due.';return;}
 for(const {d,date} of items){
  const row=document.createElement('div');row.className='dar-archive-row';
  const days=Math.ceil((date-now)/86400000);
  const expiry=d.archiveExpiryDate||d.visaExpiryDate;
  const event=expiryEvents?.[d.refCode]?.[expiry];
  const status=event?.type==='Email Missing'?'Recipient email missing — admin review required':event?.updatedAt?'Backend reminder reviewed · '+event.updatedAt:'Email delivery not verified';
  row.textContent=packageName(d)+' · '+d.refCode+' · '+company(d)+' · '+(days<0?'Expired '+(-days)+' days ago':days+' days remaining')+' · '+status;
  root.append(row);
 }
};
})();
