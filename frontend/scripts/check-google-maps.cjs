const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GOOGLE_ROOM_MAP_TEST_URL||'http://127.0.0.1:5174';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 await page.addInitScript(()=>{
  const lifecycle=window.mapTestLifecycle=[];
  class Events{
   handlers={};
   addListener(name,callback){
    (this.handlers[name]??=[]).push(callback);
    return {remove:()=>{this.handlers[name]=this.handlers[name].filter(fn=>fn!==callback);}};
   }
   addEventListener(name,callback){this.addListener(name,callback);}
   removeEventListener(name,callback){this.handlers[name]=(this.handlers[name]||[]).filter(fn=>fn!==callback);}
   emit(name,event){this.handlers[name]?.forEach(callback=>callback(event));}
  }
  class LatLng{
   constructor(lat,lng){this.value=typeof lat==='object'?lat:{lat,lng};}
   lat(){return this.value.lat;}
   lng(){return this.value.lng;}
  }
  class LatLngBounds{
   points=[];
   extend(point){this.points.push(point);}
  }
  class MapMock extends Events{
   constructor(el,options){
    super();this.el=el;this.zoom=options.zoom;
    this.center=new LatLng(options.center instanceof LatLng?options.center.value:options.center).value;
    lifecycle.push(['map-created',Boolean(el),options.center instanceof LatLng]);
    window.testMap=this;el.style.background='#e7efeb';
    el.addEventListener('click',event=>{if(event.target===el)this.emit('click',{latLng:new LatLng(21.02,105.53)});});
    setTimeout(()=>{lifecycle.push(['tilesloaded',Object.keys(this.handlers)]);this.emit('tilesloaded');},100);
   }
   getCenter(){return new LatLng(this.center);}
   setCenter(point){this.center=point;this.redraw();}
   getZoom(){return this.zoom;}
   setZoom(zoom){this.zoom=zoom;this.redraw();}
   fitBounds(bounds){this.bounds=bounds;this.setCenter(bounds.points[0]);}
   setMapTypeId(view){this.view=view;this.emit('maptypeid_changed');}
   getMapTypeId(){return this.view;}
   setOptions(){}
   redraw(){requestAnimationFrame(()=>this.overlay?.draw());}
  }
  class OverlayView {
   setMap(map){
    lifecycle.push(['overlay',Boolean(map)]);
    if(!map){this.onRemove();this.map.overlay=null;this.pane.remove();return;}
    this.map=map;map.overlay=this;
    this.pane=document.createElement('div');
    Object.assign(this.pane.style,{position:'absolute',inset:'0',pointerEvents:'none'});
    map.el.append(this.pane);
    this.onAdd();this.draw();
   }
   getPanes(){return {overlayMouseTarget:this.pane};}
   getProjection(){
    const toPixel=point=>({
     x:this.map.el.clientWidth/2+(point.lng()-this.map.center.lng)*7000,
     y:this.map.el.clientHeight/2-(point.lat()-this.map.center.lat)*7000,
    });
    return {fromLatLngToDivPixel:toPixel,fromLatLngToContainerPixel:toPixel,fromContainerPixelToLatLng:()=>this.map.getCenter()};
   }
  }
  class Marker extends Events{constructor(o){super();Object.assign(this,o);this.button=document.createElement('button');this.button.type='button';Object.assign(this.button.style,{position:'absolute',top:'200px',left:'40%'});this.button.setAttribute('aria-label',o.title);this.button.append(o.content||'●');this.button.addEventListener('click',()=>this.emit('gmp-click'));o.map.el.append(this.button);(window.testMarkers??=[]).push(this);}set map(v){this._map=v;if(!v)this.button?.remove();}get map(){return this._map;}}
  class InfoWindow{constructor(o){this.node=o.content;}open(o){o.map.el.append(this.node);}close(){this.node.remove();}}
  const maps={
   version:'3.65.0',Map:MapMock,OverlayView,LatLng,LatLngBounds,AdvancedMarkerElement:Marker,InfoWindow,
   event:{addListener:(obj,name,callback)=>obj.addListener(name,callback),removeListener:listener=>listener.remove(),
    trigger(obj,name){obj.emit(name);},clearInstanceListeners(obj){lifecycle.push(['clear']);obj.handlers={};}},
  };
  maps.importLibrary=async()=>maps;
  window.google={maps};
 });

 const room={propertyId:12,roomTypeId:34,propertyName:'Nhà trọ kiểm thử',roomTypeName:'Studio',price:2200000,areaSqm:25,verificationStatus:'APPROVED',availableRooms:2,address:'Tân Xã',latitude:21.0188,longitude:105.5215};

 const other={...room,propertyId:13,roomTypeId:36,propertyName:'Nhà trọ ở vị trí khác',latitude:21.025,longitude:105.533};
 const grouped={...room,roomTypeId:35,roomTypeName:'Phòng gác lửng',price:2800000};
 const unlocated={...room,propertyId:14,roomTypeId:37,propertyName:'Nhà trọ thiếu tọa độ',latitude:null,longitude:null};
 await page.route('https://**/*',route=>route.abort());
 await page.route(base+'/api/**',r=>{const path=new URL(r.request().url()).pathname;let data;
 if(path==='/api/auth/me')data={userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'};
 else if(path==='/api/property-location/status')data={enabled:false};
 else if(path.endsWith('/eligibility'))data={canRegister:true,reason:'ELIGIBLE'};
 else if(path.endsWith('/location/nearby'))data={places:[]};
 else if(path.endsWith('/location/resolve')){
  assert.equal(r.request().postDataJSON().input,'21.0196169, 105.5517238');
  data={latitude:21.0196169,longitude:105.5517238,places:[],warnings:[]};
 }
 else if(path.endsWith('/current'))data=null;
 else data={items:[room,grouped,other,unlocated],page:0,size:6,totalElements:4,totalPages:1};
 return r.fulfill({json:{success:true,data}});});
 await page.goto(base+'/map');
 const firstPin=page.getByRole('button',{name:/^Xem Nhà trọ kiểm thử,/});
 const otherPin=page.getByRole('button',{name:/^Xem Nhà trọ ở vị trí khác,/});
 try {
  await firstPin.waitFor({timeout:12000});await otherPin.waitFor({timeout:12000});
 } catch(error) {
  const state=await page.evaluate(()=>({
   map:Boolean(window.testMap),
   handlers:Object.keys(window.testMap?.handlers||{}),
   overlay:Boolean(window.testMap?.overlay),
   lifecycle:window.mapTestLifecycle,
   pins:document.querySelectorAll('.nh-google-react-pin').length,
   stage:document.querySelector('.nh-map-stage')?.textContent,
   searchError:document.querySelector('.search-empty-container')?.textContent,
  }));
  throw new Error(`${error.message}\n${JSON.stringify({state,errors,consoleErrors:consoleErrors.slice(-7)})}`);
 }
 assert.equal(await page.locator('.nh-google-react-pin').count(),2,'Pins share exact coordinates and omit missing ones');
 assert.equal(await page.getByRole('button',{name:/^Xem Nhà trọ thiếu tọa độ,/}).count(),0);
 assert.notEqual((await firstPin.boundingBox()).x,(await otherPin.boundingBox()).x);
 await page.getByRole('button',{name:'Xem vị trí Nhà trọ ở vị trí khác – Studio',exact:true}).click();
 assert.equal(await otherPin.getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>window.testMap.center.lat===21.025);
 await firstPin.focus();await page.keyboard.press('Enter');
 const popup=page.getByRole('region',{name:'Phòng tại Nhà trọ kiểm thử',exact:true});
 const links=popup.getByRole('link',{name:'Xem chi tiết phòng',exact:true});
 await links.first().waitFor();
 assert.equal(await links.count(),2);
 assert.equal(await links.first().getAttribute('href'),'/properties/detail?propertyId=12&roomTypeId=34');
 assert.equal(await links.last().getAttribute('href'),'/properties/detail?propertyId=12&roomTypeId=35');
 await page.keyboard.press('Escape');
 await popup.waitFor({state:'detached'});
 assert.ok(await firstPin.evaluate(el=>document.activeElement===el));
 await firstPin.click();
 await page.getByRole('button',{name:'Vệ tinh',exact:true}).click();assert.equal(await page.evaluate(()=>window.testMap.view),'hybrid');
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.locator('.nh-map-explorer').screenshot({path:path.resolve(__dirname,`../../target/google-room-map/${width}.png`)});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Fits '+width);}
 await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.nh-map-layers button').first().isVisible());await page.evaluate(()=>document.documentElement.style.zoom='1');
 await page.locator('.nh-map-layers').getByRole('button',{name:'Bản đồ',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.testMap.view),'roadmap');
 await page.evaluate(()=>window.dispatchEvent(new Event('hlrcs:google-maps-auth-error')));await page.locator('.leaflet-container').waitFor();assert.equal(await page.locator('.nh-map-room-choice[aria-pressed="true"]').count(),1);
 await page.evaluate(()=>sessionStorage.setItem('hlrcs_access_token','google-fixture'));await page.goto(base+'/host/property/new');await page.locator('#name').fill('Nhà trọ Google');await page.locator('#description').fill('Nhà trọ đầy đủ thông tin, sạch sẽ và thoáng mát.');await page.locator('#managerName').fill('Chủ trọ kiểm thử');await page.locator('#contactPhone').fill('0912345678');await page.getByRole('button',{name:/Tiếp tục/}).click();
 const picker=page.getByRole('region',{name:'Bản đồ chọn vị trí nhà trọ',exact:true});
 await picker.locator('.nh-google-react-mount').first().waitFor();
 await page.waitForFunction(()=>Boolean(window.testMap?.handlers.click?.length && document.querySelector('.registration-map-shell button[aria-label="Xem vị trí các ghim"]:not(:disabled)')));
 await page.locator('#addressDetail').fill('Giữ địa chỉ đã nhập');
 await picker.locator('.nh-google-canvas').click({position:{x:200,y:230}});
 await picker.getByRole('button',{name:'Vị trí nhà trọ',exact:true}).waitFor();
 await page.waitForFunction(()=>window.testMap.center.lat===21.02 && window.testMarkers.at(-1).position.lng===105.53);
 await page.evaluate(()=>{const marker=window.testMarkers.at(-1);marker.position={lat:21.03,lng:105.54};marker.emit('gmp-dragend');});
 await page.waitForFunction(()=>window.testMap.center.lat===21.03);
 await page.locator('#property-pasted-address').fill('21.0196169, 105.5517238');
 await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).click();
 await page.waitForFunction(()=>{
  const center=window.testMap.center, pin=window.testMarkers.at(-1).position;
  return center.lat===21.0196169 && center.lng===105.5517238 && pin.lat===center.lat && pin.lng===center.lng;
 });
 assert.equal(await picker.getByRole('button',{name:'Vị trí nhà trọ',exact:true}).count(),1);
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Picker fits '+width);
 }
 await page.evaluate(()=>window.dispatchEvent(new Event('hlrcs:google-maps-auth-error')));await page.locator('.leaflet-container').waitFor();assert.equal(await page.locator('#addressDetail').inputValue(),'Giữ địa chỉ đã nhập');assert.equal(await page.locator('.nh-map-marker').count(),1);assert.deepEqual(errors,[]);
 console.log('PASS google-map-react with mocked Google SDK: coordinate groups, price pins, popup/router links, card focus, layers, keyboard, four widths, 200% zoom, location picker and authorization fallback.');
 }finally{await browser.close();}})().catch(e=>{console.error(e.message.replace(/AIza[\w-]+/g,'[redacted]'));process.exitCode=1;});
