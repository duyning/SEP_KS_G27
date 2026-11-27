import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceRegistrationApi as api } from '../src/services/service-registration.js';

test('owner removal sends only revision and requires confirmed soft deletion', async () => {
  const saved = [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage];
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'owner-token' };
  const row = { registrationId: 3, serviceId: 9, serviceName: 'Service', documents: [], status: 'APPROVED', serviceState: 'DELETED', serviceRevision: 3 };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-registrations/services/9/remove');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { revision: 2 });
      return { ok: true, status: 200, json: async () => ({ success: true, data: row }) };
    };
    assert.equal((await api.remove(9, 2)).serviceState, 'DELETED');
    row.serviceState = 'ACTIVE';
    await assert.rejects(api.remove(9, 2), error => error.status === 502);
  } finally { [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage] = saved; }
});

test('service changes upload the proposed image and preserve target/version for review', async () => {
  const saved = [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage];
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'owner-token' };
  const payload = { operation: 'UPDATE', serviceRevision: 2, details: { serviceName: 'Dịch vụ đã sửa' }, note: 'Đổi ảnh và thông tin dịch vụ.' };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-registrations/services/9/changes');
      assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, 'Bearer owner-token');
      assert.deepEqual(JSON.parse(await options.body.get('details').text()), payload);
      assert.equal(options.body.get('image').name, 'cover.png');
      return { ok: true, status: 200, json: async () => ({ success: true, data: { registrationId: 3, serviceName: 'Dịch vụ đã sửa', documents: [], status: 'PENDING', targetServiceId: 9, operation: 'UPDATE' } }) };
    };
    assert.equal((await api.change(9, payload, new File(['png'], 'cover.png', { type: 'image/png' }))).status, 'PENDING');
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) });
    await assert.rejects(api.mine(), error => error.status === 502);
    await assert.rejects(api.change(9, payload), error => error.status === 502);
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ success: false, message: 'Đang có yêu cầu chờ duyệt.' }) });
    await assert.rejects(api.change(9, payload), error => error.status === 409);
  } finally { [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage] = saved; }
});
