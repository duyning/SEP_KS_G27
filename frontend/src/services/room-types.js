export const ROOM_AMENITIES = [
  ['airConditioner','Điều hòa Inverter'], ['waterHeater','Bình nóng lạnh'], ['balcony','Ban công riêng'],
  ['kitchen','Kệ bếp nấu ăn'], ['loft','Gác lửng ngủ'], ['refrigerator','Tủ lạnh riêng'],
  ['washingMachine','Máy giặt riêng'], ['bed','Giường & Đệm'], ['wardrobe','Tủ quần áo'],
  ['desk','Bàn ghế làm việc'], ['wifi','Wifi tốc độ cao'], ['privateBathroom','Vệ sinh khép kín'],
];
export const money = value => value == null ? 'Chưa có dữ liệu' : `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
export const emptyRoomType = () => ({ roomType:'', areaSqm:'', capacity:'2', price:'', deposit:'', imageUrl:'', description:'', amenities:[], electricityPrice:'', waterPrice:'', internetPrice:'', servicePrice:'', photos:[], retainedImages:[] });
export function editRoomType(type) {
  const data=emptyRoomType();
  for(const key of ['roomType','areaSqm','capacity','price','deposit','imageUrl','description','electricityPrice','waterPrice','internetPrice','servicePrice']) data[key]=type[key]==null?'':String(type[key]);
  data.amenities=[...(type.amenities||[])];data.retainedImages=[...(type.images||[])];return data;
}
export function validateRoomPhotos(photos, retained=[]) {
  if(photos.length+retained.length>10)return 'Mỗi loại phòng tối đa 10 ảnh.';
  if(photos.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024))return 'Chọn ảnh JPG, PNG hoặc WEBP, mỗi ảnh không rỗng và tối đa 5 MB.';
  return '';
}
export function validateRoomType(data) {
  const errors = {};
  const photoError=validateRoomPhotos(data.photos||[],data.retainedImages||[]);if(photoError)errors.photos=photoError;
  if (data.roomType.trim().length < 3 || data.roomType.trim().length > 100) errors.roomType = 'Tên loại phòng cần từ 3 đến 100 ký tự.';
  if (!/^\d+(?:\.\d{1,2})?$/.test(data.areaSqm) || +data.areaSqm < 1 || +data.areaSqm > 10000) errors.areaSqm = 'Diện tích từ 1 đến 10.000 m², tối đa 2 chữ số thập phân.';
  if (!/^\d+$/.test(data.capacity) || +data.capacity < 1 || +data.capacity > 20) errors.capacity = 'Sức chứa từ 1 đến 20 người.';
  for (const key of ['price','deposit','electricityPrice','waterPrice','internetPrice','servicePrice']) {
    if (data[key] === '' && key !== 'price') continue;
    if (!/^\d+$/.test(data[key]) || +data[key] < (key === 'price' ? 1 : 0) || +data[key] > 999999999) errors[key] = 'Nhập số tiền nguyên hợp lệ, tối đa 999.999.999 đ.';
  }
  if (data.description.length > 2000) errors.description = 'Mô tả tối đa 2000 ký tự.';
  if (data.imageUrl.trim()) try {
    const url = new URL(data.imageUrl.trim());
    if (url.protocol !== 'https:' || url.username || url.password || data.imageUrl.trim().length > 1000) throw new Error();
  } catch { errors.imageUrl = 'Nhập đường dẫn ảnh HTTPS hợp lệ, tối đa 1000 ký tự.'; }
  if (data.amenities.length > 12 || data.amenities.some(key => !ROOM_AMENITIES.some(([value]) => key === value)) || new Set(data.amenities).size !== data.amenities.length) errors.amenities = 'Tiện nghi không hợp lệ.';
  return errors;
}
export function roomTypePayload(data, propertyId) {
  const {photos,retainedImages,...fields}=data;
  const value = { ...fields, retainedImageIds:(retainedImages||[]).map(image=>image.imageId), propertyId, roomType:data.roomType.trim(), imageUrl:data.imageUrl.trim(), description:data.description.trim(), areaSqm:Number(data.areaSqm), capacity:Number(data.capacity) };
  for (const key of ['price','deposit','electricityPrice','waterPrice','internetPrice','servicePrice']) value[key] = data[key] === '' ? null : Number(data[key]);
  return value;
}
