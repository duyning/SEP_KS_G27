export const searchLocations=[['all','📍 Tất cả khu vực'],['tan-xa','Tân Xã (Gần ĐH FPT)'],['thach-hoa','Thạch Hòa (Gần chợ & bus)'],['binh-yen','Bình Yên (Yên tĩnh)'],['cnc','Gần Khu Công nghệ cao']];
export const searchPrices=[['all','💰 Mọi mức giá'],['under-15','Dưới 1.5 triệu / tháng'],['15-25','1.5 - 2.5 triệu / tháng'],['25-35','2.5 - 3.5 triệu / tháng'],['above-35','Trên 3.5 triệu / tháng']];
export const searchTypes=[['all','🏠 Tất cả loại phòng'],['khep-kin','Phòng khép kín'],['gac-lung','Có gác lửng'],['chung-cu-mini','Chung cư mini (Studio)']];
export const searchAmenities=[['airConditioner','Điều hòa Inverter'],['waterHeater','Bình nóng lạnh'],['washingMachine','Máy giặt (Riêng/Chung)'],['balcony','Ban công thoáng mát'],['elevator','Thang máy thẻ từ'],['refrigerator','Tủ lạnh có sẵn'],['fingerprint','Khóa cửa vân tay / Thẻ từ'],['camera','Camera an ninh 24/7'],['flexibleHours','Giờ giấc tự do 24/24'],['fireSafety','PCCC đạt chuẩn nghiệm thu'],['separateOwner','Không chung chủ'],['kitchen','Kệ bếp nấu ăn riêng']];
export const searchSorts=[['recommended','✨ Phù hợp nhất'],['newest','Mới nhất'],['price-asc','💵 Giá: Thấp đến cao'],['price-desc','💎 Giá: Cao đến thấp'],['rating-desc','⭐ Đánh giá cao nhất'],['area-desc','📐 Diện tích lớn nhất']];
const option=(values,value,fallback)=>values.some(([key])=>key===value)?value:fallback;
export function readSearchFilters(params){
 const raw=Number(params.get('page')||1);
 return {page:Number.isSafeInteger(raw)&&raw>0?raw:1,q:(params.get('q')||params.get('keyword')||'').slice(0,200),location:option(searchLocations,params.get('location'),'all'),price:option(searchPrices,params.get('price'),'all'),type:option(searchTypes,params.get('type'),'all'),sort:option(searchSorts,params.get('sort'),'recommended'),amenities:[...new Set((params.get('amenities')||'').split(',').filter(key=>searchAmenities.some(([id])=>key===id)))],availableOnly:params.get('availableOnly')==='true'};
}
export function updateSearchFilters(params,updates){
 const next=new URLSearchParams(params);next.delete('keyword');
 if(!next.has('q')&&params.has('keyword'))next.set('q',params.get('keyword'));
 for(const [key,value] of Object.entries(updates)){
  const text=Array.isArray(value)?value.join(','):String(value??'');
  if(!text||text==='all'||text==='false'||key==='page'&&text==='1')next.delete(key);else next.set(key,text);
 }
 if(Object.keys(updates).some(key=>key!=='page'))next.delete('page');
 return next;
}
