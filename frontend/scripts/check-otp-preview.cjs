// Dev-only preview: forbid every OTP/profile mutation, including confirm and resend.
const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.OTP_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'});let writes=0;
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','preview-fixture'));
 await page.route('**/api/**',r=>{const req=r.request();if(req.method()!=='GET')writes++;return r.fulfill({json:{success:true,data:new URL(req.url()).pathname==='/api/auth/me'?{userId:21,fullName:'Xem trước OTP',email:'preview@example.test',role:'USER',status:'ACTIVE',googleAccount:true}:{items:[],totalElements:0}}});});
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/profile?otpPreview=1');
  await page.getByRole('dialog',{name:'Xác minh số điện thoại'}).waitFor();await page.getByText('Chế độ xem trước · Không gửi SMS, không lưu tài khoản.').waitFor();
  await page.getByRole('button',{name:'Gửi lại mã',exact:true}).click();await page.locator('#profilePhoneOtp').fill('123456');await page.getByRole('button',{name:'Xác minh và lưu'}).click();
  await page.getByRole('status').filter({hasText:'không kiểm tra OTP'}).waitFor();assert.equal(writes,0);
  assert.equal(await page.locator('.profile-phone-otp').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(!new URL(page.url()).searchParams.has('otpPreview'));
 }
 console.log('PASS OTP preview four widths, resend, confirmation and Escape; zero OTP/profile writes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
