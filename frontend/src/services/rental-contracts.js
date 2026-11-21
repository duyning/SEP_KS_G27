import {ApiError,request} from './auth.js';
import {ROOM_AMENITIES} from './room-types.js';

const basePath='/api/host/rental-contracts';
export const HOUSE_RENTAL_TEMPLATE='HOUSE_RENTAL';

export const CONTRACT_LABELS={
  contractDate:'Ngày lập hợp đồng',
  landlordName:'Họ tên bên cho thuê (Bên A)',
  landlordBirthDate:'Ngày sinh bên cho thuê',
  landlordAddress:'Nơi đăng ký HK bên cho thuê',
  landlordIdentity:'CMND / CCCD bên cho thuê',
  landlordIdentityDate:'Ngày cấp CMND / CCCD bên A',
  landlordIdentityPlace:'Nơi cấp CMND / CCCD bên A',
  landlordPhone:'Số điện thoại bên cho thuê',
  tenantName:'Họ tên người thuê (Bên B)',
  tenantBirthDate:'Ngày sinh người thuê',
  tenantAddress:'Nơi đăng ký HK thường trú',
  tenantIdentity:'Số CMND / CCCD người thuê',
  tenantIdentityDate:'Ngày cấp CMND / CCCD bên B',
  tenantIdentityPlace:'Nơi cấp CMND / CCCD bên B',
  tenantPhone:'Số điện thoại người thuê',
  rent:'Tiền thuê mỗi tháng',
  deposit:'Tiền đặt cọc',
  paymentDay:'Ngày thanh toán hằng tháng',
  paymentMethod:'Hình thức thanh toán',
  electricityPrice:'Tiền điện (đ/kWh)',
  waterPrice:'Tiền nước',
  waterUnit:'Đơn vị tính tiền nước',
  internetPrice:'Internet / Wifi',
  servicePrice:'Dịch vụ chung',
  startDate:'Ngày bắt đầu thuê',
  endDate:'Ngày kết thúc thuê',
  terms:'Trách nhiệm các bên & điều khoản',
  rentalScope:'Phần diện tích thuê',
  includedEquipment:'Trang thiết bị kèm theo',
  occupantCount:'Số người ở',
  firstPaymentDate:'Ngày thanh toán lần đầu',
  tenantCurrentAddress:'Chỗ ở hiện tại của bên thuê',
  paymentCycle:'Chu kỳ thanh toán',
};

export const HOUSE_RENTAL_FIELDS=[
  'rentalScope','includedEquipment','occupantCount','firstPaymentDate','tenantCurrentAddress','paymentCycle',
];

export const CONTRACT_STEP={SOURCE:1,PARTIES:2,LEASE:3,REVIEW:4};
export const CONTRACT_STEPS=[
  {id:CONTRACT_STEP.SOURCE,label:'Chọn mẫu'},
  {id:CONTRACT_STEP.PARTIES,label:'Hai bên'},
  {id:CONTRACT_STEP.LEASE,label:'Kỳ thuê & chi phí'},
  {id:CONTRACT_STEP.REVIEW,label:'Điều khoản & duyệt'},
];

export const STEP_CONTRACT_FIELDS={
  [CONTRACT_STEP.SOURCE]:['source'],
  [CONTRACT_STEP.PARTIES]:[
    'landlordName','landlordPhone','landlordBirthDate','landlordAddress',
    'landlordIdentity','landlordIdentityDate','landlordIdentityPlace',
    'tenantName','tenantPhone','tenantBirthDate','tenantIdentity',
    'tenantIdentityDate','tenantIdentityPlace','tenantAddress','tenantCurrentAddress','occupantCount','blankValues',
  ],
  [CONTRACT_STEP.LEASE]:[
    'contractDate','rent','deposit','paymentDay','paymentMethod',
    'electricityPrice','waterPrice','waterUnit','internetPrice','servicePrice',
    'rentalScope','includedEquipment','firstPaymentDate','paymentCycle',
  ],
  [CONTRACT_STEP.REVIEW]:['terms','reviewed'],
};

const OPTIONAL_DATE_FIELDS=[
  'contractDate','landlordBirthDate','landlordIdentityDate','tenantBirthDate','tenantIdentityDate',
];

const OPTIONAL_MONEY_FIELDS=[
  'electricityPrice','waterPrice','internetPrice','servicePrice',
];

const toDigitString=value=>{
  if(value===null||value===undefined||value==='')return '';
  const num=Number(value);
  if(!Number.isFinite(num)||num<0)return '';
  return String(Math.round(num));
};

const isValidIsoDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
  const [y,m,d]=value.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
};

export function contractToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const {year,month,day}=Object.fromEntries(parts.map(({type,value})=>[type,value]));
  return `${year}-${month}-${day}`;
}

export const newContract=(room,user={},roomType=null)=>({
  roomId:room.roomId,
  template:'BASIC',
  sourceMode:'template',
  contractDate:'',
  landlordName:user?.fullName||'',
  landlordPhone:user?.phoneNumber||'',
  landlordBirthDate:'',
  landlordAddress:'',
  landlordIdentity:'',
  landlordIdentityDate:'',
  landlordIdentityPlace:'',
  tenantName:'',
  tenantPhone:'',
  tenantBirthDate:'',
  tenantIdentity:'',
  tenantIdentityDate:'',
  tenantIdentityPlace:'',
  tenantAddress:'',
  rent:room.price==null?'':String(room.price),
  deposit:room.deposit!=null?String(room.deposit):room.price!=null?String(room.price):'0',
  paymentDay:'5',
  paymentMethod:'',
  electricityPrice:toDigitString(roomType?.electricityPrice),
  waterPrice:toDigitString(roomType?.waterPrice),
  waterUnit:'người',
  internetPrice:toDigitString(roomType?.internetPrice),
  servicePrice:toDigitString(roomType?.servicePrice),
  terms:'',
  sourceName:'',
  fullScannedTranscript:'',
  scanFullDocument:false,
  blankValues:{},
  rentalScope:(room.areaSqm??roomType?.areaSqm)==null?'':`${new Intl.NumberFormat('vi-VN').format(room.areaSqm??roomType.areaSqm)} m²`,
  includedEquipment:(room.amenities??roomType?.amenities??[]).map(key=>ROOM_AMENITIES.find(([value])=>value===key)?.[1]||key).join(', '),
  occupantCount:'',
  firstPaymentDate:'',
  tenantCurrentAddress:'',
  paymentCycle:'',
  reviewed:false,
});

export function contractBlanks(terms){
  const pattern=/\.(?:[ \t]*\.){2,}|[…‥]+|[_＿]{2,}/g;
  const fieldLabel=/(?:tên|ông\s*[\/]\s*bà|cccd|cmnd|điện thoại|địa chỉ|thường trú|nơi cấp|ngày cấp|ngày sinh|chỗ ở|tiền thuê|tiền cọc|đặt cọc|diện tích|thiết bị|số người|thanh toán)[^:\n]{0,50}:[ \t]*$/iu;
  const occurrences=new Map();
  return (terms||'').split('\n').flatMap((line,index)=>{
    const matches=Array.from(line.matchAll(pattern));
    // Keep a field whose printed underline was omitted by OCR.
    if(fieldLabel.test(line)&&!matches.length)matches.push(Object.assign([''],{index:line.trimEnd().length}));
    const occurrence=(occurrences.get(line)||0)+1;
    if(matches.length)occurrences.set(line,occurrence);
    return matches.map(([token],position)=>{
      const start=matches[position].index;
      return {key:JSON.stringify([line,occurrence,position]),line:index,start,token,
        context:line,position:position+1,total:matches.length};
    });
  });
}

export function fillContractBlanks(terms,values){
  if(!values||!Object.keys(values).length)return terms||'';
  const lines=(terms||'').split('\n');
  for(const blank of contractBlanks(terms).reverse()){
    const value=values[blank.key]?.trim();
    if(!value)continue;
    const line=lines[blank.line];
    lines[blank.line]=line.slice(0,blank.start)+(blank.token?'':' ')+value+line.slice(blank.start+blank.token.length);
  }
  return lines.join('\n');
}

export function validateContract(draft){
  const errors={};
  const scanSelected=draft.sourceMode==='scan';
  const scanned=draft.template==='OWNER_SCAN';
  if((draft.sourceMode&&scanSelected!==scanned)||(!scanned&&!draft.terms?.trim())){
    errors.source=draft.sourceMode==='scan'?'Áp dụng bản quét đã đối chiếu để tiếp tục.':'Chọn một mẫu hợp đồng để tiếp tục.';
  }
  for(const field of ['landlordName','tenantName']){
    if(!draft[field]?.trim()||draft[field].trim().length>150){
      errors[field]='Nhập họ tên, tối đa 150 ký tự.';
    }
  }
  for(const field of ['landlordPhone','tenantPhone']){
    if(!/^[+0-9 ()-]{8,20}$/.test(draft[field]?.trim()||'')){
      errors[field]='Nhập số điện thoại hợp lệ, từ 8 đến 20 ký tự.';
    }
  }
  if((draft.landlordIdentity||'').length>30)errors.landlordIdentity='Tối đa 30 ký tự.';
  if((draft.tenantIdentity||'').length>30)errors.tenantIdentity='Tối đa 30 ký tự.';
  if((draft.landlordAddress||'').length>300)errors.landlordAddress='Tối đa 300 ký tự.';
  if((draft.tenantAddress||'').length>300)errors.tenantAddress='Tối đa 300 ký tự.';
  if((draft.landlordIdentityPlace||'').length>150)errors.landlordIdentityPlace='Tối đa 150 ký tự.';
  if((draft.tenantIdentityPlace||'').length>150)errors.tenantIdentityPlace='Tối đa 150 ký tự.';
  if((draft.paymentMethod||'').length>200)errors.paymentMethod='Tối đa 200 ký tự.';

  const houseTemplate=draft.template===HOUSE_RENTAL_TEMPLATE;
  for(const field of houseTemplate?[]:OPTIONAL_DATE_FIELDS){
    const raw=(draft[field]||'').trim();
    if(raw&&!isValidIsoDate(raw)){
      errors[field]='Chọn ngày hợp lệ (YYYY-MM-DD).';
    }
  }

  for(const field of ['rent','deposit']){
    if(!/^\d{1,10}$/.test(String(draft[field]))||Number(draft[field])<(field==='rent'?1:0)){
      errors[field]='Nhập số tiền VND nguyên hợp lệ, tối đa 9.999.999.999 đ.';
    }
  }
  for(const field of OPTIONAL_MONEY_FIELDS){
    const raw=draft[field]===null||draft[field]===undefined?'':String(draft[field]).trim();
    if(raw&&!/^\d{1,9}$/.test(raw)){
      errors[field]='Nhập số tiền VND nguyên hợp lệ, tối đa 999.999.999 đ.';
    }
  }
  if(!/^([1-9]|1\d|2[0-8])$/.test(String(draft.paymentDay))){
    errors.paymentDay='Chọn ngày từ 1 đến 28.';
  }
  const terms=fillContractBlanks(draft.terms,draft.blankValues);
  if(!terms.trim()||terms.length>30000){
    errors.terms='Nhập điều khoản, tối đa 30.000 ký tự.';
    if(draft.blankValues&&Object.keys(draft.blankValues).length&&terms.length>30000)
      errors.blankValues='Rút gọn nội dung điền để hợp đồng không vượt quá 30.000 ký tự.';
  }
  if(!draft.reviewed){
    errors.reviewed='Cần đối chiếu thông tin và xác nhận đã đọc bản xem trước.';
  }
  if(draft.template===HOUSE_RENTAL_TEMPLATE){
    for(const [key,limit] of [['rentalScope',300],['includedEquipment',2000],['tenantCurrentAddress',300],['paymentCycle',100]]){
      if((draft[key]||'').length>limit)errors[key]=`Tối đa ${limit.toLocaleString('vi-VN')} ký tự.`;
    }
    if(draft.occupantCount&&!/^[1-9]\d{0,8}$/.test(String(draft.occupantCount)))errors.occupantCount='Nhập số người ở lớn hơn 0.';
    if(draft.firstPaymentDate&&!isValidIsoDate(draft.firstPaymentDate))errors.firstPaymentDate='Chọn ngày thanh toán hợp lệ.';
  }
  return errors;
}

export function validateContractStep(step,draft){
  const all=validateContract(draft);
  const allowed=new Set(STEP_CONTRACT_FIELDS[step]||[]);
  return Object.fromEntries(Object.entries(all).filter(([key])=>allowed.has(key)));
}

export function firstErrorStep(contractErrors={},leaseErrors={}){
  return CONTRACT_STEPS.find(({id})=>STEP_CONTRACT_FIELDS[id].some(key=>contractErrors[key])
    ||(id===CONTRACT_STEP.LEASE&&(leaseErrors.leaseStartDate||leaseErrors.leaseEndDate)))?.id??null;
}

const optText=value=>{
  const trimmed=(value||'').trim();
  return trimmed||null;
};

const optNumber=value=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  return Number(value);
};

export function contractPayload(draft){
  const terms=fillContractBlanks(draft.terms,draft.blankValues);
  return {
    roomId:draft.roomId,
    template:draft.template,
    landlordName:(draft.landlordName||'').trim(),
    landlordPhone:(draft.landlordPhone||'').trim(),
    tenantName:(draft.tenantName||'').trim(),
    tenantPhone:(draft.tenantPhone||'').trim(),
    tenantIdentity:(draft.tenantIdentity||'').trim(),
    tenantAddress:(draft.tenantAddress||'').trim(),
    rent:Number(draft.rent),
    deposit:Number(draft.deposit),
    paymentDay:Number(draft.paymentDay),
    terms:draft.template==='OWNER_SCAN'?terms:terms.trim(),
    sourceName:(draft.sourceName||'').trim(),
    reviewed:Boolean(draft.reviewed),
    contractDate:draft.template===HOUSE_RENTAL_TEMPLATE?contractToday():optText(draft.contractDate),
    landlordBirthDate:optText(draft.landlordBirthDate),
    landlordAddress:optText(draft.landlordAddress),
    landlordIdentity:optText(draft.landlordIdentity),
    landlordIdentityDate:optText(draft.landlordIdentityDate),
    landlordIdentityPlace:optText(draft.landlordIdentityPlace),
    tenantBirthDate:optText(draft.tenantBirthDate),
    tenantIdentityDate:optText(draft.tenantIdentityDate),
    tenantIdentityPlace:optText(draft.tenantIdentityPlace),
    paymentMethod:optText(draft.paymentMethod),
    electricityPrice:optNumber(draft.electricityPrice),
    waterPrice:optNumber(draft.waterPrice),
    waterUnit:optText(draft.waterUnit),
    internetPrice:optNumber(draft.internetPrice),
    servicePrice:optNumber(draft.servicePrice),
    fullScannedTranscript:draft.template==='OWNER_SCAN'?draft.fullScannedTranscript||null:null,
    scanFullDocument:draft.template==='OWNER_SCAN'&&Boolean(draft.scanFullDocument),
    ...(draft.template===HOUSE_RENTAL_TEMPLATE&&{
      rentalScope:optText(draft.rentalScope),
      includedEquipment:optText(draft.includedEquipment),
      occupantCount:optNumber(draft.occupantCount),
      firstPaymentDate:optText(draft.firstPaymentDate),
      tenantCurrentAddress:optText(draft.tenantCurrentAddress),
      paymentCycle:optText(draft.paymentCycle),
    }),
  };
}

export function applyScan(draft,result,sourceName){
  const allowed=Object.keys(CONTRACT_LABELS).filter(key=>!['startDate','endDate',...HOUSE_RENTAL_FIELDS].includes(key));
  return {
    ...draft,
    ...Object.fromEntries(
      allowed
        .filter(key=>typeof result.fields[key]==='string'&&result.fields[key].trim())
        .map(key=>[key,result.fields[key]])
    ),
    template:'OWNER_SCAN',
    sourceMode:'scan',
    sourceName:(sourceName||'').slice(0,255),
    reviewed:false,
  };
}

export function validateContractFiles(files){
  if(!files.length||files.length>5)return 'Chọn từ 1 đến 5 ảnh JPG/PNG hoặc PDF, theo thứ tự trang.';
  if(files.some(f=>!['image/jpeg','image/png','application/pdf'].includes(f.type)||!f.size||f.size>5*1024*1024)){
    return 'Chỉ hỗ trợ JPG, PNG hoặc PDF; mỗi tệp tối đa 5 MB.';
  }
  if(files.reduce((sum,f)=>sum+f.size,0)>10*1024*1024)return 'Tổng tài liệu tối đa 10 MB.';
  return '';
}

export function extractRoomUtilities(roomType){
  const toAmount=value=>(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))?null:Number(value);
  return [
    {key:'electricityPrice',label:'Tiền điện',amount:toAmount(roomType?.electricityPrice),unit:'kWh',basis:'Tính theo chỉ số công tơ, thanh toán vào cuối các tháng'},
    {key:'waterPrice',label:'Tiền nước',amount:toAmount(roomType?.waterPrice),unit:'người',basis:'Thanh toán vào đầu các tháng'},
    {key:'internetPrice',label:'Internet / Wifi',amount:toAmount(roomType?.internetPrice),unit:'phòng / tháng',basis:'Cố định theo phòng'},
    {key:'servicePrice',label:'Dịch vụ chung',amount:toAmount(roomType?.servicePrice),unit:'người / tháng',basis:'Tính theo số người ở'},
  ];
}

export function parseSystemTermsSections(terms){
  if(typeof terms!=='string'||!terms.trim())return null;
  const blocks=terms.trim().replace(/\r\n/g,'\n').split(/\n{2,}(?=(?:\d+\.\s+|ĐIỀU\s+\d+:\s+))/i);
  if(blocks.length<2)return null;
  const sections=[];
  for(const block of blocks){
    const lines=block.split('\n');
    const heading=lines[0]?.trim()||'';
    const match=heading.match(/^(?:ĐIỀU\s+)?(\d+)[.:]\s+(.+)$/i);
    if(!match)return null;
    sections.push({
      index:match[1],
      title:match[2].trim(),
      heading,
      body:lines.slice(1).join('\n'),
    });
  }
  return sections;
}

export function serializeSystemTermsSections(sections){
  return sections.map(section=>{
    const body=(section.body||'').replace(/^\n+/,'');
    return body?`${section.heading}\n${body}`:section.heading;
  }).join('\n\n');
}

export function formatContractMoney(value){
  if(value===null||value===undefined||value==='')return null;
  const raw=String(value).trim();
  if(!/^\d+$/.test(raw))return null;
  return `${new Intl.NumberFormat('vi-VN').format(Number(raw))} đ`;
}

export function formatContractDate(value){
  return isValidIsoDate(value)?value.split('-').reverse().join('/'):null;
}

export function formatVietnameseDateLong(value){
  if(!isValidIsoDate(value))return null;
  const [year,month,day]=value.split('-');
  return `ngày ${day} tháng ${month} năm ${year}`;
}

function resolveUtilities(details,utilities){
  const toAmount=value=>(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))?null:Number(value);
  const byKey=new Map((Array.isArray(utilities)?utilities:[]).map(u=>[u.key,u]));
  const pick=key=>Object.prototype.hasOwnProperty.call(details,key)?toAmount(details[key]):(byKey.get(key)?.amount??null);
  const waterUnit=(typeof details.waterUnit==='string'&&details.waterUnit.trim())?details.waterUnit.trim():(byKey.get('waterPrice')?.unit||'người');

  const items=[
    {
      key:'electricityPrice',
      label:'Tiền điện',
      amount:pick('electricityPrice'),
      unit:'kWh',
      basis:'tính theo chỉ số công tơ, thanh toán vào cuối các tháng',
    },
    {
      key:'waterPrice',
      label:'Tiền nước',
      amount:pick('waterPrice'),
      unit:waterUnit,
      basis:waterUnit==='m³'?'tính theo chỉ số đồng hồ, thanh toán vào cuối các tháng':'thanh toán vào đầu các tháng',
    },
    {
      key:'internetPrice',
      label:'Internet / Wifi',
      amount:pick('internetPrice'),
      unit:'phòng / tháng',
      basis:'cố định theo phòng',
    },
    {
      key:'servicePrice',
      label:'Dịch vụ chung',
      amount:pick('servicePrice'),
      unit:'người / tháng',
      basis:'tính theo số người ở',
    },
  ];
  return items.map(item=>({
    ...item,
    display:item.amount==null?null:`${new Intl.NumberFormat('vi-VN').format(item.amount)} đ/${item.unit}`,
  }));
}

export function buildContractModel({
  details={},
  propertyName='',
  propertyAddress='',
  roomNumber='',
  startDate='',
  endDate='',
  createdAt='',
  contractCode=null,
  utilities=null,
  ownerSignature=null,
  tenantSignature=null,
}){
  const clean=value=>(typeof value==='string'&&value.trim())?value.trim():null;
  const rentText=formatContractMoney(details.rent);
  const depositText=formatContractMoney(details.deposit);
  const paymentDayValid=/^([1-9]|1\d|2[0-8])$/.test(String(details.paymentDay??''));
  const normalizedUtilities=resolveUtilities(details,utilities);
  const electricity=normalizedUtilities.find(u=>u.key==='electricityPrice');
  const water=normalizedUtilities.find(u=>u.key==='waterPrice');
  const extraUtilities=normalizedUtilities.filter(u=>['internetPrice','servicePrice'].includes(u.key));

  const cleanRoom=clean(roomNumber);
  const cleanProperty=clean(propertyName);
  const cleanAddress=clean(propertyAddress);
  const rentalLocation=[
    cleanRoom?`Phòng ${cleanRoom}`:null,
    cleanProperty,
    cleanAddress,
  ].filter(Boolean).join(' – ')||null;

  const isHouse=details.template===HOUSE_RENTAL_TEMPLATE;
  const contractDate=isHouse
    ?createdAt?(details.contractDate||createdAt.slice(0,10)):contractToday()
    :details.contractDate;
  const filledTerms=fillContractBlanks(details.terms,details.blankValues);
  const termsClean=clean(filledTerms);
  const parsedSections=(details.template||'BASIC')!=='OWNER_SCAN'?parseSystemTermsSections(termsClean||''):null;
  const isOfficialThreePart=Boolean(
    parsedSections
    &&parsedSections.length===3
    &&/trách nhiệm.*bên a/i.test(parsedSections[0].title)
    &&/trách nhiệm.*bên b/i.test(parsedSections[1].title)
    &&/trách nhiệm chung/i.test(parsedSections[2].title)
  );

  return {
    nationalHeader:'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    nationalMotto:'Độc lập – Tự do – Hạnh phúc',
    title:isHouse?'HỢP ĐỒNG THUÊ NHÀ TRỌ':'HỢP ĐỒNG THUÊ PHÒNG TRỌ',
    contractCode:contractCode?String(contractCode):null,
    contractStatus:'Chưa ký',
    contractDate:formatContractDate(contractDate),
    contractDateLong:formatVietnameseDateLong(contractDate),
    propertyName:cleanProperty,
    propertyAddress:cleanAddress,
    roomNumber:cleanRoom,
    rentalLocation,
    landlord:{
      name:clean(details.landlordName),
      birthDate:formatContractDate(details.landlordBirthDate),
      address:clean(details.landlordAddress),
      identity:clean(details.landlordIdentity),
      identityDate:formatContractDate(details.landlordIdentityDate),
      identityPlace:clean(details.landlordIdentityPlace),
      phone:clean(details.landlordPhone),
    },
    tenant:{
      name:clean(details.tenantName),
      birthDate:formatContractDate(details.tenantBirthDate),
      address:clean(details.tenantAddress),
      identity:clean(details.tenantIdentity),
      identityDate:formatContractDate(details.tenantIdentityDate),
      identityPlace:clean(details.tenantIdentityPlace),
      phone:clean(details.tenantPhone),
    },
    lease:{
      startDate:formatContractDate(startDate),
      endDate:formatContractDate(endDate),
      startDateLong:formatVietnameseDateLong(startDate),
      endDateLong:formatVietnameseDateLong(endDate),
    },
    finance:{
      rent:rentText,
      deposit:depositText,
      paymentDay:paymentDayValid?String(details.paymentDay):null,
      paymentMethod:clean(details.paymentMethod),
    },
    electricity,
    water,
    extraUtilities,
    utilities:normalizedUtilities,
    terms:details.template==='OWNER_SCAN'?filledTerms:termsClean,
    officialSections:isOfficialThreePart?{
      partyA:parsedSections[0],
      partyB:parsedSections[1],
      general:parsedSections[2],
    }:null,
    template:details.template||'BASIC',
    houseRental:{
      rentalScope:clean(details.rentalScope),
      equipment:clean(details.includedEquipment),
      occupants:details.occupantCount?String(details.occupantCount):null,
      firstPayment:formatContractDate(details.firstPaymentDate),
      currentAddress:clean(details.tenantCurrentAddress),
      paymentCycle:clean(details.paymentCycle),
    },
    sourceName:clean(details.sourceName),
    scanFullDocument:details.template==='OWNER_SCAN'&&Boolean(details.scanFullDocument),
    ownerSignature,
    tenantSignature,
  };
}

export function houseRentalSections(model){
  const placeholder='……………………';
  const partyFields=party=>[
    ['Ông/bà',party.name],['CMND/CCCD số',party.identity],['Nơi đăng ký thường trú',party.address],
    ['Điện thoại liên hệ',party.phone],
  ];
  const tenantFields=partyFields(model.tenant);
  tenantFields.splice(3,0,['Chỗ ở hiện tại',model.houseRental.currentAddress]);
  const groups=[
    {title:'1.1 Nhà cho thuê',fields:[
      ['Địa chỉ và phòng cho thuê',model.rentalLocation],
      ['Phần diện tích thuê',model.houseRental.rentalScope||'Chưa có dữ liệu'],
      ['Trang thiết bị kèm theo',model.houseRental.equipment||'Không có thiết bị ghi nhận'],
    ]},
    {title:'1.2 Mục đích thuê nhà',fields:[['Số người ở',model.houseRental.occupants]]},
    {title:'1.3 Giá cho thuê',fields:[
      ['Giá thuê',model.finance.rent?model.finance.rent+' / tháng':null],
      ['Tiền đặt cọc',model.finance.deposit],
      ...model.utilities.filter(item=>item.display).map(item=>[item.label,item.display]),
    ]},
    {title:'1.4 Thời hạn cho thuê',fields:[
      ['Thời hạn',model.lease.startDate&&model.lease.endDate?`Từ ${model.lease.startDate} đến ${model.lease.endDate}`:null],
    ]},
    {title:'1.5 Hình thức thanh toán',fields:[
      ['Chu kỳ thanh toán',model.houseRental.paymentCycle],
      ['Ngày thanh toán định kỳ',model.finance.paymentDay],
      ['Ngày thanh toán lần đầu',model.houseRental.firstPayment],
      ['Hình thức thanh toán',model.finance.paymentMethod],
    ]},
  ];
  const terms=parseSystemTermsSections(model.terms||'');
  const articles=terms?terms.map(sec=>{
    if(sec.index!=='1')return {title:sec.heading,body:sec.body};
    const [body,...subsections]=sec.body.split(/^1\.([1-5])\s+[^\n]+\n?/m);
    const groupBodies=new Map();
    for(let i=0;i<subsections.length;i+=2)groupBodies.set(subsections[i],subsections[i+1].trim());
    return {title:sec.heading,body:body.trim(),groups:groups.map((group,index)=>({...group,body:groupBodies.get(String(index+1))}))};
  }):[
    {title:'ĐIỀU 1: NỘI DUNG HỢP ĐỒNG',groups},
    ...(model.terms?[{title:'Điều khoản thỏa thuận',body:model.terms}]:[]),
  ];
  const withPlaceholders=fields=>(fields||[]).map(([label,value])=>[label,value||placeholder]);
  return [
    {title:'I. BÊN CHO THUÊ NHÀ (BÊN A)',fields:partyFields(model.landlord)},
    {title:'II. BÊN THUÊ NHÀ (BÊN B)',fields:tenantFields},
    ...articles,
  ].map(section=>({...section,fields:withPlaceholders(section.fields),
    groups:(section.groups||[]).map(group=>({...group,fields:withPlaceholders(group.fields)})),
  }));
}

export function contractText(params){
  const m=buildContractModel(params);
  if(m.scanFullDocument)return m.terms;
  if(m.template===HOUSE_RENTAL_TEMPLATE){
    const fieldLines=fields=>fields.map(([label,value])=>`${label}: ${value}`);
    return [
      m.nationalHeader,m.nationalMotto,
      `Hà Nội, ${m.contractDateLong||'ngày …… tháng …… năm ……'}`,
      '',m.title,...(m.contractCode?[`Mã hợp đồng: ${m.contractCode}`]:[]),'','Chúng tôi gồm:',
      ...houseRentalSections(m).flatMap(section=>[
        '',section.title,...fieldLines(section.fields),
        ...section.groups.flatMap(group=>[group.title,...fieldLines(group.fields),...(group.body?[group.body]:[])]),
        ...(section.body?[section.body]:[]),
      ]),
      '','BÊN THUÊ NHÀ                              BÊN CHO THUÊ NHÀ',
      '(Ký, ghi rõ họ tên)                       (Ký, ghi rõ họ tên)',
    ].join('\n');
  }
  const missing='Chưa điền';
  const paymentMethodLine=m.finance.paymentMethod
    ?(m.finance.paymentDay?`${m.finance.paymentMethod} (hạn trả: ngày ${m.finance.paymentDay} hằng tháng)`:m.finance.paymentMethod)
    :(m.finance.paymentDay?`Thanh toán vào ngày ${m.finance.paymentDay} hằng tháng`:missing);

  const lines=[
    m.nationalHeader,
    m.nationalMotto,
    '------------------',
    '',
    m.title,
    ...(m.contractCode?[`Mã hợp đồng: ${m.contractCode}`]:[]),
    `Trạng thái hợp đồng: ${m.contractStatus}`,
    '',
    `Hôm nay ${m.contractDateLong||'ngày …… tháng …… năm ……'}; tại địa chỉ: ${m.propertyAddress||m.propertyName||'Chưa cập nhật'}`,
    'Chúng tôi gồm:',
    '',
    '1. Đại diện bên cho thuê phòng trọ (Bên A):',
    `Ông/bà: ${m.landlord.name||missing}   |   Sinh ngày: ${m.landlord.birthDate||'Chưa cung cấp'}`,
    `Nơi đăng ký HK: ${m.landlord.address||'Chưa cung cấp'}`,
    `CMND/CCCD số: ${m.landlord.identity||'Chưa cung cấp'}   cấp ngày: ${m.landlord.identityDate||'Chưa cung cấp'}   tại: ${m.landlord.identityPlace||'Chưa cung cấp'}`,
    `Số điện thoại: ${m.landlord.phone||missing}`,
    '',
    '2. Bên thuê phòng trọ (Bên B):',
    `Ông/bà: ${m.tenant.name||missing}   |   Sinh ngày: ${m.tenant.birthDate||'Chưa cung cấp'}`,
    `Nơi đăng ký HK thường trú: ${m.tenant.address||'Chưa cung cấp'}`,
    `Số CMND/CCCD: ${m.tenant.identity||'Chưa cung cấp'}   cấp ngày: ${m.tenant.identityDate||'Chưa cung cấp'}   tại: ${m.tenant.identityPlace||'Chưa cung cấp'}`,
    `Số điện thoại: ${m.tenant.phone||missing}`,
    '',
    'Sau khi bàn bạc trên tinh thần dân chủ, hai bên cùng có lợi, cùng thống nhất như sau:',
    `Bên A đồng ý cho bên B thuê 01 phòng ở tại địa chỉ: ${m.rentalLocation||'Chưa cập nhật'}`,
    `Giá thuê: ${m.finance.rent?`${m.finance.rent}/tháng`:missing}`,
    `Hình thức thanh toán: ${paymentMethodLine}`,
    `Tiền điện: ${m.electricity?.display?`${m.electricity.display} ${m.electricity.basis}.`:'Chưa thiết lập'}`,
    `Tiền nước: ${m.water?.display?`${m.water.display} ${m.water.basis}.`:'Chưa thiết lập'}`,
  ];

  for(const extra of m.extraUtilities){
    if(extra.display){
      lines.push(`${extra.label}: ${extra.display} (${extra.basis}).`);
    }
  }

  lines.push(
    `Tiền đặt cọc: ${m.finance.deposit||missing}`,
    `Hợp đồng có giá trị kể từ ${m.lease.startDateLong||'ngày …… tháng …… năm ……'} đến ${m.lease.endDateLong||'ngày …… tháng …… năm ……'}.`,
    '',
  );

  if(m.officialSections){
    lines.push(
      'TRÁCH NHIỆM CỦA CÁC BÊN',
      `* ${m.officialSections.partyA.title}:`,
      m.officialSections.partyA.body.trim(),
      `* ${m.officialSections.partyB.title}:`,
      m.officialSections.partyB.body.trim(),
      '',
      'TRÁCH NHIỆM CHUNG',
      m.officialSections.general.body.trim(),
    );
  }else{
    lines.push(
      'TRÁCH NHIỆM CỦA CÁC BÊN VÀ ĐIỀU KHOẢN THỎA THUẬN',
      m.terms||'Chưa nhập điều khoản.',
    );
  }

  lines.push(
    '',
    'ĐẠI DIỆN BÊN B                                  ĐẠI DIỆN BÊN A',
    '(Ký, ghi rõ họ tên)                          (Ký, ghi rõ họ tên)',
  );
  return lines.join('\n');
}

const signingBasePath = '/api/rental-contract-signing';

export const rentalContractsApi={
  signOwner(id, body) {
    return request(`/${id}/signature`, { basePath, method: 'POST', body });
  },
  createSigningLink(id) {
    return request(`/${id}/signing-link`, { basePath, method: 'POST' });
  },
  openSigningLink(token, signal) {
    return request('/open', { basePath: signingBasePath, method: 'POST', body: { token }, signal });
  },
  signTenant(token, signature) {
    return request('/signature', { basePath: signingBasePath, method: 'POST', body: { token, signature } });
  },
  async templates(signal){
    const value=await request('/templates',{basePath,signal});
    if(!value||!Array.isArray(value.templates)||typeof value.scanAvailable!=='boolean'||!value.templates.every(t=>typeof t.id==='string'&&typeof t.name==='string'&&typeof t.terms==='string')){
      throw new ApiError('Không tải được mẫu hợp đồng.',502);
    }
    return value;
  },
  async list(roomId,signal){
    const value=await request(`/rooms/${roomId}`,{basePath,signal});
    if(!Array.isArray(value)||!value.every(v=>Number.isInteger(v.id)&&v.details&&['ACTIVE','CLOSED'].includes(v.status)&&typeof v.details.terms==='string')){
      throw new ApiError('Chưa tải được hợp đồng. Vui lòng thử lại.',502);
    }
    return value;
  },
  async inspectScan(roomId,files,signal){
    const body=new FormData();
    body.append('roomId',roomId);
    body.append('consent','true');
    files.forEach(file=>body.append('files',file));
    const value=await request('/scan/inspect',{basePath,method:'POST',body,signal});
    if(!value||!Array.isArray(value.pages)||!value.pages.length||typeof value.totalPages!=='number'){
      throw new ApiError('Không kiểm tra được danh sách trang từ tài liệu đã chọn.',502);
    }
    return value;
  },
  async scanPage(roomId,meta,file,signal){
    const body=new FormData();
    body.append('roomId',roomId);
    body.append('consent','true');
    body.append('pageId',meta.pageId);
    body.append('pageNumber',String(meta.pageNumber));
    body.append('totalPages',String(meta.totalPages));
    body.append('fileIndex',String(meta.fileIndex??0));
    body.append('sourcePageIndex',String(meta.sourcePageIndex??1));
    body.append('file',file);
    const value=await request('/scan/page',{basePath,method:'POST',body,signal});
    if(!value||typeof value.pageId!=='string'||typeof value.pageStatus!=='string'||typeof value.text!=='string'){
      throw new ApiError('Kết quả đọc trang không hợp lệ.',502);
    }
    return value;
  },
  async scan(roomId,files,signal){
    const body=new FormData();
    body.append('roomId',roomId);
    body.append('consent','true');
    files.forEach(file=>body.append('files',file));
    const value=await request('/scan',{basePath,method:'POST',body,signal});
    if(!value||!Array.isArray(value.pages)||!value.pages.length){
      throw new ApiError('Chưa đọc được thông tin hợp lệ từ tài liệu.',502);
    }
    return value;
  },
};
