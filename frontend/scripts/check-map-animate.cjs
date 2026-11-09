const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const output=path.resolve(__dirname,'../../target/map-animate');fs.mkdirSync(output,{recursive:true});
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e7efeb"/></svg>';
  const room={propertyId:12,roomTypeId:34,propertyName:'Nhà trọ Tân Xã',roomTypeName:'Studio khép kín',price:2200000,areaSqm:25,address:'Tân Xã, Hòa Lạc',availableRooms:2,verificationStatus:'APPROVED',latitude:21.0188,longitude:105.5215,imageUrl:null};
  const rows=[room,{...room,roomTypeId:35,roomTypeName:'Phòng gác lửng',price:2500000},{...room,propertyId:13,roomTypeId:36,propertyName:'Nhà trọ Bình Yên',latitude:21.0285,longitude:105.512,price:1900000}];
  const errors=[];
  async function prepare(reducedMotion){
    const page=await browser.newPage({reducedMotion});page.on('pageerror',e=>errors.push(e.message));
    await page.route(/^https:\/\/tile\.openstreetmap\.(org|de)\//,route=>route.fulfill({contentType:'image/svg+xml',body:svg}));
    await page.route('**/api/**',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:{success:true,data:{items:rows,page:0,size:6,totalElements:3,totalPages:1}}});});
    return page;
  }
  try{
    const page=await prepare('no-preference');
    for(const width of [1440,1024,768,375]){
      await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5174/map');
      await page.locator('.nh-map-room-choice').first().waitFor();
      assert.equal(await page.locator('.nh-map-room-choice').count(),3);
      assert.equal(await page.getByRole('button',{name:'Vệ tinh',exact:true}).count(),0,'Unavailable imagery should not distract users');
      await page.locator('.nh-map-room-choice').first().click();
      await page.waitForFunction(()=>document.querySelector('.nh-map-selection strong')?.textContent.includes('Studio'));
      assert.equal(await page.locator('.nh-map-room-choice').first().getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('.nh-map-price-marker.is-selected').count(),1);
      await page.locator('.nh-map-room-choice').nth(1).focus();await page.keyboard.press('Enter');
      await page.locator('.nh-map-room-choice').nth(2).click();
      await page.waitForFunction(()=>document.querySelector('.nh-map-selection strong')?.textContent.includes('Bình Yên'));
      assert.equal(await page.locator('.nh-map-selection a').getAttribute('href'),'/properties/detail?propertyId=13&roomTypeId=36');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}`);
      await page.locator('.nh-map-explorer').screenshot({path:path.join(output,`explorer-${width}.png`),animations:'disabled'});
      await page.getByRole('button',{name:'Mở rộng bản đồ',exact:true}).click();
      await page.locator('.accommodation-map-expanded').waitFor();
      await page.keyboard.press('Escape');await page.locator('.accommodation-map-expanded').waitFor({state:'detached'});
      assert.equal(await page.getByRole('button',{name:'Mở rộng bản đồ',exact:true}).evaluate(e=>e===document.activeElement),true);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('.nh-map-room-choice').first().click();
    await page.waitForTimeout(70);
    await page.locator('.nh-map-selection-slot').screenshot({path:path.join(output,'selection-mid-motion.png')});
    await page.evaluate(()=>document.documentElement.style.zoom='2');
    assert.ok(await page.locator('.nh-map-room-choice').first().isVisible());
    const reduced=await prepare('reduce');await reduced.goto('http://127.0.0.1:5174/map');
    await reduced.locator('.nh-map-room-choice').first().click();
    await reduced.waitForFunction(()=>Boolean(document.querySelector('.nh-map-selection')));
    const transform=await reduced.locator('.nh-map-selection').evaluate(e=>getComputedStyle(e).transform);
    assert.ok(['none','matrix(1, 0, 0, 1, 0, 0)'].includes(transform),'Reduced motion removes selection travel');
    await reduced.locator('.nh-map-explorer').screenshot({path:path.join(output,'reduced-motion.png'),animations:'disabled'});
    assert.deepEqual(errors,[]);
    console.log('PASS expressive Animate UI: cards/markers stay linked; quick reselection; keyboard; selection details; full view/Escape/focus; 375/768/1024/1440; 200% zoom; reduced motion. Browser API/tile fixtures only.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
