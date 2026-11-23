const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PROPERTY_IDENTITY_TEST_URL||'http://127.0.0.1:5198';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];let source=99;
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  sessionStorage.setItem('hlrcs_access_token','identity-fixture');
  localStorage.setItem('hlrcs:property-draft:1',JSON.stringify({version:1,resumeStep:3,fields:{name:'Nhà trọ thử nghiệm',propertyType:'Chung cư mini',description:'Thông tin nhà trọ thử nghiệm đầy đủ để gửi xét duyệt.',managerName:'Chủ trọ',contactPhone:'0912345678',zaloPhone:'',commune:'Hạ Bằng',addressDetail:'Mục Uyên, Xã Hạ Bằng, Hà Nội',latitude:'21.0196169',longitude:'105.5517238',nearby:'',amenities:[],selectedRules:[],rules:''}}));
 });
 await page.route('https://**/*',r=>r.abort());
 await page.route('**/api/**',r=>{
  assert.equal(r.request().method(),'GET','Browser checks must not submit real registrations');
  const path=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});
  if(path==='/api/auth/me')return ok({userId:1,fullName:'Chủ trọ',phoneNumber:'0912345678',role:'ROOM_HOST'});
  if(path.endsWith('/eligibility'))return ok({canRegister:true,reason:'ELIGIBLE',identityApplicationId:source});
  if(path.endsWith('/current'))return ok(null);
  if(path.endsWith('/99/identity-image'))return r.fulfill({contentType:'image/png',body:png});
  return ok({items:[],places:[],unreadCount:0});
 });
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/host/property/new');
  await page.locator('#photos').setInputFiles({name:'room.png',mimeType:'image/png',buffer:png});
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByText('Đã lấy CCCD từ đơn đăng ký chủ trọ. Không cần tải lên lại.',{exact:true}).waitFor();
  assert.equal(await page.locator('#idCard').getAttribute('aria-required'),'false');
  await page.getByText('Xem CCCD đã nộp',{exact:true}).focus();await page.keyboard.press('Enter');
  await page.locator('.registration-saved-identity img').waitFor();
  assert.equal(await page.locator('.registration-saved-identity img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await page.locator('#idCard').setInputFiles({name:'replacement.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
  assert.equal(await page.locator('.registration-saved-identity').count(),0);
  await page.getByRole('button',{name:'Xóa Căn cước công dân (CCCD / CMND) chủ trọ',exact:true}).click();
  await page.getByText('Đã lấy CCCD từ đơn đăng ký chủ trọ. Không cần tải lên lại.',{exact:true}).waitFor();
  await page.locator('#ownership').setInputFiles({name:'license.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
  await page.locator('#fireSafety').setInputFiles({name:'fire.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.evaluate(()=>document.documentElement.style.zoom='');}
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.locator('.registration-review-documents').waitFor();
  assert.ok((await page.locator('.registration-review-documents').innerText()).includes('CCCD đã nộp khi đăng ký chủ trọ'));
  assert.ok((await page.locator('.registration-review-count').innerText()).includes('3/3'));
 }
 source=null;await page.goto(base+'/host/property/new');await page.locator('#photos').setInputFiles({name:'room.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 assert.equal(await page.locator('#idCard').getAttribute('aria-required'),'true');
 assert.equal(await page.locator('.registration-saved-identity').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: saved CCCD restored with draft, authenticated preview, replacement/revert, 3/3 review, legacy upload, four widths, keyboard and 200% zoom. No registration writes.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
