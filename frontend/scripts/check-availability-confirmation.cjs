// Browser fixtures only: every application API is intercepted; no MySQL writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.AVAILABILITY_TEST_URL||'http://127.0.0.1:5187';
const output=path.resolve(__dirname,'../../target/availability-browser');
async function main(){
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-fixture-only'));
 const type={roomTypeId:12,propertyId:1,roomType:'Studio kiểm tra độ mới',price:2200000,areaSqm:25,capacity:2,deposit:2200000,amenities:[],images:[],rooms:[],totalRooms:5,vacantRooms:2,createdAt:'2026-11-01T00:00:00Z',availabilityConfirmedAt:null,availabilityConfirmationStatus:'UNCONFIRMED',availabilityStale:false};
 const property={propertyId:1,name:'Nhà trọ kiểm thử',address:'Tân Xã, Hòa Lạc',status:'ACTIVE'};
 let fail=false,writes=0;
 const summary=()=>({propertyId:1,roomTypeId:12,propertyName:property.name,roomTypeName:type.roomType,address:property.address,price:type.price,areaSqm:25,availableRooms:type.vacantRooms,verificationStatus:'APPROVED',amenities:[],availabilityConfirmedAt:type.availabilityConfirmedAt,availabilityConfirmationStatus:type.availabilityConfirmationStatus,availabilityStale:type.availabilityStale});
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());const p=url.pathname;let data;
  if(p==='/api/auth/me')data={userId:1,fullName:'Chủ trọ kiểm thử',role:'ROOM_HOST',capabilities:[]};
  else if(p==='/api/host/room-types/12/availability-confirmation'){
   writes++;assert.equal(route.request().method(),'POST');
   if(fail)return route.fulfill({status:500,json:{success:false,message:'Lỗi kiểm thử — thử lại'}});
   await new Promise(r=>setTimeout(r,250));
   Object.assign(type,{availabilityConfirmedAt:new Date().toISOString(),availabilityConfirmationStatus:'CURRENT',availabilityStale:false});data=type;
  }
  else if(p==='/api/host/room-types')data={properties:[property],pendingRegistrationCount:0,roomTypes:[type]};
  else if(p==='/api/host/room-types/12')data=type;
  else if(p==='/api/public/properties')data=[{...property,commune:'Tân Xã',description:'Nhà trọ kiểm thử',photos:[],amenities:[],rules:[],minPrice:type.price,totalRooms:type.totalRooms,vacantRooms:type.vacantRooms,roomTypes:[{...type,name:type.roomType,area:type.areaSqm}]}];
  else if(p==='/api/properties/search')data={items:[summary()],page:0,size:12,totalElements:1,totalPages:1};
  else if(p.endsWith('/details'))data={summary:summary(),gallery:[],amenities:[],propertyAmenities:[],selectedRules:[],similar:[],roomTypes:[summary()],reviews:{totalReviews:0,averageRating:null,ratingCounts:[0,0,0,0,0],latest:[]},publicContact:null};
  else if(p==='/api/favorites')data={items:[],page:0,size:12,totalElements:0,totalPages:0};
  else if(p.includes('/notifications'))data={items:[],unreadCount:0,totalElements:0};
  else data={items:[],totalElements:0,totalPages:0};
  return route.fulfill({json:{success:true,data}});
 });
 try{
  for(const width of [375,768,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.goto(base+'/host/room-types');
   const trigger=page.getByRole('button',{name:'Xác nhận tình trạng phòng',exact:true});await trigger.waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,`overflow ${width}`);
   await trigger.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
   assert.equal(await page.getByRole('dialog').isVisible(),true);
   await page.screenshot({path:path.join(output,`host-confirm-${width}.png`),fullPage:true});
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'focus restored');
  }
  // 200% equivalent content viewport and explicit CSS zoom smoke check.
  await page.evaluate(()=>{document.documentElement.style.zoom='2';});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'200% zoom overflow');
  await page.evaluate(()=>{document.documentElement.style.zoom='';});
  await page.getByRole('button',{name:'Xác nhận tình trạng phòng',exact:true}).click();
  fail=true;await page.getByRole('button',{name:'Thông tin hiện tại chính xác',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Lỗi kiểm thử'}).waitFor();assert.equal(type.availabilityConfirmedAt,null);
  fail=false;await page.getByRole('button',{name:'Thông tin hiện tại chính xác',exact:true}).dblclick();
  await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(writes,2,'one failed and one successful request');
  await page.reload();await page.getByText(/Đã xác nhận:/).waitFor();
  Object.assign(type,{availabilityConfirmedAt:'2026-01-01T13:00:00Z',availabilityConfirmationStatus:'STALE',availabilityStale:true});
  await page.reload();await page.getByText(/Quá 7 ngày chưa xác nhận/).waitFor();
  await page.screenshot({path:path.join(output,'host-stale-1440.png'),fullPage:true});
  await page.getByRole('button',{name:'Dạng bảng dữ liệu',exact:true}).click();
  await page.getByRole('button',{name:'Xác nhận tình trạng phòng',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.screenshot({path:path.join(output,'host-table-1440.png'),fullPage:true});
  await page.addInitScript(()=>sessionStorage.removeItem('hlrcs_access_token'));
  for(const width of [375,768,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.goto(base+'/search');
   await page.getByText(/Quá 7 ngày chưa xác nhận/).first().waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,`search overflow ${width}`);
   await page.screenshot({path:path.join(output,`search-stale-${width}.png`),fullPage:true});
  }
  await page.goto(base+'/properties/detail?propertyId=1&roomTypeId=12');await page.getByText(/Quá 7 ngày chưa xác nhận/).first().waitFor();
  await page.screenshot({path:path.join(output,'detail-stale-1440.png'),fullPage:true});
  await page.goto(base+'/');await page.getByText(/Quá 7 ngày chưa xác nhận/).first().waitFor();
  await page.screenshot({path:path.join(output,'home-stale-1440.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: host confirmation, failure/retry, duplicate protection, reload, stale search/detail, four widths, keyboard/focus and zoom.');
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
