const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FRONTEND_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const output=path.resolve(__dirname,'../../target/room-publication-ui');fs.mkdirSync(output,{recursive:true});
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let fail=false,empty=false,active=true;
 let rooms=[1,2,3].map(id=>({roomId:id,propertyId:4,roomTypeId:id===3?2:1,roomType:id===3?'Studio ban công':'Phòng tiêu chuẩn',roomNumber:'P.10'+id,floor:'Tầng 1',status:'VACANT',price:2200000,areaSqm:25,capacity:2,amenities:[],publicVisible:false}));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','publication-fixture'));
 await page.route('https://**/*',r=>r.abort());
 await page.route(base+'/api/**',r=>{const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử'});
  if(p==='/api/host/rooms/publication'){
   assert.equal(r.request().method(),'PUT');const body=r.request().postDataJSON();assert.equal(body.propertyId,4);
   if(fail){fail=false;return r.fulfill({status:500,json:{success:false,message:'Chưa lưu được, vui lòng thử lại.'}});}
   rooms=rooms.map(room=>({...room,publicVisible:body.roomIds.includes(room.roomId)}));return ok(rooms);
  }
  assert.equal(r.request().method(),'GET','No unrelated writes');
  if(p==='/api/host/rooms')return ok({properties:[{propertyId:4,name:'Nhà trọ kiểm thử',status:active?'ACTIVE':'INACTIVE'}],pendingRegistrationCount:0,roomTypes:[],rooms:empty?[]:rooms});
  return ok({canRegister:true,items:[],total:0});
 });
 for(const width of [375,768,1024,1440]){
  rooms=rooms.map(r=>({...r,publicVisible:false}));await page.setViewportSize({width,height:1000});
  await page.goto(base+'/host/rooms?propertyId=4&publication=1');await page.getByRole('heading',{name:'Chọn phòng công khai',exact:true}).waitFor();
  const first=page.getByRole('checkbox',{name:'Công khai phòng P.101',exact:true});await first.focus();await page.keyboard.press('Space');
  fail=true;await page.getByRole('button',{name:'Lưu phòng công khai',exact:true}).click();await page.getByRole('alert').filter({hasText:'Chưa lưu được'}).waitFor();assert.ok(await first.isChecked());
  await page.getByRole('button',{name:'Lưu phòng công khai',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu'}).waitFor();assert.deepEqual(rooms.map(r=>r.publicVisible),[true,false,false]);
  await page.reload();await first.waitFor();assert.ok(await first.isChecked());assert.equal(await page.getByRole('checkbox',{name:'Công khai phòng P.102',exact:true}).isChecked(),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('.rp-page').screenshot({path:path.join(output,'publication-'+width+'.png')});
  if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.rp-page').evaluate(el=>el.scrollWidth<=el.clientWidth+2),'publication content fits at 200%');await page.evaluate(()=>document.documentElement.style.zoom='');}
  await first.uncheck();await page.getByRole('button',{name:'Lưu phòng công khai',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã ẩn tất cả'}).waitFor();assert.ok(rooms.every(r=>!r.publicVisible));
 }
 empty=true;await page.reload();await page.getByRole('heading',{name:'Chưa có phòng để công khai'}).waitFor();assert.ok(await page.getByRole('button',{name:'Lưu phòng công khai',exact:true}).isDisabled());
 empty=false;active=false;await page.reload();await page.getByRole('heading',{name:'Chọn phòng công khai',exact:true}).waitFor();assert.ok(await page.getByRole('checkbox',{name:'Công khai phòng P.101',exact:true}).isDisabled());
 assert.deepEqual(errors,[]);console.log('PASS explicit selection/save/reload/unpublish, error recovery, keyboard, empty and inactive states at four widths. Mock API only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
