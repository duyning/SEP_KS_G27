// Browser-only API fixtures. No SMS and no real database writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.OTP_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','otp-browser-fixture'));
 let user={userId:52,fullName:'Người dùng Google',email:'google@example.test',phoneNumber:null,googleAccount:true,role:'USER',status:'ACTIVE',organization:'',preferredArea:''},writes=0,checks=0,sends=0,failSend=false,failSave=false;
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname,body=r.request().postDataJSON();const ok=data=>r.fulfill({json:{success:true,data}}),bad=(message,status=400)=>r.fulfill({status,json:{success:false,message}});
  if(p==='/api/auth/me')return ok(user);
  if(p.endsWith('/send-otp')){sends++;if(failSend)return bad('Dịch vụ SMS chưa được cấu hình.',503);return ok({phoneNumber:body.phoneNumber,expiresAt:new Date(Date.now()+300000).toISOString(),resendAt:new Date(Date.now()+60000).toISOString()});}
  if(p.endsWith('/verify-otp')){checks++;if(body.code!=='123456')return bad('Mã OTP không đúng hoặc đã hết hạn.');return ok({verified:true});}
  if(p==='/api/auth/profile'){if(failSave){failSave=false;return bad('Lưu hồ sơ thất bại. Vui lòng thử lại.',500);}writes++;user={...user,...body};return ok(user);}
  return ok({items:[],totalElements:0,unreadCount:0});
 });
 const output=path.resolve(__dirname,'../../target/phone-otp-browser');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/profile');await page.locator('#btnStartEditProfile').click();await page.locator('#editPhone').fill('0934567812');await page.locator('#btnSaveProfile').click();
  const dialog=page.getByRole('dialog',{name:'Xác minh số điện thoại'});await dialog.waitFor();
  assert.equal(await page.locator('#profilePhoneOtp').evaluate(e=>e===document.activeElement),true,'initial focus');
  assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'dialog fits');
  assert.equal(await page.getByRole('button',{name:/Gửi lại sau/}).isDisabled(),true);
  await page.screenshot({path:path.join(output,`otp-${width}.png`),fullPage:true});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(writes,0);
 }
 await page.locator('.profile-phone-otp').waitFor({state:'detached'});
 failSend=true;await page.locator('#btnSaveProfile').click();await page.getByRole('alert').filter({hasText:'Dịch vụ SMS chưa được cấu hình.'}).waitFor();assert.equal(await page.locator('.profile-phone-otp').count(),0);failSend=false;
 await page.locator('#btnSaveProfile').click();await page.locator('#profilePhoneOtp').fill('000000');await page.getByRole('button',{name:'Xác minh và lưu'}).click();await page.getByRole('alert').filter({hasText:'Mã xác minh không đúng'}).waitFor();assert.equal(writes,0);
 await page.locator('#profilePhoneOtp').fill('123456');failSave=true;await page.getByRole('button',{name:'Xác minh và lưu'}).click();await page.getByRole('alert').filter({hasText:'Lưu hồ sơ thất bại'}).waitFor();
 const before=checks;await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await page.locator('.profile-phone-otp').waitFor({state:'hidden'});assert.equal(checks,before,'retry save does not reuse OTP at provider');assert.equal(writes,1);
 await page.reload();await page.locator('#viewPhone').waitFor();assert.match(await page.locator('#viewPhone').innerText(),/0934567812/);
 await page.locator('#btnStartEditProfile').click();await page.locator('#editFullName').fill('Google đổi tên');const sent=sends;await page.locator('#btnSaveProfile').click();await page.locator('#profileViewMode').waitFor();assert.equal(sends,sent,'unchanged phone skips SMS');
 await page.locator('#btnStartEditProfile').click();await page.locator('#editPhone').fill('0934567813');await page.locator('#btnSaveProfile').click();await page.getByRole('dialog',{name:'Xác minh số điện thoại'}).waitFor();
 await page.evaluate(()=>document.documentElement.style.zoom='2');assert.equal(await page.locator('.profile-phone-otp').evaluate(e=>e.scrollWidth<=e.clientWidth+2&&e.getBoundingClientRect().width<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS OTP dialog four widths, focus/Escape, SMS unavailable, wrong code, save retry, unchanged phone, reload and zoom; zero real SMS/database writes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
