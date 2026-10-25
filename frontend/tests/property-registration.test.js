import test from 'node:test';
import assert from 'node:assert/strict';
import { createPropertyForm, isVietnamesePhone, parsePropertyCoordinates, propertyDraft, restorePropertyDraft, validatePropertyStep, validateRegistrationFile } from '../src/services/property-registration.js';

test('registration starts without sample pictures, documents or selected amenities', () => {
  const data = createPropertyForm({ fullName: 'Account owner', phoneNumber: '0912345678' });
  assert.equal(data.managerName, 'Account owner');
  assert.equal(data.contactPhone, '0912345678');
  assert.deepEqual(data.photos, []);
  assert.deepEqual(data.documents, {});
  assert.deepEqual(data.amenities, []);
  assert.deepEqual(data.selectedRules, []);
  assert.equal(data.rules, '');
  assert.equal(data.termsAccepted, false);
});
test('basic information rejects empty, short and oversized fields', () => {
  const data = createPropertyForm();
  assert.deepEqual(Object.keys(validatePropertyStep(data, 0)).sort(), ['contactPhone', 'description', 'managerName', 'name']);
  Object.assign(data, { name: 'Nhà trọ hợp lệ', description: 'Nhà trọ sạch sẽ, an ninh và không gian thoáng mát.', managerName: 'Nguyễn Văn An', contactPhone: '0912345678' });
  assert.deepEqual(validatePropertyStep(data, 0), {});
  assert.ok(validatePropertyStep({ ...data, description: ' '.repeat(35) }, 0).description);
  assert.ok(validatePropertyStep({ ...data, name: 'x'.repeat(101), propertyType: 'tampered', zaloPhone: '123' }, 0).name);
  assert.ok(validatePropertyStep({ ...data, propertyType: 'tampered' }, 0).propertyType);
  assert.ok(validatePropertyStep({ ...data, zaloPhone: '123' }, 0).zaloPhone);
});
test('phone validation supports Vietnam domestic and international forms', () => {
  for (const phone of ['0912345678', '+84912345678', '0912 345 678', '0912-345-678']) assert.equal(isVietnamesePhone(phone), true);
  for (const phone of ['', '123', '0112345678', '09123456789', '+840912345678', 'abc0912345678']) assert.equal(isVietnamesePhone(phone), false);
});
test('location requires real address and explicit paired bounded coordinates', () => {
  const empty = { ...createPropertyForm(), commune: 'Tân Xã', addressDetail: 'Số 18, ngõ 4, thôn 2' };
  assert.ok(validatePropertyStep(empty, 1).location);
  const data = { ...empty, latitude: '21.0188', longitude: '105.5215' };
  assert.deepEqual(validatePropertyStep(data, 1), {});
  assert.ok(validatePropertyStep({ ...data, commune: '' }, 1).commune);
  assert.ok(validatePropertyStep({ ...data, latitude: '21', longitude: '' }, 1).longitude);
  assert.ok(validatePropertyStep({ ...data, latitude: 'NaN', longitude: '181' }, 1).latitude);
  assert.ok(validatePropertyStep({ ...data, latitude: '91', longitude: '105' }, 1).latitude);
  assert.deepEqual(validatePropertyStep({ ...data, latitude: '21.0188', longitude: '105.5215' }, 1), {});
  assert.ok(validatePropertyStep({ ...data, latitude: '0x15' }, 1).latitude);
  assert.ok(validatePropertyStep({ ...data, addressDetail: '    ' }, 1).addressDetail);
  assert.ok(validatePropertyStep({ ...data, nearby: 'a'.repeat(256) }, 1).nearby);
});

test('coordinate parsing never converts missing or malformed input to a map pin', () => {
  for (const [lat, lng] of [['', ''], [' ', '105'], ['21', ''], ['0x15', '105'], ['2e1', '105'], ['Infinity', '105'], ['91', '105'], ['21', '-181']]) assert.equal(parsePropertyCoordinates(lat, lng), null);
  assert.deepEqual(parsePropertyCoordinates(' 21.018800 ', '105.521500'), [21.0188, 105.5215]);
  assert.deepEqual(parsePropertyCoordinates('0', '0'), [0, 0]);
});

test('draft restores exact selected coordinates without inventing a default pin', () => {
  const empty = restorePropertyDraft(JSON.stringify(propertyDraft(createPropertyForm())));
  assert.equal(parsePropertyCoordinates(empty.latitude, empty.longitude), null);
  const original = { ...createPropertyForm(), latitude: '21.019123', longitude: '105.521789', commune: 'Tân Xã' };
  const restored = restorePropertyDraft(JSON.stringify(propertyDraft(original)));
  assert.deepEqual(parsePropertyCoordinates(restored.latitude, restored.longitude), [21.019123, 105.521789]);
});
test('every upload and consent step is validated before submission', () => {
  const data = createPropertyForm();
  assert.ok(validatePropertyStep({ ...data, rules: 'a'.repeat(2001) }, 2).rules);
  assert.ok(validatePropertyStep(data, 3).photos);
  assert.deepEqual(validatePropertyStep({ ...data, photos: [{}] }, 3), {});
  assert.deepEqual(validatePropertyStep({ ...data, photos: [{}, {}] }, 3), {});
  assert.equal(Object.keys(validatePropertyStep(data, 4)).length, 2);
  assert.deepEqual(validatePropertyStep({ ...data, documents: { ownership: {}, idCard: {} } }, 4), {});
  assert.ok(validatePropertyStep(data, 5).termsAccepted);
  assert.deepEqual(validatePropertyStep({ ...data, termsAccepted: true }, 5), {});
});
test('file validation enforces size, MIME type and nonempty input', () => {
  assert.equal(validateRegistrationFile({ type: 'image/png', size: 100 }), '');
  assert.ok(validateRegistrationFile({ type: 'image/png', size: 0 }));
  assert.ok(validateRegistrationFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }));
  assert.ok(validateRegistrationFile({ type: 'image/svg+xml', size: 100 }));
  assert.ok(validateRegistrationFile({ type: 'application/pdf', size: 100 }));
  assert.equal(validateRegistrationFile({ type: 'application/pdf', size: 100 }, true), '');
  assert.ok(validateRegistrationFile({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }, true));
});
test('draft stores only text fields, restores safely and never restores files or consent', () => {
  const data = { ...createPropertyForm(), name: 'My property', photos: ['private photo'], documents: { idCard: 'private document' }, amenities: ['wifi'], termsAccepted: true };
  const draft = propertyDraft(data);
  assert.equal('photos' in draft.fields, false);
  assert.equal('documents' in draft.fields, false);
  assert.equal('termsAccepted' in draft.fields, false);
  const restored = restorePropertyDraft(JSON.stringify(draft));
  assert.equal(restored.name, data.name);
  assert.deepEqual(restored.amenities, ['wifi']);
  assert.deepEqual(restored.photos, []);
  assert.deepEqual(restored.documents, {});
  assert.equal(restored.termsAccepted, false);
  assert.throws(() => restorePropertyDraft('{invalid'));
  assert.throws(() => restorePropertyDraft('{"version":2}'));
  assert.deepEqual(restorePropertyDraft('{"version":1,"fields":{"amenities":["wifi","unknown"],"documents":{"idCard":"bad"}}}').amenities, ['wifi']);
});

test('amenity and house rule values are restricted to supported choices', () => {
  const data = createPropertyForm();
  assert.deepEqual(validatePropertyStep({ ...data, amenities: ['wifi', 'fireSafety'], selectedRules: ['quietHours'] }, 2), {});
  assert.ok(validatePropertyStep({ ...data, amenities: ['unknown'] }, 2).amenities);
  assert.ok(validatePropertyStep({ ...data, selectedRules: ['unknown'] }, 2).selectedRules);
  const restored = restorePropertyDraft('{"version":1,"fields":{"selectedRules":["quietHours","unknown"]}}');
  assert.deepEqual(restored.selectedRules, ['quietHours']);
});
