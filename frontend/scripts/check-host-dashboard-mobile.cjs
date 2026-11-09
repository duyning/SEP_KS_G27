// UI fixtures are intercepted in the browser; this check never writes to the database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const output = path.resolve(__dirname, '../../target/host-dashboard-mobile');
    fs.mkdirSync(output, { recursive: true });
    const populated = {
      properties: [
        { propertyId: 10, name: 'Nhà trọ An Khang – Studio Tân Xã', address: 'Thôn 2, Tân Xã, Thạch Thất, Hà Nội', status: 'ACTIVE', roomTypeCount: 2, minimumPrice: 2200000 },
        { propertyId: 11, name: 'Nhà trọ Sinh Viên Hòa Lạc – Cơ sở Bình Yên', address: 'Đường liên thôn Bình Yên, Thạch Thất, Hà Nội', status: 'ACTIVE', roomTypeCount: 1, minimumPrice: null },
      ],
      recentViewings: [
        { bookingId: 20, renterName: 'Nguyễn Minh Anh', propertyName: 'Nhà trọ An Khang', roomType: 'Studio ban công', scheduledDate: '2026-11-05T10:00:00', status: 'PENDING' },
        { bookingId: 21, renterName: 'Trần Nguyễn Hoàng Minh', propertyName: 'Nhà trọ Sinh Viên Hòa Lạc – Cơ sở Bình Yên', roomType: 'Phòng khép kín có gác lửng', scheduledDate: '2026-11-06T14:30:00', status: 'APPROVED' },
      ],
      roomTypeCount: 3, pendingViewingCount: 1, pendingRegistrationCount: 1,
      totalRoomCount: 10, availableRoomCount: 3, occupancyRate: '70%', activeListingCount: 2,
    };
    const empty = { properties: [], recentViewings: [], roomTypeCount: 0, pendingViewingCount: 0, pendingRegistrationCount: 0 };
    let data = populated, requests = 0, failed = false, eligibilityFailed = false, eligible = true, release = null, hold = false;
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'dashboard-mobile-test'));
    await page.route('http://127.0.0.1:5173/api/**', async route => {
      const request = route.request(), url = new URL(request.url()).pathname;
      assert.equal(request.method(), 'GET', 'Dashboard only reads API data');
      const ok = value => route.fulfill({ json: { success: true, data: value } });
      if (url === '/api/auth/me') return ok({ userId: 8, role: 'ROOM_HOST', fullName: 'Trần Nguyễn Gia Huy', email: 'host.long.email@example.test' });
      if (url.endsWith('/eligibility')) return eligibilityFailed
        ? route.fulfill({ status: 503, json: { success: false, message: 'Không kiểm tra được quyền đăng ký.' } })
        : ok({ canRegister: eligible, reason: eligible ? 'ELIGIBLE' : 'PENDING' });
      if (url === '/api/host/dashboard') {
        requests++;
        if (hold) await new Promise(resolve => { release = resolve; });
        return failed ? route.fulfill({ status: 503, json: { success: false, message: 'Không tải được dữ liệu kiểm thử.' } }) : ok(data);
      }
      throw Error('Unexpected API: ' + url);
    });
    const fits = async label => {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': no horizontal overflow');
      const escaped = await page.locator('.kpi-card, .btn-quick-action, #viewingRequestsTable tbody tr, .my-prop-row, .host-empty-action').evaluateAll(nodes => nodes.filter(node => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && (box.x < -1 || box.right > innerWidth + 1);
      }).map(node => node.className));
      assert.deepEqual(escaped, [], label + ': cards fit');
    };
    for (const width of [320, 360, 375, 390, 414, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('http://127.0.0.1:5173/host');
      await page.locator('#btnQuickAddProperty').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await fits('populated ' + width);
      assert.equal(await page.locator('#kpiPropertyCount').innerText(), '2');
      assert.equal(await page.locator('#kpiAvailableRoomCount').innerText(), '3');
      assert.equal(await page.locator('#chipOccupiedCount').innerText(), '7');
      assert.equal(await page.locator('#dashOccupancyFill').evaluate(node => node.style.width), '70%');
      assert.equal(await page.locator('#viewingRequestsTable tbody tr').count(), 2);
      assert.equal(await page.locator('#myPropertiesList .my-prop-row').count(), 2);
      assert.equal(await page.locator('#btnQuickManageRooms').getAttribute('href'), '/host/rooms');
      assert.equal(await page.locator('.my-prop-actions a').first().getAttribute('href'), '/host/property?id=10');
      for (const selector of ['.portal-menu-toggle', '.hd-context-refresh', '#btnHostUserDropdown', '#btnQuickAddProperty']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width, selector + ': touch target');
      }
      await page.screenshot({ path: path.join(output, `mobile-${width}.png`), fullPage: true });
      if (width === 390) await page.screenshot({ path: path.join(output, 'overview-390.png') });
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      await page.locator('#portal-navigation').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#portal-navigation a[href="/host/notifications"]').isVisible(), true);
      assert.equal(await page.locator('#portal-navigation a[href="/"]').isVisible(), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      for (let tab = 0; tab < 14; tab++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#portal-navigation').evaluate(node => node.contains(document.activeElement)), true, 'Menu keeps keyboard focus');
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.portal-menu-toggle').evaluate(node => node === document.activeElement), true);
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.locator('#btnHostUserDropdown').click();
      await page.locator('#hostUserPopover').waitFor();
      assert.equal(await page.locator('#hostUserPopover a[href="/profile"]').isVisible(), true);
      assert.equal(await page.locator('#hostUserPopover a[href="/"]').isVisible(), true);
      assert.equal(await page.locator('#btnPopoverLogout').isVisible(), true);
      await fits('account ' + width);
      await page.keyboard.press('Escape');
    }
    const previous = requests;
    data = { ...populated, availableRoomCount: 4, occupancyRate: '60%' };
    await page.getByRole('button', { name: 'Làm mới dữ liệu', exact: true }).click();
    await page.locator('#kpiAvailableRoomCount').filter({ hasText: '4' }).waitFor();
    assert.ok(requests > previous);
    assert.equal(await page.locator('#dashOccupancyRate').innerText(), '60%');
    for (const width of [320, 390, 430]) {
      data = empty;
      await page.setViewportSize({ width, height: 844 });
      await page.reload();
      await page.getByRole('link', { name: 'Đăng ký nhà trọ', exact: true }).last().waitFor();
      await page.locator('.host-empty-action').waitFor();
      await fits('empty ' + width);
      assert.equal(await page.locator('.host-empty-action').getAttribute('href'), '/host/property/new');
      await page.screenshot({ path: path.join(output, `empty-mobile-${width}.png`), fullPage: true });
      data = { ...empty, pendingRegistrationCount: 2 };
      eligible = false;
      await page.reload();
      await page.getByRole('link', { name: 'Theo dõi hồ sơ', exact: true }).waitFor();
      await fits('pending ' + width);
      assert.ok((await page.locator('#newHostOnboardingState').innerText()).includes('2 hồ sơ'));
      assert.equal(await page.locator('.host-empty-action').getAttribute('href'), '/host/property');
      await page.screenshot({ path: path.join(output, `pending-mobile-${width}.png`), fullPage: true });
      eligible = true;
    }
    data = { ...populated, recentViewings: [] };
    await page.reload();
    await page.locator('.empty-feed-card').waitFor();
    await fits('no viewings');
    data = empty; eligibilityFailed = true;
    await page.reload();
    await page.locator('.host-empty-error').waitFor();
    assert.equal(await page.locator('.host-empty-action').count(), 0);
    await fits('eligibility error');
    eligibilityFailed = false; failed = true;
    await page.reload();
    await page.locator('.portal-state.error').waitFor();
    await fits('error');
    await page.screenshot({ path: path.join(output, 'error-mobile-430.png') });
    failed = false; data = populated; hold = true;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.locator('.portal-state.loading').waitFor();
    assert.equal(await page.locator('.hd-context-refresh').isDisabled(), true);
    await fits('loading');
    await page.waitForFunction(() => document.querySelector('.portal-state.loading'));
    while (!release) await new Promise(resolve => setTimeout(resolve, 10));
    hold = false; release();
    await page.locator('#kpiPropertyCount').waitFor();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, mobileWidths: 6, emptyAndPendingWidths: 3, apiCounters: true, refresh: true, menuAndAccount: true, errorRetry: true, loading: true, eligibilityFailure: true, realDatabaseWrites: 0, pageErrors: 0 }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
