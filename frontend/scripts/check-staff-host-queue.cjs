const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.STAFF_HOST_TEST_URL||'http://127.0.0.1:5187';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({reducedMotion:'reduce'}),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','staff-queue-fixture'));
 const row={id:3,userId:21,userName:'Chủ hồ sơ mẫu',userPhone:'0934567812',userEmail:'sample@example.test',status:'PENDING_REVIEW',targetCommune:'Đồng Trúc',expectedScale:'31 - 50 phòng',applicantCapacity:'OWNER',rentalExperience:'TWO_YEARS_OR_MORE',hasIdentityImage:true,submittedAt:'2026-11-13T10:00:00',version:0};
 await page.route('**/api/**',r=>{const url=new URL(r.request().url()),p=url.pathname,ok=data=>r.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:22,fullName:'Staff kiểm thử',role:'STAFF',status:'ACTIVE',email:'staff@example.test'});
  if(p==='/api/host-applications'){
   requests.push(Object.fromEntries(url.searchParams));const processed=['APPROVED','PROCESSED'].includes(url.searchParams.get('status'));
   return ok({content:[{...row,status:processed?'APPROVED':'PENDING_REVIEW'}],number:0,size:8,totalPages:1,totalElements:1,stats:{total:4,pending:1,needsChanges:0,approved:3,rejected:0}});
  }
  return ok({items:[],unreadCount:0,totalElements:0});
 });
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/staff/host-registrations');await page.getByText('Chủ hồ sơ mẫu',{exact:true}).filter({visible:true}).first().waitFor();
  assert.equal(requests.filter(request=>request.status).at(-1).status,'PENDING_REVIEW');
  for(const text of ['Khu vực:','Quy mô:','Đồng Trúc','31 - 50 phòng','Kinh nghiệm quản lý'])assert.equal(await page.getByText(text,{exact:true}).count(),0);
  assert.ok(await page.getByText('Đã có ảnh định danh',{exact:true}).count()>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 }
 await page.locator('#selectStatusFilter').selectOption('APPROVED');await page.waitForURL('**status=APPROVED*');await page.waitForTimeout(400);assert.equal(requests.filter(request=>request.status).at(-1).status,'APPROVED');
 // Sidebar re-entry to the base route must reset the default even without unmounting.
 await page.locator('a[href="/staff/host-registrations"]').first().click();await page.waitForTimeout(400);assert.equal(await page.locator('#selectStatusFilter').inputValue(),'PENDING_REVIEW');assert.equal(requests.filter(request=>request.status).at(-1).status,'PENDING_REVIEW');
 await page.locator('#selectStatusFilter').selectOption('ALL');await page.waitForTimeout(200);await page.locator('#btnResetFilter').click();await page.waitForTimeout(400);assert.equal(requests.filter(request=>request.status).at(-1).status,'PENDING_REVIEW');
 await page.locator('#searchHostReg').fill('hồ sơ');await page.locator('#selectSortFilter').selectOption('OLDEST');await page.waitForTimeout(600);assert.equal(requests.filter(request=>request.status).at(-1).search,'hồ sơ');assert.equal(requests.filter(request=>request.status).at(-1).sort,'OLDEST');
 assert.deepEqual(errors,[]);console.log('PASS Staff queue: pending default/re-entry/reset, other filters, debounced search with sort, removed legacy fields desktop/mobile, no mutations.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
