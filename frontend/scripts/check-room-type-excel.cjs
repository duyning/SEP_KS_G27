const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const ExcelJS=require('exceljs');
async function main(){
 const {TYPE_SHEET,ROOM_SHEET,EXCEL_FIELDS}=await import(pathToFileURL(path.resolve(__dirname,'../src/services/room-type-excel.js')));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-only'));
  const property={propertyId:12,name:'Browser-only property',status:'ACTIVE'};let types=[],writes=0;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()).pathname;let data;
   if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
   else if(url==='/api/host/property-registrations/eligibility')data={canRegister:false,reason:'HAS_PROPERTY'};
   else if(url==='/api/host/room-types'&&req.method()==='GET')data={properties:[property],roomTypes:types,pendingRegistrationCount:0};
   else if(url==='/api/host/room-types/with-rooms'&&req.method()==='POST'){
    writes++;const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();
    const details=JSON.parse(await form.get('details').text()),layout=JSON.parse(await form.get('layout').text());
    assert.equal(details.roomType,'Loại phòng từ Excel');assert.equal(details.price,2800000);assert.deepEqual(layout.rooms,[{roomNumber:'001',floor:'Tầng 1'},{roomNumber:'002',floor:'Tầng 1'}]);
    data={...details,roomTypeId:34,totalRooms:2,vacantRooms:2,deposit:details.price,images:[],rooms:layout.rooms.map((room,index)=>({...room,roomId:index+1,propertyId:12,roomTypeId:34,roomType:details.roomType,price:details.price,amenities:details.amenities,status:'VACANT',confirmedAt:'2026-10-25T08:00:00'}))};types.push(data);
   }else if(url==='/api/host/rooms')data={properties:[property],roomTypes:types,rooms:types.flatMap(type=>type.rooms),pendingRegistrationCount:0};
   else throw new Error(`Unexpected ${req.method()} ${url}`);
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto('http://127.0.0.1:5173/host/room-types');await page.getByRole('heading',{name:'Hiện tại chưa có loại phòng',exact:true}).waitFor();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải mẫu Excel',exact:true}).click();const file=await download;assert.ok(file.suggestedFilename().endsWith('.xlsx'));
  const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.concat(chunks));assert.equal(book.getWorksheet(TYPE_SHEET).getCell('B2').value,null);assert.equal(book.getWorksheet(ROOM_SHEET).getCell('A2').value,null);
  const values={roomType:'Loại phòng từ Excel',areaSqm:25.5,capacity:2,price:2400000,wifi:'Có'};EXCEL_FIELDS.forEach(([key],i)=>{if(values[key]!=null)book.getWorksheet(TYPE_SHEET).getCell(i+2,2).value=values[key];});
  book.getWorksheet(ROOM_SHEET).getCell('A2').value='001';book.getWorksheet(ROOM_SHEET).getCell('B2').value='Tầng 1';book.getWorksheet(ROOM_SHEET).getCell('A3').value='001';book.getWorksheet(ROOM_SHEET).getCell('B3').value='Tầng 1';
  await page.getByRole('button',{name:'Nhập Excel',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Nhập loại phòng từ Excel',exact:true});
  await page.getByLabel('Chọn file Excel',{exact:true}).setInputFiles({name:'invalid.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await book.xlsx.writeBuffer())});
  await page.getByText(/Danh sách phòng!A3: Trùng mã phòng/).waitFor();assert.equal(await page.getByRole('button',{name:'Đưa vào form kiểm tra',exact:true}).isDisabled(),true);assert.equal(writes,0);
  book.getWorksheet(ROOM_SHEET).getCell('A3').value='002';await page.getByLabel('Chọn file Excel',{exact:true}).setInputFiles({name:'valid.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await book.xlsx.writeBuffer())});
  await page.getByRole('heading',{name:'Đã kiểm tra file: 2 phòng',exact:true}).waitFor();assert.equal(writes,0);
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
  await page.getByRole('button',{name:'Đưa vào form kiểm tra',exact:true}).click();await page.getByRole('dialog',{name:'Thêm loại phòng mới',exact:true}).waitFor();assert.equal(await page.getByLabel('Tên loại phòng',{exact:false}).inputValue(),'Loại phòng từ Excel');assert.equal(await page.getByLabel('Diện tích (m²)',{exact:false}).inputValue(),'25.5');
  await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2800000');await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(await page.getByLabel('Số phòng dòng 1',{exact:true}).inputValue(),'001');assert.equal(writes,0);
  await page.getByRole('button',{name:'Tạo loại phòng và 2 phòng',exact:true}).click();await page.getByText('Đã tạo loại phòng và 2 phòng thành công.',{exact:true}).waitFor();assert.equal(writes,1);
  await page.goto('http://127.0.0.1:5173/host/rooms');await page.getByRole('heading',{name:'001',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Thêm phòng mới',exact:true}).count(),0);assert.equal(await page.locator('.hr-room-card').count(),2);
  await page.getByRole('button',{name:'Bảng',exact:true}).click();assert.equal(await page.locator('.hr-table tbody tr').count(),2);await page.getByRole('button',{name:'Sửa 001',exact:true}).click();await page.getByRole('dialog',{name:'Cập nhật phòng thực tế',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,downloadedTemplate:true,excelToPreviewToSave:true,roomCreationRemoved:true,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
