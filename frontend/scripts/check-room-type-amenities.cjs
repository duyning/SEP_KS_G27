// Browser-only fixtures: every API request is intercepted; no database writes.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'amenities-test'));
  const base = process.env.HLRCS_TEST_BASE || 'http://127.0.0.1:5173';
  const properties = [{ propertyId: 1, name: 'Nhà trọ kiểm thử A', address: 'Thôn 2, Tân Xã, Thạch Thất', status: 'ACTIVE' }, { propertyId: 2, name: 'Nhà trọ kiểm thử B', address: 'Thạch Hòa', status: 'ACTIVE' }];
  const common = { price: 2400000, deposit: 2400000, areaSqm: 25, capacity: 2, totalRooms: 5, vacantRooms: 2, images: [] };
  const types = [
   { ...common, propertyId: 1, roomTypeId: 11, roomType: 'Studio ban công', amenities: ['airConditioner', 'waterHeater', 'balcony', 'kitchen', 'loft', 'wifi', 'privateBathroom'] },
   { ...common, propertyId: 1, roomTypeId: 12, roomType: 'Phòng tiêu chuẩn', amenities: ['airConditioner', 'waterHeater'] },
   { ...common, propertyId: 2, roomTypeId: 21, roomType: 'Phòng cơ sở B', amenities: [] },
  ];
  await page.route(base + '/api/**', route => {
   const url = new URL(route.request().url());
   assert.equal(route.request().method(), 'GET');
   const data = url.pathname === '/api/auth/me' ? { userId: 20, role: 'ROOM_HOST', fullName: 'Chủ trọ kiểm thử' }
    : url.pathname.endsWith('/room-types') ? { properties, pendingRegistrationCount: 0, roomTypes: types.filter(type => !url.searchParams.has('propertyId') || String(type.propertyId) === url.searchParams.get('propertyId')) }
    : url.pathname.endsWith('/eligibility') ? { canRegister: true, reason: 'ELIGIBLE' } : [];
   return route.fulfill({ json: { success: true, data } });
  });
  await page.goto(base + '/host/room-types?propertyId=1');
  const more = page.getByRole('button', { name: 'Xem thêm 4 tiện nghi của Studio ban công', exact: true });
  await more.waitFor();
  assert.equal(await page.getByText('Danh sách, số liệu và thao tác chỉ áp dụng cho nhà trọ đang chọn.', { exact: true }).count(), 0);
  await more.hover();
  const tooltip = page.getByRole('tooltip');
  await tooltip.waitFor();
  assert.deepEqual(await tooltip.locator('li').allTextContents(), ['Kệ bếp nấu ăn', 'Gác lửng ngủ', 'Wifi tốc độ cao', 'Vệ sinh khép kín']);
  await tooltip.hover(); await page.waitForTimeout(200); assert.equal(await tooltip.isVisible(), true);
  await page.keyboard.press('Escape'); await tooltip.waitFor({ state: 'detached' });
  await page.mouse.move(0, 0); await more.focus(); await tooltip.waitFor();
  assert.ok(await more.getAttribute('aria-describedby'));
  await page.keyboard.press('Escape'); await tooltip.waitFor({ state: 'detached' });
  await more.blur(); await more.click(); await tooltip.waitFor();
  await page.getByRole('heading', { name: 'Quản lý loại phòng', exact: true }).click(); await tooltip.waitFor({ state: 'detached' });
  if (process.env.SCREENSHOT_DIR) {
   await page.mouse.move(0, 0); await page.evaluate(() => window.scrollTo(0, 0));
   await page.screenshot({ path: require('node:path').join(process.env.SCREENSHOT_DIR, 'room-types-list-layout-1440.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Dạng lưới', exact: true }).click();
  assert.equal(await page.locator('.host-room-type').count(), 2);
  for (const width of [1440, 1024, 768, 375]) {
   await page.setViewportSize({ width, height: 1000 });
   await more.scrollIntoViewIfNeeded(); await more.hover(); await tooltip.waitFor();
   const box = await tooltip.boundingBox();
   assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 1001);
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
   await page.mouse.move(0, 0); await more.blur(); await page.keyboard.press('Escape');
   await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(180);
   if (process.env.SCREENSHOT_DIR && [1440, 375].includes(width)) await page.screenshot({ path: require('node:path').join(process.env.SCREENSHOT_DIR, `room-types-refined-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('textbox', { name: 'Tìm loại phòng', exact: true }).fill('tiêu chuẩn');
  assert.equal(await page.locator('.host-room-type').count(), 1);
  assert.equal(await page.locator('.rt-amenity-more').count(), 0);
  await page.getByRole('combobox', { name: 'Chọn nhà trọ', exact: true }).selectOption('2');
  await page.getByText('Phòng cơ sở B', { exact: true }).waitFor();
  assert.equal(await page.getByText('Studio ban công', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, hover: true, keyboardAndEscape: true, click: true, widths: 4, propertyScoping: true, errors: 0 }));
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
