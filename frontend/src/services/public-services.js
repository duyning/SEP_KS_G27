import { ApiError, request } from './auth.js';
const positiveId = id => {
  if (!/^[1-9]\d*$/.test(String(id)) || Number(id) > 2147483647) throw new ApiError('Mã dịch vụ hoặc danh mục không hợp lệ.', 400);
  return id;
};
const valid = value => value && Number.isInteger(value.serviceId) && Number.isInteger(value.providerId)
  && typeof value.serviceName === 'string' && typeof value.categoryName === 'string'
  && typeof value.pricingLabel === 'string' && value.activeState === 'ACTIVE' && value.publicEligible === true;
export const publicServicesApi = {
  async categories(signal) {
    const data = await request('/categories', { basePath: '/api/services', signal });
    if (!Array.isArray(data) || !data.every(row => Number.isInteger(row.categoryId) && typeof row.name === 'string')) throw new ApiError('Danh mục dịch vụ không hợp lệ.', 502);
    return data;
  },
  async list(signal, categoryId = null) {
    const data = await request(categoryId == null ? '' : `?categoryId=${positiveId(categoryId)}`, { basePath: '/api/services', signal });
    if (!Array.isArray(data) || !data.every(valid)) throw new ApiError('Danh sách dịch vụ không hợp lệ.', 502);
    return data;
  },
  async detail(id, signal) {
    const data = await request(`/${positiveId(id)}`, { basePath: '/api/services', signal });
    if (!valid(data)) throw new ApiError('Thông tin dịch vụ không hợp lệ.', 502);
    return data;
  },
};
export const servicePrice = row => row.pricingLabel;
