// Simulate the SDK errors from the user's console on the real host property route.
// No live Google requests, credentials, or database writes are used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MAP_FAILURE_TEST_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const output=path.resolve(__dirname,'../../target/google-map-failure');fs.mkdirSync(output,{recursive:true});
 for(const mode of ['constructor','listener','position','auth','cleanup','controls','healthy']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(mode=>{
   sessionStorage.setItem('hlrcs_access_token','map-failure-fixture');
   const broken=()=>{throw new TypeError("Cannot read properties of undefined (reading 'get')");};
   class MapDouble{
    constructor(){window.__testGoogleMap=this;}
    setCenter(){}setZoom(){}getZoom(){return 16;}fitBounds(){}
    setMapTypeId(){if(mode==='controls')broken();}
    addListener(name,fn){if(name==='tilesloaded')queueMicrotask(fn);return {remove(){if(mode==='cleanup')broken();}};}
   }
   class MarkerDouble extends EventTarget{
    constructor(options){super();if(mode==='constructor')broken();this.savedPosition=options.position;this.map=options.map;window.__testGoogleMarker=this;}
    get position(){return this.savedPosition;}
    set position(value){if(mode==='position')broken();this.savedPosition=value;}
    addEventListener(name,fn){if(mode==='listener')broken();super.addEventListener(name,fn);}
    addListener(){throw new Error('Deprecated marker.addListener must not be called');}
    removeEventListener(name,fn){if(mode==='cleanup')broken();super.removeEventListener(name,fn);}
   }
   class InfoDouble{constructor(){}open(){}close(){if(mode==='cleanup')broken();}}
   window.google={maps:{importLibrary:async name=>name==='maps'?{Map:MapDouble,InfoWindow:InfoDouble}:{AdvancedMarkerElement:MarkerDouble},event:{trigger(){},clearInstanceListeners(){if(mode==='cleanup')broken();}}}};
  },mode);
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/api/**',route=>{
   assert.equal(route.request().method(),'GET','No writes permitted');
   const p=new URL(route.request().url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
   if(p==='/api/auth/me')return ok({userId:1,fullName:'Chủ trọ kiểm thử',role:'ROOM_HOST'});
   if(p==='/api/host/property')return ok({records:[{propertyId:3,registrationId:10,name:'Nhà trọ kiểm thử bản đồ',address:'Mục Uyên, Hạ Bằng, Hà Nội',displayStatus:'VISIBLE',verified:true,photos:[],documents:[],amenities:[],selectedRules:[],latitude:21.0196169,longitude:105.5517238,roomTypeCount:1,totalRooms:3,vacantRooms:2,pendingViewingCount:0,reverificationRequired:false}]});
   return ok({items:[],places:[],unreadCount:0});
  });
  await page.goto(base+'/host/property?id=3');await page.locator('.hp-detail').waitFor();
  if(['auth','cleanup','controls','healthy'].includes(mode)){
   await page.waitForFunction(()=>Boolean(window.__testGoogleMarker));
   if(mode==='auth'||mode==='cleanup')await page.evaluate(()=>window.gm_authFailure());
   if(mode==='controls')await page.getByRole('button',{name:'Vệ tinh',exact:true}).click();
   if(mode==='healthy'){
    await page.evaluate(()=>window.__testGoogleMarker.dispatchEvent(new Event('gmp-click')));
    assert.equal(await page.locator('.nh-google-map').count(),1);
   }
  }
  if(mode!=='healthy'){
   await page.getByText('Google Maps chưa khả dụng. Đang dùng OpenStreetMap; thông tin bạn nhập được giữ nguyên.',{exact:true}).waitFor();
   await page.locator('.leaflet-container').waitFor();
   assert.equal(await page.getByRole('heading',{name:'Nhà trọ kiểm thử bản đồ',exact:true}).count(),1);
   assert.equal(await page.getByRole('heading',{name:'Hồ sơ & Xét duyệt',exact:true}).count(),1);
   if(mode==='constructor')for(const width of [375,768,1024,1440]){
    await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.screenshot({path:path.join(output,`fallback-${width}.png`),fullPage:true});
   }
   await page.getByRole('link',{name:'Quay lại danh sách nhà trọ',exact:true}).click();await page.locator('.hm-prop-card').waitFor();
   await page.goto(base+'/host/property?id=3');await page.locator('.hp-detail').waitFor();
  }
  assert.deepEqual(errors,[],mode);await page.close();
 }
 console.log('PASS: marker constructor/listener/position errors, late auth denial, throwing cleanup, controls, gmp-click, fallback/re-entry and property data intact at four widths. No live provider requests/writes.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
