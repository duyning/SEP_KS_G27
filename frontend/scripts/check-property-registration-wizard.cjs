const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASE_URL = process.env.WIZARD_TEST_URL || 'http://127.0.0.1:5196';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../target/property-registration-wizard-ui');

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function apiOk(data) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      window.sessionStorage.setItem('hlrcs_access_token', 'wizard-e2e-token');
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('https://**', (route) => route.abort());

    let submitAttempts = 0;
    let submittedRecord = null;
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/api/auth/me')) {
        return route.fulfill(
          apiOk({
            userId: 77,
            email: 'host77@example.com',
            fullName: 'Nguyễn Văn Hưng',
            phoneNumber: '0912345678',
            phoneVerifiedAt: '2026-11-20T09:00:00Z',
            role: 'USER'
          })
        );
      }
      if (url.includes('/api/host-onboarding/current')) {
        return route.fulfill(apiOk({ account: null, registration: submittedRecord }));
      }
      if (url.includes('/api/host-onboarding') && method === 'POST') {
        submitAttempts += 1;
        if (submitAttempts === 1) {
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Máy chủ tạm gián đoạn, vui lòng thử lại.' })
          });
        }
        submittedRecord = {
          registrationId: 88,
          name: 'Nhà trọ An Khang Hòa Lạc',
          status: 'PENDING',
          createdAt: '2026-11-24T03:25:00Z',
          reasonNote: ''
        };
        return route.fulfill(apiOk(submittedRecord));
      }
      if (url.includes('/api/locations/status') || url.includes('vietmap')) {
        return route.fulfill(apiOk({ enabled: false }));
      }
      if (url.includes('/api/favorites') || url.includes('/api/public/')) {
        return route.fulfill(apiOk([]));
      }
      return route.fulfill(apiOk({}));
    });

    // Complete Onboarding Stage 1 -> enter Property Registration Wizard (Stage 2)
    await page.goto(`${BASE_URL}/become-host`, { waitUntil: 'networkidle' });
    await page.locator('#identityImage').setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: TINY_PNG });
    await page.locator('#identityBackImage').setInputFiles({ name: 'back.png', mimeType: 'image/png', buffer: TINY_PNG });
    await page.waitForFunction(() => document.querySelectorAll('.haf-status-pill.is-success').length === 2);
    await page.locator('#agreementCheck').check();
    await page.locator('#btnSubmitForm').click();
    await page.locator('.prw-root').waitFor({ state: 'visible', timeout: 10000 });

    // --- SCREEN 1: BASIC INFO ---
    assert((await page.locator('#managerName').inputValue()) === 'Nguyễn Văn Hưng', 'Prefilled managerName missing');
    assert((await page.locator('#contactPhone').inputValue()) === '0912345678', 'Prefilled contactPhone missing');

    // Validation check: empty name & description + bad phone
    await page.locator('#contactPhone').fill('12345');
    await page.locator('.prw-next-btn').click();
    assert((await page.locator('.prw-field-error').count()) >= 3, 'Step 1 inline validation errors expected');
    assert(await page.locator('.prw-step-btn.is-error').count() === 1, 'Stepper should highlight Step 1 error');

    // Fill valid Step 1 & save draft
    await page.locator('#name').fill('Nhà trọ An Khang Hòa Lạc');
    await page.locator('#description').fill('Nhà trọ xây mới thoáng mát, cách ĐH FPT 700m, có sân để xe rộng và khóa vân tay 24/7.');
    await page.locator('#contactPhone').fill('0912345678');
    await page.locator('#zaloPhone').fill('0912345678');
    await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
    await page.locator('.prw-draft-bar.is-saved').waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-1-basic-1440.png'), fullPage: true });
    console.log('PASS [1/7] Screen 1 (Basic Info, validation, draft save) verified');

    // Mobile 375px check on Screen 1
    await page.setViewportSize({ width: 375, height: 812 });
    const overflow375 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert(!overflow375, 'Horizontal overflow on Screen 1 at 375px');
    assert(await page.locator('.prw-progress-mobile').isVisible(), 'Compact mobile progress bar should be visible at 375px');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-1-mobile-375.png'), fullPage: false });
    await page.setViewportSize({ width: 1440, height: 900 });

    // Advance -> SCREEN 2: LOCATION
    await page.locator('.prw-next-btn').click();
    await page.locator('#commune').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#commune').selectOption('Tân Xã');
    await page.locator('#addressDetail').fill('Số 18, ngõ 12, Thôn 2, Tân Xã');
    await page.locator('#nearby').fill('Cách cổng ĐH FPT 700m, gần chợ Tân Xã');
    await page.locator('.prw-collapsible summary').click();
    await page.locator('#latitude').fill('21.018800');
    await page.locator('#longitude').fill('105.521500');
    assert((await page.locator('.registration-map-shell footer').innerText()).includes('Đã ghim vị trí'), 'Map pin badge did not update');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-2-location-1440.png'), fullPage: true });
    console.log('PASS [2/7] Screen 2 (Location & Leaflet Map + Coordinates) verified');

    // Advance -> SCREEN 3: AMENITIES & RULES
    await page.locator('.prw-next-btn').click();
    await page.locator('.prw-choice-grid').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.prw-choice-card', { hasText: 'Wifi 6 toàn tòa nhà' }).click();
    await page.locator('.prw-choice-card', { hasText: 'Camera an ninh 24/7' }).click();
    await page.locator('.prw-choice-card', { hasText: 'Bãi để xe máy có mái che' }).click();
    assert((await page.locator('.prw-count-pill').first().innerText()).includes('Đã chọn 3/18'), 'Amenity counter did not update');
    await page.locator('.prw-quiet-toggle').click();
    await page.locator('.prw-quiet-time-input').fill('22:30');
    await page.locator('.prw-choice-card', { hasText: 'Không hút thuốc trong nhà' }).click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-3-amenities-1440.png'), fullPage: true });
    console.log('PASS [3/7] Screen 3 (Amenities selectable cards & Rules + Quiet hours) verified');

    // Advance -> SCREEN 4: IMAGES
    await page.locator('.prw-next-btn').click();
    await page.locator('.prw-dropzone').waitFor({ state: 'visible', timeout: 5000 });
    // Reject invalid format
    await page.locator('#photos').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
    await page.locator('#photos-error').waitFor({ state: 'visible', timeout: 5000 });

    // Long filenames must not push the text or photo actions out of alignment.
    await page.locator('#photos').setInputFiles([
      { name: 'Căn hộ studio hiện đại ngập nắng với cửa sổ lớn nhìn ra khuôn viên nhà trọ (1).png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'phong-mau.png', mimeType: 'image/png', buffer: TINY_PNG }
    ]);
    await page.waitForFunction(() => document.querySelectorAll('.prw-photo-card').length === 2);
    for (const width of [375, 768, 1024, 1440, 720]) {
      await page.setViewportSize({ width, height: width === 720 ? 450 : 900 });
      const measures = await page.locator('.prw-photo-card').evaluateAll(cards => cards.map(card => {
        const cardBox = card.getBoundingClientRect();
        const name = card.querySelector('.prw-photo-info strong').getBoundingClientRect();
        const status = card.querySelector('.prw-photo-info span').getBoundingClientRect();
        const actions = [...card.querySelectorAll('.prw-photo-icon-btn')].map(button => button.getBoundingClientRect());
        const cover = card.querySelector('.prw-photo-btn')?.getBoundingClientRect();
        return {
          fits: name.right < cardBox.right && actions.every(button => button.right < cardBox.right)
            && (!cover || (cover.right < cardBox.right
              && (cover.bottom <= actions[0].top || cover.right <= actions[0].left))),
          nameTop: name.top - cardBox.top,
          statusTop: status.top - cardBox.top,
          actionTops: actions.map(button => button.top - cardBox.top),
        };
      }));
      for (const card of measures) {
        assert(card.fits, `Photo labels and controls fit the card at ${width}px`);
        assert(Math.abs(card.nameTop - measures[0].nameTop) < 1, `Photo filenames align at ${width}px`);
        assert(Math.abs(card.statusTop - measures[0].statusTop) < 1, `Photo statuses align at ${width}px`);
        assert(card.actionTops.every(top => Math.abs(top - measures[0].actionTops[0]) < 1), `Photo actions align at ${width}px`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    // Set second photo as cover
    await page.locator('.prw-photo-btn', { hasText: 'Đặt đại diện' }).press('Enter');
    assert((await page.locator('.prw-photo-card').first().innerText()).includes('phong-mau.png'), 'Cover photo swap failed');
    // Lightbox preview
    await page.locator('.prw-photo-zoom').first().click();
    await page.locator('.prw-lightbox-body img').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.prw-lightbox-modal button[aria-label="Đóng"]').click();
    // Capture Step 4 with photo guide expanded
    await page.locator('.prw-collapsible summary').click();
    await page.locator('.property-photo-guide').waitFor({ state: 'visible', timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-4-images-1440.png'), fullPage: true });
    console.log('PASS [4/7] Screen 4 (Images upload, validation, cover swap, lightbox, photo guide) verified');

    // Advance -> SCREEN 5: VERIFICATION DOCUMENTS
    await page.locator('.prw-next-btn').click();
    await page.locator('.prw-doc-list').waitFor({ state: 'visible', timeout: 5000 });
    assert((await page.locator('.prw-doc-card.is-reused-card').innerText()).includes('Đã đồng bộ'), 'Onboarding CCCD auto-reuse missing');

    await page.locator('#ownership').setInputFiles({ name: 'giay-phep-kd.png', mimeType: 'image/png', buffer: TINY_PNG });
    await page.locator('#fireSafety').setInputFiles({ name: 'chung-nhan-pccc.png', mimeType: 'image/png', buffer: TINY_PNG });
    await page.waitForFunction(() => document.querySelectorAll('.prw-doc-card.is-attached').length === 3);
    // Preview document modal — assert centered in viewport!
    await page.getByRole('button', { name: 'Xem trước' }).first().click();
    await page.locator('.prw-doc-img-preview').waitFor({ state: 'visible', timeout: 5000 });
    const modalRect = await page.locator('dialog.prw-doc-preview-modal').boundingBox();
    assert(modalRect && modalRect.x > 100 && modalRect.y > 40, `Modal not centered! rect=${JSON.stringify(modalRect)}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-5-doc-modal-1440.png'), fullPage: false });
    await page.locator('.prw-doc-preview-modal button[aria-label="Đóng"]').click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-5-verification-1440.png'), fullPage: true });
    console.log('PASS [5/7] Screen 5 (Verification Document cards, CCCD reuse, preview) verified');

    // Advance -> SCREEN 6: REVIEW & SUBMIT
    await page.locator('.prw-next-btn').click();
    await page.locator('.prw-readiness-banner.is-ready').waitFor({ state: 'visible', timeout: 5000 });
    assert((await page.locator('.prw-review-card').count()) === 5, 'Expected 5 summary accordion cards');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'screen-6-review-1440.png'), fullPage: true });

    // Edit from Review -> Step 1 -> Return to Review without losing photos/docs!
    await page.locator('.prw-edit-btn').first().click();
    await page.locator('#name').waitFor({ state: 'visible', timeout: 5000 });
    assert((await page.locator('.prw-next-btn').innerText()).includes('Lưu & Quay lại kiểm tra'), 'Return-to-review label missing');
    await page.locator('.prw-next-btn').click();
    await page.locator('.prw-readiness-banner.is-ready').waitFor({ state: 'visible', timeout: 5000 });
    assert((await page.locator('.prw-readiness-stats').innerText()).includes('2 ảnh'), 'Photos lost after edit-and-return!');
    assert((await page.locator('.prw-readiness-stats').innerText()).includes('3/3 giấy tờ'), 'Docs lost after edit-and-return!');

    // Security check: localStorage must never contain photos or CCCD data URLs
    const lsText = await page.evaluate(() => JSON.stringify(window.localStorage));
    assert(!lsText.includes('data:image'), 'SECURITY: Image data leaked to localStorage');

    // Open terms modal & accept
    await page.locator('.prw-terms-link').click();
    await page.locator('.hob-terms-modal').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'Tôi đã đọc và đồng ý' }).click();
    assert(await page.locator('#termsAccepted').isChecked(), 'Terms checkbox not checked');

    // Submit attempt 1 -> HTTP 500 error -> data preserved!
    await page.locator('.prw-next-btn').click();
    await page.locator('.prw-submit-error').waitFor({ state: 'visible', timeout: 5000 });
    assert((await page.locator('.prw-submit-error').innerText()).includes('Máy chủ tạm gián đoạn'), 'Submit error not shown');

    // Submit attempt 2 -> HTTP 200 success -> transitions cleanly to Stage 3 Staff Verification!
    await page.locator('.prw-next-btn').click();
    await page.locator('.onboarding-review').waitFor({ state: 'visible', timeout: 10000 });
    const stage3Text = await page.locator('.onboarding-review').innerText();
    assert(stage3Text.includes('HS-00088') && stage3Text.includes('Chờ thẩm định'), 'Stage 3 status did not render backend record');
    console.log('PASS [6/7] Screen 6 (Review accordions, edit-and-return, terms modal, API error preservation, real submit -> Stage 3) verified');

    // Confirm zero runtime page errors across entire 6-screen flow
    assert(pageErrors.length === 0, `Page errors occurred: ${pageErrors.join('; ')}`);
    await context.close();
    console.log('PASS [7/7] Zero page errors and security checks verified');
    console.log('\nALL 7 PROPERTY REGISTRATION 6-SCREEN WIZARD E2E CHECKS PASSED!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
