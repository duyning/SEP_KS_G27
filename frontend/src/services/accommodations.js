import { ApiError, request } from './auth.js';
import { detailPhone } from './accommodation-detail.js';

export function accommodationQuery(values = {}) {
  const query = new URLSearchParams();
  for (const key of ['page', 'size', 'q', 'location', 'price', 'sort', 'type']) {
    if (values[key] !== undefined && values[key] !== '') query.set(key, String(values[key]));
  }
  return query.toString();
}
const publicRequest = (path, signal) => request(path, { basePath: '/api/properties', authenticated: false, signal });
const validPublicContact = value => value == null || (typeof value === 'object'
  && [value.phone, value.zaloPhone].every(phone => phone == null || (typeof phone === 'string' && detailPhone(phone) === phone))
  && Boolean(value.phone || value.zaloPhone));
const validAccommodation = item => item && [item.propertyId, item.roomTypeId].every(id => Number.isInteger(id) && id > 0)
  && typeof item.propertyName === 'string' && typeof item.roomTypeName === 'string'
  && Number.isFinite(item.price) && item.price > 0 && Number.isFinite(item.areaSqm) && item.areaSqm > 0
  && item.verificationStatus === 'APPROVED' && Number.isInteger(item.availableRooms) && item.availableRooms >= 0
  && (item.address == null || typeof item.address === 'string') && (item.imageUrl == null || typeof item.imageUrl === 'string');
export const accommodationApi = {
  async list(query, signal) {
    const data = await publicRequest(`/search?${query}`, signal);
    if (!data || !Array.isArray(data.items) || !data.items.every(validAccommodation)
        || !Number.isInteger(data.page) || data.page < 0 || !Number.isInteger(data.size) || data.size < 1 || data.size > 50
        || !Number.isInteger(data.totalElements) || data.totalElements < 0 || !Number.isInteger(data.totalPages) || data.totalPages < 0) {
      throw new ApiError('Dữ liệu danh sách nhà trọ không hợp lệ. Vui lòng thử lại.', 502);
    }
    return data;
  },
  async detail(propertyId, roomTypeId, signal) {
    if (![propertyId, roomTypeId].every(id => /^[1-9]\d*$/.test(String(id)))) {
      throw new ApiError('Mã nhà trọ hoặc loại phòng không hợp lệ.', 400);
    }
    const data = await publicRequest(`/${propertyId}/room-types/${roomTypeId}/details`, signal);
    if (!validAccommodation(data?.summary) || !['gallery', 'amenities', 'propertyAmenities', 'selectedRules', 'similar'].every(key => Array.isArray(data[key]))
        || !data.gallery.every(photo => photo && typeof photo.url === 'string') || !data.similar.every(validAccommodation)
        || !data.reviews || !Array.isArray(data.reviews.ratingCounts) || data.reviews.ratingCounts.length !== 5
        || !Array.isArray(data.reviews.latest) || !Number.isInteger(data.reviews.totalReviews) || !validPublicContact(data.publicContact)) {
      throw new ApiError('Dữ liệu thông tin phòng không hợp lệ.', 502);
    }
    return { ...data, ...data.summary };
  },
};
