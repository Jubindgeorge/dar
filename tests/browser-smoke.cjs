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
    assert.equal(await page.locator('#staff-import-company').count(),1,'Staff import company selector exists');
    assert.equal(await page.locator('#staff-import-file').count(),1,'Staff import file input exists');
    assert.equal(await page.locator('#staff-import-file').isDisabled(),true,'Staff import stays disabled until an existing company is selected');
    const staffRendererType = await page.evaluate(() => typeof window.renderStaffTable);
    if (staffRendererType !== 'function') throw new Error('Staff module did not initialize. Browser errors: '+errors.join(' | '));
    await page.evaluate(() => {
      state.clients=[{id:'import-company-test',companyName:'Import Test Company'}];
      window.renderStaffTable();
      document.getElementById('staff-import-company').value='import-company-test';
      updateStaffImportAvailability();
    });
    assert.equal(await page.locator('#staff-import-file').isDisabled(),false,'Excel/PDF file selection is enabled after choosing a company');
    assert.equal(await page.locator('#staff-import-button').isDisabled(),true,'Import action stays disabled until a file preview is ready');
    const mohrePreview = await page.evaluate(async () => {
      const page1Items=[];
      const page2Items=[];
      const make=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
      const employee=(target,index,y,person=true)=>{
        const passport=index===16?'12040746':'P'+String(1000000+index);
        const name=index===0?'MOHAMMAD IDRIS MOHAMMAD MUNSHI':index===16?'SUJAN BHANDARI':'TEST EMPLOYEE '+String(index+1).padStart(2,'0');
        const nationality=index===16?'NEPAL':index===10?'GHANA':'INDIA';
        const card=String(153447450+index);
        target.push(
          make(passport,40,y),
          make(name,110,y),
          make('NEW ELECTRONIC WORK PERMIT',250,y),
          make(index===21?'Marketing Manager':'Building Labourer',365,y),
          make(nationality,435,y),
          make(card,485,y),
          make('14/09/2028',484,y-10),
          make('Limited',546,y)
        );
        if(person)target.push(make('316010402646'+String(47+index).padStart(2,'0'),137,y-20));
      };
      page1Items.push(make('The List Of Employees',20,760),make('Passport Number',35,730));
      for(let index=0;index<16;index++)employee(page1Items,index,680-index*35,index!==15);
      // The 16th employee's Person Labour No. is printed at the top of page 2.
      page2Items.push(make('20010038231120',137,720));
      for(let index=16;index<22;index++)employee(page2Items,index,700-(index-16)*35,true);
      page2Items.push(make('Total Number of Employees : 22',20,400));
      const pageItems=[page1Items,page2Items];
      window.pdfjsLib={
        GlobalWorkerOptions:{},
        getDocument:()=>({promise:Promise.resolve({
          numPages:2,
          getPage:async pageNo=>({getTextContent:async()=>({items:pageItems[pageNo-1]})})
        })})
      };
      await window.previewStaffImportFile({name:'mohre-test.pdf',arrayBuffer:async()=>new ArrayBuffer(0)});
      return document.getElementById('staff-import-preview').innerText;
    });
    assert.match(mohrePreview,/22 rows detected/,'Coordinate-based MOHRE parser detects all 22 employees');
    assert.match(mohrePreview,/MOHAMMAD IDRIS MOHAMMAD MUNSHI/,'MOHRE parser extracts the first employee name');
    assert.match(mohrePreview,/SUJAN BHANDARI/,'MOHRE parser extracts page-two employee name');
    assert.match(mohrePreview,/12040746/,'MOHRE parser preserves numeric-only passport numbers');
    assert.match(mohrePreview,/31601040264651/,'MOHRE parser keeps a row-level Person Labour No.');
    assert.match(mohrePreview,/20010038231120/,'MOHRE parser carries the page-two leading Person Labour No. to the final page-one employee');
    const pipeMohrePreview = await page.evaluate(async () => {
      const rows = [
        'The List Of Employees',
        'Passport Number | Person Name | Card Type | Job Name | Nationality | Card Number | Contract Type',
        'AB123456 | JOHN SMITH',
        'جون سميث | NEW ELECTRONIC WORK PERMIT | Building Labourer | INDIA | 123456789 | 31/08/2028 | Limited',
        'Scan QR to verify RP248266473AE',
        'CD987654 | MARY JONES | PRE APPROVAL FOR WORK PERMIT | Civil Engineer | GHANA | 987654321 | 12/09/2027 | Limited',
        'Total Number of Employees: 2',
        'Page 1/1'
      ];
      window.pdfjsLib = {
        GlobalWorkerOptions:{},
        getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({
          getTextContent:async()=>({items:rows.map((str,index)=>({str,transform:[1,0,0,1,10,800-index*20]}))})
        })})})
      };
      await window.previewStaffImportFile({name:'pipe-mohre-test.pdf',arrayBuffer:async()=>new ArrayBuffer(0)});
      return document.getElementById('staff-import-preview').innerText;
    });
    assert.match(pipeMohrePreview,/2 rows detected/,'Pipe-delimited MOHRE records are grouped by passport anchors, not line count');
    assert.match(pipeMohrePreview,/JOHN SMITH/,'Wrapped English name is retained in the first pipe record');
    assert.match(pipeMohrePreview,/MARY JONES/,'Second passport anchor starts a separate employee');
    assert.match(pipeMohrePreview,/123456789/,'Pipe parser extracts the labour card number');
    assert.match(pipeMohrePreview,/31\/08\/2028|2028-08-31/,'Pipe parser extracts the labour card expiry');
    const staffUpsert = await page.evaluate(async () => {
      const originalRef=db.ref;
      const originalAuth=window.firebase.auth;
      const writes=[];
      state.staff=[
        {id:'staff-same',staffCode:'ST-100',staffId:'ST-100',companyId:'import-company-test',companyName:'Import Test Company',personNumber:'11111111111111',fullName:'ALPHA STAFF',nationality:'INDIA',passportNumber:'P100',labourCardNumber:'L100',labourCardExpiry:'2028-08-31',linkedInvoiceRef:'INV-KEEP-1',linkedQuotationRef:'QTN-KEEP-1'},
        {id:'staff-update',staffCode:'ST-101',staffId:'ST-101',companyId:'import-company-test',companyName:'Import Test Company',personNumber:'22222222222222',fullName:'BETA STAFF',nationality:'',passportNumber:'P200',labourCardNumber:'L200',labourCardExpiry:'',linkedInvoiceRef:'INV-KEEP-2',linkedQuotationRef:'QTN-KEEP-2'},
        {id:'other-company-staff',staffCode:'STAFF-0001',staffId:'STAFF-0001',companyId:'another-company',companyName:'Another Company',fullName:'OTHER COMPANY STAFF'}
      ];
      state.documents=[
        {refCode:'INV-ALPHA',type:'Invoice',clientName:'ALPHA STAFF',companyName:'Import Test Company',totalAmount:1250},
        {refCode:'QTN-GAMMA',type:'Quotation',clientName:'GAMMA STAFF',companyName:'Import Test Company',totalAmount:900}
      ];
      window.XLSX={read:()=>({SheetNames:['Staff'],Sheets:{Staff:{}}}),utils:{sheet_to_json:()=>[
        ['Staff ID','Person Labour No','Person Name','Nationality','Passport Number','Card Number','Card Expiry'],
        ['AUTO-ALPHA','11111111111111','ALPHA STAFF','INDIA','P100','L100','31/08/2028'],
        ['','22222222222222','BETA STAFF','INDIA','P200','L200','30/09/2028'],
        ['','33333333333333','GAMMA STAFF','NEPAL','P300','L300','30/10/2028']
      ]}};
      db.ref=function(path){
        if(path==='staff')return {push:()=>({key:'staff-new'})};
        if(!path)return {update:(payload,callback)=>{writes.push(payload);Object.entries(payload).forEach(([key,value])=>{const parts=key.split('/');if(parts[0]==='staff'&&parts.length===2){const id=parts[1];state.staff.push({id,...value});}else if(parts[0]==='staff'&&parts.length===3){const record=state.staff.find(item=>item.id===parts[1]);if(record)record[parts[2]]=value;}else if(parts[0]==='documents'&&parts.length===3){const doc=state.documents.find(item=>item.refCode===parts[1]);if(doc)doc[parts[2]]=value;}});callback(null);}};
        return originalRef(path);
      };
      try {
        await window.previewStaffImportFile({name:'staff.xlsx',arrayBuffer:async()=>new ArrayBuffer(0)});
        const preview=document.getElementById('staff-import-preview').innerText;
        window.commitStaffImport();
        const importModal=document.getElementById('custom-modal');
        if(importModal) importModal.style.display='none';
        return {
          preview,writes:writes[0],staff:state.staff,
          buttonDisabled:document.getElementById('staff-import-button').disabled
        };
      } finally {db.ref=originalRef;window.XLSX=undefined;}
    });
    assert.match(staffUpsert.preview,/1 new · 1 updates · 1 unchanged/,'Import preview distinguishes new, changed and identical staff');
    assert.ok(!Object.keys(staffUpsert.writes||{}).some(path=>path.startsWith('staff/staff-same/')&&!['staff/staff-same/linkedDocumentRefs'].includes(path)),'Identical staff identity fields stay unchanged while missing document links may be added');
    assert.equal(staffUpsert.writes?.['staff/staff-update/nationality'],'INDIA','Missing existing nationality is filled from import');
    assert.equal(staffUpsert.writes?.['staff/staff-update/labourCardExpiry'],'2028-09-30','Changed/missing labour card expiry is updated');
    assert.ok(staffUpsert.writes?.['staff/staff-new'],'New employee is created');
    assert.equal(staffUpsert.staff.find(item=>item.id==='staff-same')?.staffCode,'ST-100','Mismatched imported Staff ID does not replace existing canonical code');
    assert.equal(staffUpsert.staff.find(item=>item.id==='staff-new')?.staffCode,'STAFF-0001','Staff numbering starts independently for each company, even when another company uses the same code');
    assert.equal(staffUpsert.writes?.['documents/INV-ALPHA/staffId'],'staff-same','Existing invoice is linked by company and exact person name');
    assert.equal(staffUpsert.writes?.['documents/INV-ALPHA/staffCode'],'ST-100','Invoice receives the canonical DAR Staff ID');
    assert.equal(staffUpsert.writes?.['documents/QTN-GAMMA/staffId'],'staff-new','Existing quotation is linked to the newly imported person');
    assert.equal(staffUpsert.writes?.['documents/INV-ALPHA/totalAmount'],undefined,'Invoice financial amounts are never changed by staff linking');
    assert.equal(staffUpsert.staff.find(item=>item.id==='staff-same')?.linkedInvoiceRef,'INV-KEEP-1','Identical employee invoice link remains intact');
    assert.equal(staffUpsert.staff.find(item=>item.id==='staff-same')?.linkedQuotationRef,'QTN-KEEP-1','Identical employee quotation link remains intact');
    assert.equal(staffUpsert.staff.find(item=>item.id==='staff-update')?.linkedInvoiceRef,'INV-KEEP-2','Updated employee invoice link remains intact');
    assert.equal(staffUpsert.staff.find(item=>item.id==='staff-update')?.linkedQuotationRef,'QTN-KEEP-2','Updated employee quotation link remains intact');
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
    assert.deepEqual(await page.locator('#p-table-body > tr:first-child > td').allInnerTexts(),['1','Air conditioner maintenance','2','100.00'],'Invoice print table contains only #, Service, Qty and Rate');
    assert.equal(await page.locator('#a4-wrapper-element #p-content-container thead th').count(),4,'Invoice print header has exactly four columns');
    assert.match(await page.locator('#p-table-body').innerText(),/200\.00/);
    assert.match(await page.locator('#p-table-body').innerText(),/Grand Total \/ المبلغ الإجمالي\s+AED 200\.00/, 'Legacy invoice total remains unchanged');
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
    assert.match(breakdownText,/Grand Total \/ المبلغ الإجمالي\s+AED 4857\.00/,'October invoice shows the stored final total only');
    assert.match(breakdownText,/Subtotal\s+AED 5107\.00/,'Invoice displays subtotal including processing charges');
    assert.match(breakdownText,/Adv\. Amount\s+AED 500\.00/,'Invoice displays advance amount');
    assert.match(breakdownText,/Dis\. %\s+4\.90%/,'Invoice displays discount percentage');
    assert.match(breakdownText,/Grand Total \/ المبلغ الإجمالي\s+AED 4857\.00/,'Invoice displays grand total after the summary rows');
    assert.match(await page.locator('#p-table-body table').getAttribute('style'),/b8860b/,'Totals box uses matching gold borders');
    assert.equal(await page.locator('#a4-wrapper-element .section-terms').isVisible(),false,'October invoice hides its empty terms section');
    assert.equal(await page.locator('#a4-wrapper-element #p-content-container > table').evaluate(e=>getComputedStyle(e).fontSize),'10px','October invoice table font matches the totals summary size');
    const fitThreshold = await page.evaluate(() => {
      const page=document.getElementById('a4-wrapper-element');
      const body=document.getElementById('p-table-body');
      const makeRows=count=>{body.innerHTML='';for(let i=0;i<count;i++){const tr=document.createElement('tr');tr.innerHTML='<td>1</td><td>Test service '+i+'</td><td>1</td><td>100.00</td>';body.appendChild(tr);}};
      makeRows(16); const sixteen=window.applyDarDocumentPrintFit(page); const sixteenClass=page.classList.contains('dar-single-page-fit');
      makeRows(17); const seventeen=window.applyDarDocumentPrintFit(page); const seventeenClass=page.classList.contains('dar-single-page-fit');
      return {sixteen,seventeen,sixteenClass,seventeenClass};
    });
    assert.ok(fitThreshold.sixteen>0 && fitThreshold.sixteen<=1,'Sixteen rows receive a valid single-page fit scale');
    assert.equal(fitThreshold.sixteenClass,true,'Sixteen rows are marked for single-page output');
    assert.equal(fitThreshold.seventeen,1,'Seventeen rows retain normal scale for pagination');
    assert.equal(fitThreshold.seventeenClass,false,'Seventeen rows use multi-page output');
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
      window.jspdf={jsPDF:class {addImage(){} setDrawColor(){} setLineWidth(){} rect(){} save(){saved=true;}}};
      await window.saveAsPDF();
      window.html2canvas=oldCanvas;window.jspdf=oldPdf;
      return {captured,saved};
    });
    assert.deepEqual(pdfResult,{captured:true,saved:true},'PDF export calls capture and save pipeline');
    await page.emulateMedia({media:'print'});
    const printLayout = await page.evaluate(() => ({
      modalDisplay:getComputedStyle(document.getElementById('document-preview-modal')).display,
      toolbarDisplay:getComputedStyle(document.querySelector('#document-preview-modal .preview-modal-toolbar')).display,
      pageWidth:parseFloat(getComputedStyle(document.getElementById('a4-wrapper-element')).width)
    }));
    assert.equal(printLayout.modalDisplay,'block','Print layout exposes only the document preview');
    assert.equal(printLayout.toolbarDisplay,'none','Print layout hides preview toolbar controls');
    const fixedFrame = await page.evaluate(() => ({position:getComputedStyle(document.getElementById('document-preview-modal'),'::after').position,inset:getComputedStyle(document.getElementById('document-preview-modal'),'::after').inset,border:getComputedStyle(document.getElementById('document-preview-modal'),'::after').borderTopWidth}));
    assert.equal(fixedFrame.position,'fixed','Print gold frame is fixed to the physical sheet, not the content height');
    assert.ok(Math.abs(parseFloat(fixedFrame.inset)-3.77953)<0.01,'Print gold frame is inset exactly 1mm (3.77953 CSS px) from all four paper edges');
    assert.equal(fixedFrame.border,'1px','Print gold frame is exactly 1px');
    assert.ok(printLayout.pageWidth>0,'A4 document retains a printable width');
    await page.emulateMedia({media:'screen'});
    const printAction = await page.evaluate(() => {
      const original=window.print; let called=false; window.print=()=>{called=true;};
      try { document.querySelector('#document-preview-modal .preview-modal-toolbar button:nth-of-type(2)').click(); return called; }
      finally {window.print=original;}
    });
    assert.equal(printAction,true,'Print button invokes the browser print action');
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
        db.ref=path=>({
          update:(payload,callback)=>{calls.push({path,payload});callback(null);},
          transaction:(updater,callback)=>{
            const current=path==='documents' ? Object.fromEntries(state.documents.map(doc=>[doc.refCode,doc])) : state.documents.find(doc=>('documents/'+doc.refCode)===path) || null;
            const next=updater(current);
            calls.push({path,payload:next});
            callback(null,next!==undefined,{val:()=>next});
          }
        });
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
    assert.equal(await page.evaluate(() => getAutomaticWorkBranch(state.documents.find(d=>d.refCode==='CI-DIRECT-001'))),'unassigned','Direct clients are not classified as company staff');
    await page.evaluate(async () => {
      state.documents.push({refCode:'CI-COMPANY-001',type:'Invoice',clientName:'Sample Company',companyName:'Sample Company',contactPerson:'Hidden Company Contact',branchTag:'company',totalAmount:50,items:[{serviceName:'Company work',p:50,q:1}]});
      await window.previewInvoiceDocument('CI-COMPANY-001');
    });
    assert.equal(await page.locator('#p-client-name').innerText(),'Sample Company','Company invoice displays company name only');
    assert.equal(await page.locator('#p-company-line').isVisible(),false,'Company invoice does not show contact person line');
    assert.doesNotMatch(await page.locator('#a4-wrapper-element').innerText(),/Hidden Company Contact/,'Company invoice hides contact person');
    await page.evaluate(() => {
      openStudio('Invoice','CI-STAFF-001');
    });
    assert.equal(await page.locator('#tab-studio').evaluate(el=>el.classList.contains('dar-edit-popup')),true,'Editing an existing invoice opens the popup editor');
    await page.locator('#st-notes').fill('Updated in place');
    const editResult = await page.evaluate(() => {
      const oldRef=db.ref; const oldModal=window.showCustomModal; const calls=[];
      db.ref=path=>({
        update:(payload,callback)=>{calls.push({path,payload});callback(null);},
        transaction:(updater,callback)=>{
          const current=state.documents.find(doc=>('documents/'+doc.refCode)===path) || null;
          const next=updater(current);
          calls.push({path,payload:next});
          callback(null,next!==undefined,{val:()=>next});
        }
      });
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
    const linkedEditResult = await page.evaluate(() => {
      const oldRef=db.ref; const oldModal=window.showCustomModal;
      db.ref=path=>({transaction:(updater,callback)=>{const current=Object.fromEntries(state.documents.map(doc=>[doc.refCode,doc]));const next=updater(current);callback(null,!!next,{val:()=>next});}});
      window.showCustomModal=()=>{};
      try {
        const stageInvoice=state.documents.find(d=>d.billingMode==='stage' && d.sourceQuotationRef==='QTN-TEST-001');
        openStudio('Invoice',stageInvoice.refCode);
        document.querySelector('#st-spreadsheet-body .st-item-price').value='90';
        commitDocumentToMemory();
        return {
          quoteInvoiced:state.documents.find(d=>d.refCode==='QTN-TEST-001').invoicedAmount,
          invoiceTotal:state.documents.find(d=>d.refCode===stageInvoice.refCode).totalAmount
        };
      } finally {db.ref=oldRef;window.showCustomModal=oldModal;}
    });
    assert.equal(linkedEditResult.invoiceTotal,90,'Editing a converted invoice updates its existing record');
    assert.equal(linkedEditResult.quoteInvoiced,165,'Editing a converted invoice adjusts the source quotation balance');
    const moduleSmoke = await page.evaluate(() => {
      state.clients=[{id:'company-test',companyName:'Sample Company'}];
      state.staff=[{id:'staff-test',staffCode:'ST-001',fullName:'Test Staff',companyId:'company-test',companyName:'Sample Company',lastWorkDone:'Visa renewal',visaExpiry:'2099-01-01',passportExpiry:'2099-02-01',renewalStatus:'Pending'}];
      state.activeStaffCompanyId='company-test';
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
    assert.match(moduleSmoke.staff,/Sample Company/,'Staff table renders company');
    assert.match(moduleSmoke.staff,/Pending/,'Staff table renders renewal status');
    assert.match(moduleSmoke.purchases,/PO-TEST-001/,'Purchase table renders reference');
    assert.match(moduleSmoke.purchases,/Test Supplier/,'Purchase table resolves supplier');
    assert.equal(moduleSmoke.total,'AED 125.00','Purchase total is calculated');
    const staffLedgerSmoke = await page.evaluate(() => {
      state.clients=[{id:'company-test',companyName:'Sample Company'},{id:'company-other',companyName:'Other Company'}];
      state.staff=[
        {id:'staff-test',staffCode:'STAFF-0001',fullName:'Test Staff',companyId:'company-test',companyName:'Sample Company',personNumber:'P-100'},
        {id:'staff-other',staffCode:'STAFF-0001',fullName:'Other Staff',companyId:'company-other',companyName:'Other Company',personNumber:'P-200'}
      ];
      renderCompanyStaffLedger();
      const all=document.getElementById('ledger-company-staff-tbody').innerText;
      document.getElementById('ledger-staff-company').value='company-test';
      renderCompanyStaffLedger();
      const filtered=document.getElementById('ledger-company-staff-tbody').innerText;
      return {all,filtered,count:document.getElementById('ledger-staff-count').innerText};
    });
    assert.match(staffLedgerSmoke.all,/Test Staff/,'Accounts Ledger shows saved staff');
    assert.match(staffLedgerSmoke.all,/Other Staff/,'Accounts Ledger shows staff from other companies');
    assert.match(staffLedgerSmoke.filtered,/Test Staff/,'Company filter shows selected company staff');
    assert.doesNotMatch(staffLedgerSmoke.filtered,/Other Staff/,'Company filter excludes other companies');
    assert.equal(staffLedgerSmoke.count,'1 staff','Company staff count follows selected company');
    const companyClientSmoke = await page.evaluate(() => {
      state.clients=[{id:'client-flow-company',companyName:'Client Flow Company'}];
      state.companyClients=[{id:'saved-client-1',companyId:'client-flow-company',companyName:'Client Flow Company',name:'Saved Account Holder'}];
      state.documents=[{refCode:'INV-HISTORY-1',type:'Invoice',companyName:'Client Flow Company',clientName:'Historical Account Holder'}];
      state.selectedCompanyClientId='';
      document.getElementById('st-company-name').value='Client Flow Company';
      document.getElementById('st-client-name').value='Saved Account Holder';
      populateCompanyClients();
      const options=[...document.getElementById('st-company-client-selector').options].map(option=>option.textContent);
      const unlinkedValue=document.getElementById('st-company-client-selector').value;
      selectCompanyClient('saved-client-1');
      const linkedId=state.selectedCompanyClientId;
      populateCompanyClients();
      const linkedValue=document.getElementById('st-company-client-selector').value;
      document.getElementById('st-company-name').value='Another Company';
      populateCompanyClients();
      const changedCompanyValue=document.getElementById('st-company-client-selector').value;
      return {options,unlinkedValue,linkedId,linkedValue,changedCompanyValue};
    });
    assert.ok(companyClientSmoke.options.includes('Saved Account Holder'),'Studio lists saved clients for the selected company');
    assert.ok(companyClientSmoke.options.includes('Historical Account Holder'),'Studio lists clients found in historical invoices');
    assert.equal(companyClientSmoke.unlinkedValue,'','Matching display name does not falsely imply a saved-client link');
    assert.equal(companyClientSmoke.linkedId,'saved-client-1','Explicit saved-client selection stores the linked ID');
    assert.equal(companyClientSmoke.linkedValue,'saved-client-1','Explicit saved-client selection remains selected after refresh');
    assert.equal(companyClientSmoke.changedCompanyValue,'','Changing company clears the previous company client selection');
    const paymentCompatibilitySmoke = await page.evaluate(() => {
      const legacyObjectLogs={ '0':{amount:100,date:'2026-11-01'}, '1':{amount:20,date:'2026-11-02'} };
      const legacyIncluded={totalAmount:200,advanceAmount:100,paymentLogs:{'0':{amount:100}}};
      const legacySeparate={totalAmount:200,advanceAmount:100,paymentLogs:{'0':{amount:50}}};
      const explicitSeparate={totalAmount:200,advanceAmount:50,advanceIncludedInPaymentLogs:false,paymentLogs:[{amount:100}]};
      const explicitIncluded={totalAmount:200,advanceAmount:50,advanceIncludedInPaymentLogs:true,paymentLogs:[{amount:100}]};
      return {
        normalizedCount:getDarDocumentPaymentLogs({paymentLogs:legacyObjectLogs}).length,
        legacyIncluded:getDarDocumentPaidAmount(legacyIncluded),
        legacySeparate:getDarDocumentPaidAmount(legacySeparate),
        explicitSeparate:getDarDocumentPaidAmount(explicitSeparate),
        explicitIncluded:getDarDocumentPaidAmount(explicitIncluded),
        status:getDarDocumentPaymentStatus(legacyIncluded)
      };
    });
    assert.equal(paymentCompatibilitySmoke.normalizedCount,2,'Legacy keyed payment objects normalize without losing entries');
    assert.equal(paymentCompatibilitySmoke.legacyIncluded,100,'Legacy advance already present in payment logs is not double-counted');
    assert.equal(paymentCompatibilitySmoke.legacySeparate,100,'Ambiguous legacy records use the higher confirmed amount');
    assert.equal(paymentCompatibilitySmoke.explicitSeparate,150,'Explicitly separate advance and payments are added');
    assert.equal(paymentCompatibilitySmoke.explicitIncluded,100,'Explicitly included advance is not added twice');
    assert.equal(paymentCompatibilitySmoke.status,'partial','Payment status uses the shared legacy-safe amount');
    const legacyLedgerSmoke = await page.evaluate(() => {
      state.documents=[{refCode:'LEGACY-PAY-001',type:'Invoice',clientName:'Legacy Client',companyName:'Legacy Company',totalAmount:200,advanceAmount:100,paymentLogs:{'0':{amount:100,date:'2026-11-01',note:'Advance recorded in legacy log'}}}];
      renderAccountsLedgerDetail('LEGACY-PAY-001');
      return {
        paid:document.getElementById('acc-card-payments').innerText,
        remaining:document.getElementById('acc-card-remaining').innerText,
        rows:document.getElementById('acc-payment-logs-tbody').innerText
      };
    });
    assert.equal(legacyLedgerSmoke.paid,'AED 100.00','Accounts Ledger does not double-count legacy advance and payment logs');
    assert.equal(legacyLedgerSmoke.remaining,'AED 100.00','Accounts Ledger computes the correct legacy outstanding balance');
    assert.match(legacyLedgerSmoke.rows,/Advance recorded in legacy log/,'Accounts Ledger renders legacy keyed payment rows');
    assert.doesNotMatch(legacyLedgerSmoke.rows,/Advance Payment/,'Accounts Ledger does not display a duplicate advance row');
    const legacyOverlapSmoke = await page.evaluate(async () => {
      const oldRef=db.ref;
      state.documents=[{refCode:'LEGACY-OVERLAP-001',type:'Invoice',clientName:'Legacy Client',companyName:'Legacy Company',totalAmount:200,advanceAmount:100,paymentLogs:[{amount:50,date:'2026-11-01',note:'Old payment'}]}];
      renderAccountsLedgerMaster();
      const beforeRowTotal=[...document.querySelectorAll('#acc-payment-logs-tbody tr')].map(row=>Number(row.cells[1]?.textContent.replace(/[^0-9.]/g,''))||0).reduce((sum,value)=>sum+value,0);
      document.getElementById('acc-invoice-select').value='LEGACY-OVERLAP-001';
      document.getElementById('pay-input-date').value='2026-11-24';
      document.getElementById('pay-input-amount').value='100';
      document.getElementById('pay-input-note').value='Final payment';
      db.ref=path=>({transaction:(update,complete)=>{
        const current=JSON.parse(JSON.stringify(state.documents.find(doc=>('documents/'+doc.refCode)===path)));
        const next=update(current);
        if(next) Object.assign(state.documents.find(doc=>doc.refCode==='LEGACY-OVERLAP-001'),next);
        complete(null,next!==undefined,{val:()=>JSON.parse(JSON.stringify(next))});
      }});
      try {
        await savePaymentLogData();
        const saved=state.documents[0];
        const rowAmounts=[...document.querySelectorAll('#acc-payment-logs-tbody tr')].map(row=>Number(row.cells[1]?.textContent.replace(/[^0-9.]/g,''))||0);
        return {beforeRowTotal,paid:getDarDocumentPaidAmount(saved),advanceAmount:saved.advanceAmount,paymentAdvanceBalance:saved.paymentAdvanceBalance,marker:saved.advanceIncludedInPaymentLogs,rowTotal:rowAmounts.reduce((sum,value)=>sum+value,0)};
      } finally {db.ref=oldRef;}
    });
    assert.equal(legacyOverlapSmoke.beforeRowTotal,100,'Legacy payment rows equal the recognized opening balance before a new payment');
    assert.equal(legacyOverlapSmoke.paid,200,'Adding a payment preserves the recognized legacy opening balance');
    assert.equal(legacyOverlapSmoke.advanceAmount,100,'Legacy invoice advance display amount is not rewritten');
    assert.equal(legacyOverlapSmoke.paymentAdvanceBalance,50,'Only the unlogged legacy advance portion is carried forward');
    assert.equal(legacyOverlapSmoke.marker,false,'Legacy balance is explicitly reconciled as a separate opening balance');
    assert.equal(legacyOverlapSmoke.rowTotal,200,'Visible payment rows add up to the recognized paid amount');
    const zeroTotalLedgerSmoke = await page.evaluate(() => {
      state.documents=[{refCode:'ZERO-TOTAL-LEDGER',type:'Invoice',clientName:'Zero Total Client',companyName:'Zero Total Company',totalAmount:0,totalAmt:350,total:350,amount:350,advanceAmount:0,paymentLogs:[]}];
      document.getElementById('acc-invoice-select').value='';
      renderAccountsLedgerMaster();
      return {
        option:document.getElementById('acc-invoice-select').options[1]?.textContent || '',
        total:document.getElementById('acc-card-total').innerText,
        remaining:document.getElementById('acc-card-remaining').innerText
      };
    });
    assert.match(zeroTotalLedgerSmoke.option,/AED 0\.00/,'Invoice selector respects an explicit zero total over stale legacy aliases');
    assert.equal(zeroTotalLedgerSmoke.total,'AED 0.00','Accounts Ledger total respects explicit zero');
    assert.equal(zeroTotalLedgerSmoke.remaining,'AED 0.00','Accounts Ledger balance respects explicit zero');
    console.log('PASS: zero-value invoice totals are preserved across ledger views');
    console.log('PASS: shared payment totals, legacy keyed payment history and advance double-count protection');
    console.log('PASS: Accounts Ledger renders legacy keyed payment history without duplicate advance rows');
    const targetedSaveSmoke = await page.evaluate(async () => {
      const originalRef=db.ref;
      const writes=[];
      db.ref=(path)=>({update:async patch=>{writes.push({path,patch});}});
      let broadSaveRejected=false;
      try { await saveStateToFirebase(); } catch { broadSaveRejected=true; }
      try { await saveStateToFirebase('documents','TARGETED-INVOICE',{paymentLogs:[]}); }
      finally { db.ref=originalRef; }
      return {writes,broadSaveRejected};
    });
    assert.equal(targetedSaveSmoke.broadSaveRejected,true,'A save without an explicit record target is rejected');
    assert.deepEqual(targetedSaveSmoke.writes.map(write=>write.path),['documents/TARGETED-INVOICE'],'Saving one record writes only that exact Firebase path');
    assert.deepEqual(targetedSaveSmoke.writes[0].patch,{paymentLogs:[]},'Targeted save sends only the changed fields');
    const paymentTransactionSmoke = await page.evaluate(async () => {
      const originalRef=db.ref;
      let record={totalAmount:100,advanceAmount:0,paymentLogs:[]};
      db.ref=path=>({transaction:(update,complete)=>{
        const next=update(JSON.parse(JSON.stringify(record)));
        const committed=next!==undefined;
        if(committed) record=next;
        complete(null,committed,{val:()=>JSON.parse(JSON.stringify(record))});
      }});
      const add=amount=>transactDarDocument('TXN-INV',current=>{
        const paid=getDarDocumentPaidAmount(current);
        if(amount>Math.max(0,current.totalAmount-paid))return;
        const logs=getDarDocumentPaymentLogs(current);
        logs.push({amount});
        current.paymentLogs=logs;
        current.advanceIncludedInPaymentLogs=false;
        return current;
      });
      try {
        const first=await add(70);
        const rejected=await add(40);
        const last=await add(30);
        return {first:first.committed,rejected:rejected.committed,last:last.committed,paid:getDarDocumentPaidAmount(record)};
      } finally { db.ref=originalRef; }
    });
    assert.equal(paymentTransactionSmoke.first,true,'First invoice payment commits');
    assert.equal(paymentTransactionSmoke.rejected,false,'Concurrent overpayment is rejected against the latest record');
    assert.equal(paymentTransactionSmoke.last,true,'A payment for the exact remaining balance commits');
    assert.equal(paymentTransactionSmoke.paid,100,'Atomic invoice payments cannot exceed the total');
    console.log('PASS: record-level Firebase writes avoid bulk stale-cache overwrites');
    console.log('PASS: invoice payment transactions prevent concurrent overpayment');
    const serviceCatalogSafety = await page.evaluate(() => {
      state.services=[{id:'<img src=x onerror=window.__serviceIdInjected=true>',title:'<img src=x onerror=window.__serviceTitleInjected=true>',items:[]}];
      renderServicesCatalog();
      return {
        imageCount:document.querySelectorAll('#services-cards-wrapper img').length,
        titleText:document.querySelector('#services-cards-wrapper .service-card h4 span')?.textContent,
        actionCount:document.querySelectorAll('#services-cards-wrapper [data-service-action]').length
      };
    });
    assert.equal(serviceCatalogSafety.imageCount,0,'Service catalog treats stored titles and IDs as text, not HTML');
    assert.match(serviceCatalogSafety.titleText,/<img/,'Service catalog preserves literal title text safely');
    assert.equal(serviceCatalogSafety.actionCount,2,'Service catalog edit/delete actions render with safe data attributes');
    const malformedServiceEditor = await page.evaluate(() => {
      state.services=[null,{id:'malformed-items',title:'Malformed',items:{}}];
      openServiceModal('malformed-items');
      const malformedRows=document.querySelectorAll('#srv-modal-items-container > div').length;
      state.services=[null,{id:'null-item',title:'Null item',items:[null,{d:'Valid service',q:1,p:10}]}];
      openServiceModal('null-item');
      const validRows=document.querySelectorAll('#srv-modal-items-container > div').length;
      const validDescription=document.querySelector('#srv-modal-items-container .srv-row-d')?.value;
      return {malformedRows,validRows,validDescription};
    });
    assert.equal(malformedServiceEditor.malformedRows,1,'Malformed non-array service items fall back to one editable row');
    assert.equal(malformedServiceEditor.validRows,1,'Null service items are ignored while valid rows remain');
    assert.equal(malformedServiceEditor.validDescription,'Valid service','Valid service item details still populate the editor');
    console.log('PASS: service catalog safe rendering and action wiring');
    const recoverableDeleteSmoke = await page.evaluate(async () => {
      const originalSafeDelete=window.safeDeleteDarRecord;
      const calls=[];
      window.safeDeleteDarRecord=async (collection,id)=>{calls.push({collection,id});};
      try {
        state.monthlyExpenses=[{id:'expense-recovery-test',title:'Recovery test',amount:10}];
        await deleteMonthlyExpense(0);
        state.services=[{id:'service-recovery-test',title:'Recovery test',items:[]}];
        deleteServiceCatalog('service-recovery-test');
        document.getElementById('confirm-delete-service').click();
        await Promise.resolve();
        await Promise.resolve();
        return {calls,expensesRemaining:state.monthlyExpenses.length};
      } finally { window.safeDeleteDarRecord=originalSafeDelete; }
    });
    assert.deepEqual(recoverableDeleteSmoke.calls,[{collection:'monthlyExpenses',id:'expense-recovery-test'},{collection:'services',id:'service-recovery-test'}],'Expense and service deletions use the recovery/audit path');
    assert.equal(recoverableDeleteSmoke.expensesRemaining,0,'Expense is removed from the local view only after recovery succeeds');
    console.log('PASS: service and expense deletions use recoverable data protection');
    console.log('PASS: save actions, injected package title, staff folder and ledger column alignment');
    console.log('PASS: mobile sidebar, signup/recovery UI, invoice preview, PDF export call path');
    const expiryCenterSmoke = await page.evaluate(() => {
      const addDays = days => { const d=new Date(); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); };
      state.clients=[{id:'expiry-company-test',companyName:'Expiry Test LLC',email:'office@example.com',whatsapp:'+971500000001',whatsappGroupLink:'https://chat.whatsapp.com/ABC123',tradeLicenseExpiry:addDays(10)}];
      state.staff=[{id:'expiry-staff-test',companyId:'expiry-company-test',companyName:'Expiry Test LLC',fullName:'Expiry Test Employee',email:'person@example.com',whatsapp:'+971500000002',passportNumber:'SENSITIVE-PASSPORT-123',passportExpiry:addDays(7),otherStaffDocumentName:'Insurance',otherStaffDocumentExpiry:addDays(15)}];
      window.darRenderExpiryNotifications();
      const text=document.getElementById('dar-expiry-notifications').innerText;
      return {text,staffWhatsappField:!!document.getElementById('sf-whatsapp'),emiratesExpiryField:!!document.getElementById('sf-emirates-id-expiry'),otherExpiryField:!!document.getElementById('sf-other-document-expiry')};
    });
    assert.match(expiryCenterSmoke.text,/Expiry Test LLC/,'Expiry center includes company expiry records');
    assert.match(expiryCenterSmoke.text,/Expiry Test Employee/,'Expiry center includes staff expiry records');
    assert.match(expiryCenterSmoke.text,/Manual Company Group Messages/,'Expiry center prepares manual-only group messages');
    assert.match(expiryCenterSmoke.text,/Open Company Group/,'Saved group link is used for manual group opening');
    assert.doesNotMatch(expiryCenterSmoke.text,/SENSITIVE-PASSPORT-123/,'Expiry center does not expose passport numbers in group messages or status rows');
    assert.equal(expiryCenterSmoke.staffWhatsappField,true,'Staff WhatsApp contact field is present');
    assert.equal(expiryCenterSmoke.emiratesExpiryField,true,'Staff Emirates ID expiry field is present');
    assert.equal(expiryCenterSmoke.otherExpiryField,true,'Additional staff document expiry field is present');
    console.log('PASS: company/staff expiry center and manual-only group message privacy');
    console.log('PASS: company staff table and purchase/supplier module rendering');
    if (errors.length) console.log('Browser page errors (external dependencies may be unavailable):',errors.slice(0,6));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
