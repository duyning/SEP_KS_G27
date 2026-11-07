const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.resolve(__dirname, '../migration/service-review-check');
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'review-browser-only'));
    let role = 'STAFF', writes = [], failOnce = true, conflict = false;
    const application = { registrationId: 12, serviceName: 'Dọn phòng trọ Hòa Lạc', applicantId: 7, applicantName: 'Người đăng ký', categoryName: 'Dọn dẹp', categoryId: 1, status: 'PENDING', operation: 'CREATE', description: 'Dọn dẹp phòng trọ, vệ sinh bếp và nhà tắm theo yêu cầu.', serviceArea: 'Tân Xã', pricingType: 'FROM', price: 200000, contactPhone: '0987654321', documents: [], hasImage: true, imageCount: 3, createdAt: '2026-11-08T10:00:00', revision: 2 };
    let row = { ...application };
    // All API requests are intercepted. No real application is reviewed.
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()).pathname; let data;
      if (url.endsWith('/image')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTbkAAAAASUVORK5CYII=', 'base64') });
      if (url === '/api/auth/me') data = { userId: role === 'USER' ? 7 : 1, fullName: 'Người kiểm thử', role };
      else if (url === '/api/staff/dashboard') data = { pendingVerifications: 0, pendingReports: 0, pendingSupport: 0, pendingCommunity: 0, activeProperties: 0, processedTasks: 0, queue: [], activities: [] };
      else if (url === '/api/staff/service-applications/12') data = { application: row, history: [] };
      else if (url === '/api/staff/service-applications') data = [row];
      else if (/\/12\/(review|supplement-request)$/.test(url)) {
        const payload = req.postDataJSON(); writes.push({ url, payload });
        assert.equal(payload.revision, 2); assert.ok(payload.capabilityDecision === 'APPROVE' && payload.listingDecision === 'APPROVE' || payload.reason.trim().length >= 10);
        if (failOnce) { failOnce = false; return route.fulfill({ status: 500, json: { success: false, message: 'Chưa lưu được phản hồi, vui lòng thử lại.' } }); }
        if (conflict) {
          row = { ...row, status: 'REJECTED', listingDecision: 'REJECT', capabilityDecision: 'REJECT', reasonNote: 'Hồ sơ đã được Staff khác xử lý.', reviewedAt: '2026-11-08T10:00:00' };
          return route.fulfill({ status: 409, json: { success: false, message: 'Hồ sơ đã được xử lý. Vui lòng tải lại.' } });
        }
        const supplement = url.endsWith('supplement-request');
        if (!supplement) assert.equal(payload.capabilityDecision, payload.listingDecision);
        row = { ...row, status: supplement ? 'NEEDS_SUPPLEMENT' : payload.listingDecision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reasonNote: payload.reason, requestedChanges: supplement ? payload.reason : null, listingDecision: payload.listingDecision, capabilityDecision: payload.capabilityDecision, reviewedAt: '2026-11-08T10:00:00', supplementRequestedAt: '2026-11-08T10:00:00', reviewerName: 'Staff kiểm thử', revision: 3 };
        data = { application: row, history: [] };
      } else if (url === '/api/services') data = [];
      else if (url.endsWith('/categories')) data = [{ categoryId: 1, name: 'Dọn dẹp' }];
      else if (url === '/api/service-registrations/mine') data = [row];
      else throw new Error('Unexpected mocked API: ' + url);
      await route.fulfill({ status: 200, json: { success: true, data } });
    });
    const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5187';
    const open = async () => { await page.goto(base + '/staff/service-applications?id=12'); await page.getByRole('heading', { name: 'Quyết định xét duyệt', exact: true }).waitFor(); };
    await open();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('heading', { name: 'Hồ sơ dịch vụ #12', exact: true }).scrollIntoViewIfNeeded();
      await page.locator('.service-application-overview .svc-gallery>img').waitFor();
      assert.ok(await page.locator('.service-application-overview .svc-gallery>img').evaluate(image => image.getBoundingClientRect().height <= 220 && image.getBoundingClientRect().width <= 320));
      assert.equal(await page.locator('.service-application-category strong').innerText(), 'Dọn dẹp');
      assert.ok(await page.locator('.service-application-title h2').evaluate(title => parseFloat(getComputedStyle(title).fontSize) >= 24));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `application-detail-${width}.png`) });
    }
    await page.getByRole('button', { name: 'Xem ảnh 2', exact: true }).click();
    await page.getByRole('img', { name: application.serviceName + ' 2', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click();
    await page.getByRole('img', { name: application.serviceName + ' 3', exact: true }).waitFor();
    assert.equal(await page.locator('.svc-gallery-heading').innerText(), 'Ảnh dịch vụ\n3 / 3');
    await page.getByRole('link', { name: 'Danh sách hồ sơ', exact: true }).click();
    await page.getByRole('link', { name: 'Xem hồ sơ', exact: true }).waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('heading', { name: 'Xét duyệt hồ sơ cung cấp dịch vụ', exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await page.getByRole('link', { name: 'Xem hồ sơ', exact: true }).evaluate(link => getComputedStyle(link).backgroundColor), 'rgb(13, 148, 136)');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `application-list-${width}.png`) });
    }
    await page.getByRole('link', { name: 'Xem hồ sơ', exact: true }).click();
    await page.getByRole('heading', { name: 'Quyết định xét duyệt', exact: true }).waitFor();
    assert.equal(await page.locator('.service-review-panel select').count(), 0);
    assert.equal(await page.getByRole('radio').count(), 3);
    await page.getByRole('button', { name: 'Xác nhận quyết định', exact: true }).click();
    await page.getByText('Vui lòng chọn duyệt, yêu cầu bổ sung hoặc từ chối hồ sơ.', { exact: true }).waitFor();
    assert.equal(writes.length, 0);
    await page.getByRole('radio', { name: /Yêu cầu bổ sung/ }).check();
    await page.getByRole('button', { name: 'Gửi yêu cầu bổ sung', exact: true }).click();
    await page.getByText('Nội dung cần bổ sung phải có từ 10 đến 2000 ký tự.', { exact: true }).waitFor();
    assert.equal(await page.locator('textarea').evaluate(input => input === document.activeElement), true);
    const note = 'Bổ sung ảnh rõ nét giấy phép kinh doanh.\nSửa khu vực phục vụ thành các xã cụ thể.';
    await page.getByRole('textbox', { name: /Nội dung cần bổ sung/ }).fill(note);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('.service-review-panel').scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `review-supplement-${width}.png`) });
    }
    await page.getByRole('button', { name: 'Gửi yêu cầu bổ sung', exact: true }).click();
    await page.getByText('Chưa lưu được phản hồi, vui lòng thử lại.', { exact: true }).waitFor();
    assert.equal(await page.locator('textarea').inputValue(), note);
    await page.getByRole('button', { name: 'Gửi yêu cầu bổ sung', exact: true }).click();
    await page.getByRole('heading', { name: 'Yêu cầu bổ sung', exact: true }).waitFor();
    assert.equal(row.requestedChanges, note);
    assert.equal(await page.locator('.service-review-panel').count(), 0);

    role = 'ADMIN'; row = { ...application }; await open();
    await page.getByRole('radio', { name: /Từ chối hồ sơ/ }).check();
    const rejectNote = 'Giấy tờ không chứng minh được quyền cung cấp dịch vụ.';
    await page.getByRole('textbox', { name: /Lý do từ chối/ }).fill(rejectNote);
    await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
    await page.getByRole('heading', { name: 'Kết quả xét duyệt', exact: true }).waitFor();
    assert.equal(writes.at(-1).payload.capabilityDecision, 'REJECT');
    assert.equal(row.reasonNote, rejectNote);

    role = 'USER'; await page.goto(base + '/services');
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).click();
    await page.getByRole('button', { name: 'Xem kết quả', exact: true }).click();
    await page.getByText('Lý do từ chối:', { exact: true }).waitFor();
    await page.getByText(rejectNote, { exact: false }).waitFor();

    role = 'STAFF';
    for (const operation of ['CREATE', 'UPDATE', 'DELETE']) {
      row = { ...application, operation }; await open();
      await page.getByRole('radio', { name: /Duyệt hồ sơ/ }).check();
      assert.equal(await page.locator('.service-review-reason').count(), 0);
      await page.getByRole('button', { name: 'Xác nhận duyệt hồ sơ', exact: true }).click();
      await page.getByRole('heading', { name: 'Kết quả xét duyệt', exact: true }).waitFor();
      assert.equal(writes.at(-1).payload.listingDecision, 'APPROVE');
      assert.equal(writes.at(-1).payload.reason, 'Đã kiểm tra và duyệt thành công.');
    }
    conflict = true; row = { ...application }; await open();
    await page.getByRole('radio', { name: /Duyệt hồ sơ/ }).check();
    assert.equal(await page.locator('textarea').count(), 0);
    await page.getByRole('button', { name: 'Xác nhận duyệt hồ sơ', exact: true }).click();
    await page.getByText('Hồ sơ đã được xử lý. Vui lòng tải lại.', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Kết quả xét duyệt', exact: true }).waitFor();
    assert.equal(await page.locator('.service-review-panel').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Passed: single review action, required feedback, supplement/reject/approve, applicant reason, Staff/Admin, save recovery, stale revision, mobile/desktop. All API writes mocked.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
