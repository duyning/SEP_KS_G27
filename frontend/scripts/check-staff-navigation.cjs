const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','staff-navigation-test'));
 const stats={total:2,pending:2,needsChanges:0,approved:0,rejected:0};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/me')return route.fulfill({json:{success:true,data:{userId:9,role:'STAFF',fullName:'Nhân viên kiểm thử',email:'staff@example.test',status:'ACTIVE',capabilities:[]}}});
  if(path==='/api/staff/dashboard')return route.fulfill({json:{success:true,data:{queue:[],activities:[],pendingVerifications:3,pendingReports:4,pendingCommunity:5,pendingFeedback:6,pendingSupport:7,activeProperties:0,processedTasks:0}}});
  if(path==='/api/host-applications')return route.fulfill({json:{success:true,data:{content:[],totalElements:0,totalPages:0,number:0,size:8,stats}}});
  return route.fulfill({status:503,json:{success:false,message:'Dữ liệu nội dung chưa khả dụng trong kiểm thử menu.'}});
 });
 const routes=[['/staff','/staff'],['/staff/host-registrations','/staff/host-registrations'],['/staff/host-registrations/detail?id=1','/staff/host-registrations'],['/staff/verifications','/staff/verifications'],['/staff/verifications/detail?id=1','/staff/verifications'],['/staff/community','/staff/community'],['/staff/community/detail?id=1','/staff/community'],['/staff/assistance','/staff/assistance'],['/staff/assistance/detail?id=1','/staff/assistance'],['/staff?view=content-moderation','/staff?view=content-moderation'],['/staff?view=feedback-verification','/staff?view=feedback-verification'],['/staff?view=history','/staff?view=history']];
 let standard;
 for(const [path,activeHref] of routes){
  await page.goto('http://127.0.0.1:5173'+path);await page.locator('#portal-navigation a[href="/staff/host-registrations"] .sw-nav-count').waitFor();
  const actual=await page.locator('#portal-navigation').evaluate(sidebar=>({width:sidebar.getBoundingClientRect().width,groups:[...sidebar.querySelectorAll('nav .portal-nav-group>p')].map(el=>el.textContent),items:[...sidebar.querySelectorAll('nav .portal-nav-link')].map(el=>({label:el.querySelector('span')?.textContent.trim(),href:el.getAttribute('href'),icon:el.querySelector('svg')?.outerHTML,count:el.querySelector('.sw-nav-count')?.textContent}))}));
  if(!standard)standard=actual;else assert.deepEqual(actual,standard,'Different Staff menu at '+path);
  const active=await page.locator('#portal-navigation a[aria-current="page"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')));assert.deepEqual(active,[activeHref],'Incorrect active item '+path);assert.equal(await page.locator('#staffSidebar').count(),0);assert.equal(await page.locator('.portal-sidebar').count(),1);
 }
 for(const path of ['/staff','/staff/host-registrations','/staff/host-registrations/detail?id=1']){
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5173'+path);await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('#portal-navigation.is-open').waitFor();await page.keyboard.press('Escape');await page.locator('#portal-navigation.is-open').waitFor({state:'hidden'});await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('#portal-navigation a[href="/staff/verifications"]').click();await page.waitForURL('**/staff/verifications');assert.equal(await page.locator('#portal-navigation.is-open').count(),0);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,identicalStaffMenus:routes.length,activeItemChecked:true,sharedPendingBadges:true,oneSidebarPerPage:true,mobileMenuRoutes:3,pageErrors:0,realDatabaseMutations:0}));
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
