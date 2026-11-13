import test from 'node:test';
import assert from 'node:assert/strict';
import { vietnamSchedule, requestTime, serviceRequestsApi } from '../src/services/service-requests.js';

test('Vietnam schedules have an explicit offset independent of the browser timezone', () => {
  const value = vietnamSchedule('2099-11-20T09:00');
  assert.equal(value, '2099-11-20T09:00:00+07:00');
  assert.equal(new Date(value).toISOString(), '2099-11-20T02:00:00.000Z');
  assert.match(requestTime('2099-11-20T02:00:00Z'), /09:00/);
  assert.throws(() => vietnamSchedule('2020-01-01T09:00'), /tương lai/);
  assert.throws(() => vietnamSchedule('invalid'), /Chọn/);
});

test('request API preserves revision, uses authenticated endpoints and rejects fake success', async () => {
  const original = { fetch: globalThis.fetch, session: globalThis.sessionStorage, local: globalThis.localStorage };
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'customer-token' };
  try {
    let captured;
    const row = { requestId: 4, serviceName: 'Dọn phòng', revision: 1, status: 'ACCEPTED' };
    globalThis.fetch = async (url, options) => { captured = { url, ...options }; return { ok: true, json: async () => ({ success: true, data: row }) }; };
    await serviceRequestsApi.respond(4, { decision: 'ACCEPTED', revision: 0, reason: '' });
    assert.equal(captured.url, '/api/service-requests/4/response');
    assert.equal(captured.headers.Authorization, 'Bearer customer-token');
    assert.equal(JSON.parse(captured.body).revision, 0);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true, data: {} }) });
    await assert.rejects(serviceRequestsApi.mine(), error => error.status === 502);
    await assert.rejects(serviceRequestsApi.submit({}), error => error.status === 502);
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ message: 'Đã xử lý' }) });
    await assert.rejects(serviceRequestsApi.respond(4, { decision: 'ACCEPTED', revision: 0 }), error => error.status === 409);
  } finally { globalThis.fetch = original.fetch; globalThis.sessionStorage = original.session; globalThis.localStorage = original.local; }
});
