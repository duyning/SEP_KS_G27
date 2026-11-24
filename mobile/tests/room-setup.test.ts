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
    { module, exports: module.exports, ...bindings }
  );
  return module.exports;
}

const hostModels = compile('../src/services/host.ts', {
  require: () => ({}),
}) as typeof import('../src/services/host');

const roomTypesHelper = compile('../src/services/host-room-types.ts', {
  require: (name: string) => (name === './host' ? hostModels : {}),
}) as typeof import('../src/services/host-room-types');

const propReg = compile('../src/services/property-registration.ts', {
  require: () => ({}),
}) as typeof import('../src/services/property-registration');

const setup = compile('../src/services/room-setup.ts', {
  require: (name: string) => {
    if (name === './host') return hostModels;
    if (name === './host-room-types') return roomTypesHelper;
    if (name === './property-registration') return propReg;
    return {};
  },
}) as typeof import('../src/services/room-setup');

test('empty floor starts at 01 and existing floors continue sequentially across saved + draft rooms', () => {
  assert.equal(setup.nextRoomSequence([], 1, ''), 1);
  assert.equal(
    setup.nextRoomSequence(
      [
        { floor: 'Tầng 1', roomNumber: '101' },
        { floor: 'Tầng 1', roomNumber: '103' },
        { floor: 'Tầng 2', roomNumber: '205' },
      ],
      1,
      ''
    ),
    4
  );
  // Considers BOTH saved and draft rooms
  const batch = setup.generateExistingFloorBatch({
    floor: 1,
    extraRooms: 3,
    existingAndDraftRooms: [
      { floor: 'Tầng 1', roomNumber: '102' }, // saved
      { floor: 'Tầng 1', roomNumber: 'P.104' }, // draft
    ],
    batchId: 'b1',
  });
  assert.equal(batch.error, undefined);
  assert.equal(batch.rows.map(r => r.roomNumber).join(','), '105,106,107');
});

test('multi-floor range supports prefix, odd/even numbering and compact preview format', () => {
  const res = setup.generateFloorRangeBatch({
    fromFloor: 1,
    floorCount: 1,
    roomsPerFloor: 5,
    existingAndDraftRooms: [],
    batchId: 'b2',
  });
  assert.equal(res.error, undefined);
  assert.equal(setup.formatBatchPreview(res.rows), '5 phòng · 101, 102, 103…105');

  const oddPrefixed = setup.generateFloorRangeBatch({
    fromFloor: 2,
    floorCount: 2,
    roomsPerFloor: 3,
    prefix: 'P.',
    numbering: 'ODD',
    existingAndDraftRooms: [],
    batchId: 'b3',
  });
  assert.equal(oddPrefixed.error, undefined);
  assert.equal(
    oddPrefixed.rows.map(r => r.roomNumber).join(','),
    'P.201,P.203,P.205,P.301,P.303,P.305'
  );
  assert.equal(setup.formatBatchPreview(oddPrefixed.rows), '6 phòng · P.201, P.203, P.205…P.305');
});

test('optional fees and deposit clearly distinguish empty (null) vs zero (0)', () => {
  assert.equal(setup.parseOptionalNonNegativeInt('', 'Giá điện').value, null);
  assert.equal(setup.parseOptionalNonNegativeInt('   ', 'Tiền cọc').value, null);
  assert.equal(setup.parseOptionalNonNegativeInt('0', 'Giá điện').value, 0);
  assert.equal(setup.parseOptionalNonNegativeInt('3500', 'Giá điện').value, 3500);
  assert.ok(setup.parseOptionalNonNegativeInt('-5', 'Giá điện').error);

  assert.equal(setup.formatOptionalFeePreview('', 'đ/kWh'), 'Chưa xác định');
  assert.equal(setup.formatOptionalFeePreview('0', 'đ/kWh'), 'Miễn phí');
  assert.equal(
    setup.formatOptionalFeePreview('0', 'đ', 'Không yêu cầu cọc'),
    'Không yêu cầu cọc'
  );
  assert.ok(setup.formatOptionalFeePreview('3800', 'đ/kWh').includes('3.800'));
});

test('room type draft validation rejects duplicate names and respects total photo limits', () => {
  const savedTypes = [
    {
      roomTypeId: 10,
      propertyId: 5,
      roomType: 'Studio Ban Công',
      price: 3500000,
      areaSqm: 25,
      capacity: 2,
      totalRooms: 2,
      vacantRooms: 1,
    },
  ];
  const baseForm = {
    ...setup.EMPTY_ROOM_TYPE_FORM,
    roomType: 'studio ban công',
    areaSqm: '26',
    capacity: '2',
    price: '3600000',
    deposit: '',
    electricityPrice: '0',
    waterPrice: '25000',
  };

  const dup = setup.validateSetupRoomTypeDraft(baseForm, 5, savedTypes, []);
  assert.equal(dup.valid, false);
  assert.ok(dup.errors.roomType);

  const ok = setup.validateSetupRoomTypeDraft(
    { ...baseForm, roomType: 'Phòng Gác Lửng' },
    5,
    savedTypes,
    []
  );
  assert.equal(ok.valid, true);
  assert.equal(ok.payload?.deposit, null);
  assert.equal(ok.payload?.electricityPrice, 0);
  assert.equal(ok.payload?.waterPrice, 25000);
  assert.equal(ok.payload?.internetPrice, null);
  assert.equal(ok.payload?.servicePrice, null);
});

test('draft room validation detects duplicates against both saved and draft rooms and unassigned types', () => {
  const selectable = [
    { id: 10, roomType: 'Studio', price: 3200000, areaSqm: 25, capacity: 2, isDraft: false },
    { id: -1, roomType: 'Gác lửng', price: 2800000, areaSqm: 20, capacity: 2, isDraft: true },
  ];
  const savedRooms = [{ roomNumber: '101' }];
  const draftRows = [
    { rowId: 'r1', batchId: 'b1', floor: 'Tầng 1', roomNumber: 'P.101', roomTypeId: 10 }, // dup saved
    { rowId: 'r2', batchId: 'b1', floor: 'Tầng 1', roomNumber: 'P.0102', roomTypeId: -1 }, // dup draft
    { rowId: 'r3', batchId: 'b1', floor: 'Tầng 1', roomNumber: '102', roomTypeId: -1 }, // dup draft
    { rowId: 'r4', batchId: 'b1', floor: 'Tầng 1', roomNumber: '103', roomTypeId: null }, // unassigned
    { rowId: 'r5', batchId: 'b1', floor: 'Tầng 1', roomNumber: '104', roomTypeId: -1 }, // valid
  ];

  const report = setup.validateDraftRooms(draftRows, selectable, savedRooms);
  assert.equal(report.issueByRowId.r1?.code, 'DUPLICATE_SAVED');
  assert.equal(report.issueByRowId.r2?.code, 'DUPLICATE_DRAFT');
  assert.equal(report.issueByRowId.r3?.code, 'DUPLICATE_DRAFT');
  assert.equal(report.issueByRowId.r4?.code, 'MISSING_TYPE');
  assert.equal(report.issueByRowId.r5, undefined);
  assert.equal(report.unassignedCount, 1);
  assert.equal(report.duplicateCount, 3);
});

test('scoped assignment never overwrites rooms outside scope and supports undo', () => {
  const rows = [
    { rowId: 'r1', batchId: 'b1', floor: 'Tầng 1', roomNumber: '101', roomTypeId: 10 },
    { rowId: 'r2', batchId: 'b1', floor: 'Tầng 1', roomNumber: '102', roomTypeId: null },
    { rowId: 'r3', batchId: 'b1', floor: 'Tầng 2', roomNumber: '201', roomTypeId: null },
  ];
  // Only target unassigned rooms in Floor 1 (r2)
  const target = new Set(['r2']);
  const applied = setup.applyScopedTypeAssignment(rows, target, -1, 'Tầng 1 chưa gán');
  assert.equal(applied.affectedCount, 1);
  assert.equal(applied.nextRooms[0].roomTypeId, 10); // untouched
  assert.equal(applied.nextRooms[1].roomTypeId, -1); // updated
  assert.equal(applied.nextRooms[2].roomTypeId, null); // untouched

  assert.ok(applied.snapshot);
  const undone = setup.undoTypeAssignment(applied.nextRooms, applied.snapshot!);
  assert.equal(undone[0].roomTypeId, 10);
  assert.equal(undone[1].roomTypeId, null);
  assert.equal(undone[2].roomTypeId, null);
});

test('buildSetupRequest switches between LAYOUT_JSON and SETUP_MULTIPART and flattens photos in order', () => {
  const rows = [
    { rowId: 'r1', batchId: 'b1', floor: 'Tầng 1', roomNumber: '101', roomTypeId: 10 },
  ];
  const jsonReq = setup.buildSetupRequest(5, [], rows);
  assert.equal(jsonReq.mode, 'LAYOUT_JSON');
  assert.equal(jsonReq.layoutPayload?.propertyId, 5);
  assert.equal(jsonReq.layoutPayload?.rooms.length, 1);
  assert.equal(jsonReq.photos.length, 0);

  const draftType = {
    localId: -1,
    form: {
      ...setup.EMPTY_ROOM_TYPE_FORM,
      roomType: 'Studio Mới',
      photos: [
        { id: 'p1', uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: 1000 },
        { id: 'p2', uri: 'file:///b.jpg', mimeType: 'image/jpeg', fileSize: 2000 },
      ],
    },
    details: {
      propertyId: 5,
      roomType: 'Studio Mới',
      areaSqm: 25,
      capacity: 2,
      price: 3500000,
      deposit: null,
      electricityPrice: 0,
      waterPrice: null,
      internetPrice: null,
      servicePrice: null,
      description: '',
      imageUrl: null,
      amenities: [],
      retainedImageIds: [],
    },
  };
  const multiReq = setup.buildSetupRequest(5, [draftType], [
    { rowId: 'r2', batchId: 'b1', floor: 'Tầng 1', roomNumber: '102', roomTypeId: -1 },
  ]);
  assert.equal(multiReq.mode, 'SETUP_MULTIPART');
  assert.equal(multiReq.setupPayload?.types[0].photoCount, 2);
  assert.equal(multiReq.photos.length, 2);
  assert.equal(multiReq.photos[0].id, 'p1');
  assert.equal(multiReq.photos[1].id, 'p2');
});

test('response validators and reconciliation protect against false success and duplicate retries', () => {
  assert.throws(() => setup.validateLayoutResponse({}, 5, 1));
  const okLayout = setup.validateLayoutResponse(
    [{ roomId: 99, propertyId: 5, roomNumber: '101' }],
    5,
    1
  );
  assert.equal(okLayout.length, 1);

  assert.throws(() =>
    setup.validateSetupResponse({ createdTypes: {}, rooms: [] }, 5, [-1], 1)
  );
  const okSetup = setup.validateSetupResponse(
    {
      createdTypes: { '-1': 42 },
      rooms: [{ roomId: 100, propertyId: 5, roomNumber: '101' }],
    },
    5,
    [-1],
    1
  );
  assert.equal(okSetup.createdTypes['-1'], 42);

  const reconciled = setup.reconcileDraftAgainstServer(
    [],
    [{ rowId: 'r1', batchId: 'b1', floor: 'Tầng 1', roomNumber: '101', roomTypeId: 10 }],
    [],
    [
      {
        roomId: 99,
        propertyId: 5,
        roomTypeId: 10,
        roomType: 'Studio',
        roomNumber: '101',
        floor: 'Tầng 1',
        status: 'VACANT',
        price: 3200000,
        customPrice: null,
        areaSqm: 25,
      },
    ]
  );
  assert.equal(reconciled.allAlreadyCreated, true);
  assert.ok(reconciled.conflictSummary);
});

test('groupPreviewByFloor sorts floors numerically and counts distinct used saved types accurately', () => {
  const rows = [
    { rowId: 'a', batchId: 'b1', floor: 'Tầng 2', roomNumber: '201', roomTypeId: 10 },
    { rowId: 'b', batchId: 'b1', floor: 'Tầng 1', roomNumber: '101', roomTypeId: 10 },
    { rowId: 'c', batchId: 'b1', floor: 'Tầng 1', roomNumber: '102', roomTypeId: -1 },
    { rowId: 'd', batchId: 'b1', floor: 'Tầng 10', roomNumber: '1001', roomTypeId: 20 },
  ];
  const groups = setup.groupPreviewByFloor(rows);
  assert.equal(groups.map(g => g.floor).join(','), 'Tầng 1,Tầng 2,Tầng 10');
  assert.equal(groups[0].rooms.length, 2);

  const usedSaved = setup.countUsedSavedTypes(rows, [
    { roomTypeId: 10 },
    { roomTypeId: 20 },
    { roomTypeId: 30 },
  ]);
  assert.equal(usedSaved, 2);
});

test('grouped amenities cover every backend room amenity key cleanly without duplicates', () => {
  const groupedKeys = setup.ROOM_AMENITY_GROUPS.flatMap(g => [...g.keys]);
  const backendKeys = Object.keys(roomTypesHelper.ROOM_AMENITY_LABELS);
  assert.equal(new Set(groupedKeys).size, groupedKeys.length);
  assert.equal(groupedKeys.length, backendKeys.length);
  for (const key of backendKeys) {
    assert.ok(groupedKeys.includes(key));
  }
});

test('draft serialization and restoration preserve state, stable negative IDs and drop stale local photos safely', () => {
  const raw = setup.serializeRoomSetupDraft({
    propertyId: 7,
    step: 3,
    selectedSavedTypeIds: [11, 12],
    draftTypes: [
      {
        localId: -2,
        form: {
          ...setup.EMPTY_ROOM_TYPE_FORM,
          roomType: 'Duplex Nháp',
          areaSqm: '32',
          capacity: '3',
          price: '4500000',
          photos: [
            { id: 'p-ok', uri: 'file:///exists.jpg', mimeType: 'image/jpeg', fileSize: 1024 },
            { id: 'p-gone', uri: 'file:///missing.jpg', mimeType: 'image/jpeg', fileSize: 2048 },
          ],
        },
        details: {
          propertyId: 7,
          roomType: 'Duplex Nháp',
          areaSqm: 32,
          capacity: 3,
          price: 4500000,
          deposit: null,
          electricityPrice: 0,
          waterPrice: 25000,
          internetPrice: null,
          servicePrice: null,
          description: '',
          imageUrl: null,
          amenities: ['wifi', 'airConditioner'],
          retainedImageIds: [],
        },
      },
    ],
    batches: [{ batchId: 'b1', mode: 'RANGE', label: 'Tầng 1–2', createdAt: 1000 }],
    draftRooms: [
      { rowId: 'r1', batchId: 'b1', floor: 'Tầng 1', roomNumber: '101', roomTypeId: -2 },
      { rowId: 'r2', batchId: 'b1', floor: 'Tầng 1', roomNumber: '102', roomTypeId: null },
    ],
    savedAt: '2026-11-21T14:00:00.000Z',
  });

  // Wrong propertyId is rejected
  const wrongProp = setup.parseRoomSetupDraft(raw, 99);
  assert.equal(wrongProp.draft, null);

  // Matching propertyId restores cleanly and drops missing photo URI
  const restored = setup.parseRoomSetupDraft(raw, 7, uri => uri === 'file:///exists.jpg');
  assert.ok(restored.draft);
  assert.equal(restored.draft?.step, 3);
  assert.equal(restored.draft?.selectedSavedTypeIds.join(','), '11,12');
  assert.equal(restored.draft?.draftTypes.length, 1);
  assert.equal(restored.draft?.draftTypes[0].form.photos.length, 1);
  assert.equal(restored.droppedPhotoCount, 1);
  assert.equal(restored.nextLocalTypeId, -3);
  assert.equal(restored.draft?.draftRooms[0].roomTypeId, -2);
  assert.equal(restored.draft?.draftRooms[1].roomTypeId, null);
});

test('unassigning and re-assigning rooms work cleanly with undo', () => {
  const rows = [
    { rowId: 'r1', batchId: 'b1', floor: 'Tầng 1', roomNumber: '101', roomTypeId: 10 },
  ];
  const cleared = setup.applyScopedTypeAssignment(rows, new Set(['r1']), null, 'Bỏ gán 101');
  assert.equal(cleared.affectedCount, 1);
  assert.equal(cleared.nextRooms[0].roomTypeId, null);

  const reassigned = setup.applyScopedTypeAssignment(
    cleared.nextRooms,
    new Set(['r1']),
    -1,
    'Gán lại 101'
  );
  assert.equal(reassigned.nextRooms[0].roomTypeId, -1);

  const undone = setup.undoTypeAssignment(reassigned.nextRooms, reassigned.snapshot!);
  assert.equal(undone[0].roomTypeId, null);
});
