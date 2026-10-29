import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceRegistrationApi, validateServiceRegistration } from '../src/services/service-registration.js';

const form = { applicantName: 'Nguyễn Văn An', categoryId: '1', serviceName: 'Chuyển trọ sinh viên', description: 'Dịch vụ chuyển trọ quanh khu vực Hòa Lạc.', pricingType: 'FIXED', price: '150000', serviceArea: 'Tân Xã', contactPhone: '0987654321' };
const file = { name: 'license.pdf', type: 'application/pdf', size: 1024 };
test('service registration validates pricing and required evidence', () => {
  assert.equal(validateServiceRegistration(form, [file]), '');
  assert.equal(validateServiceRegistration({ ...form, pricingType: 'NEGOTIABLE', price: '' }, [file]), '');
  for (const price of ['', '-1', '0', 'abc', '100.123', '10000000000']) assert.ok(validateServiceRegistration({ ...form, price }, [file]));
  assert.ok(validateServiceRegistration({ ...form, contactPhone: '123' }, [file]));
  assert.ok(validateServiceRegistration({ ...form, categoryId: '' }, [file]));
  assert.ok(validateServiceRegistration(form, []));
  assert.ok(validateServiceRegistration(form, Array(6).fill(file)));
  assert.ok(validateServiceRegistration(form, [{ ...file, size: 11 * 1024 * 1024 }]));
  assert.ok(validateServiceRegistration(form, [{ ...file, type: 'text/html' }]));
});

test('submission sends multipart evidence and refuses unconfirmed success', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalSession = globalThis.sessionStorage;
  const originalLocal = globalThis.localStorage;
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'test-token' };
  globalThis.window = { dispatchEvent() {} };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-registrations');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(JSON.parse(await options.body.get('details').text()).serviceName, form.serviceName);
      assert.equal(options.body.getAll('documents').length, 1);
      return { ok: true, status: 201, json: async () => ({ success: true, data: { registrationId: 42, serviceName: form.serviceName, status: 'PENDING', documents: [{ documentId: 1 }] } }) };
    };
    const result = await serviceRegistrationApi.submit(form, [new File(['%PDF-1.4'], 'license.pdf', { type: 'application/pdf' })]);
    assert.equal(result.registrationId, 42);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) });
    await assert.rejects(serviceRegistrationApi.submit(form, []), error => error.status === 502);
    await assert.rejects(serviceRegistrationApi.current(), error => error.status === 502);
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ success: false, message: 'Hồ sơ đang chờ duyệt' }) });
    await assert.rejects(serviceRegistrationApi.submit(form, []), error => error.status === 409);
  } finally {
    globalThis.fetch = originalFetch; globalThis.window = originalWindow;
    globalThis.sessionStorage = originalSession; globalThis.localStorage = originalLocal;
  }
});
