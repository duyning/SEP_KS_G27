/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/services/property-registration.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { module, exports: module.exports });
const api = module.exports as typeof import('../src/services/property-registration');
const values = {
  ...api.registrationValues(), name: 'Nhà trọ kiểm thử', propertyType: 'Chung cư mini', managerName: 'Chủ trọ',
  contactPhone: '0912345678', description: 'Mô tả nhà trọ hợp lệ với ít nhất ba mươi ký tự.',
  commune: 'Tân Xã', addressDetail: 'Đường kiểm thử số 123', termsAccepted: true,
};
const asset = { uri: 'file:///fixture.png', mimeType: 'image/png', fileSize: 100 };
const files = { photos: [asset], ownership: asset, idCard: asset, fireSafety: asset };

test('manual address and complete documents pass all six steps without a map pin', () => {
  for (let step = 0; step < 6; step++) assert.equal(Object.keys(api.validateRegistration(values, files, step)).length, 0);
});
test('field-level validation reports both invalid description and phone', () => {
  const errors = api.validateRegistration({ ...values, description: 'Ngắn', contactPhone: '123' }, files, 0);
  assert.ok(errors.description && errors.contactPhone);
});
test('location requires a known area and validates both coordinates when provided', () => {
  const errors = api.validateRegistration({ ...values, commune: 'Tự đặt', addressDetail: '123', latitude: '21' }, files, 1);
  assert.ok(errors.commune && errors.addressDetail && errors.latitude);
  assert.equal(Object.keys(api.validateRegistration({ ...values, commune: 'Hạ Bằng', latitude: '21.01', longitude: '105.5' }, files, 1)).length, 0);
});
test('address lookup exposes only the first candidate confirmed by the place lookup', async () => {
  const checked: string[] = [];
  const location = { latitude: 21.02, longitude: 105.56, commune: 'Hạ Bằng' };
  const result = await api.firstResolvedRegistrationAddress(
    [
      { refId: 'rejected-ref', display: 'Kết quả bị API từ chối' },
      { refId: 'invalid-coordinates', display: 'Kết quả có tọa độ sai' },
      { refId: 'verified-ref', display: 'Địa chỉ đã xác minh' },
      { refId: 'unused-ref', display: 'Kết quả tiếp theo' },
    ],
    async refId => {
      checked.push(refId);
      if (refId === 'rejected-ref') return null;
      return refId === 'invalid-coordinates' ? { ...location, latitude: 123 } : location;
    },
    new AbortController().signal
  );
  assert.deepEqual(checked, ['rejected-ref', 'invalid-coordinates', 'verified-ref']);
  assert.equal(result?.display, 'Địa chỉ đã xác minh');
  assert.equal(result?.location, location);
});
test('saving a confirmed pin fills empty fields from the location and preserves manual values', () => {
  const point = { latitude: 21.02915, longitude: 105.563 };
  const suggestion = { ...point, addressDetail: 'Địa chỉ từ bản đồ', commune: 'Hạ Bằng', nearby: 'Chợ gần nhà trọ' };
  const blank = api.registrationValues();
  const patch = api.registrationLocationPatch(blank, point, suggestion);
  assert.equal(patch.addressDetail, suggestion.addressDetail);
  assert.equal(patch.commune, suggestion.commune);
  assert.equal(patch.nearby, suggestion.nearby);
  const partial = api.registrationLocationPatch({ ...values, nearby: '' }, point, {
    ...suggestion, nearby: null,
  });
  assert.equal(partial.latitude, '21.0291500');
  assert.equal(partial.longitude, '105.5630000');
  assert.equal(partial.addressDetail, undefined);
  assert.equal(partial.commune, undefined);
  assert.equal(partial.nearby, undefined);
  assert.equal(api.registrationLocationPatch(blank, point, { ...point, commune: 'Khác' }).commune, undefined);
  assert.deepEqual(Object.keys(api.registrationLocationPatch(blank, point)), ['latitude', 'longitude']);
});
test('a VietMap address can supply one explicitly named commune when old and new areas differ', () => {
  const blank = api.registrationValues();
  const point = { latitude: 21.02915, longitude: 105.563 };
  const location = {
    ...point, commune: null, attribution: 'VIETMAP',
    addressDetail: 'Nhà trọ kiểm thử, Xã Hạ Bằng, Thành phố Hà Nội',
  };
  assert.equal(api.registrationLocationPatch(blank, point, location).commune, 'Hạ Bằng');
  assert.equal(api.registrationLocationPatch(blank, point, {
    ...location, addressDetail: 'Nhà trọ kiểm thử, Xã Hạ Bằng, Xã Tân Xã, Hà Nội',
  }).commune, undefined);
  assert.equal(api.registrationLocationPatch(blank, point, {
    ...location, addressDetail: 'Nhà trọ Xã Hạ Bằng, Thành phố Hà Nội',
  }).commune, undefined);
});
test('full catalog keeps backend IDs and rejects invalid or duplicate quiet hours', () => {
  assert.equal(api.AMENITIES.length, 18);
  assert.equal(api.RULES.length, 12);
  assert.ok(api.validateRegistration({ ...values, selectedRules: ['quietHours:26:00'] }, files, 2).selectedRules);
  assert.ok(api.validateRegistration({ ...values, selectedRules: ['quietHours', 'quietHours:20:00'] }, files, 2).selectedRules);
});
test('identity is optional only when existing approved documents will be reused', () => {
  assert.ok(api.validateRegistration(values, { ...files, idCard: null }, 4).idCard);
  assert.equal(Object.keys(api.validateRegistration(values, { ...files, idCard: null }, 4, true)).length, 0);
  assert.ok(api.validateRegistration(values, { ...files, fireSafety: null }, 4, true).fireSafety);
  assert.ok(api.validateRegistration({ ...values, termsAccepted: false }, files, 5).termsAccepted);
});
test('photos and documents have separate MIME and size limits', () => {
  assert.ok(api.registrationAssetError({ ...asset, mimeType: 'image/heic' }, false));
  assert.ok(api.registrationAssetError({ ...asset, mimeType: 'application/pdf' }, false));
  assert.equal(api.registrationAssetError({ ...asset, mimeType: 'application/pdf', fileSize: 10 * 1024 * 1024 }, true), null);
  assert.ok(api.registrationAssetError({ ...asset, fileSize: 6 * 1024 * 1024 }, false));
  assert.ok(api.registrationAssetError({ ...asset, fileSize: 11 * 1024 * 1024 }, true));
  assert.equal(api.attachmentMime(new Uint8Array([37, 80, 68, 70, 45, 49])), 'application/pdf');
});
test('draft restores step and content with no stored files or stale consent', () => {
  const serialized = JSON.stringify(api.draftSnapshot({ ...values, selectedRules: ['quietHours:21:30'] }, files, 5, [], false));
  assert.equal(serialized.includes(asset.uri), false);
  const restored = api.restoreDraft(serialized, api.registrationValues());
  assert.equal(restored.step, 5);
  assert.equal(restored.values.name, values.name);
  assert.equal(restored.values.selectedRules[0], 'quietHours:21:30');
  assert.equal(restored.values.termsAccepted, false);
  assert.equal(restored.reuse, false);
  assert.equal(restored.missing.join(','), 'photos,ownership,idCard,fireSafety');
});
