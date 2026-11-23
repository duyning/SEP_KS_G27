const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = path.resolve(__dirname, '../.expo/listing-review'); fs.mkdirSync(out, { recursive: true });
const items = Array.from({ length: 18 }, (_, i) => ({ propertyId: 7, roomTypeId: i + 1, propertyName: 'Nhà trọ kiểm thử', roomTypeName: `Studio khép kín ${i + 1}`, address: 'Thạch Hòa, Hòa Lạc, Hà Nội', imageUrl: '/api/properties/7/room-types/1/images/1', price: 3200000, areaSqm: 25, availableRooms: 3, verificationStatus: 'APPROVED', capacity: 2, amenities: ['airConditioner'] }));
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultNavigationTimeout(120000); const errors = []; const searches = []; let mode = 'data';
  page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR:', error.message); }); page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLEERROR', msg.text().slice(0, 1800)); });
  await page.route('**/api/**', async route => {
   const url = new URL(route.request().url()); const headers = { 'access-control-allow-origin': '*' };
   if (/\/images\/\d+$/.test(url.pathname)) return route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(path.resolve(__dirname, '../assets/images/room-fallback.jpg')), headers });
   if (url.pathname.endsWith('/search')) {
    if (mode === 'error') return route.fulfill({status: 500, json: {success: false}, headers});
    if (mode === 'empty') return route.fulfill({json: {success: true, data: {items: [], page: 0, totalElements: 0, totalPages: 0}}, headers});
    searches.push(Object.fromEntries(url.searchParams)); const n = Number(url.searchParams.get('page') || 0); const filtered = Boolean(url.searchParams.get('q') || (url.searchParams.get('price') && url.searchParams.get('price') !== 'all'));
    return route.fulfill({ json: { success: true, data: { items: filtered ? items.slice(0, 1) : items.slice(n * 15, (n + 1) * 15), page: n, size: 15, totalElements: filtered ? 1 : 18, totalPages: filtered ? 1 : 2 } }, headers });
   }
   if (url.pathname.endsWith('/details')) { const id = Number(url.pathname.match(/room-types\/(\d+)/)[1]); return route.fulfill({ json: { success: true, data: { summary: items[id - 1], gallery: [{ url: '/api/properties/7/room-types/1/images/1' }, { url: '/api/properties/7/room-types/1/images/2' }], propertyGallery: [], amenities: ['airConditioner', 'waterHeater', 'balcony'], propertyAmenities: ['camera', 'fireSafety'], description: 'Mô tả từ API dùng riêng cho kiểm thử giao diện.', deposit: 3200000, electricityPrice: 3500, waterPrice: 30000, capacity: 2, roomTypes: items.slice(0, 2), publicContact: { hostName: 'Liên hệ kiểm thử', phone: '0912345678' } } }, headers }); }
   return route.fulfill({ status: 401, json: { success: false }, headers });
  });
  await page.goto('http://127.0.0.1:8092/home');
  await page.getByLabel('Xem tất cả phòng nổi bật').waitFor({ timeout: 120000 });
  await page.getByLabel('Phòng nổi bật Nhà trọ kiểm thử, 3.2 triệu/tháng').first().click();
  await page.waitForURL('**/rooms/1?propertyId=7'); await page.getByText('Giới thiệu loại phòng', { exact: true }).waitFor();
  await page.getByLabel('Mở ảnh toàn màn hình').first().click(); await page.getByLabel('Đóng ảnh').waitFor(); await page.waitForTimeout(400); await page.screenshot({ path: path.join(out, 'gallery.png') }); await page.getByLabel('Đóng ảnh').click();
  await page.getByLabel('Quay lại', { exact: true }).click(); await page.getByLabel('Xem tất cả phòng nổi bật').click();
  await page.waitForURL('**/explore'); assert.equal(await page.getByRole('button', {name:'Quay về Trang chủ',exact:true}).count(), 0); await page.getByText('Tìm phòng trọ', {exact:true}).waitFor(); await page.getByText('18 loại phòng phù hợp', { exact: true }).waitFor();
  for (const width of [320, 360, 390, 430]) { await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, `explore-${width}.png`) }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`); }
  for (let attempt = 0; attempt < 8 && !searches.some(s => s.page === '1'); attempt++) { await page.getByRole('link', { name: /^Phòng Studio khép kín / }).last().scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
  assert.ok(searches.some(s => s.page === '1'), 'infinite scroll requests second page');
  assert.equal(searches.filter(s => s.page === '1').length, 1, 'second page not duplicated');
  const input = page.getByRole('textbox', { name: 'Ô tìm kiếm phòng trọ' }); await input.fill('Thạch Hòa'); await page.getByText('1 loại phòng phù hợp', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Mở bộ lọc tìm kiếm', exact: true }).click(); await page.getByText('1,5 - 2,5 triệu', { exact: true }).click(); await Promise.all([page.waitForResponse(r => r.url().includes('price=15-25')), page.getByLabel('Áp dụng bộ lọc').click()]);
  await page.getByRole('link', { name: /^Phòng Studio khép kín / }).first().click(); await page.getByText('Giới thiệu loại phòng', { exact: true }).waitFor();
  for (const width of [320, 360, 390, 430]) { await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, `detail-${width}.png`) }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `detail overflow at ${width}`); }
  await page.getByLabel('Quay lại', { exact: true }).click(); assert.equal(await input.inputValue(), 'Thạch Hòa'); assert.ok(searches.some(s => s.price === '15-25')); assert.equal(errors.length, 0, errors.join('\n'));
  await page.getByRole('link', {name: /^Phòng Studio khép kín /}).last().scrollIntoViewIfNeeded();
  await page.getByRole('button', {name:'Lưu phòng yêu thích',exact:true}).last().click(); await page.waitForURL('**/login'); await page.goBack(); await page.waitForURL('**/explore');
  mode = 'empty'; await input.fill('không có kết quả'); await page.getByText('Không tìm thấy phòng phù hợp', {exact:true}).waitFor();
  mode = 'error'; await input.fill('lỗi máy chủ'); await page.getByText('Đã xảy ra sự cố', {exact:true}).waitFor();
  mode = 'data'; await page.getByRole('button', {name:'Thử lại',exact:true}).click(); await page.getByText('1 loại phòng phù hợp', {exact:true}).waitFor(); await page.getByText('Xóa bộ lọc', {exact:true}).click(); await page.getByText('18 loại phòng phù hợp', {exact:true}).waitFor();
  console.log(JSON.stringify({ result: 'passed', widths: [320, 360, 390, 430], searches: searches.length, screenshots: out }));
 } finally { await browser.close(); }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });











