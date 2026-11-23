import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyScan,
  buildContractModel,
  CONTRACT_STEP,
  contractBlanks,
  contractPayload,
  contractText,
  contractToday,
  extractRoomUtilities,
  firstErrorStep,
  newContract,
  parseSystemTermsSections,
  serializeSystemTermsSections,
  validateContract,
  validateContractFiles,
  validateContractStep,
} from '../src/services/rental-contracts.js';

const officialTerms='1. Trách nhiệm của bên A\n- Tạo mọi điều kiện thuận lợi để bên B thực hiện theo hợp đồng.\n- Cung cấp nguồn điện, nước, wifi cho bên B sử dụng.\n\n2. Trách nhiệm của bên B\n- Thanh toán đầy đủ các khoản tiền theo đúng thỏa thuận.\n\n3. Trách nhiệm chung\n- Hai bên phải tạo điều kiện cho nhau thực hiện hợp đồng.';
const valid=()=>({...newContract({roomId:1,price:2200000},{fullName:'Chủ trọ',phoneNumber:'0901234567'}),tenantName:'Nguyễn Văn An',tenantPhone:'0912345678',terms:officialTerms,reviewed:true});

test('separate room drafts validate review, VND integers, optional dates/utilities and required information',()=>{
  const a=valid(),b=newContract({roomId:2,price:2500000});
  assert.deepEqual(validateContract(a),{});
  assert.equal(b.tenantName,'');
  assert.equal(b.reviewed,false);
  assert.ok(validateContract({...a,reviewed:false}).reviewed);
  assert.ok(validateContract({...a,tenantName:' '}).tenantName);
  for(const value of ['2.200.000','1.5','-1','10000000000'])assert.ok(validateContract({...a,rent:value}).rent);
  assert.ok(validateContract({...a,paymentDay:'29'}).paymentDay);
  assert.ok(validateContract({...a,electricityPrice:'abc'}).electricityPrice);
  assert.ok(validateContract({...a,landlordBirthDate:'2026-02-30'}).landlordBirthDate);
  const full=contractPayload({...a,contractDate:'2026-11-18',electricityPrice:'3800',waterPrice:'100000',waterUnit:'người',paymentMethod:'Chuyển khoản'});
  assert.equal(full.rent,2200000);
  assert.equal(full.paymentDay,5);
  assert.equal(full.electricityPrice,3800);
  assert.equal(full.waterPrice,100000);
  assert.equal(full.waterUnit,'người');
  assert.equal(full.paymentMethod,'Chuyển khoản');
  assert.equal(full.internetPrice,null);
});

test('step validation and firstErrorStep map errors to the exact wizard step',()=>{
  const base=valid();
  assert.deepEqual(validateContractStep(CONTRACT_STEP.SOURCE,base),{});
  assert.ok(validateContractStep(CONTRACT_STEP.SOURCE,{...base,sourceMode:'scan'}).source);
  assert.ok(validateContractStep(CONTRACT_STEP.PARTIES,{...base,tenantName:''}).tenantName);
  assert.equal(validateContractStep(CONTRACT_STEP.PARTIES,{...base,rent:''}).rent,undefined);
  assert.ok(validateContractStep(CONTRACT_STEP.LEASE,{...base,rent:''}).rent);
  assert.ok(validateContractStep(CONTRACT_STEP.LEASE,{...base,electricityPrice:'-5'}).electricityPrice);
  assert.ok(validateContractStep(CONTRACT_STEP.REVIEW,{...base,reviewed:false}).reviewed);
  assert.equal(firstErrorStep({tenantPhone:'err'},{leaseStartDate:'err'}),CONTRACT_STEP.PARTIES);
  assert.equal(firstErrorStep({},{leaseEndDate:'err'}),CONTRACT_STEP.LEASE);
  assert.equal(firstErrorStep({deposit:'err'},{}),CONTRACT_STEP.LEASE);
  assert.equal(firstErrorStep({reviewed:'err'},{}),CONTRACT_STEP.REVIEW);
  assert.equal(firstErrorStep({},{}),null);
});

test('system terms parse into collapsible clauses and round-trip losslessly, while custom text falls back safely',()=>{
  const sections=parseSystemTermsSections(officialTerms);
  assert.equal(sections.length,3);
  assert.equal(sections[0].title,'Trách nhiệm của bên A');
  assert.equal(sections[1].title,'Trách nhiệm của bên B');
  assert.equal(sections[2].title,'Trách nhiệm chung');
  assert.equal(serializeSystemTermsSections(sections),officialTerms);
  assert.equal(parseSystemTermsSections('Đoạn văn bản tự do không đánh số.'),null);
});

test('house rental template keeps its four articles and uses the current contract data in export',()=>{
  const terms='ĐIỀU 1: NỘI DUNG HỢP ĐỒNG\n1.2 Mục đích thuê nhà\nBên thuê nhà thuê nhà để ở.\n\n1.4 Thời hạn cho thuê\nThỏa thuận gia hạn.\n\nĐIỀU 2: QUYỀN VÀ NGHĨA VỤ\nHai bên bàn giao.\n\nĐIỀU 3: CHẤM DỨT HỢP ĐỒNG\nTheo thỏa thuận.\n\nĐIỀU 4: CAM KẾT\nHai bên ký nhận.';
  const roomDetails=newContract({roomId:1,areaSqm:25.5,amenities:['refrigerator','bed']});
  const details={...valid(),template:'HOUSE_RENTAL',terms,rentalScope:roomDetails.rentalScope,occupantCount:'2',
    includedEquipment:roomDetails.includedEquipment,firstPaymentDate:'2026-11-20',paymentCycle:'1 tháng/lần'};
  const sections=parseSystemTermsSections(terms);
  assert.equal(sections.length,4);
  assert.equal(serializeSystemTermsSections(sections),terms);
  assert.deepEqual(validateContract(details),{});
  assert.equal(contractPayload(details).occupantCount,2);
  assert.equal(contractToday(new Date('2026-11-19T18:00:00Z')),'2026-11-20');
  assert.equal(firstErrorStep(validateContract({...details,occupantCount:'0'})),CONTRACT_STEP.PARTIES);
  const text=contractText({details,createdAt:'2026-11-21T00:00:00',propertyAddress:'Hòa Lạc',roomNumber:'P.102',startDate:'2026-11-20',endDate:'2027-11-20'});
  for(const fragment of ['HỢP ĐỒNG THUÊ NHÀ TRỌ','Hà Nội, ngày 21 tháng 11 năm 2026','Hòa Lạc','P.102','2.200.000 đ','25,5 m²','Tủ lạnh riêng, Giường & Đệm','20/11/2026','ĐIỀU 4: CAM KẾT']) {
    assert.ok(text.includes(fragment),fragment);
  }
  assert.ok(!text.includes('5.000.000')&&!text.includes('2018'));
  assert.match(text,/1\.2 Mục đích thuê nhà\nSố người ở: 2\nBên thuê nhà thuê nhà để ở\./);
  assert.match(text,/1\.4 Thời hạn cho thuê\nThời hạn: .*\nThỏa thuận gia hạn\./);
  assert.ok(!text.includes('Chưa ký'));
});

test('blank fields fill only the exact slots and preserve the scan for reference',()=>{
  const raw='Họ tên: .....\nNgày … tháng …. năm ____\nĐịa chỉ:\nTiền thuê: 2.200.000 đ\n(Ký, ghi rõ họ tên) __________';
  const blanks=contractBlanks(raw);
  assert.equal(blanks.length,6);
  const blankValues=Object.fromEntries(['Nguyễn Văn An','03','04','2026','Hòa Lạc'].map((value,index)=>[blanks[index].key,value]));
  const details={...valid(),template:'OWNER_SCAN',sourceMode:'scan',scanFullDocument:true,terms:raw,fullScannedTranscript:raw,blankValues};
  const expected='Họ tên: Nguyễn Văn An\nNgày 03 tháng 04. năm 2026\nĐịa chỉ: Hòa Lạc\nTiền thuê: 2.200.000 đ\n(Ký, ghi rõ họ tên) __________';
  const payload=contractPayload(details);
  assert.equal(payload.terms,expected);
  assert.equal(payload.fullScannedTranscript,raw);
  assert.equal(contractText({details}),expected);
  assert.equal(contractText({details:payload}),expected);
  assert.equal(firstErrorStep(validateContract({...details,terms:''})),CONTRACT_STEP.REVIEW);
});

test('utilities and contract model never invent fees or render null/undefined',()=>{
  const roomType={electricityPrice:3500,waterPrice:null,internetPrice:100000,servicePrice:undefined};
  const utilities=extractRoomUtilities(roomType);
  assert.equal(utilities[0].amount,3500);
  assert.equal(utilities[1].amount,null);
  const emptyDraft=newContract({roomId:1,price:null},{},roomType);
  const model=buildContractModel({details:emptyDraft,roomNumber:'P.101',utilities});
  assert.equal(model.contractStatus,'Chưa ký');
  assert.equal(model.finance.rent,null);
  assert.equal(model.electricity.display,'3.500 đ/kWh');
  assert.equal(model.water.display,null);
  const text=contractText({details:emptyDraft,roomNumber:'P.101',utilities});
  assert.ok(!text.includes('null'));
  assert.ok(!text.includes('undefined'));
  assert.ok(text.includes('Chưa thiết lập'));
  assert.ok(text.includes('3.500 đ/kWh'));
});

test('scan proposal applies only whitelisted nonempty fields, keeps room and requires fresh review',()=>{
  const a=valid(),b=applyScan(a,{fields:{tenantName:'Người thuê mới',tenantPhone:'',landlordIdentity:'001080012345',electricityPrice:'3800',rent:'2800000',startDate:'2026-11-18',roomId:'9',reviewed:'true',status:'OCCUPIED'}},'mau.pdf');
  assert.equal(b.roomId,1);
  assert.equal(b.tenantName,'Người thuê mới');
  assert.equal(b.tenantPhone,a.tenantPhone);
  assert.equal(b.landlordIdentity,'001080012345');
  assert.equal(b.electricityPrice,'3800');
  assert.equal(b.reviewed,false);
  assert.equal(b.template,'OWNER_SCAN');
  assert.equal(b.startDate,undefined);
  assert.equal(b.status,undefined);
});

test('scan files are bounded and exported document matches official Vietnamese contract layout',()=>{
  assert.equal(validateContractFiles([{type:'application/pdf',size:200}]),'');
  assert.ok(validateContractFiles([{type:'text/html',size:200}]));
  assert.ok(validateContractFiles([{type:'application/pdf',size:6*1024*1024}]));
  assert.ok(validateContractFiles(Array(6).fill({type:'image/png',size:100})));
  const text=contractText({
    details:{...valid(),contractDate:'2026-11-18',paymentMethod:'Chuyển khoản',electricityPrice:'3800',waterPrice:'100000',waterUnit:'người'},
    roomNumber:'P.101',
    propertyName:'Nhà trọ A',
    propertyAddress:'Hòa Lạc',
    startDate:'2026-11-18',
    endDate:'2027-11-18',
  });
  assert.ok(text.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'));
  assert.ok(text.includes('Độc lập – Tự do – Hạnh phúc'));
  assert.ok(text.includes('HỢP ĐỒNG THUÊ PHÒNG TRỌ'));
  assert.ok(text.includes('1. Đại diện bên cho thuê phòng trọ (Bên A):'));
  assert.ok(text.includes('2. Bên thuê phòng trọ (Bên B):'));
  assert.ok(text.includes('2.200.000 đ/tháng'));
  assert.ok(text.includes('3.800 đ/kWh tính theo chỉ số công tơ, thanh toán vào cuối các tháng.'));
  assert.ok(text.includes('100.000 đ/người thanh toán vào đầu các tháng.'));
  assert.ok(text.includes('ngày 18 tháng 11 năm 2026'));
  assert.ok(text.includes('TRÁCH NHIỆM CỦA CÁC BÊN'));
  assert.ok(text.includes('TRÁCH NHIỆM CHUNG'));
  assert.ok(text.includes('ĐẠI DIỆN BÊN B'));
  assert.ok(text.includes('ĐẠI DIỆN BÊN A'));
  assert.ok(!text.includes('không thay thế chữ ký'));
});
