const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.REVERIFICATION_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];let writes=0;page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','property-queue-fixture'));
 const row={registrationId:13,name:'Nhà trọ chờ xét duyệt',address:'Tân Xã',ownerName:'Chủ trọ mẫu',ownerPhone:'0934567812',ownerEmail:'sample@example.test',ownerId:1,status:'PENDING',createdAt:'2026-11-12T10:00:00',submittedAt:'2026-11-13T10:00:00',documentCount:2,requiredDocumentCount:2,photoCount:0,coverId:null,assignmentVersion:1,canReview:true,readyForApproval:false};
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname,ok=data=>r.fulfill({json:{success:true,data}});if(r.request().method()!=='GET')writes++;
  if(p==='/api/auth/me')return ok({userId:2,fullName:'Staff kiểm thử',role:'STAFF',email:'staff@example.test',status:'ACTIVE'});
  if(p==='/api/staff/verifications')return ok([row,{...row,registrationId:14,name:'Nhà trọ đã duyệt',status:'APPROVED',canReview:false}]);
  if(p==='/api/staff/verifications/13')return ok({summary:row,submission:{name:row.name,addressDetail:'Tân Xã',commune:'Tân Xã',managerName:row.ownerName,contactPhone:row.ownerPhone,amenities:[],selectedRules:[]},photos:[],documents:[],history:[],submissionEvents:[],assignmentVersion:1,canReview:true});
  if(p==='/api/staff/dashboard')return ok({pendingVerifications:1,pendingReports:0,pendingSupport:0,pendingCommunity:0,activeProperties:1,processedTasks:0,queue:[],activities:[]});
  return ok({items:[],totalElements:0,unreadCount:0});
 });
 const pending=page.locator('[role="tab"][data-tab-value="PENDING"]'),all=page.locator('[role="tab"][data-tab-value="ALL"]');
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/staff/verifications');await pending.waitFor();assert.equal(await pending.getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.sv-queue-row').count(),1);assert.equal(await page.locator('.sv-code-chip').count(),0);assert.equal(await page.getByText('HS-13',{exact:true}).count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 }
 await all.click();assert.equal(new URL(page.url()).searchParams.get('status'),'ALL');await page.waitForTimeout(300);assert.equal(await page.locator('.sv-queue-row').count(),2);
 await page.getByRole('button',{name:'Đặt lại bộ lọc',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-tab-value="PENDING"]')?.getAttribute('aria-selected')==='true');assert.equal(await pending.getAttribute('aria-selected'),'true');
 await all.click();await page.locator('a[href="/staff/verifications"]').first().click();await page.waitForFunction(()=>document.querySelector('[data-tab-value="PENDING"]')?.getAttribute('aria-selected')==='true');assert.equal(await pending.getAttribute('aria-selected'),'true');
 await page.goto(base+'/staff/verifications/detail?id=13');await page.locator('.svd-page').waitFor();assert.equal(await page.locator('.svd-record-code').count(),0);assert.equal(await page.getByText('Mã hồ sơ',{exact:true}).count(),0);assert.equal(await page.getByText('HS-13',{exact:true}).count(),0);
 assert.equal(writes,0);assert.deepEqual(errors,[]);console.log('PASS property verification pending default, reset/sidebar re-entry, All tab, no record codes in list/detail, four widths and zero writes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
