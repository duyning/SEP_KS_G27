const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FRONTEND_URL||'http://127.0.0.1:5198';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve(__dirname,'../../target/vietmap-ui');fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],reverseInputs=[],queries=[];
 page.on('pageerror',e=>errors.push(e.message));let enabled=true,locked=false,mode='normal',places=0,actor='ROOM_HOST',reverseCalls=0;
 const original={name:'Nhà trọ kiểm thử',description:'Nhà trọ có thông tin và vị trí đầy đủ để kiểm tra.',propertyType:'Chung cư mini',managerName:'Chủ trọ',contactPhone:'0912345678',commune:'Tân Xã',addressDetail:'Địa chỉ đã lưu của chủ trọ',nearby:'Ghi chú riêng',latitude:'21.0188',longitude:'105.5215',amenities:[],selectedRules:[],rules:''};
 const chosen={latitude:21.0124167,longitude:105.5252892,addressDetail:'Địa chỉ được chọn từ Vietmap',commune:'Thạch Hòa',nearby:null,places:[],warnings:[],attribution:'VIETMAP'};
 await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','vietmap-fixture'));
 await page.route('https://**/*',r=>r.abort());
 await page.route(base+'/api/**',async r=>{const p=new URL(r.request().url()).pathname,body=r.request().postDataJSON(),ok=data=>r.fulfill({json:{success:true,data}}).catch(()=>{});
  assert.ok(!r.request().url().includes('apikey='),'Services key never in browser requests');
  if(p==='/api/auth/me')return ok({userId:8,role:actor,fullName:'Chủ trọ kiểm thử',email:'fixture@example.test',phoneNumber:'0912345678',phoneVerifiedAt:'2026-11-14T10:00:00Z'});
  if(p==='/api/property-location/status')return ok({enabled,provider:enabled?'vietmap':'legacy'});
  if(p.endsWith('/77/edit'))return ok({registrationId:77,propertyId:4,mode:'CHANGE_REQUEST',status:'APPROVED',versionToken:'fixture-'+locked,editableFields:locked?['latitude','longitude']:['latitude','longitude','addressDetail','commune','nearby'],details:original,documents:[],photos:[],requestedFields:[]});
  if(p==='/api/property-location/autocomplete'){
   assert.equal(r.request().method(),'POST');queries.push(body.text);if(body.text.includes('chậm'))await new Promise(resolve=>setTimeout(resolve,450));
   return ok(body.text==='không có kết quả'?[]:[{refId:'auto:selected',display:body.text.includes('chậm')?'Gợi ý cũ':'Nhà trọ gợi ý mới, Hà Nội',commune:'Thạch Hòa'}]);
  }
  if(p==='/api/property-location/place'){places++;assert.equal(body.refId,'auto:selected');return ok(chosen);}
  if(p==='/api/property-location/reverse'){
   reverseCalls++;reverseInputs.push(body);if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,450));
   if(mode==='error')return r.fulfill({status:503,json:{success:false,message:'Vietmap tạm hết hạn mức (fixture).'}}).catch(()=>{});
   return ok({...chosen,...body,addressDetail:'Địa chỉ gợi ý theo ghim'});
  }
  if(p.endsWith('/location/resolve'))return ok(chosen);
  if(p==='/api/host-onboarding/current')return ok({account:null,registration:null});
  assert.equal(r.request().method(),'GET','No real registrations or edits submitted');return ok({items:[],total:0,canRegister:true,reason:'ELIGIBLE',places:[],attribution:'fixture'});
 });
 const open=async()=>{await page.goto(base+'/host/property/edit?registrationId=77');await page.getByRole('combobox',{name:'Tìm địa chỉ hoặc dán liên kết Google Maps',exact:true}).waitFor();};
 const draft=async()=>{await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();return page.evaluate(()=>JSON.parse(sessionStorage.getItem('hlrcs:property-edit:8:77')).fields);};
 await open();assert.equal(reverseCalls,0,'Do not overwrite an existing profile on mount');
 const input=page.locator('#property-pasted-address');await input.fill('Nhà trọ chậm');await page.waitForTimeout(330);await input.fill('Nhà trọ mới');
 await page.getByRole('listbox',{name:'Địa chỉ gợi ý'}).getByRole('option').filter({hasText:'Nhà trọ gợi ý mới'}).waitFor();await page.waitForTimeout(250);assert.equal(await page.getByRole('listbox',{name:'Địa chỉ gợi ý'}).getByRole('option').filter({hasText:'Gợi ý cũ'}).count(),0);assert.equal(places,0);
 await input.press('ArrowDown');assert.ok(await input.getAttribute('aria-activedescendant'));await input.press('Enter');await page.waitForFunction(()=>document.querySelector('#addressDetail')?.value==='Địa chỉ được chọn từ Vietmap');assert.equal(places,1);assert.equal(reverseCalls,0,'No redundant reverse after Place');assert.equal(await page.locator('#commune').inputValue(),'Thạch Hòa');assert.equal(await page.locator('#nearby').inputValue(),'Ghi chú riêng');
 const saved=await draft();assert.equal(saved.latitude,String(chosen.latitude));assert.equal(saved.longitude,String(chosen.longitude));
 await page.locator('.leaflet-container').first().waitFor();await page.locator('.leaflet-container').first().click({position:{x:170,y:120}});await page.waitForFunction(()=>document.querySelector('#addressDetail')?.value==='Địa chỉ gợi ý theo ghim');assert.ok(reverseCalls>0);
 const afterPin=await draft(),lastPin=reverseInputs.at(-1);assert.equal(Number(afterPin.latitude),lastPin.latitude);assert.equal(Number(afterPin.longitude),lastPin.longitude);
 mode='delay';await page.getByRole('button',{name:'Điền thông tin từ ghim hiện tại',exact:true}).click();await page.locator('#addressDetail').fill('Địa chỉ chủ trọ tự sửa trong lúc chờ');await page.waitForTimeout(600);assert.equal(await page.locator('#addressDetail').inputValue(),'Địa chỉ chủ trọ tự sửa trong lúc chờ');
 mode='error';await page.getByRole('button',{name:'Điền thông tin từ ghim hiện tại',exact:true}).click();await page.getByRole('alert').filter({hasText:'Vietmap tạm hết hạn mức'}).waitFor();assert.equal(await page.locator('#addressDetail').inputValue(),'Địa chỉ chủ trọ tự sửa trong lúc chờ');mode='normal';
 for(const width of [375,768,1024,1440]){await page.setViewportSize({width,height:1000});await input.fill('Nhà trọ '+width);await page.getByRole('listbox',{name:'Địa chỉ gợi ý'}).getByRole('option').waitFor({timeout:6000}).catch(async e=>{await page.screenshot({path:path.join(out,'failed.png'),fullPage:true});throw Error(JSON.stringify({width,queries,active:await page.evaluate(()=>document.activeElement?.id),lookup:await page.locator('.registration-address-lookup').innerText()}));});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('.registration-address-lookup').screenshot({path:path.join(out,'autocomplete-'+width+'.png')});if(width===1440){await page.evaluate(()=>document.documentElement.style.zoom='2');assert.ok(await page.locator('.registration-address-lookup').evaluate(el=>el.scrollWidth<=el.clientWidth+2),await page.locator('.registration-address-lookup').evaluate(el=>JSON.stringify({client:el.clientWidth,scroll:el.scrollWidth,children:[...el.querySelectorAll('*')].map(n=>({tag:n.tagName,cls:n.className,client:n.clientWidth,scroll:n.scrollWidth,width:n.getBoundingClientRect().width,text:n.textContent.slice(0,45)})).filter(n=>n.scroll>n.client+2)})));await page.evaluate(()=>document.documentElement.style.zoom='');}await input.press('Escape');assert.equal(await page.getByRole('listbox',{name:'Địa chỉ gợi ý'}).getByRole('option').count(),0);}
 locked=true;await open();await input.fill('Nhà trọ');await page.getByRole('listbox',{name:'Địa chỉ gợi ý'}).getByRole('option').waitFor();await input.press('ArrowDown');await input.press('Enter');await page.getByRole('status').filter({hasText:'Đã chọn địa chỉ'}).waitFor();assert.equal(await page.locator('#addressDetail').inputValue(),original.addressDetail);assert.ok(await page.locator('#addressDetail').isDisabled());
 enabled=false;await page.reload();await page.getByLabel('Dán liên kết Google Maps hoặc tọa độ',{exact:true}).waitFor();await input.fill('21.0124167,105.5252892');await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã đặt ghim'}).waitFor();
 // The combined applicant uses the same authenticated location search without receiving host management permissions.
 actor='USER';enabled=true;await page.goto(base+'/become-host');await page.locator('#identityImage').setInputFiles({name:'front.png',mimeType:'image/png',buffer:png});await page.locator('#identityBackImage').setInputFiles({name:'back.png',mimeType:'image/png',buffer:png});await page.locator('#agreementCheck').check();await page.locator('#btnSubmitForm').click();
 const form=page.locator('.property-registration');await form.locator('#name').fill('Nhà trọ đăng ký gộp');await form.locator('#description').fill('Nhà trọ đăng ký thử nghiệm có đầy đủ thông tin vị trí.');await form.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('combobox',{name:'Tìm địa chỉ hoặc dán liên kết Google Maps',exact:true}).waitFor();await input.fill('Nhà trọ');await page.getByRole('listbox',{name:'Địa chỉ gợi ý'}).getByRole('option').waitFor();await input.press('ArrowDown');await input.press('Enter');await page.waitForFunction(()=>document.querySelector('#addressDetail')?.value==='Địa chỉ được chọn từ Vietmap');assert.equal(await page.locator('#commune').inputValue(),'Thạch Hòa');
 assert.deepEqual(errors,[]);console.log('PASS autocomplete debounce/stale response, keyboard selection, single Place, pin reverse preserving coordinates, edit race, quota failure, locked fields, legacy fallback, combined USER registration, four widths. Mock API only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
