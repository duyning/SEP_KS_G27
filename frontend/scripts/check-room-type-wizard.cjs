const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const output=path.resolve(__dirname,'../migration/room-type-wizard-check');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-only'));
  const property={propertyId:12,name:'Nhà trọ kiểm tra trong trình duyệt',address:'Hòa Lạc',status:'ACTIVE'};
  let types=[],writes=0,fail=true;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()).pathname;let data;
   if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
   else if(url==='/api/host/property-registrations/eligibility')data={canRegister:false,reason:'HAS_PROPERTY'};
   else if(url==='/api/host/room-types'&&req.method()==='GET')data={properties:[property],pendingRegistrationCount:0,roomTypes:types};
   else if(url==='/api/host/room-types/with-rooms'&&req.method()==='POST'){
    writes++;const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();
    const details=JSON.parse(await form.get('details').text()),layout=JSON.parse(await form.get('layout').text());
    assert.equal(details.propertyId,12);assert.equal(details.roomType,'Loại phòng mới');assert.equal(form.getAll('photos').length,1);
    assert.deepEqual(layout.rooms,[{roomNumber:'P.301',floor:'Tầng 3'},{roomNumber:'P.399',floor:'Tầng 3'},{roomNumber:'P.401',floor:'Tầng 4'},{roomNumber:'P.500',floor:'Tầng 5'}]);
    if(fail)return route.fulfill({status:409,json:{success:false,message:'Xung đột kiểm thử, dữ liệu chưa lưu'}});
    data={...details,roomTypeId:34,deposit:details.price,images:[],totalRooms:4,vacantRooms:4,rooms:layout.rooms.map((room,index)=>({...room,roomId:index+1,roomTypeId:34,propertyId:12,status:'VACANT',price:details.price}))};types.push(data);
   }else throw new Error(`Unexpected API ${req.method()} ${url}`);
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto('http://127.0.0.1:5173/host/room-types');await page.getByRole('heading',{name:'Hiện tại chưa có loại phòng',exact:true}).waitFor();
  await page.getByRole('button',{name:'Thêm loại phòng mới',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Thêm loại phòng mới',exact:true});
  await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(writes,0);assert.ok(await page.getByRole('alert').count()>0);
  await page.getByLabel('Tên loại phòng',{exact:false}).fill('Loại phòng mới');await page.getByLabel('Diện tích (m²)',{exact:false}).fill('25');await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2400000');
  await page.getByRole('checkbox',{name:'Wifi tốc độ cao',exact:true}).check();
  await page.locator('#rt-photos').setInputFiles({name:'room.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64')});
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});await dialog.evaluate(e=>e.scrollTop=0);assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(output,`step-1-${width}.png`)});}
  await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(writes,0);await page.getByText('Chưa có phòng trong danh sách xem trước.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Tạo loại phòng và 0 phòng',exact:true}).click();assert.equal(writes,0);await page.getByText('Cần từ 1 đến 200 phòng trong danh sách xem trước.',{exact:true}).waitFor();
  await page.getByLabel('Tầng / Khu vực nhóm 1',{exact:true}).fill('Tầng 3');await page.getByLabel('Số bắt đầu nhóm 1',{exact:true}).fill('301');await page.getByLabel('Số lượng phòng nhóm 1',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Thêm nhóm tầng / khu',exact:true}).click();await page.getByLabel('Tầng / Khu vực nhóm 2',{exact:true}).fill('Tầng 4');await page.getByLabel('Số bắt đầu nhóm 2',{exact:true}).fill('401');await page.getByLabel('Số lượng phòng nhóm 2',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Tạo danh sách xem trước',exact:true}).click();assert.equal(await page.locator('.rt-batch-table tbody tr').count(),4);
  await page.getByLabel('Số phòng dòng 2',{exact:true}).fill('p.301');await page.getByRole('button',{name:'Tạo loại phòng và 4 phòng',exact:true}).click();assert.equal(writes,0);assert.ok(await page.getByText('Trùng mã phòng trong danh sách.',{exact:true}).count()>0);
  await page.getByLabel('Số phòng dòng 2',{exact:true}).fill('P.399');await page.getByRole('button',{name:'Xóa dòng 4',exact:true}).click();
  await page.getByRole('button',{name:'Nhập danh sách thủ công',exact:true}).click();await page.getByRole('button',{name:'Thêm 1 dòng',exact:true}).click();await page.getByLabel('Số phòng dòng 4',{exact:true}).fill('P.500');await page.getByLabel('Tầng / khu dòng 4',{exact:true}).fill('Tầng 5');
  await page.getByRole('button',{name:'Quay lại',exact:true}).click();assert.equal(await page.getByLabel('Tên loại phòng',{exact:false}).inputValue(),'Loại phòng mới');assert.equal(await page.locator('.rt-upload-previews figure').count(),1);
  await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(await page.getByLabel('Số phòng dòng 2',{exact:true}).inputValue(),'P.399');
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});await dialog.evaluate(e=>e.scrollTop=0);assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(output,`step-2-${width}.png`)});}
  await page.getByRole('button',{name:'Tạo loại phòng và 4 phòng',exact:true}).click();await page.getByText('Xung đột kiểm thử, dữ liệu chưa lưu',{exact:true}).waitFor();assert.equal(await page.getByLabel('Số phòng dòng 4',{exact:true}).inputValue(),'P.500');assert.equal(types.length,0);
  fail=false;await page.getByRole('button',{name:'Tạo loại phòng và 4 phòng',exact:true}).click();await dialog.waitFor({state:'detached'});await page.getByText('Đã tạo loại phòng và 4 phòng thành công.',{exact:true}).waitFor();
  await page.reload();await page.getByText('Loại phòng mới',{exact:true}).waitFor();assert.equal(types.length,1);assert.equal(types[0].rooms.length,4);assert.equal(writes,2);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,viewportChecks:6,interceptedWrites:writes,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
