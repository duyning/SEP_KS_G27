import { request, ApiError } from './auth.js';

const call = (path, options = {}) => request(path, { basePath: '/api', ...options });
const multipart = (details, images = []) => {
  const body = new FormData();
  body.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
  images.forEach(file => body.append('image', file));
  return body;
};
const rating = r => r && Number.isInteger(r.ratingId) && Number.isInteger(r.stars) && r.stars >= 0 && r.stars <= 5 && Array.isArray(r.imageUrls);
export const complaintLabels = { PENDING: 'Chờ xử lý', NEEDS_EXPLANATION: 'Chờ giải trình', EXPLAINED: 'Đã giải trình', DISMISSED: 'Đã đóng báo cáo', REMOVED: 'Đã gỡ công khai' };
const complaint = c => c && Number.isInteger(c.complaintId) && Number.isInteger(c.revision) && Object.hasOwn(complaintLabels, c.status);
const detail = d => d && complaint(d.complaint) && Array.isArray(d.history) && Array.isArray(d.imageUrls);
const verified = (value, check) => { if (!check(value)) throw new ApiError('Chưa xác nhận được dữ liệu. Vui lòng tải lại để kiểm tra.', 502); return value; };
export const serviceFeedbackApi = {
  ratings: async (id, stars, page, signal) => verified(await call(`/services/${id}/ratings?page=${page}${stars === '' ? '' : `&stars=${stars}`}`, { signal }),
    d => d && Array.isArray(d.items) && d.items.every(rating) && Array.isArray(d.counts) && d.counts.length === 6 && Number.isInteger(d.total) && Number.isInteger(d.totalPages)),
  rate: async (id, stars, content, images) => verified(await call(`/services/${id}/ratings`, { method: 'POST', body: multipart({ stars, content }, images) }), rating),
  reply: async (id, content) => verified(await call(`/service-ratings/${id}/reply`, { method: 'POST', body: { content } }), r => rating(r) && r.ratingId === id && typeof r.reply === 'string'),
  report: async (serviceId, content, images) => verified(await call('/service-complaints', { method: 'POST', body: multipart({ serviceId, content }, images) }), d => detail(d) && d.complaint.status === 'PENDING'),
  complaints: async (scope, signal) => verified(await call(scope === 'staff' ? '/staff/service-complaints' : `/service-complaints/${scope}`, { signal }), rows => Array.isArray(rows) && rows.every(complaint)),
  complaint: async (id, signal) => verified(await call(`/service-complaints/${id}`, { signal }), d => detail(d) && d.complaint.complaintId === id),
  explain: async (id, revision, content, images) => verified(await call(`/service-complaints/${id}/explanation`, { method: 'POST', body: multipart({ revision, content }, images) }), d => detail(d) && d.complaint.complaintId === id && d.complaint.revision === revision + 1 && d.complaint.status === 'EXPLAINED'),
  decide: async (id, revision, action, content) => verified(await call(`/staff/service-complaints/${id}/review`, { method: 'POST', body: { revision, action, content } }), d => detail(d) && d.complaint.complaintId === id && d.complaint.revision === revision + 1),
  image: (url, signal) => request(url, { basePath: '', responseType: 'blob', signal }),
};
export function feedbackImageError(images) {
  if (images.length > 5) return 'Chọn tối đa 5 ảnh.';
  if (images.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) return 'Ảnh phải là JPG, PNG hoặc WEBP, có nội dung và tối đa 5 MB/ảnh.';
  return '';
}
