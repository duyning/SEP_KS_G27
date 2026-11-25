import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceFeedbackApi as api, feedbackImageError } from '../src/services/service-feedback.js';

test('rating API preserves zero stars, submits images, and rejects unconfirmed responses', async () => {
  const saved = [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage];
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'test-token' };
  const row = { ratingId: 12, stars: 0, content: 'Trải nghiệm thực tế', imageUrls: [] };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/services/7/ratings'); assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.equal(options.headers['Content-Type'], undefined);
      assert.deepEqual(JSON.parse(await options.body.get('details').text()), { stars: 0, content: 'Trải nghiệm thực tế' });
      assert.equal(options.body.getAll('image').length, 1);
      return { ok: true, status: 201, json: async () => ({ success: true, data: row }) };
    };
    assert.equal((await api.rate(7, 0, 'Trải nghiệm thực tế', [new File(['photo'], 'test.png', { type: 'image/png' })])).stars, 0);
    globalThis.fetch = async url => {
      assert.equal(url, '/api/services/7/ratings?page=0&stars=0');
      return { ok: true, status: 200, json: async () => ({ success: true, data: { items: [row], counts: [1, 0, 0, 0, 0, 0], total: 1, totalPages: 1, average: 0 } }) };
    };
    assert.equal((await api.ratings(7, 0, 0)).average, 0);
    globalThis.fetch = async () => ({ ok: true, status: 201, json: async () => ({ success: true, data: {} }) });
    await assert.rejects(api.rate(7, 0, 'Nội dung', []), e => e.status === 502);
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ success: false, message: 'Đã đánh giá' }) });
    await assert.rejects(api.rate(7, 0, 'Nội dung', []), e => e.status === 409);
  } finally { [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage] = saved; }
});

test('complaints send revision, evidence and explicit staff decisions; private photos use authentication', async () => {
  const saved = [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage];
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'owner-token' };
  const result = { complaint: { complaintId: 3, revision: 2, status: 'PENDING', responseRequested: false }, history: [], imageUrls: [] };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-complaints/3/explanation');
      assert.deepEqual(JSON.parse(await options.body.get('details').text()), { revision: 1, content: 'Giải trình giao dịch' });
      assert.equal(options.body.getAll('image').length, 0);
      return { ok: true, status: 200, json: async () => ({ success: true, data: result }) };
    };
    assert.equal((await api.explain(3, 1, 'Giải trình giao dịch', [])).complaint.status, 'PENDING');
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/staff/service-complaints/3/review');
      assert.deepEqual(JSON.parse(options.body), { revision: 2, action: 'REMOVE', content: 'Có bằng chứng vi phạm' });
      return { ok: true, status: 200, json: async () => ({ success: true, data: { ...result, complaint: { complaintId: 3, revision: 3, status: 'RESOLVED', outcome: 'REMOVE' } } }) };
    };
    await api.decide(3, 2, 'REMOVE', 'Có bằng chứng vi phạm');
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-complaints/3/images/0');
      assert.equal(options.headers.Authorization, 'Bearer owner-token');
      return { ok: true, status: 200, blob: async () => new Blob(['image']) };
    };
    assert.equal((await api.image('/api/service-complaints/3/images/0')).size, 5);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: result }) });
    await assert.rejects(api.explain(3, 2, 'Giải trình giao dịch', []), e => e.status === 502);
  } finally { [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage] = saved; }
});

test('review and evidence images enforce count, content type and size', () => {
  const file = { type: 'image/png', size: 100 };
  assert.equal(feedbackImageError([]), '');
  assert.equal(feedbackImageError(Array(5).fill(file)), '');
  assert.ok(feedbackImageError(Array(6).fill(file)));
  assert.ok(feedbackImageError([{ type: 'image/svg+xml', size: 100 }]));
  assert.ok(feedbackImageError([{ type: 'image/png', size: 0 }]));
  assert.ok(feedbackImageError([{ type: 'image/png', size: 5 * 1024 * 1024 + 1 }]));
});
