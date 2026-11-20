import { request, ApiError } from './auth.js';
const basePath = '/api/service-requests';
const statuses = ['PENDING', 'ACCEPTED', 'REJECTED'];
const valid = row => Number.isInteger(row?.requestId) && Number.isInteger(row.revision) && statuses.includes(row.status) && typeof row.serviceName === 'string';
const one = row => { if (!valid(row)) throw new ApiError('Phản hồi yêu cầu không hợp lệ.', 502); return row; };
const list = rows => { if (!Array.isArray(rows) || !rows.every(valid)) throw new ApiError('Danh sách yêu cầu không hợp lệ.', 502); return rows; };
const id = value => { if (!Number.isInteger(value) || value <= 0) throw new ApiError('Mã yêu cầu không hợp lệ.', 400); return value; };
export function vietnamSchedule(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Chọn ngày và giờ sử dụng dịch vụ.');
  const result = `${value}:00+07:00`;
  if (!Number.isFinite(Date.parse(result)) || Date.parse(result) <= Date.now()) throw new Error('Lịch sử dụng dịch vụ phải nằm trong tương lai.');
  return result;
}
export const requestTime = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export const serviceRequestsApi = {
  mine: signal => request('/mine', { basePath, signal }).then(list),
  incoming: signal => request('/incoming', { basePath, signal }).then(list),
  submit: body => request('', { basePath, method: 'POST', body }).then(one),
  respond: (requestId, body) => request(`/${id(requestId)}/response`, { basePath, method: 'POST', body }).then(one),
};
