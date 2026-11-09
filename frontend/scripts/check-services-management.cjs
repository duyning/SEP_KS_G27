const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.resolve(__dirname, '../migration/service-management-check'); fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'browser-only'));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTbkAAAAASUVORK5CYII=', 'base64');
    const services = Array.from({ length: 6 }, (_, index) => ({ serviceId: index + 1, providerId: 7, serviceName: ['Chuyển trọ Tân Xã', 'Giặt sấy sinh viên', 'Dọn dẹp phòng trọ'][index % 3] + ' ' + (index + 1), categoryId: 1, categoryName: 'Dịch vụ hỗ trợ', description: 'Dịch vụ hỗ trợ sinh viên tại Hòa Lạc. Thông tin được xác minh trước khi công khai.', serviceArea: 'Tân Xã, Thạch Hòa', contactPhone: '0987654321', contactEmail: 'provider@example.test', providerName: 'Nhà cung cấp kiểm thử', pricingLabel: 'Từ 150.000 VNĐ', pricingType: 'FROM', price: 150000, activeState: 'ACTIVE', publicEligible: true, imageUrl: '/api/services/1/image' }));
    const documentName = '1790956843915_1049894270787206241_1049894270787206241_0121e04bf8d8553f8c4e98d0b47d4d5d_tai_lieu_xac_minh_dich_vu.jpg';
    const approved = { ...services[0], registrationId: 1, applicantId: 7, applicantName: 'Người cung cấp kiểm thử', status: 'APPROVED', capabilityDecision: 'APPROVE', listingDecision: 'APPROVE', operation: 'CREATE', hasImage: true, imageCount: 3, documents: [{ documentId: 1, name: documentName }], revision: 1, serviceRevision: 1, capabilityActive: true, serviceState: 'ACTIVE' };
    services.forEach(service => { service.imageUrls = [0, 1, 2].map(index => `/api/services/${service.serviceId}/image?index=${index}`); });
    let mine = [approved], writes = 0, duplicateOnce = true;
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()).pathname; let data;
      if (url.endsWith('/image')) return route.fulfill({ status: 200, contentType: 'image/png', body: png });
      if (url === '/api/service-registrations/documents/1') return route.fulfill({ status: 200, contentType: 'image/jpeg', body: png });
      if (url === '/api/auth/me') data = { userId: 7, fullName: 'Người cung cấp kiểm thử', email: 'provider@example.test', phoneNumber: '0987654321', role: 'USER', capabilities: ['MANAGE_SERVICE'] };
      else if (url === '/api/services/categories' || url === '/api/service-registrations/categories') data = [{ categoryId: 1, name: 'Dịch vụ hỗ trợ' }, { categoryId: 5, name: 'Dịch vụ khác' }];
      else if (url === '/api/services') data = services;
      else if (/^\/api\/services\/\d+$/.test(url)) data = services.find(s => s.serviceId === Number(url.split('/').pop()));
      else if (url === '/api/service-registrations/mine') data = mine;
      else if (url === '/api/service-registrations/current') data = { canRegister: true, reason: 'ELIGIBLE', registration: approved };
      else if (url.endsWith('/changes')) {
        writes++; assert.match(req.postDataBuffer().toString(), /UPDATE|DELETE/);
        const next = { ...approved, registrationId: 10 + writes, status: 'PENDING', operation: req.postDataBuffer().toString().includes('DELETE') ? 'DELETE' : 'UPDATE', targetServiceId: 1, revision: 0 };
        mine = [next, ...mine]; data = next;
      } else if (url === '/api/service-registrations' && req.method() === 'POST') {
        const body = req.postDataBuffer().toString();
        assert.match(body, /name="image"/); assert.match(body, /name="documents"/);
        assert.equal((body.match(/name="image"/g) || []).length, 2);
        const payload = JSON.parse(body.split('Content-Type: application/json\r\n\r\n')[1].split('\r\n')[0]);
        assert.equal(payload.price, 200000.5); assert.equal(payload.categoryId, 5);
        if (duplicateOnce) {
          duplicateOnce = false;
          return route.fulfill({ status: 409, json: { success: false, message: 'Tên dịch vụ đã có trong danh sách của bạn.' } });
        }
        writes++;
        data = { ...approved, registrationId: 10 + writes, serviceId: null, serviceName: 'Dịch vụ mới trong trình duyệt', status: 'PENDING', operation: 'CREATE', revision: 0 };
        mine = [data, ...mine];
      } else return route.fulfill({ status: 404, json: { success: false, message: 'Unexpected browser-only API: ' + url } });
      return route.fulfill({ status: 200, json: { success: true, data } });
    });
    await page.goto((process.env.FRONTEND_URL || 'http://127.0.0.1:5187') + '/services');
    await page.getByRole('heading', { name: services[0].serviceName, exact: true }).waitFor();
    const categoryFilter = page.getByRole('combobox', { name: 'Loại dịch vụ', exact: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await categoryFilter.click();
      await page.getByRole('option', { name: 'Dịch vụ khác', exact: true }).waitFor();
      assert.ok(await page.locator('.svc-discovery-toolbar .svc-select-menu').evaluate(menu => menu.getBoundingClientRect().left >= 0 && menu.getBoundingClientRect().right <= innerWidth));
      await page.screenshot({ path: path.join(output, `catalog-category-${width}.png`), animations: 'disabled' });
      await categoryFilter.press('Escape');
    }
    await categoryFilter.click();
    await categoryFilter.press('End'); await categoryFilter.press('Enter');
    await page.waitForURL(url => url.searchParams.get('category') === '5');
    await page.getByRole('heading', { name: 'Không tìm thấy dịch vụ phù hợp', exact: true }).waitFor();
    await categoryFilter.click(); await categoryFilter.press('Home'); await categoryFilter.press('Enter');
    await page.waitForURL(url => !url.searchParams.has('category'));
    const search = page.getByRole('searchbox', { name: 'Tìm kiếm dịch vụ', exact: true });
    await search.fill('nha cung cap kiem thu');
    await page.waitForFunction(() => document.querySelectorAll('.svc-catalog-list>.svc-grid>.svc-card').length === 6);
    await search.fill('chuyen tro tan xa 1');
    await page.waitForFunction(() => document.querySelectorAll('.svc-catalog-list>.svc-grid>.svc-card').length === 1);
    await categoryFilter.click(); await page.getByRole('option', { name: 'Dịch vụ hỗ trợ', exact: true }).click();
    await page.getByRole('combobox', { name: 'Khu vực', exact: true }).click();
    await page.getByRole('option', { name: 'Thạch Hòa', exact: true }).click();
    await page.reload();
    await page.getByRole('heading', { name: services[0].serviceName, exact: true }).waitFor();
    assert.equal(await search.inputValue(), 'chuyen tro tan xa 1');
    assert.equal(await page.locator('.svc-catalog-list>.svc-grid>.svc-card').count(), 1);
    assert.equal(new URL(page.url()).searchParams.get('area'), 'Thạch Hòa');
    assert.equal(new URL(page.url()).searchParams.get('category'), '1');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `catalog-filtered-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Bỏ lọc Thạch Hòa', exact: true }).click();
    assert.equal(await search.inputValue(), 'chuyen tro tan xa 1');
    await search.fill('khong co dich vu nay');
    await page.getByRole('heading', { name: 'Không tìm thấy dịch vụ phù hợp', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem tất cả dịch vụ', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.svc-catalog-list>.svc-grid>.svc-card').length === 6);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đăng ký dịch vụ', exact: true }).count(), 0);
    mine = [];
    await page.reload();
    await page.getByRole('button', { name: 'Đăng ký dịch vụ', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Đăng ký dịch vụ', exact: true }).click();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    mine = [approved];
    await page.reload();
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).waitFor();
    await page.getByRole('heading', { name: services[0].serviceName, exact: true }).waitFor();
    assert.equal(await page.locator('.svc-grid .svc-card').count(), 6);
    const boxes = await page.locator('.svc-card').evaluateAll(cards => cards.map(card => ({ top: card.getBoundingClientRect().top, left: card.getBoundingClientRect().left })));
    assert.equal(boxes[0].top, boxes[2].top); assert.ok(boxes[3].top > boxes[0].top);
    const heights = await page.locator('.svc-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().height));
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 1);
    assert.equal(await page.locator('.svc-description').first().evaluate(description => getComputedStyle(description).webkitLineClamp), '2');
    await page.screenshot({ path: path.join(output, 'catalog-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Liên hệ', exact: true }).first().click();
    assert.equal(await page.getByRole('link', { name: 'Gọi 0987654321' }).getAttribute('href'), 'tel:0987654321');
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).click();
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).click();
    assert.equal(await page.locator('input[name="serviceName"]').inputValue(), services[0].serviceName);
    await page.locator('input[name="serviceName"]').fill('Tên mới chỉ công khai sau khi duyệt');
    await page.getByRole('textbox', { name: 'Nội dung thay đổi' }).fill('Thay đổi tên và ảnh đại diện dịch vụ.');
    await page.locator('input[type=file]').first().setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Gửi cập nhật cho Staff duyệt' }).click();
    await page.getByRole('heading', { name: /Hồ sơ #11/ }).waitFor(); assert.equal(writes, 1);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Cập nhật', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(expected => getComputedStyle(document.querySelector('.svc-grid')).gridTemplateColumns.split(' ').length === expected, width > 1000 ? 3 : width > 640 ? 2 : 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const count = await page.locator('.svc-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
      assert.equal(count, width > 1000 ? 3 : width > 640 ? 2 : 1);
      await page.screenshot({ path: path.join(output, `catalog-${width}.png`), fullPage: true });
    }
    mine = [approved];
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).click();
    await page.getByRole('button', { name: 'Yêu cầu xóa', exact: true }).click();
    await page.getByRole('textbox', { name: 'Lý do xóa' }).fill('Ngừng cung cấp dịch vụ trong tháng tới.');
    await page.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(writes, 1);
    await page.getByRole('button', { name: 'Yêu cầu xóa', exact: true }).click();
    await page.getByRole('textbox', { name: 'Lý do xóa' }).fill('Ngừng cung cấp dịch vụ trong tháng tới.');
    await page.getByRole('button', { name: 'Gửi yêu cầu xóa', exact: true }).click();
    await page.getByRole('button', { name: 'Cập nhật', exact: true }).waitFor(); assert.equal(writes, 2);
    assert.ok(await page.getByRole('button', { name: 'Cập nhật', exact: true }).isDisabled());
    await page.getByRole('button', { name: '+ Thêm dịch vụ', exact: true }).click();
    await page.getByText('Từ 20 đến 5000 ký tự. Đã nhập: 0/5000 ký tự.', { exact: true }).waitFor();
    await page.locator('input[name="serviceName"]').fill('Dịch vụ mới trong trình duyệt');
    await page.getByRole('combobox', { name: 'Danh mục *', exact: true }).click();
    await page.getByRole('dialog').getByRole('option', { name: 'Dịch vụ khác', exact: true }).waitFor();
    await page.getByRole('dialog').screenshot({ path: path.join(output, 'service-dropdown-mobile.png'), animations: 'disabled' });
    await page.getByRole('combobox', { name: 'Danh mục *', exact: true }).press('End');
    await page.getByRole('combobox', { name: 'Danh mục *', exact: true }).press('Enter');
    assert.equal(await page.getByRole('combobox', { name: 'Danh mục *', exact: true }).innerText(), 'Dịch vụ khác');
    await page.getByRole('combobox', { name: 'Loại giá' }).click();
    await page.getByRole('combobox', { name: 'Loại giá' }).press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 1);
    await page.locator('textarea[name="description"]').fill('Dịch vụ mới hỗ trợ người thuê trọ tại Hòa Lạc.');
    await page.locator('input[name="price"]').fill('200000');
    assert.equal(await page.locator('input[name="price"]').inputValue(), '200.000');
    await page.locator('input[name="price"]').press('End');
    await page.locator('input[name="price"]').pressSequentially(',50');
    assert.equal(await page.locator('input[name="price"]').inputValue(), '200.000,50');
    await page.locator('input[name="serviceArea"]').fill('Tân Xã');
    const longName = 'hinh_anh_tai_lieu_dich_vu_'.repeat(14);
    await page.locator('input[type=file]').nth(0).setInputFiles({ name: longName + '.png', mimeType: 'image/png', buffer: png });
    await page.locator('input[name="image"]').setInputFiles([{ name: 'extra.png', mimeType: 'image/png', buffer: png }, { name: 'remove.png', mimeType: 'image/png', buffer: png }]);
    assert.equal(await page.locator('.svc-upload-photo').count(), 3);
    await page.getByRole('button', { name: 'Xóa ảnh 3', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.svc-upload-photo').length === 2);
    assert.equal(await page.locator('.svc-upload-photo').count(), 2);
    await page.locator('input[name="image"]').setInputFiles(Array.from({ length: 4 }, (_, i) => ({ name: `overflow-${i}.png`, mimeType: 'image/png', buffer: png })));
    await page.getByText('Chọn tối đa 5 ảnh dịch vụ.', { exact: true }).waitFor();
    assert.equal(await page.locator('.svc-upload-photo').count(), 2);
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: longName + '.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nproof') });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.locator('.modal-body').evaluate(body => body.scrollWidth <= body.clientWidth + 1), `Form overflow at ${width}`);
      assert.ok(await page.locator('.svc-editor-photo').evaluateAll(images => images.every(image => image.getBoundingClientRect().width <= image.parentElement.clientWidth)));
    }
    await page.getByRole('dialog').screenshot({ path: path.join(output, 'create-service-mobile.png'), animations: 'disabled' });
    await page.locator('input[name="price"]').scrollIntoViewIfNeeded();
    await page.getByRole('dialog').screenshot({ path: path.join(output, 'service-money-mobile.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Gửi hồ sơ xét duyệt', exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole('dialog').screenshot({ path: path.join(output, 'service-files-mobile.png'), animations: 'disabled' });
    await page.locator('textarea[name="description"]').fill('Mô tả chưa đủ');
    await page.getByRole('button', { name: 'Gửi hồ sơ xét duyệt', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.name === 'description');
    await page.waitForFunction(() => {
      const field = document.querySelector('textarea[name="description"]'), body = document.querySelector('.modal-body');
      return field.getBoundingClientRect().top >= body.getBoundingClientRect().top && field.getBoundingClientRect().bottom + 50 <= body.getBoundingClientRect().bottom;
    });
    assert.equal(await page.locator('textarea[name="description"]').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('textarea[name="description"]').evaluate(input => getComputedStyle(input).borderTopColor), 'rgb(220, 38, 38)');
    await page.getByText('Mô tả dịch vụ phải có từ 20 đến 5000 ký tự.', { exact: true }).waitFor();
    assert.equal(writes, 2);
    await page.getByRole('dialog').screenshot({ path: path.join(output, 'description-validation-mobile.png'), animations: 'disabled' });
    await page.locator('textarea[name="description"]').fill('Dịch vụ mới hỗ trợ người thuê trọ tại Hòa Lạc.');
    await page.getByRole('button', { name: 'Gửi hồ sơ xét duyệt', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.name === 'serviceName');
    await page.waitForFunction(() => {
      const field = document.querySelector('input[name="serviceName"]'), body = document.querySelector('.modal-body');
      return field.getBoundingClientRect().top >= body.getBoundingClientRect().top && field.getBoundingClientRect().bottom + 50 <= body.getBoundingClientRect().bottom;
    });
    await page.getByText('Tên dịch vụ đã có trong danh sách của bạn.', { exact: true }).waitFor();
    assert.equal(await page.locator('input[name="serviceName"]').isEnabled(), true);
    assert.equal(await page.locator('input[name="serviceName"]').evaluate(input => getComputedStyle(input).borderTopColor), 'rgb(220, 38, 38)');
    assert.equal(await page.locator('textarea[name="description"]').inputValue(), 'Dịch vụ mới hỗ trợ người thuê trọ tại Hòa Lạc.');
    assert.equal(await page.locator('.svc-upload-photo').count(), 2);
    assert.equal(await page.locator('input[name="documents"]').evaluate(input => input.files.length), 1);
    await page.getByRole('dialog').screenshot({ path: path.join(output, 'duplicate-name-validation-mobile.png'), animations: 'disabled' });
    await page.locator('input[name="serviceName"]').fill('Dịch vụ mới với tên không trùng');
    await page.getByRole('button', { name: 'Gửi hồ sơ xét duyệt', exact: true }).click();
    await page.getByRole('heading', { name: /Hồ sơ #13/ }).waitFor(); assert.equal(writes, 3);
    await page.getByRole('button', { name: 'Xem ảnh 3', exact: true }).click();
    await page.getByRole('img', { name: 'Ảnh dịch vụ 3', exact: true }).waitFor();
    const attachment = page.getByRole('button', { name: 'Tải xuống ' + documentName, exact: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('button', { name: 'Cập nhật kết quả hồ sơ', exact: true }).scrollIntoViewIfNeeded();
      assert.ok(await page.locator('.modal-body').evaluate(body => body.scrollWidth <= body.clientWidth + 1));
      assert.equal(await attachment.getAttribute('title'), documentName);
      assert.ok((await attachment.locator('.svc-attachment-name').innerText()).includes('…'));
      assert.ok((await attachment.locator('.svc-attachment-name').innerText()).length <= 42);
      await page.getByRole('dialog').screenshot({ path: path.join(output, `application-result-${width}.png`), animations: 'disabled' });
    }
    const download = page.waitForEvent('download');
    await attachment.click();
    assert.equal((await download).suggestedFilename(), documentName);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('link', { name: /Xem chi tiết/ }).first().click();
    await page.getByRole('button', { name: 'Xem ảnh 2', exact: true }).click();
    await page.getByRole('img', { name: services[0].serviceName + ' 2', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).click();
    await page.getByRole('img', { name: services[0].serviceName + ' 3', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Ảnh tiếp theo', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Ảnh trước', exact: true }).click();
    await page.getByRole('img', { name: services[0].serviceName + ' 2', exact: true }).waitFor();
    assert.equal(await page.locator('.svc-gallery-heading').innerText(), 'Ảnh dịch vụ\n2 / 3');
    await page.screenshot({ path: path.join(output, 'public-gallery-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const longDescription = 'Dịch vụ dọn dẹp phòng trọ theo yêu cầu. '.repeat(25) + 'PHẦN CUỐI MÔ TẢ';
    const requestedChanges = 'Bổ sung ảnh rõ nét giấy phép kinh doanh.\nCập nhật khu vực phục vụ và số điện thoại liên hệ.';
    mine = [
      { ...approved, registrationId: 24, status: 'NEEDS_SUPPLEMENT', serviceId: null, targetServiceId: null, serviceName: 'Hồ sơ cần bổ sung', description: longDescription, requestedChanges, reasonNote: requestedChanges, reviewerName: 'Nhân viên xét duyệt', supplementRequestedAt: '2026-11-08T10:00:00' },
      { ...approved, registrationId: 23, serviceName: 'Dịch vụ đã được duyệt xóa', operation: 'DELETE', targetServiceId: 1, serviceState: 'DELETED', publicEligible: false },
      { ...approved, registrationId: 22, serviceId: 2, serviceName: 'Dịch vụ bị từ chối xóa', operation: 'DELETE', status: 'REJECTED', listingDecision: 'REJECT', targetServiceId: 2 },
      { ...approved, registrationId: 21, serviceId: 3, serviceName: 'Dịch vụ đang chờ xóa', operation: 'DELETE', status: 'PENDING', listingDecision: null, targetServiceId: 3 },
      { ...approved, registrationId: 20, serviceId: 2, serviceName: 'Dịch vụ còn hoạt động' },
      { ...approved, registrationId: 19, serviceId: 3, serviceName: 'Dịch vụ còn chờ duyệt xóa' },
      { ...approved, serviceName: 'Bản cũ của dịch vụ đã xóa' },
    ];
    await page.goto((process.env.FRONTEND_URL || 'http://127.0.0.1:5187') + '/services');
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).click();
    await page.getByRole('heading', { name: 'Dịch vụ còn hoạt động', exact: true }).waitFor();
    assert.equal(await page.locator('.svc-management .svc-card').count(), 2);
    assert.equal(await page.getByRole('heading', { name: 'Bản cũ của dịch vụ đã xóa', exact: true }).count(), 0);
    assert.equal(await page.getByRole('heading', { name: 'Dịch vụ đã được duyệt xóa', exact: true }).count(), 0);
    assert.equal(await page.locator('.svc-request').count(), 7);
    await page.getByRole('button', { name: 'Bổ sung hồ sơ', exact: true }).click();
    await page.locator('.svc-supplement-request').waitFor();
    assert.ok(await page.locator('.svc-supplement-request').evaluate(notice => notice.getBoundingClientRect().top < document.querySelector('.svc-application-summary').getBoundingClientRect().top));
    assert.equal(await page.locator('.svc-supplement-instructions').innerText(), requestedChanges);
    const description = page.locator('.svc-expandable-text').filter({ hasText: 'Mô tả dịch vụ' });
    assert.equal(await description.getByText('PHẦN CUỐI MÔ TẢ', { exact: false }).count(), 0);
    await description.getByRole('button', { name: 'Xem thêm', exact: true }).click();
    await description.getByText('PHẦN CUỐI MÔ TẢ', { exact: false }).waitFor();
    await description.getByRole('button', { name: 'Thu gọn', exact: true }).click();
    assert.equal(await description.getByText('PHẦN CUỐI MÔ TẢ', { exact: false }).count(), 0);
    assert.equal(await page.locator('textarea[name="description"]').inputValue(), longDescription);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('.modal-body').evaluate(body => { body.scrollTop = 0; });
      assert.ok(await page.locator('.svc-supplement-request').isVisible());
      assert.ok(await page.locator('.modal-body').evaluate(body => body.scrollWidth <= body.clientWidth + 1));
      await page.getByRole('dialog').screenshot({ path: path.join(output, `supplement-first-${width}.png`), animations: 'disabled' });
    }
    assert.deepEqual(errors, []); console.log('Browser checks passed: inline hints, focus/scroll to invalid fields, recoverable duplicate-name conflict with retained inputs/files, resubmit, cards, contact, owner changes, responsive layout. All API writes intercepted.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
