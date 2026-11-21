// All application APIs and scan responses are fixtures. No real documents or SMS are sent.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.ROOM_BULK_TEST_URL||'http://127.0.0.1:5198';

const TINY_PNG_DATA_URL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],writes=[],inspectCalls=[],scanPageCalls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hlrcs_access_token','contract-fixture'));
  await page.route('https://**',r=>r.abort());
  const property={propertyId:12,name:'Nhà trọ kiểm thử',address:'Hòa Lạc, Hà Nội',status:'ACTIVE'};
  const type={roomTypeId:34,propertyId:12,roomType:'Studio',price:2200000,areaSqm:25,capacity:2,amenities:[],electricityPrice:3500,waterPrice:null,internetPrice:100000,servicePrice:null,totalRooms:2,vacantRooms:2};
  let rows=[],records={},saveFail=false,contractReadFailure=false,page3Attempts=0;
  let isTenant=false, tenantVerified=false;
  const signingToken='s'.repeat(43), documentHash='b'.repeat(64);
  const reset=()=>{
    rows=[1,2].map(n=>({roomId:n,propertyId:12,roomTypeId:34,roomType:'Studio',roomNumber:`P.10${n}`,floor:'Tầng 1',status:'VACANT',price:2200000,deposit:2200000,customPrice:null,areaSqm:25,amenities:['refrigerator','bed'],confirmedAt:'2026-11-18T10:00:00',leaseStartDate:null,leaseEndDate:null}));
    records={};
    page3Attempts=0;
  };
  const templates=[
    {
      id:'BASIC',
      name:'Mẫu 1 · Hợp đồng thuê phòng trọ',
      terms:'1. Trách nhiệm của bên A\n- Tạo mọi điều kiện thuận lợi để bên B thực hiện theo hợp đồng.\n- Cung cấp nguồn điện, nước, wifi cho bên B sử dụng.\n\n2. Trách nhiệm của bên B\n- Thanh toán đầy đủ các khoản tiền theo đúng thỏa thuận.\n- Bảo quản các trang thiết bị và cơ sở vật chất của bên A trang bị cho ban đầu (làm hỏng phải sửa, mất phải đền).\n\n3. Trách nhiệm chung\n- Hai bên phải tạo điều kiện cho nhau thực hiện hợp đồng.\n- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ một bản.',
    },
    {
      id:'HOUSE_RENTAL',
      name:'Mẫu 2 · Hợp đồng thuê nhà trọ',
      description:'Bốn điều về nội dung thuê, quyền và nghĩa vụ, chấm dứt và cam kết.',
      terms:'ĐIỀU 1: NỘI DUNG HỢP ĐỒNG\n1.2 Mục đích thuê nhà\nBên thuê nhà thuê nhà để ở.\n\n1.4 Thời hạn cho thuê\nĐề xuất về việc gia hạn sẽ được đưa ra trước 30 (ba mươi) ngày trước khi hết hạn.\n\nĐIỀU 2: QUYỀN VÀ NGHĨA VỤ CÁC BÊN\n- Hai bên thực hiện đúng thỏa thuận.\n\nĐIỀU 3: CHẤM DỨT HỢP ĐỒNG\n- Chấm dứt khi hết hạn thuê.\n\nĐIỀU 4: CAM KẾT CỦA CÁC BÊN\n- Mỗi bên giữ một bản.',
    },
    {
      id:'SHARED',
      name:'Hợp đồng thuê phòng có người ở cùng',
      terms:'1. Trách nhiệm của bên A\n- Tạo mọi điều kiện thuận lợi để bên B và người ở cùng thực hiện theo hợp đồng.\n\n2. Trách nhiệm của bên B và người ở cùng\n- Ghi rõ danh sách người ở cùng và thanh toán đúng thỏa thuận.\n\n3. Trách nhiệm chung\n- Hai bên phối hợp thực hiện hợp đồng.',
    },
  ];

  const page1Text=[
    'ĐIỀU KHOẢN THUÊ PHÒNG P.102 — Mã 0008.',
    'Ngày hiệu lực: 01/12/2026.',
    'Giá thuê: 2.200.000 đ/tháng | Tiền cọc: 2,200,000 đ.',
    'Bảng phí | Điện: 3.800 đ/kWh | Nước: ⟦KHÔNG ĐỌC RÕ:U1⟧ đ/người.',
    'Người đại diện thuê: .....',
  ].join('\n');
  const page3RecoveredText='Trang 3 — Phụ lục bàn giao tài sản phòng P.102, mã 0008, ngày 01/12/2026.';

  await page.route(base+'/api/**',async route=>{
    const req=route.request(),p=new URL(req.url()).pathname,ok=data=>route.fulfill({json:{success:true,data}});
    if(p==='/api/auth/me')return ok(isTenant
      ? {userId:2,fullName:'Người thuê hiện tại',phoneNumber:'0912345678',role:'USER'}
      : {userId:1,fullName:'Chủ trọ kiểm thử',phoneNumber:'0901234567',email:'host@example.test',role:'ROOM_HOST'});
    if(p==='/api/auth/profile/phone/send-otp'){
      assert.equal(req.postDataJSON().phoneNumber,'0912345678');
      return ok({phoneNumber:'0912345678',expiresAt:new Date(Date.now()+300000),resendAt:new Date(Date.now()+60000)});
    }
    if(p==='/api/auth/profile/phone/verify-otp'){
      assert.equal(req.postDataJSON().code,'123456');
      return ok({verified:true});
    }
    if(p==='/api/auth/profile/phone/confirm'){
      tenantVerified=true;
      return ok({userId:2,phoneVerifiedAt:'2026-11-21T10:00:00Z'});
    }
    if(p==='/api/host/rental-contracts/1/signing-link')return ok({token:signingToken,expiresAt:'2026-11-28T10:15:00Z'});
    if(p==='/api/rental-contract-signing/open'){
      assert.equal(req.postDataJSON().token,signingToken);
      if(!tenantVerified)return route.fulfill({status:403,json:{success:false,message:'Hãy xác minh số điện thoại đã ghi trên hợp đồng để tiếp tục.'}});
      return ok(records[1][0]);
    }
    if(['/api/host/rental-contracts/1/signature','/api/rental-contract-signing/signature'].includes(p)){
      const contract=records[1][0];
      const request=req.postDataJSON();
      const signature=isTenant?request.signature:request;
      assert.equal(signature.documentHash,documentHash);
      assert.equal(signature.confirmed,true);
      assert.equal(signature.method,isTenant?'DRAWN':'TYPED');
      if(isTenant)assert.ok(signature.strokes[0].length>2);
      contract[isTenant?'tenantSignature':'ownerSignature']={
        name:isTenant?contract.details.tenantName:contract.details.landlordName,
        signedAt:'2026-11-21T10:30:00Z',method:signature.method,strokes:signature.strokes,
      };
      return ok(contract);
    }
    if(p==='/api/host/rental-contracts/templates')return ok({templates,scanAvailable:true});
    if(p==='/api/host/rental-contracts/scan/inspect'){
      const bodyText=req.postDataBuffer().toString('latin1');
      inspectCalls.push(bodyText);
      return ok({
        totalFiles:1,
        totalPages:3,
        pages:[
          {pageId:'F1-P1',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:1,pageNumber:1,totalPages:3,mimeType:'application/pdf',previewDataUrl:TINY_PNG_DATA_URL},
          {pageId:'F1-P2',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:2,pageNumber:2,totalPages:3,mimeType:'application/pdf',previewDataUrl:TINY_PNG_DATA_URL},
          {pageId:'F1-P3',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:3,pageNumber:3,totalPages:3,mimeType:'application/pdf',previewDataUrl:TINY_PNG_DATA_URL},
        ],
      });
    }
    if(p==='/api/host/rental-contracts/scan/page'){
      const raw=req.postDataBuffer().toString('latin1');
      scanPageCalls.push(raw);
      const idMatch=raw.match(/name="pageId"\r\n\r\n([^\r\n]+)/);
      const pageId=idMatch?idMatch[1]:'F1-P1';
      await new Promise(r=>setTimeout(r,60));
      if(pageId==='F1-P1'){
        return ok({
          pageId:'F1-P1',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:1,pageNumber:1,totalPages:3,
          extractionMethod:'GEMINI_OCR',pageStatus:'needs_review',text:page1Text,
          uncertainSpans:[{code:'U1',line:4,reason:'Chữ số bị mờ do nếp gấp'}],
          reviewReminders:[
            {id:'R1',category:'money',label:'Số tiền',line:3,value:'2.200.000 đ'},
            {id:'R2',category:'date',label:'Ngày tháng',line:2,value:'01/12/2026'},
            {id:'R3',category:'room',label:'Mã phòng',line:1,value:'P.102'},
          ],
          previewDataUrl:TINY_PNG_DATA_URL,error:null,
        });
      }
      if(pageId==='F1-P2'){
        return ok({
          pageId:'F1-P2',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:2,pageNumber:2,totalPages:3,
          extractionMethod:'PDF_TEXT',pageStatus:'blank',text:'',
          uncertainSpans:[],reviewReminders:[],previewDataUrl:TINY_PNG_DATA_URL,error:null,
        });
      }
      page3Attempts++;
      if(page3Attempts===1){
        return ok({
          pageId:'F1-P3',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:3,pageNumber:3,totalPages:3,
          extractionMethod:'GEMINI_OCR',pageStatus:'unreadable',text:'',
          uncertainSpans:[],reviewReminders:[],previewDataUrl:TINY_PNG_DATA_URL,
          error:'Ảnh bị lóa không đọc được (không phải trang trống).',
        });
      }
      return ok({
        pageId:'F1-P3',fileId:'F1',fileIndex:0,fileName:'hop-dong-3-trang.pdf',sourcePageIndex:3,pageNumber:3,totalPages:3,
        extractionMethod:'GEMINI_OCR',pageStatus:'readable',text:page3RecoveredText,
        uncertainSpans:[],
        reviewReminders:[{id:'R4',category:'room',label:'Mã phòng',line:1,value:'P.102'}],
        previewDataUrl:TINY_PNG_DATA_URL,error:null,
      });
    }
    if(p.startsWith('/api/host/rental-contracts/rooms/')){
      if(contractReadFailure)return route.fulfill({status:503,json:{success:false,message:'Chưa tải được hợp đồng kiểm thử.'}});
      return ok(records[p.split('/').at(-1)]||[]);
    }
    if(p==='/api/host/rooms/status'){
      const body=JSON.parse(req.postData());writes.push(body);assert.equal(req.method(),'PATCH');
      if(saveFail)return route.fulfill({status:503,json:{success:false,message:'Chưa lưu được hợp đồng kiểm thử.'}});
      rows=rows.map(r=>body.roomIds.includes(r.roomId)?{...r,status:body.status,leaseStartDate:body.leaseStartDate,leaseEndDate:body.leaseEndDate}:r);
      body.contracts?.forEach(d=>{const r=rows.find(r=>r.roomId===d.roomId);records[d.roomId]=[{id:d.roomId,status:'ACTIVE',propertyName:property.name,propertyAddress:property.address,roomNumber:r.roomNumber,startDate:body.leaseStartDate,endDate:body.leaseEndDate,details:d}];});
      return ok(rows.filter(r=>body.roomIds.includes(r.roomId)));
    }
    assert.equal(req.method(),'GET','Unexpected write');
    if(p==='/api/host/rooms')return ok({properties:[property],roomTypes:[type],rooms:rows,pendingRegistrationCount:0});
    return ok({items:[],unreadCount:0,totalElements:0});
  });

  const out=path.resolve(__dirname,'../../target/rental-contract-ui');
  fs.mkdirSync(out,{recursive:true});
  const select=n=>page.getByRole('checkbox',{name:`Chọn phòng P.10${n}`,exact:true});
  const openWizard=async(count=1)=>{
    for(let n=1;n<=count;n++)await select(n).check();
    await page.getByRole('button',{name:`Đổi trạng thái (${count})`,exact:true}).click();
    await page.locator('#bulk-leaseStartDate').fill('2026-11-18');
    await page.locator('#bulk-leaseEndDate').fill('2027-11-18');
    await page.getByRole('checkbox',{name:/Tạo hợp đồng thuê phòng/}).click();
    await page.getByRole('heading',{name:'Lập hợp đồng thuê phòng',exact:true}).waitFor();
  };

  for(const width of [375,768,1024,1440]){
    reset();
    const callsBefore=inspectCalls.length;
    await page.setViewportSize({width,height:920});
    await page.goto(base+'/host/rooms');
    await openWizard(1);
    const dialog=page.getByRole('dialog');

    // Start at the template gallery, then inspect the room-derived data and House preview.
    assert.equal(await dialog.getByRole('button',{name:'Chọn mẫu',exact:true}).getAttribute('aria-current'),'step');
    const next=dialog.getByRole('button',{name:'Tiếp tục',exact:true});
    const templateOne=dialog.getByRole('radio',{name:/Mẫu 1/});
    const templateTwo=dialog.getByRole('radio',{name:/Mẫu 2/});
    await templateOne.waitFor();
    assert.equal(await templateOne.isChecked(),true);
    await templateTwo.focus();
    await page.keyboard.press('Space');
    assert.equal(await templateTwo.isChecked(),true);
    await next.click();
    await page.locator('#contract-1-tenantName').fill('Người thuê kiểm thử');
    await page.locator('#contract-1-tenantPhone').fill('0912345678');
    await dialog.getByLabel('Số người ở',{exact:true}).fill('2');
    await next.click();
    const roomFacts=dialog.getByRole('region',{name:'Diện tích và trang thiết bị'});
    await roomFacts.getByText('25 m²',{exact:true}).waitFor();
    await roomFacts.getByText('Tủ lạnh riêng, Giường & Đệm',{exact:true}).waitFor();
    const mobilePreview=dialog.getByRole('button',{name:'Xem hợp đồng',exact:true});
    const fullPreview=dialog.getByRole('button',{name:'Xem bản đầy đủ',exact:true});
    await (await mobilePreview.isVisible()?mobilePreview:fullPreview).click();
    const houseDoc=dialog.locator('.rc-house-doc');
    await houseDoc.getByRole('heading',{name:'HỢP ĐỒNG THUÊ NHÀ TRỌ',exact:true}).waitFor();
    await houseDoc.getByRole('heading',{name:'ĐIỀU 4: CAM KẾT CỦA CÁC BÊN',exact:true}).waitFor();
    await houseDoc.getByText(/Tủ lạnh riêng, Giường & Đệm/).waitFor();
    await houseDoc.getByText(/Hà Nội, ngày \d{2} tháng \d{2} năm \d{4}/).waitFor();
    await houseDoc.getByText('Bên thuê nhà thuê nhà để ở.',{exact:true}).waitFor();
    await houseDoc.getByText(/trước 30 \(ba mươi\) ngày/).waitFor();
    assert.ok(!(await houseDoc.innerText()).includes('Chưa ký'));
    assert.ok(await houseDoc.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
    if(width===375||width===1440)await page.screenshot({path:path.join(out,`house-template-${width}.png`)});
    await dialog.getByRole('button',{name:'Quay lại bước 3',exact:true}).first().click();

    // Switch to "Quét mẫu của tôi": Chọn tệp → Đối chiếu → Áp dụng
    await dialog.getByRole('button',{name:'Chọn mẫu',exact:true}).click();
    await dialog.getByRole('button',{name:'Quét mẫu của tôi',exact:true}).click();
    await next.click();
    await dialog.getByText('Áp dụng bản quét đã đối chiếu để tiếp tục.',{exact:true}).waitFor();
    await dialog.getByRole('button',{name:'Chọn ảnh hoặc PDF',exact:true}).waitFor();
    const consentBox=page.locator('#contract-scan-consent-1');
    assert.equal(await consentBox.isChecked(),false,'Consent must be unchecked by default');

    // Upload PDF — MUST NOT auto-send before consent + clicking scan!
    await page.locator('#contract-files-1').setInputFiles({
      name:'hop-dong-3-trang.pdf',
      mimeType:'application/pdf',
      buffer:Buffer.from('%PDF-1.7 fixture'),
    });
    assert.equal(inspectCalls.length,callsBefore,'Selecting files must not trigger background upload');
    await dialog.getByText('hop-dong-3-trang.pdf').waitFor();
    const startBtn=dialog.getByRole('button',{name:'Quét và chép nguyên văn',exact:true});
    assert.equal(await startBtn.isDisabled(),true,'Scan button must stay disabled before consent');
    await consentBox.check();
    assert.equal(await startBtn.isDisabled(),false);
    await startBtn.click();

    // Step 2 (Đối chiếu): Page 1 has uncertain span U1 -> cannot confirm until replaced & explicitly resolved
    await dialog.locator('.rc-verify-topbar').getByText('Đã xác nhận 0 / 3 trang').waitFor();
    if(width<820){
      // Mobile switcher preserves active page!
      await dialog.getByRole('button',{name:/Văn bản \(Trang 1\/3\)/}).click();
    }
    const p1Textarea=page.locator('#ocr-page-text-F1-P1');
    await p1Textarea.waitFor();
    assert.equal(await page.locator('#ocr-confirm-F1-P1').isDisabled(),true);
    // Merely deleting marker text does NOT auto-resolve U1
    const fixedP1=page1Text.replace('⟦KHÔNG ĐỌC RÕ:U1⟧','100.000');
    await p1Textarea.fill(fixedP1);
    assert.equal(await page.locator('#ocr-confirm-F1-P1').isDisabled(),true,'Deleting marker alone must not clear warning');
    // Explicitly mark U1 resolved
    await dialog.getByRole('button',{name:'Đánh dấu đã xử lý',exact:true}).click();
    assert.equal(await page.locator('#ocr-confirm-F1-P1').isDisabled(),false);
    await page.locator('#ocr-confirm-F1-P1').check();
    await dialog.locator('.rc-verify-topbar').getByText('Đã xác nhận 1 / 3 trang').waitFor();
    if(width===1440||width===375)await page.screenshot({path:path.join(out,`scan-verify-${width}.png`)});

    // Page 2: genuine blank page -> confirmable
    await dialog.getByRole('tab',{name:/Trang 2/}).click();
    await dialog.getByText('Trang trống thật:').waitFor();
    await page.locator('#ocr-confirm-F1-P2').check();

    // Page 3: initially unreadable -> CANNOT confirm -> click Quét lại trang này -> recovers WITHOUT losing Page 1 edits/confirm!
    await dialog.getByRole('tab',{name:/Trang 3/}).click();
    if(width<820){
      await dialog.getByRole('button',{name:/Văn bản \(Trang 3\/3\)/}).click();
    }
    await dialog.getByText('Ảnh bị lóa không đọc được').waitFor();
    assert.equal(await page.locator('#ocr-confirm-F1-P3').isDisabled(),true);
    if(width<820){
      await dialog.getByRole('button',{name:/Ảnh gốc \(Trang 3\/3\)/}).click();
    }
    await dialog.getByRole('button',{name:'Quét lại trang này',exact:true}).click();
    if(width<820){
      await dialog.getByRole('button',{name:/Văn bản \(Trang 3\/3\)/}).click();
    }
    await dialog.locator('.rc-ocr-badges').getByText('Đọc rõ',{exact:true}).waitFor();
    assert.equal(await page.locator('#ocr-page-text-F1-P3').inputValue(),page3RecoveredText);
    await page.locator('#ocr-confirm-F1-P3').check();
    await dialog.locator('.rc-verify-topbar').getByText('Đã xác nhận 3 / 3 trang').waitFor();

    // Confirm Page 1 still has our edited verbatim text intact!
    await dialog.getByRole('tab',{name:/Trang 1/}).click();
    assert.equal(await page.locator('#ocr-page-text-F1-P1').inputValue(),fixedP1);
    assert.equal(await page.locator('#ocr-confirm-F1-P1').isChecked(),true);

    // OCR step 3 (Áp dụng) returns the template to the wizard.
    await dialog.getByRole('button',{name:'Tiếp tục sang Áp dụng (3/3)',exact:true}).click();
    await dialog.getByRole('button',{name:'Áp dụng văn bản cho phòng P.101',exact:true}).click();
    await dialog.getByText(/Đã áp dụng mẫu cho phòng/).waitFor();

    // Fill the detected blank and check both the editable source and the completed preview.
    const expectedCombined=`${fixedP1}\n\n${page3RecoveredText}`;
    const expectedFilled=expectedCombined.replace('Người đại diện thuê: .....','Người đại diện thuê: Nguyễn Văn An');
    await next.click();
    await dialog.getByRole('heading',{name:'Điền chỗ trống trong mẫu'}).waitFor();
    await dialog.getByRole('textbox',{name:'Dòng 5',exact:true}).fill('Nguyễn Văn An');
    await next.click();
    await next.click();
    assert.equal(await page.locator('#contract-1-terms').inputValue(),expectedCombined);
    await (await mobilePreview.isVisible()?mobilePreview:fullPreview).click();
    const scannedDoc=dialog.getByRole('article',{name:'Nội dung mẫu đã quét'});
    assert.equal(await scannedDoc.locator('pre').textContent(),expectedFilled);
    await dialog.getByRole('button',{name:'Quay lại bước 4',exact:true}).first().click();

    // Confirm overall review & save
    const saveButton=dialog.getByRole('button',{name:'Lưu & cập nhật phòng',exact:true});
    const reviewed=page.locator('#contract-1-reviewed');
    assert.equal(await saveButton.isDisabled(),true);
    await dialog.getByText('Tích xác nhận đã đọc bản xem trước để lưu.',{exact:true}).waitFor();
    const lockedColor=await saveButton.evaluate(el=>getComputedStyle(el).backgroundColor);
    if(width===375||width===1440)await page.screenshot({path:path.join(out,`save-locked-${width}.png`)});
    await reviewed.check();
    assert.equal(await saveButton.isEnabled(),true);
    assert.notEqual(await saveButton.evaluate(el=>getComputedStyle(el).backgroundColor),lockedColor);
    await reviewed.uncheck();
    assert.equal(await saveButton.isDisabled(),true);
    await reviewed.check();
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+2),`Overflow at ${width}px`);
    if(width===1440){
      await page.evaluate(()=>document.documentElement.style.zoom='2');
      assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'Overflow at 200% zoom');
      await page.evaluate(()=>document.documentElement.style.zoom='');
    }

    if(width===375){
      saveFail=true;await saveButton.click();
      await dialog.getByText('Chưa lưu được hợp đồng kiểm thử.',{exact:true}).waitFor();saveFail=false;
    }
    await saveButton.click();
    await dialog.waitFor({state:'detached'});

    const sent=writes.at(-1);
    assert.equal(sent.contracts[0].template,'OWNER_SCAN');
    assert.equal(sent.contracts[0].terms,expectedFilled);
    assert.equal(sent.contracts[0].fullScannedTranscript,expectedCombined);
    assert.equal(sent.contracts[0].scanFullDocument,true);
    assert.ok(sent.contracts[0].terms.includes('2.200.000'));
    assert.ok(sent.contracts[0].terms.includes('2,200,000'));
    assert.ok(sent.contracts[0].terms.includes('0008.'));
    assert.ok(sent.contracts[0].terms.includes('01/12/2026.'));
    assert.ok(sent.contracts[0].terms.includes('P.102'));
  }

  reset();
  await page.goto(base+'/host/rooms');
  await openWizard(2);
  const bulkDialog=page.getByRole('dialog');
  const bulkSave=bulkDialog.getByRole('button',{name:'Lưu & cập nhật 2 phòng',exact:true});
  const partiesStep=bulkDialog.getByRole('button',{name:'Hai bên',exact:true});
  const reviewStep=bulkDialog.getByRole('button',{name:'Điều khoản & duyệt',exact:true});
  const fillTenant=async id=>{
    await partiesStep.click();
    await page.locator(`#contract-${id}-tenantName`).fill(`Người thuê phòng ${id}`);
    await page.locator(`#contract-${id}-tenantPhone`).fill('0912345678');
    await reviewStep.click();
    await page.locator(`#contract-${id}-reviewed`).check();
  };
  await bulkDialog.getByRole('radio',{name:/Mẫu 1/}).waitFor();
  await fillTenant(1);
  assert.equal(await bulkSave.isDisabled(),true);
  await bulkDialog.getByText('Hoàn tất bước Hai bên cho phòng P.102 để lưu.',{exact:true}).waitFor();
  await bulkDialog.getByLabel('Hợp đồng của phòng',{exact:true}).selectOption('2');
  await fillTenant(2);
  assert.equal(await bulkSave.isEnabled(),true);
  await bulkDialog.getByRole('button',{name:'Kỳ thuê & chi phí',exact:true}).click();
  await page.locator('#bulk-leaseEndDate').fill('');
  await reviewStep.click();
  assert.equal(await bulkSave.isDisabled(),true);
  await bulkDialog.getByText('Hoàn tất bước Kỳ thuê & chi phí cho phòng P.101 để lưu.',{exact:true}).waitFor();

  reset();
  rows[0]={...rows[0],status:'OCCUPIED',leaseStartDate:'2026-11-21',leaseEndDate:'2027-11-21'};
  rows[1]={...rows[1],status:'OCCUPIED',leaseStartDate:'2026-11-21',leaseEndDate:'2027-11-21'};
  const savedDetails={
    roomId:1,landlordName:'Chủ trọ kiểm thử',tenantName:'Người thuê hiện tại',
    rent:2200000,deposit:2200000,paymentDay:5,contractDate:'2026-11-20',
  };
  const savedRoom={propertyName:property.name,propertyAddress:property.address,roomNumber:'P.101'};
  records[1]=[
    {...savedRoom,id:1,status:'ACTIVE',startDate:'2026-11-21',endDate:'2027-11-21',createdAt:'2026-11-20T10:00:00',documentHash,
      details:{...savedDetails,template:'HOUSE_RENTAL',terms:templates[1].terms}},
    {...savedRoom,id:2,status:'CLOSED',startDate:'2025-09-01',endDate:'2026-09-01',createdAt:'2025-09-01T08:00:00',
      details:{...savedDetails,tenantName:'Người thuê trước',template:'BASIC',terms:templates[0].terms}},
    {...savedRoom,id:3,status:'CLOSED',startDate:'2024-09-01',endDate:'2025-09-01',createdAt:'2024-09-01T08:00:00',
      details:{...savedDetails,tenantName:'Người thuê theo mẫu quét',template:'OWNER_SCAN',scanFullDocument:true,
        terms:['HỢP ĐỒNG TỪ MẪU QUÉT',...Array.from({length:75},(_,i)=>`Điều ${i+1}. Bên thuê và bên cho thuê xác nhận nội dung bàn giao tài sản.`),'Nội dung cuối hợp đồng mẫu quét.'].join('\n')}},
  ];
  const drawer=page.getByRole('dialog',{name:'Phòng P.101',exact:true});
  const trigger=drawer.getByRole('button',{name:'Hợp đồng thuê phòng',exact:true});
  const reader=page.getByRole('dialog',{name:'Hợp đồng thuê phòng',exact:true});
  const documentRegion=reader.getByRole('region',{name:'Nội dung hợp đồng'});
  const history=reader.getByLabel('Lịch sử hợp đồng',{exact:true});
  const closeReader=reader.getByRole('button',{name:'Đóng hợp đồng',exact:true});
  const savePdf=async variant=>{
    const [download]=await Promise.all([
      page.waitForEvent('download',{timeout:20000}),
      reader.getByRole('button',{name:'Tải bản PDF',exact:true}).click(),
    ]);
    assert.equal(download.suggestedFilename(),'Hop-dong-phong-P.101.pdf');
    const file=path.join(out,`export-${variant}.pdf`);
    await download.saveAs(file);
    assert.equal(fs.readFileSync(file).subarray(0,5).toString('ascii'),'%PDF-');
  };
  for(const width of [375,768,1024,1440]){
    await page.setViewportSize({width,height:920});
    await page.goto(base+'/host/rooms');
    await page.getByRole('button',{name:/^Phòng P\.101 ·/}).click();
    if(width===375)contractReadFailure=true;
    await trigger.click();
    if(width===375){
      await reader.getByRole('alert').getByText('Chưa tải được hợp đồng kiểm thử.',{exact:true}).waitFor();
      contractReadFailure=false;
      await reader.getByRole('button',{name:'Thử lại',exact:true}).click();
    }
    await documentRegion.getByRole('heading',{name:'HỢP ĐỒNG THUÊ NHÀ TRỌ',exact:true}).waitFor();
    await documentRegion.getByText('Hà Nội, ngày 20 tháng 11 năm 2026',{exact:true}).waitFor();
    await documentRegion.getByText(/Người thuê hiện tại/).first().waitFor();
    assert.equal(await history.inputValue(),'1');
    assert.ok(await documentRegion.evaluate(el=>el.scrollWidth<=el.clientWidth+2),`Reader overflow at ${width}px`);
    if(width===375||width===1440)await reader.screenshot({path:path.join(out,`saved-contract-reader-${width}.png`)});
    if(width===375)await savePdf('house');

    await documentRegion.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await history.selectOption('2');
    await documentRegion.getByRole('heading',{name:'HỢP ĐỒNG THUÊ PHÒNG TRỌ',exact:true}).waitFor();
    await documentRegion.getByText('Người thuê trước',{exact:true}).first().waitFor();
    assert.equal(await documentRegion.evaluate(el=>el.scrollTop),0);
    if(width===1440){
      await savePdf('basic');
      await history.selectOption('3');
      await documentRegion.getByText(/Nội dung cuối hợp đồng mẫu quét/).waitFor();
      await savePdf('scan');
      await page.evaluate(()=>document.documentElement.style.zoom='2');
      assert.ok(await documentRegion.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'Reader overflow at 200% zoom');
      await page.evaluate(()=>document.documentElement.style.zoom='');
    }
    await closeReader.focus();
    await page.keyboard.press('Tab');
    assert.ok(await history.evaluate(el=>el===document.activeElement),'Keyboard should move from close to contract history');
    assert.ok(await reader.evaluate(el=>{
      el.closest('.hm-sheet-root').querySelector('.rc-history button').focus();
      return el.contains(document.activeElement);
    }),'The drawer behind the reader should be inert');
    await page.keyboard.press('Escape');
    await reader.waitFor({state:'detached'});
    await drawer.getByRole('heading',{name:'Phòng P.101',exact:true}).waitFor();
    assert.ok(await trigger.evaluate(el=>el===document.activeElement),'Focus should return to the room contract button');
  }

  await page.goto(base+'/host/rooms');
  await page.getByRole('button',{name:/^Phòng P\.102 ·/}).click();
  await page.getByRole('dialog',{name:'Phòng P.102',exact:true}).getByRole('button',{name:'Hợp đồng thuê phòng',exact:true}).click();
  await reader.getByText('Phòng chưa có hợp đồng được lưu trên hệ thống.',{exact:true}).waitFor();
  await reader.getByRole('button',{name:'Tạo hợp đồng cho đợt thuê hiện tại',exact:true}).click();
  await page.getByRole('dialog',{name:'Lập hợp đồng thuê phòng',exact:true}).waitFor();

  await page.goto(base+'/host/rooms');
  await page.getByRole('button',{name:/^Phòng P\.101 ·/}).click();
  await trigger.click();
  await reader.getByRole('button',{name:'Ký hợp đồng',exact:true}).click();
  assert.equal(await reader.getByRole('button',{name:'Xác nhận ký',exact:true}).isDisabled(),true);
  await reader.getByRole('checkbox',{name:/Tôi đã đọc nội dung/}).check();
  await reader.getByRole('button',{name:'Xác nhận ký',exact:true}).click();
  await reader.getByText('Đã ký trên hệ thống',{exact:true}).waitFor();
  await reader.getByRole('button',{name:'Tạo liên kết mời ký',exact:true}).click();
  const invitation=await reader.getByRole('textbox',{name:/Liên kết mời người thuê ký/}).inputValue();
  assert.equal(invitation,base+'/contracts/sign#'+signingToken);

  isTenant=true;
  await page.setViewportSize({width:390,height:844});
  await page.goto(invitation);
  await page.getByRole('button',{name:'Xác minh số điện thoại',exact:true}).click();
  await page.getByRole('button',{name:'Gửi mã OTP',exact:true}).click();
  await page.getByRole('textbox',{name:'Mã xác minh',exact:true}).fill('123456');
  await page.getByRole('button',{name:'Xác minh và lưu',exact:true}).click();
  const signingForm=page.getByRole('form',{name:'Ký hợp đồng'});
  await signingForm.getByRole('radio',{name:'Vẽ chữ ký',exact:true}).check();
  const pad=signingForm.getByRole('img',{name:'Khung vẽ chữ ký'});
  await pad.scrollIntoViewIfNeeded();
  const {x,y}=await pad.boundingBox();
  await page.mouse.move(x+25,y+43);
  await page.mouse.down();
  await page.mouse.move(x+75,y+16,{steps:7});
  await page.mouse.move(x+132,y+44,{steps:7});
  await page.mouse.move(x+195,y+26,{steps:7});
  await page.mouse.up();
  await signingForm.getByRole('checkbox').check();
  assert.ok(await signingForm.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
  await signingForm.screenshot({path:path.join(out,'tenant-sign-mobile.png')});
  await signingForm.getByRole('button',{name:'Xác nhận ký',exact:true}).click();
  await page.getByRole('status').getByText('Chữ ký của bạn đã được lưu.',{exact:true}).waitFor();
  await page.getByRole('img',{name:'Nét ký của Người thuê hiện tại'}).waitFor();
  const [signedPdf]=await Promise.all([
    page.waitForEvent('download',{timeout:20000}),
    page.getByRole('button',{name:'Tải bản PDF',exact:true}).click(),
  ]);
  await signedPdf.saveAs(path.join(out,'export-signed.pdf'));
  assert.equal(fs.readFileSync(path.join(out,'export-signed.pdf')).subarray(0,5).toString('ascii'),'%PDF-');

  assert.ok(inspectCalls.every(c=>c.includes('name="consent"')&&c.includes('name="roomId"')));
  assert.ok(scanPageCalls.every(c=>c.includes('name="consent"')&&c.includes('name="pageId"')));
  assert.deepEqual(errors,[]);
  console.log('PASS contract creation, reader, history, OTP and both signing methods, signed PDF, keyboard focus, four widths and 200% zoom.');
}catch(error){
  const p=browser.contexts()[0]?.pages()[0];
  if(p){
    await p.screenshot({path:path.resolve(__dirname,'../../target/rental-contract-ui/failed.png'),fullPage:true});
    console.error((await p.locator('body').innerText()).slice(-6000));
  }
  throw error;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
