const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));const output=path.resolve(__dirname,'../../target/auth-mobile');fs.mkdirSync(output,{recursive:true});await page.route('https://images.unsplash.com/**',r=>r.fulfill({status:204,body:''}));
 const mockAPI = route => {
   const request = route.request();
   const body = request.postDataJSON();
   const action = new URL(request.url()).pathname;
   if (request.method() === 'POST') writes.push({ action, body });
   if (action.endsWith('/otp/send')) return route.fulfill({
     json: { success: true, data: { expiresInSeconds: 300, resendAfterSeconds: 60 } },
   });
   if (action.endsWith('/otp/verify')) {
     if (body.code !== '012345') return route.fulfill({
       status: 400, json: { success: false, message: 'Mã OTP không đúng.', data: { code: 'Mã OTP không đúng.' } },
     });
     return route.fulfill({ json: { success: true, data: { verificationToken: 'test-proof', expiresInSeconds: 600 } } });
   }
   return route.fulfill({ status: 503, json: { success: false, message: 'Máy chủ kiểm thử tạm ngừng. Vui lòng thử lại.' } });
 };
 await page.route('http://127.0.0.1:5173/api/**', mockAPI);
 for(const [width,height] of [[320,568],[375,812],[390,844],[430,932],[600,900],[844,390]])for(const screen of ['login','register']){await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5173/'+screen);const active=page.locator(screen==='login'?'.flip-login-face':'.flip-register-face');await active.locator('form').waitFor();await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen} overflow ${width}`);assert.equal(await page.locator('.flip-face:not([inert])').count(),1);assert.equal(await active.locator('.showcase-side').isVisible(),false);assert.ok(await active.locator('.form-input').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));await active.locator('.primary-button').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`${screen}-${width}.png`),fullPage:true,animations:'disabled'});}
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5173/login');await page.locator('#submitBtn').click();await page.locator('#loginIdentifier-error').waitFor();assert.equal(writes.length,0);await page.locator('#loginIdentifier').fill('user@example.test');await page.locator('#loginPassword').fill('Mobile123!');await page.locator('.flip-login-face .password-toggle-btn').click();assert.equal(await page.locator('#loginPassword').getAttribute('type'),'text');await page.locator('#remember').check();await page.locator('#submitBtn').click();await page.locator('.flip-login-face .form-alert').waitFor();assert.equal(await page.locator('#loginIdentifier').inputValue(),'user@example.test');assert.equal(await page.locator('#loginPassword').inputValue(),'Mobile123!');
 assert.equal(await page.getByRole('button', { name: 'Hợp tác chủ trọ' }).count(), 0);
 await page.locator('#btnGoToRegisterUser').click();
 await page.waitForURL('**/register');
 const signup = page.locator('#registerForm');
 const send = signup.getByRole('button', { name: 'Xác minh', exact: true });
 const identifier = signup.locator('#regIdentifier');
 const code = signup.locator('#registerOtpCode');
 const submit = signup.locator('#submitRegisterBtn');
 await submit.click();
 await signup.locator('#regFullName-error').waitFor();
 await signup.locator('#regFullName').fill('Nguyễn An');
 await identifier.fill('new@example.test');
 await signup.locator('#regPassword').fill('lowercase123');
 await signup.locator('#regConfirmPassword').fill('lowercase123');
 await signup.locator('#regAgree').check();
 await submit.click();
 await signup.locator('#regIdentifier-error').waitFor();
 await signup.locator('#regPassword-error').waitFor();
 assert.equal(writes.length, 1);
 await send.click();
 await signup.getByText(/Đã gửi mã qua email/).waitFor();
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
 await page.screenshot({ path: path.join(output, 'register-otp-390.png'), fullPage: true, animations: 'disabled' });
 assert.equal(await signup.getByRole('button', { name: 'Gửi lại mã' }).isDisabled(), true);
 await code.fill('222222');
 await code.press('Enter');
 await signup.getByText('Mã OTP không đúng.').waitFor();
 await code.fill('012345');
 await signup.getByRole('button', { name: 'Xác nhận mã' }).click();
 await signup.getByText('Đã xác minh', { exact: true }).waitFor();
 assert.equal(await signup.locator('#regPassword').evaluate(input => input === document.activeElement), true);
 await identifier.fill('+84912345678');
 assert.equal(await signup.getByText('Đã xác minh', { exact: true }).count(), 0);
 await send.click();
 await signup.getByText(/Đã gửi mã qua Zalo/).waitFor();
 await code.fill('012345');
 await code.press('Enter');
 await signup.getByText('Đã xác minh', { exact: true }).waitFor();
 await signup.locator('#regPassword').fill('Mobile123!');
 await signup.locator('#regConfirmPassword').fill('Other123!');
 await submit.click();
 await signup.locator('#regConfirmPassword-error').waitFor();
 assert.equal(writes.length, 6);
 await signup.locator('#regConfirmPassword').fill('Mobile123!');
 await submit.click();
 await page.locator('.flip-register-face .form-alert').waitFor();
 assert.deepEqual(writes.at(-1), { action: '/api/auth/register',
   body: { fullName: 'Nguyễn An', phoneNumber: '+84912345678', password: 'Mobile123!', verificationToken: 'test-proof' },
 });
 assert.equal(await signup.locator('#regFullName').inputValue(), 'Nguyễn An');
 assert.equal(await signup.locator('#regAgree').isChecked(), true);
 await page.locator('#toLoginBtn').click();
 await page.waitForURL('**/login');
 assert.equal(await page.locator('#loginIdentifier').inputValue(), 'user@example.test');
 await page.locator('.demo-accounts summary').click();
 await page.getByRole('button', { name: /Chủ trọ chưa đăng ký nhà trọ/ }).click();
 assert.equal(await page.locator('#loginIdentifier').inputValue(), 'host-new@hlrcs.com');
 await page.locator('#loginIdentifier').focus();
 for (let i = 0; i < 14; i++) {
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.flip-register-face'))), false);
 }
 const desktop = await browser.newPage({ reducedMotion: 'reduce' });
 desktop.on('pageerror', error => errors.push(error.message));
 await desktop.route('https://images.unsplash.com/**', r => r.fulfill({ status: 204, body: '' }));
 await desktop.route('http://127.0.0.1:5173/api/**', mockAPI);
 for (const width of [768, 1024, 1440]) {
   await desktop.setViewportSize({ width, height: 900 });
   await desktop.goto('http://127.0.0.1:5173/register');
   await desktop.locator('#regIdentifier').fill('new@example.test');
   await desktop.getByRole('button', { name: 'Xác minh', exact: true }).click();
   await desktop.locator('#registerOtpCode').waitFor();
   await desktop.locator('#submitRegisterBtn').scrollIntoViewIfNeeded();
   assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `OTP overflow ${width}`);
   await desktop.screenshot({ path: path.join(output, `register-otp-${width}.png`), fullPage: true, animations: 'disabled' });
 }
 assert.deepEqual(errors, []);
 console.log(JSON.stringify({ passed: true, responsiveScreens: 15, otp: true, keyboard: true, validation: true, pageErrors: 0 }));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
