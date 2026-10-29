import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceReviewApi, validateServiceReview } from '../src/services/service-review.js';
import { publicServicesApi } from '../src/services/public-services.js';

test('review requires two consistent decisions and an explicit reason', () => {
  const reason = 'Thông tin và giấy tờ đã được xác minh.';
  assert.equal(validateServiceReview('APPROVE', 'APPROVE', reason), '');
  assert.equal(validateServiceReview('APPROVE', 'REJECT', reason), '');
  assert.equal(validateServiceReview('REJECT', 'REJECT', reason), '');
  assert.ok(validateServiceReview('REJECT', 'APPROVE', reason));
  assert.ok(validateServiceReview('', 'APPROVE', reason));
  assert.ok(validateServiceReview('APPROVE', 'APPROVE', '  '));
});

test('review sends authenticated server mutations without assignment and rejects invalid success', async () => {
  const originalFetch = globalThis.fetch; const originalSession = globalThis.sessionStorage; const originalLocal = globalThis.localStorage;
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'staff-token' };
  const result = { application: { registrationId: 12, serviceName: 'Dịch vụ', status: 'PENDING', documents: [] }, history: [] };
  try {
    let captured;
    globalThis.fetch = async (url, options) => { captured = { url, ...options }; return { ok: true, status: 200, json: async () => ({ success: true, data: result }) }; };
    await serviceReviewApi.review(12, 'APPROVE', 'REJECT', 'Giá niêm yết chưa phù hợp.');
    assert.equal(captured.headers.Authorization, 'Bearer staff-token');
    assert.equal(captured.method, 'POST'); assert.equal(captured.url, '/api/staff/service-applications/12/review');
    assert.deepEqual(JSON.parse(captured.body), { capabilityDecision: 'APPROVE', listingDecision: 'REJECT', reason: 'Giá niêm yết chưa phù hợp.' });
    await assert.rejects(serviceReviewApi.detail('../1'), error => error.status === 400);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) });
    await assert.rejects(serviceReviewApi.review(12, 'APPROVE', 'APPROVE', 'Đã kiểm tra đầy đủ.'), error => error.status === 502);
    await assert.rejects(publicServicesApi.list(), error => error.status === 502);
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ success: false, message: 'Không tìm thấy hồ sơ dịch vụ.' }) });
    await assert.rejects(serviceReviewApi.detail(12), error => error.status === 404);
  } finally { globalThis.fetch = originalFetch; globalThis.sessionStorage = originalSession; globalThis.localStorage = originalLocal; }
});
