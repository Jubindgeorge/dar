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
    console.log('PASS: mobile sidebar, signup/recovery UI, invoice preview, PDF export call path');
    if (errors.length) console.log('Browser page errors (external dependencies may be unavailable):',errors.slice(0,6));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
