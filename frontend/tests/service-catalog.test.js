import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPublicServices, serviceAreas } from '../src/services/service-catalog.js';

const rows = [
  { serviceId: 1, categoryId: 1, serviceName: 'Giặt là sinh viên', providerName: 'Nguyễn Đăng An', serviceArea: 'Tân Xã, Thạch Hòa' },
  { serviceId: 2, categoryId: 2, serviceName: 'Dọn phòng trọ', providerName: 'Minh Anh', serviceArea: 'Bình Yên; Thạch Hòa' },
  { serviceId: 3, categoryId: 1, serviceName: 'Giặt sấy', providerName: 'Đăng An', serviceArea: 'tân xã' },
];
test('search accepts Vietnamese without accents and combines every active filter', () => {
  assert.equal(filterPublicServices(rows).length, 3);
  assert.deepEqual(filterPublicServices(rows, { query: ' GIAT   SINH vien ' }).map(row => row.serviceId), [1]);
  assert.deepEqual(filterPublicServices(rows, { query: 'nguyen dang an', category: '1', area: 'thach hoa' }).map(row => row.serviceId), [1]);
  assert.deepEqual(filterPublicServices(rows, { query: 'giat', area: 'binh yen' }), []);
  assert.deepEqual(filterPublicServices(rows, { category: '999' }), []);
  assert.deepEqual(filterPublicServices(rows, { query: '<script>alert(1)</script>' }), []);
});
test('areas come from service data with duplicates removed and null fields tolerated', () => {
  assert.deepEqual(serviceAreas([...rows, { serviceArea: null }]), ['Bình Yên', 'Tân Xã', 'Thạch Hòa']);
  assert.deepEqual(filterPublicServices([{}], { query: 'giat' }), []);
});
