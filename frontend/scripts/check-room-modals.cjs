// Browser contracts only: no production database operations.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','room-modals-test'));
  const base=process.env.HLRCS_TEST_BASE||'http://127.0.0.1:5173';
  const property={propertyId:12,name:'Nhà trọ kiểm thử',address:'Tân Xã',status:'ACTIVE'};
  const types=[{roomTypeId:34,propertyId:12,roomType:'Studio ban công',price:2400000,areaSqm:25,capacity:2,deposit:null,amenities:['airConditioner','waterHeater','balcony','ceilingFan','smartLock','microwave'],images:[]},{roomTypeId:35,propertyId:12,roomType:'Phòng gác lửng',price:1900000,areaSqm:20,capacity:1,deposit:1900000,amenities:['loft','wifi'],images:[]}];
  let rooms=[{...types[0],roomId:1,roomNumber:'P.101',floor:'Tầng 1',status:'OCCUPIED',customPrice:null,confirmedAt:null}],writes=0,reject=true;
  await page.route(base+'/api/**',route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   if(req.method()==='PUT'){
    writes++;const fields=req.postDataJSON();assert.equal(path,'/api/host/rooms/1');assert.equal(fields.roomTypeId,35);assert.equal(fields.customPrice,2850000);assert.equal(fields.roomNumber,'P.109');
    if(reject)return route.fulfill({status:409,json:{success:false,message:'Phòng vừa được cập nhật. Vui lòng thử lại.'}});
    rooms=[{...types[1],...fields,roomId:1,price:fields.customPrice,confirmedAt:'2026-11-03T10:00:00'}];
    return route.fulfill({json:{success:true,data:rooms[0]}});
   }
   const data=path==='/api/auth/me'?{userId:20,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'}:path==='/api/host/rooms'?{properties:[property],roomTypes:types,rooms,pendingRegistrationCount:0}:path.endsWith('/eligibility')?{canRegister:true,reason:'ELIGIBLE'}:[];
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto(base+'/host/rooms?propertyId=12');
  const trigger=page.getByRole('button',{name:'Xem P.101',exact:true});await trigger.click();
  const detail=page.getByRole('dialog',{name:'Phòng P.101',exact:true});await detail.waitFor();
  assert.equal(await detail.getByText('Chưa xác nhận',{exact:true}).count(),1);
  assert.equal(await detail.getByText('Lò vi sóng',{exact:true}).count(),1);
  assert.equal(await detail.getByText('Theo loại phòng',{exact:true}).count(),1);
  const inspect=async(dialog,prefix)=>{
   for(const width of [1440,1024,768,375]){
    await page.setViewportSize({width,height:1000});await dialog.locator('.rm-scroll').evaluate(el=>el.scrollTop=0);
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${prefix} overflow ${width}`);
    assert.ok(await dialog.locator('.rm-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${prefix} content overflow ${width}`);
    const footer=await dialog.locator('.rm-footer').boundingBox();assert.ok(footer.y>=0&&footer.y+footer.height<=1001);
    for(let i=0;i<8;i++){await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement===document.body))await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));}
    await dialog.getByRole('button',{name:'Đóng',exact:true}).first().focus();await dialog.locator('.rm-scroll').evaluate(el=>el.scrollTop=0);
    if(process.env.SCREENSHOT_DIR&&[1440,375].includes(width))await page.screenshot({path:require('node:path').join(process.env.SCREENSHOT_DIR,`${prefix}-${width}.png`)});
   }
  };
  await inspect(detail,'room-detail');
  await page.keyboard.press('Escape');await page.locator('.hr-detail').waitFor({state:'detached'});assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  await trigger.click();await detail.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'Cập nhật phòng thực tế',exact:true});await editor.waitFor();
  assert.deepEqual(await editor.locator('#room-roomTypeId option').evaluateAll(options=>options.map(o=>o.value)),['','34','35']);
  await editor.locator('#room-roomTypeId').selectOption('35');
  assert.ok((await editor.locator('.rm-inherited').innerText()).includes('1.900.000 đ'));
  await editor.getByRole('checkbox',{name:/Đặt giá riêng cho phòng/}).check();
  await editor.locator('#room-customPrice').fill('2850000');
  assert.equal(await editor.locator('.rm-effective-price output').textContent(),'2.850.000 đ / tháng');
  await inspect(editor,'room-edit');
  await editor.locator('#room-roomNumber').fill('');await editor.getByRole('button',{name:'Lưu phòng',exact:true}).click();assert.equal(writes,0);assert.equal(await editor.locator('#room-roomNumber').getAttribute('aria-invalid'),'true');
  await editor.locator('#room-roomNumber').fill('P.109');await editor.locator('#room-customPrice').fill('0');await editor.getByRole('button',{name:'Lưu phòng',exact:true}).click();assert.equal(writes,0);
  await editor.locator('#room-customPrice').fill('2850000');await editor.getByRole('radio',{name:/Còn trống/}).check();
  await editor.getByRole('button',{name:'Lưu phòng',exact:true}).click();await editor.getByText('Phòng vừa được cập nhật. Vui lòng thử lại.',{exact:true}).waitFor();assert.equal(await editor.locator('#room-roomNumber').inputValue(),'P.109');assert.equal(await editor.locator('#room-customPrice').inputValue(),'2850000');
  reject=false;await editor.getByRole('button',{name:'Lưu phòng',exact:true}).click();await page.getByText('Đã cập nhật phòng thành công.',{exact:true}).waitFor();await page.getByRole('heading',{name:'P.109',exact:true}).waitFor();
  assert.equal(writes,2);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,modalWidthChecks:8,keyboardAndEscape:true,customPrice:true,validation:true,errorPreservesFields:true,detailToEdit:true,errors:0}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
