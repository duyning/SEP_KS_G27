// Dev-server regression. Configure VITE_GOOGLE_MAPS_API_KEY=test-only if no key
// is configured; the SDK is mocked before boot and never contacts Google.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   sessionStorage.setItem('hlrcs_access_token','map-regression');
   window.__mapTest={mode:'normal',delay:0,created:0,detachAttempts:0,connectedDetach:0,removedListeners:0};
   class TestMap{
    constructor(element){this.element=element;window.__mapTest.created++;element.append(document.createElement('div'));}
    addListener(){return {remove(){if(window.__mapTest.mode==='listener-error')throw new Error('SDK listener already disposed');window.__mapTest.removedListeners++;}};}
    panTo(){}
    unbindAll(){}
   }
   class TestMarker{
    constructor(options){this.map=options.map;this.position=options.position;}
    set map(value){
     if(value===null){window.__mapTest.detachAttempts++;if(this.host?.isConnected)window.__mapTest.connectedDetach++;
      if(window.__mapTest.mode==='marker-error'||!this.host?.isConnected)throw new TypeError("Cannot read properties of undefined (reading 'getRootNode')");}
     this.host=value?.element;
    }
    set position(value){if(value&&window.__mapTest.mode==='update-error')throw new Error('SDK position unavailable');this.point=value;}
    get position(){return this.point;}
    addEventListener(){}
    removeEventListener(){}
   }
   window.google={maps:{event:{trigger(){}},importLibrary:async kind=>{
    await new Promise(resolve=>setTimeout(resolve,window.__mapTest.delay));
    return kind==='maps'?{Map:TestMap}:{AdvancedMarkerElement:TestMarker};
   }}};
  });
  await page.route('**/maps.googleapis.com/**',route=>route.abort());
  const base=process.env.HLRCS_TEST_BASE||'http://127.0.0.1:5173';
  await page.route(base+'/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const data=path==='/api/auth/me'?{userId:20,role:'ROOM_HOST',fullName:'Map test host',email:'map@test.local',phoneNumber:'0912345678'}
    :path.endsWith('/eligibility')?{canRegister:true,reason:'ELIGIBLE'}:[];
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto(base+'/host/property/new');
  await page.locator('#name').fill('Nhà trọ kiểm thử bản đồ');
  await page.locator('#description').fill('Nhà trọ yên tĩnh, thông tin liên hệ rõ ràng và có bãi để xe chung.');
  const next=()=>page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  const back=()=>page.getByRole('button',{name:'Quay lại',exact:true}).click();
  for(const mode of ['normal','marker-error','listener-error','auth-error','update-error']){
   await page.evaluate(mode=>{window.__mapTest.mode=mode;window.__mapTest.delay=0;},mode);
   const before=await page.evaluate(()=>window.__mapTest.created);
   await next();await page.locator('#addressDetail').waitFor();
   await page.waitForFunction(before=>window.__mapTest.created>before,before);
   await page.waitForTimeout(100);assert.equal(await page.locator('.registration-map-error').count(),0,'Mock SDK should initialize before testing its failure');
   await page.locator('#addressDetail').fill('Số 12, ngõ 10, Thôn 2');await page.locator('#commune').selectOption('Tân Xã');
   if(mode==='auth-error')await page.evaluate(()=>window.dispatchEvent(new Event('hlrcs:google-maps-auth-error')));
   if(mode==='update-error'){
    await page.getByText('Nhập tọa độ thủ công',{exact:true}).click();
    await page.locator('#latitude').fill('21.01');await page.locator('#longitude').fill('105.52');await page.locator('#longitude').press('Tab');await page.waitForTimeout(100);
   }
   if(mode==='auth-error'||mode==='update-error')await page.getByRole('alert').filter({hasText:'Bản đồ hiện không khả dụng'}).waitFor();
   if(mode==='auth-error'){
    const created=await page.evaluate(()=>window.__mapTest.created);
    await page.getByRole('button',{name:'Thử lại bản đồ',exact:true}).click();
    await page.waitForFunction(created=>window.__mapTest.created>created,created);
   }
   await next();await page.getByRole('heading',{name:'Thông tin & Tiện ích chung',exact:true}).waitFor();
   await back();await page.locator('#addressDetail').waitFor();assert.equal(await page.locator('#addressDetail').inputValue(),'Số 12, ngõ 10, Thôn 2');
   await back();await page.locator('#name').waitFor();assert.equal(await page.locator('#name').inputValue(),'Nhà trọ kiểm thử bản đồ');
   assert.ok(await page.locator('.portal-topbar').isVisible());assert.deepEqual(errors,[]);
  }
  await page.evaluate(()=>{window.__mapTest.mode='normal';window.__mapTest.delay=1200;});
  const before=await page.evaluate(()=>window.__mapTest.created);
  await next();await page.locator('#addressDetail').waitFor();await back();await page.locator('#name').waitFor();await page.waitForTimeout(1400);
  assert.equal(await page.evaluate(()=>window.__mapTest.created),before,'Late SDK load must not create a map after unmount');
  const stats=await page.evaluate(()=>window.__mapTest);assert.ok(stats.detachAttempts>0);assert.equal(stats.connectedDetach,stats.detachAttempts);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,scenarios:6,nextAndBack:true,preservesFields:true,cleanupBeforeDomRemoval:true,lateLoadCancelled:true,errors:0}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
