import { ApiError, request } from './auth.js';
const basePath = '/api/staff/service-applications';
const id = value => {
  if (!/^[1-9]\d*$/.test(String(value)) || Number(value) > 2147483647) throw new ApiError('Mã hồ sơ không hợp lệ.', 400);
  return value;
};
const application = row => row && Number.isInteger(row.registrationId) && typeof row.serviceName === 'string'
  && ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_SUPPLEMENT'].includes(row.status) && Array.isArray(row.documents);
const detail = row => {
  if (!application(row?.application) || !Array.isArray(row.history)) throw new ApiError('Phản hồi hồ sơ không hợp lệ.', 502);
  return row;
};
export function validateServiceReview(capabilityDecision, listingDecision, reason) {
  if (![capabilityDecision, listingDecision].every(value => ['APPROVE', 'REJECT'].includes(value))) return 'Cần chọn đủ hai quyết định.';
  if (capabilityDecision === 'REJECT' && listingDecision === 'APPROVE') return 'Không thể công khai dịch vụ khi từ chối capability.';
  if (reason.trim().length < 10 || reason.trim().length > 2000) return 'Lý do phải có từ 10 đến 2000 ký tự.';
  return '';
}
export const serviceReviewApi = {
  async list(signal) {
    const rows = await request('', { basePath, signal });
    if (!Array.isArray(rows) || !rows.every(application)) throw new ApiError('Danh sách hồ sơ không hợp lệ.', 502);
    return rows;
  },
  detail: async (value, signal) => detail(await request(`/${id(value)}`, { basePath, signal })),
  review: async (value, capabilityDecision, listingDecision, reason) => detail(await request(`/${id(value)}/review`, { basePath, method: 'POST', body: { capabilityDecision, listingDecision, reason } })),
  file: (value, fileId) => request(`/${id(value)}/files/${id(fileId)}`, { basePath, responseType: 'blob' }),
};
