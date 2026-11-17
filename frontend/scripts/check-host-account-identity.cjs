// Browser fixtures only; sample images, zero real application or SMS writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HOST_IDENTITY_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','host-identity-fixture'));
 let user={userId:21,fullName:'Người dùng kiểm thử',email:'identity@example.test',phoneNumber:'0934567812',role:'USER',status:'ACTIVE'},application=null,writes=0,fail=false,photoReads=0;
 const detail=()=>({application:application||{id:32,userId:21,userName:'Chủ hồ sơ mẫu',userPhone:'0934567812',userEmail:'sample@example.test',status:'PENDING_REVIEW',version:0,hasIdentityImage:true,introduction:'',requestedFields:[],submittedAt:'2026-11-13T10:00:00'},history:[]});
 await page.route('**/api/**',async r=>{const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok(user);
  if(p==='/api/host-applications/current')return ok(application);
  if(p==='/api/host-applications'&&r.request().method()==='POST'){
   const body=r.request().postDataJSON();for(const field of ['targetCommune','expectedScale','applicantCapacity','rentalExperience'])assert.equal(body[field],undefined);
   assert.ok(body.identityImage.startsWith('data:image/png;base64,'));assert.equal(body.agreementAccepted,true);
   if(fail){fail=false;return r.fulfill({status:500,json:{success:false,message:'Không thể lưu ảnh định danh. Vui lòng thử lại.'}});}
   writes++;await new Promise(resolve=>setTimeout(resolve,350));application={id:32,userId:21,userName:user.fullName,userEmail:user.email,userPhone:user.phoneNumber,status:'PENDING_REVIEW',version:0,hasIdentityImage:true,introduction:body.introduction,requestedFields:[],submittedAt:new Date().toISOString()};return ok(application);
  }
  if(p==='/api/host-applications/32')return ok(detail());
  if(p.endsWith('/identity-image')){photoReads++;assert.ok(r.request().headers().authorization);return r.fulfill({contentType:'image/png',body:sampleBuffer});}
  return ok({items:[],content:[],totalElements:0,totalPages:0});
 });
 await page.goto(base+'/become-host');await page.locator('#becomeHostForm').waitFor();
 const sample=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=480;canvas.height=300;const ctx=canvas.getContext('2d');ctx.fillStyle='#e4f4ee';ctx.fillRect(0,0,480,300);ctx.fillStyle='#0f766e';ctx.font='bold 24px sans-serif';ctx.fillText('ẢNH KIỂM THỬ — KHÔNG PHẢI CCCD',20,150);return canvas.toDataURL('image/png');});
 const sampleBuffer=Buffer.from(sample.split(',')[1],'base64'),file={name:'anh-mau.png',mimeType:'image/png',buffer:sampleBuffer};
 assert.equal(await page.locator('#applicantCapacity,#rentalExperience,#targetCommune,#expectedScale').count(),0);
 await page.locator('#btnSubmitForm').click();await page.getByRole('alert').filter({hasText:'Vui lòng chọn ảnh mặt trước'}).waitFor();await page.getByRole('alert').filter({hasText:'Bạn cần đồng ý'}).waitFor();assert.equal(writes,0);
 await page.locator('#identityImage').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('sample')});await page.getByRole('alert').filter({hasText:'Chọn ảnh JPG hoặc PNG'}).waitFor();
 await page.locator('#identityImage').setInputFiles(file);await page.getByAltText('Ảnh mặt trước giấy tờ vừa chọn').waitFor();await page.getByRole('button',{name:'Xóa ảnh',exact:true}).click();assert.equal(await page.getByAltText('Ảnh mặt trước giấy tờ vừa chọn').count(),0);
 await page.locator('#identityImage').setInputFiles(file);await page.getByAltText('Ảnh mặt trước giấy tờ vừa chọn').waitFor();await page.locator('#introduction').fill('Ghi chú bản nháp');await page.locator('#agreementCheck').check();
 await page.locator('.haf-contact-note a').click();await page.waitForURL('**/profile?edit=phone');await page.goBack();await page.locator('#becomeHostForm').waitFor();assert.equal(await page.locator('#introduction').inputValue(),'Ghi chú bản nháp');assert.equal(await page.locator('#agreementCheck').isChecked(),true);await page.getByAltText('Ảnh mặt trước giấy tờ vừa chọn').waitFor();
 const out=path.resolve(__dirname,'../../target/host-account-identity');fs.mkdirSync(out,{recursive:true});
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.locator('.haf-form').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.locator('.haf-form').screenshot({path:path.join(out,`form-${width}.png`)});}
 fail=true;await page.locator('#btnSubmitForm').click();await page.getByRole('button',{name:'Đồng ý gửi hồ sơ',exact:true}).click();await page.getByRole('alert').filter({hasText:'Không thể lưu ảnh định danh.'}).first().waitFor();assert.equal(await page.locator('#agreementCheck').isChecked(),true);assert.equal(await page.locator('#introduction').inputValue(),'Ghi chú bản nháp');assert.equal(writes,0);
 await page.locator('.bh-confirm-modal').waitFor({state:'detached'});await page.locator('#introduction').fill('');await page.locator('#btnSubmitForm').click();await page.getByRole('button',{name:'Đồng ý gửi hồ sơ',exact:true}).dblclick();await page.locator('#statePending').waitFor({state:'visible'});assert.equal(writes,1);
 user={...user,userId:22,role:'STAFF'};await page.goto(base+'/staff/host-registrations/detail?id=32');await page.getByRole('heading',{name:'Giấy tờ định danh',exact:true}).waitFor();await page.locator('.host-identity-image').waitFor();assert.ok(photoReads>0);await page.screenshot({path:path.join(out,'staff-detail.png'),fullPage:true});
 await page.locator('#btnTriggerRequestChanges').click();await page.getByRole('dialog').waitFor();await page.getByRole('checkbox',{name:/Ảnh mặt trước Căn cước/}).check();await page.locator('#instruction-identityImage').waitFor();assert.match(await page.locator('#instruction-identityImage').inputValue(),/mặt trước/);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 application={...detail().application,hasIdentityImage:false,targetCommune:'Tân Xã',expectedScale:'5 - 15 phòng',applicantCapacity:'OWNER',rentalExperience:'FIRST_TIME'};await page.reload();await page.getByText('Hồ sơ này chưa có ảnh định danh',{exact:true}).waitFor();assert.equal(await page.getByText('Tân Xã',{exact:true}).count(),0);assert.equal(await page.getByText('Kinh nghiệm quản lý',{exact:true}).count(),0);
 user={...user,userId:21,role:'USER'};await page.goto(base+'/become-host');const toggle=page.locator('[aria-controls="bhSubmittedAccordionBody"]:visible');await toggle.waitFor();if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 for(const label of ['Kinh nghiệm quản lý','Khu vực hoạt động','Quy mô phòng dự kiến','Tư cách cho thuê'])assert.equal(await page.getByText(label,{exact:true}).count(),0);
 assert.equal(await page.locator('.bh-accordion-id-tag').count(),0);assert.equal(await page.getByText('HREG-32',{exact:true}).count(),0);await page.locator('#pendingUserName').waitFor();
 application=null;await page.goto(base+'/become-host?formPreview=1');await page.getByRole('button',{name:'Dùng ảnh mẫu',exact:true}).click();await page.getByAltText('Ảnh mặt trước giấy tờ vừa chọn').waitFor();await page.locator('#agreementCheck').check();await page.locator('#btnSubmitForm').click();await page.getByRole('button',{name:'Đồng ý gửi hồ sơ',exact:true}).click();await page.getByRole('status').filter({hasText:'không gửi hồ sơ thật'}).waitFor();assert.equal(writes,1);
 await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.haf-form').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.deepEqual(errors,[]);
 console.log('PASS new form, validation, pick/remove, draft return, failed save/retry, duplicate guard, blank notes, five widths, staff private image/legacy view, preview zero POST and zoom.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
