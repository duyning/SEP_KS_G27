// API fixtures only: exercises the controlled registration form without database writes.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PROPERTY_AREA_TEST_URL||'http://127.0.0.1:5198';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','area-autofill-fixture'));
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
   if(path==='/api/auth/me')return ok({userId:1,fullName:'Chủ trọ kiểm thử',phoneNumber:'0912345678',role:'ROOM_HOST'});
   if(path.endsWith('/eligibility'))return ok({canRegister:true,reason:'ELIGIBLE'});
   if(path.endsWith('/current'))return ok(null);
   if(path.endsWith('/location/resolve')){
    assert.equal(route.request().method(),'POST');
    assert.ok(JSON.parse(route.request().postData()).input.includes('!3d21.0196169!4d105.5517238'));
    return ok({latitude:21.0196169,longitude:105.5517238,addressDetail:'Mục Uyên, Xã Hạ Bằng, Hà Nội, Việt Nam',commune:'Hạ Bằng',nearby:null,places:[],warnings:[]});
   }
   assert.equal(route.request().method(),'GET','No registration or SMS writes permitted');
   return ok({places:[],items:[],unreadCount:0});
  });
  for(const width of [375,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/host/property/new');
   await page.locator('#name,#property-pasted-address').first().waitFor();
   if(!await page.locator('#property-pasted-address').count()){
    await page.locator('#name').fill('Nhà trọ Luxury living');
    await page.locator('#description').fill('Nhà trọ kiểm thử thông tin vị trí tại khu vực Hòa Lạc.');
    await page.locator('#managerName').fill('Chủ trọ kiểm thử');
    await page.locator('#contactPhone').fill('0912345678');
    await page.getByRole('button',{name:/Tiếp tục/}).click();
   }
   await page.locator('#commune').selectOption('');
   await page.locator('#commune').focus();await page.keyboard.press('Tab');
   assert.equal(await page.locator('#commune').getAttribute('aria-invalid'),'true');
   await page.locator('#property-pasted-address').fill('https://www.google.com/maps/place/Luxury+living/data=!3d21.0196169!4d105.5517238');
   await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).focus();
   await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('#commune')?.value==='Hạ Bằng');
   assert.equal(await page.locator('#commune').getAttribute('aria-invalid'),'false');
   assert.equal(await page.locator('#commune-error').count(),0);
   assert.equal(await page.locator('#addressDetail').inputValue(),'Mục Uyên, Xã Hạ Bằng, Hà Nội, Việt Nam');
   assert.ok(await page.locator('#commune option[value="Hòa Lạc"]').count());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await page.locator('#commune').selectOption('Tân Xã');
   assert.equal(await page.locator('#commune').inputValue(),'Tân Xã');
  }
  await page.evaluate(()=>document.documentElement.style.zoom='2');
  assert.ok(await page.locator('#commune').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.deepEqual(errors,[]);
  console.log('PASS: Hạ Bằng autofill, required error cleared, manual override, keyboard, four widths and 200% zoom; API fixtures only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
