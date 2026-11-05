import {ApiError, request} from './auth.js';
import {validAccommodation} from './accommodations.js';

const call = (path, options = {}) => request(path, {...options, basePath:'/api/favorites'});
const id = value => Number.isSafeInteger(value) && value > 0;
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const validFavorite = item => item && id(item.favoriteId) && id(item.roomTypeId) && typeof item.createdAt === 'string'
  && Number.isFinite(Date.parse(item.createdAt)) && typeof item.available === 'boolean'
  && (item.available ? validAccommodation(item.accommodation) && item.accommodation.roomTypeId === item.roomTypeId : item.accommodation === null);
function check(value, valid) {
  if (!valid) throw new ApiError('Dữ liệu danh sách yêu thích không hợp lệ. Vui lòng thử lại.',502);
  return value;
}
export const favoritesApi = {
  async get(favoriteId, signal) {
    if (!id(favoriteId)) throw new ApiError('Mã mục yêu thích không hợp lệ.',400);
    const data = await call(`/${favoriteId}`, {signal});
    return check(data,validFavorite(data) && data.favoriteId===favoriteId);
  },
  async list(page = 0, size = 6, signal) {
    const data = await call(`?${new URLSearchParams({page, size})}`, {signal});
    return check(data,data && Array.isArray(data.items) && data.items.every(validFavorite) && nonnegative(data.page)
      && id(data.size) && data.size<=50 && nonnegative(data.totalElements) && nonnegative(data.totalPages));
  },
  async state(ids = [], signal) {
    const data = await call(`/state${ids.length ? `?roomTypeIds=${ids.join(',')}` : ''}`, {signal});
    return check(data,data && Array.isArray(data.items) && data.items.every(item=>item && id(item.roomTypeId) && id(item.favoriteId)) && nonnegative(data.total));
  },
  async save(roomTypeId, signal) {
    const data = await call('', {method:'POST', body:{roomTypeId}, signal});
    return check(data,validFavorite(data) && data.roomTypeId===roomTypeId);
  },
  remove: (favoriteId, signal) => call(`/${favoriteId}`, {method:'DELETE', signal}),
};
