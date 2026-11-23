import type { HostRoomType } from './host';
export type RoomDraft={roomTypeId:string;roomNumber:string;floor:string;status:string;customPrice:string};
export type TypeDraft={roomType:string;areaSqm:string;capacity:string;price:string};
export function validateRoomDraft(v:RoomDraft,allowedTypeIds:number[]){
 const errors:Record<string,string>={};
 if(!allowedTypeIds.includes(Number(v.roomTypeId)))errors.roomTypeId='Chọn loại phòng thuộc nhà trọ này.';
 if(!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u.test(v.roomNumber.trim()))errors.roomNumber='Nhập 1–30 ký tự chữ, số, dấu cách, chấm, gạch ngang hoặc gạch dưới.';
 if(!v.floor.trim()||v.floor.trim().length>50)errors.floor='Nhập tầng/khu vực từ 1–50 ký tự.';
 if(!['VACANT','OCCUPIED'].includes(v.status))errors.status='Trạng thái không hợp lệ.';
 if(v.customPrice.trim()&&(!/^\d+$/.test(v.customPrice)||Number(v.customPrice)<1||Number(v.customPrice)>999999999))errors.customPrice='Giá riêng là số nguyên từ 1–999.999.999 ₫.';
 return errors;
}
export function validateTypeDraft(v:TypeDraft){
 const errors:Record<string,string>={};
 if(v.roomType.trim().length<3||v.roomType.trim().length>100)errors.roomType='Tên loại phòng cần từ 3–100 ký tự.';
 if(!/^\d+(\.\d{1,2})?$/.test(v.areaSqm)||Number(v.areaSqm)<1||Number(v.areaSqm)>10000)errors.areaSqm='Diện tích từ 1–10.000 m², tối đa hai số lẻ (dấu chấm).';
 if(!/^\d+$/.test(v.capacity)||Number(v.capacity)<1||Number(v.capacity)>20)errors.capacity='Sức chứa là số nguyên từ 1–20.';
 if(!/^\d+$/.test(v.price)||Number(v.price)<1||Number(v.price)>999999999)errors.price='Giá thuê là số nguyên từ 1–999.999.999 ₫.';
 return errors;
}
// A basic price edit must retain the rest of the backend's replacement DTO.
export function typePayload(propertyId:number,v:TypeDraft,original?:HostRoomType){return {
 propertyId,roomType:v.roomType.trim(),areaSqm:Number(v.areaSqm),capacity:Number(v.capacity),price:Number(v.price),
 deposit:original?.deposit??null,description:original?.description??null,imageUrl:original?.imageUrl??null,
 amenities:original?.amenities||[],electricityPrice:original?.electricityPrice??null,waterPrice:original?.waterPrice??null,internetPrice:original?.internetPrice??null,servicePrice:original?.servicePrice??null,
 ...(original?.images?{retainedImageIds:original.images.map(i=>i.imageId)}:{}),
};}
