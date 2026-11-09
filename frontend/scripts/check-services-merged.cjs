// Run against a running frontend; every API request is mocked (no backend writes).
const assert = require('node:assert/strict');
const path = require('node:path');
let playwrightPath;
try { playwrightPath = require.resolve(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch (error) {
  if (process.env.PLAYWRIGHT_MODULE) throw error;
  playwrightPath = require.resolve(path.resolve(path.dirname(process.execPath), '../node_modules/playwright'));
}

const playwright = require(playwrightPath);
const { expect } = require(path.join(path.dirname(playwrightPath), 'test.js'));

(async () => {
  const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(10000);
    const errors = [], privatePhotos = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'mock-owner'));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTbkAAAAASUVORK5CYII=', 'base64');
    const row = {
      serviceId: 1, providerId: 7, serviceName: 'Giặt sấy Tân Xã', categoryId: 2,
      categoryName: 'Giặt là sinh viên', providerName: 'Nguyễn An',
      description: 'Dịch vụ giặt sấy dành cho người thuê trọ quanh Hòa Lạc.',
      serviceArea: 'Tân Xã', pricingType: 'FROM', price: 50000, pricingLabel: 'Từ 50.000 VNĐ',
      contactPhone: '0987654321', contactEmail: 'owner@example.test',
      activeState: 'ACTIVE', publicEligible: true,
      imageUrl: '/api/services/1/image?index=0&v=1',
      imageUrls: [0, 1, 2].map(index => `/api/services/1/image?index=${index}&v=1`),
    };
    const application = { ...row, registrationId: 10, status: 'APPROVED', operation: 'CREATE',
      listingDecision: 'APPROVE', capabilityDecision: 'APPROVE', capabilityActive: true,
      serviceState: 'ACTIVE', revision: 1, serviceRevision: 1, hasImage: true, imageCount: 3, documents: [] };
    let releaseOwnership, holdOwnership = true;
    const ownershipGate = new Promise(resolve => { releaseOwnership = resolve; });
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = url.pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (request.method() !== 'GET') writes.push(`${request.method()} ${pathname}`);
      if (pathname === '/api/auth/me') return ok({ userId: 7, role: 'USER', fullName: 'Nguyễn An', email: 'owner@example.test' });
      if (pathname === '/api/services/categories') return ok([{ categoryId: 2, name: row.categoryName }]);
      if (pathname === '/api/services') return ok([row]);
      if (pathname === '/api/services/1') return ok(row);
      if (pathname === '/api/service-registrations/mine') {
        if (holdOwnership) {
          await ownershipGate;
          return route.fulfill({ status: 503, json: { success: false, message: 'Mock ownership unavailable' } });
        }
        return ok([application]);
      }
      if (/\/image$/.test(pathname)) {
        if (pathname.startsWith('/api/service-registrations/')) privatePhotos.push(pathname);
        return route.fulfill({ contentType: 'image/png', body: png });
      }
      throw new Error(`Unexpected API: ${request.method()} ${pathname}`);
    });

    const base = (process.env.FRONTEND_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
    await page.goto(`${base}/services?category=laundry&q=giat&area=tan-xa&sort=price-asc`);
    await page.locator('.sv-service-card').waitFor();
    const entry = page.locator('.sv-hero-actions button');
    await expect(entry).toBeDisabled();
    await expect(entry).toHaveAttribute('aria-busy', 'true');
    assert.equal(await page.locator('.sv-page .svc-catalog').count(), 0);
    const cardPhoto = page.locator('.sv-service-card img.svc-photo');
    await cardPhoto.scrollIntoViewIfNeeded();
    await expect(cardPhoto).toHaveAttribute('src', row.imageUrl);
    await page.waitForFunction(() => document.querySelector('.sv-service-card img')?.naturalWidth > 0);
    assert.deepEqual(privatePhotos, []);
    holdOwnership = false;
    releaseOwnership();
    await expect(entry).toHaveText('Thử lại hồ sơ');
    await entry.click();
    await expect(entry).toHaveText('Dịch vụ của tôi');
    await entry.click();
    const dialog = page.getByRole('dialog', { name: 'Dịch vụ của tôi', exact: true });
    await dialog.waitFor();
    await dialog.getByRole('heading', { name: row.serviceName, exact: true }).waitFor();
    await expect.poll(() => privatePhotos.length).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(new URL(page.url()).searchParams.get('q'), 'giat');
    await expect(entry).toHaveText('Dịch vụ của tôi');

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Catalog overflow at ${width}`);
    }
    const privateBeforeDetail = privatePhotos.length;
    await page.locator('.sv-service-card .sv-detail-link').click();
    await page.locator('.sv-detail-grid .svc-gallery').waitFor();
    await expect(page.locator('.svc-gallery-heading')).toContainText('1 / 3');
    await page.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click();
    await expect(page.locator('.svc-gallery > img')).toHaveAttribute('src', row.imageUrls[1]);
    await page.getByRole('button', { name: 'Xem ảnh 3', exact: true }).click();
    await expect(page.locator('.svc-gallery-heading')).toContainText('3 / 3');
    assert.equal(privatePhotos.length, privateBeforeDetail);
    assert.equal(await page.locator('.sv-detail-contact a[href^="tel:"]').getAttribute('href'), 'tel:0987654321');
    assert.equal(await page.locator('.sv-detail-contact a[href^="mailto:"]').getAttribute('href'), 'mailto:owner@example.test');
    await page.goBack();
    await expect(entry).toHaveText('Dịch vụ của tôi');
    assert.equal(await page.getByLabel('Lọc theo khu vực').inputValue(), 'tan-xa');
    assert.equal(await page.getByLabel('Sắp xếp danh sách').inputValue(), 'price-asc');
    await entry.click();
    await dialog.waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('hlrcs:session-expired')));
    await dialog.waitFor({ state: 'hidden' });
    await expect(entry).toHaveText('Đăng ký dịch vụ / Xem hồ sơ');
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log(JSON.stringify({ passed: true, svUI: true, ownershipBusyRetry: true,
      managementEntry: true, sessionIsolation: true, publicPhotosAndGallery: true,
      privatePhotosOnlyInManagement: true, contactPreserved: true, filtersAndBack: true,
      widths: [375, 768, 1024, 1440], backendWrites: 0 }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
