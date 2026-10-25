const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FRONTEND_URL||'http://127.0.0.1:5173';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz2kAAAAASUVORK5CYII=','base64');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   sessionStorage.setItem('hlrcs_access_token','browser-test-only');
   sessionStorage.setItem('hlrcs:property-draft:1',JSON.stringify({version:1,fields:{name:'Draft name',propertyType:'Chung cư mini',description:'Mô tả nhà trọ đầy đủ cho kiểm thử giữ nguyên thông tin khi chọn ảnh.',managerName:'Test owner',contactPhone:'0912345678',zaloPhone:'',commune:'Tân Xã',addressDetail:'Số 18, thôn 2, Tân Xã',nearby:'Gần trường học',latitude:'21.0188',longitude:'105.5215',amenities:['wifi'],selectedRules:['quietHours'],rules:''}}));
  });
  let mode='allowed',hold=false,held=[],checks=0,writes=0;
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()).pathname;let data;
   if(route.request().method()!=='GET')writes++;
   if(url==='/api/auth/me')data={userId:1,fullName:'Test owner',role:'ROOM_HOST'};
   else if(url==='/api/host/property-registrations/eligibility'){
    checks++;if(hold)await new Promise(resolve=>held.push(resolve));
    if(mode==='error')return route.fulfill({status:500,json:{success:false,message:'Test-only recheck failure'}});
    data={canRegister:true,reason:'ELIGIBLE'};
   }else if(url==='/api/host/property-registrations/current')data=null;
   else if(url==='/api/host/property')data={records:[]};
   else throw new Error(`Unexpected API ${url}`);
   return route.fulfill({json:{success:true,data}});
  });
  await page.goto(`${base}/host/property/new`);await page.locator('#name').fill('Unsaved property name');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.getByRole('heading',{name:'Hình ảnh nhà trọ',exact:true}).waitFor();
  await page.evaluate(()=>window.__registrationForm=document.querySelector('form'));
  hold=true;const before=checks;
  const chooserEvent=page.waitForEvent('filechooser');await page.getByText('Chọn ảnh từ thiết bị',{exact:true}).click();const chooser=await chooserEvent;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(()=>document.querySelector('#photos')!==null);
  assert.ok(await page.evaluate(()=>window.__registrationForm===document.querySelector('form')&&window.__registrationForm.isConnected));
  await chooser.setFiles({name:'house.png',mimeType:'image/png',buffer:png});
  await page.locator('.registration-photos figure').waitFor();
  assert.ok(checks>before);hold=false;held.splice(0).forEach(resolve=>resolve());
  await page.waitForLoadState('networkidle');
  assert.ok(await page.evaluate(()=>window.__registrationForm===document.querySelector('form')));
  assert.equal(await page.locator('.registration-steps [aria-current=step]').innerText(),'4\nHình ảnh');
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await page.locator('#ownership').setInputFiles({name:'ownership.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-test')});
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForLoadState('networkidle');assert.equal(await page.locator('.registration-steps [aria-current=step]').innerText(),'5\nHồ sơ xác minh');
  assert.ok((await page.locator('.registration-document').first().innerText()).includes('ownership.pdf'));
  await page.getByRole('button',{name:'Thông tin cơ bản',exact:false}).first().click();assert.equal(await page.locator('#name').inputValue(),'Unsaved property name');
  await page.getByRole('button',{name:'Hình ảnh',exact:false}).filter({has:page.locator('.registration-step-number')}).click();
  assert.equal(await page.locator('.registration-photos figure').count(),1);
  mode='error';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText(/Không thể kiểm tra lại quyền đăng ký/).waitFor();
  assert.equal(await page.locator('.registration-photos figure').count(),1);assert.equal(await page.locator('.registration-next').isDisabled(),true);
  mode='allowed';await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.registration-next').isDisabled(),false);assert.equal(await page.locator('.registration-photos figure').count(),1);
  mode='approved';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.registration-form-lock').count(),1);assert.equal(writes,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,photoAndDocumentRetained:true,unsavedFieldsRetained:true,recheckFailureRetainsForm:true,registeredHostStillAllowed:true,mysqlWrites:0}));
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
