const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FRONTEND_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve(__dirname,'../../target/multi-floor-ui');fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const property={propertyId:4,name:'Nhà trọ nhiều tầng',status:'ACTIVE'};
 const types=[1,2,3].map(id=>({roomTypeId:id,propertyId:4,roomType:'Loại '+['A','B','C'][id-1],price:2000000,areaSqm:25,capacity:2,amenities:[],rooms:[],images:[],totalRooms:0,vacantRooms:0}));
 let writes=0,rooms=[],firstBody;
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','multi-floor-fixture'));
 await page.route('https://**/*',r=>r.abort());
 await page.route(base+'/api/**',r=>{const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'});
  if(p==='/api/host/room-types')return ok({properties:[property],pendingRegistrationCount:0,roomTypes:types});
  if(p==='/api/host/rooms')return ok({properties:[property],pendingRegistrationCount:0,roomTypes:types,rooms});
  if(p==='/api/host/rooms/layout'){
   assert.equal(r.request().method(),'POST');const body=r.request().postDataJSON();writes++;
   assert.equal(body.propertyId,4);assert.equal(body.rooms.length,12);
   if(writes===1){firstBody=body;return r.fulfill({status:409,json:{success:false,message:'Xung đột thử nghiệm. Chưa tạo phòng nào.'}});}
   assert.deepEqual(body,firstBody);assert.deepEqual(body.rooms.filter(row=>row.floor==='Tầng 1').map(row=>row.roomTypeId),[1,2,3,2]);
   assert.deepEqual(body.rooms.filter(row=>row.floor==='Tầng 2').map(row=>row.roomTypeId),[1,3,3,2]);
   assert.deepEqual(body.rooms.filter(row=>row.floor==='Tầng 3').map(row=>row.roomTypeId),[1,2,3,1]);
   rooms=body.rooms.map((row,index)=>({...row,roomId:index+1,propertyId:4,roomType:types.find(type=>type.roomTypeId===row.roomTypeId).roomType,status:'VACANT',amenities:[],publicVisible:false}));return ok(rooms);
  }
  assert.equal(r.request().method(),'GET','No unrelated writes');return ok({items:[],total:0,canRegister:true,reason:'ELIGIBLE'});
 });
 await page.goto(base+'/host/room-types?propertyId=4&layout=1');await page.getByRole('heading',{name:'Thiết lập phòng nhiều tầng',exact:true}).waitFor();
 await page.getByLabel('Đến tầng',{exact:true}).fill('3');await page.getByLabel('Số phòng mỗi tầng',{exact:true}).fill('4');await page.getByRole('button',{name:'Thêm khung phòng',exact:true}).click();
 const save=page.getByRole('button',{name:'Tạo 12 phòng & chọn công khai',exact:true});assert.ok(await save.isDisabled());
 await page.getByRole('button',{name:'Chọn phòng lẻ',exact:true}).click();await page.getByRole('button',{name:'Gán loại phòng',exact:true}).click();
 await page.getByRole('button',{name:'Chọn phòng chẵn',exact:true}).click();await page.getByLabel('Loại phòng để gán',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Gán loại phòng',exact:true}).click();
 await page.getByLabel('Loại phòng 103',{exact:true}).selectOption('3');
 const copy=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Sao chép bố trí sang các tầng khác'})});
 await copy.locator('summary').click();await page.getByRole('button',{name:'Chọn mọi tầng còn lại',exact:true}).click();await page.getByRole('button',{name:'Sao chép loại phòng',exact:true}).click();assert.ok(await save.isEnabled());
 await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();assert.ok(await save.isDisabled());await page.getByRole('button',{name:'Sao chép loại phòng',exact:true}).click();
 await page.getByLabel('Tầng đang thiết lập',{exact:true}).selectOption('Tầng 2');await page.getByLabel('Loại phòng 202',{exact:true}).selectOption('3');
 await page.getByRole('button',{name:'Sửa số phòng 201',exact:true}).click();await page.getByLabel('Số phòng 201',{exact:true}).fill('101');assert.ok(await save.isDisabled());await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();assert.ok(await save.isEnabled());
 await page.reload();await page.getByLabel('Tầng đang thiết lập',{exact:true}).selectOption('Tầng 2');assert.equal(await page.getByLabel('Loại phòng 202',{exact:true}).inputValue(),'3');
 await page.getByLabel('Tầng đang thiết lập',{exact:true}).selectOption('Tầng 3');
 const pattern=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Gán so le tự động'})});await pattern.locator('summary').click();
 await page.getByRole('button',{name:'Thêm vị trí vào mẫu',exact:true}).click();await page.getByLabel('Vị trí 3',{exact:true}).selectOption('3');await page.getByRole('button',{name:'Áp dụng so le',exact:true}).click();assert.equal(await page.getByLabel('Loại phòng 303',{exact:true}).inputValue(),'3');
 const numbers=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Chọn nhanh bằng danh sách số phòng'})});await numbers.locator('summary').click();
 await page.getByLabel('Danh sách số phòng cần chọn',{exact:true}).fill('101, 202, 304');await page.getByRole('button',{name:'Chọn các số này',exact:true}).click();assert.ok((await page.locator('.ml-assign strong').textContent()).includes('3 phòng'));
 await page.getByLabel('Danh sách số phòng cần chọn',{exact:true}).fill('999');await page.getByRole('button',{name:'Chọn các số này',exact:true}).click();await page.getByRole('alert').filter({hasText:'Không tìm thấy trong bản nháp'}).waitFor();assert.ok((await page.locator('.ml-assign strong').textContent()).includes('3 phòng'));
 await page.getByLabel('Danh sách số phòng cần chọn',{exact:true}).fill('101, 202, 304');await page.getByRole('button',{name:'Chọn các số này',exact:true}).click();await page.getByRole('button',{name:'Bỏ chọn',exact:true}).click();await numbers.locator('summary').click();
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no horizontal page overflow');await page.locator('.ml-page').screenshot({path:path.join(out,'layout-'+width+'.png')});}
 await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.ml-page').evaluate(el=>el.scrollWidth<=el.clientWidth+2));await page.evaluate(()=>document.documentElement.style.zoom='');
 await save.click();await page.getByRole('alert').filter({hasText:'Xung đột thử nghiệm'}).waitFor();assert.equal(rooms.length,0);assert.equal(await page.getByLabel('Loại phòng 303',{exact:true}).inputValue(),'3');await save.click();
 await page.waitForURL('**/host/rooms?propertyId=4&publication=1');await page.getByRole('heading',{name:'Chọn phòng công khai',exact:true}).waitFor();assert.equal(await page.locator('.rp-room input:checked').count(),0);assert.equal(await page.locator('.rp-room').count(),12);
 await page.goto(base+'/host/room-types?propertyId=4&layout=1');await page.getByRole('heading',{name:'Thiết lập phòng nhiều tầng',exact:true}).waitFor();
 await page.getByLabel('Từ tầng',{exact:true}).fill('10');await page.getByLabel('Đến tầng',{exact:true}).fill('29');await page.getByLabel('Số phòng mỗi tầng',{exact:true}).fill('50');await page.getByRole('button',{name:'Thêm khung phòng',exact:true}).click();assert.equal(await page.locator('.ml-room').count(),24);assert.ok((await page.locator('.ml-overview').textContent()).includes('1000 phòng'));
 assert.deepEqual(errors,[]);console.log('PASS mixed A/B/C rooms, odd/even bulk selection, copy/undo, duplicate guard, reload draft, three-type pattern, atomic retry, publication redirect, 1000-room draft, four widths and zoom. Mock API only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
