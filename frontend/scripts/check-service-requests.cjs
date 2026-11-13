const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','fixture-only'));
 const listing={serviceId:1,providerId:7,serviceName:'Vệ sinh phòng trọ',categoryId:1,categoryName:'Dọn dẹp',description:'Vệ sinh phòng và nhà tắm tại Hòa Lạc.',serviceArea:'Hòa Lạc',contactPhone:'0987654321',providerName:'Chủ dịch vụ',pricingType:'FIXED',price:180000,pricingLabel:'180.000 VNĐ',activeState:'ACTIVE',publicEligible:true,imageUrl:null,imageUrls:[]};
 let saved=null;
 await page.route('**/api/**',async route=>{
 const req=route.request(),path=new URL(req.url()).pathname;let data;
 if(path==='/api/auth/me')data={userId:8,fullName:'Khách thử nghiệm',phoneNumber:'0987654321',role:'USER',capabilities:[]};
 else if(path==='/api/services/1')data=listing;
 else if(path==='/api/service-requests' && req.method()==='POST'){
 const payload=req.postDataJSON(); assert.match(payload.scheduledAt,/\+07:00$/);
 saved={...payload,requestId:1,serviceName:listing.serviceName,status:'PENDING',revision:0,canAccept:true}; data=saved;
 }else if(path==='/api/service-requests/mine'||path==='/api/service-requests/incoming')data=saved?[saved]:[];
 else if(path==='/api/service-requests/1/response'){
 const payload=req.postDataJSON();assert.equal(payload.revision,0);
 saved={...saved,status:payload.decision,responseReason:payload.reason,revision:1,handledBy:7,handledAt:new Date().toISOString()};data=saved;
 }else return route.fulfill({status:404,json:{success:false,message:'Unexpected fixture route '+path}});
 return route.fulfill({json:{success:true,data}});
 });
 await page.goto('http://127.0.0.1:5176/services/detail?id=1');
 await page.getByLabel('Nội dung yêu cầu').fill('Vệ sinh phòng và nhà tắm giúp tôi');
 await page.getByLabel('Ngày giờ mong muốn').fill('2099-11-20T09:00');
 await page.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Đã gửi yêu cầu'}).waitFor();
 await page.getByRole('button',{name:'Yêu cầu dịch vụ',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByText('Chờ phản hồi',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'Khách gửi cho tôi'}).click();
 await dialog.getByRole('button',{name:'Từ chối',exact:true}).click();
 await dialog.getByLabel('Lý do từ chối').fill('Đã kín lịch phục vụ trong ngày này');
 await dialog.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await dialog.getByText('Đã từ chối',{exact:true}).waitFor();
 for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow '+width);
 assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false,'dialog overflow '+width);
 }
 const output=path.resolve(__dirname,'../migration/service-request-check');fs.mkdirSync(output,{recursive:true});
 await page.screenshot({path:path.join(output,'service-requests-ui.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: submit, UTC+7 payload, incoming rejection, results, 375/768/1024/1440 widths');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
