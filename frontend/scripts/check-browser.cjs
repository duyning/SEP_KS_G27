const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

// PLAYWRIGHT_MODULE can point at an installed Playwright package without adding
// browser tooling to the production frontend dependency graph.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../migration/browser-results');
const sizes = [[1920,1080], [1440,900], [1366,768], [1280,800], [1024,768], [768,1024], [390,844]];
const actors = [
  { role: 'GUEST' },
  { role: 'USER', email: 'user@hlrcs.com', password: '123456', landing: '/' },
  { role: 'ROOM_HOST', email: 'host@hlrcs.com', password: '123456', landing: '/host' },
  { role: 'STAFF', email: 'staff@hlrcs.com', password: '123456', landing: '/staff' },
  { role: 'ADMIN', email: 'admin@hlrcs.com', password: 'admin123', landing: '/admin' },
];
const { pathToFileURL } = require('node:url');
async function waitForBackgroundImages(page) {
  const loaded = await page.evaluate(async () => {
    const elements = [...document.querySelectorAll('.rental-hero,.showcase')].filter(element => element.getClientRects().length);
    return Promise.all(elements.map(async element => {
      const url = getComputedStyle(element).backgroundImage.match(/url\("?([^"\)]+)/)?.[1];
      if (!url) return false;
      const image = new Image(); image.src = url;
      return Promise.race([image.decode().then(() => image.naturalWidth > 0).catch(() => false), new Promise(resolve => setTimeout(() => resolve(false), 15000))]);
    }));
  });
  assert.ok(loaded.every(Boolean), 'A primary background image did not load');
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const { screens, canAccess } = await import(pathToFileURL(path.resolve(__dirname, '../src/routing/screens.js')));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = { viewportChecks: [], guardChecks: [], apiChecks: [], consoleErrors: [], networkFailures: [], externalFailures: [], screenshots: [] };
  const checkedLinks = new Set();
  try {
    for (const actor of actors) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', error => results.consoleErrors.push({ role: actor.role, message: error.message }));
      page.on('response', response => {
        if (response.status() >= 400) {
          const item = { role: actor.role, url: response.url().replace(base, ''), status: response.status() };
          if (response.url().startsWith(base)) results.networkFailures.push(item); else results.externalFailures.push(item);
        }
      });
      if (actor.email) {
        await page.goto(`${base}/login`);
        await page.locator('#email').fill(actor.email);
        await page.locator('#password').fill(actor.password);
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForURL(`${base}${actor.landing}`);
        await page.reload();
        await page.locator('#main-content').waitFor();
        const me = await page.evaluate(async () => {
          const token = sessionStorage.getItem('hlrcs_access_token') || localStorage.getItem('hlrcs_access_token');
          return (await (await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).json()).data;
        });
        assert.equal(me.role, actor.role);
        results.apiChecks.push({ actor: actor.role, identityVerified: true, refreshVerified: true });
      }
      // Direct route access: no forged users, roles or tokens are installed.
      for (const screen of screens.filter(item => !['auth','redirect'].includes(item.kind))) {
        const allowed = canAccess(screen.portal, actor.email ? { role: actor.role } : null);
        if (allowed) continue;
        await page.goto(`${base}${screen.path}`);
        if (actor.email) await page.getByRole('heading', { name: 'Không có quyền truy cập' }).waitFor();
        else await page.waitForURL(/\/login$/);
        results.guardChecks.push({ actor: actor.role, path: screen.path, denied: true });
      }
      // Each screen family uses the lowest-privilege actor that can view it.
      const portal = { GUEST: 'public', USER: 'member', ROOM_HOST: 'host', STAFF: 'staff', ADMIN: 'admin' }[actor.role];
      const pages = screens.filter(item => item.portal === portal && !['auth', 'redirect'].includes(item.kind));
      for (const screen of pages) {
        await page.goto(`${base}${screen.path}${screen.path.endsWith('/detail') ? '?id=integration-check' : ''}`);
        await page.locator('#main-content').waitFor();
        if (screen.kind === 'home') await waitForBackgroundImages(page);
        for (const [width, height] of sizes) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, main: !!document.querySelector('#main-content')?.textContent.trim() }));
          assert.ok(dimensions.main, `Blank ${screen.path}`);
          assert.ok(dimensions.scroll <= width + 1, `Overflow ${screen.path}: ${dimensions.scroll}/${width}`);
          results.viewportChecks.push({ path: screen.path, width, height, overflow: false });
          if ([1920,390].includes(width) && ['/', '/search', '/profile', '/host', '/host/property/new', '/staff/verifications', '/staff/assistance/detail', '/admin'].includes(screen.path)) {
            const filename = `${screen.path.replace(/\//g, '-') || 'home'}-${width}.png`;
            await page.screenshot({ path: path.join(output, filename), fullPage: true });
            results.screenshots.push(filename);
          }
        }
        for (const href of await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.getAttribute('href')))) {
          if (!href.startsWith('/') || href.startsWith('//')) continue;
          const pathname = new URL(href, base).pathname;
          assert.ok(screens.some(item => item.path === pathname) || pathname === '/account', `Unmapped link: ${href}`);
          checkedLinks.add(href);
        }
        if (screen.kind !== 'profile') {
          const text = await page.locator('#main-content').innerText();
          assert.ok(text.includes('chưa') || text.includes('Chưa'), `No gap state ${screen.path}`);
        }
      }
      if (actor.role === 'ROOM_HOST') {
        await page.goto(`${base}/host-room-availability.html?id=keep&filter=AVAILABLE#rooms`);
        await page.waitForURL(`${base}/host/rooms?id=keep&filter=AVAILABLE#rooms`);
        await page.goto(`${base}/host/property/new`);
        await page.getByLabel('Tên nhà trọ', { exact: true }).fill('Transient local UI draft');
        await page.getByRole('button', { name: 'Tiếp theo' }).click();
        await page.getByLabel('Địa chỉ chi tiết', { exact: true }).fill('Unsaved UI state');
        await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
        assert.equal(await page.getByLabel('Tên nhà trọ', { exact: true }).inputValue(), 'Transient local UI draft');
      }
      if (actor.role === 'STAFF') {
        await page.goto(`${base}/staff-assistance-request-detail.html?id=keep-id`);
        await page.waitForURL(`${base}/staff/assistance/detail?id=keep-id`);
        await page.locator('#staff-reply').fill('Draft only. No backend mutation should run.');
        assert.equal(await page.getByRole('button', { name: 'Gửi phản hồi', exact: true }).isDisabled(), true);
      }
      if (actor.role === 'ADMIN') {
        await page.goto(`${base}/admin`);
        for (const tab of ['Tài khoản hệ thống', 'Phân công nhân viên', 'Nhật ký hoạt động']) {
          await page.getByRole('tab', { name: tab, exact: true }).click();
          await page.getByRole('tab', { name: tab, exact: true }).getAttribute('aria-selected').then(value => assert.equal(value, 'true'));
          assert.equal(await page.locator('[role="tabpanel"]').isVisible(), true);
        }
      }
      if (actor.role === 'GUEST') {
        for (const pathname of ['/login', '/register']) {
          await page.goto(`${base}${pathname}`);
          await page.setViewportSize({ width: 1920, height: 1080 });
          await waitForBackgroundImages(page);
          for (const [width, height] of sizes) {
            await page.setViewportSize({ width, height });
            const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            assert.ok(scrollWidth <= width + 1, `Overflow ${pathname}: ${scrollWidth}/${width}`);
            results.viewportChecks.push({ path: pathname, width, height, overflow: false });
            if ([1920,390].includes(width)) {
              const filename = `${pathname.slice(1)}-${width}.png`;
              await page.screenshot({ path: path.join(output, filename), fullPage: true });
              results.screenshots.push(filename);
            }
          }
        }
        await page.goto(`${base}/login`);
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.locator('#email-error').waitFor();
        await page.goto(`${base}/register`);
        await page.locator('#fullName').fill('Validation test only');
        await page.locator('#email').fill('not-submitted@example.test');
        await page.locator('#password').fill('Validation@123');
        await page.locator('#confirmPassword').fill('DoesNotMatch@123');
        await page.locator('#confirmed').check();
        await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
        await page.locator('#confirmPassword-error').waitFor();
      }
      // Mobile menu keyboard close and focus return, plus navigation.
      const menuPath = actor.landing || '/';
      await page.goto(`${base}${menuPath}`);
      await page.setViewportSize({ width: 390, height: 844 });
      const openMenu = page.getByRole('button', { name: 'Mở menu', exact: true });
      await openMenu.click();
      await page.locator('#portal-navigation.is-open').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await openMenu.getAttribute('aria-expanded'), 'false');
      if (actor.email) {
        await openMenu.click();
        await page.locator('#portal-navigation').getByRole('button', { name: 'Đăng xuất', exact: true }).click();
        await page.waitForURL(/\/login$/);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('hlrcs_access_token') || localStorage.getItem('hlrcs_access_token')), null);
      }
      await context.close();
    }
    // A rejected token must clear the session and protect direct profile access.
    const expiredContext = await browser.newContext();
    await expiredContext.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'invalid-test-token'));
    const expiredPage = await expiredContext.newPage();
    const rejected = expiredPage.waitForResponse(response => response.url().endsWith('/api/auth/me') && response.status() === 401);
    await expiredPage.goto(`${base}/profile`);
    await rejected;
    await expiredPage.waitForURL(/\/login$/);
    assert.equal(await expiredPage.evaluate(() => sessionStorage.getItem('hlrcs_access_token')), null);
    results.expiredToken = { profileDenied: true, storageCleared: true, expectedStatus: 401 };
    await expiredContext.close();
    results.checkedLinks = [...checkedLinks];
    assert.deepEqual(results.consoleErrors, []);
    assert.deepEqual(results.networkFailures, []);
    results.status = 'PASS';
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ status: results.status, viewportChecks: results.viewportChecks.length, guards: results.guardChecks.length, verifiedActors: results.apiChecks.length, internalNetworkErrors: results.networkFailures.length, consoleErrors: results.consoleErrors.length, externalFailures: results.externalFailures, output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
