const assert=require('node:assert/strict');const os=require('node:os');const path=require('node:path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64');
async function main(){const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','test-only'));
 const details={name:'Nhà trọ đối chiếu thực tế',propertyType:'Chung cư mini',description:'Mô tả đầy đủ nhà trọ và các tiện ích để gửi lại theo yêu cầu staff.',managerName:'Chủ trọ kiểm thử',contactPhone:'0912345678',zaloPhone:'',addressDetail:'Số 12, thôn 2, Tân Xã',commune:'Tân Xã',nearby:'',latitude:'21.0188',longitude:'105.5215',amenities:['wifi'],selectedRules:['quietHours'],rules:'',termsAccepted:true};
 let status='NEEDS_SUPPLEMENT',writes=0,revision=false;
 const files=[{documentId:1,type:'PHOTO_0',fileName:'photo.png'},{documentId:2,type:'OWNERSHIP',fileName:'ownership.pdf'},{documentId:3,type:'ID_CARD',fileName:'identity.pdf'}];
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let data;
 if(url.pathname==='/api/auth/me')data={userId:1,fullName:'Chủ trọ kiểm thử',role:'ROOM_HOST'};
 else if(url.pathname.endsWith('/eligibility'))data={canRegister:true,reason:'ELIGIBLE'};
 else if(url.pathname==='/api/host/property/photos/1')return route.fulfill({contentType:'image/png',body:png});
 else if(url.pathname.endsWith('/12/edit')){
  if(status==='PENDING')return route.fulfill({status:409,json:{success:false,message:'Hồ sơ đang chờ xét duyệt, chưa thể chỉnh sửa.'}});
  data={registrationId:12,propertyId:revision?40:null,mode:revision?'CHANGE_REQUEST':'RESUBMIT',status,reasonNote:'Bổ sung mô tả và chụp lại rõ hai mặt CCCD.',requestedFields:['description','ID_CARD'],editableFields:revision?[...Object.keys(details),'photos','OWNERSHIP','ID_CARD','FIRE_SAFETY']:['description','ID_CARD'],legacyScope:false,details,photos:files.slice(0,1),documents:files.slice(1),versionToken:'current-version'};
 }else if(url.pathname.endsWith('/12/resubmit')){
  writes++;const body=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();const edit=JSON.parse(await body.get('edit').text());assert.equal(edit.versionToken,'current-version');assert.deepEqual(edit.retainedPhotoIds,[1]);assert.equal(edit.details.termsAccepted,true);
  if(!revision){assert.equal(edit.details.name,details.name);assert.ok(edit.details.description.includes('Mô tả bổ sung'));assert.equal(body.get('idCard').name,'new-id.pdf');assert.equal(body.getAll('photos').length,0);}else assert.equal(edit.details.name,'Tên đề nghị thay đổi');
  status='PENDING';data={registrationId:revision?13:12,status:'PENDING',name:edit.details.name};
 }else if(url.pathname==='/api/host/property')data={records:[]};
 else throw Error(`Unexpected ${req.method()} ${url.pathname}`);
 return route.fulfill({json:{success:true,data}});
 });
 await page.goto('http://127.0.0.1:5173/host/property/edit?registrationId=12');await page.locator('#description').waitFor();assert.equal(await page.locator('#name').isDisabled(),true);assert.equal(await page.locator('#description').isEnabled(),true);assert.equal(await page.locator('#photos').isDisabled(),true);assert.equal(await page.locator('#idCard').isEnabled(),true);assert.equal(await page.locator('#ownership').isDisabled(),true);
 await page.locator('#description').fill('Mô tả bổ sung thông tin chi tiết nhà trọ, tiện ích và môi trường sống theo yêu cầu.');await page.locator('#idCard').setInputFiles({name:'new-id.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 new')});assert.ok((await page.locator('#description').inputValue()).includes('Mô tả bổ sung'));
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await page.reload();await page.locator('#description').waitFor();assert.ok((await page.locator('#description').inputValue()).includes('Mô tả bổ sung'));assert.equal(await page.locator('#termsAccepted').isChecked(),false);
 await page.locator('#idCard').setInputFiles({name:'new-id.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 new')});
 for(const width of [1536,768,390]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);if(width!==768)await page.screenshot({path:path.join(os.tmpdir(),`hlrcs-property-edit-${width}.png`),fullPage:true});}
 await page.getByRole('button',{name:'Gửi lại xét duyệt',exact:true}).click();await page.getByText('Vui lòng xác nhận thông tin trước khi gửi lại xét duyệt.',{exact:true}).waitFor();assert.equal(writes,0);await page.locator('#termsAccepted').check();await page.getByRole('button',{name:'Gửi lại xét duyệt',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(writes,0);await page.getByRole('button',{name:'Xác nhận gửi',exact:true}).click();await page.waitForURL('**/host/property?registrationId=12');assert.equal(writes,1);
 await page.goto('http://127.0.0.1:5173/host/property/edit?registrationId=12');await page.getByText('Hồ sơ đang chờ xét duyệt, chưa thể chỉnh sửa.',{exact:true}).waitFor();assert.equal(await page.locator('#description').count(),0);
 revision=true;status='APPROVED';await page.reload();await page.locator('#name').waitFor();assert.equal(await page.locator('#name').isEnabled(),true);await page.locator('#name').fill('Tên đề nghị thay đổi');await page.locator('#termsAccepted').check();await page.getByRole('button',{name:'Gửi đề nghị thay đổi',exact:true}).click();await page.getByRole('dialog').waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes('Bản nhà trọ đã duyệt tiếp tục hiển thị'));await page.getByRole('button',{name:'Xác nhận gửi',exact:true}).click();await page.waitForURL('**/host/property?propertyId=40');assert.equal(writes,2);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,restrictedFields:true,fileSelectionKeepsForm:true,draftScope:true,confirmation:true,pendingLocked:true,approvedChangeRequest:true,viewportChecks:3,mysqlMutations:0,pageErrors:errors}));
 }finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
