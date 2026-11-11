import { request } from './auth.js';

const basePath = '/api/viewings';
const call = (path, options) => request(path, { basePath, ...options });
export const viewingStatuses = {
  PENDING: 'Chờ xác nhận',
  APPROVED: 'Đã xác nhận',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy',
};
export const canRequestViewing = user => ['USER', 'ROOM_HOST'].includes(user?.role);
export const VIEWING_MAX_DAYS = 30;
const vietnamDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
export const viewingDateRange = (now = new Date()) => ({
  min: vietnamDate.format(now),
  max: vietnamDate.format(new Date(now.getTime() + VIEWING_MAX_DAYS * 86400000)),
});
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});
const asInstant = value => new Date(value && /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + '+07:00');
export const formatViewingDate = value => {
  const date = asInstant(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : dateFormatter.format(date);
};
const slotDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const slotTime = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
export function formatViewingSlot(value) {
  const date = asInstant(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : `${slotDate.format(date)} • ${slotTime.format(date)}`;
}
export const viewingIsFuture = value => asInstant(value).getTime() > Date.now();
export const viewingLink = id => '/bookings?id=' + encodeURIComponent(id);
export const hostViewingLink = id => '/host/viewings?id=' + encodeURIComponent(id);
export const accommodationViewingLink = item => '/properties/detail?' + new URLSearchParams({
  propertyId: item.propertyId, roomTypeId: item.roomTypeId,
});

export const viewingApi = {
  create: body => call('', { method: 'POST', body }),
  pending: (propertyId, roomTypeId, signal) => call('/pending?' + new URLSearchParams({ propertyId, roomTypeId }), { signal }),
  update: (id, body) => call('/' + encodeURIComponent(id), { method: 'PUT', body }),
  availability: (id, signal) => request('/viewings/' + encodeURIComponent(id) + '/availability', { basePath: '/api/host', signal }),
  list: (page, status, signal) => call('?' + new URLSearchParams({
    page, ...(status ? { status } : {}),
  }), { signal }),
  detail: (id, signal) => call('/' + encodeURIComponent(id), { signal }),
  cancel: (id, body) => call('/' + encodeURIComponent(id) + '/cancel', { method: 'POST', body }),
  decide: (id, body) => request('/viewings/' + encodeURIComponent(id) + '/decision', {
    basePath: '/api/host', method: 'POST', body,
  }),
  inbox: (page, unread, signal) => call('/notifications?' + new URLSearchParams({ page, unread }), { signal }),
  markRead: id => call('/notifications/' + encodeURIComponent(id) + '/read', { method: 'PUT' }),
};
