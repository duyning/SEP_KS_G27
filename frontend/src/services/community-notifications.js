import { request } from './auth.js';

const basePath = '/api/community/notifications';
export const communityNotifications = {
  inbox: (page, unread, signal) => request(`?page=${page}&unread=${unread}`, { basePath, signal }),
  count: signal => request('/unread-count', { basePath, signal }),
  read: id => request(`/${id}/read`, { basePath, method: 'PUT' }),
  readAll: () => request('/read-all', { basePath, method: 'PUT' }),
  deleteRead: () => request('/read', { basePath, method: 'DELETE' }),
  destination: id => request(`/${id}/destination`, { basePath }),
};
export const notificationChanged = () => window.dispatchEvent(new Event('hlrcs:community-notifications'));
export const notificationLabels = {
  APPROVED: 'Bài viết đã được duyệt', NEED_CHANGES: 'Bài viết cần chỉnh sửa',
  REJECTED: 'Bài viết bị từ chối', HIDDEN: 'Bài viết đã bị ẩn',
  COMMENT: 'Bình luận mới', REPLY: 'Phản hồi mới',
};
export function notificationText(item) {
  if (item.kind === 'COMMENT') return `${item.actor} đã bình luận bài viết “${item.postTitle}”.`;
  if (item.kind === 'REPLY') return `${item.actor} đã trả lời bình luận của bạn trong “${item.postTitle}”.`;
  return `“${item.postTitle}” — ${notificationLabels[item.kind] || 'Cập nhật bài viết'}.`;
}
export function notificationDate(value) {
  const date = new Date(value);
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
  const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  return `${time} · ${day}`;
}
