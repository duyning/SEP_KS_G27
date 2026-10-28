const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const widths=[1920,1440,1366,1280,1024,768,390];
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const errors=[];let checks=0;
 for(const [role,path] of [['USER','/profile'],['ROOM_HOST','/host/room-types'],['STAFF','/staff'],['ADMIN','/admin']]){
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','motion-test'));
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;assert.equal(route.request().method(),'GET');let data;
   if(path==='/api/auth/me')data={userId:88,role,fullName:'Kiểm thử motion',email:'motion@example.test',phoneNumber:'0981234567',status:'ACTIVE'};
   else if(path==='/api/host/room-types')data={properties:[],roomTypes:[],pendingRegistrationCount:0};
   else if(path==='/api/staff/dashboard')data={queue:[],activities:[],pendingVerifications:0,pendingReports:0,pendingCommunity:0,pendingFeedback:0,pendingSupport:0,activeProperties:0,processedTasks:0};
   else if(path==='/api/host-applications')data={content:[],totalElements:0,totalPages:0,number:0,size:8,stats:{total:0,pending:0,needsChanges:0,approved:0,rejected:0}};
   else return route.fulfill({status:503,json:{success:false,message:'API chưa khả dụng trong kiểm thử motion.'}});
   return route.fulfill({json:{success:true,data}});
  });
  for(const width of widths){await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5173'+path);await page.locator('main').first().waitFor();await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),role+' overflow '+width);checks++;}
  if(role==='STAFF'){
   await page.locator('#btnHostUserDropdown').focus();await page.keyboard.press('Enter');await page.locator('#hostUserPopover').waitFor();await page.keyboard.press('Escape');await page.locator('#hostUserPopover').waitFor({state:'hidden'});assert.equal(await page.locator('#btnHostUserDropdown').evaluate(e=>e===document.activeElement),true);
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,portals:4,widths,responsiveChecks:checks,accountMenuKeyboard:true,pageErrors:0,realDatabaseMutations:0}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
