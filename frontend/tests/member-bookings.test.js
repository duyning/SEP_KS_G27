import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { viewingApi } from '../src/services/viewings.js';
import { accommodationApi } from '../src/services/accommodations.js';
import { fetchMemberBookings } from '../src/services/member-bookings.js';

const original = { list: viewingApi.list, detail: accommodationApi.detail };
after(() => { viewingApi.list = original.list; accommodationApi.detail = original.detail; });
const item = (id, status, type = 'Studio') => ({ bookingId: id, status, propertyId: 1, roomTypeId: id === 2 ? 2 : 1,
  propertyName: 'Green house', roomType: type, scheduledDate: '2100-01-01T10:00:00' });

test('modern response keeps server totals and needs no extra requests', async () => {
  const data = { items: [item(1, 'PENDING')], summary: { counts: { PENDING: 35 }, upcoming: 3, ended: 8 }, rooms: { 1: { price: 2000000 } } };
  let calls = 0;
  viewingApi.list = async () => { calls++; return data; };
  accommodationApi.detail = async () => assert.fail('Unexpected public detail request');
  const result = await fetchMemberBookings(0, '');
  assert.equal(calls, 1);
  assert.equal(result.summary.counts.PENDING, 35);
});

test('older responses count every page before filtering and enrich room metadata once', async () => {
  const pages = [{ items: [item(3, 'PENDING'), item(2, 'CANCELLED', 'Bình thường')], hasNext: true },
    { items: [item(1, 'APPROVED')], hasNext: false }];
  viewingApi.list = async page => pages[page];
  let details = 0;
  accommodationApi.detail = async (propertyId, roomTypeId) => { details++; assert.equal(roomTypeId, 1); return { price: 3500000, areaSqm: 34, address: 'Tân Xã' }; };
  const result = await fetchMemberBookings(0, '', undefined, { q: 'Studio', sort: 'oldest' });
  assert.deepEqual(result.items.map(p => p.bookingId), [1, 3]);
  assert.deepEqual(result.summary.counts, { PENDING: 1, APPROVED: 1, REJECTED: 0, CANCELLED: 1 });
  assert.equal(result.summary.upcoming, 1);
  assert.equal(result.summary.ended, 1);
  assert.equal(result.rooms[1].price, 3500000);
  assert.equal(details, 1);
});

test('unavailable public details preserve appointments without invented values', async () => {
  viewingApi.list = async () => ({ items: [item(1, 'PENDING')], hasNext: false });
  accommodationApi.detail = async () => { throw new Error('No longer public'); };
  const result = await fetchMemberBookings(0, '');
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.rooms[1], { unavailable: true });
  assert.equal(result.summary.counts.PENDING, 1);
});

test('a backend repeating pages cannot silently produce partial totals', async () => {
  viewingApi.list = async () => ({ items: [item(1, 'PENDING')], hasNext: true });
  await assert.rejects(fetchMemberBookings(0, ''), /Không thể tải đủ lịch/);
});
