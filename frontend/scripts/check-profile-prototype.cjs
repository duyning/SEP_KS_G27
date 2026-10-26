const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 let user={userId:52,fullName:'Người dùng từ database',email:'profile@example.test',phoneNumber:'0981234098',role:'USER',status:'ACTIVE',createdAt:'2025-06-01T10:00:00',organization:'Trường đã lưu',preferredArea:'Tân Xã',avatar:null,capabilities:[]};let updates=0,passwordChanges=0,failNext=false;
 const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','profile-test-token'));
 await page.route('**/api/**',async route=>{const request=route.request(),url=new URL(request.url());assert.ok(request.headers().authorization);
  if(url.pathname==='/api/auth/me')return route.fulfill({json:{success:true,data:user}});
  if(url.pathname==='/api/auth/profile'){
   assert.equal(request.method(),'PUT');const body=request.postDataJSON();assert.equal(body.role,undefined);assert.equal(body.email,undefined);
   if(failNext){failNext=false;return route.fulfill({status:400,json:{success:false,message:'Số điện thoại đã được sử dụng.'}});}
   updates++;user={...user,...body};return route.fulfill({json:{success:true,data:user}});
  }
  if(url.pathname==='/api/auth/change-password'){assert.equal(request.method(),'PUT');assert.deepEqual(request.postDataJSON(),{oldPassword:'Current@123',newPassword:'NewPassword@456'});passwordChanges++;return route.fulfill({json:{success:true}});}
  if(url.pathname==='/api/auth/logout')return route.fulfill({json:{success:true}});
  throw Error('Unexpected API '+url.pathname);
 });
 await page.goto('http://127.0.0.1:5173/profile');await page.locator('#viewFullName').waitFor();assert.equal(await page.locator('#viewFullName').innerText(),user.fullName);assert.equal(await page.locator('#viewEmail').innerText(),user.email);assert.equal(await page.locator('#viewOrganization').innerText(),user.organization);assert.ok((await page.locator('#profileMemberSince').innerText()).includes('2025'));assert.equal(await page.locator('.public-header').count(),0);
 await page.locator('#btnStartEditProfile').click();await page.locator('#editFullName').fill('');await page.locator('#btnSaveProfile').click();await page.locator('#errEditFullName').waitFor({state:'visible'});assert.equal(updates,0);
 await page.locator('#editFullName').fill('Tên cập nhật');await page.locator('#editPhone').fill('abc');await page.locator('#btnSaveProfile').click();await page.locator('#errEditPhone').waitFor({state:'visible'});assert.equal(updates,0);
 await page.locator('#editPhone').fill('0981234098');await page.locator('#editOrganization').fill('FPT Campus');await page.locator('#editAddress').fill('Thạch Hòa');failNext=true;await page.locator('#btnSaveProfile').click();await page.getByRole('alert').filter({hasText:'Số điện thoại đã được sử dụng.'}).waitFor();assert.equal(await page.locator('#profileEditForm').isVisible(),true);
 await page.locator('#btnSaveProfile').click();await page.locator('#profileViewMode').waitFor({state:'visible'});assert.equal(updates,1);assert.equal(await page.locator('#viewOrganization').innerText(),'FPT Campus');await page.reload();await page.locator('#viewFullName').waitFor();assert.equal(await page.locator('#viewFullName').innerText(),'Tên cập nhật');
 await page.locator('#avatarFileInput').setInputFiles({name:'avatar.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});assert.equal(updates,1);
 await page.locator('#avatarFileInput').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await page.locator('#profileAvatarImg').waitFor({state:'visible'});assert.equal(updates,2);assert.ok(user.avatar.startsWith('data:image/png;base64,'));
 for(const [tab,heading] of [['favorites','Nhà trọ đã lưu của bạn'],['appointments','Lịch hẹn xem phòng thực tế'],['reports','Báo cáo nhà trọ của tôi'],['security','Bảo mật & Đổi mật khẩu']]){await page.locator(`[data-tab="${tab}"]`).click();await page.getByRole('heading',{name:heading,exact:true}).waitFor();}
 await page.locator('#currentPassword').fill('Current@123');await page.locator('#newPassword').fill('NewPassword@456');await page.locator('#confirmNewPassword').fill('mismatch');await page.locator('#btnSubmitChangePassword').click();await page.locator('#errConfirmNewPassword').waitFor({state:'visible'});assert.equal(passwordChanges,0);
 await page.locator('#confirmNewPassword').fill('NewPassword@456');await page.locator('#btnSubmitChangePassword').click();await page.getByRole('dialog').waitFor();assert.equal(passwordChanges,0);await page.getByRole('button',{name:'Xác nhận đổi mật khẩu',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(passwordChanges,1);
 await page.locator('[data-tab="info"]').click();
 for(const width of [1536,1024,768,390]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);return document.fonts.ready;});await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow at '+width);if(width===1536||width===390)await page.screenshot({path:require('os').tmpdir()+`/hlrcs-profile-${width}.png`,fullPage:true});}
 await page.locator('#mobileMenuBtn').click();assert.equal(await page.locator('#navMenu').isVisible(),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,databaseBoundFields:true,validation:true,saveAndReload:true,avatar:true,passwordConfirmation:true,tabs:5,viewports:4,realDatabaseMutations:0}));
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
