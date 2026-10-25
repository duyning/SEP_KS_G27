const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const output=process.env.CHECK_OUTPUT||path.resolve(__dirname,'../migration/room-type-crud-check');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-only'));
  const property={propertyId:12,name:'Browser-only property',status:'ACTIVE'};
  const base={propertyId:12,price:2400000,areaSqm:22,capacity:2,deposit:2400000,amenities:['airConditioner','wifi'],description:'Thông tin kiểm tra chỉ trong trình duyệt.',electricityPrice:3500,waterPrice:30000,internetPrice:80000,servicePrice:30000,totalRooms:null,vacantRooms:null};
  let types=[{...base,roomTypeId:34,roomType:'Type A',images:[{imageId:101,fileName:'only-a.png'}]},{...base,roomTypeId:35,roomType:'Type B',images:[{imageId:102,fileName:'only-b.png'}]}];
  let creates=0,updates=0,deletes=0,deleteFailure=true;const imageReads=[];
  await page.route('**/api/**',async route=>{
   const req=route.request();const url=new URL(req.url()).pathname;const method=req.method();let data;
   if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
   else if(url==='/api/host/property-registrations/eligibility')data={canRegister:false,reason:'HAS_PROPERTY'};
   else if(url==='/api/host/room-types'&&method==='GET')data={properties:[property],pendingRegistrationCount:0,roomTypes:types};
   else if(url==='/api/host/room-types'&&method==='POST'||/\/room-types\/\d+$/.test(url)&&method==='PUT'){
    const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();
    const details=JSON.parse(await form.get('details').text());const files=form.getAll('photos');assert.equal(details.propertyId,12);
    if(method==='POST'){
     creates++;assert.equal(files.length,2);assert.equal(details.roomType,'New type');
     data={...base,...details,roomTypeId:36,images:files.map((file,index)=>({imageId:201+index,fileName:file.name}))};types.push(data);
    }else{
     updates++;assert.deepEqual(details.retainedImageIds,[202]);assert.equal(files.length,1);assert.equal(details.price,2800000);
     data={...types.find(type=>type.roomTypeId===36),...details,images:[{imageId:202,fileName:'create-2.png'},{imageId:203,fileName:files[0].name}]};types=types.map(type=>type.roomTypeId===36?data:type);
    }
   }else if(/\/room-types\/\d+\/images\/\d+$/.test(url)){
    imageReads.push(url);return route.fulfill({contentType:'image/png',body:png});
   }else if(/\/room-types\/\d+$/.test(url)&&method==='DELETE'){
    deletes++;if(deleteFailure)return route.fulfill({status:409,json:{success:false,message:'Browser-only linked history'}});
    types=types.filter(type=>type.roomTypeId!==36);data=null;
   }else if(/\/room-types\/\d+$/.test(url))data=types.find(type=>type.roomTypeId===Number(url.split('/').pop()));
   else throw new Error(`Unexpected request ${method} ${url}`);
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto('http://127.0.0.1:5173/host/room-types');await page.getByText('Type A',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Thêm loại phòng mới',exact:true}).click();
  await page.getByLabel('Tên loại phòng',{exact:false}).fill('New type');await page.getByLabel('Diện tích (m²)',{exact:false}).fill('25');await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2400000');
  await page.locator('#rt-photos').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await page.getByRole('alert').waitFor();assert.equal(creates,0);
  await page.locator('#rt-photos').setInputFiles([{name:'create-1.png',mimeType:'image/png',buffer:png},{name:'create-2.png',mimeType:'image/png',buffer:png}]);assert.equal(await page.locator('.rt-upload-previews figure').count(),2);
  await page.getByRole('button',{name:'Tạo loại phòng',exact:true}).click();await page.getByText('Đã tạo loại phòng thành công.',{exact:true}).waitFor();
  const row=()=>page.locator('.rt-table tbody tr').filter({has:page.getByText('New type',{exact:true})});
  await row().getByRole('button',{name:'Chi tiết',exact:true}).click();let dialog=page.getByRole('dialog',{name:'New type',exact:true});await dialog.waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.rt-info-gallery img').length===2&&[...document.querySelectorAll('.rt-info-gallery img')].every(image=>image.naturalWidth>0));
  assert.ok(imageReads.includes('/api/host/room-types/36/images/201'));assert.ok(imageReads.includes('/api/host/room-types/36/images/202'));
  assert.equal(await dialog.locator('.rt-info-gallery button').count(),2);
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});await dialog.evaluate(element=>element.scrollTop=0);assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1));if(width!==768)await page.screenshot({path:path.join(output,`detail-${width}.png`)});}
  await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();dialog=page.getByRole('dialog',{name:'Chỉnh sửa loại phòng',exact:true});await dialog.waitFor();
  await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2800000');await page.getByRole('button',{name:'Bỏ ảnh create-1.png',exact:true}).click();await page.locator('#rt-photos').setInputFiles({name:'edit.png',mimeType:'image/png',buffer:png});
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});await dialog.evaluate(element=>element.scrollTop=0);assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1));if(width!==768)await page.screenshot({path:path.join(output,`edit-${width}.png`)});}
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.getByText('Đã cập nhật loại phòng thành công.',{exact:true}).waitFor();
  await page.reload();await row().waitFor();await row().getByRole('button',{name:'Xóa New type',exact:true}).click();await page.getByRole('dialog',{name:'Xóa loại phòng',exact:true}).waitFor();assert.equal(deletes,0);await page.getByRole('button',{name:'Hủy',exact:true}).click();assert.equal(deletes,0);
  await row().getByRole('button',{name:'Xóa New type',exact:true}).click();await page.getByRole('button',{name:'Xóa loại phòng',exact:true}).click();await page.getByText('Browser-only linked history',{exact:true}).waitFor();assert.equal(types.length,3);
  deleteFailure=false;await page.getByRole('button',{name:'Xóa loại phòng',exact:true}).click();await page.getByText('Đã xóa loại phòng.',{exact:true}).waitFor();assert.equal(await row().count(),0);assert.equal(types.length,2);
  for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  assert.deepEqual(errors,[]);assert.equal(creates,1);assert.equal(updates,1);
  console.log(JSON.stringify({passed:true,creates,updates,deletes,viewportChecks:9,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
