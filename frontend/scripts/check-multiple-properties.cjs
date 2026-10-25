const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64');
async function main(){const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('hlrcs_access_token','browser-only');sessionStorage.setItem('hlrcs:property-draft:1',JSON.stringify({version:1,fields:{name:'Nhà trọ thứ ba',propertyType:'Chung cư mini',description:'Thông tin nhà trọ thứ ba đầy đủ để kiểm tra đăng ký nhiều cơ sở độc lập.',managerName:'Test owner',contactPhone:'0912345678',zaloPhone:'',commune:'Tân Xã',addressDetail:'Số 30, thôn 2, Tân Xã',nearby:'',latitude:'21.0188',longitude:'105.5215',amenities:[],selectedRules:[],rules:''}}));});
 const properties=[{propertyId:12,name:'Cơ sở A',address:'Tân Xã',status:'ACTIVE'},{propertyId:13,name:'Cơ sở B',address:'Bình Yên',status:'ACTIVE'}];
 const types=properties.map((property,index)=>({propertyId:property.propertyId,roomTypeId:34+index,roomType:index?'Phòng cơ sở B':'Phòng cơ sở A',price:2400000,areaSqm:25,capacity:2,deposit:2400000,amenities:[],images:[],rooms:[{roomId:51+index,propertyId:property.propertyId,roomTypeId:34+index,roomType:index?'Phòng cơ sở B':'Phòng cơ sở A',roomNumber:index?'P.201':'P.101',floor:'Tầng 1',status:'VACANT',price:2400000,amenities:[]}],totalRooms:1,vacantRooms:1}));
 let registrations=0,typeWrites=0,currentReads=0,failSubmit=true;
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url()),pathname=url.pathname;let data;
  if(pathname==='/api/auth/me')data={userId:1,fullName:'Test owner',role:'ROOM_HOST',phoneNumber:'0912345678'};
  else if(pathname==='/api/host/property-registrations/eligibility')data={canRegister:true,reason:'ELIGIBLE'};
  else if(pathname==='/api/host/property-registrations/current'){currentReads++;data={registrationId:80,status:'PENDING',name:'Another pending property'};}
  else if(pathname==='/api/host/property-registrations'&&req.method()==='POST'){
   registrations++;if(failSubmit)return route.fulfill({status:409,json:{success:false,message:'Hồ sơ cùng tên và địa chỉ đã được đăng ký.'}});
   const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();const details=JSON.parse(await form.get('details').text());assert.equal(details.name,'Nhà trọ thứ ba');data={registrationId:81,status:'PENDING',name:details.name};
  }else if(pathname==='/api/host/room-types/with-rooms'){
   typeWrites++;const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();const details=JSON.parse(await form.get('details').text()),layout=JSON.parse(await form.get('layout').text());assert.equal(details.propertyId,13);assert.equal(layout.rooms[0].roomNumber,'P.101');
   data={...details,roomTypeId:36,images:[],rooms:[{roomId:53,propertyId:13,roomTypeId:36,roomType:details.roomType,roomNumber:'P.101',floor:'Tầng 1',status:'VACANT',price:details.price,amenities:details.amenities}],totalRooms:1,vacantRooms:1};types.push(data);
  }else if(pathname==='/api/host/room-types'||pathname==='/api/host/rooms'){
   const propertyId=url.searchParams.get('propertyId');const selectedTypes=types.filter(type=>!propertyId||String(type.propertyId)===propertyId);
   data={properties,roomTypes:selectedTypes,pendingRegistrationCount:2,...(pathname.endsWith('/rooms')?{rooms:selectedTypes.flatMap(type=>type.rooms)}:{})};
  }else throw new Error(`Unexpected ${req.method()} ${pathname}`);
  return route.fulfill({json:{success:true,data}});
 });
 await page.goto('http://127.0.0.1:5173/host/property/new');await page.locator('#name').waitFor();assert.equal(currentReads,0);assert.equal(await page.locator('#name').inputValue(),'Nhà trọ thứ ba');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await page.locator('#photos').setInputFiles({name:'house.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 for(const id of ['ownership','idCard'])await page.locator(`#${id}`).setInputFiles({name:`${id}.pdf`,mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
 await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.locator('#termsAccepted').check();await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();
 await page.getByText('Hồ sơ cùng tên và địa chỉ đã được đăng ký.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Đăng ký nhà trọ khác',exact:true}).count(),0);assert.equal(currentReads,0);
 failSubmit=false;await page.getByRole('button',{name:'Gửi xét duyệt',exact:true}).click();await page.getByRole('button',{name:'Đăng ký nhà trọ khác',exact:true}).click();assert.equal(await page.locator('#name').inputValue(),'');assert.equal(await page.locator('.registration-steps [aria-current=step]').innerText(),'1\nThông tin cơ bản');
 await page.goto('http://127.0.0.1:5173/host/room-types');await page.getByText('Phòng cơ sở A',{exact:true}).waitFor();assert.equal(await page.getByText('Phòng cơ sở B',{exact:true}).count(),0);
 await page.getByLabel('Chọn nhà trọ',{exact:true}).selectOption('13');await page.getByText('Phòng cơ sở B',{exact:true}).waitFor();assert.equal(await page.getByText('Phòng cơ sở A',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Thêm loại phòng mới',exact:true}).click();await page.getByLabel('Tên loại phòng',{exact:false}).fill('Studio mới cơ sở B');await page.getByLabel('Diện tích (m²)',{exact:false}).fill('25');await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2200000');
 await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();await page.getByRole('button',{name:'Nhập danh sách thủ công',exact:true}).click();await page.getByRole('button',{name:'Thêm 1 dòng',exact:true}).click();await page.getByLabel('Số phòng dòng 1',{exact:true}).fill('P.101');await page.getByLabel('Tầng / khu dòng 1',{exact:true}).fill('Tầng 1');await page.getByRole('button',{name:'Tạo loại phòng và 1 phòng',exact:true}).click();await page.getByText('Đã tạo loại phòng và 1 phòng thành công.',{exact:true}).waitFor();assert.equal(typeWrites,1);
 await page.goto('http://127.0.0.1:5173/host/rooms?propertyId=12&roomTypeId=34');await page.getByRole('heading',{name:'P.101',exact:true}).waitFor();await page.getByLabel('Chọn nhà trọ',{exact:true}).selectOption('13');await page.getByRole('heading',{name:'P.201',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.has('roomTypeId'),false);assert.equal(await page.locator('.hr-room-card').count(),2);assert.equal(await page.getByRole('button',{name:'Thêm phòng mới',exact:true}).count(),0);
 for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,multipleRegistrationAllowed:true,pendingDoesNotBlockNew:true,duplicateIsNotFakeSuccess:true,separatePropertyRooms:true,registrations,typeWrites,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
