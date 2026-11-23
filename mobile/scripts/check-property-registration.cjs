const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function checkRegistration(page, open, capture) {
  const text = value => page.getByText(value, { exact: true }).filter({ visible: true });
  const button = name => page.getByRole('button', { name, exact: true });
  const input = name => page.getByLabel(name, { exact: true });
  const step = async number => text(`Bước ${number}/6`).waitFor();
  const chooseFiles = async (label, files) => {
    const chooser = page.waitForEvent('filechooser');
    await button(label).click();
    await (await chooser).setFiles(files);
  };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=', 'base64');
  const front = { name: 'front.png', mimeType: 'image/png', buffer: png };
  const cover = { name: 'cover.png', mimeType: 'image/png', buffer: png };
  const pdf = { name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') };
  await open();
  await step(1);
  await button('Hướng dẫn').click();
  await text('Hướng dẫn · Bước 1').waitFor();
  await button('Đóng').click();
  await button('Tiếp tục').click();
  await text('Tên nhà trọ phải có từ 3 đến 100 ký tự.').waitFor();
  await input('Tên nhà trọ').fill('Nhà trọ kiểm thử');
  await input('Người đón khách').fill('Chủ trọ kiểm thử');
  await input('Hotline liên hệ').fill('0912345678');
  const description = 'Mô tả nhà trọ kiểm thử có chiều dài hợp lệ cho bước đầu.';
  await input('Mô tả nhà trọ').fill(description);
  await button('Tạo mô tả bằng AI').click();
  await button('Áp dụng mô tả').waitFor();
  assert.equal(await input('Mô tả nhà trọ').inputValue(), description);
  await button('Áp dụng mô tả').click();
  await button('Tiếp tục').click();
  await step(2);
  await input('Địa chỉ chi tiết').fill('Số 12 đường kiểm thử');
  await button('Hạ Bằng').click();
  await button('Chọn vị trí trên bản đồ').click();
  await input('Liên kết bản đồ hoặc tọa độ').fill('21.01,105.52');
  await button('Tra cứu vị trí').click();
  await text('Kết quả tra cứu').waitFor();
  await button('Chỉ lưu ghim').click();
  assert.equal(await input('Địa chỉ chi tiết').inputValue(), 'Số 12 đường kiểm thử');
  await button('Bỏ ghim').click();
  await button('Quay lại').click();
  await step(1);
  assert.equal(await input('Tên nhà trọ').inputValue(), 'Nhà trọ kiểm thử');
  await button('Tiếp tục').click();
  await step(2);
  await button('Tiếp tục').click();
  await step(3);
  await button('Xem thêm tiện ích').click();
  await button('Khu sinh hoạt chung').click();
  await button('Giờ trật tự').click();
  await input('Giờ bắt đầu (HH:mm)').fill('22:15');
  await button('Tiếp tục').click();
  await step(4);
  await chooseFiles('Chọn ảnh', { ...front, name: 'bad.png', buffer: Buffer.from('invalid') });
  await text('Chọn ảnh JPG, PNG hoặc WebP.').waitFor();
  await chooseFiles('Thử lại chọn ảnh', [front, cover]);
  await button('Đặt ảnh 2 làm ảnh bìa').click();
  await button('Lưu nháp').click();
  await text('Đã lưu nháp trên thiết bị. Tệp tạm cần chọn lại khi mở nháp.').waitFor();
  // Navigate away through the stack and reopen using the same account.
  for (let i = 3; i >= 1; i--) { await button('Quay lại').click(); await step(i); }
  await button('Quay lại').click();
  await page.waitForURL('**/home');
  await open();
  await step(4);
  await text('Cần chọn lại tệp ảnh từ bản nháp.').waitFor();
  await chooseFiles('Chọn ảnh', [front, cover]);
  await button('Đặt ảnh 2 làm ảnh bìa').click();
  await button('Tiếp tục').click();
  await step(5);
  await text('Dùng lại căn cước đã nộp').waitFor();
  await chooseFiles('Chọn tệp · Giấy phép kinh doanh', pdf);
  await button('Thay tệp · Giấy phép kinh doanh').waitFor();
  await chooseFiles('Chọn tệp · Chứng nhận an toàn PCCC', { ...pdf, name: 'too-large.pdf', buffer: Buffer.concat([pdf.buffer, Buffer.alloc(10 * 1024 * 1024)]) });
  await text('Tệp phải có dữ liệu và không vượt 10 MB.').waitFor();
  await chooseFiles('Thử lại · Chứng nhận an toàn PCCC', pdf);
  await button('Thay tệp · Chứng nhận an toàn PCCC').waitFor();
  await button('Tiếp tục').click();
  await step(6);
  await button('Sửa Thông tin cơ bản').click();
  await step(1);
  await input('Tên nhà trọ').fill('Nhà trọ đã sửa');
  await button('Về bước kiểm tra').click();
  await step(6);
  await button('Gửi xét duyệt').click();
  await text('Xác nhận cam kết thông tin trước khi gửi.').waitFor();
  await page.getByRole('checkbox', { name: 'Cam kết thông tin chính xác' }).click();
  await capture?.();
  await button('Gửi xét duyệt').click();
  await button('Xác nhận gửi').click();
  await text('Mạng kiểm thử không khả dụng.').waitFor();
  assert.equal(await text('Đã gửi · Chờ xét duyệt').count(), 0);
  await button('Gửi xét duyệt').click();
  await button('Xác nhận gửi').click();
  await text('Không kết nối được máy chủ. Kiểm tra kết nối rồi thử gửi lại.').waitFor();
  await button('Gửi xét duyệt').click();
  await button('Xác nhận gửi').click();
  await text('Đã gửi · Chờ xét duyệt').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('hlrcs:mobile-property-draft:31')), null);
  await button('Về Nhà trọ của tôi').click();
  await page.waitForURL('**/home');
}
module.exports = { checkRegistration };

if (require.main === module) (async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(120000);
    const errors = [];
    let submissions = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){}}}};' }));
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' };
      const send = (data, status = 200, message) => route.fulfill({ status, headers, json: { success: status < 400, data, message } });
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (path === '/api/auth/login' || path === '/api/auth/me') return send({ userId: 31, role: 'ROOM_HOST', status: 'ACTIVE', fullName: 'Chủ trọ kiểm thử', email: 'host@example.test', accessToken: 'fixture-token' });
      if (path.endsWith('/eligibility')) return send({ canRegister: true, reason: 'ELIGIBLE', identityApplicationId: 73 });
      if (path.endsWith('/location/resolve')) return send({ latitude: 21.01, longitude: 105.52, addressDetail: 'Gợi ý địa chỉ mới', commune: 'Hạ Bằng' });
      if (path === '/api/property-writing/description') return send({ description: 'Gợi ý mô tả dựa trên dữ liệu đã nhập của nhà trọ.' });
      if (path === '/api/host/property-registrations') {
        const body = request.postDataBuffer().toString();
        assert.ok(body.indexOf('filename="cover.png"') > 0);
        assert.ok(body.indexOf('filename="cover.png"') < body.indexOf('filename="front.png"'));
        for (const key of ['details', 'photos', 'ownership', 'fireSafety']) assert.ok(body.includes(`name="${key}"`));
        assert.ok(!body.includes('name="idCard"'));
        assert.ok(body.includes('Nhà trọ đã sửa') && body.includes('Số 12 đường kiểm thử') && body.includes('quietHours:22:15'));
        assert.ok(body.includes('"latitude":""'));
        if (++submissions === 1) return send(null, 503, 'Mạng kiểm thử không khả dụng.');
        if (submissions === 2) return route.abort('internetdisconnected');
        return send({ registrationId: 99, status: 'PENDING' });
      }
      const resources = {
        '/api/host/dashboard': { properties: [], totalRoomCount: 0, availableRoomCount: 0, pendingViewingCount: 0, roomTypeCount: 0, pendingRegistrationCount: 0 },
        '/api/host/property': { records: [] }, '/api/host/room-types': { roomTypes: [] },
        '/api/host/rooms': { rooms: [] }, '/api/host/viewings': { viewings: [] },
        '/api/viewings/notifications': { items: [], hasNext: false, unreadCount: 0 },
      };
      return send(resources[path] || { items: [], page: 0, totalPages: 0 });
    });
    await page.goto('http://127.0.0.1:8092/account');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('host@example.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('password1');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/home');
    await checkRegistration(page, async () => {
      await page.getByRole('button', { name: 'Đăng ký nhà trọ mới', exact: true }).click();
      await page.waitForURL('**/host/property-registration');
    }, async () => {
      await page.setViewportSize({ width: 320, height: 620 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
    assert.equal(submissions, 3);
    assert.deepEqual(errors, []);
    console.log('Passed: six steps, draft restore, AI and location previews, cover order, PDF, identity reuse, review edit, submission retry.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
