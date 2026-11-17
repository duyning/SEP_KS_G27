const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FRONTEND_URL||'http://127.0.0.1:5198';
const output=path.resolve(__dirname,'../../target/identity-edit-ui');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
(async()=>{
 const {createPropertyForm}=await import('../src/services/property-registration.js');
 const details={...createPropertyForm(),name:'Nhà trọ kiểm thử',amenities:[],selectedRules:[]};
 const snapshot={registrationId:31,status:'NEEDS_SUPPLEMENT',mode:'SUPPLEMENT',versionToken:'fixture',details,photos:[],
  documents:[['OWNERSHIP','Giấy phép.png'],['ID_CARD','CCCD-mặt-trước.png'],['FIRE_SAFETY','PCCC.png'],['ID_CARD_BACK','CCCD-mặt-sau.png']].map(([type,fileName])=>({type,fileName})),
  editableFields:['ID_CARD','ID_CARD_BACK','FIRE_SAFETY'],requestedFields:['ID_CARD','FIRE_SAFETY'],fieldNotes:{ID_CARD:'Chụp rõ ảnh căn cước.',FIRE_SAFETY:'Chụp rõ chứng nhận PCCC.'}};
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  fs.mkdirSync(output,{recursive:true});const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','identity-edit-fixture'));
  await page.route('https://**/*',r=>r.abort());
  await page.route(base+'/api/**',r=>{
   const p=new URL(r.request().url()).pathname;assert.equal(r.request().method(),'GET','No real submissions');
   const ok=data=>r.fulfill({json:{success:true,data}});
   if(p==='/api/auth/me')return ok({userId:8,role:'USER',fullName:'Người kiểm thử',email:'fixture@example.test',phoneNumber:'0912345678',phoneVerified:true});
   if(p==='/api/host-onboarding/current')return ok({account:{id:21,status:'MERGED',hasIdentityImage:true,hasIdentityBackImage:true},registration:{registrationId:31,status:'NEEDS_SUPPLEMENT',name:details.name}});
   if(p==='/api/host-onboarding/31/edit')return ok(snapshot);
   return ok({items:[],total:0});
  });
  for(const width of [375,768,1024,1440]) {
   await page.setViewportSize({width,height:1000});await page.goto(base+'/become-host');
   await page.getByRole('button',{name:'Bổ sung & gửi lại hồ sơ',exact:true}).click();
   const group=page.locator('.hpe-identity-document');await group.waitFor();
   assert.equal(await group.count(),1);assert.equal(await group.locator('input[type=file]').count(),2);
   assert.equal(await group.getByText('Chụp rõ ảnh căn cước.',{exact:true}).count(),2);
   assert.ok(await page.locator('.hpe-document').filter({hasText:'Chứng nhận an toàn PCCC'}).getByText('Chụp rõ chứng nhận PCCC.',{exact:true}).isVisible());
   for(const [id,name] of [['idCard','CCCD-mặt-trước.png'],['idCardBack','CCCD-mặt-sau.png']]) {
    const side=group.locator('.hpe-identity-side').filter({has:page.locator('#'+id)});
    await page.locator('#'+id).setInputFiles({name:'mới-'+id+'.png',mimeType:'image/png',buffer:png});
    assert.ok((await side.textContent()).includes('Tài liệu mới: mới-'+id+'.png'));
    await side.getByRole('button',{name:'Giữ tài liệu cũ',exact:true}).click();
    assert.ok((await side.textContent()).includes(name));
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await group.screenshot({path:path.join(output,'identity-'+width+'.png')});
  }
  snapshot.editableFields=['FIRE_SAFETY'];await page.reload();await page.getByRole('button',{name:'Bổ sung & gửi lại hồ sơ',exact:true}).click();
  assert.ok(await page.locator('#idCard').isDisabled());assert.ok(await page.locator('#idCardBack').isDisabled());assert.ok(await page.locator('#fireSafety').isEnabled());
  assert.deepEqual(errors,[]);console.log('PASS paired CCCD, per-side notes/replacement/restore, PCCC note, locked fields; four widths. Mock API only.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
