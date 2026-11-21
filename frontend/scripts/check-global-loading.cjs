const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASE_URL = process.env.GLOBAL_LOADING_TEST_URL || 'http://127.0.0.1:5199';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../target/global-loading-ui');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function apiOk(data) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data })
  };
}

async function stubCommonApis(page) {
  await page.route('https://**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/auth/me')) {
      return route.fallback();
    }
    if (url.includes('/api/auth/logout')) {
      return route.fulfill(apiOk(null));
    }
    if (url.includes('/api/host/registration-eligibility')) {
      return route.fulfill(apiOk({ canRegister: true }));
    }
    if (url.includes('/api/host/dashboard')) {
      return route.fulfill(apiOk({
        totalProperties: 1,
        totalRoomTypes: 2,
        totalRooms: 6,
        availableRooms: 2,
        occupiedRooms: 4,
        pendingViewings: 0,
        pendingApprovals: 0,
        activeListings: 1,
        occupancyRate: 67,
        recentProperties: [],
        recentViewingRequests: []
      }));
    }
    if (url.includes('/api/host/properties')) {
      return route.fulfill(apiOk([
        {
          propertyId: 1,
          name: 'Nhà trọ An Bình',
          address: 'Thạch Hòa, Hòa Lạc',
          status: 'APPROVED',
          totalRooms: 6,
          availableRooms: 2
        }
      ]));
    }
    if (url.includes('/api/staff/dashboard')) {
      return route.fulfill(apiOk({
        pendingVerifications: 2,
        pendingReports: 1,
        pendingCommunity: 0,
        pendingFeedback: 0,
        pendingSupport: 1,
        recentActions: []
      }));
    }
    if (url.includes('/api/admin/')) {
      return route.fulfill(apiOk({
        totalUsers: 12,
        totalHosts: 4,
        totalStaff: 2,
        totalProperties: 5,
        items: [],
        content: []
      }));
    }
    if (url.includes('/api/public/') || url.includes('/api/favorites') || url.includes('/api/accommodations')) {
      return route.fulfill(apiOk([]));
    }
    return route.fulfill(apiOk({}));
  });
}

async function seedToken(context, token = 'test-session-token') {
  await context.addInitScript((tok) => {
    window.sessionStorage.setItem('hlrcs_access_token', tok);
  }, token);
}

async function verifyGlobalLoadingVisuals(page, viewportLabel, screenshotName) {
  const loader = page.getByTestId('global-loading');
  await loader.waitFor({ state: 'visible', timeout: 10000 });

  const checks = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="global-loading"]');
    const arc = el.querySelector('.gl-ring-arc');
    const emblem = el.querySelector('.gl-emblem');
    const orbit = el.querySelector('.gl-orbit');
    const msg = el.querySelector('.gl-message');
    const screenStyle = getComputedStyle(el);
    const arcStyle = getComputedStyle(arc);
    const orbitRect = orbit.getBoundingClientRect();
    const emblemRect = emblem.getBoundingClientRect();
    const text = el.innerText;
    return {
      role: el.getAttribute('role'),
      ariaLive: el.getAttribute('aria-live'),
      ariaBusy: el.getAttribute('aria-busy'),
      bg: screenStyle.backgroundColor,
      arcStroke: arcStyle.stroke,
      arcAnimation: arcStyle.animationName,
      emblemVisible: emblemRect.width >= 40 && emblemRect.height >= 40,
      centered:
        Math.abs((orbitRect.left + orbitRect.width / 2) - (emblemRect.left + emblemRect.width / 2)) < 2 &&
        Math.abs((orbitRect.top + orbitRect.height / 2) - (emblemRect.top + emblemRect.height / 2)) < 2,
      text,
      messageText: msg?.textContent?.trim() || '',
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      leakedPortal: Boolean(document.querySelector('.portal-sidebar, .portal-topbar, .auth-layout'))
    };
  });

  assert(checks.role === 'status', `[${viewportLabel}] role="status" expected, got ${checks.role}`);
  assert(checks.ariaLive === 'polite', `[${viewportLabel}] aria-live="polite" expected`);
  assert(checks.ariaBusy === 'true', `[${viewportLabel}] aria-busy="true" expected`);
  assert(checks.bg === 'rgb(248, 250, 252)', `[${viewportLabel}] expected #F8FAFC bg, got ${checks.bg}`);
  assert(checks.arcStroke === 'rgb(13, 148, 136)', `[${viewportLabel}] expected #0D9488 teal ring, got ${checks.arcStroke}`);
  assert(checks.emblemVisible, `[${viewportLabel}] official brand emblem must be visible`);
  assert(checks.centered, `[${viewportLabel}] emblem must be centered inside spinning ring`);
  assert(!checks.hasHorizontalOverflow, `[${viewportLabel}] unexpected horizontal overflow`);
  assert(!checks.leakedPortal, `[${viewportLabel}] protected/portal layout leaked while loading!`);
  assert(!/\b(ADMIN|STAFF|ROOM_HOST)\b|Chủ trọ|Nhân viên|Quản trị/i.test(checks.text), `[${viewportLabel}] role-specific text leaked: ${checks.text}`);
  assert(checks.messageText.length > 0, `[${viewportLabel}] neutral loading message missing`);

  if (screenshotName) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName), fullPage: false });
  }
  return checks;
}

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // 1. Verify raw index.html bootstrap splash (pre-React white-screen prevention)
  const htmlRes = await fetch(`${BASE_URL}/`);
  assert(htmlRes.ok, `Dev server not reachable at ${BASE_URL}`);
  const htmlText = await htmlRes.text();
  assert(htmlText.includes('data-testid="bootstrap-loading"'), 'index.html missing pre-React bootstrap loader');
  assert(htmlText.includes('#0d9488') && htmlText.includes('#f8fafc'), 'index.html missing teal/slate-50 tokens');
  assert(htmlText.includes('prefers-reduced-motion: reduce'), 'index.html missing prefers-reduced-motion rule');
  console.log('PASS [1/7] index.html pre-React bootstrap loader verified');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    // 2. GlobalLoading visuals, responsive viewports (1440 / 768 / 375), and prefers-reduced-motion
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await seedToken(context);
      const page = await context.newPage();
      await stubCommonApis(page);

      let releaseAuth;
      const authGate = new Promise((resolve) => { releaseAuth = resolve; });
      await page.route('**/api/auth/me', async (route) => {
        await authGate;
        await route.fulfill(apiOk({ userId: 10, email: 'host@hlrcs.vn', fullName: 'Chủ trọ Demo', role: 'ROOM_HOST' }));
      });

      const navPromise = page.goto(`${BASE_URL}/host`, { waitUntil: 'domcontentloaded' });
      const desktopChecks = await verifyGlobalLoadingVisuals(page, '1440x900', 'global-loading-1440.png');
      assert(desktopChecks.arcAnimation === 'gl-rotate', `Expected gl-rotate animation, got ${desktopChecks.arcAnimation}`);

      await page.setViewportSize({ width: 768, height: 1024 });
      await verifyGlobalLoadingVisuals(page, '768x1024', 'global-loading-768.png');

      await page.setViewportSize({ width: 375, height: 812 });
      await verifyGlobalLoadingVisuals(page, '375x812', 'global-loading-375.png');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reducedAnim = await page.evaluate(() => getComputedStyle(document.querySelector('.gl-ring-arc')).animationName);
      assert(reducedAnim === 'none', `Expected animationName="none" under reducedMotion, got ${reducedAnim}`);

      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: 1440, height: 900 });
      releaseAuth();
      await navPromise;
      await page.locator('.host-portal').waitFor({ state: 'visible', timeout: 10000 });
      assert(await page.getByTestId('global-loading').count() === 0, 'GlobalLoading did not unmount after auth resolved');
      await context.close();
      console.log('PASS [2/7] GlobalLoading visuals, 1440/768/375 responsive, prefers-reduced-motion, and zero-leak verified');
    }

    // 3. Error & Retry Recovery (never spins forever!)
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await seedToken(context);
      const page = await context.newPage();
      await stubCommonApis(page);

      let shouldFail = true;
      await page.route('**/api/auth/me', async (route) => {
        if (shouldFail) {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Không thể kết nối máy chủ xác thực.' })
          });
        }
        return route.fulfill(apiOk({ userId: 10, email: 'host@hlrcs.vn', fullName: 'Chủ trọ Demo', role: 'ROOM_HOST' }));
      });

      await page.goto(`${BASE_URL}/host`, { waitUntil: 'domcontentloaded' });
      const errView = page.getByTestId('global-loading-error');
      await errView.waitFor({ state: 'visible', timeout: 10000 });
      assert(await page.getByTestId('global-loading').count() === 0, 'Spinner must stop on error');
      const errText = await errView.innerText();
      assert(errText.includes('Không thể kết nối máy chủ xác thực.'), `Error text missing: ${errText}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'global-loading-error-1440.png'), fullPage: false });

      shouldFail = false;
      await errView.getByRole('button', { name: 'Thử lại' }).click();
      await page.locator('.host-portal').waitFor({ state: 'visible', timeout: 10000 });
      await context.close();
      console.log('PASS [3/7] Auth bootstrap error state + Retry recovery verified');
    }

    // 4. Guest (Unauthenticated): public home loads cleanly; protected /host redirects to /login
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await stubCommonApis(page);

      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      assert(await page.getByTestId('global-loading').count() === 0, 'Guest home stuck in GlobalLoading');
      assert(pageErrors.length === 0, `Guest home pageerrors: ${pageErrors.join('; ')}`);

      await page.goto(`${BASE_URL}/host`, { waitUntil: 'networkidle' });
      await page.waitForURL('**/login', { timeout: 10000 });
      assert(await page.locator('.host-portal').count() === 0, 'Guest saw host portal');
      await context.close();
      console.log('PASS [4/7] Guest role & unauthenticated redirect verified');
    }

    // 5. Tenant (USER): loads /profile, redirected away from /host to /
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await seedToken(context);
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await stubCommonApis(page);
      await page.route('**/api/auth/me', async (route) => {
        await new Promise((r) => setTimeout(r, 120));
        await route.fulfill(apiOk({ userId: 2, email: 'tenant@hlrcs.vn', fullName: 'Nguyễn Sinh Viên', role: 'USER' }));
      });

      await page.goto(`${BASE_URL}/host`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
      assert(await page.locator('.host-portal').count() === 0, 'USER leaked host portal');
      assert(pageErrors.length === 0, `USER pageerrors: ${pageErrors.join('; ')}`);
      await context.close();
      console.log('PASS [5/7] Tenant (USER) role & guard redirect verified');
    }

    // 6. Staff (STAFF): loads /staff, redirected away from /admin to /staff
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await seedToken(context);
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await stubCommonApis(page);
      await page.route('**/api/auth/me', async (route) => {
        await new Promise((r) => setTimeout(r, 120));
        await route.fulfill(apiOk({ userId: 3, email: 'staff@hlrcs.vn', fullName: 'Trần Nhân Viên', role: 'STAFF' }));
      });

      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/staff', { timeout: 10000 });
      await page.locator('.staff-portal').waitFor({ state: 'visible', timeout: 10000 });
      assert(pageErrors.length === 0, `STAFF pageerrors: ${pageErrors.join('; ')}`);
      await context.close();
      console.log('PASS [6/7] Staff (STAFF) role, lazy StaffDashboardPage & guard redirect verified');
    }

    // 7. Admin (ADMIN) + in-portal lazy route transition (PageLoading tier)
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await seedToken(context);
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await stubCommonApis(page);
      await page.route('**/api/auth/me', async (route) => {
        await new Promise((r) => setTimeout(r, 120));
        await route.fulfill(apiOk({ userId: 1, email: 'admin@hlrcs.vn', fullName: 'Quản trị Hệ thống', role: 'ADMIN' }));
      });

      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await page.locator('.admin-portal').waitFor({ state: 'visible', timeout: 10000 });

      // Delay lazy chunk for StaffServiceApplicationsPage to observe in-layout PageLoading
      let releaseChunk;
      const chunkGate = new Promise((resolve) => { releaseChunk = resolve; });
      await page.route('**/src/pages/staff/StaffServiceApplicationsPage.jsx*', async (route) => {
        await chunkGate;
        await route.continue();
      });

      await page.locator('.portal-sidebar a[href="/staff/service-applications"]').click();
      await page.getByTestId('page-loading').waitFor({ state: 'visible', timeout: 10000 });
      assert(await page.locator('.portal-sidebar').isVisible(), 'Sidebar vanished during in-portal PageLoading');
      assert(await page.getByTestId('global-loading').count() === 0, 'GlobalLoading wrongly triggered during in-portal lazy route switch');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'page-loading-1440.png'), fullPage: false });
      releaseChunk();
      await page.getByTestId('page-loading').waitFor({ state: 'hidden', timeout: 10000 });
      assert(pageErrors.length === 0, `ADMIN pageerrors: ${pageErrors.join('; ')}`);
      await context.close();
      console.log('PASS [7/7] Admin (ADMIN) role & in-portal lazy PageLoading (keeping PortalLayout mounted) verified');
    }

    console.log('\nALL 7 GLOBAL LOADING E2E CHECKS PASSED!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
