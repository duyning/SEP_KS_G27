import {parsePropertyCoordinates} from './property-registration.js';
export function verificationLocation(summary,submission){
 const coordinates=parsePropertyCoordinates(submission?.latitude,submission?.longitude);
 const address=summary.address||[submission?.addressDetail,submission?.commune].filter(Boolean).join(', ');
 const query=coordinates?coordinates.join(','):address;
 return {coordinates,address,mapsUrl:query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:null};
}
export function attachmentSize(bytes){
 if(!Number.isSafeInteger(bytes)||bytes<0)return null;
 if(bytes<1024)return `${bytes} B`;
 if(bytes<1024*1024)return `${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(bytes/1024)} KB`;
 return `${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(bytes/(1024*1024))} MB`;
}
export const reviewActionLabels={APPROVED:'Phê duyệt hồ sơ',REJECTED:'Từ chối hồ sơ',REQUESTED_SUPPLEMENT:'Yêu cầu bổ sung thông tin / hồ sơ',RESUBMITTED:'Chủ trọ bổ sung & Gửi lại xét duyệt',CHANGE_REQUESTED:'Chủ trọ đề nghị thay đổi thông tin'};
