const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs');const path=require('node:path');
const assert=require('node:assert/strict');
async function main(){const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/login');
 let source=fs.readFileSync(path.resolve(__dirname,'../../../../../outputs/hlrcs-excel-template/HL-RCS_Du-lieu-mau-import.xlsx'));
 if(process.argv.includes('--prefixed')){const zip=await require('jszip').loadAsync(source);const xml=await zip.file('xl/workbook.xml').async('string');zip.file('xl/workbook.xml',xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"','xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/(<\/?)([A-Za-z_][\w.-]*)(?=[\s/>])/g,'$1x:$2'));source=await zip.generateAsync({type:'nodebuffer'});}
 const bytes=Array.from(source);
 const result=await page.evaluate(async bytes=>{const {readRoomTypeExcel}=await import('/src/services/room-type-excel.js');try{const result=await readRoomTypeExcel(new File([new Uint8Array(bytes)],'sample.xlsx'));return {valid:result.issues.length===0,issues:result.issues,rooms:result.rooms.length};}catch(error){return {error:error.message,cause:error.cause?.stack};}},bytes);
 console.log(JSON.stringify(result,null,2));if(!result.valid)process.exitCode=1;
 if(result.valid){
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-only'));
  await page.route('**/api/**',async route=>{const url=new URL(route.request().url()).pathname;let data;
   assert.equal(route.request().method(),'GET','Preview must not write to the database');
   if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
   else if(url==='/api/host/property-registrations/eligibility')data={canRegister:false,reason:'HAS_PROPERTY'};
   else if(url==='/api/host/room-types')data={properties:[{propertyId:12,name:'Browser-only property',status:'ACTIVE'}],roomTypes:[],pendingRegistrationCount:0};
   else throw new Error(`Unexpected API ${url}`);return route.fulfill({json:{success:true,data}});
  });
  await page.goto('http://127.0.0.1:5173/host/room-types');await page.getByRole('button',{name:'Nhập Excel',exact:true}).click();
  await page.getByLabel('Chọn file Excel',{exact:true}).setInputFiles({name:'HL-RCS_Du-lieu-mau-import.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:source});
  await page.getByRole('heading',{name:'Đã kiểm tra file: 6 phòng',exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').count(),0);await page.getByRole('button',{name:'Đưa vào form kiểm tra',exact:true}).click();
  assert.equal(await page.getByLabel('Tên loại phòng',{exact:false}).inputValue(),'Studio ban công - mẫu Excel 2510');
  await page.getByRole('button',{name:'Tiếp theo: Thiết lập danh sách phòng',exact:true}).click();assert.equal(await page.locator('.rt-batch-table tbody tr').count(),6);
  console.log(JSON.stringify({uiPreviewPassed:true,rooms:6,mysqlMutations:0}));
 }
 }finally{await browser.close();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
