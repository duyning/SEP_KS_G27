import {AMENITIES,RULES} from '../services/property-registration.js';
const fields=[['name','Tên nhà trọ'],['propertyType','Loại hình'],['description','Mô tả'],['addressDetail','Địa chỉ chi tiết'],['commune','Khu vực'],['nearby','Địa điểm lân cận'],['latitude','Vĩ độ'],['longitude','Kinh độ'],['managerName','Người quản lý'],['contactPhone','Hotline'],['zaloPhone','Zalo'],['amenities','Tiện ích'],['selectedRules','Quy định'],['rules','Nội quy bổ sung']];
const format=(key,value)=>Array.isArray(value)?value.map(item=>[...AMENITIES,...RULES].find(([id])=>id===item)?.[1]||item).join(', '):String(value||'Chưa có');
export default function VerificationChangeComparison({previous,current,propertyId}){
 if(!propertyId)return null;
 const changed=previous&&current?fields.filter(([key])=>JSON.stringify(previous[key])!==JSON.stringify(current[key])):[];
 return <section className="svd-change-comparison"><strong>Đề nghị cập nhật nhà trọ #{propertyId}</strong><p>Đối chiếu nội dung mới với bản đang công khai. Phê duyệt sẽ cập nhật cùng nhà trọ, giữ nguyên loại phòng và danh sách phòng.</p>{changed.length>0&&<div className="svd-changes">{changed.map(([key,label])=><div key={key}><h4>{label}</h4><p><small>Bản đang hiển thị</small>{format(key,previous[key])}</p><p><small>Nội dung đề nghị</small>{format(key,current[key])}</p></div>)}</div>}{!changed.length&&<p>Đối chiếu thêm hình ảnh và tài liệu đính kèm bên dưới.</p>}</section>;
}
