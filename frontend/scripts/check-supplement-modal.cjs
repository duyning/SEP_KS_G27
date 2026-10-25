const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../migration/supplement-check');
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'browser-test-only'));
    const detail = { summary: { registrationId: 12, name: 'Browser-only contract', status: 'PENDING', ownerName: 'Test owner' }, submission: null, photos: [], documents: [], history: [], reasonNote: '' };
    let requests = 0;
    let fail = true;
    // Every API call is intercepted. This check never writes a real registration.
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()).pathname;
      let data;
      if (url === '/api/auth/me') data = { userId: 1, fullName: 'Browser staff', role: 'STAFF' };
      else if (url === '/api/staff/dashboard') data = { pendingVerifications: 1, pendingReports: 0, pendingSupport: 0, pendingCommunity: 0, activeProperties: 0, processedTasks: 0, queue: [], activities: [] };
      else if (url === '/api/staff/verifications/12/review') {
        requests++;
        const body = route.request().postDataJSON();
        assert.equal(body.decision, 'REQUEST_SUPPLEMENT');
        assert.ok(body.note.length >= 10);
        if (fail) return route.fulfill({ status: 500, json: { success: false, message: 'Browser test: save failed' } });
        detail.summary.status = 'NEEDS_SUPPLEMENT';
        detail.reasonNote = body.note;
        detail.history = [{ logId: 1, staffName: 'Browser staff', action: 'REQUESTED_SUPPLEMENT', note: body.note }];
        data = detail;
      } else if (url === '/api/staff/verifications/12') data = detail;
      else throw new Error(`Unexpected API: ${url}`);
      return route.fulfill({ json: { success: true, data } });
    });
    await page.goto('http://127.0.0.1:5173/staff/verifications/detail?id=12');
    await page.getByRole('button', { name: 'Phê duyệt hồ sơ', exact: true }).click();
    await page.getByRole('dialog', { name: 'Phê duyệt hồ sơ nhà trọ' }).waitFor();
    assert.equal(requests, 0);
    await page.getByRole('button', { name: 'Hủy bỏ', exact: true }).click();
    await page.getByRole('button', { name: 'Từ chối hồ sơ', exact: true }).click();
    await page.getByRole('dialog', { name: 'Từ chối hồ sơ nhà trọ' }).waitFor();
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(requests, 0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Yêu cầu bổ sung', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const input = page.getByLabel('Nội dung yêu cầu bổ sung', { exact: false });
    await dialog.waitFor();
    await page.getByRole('button', { name: 'Gửi yêu cầu bổ sung', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(requests, 0);
    await input.fill('Vui lòng chụp lại rõ nét giấy tờ quyền sở hữu và căn cước.');
    for (const width of [1536, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
      assert.ok(await dialog.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }));
      await page.screenshot({ path: path.join(output, `supplement-modal-${width}.png`) });
    }
    await page.getByRole('button', { name: 'Gửi yêu cầu bổ sung', exact: true }).click();
    await page.getByText('Browser test: save failed', { exact: true }).waitFor();
    assert.equal(requests, 1);
    assert.equal(await input.inputValue(), 'Vui lòng chụp lại rõ nét giấy tờ quyền sở hữu và căn cước.');
    fail = false;
    await page.getByRole('button', { name: 'Gửi yêu cầu bổ sung', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    await page.getByText('Đã gửi yêu cầu bổ sung cho chủ trọ. Hồ sơ chưa được phê duyệt.', { exact: true }).waitFor();
    assert.equal(requests, 2);
    assert.equal(await page.getByRole('button', { name: 'Yêu cầu bổ sung', exact: true }).isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, confirmationDialogs: 3, widths: [1536, 390], interceptedWrites: requests, mysqlMutations: 0, pageErrors: errors }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
