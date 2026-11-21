const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5198';
  try {
    const output = path.resolve(__dirname, '../../target/room-setup-ui');
    fs.mkdirSync(output, {recursive: true});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(20000);
    const writes = [], errors = [], types = [];
    const property = {propertyId: 12, name: 'Nhà trọ kiểm thử', status: 'ACTIVE'};
    const photo = {name: 'studio.png', mimeType: 'image/png', buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=', 'base64')};
    let rooms = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'room-setup-fixture'));
    await page.route('https://**/*', route => route.abort());
    await page.route(base + '/api/**', async route => {
      const request = route.request();
      const url = new URL(request.url()).pathname;
      const ok = data => route.fulfill({json: {success: true, data}});
      if (url === '/api/auth/me') return ok({userId: 1, fullName: 'Chủ trọ', role: 'ROOM_HOST'});
      if (url === '/api/host/room-types' || url === '/api/host/rooms') {
        assert.equal(request.method(), 'GET');
        return ok({properties: [property], pendingRegistrationCount: 0, roomTypes: types, rooms});
      }
      if (url === '/api/host/rooms/setup') {
        const form = await new Response(request.postDataBuffer(), {headers: {'Content-Type': request.headers()['content-type']}}).formData();
        const setup = JSON.parse(await form.get('setup').text());
        const photos = form.getAll('photos').map(file => file.name);
        writes.push({setup, photos});
        if (writes.length === 1) {
          return route.fulfill({status: 409, json: {success: false, message: 'Xung đột kiểm thử. Chưa lưu dữ liệu.'}});
        }
        const createdTypes = {};
        for (const draft of setup.types) {
          const roomTypeId = 30 + types.length;
          createdTypes[draft.localId] = roomTypeId;
          types.push({...draft.details, roomTypeId, images: [], rooms: [], totalRooms: 0, vacantRooms: 0});
        }
        const createdRooms = setup.rooms.map((draft, index) => {
          const roomTypeId = createdTypes[draft.roomTypeId] || draft.roomTypeId;
          const type = types.find(item => item.roomTypeId === roomTypeId);
          const room = {...draft, roomTypeId, roomType: type.roomType, roomId: rooms.length + index + 1,
            propertyId: 12, status: 'VACANT', price: type.price, publicVisible: false, amenities: []};
          type.rooms.push(room);
          type.totalRooms++;
          type.vacantRooms++;
          return room;
        });
        rooms = [...rooms, ...createdRooms];
        return ok({createdTypes, rooms: createdRooms});
      }
      assert.equal(request.method(), 'GET', 'No unrelated writes');
      return ok({items: [], total: 0, canRegister: false, reason: 'HAS_PROPERTY'});
    });

    const btn = name => page.getByRole('button', {name, exact: true});
    const text = name => page.getByText(name, {exact: true});
    const nameField = page.locator('#rt-roomType');
    const price = page.locator('#rt-price');
    const storageKey = 'hlrcs:room-layout:1:12';
    const review = () => btn('Kiểm tra trước khi lưu').click();
    const open = async () => {
      await page.goto(base + '/host/room-types?propertyId=12', {waitUntil: 'domcontentloaded', timeout: 45000});
      await btn('Tạo loại phòng và phòng').first().click();
      await page.getByRole('heading', {name: 'Thiết lập phòng nhiều tầng'}).waitFor();
    };
    const typeDraft = async (name, amount, file) => {
      await btn('Thêm loại phòng').click();
      await nameField.fill(name);
      await page.locator('#rt-areaSqm').fill('25');
      await price.pressSequentially(String(amount));
      assert.equal(await price.inputValue(), Number(amount).toLocaleString('vi-VN'));
      if (file) await page.locator('#rt-photos').setInputFiles(file);
      await btn('Thêm vào bản nháp').click();
      await page.getByRole('dialog').waitFor({state: 'detached'});
    };

    await open();
    assert.equal(await btn('Làm lại từ đầu').count(), 0);
    await text('0 phòng chuẩn bị tạo').waitFor();
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), storageKey), null);
    assert.equal(writes.length, 0);

    await typeDraft('Studio A', 2200000, photo);
    await typeDraft('Studio B', 2300000);
    await btn('Thêm loại phòng').click();
    await nameField.fill('studio a');
    await page.locator('#rt-areaSqm').fill('30');
    await price.fill('1800000');
    await btn('Thêm vào bản nháp').click();
    await text('Tên loại phòng đã có trong nhà trọ hoặc trong bản nháp.').waitFor();
    await btn('Hủy').click();

    await btn('Tiếp tục tạo theo tầng').click();
    await page.getByLabel('Số phòng mỗi tầng', {exact: true}).fill('2');
    await btn('Thêm vào danh sách').click();
    await page.getByLabel('Loại phòng 101', {exact: true}).selectOption({label: 'Studio A · Mới'});
    await page.getByLabel('Loại phòng 102', {exact: true}).selectOption({label: 'Studio B · Mới'});
    await page.reload();
    await review();
    await page.getByText('Mở loại phòng để chọn lại ảnh sau khi tải lại trang.', {exact: true}).waitFor();
    assert.equal(await btn('Tạo 2 loại phòng và 2 phòng').isDisabled(), true);
    await page.getByRole('dialog').getByRole('button', {name: 'Sửa Studio A', exact: true}).click();
    await page.locator('#rt-photos').setInputFiles(photo);
    await btn('Cập nhật bản nháp').click();
    await page.getByRole('dialog').waitFor({state: 'detached'});
    await page.getByRole('navigation', {name: 'Các bước thiết lập phòng'}).getByRole('button', {name: /^Gán loại phòng/}).click();
    assert.equal(await page.getByLabel('Loại phòng 101', {exact: true}).inputValue(), '-1');

    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({width, height: 1000});
      assert.ok(await page.locator('.ml-page').evaluate(el => el.scrollWidth <= el.clientWidth + 2));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({path: path.join(output, 'setup-' + width + '.png'), fullPage: true});
    }
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    assert.ok(await page.locator('.ml-page').evaluate(el => el.scrollWidth <= el.clientWidth + 2));
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });

    assert.equal(writes.length, 0);
    await page.setViewportSize({width: 375, height: 850});
    await review();
    assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 2));
    await btn('Tạo 2 loại phòng và 2 phòng').click();
    await text('Xung đột kiểm thử. Chưa lưu dữ liệu.').waitFor();
    assert.equal(types.length, 0);
    await btn('Tạo 2 loại phòng và 2 phòng').click();
    await page.waitForURL('**/host/rooms?propertyId=12&publication=1');
    await page.getByRole('heading', {name: 'Chọn phòng công khai', exact: true}).waitFor();
    assert.equal(await page.locator('.rp-room').count(), 2);
    assert.deepEqual(writes[0], writes[1]);
    assert.deepEqual(writes[1].setup.types.map(type => [type.details.roomType, type.photoCount]), [['Studio A', 1], ['Studio B', 0]]);
    assert.deepEqual(writes[1].photos, ['studio.png']);
    assert.deepEqual(rooms.map(room => room.roomType), ['Studio A', 'Studio B']);

    await open();
    await typeDraft('Studio lưu trước', 2000000);
    await review();
    await btn('Tạo 1 loại phòng').click();
    await page.waitForURL(url => url.pathname === '/host/room-types' && url.search === '?propertyId=12');
    await page.locator('.ml-page').waitFor({state: 'detached'});
    await text('Studio lưu trước').first().waitFor();
    assert.equal(types.length, 3);
    assert.equal(rooms.length, 2);
    assert.deepEqual(errors, []);
    console.log('PASS unified entry, draft persistence, multiple drafts, duplicate guard, photos/reload, mobile save, atomic retry, publication and type-only refresh.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
