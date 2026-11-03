// Isolated browser contracts; no real database reads or writes.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],imageReads=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','detail-layout-test'));
  const base=process.env.HLRCS_TEST_BASE||'http://127.0.0.1:5173';
  const property={propertyId:1,name:'Nhà trọ kiểm thử',address:'Tân Xã',status:'ACTIVE'};
  const type={roomTypeId:11,propertyId:1,roomType:'Studio ban công thoáng sáng',price:2400000,areaSqm:25,capacity:2,deposit:2400000,totalRooms:3,vacantRooms:1,description:'Không gian thoáng sáng, khu vực nấu ăn riêng và cửa sổ lớn.\nThông tin thử nghiệm chỉ dùng trong trình duyệt.',amenities:['airConditioner','waterHeater','balcony','kitchen','wifi','privateBathroom'],electricityPrice:3500,waterPrice:30000,internetPrice:0,servicePrice:null,images:[{imageId:101,fileName:'studio-1.png'},{imageId:102,fileName:'studio-2.png'}],rooms:[{roomId:1,roomNumber:'P.101',floor:'Tầng 1',status:'VACANT',price:2400000},{roomId:2,roomNumber:'P.102',floor:'Tầng 1',status:'OCCUPIED',price:2400000},{roomId:3,roomNumber:'P.201',floor:'Tầng 2',status:'OCCUPIED',price:2500000}]};
  let mode='full';
  await page.route(base+'/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   assert.equal(route.request().method(),'GET');
   if(/\/images\//.test(path)){
    imageReads.push(path);return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64')});
   }
   if(path==='/api/host/room-types/11'&&mode==='error')return route.fulfill({status:503,json:{success:false,message:'Máy chủ đang bận, vui lòng thử lại.'}});
   const detail=mode==='empty'?{...type,images:[],rooms:[],amenities:[],description:'',totalRooms:null,vacantRooms:null,deposit:null}:type;
   const data=path==='/api/auth/me'?{userId:20,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'}:path.endsWith('/eligibility')?{canRegister:true,reason:'ELIGIBLE'}:path==='/api/host/room-types'?{properties:[property],pendingRegistrationCount:0,roomTypes:[type]}:path==='/api/host/room-types/11'?detail:[];
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto(base+'/host/room-types?propertyId=1');
  const trigger=page.getByRole('button',{name:'Chi tiết',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:type.roomType,exact:true});
  await dialog.locator('.rtd-stats').waitFor();
  assert.equal(await dialog.locator('.rtd-stats>div').count(),4);
  assert.equal(await dialog.getByText('Thông tin loại phòng, chi phí và tình trạng các phòng liên kết.',{exact:true}).count(),0);
  assert.equal(await dialog.locator('.rtd-room-table tbody tr').count(),3);
  const fees=dialog.locator('.rtd-fees');
  assert.ok((await fees.innerText()).includes('0 đ'));
  assert.equal(await fees.getByText('Chưa cập nhật',{exact:true}).count(),1);
  assert.equal(await dialog.getByRole('link',{name:'Quản lý phòng',exact:true}).getAttribute('href'),'/host/rooms?propertyId=1&roomTypeId=11');
  await dialog.getByRole('button',{name:'Xem ảnh 2: studio-2.png',exact:true}).click();
  assert.equal(await dialog.locator('.rtd-main-photo img').getAttribute('alt'),'studio-2.png');
  await dialog.getByRole('button',{name:'Phóng to ảnh studio-2.png',exact:true}).click();
  assert.equal(await dialog.getByRole('button',{name:'Thu nhỏ ảnh studio-2.png',exact:true}).getAttribute('aria-pressed'),'true');
  await dialog.getByRole('button',{name:'Thu nhỏ ảnh studio-2.png',exact:true}).click();
  for(const width of [1440,1024,768,375]){
   await page.setViewportSize({width,height:1000});await dialog.locator('.rtd-scroll').evaluate(el=>el.scrollTop=0);
   await page.waitForTimeout(120);
   assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`dialog overflow ${width}`);
   assert.ok(await dialog.locator('.rtd-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`body overflow ${width}`);
   assert.ok(await dialog.locator('.rtd-stats dd').evaluateAll(nodes=>nodes.every(node=>{
    const unit=node.querySelector('small');
    if(!unit)return true;
    const range=document.createRange();range.selectNode(node.firstChild);
    return unit.getBoundingClientRect().bottom<=range.getBoundingClientRect().bottom+3;
   })),`Statistic units stay on the value line at ${width}`);
   const footer=await dialog.locator('.rtd-footer').boundingBox();assert.ok(footer.y>=0&&footer.y+footer.height<=1001);
   for(let i=0;i<12;i++){
    await page.keyboard.press('Tab');
    // Native dialogs can briefly put focus on the browser/body sentinel at the boundary.
    if(await page.evaluate(()=>document.activeElement===document.body))await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'focus stays in modal');
   }
   await dialog.getByRole('button',{name:'Đóng',exact:true}).first().focus();
   await dialog.locator('.rtd-scroll').evaluate(el=>el.scrollTop=0);
   if(process.env.SCREENSHOT_DIR&&[1440,375].includes(width))await page.screenshot({path:require('node:path').join(process.env.SCREENSHOT_DIR,`room-type-detail-${width}.png`)});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.keyboard.press('Escape');await page.locator('.rt-detail').waitFor({state:'detached'});
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  mode='empty';await trigger.click();await dialog.locator('.rtd-stats').waitFor();
  assert.equal(await dialog.getByText('Chưa có hình ảnh loại phòng',{exact:true}).count(),1);
  assert.equal(await dialog.getByText('Chưa có phòng thực tế được liên kết.',{exact:true}).count(),1);
  assert.equal(await dialog.getByText('Chưa cập nhật tiện nghi.',{exact:true}).count(),1);
  await page.keyboard.press('Escape');await page.locator('.rt-detail').waitFor({state:'detached'});
  mode='error';await trigger.click();await page.getByRole('dialog').getByText('Máy chủ đang bận, vui lòng thử lại.',{exact:true}).waitFor();
  mode='full';await page.getByRole('button',{name:'Thử lại',exact:true}).click();await dialog.locator('.rtd-stats').waitFor();
  await dialog.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
  await page.getByRole('dialog',{name:'Chỉnh sửa loại phòng',exact:true}).waitFor();
  assert.ok(imageReads.every(path=>path.startsWith('/api/host/room-types/11/images/')));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,widths:4,gallery:true,focusTrapAndEscape:true,emptyAndRetry:true,editTransition:true,imagesScoped:true,errors:0}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
