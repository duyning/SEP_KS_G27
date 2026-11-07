import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceRegistrationApi, validateServiceRegistration, validateServiceRegistrationFields, serviceRegistrationFieldErrors } from '../src/services/service-registration.js';

const form = { applicantName: 'Nguyễn Văn An', categoryId: '1', serviceName: 'Chuyển trọ sinh viên', description: 'Dịch vụ chuyển trọ quanh khu vực Hòa Lạc.', pricingType: 'FIXED', price: '150000', serviceArea: 'Tân Xã', contactPhone: '0987654321' };
const file = { name: 'license.pdf', type: 'application/pdf', size: 1024 };

test('field validation returns every correction without discarding valid input', () => {
  const errors = validateServiceRegistrationFields({ ...form, description: 'Chưa đủ nội dung', contactPhone: '123', contactEmail: 'sai-email' }, [], { imageRequired: true });
  assert.deepEqual(Object.keys(errors), ['image', 'description', 'contactPhone', 'contactEmail', 'documents']);
  assert.match(errors.description, /20 đến 5000 ký tự/);
  assert.equal(form.description, 'Dịch vụ chuyển trọ quanh khu vực Hòa Lạc.');
  assert.deepEqual(validateServiceRegistrationFields(form, [], { retainedCount: 1, noteRequired: true, note: 'Cập nhật mô tả dịch vụ.' }), {});
  assert.ok(validateServiceRegistrationFields(form, [file], { noteRequired: true }).note);
  assert.ok(validateServiceRegistrationFields(form, [file], { categories: [{ categoryId: 2 }] }).categoryId);
  assert.ok(validateServiceRegistrationFields(form, [file], { image: { ...file, type: 'image/png', size: 0 } }).image);
  const image = { name: 'photo.png', type: 'image/png', size: 100 };
  assert.deepEqual(validateServiceRegistrationFields(form, [file], { image: [image, image], imageRequired: true }), {});
  assert.ok(validateServiceRegistrationFields(form, [file], { image: [], imageRequired: true }).image);
  assert.ok(validateServiceRegistrationFields(form, [file], { image: Array(6).fill(image) }).image);
  assert.ok(validateServiceRegistrationFields(form, [file], { image: [image, { ...image, size: 6 * 1024 * 1024 }] }).image);
});

test('duplicate-name conflicts belong to the name field; stale conflicts stay global', () => {
  for (const message of ['Tên dịch vụ đã có trong danh sách của bạn.', 'Bạn đã có dịch vụ khác trùng tên.', 'Bạn đã có yêu cầu đang xử lý cho tên dịch vụ này.']) {
    assert.deepEqual(serviceRegistrationFieldErrors({ status: 409, message }), { serviceName: message });
  }
  assert.deepEqual(serviceRegistrationFieldErrors({ status: 409, message: 'Hồ sơ đã thay đổi hoặc không còn chờ bổ sung.' }), {});
  assert.deepEqual(serviceRegistrationFieldErrors({ status: 400, fields: { 'details.contactPhone': 'Số điện thoại không hợp lệ.' } }), { contactPhone: 'Số điện thoại không hợp lệ.' });
  assert.deepEqual(serviceRegistrationFieldErrors({ status: 400, message: 'Ảnh chỉ nhận JPG, PNG, WEBP đúng định dạng.' }), { image: 'Ảnh chỉ nhận JPG, PNG, WEBP đúng định dạng.' });
});
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
