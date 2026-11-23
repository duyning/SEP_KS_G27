import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { viewingApi } from '../src/services/viewings.js';

const original = { fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage };
globalThis.sessionStorage = { getItem: () => 'member-token' };
globalThis.localStorage = { getItem: () => null };
after(() => Object.assign(globalThis, original));

test('member search and ordering are sent to the paged server query', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url, 'http://localhost');
    assert.equal(parsed.pathname, '/api/viewings');
    assert.equal(parsed.searchParams.get('page'), '2');
    assert.equal(parsed.searchParams.get('status'), 'PENDING');
    assert.equal(parsed.searchParams.get('q'), 'An Khang');
    assert.equal(parsed.searchParams.get('sort'), 'appointment');
    assert.equal(options.headers.Authorization, 'Bearer member-token');
    assert.equal(options.signal, controller.signal);
    return new Response(JSON.stringify({ success: true, data: { items: [], hasNext: false, summary: { upcoming: 2 } } }));
  };
  const result = await viewingApi.list(2, 'PENDING', controller.signal, { q: 'An Khang', sort: 'appointment' });
  assert.equal(result.summary.upcoming, 2);
});

test('existing callers keep the original list request without extra filters', async () => {
  globalThis.fetch = async url => {
    assert.equal(url, '/api/viewings?page=0');
    return new Response(JSON.stringify({ success: true, data: { items: [], hasNext: false } }));
  };
  assert.deepEqual(await viewingApi.list(0, ''), { items: [], hasNext: false });
});
