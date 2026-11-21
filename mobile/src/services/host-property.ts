import type { HostProperty } from './host';

const fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
/** Display only: retain the original address, removing duplicate comma-separated commune segments. */
export function propertyAddress(record:Pick<HostProperty,'address'|'addressDetail'|'commune'>){
 const raw=record.address?.trim()||record.addressDetail?.trim()||'';const commune=record.commune?.trim();
 if(!commune)return raw||'Chưa cập nhật';
 const key=fold(commune).replace(/^(xa|phuong)\s+/,'');
 let seen=false;
 const pieces=raw.split(',').map(part=>part.trim()).filter(Boolean).filter(part=>{
  const normalized=fold(part).replace(/^(xa|phuong)\s+/,'');
  // A longer street segment containing the commune already establishes the area.
  if(normalized===key){if(seen)return false;seen=true;return true;}
  if(new RegExp(`(?:^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\s)`).test(normalized))seen=true;
  return true;
 });
 if(!seen)pieces.push(commune);
 return pieces.join(', ')||'Chưa cập nhật';
}
export function propertyCoordinates(latitude:unknown,longitude:unknown):[number,number]|null {
 const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
 if(!decimal.test(String(latitude??'').trim())||!decimal.test(String(longitude??'').trim()))return null;
 const lat=Number(latitude),lng=Number(longitude);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng]:null;
}
export function propertyCount(value:unknown){return Number.isSafeInteger(value)&&(value as number)>=0?String(value):'—';}
export const listingLabels:Record<string,string>={VISIBLE:'Đang hiển thị công khai',INACTIVE:'Chưa hiển thị công khai',PENDING:'Chưa công khai · Chờ xét duyệt',NEEDS_SUPPLEMENT:'Chưa công khai · Cần bổ sung',REJECTED:'Chưa công khai · Hồ sơ bị từ chối',APPROVED:'Đã duyệt · Chưa hiển thị'};
export const reviewLabels:Record<string,string>={PENDING:'Chờ xét duyệt',NEEDS_SUPPLEMENT:'Cần bổ sung',REJECTED:'Đã từ chối',APPROVED:'Đã phê duyệt',VERIFIED:'Đã xác minh',UNVERIFIED:'Chưa xác minh'};
export function baseReview(record:HostProperty){
 if(['PENDING','NEEDS_SUPPLEMENT','REJECTED','APPROVED'].includes(record.displayStatus))return reviewLabels[record.displayStatus];
 // In HostPropertyService verified=true requires an APPROVED registration; VISIBLE alone does not.
 return record.verified===true?'Đã phê duyệt':'Chưa có kết quả xét duyệt riêng';
}
export function documentStatus(status?:string|null){return status?reviewLabels[status]||status:'Đã tiếp nhận · Chưa có kết quả kiểm tra';}
export const propertyAmenities:Record<string,string>={parking:'Bãi để xe máy có mái che',fingerprint:'Cổng khóa vân tay / Thẻ từ',camera:'Camera an ninh 24/7',flexibleHours:'Giờ giấc tự do 24/7',fireSafety:'Hệ thống PCCC đạt chuẩn',separateOwner:'Không chung chủ',wifi:'Wifi 6 toàn tòa nhà',laundry:'Máy giặt dùng chung',drying:'Sân phơi đồ có mái che',cleaning:'Vệ sinh hành lang định kỳ',water:'Hệ thống lọc nước tổng',elevator:'Thang máy di chuyển',security:'Bảo vệ / Người trực quản lý',emergencyExit:'Lối thoát nạn riêng',emergencyLighting:'Đèn sự cố & Biển chỉ dẫn thoát nạn',wasteCollection:'Khu tập kết rác & Thu gom định kỳ',bicycleParking:'Chỗ để xe đạp',commonArea:'Khu sinh hoạt chung'};
const rules:Record<string,string>={noSmoking:'Không hút thuốc trong nhà',noUnsafeStoves:'Nghiêm cấm bếp than/ga mini',residenceRegistration:'Đăng ký tạm trú đầy đủ',cleanliness:'Giữ vệ sinh chung',pets:'Cho phép nuôi thú cưng',guestRegistration:'Đăng ký khách đến thăm / Lưu trú',noBlockedExits:'Không để đồ chắn hành lang, lối thoát nạn',safeCharging:'Sạc xe điện tại khu vực được cho phép',wasteSorting:'Bỏ rác đúng nơi & Đúng giờ',noSubletting:'Không tự ý cho thuê lại / Chuyển nhượng',reportIncidents:'Báo ngay sự cố điện, nước & An toàn'};
export function propertyRule(key:string){const match=key.match(/^quietHours(?::((?:[01]\d|2[0-3]):[0-5]\d))?$/);return match?`Giữ trật tự sau ${match[1]||'23:00'}`:rules[key]||key;}
export const propertyFields:Record<string,string>={name:'Tên nhà trọ',propertyType:'Loại hình',description:'Mô tả',commune:'Xã / Khu vực',address:'Địa chỉ',addressDetail:'Địa chỉ chi tiết',nearby:'Địa điểm lân cận',contact:'Thông tin liên hệ',managerName:'Người quản lý',contactPhone:'Điện thoại',zaloPhone:'Zalo',coordinates:'Tọa độ',latitude:'Vĩ độ',longitude:'Kinh độ',amenities:'Tiện ích chung',rules:'Quy định nhà trọ',selectedRules:'Quy định đã chọn',photos:'Hình ảnh',exterior:'Ảnh mặt tiền và biển hiệu',parking:'Ảnh cổng ra vào và lối vào',common:'Ảnh khu vực để xe chung',corridor:'Ảnh hành lang và cầu thang',safety:'Ảnh thiết bị PCCC và lối thoát nạn',OWNERSHIP:'Giấy phép kinh doanh',ID_CARD:'CCCD / CMND chủ trọ',ID_CARD_BACK:'Mặt sau CCCD chủ trọ',FIRE_SAFETY:'Chứng nhận an toàn PCCC'};
export function propertyChangeState(record:HostProperty){
 if(record.changeRequest?.status==='PENDING')return 'Đề nghị thay đổi đang chờ xét duyệt.';
 if(record.changeRequest&&['NEEDS_SUPPLEMENT','REJECTED'].includes(record.changeRequest.status))return 'Đề nghị thay đổi cần được cập nhật trên cổng quản lý web. Ứng dụng chưa có luồng gửi lại đề nghị.';
 if(record.displayStatus==='PENDING')return 'Hồ sơ đang chờ xét duyệt, tạm khóa chỉnh sửa.';
 const editable=Boolean(record.registrationId)&&['VISIBLE','APPROVED','NEEDS_SUPPLEMENT','REJECTED'].includes(record.displayStatus);
 return editable?'Đề nghị thay đổi thông tin hiện được thực hiện trên cổng quản lý web. Ứng dụng chưa có luồng gửi đề nghị.':'Hồ sơ hiện chưa đủ điều kiện đề nghị thay đổi thông tin.';
}


