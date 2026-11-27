// Browser checks use intercepted API/tile responses; they never write to MySQL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.resolve(__dirname, '../../target/map-browser');
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    let mode = 'data', tileFailure = false;
    const room = { propertyId: 12, roomTypeId: 34, propertyName: 'Nhà trọ kiểm thử bản đồ', roomTypeName: 'Studio khép kín',
      price: 2200000, areaSqm: 25, address: 'Tân Xã, Hòa Lạc', availableRooms: 2, verificationStatus: 'APPROVED',
      latitude: 21.018812, longitude: 105.521512, imageUrl: null, amenities: [] };
    await page.route(/^https:\/\/tile\.openstreetmap\.(org|de)\//, route => tileFailure ? route.abort() : route.fulfill({
      contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e2e8f0"/></svg>' }));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      assert.ok(route.request().method()==='GET'||(route.request().method()==='POST'&&url.pathname.endsWith('/location/resolve')),'Only reads and location lookup are allowed');
      if (url.pathname === '/api/auth/me') return route.fulfill({json:{success:true,data:{userId:8,role:'ROOM_HOST',fullName:'Chủ trọ kiểm thử',phoneNumber:'0912345678'}}});
      if (url.pathname === '/api/favorites/state') return route.fulfill({json:{success:true,data:{items:[],total:0}}});
      if (url.pathname.endsWith('/eligibility')) return route.fulfill({json:{success:true,data:{canRegister:true,reason:'ELIGIBLE'}}});
      if (url.pathname.endsWith('/current')) return route.fulfill({json:{success:true,data:null}});
      if (url.pathname === '/api/host/property-registrations/77/edit') return route.fulfill({json:{success:true,data:{
        registrationId:77,propertyId:12,mode:'CHANGE_REQUEST',status:'APPROVED',versionToken:'test-version',requestedFields:[],editableFields:['latitude','longitude'],photos:[],documents:[],
        details:{name:'Nhà trọ đã duyệt',latitude:'21.018812',longitude:'105.521512',addressDetail:'Số 12 ngõ 10 thôn Tân Xã',commune:'Tân Xã',amenities:[],selectedRules:[]}}}});
      if (url.pathname.endsWith('/location/nearby')) return route.fulfill({json:{success:true,data:{places:[]}}});
      if (url.pathname.endsWith('/location/resolve')) return route.fulfill({json:{success:true,data:{latitude:21.018812,longitude:105.521512,places:[],warnings:[]}}});
      if (url.pathname === '/api/properties/search') {
        requests.push(url.searchParams.toString());
        if (mode === 'error') return route.fulfill({status:503,json:{success:false,message:'Lỗi thử nghiệm'}});
        const items = mode === 'empty' ? [] : mode === 'legacy' ? [{...room,latitude:null,longitude:null}] : [room,{...room,roomTypeId:35,roomTypeName:'Phòng gác lửng'}];
        const size = Number(url.searchParams.get('size'));
        return route.fulfill({json:{success:true,data:{items:items.slice(0,size),page:Number(url.searchParams.get('page')),size,totalElements:items.length ? 12 : 0,totalPages:items.length ? Math.ceil(12/size) : 0}}});
      }
      if (url.pathname.endsWith('/details')) return route.fulfill({json:{success:true,data:{summary:mode === 'legacy'?{...room,latitude:null,longitude:null}:room,
        gallery:[],propertyGallery:[],roomTypes:[],amenities:[],propertyAmenities:[],selectedRules:[],similar:[],publicContact:null,
        reviews:{totalReviews:0,ratingCounts:[0,0,0,0,0],latest:[]}}}});
      throw new Error(`Unexpected API ${url.pathname}`);
    });
    for (const width of [375,768,1024,1440]) {
      await page.setViewportSize({width,height:1000});
      await page.goto('http://127.0.0.1:5174/map?location=tan-xa&price=15-25&amenities=balcony&page=2');
      const pricePin = page.locator('.nh-map-price-marker');
      await pricePin.waitFor();
      assert.equal(await pricePin.count(),1,'Same-position types share a marker');
      assert.equal(await page.locator('.nh-map-landmark-marker').count(),4);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}`);
      const query = new URLSearchParams(requests.at(-1));
      assert.equal(query.get('page'),'1'); assert.equal(query.get('location'),'tan-xa'); assert.equal(query.get('amenities'),'balcony');
      await pricePin.click();
      assert.equal(await page.getByRole('link',{name:'Xem chi tiết phòng',exact:true}).count(),2);
      assert.ok((await page.getByRole('link',{name:'Danh sách',exact:true}).getAttribute('href')).includes('page=2'));
      await page.screenshot({path:path.join(output,`search-${width}.png`),fullPage:true});
    }
    await page.locator('.nh-map-price-marker').focus(); await page.keyboard.press('Enter');
    await page.getByRole('link',{name:'Xem chi tiết phòng',exact:true}).first().click();
    await page.getByRole('link',{name:'Chỉ đường',exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Chỉ đường',exact:true}).getAttribute('href'),'https://www.google.com/maps/dir/?api=1&destination=21.018812,105.521512');
    await page.screenshot({path:path.join(output,'detail.png'),fullPage:true});
    await page.evaluate(()=>document.documentElement.style.zoom='2');
    assert.ok(await page.locator('.accommodation-map .leaflet-container').isVisible());
    await page.evaluate(()=>document.documentElement.style.zoom='');
    mode='legacy'; await page.reload(); await page.getByText('Nhà trọ chưa cập nhật vị trí ghim trên bản đồ.').waitFor();
    for (const next of ['legacy','empty','error']) {
      mode=next;await page.goto('http://127.0.0.1:5174/map');
      await page.getByText(next==='legacy'?'Phòng chưa có vị trí trên bản đồ':next==='empty'?'Không tìm thấy phòng trọ phù hợp':'Không thể tải danh sách nhà trọ',{exact:true}).waitFor();
      assert.equal(await page.locator('.nh-map-price-marker').count(),0);
      assert.equal(await page.locator('.nh-map-landmark-marker').count(),4);
    }
    mode='data';
    for (const width of [375,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto('http://127.0.0.1:5174/search?q=T%C3%A2n+X%C3%A3&page=2');
      const open = page.getByRole('button',{name:width<=768?'Bộ lọc':'Bộ lọc nâng cao',exact:true});
      await open.focus();
      await page.keyboard.press('Enter');
      const filters = page.getByRole('dialog',{name:'Bộ lọc tìm phòng'});
      await filters.waitFor();
      await filters.getByText('12 loại phòng phù hợp',{exact:true}).waitFor();
      assert.equal(await filters.getByRole('radio',{name:/Đại học Mở Hà Nội.*NIC Hòa Lạc/}).count(),1);
      assert.ok(await filters.evaluate(el=>el.scrollWidth <= el.clientWidth+1),'Filter does not overflow');
      assert.ok(await filters.getByRole('button',{name:'Áp dụng bộ lọc'}).evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));
      if(width===1440) {
        await page.evaluate(()=>document.documentElement.style.zoom='2');
        assert.ok(await filters.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Filter reflows at 200% zoom');
        await page.evaluate(()=>document.documentElement.style.zoom='');
      }
      await filters.screenshot({path:path.join(output,`filters-${width}.png`)});
      await page.keyboard.press('Escape');
      await filters.waitFor({state:'hidden'});
      await page.waitForFunction(()=>document.activeElement?.matches('#btnToggleAdv,#btnOpenMobileFilter'));
    }
    await page.getByRole('button',{name:'Bộ lọc nâng cao',exact:true}).click();
    const filters = page.getByRole('dialog',{name:'Bộ lọc tìm phòng'});
    await filters.getByRole('radio',{name:/Học viện Tài chính/}).check();
    await filters.getByRole('radio',{name:'≤ 3 km',exact:true}).check();
    await filters.getByRole('checkbox',{name:'Điều hòa',exact:true}).check();
    const preview = page.waitForResponse(response=>{
      const request = new URL(response.url());
      return request.pathname==='/api/properties/search'&&request.searchParams.get('size')==='1'
        &&request.searchParams.get('radiusKm')==='3'&&request.searchParams.get('availableOnly')==='true';
    });
    await filters.getByRole('checkbox',{name:/Chỉ phòng còn trống/}).check();
    await preview;
    assert.equal(new URL(page.url()).searchParams.has('radiusKm'),false,'Draft stays in the dialog until applied');
    await filters.getByRole('button',{name:'Áp dụng bộ lọc'}).click();
    await page.waitForURL(url=>url.searchParams.get('radiusKm')==='3');
    const applied = new URL(page.url()).searchParams;
    assert.equal(applied.get('q'),'Tân Xã');
    assert.equal(applied.get('page'),null);
    assert.equal(applied.get('originLat'),'21.0212183');
    assert.equal(applied.get('sort'),'nearest');
    assert.equal(applied.get('amenities'),'airConditioner');
    assert.equal(applied.get('availableOnly'),'true');
    await page.getByRole('navigation',{name:'Chế độ hiển thị'}).getByRole('link',{name:'Bản đồ',exact:true}).click();
    await page.getByRole('heading',{name:'Phòng trọ quanh Học viện Tài chính',exact:true}).waitFor();
    assert.equal(await page.locator('.nh-map-landmark-label.is-selected').innerText(),'HVTC');
    assert.equal(await page.locator('.leaflet-overlay-pane path').count(),1,'Search radius is shown');
    await page.goto('http://127.0.0.1:5174/map');
    const schoolPin = page.locator('.nh-map-landmark-marker[title="Đại học Quốc gia Hà Nội"]');
    await schoolPin.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Tìm phòng quanh trường này',exact:true}).click();
    await page.waitForURL(url=>url.searchParams.get('originLat')==='20.99962'&&url.searchParams.get('radiusKm')==='2');
    await page.getByRole('heading',{name:'Phòng trọ quanh Đại học Quốc gia Hà Nội',exact:true}).waitFor();
    await page.goBack();
    await page.getByRole('heading',{name:'Bản đồ nhà trọ Hòa Lạc',exact:true}).waitFor();
    mode='data'; tileFailure=true;await page.goto('http://127.0.0.1:5174/map');await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor();
    tileFailure=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();
    await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor({state:'detached'});
    // Exercise the real registration form's controlled fields and draggable marker.
    await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','map-browser-test'));
    await page.goto('http://127.0.0.1:5174/host/property/new');
    await page.locator('#name').fill('Nhà trọ kiểm thử');await page.locator('#description').fill('Nhà trọ kiểm thử bản đồ với đầy đủ thông tin cần thiết.');
    await page.locator('#managerName').fill('Chủ nhà kiểm thử');await page.locator('#contactPhone').fill('0912345678');
    await page.getByRole('button',{name:/Tiếp tục/}).click();
    await page.locator('#addressDetail').fill('Số 12 ngõ 10 thôn Tân Xã');
    const canvas=page.locator('.accommodation-map .leaflet-container');await canvas.click({position:{x:120,y:120}});
    await page.locator('.leaflet-marker-icon').waitFor();
    assert.equal(await page.locator('#addressDetail').inputValue(),'Số 12 ngõ 10 thôn Tân Xã');
    await page.getByText('Nhập tọa độ thủ công',{exact:true}).click();
    const before=await page.locator('#latitude').inputValue();
    const pin=page.locator('.leaflet-marker-icon'),box=await pin.boundingBox();
    await page.mouse.move(box.x+12,box.y+15);await page.mouse.down();await page.mouse.move(box.x+70,box.y+45,{steps:10});await page.mouse.up();
    assert.notEqual(await page.locator('#latitude').inputValue(),before);
    await page.locator('#property-pasted-address').fill('21.018812,105.521512');await page.getByRole('button',{name:'Đặt ghim & điền thông tin',exact:true}).click();
    assert.equal(await page.locator('#longitude').inputValue(),'105.521512');
    assert.equal(await page.locator('#addressDetail').inputValue(),'Số 12 ngõ 10 thôn Tân Xã');
    await page.screenshot({path:path.join(output,'picker.png'),fullPage:true});
    await page.goto('http://127.0.0.1:5174/host/property/edit?registrationId=77');
    await page.locator('.leaflet-marker-icon').waitFor();
    assert.equal(await page.locator('#latitude,#longitude').count(),0,'Coordinates remain internal on edit');
    await page.locator('.accommodation-map .leaflet-container').click({position:{x:120,y:120}});
    await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
    const edited=await page.evaluate(()=>{const key=Object.keys(sessionStorage).find(key=>key.startsWith('hlrcs:property-edit:'));return JSON.parse(sessionStorage.getItem(key)).fields;});
    assert.notEqual(edited.latitude,'21.018812');
    assert.equal(await page.locator('#addressDetail').inputValue(),'Số 12 ngõ 10 thôn Tân Xã');
    assert.equal(await page.locator('#addressDetail').isDisabled(),true,'Restricted fields stay locked');
    await page.screenshot({path:path.join(output,'edit.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: responsive map, grouped popup, routing, filters/pagination, directions, legacy/empty/error, tile retry, keyboard, 200% zoom, click/drag picker, form preservation. API/tile fixtures only.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
