// Browser-only API fixtures; never seed or modify the application database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../../target/host-management-layout');
const before = process.argv.includes('--before');
const zoomOnly = process.argv.includes('--zoom-only');
const inventoryOnly = process.argv.includes('--inventory-only');
const propertyDetailOnly = process.argv.includes('--property-detail-only');
const records = [
  {propertyId:null,registrationId:103,name:'Nhà trọ Green Home',address:'Thôn 2, Tân Xã, Thạch Thất, Hà Nội',displayStatus:'PENDING',verified:false,roomTypeCount:0,totalRooms:null,vacantRooms:null},
  {propertyId:1,registrationId:101,name:'Nhà trọ Minh Phúc – Không gian sống dành cho sinh viên Hòa Lạc',address:'Đường huyện 10, Xã Hạ Bằng, Thạch Thất, Hà Nội, Việt Nam',displayStatus:'VISIBLE',verified:true,roomTypeCount:1,totalRooms:6,vacantRooms:4},
  {propertyId:2,registrationId:102,name:'Nhà trọ An Khang',address:'Thôn 2, Tân Xã, Thạch Thất, Hà Nội',displayStatus:'VISIBLE',verified:true,roomTypeCount:2,totalRooms:10,vacantRooms:8},
].map((record,index)=>({...record,amenities:[],selectedRules:[],photos:[],documents:[],pendingViewingCount:0,createdAt:`2026-11-0${8-index}T09:00:00`,managerName:'Chủ Nhà Trọ',contactPhone:'0912345678'}));
const properties = records.filter(item=>item.propertyId).map(item=>({...item,status:'ACTIVE'}));
const roomTypes = [
 {roomTypeId:11,propertyId:1,roomType:'Studio khép kín có ban công và gác lửng',price:2400000,deposit:2400000,areaSqm:25,capacity:2,totalRooms:3,vacantRooms:2,amenities:['wifi','airConditioner'],photos:[],images:[],description:'Phòng thoáng sáng.'},
 {roomTypeId:12,propertyId:1,roomType:'Phòng tiêu chuẩn',price:1900000,deposit:1900000,areaSqm:20,capacity:2,totalRooms:3,vacantRooms:2,amenities:[],photos:[],images:[],description:''},
];
const rooms = Array.from({length:6},(_,i)=>({roomId:i+1,propertyId:1,roomTypeId:i<3?11:12,roomNumber:`P.${101+i}`,floor:'Tầng 1',status:i<4?'VACANT':'OCCUPIED',price:i<3?2400000:1900000,amenities:[],confirmedAt:'2026-11-08T09:00:00',roomType:i<3?roomTypes[0].roomType:roomTypes[1].roomType}));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','management-ui-check'));
  let empty=false,failed=false,hold=false,multipleFloors=false,release;
  await page.route('http://127.0.0.1:5173/api/**',async route=>{
   const url=new URL(route.request().url()).pathname;
   assert.equal(route.request().method(),'GET','UI check does not write to the database');
   const ok=data=>route.fulfill({json:{success:true,data}});
   if(url==='/api/auth/me')return ok({userId:8,role:'ROOM_HOST',fullName:'Chủ Nhà Trọ Mẫu',email:'host@example.test'});
   if(url.endsWith('/eligibility'))return ok({canRegister:true,reason:'ELIGIBLE'});
   if(hold)await new Promise(resolve=>{release=resolve;});
   if(failed)return route.fulfill({status:503,json:{success:false,message:'Không tải được dữ liệu kiểm thử.'}});
   if(url==='/api/host/property')return ok({records:empty?[]:records});
   const second=new URL(route.request().url()).searchParams.get('propertyId')==='2';
   const scopedTypes=second?[{...roomTypes[0],roomTypeId:21,propertyId:2,roomType:'Studio cơ sở An Khang',totalRooms:1,vacantRooms:1}]:roomTypes;
   const scopedRooms=second?[{...rooms[0],roomId:21,roomTypeId:21,propertyId:2,roomNumber:'AK.201'}]:multipleFloors?rooms.map((room,i)=>({...room,floor:i<4?'Tầng 1':'Tầng 2'})):rooms;
   if(url==='/api/host/room-types')return ok({properties:empty?[]:properties,roomTypes:empty?[]:scopedTypes,pendingRegistrationCount:0});
   if(url==='/api/host/rooms')return ok({properties:empty?[]:properties,roomTypes:empty?[]:scopedTypes,rooms:empty?[]:scopedRooms,pendingRegistrationCount:0});
   if(url==='/api/host/room-types/11')return ok({...roomTypes[0],rooms:rooms.filter(item=>item.roomTypeId===11)});
   throw Error('Unexpected API '+url);
  });
  const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow at '+page.viewportSize().width);
  if(propertyDetailOnly){
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:5173/host/property?registrationId=');
    await page.locator('.hm-prop-card').first().waitFor();
    // Query-only navigation keeps HostPropertyContent mounted: catches hook-order regressions.
    for(let i=0;i<2;i++){
     await page.locator('a[href*="registrationId=103"]').first().click();
     await page.locator('.hm-detail-subbar').waitFor();
     await page.getByRole('heading',{name:'Nhà trọ Green Home',exact:true}).waitFor();
     await fits();
     await page.screenshot({path:path.join(output,`property-registration-detail-${width}.png`),fullPage:true,animations:'disabled'});
     await page.getByRole('link',{name:'Quay lại danh sách nhà trọ',exact:true}).click();
     await page.locator('.hm-prop-card').first().waitFor();
    }
    await page.goto('http://127.0.0.1:5173/host/property?registrationId=999999');
    await page.getByText('Không tìm thấy nhà trọ hoặc hồ sơ này trong danh sách bạn được phép quản lý.',{exact:true}).waitFor();
    await page.getByRole('link',{name:'Quay lại danh sách nhà trọ',exact:true}).click();
    await page.locator('.hm-prop-card').first().waitFor();
    await fits();
   }
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({passed:true,propertyDetailNavigation:true,emptyAndUnknownRegistrationId:true,viewports:2,pageErrors:errors,realDatabaseWrites:0}));
   return;
  }
  const measurements=[];
  for(const width of zoomOnly||inventoryOnly?[]:[1920,1440,1280,1024,768,430,390,375]){
   await page.setViewportSize({width,height:1000});
   for(const tab of ['property','room-types','rooms']){
    await page.goto(`http://127.0.0.1:5173/host/${tab}`);
    await page.locator('.hm-toolbar').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.hm-header-actions a,.hm-header-actions button').first().waitFor();
    await page.screenshot({path:path.join(output,`${before?'before':'after'}-${tab}-${width}.png`),fullPage:true,animations:'disabled'});
    const measure=await page.locator('.hm-toolbar').evaluate(node=>{
     const rect=node.getBoundingClientRect();
     const fields=[...node.querySelectorAll('.hm-search-box,select.hm-select,.hm-seg-group')].filter(el=>el.getBoundingClientRect().width>0).map(el=>{const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label')||el.className,x:r.x,y:r.y,height:r.height,width:r.width}});
     return {x:rect.x,y:rect.y,height:rect.height,fields};
    });
    measurements.push({width,tab,...measure});
    if(before)continue;
    await fits();
    if(width<=430&&tab==='rooms')assert.ok((await page.locator('.hm-search-box').boundingBox()).width>=250,'Room search remains usable on phones');
    const sections=await page.locator('.hm-chrome, .hm-kpi-strip, .hm-surface').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,width:b.width}}));
    for(const section of sections)assert.ok(Math.abs(section.x-sections[0].x)<2&&Math.abs(section.width-sections[0].width)<2,'Sections share the same content axis');
    assert.equal(new URL(await page.locator('.portal-nav-link.active').getAttribute('href'),'http://127.0.0.1:5173').pathname,`/host/${tab}`,'Sidebar follows the current tab route');
    if(tab==='room-types'){
     const cards=await page.locator('.hm-rt-card').evaluateAll(nodes=>nodes.map(n=>({box:n.getBoundingClientRect().toJSON(),badge:n.querySelector('.hm-rt-card-status').getBoundingClientRect().top,price:n.querySelector('.hm-rt-price-line').getBoundingClientRect().top,footer:n.querySelector('footer').getBoundingClientRect().top})));
     for(const a of cards)for(const b of cards.filter(c=>Math.abs(c.box.y-a.box.y)<2)){
      assert.ok(Math.abs(a.box.height-b.box.height)<2,'Room-type cards share height');
      assert.ok(Math.abs(a.badge-b.badge)<2&&Math.abs(a.price-b.price)<2&&Math.abs(a.footer-b.footer)<2,'Room-type badges, prices and actions align');
     }
    }
    for(const field of measure.fields)assert.ok(field.height>=40&&field.height<=44,`${tab} ${width}: equal height ${JSON.stringify(field)}`);
    if(width>=1280&&tab==='property')assert.ok(Math.max(...measure.fields.map(f=>f.y))-Math.min(...measure.fields.map(f=>f.y))<2,'Property toolbar is one row');
    const stats=await page.locator('.hm-kpi-item').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
    assert.ok(Math.max(...stats)-Math.min(...stats)<2,'Summary tiles have equal heights');
    if(tab==='property'){
     const cards=await page.locator('.hm-prop-card').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();const foot=n.querySelector('footer').getBoundingClientRect();return {y:b.y,height:b.height,footer:foot.y,bottom:foot.bottom}}));
     for(const a of cards)for(const b of cards.filter(c=>Math.abs(c.y-a.y)<2)){assert.ok(Math.abs(a.height-b.height)<2,'Cards equal');assert.ok(Math.abs(a.footer-b.footer)<2,'Card actions aligned');}
     await page.getByLabel('Tìm nhà trọ',{exact:true}).fill('không có kết quả này');
     await page.getByRole('heading',{name:'Không tìm thấy nhà trọ phù hợp'}).waitFor();
     await fits();
     await page.getByRole('button',{name:'Đặt lại',exact:true}).click();
     await page.locator('.hm-prop-card').first().waitFor();
     await page.getByRole('button',{name:'Dạng danh sách',exact:true}).click();
     await page.locator('.hm-table').waitFor();await fits();
     await page.screenshot({path:path.join(output,`list-property-${width}.png`),fullPage:true});
     await page.getByRole('button',{name:'Dạng lưới',exact:true}).click();
    }
   }
  }
  if(!zoomOnly&&!inventoryOnly)fs.writeFileSync(path.join(output,before?'measurements-before.json':'measurements-after.json'),JSON.stringify(measurements,null,2));
  if(!before&&!zoomOnly&&!inventoryOnly){
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:5173/host/property');
    await page.locator('.hm-prop-card').first().waitFor();
    await page.locator('.hm-menu-trigger').first().click();
    await page.getByRole('menu').waitFor();await fits();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.hm-menu-trigger').first().evaluate(n=>n===document.activeElement),true);
    await page.getByRole('tab',{name:'Quản lý loại phòng',exact:true}).click();
    await page.locator('.hm-rt-card').first().waitFor();
    await page.getByRole('button',{name:'Dạng bảng dữ liệu',exact:true}).click();
    await page.locator('.hm-table').waitFor();await fits();
    await page.getByRole('button',{name:'Dạng thẻ gọn',exact:true}).click();
    await page.getByRole('button',{name:'Chi tiết',exact:true}).last().click();
    await page.getByRole('dialog').waitFor();await fits();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.hm-sheet-panel')).opacity)>=0.99);
    assert.equal(await page.locator('.hm-sheet-panel').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
    await page.screenshot({path:path.join(output,`drawer-types-${width}.png`)});
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
    await page.getByRole('tab',{name:'Danh sách phòng',exact:true}).click();
    await page.getByRole('button',{name:'Theo tầng',exact:true}).click();
    await page.locator('.hm-room-tile').first().waitFor();
    const filterButton=page.getByRole('button',{name:'Bộ lọc',exact:true});
    if(await filterButton.isVisible())await filterButton.click();
    await page.getByLabel('Lọc theo trạng thái phòng',{exact:true}).selectOption('OCCUPIED');
    assert.equal(await page.locator('.hm-room-tile').count(),2);await fits();
    await page.getByRole('button',{name:'Đặt lại',exact:true}).click();
    const sheet=page.getByRole('dialog');
    if(await sheet.count()) { await page.getByRole('button',{name:'Xem kết quả',exact:true}).click(); await sheet.waitFor({state:'detached'}); }
    else if(await page.getByRole('button',{name:'Đóng bộ lọc',exact:true}).isVisible())await page.getByRole('button',{name:'Đóng bộ lọc',exact:true}).click();
    await page.locator('.hm-room-tile').first().click();
    await page.getByRole('dialog').waitFor();await fits();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.hm-sheet-panel')).opacity)>=0.99);
    assert.equal(await page.locator('.hm-sheet-panel').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
    await page.screenshot({path:path.join(output,`drawer-room-${width}.png`)});
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
    await page.getByRole('button',{name:'Danh sách',exact:true}).click();
    await page.locator('.hm-table').waitFor();await fits();
    for(const tab of ['property','room-types','rooms']){
     empty=true;await page.goto(`http://127.0.0.1:5173/host/${tab}`);
     await page.locator('.host-empty-state').waitFor();await fits();
     await page.screenshot({path:path.join(output,`empty-${tab}-${width}.png`),fullPage:true});
     empty=false;failed=true;await page.reload();
     await page.locator('.portal-state.error').waitFor();await fits();
     failed=false;hold=true;release=null;
     await page.getByRole('button',{name:'Thử lại',exact:true}).click();
     await page.locator('.hm-skeleton-wrap').waitFor();await fits();
     while(!release)await new Promise(resolve=>setTimeout(resolve,10));
     hold=false;release();await page.locator('.hm-toolbar').waitFor();
    }
   }
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.goto('http://127.0.0.1:5173/host/property');await page.locator('.hm-prop-card').first().waitFor();
   await page.getByRole('button',{name:'Dạng danh sách',exact:true}).click();
   await page.getByRole('button',{name:'Dạng lưới',exact:true}).click();
   await page.getByLabel('Tìm nhà trọ',{exact:true}).fill('An Khang');
   await page.locator('.hm-prop-card').filter({hasText:'An Khang'}).waitFor();await fits();
   await page.screenshot({path:path.join(output,'motion-filter-390.png')});
  }
  if(zoomOnly){
   await page.setViewportSize({width:1440,height:1000});
   for(const tab of ['property','room-types','rooms']){
    await page.goto(`http://127.0.0.1:5173/host/${tab}`);await page.locator('.hm-toolbar').waitFor();
    await page.addStyleTag({content:'html { zoom: 2; }'});await fits();
    await page.screenshot({path:path.join(output,`zoom-200-${tab}.png`),fullPage:true});
   }
  }
  if(inventoryOnly){
   multipleFloors=true;
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:5173/host/rooms?propertyId=1');
    await page.getByRole('button',{name:'Theo tầng',exact:true}).click();
    await page.locator('.hm-floor-card').first().waitFor();
    assert.equal(await page.locator('.hm-floor-card').count(),2);
    assert.ok((await page.locator('.hm-floor-card').first().textContent()).includes('2 loại phòng'));
    await page.getByRole('button',{name:'Thu gọn tất cả',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.hm-room-tile').length===0);
    await page.getByRole('button',{name:'Mở tất cả tầng',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.hm-room-tile').length===6);
    await page.locator('.hm-floor-header').first().click();
    await page.waitForFunction(()=>document.querySelectorAll('.hm-room-tile').length===2);
    await page.locator('.hm-floor-header').first().click();
    await page.getByLabel('Tìm phòng',{exact:true}).fill('P.101');
    assert.equal(await page.locator('.hm-room-tile').count(),1);
    await page.getByLabel('Tìm phòng',{exact:true}).fill('');
    await page.locator('#hm-room-filter-toggle').click();
    await page.getByLabel('Lọc theo tầng',{exact:true}).selectOption('Tầng 2');
    assert.equal(await page.locator('.hm-room-tile').count(),2);
    await page.getByLabel('Lọc theo tầng',{exact:true}).selectOption('ALL');
    await page.getByLabel('Lọc theo loại phòng',{exact:true}).selectOption('11');
    assert.equal(await page.locator('.hm-room-tile').count(),3);
    await page.getByLabel('Lọc theo loại phòng',{exact:true}).selectOption('ALL');
    await page.getByLabel('Lọc theo trạng thái phòng',{exact:true}).selectOption('OCCUPIED');
    assert.equal(await page.locator('.hm-room-tile').count(),2);
    await page.getByLabel('Lọc theo trạng thái phòng',{exact:true}).selectOption('ALL');
    await page.getByLabel('Sắp xếp phòng',{exact:true}).selectOption('DESC');
    assert.equal(await page.locator('.hm-tile-number').first().innerText(),'P.104');
    await fits();
    await page.screenshot({path:path.join(output,`filters-open-${width}.png`),fullPage:width>640});
    await page.getByRole('button',{name:'Đặt lại',exact:true}).click();
    await page.keyboard.press('Escape');
    if(width<=640)await page.getByRole('dialog').waitFor({state:'detached'});
    assert.equal(await page.locator('#hm-room-filter-toggle').evaluate(n=>n===document.activeElement),true);
    await page.locator('.hm-prop-select select').selectOption('2');
    await page.locator('.hm-tile-number').filter({hasText:'AK.201'}).waitFor();
    assert.equal(await page.locator('.hm-room-tile').count(),1);
    await page.locator('.hm-prop-select select').selectOption('1');
    await page.locator('.hm-room-tile').first().waitFor();
    await page.getByRole('button',{name:'Thêm phòng',exact:true}).click();
    await page.getByRole('dialog',{name:'Thêm phòng thực tế mới'}).waitFor();await fits();
    await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
    await page.getByRole('tab',{name:'Quản lý loại phòng',exact:true}).click();
    await page.locator('.hm-rt-card').first().waitFor();
    await page.getByLabel('Tìm loại phòng',{exact:true}).fill('tiêu chuẩn');
    assert.equal(await page.locator('.hm-rt-card').count(),1);
    await page.getByLabel('Tìm loại phòng',{exact:true}).fill('');
    const typeFilters=page.locator('#hm-type-filter-toggle');
    if(await typeFilters.count())await typeFilters.click();
    await page.getByLabel('Lọc trạng thái loại phòng',{exact:true}).selectOption('AVAILABLE');
    await page.getByLabel('Sắp xếp loại phòng',{exact:true}).selectOption('PRICE_ASC');
    assert.ok((await page.locator('.hm-rt-card').first().innerText()).includes('1.900.000'));
    await page.getByLabel('Lọc trạng thái loại phòng',{exact:true}).selectOption('ALL');
    await page.getByLabel('Sắp xếp loại phòng',{exact:true}).selectOption('NEWEST');
    if(width<=640){await page.getByRole('button',{name:'Xem kết quả',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});}
    await page.getByRole('button',{name:'Thêm loại phòng',exact:true}).click();
    await page.getByRole('dialog',{name:'Thêm loại phòng mới'}).waitFor();await fits();
    await page.getByRole('button',{name:'Hủy',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
    const downloaded=page.waitForEvent('download');
    await page.getByTitle('Tải file Excel mẫu để chuẩn bị danh sách loại phòng').click();
    const file=await downloaded;
    assert.ok(file.suggestedFilename().endsWith('.xlsx'));
    const ExcelJS=require('../node_modules/exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(await file.path());
    const sheet=workbook.getWorksheet('Loại phòng');
    sheet.getCell('B2').value='Studio nhập kiểm thử';sheet.getCell('B3').value=25;sheet.getCell('B4').value=2;sheet.getCell('B5').value=2400000;
    const roomSheet=workbook.getWorksheet('Danh sách phòng');roomSheet.getCell('A2').value='QA.901';roomSheet.getCell('B2').value='Tầng 9';
    await page.getByTitle('Nhập nhanh thông tin loại phòng từ file Excel').click();
    await page.getByLabel('Chọn file Excel',{exact:true}).setInputFiles({name:'qa-import.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await workbook.xlsx.writeBuffer())});
    await page.getByRole('button',{name:'Đưa vào form kiểm tra',exact:true}).click();
    await page.locator('#rt-roomType').waitFor();assert.equal(await page.locator('#rt-roomType').inputValue(),'Studio nhập kiểm thử');
    await page.getByRole('button',{name:'Hủy',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
    await fits();
   }
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.setViewportSize({width:1440,height:1000});
   await page.goto('http://127.0.0.1:5173/host/rooms?propertyId=1');
   await page.locator('#hm-room-filter-toggle').click();
   await page.getByRole('region',{name:'Bộ lọc phòng',exact:true}).waitFor();
   await page.keyboard.press('Escape');
   await page.locator('#hm-room-filter-toggle').click();
   await page.getByRole('region',{name:'Bộ lọc phòng',exact:true}).waitFor();
   await fits();
   await page.getByRole('button',{name:'Đóng bộ lọc',exact:true}).click();
   await page.getByRole('region',{name:'Bộ lọc phòng',exact:true}).waitFor({state:'detached'});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,before,widths:zoomOnly?1:inventoryOnly?2:8,tabs:3,zoom200:zoomOnly,inventoryFlows:inventoryOnly,realDatabaseWrites:0}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
