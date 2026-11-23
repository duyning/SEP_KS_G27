/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function compile(file: string, bindings: Record<string, unknown>) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { module, exports: module.exports, URL, ...bindings }
  );
  return module.exports;
}

const hostMod = compile('../src/services/host.ts', {
  require: () => ({}),
}) as typeof import('../src/services/host');

const roomTypesMod = compile('../src/services/host-room-types.ts', {
  require: (name: string) => (name === './host' ? hostMod : {}),
}) as typeof import('../src/services/host-room-types');

const editorMod = compile('../src/services/host-room-type-editor.ts', {
  require: (name: string) =>
    name === './host' ? hostMod : name === './host-room-types' ? roomTypesMod : {},
}) as typeof import('../src/services/host-room-type-editor');

const sampleRoomType: import('../src/services/host').HostRoomType = {
  roomTypeId: 42,
  propertyId: 7,
  roomType: 'Studio ban công tiêu chuẩn',
  price: 3500000,
  areaSqm: 26.5,
  capacity: 2,
  totalRooms: 5,
  vacantRooms: 2,
  deposit: 3500000,
  description: 'Phòng nhiều ánh sáng tự nhiên, có ban công riêng.',
  imageUrl: 'https://cdn.hlrcs.test/fallback.jpg',
  amenities: ['airConditioner', 'wifi', 'privateBathroom'],
  electricityPrice: 3500,
  waterPrice: 20000,
  internetPrice: 0,
  servicePrice: null,
  images: [
    { imageId: 103, fileName: 'bath.jpg' },
    { imageId: 101, fileName: 'cover.jpg' },
    { imageId: 102, fileName: 'bed.jpg' },
  ],
};

test('draft initialization preserves null vs 0 fees/deposit and sorts server images by imageId ASC', () => {
  const draft = editorMod.createRoomTypeEditorDraft(sampleRoomType);
  assert.equal(draft.roomType, 'Studio ban công tiêu chuẩn');
  assert.equal(draft.areaSqm, '26.5');
  assert.equal(draft.capacity, '2');
  assert.equal(draft.price, '3500000');
  assert.equal(draft.deposit, '3500000');
  assert.equal(draft.electricityPrice, '3500');
  assert.equal(draft.waterPrice, '20000');
  assert.equal(draft.internetPrice, '0');
  assert.equal(draft.servicePrice, '');
  assert.deepEqual(
    [...draft.existingImages.map(i => i.imageId)],
    [101, 102, 103]
  );
  assert.equal(draft.existingImages.every(i => i.markedForDeletion === false), true);
  assert.equal(draft.newPhotos.length, 0);
});

test('VND formatting & parsing preserves exact integer values without rounding and distinguishes empty vs zero', () => {
  assert.equal(editorMod.formatVndIntegerInput(''), '');
  assert.equal(editorMod.formatVndIntegerInput('0'), '0');
  assert.equal(editorMod.formatVndIntegerInput('2356789'), '2.356.789');
  assert.equal(editorMod.parseVndDigitsInput(''), '');
  assert.equal(editorMod.parseVndDigitsInput('0'), '0');
  assert.equal(editorMod.parseVndDigitsInput('00'), '0');
  assert.equal(editorMod.parseVndDigitsInput('3.500.000'), '3500000');
  assert.equal(editorMod.parseVndDigitsInput('-5000'), '-5000');

  assert.equal(editorMod.formatServiceFeeHint('', 'đ/kWh').tone, 'muted');
  assert.equal(editorMod.formatServiceFeeHint('0', 'đ/phòng').tone, 'free');
  assert.equal(editorMod.formatServiceFeeHint('3500', 'đ/kWh').text, '3.500 đ/kWh');
  assert.ok(editorMod.formatDepositHint('', '3500000').text.includes('3.500.000'));
  assert.equal(editorMod.formatDepositHint('0', '3500000').tone, 'free');
});

test('payload builder preserves null for blank deposit/fees and 0 for explicit zero', () => {
  const draft = editorMod.createRoomTypeEditorDraft(sampleRoomType);
  draft.deposit = '';
  draft.electricityPrice = '';
  draft.waterPrice = '0';
  draft.internetPrice = '100000';
  draft.servicePrice = '0';
  draft.existingImages[1].markedForDeletion = true; // mark 102 for removal

  const payload = editorMod.buildRoomTypeUpdatePayload(7, draft);
  assert.equal(payload.propertyId, 7);
  assert.equal(payload.price, 3500000);
  assert.equal(payload.deposit, null);
  assert.equal(payload.electricityPrice, null);
  assert.equal(payload.waterPrice, 0);
  assert.equal(payload.internetPrice, 100000);
  assert.equal(payload.servicePrice, 0);
  assert.deepEqual([...payload.retainedImageIds], [101, 103]);
});

test('validation enforces DTO constraints, sibling duplicate names, negative fees and 10-photo limit', () => {
  const base = editorMod.createRoomTypeEditorDraft(sampleRoomType);
  assert.equal(
    Object.keys(
      editorMod.validateRoomTypeEditorDraft(base, {
        siblingRoomTypes: [{ roomTypeId: 42, roomType: 'Studio ban công tiêu chuẩn' }],
        currentRoomTypeId: 42,
      })
    ).length,
    0
  );

  // Duplicate name with another room type in the same property
  const dupErrs = editorMod.validateRoomTypeEditorDraft(
    { ...base, roomType: 'Phòng đôi cao cấp' },
    {
      siblingRoomTypes: [
        { roomTypeId: 42, roomType: 'Studio ban công tiêu chuẩn' },
        { roomTypeId: 43, roomType: 'phòng đôi cao cấp' },
      ],
      currentRoomTypeId: 42,
    }
  );
  assert.ok(dupErrs.roomType);

  // Negative & invalid numeric inputs
  const bad = editorMod.validateRoomTypeEditorDraft({
    ...base,
    roomType: 'AB',
    areaSqm: '25.123',
    capacity: '25',
    price: '0',
    deposit: '-100',
    electricityPrice: '-3500',
    waterPrice: '1000000000',
    internetPrice: 'abc',
    description: 'x'.repeat(2001),
  });
  assert.ok(bad.roomType);
  assert.ok(bad.areaSqm);
  assert.ok(bad.capacity);
  assert.ok(bad.price);
  assert.ok(bad.deposit);
  assert.ok(bad.electricityPrice);
  assert.ok(bad.waterPrice);
  assert.ok(bad.internetPrice);
  assert.ok(bad.description);

  // Exceeding 10 total photos (3 existing + 8 new = 11)
  const tooManyPhotos = editorMod.validateRoomTypeEditorDraft({
    ...base,
    newPhotos: Array.from({ length: 8 }, (_, idx) => ({
      id: `n-${idx}`,
      uri: `file:///p-${idx}.jpg`,
      mimeType: 'image/jpeg',
      fileSize: 1024,
      status: 'ready' as const,
    })),
  });
  assert.ok(tooManyPhotos.photos);

  // Pending or errored photo blocks save
  const loadingPhoto = editorMod.validateRoomTypeEditorDraft({
    ...base,
    newPhotos: [
      { id: 'loading-1', uri: 'file:///a.jpg', status: 'loading' as const },
    ],
  });
  assert.ok(loadingPhoto.photos);

  const sectionCounts = editorMod.sectionErrorCounts(bad);
  assert.ok(sectionCounts.infoErrors > 0);
  assert.ok(sectionCounts.amenitiesFeesErrors > 0);
});

test('dirty detection accurately tracks field edits, null vs 0 transitions, soft image removal and reverts', () => {
  const baseline = editorMod.createRoomTypeEditorDraft(sampleRoomType);
  const unchanged = editorMod.createRoomTypeEditorDraft(sampleRoomType);
  assert.equal(editorMod.isRoomTypeDraftDirty(unchanged, baseline), false);

  // Changing blank servicePrice to '0' IS a real change
  assert.equal(
    editorMod.isRoomTypeDraftDirty({ ...unchanged, servicePrice: '0' }, baseline),
    true
  );

  // Changing amenity order alone is NOT dirty; adding/removing IS dirty
  assert.equal(
    editorMod.isRoomTypeDraftDirty(
      { ...unchanged, amenities: ['privateBathroom', 'wifi', 'airConditioner'] },
      baseline
    ),
    false
  );
  assert.equal(
    editorMod.isRoomTypeDraftDirty(
      { ...unchanged, amenities: ['wifi'] },
      baseline
    ),
    true
  );

  // Marking existing image for deletion IS dirty, restoring makes it clean again
  const marked = {
    ...unchanged,
    existingImages: unchanged.existingImages.map((img, i) =>
      i === 0 ? { ...img, markedForDeletion: true } : img
    ),
  };
  assert.equal(editorMod.isRoomTypeDraftDirty(marked, baseline), true);
  const restored = {
    ...marked,
    existingImages: marked.existingImages.map(img => ({ ...img, markedForDeletion: false })),
  };
  assert.equal(editorMod.isRoomTypeDraftDirty(restored, baseline), false);
});

test('photo summary syncs backend cover rule and supports promoting new photos when no retained images exist', () => {
  const draft = editorMod.createRoomTypeEditorDraft(sampleRoomType);
  draft.newPhotos = [
    { id: 'new-a', uri: 'file:///a.jpg', status: 'ready' },
    { id: 'new-b', uri: 'file:///b.jpg', status: 'ready' },
  ];

  // First retained server image (101) is cover
  let summary = editorMod.activeRoomTypePhotos(draft);
  assert.equal(summary.coverKey, 'existing:101');
  assert.equal(summary.totalActive, 5);
  assert.equal(summary.remainingSlots, 5);

  // Mark all retained server images for deletion -> first new photo becomes cover
  draft.existingImages = draft.existingImages.map(img => ({ ...img, markedForDeletion: true }));
  summary = editorMod.activeRoomTypePhotos(draft);
  assert.equal(summary.coverKey, 'new:new-a');
  assert.equal(summary.totalActive, 2);
  assert.equal(summary.markedRemoved.length, 3);

  // Promote new-b to front -> becomes cover
  draft.newPhotos = editorMod.promoteNewPhotoToFront(draft.newPhotos, 'new-b');
  summary = editorMod.activeRoomTypePhotos(draft);
  assert.equal(summary.coverKey, 'new:new-b');
});

test('amenity catalog covers all 23 backend keys across exact 3 website groups and supports Vietnamese search', () => {
  assert.deepEqual(
    [...editorMod.ROOM_TYPE_AMENITY_GROUPS.map(g => g.title)],
    ['Không gian & Tiện nghi', 'Nội thất & Sinh hoạt', 'Bếp & Vệ sinh']
  );
  const groupedKeys = editorMod.ROOM_TYPE_AMENITY_GROUPS.flatMap(g => [...g.keys]);
  const allBackendKeys = Object.keys(roomTypesMod.ROOM_AMENITY_LABELS);
  assert.equal(groupedKeys.length, allBackendKeys.length);
  assert.equal(new Set(groupedKeys).size, 23);

  const searchResult = editorMod.filterAmenityGroups('dieu hoa');
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].keys[0], 'airConditioner');
});

test('safe delete evaluation blocks room types with rooms, checks permissions, and defers eligible deletions to backend', () => {
  // Case 1: room type currently used by 5 rooms -> blocked with exact message & room counts
  const invWithRooms = { total: 5, vacant: 2, occupied: 2, other: 1 };
  const blocked = editorMod.evaluateRoomTypeDeletion(sampleRoomType, invWithRooms, {
    canManage: true,
  });
  assert.equal(blocked.status, 'BLOCKED_ROOMS');
  if (blocked.status === 'BLOCKED_ROOMS') {
    assert.equal(blocked.roomCount, 5);
    assert.equal(blocked.occupiedCount, 2);
    assert.ok(blocked.message.includes('5 phòng'));
  }

  // Case 2: 0 rooms -> eligible for confirmation sheet (backend still checks bookings/FKs)
  const emptyType = { ...sampleRoomType, totalRooms: 0, vacantRooms: 0 };
  const eligible = editorMod.evaluateRoomTypeDeletion(
    emptyType,
    { total: 0, vacant: 0, occupied: 0, other: 0 },
    { canManage: true }
  );
  assert.equal(eligible.status, 'ELIGIBLE');
  if (eligible.status === 'ELIGIBLE') {
    assert.equal(eligible.imageCount, 3);
    assert.ok(eligible.warning.includes('3 ảnh'));
  }

  // Case 3: unauthorized user -> blocked
  const forbidden = editorMod.evaluateRoomTypeDeletion(
    emptyType,
    { total: 0, vacant: 0, occupied: 0, other: 0 },
    { canManage: false }
  );
  assert.equal(forbidden.status, 'BLOCKED_PERMISSION');
});
