const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => typeof window.previewInvoiceDocument === 'function' && typeof window.previewStaffImportFile === 'function');

    const invoice = await page.evaluate(async () => {
      const oldDocs = state.documents;
      const oldTranslate = window.autoTranslateToArabic;
      window.autoTranslateToArabic = async () => '';
      const doc = {
        refCode:'SMOKE-BALANCE', type:'Invoice', transactionDate:'2026-11-26',
        subtotalAmount:1000, processingCharges:100, discountAmount:220, discountPercent:20,
        totalAmount:880, advanceAmount:200, paymentAdvanceBalance:200,
        advanceIncludedInPaymentLogs:false, paymentLogs:[{date:'2026-11-25',amount:100,note:'Second payment'}]
      };
      state.documents=[doc];
      await window.previewInvoiceDocument(doc.refCode);
      const summary=document.querySelector('#p-table-body .dar-totals-summary');
      const text=summary?.innerText||'';
      state.documents=oldDocs;
      window.autoTranslateToArabic=oldTranslate;
      window.closePreviewModal();
      return text;
    });
    assert.match(invoice,/Subtotal\s+AED 1000\.00/);
    assert.match(invoice,/Processing Charge\s+AED 100\.00/);
    assert.match(invoice,/Adv\. Amount\s+AED 200\.00/);
    assert.match(invoice,/Grand Total[\s\S]*AED 880\.00/);
    assert.match(invoice,/Balance Due\s+AED 580\.00/);

    const quote = await page.evaluate(async () => {
      const oldDocs=state.documents;
      const oldTranslate=window.autoTranslateToArabic;
      window.autoTranslateToArabic=async()=> '';
      const doc={refCode:'SMOKE-BALANCE-QTN',type:'Quotation',subtotalAmount:500,processingCharges:50,discountPercent:0,totalAmount:550,advanceAmount:150,advanceIncludedInPaymentLogs:true,paymentLogs:[{amount:150}]};
      state.documents=[doc];
      await window.previewInvoiceDocument(doc.refCode);
      const text=document.querySelector('#p-table-body .dar-totals-summary')?.innerText||'';
      state.documents=oldDocs;
      window.autoTranslateToArabic=oldTranslate;
      window.closePreviewModal();
      return text;
    });
    assert.match(quote,/Balance Due\s+AED 400\.00/,'Quotation balance must use confirmed payments too');

    const mohre = await page.evaluate(async () => {
      state.clients=[...(state.clients||[]),{id:'mohre-test-company',companyName:'MOHRE Test Company'}];
      window.renderStaffTable();
      const companySelect=document.getElementById('staff-import-company');
      companySelect.value='mohre-test-company';
      window.updateStaffImportAvailability();
      const oldPdf=window.pdfjsLib;
      const makeItem=(text,x,y)=>({str:text,transform:[1,0,0,1,x,y]});
      const items=[
        makeItem('Passport Number',100,800), makeItem('Person Name',300,800),
        makeItem('Card Type',500,800), makeItem('Job Name',700,800),
        makeItem('Nationality',900,800), makeItem('Card Number',1100,800),
        makeItem('Contract Type',1300,800),
        makeItem('A1234567',100,740), makeItem('12345678901234',300,740),
        makeItem('Jubin George',330,740), makeItem('NEW ELECTRONIC WORK PERMIT',500,740),
        makeItem('Building Labourer',700,740), makeItem('INDIA',900,740),
        makeItem('1234567890',1100,740), makeItem('25/11/2027',1100,728),
        makeItem('Limited',1300,740),
        makeItem('123456789',100,680), makeItem('12345678901235',300,680),
        makeItem('Test Numeric Passport',330,680), makeItem('NEW ELECTRONIC WORK PERMIT',500,680),
        makeItem('Helper',700,680), makeItem('INDIA',900,680),
        makeItem('9876543210',1100,680), makeItem('01/12/2027',1100,668),
        makeItem('Limited',1300,680)
      ];
      window.pdfjsLib={
        GlobalWorkerOptions:{},
        getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items})})})})
      };
      await window.previewStaffImportFile(new File(['synthetic-pdf'],'mohre-test.pdf',{type:'application/pdf'}));
      const preview=document.getElementById('staff-import-preview');
      const result={text:preview?.innerText||'',help:document.getElementById('staff-import-help')?.textContent||'',visible:preview&&!preview.hidden,disabled:document.getElementById('staff-import-button')?.disabled};
      window.pdfjsLib=oldPdf;
      return result;
    });
    assert.equal(mohre.visible,true,'MOHRE PDF must produce a preview');
    assert.match(mohre.text,/2 rows detected/);
    assert.match(mohre.text,/Jubin George/);
    assert.match(mohre.text,/Test Numeric Passport/);
    assert.match(mohre.text,/A1234567/);
    assert.match(mohre.text,/123456789/);
    assert.match(mohre.text,/2027-11-25/);
    assert.equal(mohre.disabled,false,'Valid preview should enable import');
    assert.deepEqual(pageErrors,[]);
    console.log('PASS: invoice/quotation balance due, processing charge and header-driven MOHRE PDF parsing');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
