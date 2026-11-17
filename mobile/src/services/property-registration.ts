import type { ImagePickerAsset } from 'expo-image-picker';
export const PROPERTY_TYPES=['Nhà trọ truyền thống / Phòng trọ sinh viên','Chung cư mini','Căn hộ dịch vụ / Studio','Homestay'];
export const PROPERTY_AREAS=['Tân Xã','Thạch Hòa','Bình Yên','Khu Công nghệ cao Hòa Lạc'];
export interface RegistrationValues { name:string;propertyType:string;description:string;managerName:string;contactPhone:string;zaloPhone:string;commune:string;addressDetail:string;nearby:string;amenities:string[];selectedRules:string[];rules:string;termsAccepted:boolean }
export interface RegistrationFiles { photos:ImagePickerAsset[];ownership:ImagePickerAsset|null;idCard:ImagePickerAsset|null;fireSafety:ImagePickerAsset|null }
export function registrationError(v:RegistrationValues,files:RegistrationFiles,step:number):string|null {
 const phone=(value:string)=>/^(?:0|\+84)[35789]\d{8}$/.test(value.replace(/[\s.-]/g,''));
 if(step===0){if(v.name.trim().length<3||v.name.length>100)return 'Tên nhà trọ cần từ 3 đến 100 ký tự.';if(!PROPERTY_TYPES.includes(v.propertyType))return 'Vui lòng chọn loại hình nhà trọ.';if(v.managerName.trim().length<2||v.managerName.length>100)return 'Vui lòng nhập họ tên người quản lý (2–100 ký tự).';if(!phone(v.contactPhone)||v.zaloPhone&&!phone(v.zaloPhone))return 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';if(v.description.trim().length<30||v.description.length>2000)return 'Mô tả cần từ 30 đến 2.000 ký tự.';}
 if(step===1){if(!PROPERTY_AREAS.includes(v.commune))return 'Vui lòng chọn khu vực.';if(v.addressDetail.trim().length<10||v.addressDetail.length>255)return 'Địa chỉ chi tiết cần từ 10 đến 255 ký tự.';}
 if(step===2){if(!files.photos.length||files.photos.length>10)return 'Cần từ 1 đến 10 ảnh nhà trọ.';if(!files.ownership||!files.idCard||!files.fireSafety)return 'Cần ảnh giấy phép kinh doanh, căn cước và chứng nhận PCCC.';}
 if(step===3&&!v.termsAccepted)return 'Bạn cần đồng ý với điều khoản trước khi gửi.';
 return null;
}
export function registrationAssetError(asset:ImagePickerAsset,document:boolean):string|null {if(!['image/jpeg','image/png','image/webp'].includes(asset.mimeType||''))return 'Chọn ảnh JPG, PNG hoặc WebP.';if(asset.fileSize!=null&&(asset.fileSize<=0||asset.fileSize>(document?10:5)*1024*1024))return document?'Ảnh giấy tờ tối đa 10 MB.':'Ảnh nhà trọ tối đa 5 MB.';return null;}
