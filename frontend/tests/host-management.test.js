import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_TABLE_PAGE_SIZE,
  compareFloorNames,
  computePortfolioSummary,
  computePropertyCardStats,
  filterAndSortRoomTypes,
  filterAndSortRooms,
  formatFloorHeading,
  getHostWorkspaceMemory,
  getRoomVisualState,
  groupRoomsByFloor,
  paginateItems,
  resetHostWorkspaceMemory,
  updateHostWorkspaceMemory,
} from '../src/services/host-management.js';

test('Scenario 1 & 2: Portfolio summary and property card stats for 1 property (10 rooms) and 5 properties', () => {
  const single = [
    {
      propertyId: 10,
      name: 'Nhà trọ An Khang',
      address: 'Cầu Giấy, Hà Nội',
      displayStatus: 'VISIBLE',
      roomTypeCount: 2,
      totalRooms: 10,
      vacantRooms: 3,
    },
  ];

  const card = computePropertyCardStats(single[0]);
  assert.equal(card.totalRooms, 10);
  assert.equal(card.vacantRooms, 3);
  assert.equal(card.occupiedRooms, 7);
  assert.equal(card.occupancyRate, 70);
  assert.equal(card.canManageRooms, true);
  assert.equal(card.statusMeta.label, 'Đang hoạt động');

  const singleSummary = computePortfolioSummary(single);
  assert.equal(singleSummary.totalProperties, 1);
  assert.equal(singleSummary.totalRoomTypes, 2);
  assert.equal(singleSummary.totalRooms, 10);
  assert.equal(singleSummary.vacantRooms, 3);
  assert.equal(singleSummary.occupiedRooms, 7);
  assert.equal(singleSummary.occupancyRate, 70);

  const fiveProps = [
    { propertyId: 1, displayStatus: 'VISIBLE', roomTypeCount: 3, totalRooms: 20, vacantRooms: 5 },
    { propertyId: 2, displayStatus: 'VISIBLE', roomTypeCount: 2, totalRooms: 15, vacantRooms: 0 },
    { propertyId: 3, displayStatus: 'INACTIVE', roomTypeCount: 1, totalRooms: 8, vacantRooms: 8 },
    { registrationId: 91, displayStatus: 'PENDING', roomTypeCount: 0, totalRooms: null, vacantRooms: null },
    { registrationId: 92, displayStatus: 'NEEDS_SUPPLEMENT', roomTypeCount: 0, totalRooms: null, vacantRooms: null },
  ];

  const multiSummary = computePortfolioSummary(fiveProps);
  assert.equal(multiSummary.totalProperties, 5);
  assert.equal(multiSummary.activeProperties, 2);
  assert.equal(multiSummary.pendingProperties, 1);
  assert.equal(multiSummary.supplementProperties, 1);
  assert.equal(multiSummary.totalRoomTypes, 6);
  assert.equal(multiSummary.totalRooms, 43);
  assert.equal(multiSummary.vacantRooms, 13);
  assert.equal(multiSummary.occupiedRooms, 30);
});

test('Scenario 3: Large property with 180 rooms paginates cleanly and groups by 9 floors in natural order', () => {
  const largeRooms = [];
  let id = 1;
  for (const floorNum of [9, 2, 10, 1, 5, 3, 8, 4, 6, 7]) {
    for (let seq = 1; seq <= 18; seq += 1) {
      largeRooms.push({
        roomId: id++,
        propertyId: 1,
        roomTypeId: seq <= 10 ? 100 : 101,
        roomType: seq <= 10 ? 'Studio tiêu chuẩn' : 'Phòng đôi ban công',
        roomNumber: `${floorNum}${String(seq).padStart(2, '0')}`,
        floor: `Tầng ${floorNum}`,
        status: seq % 3 === 0 ? 'VACANT' : 'OCCUPIED',
        price: seq <= 10 ? 3200000 : 4200000,
        confirmedAt: '2026-11-01T10:00:00',
      });
    }
  }

  assert.equal(largeRooms.length, 180);

  const sorted = filterAndSortRooms(largeRooms, { sort: 'ASC' });
  const groups = groupRoomsByFloor(sorted);
  assert.equal(groups.length, 10);
  assert.deepEqual(
    groups.map(g => g.floor),
    ['Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5', 'Tầng 6', 'Tầng 7', 'Tầng 8', 'Tầng 9', 'Tầng 10']
  );
  assert.equal(groups[0].total, 18);
  assert.equal(groups[0].vacant, 6);
  assert.equal(groups[0].occupied, 12);
  assert.equal(groups[0].roomTypeCount, 2);

  const page1 = paginateItems(sorted, 1, ROOM_TABLE_PAGE_SIZE);
  assert.equal(page1.pages, 9);
  assert.equal(page1.items.length, 20);
  assert.equal(page1.from, 1);
  assert.equal(page1.to, 20);

  const page9 = paginateItems(sorted, 99, ROOM_TABLE_PAGE_SIZE);
  assert.equal(page9.page, 9);
  assert.equal(page9.from, 161);
  assert.equal(page9.to, 180);
});

test('Scenario 4, 5 & 6: Non-consecutive odd rooms (105, 108, 110), multi-type floor, and multi-floor room type', () => {
  const rooms = [
    { roomId: 1, roomNumber: '101', floor: '1', roomTypeId: 11, roomType: 'Studio', status: 'VACANT', price: 3500000, confirmedAt: '2026-11-01T08:00:00' },
    { roomId: 2, roomNumber: '102', floor: 'Tầng 1', roomTypeId: 11, roomType: 'Studio', status: 'OCCUPIED', price: 3500000, confirmedAt: '2026-11-01T08:00:00' },
    { roomId: 3, roomNumber: '105', floor: 'Tầng 1', roomTypeId: 12, roomType: 'Gác xép', status: 'VACANT', price: 2800000, confirmedAt: null },
    { roomId: 4, roomNumber: '108', floor: 'Tầng 1', roomTypeId: 12, roomType: 'Gác xép', status: 'OCCUPIED', price: 2800000, confirmedAt: '2026-11-01T08:00:00' },
    { roomId: 5, roomNumber: '110', floor: 'Tầng 1', roomTypeId: 12, roomType: 'Gác xép', status: 'VACANT', price: 2900000, confirmedAt: null },
    { roomId: 6, roomNumber: '201', floor: 'Tầng 2', roomTypeId: 11, roomType: 'Studio', status: 'OCCUPIED', price: 3500000, confirmedAt: '2026-11-01T08:00:00' },
    { roomId: 7, roomNumber: '205', floor: 'Tầng 2', roomTypeId: 11, roomType: 'Studio', status: 'VACANT', price: 3600000, confirmedAt: '2026-11-01T08:00:00' },
  ];

  // Raw '1' and 'Tầng 1' normalize to the same 'Tầng 1' floor bucket
  const allFloors = groupRoomsByFloor(rooms);
  assert.equal(allFloors.length, 2);
  assert.equal(allFloors[0].floor, 'Tầng 1');
  assert.equal(allFloors[0].total, 5);
  assert.equal(allFloors[0].roomTypeCount, 2);
  assert.deepEqual(allFloors[0].rooms.map(r => r.roomNumber), ['101', '102', '105', '108', '110']);

  // Single room type spanning multiple floors (Studio -> Tầng 1 & Tầng 2)
  const studioOnly = filterAndSortRooms(rooms, { typeFilter: '11' });
  const studioFloors = groupRoomsByFloor(studioOnly);
  assert.equal(studioFloors.length, 2);
  assert.deepEqual(studioFloors.map(f => f.total), [2, 2]);

  // Filter unconfirmed odd rooms
  const unconfirmedOnly = filterAndSortRooms(rooms, { status: 'UNCONFIRMED' });
  assert.deepEqual(unconfirmedOnly.map(r => r.roomNumber), ['105', '110']);

  const visual105 = getRoomVisualState(rooms[2]);
  assert.equal(visual105.tone, 'vacant');
  assert.equal(visual105.shortLabel, 'Trống');
  assert.equal(visual105.unconfirmed, true);
});

test('Scenario 7 & 8: Empty room types and room types with zero rooms', () => {
  assert.deepEqual(filterAndSortRoomTypes([]), []);

  const types = [
    { roomTypeId: 1, roomType: 'Phòng đơn cơ bản', price: 2200000, totalRooms: 0, vacantRooms: 0 },
    { roomTypeId: 2, roomType: 'Studio ban công', price: 3800000, totalRooms: 6, vacantRooms: 2 },
    { roomTypeId: 3, roomType: 'Căn hộ mini 1PN', price: 4800000, totalRooms: 4, vacantRooms: 0 },
  ];

  assert.deepEqual(
    filterAndSortRoomTypes(types, { filter: 'EMPTY' }).map(t => t.roomTypeId),
    [1]
  );
  assert.deepEqual(
    filterAndSortRoomTypes(types, { filter: 'AVAILABLE' }).map(t => t.roomTypeId),
    [2]
  );
  assert.deepEqual(
    filterAndSortRoomTypes(types, { filter: 'FULL' }).map(t => t.roomTypeId),
    [3]
  );
  assert.deepEqual(
    filterAndSortRoomTypes(types, { sort: 'ROOMS_DESC' }).map(t => t.roomTypeId),
    [2, 3, 1]
  );
});

test('Natural Vietnamese floor ordering andworkspace memory isolation per user', () => {
  const messyFloors = ['Chưa phân tầng', 'Tầng 12', 'Tầng 2', 'Tầng trệt', 'Tầng hầm', 'Khu B', '1'];
  const ordered = messyFloors.map(formatFloorHeading).sort(compareFloorNames);
  assert.deepEqual(ordered, [
    'Tầng hầm',
    'Tầng trệt',
    'Tầng 1',
    'Tầng 2',
    'Tầng 12',
    'Khu B',
    'Chưa phân tầng',
  ]);

  resetHostWorkspaceMemory();
  updateHostWorkspaceMemory(101, {
    selectedPropertyId: '55',
    rooms: { search: '20', view: 'table' },
  });
  updateHostWorkspaceMemory(202, {
    selectedPropertyId: '88',
  });

  assert.equal(getHostWorkspaceMemory(101).selectedPropertyId, '55');
  assert.equal(getHostWorkspaceMemory(101).rooms.search, '20');
  assert.equal(getHostWorkspaceMemory(101).rooms.view, 'table');
  assert.equal(getHostWorkspaceMemory(101).rooms.status, 'ALL');
  assert.equal(getHostWorkspaceMemory(202).selectedPropertyId, '88');
  assert.equal(getHostWorkspaceMemory(202).rooms.view, 'floors');
  resetHostWorkspaceMemory();
});
