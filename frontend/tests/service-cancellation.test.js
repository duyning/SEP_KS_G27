import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceRegistrationApi } from '../src/services/service-registration.js';
import { serviceReviewApi } from '../src/services/service-review.js';

test('cancellation uses the revision and validates confirmed state; both lists accept cancelled history', async () => {
  const original = { fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage };
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'test-token' };
  const row = { registrationId: 42, serviceName: 'Giặt là', status: 'CANCELLED', revision: 3, documents: [] };
  const response = data => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-registrations/42/cancel');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.deepEqual(JSON.parse(options.body), { revision: 2 });
      return response(row);
    };
    assert.deepEqual(await serviceRegistrationApi.cancel(42, 2), row);
    for (const invalid of [{ ...row, status: 'PENDING' }, { ...row, revision: 2 }, { ...row, registrationId: 43 }]) {
      globalThis.fetch = async () => response(invalid);
      await assert.rejects(serviceRegistrationApi.cancel(42, 2), error => error.status === 502);
    }
    globalThis.fetch = async () => response([row]);
    assert.deepEqual(await serviceRegistrationApi.mine(), [row]);
    assert.deepEqual(await serviceReviewApi.list(), [row]);
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ message: 'Hồ sơ đã được xử lý.' }) });
    await assert.rejects(serviceRegistrationApi.cancel(42, 2), error => error.status === 409);
  } finally {
    Object.assign(globalThis, original);
  }
});
