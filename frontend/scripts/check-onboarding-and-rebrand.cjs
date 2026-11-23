const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASE_URL = process.env.ONBOARDING_TEST_URL || 'http://127.0.0.1:5197';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../target/nesthub-rebrand-onboarding');

// Minimal valid 1x1 teal PNG binary (no real CCCD data)
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function apiOk(data) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function stubCommonApis(page) {
  await page.route('https://**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/auth/me') || url.includes('/api/host-onboarding/current')) {
      return route.fallback();
    }
    if (url.includes('/api/host/registration-eligibility')) return route.fulfill(apiOk({ canRegister: true }));
    if (url.includes('/api/host/dashboard')) {
      return route.fulfill(apiOk({
        totalProperties: 1, totalRoomTypes: 2, totalRooms: 6, availableRooms: 2,
        occupiedRooms: 4, pendingViewings: 0, pendingApprovals: 0, activeListings: 1,
        occupancyRate: 67, recentProperties: [], recentViewingRequests: []
      }));
    }
    if (url.includes('/api/staff/dashboard')) {
      return route.fulfill(apiOk({
        pendingVerifications: 1, pendingReports: 0, pendingCommunity: 0,
        pendingFeedback: 0, pendingSupport: 0, recentActions: []
      }));
    }
    if (url.includes('/api/admin/')) {
      return route.fulfill(apiOk({ totalUsers: 10, totalHosts: 3, totalStaff: 2, totalProperties: 4, items: [], content: [] }));
    }
    if (url.includes('/api/favorites') || url.includes('/api/accommodations') || url.includes('/api/public/')) {
      return route.fulfill(apiOk([]));
    }
    return route.fulfill(apiOk({}));
  });
}

async function assertNoOldBrand(page, label) {
  const result = await page.evaluate(() => {
    const title = document.title;
    const text = document.body.innerText || '';
    const badMatch = (title + '\n' + text).match(/HL_RCS|HL-RCS|HL RCS|Rental Connection System/i);
    return { title, bad: badMatch ? badMatch[0] : null };
  });
  assert(!result.bad, `[${label}] Found old brand "${result.bad}" (title="${result.title}")`);
}

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // 1. Browser branding assets check (favicon, manifest, index.html)
  const [htmlRes, favRes, manRes] = await Promise.all([
    fetch(`${BASE_URL}/`),
    fetch(`${BASE_URL}/favicon.svg`),
    fetch(`${BASE_URL}/manifest.webmanifest`)
  ]);
  assert(htmlRes.ok && favRes.ok && manRes.ok, 'Branding public assets not served');
  const html = await htmlRes.text();
  const manifest = await manRes.json();
  assert(html.includes('<title>NestHub - Nền tảng kết nối và quản lý nhà trọ</title>'), 'index.html title missing NestHub');
  assert(!/HL_RCS|HL-RCS|Rental Connection System/i.test(html), 'index.html still contains old brand');
  assert(manifest.short_name === 'NestHub', 'manifest short_name must be NestHub');
  console.log('PASS [1/6] Browser branding (index.html, favicon.svg, manifest.webmanifest) verified');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    // 2. Host Onboarding Step 1 -> Validation -> Corrupt file -> Camera denied -> Upload -> Lightbox -> Terms -> Step 2 -> Back -> Zero data loss -> Responsive
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(() => {
        window.sessionStorage.setItem('hlrcs_access_token', 'onboarding-token');
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: {
            getUserMedia: () => Promise.reject(Object.assign(new Error('Denied'), { name: 'NotAllowedError' }))
          }
        });
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await stubCommonApis(page);
      await page.route('**/api/auth/me', (route) =>
        route.fulfill(apiOk({
          userId: 50,
          email: 'tenant50@example.com',
          fullName: 'Nguyễn Minh Quân',
          phoneNumber: '0987654321',
          phoneVerifiedAt: null,
          role: 'USER'
        }))
      );
      await page.route('**/api/host-onboarding/current', (route) =>
        route.fulfill(apiOk({ account: null, registration: null }))
      );

      await page.goto(`${BASE_URL}/become-host`, { waitUntil: 'networkidle' });
      await page.locator('#becomeHostForm').waitFor({ state: 'visible', timeout: 10000 });

      await assertNoOldBrand(page, '/become-host Step 1');
      assert(await page.locator('.hob-sidebar').isVisible(), 'Guide sidebar must be visible on desktop 1440px');
      assert(await page.locator('.onboarding-steps li').count() === 3, 'Must render 3-step horizontal stepper');
      assert((await page.locator('.haf-phone-status').innerText()).includes('Chưa xác minh'), 'Unverified phone badge must render');

      // Screenshot initial clean Step 1 desktop (full page to inspect height balance & padding)
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'onboarding-step1-1440.png'), fullPage: true });

      // Attempt submit with missing CCCD & unchecked terms -> must block & show inline errors
      await page.locator('#btnSubmitForm').click();
      assert(await page.locator('#becomeHostForm').isVisible(), 'Should stay on Step 1 when invalid');
      assert((await page.locator('.haf-error').count()) >= 3, 'Inline errors for front, back, and agreement must appear');
      assert(await page.locator('.onboarding-steps li.is-error').count() === 1, 'Step 1 should reflect error state in stepper');

      // Upload spoofed PNG (wrong magic bytes) -> must reject!
      await page.locator('#identityImage').setInputFiles({
        name: 'spoof.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not-a-real-png-file')
      });
      await page.locator('.haf-status-pill.is-error').first().waitFor({ state: 'visible', timeout: 5000 });

      // Test camera permission denied fallback
      await page.getByRole('button', { name: 'Chụp ảnh mặt trước cccd' }).click();
      await page.locator('.hob-camera-fallback').waitFor({ state: 'visible', timeout: 5000 });
      assert((await page.locator('.hob-camera-fallback').innerText()).includes('Chưa được cấp quyền camera'), 'Camera denied fallback missing');
      await page.locator('.hob-camera-modal button[aria-label="Đóng"]').click();

      // Upload valid front & back PNGs
      await page.locator('#identityImage').setInputFiles({
        name: 'front-test.png',
        mimeType: 'image/png',
        buffer: TINY_PNG_BUFFER
      });
      await page.locator('#identityBackImage').setInputFiles({
        name: 'back-test.png',
        mimeType: 'image/png',
        buffer: TINY_PNG_BUFFER
      });
      await page.waitForFunction(() => document.querySelectorAll('.haf-status-pill.is-success').length === 2);

      // Verify Lightbox preview works
      await page.getByRole('button', { name: 'Xem ảnh' }).first().click();
      await page.locator('.hob-lightbox-body img').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('.hob-lightbox-modal button[aria-label="Đóng"]').click();

      // Fill optional note & accept terms via clickable Terms modal
      await page.locator('#introduction').fill('Nhà trọ gia đình gần cổng ĐH FPT.');
      await page.locator('.haf-terms-link').click();
      await page.locator('.hob-terms-modal').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Tôi đã đọc và đồng ý' }).click();
      assert(await page.locator('#agreementCheck').isChecked(), 'Terms modal accept should check agreement box');

      // Security check: localStorage must NOT contain CCCD base64 image data
      const lsDump = await page.evaluate(() => JSON.stringify(window.localStorage));
      assert(!lsDump.includes('data:image/png'), 'SECURITY VIOLATION: CCCD image leaked to localStorage');

      // Proceed to Step 2
      await page.locator('#btnSubmitForm').click();
      await page.locator('.hob-step2-wrap').waitFor({ state: 'visible', timeout: 10000 });
      assert(await page.locator('.onboarding-steps li.is-completed').count() === 1, 'Step 1 must show completed');
      assert(await page.locator('.onboarding-steps li.is-current').count() === 1, 'Step 2 must show current');

      // Navigate back to Step 1 via Stepper button -> confirm zero data loss!
      await page.locator('.onboarding-steps li').first().locator('button').click();
      await page.locator('#becomeHostForm').waitFor({ state: 'visible', timeout: 5000 });
      assert((await page.locator('#introduction').inputValue()) === 'Nhà trọ gia đình gần cổng ĐH FPT.', 'Note lost after step switch!');
      assert(await page.locator('.haf-status-pill.is-success').count() === 2, 'CCCD uploads lost after step switch!');

      // Mobile 375px responsive & zero horizontal overflow check
      await page.setViewportSize({ width: 375, height: 812 });
      const overflow375 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert(!overflow375, 'Horizontal overflow detected on /become-host at 375px');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'onboarding-step1-375.png'), fullPage: false });

      assert(pageErrors.length === 0, `Onboarding pageerrors: ${pageErrors.join('; ')}`);
      await context.close();
      console.log('PASS [2/6] Host Onboarding Step 1->2->1, validation, spoof-file reject, camera fallback, lightbox, terms modal, security, and 375px verified');
    }

    // 3. Step 3 Status Tracking (PENDING, NEEDS_SUPPLEMENT, APPROVED)
    for (const [status, expectedBadge] of [
      ['PENDING', 'Chờ thẩm định'],
      ['NEEDS_SUPPLEMENT', 'Yêu cầu bổ sung thông tin'],
      ['APPROVED', 'Đã phê duyệt']
    ]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(() => window.sessionStorage.setItem('hlrcs_access_token', 'status-token'));
      const page = await context.newPage();
      await stubCommonApis(page);
      await page.route('**/api/auth/me', (route) =>
        route.fulfill(apiOk({
          userId: 51, email: 'u51@example.com', fullName: 'Trần Gia Bảo',
          phoneNumber: '0912345678', phoneVerifiedAt: '2026-11-20T08:00:00Z', role: 'USER'
        }))
      );
      await page.route('**/api/host-onboarding/current', (route) =>
        route.fulfill(apiOk({
          account: { id: 9, status: 'PENDING_REVIEW', hasIdentityImage: true, hasIdentityBackImage: true, version: 1 },
          registration: {
            registrationId: 42,
            name: 'Nhà trọ Xanh Hòa Lạc',
            status,
            createdAt: '2026-11-22T09:15:00Z',
            reasonNote: status === 'NEEDS_SUPPLEMENT' ? 'Vui lòng bổ sung ảnh rõ hơn mặt sau CCCD.' : ''
          }
        }))
      );

      await page.goto(`${BASE_URL}/become-host`, { waitUntil: 'networkidle' });
      const review = page.locator('.onboarding-review');
      await review.waitFor({ state: 'visible', timeout: 10000 });
      const text = await review.innerText();
      assert(text.includes(expectedBadge), `Status ${status} missing badge ${expectedBadge}`);
      assert(text.includes('HS-00042'), `Status ${status} missing registration code HS-00042`);
      await assertNoOldBrand(page, `/become-host Step 3 (${status})`);
      if (status === 'PENDING') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'onboarding-step3-pending-1440.png'), fullPage: false });
      }
      if (status === 'NEEDS_SUPPLEMENT') {
        assert(text.includes('Bổ sung & gửi lại hồ sơ'), 'NEEDS_SUPPLEMENT missing supplement CTA');
      }
      if (status === 'APPROVED') {
        assert(text.includes('Vào Host Portal'), 'APPROVED missing Host Portal link');
      }
      await context.close();
    }
    console.log('PASS [3/6] Host Onboarding Step 3 (PENDING, NEEDS_SUPPLEMENT, APPROVED) verified');

    // 4. Rebrand check: Login + Register + GlobalLoading
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(() => window.sessionStorage.setItem('hlrcs_access_token', 'slow-token'));
      const page = await context.newPage();
      await stubCommonApis(page);

      let releaseAuth;
      const gate = new Promise((r) => { releaseAuth = r; });
      await page.route('**/api/auth/me', async (route) => {
        await gate;
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unauthorized' }) });
      });

      const nav = page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.getByTestId('global-loading').waitFor({ state: 'visible', timeout: 10000 });
      await assertNoOldBrand(page, 'GlobalLoading');
      assert((await page.getByTestId('global-loading').innerText()).includes('NestHub'), 'GlobalLoading must display NestHub brand');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebrand-loading-1440.png'), fullPage: false });

      releaseAuth();
      await nav;
      await page.locator('.auth-card').first().waitFor({ state: 'visible', timeout: 10000 });
      await assertNoOldBrand(page, '/login');
      assert((await page.locator('.showcase-side').first().innerText()).includes('NestHub'), 'Login showcase must show NestHub');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebrand-login-1440.png'), fullPage: false });
      await context.close();
      console.log('PASS [4/6] NestHub GlobalLoading and /login rebrand verified');
    }

    // 5. Rebrand check: Public Home & Host Portal
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(() => window.sessionStorage.setItem('hlrcs_access_token', 'host-token'));
      const page = await context.newPage();
      await stubCommonApis(page);
      await page.route('**/api/auth/me', (route) =>
        route.fulfill(apiOk({ userId: 10, email: 'host@hlrcs.com', fullName: 'Chủ trọ NestHub', role: 'ROOM_HOST' }))
      );

      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await assertNoOldBrand(page, 'Public Home /');

      await page.goto(`${BASE_URL}/host`, { waitUntil: 'networkidle' });
      await page.locator('.host-portal').waitFor({ state: 'visible', timeout: 10000 });
      await assertNoOldBrand(page, 'Host Portal /host');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'rebrand-host-1440.png'), fullPage: false });
      await context.close();
      console.log('PASS [5/6] Public Home and Host Portal NestHub rebrand verified');
    }

    // 6. Rebrand check: Staff Portal & Admin Portal
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(() => window.sessionStorage.setItem('hlrcs_access_token', 'admin-token'));
      const page = await context.newPage();
      await stubCommonApis(page);
      await page.route('**/api/auth/me', (route) =>
        route.fulfill(apiOk({ userId: 1, email: 'admin@hlrcs.com', fullName: 'Quản trị NestHub', role: 'ADMIN' }))
      );

      await page.goto(`${BASE_URL}/staff`, { waitUntil: 'networkidle' });
      await page.locator('.staff-portal').waitFor({ state: 'visible', timeout: 10000 });
      await assertNoOldBrand(page, 'Staff Portal /staff');

      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
      await page.locator('.admin-portal').waitFor({ state: 'visible', timeout: 10000 });
      await assertNoOldBrand(page, 'Admin Portal /admin');
      await context.close();
      console.log('PASS [6/6] Staff Portal and Admin Portal NestHub rebrand verified');
    }

    console.log('\nALL 6 ONBOARDING & NESTHUB REBRAND E2E CHECKS PASSED!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
