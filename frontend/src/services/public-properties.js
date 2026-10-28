export async function fetchPublicProperties(signal){
 const response=await fetch('/api/public/properties',{signal,credentials:'omit',headers:{Accept:'application/json'}});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.success||!Array.isArray(result.data))throw Error('Chưa thể tải danh sách nhà trọ. Vui lòng thử lại sau.');
 return result.data;
}
export const normalizeLocation=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
// A property card must link to a real, displayable room type, never a made-up ID.
export function homeRoomType(property){
 const types=(property.roomTypes||[]).filter(type=>Number.isSafeInteger(type.roomTypeId)&&type.roomTypeId>0&&Number.isFinite(type.price)&&type.price>0&&Number.isFinite(type.area)&&type.area>0);
 const available=types.filter(type=>type.vacantRooms>0);
 return [...(available.length?available:types)].sort((a,b)=>a.price-b.price||a.roomTypeId-b.roomTypeId)[0]||null;
}
export function homeDetailUrl(property,contact=false){
 const type=homeRoomType(property);
 if(!type||!Number.isSafeInteger(property.propertyId)||property.propertyId<1)return null;
 return `/properties/detail?${new URLSearchParams({propertyId:property.propertyId,roomTypeId:type.roomTypeId})}${contact?'#host-contact':''}`;
}
export function filterPublicProperties(properties,{area='all',price='all',type='all',amenity='all'}={}){
 return properties.filter(property=>{
  const location=normalizeLocation(`${property.commune||''} ${property.address||''}`);
  if(area!=='all'&&!location.includes({'tan-xa':'tan xa','thach-hoa':'thach hoa','binh-yen':'binh yen',cnc:'cong nghe cao'}[area]||normalizeLocation(area)))return false;
  const value=property.minPrice;
  if(price!=='all'&&(value==null||price==='under-15'&&value>=1500000||price==='15-25'&&(value<1500000||value>2500000)||price==='25-35'&&(value<2500000||value>3500000)||price==='above-35'&&value<=3500000))return false;
  if(type!=='all'&&property.propertyType!==type)return false;
  if(amenity!=='all'&&![...(property.amenities||[]),...(property.roomTypes||[]).flatMap(t=>t.amenities||[])].includes(amenity))return false;
  return true;
 });
}
