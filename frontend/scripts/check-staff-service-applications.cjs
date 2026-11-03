const assert=require('node:assert/strict'), path=require('node:path'), os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','isolated-staff-test'));
  const rows=Array.from({length:12},(_,i)=>({registrationId:i+1,applicantId:i===2?9:40+i,applicantName:i%2?'Lê Thị Thảo':'Nguyễn Văn An',serviceName:['Chuyển trọ An Tâm','Giặt sấy sinh viên','Sửa điện nước Hòa Lạc'][i%3]+(i>2?` · Cơ sở ${i+1}`:''),categoryName:['Chuyển trọ','Giặt là','Sửa chữa'][i%3],status:i===1?'APPROVED':i===4?'NEEDS_SUPPLEMENT':i===5?'REJECTED':'PENDING',serviceArea:'Tân Xã, Thạch Hòa',description:'Hỗ trợ cộng đồng quanh khu vực Hòa Lạc. Chi phí được trao đổi trước theo phạm vi công việc.',contactPhone:'0912345678',contactEmail:'dichvu@example.test',pricingType:'FROM',price:150000,documents:[{documentId:i+1,name:'giay-to-xac-minh.pdf'}],createdAt:`2026-10-${String(i+1).padStart(2,'0')}T10:30:00`,reviewerName:i===1?'Nhân viên kiểm thử':null,...(i===1?{reviewedAt:'2026-10-12T15:00:00',capabilityDecision:'APPROVE',listingDecision:'REJECT',reasonNote:'Quyền cung cấp hợp lệ. Nội dung cần chỉnh sửa.',capabilityActive:true,providerId:5,publicEligible:false}: {})}));
  let mode='data',failReview=true,writes=0,downloads=0;
  await page.route('**/api/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
   if(p==='/api/auth/me')return ok({userId:9,role:'STAFF',fullName:'Nhân viên kiểm thử',email:'staff@example.test',status:'ACTIVE',capabilities:[]});
   if(p==='/api/staff/dashboard')return ok({queue:[],activities:[],pendingVerifications:0,pendingReports:0,pendingCommunity:0,pendingFeedback:0,pendingSupport:0,activeProperties:0,processedTasks:0});
   if(p==='/api/host-applications')return ok({content:[],totalElements:0,totalPages:0,number:0,size:1,stats:{total:0,pending:0,needsChanges:0,approved:0,rejected:0}});
   if(p==='/api/staff/service-applications')return mode==='error'?route.fulfill({status:503,json:{success:false,message:'Máy chủ thử nghiệm tạm ngừng'}}):ok(mode==='empty'?[]:rows);
   const match=p.match(/^\/api\/staff\/service-applications\/(\d+)(.*)$/);
   if(match){const row=rows.find(r=>r.registrationId===Number(match[1]));
    if(!row)return route.fulfill({status:404,json:{success:false,message:'Không tìm thấy hồ sơ'}});
    if(match[2].startsWith('/files/')){downloads++;return route.fulfill({contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'});}
    if(match[2]==='/review'){
     writes++;const payload=req.postDataJSON();assert.equal(payload.capabilityDecision,'APPROVE');assert.equal(payload.listingDecision,'REJECT');assert.ok(payload.reason.length>=10);
     await new Promise(resolve=>setTimeout(resolve,250));
     if(failReview)return route.fulfill({status:503,json:{success:false,message:'Chưa lưu quyết định, vui lòng thử lại'}});
     Object.assign(row,{status:'APPROVED',reviewedAt:'2026-10-29T10:00:00',capabilityDecision:payload.capabilityDecision,listingDecision:payload.listingDecision,reasonNote:payload.reason,reviewerName:'Nhân viên kiểm thử',capabilityActive:true,providerId:5,publicEligible:false});
    }
    return ok({application:row,history:[{id:1,actor:row.applicantName,action:'SUBMITTED',reason:'Gửi hồ sơ cung cấp dịch vụ.',time:row.createdAt}]});
   }
   throw Error(`Unexpected API ${req.method()} ${p}`);
  });
  const base='http://127.0.0.1:5173/staff/service-applications';
  await page.goto(base);await page.locator('.sa-table tbody tr').first().waitFor();
  assert.equal(await page.locator('.sa-table tbody tr').count(),9);
  assert.equal(await page.getByLabel('Trạng thái hồ sơ').inputValue(),'PENDING');
  assert.equal(await page.locator('.sa-metric>strong').first().innerText(),'12');
  assert.equal(await page.locator('#portal-navigation a[aria-current=page]').getAttribute('href'),'/staff/service-applications');
  for(const width of [1440,1024,768,375]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow list '+width);
   await page.waitForTimeout(180);if([1440,375].includes(width))await page.screenshot({path:path.join(os.tmpdir(),`hlrcs-staff-services-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});assert.ok(await page.getByRole('button',{name:'Trang sau',exact:true}).isDisabled());await page.getByLabel('Trạng thái hồ sơ').selectOption('ALL');await page.waitForFunction(()=>document.querySelectorAll('.sa-table tbody tr').length===12);
  await page.getByLabel('Tìm hồ sơ dịch vụ').fill('nguyen');await page.waitForFunction(()=>document.querySelectorAll('.sa-table tbody tr').length===6);
  await page.getByLabel('Danh mục dịch vụ').selectOption('Chuyển trọ');await page.waitForFunction(()=>document.querySelectorAll('.sa-table tbody tr').length===2);
  await page.reload();await page.locator('.sa-table tbody tr').first().waitFor();assert.equal(await page.getByLabel('Tìm hồ sơ dịch vụ').inputValue(),'nguyen');
  await page.getByRole('link',{name:'Xem hồ sơ DV-1',exact:true}).click();await page.locator('.sa-detail-title').waitFor();
  for(const width of [1440,1024,768,375]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow detail '+width);if(width===1440)await page.screenshot({path:path.join(os.tmpdir(),'hlrcs-staff-service-detail.png'),fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});
  const file=page.getByRole('button',{name:'Tải tài liệu giay-to-xac-minh.pdf',exact:true});const pendingDownload=page.waitForEvent('download');await file.click();await pendingDownload;assert.equal(downloads,1);
  await page.getByRole('button',{name:'Kiểm tra & lưu quyết định',exact:true}).click();assert.equal(writes,0);assert.equal(await page.locator('#sa-capability').evaluate(el=>el===document.activeElement),true);
  await page.locator('#sa-capability').selectOption('REJECT');assert.equal(await page.locator('#sa-listing').inputValue(),'REJECT');assert.equal(await page.locator('#sa-listing option[value=APPROVE]').isDisabled(),true);
  await page.locator('#sa-capability').selectOption('APPROVE');await page.locator('#sa-listing').selectOption('REJECT');const note='Đã xác minh giấy tờ. Nội dung cần làm rõ chi phí trước khi công khai.';await page.locator('#sa-reason').fill(note);
  await page.getByRole('button',{name:'Kiểm tra & lưu quyết định',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(writes,0);
  await page.getByRole('dialog').getByRole('button',{name:'Quay lại chỉnh sửa',exact:true}).click();await page.locator('.sa-confirm-modal').waitFor({state:'detached'});assert.equal(await page.locator('#sa-reason').inputValue(),note);
  await page.getByRole('button',{name:'Kiểm tra & lưu quyết định',exact:true}).click();await page.getByRole('dialog').waitFor();await page.screenshot({path:path.join(os.tmpdir(),'hlrcs-staff-service-confirm.png')});
  const confirm=page.getByRole('dialog').getByRole('button',{name:'Xác nhận lưu quyết định',exact:true});
  await page.setViewportSize({width:375,height:844});await page.waitForTimeout(120);
  assert.ok(await page.locator('.sa-confirm-footer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
  await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await confirm.evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Đóng');
  await page.setViewportSize({width:1440,height:1000});await confirm.click();await page.getByRole('dialog').getByRole('alert').waitFor();assert.equal(writes,1);
  failReview=false;await confirm.click();await page.locator('.sa-saved').waitFor();await page.locator('.sa-confirm-modal').waitFor({state:'detached'});assert.equal(writes,2);assert.equal(await page.locator('#sa-reason').count(),0);assert.equal(await page.getByRole('link',{name:'Xem dịch vụ công khai',exact:true}).count(),0);
  await page.getByRole('link',{name:'Danh sách hồ sơ',exact:true}).click();await page.locator('.sa-table tbody tr').first().waitFor();assert.equal(await page.getByLabel('Tìm hồ sơ dịch vụ').inputValue(),'nguyen');
  await page.goto(base+'?id=3');await page.getByText('Hồ sơ của bạn cần được một Staff hoặc Admin khác xét duyệt.',{exact:true}).waitFor();assert.equal(await page.locator('#sa-capability').count(),0);
  await page.goto(base+'?id=5');await page.getByText('Hồ sơ đang cần bổ sung.',{exact:false}).waitFor();assert.equal(await page.locator('#sa-capability').count(),0);
  mode='empty';await page.goto(base);await page.getByRole('heading',{name:'Chưa có hồ sơ dịch vụ',exact:true}).waitFor();assert.equal(await page.locator('.sa-metric>strong').first().innerText(),'0');
  mode='error';await page.reload();await page.getByRole('alert').waitFor();assert.equal(await page.locator('.sa-table tbody tr').count(),0);assert.equal(await page.locator('.sa-metric>strong').first().innerText(),'—');mode='data';await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.locator('.sa-table tbody tr').first().waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:720,height:500});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,viewports:4,urlFiltersAndPagination:true,backPreservesFilters:true,realCounts:true,download:true,confirmationRequired:true,errorRetainsDecision:true,separateDecisions:true,selfReviewBlocked:true,supplementReadOnly:true,emptyErrorRetry:true,reducedMotion:true,mockedWrites:writes,mysqlWrites:0,pageErrors:0}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
