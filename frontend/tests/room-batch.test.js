import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import {
  blankRoomGroup,
  buildFloorRoomNumber,
  DEFAULT_START_SEQUENCE,
  formatFloorLabel,
  formatRoomSequence,
  generateRoomDrafts,
  inspectFloorGroup,
  MAX_BATCH_ROOMS,
  normalizeFloorValue,
  parseFloorNumber,
  reconcileRoomBatch,
  removeFloorFromBatch,
  removeRoomFromBatch,
  restoreExcludedForGroup,
  roomBatchPayload,
  validateOddRoomCandidate,
  validateRoomDrafts,
} from '../src/services/room-batch.js';
import { hostApi } from '../src/services/host.js';

const originalGlobals = {
  fetch: globalThis.fetch,
  sessionStorage: globalThis.sessionStorage,
  localStorage: globalThis.localStorage,
};
after(() => Object.assign(globalThis, originalGlobals));

test('new floor group defaults start sequence to 01 and contains no sample rooms', () => {
  const group = blankRoomGroup();
  assert.equal(group.floor, '');
  assert.equal(group.start, DEFAULT_START_SEQUENCE);
  assert.equal(group.start, '01');
  assert.equal(group.count, '');
  assert.equal(inspectFloorGroup(group).blank, true);
  assert.ok(generateRoomDrafts([group]).errors.groups[0]);
});

test('scenario 1–3: generates 101–105, 301–305, and 305–309 preserving leading zero in sequence', () => {
  const g101 = inspectFloorGroup({ id: 'g1', floor: '1', start: '01', count: '5' });
  assert.equal(g101.valid, true);
  assert.equal(g101.firstRoomPreview, '101');
  assert.equal(g101.lastRoomPreview, '105');
  assert.equal(g101.rangeSummary, 'Sẽ tạo 5 phòng: 101 → 105');
  assert.deepEqual(
    g101.generatedRooms.map(r => ({ roomNumber: r.roomNumber, floor: r.floor })),
    [
      { roomNumber: '101', floor: 'Tầng 1' },
      { roomNumber: '102', floor: 'Tầng 1' },
      { roomNumber: '103', floor: 'Tầng 1' },
      { roomNumber: '104', floor: 'Tầng 1' },
      { roomNumber: '105', floor: 'Tầng 1' },
    ],
  );

  const g301 = inspectFloorGroup({ id: 'g2', floor: '3', start: '01', count: '5' });
  assert.equal(g301.firstRoomPreview, '301');
  assert.equal(g301.rangeSummary, 'Sẽ tạo 5 phòng: 301 → 305');
  assert.deepEqual(g301.generatedRooms.map(r => r.roomNumber), ['301', '302', '303', '304', '305']);

  const g305 = inspectFloorGroup({ id: 'g3', floor: '3', start: '05', count: '5' });
  assert.equal(g305.firstRoomPreview, '305');
  assert.equal(g305.rangeSummary, 'Sẽ tạo 5 phòng: 305 → 309');
  assert.deepEqual(g305.generatedRooms.map(r => r.roomNumber), ['305', '306', '307', '308', '309']);

  // Ground floor 0 preserves leading zeros (001, 002)
  assert.equal(buildFloorRoomNumber(0, 1), '001');
  assert.equal(formatFloorLabel(0), 'Tầng 0');
  assert.equal(formatRoomSequence('5'), '05');
  assert.equal(formatRoomSequence('01'), '01');
  assert.equal(formatRoomSequence('12'), '12');
});

test('scenario 4–6: adds odd rooms 108 and 110 standalone or merged into an existing floor', () => {
  // Scenario 5: Odd rooms when no floor group has been filled yet
  const blankGroups = [blankRoomGroup({ id: 'empty-1' })];
  const odd108 = validateOddRoomCandidate({ floor: '1', roomNumber: '108' }, { currentRows: [] });
  const odd110 = validateOddRoomCandidate({ floor: '1', roomNumber: '110' }, { currentRows: [odd108.normalizedRoom] });
  assert.equal(odd108.valid, true);
  assert.equal(odd110.valid, true);

  const oddOnlyState = reconcileRoomBatch({
    groups: blankGroups,
    oddRooms: [
      { id: 'o1', ...odd108.normalizedRoom },
      { id: 'o2', ...odd110.normalizedRoom },
    ],
  });
  assert.equal(oddOnlyState.hasBlockingErrors, false);
  assert.equal(oddOnlyState.totalRooms, 2);
  assert.equal(oddOnlyState.totalFloors, 1);
  assert.deepEqual(oddOnlyState.rows.map(r => r.roomNumber), ['108', '110']);

  // Scenario 4 & 6: Odd rooms merged into existing auto-generated Floor 1 (101..105 + 108, 110)
  const merged = reconcileRoomBatch({
    groups: [{ id: 'g1', floor: '1', start: '01', count: '5' }],
    oddRooms: [
      { id: 'o1', roomNumber: '108', floor: 'Tầng 1' },
      { id: 'o2', roomNumber: '110', floor: 'Tầng 1' },
    ],
  });
  assert.equal(merged.hasBlockingErrors, false);
  assert.equal(merged.totalRooms, 7);
  assert.equal(merged.totalFloors, 1);
  assert.equal(merged.floorBuckets[0].floor, 'Tầng 1');
  assert.equal(merged.floorBuckets[0].compactText, '101 · 102 · 103 · 104 · 105 · 108 · 110');
});

test('scenario 7 & 10: deleting auto-generated room 103 permanently excludes it across tab/step switches and final payload', () => {
  let state = {
    groups: [{ id: 'g1', floor: '1', start: '01', count: '5' }],
    oddRooms: [{ id: 'o1', roomNumber: '108', floor: 'Tầng 1' }],
    excludedAutoRooms: [],
  };

  // Delete auto-generated 103 from preview
  state = removeRoomFromBatch(state, { roomNumber: '103' });
  assert.deepEqual(state.excludedAutoRooms, ['103']);

  // Add another odd room 110 after deleting 103, simulating mode switching & Step 1 <-> Step 2 roundtrip
  state = {
    ...state,
    oddRooms: [...state.oddRooms, { id: 'o2', roomNumber: '110', floor: 'Tầng 1' }],
  };

  const reconciled = reconcileRoomBatch(state);
  assert.equal(reconciled.hasBlockingErrors, false);
  assert.deepEqual(reconciled.rows.map(r => r.roomNumber), ['101', '102', '104', '105', '108', '110']);
  assert.equal(reconciled.rows.some(r => r.roomNumber === '103'), false);

  // Final backend API payload must NOT contain 103
  const payload = roomBatchPayload(reconciled.rows);
  assert.deepEqual(
    payload.rooms.map(r => r.roomNumber),
    ['101', '102', '104', '105', '108', '110'],
  );

  // Explicit restore brings 103 back only when requested by user
  const restored = restoreExcludedForGroup(state, 'g1');
  assert.equal(reconcileRoomBatch(restored).rows.some(r => r.roomNumber === '103'), true);
});

test('scenario 8: blocks duplicates in odd rooms, multi-group same floor overlaps, and backend existingRoomNumbers', () => {
  const base = reconcileRoomBatch({
    groups: [{ id: 'g1', floor: '1', start: '01', count: '5' }],
    oddRooms: [{ id: 'o1', roomNumber: '108', floor: 'Tầng 1' }],
    existingRoomNumbers: ['201'],
  });

  // Odd room colliding with auto-generated room 102
  const dupPreview = validateOddRoomCandidate(
    { floor: '1', roomNumber: '102' },
    { currentRows: base.rows, existingRoomNumbers: ['201'] },
  );
  assert.equal(dupPreview.valid, false);
  assert.match(dupPreview.errors.roomNumber, /đã có trong danh sách dự kiến/);

  // Odd room colliding with existing backend room 201 (case-insensitive)
  const dupBackend = validateOddRoomCandidate(
    { floor: '2', roomNumber: '201' },
    { currentRows: base.rows, existingRoomNumbers: ['201'] },
  );
  assert.equal(dupBackend.valid, false);
  assert.match(dupBackend.errors.roomNumber, /đã tồn tại trong nhà trọ/);

  // Two groups on the same floor overlapping (101..105 and 103..106)
  const overlap = reconcileRoomBatch({
    groups: [
      { id: 'g1', floor: '1', start: '01', count: '5' },
      { id: 'g2', floor: '1', start: '03', count: '4' },
    ],
  });
  assert.equal(overlap.hasOverlappingGroup, true);
  assert.equal(overlap.hasBlockingErrors, true);
  assert.equal(overlap.groupMeta.g2.suggestedStart, '06');

  // Two groups on the same floor NOT overlapping (101..103 and 106..107) succeed cleanly
  const sameFloorValid = reconcileRoomBatch({
    groups: [
      { id: 'g1', floor: '1', start: '01', count: '3' },
      { id: 'g2', floor: '1', start: '06', count: '2' },
    ],
  });
  assert.equal(sameFloorValid.hasBlockingErrors, false);
  assert.deepEqual(sameFloorValid.rows.map(r => r.roomNumber), ['101', '102', '103', '106', '107']);

  // Backend existing room conflict inside floor group
  const backendConflict = reconcileRoomBatch({
    groups: [{ id: 'g1', floor: '2', start: '01', count: '3' }],
    existingRoomNumbers: ['202'],
  });
  assert.equal(backendConflict.hasBlockingErrors, true);
  assert.deepEqual(backendConflict.groupMeta.g1.existingConflicts, ['202']);
});

test('scenario 9 & 11: multi-floor natural sorting and deleting an entire floor updates totals immediately', () => {
  const initial = {
    groups: [
      { id: 'g3', floor: '3', start: '01', count: '3' },
      { id: 'g1', floor: '1', start: '01', count: '3' },
      { id: 'g2', floor: '2', start: '01', count: '4' },
    ],
    oddRooms: [
      { id: 'o1', roomNumber: '105', floor: 'Tầng 1' },
      { id: 'o2', roomNumber: '108', floor: 'Tầng 1' },
    ],
    excludedAutoRooms: [],
  };

  const multi = reconcileRoomBatch(initial);
  assert.equal(multi.totalRooms, 12);
  assert.equal(multi.totalFloors, 3);
  assert.deepEqual(multi.floorBuckets.map(b => `${b.floor}:${b.count}`), [
    'Tầng 1:5',
    'Tầng 2:4',
    'Tầng 3:3',
  ]);
  assert.equal(multi.floorBuckets[0].compactText, '101 · 102 · 103 · 105 · 108');

  // Delete entire Tầng 1 (removes both g1 and o1, o2)
  const afterFloorDelete = removeFloorFromBatch(initial, 'Tầng 1');
  const updated = reconcileRoomBatch(afterFloorDelete);
  assert.equal(updated.totalRooms, 7);
  assert.equal(updated.totalFloors, 2);
  assert.deepEqual(updated.floorBuckets.map(b => b.floor), ['Tầng 2', 'Tầng 3']);
});

test('scenario 12 & validation: handles ~200 rooms smoothly, blocks >200, negative floors, and zero/negative counts', () => {
  // Reject negative floors & non-integers
  for (const badFloor of ['-1', '-5', '1.5', 'Tầng 3', 'Khu A', '']) {
    assert.equal(parseFloorNumber(badFloor).valid, false, `Expected invalid floor: ${badFloor}`);
  }
  assert.match(parseFloorNumber('-2').error, /âm/);

  // Reject 0 or negative room counts & >200
  for (const badCount of ['0', '-1', '-10', '201', '2.5', '']) {
    assert.ok(inspectFloorGroup({ id: 'g', floor: '1', start: '01', count: badCount }).errors.count, `Expected invalid count: ${badCount}`);
  }

  // Create 198 rooms across 9 floors (22 rooms per floor) + 2 odd rooms = 200 rooms (at MAX_BATCH_ROOMS)
  const nearMaxGroups = Array.from({ length: 9 }, (_, i) => ({
    id: `g-${i + 1}`,
    floor: String(i + 1),
    start: '01',
    count: '22',
  }));
  const nearMax = reconcileRoomBatch({
    groups: nearMaxGroups,
    oddRooms: [
      { id: 'o1', roomNumber: '1001', floor: 'Tầng 10' },
      { id: 'o2', roomNumber: '1002', floor: 'Tầng 10' },
    ],
  });
  assert.equal(nearMax.totalRooms, MAX_BATCH_ROOMS);
  assert.equal(nearMax.totalFloors, 10);
  assert.equal(nearMax.hasBlockingErrors, false);
  assert.equal(nearMax.floorBuckets[0].overflowCount > 0, true);

  // Adding 201st room via odd room or group is blocked
  const overLimitOdd = validateOddRoomCandidate(
    { floor: '10', roomNumber: '1003' },
    { currentRows: nearMax.rows },
  );
  assert.equal(overLimitOdd.valid, false);

  const overLimitBatch = reconcileRoomBatch({
    groups: [...nearMaxGroups, { id: 'g-10', floor: '10', start: '01', count: '3' }],
  });
  assert.equal(overLimitBatch.totalRooms, 201);
  assert.equal(overLimitBatch.hasBlockingErrors, true);
});

test('scenario 14 & Excel compatibility: reconciled payload matches backend contract and validateRoomDrafts stays compatible', async () => {
  // Excel floor normalization compatibility
  assert.equal(normalizeFloorValue('3'), 'Tầng 3');
  assert.equal(normalizeFloorValue('tầng 02'), 'Tầng 2');
  assert.equal(normalizeFloorValue('Khu B'), 'Khu B');

  const draftErrors = validateRoomDrafts(
    [{ roomNumber: '101', floor: 'Tầng 1' }, { roomNumber: '101', floor: 'Tầng 2' }, { roomNumber: '201', floor: '' }],
    ['201'],
  );
  assert.ok(draftErrors.rows[0].roomNumber);
  assert.ok(draftErrors.rows[1].roomNumber);
  assert.match(draftErrors.rows[2].roomNumber, /Mã phòng đã có/);
  assert.ok(draftErrors.rows[2].floor);

  // Real hostApi.createRoomTypeWithRooms multipart request contract with reconciled Step 2 data
  globalThis.sessionStorage = { getItem: () => 'batch-token' };
  globalThis.localStorage = { getItem: () => null };

  let state = {
    groups: [{ id: 'g1', floor: '1', start: '01', count: '5' }],
    oddRooms: [{ id: 'o1', roomNumber: '108', floor: 'Tầng 1' }],
    excludedAutoRooms: [],
  };
  state = removeRoomFromBatch(state, '103');
  const reconciled = reconcileRoomBatch(state);
  const layout = roomBatchPayload(reconciled.rows);
  const details = { propertyId: 9, roomType: 'Studio NestHub', price: 3200000, areaSqm: 28, capacity: 2, amenities: ['wifi'] };

  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/host/room-types/with-rooms');
    assert.equal(options.method, 'POST');
    const sentLayout = JSON.parse(await options.body.get('layout').text());
    assert.deepEqual(sentLayout, {
      rooms: [
        { roomNumber: '101', floor: 'Tầng 1' },
        { roomNumber: '102', floor: 'Tầng 1' },
        { roomNumber: '104', floor: 'Tầng 1' },
        { roomNumber: '105', floor: 'Tầng 1' },
        { roomNumber: '108', floor: 'Tầng 1' },
      ],
    });
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...details,
          roomTypeId: 77,
          rooms: sentLayout.rooms.map((r, idx) => ({ ...r, roomId: 500 + idx, roomTypeId: 77, propertyId: 9 })),
        },
      }),
    );
  };

  const saved = await hostApi.createRoomTypeWithRooms(details, layout, []);
  assert.equal(saved.roomTypeId, 77);
  assert.equal(saved.rooms.length, 5);
  assert.equal(saved.rooms.some(r => r.roomNumber === '103'), false);
});
