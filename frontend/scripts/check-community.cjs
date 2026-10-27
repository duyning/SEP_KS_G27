const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Run only against a disposable backend: this check creates and reviews a post.
if (process.env.COMMUNITY_ISOLATED_TEST !== '1' || !process.env.FRONTEND_URL) {
  throw new Error('Set COMMUNITY_ISOLATED_TEST=1 and FRONTEND_URL to an isolated test app.');
}
const base = process.env.FRONTEND_URL;
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../../logs');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const title = `Nhượng phòng kiểm thử ${Date.now()}`;
  try {
    const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
    const [author, staff, guest] = await Promise.all(contexts.map(context => context.newPage()));
    for (const page of [author, staff, guest]) page.on('pageerror', error => errors.push(error.message));
    async function login(page, email) {
      await page.goto(`${base}/login`);
      await page.locator('#loginIdentifier').fill(email);
      await page.locator('#loginPassword').fill('123456');
      await page.locator('#submitBtn').click();
      await page.waitForURL(url => url.pathname !== '/login');
    }
    await login(author, 'user@hlrcs.com');
    await author.goto(`${base}/community`);
    const openForm = () => author.getByRole('button', { name: 'Đăng bài viết mới', exact: true }).click();
    const closeButton = () => author.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true });
    const cancelButton = () => author.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true });
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
      await author.setViewportSize(viewport);
      await openForm();
      const layout = await author.getByRole('dialog').evaluate(dialog => {
        const body = dialog.querySelector('.modal-body');
        const submit = dialog.querySelector('button[type="submit"]').getBoundingClientRect();
        return { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, submitTop: submit.top, submitBottom: submit.bottom, viewportHeight: window.innerHeight };
      });
      assert.ok(layout.scrollHeight <= layout.clientHeight + 1, `Form requires scrolling at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout)}`);
      assert.ok(layout.submitTop >= 0 && layout.submitBottom <= layout.viewportHeight, 'Submit button is outside viewport');
      if (viewport.width === 1366 || viewport.width === 390) await author.screenshot({ path: path.join(output, `community-form-${viewport.width}.png`), fullPage: true });
      await closeButton().click();
      await author.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    await author.setViewportSize({ width: 1366, height: 768 });
    await openForm();
    await cancelButton().click();
    await author.getByRole('dialog').waitFor({ state: 'hidden' });
    await openForm();
    await author.locator('#postTitle').fill('a');
    await author.mouse.click(2, 2);
    await author.keyboard.press('Escape');
    assert.equal(await author.getByRole('dialog').count(), 1, 'Backdrop or Escape closed the form');
    assert.equal(await author.locator('#postTitle').inputValue(), 'a');
    let confirmationCount = 0;
    author.once('dialog', async dialog => { confirmationCount++; assert.equal(dialog.type(), 'confirm'); await dialog.dismiss(); });
    await closeButton().click();
    assert.equal(confirmationCount, 1, 'Closing after one character must ask for confirmation');
    assert.equal(await author.locator('#postTitle').inputValue(), 'a', 'Dismissed confirmation discarded input');
    author.once('dialog', async dialog => { confirmationCount++; await dialog.dismiss(); });
    await cancelButton().click();
    assert.equal(confirmationCount, 2, 'Cancel must use the same confirmation');
    assert.equal(await author.locator('#postTitle').inputValue(), 'a');
    await author.locator('#postTitle').fill('');
    await cancelButton().click();
    await author.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(confirmationCount, 2, 'Erased input must close without confirmation');
    await openForm();
    await author.locator('#postType').selectOption('SECOND_HAND');
    author.once('dialog', async dialog => { confirmationCount++; await dialog.accept(); });
    await closeButton().click();
    await author.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(confirmationCount, 3, 'Category change must protect the draft');
    await author.getByRole('button', { name: 'Đăng bài viết mới', exact: true }).click();
    await author.getByRole('button', { name: 'Gửi bài kiểm duyệt', exact: true }).click();
    await author.locator('#title-error').waitFor();
    await author.locator('#content-error').waitFor();
    await author.locator('#location-error').waitFor();
    await author.locator('#postTitle').fill(title);
    await author.locator('#postContent').fill('Phòng khép kín đầy đủ tiện nghi, có ban công và chỗ để xe tại Tân Xã.');
    await author.locator('#postLocation').fill('Thôn 2, Tân Xã, Hòa Lạc');
    await author.locator('#authorName').fill('Người đăng kiểm thử');
    await author.locator('#authorPhone').fill('0912 345 678');
    await author.locator('#postPrice').fill('1.5');
    await author.getByRole('button', { name: 'Gửi bài kiểm duyệt', exact: true }).click();
    await author.locator('#price-error').waitFor();
    await author.screenshot({ path: path.join(output, 'community-validation.png'), fullPage: true });
    await author.locator('#postPrice').fill('');
    for (const amount of ['120000', '123456789', '1000', '1000000', '2200000']) {
      await author.locator('#postPrice').fill('');
      await author.locator('#postPrice').pressSequentially(amount);
      const formatted = new Intl.NumberFormat('vi-VN').format(Number(amount));
      assert.equal(await author.locator('#postPrice').inputValue(), formatted, `Typing ${amount} changed its digits`);
      await author.locator('#postPrice').press('End');
      for (let remaining = amount.length - 1; remaining >= 0; remaining--) {
        await author.locator('#postPrice').press('Backspace');
        const expected = remaining ? new Intl.NumberFormat('vi-VN').format(Number(amount.slice(0, remaining))) : '';
        assert.equal(await author.locator('#postPrice').inputValue(), expected, `Backspace got stuck at ${remaining} digits of ${amount}`);
      }
    }
    // IME/mobile input can lack inputType/data; format based on the actual edit.
    for (const digit of '120000') {
      await author.locator('#postPrice').evaluate((input, inserted) => {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setValue.call(input, input.value + inserted);
        input.setSelectionRange(input.value.length, input.value.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, digit);
    }
    assert.equal(await author.locator('#postPrice').inputValue(), '120.000', 'Input without keyboard metadata changed the amount');
    await author.locator('#postPrice').fill('');
    await author.locator('#postPrice').pressSequentially('123456');
    await author.locator('#postPrice').press('Home');
    await author.locator('#postPrice').press('ArrowRight');
    await author.locator('#postPrice').press('ArrowRight');
    await author.locator('#postPrice').pressSequentially('9');
    assert.equal(await author.locator('#postPrice').inputValue(), '1.293.456', 'Middle insertion moved the cursor to the wrong digit');
    await author.locator('#postPrice').press('Delete');
    assert.equal(await author.locator('#postPrice').inputValue(), '129.456', 'Forward deletion did not remove the intended digit');
    await author.locator('#postPrice').press('Control+a');
    await author.locator('#postPrice').press('Backspace');
    assert.equal(await author.locator('#postPrice').inputValue(), '', 'Select-all deletion must empty the amount');
    await author.locator('#postPrice').pressSequentially('2200000');
    assert.equal(await author.locator('#postPrice').inputValue(), '2.200.000', 'Price must group digits while typing');
    await author.locator('#postPrice').press('Backspace');
    assert.equal(await author.locator('#postPrice').inputValue(), '220.000');
    await author.locator('#postPrice').pressSequentially('0');
    assert.equal(await author.locator('#postPrice').inputValue(), '2.200.000');
    await author.locator('#postPrice').press('Home');
    await author.locator('#postPrice').press('ArrowRight');
    await author.locator('#postPrice').press('ArrowRight');
    await author.locator('#postPrice').press('Backspace');
    assert.equal(await author.locator('#postPrice').inputValue(), '200.000', 'Deleting across a dot must remove a digit');
    await author.locator('#postPrice').fill('2200000');
    assert.equal(await author.locator('#postPrice').inputValue(), '2.200.000', 'Pasted digits must also format');
    await author.getByRole('button', { name: 'Gửi bài kiểm duyệt', exact: true }).click();
    await author.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await author.getByRole('heading', { name: title, exact: true }).count(), 0, 'Pending post appeared publicly');
    await author.getByRole('button', { name: 'Bài viết của tôi', exact: true }).click();
    await author.getByRole('heading', { name: title, exact: true }).waitFor();
    await author.locator('article').filter({ hasText: title }).getByText('Chờ kiểm duyệt', { exact: true }).waitFor();
    await author.screenshot({ path: path.join(output, 'community-pending.png'), fullPage: true });

    await login(staff, 'staff@hlrcs.com');
    await staff.goto(`${base}/staff/community`);
    await staff.getByRole('row').filter({ hasText: title }).getByRole('link', { name: 'Thẩm định' }).click();
    await staff.getByRole('heading', { name: title, exact: true }).waitFor();
    await staff.getByRole('button', { name: 'Yêu cầu chỉnh sửa', exact: true }).click();
    await staff.getByRole('button', { name: 'Gửi yêu cầu chỉnh sửa', exact: true }).click();
    await staff.getByRole('alert').filter({ hasText: '10 đến 2000' }).waitFor();
    await staff.getByPlaceholder('Nhập yêu cầu chỉnh sửa...').fill('Vui lòng bổ sung rõ giá điện nước hàng tháng.');
    await staff.getByRole('button', { name: 'Gửi yêu cầu chỉnh sửa', exact: true }).click();
    await staff.getByRole('dialog').waitFor({ state: 'hidden' });

    await author.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await author.getByText('Vui lòng bổ sung rõ giá điện nước hàng tháng.', { exact: false }).waitFor();
    await author.getByRole('button', { name: 'Chỉnh sửa và gửi duyệt lại', exact: true }).click();
    assert.equal(await author.locator('#postPrice').inputValue(), '2.200.000', 'Existing prices must be formatted when editing');
    await author.locator('#postContent').fill('Phòng khép kín có ban công. Giá điện 3.500 đồng/kWh và giá nước 25.000 đồng/m3 theo đồng hồ riêng.');
    await author.getByRole('button', { name: 'Gửi bài kiểm duyệt', exact: true }).click();
    await author.getByRole('dialog').waitFor({ state: 'hidden' });
    await author.locator('article').filter({ hasText: title }).getByText('Chờ kiểm duyệt', { exact: true }).waitFor();
    await guest.goto(`${base}/community`);
    await Promise.all([
      guest.waitForResponse(response => response.url().endsWith('/api/community/posts') && response.request().method() === 'GET'),
      guest.getByRole('button', { name: 'Làm mới', exact: true }).click(),
    ]);
    await guest.getByText('Đang tải bài viết...', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await guest.getByRole('heading', { name: title, exact: true }).count(), 0);

    await staff.reload();
    await staff.getByRole('button', { name: 'Duyệt bài viết (Công khai)', exact: true }).click();
    await staff.getByRole('button', { name: 'Đồng ý duyệt', exact: true }).click();
    await staff.getByRole('dialog').waitFor({ state: 'hidden' });
    await staff.getByText('Bài viết đã được kiểm duyệt', { exact: true }).waitFor();
    await staff.screenshot({ path: path.join(output, 'community-staff-approved.png'), fullPage: true });
    await guest.reload();
    await guest.getByRole('heading', { name: title, exact: true }).waitFor();
    await guest.screenshot({ path: path.join(output, 'community-public.png'), fullPage: true });
    await guest.setViewportSize({ width: 390, height: 844 });
    await guest.screenshot({ path: path.join(output, 'community-mobile.png'), fullPage: true });
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log('PASS: form fits desktop/mobile viewports, backdrop/Escape cannot close, X/Cancel protect edited drafts, field validation, pending privacy, staff changes, author resubmission, approval and public feed.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
