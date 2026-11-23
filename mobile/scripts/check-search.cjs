const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(__dirname, '../.expo/search-review'); fs.mkdirSync(output, { recursive: true });
const rooms = Array.from({ length: 24 }, (_, index) => ({ roomTypeId: index + 1, propertyId: 7, roomTypeName: `Khép kín ${index + 1}`, propertyName: 'Nhà trọ An Khang', address: 'Tân Xã, Hòa Lạc', price: 1800000 + index * 50000, areaSqm: 20 + index, availableRooms: 2, verificationStatus: 'APPROVED', amenities: ['camera', 'airConditioner'] }));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true }); let page;
  try {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } }); page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(15000);
    const errors = [], calls = []; let fail = false;
    page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:',error.message); });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/properties/search') {
        const params = Object.fromEntries(url.searchParams); calls.push(params);
        if (params.q === 'chậm') await new Promise(resolve => setTimeout(resolve, 1300));
        const q = (params.q || '').toLocaleLowerCase();
        let list = rooms.filter(room => !q || `${room.roomTypeName} ${room.propertyName} ${room.address}`.toLocaleLowerCase().includes(q));
        if (params.type && params.type !== 'khep-kin') list = [];
        if (params.price === 'under-15') list = [];
        if (params.sort === 'price-desc') list.sort((a,b) => b.price-a.price);
        const number = Number(params.page || 0), size = Number(params.size || 15);
        return route.fulfill({status:fail?500:200,json:fail?{success:false,message:'Search fixture error'}:{success:true,data:{items:list.slice(number*size,(number+1)*size),page:number,size,totalElements:list.length,totalPages:Math.ceil(list.length/size)}},headers:{'access-control-allow-origin':'*'}}).catch(()=>{});
      }
      if (url.pathname.endsWith('/details')) return route.fulfill({json:{success:true,data:{summary:rooms[Number(url.pathname.match(/room-types\/(\d+)/)[1])-1],gallery:[],propertyGallery:[],roomTypes:[],amenities:[],propertyAmenities:[]}},headers:{'access-control-allow-origin':'*'}});
      if (route.request().method === 'OPTIONS') return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS'}});
      return route.fulfill({json:{success:true,data:{items:[],total:0}},headers:{'access-control-allow-origin':'*'}});
    });
    await page.goto('http://127.0.0.1:8092/explore');
    const input = () => page.getByLabel('Ô tìm kiếm phòng trọ',{exact:true}).filter({visible:true});
    const visibleText = text => page.getByText(text,{exact:true}).filter({visible:true});
    await visibleText('24 loại phòng phù hợp').waitFor({timeout:120000});
    assert.equal(await page.getByRole('tab',{name:'Tìm phòng',exact:true}).getAttribute('aria-selected'),'true');
    const before = calls.length; await input().fill('T'); await input().fill('Tân'); await input().fill('Tân Xã'); await page.waitForTimeout(600);
    assert.equal(calls.slice(before).filter(x=>x.q).length,1); assert.equal(calls.at(-1).q,'Tân Xã');
    await input().fill('An Khang'); await page.waitForTimeout(500); await visibleText('24 loại phòng phù hợp').waitFor();
    await input().fill('chậm'); await page.waitForTimeout(450); await input().fill('Khép kín'); await page.waitForTimeout(1800); await visibleText('24 loại phòng phù hợp').waitFor();
    await page.getByRole('button',{name:'Xóa tìm kiếm',exact:true}).click(); await page.waitForTimeout(450);
    const open = async()=>page.getByRole('button',{name:'Mở bộ lọc tìm kiếm',exact:true}).click();
    await open(); for(const width of [320,430]){await page.setViewportSize({width,height:844}); await page.waitForTimeout(350); await page.screenshot({path:path.join(output,'sheet-'+width+'.png')}); const footer=await page.getByRole('button',{name:'Xem kết quả',exact:true}).boundingBox(); assert.ok(footer&&footer.y+footer.height<=844); } await page.getByRole('button',{name:'Dưới 1,5 triệu',exact:true}).click(); await page.getByRole('button',{name:'Đóng',exact:true}).click(); assert.equal(calls.at(-1).price,undefined);
    await open(); await page.getByRole('button',{name:'Dưới 1,5 triệu',exact:true}).click(); await page.getByRole('button',{name:'Xem kết quả',exact:true}).click(); await visibleText('Không tìm thấy phòng phù hợp').waitFor(); assert.equal(calls.at(-1).price,'under-15');
    await open(); await page.getByRole('button',{name:'Đặt lại bộ lọc',exact:true}).click(); await page.getByRole('button',{name:'Đóng',exact:true}).click(); assert.equal(calls.at(-1).price,'under-15');
    await open(); await page.getByRole('button',{name:'Đặt lại bộ lọc',exact:true}).click(); await page.getByRole('button',{name:'Khép kín',exact:true}).click(); await page.getByRole('button',{name:'Tân Xã',exact:true}).click(); await page.getByRole('button',{name:'Camera an ninh',exact:true}).scrollIntoViewIfNeeded(); await page.getByRole('button',{name:'Camera an ninh',exact:true}).click(); await page.getByRole('button',{name:'Điều hòa',exact:true}).click(); await page.getByRole('button',{name:'Xem kết quả',exact:true}).click(); await visibleText('24 loại phòng phù hợp').waitFor(); assert.equal(calls.at(-1).type,'khep-kin'); assert.equal(calls.at(-1).location,'tan-xa'); assert.equal(calls.at(-1).amenities,'airConditioner,camera');
    await page.getByRole('button',{name:'Loại phòng: Tất cả',exact:true}).click(); await page.waitForTimeout(300); assert.equal(calls.at(-1).type,undefined); assert.equal(calls.at(-1).location,'tan-xa');
    await page.getByRole('button',{name:'Sắp xếp kết quả',exact:true}).click(); await page.getByRole('button',{name:'Giá cao đến thấp',exact:true}).click(); await page.getByRole('button',{name:'Xem kết quả',exact:true}).click(); await page.waitForTimeout(400); assert.equal(calls.at(-1).sort,'price-desc'); assert.equal(calls.at(-1).location,'tan-xa');
    await page.getByRole('link',{name:/Phòng Khép kín 24,/}).click(); await page.waitForURL('**/rooms/24?propertyId=7'); await page.getByRole('button',{name:'Quay lại',exact:true}).click(); await page.waitForURL('**/explore'); assert.equal(await input().inputValue(),'');
    for (const width of [320,360,390,430]) { await page.setViewportSize({width,height:844}); await page.screenshot({path:path.join(output,`search-${width}.png`)}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); }
    for(let attempt=0;attempt<6;attempt++){await page.getByRole('link',{name:/Phòng Khép kín /}).last().scrollIntoViewIfNeeded(); await page.waitForTimeout(150);}
    await visibleText('Bạn đã xem hết kết quả').waitFor(); assert.equal(calls.filter(x=>x.page==='1'&&x.sort==='price-desc'&&!x.q).length,1);
    await page.getByRole('tab',{name:'Trang chủ',exact:true}).click(); await input().fill('An Khang'); await input().press('Enter'); await page.waitForURL('**/explore'); assert.equal(await input().inputValue(),'An Khang'); await visibleText('24 loại phòng phù hợp').waitFor();
    await page.getByRole('tab',{name:'Trang chủ',exact:true}).click(); await page.getByRole('button',{name:'Danh mục: Gác lửng',exact:true}).click(); await page.waitForURL('**/explore'); await visibleText('Không tìm thấy phòng phù hợp').waitFor(); assert.equal(calls.at(-1).type,'gac-lung');
    await page.getByRole('button',{name:'Loại phòng: Tất cả',exact:true}).click(); await visibleText('24 loại phòng phù hợp').waitFor();
    fail=true; await input().fill('lỗi'); await visibleText('Không thể tải kết quả tìm kiếm').waitFor(); assert.equal(await visibleText('Không tìm thấy phòng phù hợp').count(),0); fail=false; await page.getByRole('button',{name:'Xóa tìm kiếm',exact:true}).click(); await visibleText('24 loại phòng phù hợp').waitFor();
    await page.getByRole('tab',{name:'Trang chủ',exact:true}).click(); await page.getByRole('button',{name:'Xem tất cả phòng nổi bật',exact:true}).click(); await page.waitForURL('**/explore'); await visibleText('24 loại phòng phù hợp').waitFor(); assert.equal(await input().inputValue(),''); assert.equal(calls.at(-1).location,undefined); assert.equal(calls.at(-1).amenities,undefined); assert.equal(calls.at(-1).sort,'newest');
    assert.equal(errors.length,0,errors.join('\n')); console.log(JSON.stringify({result:'passed',widths:[320,360,390,430],requests:calls.length,pageErrors:errors}));
  } catch(error) { if(page){await page.screenshot({path:path.join(output,'failure.png')});console.error((await page.locator('body').innerText()).slice(-2500));} throw error; }
  finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>process.exit(process.exitCode||0));





