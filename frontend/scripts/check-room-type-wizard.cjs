const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const base=process.env.FRONTEND_URL||'http://127.0.0.1:5198';
 const output=path.resolve(__dirname,'../migration/room-type-wizard-check');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-only'));
  const property={propertyId:12,name:'Nhà trọ kiểm tra trong trình duyệt',address:'Hòa Lạc',status:'ACTIVE'};
  let types=[],writes=0,fail=true;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()).pathname;let data;
   if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
   else if(url==='/api/favorites/state')data={items:[],total:0};
   else if(url==='/api/host/property-registrations/eligibility')data={canRegister:false,reason:'HAS_PROPERTY'};
   else if(url==='/api/host/rooms'&&req.method()==='GET')data={properties:[property],pendingRegistrationCount:0,roomTypes:types,rooms:types.flatMap(type=>type.rooms.map(room=>({...room,roomType:type.roomType,amenities:[],publicVisible:false})))};
   else if(url==='/api/host/room-types'&&req.method()==='GET')data={properties:[property],pendingRegistrationCount:0,roomTypes:types};
   else if(url==='/api/host/room-types'&&req.method()==='POST'){
    const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData(),details=JSON.parse(await form.get('details').text());
    assert.equal(details.roomType,'Loại phòng lưu trước');data={...details,roomTypeId:35,images:[],rooms:[],totalRooms:0,vacantRooms:0};types.push(data);
   }
   else if(url==='/api/host/room-types/with-rooms'&&req.method()==='POST'){
    writes++;const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();
    const details=JSON.parse(await form.get('details').text()),layout=JSON.parse(await form.get('layout').text());
    assert.equal(details.propertyId,12);assert.equal(details.roomType,'Loại phòng mới');assert.equal(form.getAll('photos').length,1);
    assert.equal(layout.rooms.length,4);assert.equal(new Set(layout.rooms.map(room=>room.roomNumber)).size,4);
    if(fail)return route.fulfill({status:409,json:{success:false,message:'Xung đột kiểm thử, dữ liệu chưa lưu'}});
    data={...details,roomTypeId:34,deposit:details.price,images:[],totalRooms:4,vacantRooms:4,rooms:layout.rooms.map((room,index)=>({...room,roomId:index+1,roomTypeId:34,propertyId:12,status:'VACANT',price:details.price}))};types.push(data);
   }else throw new Error(`Unexpected API ${req.method()} ${url}`);
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto(base+'/host/room-types');await page.getByRole('heading',{name:'Nhà trọ chưa có loại phòng nào',exact:true}).waitFor();
  await page.getByRole('button',{name:'Thêm loại phòng đầu tiên',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Thêm loại phòng mới',exact:true});
  await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(writes,0);assert.ok(await page.getByRole('alert').count()>0);
  await page.getByLabel('Tên loại phòng',{exact:false}).fill('Loại phòng mới');await page.getByLabel('Diện tích (m²)',{exact:false}).fill('25');const price=page.getByLabel('Giá thuê niêm yết',{exact:false});
  await price.fill('');await price.pressSequentially('2200000');assert.equal(await price.inputValue(),'2.200.000');
  await price.fill('2.200.000');assert.equal(await price.inputValue(),'2.200.000');
  await price.evaluate(el=>el.setSelectionRange(2,2));await price.press('Backspace');assert.equal(await price.inputValue(),'200.000');
  await price.evaluate(el=>el.setSelectionRange(3,3));await price.press('Delete');assert.equal(await price.inputValue(),'20.000');
  await price.fill('2200000');await price.evaluate(el=>el.setSelectionRange(3,3));await price.press('9');assert.equal(await price.inputValue(),'22.900.000');assert.equal(await price.evaluate(el=>el.selectionStart),4);
  const deposit=page.getByLabel('Tiền đặt cọc',{exact:false});await deposit.fill('1500000');assert.equal(await deposit.inputValue(),'1.500.000');await deposit.fill('');assert.equal(await deposit.inputValue(),'');
  await price.fill('2400000');assert.equal(await price.inputValue(),'2.400.000');
  await page.getByRole('checkbox',{name:'Wifi tốc độ cao',exact:true}).check();
  await page.locator('#rt-photos').setInputFiles({name:'room.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64')});
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});await dialog.evaluate(e=>e.scrollTop=0);assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(output,`step-1-${width}.png`)});}
  await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(writes,0);
  await page.getByLabel('Tầng nhóm 1',{exact:true}).fill('3');await page.getByLabel('Phòng bắt đầu nhóm 1',{exact:true}).fill('01');await page.getByLabel('Số lượng phòng nhóm 1',{exact:true}).fill('4');
  const create=page.getByRole('button',{name:'Tạo loại phòng và 4 phòng',exact:true});await create.waitFor();
  await create.click();await page.getByText('Xung đột kiểm thử, dữ liệu chưa lưu',{exact:true}).waitFor();assert.equal(types.length,0);
  fail=false;await create.click();await page.waitForURL('**/host/rooms?propertyId=12&publication=1');
  await page.getByRole('heading',{name:'Chọn phòng công khai',exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:'Chọn phòng công khai',exact:true}).waitFor();
  assert.equal(await page.locator('.rp-room input:checked').count(),0);assert.equal(await page.locator('.rp-room').count(),4);assert.equal(types.length,1);assert.equal(types[0].rooms.length,4);assert.equal(writes,2);assert.deepEqual(errors,[]);
  await page.goto(base+'/host/room-types?propertyId=12');await page.getByRole('button',{name:'Thêm loại phòng',exact:true}).click();
  await page.getByLabel('Tên loại phòng',{exact:false}).fill('Loại phòng lưu trước');await page.getByLabel('Diện tích (m²)',{exact:false}).fill('25');await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2300000');
  assert.equal(await page.getByText('≈',{exact:false}).count(),0);
  await page.getByRole('button',{name:'Lưu loại phòng, thiết lập phòng sau',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(types.length,2);assert.equal(types[1].rooms.length,0);assert.ok(new URL(page.url()).pathname.endsWith('/host/room-types'));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,viewportChecks:6,interceptedWrites:writes,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
