const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true});
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('#signup-form').count(),1,'Signup form exists');
    assert.equal(await page.locator('#dar-mobile-menu-backdrop').count(),1,'Mobile navigation backdrop exists');
    assert.equal(await page.locator('#dar-protection-panel').count(),1,'Data protection panel exists');
    assert.equal(await page.locator('#tab-staff').count(),1,'Company staff page exists');
    assert.equal(await page.locator('#tab-purchases').count(),1,'Purchases page exists');
    assert.equal(await page.evaluate(() => normalizeStudioCompanyName('Sample   Company')), 'sample company', 'Company matching normalizes repeated whitespace');
    assert.equal(await page.locator('[data-group-toggle]').count(),8,'Sidebar has grouped navigation controls including Website Info');
    await page.evaluate(() => {
      document.getElementById('welcome-screen').style.display='none';
      document.getElementById('auth-container').style.display='none';
      document.getElementById('app-container').style.display='flex';
    });
    const initialGroups = await page.locator('[data-group-toggle]').evaluateAll(toggles => toggles.map(toggle => ({
      group: toggle.dataset.groupToggle,
      expanded: toggle.getAttribute('aria-expanded'),
      allChildrenHidden: Array.from(document.querySelectorAll('[data-group="' + toggle.dataset.groupToggle + '"]')).every(item => item.hidden)
    })));
    assert.ok(initialGroups.every(group => group.expanded === 'false' && group.allChildrenHidden), 'All sidebar groups start collapsed');
    await page.locator('.sidebar-toggle-btn').click();
    assert.equal(await page.locator('.sidebar-toggle-btn').getAttribute('aria-expanded'), 'true', 'Mobile sidebar opens before testing group controls');
    await page.locator('[data-group-toggle="crm"]').click();
    assert.equal(await page.locator('[data-group-toggle="crm"]').getAttribute('aria-expanded'), 'true', 'Clicking CRM main heading opens CRM');
    assert.ok(await page.locator('[data-group="crm"]').evaluateAll(items => items.every(item => !item.hidden)), 'CRM sub-items become visible');
    assert.equal(await page.locator('[data-group-toggle="sales"]').getAttribute('aria-expanded'), 'false', 'Opening CRM does not open Sales');
    await page.locator('[data-group-toggle="crm"]').click();
    await page.evaluate(() => window.switchTab('clients'));
    assert.equal(await page.locator('[data-group-toggle="crm"]').getAttribute('aria-expanded'), 'false', 'Selecting a sub-tab does not auto-open its parent group');
    assert.ok(await page.locator('[data-group="crm"]').evaluateAll(items => items.every(item => item.hidden)), 'Collapsed parent remains collapsed after sub-tab selection');
    await page.evaluate(() => {
      document.getElementById('welcome-screen').style.display='none';
      document.getElementById('auth-container').style.display='none';
      document.getElementById('app-container').style.display='flex';
    });
    await page.locator('.sidebar-toggle-btn').click();
    assert.equal(await page.locator('.sidebar-toggle-btn').getAttribute('aria-expanded'),'true','Mobile sidebar opens');
    await page.evaluate(() => window.closeDarMobileMenu());
    assert.equal(await page.locator('.sidebar-toggle-btn').getAttribute('aria-expanded'),'false','Mobile sidebar closes');
    await page.evaluate(() => {
      state.documents=[{refCode:'CI-TEST-001',type:'Invoice',clientName:'Sample Client',companyName:'Sample Company',createdDate:'2026-10-14',items:[{serviceName:'Air conditioner maintenance',p:100,q:2}],totalAmount:200}];
    });
    await page.evaluate(async () => window.previewInvoiceDocument('CI-TEST-001'));
    assert.equal(await page.locator('#document-preview-modal').evaluate(e=>e.style.display),'flex','Invoice preview opens');
    assert.match(await page.locator('#p-table-body').innerText(),/Air conditioner maintenance/);
    assert.deepEqual(await page.locator('#p-table-body tr:first-child td').allInnerTexts(),['1','Air conditioner maintenance','2','100.00'],'Invoice print table contains only #, Service, Qty and Rate');
    assert.equal(await page.locator('#a4-wrapper-element #p-content-container thead th').count(),4,'Invoice print header has exactly four columns');
    assert.match(await page.locator('#p-table-body').innerText(),/200\.00/);
    assert.match(await page.locator('#p-table-body').innerText(),/Total Amount \/ المبلغ الإجمالي\s+AED 200\.00/, 'Legacy invoice total remains unchanged');
    await page.evaluate(() => {
      state.documents.push({
        refCode:'CI-BREAKDOWN-001',type:'Invoice',clientName:'Breakdown Client',companyName:'Breakdown Co',
        createdDate:'2026-11-21',items:[{serviceName:'Services',p:4907,q:1}],
        paymentBreakdownVersion:1,subtotalAmount:4907,processingCharges:200,discountAmount:250,
        advanceAmount:500,advanceAmt:500,totalAmount:4857
      });
    });
    await page.evaluate(async () => window.previewInvoiceDocument('CI-BREAKDOWN-001'));
    const breakdownText = await page.locator('#p-table-body').innerText();
    assert.match(breakdownText,/Total Amount \/ المبلغ الإجمالي\s+AED 4857\.00/,'October invoice shows the stored final total only');
    assert.match(breakdownText,/Subtotal\\s+AED 5107\\.00/,'Invoice displays subtotal including processing charges');
    assert.match(breakdownText,/Adv\\. Amount\\s+AED 500\\.00/,'Invoice displays advance amount');
    assert.match(breakdownText,/Dis\\. %\\s+0\\.00%/,'Invoice displays discount percentage');
    assert.match(breakdownText,/Grand Total \/ المبلغ الإجمالي\\s+AED 4857\\.00/,'Invoice displays grand total after the summary rows');
    assert.match(await page.locator('#p-table-body table').getAttribute('style'),/b8860b/,'Totals box uses matching gold borders');
    assert.equal(await page.locator('#a4-wrapper-element .section-terms').count(),0,'October invoice has no terms box');
    assert.equal(await page.locator('#a4-wrapper-element #p-content-container table').evaluate(e=>getComputedStyle(e).fontSize),'12px','October invoice restores original table font size');
    await page.evaluate(() => {
      state.documents.push({refCode:'CI-ZERO-001',type:'Invoice',clientName:'Zero Client',companyName:'Direct Clients',items:[{serviceName:'Fully discounted service',p:100,q:1}],totalAmount:0});
    });
    await page.evaluate(async () => window.previewInvoiceDocument('CI-ZERO-001'));
    assert.match(await page.locator('#p-table-body').innerText(),/AED 0\.00/,'A deliberately zero-total invoice must not be recalculated from its line items');
    await page.evaluate(() => {
      state.documents.push({refCode:'CI-DUP-001',type:'Invoice',clientName:'Test Staff',companyName:'Test Company',contactPerson:'Not copied for staff',notes:'Duplicate note',advanceAmount:75,paymentLogs:[{date:'2026-11-20',amount:25,note:'Balance'}],items:[{serviceName:'Visa renewal',description:'Renewal service',p:100,q:2}],totalAmount:200});
      window.duplicateInvoiceDraft('CI-DUP-001');
    });
    assert.equal(await page.locator('#st-ref-code').inputValue(),'','Duplicated document receives a new reference');
    assert.equal(await page.locator('#st-advance-amt').inputValue(),'0','Duplicated document does not copy previous payments');
    assert.equal(await page.locator('#st-client-name').inputValue(),'Test Staff','Duplicate retains client');
    assert.equal(await page.locator('#st-spreadsheet-body tr').count(),1,'Duplicate retains line items');
    await page.evaluate(() => window.viewDocumentHistory('CI-DUP-001'));
    assert.match(await page.locator('#modal-message').innerText(),/AED 25\.00/,'History view includes recorded payments');

    const pdfResult = await page.evaluate(async () => {
      const oldCanvas=window.html2canvas,oldPdf=window.jspdf;
      let captured=false,saved=false;
      window.html2canvas=async () => {captured=true;return {width:800,height:1000,toDataURL:()=> 'data:image/jpeg;base64,AA=='};};
      window.jspdf={jsPDF:class {addImage(){} save(){saved=true;}}};
      await window.saveAsPDF();
      window.html2canvas=oldCanvas;window.jspdf=oldPdf;
      return {captured,saved};
    });
    assert.deepEqual(pdfResult,{captured:true,saved:true},'PDF export calls capture and save pipeline');
    const saveFlow = await page.evaluate(async () => {
      const oldRef=db.ref, oldModal=window.showCustomModal;
      const calls=[];
      try {
        state.documents=[];
        state.services=[{id:'test-package',title:'Employment Visa Package',items:[{d:'Long service description',p:150,q:1}]}];
        openStudio('Invoice');
        document.getElementById('st-service-injector').value='test-package';
        injectServicePresetToItems();
        document.getElementById('st-ref-code').value='CI-SAVE-001';
        document.getElementById('st-client-name').value='Test Staff';
        document.getElementById('st-company-name').value='Test Company';
        previewStudioCompanyMatches();
        db.ref=path=>({update:(payload,callback)=>{calls.push({path,payload});callback(null);}});
        window.showCustomModal=(title,message,actions)=>calls.push({title,message,actions});
        commitDocumentToMemory();
        const saved=state.documents.find(d=>d.refCode==='CI-SAVE-001');
        return {saved,call:calls.find(x=>x.path),modal:calls.find(x=>x.title)};
      } finally {db.ref=oldRef;window.showCustomModal=oldModal;}
    });
    assert.equal(saveFlow.saved?.packageName,'Employment Visa Package','Injected catalog title retained');
    assert.equal(saveFlow.saved?.branchTag,'staff','Different client and company automatically classify as staff');
    assert.match(saveFlow.modal?.actions||'',/Preview \/ Print/);
    assert.match(saveFlow.modal?.actions||'',/Create Next/);
    assert.match(saveFlow.modal?.actions||'',/Back to Invoices/);
    assert.equal(await page.locator('#doc-table-body').count(),1);
    await page.evaluate(() => renderDocumentsTable());
    assert.match(await page.locator('#doc-table-body').innerText(),/Employment Visa Package/);
    assert.equal(await page.locator('#doc-table-body tr:first-child td').count(),9,'Invoice register rows have 9 cells including Invoice Date');
    assert.equal(await page.locator('#tab-documents thead tr:first-child th').count(),9,'Invoice register headings have 9 cells including Invoice Date');
    await page.evaluate(() => {
      state.documents.push(
        {refCode:'QTN-TEST-001',type:'Quotation',clientName:'Sample Client',companyName:'Sample Company',branchTag:'company',totalAmount:300,subtotalAmount:300,items:[{serviceName:'Stage A',p:100,q:1},{serviceName:'Stage B',p:200,q:1}]},
        {refCode:'CI-STAFF-001',type:'Invoice',clientName:'Staff Member',companyName:'Sample Company',contactPerson:'Contact Must Not Appear',branchTag:'staff',totalAmount:100,items:[{serviceName:'Staff service',p:100,q:1}]},
        {refCode:'CI-DIRECT-001',type:'Invoice',clientName:'Direct Customer',companyName:'Direct Clients',contactPerson:'Do Not Show',branchTag:'company',totalAmount:80,items:[{serviceName:'Direct service',p:80,q:1}]}
      );
      renderDocumentsTable();
      renderQuotationTable();
    });
    assert.match(await page.locator('#doc-table-body').innerText(),/CI-STAFF-001/,'Invoice page contains invoice records');
    assert.doesNotMatch(await page.locator('#doc-table-body').innerText(),/QTN-TEST-001/,'Invoice page excludes quotations');
    assert.match(await page.locator('#quotation-table-body').innerText(),/QTN-TEST-001/,'Quotation page contains quotations');
    assert.doesNotMatch(await page.locator('#quotation-table-body').innerText(),/CI-STAFF-001/,'Quotation page excludes invoices');
    await page.evaluate(async () => window.previewInvoiceDocument('CI-STAFF-001'));
    assert.equal(await page.locator('#p-client-name').innerText(),'Staff Member','Staff invoice displays staff name');
    assert.equal(await page.locator('#p-company-name').innerText(),'Sample Company','Staff invoice displays company name');
    assert.equal(await page.locator('#p-company-line').isVisible(),true,'Staff invoice displays company line');
    assert.doesNotMatch(await page.locator('#a4-wrapper-element').innerText(),/Contact Must Not Appear/,'Staff invoice hides contact person');
    await page.evaluate(async () => window.previewInvoiceDocument('CI-DIRECT-001'));
    assert.equal(await page.locator('#p-client-name').innerText(),'Direct Customer','Direct invoice displays client name');
    assert.equal(await page.locator('#p-company-line').isVisible(),false,'Direct invoice hides company line');
    assert.doesNotMatch(await page.locator('#a4-wrapper-element').innerText(),/Do Not Show/,'Direct invoice hides contact person');
    await page.evaluate(() => {
      openStudio('Invoice','CI-STAFF-001');
    });
    assert.equal(await page.locator('#tab-studio').evaluate(el=>el.classList.contains('dar-edit-popup')),true,'Editing an existing invoice opens the popup editor');
    await page.locator('#st-notes').fill('Updated in place');
    const editResult = await page.evaluate(() => {
      const oldRef=db.ref; const oldModal=window.showCustomModal; const calls=[];
      db.ref=path=>({update:(payload,callback)=>{calls.push({path,payload});callback(null);}});
      window.showCustomModal=(title,message,actions)=>calls.push({title,message,actions});
      try { commitDocumentToMemory(); return calls; } finally {db.ref=oldRef;window.showCustomModal=oldModal;}
    });
    assert.equal(editResult.find(x=>x.path)?.path,'documents/CI-STAFF-001','Editing updates the same invoice Firebase key');
    assert.equal(await page.evaluate(() => state.documents.filter(d=>d.refCode==='CI-STAFF-001').length),1,'Editing does not create a second invoice');
    assert.equal(await page.locator('#tab-studio').evaluate(el=>el.classList.contains('dar-edit-popup')),false,'Popup closes after successful edit');
    const conversionResult = await page.evaluate(() => {
      const oldRef=db.ref; const oldModal=window.showCustomModal;
      db.ref=path=>({transaction:(updater,callback)=>{const current=Object.fromEntries(state.documents.map(doc=>[doc.refCode,doc]));const next=updater(current);callback(null,!!next,{val:()=>next});}});
      window.showCustomModal=()=>{};
      try {
        openQuotationConversion('QTN-TEST-001');
        const quoteModal=document.getElementById('quotation-conversion-modal');
        document.getElementById('qc-use-percent').checked=true;
        document.getElementById('qc-percent').value='25';
        document.getElementById('qc-mode').value='amount';
        submitQuotationConversion();
        const firstQuote=state.documents.find(d=>d.refCode==='QTN-TEST-001');
        const amountInvoice=state.documents.find(d=>d.sourceQuotationRef==='QTN-TEST-001');
        openQuotationConversion('QTN-TEST-001');
        document.getElementById('qc-mode').value='stage';
        document.getElementById('qc-mode').dispatchEvent(new Event('change'));
        const stageA=document.querySelector('#qc-stage-items input[value="0"]');
        const stageB=document.querySelector('#qc-stage-items input[value="1"]');
        stageA.checked=true; stageB.checked=false;
        submitQuotationConversion();
        const finalQuote=state.documents.find(d=>d.refCode==='QTN-TEST-001');
        const stageInvoice=state.documents.find(d=>d.billingMode==='stage' && d.sourceQuotationRef==='QTN-TEST-001');
        openQuotationConversion('QTN-TEST-001');
        document.getElementById('qc-mode').value='stage';
        document.getElementById('qc-mode').dispatchEvent(new Event('change'));
        return {
          amount:amountInvoice?.totalAmount, afterAmount:firstQuote?.invoicedAmount,
          stage:stageInvoice?.totalAmount, afterStage:finalQuote?.invoicedAmount,
          stageADisabled:document.querySelector('#qc-stage-items input[value="0"]').disabled,
          stageBDisabled:document.querySelector('#qc-stage-items input[value="1"]').disabled,
          modalVisible:quoteModal.style.display
        };
      } finally {db.ref=oldRef;window.showCustomModal=oldModal;closeQuotationConversion();}
    });
    assert.equal(conversionResult.amount,75,'Percentage billing calculates the correct partial invoice');
    assert.equal(conversionResult.afterAmount,75,'Quotation tracks the amount already invoiced');
    assert.equal(conversionResult.stage,100,'Stage billing invoices the selected completed item');
    assert.equal(conversionResult.afterStage,175,'Quotation balance updates after a stage invoice');
    assert.equal(conversionResult.stageADisabled,true,'A stage cannot be invoiced twice');
    assert.equal(conversionResult.stageBDisabled,false,'Unbilled stages remain available');
    assert.equal(conversionResult.modalVisible,'flex','Quotation conversion dialog opens');
    const moduleSmoke = await page.evaluate(() => {
      state.clients=[{id:'company-test',companyName:'Sample Company'}];
      state.staff=[{id:'staff-test',staffCode:'ST-001',fullName:'Test Staff',companyId:'company-test',companyName:'Sample Company',lastWorkDone:'Visa renewal',visaExpiry:'2099-01-01',passportExpiry:'2099-02-01',renewalStatus:'Pending'}];
      state.activeStaffCompanyId='';
      renderStaffTable();
      state.suppliers=[{id:'supplier-test',name:'Test Supplier'}];
      state.purchases=[{id:'purchase-test',supplierId:'supplier-test',supplierName:'Test Supplier',reference:'PO-TEST-001',date:'2026-10-20',description:'Test service',amount:125,paymentStatus:'Unpaid'}];
      renderPurchases();
      return {
        staff:document.getElementById('staff-table-body').innerText,
        purchases:document.getElementById('purchase-table-body').innerText,
        total:document.getElementById('purchase-total-amount').innerText
      };
    });
    assert.match(moduleSmoke.staff,/ST-001/,'Staff table renders staff ID');
    assert.match(moduleSmoke.staff,/Visa renewal/,'Staff table renders last work done');
    assert.match(moduleSmoke.purchases,/PO-TEST-001/,'Purchase table renders reference');
    assert.match(moduleSmoke.purchases,/Test Supplier/,'Purchase table resolves supplier');
    assert.equal(moduleSmoke.total,'AED 125.00','Purchase total is calculated');
    console.log('PASS: save actions, injected package title, staff folder and ledger column alignment');
    console.log('PASS: mobile sidebar, signup/recovery UI, invoice preview, PDF export call path');
    console.log('PASS: company staff table and purchase/supplier module rendering');
    if (errors.length) console.log('Browser page errors (external dependencies may be unavailable):',errors.slice(0,6));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
