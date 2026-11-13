const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const output=path.resolve(__dirname,'../migration/design-system-check');fs.mkdirSync(output,{recursive:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','fixture-only'));
 const listing={serviceId:1,providerId:7,serviceName:'Vệ sinh phòng trọ Hòa Lạc',categoryId:1,categoryName:'Dọn dẹp',description:'Vệ sinh phòng và nhà tắm tại Hòa Lạc. Mô tả dịch vụ được duyệt.',serviceArea:'Hòa Lạc',contactPhone:'0987654321',providerName:'Chủ dịch vụ',pricingType:'FIXED',price:180000,pricingLabel:'180.000 VNĐ',activeState:'ACTIVE',publicEligible:true,imageUrl:null,imageUrls:[]};
 const application={...listing,registrationId:1,applicantId:7,applicantName:'Chủ dịch vụ',status:'APPROVED',documents:[],revision:1,operation:'CREATE',capabilityActive:true,listingDecision:'APPROVE',serviceState:'ACTIVE'};
 await page.route('**/api/**',async route=>{
 const p=new URL(route.request().url()).pathname;let data;
 if(p==='/api/auth/me')data={userId:8,fullName:'Người kiểm thử',email:'test@example.test',phoneNumber:'0987654321',role:'ADMIN',capabilities:[]};
 else if(p==='/api/services')data=[listing];else if(p==='/api/services/1')data=listing;
 else if(p.endsWith('/categories'))data=[{categoryId:1,name:'Dọn dẹp'}];
 else if(p==='/api/staff/service-applications')data=[application];
 else if(p==='/api/service-registrations/mine'||p==='/api/service-registrations/services'||p.startsWith('/api/service-requests/'))data=[];
 else return route.fulfill({status:503,json:{success:false,message:'Dữ liệu chưa khả dụng trong kiểm tra giao diện.'}});
 return route.fulfill({json:{success:true,data}});
 });
 const reports=[];
 for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5176/services');await page.locator('.svc-card').waitFor();
 const layout=await page.evaluate(()=>{
 const x=s=>document.querySelector(s).getBoundingClientRect().left;
 return {header:x('.public-navbar .sidebar-brand-link'),breadcrumb:x('.portal-breadcrumbs'),heading:x('.svc-heading'),footer:x('.public-footer-inner .sidebar-brand-link'),overflow:document.documentElement.scrollWidth>innerWidth};});
 reports.push({width,...layout});assert.ok(Math.max(layout.header,layout.breadcrumb,layout.heading,layout.footer)-Math.min(layout.header,layout.breadcrumb,layout.heading,layout.footer)<2,JSON.stringify(layout));assert.equal(layout.overflow,false,'services overflow '+width);
 await page.screenshot({path:path.join(output,'services-'+width+'.png'),fullPage:true});
 }
 await page.goto('http://127.0.0.1:5176/services/detail?id=1');await page.locator('.svc-detail').waitFor();
 assert.deepEqual(await page.locator('.portal-breadcrumbs li').allTextContents(),['HL_RCS','Dịch vụ','Vệ sinh phòng trọ Hòa Lạc']);
 assert.equal(await page.locator('.portal-breadcrumbs a').nth(1).getAttribute('href'),'/services');
 const opener=page.getByRole('button',{name:'Yêu cầu dịch vụ',exact:true});await opener.click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
 const ring=await page.evaluate(()=>{const s=getComputedStyle(document.activeElement);return [s.outlineWidth,s.outlineStyle,s.outlineOffset,s.outlineColor]});assert.deepEqual(ring,['2px','solid','2px','rgb(15, 118, 110)']);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
 const routes=['/','/search','/map','/properties/detail','/favorites','/bookings','/community','/notifications','/profile','/host','/host/property','/host/property/new','/host/property/edit','/host/room-types','/host/rooms','/host/viewings','/host/support','/host/notifications','/staff','/staff/service-applications','/staff/verifications','/staff/verifications/detail','/staff/community','/staff/community/detail','/staff/assistance','/staff/assistance/detail','/admin'];
 for(const width of [375,1440]) { await page.setViewportSize({width,height:1000}); for(const route of routes){await page.goto('http://127.0.0.1:5176'+route);await page.locator('#main-content').waitFor();await page.waitForTimeout(150);reports.push({route,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),offenders:width===375?await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && r.right>innerWidth+2 && getComputedStyle(el).position!=='fixed' && !el.closest('.portal-sidebar')}).slice(-18).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right}))):[]});
 if(['/host','/staff/service-applications','/admin'].includes(route))await page.screenshot({path:path.join(output,route.replaceAll('/','-')+'-'+width+'.png'),fullPage:true});
 }}
 await page.goto('http://127.0.0.1:5176/services');await page.locator('.svc-card').waitFor();
 const contrast=await page.evaluate(()=>{
 const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 return [...document.querySelectorAll('small,.svc-heading p,.portal-breadcrumbs a,.svc-meta,.svc-description,footer p')].filter(el=>el.getClientRects().length).map(el=>{
 let parent=el,bg;while(parent){bg=rgb(getComputedStyle(parent).backgroundColor);if(bg.length===3||bg[3]===1)break;parent=parent.parentElement;}if(!parent)bg=[255,255,255];
 const color=rgb(getComputedStyle(el).color),a=lum(color),b=lum(bg);return {text:el.textContent.slice(0,60),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 });});assert.ok(contrast.every(item=>item.ratio>=4.5),JSON.stringify(contrast));
 fs.writeFileSync(path.join(output,'contrast.json'),JSON.stringify(contrast,null,2));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({reports,ring,errors},null,2));
 const routeOverflows=reports.filter(r=>r.route&&r.overflow).map(({route,width})=>({route,width}));
 assert.deepEqual(routeOverflows,[], 'Pages must not overflow horizontally');
 console.log(JSON.stringify({layouts:reports.slice(0,4),routeOverflows,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
