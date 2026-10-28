const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1920,1440,1366,1280,1024,768,390]){
   await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5173/tests/fixtures/motion-harness.html');
   await page.locator('#open').click();await page.getByRole('dialog').waitFor();
   await page.waitForTimeout(500);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
   await page.getByLabel('Họ tên').focus();await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true,'focus trap');
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(await page.locator('#open').evaluate(el=>el===document.activeElement),true,'focus restored');
  }
  await page.getByRole('button',{name:'Thông báo',exact:true}).click();await page.getByRole('status').waitFor();await page.getByRole('button',{name:'Đóng thông báo'}).click();await page.getByRole('status').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.locator('#test-menu').waitFor();await page.getByRole('button',{name:'Menu',exact:true}).click();await page.locator('#test-menu').waitFor({state:'hidden'});
  for(let i=0;i<3;i++){await page.locator('#open').dispatchEvent('click');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.locator('#open').dispatchEvent('click');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('#loading-loop').style.animationPlayState==='paused');await page.locator('#loading-loop').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#loading-loop').style.animationPlayState==='running');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('#open').focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByRole('dialog').evaluate(el=>getComputedStyle(el).transform),'none','reduced-motion transform');
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[1920,1440,1366,1280,1024,768,390],focusTrap:true,focusRestoration:true,keyboard:true,reducedMotion:true,toast:true,menu:true,interruptible:true,offscreenLoaderPaused:true,pageErrors:0}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
