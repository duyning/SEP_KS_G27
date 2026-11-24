import { request } from './auth.js';
import { normalizeCommunityPost } from './community.js';

export const reportReasons = {
  FRAUD: 'Có dấu hiệu lừa đảo',
  SPAM: 'Spam hoặc đăng trùng',
  INAPPROPRIATE: 'Nội dung không phù hợp',
  MISLEADING: 'Thông tin sai lệch',
  OTHER: 'Lý do khác',
};

export const reportStatuses = { OPEN: 'Chờ xử lý', RESOLVED: 'Đã xử lý', DISMISSED: 'Đã bỏ qua' };
export const reportPage = value => /^\d{1,9}$/.test(value ?? '') ? Number(value) : 0;
export const reportDate = value => value ? new Date(value).toLocaleString('vi-VN') : '—';

const adminPath = '/api/admin/community/reports';
const normalizeDetail = data => ({ ...data, post: data.post ? normalizeCommunityPost(data.post) : null });

export const communityReportsApi = {
  submit(postId, reason, details, evidence) {
    const body = new FormData();
    body.append('report', new Blob([JSON.stringify({ reason, details })], { type: 'application/json' }));
    if (evidence) body.append('evidence', evidence);
    return request(`/posts/${postId}/reports`, { basePath: '/api/community', method: 'POST', body });
  },
  queue: (status, page, signal) => request(`?status=${status}&page=${page}`, { basePath: adminPath, signal }),
  stats: signal => request('/stats', { basePath: adminPath, signal }),
  detail: (id, signal) => request(`/${id}`, { basePath: adminPath, signal }).then(normalizeDetail),
  ai: (id, signal) => request(`/${id}/ai`, { basePath: adminPath, signal }),
  analyze: id => request(`/${id}/ai`, { basePath: adminPath, method: 'POST' }),
  evidence: (id, signal) => request(`/${id}/evidence`, { basePath: adminPath, signal, responseType: 'blob' }),
  resolve: (id, action, reason) => request(`/${id}/decision`, { basePath: adminPath, method: 'POST', body: { action, reason } }).then(normalizeDetail),
};
