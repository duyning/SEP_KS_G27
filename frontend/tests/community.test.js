import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { communityApi, editPostPrice, formatPostPrice, hasPostDraftChanges, parsePostPrice, postPayload, validatePost } from '../src/services/community.js';

const original = { fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage };
globalThis.sessionStorage = { getItem: () => 'user-token' };
globalThis.localStorage = { getItem: () => null };
after(() => Object.assign(globalThis, original));
const valid = { type: 'ROOM_TRANSFER', title: 'Nhượng phòng gần Đại học FPT', content: 'Phòng khép kín có ban công, sạch sẽ và đầy đủ tiện nghi.', price: '2.200.000', location: 'Tân Xã, Hòa Lạc', authorName: 'Nguyễn Văn An', authorPhone: '0912 345 678' };
const saved = { ...postPayload(valid), id: 12, status: 'PENDING', createdAt: '2026-10-27T09:00:00', decisionNote: null };
const reply = data => new Response(JSON.stringify({ success: true, data }));

test('reply and edit calls preserve the targeted post and comment IDs', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12/comments/5/replies');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { content: 'Mình nhận nhé.' });
    return reply({ id: 6, parentId: 5, content: 'Mình nhận nhé.' });
  };
  assert.equal((await communityApi.reply(12, 5, 'Mình nhận nhé.')).parentId, 5);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12/comments/6');
    assert.equal(options.method, 'PUT');
    return reply({ id: 6, content: 'Chiều mai nhé.', updatedAt: '2026-10-28T15:00:00' });
  };
  assert.ok((await communityApi.updateComment(12, 6, 'Chiều mai nhé.')).updatedAt);
  globalThis.fetch = async url => {
    assert.equal(url, '/api/community/posts/12/comments/5/replies?page=1&size=20');
    return reply({ content: [], page: 1, totalElements: 21, totalPages: 2, commentCount: 25 });
  };
  const replies = await communityApi.replies(12, 5, 1);
  assert.equal(replies.commentCount, 25);
  assert.equal(replies.totalElements, 21);
});

test('published posts retain backend comment counts and reject invalid totals', async () => {
  globalThis.fetch = async () => reply([{ ...saved, status: 'APPROVED', commentCount: 7 }]);
  assert.equal((await communityApi.published())[0].commentCount, 7);
  globalThis.fetch = async () => reply([{ ...saved, status: 'APPROVED', commentCount: -1 }]);
  await assert.rejects(communityApi.published(), /Số bình luận không hợp lệ/);
});

test('comments are paged per post and submission sends only comment text', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12/comments?page=1&size=20');
    return reply({ content: [], page: 1, totalElements: 21, totalPages: 2 });
  };
  assert.equal((await communityApi.comments(12, 1)).totalElements, 21);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12/comments');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { content: 'Bàn còn không?' });
    return reply({ id: 1, content: 'Bàn còn không?' });
  };
  assert.equal((await communityApi.addComment(12, 'Bàn còn không?')).id, 1);
});

test('all categories require usable content and contact information', () => {
  for (const type of ['ROOM_TRANSFER', 'ROOMMATE', 'SECOND_HAND']) assert.deepEqual(validatePost({ ...valid, type }), {});
  const errors = validatePost({ type: 'OTHER', title: '   ', content: 'Short', location: '', authorName: '', authorPhone: '123', price: '-10' });
  for (const key of ['type', 'title', 'content', 'location', 'authorName', 'authorPhone', 'price']) assert.ok(errors[key], key);
  assert.ok(validatePost({ ...valid, content: 'x'.repeat(5001) }).content);
  assert.ok(validatePost({ ...valid, title: 'x'.repeat(201) }).title);
  assert.ok(validatePost({ ...valid, location: 'x'.repeat(256) }).location);
  assert.ok(validatePost({ ...valid, authorName: 'x'.repeat(101) }).authorName);
});

test('closing only warns for remaining draft changes, not erased input or price formatting', () => {
  const initial = { type: 'ROOM_TRANSFER', title: '', content: '', price: '', location: '', authorName: 'Tên điền sẵn', authorPhone: '0912345678' };
  assert.equal(hasPostDraftChanges({ ...initial }, initial), false);
  assert.equal(hasPostDraftChanges({ ...initial, title: 'a' }, initial), true);
  assert.equal(hasPostDraftChanges({ ...initial, title: '', price: '' }, initial), false);
  assert.equal(hasPostDraftChanges({ ...initial, title: '', content: 'Còn nội dung' }, initial), true);
  assert.equal(hasPostDraftChanges({ ...initial, authorName: '', authorPhone: '' }, initial), false);
  assert.equal(hasPostDraftChanges({ ...initial, type: 'SECOND_HAND' }, initial), true);
  const existing = { ...initial, title: 'Bài cần sửa', price: '120.000' };
  assert.equal(hasPostDraftChanges({ ...existing, price: '120000' }, existing, true), false);
  assert.equal(hasPostDraftChanges({ ...existing, title: '' }, existing, true), true);
  assert.equal(hasPostDraftChanges({ ...existing }, existing, true), false);
  assert.equal(hasPostDraftChanges({ ...initial, photos: [new File(['photo'], 'a.png')] }, initial), true);
  assert.equal(hasPostDraftChanges({ ...initial, photos: [], retainedImageIds: [] }, initial), false);
  assert.equal(hasPostDraftChanges({ ...existing, retainedImageIds: [] }, { ...existing, retainedImageIds: [4] }, true), true);
  assert.equal(hasPostDraftChanges({ ...initial, videos: [new File(['video'], 'a.mp4')] }, initial), true);
  assert.equal(hasPostDraftChanges({ ...existing, retainedVideoIds: [] }, { ...existing, retainedVideoIds: [5] }, true), true);
});

test('submission sends photos as multipart and preserves retained image IDs on edits', async () => {
  const photo = new File(['image-content'], 'test.png', { type: 'image/png' });
  const values = { ...valid, retainedImageIds: [3] };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12');
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers['Content-Type'], undefined, 'Browser must choose the multipart boundary');
    assert.ok(options.body instanceof FormData);
    assert.deepEqual(JSON.parse(await options.body.get('details').text()), postPayload(values));
    assert.equal(options.body.getAll('photos').length, 1);
    assert.equal(options.body.get('photos').name, 'test.png');
    return reply({ ...saved, images: [{ id: 3, fileName: 'test.png' }] });
  };
  assert.equal((await communityApi.submit(postPayload(values), undefined, 12, [photo])).images[0].id, 3);
});

test('video-only and mixed submissions use multipart videos and preserve video IDs', async () => {
  const video = new File(['video-content'], 'clip.mp4', { type: 'video/mp4' });
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' });
  for (const photos of [[], [photo]]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/community/posts');
      assert.equal(options.method, 'POST');
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.body.getAll('videos').length, 1);
      assert.equal(options.body.get('videos').name, 'clip.mp4');
      assert.equal(options.body.getAll('photos').length, photos.length);
      assert.deepEqual(JSON.parse(await options.body.get('details').text()).retainedVideoIds, []);
      return reply({ ...saved, videos: [{ id: 8, fileName: 'clip.mp4' }] });
    };
    assert.equal((await communityApi.submit(postPayload({ ...valid, retainedVideoIds: [] }), undefined, null, photos, [video])).videos[0].id, 8);
  }
});

test('VND parsing accepts whole grouped amounts without silently altering decimals', () => {
  assert.equal(formatPostPrice('2200000'), '2.200.000');
  assert.equal(formatPostPrice('2.200.000'), '2.200.000');
  assert.equal(formatPostPrice('0002200'), '2.200');
  assert.equal(formatPostPrice(0), '0');
  assert.equal(formatPostPrice(null), '');
  assert.equal(formatPostPrice('1.5'), '1.5');
  assert.equal(parsePostPrice('2.200.000'), 2200000);
  assert.equal(parsePostPrice('2200000'), 2200000);
  assert.equal(parsePostPrice(''), null);
  for (const value of ['1.5', '1,5', '1e6', '-100', '12abc', '2..200', '2.200.00', 'Infinity']) assert.ok(Number.isNaN(parsePostPrice(value)), value);
  assert.ok(validatePost({ ...valid, price: '1000000001' }).price);
  assert.ok(validatePost({ ...valid, price: '0' }).price);
  assert.deepEqual(validatePost({ ...valid, type: 'SECOND_HAND', price: '0' }), {});
  assert.deepEqual(validatePost({ ...valid, price: '' }), {});
  assert.equal(postPayload(valid).authorPhone, '0912345678');
  assert.equal(postPayload(valid).price, 2200000);
  assert.equal(postPayload({ ...valid, price: formatPostPrice('2200000') }).price, 2200000);
});

test('price edits keep 120000 digits in order and allow deleting all groups without event metadata', () => {
  let current = { value: '', caret: 0 };
  for (const digit of '120000') {
    const raw = current.value.slice(0, current.caret) + digit + current.value.slice(current.caret);
    current = editPostPrice(current.value, raw, current.caret + 1);
  }
  assert.deepEqual(current, { value: '120.000', caret: 7 });
  for (const expected of ['12.000', '1.200', '120', '12', '1', '']) {
    const raw = current.value.slice(0, current.caret - 1) + current.value.slice(current.caret);
    current = editPostPrice(current.value, raw, current.caret - 1);
    assert.equal(current.value, expected);
  }
  assert.deepEqual(editPostPrice('12.000', '12000', 2), { value: '12.000', caret: 2 });
  assert.deepEqual(editPostPrice('12.000', '129.000', 3), { value: '129.000', caret: 3 });
  assert.equal(editPostPrice('120.000', '1.5', 3).value, '1.5', 'Invalid decimal paste must still be rejected by validation');
});

test('submission persists via authenticated API and only accepts PENDING', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer user-token');
    assert.deepEqual(JSON.parse(options.body), postPayload(valid));
    return reply(saved);
  };
  assert.equal((await communityApi.submit(postPayload(valid))).status, 'PENDING');
  globalThis.fetch = async () => reply({ ...saved, status: 'APPROVED' });
  await assert.rejects(communityApi.submit(postPayload(valid)), error => error.status === 502);
});

test('public feed rejects unapproved records and never falls back to fixtures on errors', async () => {
  globalThis.fetch = async url => { assert.equal(url, '/api/community/posts'); return reply([saved]); };
  await assert.rejects(communityApi.published(), error => error.status === 502);
  globalThis.fetch = async () => reply([{ ...saved, status: 'APPROVED' }]);
  assert.equal((await communityApi.published())[0].priceDisplay, '2.200.000 đ/tháng');
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Unavailable' }), { status: 500 });
  await assert.rejects(communityApi.published(), error => error.status === 500);
  globalThis.fetch = async () => reply({});
  await assert.rejects(communityApi.moderation(), error => error.status === 502);
});

test('author resubmission and staff reviews use the actual record and preserve server errors', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12');
    assert.equal(options.method, 'PUT');
    return reply(saved);
  };
  await communityApi.submit(postPayload(valid), undefined, 12);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/staff/community/posts/12/review');
    assert.deepEqual(JSON.parse(options.body), { decision: 'REQUEST_CHANGES', note: 'Bổ sung thông tin liên hệ.' });
    return reply({ post: { ...saved, status: 'NEED_CHANGES' }, accountName: 'Real account', history: [] });
  };
  assert.equal((await communityApi.review(12, 'REQUEST_CHANGES', 'Bổ sung thông tin liên hệ.')).post.status, 'NEED_CHANGES');
  globalThis.fetch = async () => { throw new Error('Invalid IDs must not issue requests'); };
  for (const id of [null, 'abc', '0', '-1', 'POST-2026-001']) await assert.rejects(communityApi.detail(undefined, id), error => error.status === 400);
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Invalid', data: { authorPhone: 'SĐT không hợp lệ.' } }), { status: 400 });
  await assert.rejects(communityApi.submit(postPayload(valid)), error => error.fields.authorPhone === 'SĐT không hợp lệ.');
});

test('deletion uses the authenticated post endpoint and propagates denied or failed requests', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/community/posts/12');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.headers.Authorization, 'Bearer user-token');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.body, undefined);
    return reply(null);
  };
  assert.equal(await communityApi.remove(12, controller.signal), null);
  globalThis.fetch = async () => { throw new Error('Invalid IDs must not issue requests'); };
  for (const id of [null, 'abc', '0', '-1']) await assert.rejects(communityApi.remove(id), error => error.status === 400);
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Không tìm thấy bài viết của bạn.' }), { status: 404 });
  await assert.rejects(communityApi.remove(12), error => error.status === 404 && error.message === 'Không tìm thấy bài viết của bạn.');
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  await assert.rejects(communityApi.remove(12), error => error.status === 0);
});
