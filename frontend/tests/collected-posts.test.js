import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { collectedPostsApi } from '../src/services/collected-posts.js';

const original = { fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage };
globalThis.sessionStorage = { getItem: () => 'staff-token' };
globalThis.localStorage = { getItem: () => null };
after(() => Object.assign(globalThis, original));
const reply = data => new Response(JSON.stringify({ success: true, data }));

test('public lazy feed uses cursor without sending a platform token', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/public/collected-posts?before=42');
    assert.equal(options.headers.Authorization, undefined);
    return reply({ posts: [{ id: 41 }], nextCursor: null });
  };
  const result = await collectedPostsApi.feed({ before: 42 });
  assert.equal(result.posts[0].id, 41);
  assert.equal(result.nextCursor, null);
});

test('drafts and publish selection use authenticated staff endpoints', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer staff-token');
    if (calls++ === 0) {
      assert.equal(url, '/api/staff/collected-posts?published=false');
      return reply({ posts: [], nextCursor: null });
    }
    assert.equal(url, '/api/staff/collected-posts/publish');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { postIds: [12, 13] });
    return reply(2);
  };
  await collectedPostsApi.feed({ staff: true });
  assert.equal(await collectedPostsApi.publish([12, 13], true), 2);
});

test('scrape failures remain visible and cancellation signal reaches fetch', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/staff/collected-posts/scrape');
    assert.equal(options.signal, controller.signal);
    assert.deepEqual(JSON.parse(options.body), { groupUrl: 'https://www.facebook.com/groups/hoalac' });
    return new Response(JSON.stringify({ success: false, message: 'Phiên Facebook hết hạn' }), { status: 502 });
  };
  await assert.rejects(collectedPostsApi.scrape('https://www.facebook.com/groups/hoalac', controller.signal), error => error.status === 502 && error.message.includes('hết hạn'));
});

test('delete is a staff-only server mutation and preserves errors', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/staff/collected-posts/42');
    assert.equal(options.headers.Authorization, 'Bearer staff-token');
    assert.equal(options.method, 'DELETE');
    return new Response(JSON.stringify({ success: false, message: 'Không có quyền' }), { status: 403 });
  };
  await assert.rejects(collectedPostsApi.remove(42), error => error.status === 403);
});
