// API data are fixtures. LIVE_VIETMAP=1 additionally uses real paid raster tiles.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MAP_TEST_BASE||'http://127.0.0.1:5175';
const live=process.env.LIVE_VIETMAP==='1';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#dce8e0"/></svg>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
 const output=path.resolve(__dirname,'../../target/vietmap-check');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const errors=[];let tileCount=0,googleCalls=0,failSatellite=false;
  page.on('pageerror',e=>errors.push(e.message.replace(/apikey=[^&\s]+/g,'apikey=[redacted]')));
  page.on('request',r=>{if(new URL(r.url()).hostname==='maps.googleapis.com')googleCalls++;});
  page.on('response',r=>{if(r.url().includes('/maps/tiles/st/')&&r.status()===200)tileCount++;});
  await page.route('https://maps.vietmap.vn/maps/tiles/st/**',r=>failSatellite?r.abort():live?r.continue():r.fulfill({contentType:'image/svg+xml',body:svg}));
  // Deliberate denied street style tests fallback without repeatedly hitting a limited key.
  await page.route('https://maps.vietmap.vn/maps/styles/**',r=>r.fulfill({status:423,headers:{'access-control-allow-origin':'*'},body:'Your request is limited'}));
  await page.route(/^https:\/\/tile\.openstreetmap\.(org|de)\//,r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
  const room={propertyId:12,roomTypeId:34,propertyName:'Nhà trọ kiểm thử VietMap',roomTypeName:'Studio',price:2200000,areaSqm:25,availableRooms:2,verificationStatus:'APPROVED',address:'Hòa Lạc',latitude:21.0124167,longitude:105.5252892};
  const places=[{id:'test-school',name:'Trường học kiểm thử',category:'school',latitude:21.013,longitude:105.526,distanceMeters:100}];
  await page.route(base+'/api/**',r=>{
   const u=new URL(r.request().url());let data;
   assert.ok(r.request().method()==='GET','Browser checks do not write data');
   if(u.pathname==='/api/auth/me')data={userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử',phoneNumber:'0912345678'};
   else if(u.pathname==='/api/favorites/state')data={items:[],total:0};
   else if(u.pathname==='/api/property-location/status')data={enabled:false};
   else if(u.pathname.endsWith('/eligibility'))data={canRegister:true,reason:'ELIGIBLE'};
   else if(u.pathname.endsWith('/current'))data=null;
   else if(u.pathname.endsWith('/location/nearby'))data={places,attribution:'© OSM (test fixture)'};
   else if(u.pathname.endsWith('/details'))data={summary:room,gallery:[],propertyGallery:[],roomTypes:[],amenities:[],propertyAmenities:[],selectedRules:[],similar:[],publicContact:null,reviews:{totalReviews:0,ratingCounts:[0,0,0,0,0],latest:[]}};
   else if(u.pathname==='/api/properties/search')data={items:[room],page:0,size:6,totalElements:1,totalPages:1};
   else throw Error('Unexpected app API '+u.pathname);
   return r.fulfill({json:{success:true,data}});
  });
  await page.goto(base+'/map');
  await page.locator('.leaflet-tile-loaded[src*="/maps/tiles/st/"]').first().waitFor();
  await page.locator('.nh-poi-marker').first().waitFor();
  assert.equal(await page.getByRole('button',{name:'Vệ tinh',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('.nh-map-room-choice').click();await page.locator('.nh-map-price-marker').click();
  await page.locator('.leaflet-popup-content a').waitFor();
  assert.equal(await page.locator('.leaflet-popup-content a').getAttribute('href'),'/properties/detail?propertyId=12&roomTypeId=34');
  await page.locator('.leaflet-popup-close-button').click();
  await page.getByRole('button',{name:'Bản đồ',exact:true}).click();
  await page.getByText('VietMap chưa tải được nền đường phố.',{exact:false}).waitFor();
  assert.equal(await page.locator('.nh-map-room-choice[aria-pressed="true"]').count(),1);
  await page.getByRole('button',{name:'Vệ tinh',exact:true}).click();
  await page.locator('.leaflet-tile-loaded[src*="/maps/tiles/st/"]').first().waitFor();
  for(const width of [375,768,1024,1440]){
   await page.setViewportSize({width,height:1100});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Fits '+width);
   await page.locator('.nh-map-loading').waitFor({state:'detached'});
   // Leaflet fades newly loaded tiles after resize; capture the settled map.
   await page.waitForTimeout(500);
   await page.locator('.nh-map-explorer').screenshot({path:path.join(output,(live?'live':'fixture')+'-'+width+'.png')});
  }
  await page.getByRole('button',{name:'Mở rộng bản đồ',exact:true}).click();await page.locator('.accommodation-map-expanded').waitFor();await page.keyboard.press('Escape');await page.locator('.accommodation-map-expanded').waitFor({state:'detached'});
  await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.getByRole('button',{name:'Vệ tinh',exact:true}).isVisible());await page.evaluate(()=>document.documentElement.style.zoom='1');
  await page.goto(base+'/properties/detail?propertyId=12&roomTypeId=34');
  await page.locator('.leaflet-tile-loaded[src*="/maps/tiles/st/"]').first().waitFor();assert.equal(await page.locator('.leaflet-marker-draggable').count(),0);
  await page.evaluate(()=>sessionStorage.setItem('hlrcs_access_token','vietmap-fixture'));await page.goto(base+'/host/property/new');
  await page.locator('#name').fill('Nhà trọ kiểm thử');await page.locator('#description').fill('Nhà trọ sạch sẽ, đầy đủ thông tin cho kiểm thử bản đồ.');await page.locator('#managerName').fill('Chủ trọ');await page.locator('#contactPhone').fill('0912345678');await page.getByRole('button',{name:/Tiếp tục/}).click();
  await page.locator('#addressDetail').fill('Địa chỉ phải được giữ nguyên');
  await page.locator('.leaflet-tile-loaded[src*="/maps/tiles/st/"]').first().waitFor();
  await page.locator('.registration-map-shell .leaflet-container').click({position:{x:250,y:220}});await page.locator('.leaflet-marker-draggable').waitFor();
  await page.getByText('Nhập tọa độ thủ công',{exact:true}).click();const before=await page.locator('#latitude').inputValue();
  const pin=await page.locator('.leaflet-marker-draggable').boundingBox();await page.mouse.move(pin.x+15,pin.y+15);await page.mouse.down();await page.mouse.move(pin.x+60,pin.y+35,{steps:8});await page.mouse.up();
  assert.notEqual(await page.locator('#latitude').inputValue(),before);const coords=await page.locator('#latitude').inputValue();
  await page.getByRole('button',{name:'Bản đồ',exact:true}).click();await page.getByText('VietMap chưa tải được nền đường phố.',{exact:false}).waitFor();
  assert.equal(await page.locator('#latitude').inputValue(),coords);assert.equal(await page.locator('#addressDetail').inputValue(),'Địa chỉ phải được giữ nguyên');
  failSatellite=true;await page.getByRole('button',{name:'Vệ tinh',exact:true}).click();
  await page.getByRole('button',{name:'Phóng to bản đồ',exact:true}).click();
  await page.getByRole('button',{name:'Bản đồ',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.nh-map-layers button')?.getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('#latitude').inputValue(),coords);assert.equal(await page.locator('.leaflet-marker-draggable').count(),1);
  assert.deepEqual(errors,[]);assert.equal(googleCalls,0);assert.ok(tileCount>0);
  console.log(JSON.stringify({result:'PASS',mode:live?'Real VietMap satellite tiles; fixture application data and forced street denial':'Provider/API fixtures',tileCount,googleCalls,checks:'satellite, automatic POI icons, price popup/route, denied street fallback, return to satellite, 4 widths, fullscreen/Escape, 200% controls, read-only detail, click/drag picker, form/coordinate preservation, failed satellite fallback'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message.replace(/apikey=[^&\s]+/g,'apikey=[redacted]'));process.exitCode=1;});
