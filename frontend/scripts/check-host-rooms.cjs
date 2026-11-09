const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const output=process.env.CHECK_OUTPUT||path.resolve(__dirname,'../migration/host-rooms-check');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-only'));
  const property={propertyId:12,name:'Nhà trọ kiểm tra trong trình duyệt',address:'Hòa Lạc, Hà Nội',status:'ACTIVE'};
  const properties=[property,{propertyId:13,name:'Nhà trọ thứ hai',address:'Bình Yên',status:'ACTIVE'}];
  const types=[{roomTypeId:34,propertyId:12,roomType:'Studio khép kín ban công',price:2400000,areaSqm:22,capacity:2,deposit:null,amenities:['airConditioner','waterHeater','balcony','ceilingFan','smartLock','microwave'],images:[]},{roomTypeId:35,propertyId:12,roomType:'Phòng đơn gác lửng',price:1900000,areaSqm:18,capacity:2,deposit:1900000,amenities:['loft','wifi'],images:[]}];
  let rooms=[],writes=0,fail=true,next=1,noTypes=false;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()).pathname,method=req.method();let data;
   if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
   else if(url==='/api/host/property-registrations/eligibility')data={canRegister:false,reason:'HAS_PROPERTY'};
   else if(url==='/api/host/rooms'&&method==='GET')data={properties,roomTypes:noTypes?[]:types,rooms,pendingRegistrationCount:0};
   else if(url==='/api/host/rooms'&&method==='POST'||/\/rooms\/\d+$/.test(url)&&method==='PUT'){
    writes++;const body=req.postDataJSON();const type=types.find(type=>type.roomTypeId===body.roomTypeId);assert.ok(type,'Only real linked types may be selected');
    if(fail)return route.fulfill({status:409,json:{success:false,message:'Browser-only save conflict'}});
    const id=method==='POST'?next++:Number(url.split('/').pop());
    data={...body,roomId:id,propertyId:12,roomType:type.roomType,price:body.customPrice??type.price,areaSqm:type.areaSqm,capacity:type.capacity,deposit:type.deposit,amenities:type.amenities,confirmedAt:'2026-10-22T08:00:00'};
    rooms=[data,...rooms.filter(room=>room.roomId!==id)];
   }else if(/\/rooms\/\d+$/.test(url)&&method==='DELETE'){
    const id=Number(url.split('/').pop());if(rooms.find(room=>room.roomId===id).status==='OCCUPIED')return route.fulfill({status:409,json:{success:false,message:'Browser-only occupied room'}});
    rooms=rooms.filter(room=>room.roomId!==id);data=null;
   }else throw new Error(`Unexpected ${method} ${url}`);
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto('http://127.0.0.1:5173/host/rooms');await page.getByRole('heading',{name:'Hiện tại chưa có phòng thực tế'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Thêm phòng mới',exact:true}).count(),0);
  rooms=types.map((type,index)=>({...type,roomId:index+1,roomNumber:index?'P.201':'P.101',floor:index?'Tầng 2':'Tầng 1',status:index?'OCCUPIED':'VACANT',customPrice:null,confirmedAt:index?null:'2026-10-25T08:00:00'}));fail=false;
  await page.reload();await page.getByRole('heading',{name:'P.101',exact:true}).waitFor();assert.equal(await page.locator('.hr-room-card').count(),2);
  for(const width of [1440,1024,768,375]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if([1440,375].includes(width))await page.screenshot({path:path.join(output,`cards-${width}.png`),fullPage:true});}
  await page.locator('.hr-metric.unconfirmed').click();assert.equal(await page.locator('.hr-room-card').count(),1);assert.equal(await page.getByText('Chưa xác nhận tình trạng',{exact:true}).count(),1);
  await page.locator('.hr-metric.all').click();
  await page.getByRole('button',{name:'Xem thêm 3 tiện nghi của P.101',exact:true}).hover();await page.getByRole('tooltip').waitFor();
  assert.ok((await page.getByRole('tooltip').innerText()).includes('Khóa cửa thông minh'));await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Xem P.101',exact:true}).click();await page.getByRole('dialog',{name:'Phòng P.101',exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog').getByText('Lò vi sóng',{exact:true}).count(),1);await page.keyboard.press('Escape');await page.locator('.hr-detail').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Bảng',exact:true}).click();assert.equal(await page.locator('.hr-table tbody tr').count(),2);
  for(const width of [1440,1024,768,375]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===1440)await page.screenshot({path:path.join(output,'table-1440.png'),fullPage:true});}
  await page.getByLabel('Lọc loại phòng',{exact:true}).selectOption('35');assert.equal(await page.locator('.hr-table tbody tr').count(),1);await page.getByLabel('Lọc loại phòng',{exact:true}).selectOption('ALL');
  await page.getByLabel('Tìm phòng',{exact:true}).fill('not-found');await page.getByRole('heading',{name:'Không có phòng phù hợp'}).waitFor();await page.getByRole('button',{name:'Đặt lại bộ lọc'}).click();
  await page.getByRole('button',{name:'Thẻ',exact:true}).click();await page.getByRole('button',{name:'Xóa P.201',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xóa'}).click();await page.getByText('Browser-only occupied room',{exact:true}).waitFor();await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
  await page.getByRole('button',{name:'Sửa P.201',exact:true}).click();await page.getByRole('radio',{name:'Còn trống',exact:false}).check();await page.getByRole('button',{name:'Lưu phòng',exact:true}).click();await page.getByText('Đã cập nhật phòng thành công.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Xóa P.201',exact:true}).click();await page.getByRole('button',{name:'Xác nhận xóa'}).click();await page.getByText('Đã xóa phòng.',{exact:true}).waitFor();assert.equal(rooms.length,1);
  types.push({...types[0],roomTypeId:36,propertyId:13,roomType:'Loại phòng cơ sở B'});
  rooms.push({...rooms[0],propertyId:13,roomTypeId:36,roomId:100,roomNumber:'B.101',roomType:'Loại phòng cơ sở B'});
  await page.reload();await page.getByRole('combobox',{name:'Chọn nhà trọ',exact:true}).selectOption('13');
  await page.getByRole('heading',{name:'B.101',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'P.101',exact:true}).count(),0);
  await page.getByRole('combobox',{name:'Chọn nhà trọ',exact:true}).selectOption('12');await page.getByRole('heading',{name:'P.101',exact:true}).waitFor();
  noTypes=true;rooms=[];await page.reload();await page.getByRole('heading',{name:'Chưa có loại phòng trong nhà trọ'}).waitFor();assert.equal(await page.getByRole('button',{name:'Thêm phòng mới',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,viewportChecks:11,propertyScoping:true,amenitiesTooltip:true,unconfirmedFilter:true,interceptedSaves:writes,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
