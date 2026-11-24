const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5198';
const setupPath = '/host/room-types?propertyId=4&layout=1';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const out = path.resolve(__dirname, '../../target/multi-floor-ui');
    fs.mkdirSync(out, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(10_000);
    const errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    const property = { propertyId: 4, name: 'Nhà trọ nhiều tầng', status: 'ACTIVE' };
    const types = [1, 2, 3].map(id => ({
      roomTypeId: id, propertyId: 4, roomType: 'Loại ' + ['A','B','C'][id-1], price: 2000000,
      areaSqm: 25, capacity: 2, amenities: [], images: [], rooms: [], totalRooms: 0, vacantRooms: 0,
    }));
    let rooms = [];
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'multi-floor-fixture'));
    await page.route('https://**/*', route => route.abort());
    await page.route(base + '/api/**', async route => {
      const req = route.request();
      const resource = new URL(req.url()).pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (resource === '/api/auth/me') return ok({ userId: 8, role: 'ROOM_HOST', fullName: 'Chủ trọ kiểm thử' });
      if (resource === '/api/host/room-types') return ok({ properties: [property], pendingRegistrationCount: 0,
        roomTypes: types.map(type => ({ ...type, rooms: rooms.filter(room => room.roomTypeId === type.roomTypeId) })) });
      if (resource === '/api/host/rooms') return ok({ properties: [property], pendingRegistrationCount: 0, roomTypes: types, rooms });
      if (resource === '/api/host/rooms/layout') {
        assert.equal(req.method(), 'POST');
        const body = req.postDataJSON();
        writes.push(body);
        assert.equal(body.propertyId, 4);
        assert.equal(body.rooms.length, 14);
        await new Promise(resolve => setTimeout(resolve, 180));
        if (writes.length === 1) return route.fulfill({ status: 400, json: { success: false, message: 'Dữ liệu thử nghiệm không hợp lệ',
          data: { 'rooms[4].roomNumber': 'Kiểm tra tên phòng.' } } });
        assert.deepEqual(body, writes[0]);
        assert.deepEqual(body.rooms.filter(row => row.floor === 'Tầng 1').map(row => row.roomTypeId), [1,2,3,2]);
        assert.deepEqual(body.rooms.filter(row => row.floor === 'Tầng 2').map(row => row.roomTypeId), [1,3,3,2,3,3]);
        assert.deepEqual(body.rooms.filter(row => row.floor === 'Tầng 3').map(row => row.roomTypeId), [1,2,3,1]);
        rooms = body.rooms.map((row, index) => ({ ...row, roomId: index + 1, propertyId: 4,
          roomType: types[row.roomTypeId - 1].roomType, status: 'VACANT', amenities: [], publicVisible: false }));
        return ok(rooms);
      }
      assert.equal(req.method(), 'GET', 'No unrelated writes');
      return ok({ items: [], total: 0, canRegister: true, reason: 'ELIGIBLE' });
    });

    const setup = page.locator('.ml-page');
    const label = name => page.getByLabel(name, { exact: true });
    const button = name => page.getByRole('button', { name, exact: true });
    const type = name => label('Loại phòng ' + name);
    const dialog = page.getByRole('dialog', { name: 'Kiểm tra trước khi lưu' });
    const review = () => button('Kiểm tra trước khi lưu').click();
    const floor = async name => {
      const list = label('Tầng đang xem');
      if (await list.isVisible()) await list.selectOption(name);
      else await page.getByRole('button', { name: new RegExp('^' + name + ' [0-9]+$') }).click();
    };
    const assign = async (group, value) => {
      await label('Chọn nhanh').selectOption(group);
      await label('Loại phòng cần gán').selectOption(String(value));
      await button('Gán loại').click();
    };

    await page.goto(base + setupPath);
    await page.getByRole('heading', { name: 'Thiết lập phòng nhiều tầng' }).waitFor();
    await button('Tiếp tục tạo theo tầng').click();
    await label('Số tầng').fill('3');
    await label('Số phòng mỗi tầng').fill('4');
    await label('Phần tên trước số phòng (tùy chọn)').fill('P.');
    await page.getByText('P.101, P.102, P.103, P.104…', { exact: true }).waitFor();
    await label('Phần tên trước số phòng (tùy chọn)').clear();
    await button('Thêm vào danh sách').click();
    assert.equal(writes.length, 0);
    await review();
    assert.ok(await dialog.getByRole('button', { name: 'Tạo 12 phòng' }).isDisabled());
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });

    await assign('odd', 1);
    await assign('even', 2);
    await type('103').selectOption('3');
    await floor('Tầng 2');
    assert.ok(await button('Gán loại').isDisabled());
    await type('202').selectOption('3');
    await label('Tên phòng 201').fill('P.201');
    await button('Thêm phòng vào tầng đang xem').click();
    assert.equal(await label('Tầng nhận phòng').inputValue(), 'Tầng 2');
    await label('Số phòng thêm').fill('2');
    await page.getByText('205, 206', { exact: true }).waitFor();
    await button('Thêm vào danh sách').click();
    assert.equal(await label('Tên phòng P.201').inputValue(), 'P.201');
    assert.equal(await type('202').inputValue(), '3');
    await floor('Tầng 1');
    assert.equal(await type('103').inputValue(), '3');
    await page.getByText('Công cụ gán nâng cao', { exact: true }).click();
    await page.getByText('Sao chép cách gán sang tầng khác', { exact: true }).click();
    await button('Chọn mọi tầng còn lại').click();
    await page.getByText('Sẽ cập nhật 7 phòng ở 2 tầng đích đã chọn.', { exact: true }).waitFor();
    await button('Áp dụng sao chép').click();
    await label('Ghi đè loại đã gán ở tầng đích').check();
    await page.getByText('Sẽ cập nhật 1 phòng ở 2 tầng đích đã chọn.', { exact: true }).waitFor();
    await button('Áp dụng sao chép').click();
    await floor('Tầng 2');
    assert.equal(await type('202').inputValue(), '2');
    await button('Hoàn tác').click();
    assert.equal(await type('202').inputValue(), '3');
    assert.equal(await type('P.201').inputValue(), '1');
    assert.equal(await type('205').inputValue(), '');
    await assign('unassigned', 3);
    await floor('Tầng 3');
    await page.getByText('Gán so le tự động', { exact: true }).click();
    await button('Thêm vị trí vào mẫu').click();
    await label('Vị trí 3').selectOption('3');
    await button('Áp dụng so le').click();
    assert.equal(await type('304').inputValue(), '1');

    await page.getByText('Chọn nhanh bằng danh sách số phòng', { exact: true }).click();
    await label('Danh sách số phòng cần chọn').fill('101, 202, 304');
    await button('Chọn các số này').click();
    await page.getByText('Đã chọn 3 phòng', { exact: true }).waitFor();
    await label('Danh sách số phòng cần chọn').fill('999');
    await button('Chọn các số này').click();
    await page.getByRole('alert').filter({ hasText: 'Không tìm thấy trong bản nháp' }).waitFor();
    await page.getByText('Đã chọn 3 phòng', { exact: true }).waitFor();
    await floor('Tầng 2');
    assert.ok(await button('Gán loại').isDisabled());
    await floor('Tầng 3');

    await label('Tên phòng 301').fill('101');
    await review();
    assert.ok(await dialog.getByRole('button', { name: 'Tạo 14 phòng' }).isDisabled());
    await dialog.getByRole('button', { name: /^Tầng 3 .*trùng tên/ }).click();
    await page.getByRole('table', { name: /Tầng 3/ }).waitFor();
    await button('Cần xử lý (1)').click();
    assert.equal(await type('302').isVisible(), false);
    assert.equal(await label('Tên phòng 101').getAttribute('aria-invalid'), 'true');
    await label('Tên phòng 101').fill('301');
    await label('Tên phòng 301').blur();
    await page.getByText('Tầng này đã sẵn sàng để tạo.', { exact: true }).waitFor();
    await page.reload();
    await floor('Tầng 2');
    assert.equal(await type('202').inputValue(), '3');
    assert.equal(await type('206').inputValue(), '3');

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await setup.evaluate(el => el.scrollWidth <= el.clientWidth + 2), 'no horizontal workspace overflow at ' + width);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'no horizontal page overflow at ' + width);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(out, 'layout-' + width + '.png'), fullPage: true });
    }
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.ok(await setup.evaluate(el => el.scrollWidth <= el.clientWidth + 2));
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await label('Tên phòng P.201').focus();
    await page.keyboard.press('Tab');
    assert.ok(await type('P.201').evaluate(el => el === document.activeElement));

    assert.equal(writes.length, 0);
    await page.setViewportSize({ width: 375, height: 820 });
    await review();
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 2));
    await dialog.screenshot({ path: path.join(out, 'review.png') });
    const save = dialog.getByRole('button', { name: 'Tạo 14 phòng', exact: true });
    await save.click();
    await dialog.getByRole('button', { name: 'Đang tạo phòng…' }).waitFor();
    assert.ok(await dialog.getByRole('button', { name: 'Đang tạo phòng…' }).isDisabled());
    await dialog.getByRole('alert').filter({ hasText: 'Tầng 2 · P.201' }).waitFor();
    assert.equal(writes.length, 1);
    assert.equal(rooms.length, 0);
    await save.click();
    await page.waitForURL('**/host/rooms?propertyId=4&publication=1');
    await page.getByRole('heading', { name: 'Chọn phòng công khai', exact: true }).waitFor();
    assert.equal(await page.locator('.rp-room input:checked').count(), 0);
    assert.equal(await page.locator('.rp-room').count(), 14);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('hlrcs:room-layout:8:4')), null);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + setupPath);
    await button('Tiếp tục tạo theo tầng').click();
    await page.getByText('Tầng bắt đầu 1', { exact: true }).waitFor();
    await label('Số tầng').fill('20');
    await label('Số phòng mỗi tầng').fill('50');
    await label('Loại chung cho nhóm này').selectOption('2');
    await button('Thêm vào danh sách').click();
    assert.equal(await page.locator('.ml-table tbody select').first().inputValue(), '2');
    assert.equal(await label('Tên phòng 105').inputValue(), '105');
    await page.getByText('1.000 phòng chuẩn bị tạo', { exact: true }).waitFor();
    assert.equal(await page.locator('.ml-table tbody tr').count(), 24);
    await label('Chọn tất cả phòng trên trang này').check();
    await page.getByText('Đã chọn 24 phòng', { exact: true }).waitFor();
    await button('Sau').click();
    assert.equal(await label('Chọn tất cả phòng trên trang này').isChecked(), false);
    await label('Chọn tất cả phòng trên trang này').check();
    await page.getByText('Đã chọn 48 phòng', { exact: true }).waitFor();
    await button('Trước').click();
    assert.equal(await label('Chọn tất cả phòng trên trang này').isChecked(), true);
    await label('Chọn nhanh').selectOption('all');
    await page.getByText('Đã chọn 50 phòng', { exact: true }).waitFor();
    await floor('Tầng 5');
    await page.getByText('Đã chọn 0 phòng', { exact: true }).waitFor();
    assert.equal(writes.length, 2);
    assert.deepEqual(errors, []);
    console.log('PASS generation/append, scoped paged selections, uneven copy and overwrite, undo, duplicate review return, reload, responsive layout and keyboard, API failure/retry and publication. Mock API only.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
