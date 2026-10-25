const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const output=process.env.CHECK_OUTPUT||path.resolve(__dirname,'../migration/room-types-check');fs.mkdirSync(output,{recursive:true});
  try{
    const page=await browser.newPage({viewport:{width:1536,height:1000}});
    await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','browser-test-only'));
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const property={propertyId:12,name:'Browser-only property',address:'Hòa Lạc, Hà Nội',status:'ACTIVE'};
    const types=[];let writes=0,fail=true,currentCalls=0,allowRegistration=false,eligibilityError=false;
    // Browser-only contracts; every API is intercepted to avoid MySQL writes.
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url()).pathname;let data;
      if(url==='/api/auth/me')data={userId:1,fullName:'Browser host',role:'ROOM_HOST'};
      else if(url==='/api/host/property-registrations/eligibility'){
        if(eligibilityError)return route.fulfill({status:500,json:{success:false,message:'Browser-only eligibility failure'}});
        data={canRegister:allowRegistration,reason:allowRegistration?'ELIGIBLE':'HAS_PROPERTY'};
      }
      else if(url==='/api/host/property-registrations/current'){currentCalls++;data=null;}
      else if(url==='/api/host/property')data={records:[]};
      else if(url==='/api/host/dashboard')data={properties:[property],roomTypeCount:types.length,pendingViewingCount:0,pendingRegistrationCount:0,recentViewings:[]};
      else if(url==='/api/host/room-types'&&route.request().method()==='POST'){
        writes++;const form=await new Response(route.request().postDataBuffer(),{headers:{'Content-Type':route.request().headers()['content-type']}}).formData();const body=JSON.parse(await form.get('details').text());assert.equal(body.propertyId,12);assert.equal(body.price,2200000);assert.equal(body.capacity,2);assert.equal(body.deposit,null);assert.deepEqual(body.amenities,['airConditioner','wifi']);
        if(fail)return route.fulfill({status:500,json:{success:false,message:'Browser-only save failure'}});
        data={...body,roomTypeId:34,deposit:body.price,totalRooms:null,vacantRooms:null,images:[],createdAt:'2026-10-22T12:00:00'};types.push(data);
      }else if(url==='/api/host/room-types')data={properties:[property],pendingRegistrationCount:0,roomTypes:types};
      else if(url==='/api/host/room-types/34')data=types[0];
      else throw new Error(`Unexpected API ${url}`);
      return route.fulfill({json:{success:true,data}});
    });
    for(const route of ['/host/property/new','/host/property/new?bypass=true','/host-property-create.html']){
      await page.goto(`http://127.0.0.1:5173${route}`);
      await page.waitForURL('**/host/property');
      assert.equal(await page.locator('.property-registration-page').count(),0);
    }
    assert.equal(currentCalls,0);
    await page.goto('http://127.0.0.1:5173/host');
    await page.locator('.dashboard-data-container').waitFor();
    assert.equal(await page.locator('a[href="/host/property/new"]').count(),0);
    await page.goto('http://127.0.0.1:5173/host/room-types');
    await page.getByRole('heading',{name:'Hiện tại chưa có loại phòng',exact:true}).waitFor();
    assert.equal(await page.locator('.portal-sidebar a[href="/host/property/new"]').count(),0);
    await page.getByRole('button',{name:'Thêm loại phòng mới',exact:true}).first().click();
    const dialog=page.getByRole('dialog',{name:'Thêm loại phòng mới',exact:true});await dialog.waitFor();
    await page.getByRole('button',{name:'Tạo loại phòng',exact:true}).click();
    assert.ok(await page.getByRole('alert').count()>0);assert.equal(writes,0);
    await page.getByLabel('Tên loại phòng',{exact:false}).fill('Studio ban công');
    await page.getByLabel('Diện tích (m²)',{exact:false}).fill('25');
    await page.getByLabel('Giá thuê niêm yết',{exact:false}).fill('2200000');
    await page.getByRole('checkbox',{name:'Điều hòa Inverter'}).check();await page.getByRole('checkbox',{name:'Wifi tốc độ cao'}).check();
    for(const width of [1536,1024,768,390]){
      await page.setViewportSize({width,height:1000});
      await dialog.evaluate(element=>element.scrollTop=0);
      assert.ok(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1));
      assert.ok(await dialog.evaluate(element=>{const box=element.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth;}));
      if([1536,390].includes(width))await page.screenshot({path:path.join(output,`create-${width}.png`)});
    }
    await page.getByRole('button',{name:'Tạo loại phòng',exact:true}).click();await page.getByText('Browser-only save failure',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Tên loại phòng',{exact:false}).inputValue(),'Studio ban công');
    fail=false;
    await page.getByRole('button',{name:'Tạo loại phòng',exact:true}).click();await dialog.waitFor({state:'detached'});
    await page.getByText('Đã tạo loại phòng thành công.',{exact:true}).waitFor();
    await page.getByText('Studio ban công',{exact:true}).waitFor();
    assert.equal(writes,2);
    await page.reload();await page.getByText('Studio ban công',{exact:true}).waitFor();
    for(const width of [1536,1024,768,390]){
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Page overflow ${width}`);
      if([1536,390].includes(width))await page.screenshot({path:path.join(output,`list-${width}.png`),fullPage:true});
    }
    await page.getByLabel('Tìm loại phòng',{exact:true}).fill('not-found');await page.getByRole('heading',{name:'Không có loại phòng phù hợp'}).waitFor();
    await page.getByRole('button',{name:'Đặt lại bộ lọc',exact:true}).click();
    await page.getByRole('button',{name:'Dạng lưới',exact:true}).click();await page.locator('.host-room-type').waitFor();
    await page.getByRole('button',{name:'Chi tiết',exact:true}).click();await page.getByRole('dialog',{name:'Studio ban công'}).waitFor();await page.keyboard.press('Escape');
    allowRegistration=true;
    await page.goto('http://127.0.0.1:5173/host/property/new');await page.locator('#name').waitFor();
    assert.ok(currentCalls>0);
    eligibilityError=true;
    await page.reload();await page.getByRole('heading',{name:'Không thể tải dữ liệu',exact:true}).waitFor();
    assert.equal(await page.locator('#name').count(),0);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,blockedDirectRoutes:3,viewportChecks:8,interceptedWrites:writes,mysqlMutations:0,pageErrors:errors}));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
