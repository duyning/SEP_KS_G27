const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const output=path.resolve(__dirname,'../../target/map-portals');fs.mkdirSync(output,{recursive:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));let role='ROOM_HOST',nearbyCalls=0;
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','portal-map-check'));
 const form={name:'Nhà trọ bản đồ',propertyType:'Chung cư mini',description:'Nhà trọ có đủ thông tin cho kiểm tra giao diện.',managerName:'Chủ trọ',contactPhone:'0912345678',addressDetail:'Số 12, thôn 2',commune:'Tân Xã',nearby:'Ghi chú chủ trọ',latitude:'21.0188',longitude:'105.5215',amenities:[],selectedRules:[],rules:'',termsAccepted:true};
 const property={...form,propertyId:12,registrationId:77,address:'Số 12, Tân Xã',displayStatus:'VISIBLE',verified:true,roomTypeCount:1,pendingViewingCount:0,photos:[],documents:[],createdAt:'2026-11-01T08:00:00',updatedAt:'2026-11-01T08:00:00'};
 const summary={registrationId:77,name:form.name,address:property.address,ownerName:'Chủ trọ',ownerEmail:'host@example.test',ownerPhone:'0912345678',ownerId:8,status:'PENDING',createdAt:'2026-11-01T08:00:00'};
 const places=[{id:'node/1',name:'Trường học gần trọ',category:'school',latitude:21.019,longitude:105.522,distanceMeters:60},{id:'node/2',name:'Nhà thuốc quanh trọ',category:'pharmacy',latitude:21.0185,longitude:105.521,distanceMeters:70}];
 await page.route(/^https:\/\/tile\.openstreetmap\.(org|de)\//,r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e7efeb"/></svg>'}));
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let data;
  if(url.pathname==='/api/auth/me')data={userId:8,role,fullName:'Người kiểm tra'};
  else if(url.pathname.endsWith('/eligibility'))data={canRegister:true,reason:'ELIGIBLE'};
  else if(url.pathname==='/api/host/property')data={records:[property]};
  else if(url.pathname.endsWith('/location/nearby')){nearbyCalls++;data={places,attribution:'© OSM'};}
  else if(url.pathname.endsWith('/location/resolve')){assert.equal(req.method(),'POST');data={latitude:21.0189,longitude:105.5216,addressDetail:'Địa chỉ được gợi ý',commune:'Thạch Hòa',nearby:'Gần trường học — đường chim bay',places,warnings:[]};}
  else if(url.pathname==='/api/staff/verifications')data=[{...summary,registrationId:1,name:'Hồ sơ cũ',createdAt:'2026-10-01T08:00:00'},{...summary,registrationId:2,name:'Hồ sơ mới',createdAt:'2026-11-05T08:00:00'}];
  else if(url.pathname==='/api/staff/verifications/77')data={summary,submission:form,publishedSubmission:{...form,latitude:'21.00'},photos:[],documents:[],history:[],assignmentVersion:0,canReview:true};
  else if(url.pathname==='/api/staff/dashboard')data={queue:[],activities:[],pendingVerifications:2,pendingReports:0,pendingSupport:0,pendingCommunity:0,activeProperties:1,processedTasks:0};
  else if(url.pathname==='/api/staff/host-registrations')return route.fulfill({status:503,json:{success:false,message:'Counter unavailable in test'}});
  else if(url.pathname==='/api/host-applications')data=null;
  else if(url.pathname.endsWith('/current'))data=null;
  else throw new Error('Unexpected API '+url.pathname);
  await route.fulfill({json:{success:true,data}});
 });
 await page.goto('http://127.0.0.1:5174/host/property');await page.locator('.hp-property-card').first().waitFor();assert.equal(await page.locator('.hp-property-map').count(),0,'Overview map removed');assert.equal(nearbyCalls,0);
 await page.goto('http://127.0.0.1:5174/host/property?id=12');await page.locator('.hp-property-map .nh-map-marker').waitFor();await page.locator('.nh-poi-marker').first().waitFor();
 await page.goto('http://127.0.0.1:5174/host/property/new');await page.locator('#name').fill('Nhà trọ đăng ký');await page.locator('#description').fill('Nhà trọ đầy đủ thông tin, sạch sẽ và thoáng mát.');await page.locator('#managerName').fill('Chủ trọ kiểm thử');await page.locator('#contactPhone').fill('0912345678');await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.locator('#property-pasted-address').fill('https://maps.app.goo.gl/example');await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#addressDetail')?.value==='Địa chỉ được gợi ý');assert.equal(await page.locator('#commune').inputValue(),'Thạch Hòa');assert.ok((await page.locator('#nearby').inputValue()).includes('trường học'));
 role='STAFF';await page.goto('http://127.0.0.1:5174/staff/verifications');await page.locator('table tbody tr').first().waitFor();assert.ok((await page.locator('table tbody tr').first().innerText()).includes('Hồ sơ mới'));assert.equal(await page.getByRole('combobox',{name:'Sắp xếp hồ sơ'}).inputValue(),'NEWEST');await page.getByRole('combobox',{name:'Sắp xếp hồ sơ'}).selectOption('FIFO');assert.ok((await page.locator('table tbody tr').first().innerText()).includes('Hồ sơ cũ'));await page.getByRole('button',{name:'Đặt lại',exact:true}).click();assert.ok((await page.locator('table tbody tr').first().innerText()).includes('Hồ sơ mới'));
 await page.goto('http://127.0.0.1:5174/staff/verifications/detail?id=77');await page.locator('.svd-location .nh-map-marker').waitFor();await page.locator('.svd-location .nh-poi-marker').first().waitFor();
 assert.ok((await page.locator('.svd-location .leaflet-tile').first().getAttribute('src')).includes('tile.openstreetmap.de'));
 assert.doesNotMatch(await page.locator('.svd-page').innerText(),/Vĩ độ|Kinh độ|Tọa độ:/);assert.equal(await page.locator('.svd-location .leaflet-marker-draggable').count(),0,'Staff cannot move submitted location');
 await page.locator('.svd-location').screenshot({path:path.join(output,'staff-location.png')});
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:1100});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Staff fits '+width);}
 assert.deepEqual(errors,[]);console.log('PASS host overview without map; detail map retained; create link autofill; staff read-only shared map without numeric coordinates; newest-first/reset; automatic category icons; shared nearby request; responsive. Fixtures only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
