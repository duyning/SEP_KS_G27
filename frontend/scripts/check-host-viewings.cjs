const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../migration/host-viewings-check');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, '../src/pages/host/HostViewingRequestsPage.jsx'), 'utf8'), /MOCK_HOST|fixtures\/|DemoNoticeBanner|handleAccept|handleReject/);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 810 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/login`);
    await page.locator('#loginIdentifier').fill('host@hlrcs.com');
    await page.locator('#loginPassword').fill('123456');
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(`${base}/host`);
    const request = page.waitForResponse(response => response.url().endsWith('/api/host/viewings') && response.status() === 200);
    await page.goto(`${base}/host/viewings`);
    const actual = await (await request).json();
    assert.equal(actual.success, true);
    if (!actual.data.properties.length && !actual.data.pendingRegistrationCount) {
      await page.locator('#noPropertyState').waitFor();
      await page.screenshot({ path: path.join(output, 'database-no-property-1920.png'), fullPage: true });
      await page.locator('#noPropertyState a').click();
      await page.waitForURL(`${base}/host/property/new`);
    }
    // Browser-only response interception tests alternatives without writing MySQL data.
    const empty = { properties: [], viewings: [], pendingRegistrationCount: 0 };
    let response = { status: 200, data: empty };
    await page.route('**/api/host/viewings*', route => route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.status === 200 ? { success: true, data: response.data } : { success: false, message: 'Test-only server error' }) }));
    for (const width of [1920, 1536, 1440, 1366, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 810 });
      await page.goto(`${base}/host/viewings`);
      await page.getByRole('heading', { name: 'Bạn chưa đăng ký nhà trọ', exact: true }).waitFor();
      assert.equal(await page.locator('.topbar-status-chip').count(), 0);
      assert.equal(await page.locator('.host-viewings-page table').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width === 390) assert.equal(await page.locator('.host-footer').evaluate(element => element.getBoundingClientRect().left), 0);
      if ([1920, 390].includes(width)) await page.screenshot({ path: path.join(output, `no-property-${width}.png`), fullPage: true });
    }
    response = { status: 500 };
    await page.goto(`${base}/host/viewings`);
    await page.getByRole('heading', { name: 'Không thể tải dữ liệu', exact: true }).waitFor();
    assert.equal(await page.locator('#noPropertyState').count(), 0);
    response = { status: 200, data: { ...empty, pendingRegistrationCount: 1 } };
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByRole('heading', { name: 'Hồ sơ nhà trọ đang chờ xét duyệt', exact: true }).waitFor();
    const properties = [{ propertyId: 123, name: 'Owned contract property' }];
    response = { status: 200, data: { ...empty, properties } };
    await page.goto(`${base}/host/viewings`);
    await page.getByText('Chưa có yêu cầu xem phòng từ khách thuê.', { exact: false }).waitFor();
    assert.equal(await page.locator('#noPropertyState').count(), 0);
    const viewings = [{ bookingId: 456, propertyId: 123, propertyName: properties[0].name, roomType: 'Contract room', renterName: 'Contract renter', renterPhone: '0900000000', scheduledDate: '2027-01-10T09:00:00', createdAt: '2027-01-01T09:00:00', status: 'APPROVED', note: '<img src=x onerror=alert(1)>' }];
    response = { status: 200, data: { ...empty, properties, viewings } };
    await page.goto(`${base}/host/viewings?propertyId=123`);
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('dialog').locator('img').count(), 0);
    assert.ok(await page.getByRole('dialog').getByText(viewings[0].note, { exact: true }).isVisible());
    assert.ok(await page.getByRole('button', { name: 'Xác nhận', exact: true }).isDisabled());
    await page.keyboard.press('Escape');
    await page.getByLabel('Tìm yêu cầu', { exact: true }).fill('not-found');
    await page.getByText('Không có yêu cầu phù hợp với bộ lọc.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đặt lại bộ lọc', exact: true }).click();
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).waitFor();
    await page.getByLabel('Ngày xem phòng', { exact: true }).fill('2027-01-11');
    await page.getByText('Không có yêu cầu phù hợp với bộ lọc.', { exact: true }).waitFor();
    await page.goto(`${base}/host/viewings?propertyId=999`);
    await page.getByText('Không tìm thấy nhà trọ trong danh sách bạn được phép quản lý.', { exact: true }).waitFor();
    assert.equal(await page.locator('#noPropertyState').count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, realDatabase: actual.data, responsiveWidths: [1920,1536,1440,1366,1024,768,390], alternatives: 'error, retry, pending, empty bookings, real DTO list, details, escaping, filters, foreign property', pageErrors: errors }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
