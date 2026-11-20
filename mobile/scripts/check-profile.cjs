const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = path.resolve(__dirname, '../.expo/profile-review'); fs.mkdirSync(out, { recursive: true });
let user = { userId: 21, fullName: 'Người dùng kiểm thử', email: 'profile@example.test', phoneNumber: '0912345678', organization: 'FPT', preferredArea: 'Tân Xã', role: 'USER', status: 'ACTIVE' };
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultNavigationTimeout(120000);
  const errors = []; const writes = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(el){el.textContent="Google"}}}};' }));
  await page.route('**/api/**', async route => {
   const url = new URL(route.request().url()); const method = route.request().method(); const headers = { 'access-control-allow-origin': '*' };
   if (method === 'OPTIONS') return route.fulfill({status:200,headers:{...headers,'access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'content-type,authorization'}});
   if (url.pathname === '/api/auth/login') return route.fulfill({json:{success:true,data:{...user,accessToken:'test-only-jwt'}},headers});
   if (url.pathname === '/api/auth/me') return route.fulfill({json:{success:true,data:user},headers});
   if (url.pathname === '/api/auth/profile') { const data = route.request().postDataJSON(); writes.push(data); user = {...user,...data}; return route.fulfill({json:{success:true,data:user},headers}); }
   if (url.pathname === '/api/auth/change-password') { const data=route.request().postDataJSON(); assert.deepEqual(data,{oldPassword:'oldpass1',newPassword:'newpass1'}); return route.fulfill({json:{success:true,data:null},headers}); }
   if (url.pathname === '/api/auth/logout') return route.fulfill({json:{success:true,data:null},headers});
   if (url.pathname.includes('/favorites/state')) return route.fulfill({json:{success:true,data:{items:[]}},headers});
   return route.fulfill({json:{success:true,data:{items:[],page:0,totalElements:0,totalPages:0}},headers});
  });
  await page.goto('http://127.0.0.1:8092/account');
  await page.getByText('Chào mừng đến với HL_RCS',{exact:true}).waitFor({timeout:120000});
  assert.equal(await page.getByRole('tab').count(),3);
  assert.equal(await page.getByRole('tab',{name:'Cá nhân',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.getByRole('button',{name:'Quay lại',exact:true}).count(),0);
  await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click(); await page.waitForURL('**/register'); await page.goBack(); await page.waitForURL('**/account');
  await page.getByRole('tab',{name:'Tìm phòng',exact:true}).click(); await page.waitForURL('**/explore'); assert.equal(await page.getByRole('tab',{name:'Tìm phòng',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('tab',{name:'Trang chủ',exact:true}).click(); await page.waitForURL('**/home'); assert.equal(await page.getByRole('tab',{name:'Trang chủ',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('tab',{name:'Cá nhân',exact:true}).click(); await page.waitForURL('**/account');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('profile@example.test'); await page.getByLabel('Mật khẩu',{exact:true}).fill('password1');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.waitForURL('**/home');
  await page.getByRole('tab',{name:'Cá nhân',exact:true}).click(); assert.equal(await page.getByRole('button',{name:'Quay lại',exact:true}).count(),0);
  await page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).getByText('Người dùng kiểm thử',{exact:true}).waitFor();
  await page.waitForTimeout(300); assert.equal(await page.getByRole('button',{name:'Hồ sơ người dùng',exact:true}).count(),0);
  await page.getByRole('tab',{name:'Trang chủ',exact:true}).click(); await page.getByRole('button',{name:'Thông báo',exact:true}).waitFor(); assert.equal(await page.getByRole('button',{name:'Hồ sơ người dùng',exact:true}).count(),0); await page.getByRole('tab',{name:'Cá nhân',exact:true}).click();
  for(const width of [320,360,390,430]) { await page.setViewportSize({width,height:844}); await page.screenshot({path:path.join(out,`overview-${width}.png`)}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); }
  await page.getByRole('button',{name:'Thông tin cá nhân',exact:true}).click(); await page.getByLabel('Họ và tên',{exact:true}).fill('Hồ sơ đã cập nhật');
  await page.getByRole('button',{name:'Quay lại',exact:true}).click(); await page.getByText('Bỏ thay đổi chưa lưu?',{exact:true}).waitFor(); await page.getByRole('button',{name:'Hủy',exact:true}).click();
  assert.equal(await page.getByLabel('Họ và tên',{exact:true}).inputValue(),'Hồ sơ đã cập nhật');
  await page.getByRole('button',{name:'Quay lại',exact:true}).click(); await page.getByRole('button',{name:'Bỏ thay đổi',exact:true}).click(); await page.getByRole('button',{name:'Thông tin cá nhân',exact:true}).click(); assert.equal(await page.getByLabel('Họ và tên',{exact:true}).inputValue(),'Người dùng kiểm thử'); await page.getByLabel('Họ và tên',{exact:true}).fill('Hồ sơ đã cập nhật');
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click(); await page.getByText('Đã lưu thay đổi hồ sơ.',{exact:true}).waitFor(); assert.equal(writes.length,1); assert.equal(writes[0].avatar,undefined); assert.equal(writes[0].email,undefined);
  for(const width of [320,390,430]) { await page.setViewportSize({width,height:844}); await page.screenshot({path:path.join(out,`edit-${width}.png`)}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); }
  await page.getByRole('button',{name:'Quay lại',exact:true}).click(); await page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).getByText('Hồ sơ đã cập nhật',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Bảo mật & mật khẩu',exact:true}).click();
  await page.getByLabel('Mật khẩu hiện tại',{exact:true}).fill('oldpass1'); await page.getByLabel('Mật khẩu mới',{exact:true}).fill('newpass1'); await page.getByLabel('Xác nhận mật khẩu mới',{exact:true}).fill('newpass1');
  await page.getByRole('button',{name:'Cập nhật mật khẩu',exact:true}).click(); await page.getByText('Đã cập nhật mật khẩu. Phiên đăng nhập hiện tại được giữ nguyên.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Mật khẩu mới',{exact:true}).inputValue(),''); await page.getByRole('button',{name:'Quay lại',exact:true}).click();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click(); await page.getByRole('button',{name:'Hủy',exact:true}).click(); await page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).getByText('Hồ sơ đã cập nhật',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click(); await page.getByRole('button',{name:'Đăng xuất',exact:true}).last().click(); await page.waitForURL('**/account'); await page.getByText('Chào mừng đến với HL_RCS',{exact:true}).filter({visible:true}).waitFor(); assert.equal(await page.getByRole('button',{name:'Hồ sơ người dùng',exact:true}).count(),0);
  assert.equal(errors.length,0,errors.join('\n')); console.log(JSON.stringify({result:'passed',widths:[320,360,390,430],profileWrites:writes.length,screenshots:out}));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>process.exit(process.exitCode||0));




