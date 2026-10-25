const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','test-only'));
 const properties=[{propertyId:12,name:'Nhà trọ cơ sở Tân Xã',address:'Số 12, Tân Xã',status:'ACTIVE'},{propertyId:13,name:'Nhà trọ cơ sở Bình Yên',address:'Số 13, Bình Yên',status:'ACTIVE'},{propertyId:14,name:'Cơ sở chưa có loại phòng',address:'Thạch Hòa',status:'ACTIVE'}];
 const roomTypes=properties.slice(0,2).map((p,i)=>({propertyId:p.propertyId,roomTypeId:34+i,roomType:i?'Studio Bình Yên':'Studio Tân Xã',price:2200000,areaSqm:25,capacity:2,deposit:2200000,amenities:[],images:[],rooms:[],totalRooms:1,vacantRooms:1}));
 const rooms=roomTypes.map((t,i)=>({...t,roomId:51+i,roomNumber:'P.101',floor:'Tầng 1',status:'VACANT',confirmedAt:'2026-10-25T08:00:00'}));
 await page.route('**/api/**',async route=>{
 const req=route.request();assert.equal(req.method(),'GET');const url=new URL(req.url());let data;
 if(url.pathname==='/api/auth/me')data={userId:1,fullName:'Chủ trọ kiểm thử',role:'ROOM_HOST'};
 else if(url.pathname==='/api/host/property-registrations/eligibility')data={canRegister:true,reason:'ELIGIBLE'};
 else if(['/api/host/room-types','/api/host/rooms'].includes(url.pathname)){
 const id=url.searchParams.get('propertyId');data={properties,pendingRegistrationCount:0,roomTypes:roomTypes.filter(t=>!id||String(t.propertyId)===id),rooms:rooms.filter(r=>!id||String(r.propertyId)===id)};
 }else throw Error(`Unexpected API ${url.pathname}`);
 await route.fulfill({json:{success:true,data}});
 });
 await page.goto('http://127.0.0.1:5173/host/room-types');
 await page.waitForURL('**/host/room-types?propertyId=12');await page.getByText('Studio Tân Xã',{exact:true}).waitFor();
 await page.getByLabel('Chọn nhà trọ',{exact:true}).selectOption('13');await page.getByText('Studio Bình Yên',{exact:true}).waitFor();
 assert.equal(await page.getByText('Studio Tân Xã',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Thêm loại phòng mới',exact:true}).click();assert.ok((await page.getByRole('dialog').innerText()).includes('Nhà trọ cơ sở Bình Yên'));await page.keyboard.press('Escape');
 await page.locator('.portal-nav-link').filter({hasText:'Danh sách phòng'}).click();
 await page.waitForURL('**/host/rooms?propertyId=13');await page.getByRole('heading',{name:'P.101',exact:true}).waitFor();
 assert.ok((await page.locator('.hr-room-body').innerText()).includes('Studio Bình Yên'));
 assert.equal(await page.locator('.portal-nav-link[aria-current=page]').count(),1);
 await page.reload();await page.getByRole('heading',{name:'Nhà trọ cơ sở Bình Yên',exact:true}).waitFor();
 await page.getByLabel('Chọn nhà trọ',{exact:true}).selectOption('14');await page.getByRole('link',{name:'Tạo loại phòng',exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Tạo loại phòng',exact:true}).getAttribute('href'),'/host/room-types?propertyId=14');
 await page.getByRole('link',{name:'Tạo loại phòng',exact:true}).click();await page.getByRole('heading',{name:'Hiện tại chưa có loại phòng',exact:true}).waitFor();
 for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,propertyContext:true,sidebarPreservesSelection:true,refreshPreservesSelection:true,emptyPropertyScoped:true,mysqlMutations:0}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
