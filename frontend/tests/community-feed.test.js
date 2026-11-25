import test from 'node:test';
import assert from 'node:assert/strict';
import { readFeedFilters, appendFeedPosts, retryFeedRead } from '../src/services/community-feed.js';
import { communityApi } from '../src/services/community.js';

test('feed background read retries temporary failures without accepting empty success or retrying access errors',async()=>{
  const waits=[];let calls=0;const data={items:[{id:8}]};
  assert.equal(await retryFeedRead(async()=>{if(++calls<3)throw Object.assign(new Error('Temporary'),{status:503});return data;},new AbortController().signal,async ms=>waits.push(ms)),data);
  assert.equal(calls,3);assert.deepEqual(waits,[500,1500]);
  for(const status of [400,401,403,404]){calls=0;await assert.rejects(retryFeedRead(async()=>{calls++;throw Object.assign(new Error('Denied'),{status});},null,async()=>assert.fail('Access failures must not retry')));assert.equal(calls,1);}
  calls=0;await assert.rejects(retryFeedRead(async()=>{calls++;throw Object.assign(new Error('Unavailable'),{status:0});},null,async()=>{}));assert.equal(calls,3);
});

test('changing feed scope aborts the retry before another request is sent',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(retryFeedRead(async()=>{calls++;throw Object.assign(new Error('Network'),{status:0});},controller.signal,async()=>controller.abort()),error=>error.name==='AbortError');
  assert.equal(calls,1);
});

test('feed filters preserve supported URL values and reject unknown filter choices', () => {
  assert.deepEqual(readFeedFilters(new URLSearchParams('category=ROOMMATE&q=điều+hòa&location=tan-xa&sort=price-asc')),
    { category: 'ROOMMATE', q: 'điều hòa', location: 'tan-xa', sort: 'price-asc' });
  assert.deepEqual(readFeedFilters(new URLSearchParams('category=bad&location=bad&sort=bad&page=20')),
    { category: 'ALL', q: '', location: 'all', sort: 'newest' });
});

test('appending feed batches preserves order and removes duplicated IDs', () => {
  const existing = [{ id: 8 }, { id: 7 }];
  assert.deepEqual(appendFeedPosts(existing, [{ id: 7 }, { id: 6 }, { id: 6 }]).map(post => post.id), [8, 7, 6]);
  assert.equal(existing.length, 2);
});

test('feed API sends the cursor with filters and rejects unapproved public posts or repeated cursors', async () => {
  globalThis.localStorage = { getItem: () => null };
  globalThis.sessionStorage = { getItem: () => null };
  const counts = { ALL: 1, ROOMMATE: 1, ROOM_TRANSFER: 0, SECOND_HAND: 0 };
  const saved = { id: 1, type: 'ROOMMATE', title: 'Tìm người ở ghép', content: 'Phòng có điều hòa',
    authorName: 'Người đăng', status: 'APPROVED', price: null };
  const reply = data => new Response(JSON.stringify({ success: true, data }), { status: 200 });
  globalThis.fetch = async url => {
    const params = new URL(url, 'https://local.test').searchParams;
    assert.equal(params.get('q'), 'điều hòa');
    assert.equal(params.get('cursor'), 'next');
    return reply({ items: [saved], hasMore: false, nextCursor: null, counts });
  };
  assert.equal((await communityApi.feed({ q: 'điều hòa', cursor: 'next' })).items[0].id, 1);
  globalThis.fetch = async () => reply({ items: [{ ...saved, status: 'PENDING' }], hasMore: false, nextCursor: null, counts });
  await assert.rejects(communityApi.feed(), error => error.status === 502);
  globalThis.fetch = async () => reply({ items: [], hasMore: true, nextCursor: 'next', counts });
  await assert.rejects(communityApi.feed({ cursor: 'next' }), error => error.status === 502);
});
