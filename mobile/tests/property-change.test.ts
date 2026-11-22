/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function loadTsModule<T>(relativePath: string, customRequire?: (id: string) => unknown): T {
  const url = new URL(relativePath, import.meta.url);
  const code = ts.transpileModule(readFileSync(url, 'utf8'), {
    fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: customRequire,
  });
  return mod.exports as T;
}

const propReg = loadTsModule<typeof import('../src/services/property-registration')>(
  '../src/services/property-registration.ts'
);

const change = loadTsModule<typeof import('../src/services/property-change')>(
  '../src/services/property-change.ts',
  id => {
    if (id === './property-registration') return propReg;
    if (id === './host') return {};
    throw new Error(`Unexpected require: ${id}`);
  }
);

const baseSnapshot: import('../src/services/property-change').PropertyEditSnapshot = {
  registrationId: 55,
  propertyId: 12,
  mode: 'CHANGE_REQUEST',
  status: 'APPROVED',
  reasonNote: null,
  requestedFields: [],
  fieldNotes: {},
  editableFields: [
    'name',
    'propertyType',
    'description',
    'managerName',
    'contactPhone',
    'zaloPhone',
    'addressDetail',
    'commune',
    'nearby',
    'latitude',
    'longitude',
    'amenities',
    'selectedRules',
    'rules',
    'photos',
    'OWNERSHIP',
    'ID_CARD',
    'FIRE_SAFETY',
  ],
  legacyScope: false,
  details: {
    name: 'Nhà trọ Hòa Lạc Xanh',
    propertyType: 'Chung cư mini',
    description: 'Nhà trọ sạch sẽ, thoáng mát gần Đại học FPT Hòa Lạc với đầy đủ tiện nghi.',
    managerName: 'Nguyễn Văn Chủ',
    contactPhone: '0987654323',
    zaloPhone: '0987654323',
    commune: 'Tân Xã',
    addressDetail: 'Ngõ 18, thôn 3, xã Tân Xã',
    nearby: 'Cách ĐH FPT 700m',
    latitude: '21.01350',
    longitude: '105.52620',
    amenities: ['parking', 'wifi', 'camera'],
    selectedRules: ['noSmoking', 'quietHours:23:00'],
    rules: 'Không để xe chắn lối đi.',
    termsAccepted: true,
  },
  photos: [
    { documentId: 101, documentType: 'PHOTO_0', fileName: 'front.jpg' },
    { documentId: 102, documentType: 'PHOTO_1', fileName: 'hall.jpg' },
  ],
  documents: [
    { documentId: 201, documentType: 'OWNERSHIP', fileName: 'gpkd.pdf', verificationStatus: 'APPROVED' },
    { documentId: 202, documentType: 'ID_CARD', fileName: 'cccd.jpg', verificationStatus: 'APPROVED' },
    { documentId: 203, documentType: 'FIRE_SAFETY', fileName: 'pccc.pdf', verificationStatus: 'APPROVED' },
  ],
  versionToken: 'v1-token-abc',
  reverificationRequired: false,
  reverificationReasons: [],
};

const baseProperty = {
  propertyId: 12,
  registrationId: 55,
  name: 'Nhà trọ Hòa Lạc Xanh',
  address: 'Ngõ 18, Tân Xã',
  displayStatus: 'VISIBLE',
  roomTypeCount: 2,
  totalRooms: 10,
  vacantRooms: 3,
  pendingViewingCount: 1,
  photos: [],
};

test('resolvePropertyChangeEntry enforces single pending request, draft resume, and supplement flows', () => {
  const create = change.resolvePropertyChangeEntry(baseProperty, false);
  assert.equal(create.visible, true);
  assert.equal(create.mode, 'create');
  assert.equal(create.registrationId, 55);

  const draft = change.resolvePropertyChangeEntry(baseProperty, true);
  assert.equal(draft.mode, 'draft');
  assert.equal(draft.ctaLabel, 'Tiếp tục bản nháp');

  const pending = change.resolvePropertyChangeEntry(
    {
      ...baseProperty,
      changeRequest: { registrationId: 99, status: 'PENDING' },
    },
    true
  );
  assert.equal(pending.mode, 'status');
  assert.equal(pending.registrationId, 99);

  const supplement = change.resolvePropertyChangeEntry(
    {
      ...baseProperty,
      changeRequest: {
        registrationId: 99,
        status: 'NEEDS_SUPPLEMENT',
        reasonNote: 'Ảnh mặt tiền bị mờ',
      },
    },
    false
  );
  assert.equal(supplement.mode, 'supplement');
  assert.equal(supplement.tone, 'warning');
});

test('computePropertyChangeDiff detects hotline, amenities, photos, documents, and reverification triggers accurately', () => {
  const baseline = change.snapshotToFormValues(baseSnapshot);
  const draft = {
    ...baseline,
    contactPhone: '0912345678',
    amenities: ['parking', 'wifi', 'elevator'], // removed camera, added elevator
    addressDetail: 'Ngõ 25, thôn 4, xã Tân Xã',
  };

  const diff = change.computePropertyChangeDiff({
    baseline,
    draft,
    originalPhotos: baseSnapshot.photos,
    retainedPhotoIds: [101], // marked 102 for removal
    newPhotos: [{ uri: 'file:///new.jpg', fileName: 'new.jpg', mimeType: 'image/jpeg', fileSize: 12000 }],
    existingDocuments: baseSnapshot.documents,
    replacementDocuments: {
      fireSafety: { uri: 'file:///pccc-new.pdf', fileName: 'pccc-new.pdf', mimeType: 'application/pdf', fileSize: 20000 },
    },
  });

  assert.equal(diff.hasAnyChange, true);
  assert.equal(diff.fieldDiffs.some(item => item.key === 'contactPhone' && item.currentValue === '0987654323' && item.proposedValue === '0912345678'), true);
  assert.deepEqual([...diff.addedAmenities], ['elevator']);
  assert.deepEqual([...diff.removedAmenities], ['camera']);
  assert.equal(diff.keptPhotoCount, 1);
  assert.equal(diff.removedPhotoCount, 1);
  assert.equal(diff.addedPhotoCount, 1);
  assert.equal(diff.totalPhotoCount, 2);
  assert.equal(diff.replacedDocuments.length, 1);
  assert.equal(diff.replacedDocuments[0].newFileName, 'pccc-new.pdf');
  assert.equal(diff.reverificationReasons.length, 1); // addressDetail changed
});

test('validation blocks unchanged submission and passes routine hotline change without re-uploading documents or map pin', () => {
  const baseline = change.snapshotToFormValues(baseSnapshot);
  const unchanged = change.validatePropertyChangeSubmission({
    snapshot: baseSnapshot,
    baseline,
    draft: { ...baseline, termsAccepted: true },
    originalPhotos: baseSnapshot.photos,
    retainedPhotoIds: [101, 102],
    newPhotos: [],
    existingDocuments: baseSnapshot.documents,
    replacementDocuments: {},
  });
  assert.equal(unchanged.valid, false);
  assert.ok(unchanged.noChangeError);

  const hotlineOnly = change.validatePropertyChangeSubmission({
    snapshot: baseSnapshot,
    baseline,
    draft: { ...baseline, contactPhone: '0912345678', termsAccepted: true },
    originalPhotos: baseSnapshot.photos,
    retainedPhotoIds: [101, 102],
    newPhotos: [],
    existingDocuments: baseSnapshot.documents,
    replacementDocuments: {},
  });
  assert.equal(hotlineOnly.valid, true);
  assert.equal(hotlineOnly.firstErrorSection, null);

  const invalidPhotos = change.validatePropertyChangeSubmission({
    snapshot: baseSnapshot,
    baseline,
    draft: { ...baseline, termsAccepted: true },
    originalPhotos: baseSnapshot.photos,
    retainedPhotoIds: [],
    newPhotos: [],
    existingDocuments: baseSnapshot.documents,
    replacementDocuments: {},
  });
  assert.equal(invalidPhotos.valid, false);
  assert.equal(invalidPhotos.firstErrorSection, 'photos');
});

test('evaluateChangeSections distinguishes unchanged, changed, incomplete, and needs_supplement states', () => {
  const supplementSnap = {
    ...baseSnapshot,
    status: 'NEEDS_SUPPLEMENT',
    requestedFields: ['photos'],
    fieldNotes: { photos: 'Vui lòng bổ sung ảnh mặt tiền rõ nét' },
    editableFields: ['contactPhone', 'photos'],
  };
  const baseline = change.snapshotToFormValues(supplementSnap);
  const draft = { ...baseline, contactPhone: '0912345678' };

  const cards = change.evaluateChangeSections({
    snapshot: supplementSnap,
    baseline,
    draft,
    originalPhotos: supplementSnap.photos,
    retainedPhotoIds: [101, 102],
    newPhotos: [],
    existingDocuments: supplementSnap.documents,
    replacementDocuments: {},
  });

  const byId = Object.fromEntries(cards.map(card => [card.id, card]));
  assert.equal(byId.basic.status, 'changed');
  assert.equal(byId.location.status, 'unchanged');
  assert.equal(byId.location.editable, false);
  assert.equal(byId.photos.status, 'needs_supplement');
  assert.ok(byId.photos.supplementNote?.includes('mặt tiền'));
});

test('draft serialization never stores local file URIs and flags concurrent versionToken mismatch on restore', () => {
  const baseline = change.snapshotToFormValues(baseSnapshot);
  const draft = { ...baseline, contactPhone: '0912345678', termsAccepted: true };
  const serialized = change.serializePropertyChangeDraft({
    versionToken: 'v1-token-abc',
    draft,
    retainedPhotoIds: [101],
    changeReason: 'Cập nhật số hotline mới',
    newPhotos: [{ uri: 'file:///local-temp-photo.jpg', mimeType: 'image/jpeg', fileSize: 5000 }],
    replacementDocuments: {
      idCard: { uri: 'file:///private-cccd.jpg', mimeType: 'image/jpeg', fileSize: 8000 },
    },
  });

  assert.equal(serialized.includes('file:///'), false);
  assert.equal(serialized.includes('private-cccd'), false);

  const restoredSameVersion = change.parsePropertyChangeDraft(serialized, baseSnapshot);
  assert.equal(restoredSameVersion.versionMismatch, false);
  assert.equal(restoredSameVersion.needsFileReattach, true);
  assert.equal(restoredSameVersion.values.contactPhone, '0912345678');
  assert.equal(restoredSameVersion.values.termsAccepted, false);
  assert.deepEqual([...restoredSameVersion.retainedPhotoIds], [101]);

  const newerServerSnapshot = { ...baseSnapshot, versionToken: 'v2-token-xyz' };
  const restoredConflict = change.parsePropertyChangeDraft(serialized, newerServerSnapshot);
  assert.equal(restoredConflict.versionMismatch, true);
  assert.equal(restoredConflict.values.contactPhone, '0912345678');
});

test('propertyChangeStatusMeta maps backend statuses accurately', () => {
  assert.equal(change.propertyChangeStatusMeta({ status: 'PENDING' }).badge, 'Chờ xét duyệt');
  assert.equal(
    change.propertyChangeStatusMeta({ status: 'PENDING', reverificationRequired: true }).badge,
    'Chờ tái xác minh'
  );
  assert.equal(change.propertyChangeStatusMeta({ status: 'NEEDS_SUPPLEMENT' }).canEdit, true);
  assert.equal(change.propertyChangeStatusMeta({ status: 'REJECTED' }).canEdit, true);
  assert.equal(change.propertyChangeStatusMeta({ status: 'APPROVED' }).canEdit, false);
});
