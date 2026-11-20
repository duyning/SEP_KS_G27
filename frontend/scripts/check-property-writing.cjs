const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ONBOARDING_TEST_URL||'http://127.0.0.1:5198';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
const image=name=>({name,mimeType:'image/png',buffer:png});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const output=path.resolve(__dirname,'../../target/property-writing-ui');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];let registration=null,account=null,posts=0,host=false,aiCalls=0;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','onboarding-fixture'));
  await page.route('https://**/*',r=>r.abort());
  await page.route(base+'/api/**',r=>{
   const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});
   if(p==='/api/auth/me')return ok({userId:1,fullName:'Người đăng ký',phoneNumber:'0934567812',phoneVerifiedAt:'2026-11-14T10:00:00Z',email:'fixture@example.test',role:host?'ROOM_HOST':'USER'});
   if(p==='/api/property-writing/description'){
    aiCalls++;const facts=JSON.parse(r.request().postData());assert.equal(facts.propertyType,'Ký túc xá tư nhân');assert.equal(Object.hasOwn(facts,'contactPhone'),false);assert.equal(Object.hasOwn(facts,'documents'),false);
    if(aiCalls===2)return r.fulfill({status:503,json:{success:false,message:'AI chưa sẵn sàng. Bạn vẫn có thể tự nhập mô tả.'}});
    return ok({description:'Nhà trọ kiểm thử thuộc loại hình ký túc xá tư nhân. Đây là gợi ý mô tả từ AI để chủ trọ kiểm tra và chỉnh sửa.'});
   }
   if(p==='/api/host-onboarding/current')return ok({account,registration});
   if(p==='/api/host-onboarding'&&r.request().method()==='POST'){
    posts++;const body=r.request().postDataBuffer().toString();for(const key of ['account','details','photos','ownership','fireSafety','identityImage','identityBackImage'])assert.ok(body.includes(key),key);
    if(width===1440&&posts===1)return r.fulfill({status:400,json:{success:false,message:'Tài liệu chưa hợp lệ. Vui lòng kiểm tra lại.'}});
    registration={registrationId:31,name:'Nhà trọ kiểm thử',status:'PENDING',createdAt:'2026-11-14T10:00:00',reasonNote:null};account={id:21,status:'MERGED',hasIdentityImage:true,hasIdentityBackImage:true,version:1};return ok(registration);
   }
   assert.equal(r.request().method(),'GET',`Unexpected write ${p}`);return ok({items:[],total:0,unreadCount:0});
  });
  await page.goto(base+'/become-host');if(width===375){await page.locator('#mobileMenuBtn').click();await page.locator('#navMenu').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#navMenu').waitFor({state:'hidden'});}const nextAccount=page.locator('#btnSubmitForm');await nextAccount.waitFor();
  assert.equal(await nextAccount.isEnabled(),false);await page.locator('#identityImage').setInputFiles(image('front.png'));await page.locator('#identityBackImage').setInputFiles(image('back.png'));await page.locator('#agreementCheck').check();await page.waitForFunction(()=>!document.querySelector('#btnSubmitForm').disabled);
  await page.screenshot({path:path.join(output,`account-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width})))));
  await nextAccount.focus();await page.keyboard.press('Enter');const form=page.locator('.property-registration');await form.waitFor();assert.equal(posts,0);
  await form.locator('#name').fill('Nhà trọ kiểm thử');await form.locator('#propertyType').selectOption('__other__');await form.locator('#propertyTypeCustom').fill('Ký túc xá tư nhân');
  const description=form.locator('#description'),original='Thông tin mô tả do chủ trọ tự nhập và muốn giữ lại khi AI gặp lỗi.';await description.fill(original);
  const generate=form.getByRole('button',{name:'Tạo mô tả bằng AI',exact:true});await generate.click();await form.getByRole('button',{name:'Dùng mô tả này',exact:true}).waitFor();assert.equal(await description.inputValue(),original);
  await form.getByRole('button',{name:'Bỏ gợi ý',exact:true}).click();assert.equal(await description.inputValue(),original);
  await generate.click();await form.getByText('AI chưa sẵn sàng. Bạn vẫn có thể tự nhập mô tả.',{exact:true}).waitFor();assert.equal(await description.inputValue(),original);
  await generate.click();await form.getByRole('button',{name:'Dùng mô tả này',exact:true}).waitFor();await description.fill(original+' Đã sửa.');assert.equal(await form.getByRole('button',{name:'Dùng mô tả này',exact:true}).count(),0);
  await generate.click();await form.getByRole('button',{name:'Dùng mô tả này',exact:true}).waitFor();await page.screenshot({path:path.join(output,`writing-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await form.getByRole('button',{name:'Dùng mô tả này',exact:true}).click();assert.ok((await description.inputValue()).includes('gợi ý mô tả từ AI'));
  assert.equal(await form.locator('#propertyTypeCustom').inputValue(),'Ký túc xá tư nhân');
  const next=()=>form.getByRole('button',{name:'Tiếp tục',exact:true}).click();await next();await form.locator('#addressDetail').fill('Số 18 ngõ 12 thôn 2');await form.locator('#commune').selectOption('Tân Xã');await next();await next();
  await form.locator('#photos').setInputFiles(image('property.png'));await next();
  for(const name of ['ownership','fireSafety'])await form.locator('#'+name).setInputFiles({name:name+'.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
  assert.equal(await form.locator('#idCard').count(),0);assert.equal(await form.locator('.host-identity-pair img').count(),2);await next();
  const submit=form.getByRole('button',{name:'Gửi xét duyệt',exact:true});assert.equal(await submit.isEnabled(),false);await form.locator('#termsAccepted').check();assert.equal(await submit.isEnabled(),true);
  assert.equal(posts,0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(output,`review-${width}.png`),fullPage:true});
  await form.getByRole('button',{name:'Thông tin tài khoản & CCCD',exact:true}).click();assert.equal(await page.locator('.haf-image-preview img').count(),2);await nextAccount.click();await submit.waitFor();assert.equal(await form.locator('#termsAccepted').isChecked(),true);
  if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');await page.screenshot({path:path.join(output,'zoom.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width})))));await page.evaluate(()=>document.documentElement.style.zoom='');}
  await submit.click();if(width===1440){await page.getByText('Tài liệu chưa hợp lệ. Vui lòng kiểm tra lại.',{exact:true}).waitFor();assert.equal(await form.locator('#termsAccepted').isChecked(),true);await submit.click();}
  await page.getByRole('heading',{name:'Hồ sơ đang chờ xét duyệt',exact:true}).waitFor();assert.equal(posts,width===1440?2:1);assert.equal(await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).count(),0);
  await page.reload();await page.getByRole('heading',{name:'Hồ sơ đang chờ xét duyệt',exact:true}).waitFor();host=true;await page.getByRole('button',{name:'Cập nhật trạng thái',exact:true}).click();await page.getByRole('link',{name:'Đăng ký nhà trọ',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'host status page overflow');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS custom property type, AI preview/apply/discard, errors preserve manual description, stale suggestion cleared, full combined submission; four widths, zoom and keyboard. Mock Gemini only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
