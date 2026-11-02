import { ApiError, request } from './auth.js';
const positive = id => { if (!/^\d+$/.test(String(id)) || Number(id) < 1 || Number(id) > 2147483647) throw new ApiError('Mã hồ sơ không hợp lệ.', 400); return id; };
const validSummary = data => data && Number.isInteger(data.registrationId) && typeof data.name === 'string' && ['PENDING', 'NEEDS_SUPPLEMENT', 'APPROVED', 'REJECTED'].includes(data.status);
function detail(data) {
  if (!validSummary(data?.summary) || !['photos', 'documents', 'history'].every(key => Array.isArray(data[key]))) throw new ApiError('Dữ liệu hồ sơ không hợp lệ.', 502);
  return data;
}
export const staffApi = {
  async dashboard(signal) {
    const data = await request('/dashboard', { basePath: '/api/staff', signal });
    if (!data || !Array.isArray(data.queue) || !Array.isArray(data.activities) || !['pendingVerifications', 'pendingReports', 'pendingSupport', 'pendingCommunity', 'activeProperties', 'processedTasks'].every(key => Number.isInteger(data[key]) && data[key] >= 0)) throw new ApiError('Dữ liệu bảng điều khiển không hợp lệ.', 502);
    return data;
  },
  async verifications(signal) {
    const data = await request('/verifications', { basePath: '/api/staff', signal });
    if (!Array.isArray(data) || !data.every(validSummary)) throw new ApiError('Danh sách hồ sơ không hợp lệ.', 502);
    return data;
  },
  async detail(signal, id) { return detail(await request(`/verifications/${positive(id)}`, { basePath: '/api/staff', signal })); },
  async file(id, fileId, signal) {
    const blob = await request(`/verifications/${positive(id)}/files/${positive(fileId)}`, { basePath: '/api/staff', signal, responseType: 'blob' });
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(blob.type) || blob.size === 0) throw new ApiError('Không tải được tài liệu.', 502);
    return blob;
  },
  async review(id, decision, note, signal, requestedFields, assignmentVersion) {
    if (!Number.isSafeInteger(assignmentVersion) || assignmentVersion < 0) throw new ApiError('Chưa xác minh được phiên bản phân công. Vui lòng tải lại hồ sơ.', 409);
    return detail(await request(`/verifications/${positive(id)}/review`, { basePath: '/api/staff', method: 'POST', body: { decision, note, assignmentVersion,...(requestedFields?{requestedFields}:{}) }, signal }));
  },
};
