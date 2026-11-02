const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','assignment-ui-test'));
 let revoked=false,canReview=true,writes=0,role='STAFF';
 const detail=()=>({summary:{registrationId:101,name:'Hồ sơ riêng được phân công',address:'Tân Xã',status:'PENDING',ownerName:'Chủ hồ sơ',ownerId:40,createdAt:'2026-11-01T10:00:00'},submission:{name:'Hồ sơ riêng được phân công',description:'Nội dung hồ sơ riêng để kiểm tra thu hồi quyền.',managerName:'Chủ hồ sơ',contactPhone:'0912345678',amenities:[],selectedRules:[]},photos:[],documents:[{documentId:5,type:'OWNERSHIP',fileName:'private-evidence.pdf',contentType:'application/pdf',fileSize:100}],history:[],submissionEvents:[],assignedStaffId:9,assignedStaffName:'Staff A',assignmentVersion:7,canReview});
 await page.route('**/api/**',async route=>{const p=new URL(route.request().url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
  if(p==='/api/auth/me')return ok({userId:9,role,fullName:'Staff A',status:'ACTIVE',capabilities:[]});
  if(p==='/api/staff/dashboard')return ok({queue:[],activities:[],pendingVerifications:0,pendingReports:0,pendingSupport:0,pendingCommunity:0,activeProperties:0,processedTasks:0});
  if(p==='/api/host-applications')return ok({content:[],totalElements:0,totalPages:0,number:0,size:1,stats:{total:0,pending:0,needsChanges:0,approved:0,rejected:0}});
  if(p==='/api/staff/verifications/101/review'){writes++;assert.equal(route.request().postDataJSON().assignmentVersion,7);return route.fulfill({status:404,json:{success:false,message:'Không còn được phân công.'}});}
  if(p==='/api/staff/verifications/101')return revoked?route.fulfill({status:404,json:{success:false,message:'Không còn được phân công.'}}):ok(detail());
  if(p==='/api/staff/verifications/101/files/5')return route.fulfill({status:404,json:{success:false,message:'Không còn được phân công.'}});
  throw Error('Unexpected route '+p);
 });
 const url='http://127.0.0.1:5173/staff/verifications/detail?id=101';
 await page.goto(url);await page.getByRole('button',{name:'Phê duyệt hồ sơ',exact:true}).waitFor();
 await page.getByRole('button',{name:'Phê duyệt hồ sơ',exact:true}).click();await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();await page.getByText('Hồ sơ không tồn tại hoặc bạn không còn quyền truy cập theo phân công.',{exact:false}).waitFor();assert.equal(writes,1);assert.equal(await page.locator('.svd-main').count(),0);assert.equal(await page.locator('.sw-review-modal').count(),0);
 await page.goto(url);await page.getByRole('button',{name:'Xem tài liệu',exact:true}).first().click();await page.getByText('Hồ sơ không tồn tại hoặc bạn không còn quyền truy cập theo phân công.',{exact:false}).waitFor();assert.equal(await page.locator('.svd-main').count(),0);
 await page.goto(url);await page.locator('.svd-main').waitFor();revoked=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('Hồ sơ không tồn tại hoặc bạn không còn quyền truy cập theo phân công.',{exact:false}).waitFor();assert.equal(await page.locator('.svd-main').count(),0);
 revoked=false;canReview=false;role='ADMIN';await page.goto(url);await page.getByRole('button',{name:'Phê duyệt hồ sơ',exact:true}).waitFor();for(const name of ['Phê duyệt hồ sơ','Yêu cầu bổ sung','Từ chối hồ sơ'])assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,assignmentVersionSent:true,revokedReviewClearsPrivateData:true,revokedFileClearsPrivateData:true,focusRevalidatesAccess:true,oversightReadOnly:true,mockedWrites:writes,mysqlWrites:0}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
