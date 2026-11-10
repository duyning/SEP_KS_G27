import { request } from './auth.js';

const basePath = '/api/host-applications';

export const applicationLabels = {
  PENDING_REVIEW: 'Chờ xét duyệt',
  NEEDS_CHANGES: 'Cần bổ sung',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Đã từ chối'
};

export const applicationBadgeTones = {
  PENDING_REVIEW: 'pending',
  NEEDS_CHANGES: 'warning needs-changes',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export function formatApplicationDate(value) {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa cập nhật';
  return (
    parsed.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' · ' +
    parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  );
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const diffMs = now - parsed.getTime();
  if (diffMs < 0) return 'Vừa gửi';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Vừa gửi';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

export function isLongPendingApplication(submittedAt, status, now = Date.now()) {
  if (status !== 'PENDING_REVIEW' || !submittedAt) return false;
  const parsed = new Date(submittedAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return now - parsed.getTime() >= 48 * 3600 * 1000;
}

export function formatProcessedBreakdown(stats = {}) {
  const approved = Number(stats?.approved ?? 0);
  const rejected = Number(stats?.rejected ?? 0);
  return `${approved} đã phê duyệt · ${rejected} từ chối`;
}

export function isKpiStatusActive(currentStatus, targetStatus) {
  if (targetStatus === 'PROCESSED') {
    return currentStatus === 'PROCESSED' || currentStatus === 'APPROVED' || currentStatus === 'REJECTED';
  }
  return currentStatus === targetStatus;
}

export const staffHostApi = {
  list: async (filters = {}, signal) => {
    const result = await request(
      '?' + new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null)),
      { basePath, signal }
    );
    if (!Array.isArray(result?.content) || !result.stats) {
      throw Error('Dữ liệu từ backend chưa đúng phiên bản. Vui lòng khởi động lại backend sau khi cập nhật code.');
    }
    return result;
  },
  detail: (id, signal) => request('/' + id, { basePath, signal }),
  review: (id, body) => request('/' + id + '/review', { basePath, method: 'POST', body })
};
