const normalizeText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();

export const ROOM_TABLE_PAGE_SIZE = 20;

export const PROPERTY_STATUS_META = {
  VISIBLE: { label: 'Đang hoạt động', detailLabel: 'Đang hiển thị', tone: 'active' },
  APPROVED: { label: 'Đã duyệt · Ẩn', detailLabel: 'Đã duyệt · Chưa hiển thị', tone: 'info' },
  INACTIVE: { label: 'Ngừng hiển thị', detailLabel: 'Chưa hiển thị', tone: 'neutral' },
  PENDING: { label: 'Chờ xét duyệt', detailLabel: 'Hồ sơ đang chờ xét duyệt', tone: 'warning' },
  NEEDS_SUPPLEMENT: { label: 'Cần bổ sung', detailLabel: 'Hồ sơ cần bổ sung', tone: 'warning' },
  REJECTED: { label: 'Chưa được duyệt', detailLabel: 'Hồ sơ chưa được duyệt', tone: 'danger' },
};

export function formatShortAddress(record) {
  if (!record) return 'Chưa cập nhật địa chỉ';
  const raw = String(record.address || '').trim();
  if (raw) return raw;
  const parts = [record.addressDetail, record.commune].map(part => String(part || '').trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : 'Chưa cập nhật địa chỉ';
}

export function computePropertyCardStats(record) {
  const hasRooms = Number.isInteger(record?.totalRooms) && record.totalRooms >= 0;
  const totalRooms = hasRooms ? record.totalRooms : null;
  const vacantRooms = hasRooms && Number.isInteger(record?.vacantRooms)
    ? Math.min(totalRooms, Math.max(0, record.vacantRooms))
    : hasRooms ? 0 : null;
  const occupiedRooms = hasRooms ? Math.max(0, totalRooms - vacantRooms) : null;
  const occupancyRate = hasRooms && totalRooms > 0
    ? Math.round((occupiedRooms / totalRooms) * 100)
    : null;
  const canManageRooms = record?.propertyId != null && ['VISIBLE', 'APPROVED', 'INACTIVE'].includes(record.displayStatus);
  const needsSupplement =
    record?.displayStatus === 'NEEDS_SUPPLEMENT' || record?.changeRequest?.status === 'NEEDS_SUPPLEMENT';

  return {
    totalRooms,
    vacantRooms,
    occupiedRooms,
    occupancyRate,
    roomTypeCount: Number.isInteger(record?.roomTypeCount) ? record.roomTypeCount : 0,
    hasRoomStats: hasRooms,
    canManageRooms,
    needsSupplement,
    shortAddress: formatShortAddress(record),
    statusMeta: record?.reverificationRequired ? {label:'Chờ tái xác minh',detailLabel:'Tạm ẩn để tái xác minh',tone:'warning'} : PROPERTY_STATUS_META[record?.displayStatus] || {
      label: record?.displayStatus || 'Chưa xác định',
      detailLabel: record?.displayStatus || 'Chưa xác định',
      tone: 'neutral',
    },
  };
}

export function computePortfolioSummary(records = []) {
  const list = Array.isArray(records) ? records : [];
  let activeProperties = 0;
  let pendingProperties = 0;
  let supplementProperties = 0;
  let totalRoomTypes = 0;
  let totalRooms = 0;
  let vacantRooms = 0;
  let hasAnyRoomData = false;

  for (const record of list) {
    if (record?.displayStatus === 'VISIBLE' || record?.displayStatus === 'APPROVED') activeProperties += 1;
    if (record?.displayStatus === 'PENDING') pendingProperties += 1;
    if (record?.displayStatus === 'NEEDS_SUPPLEMENT' || record?.changeRequest?.status === 'NEEDS_SUPPLEMENT') {
      supplementProperties += 1;
    }
    if (Number.isInteger(record?.roomTypeCount) && record.roomTypeCount > 0) {
      totalRoomTypes += record.roomTypeCount;
    }
    if (Number.isInteger(record?.totalRooms) && record.totalRooms >= 0) {
      hasAnyRoomData = true;
      totalRooms += record.totalRooms;
      const vacant = Number.isInteger(record?.vacantRooms)
        ? Math.min(record.totalRooms, Math.max(0, record.vacantRooms))
        : 0;
      vacantRooms += vacant;
    }
  }

  const occupiedRooms = Math.max(0, totalRooms - vacantRooms);
  const occupancyRate = hasAnyRoomData && totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : null;

  return {
    totalProperties: list.length,
    activeProperties,
    pendingProperties,
    supplementProperties,
    totalRoomTypes,
    totalRooms: hasAnyRoomData ? totalRooms : 0,
    vacantRooms: hasAnyRoomData ? vacantRooms : 0,
    occupiedRooms: hasAnyRoomData ? occupiedRooms : 0,
    hasAnyRoomData,
    occupancyRate,
  };
}

export function getRoomVisualState(room) {
  const status = String(room?.status || '').toUpperCase();
  const unconfirmed = !room?.confirmedAt;
  if (status === 'VACANT') {
    return {
      tone: 'vacant',
      shortLabel: 'Trống',
      fullLabel: 'Còn trống',
      unconfirmed,
    };
  }
  if (status === 'OCCUPIED') {
    return {
      tone: 'occupied',
      shortLabel: 'Đang thuê',
      fullLabel: 'Đang thuê',
      unconfirmed,
    };
  }
  if (status === 'MAINTENANCE') {
    return {
      tone: 'maintenance',
      shortLabel: 'Bảo trì',
      fullLabel: 'Đang bảo trì',
      unconfirmed,
    };
  }
  return {
    tone: 'other',
    shortLabel: room?.status || 'Khác',
    fullLabel: room?.status || 'Chưa xác định',
    unconfirmed,
  };
}

export function parseFloorSortRank(floor) {
  const label = String(floor || '').trim();
  const norm = normalizeText(label);
  if (!label || norm === 'chua phan tang') return { group: 3, number: 9999, normalized: 'zzzz' };
  if (norm === 'tang ham' || norm.startsWith('tang ham ')) {
    const match = norm.match(/(\d+)/);
    return { group: 0, number: match ? -Number(match[1]) : -1, normalized: norm };
  }
  if (norm === 'tang tret' || norm === 'tret' || norm === 'tang g' || norm === 'tang 0') {
    return { group: 1, number: 0, normalized: norm };
  }
  const tangMatch = norm.match(/^tang\s*(\d+)(?:\b|$)/);
  if (tangMatch) {
    return { group: 1, number: Number(tangMatch[1]), normalized: norm };
  }
  const numericOnly = norm.match(/^(\d+)$/);
  if (numericOnly) {
    return { group: 1, number: Number(numericOnly[1]), normalized: norm };
  }
  return { group: 2, number: 1000, normalized: norm };
}

export function compareFloorNames(a, b) {
  const rankA = parseFloorSortRank(a);
  const rankB = parseFloorSortRank(b);
  if (rankA.group !== rankB.group) return rankA.group - rankB.group;
  if (rankA.number !== rankB.number) return rankA.number - rankB.number;
  return String(a || '').localeCompare(String(b || ''), 'vi', { numeric: true });
}

export function formatFloorHeading(floor) {
  const trimmed = String(floor || '').trim();
  if (!trimmed) return 'Chưa phân tầng';
  if (/^\d+$/.test(trimmed)) return `Tầng ${trimmed}`;
  return trimmed;
}

export function groupRoomsByFloor(rooms = []) {
  const buckets = new Map();
  for (const room of rooms) {
    const rawFloor = String(room?.floor || '').trim();
    const key = formatFloorHeading(rawFloor);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        floor: key,
        rawFloor: rawFloor || key,
        rooms: [],
        total: 0,
        vacant: 0,
        occupied: 0,
        maintenance: 0,
        unconfirmed: 0,
        typeNames: new Set(),
      };
      buckets.set(key, bucket);
    }
    bucket.rooms.push(room);
    bucket.total += 1;
    if (room?.status === 'VACANT') bucket.vacant += 1;
    else if (room?.status === 'OCCUPIED') bucket.occupied += 1;
    else if (room?.status === 'MAINTENANCE') bucket.maintenance += 1;
    if (!room?.confirmedAt) bucket.unconfirmed += 1;
    if (room?.roomType) bucket.typeNames.add(room.roomType);
  }

  return [...buckets.values()]
    .sort((left, right) => compareFloorNames(left.floor, right.floor))
    .map(bucket => ({
      key: bucket.key,
      floor: bucket.floor,
      rooms: bucket.rooms,
      total: bucket.total,
      vacant: bucket.vacant,
      occupied: bucket.occupied,
      maintenance: bucket.maintenance,
      unconfirmed: bucket.unconfirmed,
      roomTypes: [...bucket.typeNames],
      roomTypeCount: bucket.typeNames.size,
    }));
}

export function filterAndSortRooms(rooms = [], { search = '', typeFilter = 'ALL', floor = 'ALL', status = 'ALL', sort = 'ASC' } = {}) {
  const query = normalizeText(search);
  const filtered = rooms.filter(room => {
    if (typeFilter !== 'ALL' && String(room.roomTypeId) !== String(typeFilter)) return false;
    if (floor !== 'ALL' && formatFloorHeading(room.floor) !== formatFloorHeading(floor)) return false;
    if (status === 'UNCONFIRMED') {
      if (room.confirmedAt) return false;
    } else if (status !== 'ALL' && room.status !== status) {
      return false;
    }
    if (query) {
      const haystack = normalizeText(`${room.roomNumber} ${room.roomType} ${room.floor}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sort === 'PRICE_ASC' || sort === 'PRICE') return (Number(a.price) || 0) - (Number(b.price) || 0) || String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true });
    if (sort === 'PRICE_DESC') return (Number(b.price) || 0) - (Number(a.price) || 0) || String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true });
    if (sort === 'FLOOR') {
      const floorDiff = compareFloorNames(a.floor, b.floor);
      if (floorDiff !== 0) return floorDiff;
      return String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true });
    }
    if (sort === 'STATUS') {
      const statusDiff = String(a.status).localeCompare(String(b.status));
      if (statusDiff !== 0) return -statusDiff; // VACANT before OCCUPIED
      return String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true });
    }
    const factor = sort === 'DESC' ? -1 : 1;
    return factor * String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true });
  });
}

export function filterAndSortRoomTypes(types = [], { search = '', filter = 'ALL', sort = 'NEWEST' } = {}) {
  const query = normalizeText(search);
  const filtered = types.filter(item => {
    if (query && !normalizeText(item.roomType).includes(query)) return false;
    if (filter === 'AVAILABLE') return (item.vacantRooms ?? 0) > 0;
    if (filter === 'FULL') return (item.totalRooms ?? 0) > 0 && item.vacantRooms === 0;
    if (filter === 'EMPTY') return (item.totalRooms ?? 0) === 0;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sort === 'PRICE_ASC') return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sort === 'PRICE_DESC') return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sort === 'ROOMS_DESC') return (b.totalRooms ?? -1) - (a.totalRooms ?? -1);
    if (sort === 'NAME') return String(a.roomType).localeCompare(String(b.roomType), 'vi', { numeric: true });
    return (b.roomTypeId || 0) - (a.roomTypeId || 0);
  });
}

export function paginateItems(items = [], page = 1, pageSize = ROOM_TABLE_PAGE_SIZE) {
  const safeSize = Math.max(1, Number.isSafeInteger(Number(pageSize)) ? Number(pageSize) : ROOM_TABLE_PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(items.length / safeSize));
  const selected = Math.min(pages, Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1));
  const startIndex = (selected - 1) * safeSize;
  return {
    page: selected,
    pages,
    pageSize: safeSize,
    total: items.length,
    from: items.length ? startIndex + 1 : 0,
    to: Math.min(startIndex + safeSize, items.length),
    items: items.slice(startIndex, startIndex + safeSize),
  };
}

// Per-user in-memory workspace state so tab switches retain property selection & filters
const workspaceMemory = new Map();

const createDefaultMemory = () => ({
  selectedPropertyId: null,
  propertyQuery: '',
  propertyView: 'grid',
  roomTypes: {
    search: '',
    filter: 'ALL',
    sort: 'NEWEST',
    view: 'cards',
  },
  rooms: {
    search: '',
    typeFilter: 'ALL',
    floor: 'ALL',
    status: 'ALL',
    sort: 'ASC',
    view: 'floors',
  },
});

export function getHostWorkspaceMemory(userId) {
  const key = String(userId ?? 'anonymous');
  if (!workspaceMemory.has(key)) {
    workspaceMemory.set(key, createDefaultMemory());
  }
  return workspaceMemory.get(key);
}

export function updateHostWorkspaceMemory(userId, patch) {
  const current = getHostWorkspaceMemory(userId);
  const next = {
    ...current,
    ...patch,
    roomTypes: patch?.roomTypes ? { ...current.roomTypes, ...patch.roomTypes } : current.roomTypes,
    rooms: patch?.rooms ? { ...current.rooms, ...patch.rooms } : current.rooms,
  };
  workspaceMemory.set(String(userId ?? 'anonymous'), next);
  return next;
}

export function resetHostWorkspaceMemory(userId) {
  if (userId === undefined) workspaceMemory.clear();
  else workspaceMemory.delete(String(userId));
}
