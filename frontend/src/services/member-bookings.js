import { viewingApi, viewingStatuses } from './viewings.js';
import { accommodationApi } from './accommodations.js';

// Bridge older running backends that return only items/hasNext/coverImages.
// Counts must cover the complete account history, never just the visible page.
export async function fetchMemberBookings(page, status, signal, { q = '', sort = 'newest' } = {}) {
  let data = await viewingApi.list(page, status, signal, { q, sort });
  if (!data.summary?.counts) {
    let batch = page === 0 && !status && !q && sort === 'newest' ? data : await viewingApi.list(0, '', signal);
    const all = new Map();
    const covers = {};
    let current = 0;
    while (true) {
      const size = all.size;
      for (const item of batch.items) all.set(item.bookingId, item);
      Object.assign(covers, batch.coverImages);
      if (!batch.hasNext) break;
      if (all.size === size || ++current > 500) throw new Error('Không thể tải đủ lịch để thống kê. Vui lòng cập nhật backend và thử lại.');
      batch = await viewingApi.list(current, '', signal);
    }
    const counts = Object.fromEntries(Object.keys(viewingStatuses).map(key => [key, 0]));
    const items = [...all.values()];
    let upcoming = 0;
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
      const time = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(item.scheduledDate) ? item.scheduledDate : `${item.scheduledDate}+07:00`);
      if (item.status === 'APPROVED' && time.getTime() > Date.now()) upcoming++;
    }
    const keyword = q.trim().toLocaleLowerCase('vi-VN');
    const filtered = items.filter(item => (!status || item.status === status)
      && `${item.propertyName} ${item.roomType}`.toLocaleLowerCase('vi-VN').includes(keyword));
    filtered.sort((a, b) => sort === 'oldest' ? a.bookingId - b.bookingId
      : sort === 'appointment' ? a.scheduledDate.localeCompare(b.scheduledDate) || a.bookingId - b.bookingId : b.bookingId - a.bookingId);
    data = { ...data, items: filtered.slice(page * 20, (page + 1) * 20), hasNext: filtered.length > (page + 1) * 20,
      coverImages: covers, summary: { counts, upcoming, ended: items.length - counts.PENDING - upcoming } };
  }

  const rooms = { ...data.rooms };
  const missing = [...new Map(data.items.filter(item => !rooms[item.roomTypeId]).map(item => [item.roomTypeId, item])).values()];
  // Bounded concurrency; only public detail endpoints may enrich the cards.
  for (let start = 0; start < missing.length; start += 4) {
    const result = await Promise.allSettled(missing.slice(start, start + 4).map(async item => {
      const detail = await accommodationApi.detail(item.propertyId, item.roomTypeId, signal);
      rooms[item.roomTypeId] = { price: detail.price, areaSqm: detail.areaSqm, address: detail.address };
    }));
    if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
    // Missing/private rooms must not hide the user's appointment or fabricate metadata.
    result.forEach((entry, index) => { if (entry.status === 'rejected') rooms[missing[start + index].roomTypeId] = { unavailable: true }; });
  }
  return { ...data, rooms };
}
