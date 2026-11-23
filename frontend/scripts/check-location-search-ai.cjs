// Runs against Vite on 127.0.0.1:5174. All API and map calls use fixtures.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const origin = { originLat: '21.01354', originLng: '105.52522' };
const room = {
  propertyId: 12, roomTypeId: 34, propertyName: 'Nhà trọ DEMO', roomTypeName: 'Studio',
  price: 2200000, areaSqm: 25, address: 'Tân Xã, Hòa Lạc', availableRooms: 2,
  verificationStatus: 'APPROVED', latitude: 21.018812, longitude: 105.521512,
  distanceKm: 0.72, availabilityStale: true, availabilityConfirmationStatus: 'STALE',
  availabilityConfirmedAt: '2026-10-01T00:00:00Z', amenities: ['airConditioner'],
};
const criteria = { location: 'tan-xa', roomType: 'all', minBudget: null, maxBudget: 2500000,
  amenities: ['airConditioner', 'balcony'] };
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5174';

async function check() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'location-demo-token'));
    await page.route('**/tile.openstreetmap.org/**', route => route.fulfill({
      contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }));
    let lastSearch, lastDetail, aiMode = 'clarify';
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      const respond = data => route.fulfill({ json: { success: true, data } });
      if (url.pathname === '/api/auth/me') return respond({ userId: 7, role: 'USER', fullName: 'Demo member' });
      if (url.pathname.endsWith('/location/nearby')) return respond({ places: [] });
      if (url.pathname === '/api/properties/search') {
        lastSearch = url.searchParams;
        return respond({ items: [room, { ...room, roomTypeId: 35 }], page: Number(lastSearch.get('page')),
          size: 6, totalElements: 8, totalPages: 2 });
      }
      if (url.pathname === '/api/properties/recommendations') {
        const body = route.request().postDataJSON();
        assert.match(body.description, /Tân Xã/);
        if (aiMode === 'clarify') return respond({ status: 'CLARIFY', question: 'Ngân sách mỗi tháng?', items: [] });
        if (aiMode === 'error') return route.fulfill({ status: 504, json: { success: false, message: 'AI phản hồi quá chậm. Vui lòng thử lại.' } });
        if (aiMode === 'empty') return respond({ status: 'EMPTY', criteria, items: [] });
        assert.match(body.clarification, /2,5 triệu/);
        return respond({ status: 'RESULTS', criteria, items: [{ ...room, match: {
          score: 7.5, matchedCriteria: ['location', 'budget', 'airConditioner'], unmatchedCriteria: ['balcony'],
        } }] });
      }
      if (url.pathname.endsWith('/details')) {
        lastDetail = url.searchParams;
        return respond({ summary: room, gallery: [], propertyGallery: [], roomTypes: [], amenities: [],
          propertyAmenities: [], selectedRules: [], similar: [], publicContact: null,
          reviews: { totalReviews: 0, ratingCounts: [0, 0, 0, 0, 0], latest: [] } });
      }
      if (/\/favorites\/[78]$/.test(url.pathname)) {
        const favoriteId = Number(url.pathname.split('/').at(-1));
        const accommodation = { ...room, roomTypeId: favoriteId === 7 ? 34 : 35 };
        return respond({ favoriteId, roomTypeId: accommodation.roomTypeId, createdAt: '2026-10-01T00:00:00Z',
          available: true, accommodation });
      }
      if (url.pathname.endsWith('/favorites/state')) return respond({ items: [
        { favoriteId: 7, roomTypeId: 34 }, { favoriteId: 8, roomTypeId: 35 },
      ], total: 2 });
      if (url.pathname.includes('/favorites')) return respond({ items: [], totalElements: 0, totalPages: 0, page: 0, size: 12 });
      return respond([]);
    });

    let selectedOrigin;
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + (width === 375 ? '/map' : '/search') + '?price=15-25&page=2');
      const sortMenu = page.getByRole('combobox', { name: /Sắp xếp theo/ });
      const aiButton = page.getByRole('button', { name: 'Hỏi Trọ Mây', exact: true });
      const open = page.getByRole('button', { name: 'Tìm quanh địa điểm', exact: true });
      await aiButton.waitFor();
      await open.waitFor();
      assert.equal(await page.locator('.search-submit-actions').getByRole('button', { name: 'Tìm quanh địa điểm' }).count(), 1);
      assert.ok(await aiButton.locator('img').evaluate(async image => { await image.decode(); return image.naturalWidth > 0; }));
      assert.equal(await sortMenu.locator('option[value="nearest"]').count(), 0);
      assert.equal(await page.locator('.quick-filter-pills').getByRole('button', { name: /AI|địa điểm|điểm gốc/ }).count(), 0);
      await page.locator('.search-controls-box').screenshot({ path: `../../outputs/search-tools-${width}.png` });
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      for (const button of [aiButton, open]) {
        assert.ok(await button.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Feature content overflow at ${width}, 200% zoom`);
      }
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      await open.focus();
      await page.keyboard.press('Enter');
      const picker = page.getByRole('dialog', { name: 'Tìm quanh địa điểm' });
      await picker.waitFor();
      assert.equal(await picker.getByLabel(/Vĩ độ|Kinh độ/).count(), 0);
      const radius = picker.getByRole('spinbutton', { name: 'Bán kính (km)' });
      const apply = picker.getByRole('button', { name: 'Áp dụng địa điểm' });
      await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
      assert.ok(await picker.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth + 1), `Location dialog overflow at ${width}px, 200% zoom`);
      await page.evaluate(() => { document.documentElement.style.zoom = ''; });
      await apply.click();
      await picker.getByRole('alert').getByText('Chọn một vị trí trên bản đồ.').waitFor();
      await picker.locator('.leaflet-container').click({ position: { x: 100, y: 150 } });
      await picker.getByTitle('Địa điểm tính khoảng cách').waitFor();
      await radius.fill('1');
      await apply.click();
      await page.getByText('Khoảng cách: 0,72 km', { exact: true }).first().waitFor();
      assert.equal(lastSearch.get('page'), '0');
      assert.equal(lastSearch.get('radiusKm'), '1');
      assert.equal(lastSearch.get('price'), '15-25');
      assert.equal(lastSearch.get('sort'), 'nearest');
      selectedOrigin = Object.fromEntries(Object.keys(origin).map(key => [key, lastSearch.get(key)]));
      for (const [key, value] of Object.entries(selectedOrigin)) {
        assert.ok(value && Math.abs(Number(value) - Number(origin[key])) < 0.05, `Invalid ${key} from the map`);
      }
      const changeOrigin = page.getByRole('button', { name: 'Đổi địa điểm', exact: true });
      await changeOrigin.focus();
      await page.keyboard.press('Enter');
      await picker.getByTitle('Địa điểm tính khoảng cách').waitFor();
      assert.equal(await radius.inputValue(), '1');
      await page.keyboard.press('Escape');
      await picker.waitFor({ state: 'hidden' });
      assert.ok(await changeOrigin.evaluate(trigger => trigger === document.activeElement));
      assert.equal(await sortMenu.inputValue(), 'nearest');
      assert.ok(await sortMenu.locator('option[value="nearest"]').evaluate(option => option.hidden));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    }

    await page.getByRole('navigation', { name: 'Chế độ hiển thị' }).getByRole('link', { name: 'Bản đồ', exact: true }).click();
    await page.locator('.leaflet-marker-icon').first().click();
    await page.getByRole('link', { name: 'Xem chi tiết phòng', exact: true }).first().click();
    await page.getByText('Khoảng cách đến địa điểm đã chọn: 0,72 km', { exact: true }).waitFor();
    for (const [key, value] of Object.entries(selectedOrigin)) assert.equal(lastDetail.get(key), value);
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.ok(await page.getByText('Khoảng cách đến địa điểm đã chọn: 0,72 km', { exact: true }).isVisible());

    await page.goto(base + '/search?' + new URLSearchParams(origin));
    const selections = page.getByRole('checkbox', { name: /So sánh Nhà trọ DEMO/ });
    await selections.nth(0).focus();
    await page.keyboard.press('Space');
    await page.getByText('Đã chọn 1/4 phòng').waitFor();
    await selections.nth(1).focus();
    await page.keyboard.press('Space');
    await page.getByText('Đã chọn 2/4 phòng').waitFor();
    const compareBar = page.getByRole('complementary', { name: 'Các phòng đã chọn so sánh' });
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const launcher = await page.getByRole('button', { name: 'Hỏi Trọ Mây' }).boundingBox();
      const bar = await compareBar.boundingBox();
      assert.ok(launcher && bar && launcher.y + launcher.height <= bar.y, `Assistant overlaps comparison at ${width}px`);
    }
    await page.getByRole('link', { name: 'So sánh ngay' }).click();
    const row = page.getByRole('row', { name: /Khoảng cách đến địa điểm đã chọn/ });
    await row.waitFor();
    assert.equal(await row.getByText('0,72 km', { exact: true }).count(), 2);

    await page.goto(base + '/search');
    const aiTrigger = page.getByRole('button', { name: 'Hỏi Trọ Mây' });
    await aiTrigger.focus();
    await page.keyboard.press('Enter');
    const ai = page.getByRole('dialog', { name: /Trọ Mây/ });
    const description = ai.getByLabel('Nhu cầu thuê phòng');
    assert.ok(await description.evaluate(field => field === document.activeElement));
    assert.ok(await ai.getByRole('button', { name: 'Tìm phòng', exact: true }).isDisabled());
    const samples = ai.getByRole('group', { name: 'Nhu cầu mẫu' });
    const exampleDescription = 'Phòng dưới 2,5 triệu/tháng, có điều hòa và bình nóng lạnh.';
    const sample = samples.getByRole('button', { name: exampleDescription, exact: true });
    assert.equal(await samples.getByRole('button').count(), 1);
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await sample.evaluate(button => button.scrollWidth <= button.clientWidth + 1), `Sample overflows at ${width}px`);
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.ok(await sample.evaluate(button => button.scrollWidth <= button.clientWidth + 1), 'Sample overflows at 200% zoom');
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await sample.focus();
    await page.keyboard.press('Enter');
    assert.equal(await description.inputValue(), exampleDescription);
    assert.ok(await description.evaluate(field => field === document.activeElement));
    await ai.getByLabel('Nhu cầu thuê phòng').fill('Tìm phòng Tân Xã có điều hòa');
    await ai.getByRole('button', { name: 'Tìm phòng', exact: true }).click();
    await ai.getByLabel('Ngân sách mỗi tháng?').fill('Tối đa 2,5 triệu');
    aiMode = 'error';
    await ai.getByRole('button', { name: 'Gửi bổ sung' }).click();
    await ai.getByRole('alert').getByText(/AI phản hồi quá chậm/).waitFor();
    const checkDialogPadding = async path => {
      const insets = await ai.evaluate(dialog => {
        const body = dialog.querySelector('.accommodation-ai-body');
        const alert = dialog.querySelector('.accommodation-ai-error');
        const button = dialog.querySelector('.accommodation-ai-action[type="submit"]');
        return [body, alert, button].map(element => Number.parseFloat(getComputedStyle(element).paddingInlineStart));
      });
      assert.ok(insets.every(value => value >= 10), `Dialog body, alert or button lost padding on ${path}: ${insets}`);
    };
    await checkDialogPadding('/search');
    aiMode = 'results';
    await ai.getByRole('button', { name: 'Thử lại' }).click();
    await ai.getByRole('link', { name: 'Nhà trọ DEMO — Studio' }).waitFor();
    await ai.getByText('7,5/10 phù hợp', { exact: true }).waitFor();
    await ai.getByRole('heading', { name: 'Khớp 3/4 tiêu chí' }).waitFor();
    await ai.getByRole('list', { name: 'Tiêu chí chưa khớp' }).getByText(/Ban công/).waitFor();
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await ai.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth + 1), `AI dialog overflow at ${width}px`);
    }
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.ok(await ai.getByText('7,5/10 phù hợp', { exact: true }).isVisible());
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await ai.getByText(/Quá 7 ngày chưa xác nhận/).waitFor();
    aiMode = 'empty';
    await ai.getByLabel('Nhu cầu thuê phòng').fill('Tìm phòng Tân Xã dưới 100 nghìn');
    await ai.getByRole('button', { name: 'Tìm phòng', exact: true }).click();
    await ai.getByText(/Chưa có loại phòng công khai/).waitFor();
    await page.keyboard.press('Escape');
    await ai.waitFor({ state: 'hidden' });
    assert.ok(await aiTrigger.evaluate(trigger => trigger === document.activeElement));

    await page.goto(base + '/map');
    aiMode = 'error';
    await aiTrigger.click();
    await description.fill('Tìm phòng Tân Xã có điều hòa');
    await ai.getByRole('button', { name: 'Tìm phòng', exact: true }).click();
    await ai.getByRole('alert').waitFor();
    await checkDialogPadding('/map');
    await ai.getByRole('button', { name: 'Dùng bộ lọc tìm phòng' }).click();
    const filters = page.getByRole('dialog', { name: 'Bộ lọc tìm kiếm phòng trọ' });
    await filters.getByRole('checkbox', { name: 'Điều hòa', exact: true }).check();
    await filters.getByRole('checkbox', { name: 'Bình nóng lạnh', exact: true }).check();
    await filters.getByRole('button', { name: 'Áp dụng', exact: true }).click();
    await filters.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Xóa bộ lọc Điều hòa' }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('amenities'), 'airConditioner,waterHeater');
    await aiTrigger.click();
    assert.equal(await description.inputValue(), 'Tìm phòng Tân Xã có điều hòa');
    assert.deepEqual(errors, []);
    console.log('PASS: origin, radius, filters, map, details, comparison, and AI clarification/timeout/results/empty with fixtures.');
  } finally {
    await browser.close();
  }
}

check().catch(error => { console.error(error); process.exitCode = 1; });
