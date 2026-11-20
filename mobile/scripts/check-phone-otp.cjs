// Expo web fixture only; no real SMS or DB writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.MOBILE_OTP_TEST_URL||'http://127.0.0.1:8093';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(120000);
 let user={userId:21,fullName:'Google kiểm thử',email:'google@example.test',role:'USER',status:'ACTIVE',phoneNumber:'',googleAccount:true},writes=0,checks=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){}}}}'}));
 await page.route('**/api/**',r=>{const req=r.request(),p=new URL(req.url()).pathname,headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'content-type,authorization'},ok=data=>r.fulfill({headers,json:{success:true,data}});
  if(req.method()==='OPTIONS')return r.fulfill({status:200,headers});
  if(p==='/api/auth/login')return ok({...user,accessToken:'otp-app-fixture'});
  if(p==='/api/auth/me')return ok(user);
  if(p.endsWith('/send-otp'))return ok({phoneNumber:req.postDataJSON().phoneNumber,expiresAt:new Date(Date.now()+300000).toISOString(),resendAt:new Date(Date.now()+60000).toISOString()});
  if(p.endsWith('/verify-otp')){checks++;if(req.postDataJSON().code!=='123456')return r.fulfill({headers,status:400,json:{success:false,message:'Mã OTP không đúng hoặc đã hết hạn.'}});return ok({verified:true});}
  if(p==='/api/auth/profile'){writes++;user={...user,...req.postDataJSON()};return ok(user);}
  return ok({items:[],page:0,totalElements:0,totalPages:0});
 });
 await page.goto(base+'/login');await page.getByLabel('Email',{exact:true}).fill('google@example.test');await page.getByLabel('Mật khẩu',{exact:true}).fill('password1');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/home');
 await page.getByRole('tab',{name:'Cá nhân',exact:true}).click();await page.getByRole('button',{name:'Thông tin cá nhân',exact:true}).click();
 await page.getByLabel('Số điện thoại',{exact:true}).fill('0934567812');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.getByText('Xác minh số điện thoại',{exact:true}).waitFor();assert.equal(writes,0);
 const output=path.resolve(__dirname,'../../target/phone-otp-mobile-browser');fs.mkdirSync(output,{recursive:true});
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,`otp-${width}.png`)});}
 await page.getByLabel('Mã OTP',{exact:true}).fill('000000');await page.getByRole('button',{name:'Xác nhận OTP và lưu',exact:true}).click();await page.getByText('Mã OTP không đúng hoặc đã hết hạn.',{exact:true}).waitFor();assert.equal(writes,0);
 await page.getByLabel('Mã OTP',{exact:true}).fill('123456');await page.getByRole('button',{name:'Xác nhận OTP và lưu',exact:true}).click();await page.getByText('Đã lưu thay đổi hồ sơ.',{exact:true}).waitFor();assert.equal(writes,1);assert.equal(checks,2);assert.equal(user.phoneNumber,'0934567812');
 assert.deepEqual(errors,[]);console.log('PASS Expo account OTP dialog four widths, wrong code no write, approved code saves once. No real SMS/database writes.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
