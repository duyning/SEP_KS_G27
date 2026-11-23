const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = path.resolve(__dirname, '../.expo/favorites-review'); fs.mkdirSync(out, { recursive: true });
const rooms = Array.from({ length: 18 }, (_, i) => ({ propertyId: 7, roomTypeId: i + 1, roomTypeName: `Studio kiểm thử ${i + 1}`, propertyName: 'Nhà trọ kiểm thử', address: 'Thạch Hòa, Hòa Lạc, Hà Nội', price: 3200000, areaSqm: 25, availableRooms: i === 1 ? 0 : 3, imageUrl: '/api/properties/7/room-types/1/images/1', verificationStatus: 'APPROVED' }));
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultNavigationTimeout(120000);
  const errors = [], deletions = []; let failDelete = false, failList = false, account = 1; const lists = { 1: [1, 2, 99], 2: [3] };
  const record = id => ({ favoriteId: 100 + id, roomTypeId: id, available: id !== 99, accommodation: id === 99 ? null : rooms[id - 1] });
  const response = (route, data, status = 200) => route.fulfill({ status, json: { success: status < 400, data, ...(status >= 400 ? { message: 'Kiểm thử lỗi kết nối' } : {}) }, headers: { 'access-control-allow-origin': '*' } });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(el){el.textContent="Google"}}}};'}));
  await page.route('**/api/**', async route => {
   const request = route.request(), url = new URL(request.url()), method = request.method();
   if (method === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' } });
   if (/\/images\/\d+$/.test(url.pathname)) return route.fulfill({contentType:'image/jpeg',body:fs.readFileSync(path.resolve(__dirname,'../assets/images/room-fallback.jpg')),headers:{'access-control-allow-origin':'*'}});
   if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/me') { if (method === 'POST') account = request.postDataJSON().email.startsWith('other') ? 2 : 1; return response(route,{userId:account,fullName:`Tài khoản kiểm thử ${account}`,email:`account${account}@example.test`,role:'USER',status:'ACTIVE',accessToken:`test-account-${account}`}); }
   if (url.pathname === '/api/auth/logout') return response(route,null);
   if (url.pathname === '/api/properties/search') return response(route,{items:rooms.slice(0,15),page:0,size:15,totalElements:18,totalPages:2});
   if (url.pathname.endsWith('/details')) { const id=Number(url.pathname.match(/room-types\/(\d+)/)[1]); return response(route,{summary:rooms[id-1],gallery:[],propertyGallery:[],roomTypes:[],amenities:[],propertyAmenities:[],description:'Mô tả kiểm thử'}); }
   if (url.pathname === '/api/favorites/state') { const ids=(url.searchParams.get('roomTypeIds')||'').split(',').map(Number); return response(route,{items:lists[account].filter(id=>ids.includes(id)).map(id=>({roomTypeId:id,favoriteId:100+id})),total:lists[account].length}); }
   if (url.pathname === '/api/favorites' && method === 'GET') { if(failList)return response(route,null,500); const pageNumber=Number(url.searchParams.get('page')||0); return response(route,{items:lists[account].slice(pageNumber*15,(pageNumber+1)*15).map(record),page:pageNumber,size:15,totalElements:lists[account].length,totalPages:Math.ceil(lists[account].length/15)}); }
   if (url.pathname === '/api/favorites' && method === 'POST') { const id=request.postDataJSON().roomTypeId; if(!lists[account].includes(id))lists[account].push(id); return response(route,record(id)); }
   if (url.pathname.startsWith('/api/favorites/') && method === 'DELETE') { if(failDelete)return response(route,null,500); const id=Number(url.pathname.split('/').pop())-100; deletions.push(id); lists[account]=lists[account].filter(value=>value!==id); return response(route,null); }
   throw new Error(`Unexpected API ${method} ${url.pathname}`);
  });
  await page.goto('http://127.0.0.1:8092/favorites'); await page.getByText('Lưu lại nơi ở bạn yêu thích',{exact:true}).filter({visible:true}).waitFor({timeout:120000});
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.getByLabel('Email',{exact:true}).fill('first@example.test'); await page.getByLabel('Mật khẩu',{exact:true}).fill('password1'); await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.waitForURL('**/home');
  await page.getByRole('tab',{name:'Cá nhân',exact:true}).click(); await page.getByRole('button',{name:'Phòng đã lưu',exact:true}).click(); await page.getByText('3 loại phòng đã lưu',{exact:true}).filter({visible:true}).waitFor();
  await page.getByText('Loại phòng không còn công khai',{exact:true}).filter({visible:true}).waitFor();
  for(const width of [320,360,390,430]) { await page.setViewportSize({width,height:844}); await page.waitForTimeout(200); await page.screenshot({path:path.join(out,`favorites-${width}.png`)}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); }
  await page.getByRole('link',{name:/Phòng Studio kiểm thử 1,/}).click(); await page.waitForURL('**/rooms/1?propertyId=7');
  await page.getByRole('button',{name:'Bỏ lưu phòng',exact:true}).click(); await page.getByRole('button',{name:'Lưu phòng',exact:true}).waitFor(); await page.getByRole('button',{name:'Quay lại',exact:true}).click();
  await page.getByText('2 loại phòng đã lưu',{exact:true}).filter({visible:true}).waitFor(); assert.equal(await page.getByRole('link',{name:/Phòng Studio kiểm thử 1,/}).count(),0);
  failDelete=true; await page.getByRole('button',{name:'Bỏ lưu phòng',exact:true}).click(); await page.getByText('Kiểm thử lỗi kết nối',{exact:true}).filter({visible:true}).waitFor(); assert.equal(await page.getByRole('button',{name:'Bỏ lưu phòng',exact:true}).count(),1); failDelete=false;
  await page.getByRole('button',{name:'Bỏ lưu phòng',exact:true}).click(); await page.getByText('1 loại phòng đã lưu',{exact:true}).filter({visible:true}).waitFor(); await page.getByRole('button',{name:'Bỏ lưu phòng không khả dụng',exact:true}).click(); await page.getByText('Chưa có phòng yêu thích',{exact:true}).filter({visible:true}).waitFor();
  await page.getByRole('button',{name:'Khám phá phòng trọ',exact:true}).click(); await page.waitForURL('**/explore'); assert.equal(await page.getByRole('button',{name:'Quay về Trang chủ',exact:true}).count(),0);
  await page.getByRole('link',{name:/Phòng Studio kiểm thử 1,/}).getByRole('button',{name:'Lưu phòng yêu thích',exact:true}).click(); assert.ok(page.url().endsWith('/explore'));
  await page.getByRole('link',{name:/Phòng Studio kiểm thử 1,/}).getByRole('button',{name:'Bỏ lưu phòng',exact:true}).waitFor();
  lists[1]=Array.from({length:18},(_,i)=>i+1);
  await page.getByRole('tab',{name:'Trang chủ',exact:true}).click();
  await page.getByRole('tab',{name:'Cá nhân',exact:true}).click(); await page.getByRole('button',{name:'Phòng đã lưu',exact:true}).click(); await page.getByText('18 loại phòng đã lưu',{exact:true}).filter({visible:true}).waitFor();
  for(let attempt=0;attempt<8;attempt++){ await page.getByRole('link',{name:/Phòng Studio kiểm thử /}).last().scrollIntoViewIfNeeded(); await page.waitForTimeout(150); }
  await page.getByRole('link',{name:/Phòng Studio kiểm thử 18,/}).waitFor(); const last=await page.getByRole('link',{name:/Phòng Studio kiểm thử 18,/}).boundingBox(); assert.ok(last&&last.y+last.height<=844,'last card visible above screen bottom');
  await page.getByRole('button',{name:'Quay lại',exact:true}).click(); await page.getByRole('button',{name:'Đăng xuất',exact:true}).click(); await page.getByRole('button',{name:'Đăng xuất',exact:true}).last().click(); await page.waitForURL('**/account'); await page.getByRole('tab',{name:'Trang chủ',exact:true}).click(); await page.waitForURL('**/home');
  assert.equal(await page.getByRole('button',{name:'Bỏ lưu phòng',exact:true}).count(),0);
  await page.getByRole('button',{name:'Đăng nhập tài khoản',exact:true}).click(); await page.getByLabel('Email',{exact:true}).fill('other@example.test'); await page.getByLabel('Mật khẩu',{exact:true}).fill('password1'); await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.waitForURL('**/home');
  await page.getByRole('tab',{name:'Cá nhân',exact:true}).click(); await page.getByRole('button',{name:'Phòng đã lưu',exact:true}).click(); await page.getByText('1 loại phòng đã lưu',{exact:true}).filter({visible:true}).waitFor(); assert.equal(await page.getByRole('link',{name:/Phòng Studio kiểm thử 1,/}).count(),0); await page.getByRole('link',{name:/Phòng Studio kiểm thử 3,/}).waitFor();
  failList=true; await page.getByRole('link',{name:/Phòng Studio kiểm thử 3,/}).click(); await page.waitForURL('**/rooms/3?propertyId=7'); await page.getByRole('button',{name:'Quay lại',exact:true}).click(); await page.getByText('Kiểm thử lỗi kết nối',{exact:true}).filter({visible:true}).waitFor(); await page.getByRole('link',{name:/Phòng Studio kiểm thử 3,/}).waitFor(); failList=false; await page.getByRole('button',{name:'Thử lại',exact:true}).click(); await page.getByText('1 loại phòng đã lưu',{exact:true}).filter({visible:true}).waitFor();
  console.log(JSON.stringify({result:'passed',widths:[320,360,390,430],deletions,screenshots:out,pageErrors:errors})); assert.equal(errors.length,0);
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>process.exit(process.exitCode||0));




