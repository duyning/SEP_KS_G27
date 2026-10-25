import {AMENITIES,RULES} from './property-registration.js';

export function supplementGroups(detail) {
 const f=detail.submission||{}, s=detail.summary||{}, docs=detail.documents||[], photos=detail.photos||[];
 const labels=(values,options)=>(values||[]).map(key=>options.find(([id])=>id===key)?.[1]||key).join(', ');
 return [
  {title:'Thông tin cơ bản',items:[['name','Tên nhà trọ',s.name],['propertyType','Loại hình nhà trọ',f.propertyType],['description','Mô tả nhà trọ',f.description],['contact','Thông tin liên hệ quản lý tiếp khách',[f.managerName,f.contactPhone,f.zaloPhone].filter(Boolean).join(' · ')]]},
  {title:'Vị trí nhà trọ & Bản đồ',items:[['address','Địa chỉ chi tiết (Số nhà, ngõ, xóm, thôn)',f.addressDetail||s.address],['commune','Xã / Khu vực tại Hòa Lạc',f.commune],['nearby','Vị trí gần các địa điểm chính',f.nearby],['coordinates','Vị trí ghim trên bản đồ (Tọa độ GPS)',f.latitude&&f.longitude?`${f.latitude}, ${f.longitude}`:null]]},
  {title:'Tiện ích & Quy định chung',items:[['amenities','Tiện ích & Cơ sở vật chất chung',labels(f.amenities,AMENITIES)],['rules','Quy định & Nội quy lưu trú',[labels(f.selectedRules,RULES),f.rules].filter(Boolean).join(' · ')]]},
  {title:'Hình ảnh nhà trọ & Khuôn viên',items:[['exterior','Ảnh chụp mặt tiền & Biển hiệu nhà trọ'],['parking','Ảnh cổng ra vào & Ngõ / Lối vào'],['common','Ảnh khu vực để xe máy & Bãi xe chung'],['corridor','Ảnh hành lang & Cầu thang / Thang máy'],['safety','Ảnh thiết bị & Tiêu lệnh PCCC chung']].map(([key,label])=>[key,label,photos.length?`${photos.length} ảnh đã gửi · Chưa phân loại theo khu vực`:'Chưa gửi hình ảnh'])},
  {title:'Hồ sơ xác minh & Giấy tờ pháp lý',items:[['OWNERSHIP','Giấy tờ quyền sở hữu hoặc hợp đồng quản lý'],['ID_CARD','Căn cước công dân (CCCD / CMND) chủ trọ'],['FIRE_SAFETY','Biên bản kiểm tra hoặc Cam kết an toàn PCCC']].map(([key,label])=>[key,label,docs.find(file=>file.type===key)?.fileName])},
 ];
}

export function composeSupplementNote(groups,selected,note='') {
 const sections=groups.map(group=>{
  const rows=group.items.filter(([key])=>selected.includes(key));
  return rows.length?`${group.title}:\n${rows.map(([,label])=>`- ${label}`).join('\n')}`:null;
 }).filter(Boolean);
 return [sections.length?'Yêu cầu bổ sung thông tin / hồ sơ:':null,...sections,note.trim()?`Ghi chú của Staff: ${note.trim()}`:null].filter(Boolean).join('\n\n');
}
