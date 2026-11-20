const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HOST_IDENTITY_TEST_URL||'http://127.0.0.1:5198';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];let submitted=null,payload=null;
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','two-sides-fixture'));
 await page.route('https://**/*',r=>r.abort());
 await page.route('**/api/**',r=>{
  const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:1,fullName:'Người đăng ký',phoneNumber:'0934567812',phoneVerifiedAt:'2026-11-14T10:00:00Z',email:'fixture@example.test',role:'USER'});
  if(p==='/api/host-applications/current')return ok(submitted);
  if(p.endsWith('/identity-image'))return r.fulfill({contentType:'image/png',body:png});
  if(p==='/api/host-applications'&&r.request().method()==='POST'){
   payload=JSON.parse(r.request().postData());submitted={id:21,userId:1,status:'PENDING_REVIEW',hasIdentityImage:true,hasIdentityBackImage:true,version:1,introduction:payload.introduction,requestedFields:[],submittedAt:'2026-11-14T10:00:00'};return ok(submitted);
  }
  assert.equal(r.request().method(),'GET','No other writes allowed');return ok({items:[],total:0,unreadCount:0});
 });
 const output=path.resolve(__dirname,'../../target/host-identity-two-sides');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440]){
  submitted=null;await page.setViewportSize({width,height:1100});await page.goto(base+'/become-host');
  const send=page.locator('#btnSubmitForm');await send.waitFor();
  // SPA drafts are deliberate: reset chosen images/checkbox between viewport checks.
  for(const name of ['Xóa ảnh mặt trước','Xóa ảnh mặt sau']){const remove=page.getByRole('button',{name,exact:true});if(await remove.count())await remove.click();}
  await page.locator('#agreementCheck').uncheck();assert.equal(await send.isEnabled(),false);
  await page.locator('#agreementCheck').check();assert.equal(await send.isEnabled(),false);
  await page.locator('#identityImage').setInputFiles({name:'front.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Xóa ảnh mặt trước',exact:true}).waitFor();
  assert.equal(await send.isEnabled(),false);
  await page.locator('#identityBackImage').setInputFiles({name:'back.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>!document.querySelector('#btnSubmitForm').disabled);
  assert.equal(await page.locator('.haf-image-preview img').count(),2);
  assert.equal(await page.locator('#identityImage').evaluate(el=>el.multiple),false);assert.equal(await page.locator('#identityBackImage').evaluate(el=>el.multiple),false);
  await page.getByRole('button',{name:'Xóa ảnh mặt sau',exact:true}).click();assert.equal(await send.isEnabled(),false);
  await page.locator('#identityBackImage').setInputFiles({name:'wrong.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});await page.getByText('Chọn ảnh JPG hoặc PNG, tối đa 5 MB.',{exact:true}).waitFor();assert.equal(await send.isEnabled(),false);
  await page.locator('#identityBackImage').setInputFiles({name:'back.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.querySelector('#btnSubmitForm').disabled);
  await page.locator('#agreementCheck').uncheck();assert.equal(await send.isEnabled(),false);await page.locator('#agreementCheck').check();
  for(const selector of ['.bm-progress-count','#becomeHostProgressToggle','#becomeHostProgressHelp','.haf-privacy','.haf-footer p'])assert.equal(await page.locator(selector).count(),0,selector);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:path.join(output,`form-${width}.png`),fullPage:true});
  if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.haf-form').evaluate(el=>el.scrollWidth<=el.clientWidth+2));await page.evaluate(()=>document.documentElement.style.zoom='');}
 }
 await page.locator('#btnSubmitForm').click();await page.getByRole('button',{name:'Đồng ý gửi hồ sơ',exact:true}).click();
 await page.getByText('Hồ sơ đã được gửi đi và đang chờ xét duyệt.',{exact:false}).count();
 await page.locator('#statePending').waitFor({state:'visible'});
 assert.ok(payload.identityImage.startsWith('data:image/png;base64,'));assert.ok(payload.identityBackImage.startsWith('data:image/png;base64,'));assert.equal(payload.agreementAccepted,true);
 await page.getByText('Thông tin hồ sơ đã gửi',{exact:true}).click();
 await page.locator('.bh-accordion-card').getByAltText('Ảnh mặt sau CCCD trong hồ sơ').waitFor();assert.equal(await page.locator('.bh-accordion-card .host-identity-pair img').count(),2);
 assert.deepEqual(errors,[]);console.log('PASS two required CCCD sides, maximum two slots, replacement/removal and invalid files, agreement gating, removed copy, submitted/private previews, four widths and zoom. Fixtures only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
