const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../migration/host-dashboard-check');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/login`);
    await page.locator('#loginIdentifier').fill('host@hlrcs.com');
    await page.locator('#loginPassword').fill('123456');
    await page.locator('#submitBtn').click();
    await page.waitForURL(`${base}/host`);
    const actual = await page.evaluate(async () => {
      const token = sessionStorage.getItem('hlrcs_access_token') || localStorage.getItem('hlrcs_access_token');
      const response = await fetch('/api/host/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      return { status: response.status, body: await response.json() };
    });
    assert.equal(actual.status, 200);
    assert.equal(actual.body.success, true);
    const data = actual.body.data;
    if (!data.properties.length && !data.pendingRegistrationCount) {
      await page.locator('#newHostOnboardingState').waitFor();
      await page.screenshot({ path: path.join(output, 'database-empty-1536.png'), fullPage: true });
      await page.getByRole('link', { name: 'Đăng ký nhà trọ đầu tiên của bạn', exact: true }).click();
      await page.waitForURL(`${base}/host/property/new`);
    }
    // Isolated browser fixtures below test UI branches only; they are never DB inserts.
    const empty = { properties: [], recentViewings: [], roomTypeCount: 0, pendingViewingCount: 0, pendingRegistrationCount: 0 };
    let response = { status: 200, body: { success: true, data: empty } };
    await page.route('**/api/host/dashboard', route => route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) }));
    for (const width of [1920,1536,1440,1366,1024,768,390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/host`);
      await page.locator('#newHostOnboardingState').waitFor();
      assert.equal(await page.locator('.onboarding-step').count(), 3);
      assert.equal(await page.locator('.host-dashboard-kpis').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width === 390) assert.ok(await page.locator('.portal-topbar').evaluate(element => element.getBoundingClientRect().height <= 90), 'Mobile header must not stack letters vertically');
      if ([1536,390].includes(width)) await page.screenshot({ path: path.join(output, `empty-${width}.png`), fullPage: true });
    }
    response = { status: 500, body: { success: false, message: 'Test database connection error' } };
    await page.goto(`${base}/host`);
    await page.getByRole('heading', { name: 'Không thể tải dữ liệu' }).waitFor();
    assert.equal(await page.locator('#newHostOnboardingState').count(), 0);
    response = { status: 200, body: { success: true, data: { ...empty, pendingRegistrationCount: 1 } } };
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByRole('heading', { name: 'Hồ sơ đăng ký nhà trọ đang chờ xét duyệt' }).waitFor();
    assert.equal(await page.locator('#newHostOnboardingState').count(), 0);
    response = { status: 200, body: { success: true, data: { ...empty, roomTypeCount: 1, properties: [{ propertyId: 123, name: 'API response property', address: 'Test-only API address', status: 'ACTIVE', roomTypeCount: 1, minimumPrice: 2500000 }] } } };
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByRole('heading', { name: 'API response property' }).waitFor();
    await page.getByRole('heading', { name: 'Chưa có yêu cầu xem phòng' }).waitFor();
    assert.equal(await page.locator('#newHostOnboardingState').count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', actualApiStatus: actual.status, databasePropertyCount: data.properties.length, databasePendingRegistrations: data.pendingRegistrationCount, viewportChecks: 7, checks: ['real MySQL response', 'empty onboarding', 'registration navigation', 'error not empty', 'retry', 'pending registration', 'populated API response', 'empty viewings', 'no JS errors'], databaseMutations: 0, output }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
