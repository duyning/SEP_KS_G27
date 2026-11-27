import { viewingApi } from './viewings.js';

export function viewingInstant(value) {
  if (typeof value !== 'string' || !value) return NaN;
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+07:00`);
}

export function upcomingViewings(items, now = Date.now()) {
  return items.filter(item => ['PENDING', 'APPROVED'].includes(item.status) && viewingInstant(item.scheduledDate) > now)
    .sort((a, b) => viewingInstant(a.scheduledDate) - viewingInstant(b.scheduledDate) || a.bookingId - b.bookingId);
}

// Read every page of the two active statuses; a recent page can contain only past appointments.
export async function fetchProfileViewings(signal) {
  const groups = await Promise.all(['PENDING', 'APPROVED'].map(async status => {
    const records = new Map();
    for (let page = 0; page <= 500; page++) {
      if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
      const batch = await viewingApi.list(page, status, signal, { sort: 'appointment' });
      const before = records.size;
      for (const item of batch.items) records.set(item.bookingId, item);
      if (!batch.hasNext) return [...records.values()];
      if (records.size === before) break;
    }
    throw new Error('Không thể tải đủ lịch sắp tới. Vui lòng thử lại.');
  }));
  return [...new Map(groups.flat().map(item => [item.bookingId, item])).values()];
}
