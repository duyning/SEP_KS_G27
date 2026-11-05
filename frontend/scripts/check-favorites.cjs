const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FRONTEND_URL||'http://127.0.0.1:5173';
const output=path.resolve(__dirname,'../../.local/favorites-ui');
fs.mkdirSync(output,{recursive:true});
const summary=id=>({propertyId:12,roomTypeId:id,propertyName:'Nhà trọ công khai',roomTypeName:`Studio ${id}`,address:'Tân Xã',imageUrl:null,price:2200000,areaSqm:25,verificationStatus:'APPROVED',availableRooms:2,amenities:['airConditioner']});
const entry=(id,available=true)=>({favoriteId:100+id,roomTypeId:id,createdAt:'2026-11-05T10:00:00',available,accommodation:available?summary(id):null});

async function mocked(browser){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','favorites-ui-member'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let saved=new Map(),postCount=0,failRemove=false,failList=false,delayList=false,releaseSave,releaseList;
 const apiUrl=new URL('/api/',base).href;
 await page.route(`${apiUrl}**`,async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname;
  const ok=data=>route.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:41,fullName:'Thành viên kiểm thử',email:'member@example.test',role:'USER',status:'ACTIVE',capabilities:[]});
  if(p==='/api/properties/search')return ok({items:[summary(34),summary(35)],page:0,size:6,totalElements:2,totalPages:1});
  if(p==='/api/favorites/state')return ok({items:[...saved.values()].filter(item=>(url.searchParams.get('roomTypeIds')||'').split(',').includes(String(item.roomTypeId))).map(({favoriteId,roomTypeId})=>({favoriteId,roomTypeId})),total:saved.size});
  if(p==='/api/favorites'&&request.method()==='GET'){
   if(delayList)await new Promise(resolve=>{releaseList=resolve});
   if(failList)return route.fulfill({status:500,json:{success:false,message:'Không thể đọc danh sách kiểm thử.'}});
   const index=Number(url.searchParams.get('page')),items=[...saved.values()];
   return ok({items:items.slice(index*6,index*6+6),page:index,size:6,totalElements:items.length,totalPages:Math.ceil(items.length/6)});
  }
  if(p==='/api/favorites'&&request.method()==='POST'){
   postCount++;await new Promise(resolve=>{releaseSave=resolve});const id=request.postDataJSON().roomTypeId;saved.set(id,entry(id));return ok(entry(id));
  }
  if(p.startsWith('/api/favorites/')&&request.method()==='DELETE'){
   if(failRemove)return route.fulfill({status:500,json:{success:false,message:'Chưa thể bỏ lưu. Vui lòng thử lại.'}});
   for(const [id,item]of saved)if(String(item.favoriteId)===p.split('/').pop())saved.delete(id);
   return ok(null);
  }
  return route.fulfill({status:404,json:{success:false,message:'Unexpected test endpoint'}});
 });
 await page.goto(`${base}/search`,{waitUntil:'domcontentloaded'});
 const heart=page.locator('[data-id="34"] .btn-card-wishlist');await heart.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-id="34"] .btn-card-wishlist')?.disabled);
 await heart.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('[data-id="34"] .btn-card-wishlist')?.disabled);
 assert.equal(await heart.getAttribute('aria-pressed'),'false');assert.equal(postCount,1);
 releaseSave();await page.waitForFunction(()=>document.querySelector('[data-id="34"] .btn-card-wishlist')?.getAttribute('aria-pressed')==='true');
 assert.equal(await page.locator('[data-id="35"] .btn-card-wishlist').getAttribute('aria-pressed'),'false');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-id="34"] .btn-card-wishlist')?.getAttribute('aria-pressed')==='true');
 await page.goto(`${base}/favorites`,{waitUntil:'domcontentloaded'});await page.locator('.favorites-grid .room-card').waitFor();
 failRemove=true;await page.locator('.favorites-grid .btn-card-wishlist').click();await page.getByRole('alert').filter({hasText:'Chưa thể bỏ lưu'}).waitFor();await page.locator('.favorites-grid .room-card').waitFor();assert.equal(saved.size,1);
 failRemove=false;await page.locator('.favorites-grid .btn-card-wishlist').click();await page.getByRole('heading',{name:'Bạn chưa lưu loại phòng nào'}).waitFor();assert.equal(saved.size,0);
 failList=true;await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Không thể tải danh sách yêu thích'}).waitFor();failList=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:'Bạn chưa lưu loại phòng nào'}).waitFor();
 saved=new Map([[34,entry(34,false)]]);delayList=true;await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'Đang tải danh sách yêu thích'}).waitFor();delayList=false;releaseList();await page.getByRole('heading',{name:'Loại phòng không còn khả dụng'}).waitFor();assert.equal(await page.locator('.favorites-page').getByText('Nhà trọ công khai').count(),0);await page.screenshot({path:path.join(output,'unavailable.png'),fullPage:true});
 saved=new Map(Array.from({length:7},(_,i)=>[34+i,entry(34+i)]));await page.reload({waitUntil:'domcontentloaded'});await page.locator('.favorites-grid .room-card').first().waitFor();assert.equal(await page.locator('.favorites-grid .room-card').count(),6);
 // 720 CSS px also checks the layout space of a 1440 px display at 200% zoom.
 for(const width of [375,720,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${width}`);if(width===375||width===1440)await page.screenshot({path:path.join(output,`favorites-${width}.png`),fullPage:true});}
 await page.getByRole('button',{name:'Sau →',exact:true}).click();await page.locator('[data-id="40"]').waitFor();assert.equal(await page.locator('.favorites-grid .room-card').count(),1);await page.locator('.favorites-grid .btn-card-wishlist').click();await page.waitForURL('**/favorites?page=1');await page.locator('.favorites-grid .room-card').first().waitFor();assert.equal(saved.size,6);
 assert.deepEqual(errors,[]);await context.close();
 const guest=await browser.newPage();await guest.goto(`${base}/search`,{waitUntil:'domcontentloaded'});await guest.locator('.room-card .btn-card-wishlist').first().click();await guest.waitForURL('**/login');await guest.close();
 return {mocked:true,successAfterResponse:true,independentRoomTypes:true,reload:true,failedDeletePreservesEntry:true,emptyErrorRetry:true,loading:true,unavailableRedaction:true,pagination:true,lastPageRemoval:true,guestLogin:true,widths:5};
}

async function real(browser){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),api=context.request;
 const response=await api.post(`${base}/api/auth/login`,{data:{email:process.env.FAVORITES_TEST_EMAIL||'user@hlrcs.com',password:process.env.FAVORITES_TEST_PASSWORD||'123456'}});
 assert.equal(response.status(),200);const session=(await response.json()).data,headers={Authorization:`Bearer ${session.accessToken}`};
 const items=(await (await api.get(`${base}/api/properties/search?size=50`)).json()).data.items;
 const state=(await(await api.get(`${base}/api/favorites/state?roomTypeIds=${items.map(i=>i.roomTypeId).join(',')}`,{headers})).json()).data;
 const candidate=items.find(item=>!state.items.some(saved=>saved.roomTypeId===item.roomTypeId));assert.ok(candidate,'Need an unsaved public room type for reversible smoke test');
 const id=candidate.roomTypeId,page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(token=>sessionStorage.setItem('hlrcs_access_token',token),session.accessToken);
 try{
  // Insert auth into the already-created page before application load as well.
  await page.addInitScript(token=>sessionStorage.setItem('hlrcs_access_token',token),session.accessToken);
  await page.goto(`${base}/search?size=50`,{waitUntil:'domcontentloaded'});
  // Use a public search by actual room type name so it is visible on the first page.
  await page.locator('#searchInput').fill(candidate.roomTypeName);
  const heart=page.locator(`[data-id="${id}"] .btn-card-wishlist`);await heart.waitFor();await page.waitForFunction(id=>!document.querySelector(`[data-id="${id}"] .btn-card-wishlist`)?.disabled,id);await heart.click();await page.waitForFunction(id=>document.querySelector(`[data-id="${id}"] .btn-card-wishlist`)?.getAttribute('aria-pressed')==='true',id);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(id=>document.querySelector(`[data-id="${id}"] .btn-card-wishlist`)?.getAttribute('aria-pressed')==='true',id);
  await page.goto(`${base}/properties/detail?propertyId=${candidate.propertyId}&roomTypeId=${id}`,{waitUntil:'domcontentloaded'});await page.locator('.rtd-save-room[aria-pressed="true"]').waitFor();
  await page.goto(`${base}/favorites`,{waitUntil:'domcontentloaded'});await page.locator(`[data-id="${id}"]`).waitFor();await page.locator(`[data-id="${id}"] .btn-card-wishlist`).click();await page.waitForFunction(id=>!document.querySelector(`[data-id="${id}"]`),id);
  const current=(await(await api.get(`${base}/api/favorites/state?roomTypeIds=${id}`,{headers})).json()).data;assert.equal(current.items.length,0);assert.equal(current.total,state.total);
  const detail=await api.get(`${base}/api/properties/${candidate.propertyId}/room-types/${id}`);assert.equal(detail.status(),200);assert.equal((await detail.json()).data.availableRooms,candidate.availableRooms);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hlrcs:public-saved-properties')),null);assert.deepEqual(errors,[]);
  return {realDatabase:true,searchSave:true,reloadPersists:true,detailSynced:true,favoritesRemove:true,roomPreserved:true,noFavoriteLocalStorage:true};
 }finally{
  // Restore only the temporary favorite added by this smoke test.
  const current=(await(await api.get(`${base}/api/favorites/state?roomTypeIds=${id}`,{headers})).json()).data;
  for(const item of current.items)await api.delete(`${base}/api/favorites/${item.favoriteId}`,{headers});
  await context.close();
 }
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const mock=await mocked(browser),actual=process.env.SKIP_REAL_FAVORITES?{realDatabase:'skipped'}:await real(browser);console.log(JSON.stringify({passed:true,...mock,...actual}));}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
