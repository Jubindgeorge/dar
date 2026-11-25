/* Executive dashboard enhancement.
 * Read-only dashboard calculations over existing authorized Firebase state.
 * No new Firebase nodes, writes, or payment calculations are introduced here.
 */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const list = value => Array.isArray(value) ? value : [];
  const norm = value => String(value == null ? '' : value).trim().toLowerCase();
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const amount = doc => Math.max(0, Number(typeof getDarDocumentAmount === 'function' ? getDarDocumentAmount(doc) : (doc.totalAmount ?? doc.totalAmt ?? doc.total ?? doc.amount ?? 0)) || 0);
  const paid = doc => Math.min(amount(doc), Math.max(0, Number(window.getDarDocumentPaidAmount ? window.getDarDocumentPaidAmount(doc) : (doc.advanceAmount ?? doc.advanceAmt ?? doc.advance ?? 0)) || 0));
  const invoiceDate = doc => window.darDates ? window.darDates.normalize(doc.transactionDate || doc.createdDate || doc.date) : String(doc.transactionDate || doc.createdDate || doc.date || '').slice(0,10);
  const today = () => window.darDates ? window.darDates.todayISO() : new Date().toISOString().slice(0,10);
  const money = value => 'AED ' + (Number(value) || 0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const isInvoice = doc => norm(doc.type || 'invoice') !== 'quotation' && norm(doc.status) !== 'cancelled' && norm(doc.status) !== 'draft' && doc.cancelled !== true;
  const status = doc => window.getDarDocumentPaymentStatus ? window.getDarDocumentPaymentStatus(doc) : (paid(doc) >= amount(doc) ? 'paid' : paid(doc) > 0 ? 'partial' : 'unpaid');
  const workStatus = doc => {
    const raw = norm(doc.proStatus || doc.workStatus || doc.operationalStatus || '');
    if (doc.isClosed === true || raw === 'closed') return 'closed';
    if (raw === 'completed' || raw === 'complete') return 'completed';
    if (raw === 'in progress' || raw === 'processing') return 'progress';
    return 'pending';
  };
  const dueAge = doc => {
    const date = window.darDates ? window.darDates.normalize(doc.dueDate || doc.paymentDueDate || invoiceDate(doc)) : String(doc.dueDate || doc.paymentDueDate || invoiceDate(doc) || '').slice(0,10);
    if (!date) return null;
    const days = Math.floor((new Date(today()+'T00:00:00').getTime() - new Date(date+'T00:00:00').getTime()) / 86400000);
    return Number.isFinite(days) ? Math.max(0, days) : null;
  };
  const docs = () => list(typeof state !== 'undefined' ? state.documents : []).filter(isInvoice);
  const expenses = () => list(typeof state !== 'undefined' ? state.monthlyExpenses : []);
  const companies = () => list(typeof state !== 'undefined' ? state.clients : []);
  const staff = () => list(typeof state !== 'undefined' ? state.staff : []);
  const companyClients = () => list(typeof state !== 'undefined' ? state.companyClients : []);
  const dateText = value => window.darDates ? window.darDates.format(value) : (value || '-');
  function setText(id,value){const node=byId(id);if(node)node.textContent=String(value);}
  function renderLegacyStats(){
    if(typeof window.getDarV2FinancialOverview!=='function')return;
    const v=window.getDarV2FinancialOverview(list(state.documents),expenses());
    setText('dash-client-count',companies().length);
    setText('dash-works-count',list(state.documents).length);
    setText('dash-v2-received',money(v.received));
    setText('dash-v2-outstanding',money(v.outstanding));
    setText('dash-v2-unassigned',v.unassigned);
    setText('dash-v2-payment-status','Paid: '+v.paid+' · Partial: '+v.partial+' · Unpaid: '+v.unpaid+' · Overdue: '+v.overdue);
  }
  function metric(id,value){setText(id,value);}
  function renderDashboardStats(){
    renderLegacyStats();
    const all=docs(), now=today(), month=now.slice(0,7);
    const total=all.reduce((s,d)=>s+amount(d),0);
    const received=all.reduce((s,d)=>s+paid(d),0);
    const outstanding=all.reduce((s,d)=>s+Math.max(0,amount(d)-paid(d)),0);
    const monthDocs=all.filter(d=>invoiceDate(d).startsWith(month));
    const monthReceived=monthDocs.reduce((s,d)=>s+paid(d),0);
    const monthExpenses=expenses().filter(e=>String(e.month||e.expenseDate||e.date||'').startsWith(month)).reduce((s,e)=>s+Math.max(0,Number(e.amount)||0),0);
    const counts={unpaid:0,partial:0,paid:0,overdue:0,pending:0,progress:0,completed:0,closed:0,completedBalance:0};
    const aging=[0,0,0,0];
    all.forEach(d=>{
      const p=status(d); if(counts[p]!==undefined)counts[p]++;
      const w=workStatus(d); counts[w]++;
      if(w==='completed' && amount(d)-paid(d)>0.005)counts.completedBalance++;
      const balance=Math.max(0,amount(d)-paid(d));
      if(balance>0.005){const age=dueAge(d);if(age!==null)aging[age<=30?0:age<=60?1:age<=90?2:3]+=balance;}
    });
    metric('dash-exec-invoiced',money(total));
    metric('dash-exec-received',money(received));
    metric('dash-exec-outstanding',money(outstanding));
    metric('dash-exec-active-works',counts.pending+counts.progress);
    metric('dash-exec-unpaid',counts.unpaid);
    metric('dash-exec-partial',counts.partial);
    metric('dash-exec-paid',counts.paid);
    metric('dash-exec-overdue',counts.overdue);
    metric('dash-exec-work-pending',counts.pending);
    metric('dash-exec-work-progress',counts.progress);
    metric('dash-exec-work-completed',counts.completed);
    metric('dash-exec-work-closed',counts.closed);
    metric('dash-exec-completed-balance',counts.completedBalance);
    metric('dash-exec-age-30',money(aging[0]));
    metric('dash-exec-age-60',money(aging[1]));
    metric('dash-exec-age-90',money(aging[2]));
    metric('dash-exec-age-90plus',money(aging[3]));
    metric('dash-exec-companies',companies().length);
    metric('dash-exec-staff',staff().length);
    metric('dash-exec-month-received',money(monthReceived));
    metric('dash-exec-month-expenses',money(monthExpenses));
    metric('dash-exec-month-net',money(monthReceived-monthExpenses));
    metric('dash-exec-quotations',list(state.documents).filter(d=>norm(d.type)==='quotation').length);
    renderAlerts();
    renderRecentActivity();
  }
  function renderAlerts(){
    const root=byId('dash-exec-alert-list');if(!root)return;
    const items=[];
    allExpiryRecords().forEach(item=>items.push(item));
    docs().forEach(d=>{
      if(status(d)==='overdue' && amount(d)-paid(d)>0.005)items.push({kind:'Overdue invoice',label:(d.refCode||'Invoice')+' · '+(d.clientName||d.companyName||'Client'),detail:money(amount(d)-paid(d)),action:()=>window.darDashboardOpen('invoices','overdue')});
      if(workStatus(d)==='completed' && amount(d)-paid(d)>0.005)items.push({kind:'Completed – balance pending',label:(d.refCode||'Invoice')+' · '+(d.clientName||d.companyName||'Client'),detail:money(amount(d)-paid(d)),action:()=>window.darDashboardOpen('invoices','completed-balance')});
      if(norm(d.proStatus)==='waiting for client' || norm(d.proStatus)==='waiting for government' || norm(d.proStatus)==='on hold')items.push({kind:'Work follow-up',label:(d.refCode||'Work')+' · '+(d.clientName||d.companyName||'Client'),detail:d.proStatus,action:()=>window.switchTab('work-tracking')});
    });
    root.replaceChildren();
    if(!items.length){const p=document.createElement('p');p.className='dash-muted';p.textContent='No outstanding payment or document-expiry alerts found.';root.append(p);return;}
    items.slice(0,10).forEach(item=>{
      const button=document.createElement('button');button.type='button';button.className='dash-alert-row';
      const main=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.kind;const label=document.createElement('small');label.textContent=item.label;main.append(strong,label);
      const detail=document.createElement('span');detail.className='dash-alert-detail';detail.textContent=item.detail||'Open';
      button.append(main,detail);button.addEventListener('click',item.action);root.append(button);
    });
    if(items.length>10){const p=document.createElement('p');p.className='dash-muted';p.textContent='Showing 10 of '+items.length+' alerts. Open the relevant module for all records.';root.append(p);}
  }
  function allExpiryRecords(){
    const todayDate=new Date(today()+'T00:00:00');const out=[];
    const companyFields=['tradeLicenseExpiry','tradeLicenceExpiry','establishmentCardExpiry','immigrationLabourCardExpiry','labourCardExpiry','tenancyContractExpiry','otherDocumentExpiry'];
    const staffFields=['passportExpiry','emiratesIdExpiry','labourCardExpiry','visaExpiry','otherStaffDocumentExpiry'];
    companies().forEach(c=>companyFields.forEach(key=>{const value=c[key];if(!value)return;const date=window.darDates?window.darDates.normalize(value):String(value).slice(0,10);if(!date)return;const days=Math.ceil((new Date(date+'T00:00:00')-todayDate)/86400000);if(days<=30)out.push({kind:'Company expiry',label:(c.companyName||'Company')+' · '+key.replace(/([A-Z])/g,' $1'),detail:days<0?'Expired '+(-days)+'d':days+' days left',action:()=>window.darDashboardOpen('expiry')});}));
    staff().forEach(s=>staffFields.forEach(key=>{const value=s[key];if(!value)return;const date=window.darDates?window.darDates.normalize(value):String(value).slice(0,10);if(!date)return;const days=Math.ceil((new Date(date+'T00:00:00')-todayDate)/86400000);if(days<=30)out.push({kind:'Staff expiry',label:(s.fullName||'Staff')+' · '+key.replace(/([A-Z])/g,' $1'),detail:days<0?'Expired '+(-days)+'d':days+' days left',action:()=>window.darDashboardOpen('expiry')});}));
    companyClients().forEach(p=>['passportExpiry','emiratesIdExpiry','visaExpiry'].forEach(key=>{const value=p[key];if(!value)return;const date=window.darDates?window.darDates.normalize(value):String(value).slice(0,10);if(!date)return;const days=Math.ceil((new Date(date+'T00:00:00')-todayDate)/86400000);if(days<=30)out.push({kind:'Client expiry',label:(p.name||'Client')+' · '+key.replace(/([A-Z])/g,' $1'),detail:days<0?'Expired '+(-days)+'d':days+' days left',action:()=>window.darDashboardOpen('expiry')});}));
    return out;
  }
  function renderRecentActivity(){
    const root=byId('dash-exec-recent');if(!root)return;root.replaceChildren();
    const recent=list(state.documents).slice().sort((a,b)=>String(b.updatedAt||b.transactionDate||b.createdDate||b.date||'').localeCompare(String(a.updatedAt||a.transactionDate||a.createdDate||a.date||''))).slice(0,6);
    if(!recent.length){root.textContent='No invoice or quotation activity yet.';return;}
    recent.forEach(d=>{
      const row=document.createElement('button');row.type='button';row.className='dash-recent-row';
      const name=document.createElement('span');const title=document.createElement('strong');title.textContent=(d.type||'Invoice')+' · '+(d.refCode||'');const sub=document.createElement('small');sub.textContent=(d.clientName||d.companyName||'Client')+' · '+dateText(invoiceDate(d));name.append(title,sub);
      const value=document.createElement('b');value.textContent=money(amount(d));row.append(name,value);
      row.addEventListener('click',()=>{if(norm(d.type)==='quotation'){window.darDashboardOpen('quotations',d.refCode);}else if(typeof window.viewDocumentHistory==='function')window.viewDocumentHistory(d.refCode);else window.darDashboardOpen('invoices');});root.append(row);
    });
  }
  function openSearchResult(item){
    if(item.kind==='company'){if(window.viewClientDetail)window.viewClientDetail(item.record.id);else window.switchTab('clients');}
    else if(item.kind==='staff'){if(window.openStaffProfile)window.openStaffProfile(item.record.id);else window.switchTab('staff');}
    else if(item.kind==='client'){if(item.record.companyId&&window.viewClientDetail)window.viewClientDetail(item.record.companyId);else window.switchTab('clients');}
    else if(item.kind==='invoice'){if(window.viewDocumentHistory)window.viewDocumentHistory(item.record.refCode);else window.switchTab('documents');}
    else if(item.kind==='quotation'){window.darDashboardOpen('quotations',item.record.refCode);}
  }
  function searchItems(query){
    const q=norm(query);if(!q)return[];
    const out=[];
    companies().forEach(r=>{const hay=[r.companyName,r.nameAr,r.contactPerson,r.email,r.phone].map(norm).join(' ');if(hay.includes(q))out.push({kind:'company',label:r.companyName||'Company',detail:r.contactPerson||'Company profile',record:r});});
    staff().forEach(r=>{const hay=[r.staffCode,r.staffId,r.fullName,r.personNumber,r.passportNumber,r.labourCardNumber,r.companyName].map(norm).join(' ');if(hay.includes(q))out.push({kind:'staff',label:r.fullName||r.staffCode||'Staff',detail:r.companyName||r.passportNumber||'Staff profile',record:r});});
    companyClients().forEach(r=>{const hay=[r.name,r.phone,r.email,r.whatsapp,r.companyName].map(norm).join(' ');if(hay.includes(q))out.push({kind:'client',label:r.name||'Client',detail:r.companyName||r.phone||'Company client',record:r});});
    list(state.documents).forEach(r=>{const hay=[r.refCode,r.clientName,r.companyName,r.packageName,r.title,r.serviceName,r.passportNumber].map(norm).join(' ');if(hay.includes(q))out.push({kind:norm(r.type)==='quotation'?'quotation':'invoice',label:(r.type||'Invoice')+' · '+(r.refCode||''),detail:r.clientName||r.companyName||'Document',record:r});});
    return out.slice(0,12);
  }
  function setupSearch(){
    const input=byId('dash-exec-search'),root=byId('dash-exec-search-results');if(!input||!root||input.dataset.ready)return;input.dataset.ready='1';
    input.addEventListener('input',()=>{
      root.replaceChildren();const results=searchItems(input.value);
      if(!input.value.trim())return;
      if(!results.length){const p=document.createElement('p');p.className='dash-muted';p.textContent='No matching company, staff, invoice or quotation found.';root.append(p);return;}
      results.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='dash-search-result';const title=document.createElement('strong');title.textContent=item.label;const detail=document.createElement('small');detail.textContent=item.kind.toUpperCase()+' · '+item.detail;b.append(title,detail);b.addEventListener('click',()=>{root.replaceChildren();input.value='';openSearchResult(item);});root.append(b);});
    });
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';root.replaceChildren();}});
  }
  window.darDashboardOpen = function(kind,filter){
    const tabs={companies:'clients',staff:'staff',invoices:'documents',quotations:'quotations',works:'work-tracking',expiry:'expiry-notifications',ledger:'accounts-ledger',directory:'works','record-payment':'accounts-ledger'};
    if(kind==='invoices'){
      const select=byId('doc-payment-status-filter');if(select)select.value=filter||'';
    }else if(kind==='works'){
      const select=byId('dar-work-status-filter');if(select)select.value=filter||'';
    }else if(kind==='quotations'){
      const search=byId('quotation-search');if(search)search.value=filter||'';
    }
    window.switchTab(tabs[kind]||'dashboard');
    if(kind==='quotations'&&typeof window.renderQuotationTable==='function')window.renderQuotationTable();
    if(kind==='record-payment'&&typeof window.openAddPaymentModal==='function')window.openAddPaymentModal();
  };
  window.renderDashboardStats = renderDashboardStats;
  document.addEventListener('DOMContentLoaded',()=>{setupSearch();renderDashboardStats();});
  if(document.readyState!=='loading'){setupSearch();renderDashboardStats();}
})();