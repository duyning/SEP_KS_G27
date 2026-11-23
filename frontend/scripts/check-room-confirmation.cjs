const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.AVAILABILITY_TEST_URL||'http://127.0.0.1:5187';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','room-fixture-only'));
 const property={propertyId:12,name:'Nhà trọ kiểm thử',address:'Tân Xã',status:'ACTIVE'};
 const type={roomTypeId:34,propertyId:12,roomType:'Studio Ban công',price:2200000,areaSqm:25,capacity:2,deposit:2200000,amenities:[],images:[],totalRooms:1,vacantRooms:1};
 let room={...type,roomId:1,roomNumber:'P.204',floor:'Tầng 2',status:'VACANT',customPrice:null,confirmedAt:'2026-10-25T22:39:00',confirmationStatus:'STALE',confirmationStale:true};let writes=0;
 await page.route('**/api/**',async route=>{
 const p=new URL(route.request().url()).pathname;let data;
 if(p==='/api/auth/me')data={userId:1,fullName:'Chủ trọ kiểm thử',role:'ROOM_HOST'};
 else if(p==='/api/host/rooms/1'&&route.request().method()==='PUT'){
  writes++;assert.equal(route.request().postDataJSON().status,'VACANT');
  room={...room,confirmedAt:'2026-11-11T22:45:00',confirmationStatus:'CURRENT',confirmationStale:false};data=room;
 }else if(p==='/api/host/rooms')data={properties:[property],roomTypes:[type],rooms:[room],pendingRegistrationCount:0};
 else if(p==='/api/host/room-types')data={properties:[property],roomTypes:[type],pendingRegistrationCount:0};
 else if(p==='/api/host/room-types/34')data=type;
 else data={items:[],total:0,unreadCount:0};
 await route.fulfill({json:{success:true,data}});
 });
 await page.goto(base+'/host/rooms?propertyId=12');await page.getByRole('button',{name:/^Phòng P\.204 ·/}).click();
 const dialog=page.getByRole('dialog',{name:'Phòng P.204',exact:true});await dialog.waitFor();
 await dialog.getByText(/Quá 7 ngày chưa xác nhận · Lần cuối:/).waitFor();
 const button=dialog.getByRole('button',{name:/Còn trống/});assert.equal(await button.isEnabled(),true);
 const output=path.resolve(__dirname,'../../target/availability-browser');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,1440]){
  await page.setViewportSize({width,height:1000});assert.equal(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  await dialog.getByText(/Quá 7 ngày chưa xác nhận · Lần cuối:/).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,`room-204-stale-${width}.png`)});
 }
 await button.click();await dialog.getByText(/Đã xác nhận:/).waitFor();assert.equal(writes,1);assert.equal(room.status,'VACANT');
 assert.equal(await button.isDisabled(),true);assert.equal(await dialog.getByText(/Quá 7 ngày chưa xác nhận/).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: P.204 stale warning, 25/10 Vietnam date, mobile/desktop, re-confirm same status without changing vacancy.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
