/* DAR Finance Management Centre: additive, read-only financial analytics and connected navigation. */
(function () {
'use strict';
const $=id=>document.getElementById(id);
const num=v=>{const n=Number(String(v??0).replace(/,/g,''));return Number.isFinite(n)?n:0;};
const esc=v=>window.escapeHtml?window.escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>'AED '+num(v).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>window.darDates?.todayISO?.()||new Date().toISOString().slice(0,10);
const allDocs=()=>Array.isArray(state.documents)?state.documents.filter(d=>String(d.type||'Invoice').toLowerCase()!=='quotation'):[];
const allExpenses=()=>Array.isArray(state.monthlyExpenses)?state.monthlyExpenses:[];
const invDate=d=>String(d.transactionDate||d.invoiceDate||d.createdDate||d.date||'').slice(0,10);
const expDate=e=>String(e.transactionDate||e.expenseDate||e.date||((e.month||'')+'-01')).slice(0,10);
const total=d=>num(window.getDarDocumentAmount?window.getDarDocumentAmount(d):(d.totalAmount??d.totalAmt??d.total??d.amount));
const paid=d=>Math.max(0,num(window.getDarDocumentPaidAmount?window.getDarDocumentPaidAmount(d):(d.advanceAmount??d.advanceAmt??d.advance)));
const logs=d=>window.getDarDocumentPaymentLogs?window.getDarDocumentPaymentLogs(d):(Array.isArray(d.paymentLogs)?d.paymentLogs:Object.values(d.paymentLogs||{}));
function receipts(d){
 const ls=logs(d), sum=ls.reduce((s,p)=>s+Math.max(0,num(p.amount)),0), p=paid(d);
 let advance=d.advanceIncludedInPaymentLogs===true?0:(d.advanceIncludedInPaymentLogs===false?Math.max(0,num(d.paymentAdvanceBalance??d.advanceAmount??d.advanceAmt??d.advance)):Math.max(0,p-sum));
 const out=ls.filter(x=>num(x.amount)>0).map(x=>({date:String(x.date||x.transactionDate||invDate(d)).slice(0,10),amount:Math.max(0,num(x.amount)),note:[x.method,x.note].filter(Boolean).join(' · ')}));
 if(advance>0)out.push({date:invDate(d),amount:advance,note:'Advance / legacy receipt'});
 return out;
}
function period(){const a=$('finance-date-from')?.value||'',b=$('finance-date-to')?.value||'';return {a,b,has:d=>!!d&&(!a||d>=a)&&(!b||d<=b)};}
function snapshot(){
 const r=period(),ds=allDocs(),es=allExpenses(),pd=ds.filter(d=>r.has(invDate(d))),pe=es.filter(e=>r.has(expDate(e)));
 const revenue=pd.reduce((s,d)=>s+total(d),0),govt=pd.reduce((s,d)=>s+Math.max(0,num(d.govtFee??d.govtAmt)),0);
 const direct=pe.filter(e=>e.linkedInvoiceRef||e.invoiceRef).reduce((s,e)=>s+Math.max(0,num(e.amount)),0);
 const operating=pe.filter(e=>!(e.linkedInvoiceRef||e.invoiceRef)).reduce((s,e)=>s+Math.max(0,num(e.amount)),0);
 const collections=ds.reduce((s,d)=>s+receipts(d).filter(p=>r.has(p.date)).reduce((x,p)=>x+p.amount,0),0);
 const outstanding=ds.reduce((s,d)=>s+Math.max(0,total(d)-paid(d)),0);
 return {r,ds,es,pd,pe,revenue,govt,direct,operating,collections,outstanding,profit:revenue-govt-direct-operating};
}
function show(name){
 const root=$('finance-centre');if(!root)return;
 root.querySelectorAll('[data-finance-tab]').forEach(b=>b.classList.toggle('active',b.dataset.financeTab===name));
 root.querySelectorAll('[data-finance-panel]').forEach(p=>p.classList.toggle('active',p.dataset.financePanel===name));
 root.dataset.activeTab=name;
 if(name==='customers')renderCustomers();if(name==='reports')renderReports();if(name==='reconcile')renderAudit();
}
window.showFinanceSection=show;
function createShell(){
 const root=$('tab-accounts-ledger');if(!root||$('finance-centre'))return;
 const intro=root.querySelector('div[style*="margin-bottom: 20px"]');
 const shell=document.createElement('div');shell.id='finance-centre';
 shell.innerHTML='<div class="finance-heading"><div><div class="finance-eyebrow">DAR AL SHAMS · FINANCIAL MANAGEMENT</div><h2>Finance Management Centre</h2><p>Connected invoices, receipts, customer accounts, expenses and financial reporting.</p></div><div class="finance-period"><label>Reporting period</label><div><input id="finance-date-from" type="date" aria-label="Reporting start date"><span>to</span><input id="finance-date-to" type="date" aria-label="Reporting end date"><button class="btn btn-secondary" type="button" id="finance-apply">Apply</button></div></div></div>'+
 '<nav class="finance-nav" aria-label="Finance sections">'+
 '<button class="active" data-finance-tab="overview">Overview</button><button data-finance-tab="invoices">Invoices</button><button data-finance-tab="payments">Payments</button><button data-finance-tab="customers">Customers</button><button data-finance-tab="expenses">Expenses</button><button data-finance-tab="reports">Reports</button><button data-finance-tab="reconcile">Reconciliation</button><button data-finance-tab="staff">Staff Register</button></nav>'+
 '<section class="finance-panel active" data-finance-panel="overview"><div class="finance-kpis" id="finance-kpis"></div><div class="finance-grid-two"><article class="finance-card"><h3>Invoice-based Profit &amp; Loss</h3><p>Revenue is recognised on invoice date. Collections are shown separately.</p><div id="finance-pl"></div></article><article class="finance-card"><h3>Cash collections &amp; receivables</h3><p>Receipts in the selected period and all current unpaid balances.</p><div id="finance-cash"></div></article></div><article class="finance-card"><h3>Outstanding ageing</h3><p>Current unpaid invoice balances by invoice age.</p><div id="finance-ageing"></div></article><article class="finance-card"><h3>Recent invoices</h3><div id="finance-recent"></div></article></section>'+
 '<section class="finance-panel" data-finance-panel="invoices"><div id="finance-invoices"></div></section><section class="finance-panel" data-finance-panel="payments"><div id="finance-payments"></div></section>'+
 '<section class="finance-panel" data-finance-panel="customers"><article class="finance-card"><div class="finance-card-head"><div><h3>Customer Accounts</h3><p>Invoice totals, receipts and current outstanding balances.</p></div><input id="finance-customer-search" type="search" placeholder="Search customer"></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Customer</th><th>Invoices</th><th>Invoiced</th><th>Collected</th><th>Outstanding</th><th>Actions</th></tr></thead><tbody id="finance-customers"></tbody></table></div></article></section>'+
 '<section class="finance-panel" data-finance-panel="expenses"><div id="finance-expenses"></div></section>'+
 '<section class="finance-panel" data-finance-panel="reports"><div class="finance-report-actions"><button class="btn btn-primary" id="finance-export-pl">Export P&amp;L (Excel)</button><button class="btn btn-secondary" id="finance-export-customer">Export Customer Balances</button><button class="btn btn-secondary" id="finance-export-collections">Export Collections</button><button class="btn btn-secondary" id="finance-export-expenses">Export Expenses</button><button class="btn btn-secondary" id="finance-export-ageing">Export Ageing</button><button class="btn btn-secondary" id="finance-print">Print Report</button></div><article class="finance-card"><h3>Invoice-based Profit &amp; Loss Report</h3><div id="finance-report"></div></article><article class="finance-card"><h3>Outstanding by customer</h3><div id="finance-report-customers"></div></article></section>'+
 '<section class="finance-panel" data-finance-panel="reconcile"><article class="finance-card"><div class="finance-card-head"><div><h3>Financial Reconciliation</h3><p>Read-only checks; no financial records are changed automatically.</p></div><button class="btn btn-secondary" id="finance-audit-refresh">Run checks</button></div><div id="finance-audit-count"></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Level</th><th>Record</th><th>Finding</th></tr></thead><tbody id="finance-audit"></tbody></table></div></article></section>'+
 '<section class="finance-panel" data-finance-panel="staff"><div id="finance-staff"></div></section>';
 if(intro){intro.insertAdjacentElement('afterend',shell);intro.style.display='none';}else root.prepend(shell);
 const find=id=>$(id)?.closest('.table-responsive')?.parentElement;
 const staff=find('ledger-company-staff-tbody'),expense=find('monthly-expenses-tbody'),master=find('acc-full-ledger-tbody'),payments=find('acc-payment-logs-tbody');
 const toolbar=$('ledger-search')?.parentElement,selector=$('acc-invoice-select')?.closest('div[style*="background: var(--panel-bg)"]'),cards=$('acc-selected-summary-card');
 if(staff)$('finance-staff').appendChild(staff);if(expense)$('finance-expenses').appendChild(expense);
 if(toolbar)$('finance-invoices').appendChild(toolbar);if(master)$('finance-invoices').appendChild(master);
 if(selector)$('finance-payments').appendChild(selector);if(cards)$('finance-payments').appendChild(cards);if(payments)$('finance-payments').appendChild(payments);
 shell.querySelectorAll('[data-finance-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.financeTab)));
 $('finance-apply').addEventListener('click',render);$('finance-customer-search').addEventListener('input',renderCustomers);
 $('finance-audit-refresh').addEventListener('click',renderAudit);$('finance-export-pl').addEventListener('click',exportPL);
 $('finance-export-customer').addEventListener('click',exportCustomers);$('finance-export-collections').addEventListener('click',exportCollections);$('finance-export-expenses').addEventListener('click',exportExpenses);$('finance-export-ageing').addEventListener('click',exportAgeing);$('finance-print').addEventListener('click',()=>{show('reports');window.print();});
 const t=today();$('finance-date-from').value=t.slice(0,7)+'-01';$('finance-date-to').value=t;
}
function movePanels(){
 if(!$('finance-centre'))return;
 const find=id=>$(id)?.closest('.table-responsive')?.parentElement;
 const move=(id,target)=>{const el=find(id);if(el&&el.parentElement!==$(target))$(target).appendChild(el);};
 move('ledger-company-staff-tbody','finance-staff');move('monthly-expenses-tbody','finance-expenses');move('acc-full-ledger-tbody','finance-invoices');move('acc-payment-logs-tbody','finance-payments');
 const toolbar=$('ledger-search')?.parentElement;if(toolbar&&toolbar.parentElement!==$('finance-invoices'))$('finance-invoices').appendChild(toolbar);
 const selector=$('acc-invoice-select')?.closest('div[style*="background: var(--panel-bg)"]');if(selector&&selector.parentElement!==$('finance-payments'))$('finance-payments').appendChild(selector);
 if($('acc-selected-summary-card')?.parentElement!==$('finance-payments'))$('finance-payments').appendChild($('acc-selected-summary-card'));
}
function kpi(label,value,help,cls){return '<article class="finance-kpi '+cls+'"><span>'+esc(label)+'</span><strong>'+fmt(value)+'</strong><small>'+esc(help)+'</small></article>';}
function renderOverview(){
 const d=snapshot();
 $('finance-kpis').innerHTML=kpi('Invoice revenue',d.revenue,'Invoices dated in selected period','revenue')+kpi('Cash collected',d.collections,'Receipts dated in selected period','cash')+kpi('Outstanding receivables',d.outstanding,'Current unpaid balances','due')+kpi('Net profit',d.profit,'Invoice revenue less costs','profit');
 $('finance-pl').innerHTML='<div class="finance-line"><span>Invoice-based revenue</span><b>'+fmt(d.revenue)+'</b></div><div class="finance-line"><span>Government / direct fees</span><b>− '+fmt(d.govt)+'</b></div><div class="finance-line"><span>Invoice-linked direct expenses</span><b>− '+fmt(d.direct)+'</b></div><div class="finance-line"><span>Operating expenses</span><b>− '+fmt(d.operating)+'</b></div><div class="finance-line total"><span>Net profit</span><b>'+fmt(d.profit)+'</b></div><p class="finance-note">Revenue follows invoice date. Expenses are counted once by expense date; customer receipts do not increase revenue again.</p>';
 $('finance-cash').innerHTML='<div class="finance-line"><span>Receipts in selected period</span><b>'+fmt(d.collections)+'</b></div><div class="finance-line"><span>Current outstanding</span><b>'+fmt(d.outstanding)+'</b></div><div class="finance-line"><span>Invoices in selected period</span><b>'+d.pd.length+'</b></div><div class="finance-line"><span>Expenses in selected period</span><b>'+fmt(d.pe.reduce((s,e)=>s+num(e.amount),0))+'</b></div><p class="finance-note">Cash collections are shown separately and are not added to invoice-based revenue.</p>';
 const buckets={'0–30 days':0,'31–60 days':0,'61–90 days':0,'Over 90 days':0,'Undated':0},now=new Date(today()+'T00:00:00');
 d.ds.forEach(doc=>{const bal=Math.max(0,total(doc)-paid(doc));if(bal<=.005)return;const dt=invDate(doc);if(!dt){buckets.Undated+=bal;return;}const age=Math.max(0,Math.floor((now-new Date(dt+'T00:00:00'))/86400000));const key=age<=30?'0–30 days':age<=60?'31–60 days':age<=90?'61–90 days':'Over 90 days';buckets[key]+=bal;});
 const max=Math.max(1,...Object.values(buckets));$('finance-ageing').innerHTML=Object.entries(buckets).map(([k,v])=>'<div class="finance-age"><span>'+k+'</span><i><b style="width:'+Math.min(100,v/max*100)+'%"></b></i><strong>'+fmt(v)+'</strong></div>').join('');
 const latest=d.pd.slice().sort((a,b)=>invDate(b).localeCompare(invDate(a))).slice(0,6);
 $('finance-recent').innerHTML=latest.length?'<div class="table-responsive"><table class="data-table"><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Invoiced</th><th>Outstanding</th></tr></thead><tbody>'+latest.map(x=>'<tr><td>'+esc(x.refCode)+'</td><td>'+esc(invDate(x))+'</td><td>'+esc(x.clientName||x.companyName||'—')+'</td><td>'+fmt(total(x))+'</td><td>'+fmt(Math.max(0,total(x)-paid(x)))+'</td></tr>').join('')+'</tbody></table></div>':'<p class="finance-empty">No invoices in this reporting period.</p>';
}
function customerData(){
 const map=new Map();allDocs().forEach(doc=>{const name=String(doc.clientName||doc.companyName||'Unassigned customer').trim();if(!map.has(name))map.set(name,{name,count:0,invoiced:0,collected:0,balance:0,docs:[]});const x=map.get(name);x.count++;x.invoiced+=total(doc);x.collected+=paid(doc);x.balance+=Math.max(0,total(doc)-paid(doc));x.docs.push(doc);});
 return [...map.values()].sort((a,b)=>b.balance-a.balance);
}
function renderCustomers(){
 if(!$('finance-customers'))return;const q=($('finance-customer-search')?.value||'').toLowerCase().trim();
 const rows=customerData().filter(x=>!q||x.name.toLowerCase().includes(q));
 $('finance-customers').innerHTML=rows.length?rows.map(x=>'<tr><td><b>'+esc(x.name)+'</b></td><td>'+x.count+'</td><td>'+fmt(x.invoiced)+'</td><td>'+fmt(x.collected)+'</td><td>'+fmt(x.balance)+'</td><td><button class="btn btn-secondary finance-mini" onclick="printDarCustomerStatement(\''+encodeURIComponent(x.name)+'\')">Statement</button><button class="btn btn-secondary finance-mini" onclick="openDarCustomerInvoices(\''+encodeURIComponent(x.name)+'\')">Invoices</button></td></tr>').join(''):'<tr><td colspan="6" class="finance-empty">No matching customer accounts.</td></tr>';
}
window.openDarCustomerInvoices=function(encoded){show('invoices');const input=$('ledger-search');if(input){input.value=decodeURIComponent(encoded);input.dispatchEvent(new Event('input',{bubbles:true}));}};
window.printDarCustomerStatement=function(encoded){
 const name=decodeURIComponent(encoded||''),r=period(),rows=allDocs().filter(d=>(d.clientName||d.companyName||'Unassigned customer')===name&&r.has(invDate(d))).sort((a,b)=>invDate(a).localeCompare(invDate(b)));
 const body=rows.map(d=>'<tr><td>'+esc(invDate(d))+'</td><td>'+esc(d.refCode)+'</td><td>'+fmt(total(d))+'</td><td>'+fmt(paid(d))+'</td><td>'+fmt(Math.max(0,total(d)-paid(d)))+'</td></tr>').join('');
 const sum=rows.reduce((s,d)=>s+total(d),0),rec=rows.reduce((s,d)=>s+paid(d),0),w=window.open('','_blank');if(!w){alert('Allow pop-ups to print the customer statement.');return;}
 w.document.write('<!doctype html><html><head><title>Customer Statement</title><style>body{font:14px Arial;padding:28px;color:#172033}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h2>DAR AL SHAMS — Customer Statement</h2><h3>'+esc(name)+'</h3><p>Statement period: '+(r.a||'All dates')+' to '+(r.b||'Present')+' · Generated: '+today()+'</p><table><thead><tr><th>Date</th><th>Invoice</th><th>Invoiced</th><th>Collected</th><th>Outstanding</th></tr></thead><tbody>'+body+'</tbody></table><p><b>Total invoiced:</b> '+fmt(sum)+'<br><b>Collected:</b> '+fmt(rec)+'<br><b>Outstanding:</b> '+fmt(Math.max(0,sum-rec))+'</p><script>onload=()=>print()<\/script></body></html>');w.document.close();
};
function renderReports(){
 const d=snapshot();$('finance-report').innerHTML='<div class="finance-report-grid">'+[['Invoice revenue',d.revenue],['Government / direct fees',d.govt],['Invoice-linked direct expenses',d.direct],['Operating expenses',d.operating],['Net profit',d.profit],['Cash collected (separate)',d.collections],['Current outstanding',d.outstanding],['Invoices',d.pd.length]].map(x=>'<div><span>'+x[0]+'</span><b>'+(typeof x[1]==='number'&&x[0]==='Invoices'?x[1]:fmt(x[1]))+'</b></div>').join('')+'</div>';
 const rows=customerData().filter(x=>x.balance>.005);$('finance-report-customers').innerHTML=rows.length?'<div class="table-responsive"><table class="data-table"><thead><tr><th>Customer</th><th>Invoices</th><th>Outstanding</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.count+'</td><td>'+fmt(x.balance)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="finance-empty">No outstanding balances.</p>';
}
function audit(){
 const out=[];allDocs().forEach(d=>{const ref=d.refCode||'(missing invoice reference)',t=total(d),p=paid(d);if(!d.refCode)out.push(['High',ref,'Invoice reference is missing.']);if(!invDate(d))out.push(['Review',ref,'Invoice date is missing; period reporting may omit it.']);if(!d.clientName&&!d.companyName)out.push(['Review',ref,'Customer / company link is missing.']);if(t<0)out.push(['High',ref,'Invoice total is negative.']);if(p>t+.005)out.push(['High',ref,'Payments exceed invoice total.']);logs(d).forEach((x,i)=>{if(!(num(x.amount)>0))out.push(['Review',ref,'Payment log '+(i+1)+' has an invalid amount.']);});});
 allExpenses().forEach(e=>{const ref=e.id||e.title||'Expense';if(!expDate(e))out.push(['Review',ref,'Expense date is missing.']);if(!(num(e.amount)>0))out.push(['High',ref,'Expense amount is invalid.']);if(!e.category)out.push(['Review',ref,'Expense category is missing.']);const linked=e.linkedInvoiceRef||e.invoiceRef;if(linked&&!allDocs().some(d=>d.refCode===linked))out.push(['High',ref,'Linked invoice does not exist.']);});
 return out;
}
function renderAudit(){const out=audit();$('finance-audit-count').innerHTML='<p>'+allDocs().length+' invoices and '+allExpenses().length+' expenses checked · '+out.length+' findings</p>';$('finance-audit').innerHTML=out.length?out.map(x=>'<tr><td>'+esc(x[0])+'</td><td>'+esc(x[1])+'</td><td>'+esc(x[2])+'</td></tr>').join(''):'<tr><td colspan="3" class="finance-empty">No basic reconciliation issues detected. This is not a formal audit.</td></tr>';}
function downloadCSV(name,rows){const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function exportCollections(){
 const r=period(),rows=[['Invoice Ref','Customer','Payment Date','Amount AED','Note']];
 allDocs().forEach(d=>receipts(d).filter(p=>r.has(p.date)).forEach(p=>rows.push([d.refCode,d.clientName||d.companyName||'',p.date,p.amount,p.note||''])));
 if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Collections');XLSX.writeFile(wb,'DAR-Collections.xlsx');}else downloadCSV('DAR-Collections.csv',rows);
}
function exportExpenses(){
 const r=period(),rows=[['Expense Date','Title','Category','Supplier / Payee','Type','Invoice Ref','Receipt Reference','Amount AED']];
 allExpenses().filter(e=>r.has(expDate(e))).forEach(e=>rows.push([expDate(e),e.title||'',e.category||'Uncategorised',e.payee||'',(e.linkedInvoiceRef||e.invoiceRef)?'Direct':'Operating',e.linkedInvoiceRef||e.invoiceRef||'',e.reference||e.documentReference||'',num(e.amount)]));
 if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Expenses');XLSX.writeFile(wb,'DAR-Expenses.xlsx');}else downloadCSV('DAR-Expenses.csv',rows);
}
function exportAgeing(){
 const now=new Date(today()+'T00:00:00'),rows=[['Invoice Ref','Customer','Invoice Date','Age Days','Outstanding AED']];
 allDocs().forEach(d=>{const bal=Math.max(0,total(d)-paid(d));if(bal<=.005)return;const dt=invDate(d),age=dt?Math.max(0,Math.floor((now-new Date(dt+'T00:00:00'))/86400000)):'Undated';rows.push([d.refCode,d.clientName||d.companyName||'',dt,age,bal]);});
 if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Ageing');XLSX.writeFile(wb,'DAR-Receivables-Ageing.xlsx');}else downloadCSV('DAR-Receivables-Ageing.csv',rows);
}

function exportPL(){const d=snapshot(),rows=[['DAR AL SHAMS — Invoice-based Profit & Loss'],['From',d.r.a,'To',d.r.b],['Basis','Revenue recognised on invoice date'],[],['Metric','AED'],['Invoice revenue',d.revenue],['Government / direct fees',d.govt],['Invoice-linked direct expenses',d.direct],['Operating expenses',d.operating],['Net profit',d.profit],['Cash collected (separate metric)',d.collections],['Current outstanding (separate metric)',d.outstanding]];
 if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Profit and Loss');XLSX.writeFile(wb,'DAR-Invoice-Based-PandL.xlsx');}else downloadCSV('DAR-Invoice-Based-PandL.csv',rows);}
function exportCustomers(){const rows=[['Customer','Invoice Count','Invoiced AED','Collected AED','Outstanding AED'],...customerData().map(x=>[x.name,x.count,x.invoiced,x.collected,x.balance])];if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Customer Balances');XLSX.writeFile(wb,'DAR-Customer-Balances.xlsx');}else downloadCSV('DAR-Customer-Balances.csv',rows);}
function updateInvoiceTable(){
 const body=$('acc-full-ledger-tbody');if(!body)return;
 const q=($('ledger-search')?.value||'').trim().toLowerCase(),from=$('ledger-date-from')?.value||'',to=$('ledger-date-to')?.value||'';
 const rows=allDocs().filter(d=>{const dt=invDate(d);return(!from||(dt&&dt>=from))&&(!to||(dt&&dt<=to))&&[d.refCode,d.clientName,d.companyName,d.packageName,d.serviceName,d.title].some(v=>String(v||'').toLowerCase().includes(q));});
 body.innerHTML=rows.length?rows.map(d=>{
  const direct=allExpenses().filter(e=>(e.linkedInvoiceRef||e.invoiceRef)===d.refCode).reduce((sum,e)=>sum+Math.max(0,num(e.amount)),0);
  const govt=Math.max(0,num(d.govtFee??d.govtAmt)),t=total(d),p=paid(d),balance=Math.max(0,t-p);
  const status=window.getDarDocumentPaymentStatus?window.getDarDocumentPaymentStatus(d):(balance<=.005?'paid':p>0?'partial':'unpaid');
  return '<tr><td><b>'+esc(d.refCode)+'</b></td><td>'+esc(invDate(d)||'—')+'</td><td>'+esc(d.clientName||d.companyName||'—')+'</td><td>'+fmt(govt)+'</td><td>'+fmt(direct)+'</td><td><b>'+fmt(t)+'</b></td><td>'+fmt(p)+'</td><td>'+fmt(balance)+'</td><td><span class="finance-status '+esc(status)+'">'+esc(status.charAt(0).toUpperCase()+status.slice(1))+'</span></td><td><b>'+fmt(t-govt-direct)+'</b></td><td><button type="button" class="btn btn-secondary finance-mini" data-finance-open="'+esc(d.refCode)+'">Open / Edit</button></td></tr>';
 }).join(''):'<tr><td colspan="11" class="finance-empty">No invoices match these filters.</td></tr>';
 const table=body.closest('table');
 if(table){
  const labels=['Invoice Ref','Invoice Date','Customer','Government Fees (AED)','Linked Direct Costs (AED)','Invoiced (AED)','Collected (AED)','Outstanding (AED)','Payment Status','Invoice Contribution (AED)','Open'];
  table.querySelectorAll('thead th').forEach((th,i)=>{if(labels[i])th.textContent=labels[i];});
  const tr=table.querySelector('thead tr');while(tr&&tr.children.length<11){const th=document.createElement('th');th.textContent=labels[tr.children.length];tr.appendChild(th);}
 }
 body.querySelectorAll('[data-finance-open]').forEach(btn=>btn.addEventListener('click',()=>{if(typeof window.openStudio==='function')window.openStudio('Invoice',btn.dataset.financeOpen);else alert('Invoice editor is not available.');}));
}
function wrapFunctions(){
 if(window.__darFinanceWrap)return;window.__darFinanceWrap=true;
 const oldMaster=window.renderAccountsLedgerMaster;if(oldMaster)window.renderAccountsLedgerMaster=function(){const x=oldMaster.apply(this,arguments);movePanels();render();return x;};
 const oldFull=window.renderFullLedgerTableBody;if(oldFull)window.renderFullLedgerTableBody=function(){const x=oldFull.apply(this,arguments);updateInvoiceTable();render();return x;};
 const oldDetail=window.renderAccountsLedgerDetail;if(oldDetail)window.renderAccountsLedgerDetail=function(){const x=oldDetail.apply(this,arguments),d=allDocs().find(y=>y.refCode===arguments[0]);if(d&&$('acc-card-profit')){const linked=allExpenses().filter(e=>(e.linkedInvoiceRef||e.invoiceRef)===d.refCode).reduce((s,e)=>s+num(e.amount),0);$('acc-card-profit').textContent=fmt(total(d)-num(d.govtFee??d.govtAmt)-linked);const l=$('acc-card-profit').previousElementSibling;if(l)l.textContent='Invoice Contribution';}render();return x;};
}


function addPaymentMethodControl(){
 const modal=$('payment-modal');if(!modal||$('pay-input-method'))return;
 const amountInput=$('pay-input-amount')?.closest('.form-group');if(!amountInput)return;
 const group=document.createElement('div');group.className='form-group';
 group.innerHTML='<label for="pay-input-method">Payment Method</label><select id="pay-input-method"><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option><option value="Cheque">Cheque</option><option value="Other">Other</option></select>';
 amountInput.insertAdjacentElement('afterend',group);
}

function addExpenseControls(){
 const modal=$('monthly-expense-modal');if(!modal||$('finance-expense-category'))return;
 const form=modal.querySelector('.custom-modal-content'),actions=form?.querySelector('.custom-modal-actions');if(!form||!actions)return;
 const box=document.createElement('div');
 box.innerHTML='<div class="form-group"><label for="finance-expense-category">Expense category</label><select id="finance-expense-category"><option>Office & Administration</option><option>Rent</option><option>Salaries</option><option>Utilities</option><option>Transport</option><option>Marketing</option><option>Bank Charges</option><option>Other</option></select></div><div class="form-group"><label for="finance-expense-invoice">Link to invoice (optional direct cost)</label><select id="finance-expense-invoice"><option value="">Operating expense — not linked</option></select></div><div class="form-group"><label for="finance-expense-payee">Supplier / Payee (optional)</label><input id="finance-expense-payee" type="text" placeholder="Supplier or recipient"></div><div class="form-group"><label for="finance-expense-reference">Receipt / Document Reference (optional)</label><input id="finance-expense-reference" type="text" placeholder="Receipt number or secure file reference"></div><input type="hidden" id="finance-expense-edit-id">';
 form.insertBefore(box,actions);
 const monthInput=$('exp-input-month'),dateInput=$('exp-input-date');if(monthInput)monthInput.disabled=true;if(dateInput)dateInput.addEventListener('change',()=>{if(monthInput)monthInput.value=dateInput.value.slice(0,7);});
}
function refreshExpenseInvoiceOptions(selected){
 const s=$('finance-expense-invoice');if(!s)return;
 s.innerHTML='<option value="">Operating expense — not linked</option>'+allDocs().map(d=>'<option value="'+esc(d.refCode)+'">'+esc(d.refCode)+' — '+esc(d.clientName||d.companyName||'Customer')+'</option>').join('');
 s.value=selected||'';
}
function renderExpenses(){
 const body=$('monthly-expenses-tbody');if(!body)return;
 const from=$('expense-date-from')?.value||'',to=$('expense-date-to')?.value||'',q=($('expense-search')?.value||'').trim().toLowerCase();
 const rows=allExpenses().filter(e=>{const dt=expDate(e);return(!from||(dt&&dt>=from))&&(!to||(dt&&dt<=to))&&[e.title,e.month,e.date,e.amount,e.category,e.linkedInvoiceRef,e.invoiceRef].some(v=>String(v??'').toLowerCase().includes(q));}).slice().sort((a,b)=>expDate(b).localeCompare(expDate(a)));
 body.innerHTML=rows.length?rows.map(e=>'<tr><td>'+esc(expDate(e)||'—')+'</td><td><strong>'+esc(e.title||'—')+'</strong><small class="finance-expense-meta">'+esc(e.category||'Uncategorised')+(e.payee?' · '+esc(e.payee):'')+' · '+((e.linkedInvoiceRef||e.invoiceRef)?'Direct cost: '+esc(e.linkedInvoiceRef||e.invoiceRef):'Operating expense')+'</small></td><td>'+fmt(e.amount)+'</td><td><button type="button" class="btn btn-secondary finance-mini" onclick="editDarExpense(\''+esc(e.id)+'\')">Edit</button><button type="button" class="btn btn-danger finance-mini" onclick="deleteMonthlyExpense('+allExpenses().indexOf(e)+')">Delete</button></td></tr>').join(''):'<tr><td colspan="4" class="finance-empty">No expenses match the current filters.</td></tr>';
}
window.editDarExpense=function(id){
 const e=allExpenses().find(x=>x.id===id);if(!e)return;
 addExpenseControls();
 $('exp-input-month').value=e.month||expDate(e).slice(0,7);$('exp-input-date').value=expDate(e);
 $('exp-input-title').value=e.title||'';$('exp-input-amount').value=num(e.amount);
 $('finance-expense-category').value=e.category||'Other';$('finance-expense-payee').value=e.payee||'';$('finance-expense-reference').value=e.reference||e.documentReference||'';refreshExpenseInvoiceOptions(e.linkedInvoiceRef||e.invoiceRef||'');
 $('finance-expense-edit-id').value=id;const h=$('monthly-expense-modal').querySelector('h3');if(h)h.textContent='Edit Expense';
 $('monthly-expense-modal').style.display='flex';
};
window.openMonthlyExpenseModal=function(){
 addExpenseControls();const dt=today();$('exp-input-amount').value='';$('exp-input-title').value='';
 if($('exp-input-date'))$('exp-input-date').value=dt;if($('exp-input-month'))$('exp-input-month').value=dt.slice(0,7);
 $('finance-expense-category').value='Office & Administration';$('finance-expense-payee').value='';$('finance-expense-reference').value='';$('finance-expense-edit-id').value='';refreshExpenseInvoiceOptions('');
 const h=$('monthly-expense-modal').querySelector('h3');if(h)h.textContent='Add Operating Expense';$('monthly-expense-modal').style.display='flex';
};
window.saveMonthlyExpenseData=async function(){
 addExpenseControls();
 const dt=$('exp-input-date')?.value||today(),month=dt.slice(0,7),title=$('exp-input-title')?.value.trim()||'',value=Number($('exp-input-amount')?.value),id=$('finance-expense-edit-id')?.value||'',category=$('finance-expense-category')?.value||'Other',linked=$('finance-expense-invoice')?.value||'',payee=$('finance-expense-payee')?.value.trim()||'',reference=$('finance-expense-reference')?.value.trim()||'';
 if(!title){alert('Please enter an expense description.');return;}if(!dt||!month){alert('Please select the expense date and month.');return;}
 if(!Number.isFinite(value)||value<=0){alert('Please enter an expense amount greater than zero.');return;}
 if(linked&&!allDocs().some(d=>d.refCode===linked)){alert('The selected invoice is unavailable. Refresh and retry.');return;}
 if(!db){alert('Firebase is not connected. The expense was not saved.');return;}
 const key=id||db.ref('monthlyExpenses').push().key,old=allExpenses().find(e=>e.id===key)||{};
 const patch={month,date:dt,transactionDate:dt,title,amount:value,category,linkedInvoiceRef:linked||null,payee,reference,createdDate:old.createdDate||dt,updatedAt:new Date().toISOString(),updatedBy:firebase.auth?.().currentUser?.email||firebase.auth?.().currentUser?.uid||'Unknown'};
 try{await saveStateToFirebase('monthlyExpenses',key,patch);state.monthlyExpenses=allExpenses().filter(e=>e.id!==key).concat({...old,...patch,id:key});if(typeof closeMonthlyExpenseModal==='function')closeMonthlyExpenseModal();renderExpenses();render();}
 catch(error){alert('Expense was not saved. Check the connection and permissions, then retry.');}
};
window.renderMonthlyExpensesTable=renderExpenses;
window.editPaymentLog=async function(refCode,index){
 const doc=allDocs().find(d=>d.refCode===refCode);if(!doc)return;const current=logs(doc);
 if(!Number.isInteger(index)||index<0||index>=current.length)return;
 const original=current[index],date=prompt('Payment date (YYYY-MM-DD):',original.date||original.transactionDate||invDate(doc));if(date===null)return;
 const amountText=prompt('Payment amount (AED):',String(original.amount??''));if(amountText===null)return;
 const value=Number(amountText);if(!date.trim()||!Number.isFinite(value)||value<=0){alert('Enter a valid payment date and amount greater than zero.');return;}
 const note=prompt('Payment note / reference:',original.note||'');if(note===null)return;const method=prompt('Payment method:',original.method||'Other');if(method===null)return;const fingerprint=JSON.stringify(original);
 try{const result=await transactDarDocument(refCode,currentDoc=>{if(!currentDoc)return;const entries=window.getDarDocumentPaymentLogs(currentDoc),idx=entries.findIndex(x=>JSON.stringify(x)===fingerprint);if(idx<0)return;const nextPaid=paid(currentDoc)-num(entries[idx].amount)+value;if(nextPaid>total(currentDoc)+.005)return;entries[idx]={...entries[idx],date:date.trim(),transactionDate:date.trim(),amount:value,note:note.trim(),method:method.trim()};currentDoc.paymentLogs=entries;currentDoc.updatedAt=new Date().toISOString();currentDoc.updatedBy=firebase.auth?.().currentUser?.email||firebase.auth?.().currentUser?.uid||'Unknown';return currentDoc;});
 if(!result.committed){alert('Payment was not changed. It may have been edited by another user or the new amount exceeds the invoice total.');return;}
 Object.assign(doc,result.snapshot.val()||{});window.renderAccountsLedgerDetail(refCode);window.renderFullLedgerTableBody();render();
 }catch(error){alert('Payment edit failed. The original payment remains unchanged.');}
};

function init(){if(!$('tab-accounts-ledger'))return;createShell();movePanels();wrapFunctions();addExpenseControls();addPaymentMethodControl();renderExpenses();render();}
window.renderFinanceCentre=render;window.initDarFinanceCentre=init;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();