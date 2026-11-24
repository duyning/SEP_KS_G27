// API fixtures only. Exercise the real profile/modal; no SMS or real account mutations.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.OTP_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','otp-input-fixture'));
 let sends=0,checks=0,writes=0,ttl=90000,cooldown=800,failResend=false,slowVerify=false,failNetwork=false;
 const user={userId:21,fullName:'Hồ sơ bản nháp',email:'otp@example.test',role:'USER',status:'ACTIVE',googleAccount:true,phoneNumber:''};
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname,body=r.request().postDataJSON(),ok=data=>r.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok(user);
  if(p.endsWith('/send-otp')){sends++;if(failResend){failResend=false;return r.fulfill({status:503,json:{success:false,message:'Mạng SMS tạm lỗi. Vui lòng thử lại.'}});}return ok({phoneNumber:body.phoneNumber,expiresAt:new Date(Date.now()+ttl).toISOString(),resendAt:new Date(Date.now()+cooldown).toISOString()});}
  if(p.endsWith('/verify-otp')){checks++;if(failNetwork){failNetwork=false;return r.abort('failed');}if(slowVerify)await new Promise(resolve=>setTimeout(resolve,400));return body.code==='012345'?ok({verified:true}):r.fulfill({status:400,json:{success:false,message:'Mã OTP không đúng hoặc đã hết hạn.'}});}
  if(p==='/api/auth/profile'){writes++;return ok({...user,...body});}
  return ok({items:[],totalElements:0});
 });
 const open=async()=>{await page.goto(base+'/profile');await page.locator('#btnStartEditProfile').click();await page.locator('#editPhone').fill('0934567812');await page.locator('#btnSaveProfile').click();await page.getByRole('dialog',{name:'Xác minh số điện thoại'}).waitFor();};
 const input=page.locator('#profilePhoneOtp'),submit=page.getByRole('button',{name:'Xác minh và lưu',exact:true});
 const paste=async text=>input.evaluate((el,text)=>{const data=new DataTransfer();data.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);
 const output=path.resolve(__dirname,'../../target/otp-redesign');fs.mkdirSync(output,{recursive:true});
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});await open();const dialog=page.getByRole('dialog');
  assert.equal(await dialog.locator('input').count(),1);assert.equal(await dialog.locator('.ppo-cell').count(),6);assert.equal(await submit.isDisabled(),true);
  await input.fill('0');await input.pressSequentially('12345');assert.equal(await input.inputValue(),'012345');assert.equal(checks,0,'no auto-submit');
  await input.press('ArrowLeft');await input.press('Backspace');assert.equal(await input.inputValue(),'01235');await input.press('4');assert.equal(await input.inputValue(),'012345');
  await input.press('ControlOrMeta+A');await input.press('Backspace');assert.equal(await input.inputValue(),'');await paste('01-23 45');assert.equal(await input.inputValue(),'012345');
  await input.press('ControlOrMeta+A');await input.press('Backspace');assert.equal(await submit.isDisabled(),true);
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().height<500),'compact modal');
  await input.focus();for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'focus remains trapped');}
  await dialog.screenshot({path:path.join(output,`modal-${width}.png`)});
  await page.getByRole('button',{name:'Hủy',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('#editPhone').inputValue(),'0934567812');assert.equal(writes,0);
  assert.equal(await page.locator('#btnSaveProfile').evaluate(el=>el===document.activeElement),true,'focus restored');
 }
 // Cooldown from server; failed resend retains the code; success clears it.
 await open();await input.fill('000000');await page.getByRole('button',{name:'Gửi lại mã',exact:true}).waitFor();
 failResend=true;await page.getByRole('button',{name:'Gửi lại mã',exact:true}).click();await page.getByRole('alert').filter({hasText:'Mạng SMS'}).waitFor();assert.equal(await input.inputValue(),'000000');
 await page.getByRole('button',{name:'Gửi lại mã',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã gửi mã mới.'}).waitFor();assert.equal(await input.inputValue(),'');
 await input.fill('012345');failNetwork=true;await submit.click();await page.getByRole('alert').filter({hasText:'Không thể kết nối máy chủ'}).waitFor();assert.equal(await input.getAttribute('aria-invalid'),'false');assert.equal(await input.inputValue(),'012345');
 await input.fill('000000');await submit.click();await page.getByRole('alert').filter({hasText:'Mã xác minh không đúng.'}).waitFor();assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(writes,0);
 // Short viewport approximates keyboard occlusion; footer remains reachable by scrolling.
 await page.setViewportSize({width:390,height:320});await submit.scrollIntoViewIfNeeded();assert.ok(await submit.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
 await page.setViewportSize({width:1440,height:900});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 ttl=500;cooldown=0;await open();await input.fill('012345');await page.getByText('Mã đã hết hạn. Vui lòng yêu cầu mã mới.',{exact:true}).waitFor();assert.equal(await submit.isDisabled(),true);
 ttl=90000;await page.getByRole('button',{name:'Gửi lại mã',exact:true}).click();await input.fill('012345');slowVerify=true;const before=checks;await submit.dblclick();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(checks,before+1);assert.equal(writes,1);
 assert.deepEqual(errors,[]);console.log('PASS single input/six cells, leading zero, paste, arrows/backspace/select-all, no auto-submit, focus trap/restore, draft retained, expiry, resend failure/retry, duplicate guard and short viewport.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
