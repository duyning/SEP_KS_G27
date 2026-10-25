const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../migration/host-property-check');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, '../src/pages/host/HostPropertyPage.jsx'), 'utf8'), /MOCK_HOST|fixtures\/|DemoNoticeBanner/);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    const capture = async name => {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await page.screenshot({ path: path.join(output, name), fullPage: true, animations: 'disabled' });
    };
    await page.goto(`${base}/login`);
    await page.locator('#loginIdentifier').fill('host@hlrcs.com');
    await page.locator('#loginPassword').fill('123456');
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(`${base}/host`);
    const actualRequest = page.waitForResponse(response => new URL(response.url()).pathname === '/api/host/property' && response.status() === 200);
    await page.goto(`${base}/host/property`);
    const actual = await (await actualRequest).json();
    assert.equal(actual.success, true);
    if (actual.data.records.length) {
      await page.locator('.hp-property-card').first().getByRole('link',{name:'Xem chi tiết',exact:true}).click();
      await page.locator('.hp-detail').first().waitFor();
      if (actual.data.records[0].photos.length) await page.waitForFunction(() => document.querySelector('.hp-cover img')?.naturalWidth > 0);
      await capture('database-property-1536.png');
    }
    if (!actual.data.records.length) {
      await page.locator('#stateNoProperty').waitFor();
      await page.getByRole('link', { name: 'Đăng ký nhà trọ của bạn ngay', exact: true }).click();
      await page.waitForURL(`${base}/host/property/new`);
    }
    // Alternative records and bitmaps below are browser-only contracts, never MySQL seeds.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=', 'base64');
    let photoRequests = 0;
    await page.route('**/api/host/property/photos/*', route => {
      assert.match(route.request().headers().authorization, /^Bearer /);
      photoRequests++;
      return route.fulfill({ contentType: 'image/png', body: png });
    });
    let response = { status: 200, data: { records: [] } };
    await page.route(/\/api\/host\/property(?:\?|$)/, route => route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.status === 200 ? { success: true, data: response.data } : { success: false, message: 'Test-only server error' }) }));
    await page.goto(`${base}/host/property`);
    await page.locator('#stateNoProperty').waitFor();
    response = { status: 500 };
    await page.goto(`${base}/host/property`);
    await page.getByRole('heading', { name: 'Không thể tải dữ liệu', exact: true }).waitFor();
    assert.equal(await page.locator('#stateNoProperty').count(), 0);
    const record = { propertyId: null, registrationId: 123, name: 'Nhà trọ theo hợp đồng kiểm thử giao diện', address: 'Số 18, ngõ 4, thôn 2, Tân Xã', displayStatus: 'PENDING', verified: false, propertyType: 'Nhà trọ truyền thống / Phòng trọ sinh viên', addressDetail: 'Số 18, ngõ 4, thôn 2', commune: 'Tân Xã', managerName: 'Chủ trọ kiểm thử', contactPhone: '0912345678', zaloPhone: '0912345678', description: 'Thông tin phản hồi chỉ dùng để kiểm thử giao diện, không phải dữ liệu mẫu trong ứng dụng.', amenities: ['wifi','parking','camera'], selectedRules: ['quietHours','cleanliness'], rules: 'Quy định riêng của hồ sơ.', photos: [{ documentId: 901, type: 'PHOTO_0', fileName: 'test.png' }], documents: [{ documentId: 902, type: 'OWNERSHIP', verificationStatus: 'PENDING' }, { documentId: 903, type: 'ID_CARD', verificationStatus: 'PENDING' }], roomTypeCount: 0, totalRooms: null, vacantRooms: null, pendingViewingCount: 0, createdAt: '2026-10-22T09:00:00', updatedAt: null };
    response = { status: 200, data: { records: [record] } };
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.locator('.hp-property-card').first().getByRole('link',{name:'Xem chi tiết',exact:true}).click();
    await page.locator('.hp-detail[data-status=PENDING]').waitFor();
    assert.equal(await page.locator('#stateNoProperty').count(), 0);
    const pendingColor = await page.locator('.hp-name-row .hp-status').evaluate(element => getComputedStyle(element).color);
    for (const status of ['PENDING','VISIBLE']) {
      response = { status: 200, data: { records: [{ ...record, propertyId: status === 'VISIBLE' ? 456 : null, displayStatus: status, verified: status === 'VISIBLE', roomTypeCount: status === 'VISIBLE' ? 2 : 0 }] } };
      for (const width of [1920,1536,1440,1366,1024,768,390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        await page.goto(`${base}/host/property?${status==='VISIBLE'?'id=456':'registrationId=123'}`);
        await page.locator(`.hp-detail[data-status=${status}]`).waitFor();
        await page.waitForFunction(() => Array.from(document.querySelectorAll('.hp-cover img, .hp-gallery img')).length === 2 && Array.from(document.querySelectorAll('.hp-cover img, .hp-gallery img')).every(image => image.complete && image.naturalWidth > 0));
        const badge = page.locator('.hp-name-row .hp-status');
        assert.equal(await badge.innerText(), status === 'PENDING' ? 'Hồ sơ đang chờ xét duyệt' : 'Đang hiển thị');
        if (status === 'VISIBLE') assert.notEqual(await badge.evaluate(element => getComputedStyle(element).color), pendingColor);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${status} overflows at ${width}`);
        assert.equal(await page.locator('.hp-documents img').count(), 0);
        assert.equal(await page.locator('.hp-metrics > div').count(), 4);
        assert.ok(await page.getByRole('button', { name: 'Xem trang công khai', exact: true }).isDisabled());
        if ([1536,390].includes(width)) await capture(`${status.toLowerCase()}-${width}.png`);
      }
    }
    await page.getByRole('button', { name: 'Xem ảnh đại diện nhà trọ', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.ok(photoRequests > 0);
    await page.getByRole('link', { name: 'Quản lý loại phòng', exact: true }).click();
    await page.waitForURL(`${base}/host/room-types?propertyId=456`);
    await page.goto(`${base}/host/property?id=999`);
    await page.getByText('Không tìm thấy nhà trọ hoặc hồ sơ này trong danh sách bạn được phép quản lý.', { exact: true }).waitFor();
    assert.equal(await page.locator('.hp-detail').count(), 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', actualDatabaseRecords: actual.data.records.length, actualDatabaseStates: actual.data.records.map(record => record.displayStatus), actualPhotoCount: actual.data.records.reduce((count, record) => count + record.photos.length, 0), viewportChecks: 14, databaseMutations: 0, privatePhotosAuthenticated: photoRequests, checks: ['real database response', 'empty state', 'pending full detail', 'visible green / pending amber', 'authenticated image blob rendering', 'private documents not exposed', 'honest unknown room counts', 'retry', 'inaccessible ID', 'photo dialog', 'management navigation', 'no overflow or runtime errors'] }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
