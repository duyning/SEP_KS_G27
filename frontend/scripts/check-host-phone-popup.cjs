// Intercept every API write: no real SMS or host application is sent.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HOST_PHONE_TEST_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],calls=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','host-phone-fixture'));
 let verified=false,failSend=false,failSave=false;
 const profile=()=>({userId:1,fullName:'Người đăng ký',email:'fixture@example.test',role:'USER',googleAccount:true,phoneNumber:verified?'0934567812':'',phoneVerifiedAt:verified?'2026-11-14T10:00:00Z':null});
 await page.route('https://**/*',r=>r.abort());
 await page.route('**/api/**',r=>{
  const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}}),bad=message=>r.fulfill({status:400,json:{success:false,message}});
  if(r.request().method()!=='GET'){
   calls.push(p);assert.ok(['/api/auth/profile/phone/send-otp','/api/auth/profile/phone/verify-otp','/api/auth/profile/phone/confirm'].includes(p),'No real application/profile writes');
  }
  if(p==='/api/auth/me')return ok(profile());
  if(p==='/api/host-applications/current')return ok(null);
  if(p==='/api/auth/profile/phone/send-otp')return failSend?bad('Không gửi được mã thử nghiệm.'):ok({phoneNumber:'0934567812',expiresAt:new Date(Date.now()+300000).toISOString(),resendAt:new Date(Date.now()+60000).toISOString()});
  if(p==='/api/auth/profile/phone/verify-otp')return JSON.parse(r.request().postData()).code==='123456'?ok({verified:true}):bad('Mã OTP không đúng');
  if(p==='/api/auth/profile/phone/confirm'){if(failSave)return bad('Chưa lưu được số điện thoại.');verified=true;return ok(profile());}
  if(p.startsWith('/api/favorites'))return ok({items:[],total:0});
  return ok({items:[],total:0,unreadCount:0});
 });
 const output=path.resolve(__dirname,'../../target/host-phone-popup');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440]){
  verified=false;await page.setViewportSize({width,height:1000});await page.goto(base+'/become-host');
  await page.locator('#introduction').fill('Ghi chú đang điền cần được giữ nguyên.');
  await page.locator('#agreementCheck').check();
  await page.getByRole('button',{name:'Xác minh số điện thoại',exact:true}).click();
  assert.equal(await page.getByRole('dialog').count(),1);
  await page.evaluate(()=>window.__originalOtpDialog=document.querySelector('dialog'));
  await page.locator('#host-verification-phone').fill('123');await page.getByRole('button',{name:'Gửi mã OTP',exact:true}).click();
  await page.getByText('Vui lòng nhập số điện thoại Việt Nam hợp lệ.',{exact:true}).waitFor();
  await page.locator('#host-verification-phone').fill('0934567812');
  if(width===375){failSend=true;await page.getByRole('button',{name:'Gửi mã OTP',exact:true}).click();await page.getByText('Không gửi được mã thử nghiệm.',{exact:true}).waitFor();failSend=false;}
  await page.getByRole('button',{name:'Gửi mã OTP',exact:true}).click();await page.locator('#profilePhoneOtp').waitFor();
  assert.equal(await page.evaluate(()=>window.__originalOtpDialog===document.querySelector('dialog')),true);
  assert.equal(await page.getByRole('dialog').count(),1);
  await page.locator('#profilePhoneOtp').fill('000000');await page.getByRole('button',{name:'Xác minh và lưu',exact:true}).click();
  await page.getByText('Mã xác minh không đúng. Vui lòng kiểm tra và nhập lại.',{exact:true}).waitFor();
  await page.locator('#profilePhoneOtp').fill('123456');
  await page.screenshot({path:path.join(output,`otp-${width}.png`),fullPage:true});
  assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
  if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+2));await page.evaluate(()=>document.documentElement.style.zoom='');}
  if(width===375){failSave=true;await page.getByRole('button',{name:'Xác minh và lưu',exact:true}).click();await page.getByText(/Đã xác minh số điện thoại nhưng chưa lưu được hồ sơ/).waitFor();failSave=false;await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();}
  else await page.getByRole('button',{name:'Xác minh và lưu',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal(new URL(page.url()).pathname,'/become-host');
  assert.ok((await page.locator('#accPhone').innerText()).includes('Đã xác minh'));
  assert.equal(await page.locator('#introduction').inputValue(),'Ghi chú đang điền cần được giữ nguyên.');
  assert.equal(await page.locator('#agreementCheck').isChecked(),true);
 }
 assert.deepEqual(errors,[]);console.log('PASS: one persistent popup for phone and OTP, errors/retry, verified badge, draft preserved, four widths and 200% zoom. All SMS/confirmation calls intercepted.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
