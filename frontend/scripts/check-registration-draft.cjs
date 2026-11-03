// Uses mocked HTTP responses and in-memory uploads; never writes to the database.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','registration-draft-test'));
  const base=process.env.HLRCS_TEST_BASE||'http://127.0.0.1:5173';
  let submissions=0;
  await page.route('**/maps.googleapis.com/**',r=>r.abort());
  await page.route(base+'/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/host/property-registrations'&&route.request().method()==='POST'){
    submissions++;
    if(submissions===1)return route.fulfill({status:503,json:{success:false,message:'Tạm thời chưa nhận hồ sơ'}});
    return route.fulfill({json:{success:true,data:{registrationId:123,status:'PENDING',name:'Nhà trọ kiểm thử bản nháp'}}});
   }
   const data=path==='/api/auth/me'?{userId:20,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử',email:'draft@test.local',phoneNumber:'0912345678'}:path.endsWith('/eligibility')?{canRegister:true,reason:'ELIGIBLE'}:[];
   return route.fulfill({json:{success:true,data}});
  });
  const next=()=>page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.goto(base+'/host/property/new');
  await page.locator('#name').fill('Nhà trọ kiểm thử bản nháp');
  await page.locator('#description').fill('Nhà trọ sạch sẽ, không gian yên tĩnh và có lối thoát nạn riêng.');
  await next();await page.locator('#addressDetail').waitFor();
  let draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('hlrcs:property-draft:20')));
  assert.equal(draft.resumeStep,1);assert.equal(draft.fields.name,'Nhà trọ kiểm thử bản nháp');
  await page.reload();await page.locator('#addressDetail').waitFor();
  await page.locator('#addressDetail').fill('Số 18, ngõ 4, thôn 2');await page.locator('#commune').selectOption('Tân Xã');await next();
  await page.getByRole('checkbox',{name:'Lối thoát nạn riêng',exact:true}).check();
  await page.getByRole('checkbox',{name:'Không để đồ chắn hành lang, lối thoát nạn',exact:true}).check();
  assert.equal(await page.getByText('Phân biệt rõ:',{exact:true}).count(),0);
  await next();await page.locator('#photos').waitFor();
  draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('hlrcs:property-draft:20')));
  assert.deepEqual(draft.fields.amenities,['emergencyExit']);assert.deepEqual(draft.fields.selectedRules,['noBlockedExits']);
  await page.reload();await page.locator('#photos').waitFor();
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64');
  await page.locator('#photos').setInputFiles({name:'nha-tro.png',mimeType:'image/png',buffer:image});await next();
  assert.equal(await page.locator('.registration-document-section .required').count(),3);
  assert.equal(await page.getByText(/Tệp đang được giữ trong phiên nhập/).count(),0);
  for(const id of ['ownership','idCard'])await page.locator('#'+id).setInputFiles({name:id+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 test')});
  await next();await page.locator('#fireSafety[aria-invalid="true"]').waitFor();
  await page.locator('#fireSafety').setInputFiles({name:'pccc.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 test')});
  await page.waitForTimeout(200);await next();await page.locator('.registration-review-summary').waitFor();
  assert.ok((await page.locator('.registration-review-summary').innerText()).includes('3/3 giấy tờ'));
  assert.equal(await page.locator('.registration-review-section').count(),5);
  assert.ok(await page.getByText('Lối thoát nạn riêng',{exact:true}).count());
  for(const width of [1440,1024,768,375]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);
   if(width===375)assert.ok(await page.locator('.registration-review-summary>div').evaluate(el=>el.clientWidth>=160),'Review summary must remain readable on mobile');
   if(process.env.SCREENSHOT_DIR&&[1440,375].includes(width))await page.screenshot({path:require('node:path').join(process.env.SCREENSHOT_DIR,`registration-review-${width}.png`),fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Chỉnh sửa Thông tin cơ bản',exact:true}).focus();await page.keyboard.press('Enter');
  await page.locator('#name').waitFor();assert.equal(await page.locator('#name').inputValue(),'Nhà trọ kiểm thử bản nháp');
  await page.getByRole('button',{name:'Lưu & Kiểm tra lại',exact:true}).click();await page.locator('.registration-review-summary').waitFor();
  draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('hlrcs:property-draft:20')));
  assert.equal(draft.resumeStep,5);assert.equal('documents' in draft.fields,false);assert.equal('photos' in draft.fields,false);
  await page.reload();await page.locator('#photos').waitFor();
  await page.locator('#photos').setInputFiles({name:'nha-tro.png',mimeType:'image/png',buffer:image});await next();
  for(const id of ['ownership','idCard','fireSafety'])await page.locator('#'+id).setInputFiles({name:id+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 test')});
  await next();await page.locator('#termsAccepted').check();await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();
  await page.locator('.registration-submit-error').waitFor();
  assert.ok(await page.evaluate(()=>localStorage.getItem('hlrcs:property-draft:20')),'Failed submission must preserve the draft');
  await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();await page.locator('.registration-pending').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('hlrcs:property-draft:20')),null,'Successful submission clears the draft');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,automaticSaveAndReload:true,pcccRequired:true,reviewWidths:4,keyboard:true,filesNotPersisted:true,errors:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
