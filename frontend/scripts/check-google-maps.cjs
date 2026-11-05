const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  class Events{handlers={};addListener(n,fn){(this.handlers[n]??=[]).push(fn);return {remove:()=>{this.handlers[n]=this.handlers[n].filter(f=>f!==fn);}};}emit(n,e){this.handlers[n]?.forEach(fn=>fn(e));}}
  class MapMock extends Events{constructor(el,options){super();this.el=el;this.zoom=options.zoom;window.testMap=this;el.style.background='#e7efeb';el.addEventListener('click',e=>{if(e.target===el)this.emit('click',{latLng:{lat:()=>21.02,lng:()=>105.53}});});setTimeout(()=>this.emit('tilesloaded'),100);}setCenter(p){this.center=p;}setZoom(z){this.zoom=z;}getZoom(){return this.zoom;}fitBounds(b){this.bounds=b;}setMapTypeId(v){this.view=v;}}
  class Marker extends Events{constructor(o){super();Object.assign(this,o);this.button=document.createElement('button');this.button.type='button';Object.assign(this.button.style,{position:'absolute',top:'200px',left:'40%'});this.button.setAttribute('aria-label',o.title);this.button.append(o.content);this.button.addEventListener('click',()=>this.emit('click'));o.map.el.append(this.button);(window.testMarkers??=[]).push(this);}set map(v){this._map=v;if(!v)this.button?.remove();}get map(){return this._map;}}
  class InfoWindow{constructor(o){this.node=o.content;}open(o){o.map.el.append(this.node);}close(){this.node.remove();}}
  window.google={maps:{importLibrary:async()=>({Map:MapMock,AdvancedMarkerElement:Marker,InfoWindow}),LatLngBounds:class{extend(){}},event:{trigger(){},clearInstanceListeners(){}}}};
 });

 const room={propertyId:12,roomTypeId:34,propertyName:'Nhà trọ kiểm thử',roomTypeName:'Studio',price:2200000,areaSqm:25,verificationStatus:'APPROVED',availableRooms:2,address:'Tân Xã',latitude:21.0188,longitude:105.5215};

 await page.route('http://127.0.0.1:5174/api/**',r=>{const path=new URL(r.request().url()).pathname;let data;
 if(path==='/api/auth/me')data={userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'};
 else if(path.endsWith('/eligibility'))data={canRegister:true,reason:'ELIGIBLE'};
 else if(path.endsWith('/location/nearby'))data={places:[]};
 else if(path.endsWith('/current'))data=null;
 else data={items:[room],page:0,size:6,totalElements:1,totalPages:1};
 return r.fulfill({json:{success:true,data}});});
 await page.goto('http://127.0.0.1:5174/map');await page.locator('.nh-google-pin').waitFor();
 await page.locator('.nh-map-room-choice').click();assert.equal(await page.locator('.nh-google-pin.is-selected').count(),1);await page.locator('.nh-google-price').click();await page.getByRole('link',{name:'Xem chi tiết phòng',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Xem chi tiết phòng',exact:true}).getAttribute('href'),'/properties/detail?propertyId=12&roomTypeId=34');
 await page.getByRole('button',{name:'Vệ tinh',exact:true}).click();assert.equal(await page.evaluate(()=>window.testMap.view),'hybrid');
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.locator('.nh-map-explorer').screenshot({path:'target/google-fixture-'+width+'.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Fits '+width);await page.screenshot({path:'target/google-fixture-'+width+'.png'});}
 await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.nh-map-layers button').first().isVisible());await page.evaluate(()=>document.documentElement.style.zoom='1');
 await page.locator('.nh-map-layers').getByRole('button',{name:'Bản đồ',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.testMap.view),'roadmap');
 await page.evaluate(()=>window.dispatchEvent(new Event('hlrcs:google-maps-auth-error')));await page.locator('.leaflet-container').waitFor();assert.equal(await page.locator('.nh-map-room-choice[aria-pressed="true"]').count(),1);
 await page.evaluate(()=>sessionStorage.setItem('hlrcs_access_token','google-fixture'));await page.goto('http://127.0.0.1:5174/host/property/new');await page.locator('#name').fill('Nhà trọ Google');await page.locator('#description').fill('Nhà trọ đầy đủ thông tin, sạch sẽ và thoáng mát.');await page.locator('#managerName').fill('Chủ trọ kiểm thử');await page.locator('#contactPhone').fill('0912345678');await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.locator('.registration-map-shell .nh-google-canvas').waitFor();await page.locator('#addressDetail').fill('Giữ địa chỉ đã nhập');await page.locator('.registration-map-shell .nh-google-canvas').click({position:{x:200,y:230}});await page.locator('.nh-google-pin').waitFor();assert.ok(await page.evaluate(()=>window.testMap.center.lat===21.02));await page.evaluate(()=>window.testMarkers.at(-1).emit('dragend',{latLng:{lat:()=>21.03,lng:()=>105.54}}));await page.waitForFunction(()=>window.testMap.center.lat===21.03);
 await page.evaluate(()=>window.dispatchEvent(new Event('hlrcs:google-maps-auth-error')));await page.locator('.leaflet-container').waitFor();assert.equal(await page.locator('#addressDetail').inputValue(),'Giữ địa chỉ đã nhập');assert.equal(await page.locator('.nh-map-marker').count(),1);assert.deepEqual(errors,[]);
 console.log('PASS mocked Google SDK: price popup/router link, card selection, satellite switch, keyboard, four widths, 200% zoom controls, reduced motion, click/drag pin, late-auth fallback preserving location/form/selection. No real Google authorization asserted.');
 }finally{await browser.close();}})().catch(e=>{console.error(e.message.replace(/AIza[\w-]+/g,'[redacted]'));process.exitCode=1;});

