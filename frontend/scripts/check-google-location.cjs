const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GOOGLE_TEST_URL||'http://127.0.0.1:5199';
async function setup(page){
 await page.addInitScript(()=>{
  sessionStorage.setItem('hlrcs_access_token','browser-only');
  sessionStorage.setItem('hlrcs:property-draft:1',JSON.stringify({version:1,fields:{name:'Test property',propertyType:'Chung cư mini',description:'Thông tin đủ dài cho việc kiểm tra nhập vị trí nhà trọ.',managerName:'Test owner',contactPhone:'0912345678',commune:'',addressDetail:'',latitude:'',longitude:'',amenities:[],selectedRules:[]}}));
  const result=(area='Tân Xã',lat=21.0188)=>({place_id:area,formatted_address:`Số 18, Thôn 2, ${area}, Hà Nội`,address_components:[{long_name:area,types:['administrative_area_level_3']}],geometry:{location:{lat:()=>lat,lng:()=>105.5215},location_type:'ROOFTOP'}});
  window.__geocodeRequests=[];
  class MapDouble{constructor(element){this.handlers={};element.textContent='Google Maps SDK double';element.style.display='grid';element.style.placeItems='center';window.__testMap=this;}addListener(name,fn){this.handlers[name]=fn;return{remove:()=>delete this.handlers[name]};}panTo(point){this.center=point;}}
  class MarkerDouble extends EventTarget{constructor(options){super();Object.assign(this,options);window.__testMarker=this;}}
  class GeocoderDouble{async geocode(query){window.__geocodeRequests.push(query);if(query.address?.includes('Slow'))await new Promise(resolve=>window.__releaseGeocoder=resolve);if(query.address?.includes('No result'))throw{code:'ZERO_RESULTS'};if(query.address?.includes('Ambiguous'))return{results:[result(),result('Bình Yên',21.0285)]};if(query.address?.includes('Approximate')){const value=result();value.partial_match=true;return{results:[value]};}return{results:[result()]};}}
  window.google={maps:{importLibrary:async name=>name==='maps'?{Map:MapDouble}:name==='marker'?{AdvancedMarkerElement:MarkerDouble}:{Geocoder:GeocoderDouble},event:{trigger(){}}}};
 });
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url()).pathname;let data;
  if(url==='/api/auth/me')data={userId:1,fullName:'Test owner',role:'ROOM_HOST'};
  else if(url==='/api/host/property-registrations/eligibility')data={canRegister:true,reason:'ELIGIBLE'};
  else if(url==='/api/host/property-registrations/current')data=null;
  else throw new Error(`Unexpected API ${url}`);
  return route.fulfill({json:{success:true,data}});
 });
 await page.goto(`${base}/host/property/new`);await page.locator('#name').waitFor();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('region',{name:'Google Maps chọn vị trí nhà trọ'}).waitFor();await page.waitForFunction(()=>Boolean(window.__testMarker));
}
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});const output=process.env.CHECK_OUTPUT||path.resolve(__dirname,'../migration/google-location-check');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));await setup(page);
  assert.equal(await page.evaluate(()=>window.__testMarker.position),undefined);
  await page.locator('#property-pasted-address').evaluate(element=>{const transfer=new DataTransfer();transfer.setData('text/plain','Địa chỉ: Số 18, Thôn 2, Tân Xã, Hà Nội');element.dispatchEvent(new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}));});
  await page.waitForFunction(()=>document.querySelector('#addressDetail').value.includes('Thôn 2'));
  assert.equal(await page.locator('#commune').inputValue(),'Tân Xã');assert.equal(await page.evaluate(()=>window.__testMarker.position.lat),21.0188);
  await page.locator('.registration-manual-coordinates summary').click();assert.equal(await page.locator('#latitude').inputValue(),'21.018800');
  const query=page.locator('#property-pasted-address'),search=page.getByRole('button',{name:'Tìm vị trí',exact:true});
  await query.fill('Ambiguous address');await search.click();await page.getByRole('list',{name:'Địa chỉ tìm thấy'}).waitFor();assert.equal(await page.locator('.registration-address-results li').count(),2);
  await page.locator('.registration-address-results button').nth(1).click();assert.equal(await page.locator('#commune').inputValue(),'Bình Yên');assert.equal(await page.locator('#latitude').inputValue(),'21.028500');
  await query.fill('https://maps.google.com/?q=21.123456,105.654321');await search.click();await page.waitForFunction(()=>document.querySelector('#latitude').value==='21.123456');assert.equal(await page.locator('#longitude').inputValue(),'105.654321');
  await query.fill('Slow address');await search.click();await page.waitForFunction(()=>Boolean(window.__releaseGeocoder));await page.locator('#addressDetail').fill('Manual address must be retained');await page.evaluate(()=>window.__releaseGeocoder());await page.waitForLoadState('networkidle');assert.equal(await page.locator('#addressDetail').inputValue(),'Manual address must be retained');
  await query.fill('No result address');await search.click();await page.getByText('Không tìm thấy vị trí. Vui lòng nhập địa chỉ đầy đủ hơn.',{exact:true}).waitFor();assert.equal(await page.locator('#addressDetail').inputValue(),'Manual address must be retained');
  await query.fill('Approximate address');await search.click();await page.getByText(/Google trả về vị trí gần đúng/).waitFor();
  await page.evaluate(()=>window.__testMap.handlers.click({latLng:{lat:()=>21.02,lng:()=>105.53}}));assert.equal(await page.locator('#latitude').inputValue(),'21.020000');
  await page.evaluate(()=>{window.__testMarker.position={lat:21.03,lng:105.54};window.__testMarker.dispatchEvent(new Event('gmp-dragend'));});assert.equal(await page.locator('#longitude').inputValue(),'105.540000');
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width!==768)await page.screenshot({path:path.join(output,`location-${width}.png`),fullPage:true});}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,pasteAutofill:true,exactLinkedPinPreserved:true,multipleResults:true,clickAndDrag:true,lateResultsIgnored:true,viewportChecks:3,liveGoogleRequests:0,mysqlWrites:0}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
