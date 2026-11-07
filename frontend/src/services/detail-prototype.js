import { detailDate, detailPhone, moveInEstimate, zaloLink } from './accommodation-detail.js';
import { ROOM_AMENITIES } from './room-types.js';
import { AMENITIES, formatRuleLabel } from './property-registration.js';

export const detailMoney = value => Number.isFinite(value) ? `${new Intl.NumberFormat('vi-VN').format(value)} đ` : 'Chưa cập nhật';
// Only the reference distances are illustrative; never use sample prices, photos or contacts.
const referenceDistances = [
  { name: 'Đại học FPT Hòa Lạc (Campus)', distance: '800m', time: '2 phút xe máy / 8 phút đi bộ' },
  { name: 'Đại học Quốc Gia Hà Nội (VNU Hòa Lạc)', distance: '2.5km', time: '6 phút xe máy' },
  { name: 'Khu Công nghệ cao Hòa Lạc (F-Ville, Viettel)', distance: '1.2km', time: '3 phút xe máy' },
  { name: 'Chợ dân sinh Tân Xã & Chuỗi WinMart+', distance: '250m', time: '3 phút đi bộ' },
  { name: 'Trạm đón xe Bus Hòa Lạc (Tuyến 74, 88, 107)', distance: '400m', time: '5 phút đi bộ' },
];
const labels = (keys, options) => keys.map(key => options.find(([id]) => id === key)?.[1] || key);
export function toDetailPrototype(item) {
  const amenities = labels(item.amenities, ROOM_AMENITIES), common = labels(item.propertyAmenities, AMENITIES);
  const rating = item.reviews.totalReviews > 0 && Number.isFinite(item.reviews.averageRating) ? item.reviews.averageRating.toFixed(1) : '—';
  const estimate = moveInEstimate(item.price, item.deposit), phone = detailPhone(item.publicContact?.phone);
  const area = item.address || 'Chưa cập nhật địa chỉ';
  const locationKey = /tân xã/i.test(area) ? 'tan-xa' : /thạch hòa/i.test(area) ? 'thach-hoa' : /bình yên/i.test(area) ? 'binh-yen' : 'all';
  return {
    title: `${item.propertyName} – ${item.roomTypeName}`, location: area, locationShort: area.split(',').slice(-2).join(',').trim(), locationKey,
    availability: item.availableRooms > 0 ? `Còn ${item.availableRooms} phòng trống` : 'Hết phòng', featured: false,
    campusDistance: item.nearby || 'Khu vực Hòa Lạc', ratingDisplay: rating === '—' ? 'Chưa có đánh giá' : `${rating} (${item.reviews.totalReviews} đánh giá)`, rating, ratingCount: item.reviews.totalReviews,
    gallery: item.propertyGallery || [], image: item.propertyGallery?.[0]?.url || null, typeName: item.roomTypeName, area: `${item.areaSqm} m²`,
    specs: { capacity: item.capacity ? `${item.capacity} người` : 'Chưa cập nhật', bedroom: 'Liên hệ chủ trọ', bathroom: item.amenities.includes('privateBathroom') ? 'Khép kín riêng' : 'Chưa cập nhật', furniture: amenities.filter((_, index) => ['bed', 'wardrobe', 'desk', 'refrigerator'].includes(item.amenities[index])).join(', ') || 'Theo tiện nghi đã khai báo' },
    moveInDate: 'Liên hệ xác nhận', price: item.price, priceDisplay: detailMoney(item.price),
    electric: Number.isFinite(item.electricityPrice) ? `${detailMoney(item.electricityPrice)}/kWh` : 'Chưa cập nhật', electricNote: 'Tính theo lượng điện sử dụng thực tế.',
    water: Number.isFinite(item.waterPrice) ? `${detailMoney(item.waterPrice)}/m³` : 'Chưa cập nhật', waterNote: 'Xác nhận chỉ số và cách tính với chủ trọ.',
    internet: Number.isFinite(item.internetPrice) ? `${detailMoney(item.internetPrice)}/phòng/tháng` : 'Chưa cập nhật', internetNote: 'Theo biểu phí do chủ trọ khai báo.',
    deposit: detailMoney(item.deposit), serviceFee: Number.isFinite(item.servicePrice) ? `${detailMoney(item.servicePrice)}/người/tháng` : 'Chưa cập nhật', serviceFeeNote: 'Xác nhận các dịch vụ được bao gồm.',
    parkingFee: 'Liên hệ chủ trọ', parkingFeeNote: item.propertyAmenities.includes('parking') ? 'Có khu vực để xe; xác nhận mức phí trước khi thuê.' : 'Chưa cập nhật thông tin chỗ để xe.',
    initialEstimate: estimate, estimateDisplay: estimate == null ? 'Cần xác nhận thêm' : detailMoney(estimate),
    description: [item.description, item.propertyDescription !== item.description ? item.propertyDescription : null].filter(Boolean).join('\n\n') || 'Chủ trọ chưa bổ sung mô tả chi tiết.',
    amenities: [...new Set([...amenities, ...common])], rules: [...(item.selectedRules || []).map(formatRuleLabel), ...(item.rules ? [item.rules] : [])], distances: referenceDistances,
    hostInfo: { name: item.propertyName, avatar: null, role: 'Chủ trọ / Đại diện nhà trọ', joined: item.publishedAt ? `Hồ sơ duyệt ${detailDate(item.publishedAt)}` : 'Thông tin liên hệ công khai', responseRate: 'Liên hệ để xác nhận', phone: phone || '', zalo: zaloLink(item.publicContact?.zaloPhone)?.split('/').at(-1) || '' },
    reviews: item.reviews.latest,
  };
}
