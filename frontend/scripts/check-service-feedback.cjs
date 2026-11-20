const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.resolve(__dirname, '../../target/service-feedback-browser'); fs.mkdirSync(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jTbkAAAAASUVORK5CYII=', 'base64');
  let actor = 'customer';
  const users = { customer: { userId: 8, fullName: 'Nguyễn Minh Anh', role: 'USER' }, owner: { userId: 7, fullName: 'Dịch vụ Hòa Lạc', role: 'USER' }, staff: { userId: 9, fullName: 'Nhân viên kiểm duyệt', role: 'STAFF' } };
  const listing = { serviceId: 1, providerId: 7, serviceName: 'Dọn dẹp phòng trọ Hòa Lạc', categoryId: 1, categoryName: 'Dọn dẹp & Vệ sinh', description: 'Dọn dẹp phòng trọ, vệ sinh nhà tắm và bếp. Hẹn lịch linh hoạt với sinh viên tại Hòa Lạc.', serviceArea: 'Tân Xã', contactPhone: '0987654321', providerName: 'Dịch vụ Hòa Lạc', pricingLabel: 'Từ 150.000 VNĐ', pricingType: 'FROM', price: 150000, activeState: 'ACTIVE', publicEligible: true, imageUrls: [] };
  const registration = { ...listing, registrationId: 1, status: 'APPROVED', documents: [], capabilityActive: true, serviceState: 'ACTIVE', operation: 'CREATE', revision: 1, serviceRevision: 1 };
  let reviews = [{ ratingId: 1, authorId: 10, authorName: 'Trần Bảo Ngọc', stars: 5, content: 'Đến đúng giờ, phòng được dọn rất sạch và gọn gàng.', createdAt: '2026-11-18T01:00:00Z', imageUrls: [], reply: null }];
  let complaint = null; let history = []; let writes = [];
  const details = req => JSON.parse(req.postDataBuffer().toString().split('Content-Type: application/json\r\n\r\n')[1].split('\r\n')[0]);
  const complaintDetail = () => ({ complaint, imageUrls: ['/api/service-complaints/1/images/0'], history,
    reporterName: actor === 'staff' ? users.customer.fullName : null, canReview: actor === 'staff' && ['PENDING', 'EXPLAINED', 'NEEDS_EXPLANATION'].includes(complaint.status), canExplain: actor === 'owner' && complaint.status === 'NEEDS_EXPLANATION' });
  await page.addInitScript(() => sessionStorage.setItem('hlrcs_access_token', 'browser-test'));
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname; let data;
    if (/\/images\/\d+$/.test(p)) { assert.ok(req.headers().authorization || p.includes('/ratings/')); return route.fulfill({ contentType: 'image/png', body: png }); }
    if (p === '/api/auth/me') data = { ...users[actor], email: actor + '@test.local', capabilities: actor === 'owner' ? ['MANAGE_SERVICE'] : [] };
    else if (p === '/api/staff/dashboard') data = { queue: [], activities: [], pendingVerifications: 0, pendingReports: 1, pendingSupport: 0, pendingCommunity: 0, activeProperties: 0, processedTasks: 0 };
    else if (p === '/api/services/1/ratings' && req.method() === 'GET') {
      const stars = url.searchParams.get('stars'); const counts = [0, 0, 0, 0, 0, 0]; reviews.forEach(r => counts[r.stars]++);
      const items = reviews.filter(r => stars === null || r.stars === Number(stars));
      data = { items, filteredTotal: items.length, page: 0, totalPages: items.length ? 1 : 0, total: reviews.length, average: reviews.reduce((n, r) => n + r.stars, 0) / reviews.length, counts, mine: reviews.find(r => r.authorId === users[actor].userId) || null };
    } else if (p === '/api/services/1/ratings') {
      const input = details(req); assert.equal(input.stars, 0); assert.match(req.postDataBuffer().toString(), /name="image"/);
      data = { ...input, ratingId: 2, authorId: 8, authorName: users.customer.fullName, createdAt: '2026-11-18T02:00:00Z', imageUrls: ['/api/services/1/ratings/2/images/0'], reply: null };
      reviews.unshift(data); writes.push('rating');
    } else if (/\/service-ratings\/\d+\/reply$/.test(p)) {
      assert.equal(actor, 'owner'); const input = req.postDataJSON(); const review = reviews.find(r => r.ratingId === Number(p.split('/')[3]));
      review.reply = input.content; review.repliedAt = '2026-11-18T02:10:00Z'; data = review; writes.push('reply');
    } else if (p === '/api/service-complaints' && req.method() === 'POST') {
      const input = details(req); assert.match(req.postDataBuffer().toString(), /name="image"/);
      complaint = { ...input, complaintId: 1, serviceName: listing.serviceName, providerName: listing.providerName, status: 'PENDING', revision: 0, createdAt: '2026-11-18T03:00:00Z', moderationHidden: false };
      data = complaintDetail(); writes.push('report');
    } else if (p === '/api/staff/service-complaints/1/review') {
      assert.equal(actor, 'staff'); const input = req.postDataJSON(); assert.equal(input.revision, complaint.revision);
      complaint = { ...complaint, revision: complaint.revision + 1, status: input.action === 'REMOVE' ? 'REMOVED' : 'NEEDS_EXPLANATION', moderationHidden: input.action === 'REMOVE' };
      history.push({ eventId: history.length + 1, actorName: users.staff.fullName, action: input.action, content: input.content, createdAt: '2026-11-18T04:00:00Z', imageUrls: [] });
      data = complaintDetail(); writes.push(input.action);
    } else if (p === '/api/service-complaints/1/explanation') {
      assert.equal(actor, 'owner'); const input = details(req); assert.equal(input.revision, complaint.revision);
      complaint = { ...complaint, revision: complaint.revision + 1, status: 'EXPLAINED' };
      history.push({ eventId: history.length + 1, actorName: users.owner.fullName, action: 'EXPLAINED', content: input.content, createdAt: '2026-11-18T04:10:00Z', imageUrls: ['/api/service-complaints/1/events/2/images/0'] });
      data = complaintDetail(); writes.push('explanation');
    } else if (p === '/api/service-complaints/1') data = complaintDetail();
    else if (['/api/service-complaints/mine', '/api/service-complaints/incoming', '/api/staff/service-complaints'].includes(p)) data = complaint ? [complaint] : [];
    else if (p === '/api/services/1') data = listing;
    else if (p === '/api/services') data = [listing];
    else if (p === '/api/services/categories') data = [{ categoryId: 1, name: listing.categoryName }];
    else if (['/api/service-registrations/mine', '/api/service-registrations/services'].includes(p)) data = actor === 'owner' ? [registration] : [];
    else throw new Error(`Unexpected API ${req.method()} ${p}`);
    await route.fulfill({ status: 200, json: { success: true, data } });
  });
  const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5182';
  try {
    await page.goto(base + '/services/detail?id=1');
    await page.getByRole('heading', { name: 'Chia sẻ trải nghiệm của bạn' }).waitFor();
    await page.locator('input[name="rating-score"][value="0"]').check();
    await page.getByLabel('Nội dung đánh giá').fill('Không đến đúng hẹn, tôi mong nhận được lời giải thích.');
    await page.getByLabel('Ảnh đính kèm (không bắt buộc)').setInputFiles({ name: 'review.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
    await page.getByText('Bạn đã đánh giá dịch vụ này 0/5 sao.', { exact: false }).waitFor();
    await page.getByRole('button', { name: '0 sao (1)', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.svc-rating-card').length === 1);
    await page.getByText('Không đến đúng hẹn, tôi mong nhận được lời giải thích.', { exact: true }).waitFor();
    assert.equal(await page.locator('.svc-rating-card').count(), 1);
    await page.locator('.svc-feedback').screenshot({ path: path.join(output, 'reviews-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.locator('.svc-feedback').screenshot({ path: path.join(output, 'reviews-mobile.png') });
    await page.getByRole('button', { name: 'Báo cáo dịch vụ', exact: true }).click();
    await page.getByLabel('Nội dung báo cáo').fill('Tôi đã chuyển tiền nhưng chưa nhận được dịch vụ như cam kết.');
    await page.getByRole('dialog').getByLabel('Ảnh đính kèm (không bắt buộc)').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Gửi báo cáo cho nhân viên' }).click();
    await page.getByText('Đã gửi báo cáo cho nhân viên', { exact: true }).waitFor();
    actor = 'owner'; await page.goto(base + '/services/detail?id=1');
    await page.getByLabel('Phản hồi đánh giá', { exact: true }).first().fill('Chúng tôi xin lỗi và sẽ liên hệ để hoàn lại tiền.');
    await page.getByRole('button', { name: 'Gửi phản hồi', exact: true }).first().click();
    await page.getByText('Chúng tôi xin lỗi và sẽ liên hệ để hoàn lại tiền.', { exact: true }).waitFor();
    actor = 'staff'; await page.setViewportSize({ width: 1440, height: 1050 }); await page.goto(base + '/staff/service-complaints?id=1');
    await page.getByLabel('Thông tin cần nhà cung cấp trình báo lại').fill('Vui lòng cung cấp thông tin giao dịch và bằng chứng hoàn tiền.');
    await page.getByRole('button', { name: 'Lưu quyết định' }).click();
    await page.getByText('Đã lưu và gửi kết quả xử lý.').waitFor();
    actor = 'owner'; await page.goto(base + '/services');
    await page.getByRole('button', { name: 'Dịch vụ của tôi', exact: true }).click();
    await page.getByRole('button', { name: 'Gửi giải trình', exact: true }).click();
    await page.getByLabel('Thông tin giải trình').fill('Chúng tôi đã hoàn lại toàn bộ khoản tiền, đính kèm chứng từ.');
    await page.getByRole('dialog').getByLabel('Ảnh đính kèm (không bắt buộc)').setInputFiles({ name: 'refund.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Gửi giải trình cho nhân viên' }).click();
    await page.getByText('Đã lưu và gửi kết quả xử lý.').waitFor();
    actor = 'staff'; await page.goto(base + '/staff/service-complaints?id=1');
    await page.getByLabel('Quyết định').selectOption('REMOVE');
    await page.getByLabel('Lý do xử lý').fill('Đã xác minh hành vi vi phạm, cần gỡ dịch vụ khỏi công khai.');
    assert.equal(await page.getByRole('button', { name: 'Lưu quyết định' }).isDisabled(), true);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Lưu quyết định' }).click();
    await page.getByText('Dịch vụ đã bị nhân viên gỡ khỏi chế độ công khai.').waitFor();
    await page.screenshot({ path: path.join(output, 'staff-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: path.join(output, 'staff-mobile.png'), fullPage: true });
    assert.deepEqual(writes, ['rating', 'report', 'reply', 'REQUEST_EXPLANATION', 'explanation', 'REMOVE']);
    assert.deepEqual(errors, []);
    console.log('PASS: rating 0, star filter, photos, owner reply, complaint, staff request, owner explanation, removal; desktop/mobile layouts.');
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
