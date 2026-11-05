const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const output=path.resolve(__dirname,'../../target/property-location');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','location-browser-test'));
  const old={name:'Nhà trọ cập nhật',description:'Nhà trọ sạch sẽ với các tiện ích đã được khai báo.',propertyType:'Chung cư mini',managerName:'Chủ trọ',contactPhone:'0912345678',zaloPhone:'',addressDetail:'Số 12 ngõ 10 Tân Xã',commune:'Tân Xã',nearby:'Ghi chú cũ',latitude:'21.0188',longitude:'105.5215',amenities:[],selectedRules:[],rules:''};
  const place={id:'node/1',name:'Chợ Tân Xã',category:'marketplace',latitude:21.0125,longitude:105.5253,distanceMeters:20};
  const result={latitude:21.0124167,longitude:105.5252892,addressDetail:'Địa chỉ gợi ý mới từ OSM',commune:'Thạch Hòa',nearby:'Gần Chợ Tân Xã (20 m) — khoảng cách đường chim bay',places:[place],warnings:[]};
  let mode='full',locked=false,version=1,calls=0;
  await page.route(/^https:\/\/tile\.openstreetmap\.(org|de)\//,r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e7efeb"/></svg>'}));
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url());let data;
   if(url.pathname==='/api/auth/me')data={userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'};
   else if(url.pathname.endsWith('/eligibility'))data={canRegister:true,reason:'ELIGIBLE'};
   else if(url.pathname.endsWith('/77/edit'))data={registrationId:77,propertyId:12,mode:'CHANGE_REQUEST',status:'APPROVED',versionToken:String(version),requestedFields:[],editableFields:locked?['latitude','longitude']:['latitude','longitude','addressDetail','commune','nearby'],photos:[],documents:[],details:old};
   else if(url.pathname.endsWith('/location/resolve')){
    assert.equal(req.method(),'POST');calls++;assert.ok(req.postDataJSON().input);
    if(mode==='error')return route.fulfill({status:502,json:{success:false,message:'Không kết nối được nguồn gợi ý'}});
    if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,500));
    data=mode==='partial'?{...result,addressDetail:null,commune:null,nearby:null,warnings:['Nguồn chưa có địa chỉ.']}:result;
   }else if(url.pathname.endsWith('/location/nearby')){assert.equal(req.method(),'GET');data={places:[place],attribution:'© OpenStreetMap contributors'};}
   else throw new Error(`Unexpected request ${req.method()} ${url.pathname}`);
   await route.fulfill({json:{success:true,data}}).catch(()=>{});
  });
  const open=async()=>{await page.goto('http://127.0.0.1:5174/host/property/edit?registrationId=77');await page.locator('.leaflet-marker-icon').waitFor();};
  const draft=async()=>{await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();return page.evaluate(()=>JSON.parse(sessionStorage.getItem('hlrcs:property-edit:8:77')).fields);};
  await open();assert.equal(await page.locator('#latitude,#longitude').count(),0);
  assert.equal(calls,0,'No automatic reverse lookup on mount');
  await page.locator('#property-pasted-address').fill('https://maps.app.goo.gl/pu9effnFUHcLdfEc8');
  await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#addressDetail')?.value==='Địa chỉ gợi ý mới từ OSM');
  assert.equal(await page.locator('#commune').inputValue(),'Thạch Hòa');assert.ok((await page.locator('#nearby').inputValue()).includes('đường chim bay'));
  const before=await draft();assert.equal(before.latitude,String(result.latitude));assert.equal(before.longitude,String(result.longitude));
  await page.getByRole('button',{name:'Tiện ích quanh ghim nhà trọ',exact:true}).click();await page.locator('.nh-nearby-panel li').waitFor();
  assert.ok((await page.locator('.nh-nearby-panel').innerText()).includes('Chợ Tân Xã'));assert.equal(await page.locator('.nh-poi-marker').count(),1);
  const after=await draft();assert.equal(after.latitude,before.latitude,'Nearby controls do not move picker');assert.equal(after.longitude,before.longitude);
  for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Fits ${width}`);}
  await page.getByRole('button',{name:'Đóng tiện ích lân cận',exact:true}).click();
  await page.locator('.hpe-panel').filter({has:page.getByRole('heading',{name:'2. Vị trí nhà trọ',exact:true})}).screenshot({path:path.join(output,'location-edit.png')});
  mode='error';await page.getByRole('button',{name:'Điền thông tin từ ghim hiện tại',exact:true}).click();await page.getByRole('alert').filter({hasText:'Không kết nối'}).waitFor();
  assert.equal(await page.locator('#addressDetail').inputValue(),result.addressDetail);
  mode='partial';await page.getByRole('button',{name:'Điền thông tin từ ghim hiện tại',exact:true}).click();await page.getByRole('status').filter({hasText:'Nguồn chưa có địa chỉ'}).waitFor();assert.equal(await page.locator('#nearby').inputValue(),result.nearby);
  mode='delay';await page.getByRole('button',{name:'Điền thông tin từ ghim hiện tại',exact:true}).click();await page.locator('#addressDetail').fill('Địa chỉ chủ trọ sửa trong lúc chờ');await page.waitForTimeout(650);assert.equal(await page.locator('#addressDetail').inputValue(),'Địa chỉ chủ trọ sửa trong lúc chờ');
  locked=true;mode='full';version++;await open();await page.locator('#property-pasted-address').fill('21.0124167,105.5252892');await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã đặt ghim và điền'}).waitFor();
  assert.equal(await page.locator('#addressDetail').inputValue(),old.addressDetail);assert.equal(await page.locator('#commune').inputValue(),old.commune);assert.equal(await page.locator('#nearby').inputValue(),old.nearby);assert.equal(await page.locator('#addressDetail').isDisabled(),true);
  const kept=await draft();assert.equal(kept.latitude,String(result.latitude));assert.equal(kept.name,old.name);
  assert.deepEqual(errors,[]);console.log('PASS edit link autofill; internal coordinates; explicit nearby places; no pin movement from controls; provider error/partial/race; locked fields; responsive widths. Fixtures, no real property writes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
