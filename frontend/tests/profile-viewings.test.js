import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { viewingApi } from '../src/services/viewings.js';
import { fetchProfileViewings, upcomingViewings } from '../src/services/profile-viewings.js';

const originalList = viewingApi.list;
afterEach(() => { viewingApi.list = originalList; });
const now = Date.parse('2026-11-25T10:00:00+07:00');
const item = (bookingId, status, scheduledDate) => ({ bookingId, status, scheduledDate });

test('profile shows only future active appointments, nearest first, using Vietnam time for local timestamps', () => {
  const items = [item(3, 'APPROVED', '2026-11-25T12:00:00'), item(2, 'PENDING', '2026-11-25T11:00:00'),
    item(1, 'APPROVED', '2026-11-25T04:00:00Z'), item(4, 'PENDING', '2026-11-25T10:00:00'),
    item(5, 'APPROVED', '2026-11-24T15:00:00'), item(6, 'CANCELLED', '2026-11-26T11:00:00'),
    item(7, 'REJECTED', '2026-11-26T11:00:00'), item(8, 'PENDING', 'invalid'), item(9, 'PENDING', null)];
  assert.deepEqual(upcomingViewings(items, now).map(row => row.bookingId), [1, 2, 3]);
  assert.equal(items[0].bookingId, 3, 'Source API array is not mutated');
  assert.deepEqual(upcomingViewings(items, now + 2 * 3600_000), []);
});

test('profile reads all pages of both active statuses even when the first page has only old appointments', async () => {
  const calls = [];
  viewingApi.list = async (page, status, signal, options) => {
    calls.push({ page, status, sort: options.sort });
    if (status === 'PENDING') return page === 0
      ? { items: [item(1, status, '2026-11-01T10:00:00')], hasNext: true }
      : { items: [item(2, status, '2026-11-26T10:00:00')], hasNext: false };
    return { items: [item(3, status, '2026-11-27T10:00:00')], hasNext: false };
  };
  const result = upcomingViewings(await fetchProfileViewings(), now);
  assert.deepEqual(result.map(row => row.bookingId), [2, 3]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => ['PENDING', 'APPROVED'].includes(call.status) && call.sort === 'appointment'));
});

test('profile does not show a partial successful list when an active-status request fails', async () => {
  viewingApi.list = async (_page, status) => {
    if (status === 'APPROVED') throw new Error('Mất kết nối');
    return { items: [item(1, status, '2026-11-26T10:00:00')], hasNext: false };
  };
  await assert.rejects(fetchProfileViewings(), /Mất kết nối/);
});

test('profile stops pagination if a server repeats a full page', async () => {
  viewingApi.list = async () => ({ items: [item(1, 'PENDING', '2026-11-26T10:00:00')], hasNext: true });
  await assert.rejects(fetchProfileViewings(), /Không thể tải đủ/);
});

test('profile cancels obsolete loads without issuing requests', async () => {
  const controller = new AbortController(); controller.abort();
  viewingApi.list = async () => { assert.fail('An aborted request must not start'); };
  await assert.rejects(fetchProfileViewings(controller.signal), { name: 'AbortError' });
});
