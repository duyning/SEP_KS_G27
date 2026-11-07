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
export function validateServiceReview(decision, reason) {
  const errors = {};
  if (!['APPROVE', 'SUPPLEMENT', 'REJECT'].includes(decision)) errors.decision = 'Vui lòng chọn duyệt, yêu cầu bổ sung hoặc từ chối hồ sơ.';
  if (decision !== 'APPROVE' && (reason.trim().length < 10 || reason.length > 2000)) {
    const label = decision === 'SUPPLEMENT' ? 'Nội dung cần bổ sung' : decision === 'REJECT' ? 'Lý do từ chối' : 'Nhận xét xét duyệt';
    errors.reason = label + ' phải có từ 10 đến 2000 ký tự.';
  }
  return errors;
}
export const serviceReviewApi = {
  async list(signal) {
    const rows = await request('', { basePath, signal });
    if (!Array.isArray(rows) || !rows.every(application)) throw new ApiError('Danh sách hồ sơ không hợp lệ.', 502);
    return rows;
  },
  detail: async (value, signal) => detail(await request(`/${id(value)}`, { basePath, signal })),
  review: async (value, capabilityDecision, listingDecision, reason, revision) => detail(await request(`/${id(value)}/review`, { basePath, method: 'POST', body: { capabilityDecision, listingDecision, reason: capabilityDecision === 'APPROVE' && listingDecision === 'APPROVE' && !reason?.trim() ? 'Đã kiểm tra và duyệt thành công.' : reason, revision } })),
  supplement: async (value, reason, revision) => detail(await request('/' + id(value) + '/supplement-request', { basePath, method: 'POST', body: { reason, revision } })),
  file: (value, fileId) => request(`/${id(value)}/files/${id(fileId)}`, { basePath, responseType: 'blob' }),
};
