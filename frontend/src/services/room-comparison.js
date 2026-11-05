import {favoritesApi} from './favorites.js';
import {accommodationApi} from './accommodations.js';
import {moveInEstimate} from './accommodation-detail.js';
import {detailMoney} from './detail-prototype.js';
import {ROOM_AMENITIES} from './room-types.js';
import {AMENITIES,RULES} from './property-registration.js';

export const MAX_COMPARE_ROOMS=4;
export function parseComparisonIds(value='') {
  if(!value)return {ids:[],error:''};
  const parts=value.split(',');
  if(parts.length>MAX_COMPARE_ROOMS||parts.some(id=>!(/^[1-9]\d*$/.test(id)&&Number.isSafeInteger(Number(id)))))
    return {ids:[],error:'Chọn tối đa 4 loại phòng hợp lệ để so sánh.'};
  return {ids:[...new Set(parts.map(Number))],error:''};
}
export function favoritesSelectionUrl(ids) {
  return `/favorites${ids.length?`?compare=${ids.join(',')}`:''}`;
}
export async function loadComparison(favoriteId,signal) {
  try {
    const favorite=await favoritesApi.get(favoriteId,signal);
    if(!favorite.available)return {favoriteId,status:'unavailable'};
    const summary=favorite.accommodation;
    const data=await accommodationApi.detail(summary.propertyId,summary.roomTypeId,signal);
    return {favoriteId,status:'ready',data};
  } catch(error) {
    if(error.name==='AbortError')throw error;
    return error.status===404?{favoriteId,status:'unavailable'}:{favoriteId,status:'error',error:error.message};
  }
}
const unknown='Chưa cập nhật';
const validAmount=value=>Number.isFinite(value)&&value>=0;
const money=value=>validAmount(value)?detailMoney(value):unknown;
export function comparisonRows(columns) {
  const ready=columns.filter(column=>column.status==='ready');
  const row=(key,label,value,format=String,better=null)=>{
    const values=columns.map(column=>column.status==='ready'?value(column.data):null);
    const numbers=values.filter(value=>typeof value==='number'&&Number.isFinite(value));
    const best=better&&numbers.length>=2&&new Set(numbers).size>1?(better==='min'?Math.min(...numbers):Math.max(...numbers)):null;
    return {key,label,cells:values.map(value=>({text:value==null?unknown:format(value),best:best!==null&&value===best})),
      different:ready.length<2||new Set(columns.flatMap((column,index)=>column.status==='ready'?[values[index]??unknown]:[])).size>1};
  };
  const amount=(key,label,unit='',better=null)=>row(key,label,data=>validAmount(data[key])?data[key]:null,value=>`${money(value)}${unit}`,better);
  const rows=[
    row('address','Khu vực / địa chỉ',data=>data.address||null),
    amount('price','Giá thuê / tháng','','min'),
    row('areaSqm','Diện tích',data=>data.areaSqm,value=>`${value} m²`,'max'),
    row('capacity','Sức chứa',data=>data.capacity>0?data.capacity:null,value=>`${value} người`),
    amount('deposit','Tiền đặt cọc'),
    row('upfront','Tiền phòng + tiền cọc',data=>moveInEstimate(data.price,data.deposit),money,'min'),
    amount('electricityPrice','Tiền điện',' / kWh'),amount('waterPrice','Tiền nước',' / m³'),
    amount('internetPrice','Internet',' / phòng / tháng'),amount('servicePrice','Phí dịch vụ',' / người / tháng'),
    row('availableRooms','Phòng trống',data=>data.availableRooms,value=>value>0?`Còn ${value} phòng`:'Hết phòng'),
  ];
  const options=new Map([...ROOM_AMENITIES,...AMENITIES]);
  const declared=[...new Set(ready.flatMap(column=>[...(column.data.amenities||[]),...(column.data.propertyAmenities||[])]))];
  const keys=[...new Set(['airConditioner','waterHeater','balcony','loft','privateBathroom','kitchen',...declared])];
  for(const key of keys)rows.push(row(`amenity-${key}`,options.get(key)||key,data=>
    [...(data.amenities||[]),...(data.propertyAmenities||[])].includes(key)?'Đã khai báo':'Chưa ghi nhận'));
  rows.push(row('rules','Quy định sinh hoạt',data=>[...(data.selectedRules||[]).map(key=>RULES.find(([id])=>id===key)?.[1]||key),data.rules].filter(Boolean).join('\n')||null));
  return rows;
}
