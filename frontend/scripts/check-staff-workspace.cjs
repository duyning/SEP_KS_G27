const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const output = process.env.CHECK_OUTPUT || path.resolve(__dirname, '../migration/staff-check');
async function main() {
  fs.mkdirSync(output,{recursive:true});
  for(const file of ['StaffDashboardPage.jsx','StaffPropertyVerificationsPage.jsx','StaffPropertyVerificationDetailPage.jsx']) assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname,'../src/pages/staff',file),'utf8'),/MOCK_|fixtures\/|INITIAL_QUEUE|DemoNoticeBanner/);
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1536,height:1000}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    let reviewCount=0,reviewMode='error',reviewReply;
    // No browser check is permitted to approve or reject a real MySQL profile.
    await page.route(/\/api\/staff\/verifications\/\d+\/review$/,async route=>{
      reviewCount++;
      assert.equal(route.request().method(),'POST');
      if(reviewMode==='error')return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false,message:'Test-only review failure'})});
      return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:reviewReply})});
    });
    const capture=async name=>{
      await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});
      await page.screenshot({path:path.join(output,name),fullPage:true,animations:'disabled'});
    };
    await page.goto(`${base}/login`);
    await page.locator('#loginIdentifier').fill('staff@hlrcs.com');
    await page.locator('#loginPassword').fill('123456');
    const dashboardResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/staff/dashboard'&&response.status()===200);
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForURL(`${base}/staff`);
    const actualDashboard=(await(await dashboardResponse).json()).data;
    await page.getByRole('heading',{name:'Bảng điều khiển vận hành',exact:true,level:2}).waitFor();
    assert.equal(await page.locator('.sw-task').count(),actualDashboard.queue.length);
    const listResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/staff/verifications'&&response.status()===200);
    await page.getByRole('link',{name:'Xem danh sách',exact:true}).click();
    await page.waitForURL(`${base}/staff/verifications`);
    const actualList=(await(await listResponse).json()).data;
    await page.getByRole('heading',{name:'Hồ sơ xác minh nhà trọ',exact:true,level:2}).waitFor();
    let actualDetail=null;
    if(actualList.length){
      const detailResponse=page.waitForResponse(response=>/\/api\/staff\/verifications\/\d+$/.test(new URL(response.url()).pathname)&&response.status()===200);
      await page.getByRole('link',{name:'Xem hồ sơ',exact:true}).first().click();
      actualDetail=(await(await detailResponse).json()).data;
      await page.getByRole('heading',{name:actualDetail.summary.name,exact:true}).waitFor();
      assert.ok((await page.locator('.sw-detail-fields').first().innerText()).includes(actualDetail.submission?.description || actualDetail.summary.name));
      assert.equal(await page.locator('.sw-photo-gallery button').count(),actualDetail.photos.length);
      if(actualDetail.photos.length)await page.waitForFunction(expected=>Array.from(document.querySelectorAll('.sw-photo-gallery img')).length===expected&&Array.from(document.querySelectorAll('.sw-photo-gallery img')).every(image=>image.complete&&image.naturalWidth>0),actualDetail.photos.length);
      if(actualDetail.documents.length){
        await page.getByRole('button',{name:'Xem tài liệu',exact:true}).filter({has:page.locator('svg')}).first().click();
        await page.getByRole('dialog').waitFor();
        assert.match(await page.getByRole('link',{name:'Tải tài liệu',exact:true}).getAttribute('href'),/^blob:/);
        await page.keyboard.press('Escape');
      }
    }
    let viewportChecks=0;
    const routes=[['dashboard','/staff'],['verifications','/staff/verifications'],...(actualDetail?[['detail',`/staff/verifications/detail?id=${actualDetail.summary.registrationId}`]]:[])];
    for(const [name,route]of routes)for(const width of [1536,1366,1024,768,390]){
      await page.setViewportSize({width,height:width===390?844:1000});
      await page.goto(`${base}${route}`);
      await page.locator('.sw-page-heading').waitFor();
      if(name==='detail'&&actualDetail.photos.length)await page.waitForFunction(expected=>document.querySelectorAll('.sw-photo-gallery img').length===expected&&Array.from(document.querySelectorAll('.sw-photo-gallery img')).every(image=>image.complete&&image.naturalWidth>0),actualDetail.photos.length);
      if(name==='verifications'&&actualList[0]?.coverId)await page.waitForFunction(()=>document.querySelector('.sw-verifications img')?.naturalWidth>0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflows ${width}`);
      if([1536,390].includes(width))await capture(`${name}-${width}.png`);
      viewportChecks++;
    }
    await page.setViewportSize({width:1536,height:1000});
    await page.goto(`${base}/staff/verifications`);
    await page.getByLabel('Tìm hồ sơ',{exact:true}).fill('unmatched-test-query');
    await page.getByText('Không có hồ sơ phù hợp với bộ lọc.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Đặt lại',exact:true}).click();
    assert.equal(await page.locator('.sw-verifications tbody tr').count(),Math.min(5,actualList.length));
    await page.goto(`${base}/staff/verifications/detail?id=2147483647`);
    await page.getByRole('heading',{name:'Không thể tải dữ liệu',exact:true}).waitFor();
    assert.equal(await page.locator('.sw-detail-layout').count(),0);
    if(actualDetail){
      // Alternative records stay inside this browser. Persistence/approval run only against isolated H2 tests.
      let detailStatus=500;
      const id=actualDetail.summary.registrationId;
      const pending={...actualDetail,summary:{...actualDetail.summary,status:'PENDING'}};
      await page.route(new RegExp(`/api/staff/verifications/${id}$`),route=>route.fulfill({status:detailStatus,contentType:'application/json',body:JSON.stringify(detailStatus===200?{success:true,data:pending}:{success:false,message:'Test-only detail failure'})}));
      await page.goto(`${base}/staff/verifications/detail?id=${id}`);
      await page.getByRole('heading',{name:'Không thể tải dữ liệu',exact:true}).waitFor();
      detailStatus=200;
      await page.getByRole('button',{name:'Thử lại',exact:true}).click();
      await page.getByRole('button',{name:'Từ chối hồ sơ',exact:true}).click();
      await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
      await page.getByText('Vui lòng nhập lý do từ chối từ 10 đến 2000 ký tự.',{exact:true}).waitFor();
      assert.equal(reviewCount,0);
      await page.locator('#staff-review-note').fill('Test-only rejection note, no database write.');
      await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
      await page.getByText('Test-only review failure',{exact:true}).waitFor();
      assert.equal(reviewCount,1);
      await page.getByRole('button',{name:'Hủy',exact:true}).click();
      await page.getByRole('button',{name:'Phê duyệt hồ sơ',exact:true}).click();
      reviewMode='success';
      reviewReply={...pending,summary:{...pending.summary,status:'APPROVED'},history:[]};
      await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
      await page.locator('.sw-heading-actions .sw-status.approved').waitFor();
      assert.ok(await page.getByRole('button',{name:'Phê duyệt hồ sơ',exact:true}).isDisabled());
      assert.equal(reviewCount,2);
    }
    const emptyDashboard={pendingVerifications:0,pendingReports:0,pendingFeedback:null,pendingSupport:0,pendingCommunity:0,activeProperties:0,processedTasks:0,slaPercent:null,averageResponseHours:null,queue:[],activities:[]};
    await page.route('**/api/staff/dashboard',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:emptyDashboard})}));
    await page.goto(`${base}/staff`);
    await page.getByText('Không có công việc chờ xử lý trong nhóm này.',{exact:true}).waitFor();
    assert.equal(await page.locator('.sw-task').count(),0);
    await page.route(/\/api\/staff\/verifications$/,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:[]})}));
    await page.goto(`${base}/staff/verifications`);
    await page.getByText('Chưa có hồ sơ đăng ký nhà trọ được gửi lên.',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,actualRegistrations:actualList.length,actualPhotos:actualDetail?.photos.length||0,actualDocuments:actualDetail?.documents.length||0,viewportChecks,interceptedReviewRequests:reviewCount,mysqlMutations:0,pageErrors:errors},null,2));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
