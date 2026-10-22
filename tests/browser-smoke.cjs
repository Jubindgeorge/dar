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
    assert.match(await page.locator('#p-table-body').innerText(),/200\.00/);
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
    assert.match(saveFlow.modal?.actions||'',/Back to Ledger/);
    assert.equal(await page.locator('#doc-table-body').count(),1);
    await page.evaluate(() => renderDocumentsTable());
    assert.match(await page.locator('#doc-table-body').innerText(),/Employment Visa Package/);
    assert.equal(await page.locator('#doc-table-body tr:first-child td').count(),8,'Ledger rows have 8 cells');
    assert.equal(await page.locator('#tab-documents thead tr:first-child th').count(),8,'Ledger headings have 8 cells');
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
