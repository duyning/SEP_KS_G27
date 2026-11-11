const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.REVERIFICATION_TEST_URL||'http://127.0.0.1:5187';
const output=path.resolve(__dirname,'../../target/reverification-browser');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 fs.mkdirSync(output,{recursive:true});const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','reverification-fixture-only'));
 let role='ROOM_HOST',status='PENDING';
 const form={name:'Nhà trọ tái xác minh',propertyType:'Nhà trọ truyền thống / Phòng trọ sinh viên',description:'Nhà trọ có sân để xe rộng, phòng thoáng mát và khu vực phơi đồ.',managerName:'Nguyễn Văn An',contactPhone:'0912345678',zaloPhone:'',addressDetail:'Số 99, thôn 2',commune:'Tân Xã',nearby:'',latitude:'21.0188',longitude:'105.5215',amenities:[],selectedRules:[],rules:'',termsAccepted:true};
 const summary=()=>({registrationId:13,name:form.name,address:'Số 99, thôn 2, Tân Xã',ownerName:'Nguyễn Văn An',ownerEmail:'owner@test.local',ownerPhone:'0912345678',ownerId:1,managerName:form.managerName,contactPhone:form.contactPhone,propertyType:form.propertyType,status,createdAt:'2026-11-01T09:00:00',submittedAt:'2026-11-11T20:00:00',reviewedAt:status==='PENDING'?null:'2026-11-11T21:00:00',reviewerName:status==='PENDING'?null:'Nhân viên xét duyệt',documentCount:2,requiredDocumentCount:2,photoCount:0,coverId:null,targetPropertyId:12,assignedStaffName:'Nhân viên xét duyệt',assignmentVersion:1,canReview:['PENDING','NEEDS_SUPPLEMENT'].includes(status),readyForApproval:false,publishedPropertyId:null,reverificationRequired:true,reverificationReasons:['Địa chỉ nhà trọ'],reasonNote:status==='PENDING'?'':'Vui lòng kiểm tra lại địa chỉ và bổ sung mô tả.'});
 const property=()=>({propertyId:12,registrationId:10,name:form.name,address:'Số 18, thôn 2, Tân Xã',displayStatus:'INACTIVE',verified:false,propertyType:form.propertyType,description:form.description,amenities:[],selectedRules:[],photos:[],documents:[],roomTypeCount:1,totalRooms:5,vacantRooms:2,pendingViewingCount:0,createdAt:'2026-11-01T09:00:00',updatedAt:'2026-11-11T20:00:00',reverificationRequired:true,reverificationReasons:['Địa chỉ nhà trọ'],changeRequest:{registrationId:13,status,reasonNote:summary().reasonNote,requestedFields:status==='NEEDS_SUPPLEMENT'?['description']:[],fieldNotes:{}}});
 await page.route(base+'/api/**',async route=>{
  const p=new URL(route.request().url()).pathname;let data;
  assert.equal(route.request().method(),'GET','Browser fixtures must never write business data');
  if(p==='/api/auth/me')data={userId:role==='STAFF'?2:1,fullName:role==='STAFF'?'Nhân viên xét duyệt':'Chủ trọ kiểm thử',role,capabilities:[]};
  else if(p==='/api/host/property')data={records:[property()]};
  else if(p==='/api/staff/verifications')data=[summary()];
  else if(p==='/api/staff/verifications/13')data={summary:summary(),submission:form,publishedSubmission:{...form,addressDetail:'Số 18, thôn 2'},photos:[],documents:[],reasonNote:summary().reasonNote,history:[],submissionEvents:[{eventId:1,actorName:'Nguyễn Văn An',action:'REVERIFICATION_SUBMITTED',createdAt:'2026-11-11T20:00:00'}],assignedStaffId:2,assignedStaffName:'Nhân viên xét duyệt',assignmentVersion:1,canReview:summary().canReview};
  else if(p==='/api/staff/dashboard')data={pendingVerifications:1,pendingReports:0,pendingSupport:0,pendingCommunity:0,activeProperties:0,processedTasks:0,queue:[],activities:[]};
  else data={items:[],unreadCount:0,total:0};
  await route.fulfill({json:{success:true,data}});
 });
 await page.route('https://maps.googleapis.com/**',route=>route.abort());
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});role='ROOM_HOST';status='PENDING';
  await page.goto(base+'/host/property?propertyId=12');const notice=page.getByRole('region',{name:'Tái xác minh nhà trọ'}).first();await notice.waitFor();
  assert.match(await notice.innerText(),/tạm ẩn/);assert.match(await notice.innerText(),/Địa chỉ nhà trọ/);
  assert.equal(await notice.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  await page.screenshot({path:path.join(output,`host-pending-${width}.png`),fullPage:true});
  role='STAFF';await page.goto(base+'/staff/verifications/detail?id=13');const staffNotice=page.getByRole('region',{name:'Tái xác minh nhà trọ'});await staffNotice.waitFor();
  assert.match(await page.locator('.svd-change-comparison').innerText(),/Số 18/);assert.match(await page.locator('.svd-change-comparison').innerText(),/Số 99/);
  assert.equal(await staffNotice.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
  await page.screenshot({path:path.join(output,`staff-detail-${width}.png`),fullPage:true});
 }
 role='ROOM_HOST';status='NEEDS_SUPPLEMENT';await page.goto(base+'/host/property?propertyId=12');
 await page.getByRole('link',{name:'Chỉnh sửa / bổ sung hồ sơ tái xác minh'}).first().waitFor();
 assert.equal(await page.getByRole('link',{name:'Chỉnh sửa / bổ sung hồ sơ tái xác minh'}).first().getAttribute('href'),'/host/property/edit?registrationId=13');
 status='REJECTED';await page.reload();await page.getByText('Nhà trọ tạm ẩn — cần tái xác minh').first().waitFor();
 role='STAFF';status='PENDING';await page.goto(base+'/staff/verifications');await page.getByText('Tái xác minh',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Duyệt nhanh',exact:true}).count(),0);
 await page.goto(base+'/staff/verifications/detail?id=13');await page.getByRole('region',{name:'Tái xác minh nhà trọ'}).waitFor();
 await page.evaluate(()=>document.documentElement.style.zoom='2');
 assert.equal(await page.getByRole('region',{name:'Tái xác minh nhà trọ'}).evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'BODY');
 assert.deepEqual(errors,[]);console.log('PASS: host hidden/rejected/supplement guidance, staff queue/detail, old-new comparison, 4 widths, zoom and keyboard.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
