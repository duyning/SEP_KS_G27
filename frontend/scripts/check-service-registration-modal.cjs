const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let registration = null, fail = true, writes = 0, loadFailed = false;
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'isolated-modal-test'));
    await page.route('**/api/**', async route => {
      const req = route.request(), p = new URL(req.url()).pathname;
      const ok = data => route.fulfill({json: {success: true, data}});
      if (p === '/api/auth/me') return ok({userId: 11, role: 'USER', fullName: 'Người kiểm thử', phoneNumber: '0912345678', email: 'test@example.test'});
      if (p.endsWith('/categories')) return ok([{categoryId: 1, name: 'Chuyển trọ'}]);
      if (p === '/api/services') return ok([]);
      if (p.endsWith('/current')) return loadFailed ? route.fulfill({status: 503, json: {success: false, message: 'Tạm thời mất kết nối'}}) : ok({canRegister: !registration, reason: registration ? 'IN_REVIEW' : 'ELIGIBLE', registration});
      if (p === '/api/service-registrations' && req.method() === 'POST') {
        writes++;
        assert.match(req.headers()['content-type'], /multipart\/form-data/);
        await new Promise(resolve => setTimeout(resolve, 300));
        if (fail) return route.fulfill({status: 503, json: {success: false, message: 'Chưa lưu hồ sơ, vui lòng thử lại'}});
        registration = {registrationId: 91, status: 'PENDING', serviceName: 'Chuyển trọ An Tâm', categoryName: 'Chuyển trọ', applicantName: 'Người kiểm thử', contactPhone: '0912345678', contactEmail: 'test@example.test', serviceArea: 'Tân Xã', description: 'Hỗ trợ đóng gói và chuyển đồ quanh Hòa Lạc.', pricingType: 'FIXED', price: 150000, documents: [{documentId: 1, name: 'license.pdf'}]};
        return ok(registration);
      }
      throw Error(`Unexpected request: ${req.method()} ${p}`);
    });
    await page.goto('http://127.0.0.1:5173/services');
    const trigger = page.getByRole('button', {name: 'Đăng ký dịch vụ / Xem hồ sơ', exact: true});
    const open = async () => {await trigger.click(); await page.locator('#sr-serviceName').waitFor();};
    await open();
    const dialog = page.getByRole('dialog');
    for (const [width,height] of [[1440,1000],[1366,768],[1024,768],[768,900],[375,844]]) {
      await page.setViewportSize({width,height});
      await page.waitForTimeout(120);
      const geometry = await dialog.evaluate(el => {
        const c = el.querySelector('.modal-container'), f = el.querySelector('.sr-footer'), body = el.querySelector('.modal-body');
        return {left:c.getBoundingClientRect().left,right:c.getBoundingClientRect().right,bottom:f.getBoundingClientRect().bottom,overflow:body.scrollWidth>body.clientWidth+1};
      });
      assert.ok(geometry.left >= 0 && geometry.right <= width+1 && geometry.bottom <= height, JSON.stringify({width,geometry}));
      assert.equal(geometry.overflow,false, 'Horizontal modal overflow '+width);
      if ([1440,375].includes(width)) await page.screenshot({path:path.join(os.tmpdir(),`hlrcs-service-registration-${width}.png`)});
    }
    await page.setViewportSize({width:1440,height:1000});
    const send = dialog.getByRole('button', {name:'Gửi hồ sơ xét duyệt',exact:true});
    await send.click();
    await page.waitForFunction(() => document.activeElement?.id === 'sr-serviceName');
    assert.equal(writes,0);
    assert.equal(await page.locator('#sr-serviceName').getAttribute('aria-invalid'),'true');
    await page.locator('#sr-serviceName').fill('Chuyển trọ An Tâm');
    await page.locator('#sr-categoryId').selectOption('1');
    await page.locator('#sr-description').fill('Hỗ trợ đóng gói và chuyển đồ quanh Hòa Lạc.');
    await page.locator('#sr-price').fill('150000');
    await page.locator('#sr-serviceArea').fill('Tân Xã');
    assert.equal(await page.locator('.sr-preview h3').innerText(),'Chuyển trọ An Tâm');
    await page.locator('#sr-pricingType').selectOption('NEGOTIABLE');
    assert.equal(await page.locator('#sr-price').count(),0);
    await page.locator('#sr-pricingType').selectOption('FIXED');
    assert.equal(await page.locator('#sr-price').inputValue(),'150000');
    const picker = page.locator('#sr-file-input');
    const file = name => ({name,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
    await picker.setInputFiles(file('license.pdf'));
    await picker.setInputFiles(file('identity.pdf'));
    assert.equal(await page.locator('.sr-file-list .sr-document').count(),2);
    await picker.setInputFiles({name:'bad.html',mimeType:'text/html',buffer:Buffer.from('<html/>')});
    await page.locator('#sr-error-documents').waitFor();
    assert.equal(await page.locator('.sr-file-list .sr-document').count(),2);
    await dialog.getByRole('button',{name:'Bỏ tài liệu identity.pdf',exact:true}).click();
    await send.click();
    await page.keyboard.press('Escape');
    await page.locator('.sr-error-banner').waitFor();
    assert.equal(await dialog.count(),1);
    assert.equal(await page.locator('#sr-serviceName').inputValue(),'Chuyển trọ An Tâm');
    assert.equal(await page.locator('.sr-file-list .sr-document').count(),1);
    fail=false;
    await send.click();
    await page.locator('.sr-result-banner.pending').waitFor();
    assert.equal(writes,2);
    assert.equal(await page.locator('#service-registration-form').count(),0);
    await dialog.getByRole('button',{name:'Đóng',exact:true}).focus();
    await page.keyboard.press('Shift+Tab');
    assert.match(await page.evaluate(() => document.activeElement.textContent),/Cập nhật kết quả/);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')),'Đóng');
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    await page.locator('.sr-modal').waitFor({state:'detached'});
    assert.equal(await trigger.evaluate(el => el === document.activeElement),true);
    registration=null; loadFailed=true;
    await trigger.click();
    await dialog.getByRole('button',{name:'Thử lại',exact:true}).waitFor();
    assert.equal(await page.locator('#service-registration-form').count(),0);
    loadFailed=false;
    await dialog.getByRole('button',{name:'Thử lại',exact:true}).click();
    await page.locator('#sr-serviceName').waitFor();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:720,height:500});
    assert.ok(await dialog.evaluate(el => el.querySelector('.modal-container').getBoundingClientRect().right <= innerWidth));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,modalViewports:5,fieldValidation:true,fileAccumulationAndRemoval:true,recoverableErrorPreservesForm:true,pendingAfterConfirmedSuccess:true,keyboardTrapAndRestore:true,loadErrorRetry:true,reducedMotion:true,mockedWrites:writes,mysqlWrites:0,pageErrors:0}));
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
