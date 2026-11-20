import { request } from './auth.js';

const basePath = '/api/staff/collected-posts';
export const collectedPostsApi = {
  feed({ staff = false, published = false, before = null, signal } = {}) {
    const params = new URLSearchParams();
    if (staff) params.set('published', String(published));
    if (before !== null) params.set('before', String(before));
    return request(`?${params}`, { basePath: staff ? basePath : '/api/public/collected-posts', authenticated: staff, signal });
  },
  scrape: (groupUrl, signal) => request('/scrape', { basePath, method: 'POST', body: { groupUrl }, signal }),
  remove: (id, signal) => request(`/${id}`, { basePath, method: 'DELETE', signal }),
  publish: (postIds, published, signal) => request(published ? '/publish' : '/unpublish', { basePath, method: 'POST', body: { postIds }, signal }),
  auth: (action, signal) => request(`/auth/${action}`, { basePath, method: action === 'status' ? 'GET' : 'POST', signal }),
};
