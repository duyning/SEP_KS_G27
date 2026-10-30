import test from 'node:test';
import assert from 'node:assert/strict';
import { publicServicesApi, servicePrice } from '../src/services/public-services.js';

test('catalogue loads database categories, filters on the server and preserves contacts and price labels', async () => {
  const previous = { fetch: globalThis.fetch, session: globalThis.sessionStorage, local: globalThis.localStorage };
  globalThis.sessionStorage = globalThis.localStorage = { getItem: () => null };
  const listing = { serviceId: 8, providerId: 21, categoryId: 3, categoryName: 'Giặt là', serviceName: 'Giặt sấy sinh viên',
    description: 'Nhận giặt sấy quần áo tại Hòa Lạc.', pricingLabel: 'Từ 15.000 VNĐ', contactPhone: '0987654321', contactEmail: 'service@example.com',
    serviceArea: 'Tân Xã', activeState: 'ACTIVE', publicEligible: true };
  let last;
  try {
    globalThis.fetch = async (url, options) => {
      last = { url, ...options };
      const data = url.endsWith('/categories') ? [{ categoryId: 3, name: 'Giặt là' }] : url.endsWith('/8') ? listing : [listing];
      return { ok: true, status: 200, json: async () => ({ success: true, data }) };
    };
    assert.deepEqual(await publicServicesApi.categories(), [{ categoryId: 3, name: 'Giặt là' }]);
    assert.equal(last.url, '/api/services/categories');
    const rows = await publicServicesApi.list(undefined, 3);
    assert.equal(last.url, '/api/services?categoryId=3');
    assert.equal(last.headers.Authorization, undefined);
    assert.equal(rows[0].contactPhone, '0987654321');
    assert.equal(rows[0].providerId, 21);
    assert.equal(servicePrice(rows[0]), 'Từ 15.000 VNĐ');
    assert.deepEqual(await publicServicesApi.detail(8), listing);
    assert.equal(last.url, '/api/services/8');
    await assert.rejects(publicServicesApi.list(undefined, 'moving'), error => error.status === 400);
    await assert.rejects(publicServicesApi.detail(null), error => error.status === 400);
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: [{ ...listing, publicEligible: false }] }) });
    await assert.rejects(publicServicesApi.list(), error => error.status === 502);
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ success: false, message: 'Không tìm thấy dịch vụ công khai.' }) });
    await assert.rejects(publicServicesApi.detail(8), error => error.status === 404);
  } finally {
    globalThis.fetch = previous.fetch; globalThis.sessionStorage = previous.session; globalThis.localStorage = previous.local;
  }
});
