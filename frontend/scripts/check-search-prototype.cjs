const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 const items=Array.from({length:8},(_,i)=>({propertyId:i+1,roomTypeId:101+i,propertyName:`Nhà trọ dữ liệu ${i+1}`,roomTypeName:'Studio khép kín ban công',address:i%2?'Bình Yên, Hà Nội':'Tân Xã, Hà Nội',price:2000000+i*100000,areaSqm:22+i,verificationStatus:'APPROVED',availableRooms:i%3?2:0,imageUrl:'/api/test-search-photo',amenities:i%2?['balcony']:['airConditioner','balcony'],electricityPrice:3500,waterPrice:30000}));
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#d4c3b1"/><rect x="420" y="40" width="300" height="330" fill="#9bbfbc"/><rect x="50" y="350" width="450" height="180" fill="#bfa58d"/></svg>';
 let mode='data';
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());assert.equal(req.method(),'GET');
  if(url.pathname==='/api/auth/me')return route.fulfill({status:401,json:{success:false}});
  if(url.pathname==='/api/test-search-photo')return route.fulfill({contentType:'image/svg+xml',body:svg});
  if(url.pathname==='/api/properties/search'){
   requests.push(url.search);if(mode==='error')return route.fulfill({status:500,json:{success:false,message:'Máy chủ kiểm thử tạm ngừng'}});
   const p=url.searchParams;let list=mode==='empty'?[]:items.filter(item=>(!p.get('q')||item.propertyName.toLowerCase().includes(p.get('q').toLowerCase()))&&(!p.get('location')||p.get('location')==='all'||p.get('location')==='tan-xa'&&item.address.includes('Tân Xã')||p.get('location')==='binh-yen'&&item.address.includes('Bình Yên'))&&(p.get('availableOnly')!=='true'||item.availableRooms>0)&&(p.get('amenities')||'').split(',').filter(Boolean).every(key=>item.amenities.includes(key)));
   if(p.get('sort')==='price-desc')list.sort((a,b)=>b.price-a.price);if(p.get('sort')==='area-desc')list.sort((a,b)=>b.areaSqm-a.areaSqm);
   const current=Number(p.get('page')||0),size=Number(p.get('size')||6);return route.fulfill({json:{success:true,data:{items:list.slice(current*size,(current+1)*size),page:current,size,totalElements:list.length,totalPages:Math.ceil(list.length/size)}}});
  }
  if(url.pathname.endsWith('/details')){const type=Number(url.pathname.match(/room-types\/(\d+)/)?.[1]),summary=items.find(item=>item.roomTypeId===type);return route.fulfill({json:{success:true,data:{summary,gallery:[],propertyGallery:[],roomTypes:[summary],amenities:summary.amenities,propertyAmenities:[],selectedRules:[],similar:[],reviews:{totalReviews:0,averageRating:null,ratingCounts:[0,0,0,0,0],latest:[]},publicContact:null}}});}
  throw Error('Unexpected API path '+url.pathname);
 });
 const base='http://127.0.0.1:5173/search';await page.goto(base);await page.locator('.room-card').first().waitFor();
 assert.equal(await page.locator('.room-card').count(),6);assert.equal(await page.locator('.navbar-wrapper').count(),1);assert.equal(await page.locator('.footer-wrapper').count(),1);assert.equal(await page.locator('#resultsCount strong').innerText(),'8');
 let referenceCompared=false;
 if(process.env.PROTOTYPE_URL){const ref=await browser.newPage({viewport:{width:1440,height:1000}});await ref.goto(process.env.PROTOTYPE_URL);await ref.locator('.room-card').first().waitFor();await ref.evaluate(()=>document.fonts.ready);await page.evaluate(()=>document.fonts.ready);
  for(const selector of ['.search-controls-box','.listing-grid-container']){
   const geometry=async p=>p.locator(selector).evaluate(e=>({width:e.offsetWidth,columns:getComputedStyle(e).gridTemplateColumns}));assert.deepEqual(await geometry(page),await geometry(ref),selector+' differs from prototype');
  }await ref.screenshot({path:path.join(os.tmpdir(),'hlrcs-search-reference-1440.png'),fullPage:true});await ref.close();referenceCompared=true;
 }
 for(const width of [1440,1280,1024,768,390,375]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width);if(width===390){assert.ok(await page.locator('.quick-filter-pills').evaluate(e=>e.offsetHeight<70),'Mobile quick filters must stay horizontal');await page.screenshot({path:path.join(os.tmpdir(),'hlrcs-search-mobile-viewport.png')});}if([1440,390].includes(width))await page.screenshot({path:path.join(os.tmpdir(),`hlrcs-search-prototype-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Trang 2',exact:true}).click();await page.waitForURL('**page=2');await page.waitForFunction(()=>document.querySelectorAll('.room-card').length===2);assert.ok(requests.at(-1).includes('page=1'));
 await page.getByLabel('Khu vực',{exact:true}).selectOption('tan-xa');await page.waitForFunction(()=>document.querySelector('#resultsCount strong')?.textContent==='4');assert.equal(new URL(page.url()).searchParams.has('page'),false);
 await page.getByRole('button',{name:'Xóa tất cả',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#resultsCount strong')?.textContent==='8');
 await page.getByLabel('Sắp xếp theo:',{exact:true}).selectOption('price-desc');await page.waitForFunction(()=>document.querySelector('.room-card')?.dataset.id==='108');
 const detail=await page.locator('.btn-card-detail').first().getAttribute('href');assert.equal(detail,'/properties/detail?propertyId=8&roomTypeId=108');await page.locator('.btn-card-detail').first().click();await page.locator('.rtd-heading h1').waitFor();await page.goBack();await page.locator('.room-card').first().waitFor();assert.equal(await page.getByLabel('Sắp xếp theo:',{exact:true}).inputValue(),'price-desc');
 await page.locator('.btn-card-wishlist').first().click();assert.equal(await page.locator('.btn-card-wishlist').first().getAttribute('aria-pressed'),'true');await page.reload();await page.locator('.room-card').first().waitFor();assert.equal(await page.locator('.btn-card-wishlist').first().getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:375,height:844});await page.getByLabel('Khu vực',{exact:true}).selectOption('binh-yen');await page.waitForFunction(()=>document.querySelector('#resultsCount strong')?.textContent==='4');assert.equal(await page.getByRole('button',{name:'Bộ lọc nâng cao',exact:true}).count(),0);
 await page.getByRole('button',{name:'Mở thực đơn',exact:true}).click();assert.equal(await page.locator('#navMenu.show').count(),1);await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:720,height:500});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Equivalent 200% reflow');
 mode='empty';await page.reload();await page.getByRole('heading',{name:'Không tìm thấy phòng trọ phù hợp'}).waitFor();assert.equal(await page.locator('.room-card').count(),0);
 mode='error';await page.reload();await page.getByRole('heading',{name:'Không thể tải danh sách nhà trọ'}).waitFor();mode='data';await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.locator('.room-card').first().waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,referenceCompared,widths:6,serverFilters:true,advancedRemoved:true,pagination:true,backPreservesFilters:true,mobileBasicFilters:true,savedOnDevice:true,emptyErrorRetry:true,reducedMotion:true,zoomReflowEquivalent:true,mysqlWrites:0,pageErrors:0}));
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
