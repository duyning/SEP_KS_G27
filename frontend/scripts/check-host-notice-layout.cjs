// Layout regression with browser-only API fixtures; no database writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTICE_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','notice-layout-fixture'));
 const root={propertyId:12,registrationId:10,name:'Nhà trọ Minh Phúc',address:'Đường huyện 10, xã Hạ Bằng, Hà Nội',displayStatus:'INACTIVE',verified:false,amenities:[],selectedRules:[],photos:[],documents:[],roomTypeCount:1,totalRooms:6,vacantRooms:4,pendingViewingCount:0,reverificationRequired:true,reverificationReasons:['Giấy tờ quyền sở hữu / quyền quản lý'],changeRequest:{registrationId:7,status:'PENDING',requestedFields:[],fieldNotes:{},reasonNote:'Đã gửi tái xác minh thông tin quan trọng.'}};
 const records=[{...root,propertyId:null,registrationId:11,name:'Nhà trọ Green Home',displayStatus:'PENDING',reverificationRequired:false,reverificationReasons:[],changeRequest:null,totalRooms:null,vacantRooms:null},root,{...root,propertyId:13,registrationId:12,name:'Nhà trọ An Khang',displayStatus:'VISIBLE',verified:true,reverificationRequired:false,reverificationReasons:[],changeRequest:null}];
 const type={roomTypeId:34,propertyId:12,roomType:'Studio tiêu chuẩn',price:3200000,areaSqm:25,capacity:2,deposit:3200000,amenities:[],images:[],rooms:[],totalRooms:5,vacantRooms:3,availabilityConfirmedAt:null,availabilityConfirmationStatus:'UNCONFIRMED',availabilityStale:false};
 await page.route(base+'/api/**',route=>{const p=new URL(route.request().url()).pathname;let data;
  if(p==='/api/auth/me')data={userId:1,fullName:'Chủ Nhà Trọ Mẫu',role:'ROOM_HOST'};
  else if(p==='/api/host/property')data={records};
  else if(p==='/api/host/room-types')data={properties:[{propertyId:12,name:'Nhà trọ An Khang',address:'Tân Xã',status:'ACTIVE'}],roomTypes:[type,{...type,roomTypeId:35,roomType:'Studio Ban công',price:2200000,availabilityConfirmedAt:'2026-11-11T15:46:00Z',availabilityConfirmationStatus:'CURRENT'}],pendingRegistrationCount:0};
  else data={items:[],total:0,unreadCount:0};
  return route.fulfill({json:{success:true,data}});
 });
 const output=path.resolve(__dirname,'../../target/host-notice-layout');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1080});await page.goto(base+'/host/property');await page.locator('.hm-prop-card').nth(2).waitFor();
  const titles=await page.locator('.hm-prop-name').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().top));
  if(width>=1440)assert.ok(Math.max(...titles)-Math.min(...titles)<2,'Property names align in the three-card row');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.screenshot({path:path.join(output,`properties-${width}.png`),fullPage:true});
  await page.goto(base+'/host/property?id=12');await page.locator('.hp-detail').waitFor();
  assert.equal(await page.locator('.hp-detail .reverification-notice').count(),1);assert.equal(await page.locator('.hp-review-feedback').count(),0);
  assert.match(await page.locator('.reverification-notice').innerText(),/Đề nghị #7/);
  await page.screenshot({path:path.join(output,`property-detail-${width}.png`),fullPage:true});
  await page.goto(base+'/host/room-types');await page.locator('.host-availability-confirmation').nth(1).waitFor();
  assert.equal(await page.getByRole('button',{name:'Xác nhận tình trạng phòng',exact:true}).count(),2);
  const panel=page.locator('.host-availability-confirmation[data-state=UNCONFIRMED]');assert.match(await panel.innerText(),/Chưa được xác nhận/);
  assert.equal(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  const cards=await page.locator('.hm-rt-card').evaluateAll(els=>els.map(el=>({top:el.getBoundingClientRect().top,parts:['.hm-rt-thumb-trigger','.hm-rt-card-title','.hm-rt-card-status','.hm-rt-price-line','.hm-rt-spec-line','.hm-rt-inventory','.host-availability-confirmation','.host-availability-label','.host-availability-copy>strong','.host-availability-button','.hm-rt-card-footer'].map(selector=>{const rect=el.querySelector(selector).getBoundingClientRect();return {selector,top:rect.top,height:rect.height};})})));
  if(Math.abs(cards[0].top-cards[1].top)<2)for(let i=0;i<cards[0].parts.length;i++){
   assert.ok(Math.abs(cards[0].parts[i].top-cards[1].parts[i].top)<2,`${cards[0].parts[i].selector} aligns at ${width}`);
  }
  await page.screenshot({path:path.join(output,`room-types-${width}.png`),fullPage:true});
 }
 await page.evaluate(()=>document.documentElement.style.zoom='2');
 assert.equal(await page.locator('.host-availability-confirmation').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 assert.deepEqual(errors,[]);console.log('PASS: aligned property names, one detail notice with proposal metadata, two confirmation panels, 375–1920px and zoom.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

