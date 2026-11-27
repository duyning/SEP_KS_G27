import test from 'node:test';
import assert from 'node:assert/strict';
import { accommodationQuery } from '../src/services/accommodations.js';
import { comparisonRows } from '../src/services/room-comparison.js';
import { SEARCH_CAMPUSES, formatDistance, parseSearchOrigin, readSearchOrigin, searchCampusForOrigin, withSearchOrigin } from '../src/services/search-origin.js';
import { readSearchFilters, updateSearchFilters } from '../src/services/search-prototype.js';

test('a change of origin resets paging and preserves filters across routes', () => {
  const old = new URLSearchParams('page=3&price=15-25&availableOnly=true&compare=7,8');
  const origin = parseSearchOrigin('0', '105.52522');
  const next = updateSearchFilters(old, { ...origin, radiusKm: 1, sort: 'nearest' });
  const filters = readSearchFilters(next);
  assert.equal(filters.page, 1);
  assert.deepEqual(readSearchOrigin(next), origin);
  const request = new URLSearchParams(accommodationQuery(filters));
  for (const [key, value] of Object.entries({ originLat: '0', originLng: '105.52522', radiusKm: '1',
    sort: 'nearest', price: '15-25', availableOnly: 'true' })) assert.equal(request.get(key), value);
  assert.equal(next.get('compare'), '7,8');
  const detail = withSearchOrigin('/properties/detail?propertyId=1&roomTypeId=2#host-contact', origin);
  assert.equal(detail, '/properties/detail?propertyId=1&roomTypeId=2&originLat=0&originLng=105.52522#host-contact');
  const cleared = readSearchFilters(updateSearchFilters(next, { originLat: null, originLng: null, radiusKm: null }));
  assert.equal(cleared.sort, 'newest');
  assert.equal(cleared.radiusKm, undefined);
});

test('invalid and missing coordinates never become zero-distance results', () => {
  for (const [lat, lng] of [[null, 0], ['', 0], ['NaN', 0], [90.01, 0], [0, -181], ['0x12', 0]]) {
    assert.equal(parseSearchOrigin(lat, lng), null);
  }
  assert.deepEqual(parseSearchOrigin(-90, 180), { originLat: -90, originLng: 180 });
  const data = distanceKm => ({ status: 'ready', data: { distanceKm, amenities: [], propertyAmenities: [] } });
  const row = comparisonRows([data(0), data(1.2345), data(null)]).find(item => item.key === 'distanceKm');
  assert.deepEqual(row.cells.map(cell => cell.text), ['0 km', '1,23 km', 'Chưa có dữ liệu']);
  assert.equal(row.cells[1].text, formatDistance(1.2345));
});

test('campus labels are recovered from shared coordinates without replacing a custom pin', () => {
  for (const campus of SEARCH_CAMPUSES) {
    const url = withSearchOrigin('/map?radiusKm=3&price=15-25', campus.origin);
    const params = new URL(url, 'http://example.test').searchParams;
    assert.equal(searchCampusForOrigin(readSearchOrigin(params)), campus);
    assert.equal(readSearchFilters(params).radiusKm, 3);
  }
  assert.equal(searchCampusForOrigin(parseSearchOrigin('21.0135', '105.5265')), undefined);
});
