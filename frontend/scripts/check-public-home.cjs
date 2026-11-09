const assert=require('node:assert/strict');const path=require('node:path');const os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseUrl=process.env.HOME_TEST_URL||'http://127.0.0.1:5173';
async function main(){const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const chooseLocation=async value=>{await page.locator('#filterLocation').click();await page.getByRole('option',{name:value==='all'?'Tất cả khu vực Hòa Lạc':'Tân Xã (Gần ĐH FPT)',exact:true}).click();};
 let mode='data';const listings=Array.from({length:8},(_,i)=>({propertyId:i+1,name:`Nhà trọ kiểm tra ${i+1}`,address:i%2?'Số 8, Bình Yên':'Số 12, Tân Xã',commune:i%2?'Bình Yên':'Tân Xã',propertyType:'Chung cư mini',description:'Mô tả đã lưu của nhà trọ',photos:[],amenities:['wifi'],rules:['quietHours'],minPrice:i%2?3200000:2200000,totalRooms:3,vacantRooms:i===7?0:2,roomTypes:[{roomTypeId:i+1,name:'Studio đã lưu',price:i%2?3200000:2200000,area:25,capacity:2,electricityPrice:3500,waterPrice:30000,amenities:i%2?['balcony']:['airConditioner'],totalRooms:3,vacantRooms:2}]}));
 await page.route(`${baseUrl}/api/**`,async route=>{const url=new URL(route.request().url());assert.equal(route.request().method(),'GET');if(url.pathname==='/api/auth/me')return route.fulfill({status:401,json:{success:false}});
 if(url.pathname.endsWith('/details')){const match=url.pathname.match(/properties\/(\d+)\/room-types\/(\d+)\/details/);assert.ok(match);const property=listings.find(item=>item.propertyId===Number(match[1])),type=property.roomTypes.find(item=>item.roomTypeId===Number(match[2]));assert.ok(type,'Detail must address a real room type');return route.fulfill({json:{success:true,data:{summary:{propertyId:property.propertyId,roomTypeId:type.roomTypeId,propertyName:property.name,roomTypeName:type.name,address:property.address,price:type.price,areaSqm:type.area,availableRooms:type.vacantRooms,verificationStatus:'APPROVED'},gallery:[],amenities:type.amenities,propertyAmenities:property.amenities,selectedRules:property.rules,similar:[],reviews:{totalReviews:0,averageRating:null,ratingCounts:[0,0,0,0,0],latest:[]},publicContact:{phone:'0912345678',zaloPhone:null}}}});}
 assert.equal(url.pathname,'/api/public/properties');assert.equal(route.request().headers().authorization,undefined);return route.fulfill({status:mode==='error'?500:200,json:{success:mode!=='error',data:mode==='empty'?[]:mode==='unconfigured'?[{...listings[0],roomTypes:[],minPrice:null,totalRooms:0,vacantRooms:0}]:listings}});});
 await page.goto(baseUrl);await page.locator('.room-card').first().waitFor();assert.equal(await page.locator('.room-card').count(),6);assert.equal(await page.locator('.portal-breadcrumbs').count(),0);

 listings[0].distanceToFptMeters=999.9;
 listings[1].distanceToFptMeters=1000;
 listings[2].amenities.push('flexibleHours');
 await page.reload();
 const cards=page.locator('.room-card');
 await cards.first().waitFor();
 const resultsHeading=page.locator('#home-results-heading');
 const checkQuickFilter=async(name,ids)=>{
   await page.getByRole('button',{name,exact:true}).click();
   assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.propertyId))),ids);
   assert.equal(await resultsHeading.evaluate(node=>document.activeElement===node),true);
   await page.waitForFunction(()=>{const box=document.querySelector('#home-results-heading').getBoundingClientRect();return box.top>=document.querySelector('.navbar-wrapper').getBoundingClientRect().bottom&&box.bottom<=innerHeight;});
 };
 await checkQuickFilter('Có điều hòa',[1,3,5,7]);
 await checkQuickFilter('Giờ tự do',[3]);
 await checkQuickFilter('Có ban công',[2,4,6,8]);
 await checkQuickFilter('Cách ĐH FPT < 1km',[1]);
 await checkQuickFilter('Tất cả',[1,2,3,4,5,6]);
 await page.setViewportSize({width:375,height:740});
 await checkQuickFilter('Cách ĐH FPT < 1km',[1]);
 await checkQuickFilter('Tất cả',[1,2,3,4,5,6]);
 await page.setViewportSize({width:1536,height:1000});
 await page.getByRole('tab',{name:'Thạch Hòa',exact:true}).click();
 await chooseLocation('tan-xa');
 await page.getByRole('button',{name:'Tìm phòng ngay',exact:true}).press('Enter');
 assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.propertyId))),[1,3,5,7]);
 assert.equal(await resultsHeading.evaluate(node=>document.activeElement===node),true);
 await chooseLocation('all');

 await page.locator('#filterPrice').click();assert.equal(await page.getByRole('option',{name:'Trên 3.5 triệu / tháng',exact:true}).count(),1);assert.equal(await page.getByRole('option').filter({hasText:'CCMN'}).count(),0);await page.keyboard.press('Escape');assert.equal(await page.getByRole('listbox').count(),0);
 await page.locator('#filterType').focus();await page.keyboard.press('Enter');assert.equal(await page.getByRole('listbox').getByRole('option').count(),4);await page.keyboard.press('End');await page.keyboard.press('Enter');assert.equal(await page.locator('#filterType-value').innerText(),'Chung cư mini (Studio)');await page.locator('#filterType').click();await page.keyboard.press('Home');await page.keyboard.press('Enter');
 await page.locator('#filterLocation').click();await page.locator('.hero-headline').click();assert.equal(await page.getByRole('listbox').count(),0);
 await page.getByRole('button',{name:'Xem thêm 2 nhà trọ quanh Hòa Lạc',exact:true}).click();assert.equal(await page.locator('.room-card').count(),8);
 await chooseLocation('tan-xa');assert.equal(await page.locator('.room-card').count(),4);await page.getByRole('button',{name:'Có ban công',exact:true}).click();await page.getByRole('heading',{name:'Không tìm thấy phòng trọ phù hợp',exact:true}).waitFor();await page.getByRole('button',{name:'Xem tất cả phòng',exact:true}).click();
 for(const selector of ['.room-thumb-link','.home-title-button','.btn-card-detail']){await page.locator('.room-card[data-property-id="1"] '+selector).click();await page.waitForURL('**/properties/detail?propertyId=1&roomTypeId=1');await page.locator('.rtd-heading h1').waitFor();assert.equal(await page.getByRole('dialog').count(),0);await page.goBack();await page.locator('.room-card').first().waitFor();}
 await chooseLocation('tan-xa');await page.locator('.room-card[data-property-id="1"] .btn-card-detail').focus();await page.keyboard.press('Enter');await page.locator('.rtd-heading h1').waitFor();await page.goBack();await page.locator('.room-card').first().waitFor();assert.equal(await page.locator('#filterLocation-value').innerText(),'Tân Xã (Gần ĐH FPT)');assert.equal(await page.locator('.room-card').count(),4);
 await page.locator('.room-card[data-property-id="1"] .btn-card-contact').click();await page.waitForURL('**#host-contact');await page.locator('#host-contact').waitFor();await page.waitForFunction(()=>{const box=document.querySelector('#host-contact').getBoundingClientRect();return box.top>=0&&box.top<innerHeight});assert.equal(await page.locator('#host-contact a[href^="tel:"]').getAttribute('href'),'tel:0912345678');await page.goBack();await page.locator('.room-card').first().waitFor();await chooseLocation('all');
 await page.locator('.room-card[data-property-id="1"] .btn-card-wishlist').click();await page.waitForURL('**/login');await page.goto(baseUrl);await page.locator('.room-card').first().waitFor();
 for(const width of [1536,1440,1024,768,390,375]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${width}`);const sizes=await page.locator('.location-img-wrap').evaluateAll(nodes=>nodes.map(n=>({w:n.clientWidth,h:n.clientHeight})));assert.ok(sizes.every(size=>Math.abs(size.h-size.w*9/16)<=1));await page.locator('#filterLocation').click();assert.ok(await page.evaluate(()=>{const box=document.querySelector('.home-filter-options').getBoundingClientRect();return box.left>=0&&box.right<=innerWidth;}));await page.keyboard.press('Escape');if(width===1536||width===390)await page.screenshot({path:path.join(os.tmpdir(),`hlrcs-home-design-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:390,height:1000});await page.getByRole('button',{name:'Mở thực đơn',exact:true}).click();assert.equal(await page.locator('#navMenu').isVisible(),true);
 mode='unconfigured';await page.goto(baseUrl);await page.locator('.room-card').waitFor();assert.equal(await page.getByRole('button',{name:'Chi tiết phòng',exact:true}).isDisabled(),true);assert.equal(await page.locator('.room-card a[href*="roomTypeId"]').count(),0);
 mode='empty';await page.reload();await page.getByRole('heading',{name:'Chưa có nhà trọ được công khai',exact:true}).waitFor();assert.equal(await page.locator('.room-card').count(),0);
 mode='error';await page.reload();await page.getByRole('heading',{name:'Chưa thể tải danh sách nhà trọ',exact:true}).waitFor();mode='data';await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.locator('.room-card').first().waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,filters:true,detail:true,loadMore:true,emptyAndError:true,viewportChecks:6,detailPageNavigation:true,noQuickViewModal:true,backPreservesFilters:true,contactAnchor:true,missingRoomTypeDisabled:true,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
