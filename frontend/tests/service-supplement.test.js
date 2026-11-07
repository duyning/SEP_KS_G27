import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceRegistrationApi, validateServiceRegistration } from '../src/services/service-registration.js';
import { serviceReviewApi } from '../src/services/service-review.js';

test('supplement keeps private evidence via IDs and submits the same application revision', async () => {
  const saved = [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage];
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => 'owner-token' };
  const form = { applicantName: 'Nguyễn An', categoryId: 1, serviceName: 'Dọn dẹp trọ', description: 'Dọn dẹp phòng trọ tại khu vực Hòa Lạc.', serviceArea: 'Tân Xã', contactPhone: '0987654321', pricingType: 'NEGOTIABLE', price: null };
  const payload = { details: form, retainedDocumentIds: [10], note: 'Đã bổ sung mô tả dịch vụ.', revision: 1 };
  assert.equal(validateServiceRegistration(form, [], 1), '');
  assert.ok(validateServiceRegistration(form, [], 0));
  assert.ok(validateServiceRegistration(form, [{ type: 'application/pdf', size: 100, name: 'a.pdf' }], 5));
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/service-registrations/4/resubmit');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer owner-token');
      assert.deepEqual(JSON.parse(await options.body.get('details').text()), payload);
      assert.equal(options.body.getAll('documents').length, 0);
      return { ok: true, status: 200, json: async () => ({ success: true, data: { registrationId: 4, serviceName: form.serviceName, status: 'PENDING', documents: [{ documentId: 10 }], revision: 2 } }) };
    };
    assert.equal((await serviceRegistrationApi.resubmit(4, payload, [])).revision, 2);
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ success: false, message: 'Hồ sơ đã thay đổi' }) });
    await assert.rejects(serviceRegistrationApi.resubmit(4, payload, []), error => error.status === 409);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/staff/service-applications/4/supplement-request');
      assert.deepEqual(JSON.parse(options.body), { reason: 'Bổ sung giấy phép kinh doanh.', revision: 2 });
      return { ok: true, status: 200, json: async () => ({ success: true, data: { application: { registrationId: 4, serviceName: 'Dịch vụ', documents: [], status: 'NEEDS_SUPPLEMENT' }, history: [] } }) };
    };
    assert.equal((await serviceReviewApi.supplement(4, 'Bổ sung giấy phép kinh doanh.', 2)).application.status, 'NEEDS_SUPPLEMENT');
  } finally { [globalThis.fetch, globalThis.sessionStorage, globalThis.localStorage] = saved; }
});
