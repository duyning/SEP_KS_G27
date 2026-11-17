// Browser-only fixtures. PATCH requests are intercepted; no application data is changed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ROOM_BULK_TEST_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],writes=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','bulk-room-fixture'));
 const property={propertyId:12,name:'Nhà trọ kiểm thử',address:'Hạ Bằng, Hà Nội',status:'ACTIVE'};
 const type={roomTypeId:34,propertyId:12,roomType:'Studio tiêu chuẩn',price:2200000,areaSqm:25,capacity:2,amenities:[],totalRooms:3,vacantRooms:3};
 let rows=[],fail=false;
 const reset=()=>rows=[1,2,3].map(n=>({roomId:n,propertyId:12,roomTypeId:34,roomType:type.roomType,roomNumber:`P.10${n}`,floor:'Tầng 1',status:'VACANT',price:2200000,customPrice:null,amenities:[],confirmedAt:'2026-11-14T10:00:00',leaseStartDate:null,leaseEndDate:null}));
 await page.route('**/api/**',route=>{
  const p=new URL(route.request().url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:1,fullName:'Chủ trọ kiểm thử',role:'ROOM_HOST'});
  if(p==='/api/host/rooms/status'){
   assert.equal(route.request().method(),'PATCH');const body=JSON.parse(route.request().postData());writes.push(body);
   if(fail)return route.fulfill({status:503,json:{success:false,message:'Lỗi kiểm thử, chưa lưu thay đổi.'}});
   rows=rows.map(room=>body.roomIds.includes(room.roomId)?{...room,status:body.status,leaseStartDate:body.leaseStartDate,leaseEndDate:body.leaseEndDate}:room);
   return ok(rows.filter(room=>body.roomIds.includes(room.roomId)));
  }
  assert.equal(route.request().method(),'GET','Only intercepted bulk status writes are allowed');
  if(p==='/api/host/rooms')return ok({properties:[property],roomTypes:[type],rooms:rows,pendingRegistrationCount:0});
  return ok({items:[],unreadCount:0,totalElements:0});
 });
 const output=path.resolve(__dirname,'../../target/room-bulk-status');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440]){
  reset();await page.setViewportSize({width,height:1000});await page.goto(base+'/host/rooms');
  const select=n=>page.getByRole('checkbox',{name:`Chọn phòng P.10${n}`,exact:true});
  await select(1).check();await select(2).check();
  assert.equal(await page.getByRole('checkbox',{name:'Chọn tất cả phòng trong kết quả lọc'}).evaluate(input=>input.indeterminate),true);
  await page.getByRole('button',{name:'Danh sách',exact:true}).click();
  assert.equal(await select(1).isChecked(),true);assert.equal(await select(2).isChecked(),true);
  const search=page.getByPlaceholder('Tìm số phòng, loại phòng...');await search.fill('P.103');
  await page.getByRole('button',{name:'Đổi trạng thái (0)',exact:true}).waitFor();assert.equal(await select(3).isChecked(),false);
  await page.getByRole('checkbox',{name:'Chọn tất cả phòng trong kết quả lọc'}).check();assert.equal(await select(3).isChecked(),true);
  await search.fill('');await page.getByRole('button',{name:'Đổi trạng thái (0)',exact:true}).waitFor();
  await select(1).check();await select(2).check();await page.getByRole('button',{name:'Đổi trạng thái (2)',exact:true}).click();
  let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Cập nhật 2 phòng',exact:true}).click();
  assert.equal(await page.locator('#bulk-leaseStartDate').getAttribute('aria-invalid'),'true');
  await page.locator('#bulk-leaseStartDate').fill('2026-11-14');await page.locator('#bulk-leaseEndDate').fill('2026-11-13');
  await dialog.getByRole('button',{name:'Cập nhật 2 phòng',exact:true}).click();await page.getByText('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',{exact:true}).waitFor();
  await page.locator('#bulk-leaseEndDate').fill('2027-11-14');
  if(width===375){fail=true;await dialog.getByRole('button',{name:'Cập nhật 2 phòng',exact:true}).click();await page.getByText('Lỗi kiểm thử, chưa lưu thay đổi.',{exact:true}).waitFor();assert.equal(await page.locator('#bulk-leaseEndDate').inputValue(),'2027-11-14');fail=false;}
  assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
  await page.screenshot({path:path.join(output,`modal-${width}.png`),fullPage:true});
  if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+2));await page.evaluate(()=>document.documentElement.style.zoom='');}
  await dialog.getByRole('button',{name:'Cập nhật 2 phòng',exact:true}).click();await dialog.waitFor({state:'detached'});
  assert.deepEqual(writes.at(-1),{propertyId:12,roomIds:[1,2],status:'OCCUPIED',leaseStartDate:'2026-11-14',leaseEndDate:'2027-11-14'});
  assert.equal(rows[2].status,'VACANT');assert.equal(await select(1).isChecked(),false);
  await page.getByRole('button',{name:'P.101',exact:true}).click();await page.getByText('Ngày bắt đầu ở',{exact:true}).waitFor();await page.getByText('14/11/2027',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Đóng',exact:true}).last().click();
  await select(1).check();await select(2).check();await page.getByRole('button',{name:'Đổi trạng thái (2)',exact:true}).click();
  await page.locator('#bulk-room-status').selectOption('VACANT');assert.equal(await page.locator('#bulk-leaseStartDate').count(),0);
  dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Cập nhật 2 phòng',exact:true}).click();await dialog.waitFor({state:'detached'});
  assert.equal(rows[0].leaseStartDate,null);assert.equal(rows[1].status,'VACANT');
  await page.screenshot({path:path.join(output,`list-${width}.png`),fullPage:true});
 }
 // The single-room quick action must collect dates too; editor shows persisted values.
 await page.getByRole('button',{name:'P.101',exact:true}).click();
 await page.locator('.hm-quick-choice.is-occupied').click();
 await page.getByRole('heading',{name:'Cập nhật trạng thái 1 phòng',exact:true}).waitFor();
 await page.locator('#bulk-leaseStartDate').fill('2026-11-14');await page.locator('#bulk-leaseEndDate').fill('2027-11-14');
 await page.getByRole('button',{name:'Cập nhật 1 phòng',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
 await page.getByRole('button',{name:'P.101',exact:true}).click();
 await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
 await page.locator('#editor-leaseStartDate').waitFor();
 assert.equal(await page.locator('#editor-leaseEndDate').inputValue(),'2027-11-14');
 await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('PASS: floor/table selection, filtered select-all/reset, required/reversed dates, error preservation/retry, atomic PATCH, single quick action, editor dates, details, vacancy clears dates, four widths and 200% zoom. Fixtures only.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
