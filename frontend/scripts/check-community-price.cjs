const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';

// Exercises the form only. It does not submit a post or modify database records.
async function checkBrowser(channel) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/login`);
    await page.locator('#loginIdentifier').fill('user@hlrcs.com');
    await page.locator('#loginPassword').fill('123456');
    await page.locator('#submitBtn').click();
    await page.waitForURL(url => url.pathname !== '/login');
    await page.goto(`${base}/community`);
    await page.getByRole('button', { name: 'Đăng bài viết mới', exact: true }).click();
    const price = page.locator('#postPrice');
    await price.fill('');
    await price.pressSequentially('120000');
    assert.equal(await price.inputValue(), '120.000');
    for (const expected of ['12.000', '1.200', '120', '12', '1', '']) {
      await price.press('Backspace');
      assert.equal(await price.inputValue(), expected);
    }
    await price.fill('123456');
    assert.equal(await price.inputValue(), '123.456');
    await price.press('Home');
    await price.press('ArrowRight');
    await price.press('ArrowRight');
    await price.pressSequentially('9');
    assert.equal(await price.inputValue(), '1.293.456');
    await price.press('Delete');
    assert.equal(await price.inputValue(), '129.456');
    await price.press('Control+a');
    await price.press('Backspace');
    assert.equal(await price.inputValue(), '');
    const cdp = await context.newCDPSession(page);
    for (let length = 1; length <= 6; length++) {
      const text = '120000'.slice(0, length);
      await cdp.send('Input.imeSetComposition', { text, selectionStart: length, selectionEnd: length });
      assert.equal(await price.inputValue(), text, 'Formatter modified the active IME buffer');
    }
    await page.getByText('Số tiền: 120.000 đ', { exact: true }).waitFor();
    await page.screenshot({ path: path.resolve(__dirname, `../../logs/community-price-ime-${channel}.png`), fullPage: true });
    await cdp.send('Input.insertText', { text: '120000' });
    assert.equal(await price.inputValue(), '120000', 'Final IME commit duplicated digits');
    for (const expected of ['12000', '1200', '120', '12', '1', '']) {
      await price.press('Backspace');
      assert.equal(await price.inputValue(), expected, 'Backspace became stuck in IME mode');
    }
    for (let length = 1; length <= 6; length++) {
      await cdp.send('Input.imeSetComposition', { text: '120000'.slice(0, length), selectionStart: length, selectionEnd: length });
    }
    await cdp.send('Input.insertText', { text: '120000' });
    await page.locator('#postLocation').click();
    await page.waitForFunction(() => document.querySelector('#postPrice').value === '120.000');
    assert.equal(await page.locator('output[for="postPrice"]').count(), 0);
    await price.click();
    assert.equal(await price.inputValue(), '120000', 'Refocusing must prepare a plain buffer before a new IME session');
    await price.press('Control+a');
    await cdp.send('Input.imeSetComposition', { text: '230000', selectionStart: 6, selectionEnd: 6 });
    await cdp.send('Input.insertText', { text: '230000' });
    await page.locator('#postLocation').click();
    await page.waitForFunction(() => document.querySelector('#postPrice').value === '230.000');
    // Click away with composition still active, without a separate explicit commit.
    await price.click();
    await price.press('Control+a');
    await cdp.send('Input.imeSetComposition', { text: '5400000', selectionStart: 7, selectionEnd: 7 });
    assert.equal(await price.inputValue(), '5400000');
    await page.locator('#postLocation').click();
    await page.waitForFunction(() => document.querySelector('#postPrice').value === '5.400.000');
    await price.click();
    await price.press('Control+a');
    await cdp.send('Input.imeSetComposition', { text: '0', selectionStart: 1, selectionEnd: 1 });
    await cdp.send('Input.insertText', { text: '0' });
    await price.press('Backspace');
    assert.equal(await price.inputValue(), '', 'IME must allow clearing zero');
    await page.locator('#postLocation').click();
    assert.equal(await price.inputValue(), '');
    let confirmationCount = 0;
    page.on('dialog', async dialog => { confirmationCount++; await dialog.dismiss(); });
    const close = () => page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
    const cancel = () => page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();
    const open = () => page.getByRole('button', { name: 'Đăng bài viết mới', exact: true }).click();
    await page.locator('#postTitle').fill('a');
    await close();
    assert.equal(confirmationCount, 1);
    assert.equal(await page.locator('#postTitle').inputValue(), 'a');
    await page.locator('#postTitle').fill('');
    await cancel();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(confirmationCount, 1, 'Clearing all entered text must not ask for confirmation');
    await open();
    await page.locator('#postPrice').fill('120000');
    await page.locator('#postPrice').fill('');
    await close();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(confirmationCount, 1, 'Clearing the price must allow immediate closing');
    await open();
    await page.locator('#postTitle').fill('a');
    await page.locator('#postContent').fill('b');
    await page.locator('#postTitle').fill('');
    await cancel();
    assert.equal(confirmationCount, 2, 'Remaining text in another field must still be protected');
    await page.locator('#postContent').fill('');
    await close();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(confirmationCount, 2);
    assert.deepEqual(errors, []);
    console.log(`PASS ${channel} ${browser.version()} on ${base}: price editing/IME, clearing all draft text or price closes without warning, remaining text still requires confirmation. No post submitted.`);
  } finally { await browser.close(); }
}
async function main() {
  const channels = process.env.BROWSER_CHANNEL ? [process.env.BROWSER_CHANNEL] : ['msedge', 'chrome'];
  await Promise.all(channels.map(checkBrowser));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
