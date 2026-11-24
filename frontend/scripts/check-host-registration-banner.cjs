// Test navigation/UI with API fixtures only; do not send real applications.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.HOST_BANNER_TEST_URL||'http://127.0.0.1:5198';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const output=path.resolve(__dirname,'../../target/host-registration-banner');fs.mkdirSync(output,{recursive:true});
 async function setup(role,reducedMotion='no-preference'){
  const page=await browser.newPage({reducedMotion}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(role)await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','banner-fixture'));
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/api/**',route=>{
   assert.equal(route.request().method(),'GET','No SMS/application writes');
   const p=new URL(route.request().url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
   if(p==='/api/auth/me')return ok({userId:1,fullName:'Người dùng kiểm thử',phoneNumber:'0912345678',email:'test@example.test',role});
   if(p==='/api/public/properties')return ok([]);
   if(p.startsWith('/api/favorites'))return ok({items:[],total:0});
   if(p==='/api/host-onboarding/current')return ok({account:null,registration:null});
   return ok({items:[],unreadCount:0,totalElements:0});
  });
  return {page,errors};
 }
 const {page,errors}=await setup('USER');
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/');
  const banner=page.getByRole('complementary',{name:'Đăng ký trở thành chủ trọ',exact:true});await banner.waitFor();
  assert.equal(await banner.getByRole('link',{name:'Đăng ký làm chủ trọ'}).getAttribute('href'),'/become-host');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.ok(await banner.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
  assert.equal(await page.locator('.navbar-wrapper > .host-entry-banner').count(),1);
  assert.equal(await page.locator('.top-announcement').count(),0);
  assert.equal(await page.locator('.host-entry-banner button').count(),0);
  if(width<=600){
   assert.equal(await banner.getByText('Hòa Lạc Campus',{exact:true}).isVisible(),true);
   assert.equal(await banner.locator('.host-entry-viewport').isVisible(),false);
   await page.screenshot({path:path.join(output,`home-${width}.png`),fullPage:false});
   continue;
  }
  await page.waitForFunction(()=>{const viewport=document.querySelector('.host-entry-viewport'),group=document.querySelector('.host-entry-group');return group&&group.getBoundingClientRect().width>=viewport.getBoundingClientRect().width;});
  const seam=await page.locator('.host-entry-track').evaluate(el=>{
   const animation=el.getAnimations()[0],duration=animation.effect.getTiming().duration,groups=el.children;
   animation.pause();animation.currentTime=0;
   const start=groups[0].getBoundingClientRect().left;
   animation.currentTime=duration-0.1;
   const end=groups[1].getBoundingClientRect().left;
   const widths=[...groups].map(group=>group.getBoundingClientRect().width);
   animation.currentTime=0;animation.play();return {difference:Math.abs(end-start),widths,duration};
  });
  assert.ok(seam.difference<1,'Loop ends exactly where the next identical group starts');
  assert.ok(Math.abs(seam.widths[0]-seam.widths[1])<1);
  assert.ok(Math.abs(seam.widths[0]/(seam.duration/1000)-42)<0.1,'Speed stays constant across widths');
  await page.screenshot({path:path.join(output,`home-${width}.png`),fullPage:false});
 }
 const banner=page.locator('.host-entry-banner'),track=page.locator('.host-entry-track');
 await banner.hover();assert.equal(await track.evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await page.getByRole('link',{name:'Đăng ký làm chủ trọ',exact:true}).focus();
 assert.equal(await track.evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
 await page.evaluate(()=>document.documentElement.style.zoom='2');
 // Check the added banner at 200%; the existing desktop navigation has separate zoom limitations.
 assert.ok(await banner.evaluate(el=>el.scrollWidth<=el.clientWidth+2));await page.evaluate(()=>document.documentElement.style.zoom='');
 await page.getByRole('link',{name:'Đăng ký làm chủ trọ',exact:true}).press('Enter');
 await page.waitForURL(base+'/become-host');await page.getByRole('heading',{name:'Thông tin tài khoản & CCCD',exact:true}).waitFor();
 assert.equal(await page.locator('.navbar-wrapper > .host-entry-banner').count(),1);
 assert.deepEqual(errors,[]);await page.close();
 const guest=await setup(null);await guest.page.goto(base+'/');
 await guest.page.getByRole('link',{name:'Đăng ký làm chủ trọ',exact:true}).click();await guest.page.waitForURL(base+'/login');
 assert.equal(await guest.page.evaluate(()=>history.state.usr.from),'/become-host');assert.deepEqual(guest.errors,[]);await guest.page.close();
 for(const role of ['ROOM_HOST','STAFF','ADMIN']){
  const current=await setup(role);await current.page.goto(base+'/');await current.page.locator('.prototype-home').waitFor();assert.equal(await current.page.locator('.host-entry-link').count(),0);assert.deepEqual(current.errors,[]);await current.page.close();
 }
 const reduced=await setup('USER','reduce');await reduced.page.goto(base+'/');await reduced.page.locator('.host-entry-track').waitFor();assert.equal(await reduced.page.locator('.host-entry-track').evaluate(el=>getComputedStyle(el).animationName),'none');await reduced.page.close();
 console.log('PASS: USER direct application, guest login return route, role visibility, keyboard, no pause button, original announcement slot, hover/focus, reduced motion, four widths and 200% zoom. No real writes.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
