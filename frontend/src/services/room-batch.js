export const MAX_BATCH_ROOMS = 200;
export const MAX_FLOOR_GROUPS = 20;
export const DEFAULT_START_SEQUENCE = '01';

let groupUidCounter = 1;

export const blankRoomGroup = (overrides = {}) => ({
  id: overrides.id || `fg-${groupUidCounter++}`,
  floor: '',
  start: DEFAULT_START_SEQUENCE,
  count: '',
  ...overrides,
});

export function formatFloorLabel(floorNumber) {
  return `Tầng ${Number(floorNumber)}`;
}

export function parseFloorNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return { valid: false, empty: true, number: null, canonical: '', label: '', error: 'Nhập số tầng (ví dụ: 1, 2, 3).' };
  }
  if (/^-\d+$/.test(trimmed)) {
    return { valid: false, empty: false, number: null, canonical: '', label: '', error: 'Tầng không được là số âm.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, empty: false, number: null, canonical: '', label: '', error: 'Tầng chỉ nhận số nguyên không âm (0, 1, 2...).' };
  }
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < 0 || num > 999) {
    return { valid: false, empty: false, number: null, canonical: '', label: '', error: 'Số tầng hợp lệ từ 0 đến 999.' };
  }
  return {
    valid: true,
    empty: false,
    number: num,
    canonical: String(num),
    label: formatFloorLabel(num),
    error: '',
  };
}

export function normalizeFloorValue(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed) && Number(trimmed) <= 999) {
    return formatFloorLabel(Number(trimmed));
  }
  const match = trimmed.match(/^tầng\s+(\d+)$/iu);
  if (match && Number(match[1]) <= 999) {
    return formatFloorLabel(Number(match[1]));
  }
  return trimmed;
}

export function extractFloorOrder(floorLabel) {
  const normalized = normalizeFloorValue(floorLabel);
  const match = normalized.match(/^Tầng\s+(\d+)$/u);
  if (match) {
    return { isNumeric: true, order: Number(match[1]), label: normalized };
  }
  return { isNumeric: false, order: Number.MAX_SAFE_INTEGER, label: normalized };
}

export function compareFloors(floorA, floorB) {
  const a = extractFloorOrder(floorA);
  const b = extractFloorOrder(floorB);
  if (a.isNumeric && b.isNumeric) return a.order - b.order;
  if (a.isNumeric) return -1;
  if (b.isNumeric) return 1;
  return a.label.localeCompare(b.label, 'vi', { numeric: true });
}

export function formatRoomSequence(value) {
  const trimmed = String(value ?? '').trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < 1) return trimmed;
  return String(num).padStart(2, '0');
}

export function buildFloorRoomNumber(floorNumber, sequenceNumber) {
  const floorPart = String(Number(floorNumber));
  const seqPart = String(Number(sequenceNumber)).padStart(2, '0');
  return `${floorPart}${seqPart}`.toUpperCase();
}

export function isBlankFloorGroup(group) {
  if (!group) return true;
  return String(group.floor ?? '').trim() === '' && String(group.count ?? '').trim() === '';
}

export function inspectFloorGroup(group) {
  const errors = {};
  const blank = isBlankFloorGroup(group);
  const floorInfo = parseFloorNumber(group?.floor);
  if (!floorInfo.valid) {
    errors.floor = floorInfo.error;
  }

  const rawStart = String(group?.start ?? '').trim();
  let startNum = null;
  if (!rawStart) {
    errors.start = 'Nhập phòng bắt đầu (mặc định 01).';
  } else if (/^-\d+$/.test(rawStart) || (/^\d+$/.test(rawStart) && Number(rawStart) < 1)) {
    errors.start = 'Phòng bắt đầu phải từ 01 trở lên.';
  } else if (!/^\d{1,3}$/.test(rawStart) || Number(rawStart) > 999) {
    errors.start = 'Phòng bắt đầu hợp lệ từ 01 đến 999.';
  } else {
    startNum = Number(rawStart);
  }

  const rawCount = String(group?.count ?? '').trim();
  let countNum = null;
  if (!rawCount) {
    errors.count = 'Nhập số lượng phòng.';
  } else if (/^-\d+$/.test(rawCount) || (/^\d+$/.test(rawCount) && Number(rawCount) <= 0)) {
    errors.count = 'Số lượng phòng phải lớn hơn 0.';
  } else if (!/^\d+$/.test(rawCount)) {
    errors.count = 'Số lượng phòng phải là số nguyên dương.';
  } else if (Number(rawCount) > MAX_BATCH_ROOMS) {
    errors.count = `Số lượng tối đa ${MAX_BATCH_ROOMS} phòng.`;
  } else {
    countNum = Number(rawCount);
  }

  if (startNum != null && countNum != null && startNum + countNum - 1 > 9999) {
    errors.start = 'Dãy số thứ tự phòng vượt giới hạn cho phép.';
  }

  const firstRoomPreview = floorInfo.valid && startNum != null
    ? buildFloorRoomNumber(floorInfo.number, startNum)
    : '';

  const valid = !errors.floor && !errors.start && !errors.count;
  if (!valid) {
    return {
      blank,
      valid: false,
      errors,
      floorInfo,
      startNumber: startNum,
      countNumber: countNum,
      firstRoomPreview,
      lastRoomPreview: '',
      rangeSummary: '',
      generatedRooms: [],
    };
  }

  const lastRoomPreview = buildFloorRoomNumber(floorInfo.number, startNum + countNum - 1);
  const generatedRooms = Array.from({ length: countNum }, (_, index) => ({
    roomNumber: buildFloorRoomNumber(floorInfo.number, startNum + index),
    floor: floorInfo.label,
    floorNumber: floorInfo.number,
    source: 'FLOOR',
    groupId: group.id,
  }));

  const rangeSummary = countNum === 1
    ? `Sẽ tạo 1 phòng: ${firstRoomPreview}`
    : `Sẽ tạo ${countNum} phòng: ${firstRoomPreview} → ${lastRoomPreview}`;

  return {
    blank: false,
    valid: true,
    errors: {},
    floorInfo,
    startNumber: startNum,
    countNumber: countNum,
    firstRoomPreview,
    lastRoomPreview,
    rangeSummary,
    generatedRooms,
  };
}

export function nextAvailableStartForFloor(floorInput, { groups = [], oddRooms = [], existingRoomNumbers = [], ignoreGroupId = null } = {}) {
  const floorInfo = parseFloorNumber(floorInput);
  if (!floorInfo.valid) return DEFAULT_START_SEQUENCE;
  const occupied = new Set(existingRoomNumbers.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean));

  for (const odd of oddRooms) {
    const num = String(odd.roomNumber ?? '').trim().toUpperCase();
    if (num) occupied.add(num);
  }
  for (const group of groups) {
    if (ignoreGroupId && group.id === ignoreGroupId) continue;
    const info = inspectFloorGroup(group);
    if (!info.valid) continue;
    for (const room of info.generatedRooms) occupied.add(room.roomNumber);
  }

  for (let seq = 1; seq <= 999; seq++) {
    const candidate = buildFloorRoomNumber(floorInfo.number, seq);
    if (!occupied.has(candidate)) {
      return formatRoomSequence(seq);
    }
  }
  return DEFAULT_START_SEQUENCE;
}

export function validateOddRoomCandidate(draft, { currentRows = [], existingRoomNumbers = [] } = {}) {
  const errors = {};
  const floorInfo = parseFloorNumber(draft?.floor);
  if (!floorInfo.valid) {
    errors.floor = floorInfo.error;
  }

  const rawNumber = String(draft?.roomNumber ?? '').trim();
  const normalizedNumber = rawNumber.toUpperCase();
  if (!normalizedNumber) {
    errors.roomNumber = 'Nhập số phòng hoặc tên phòng.';
  } else if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u.test(normalizedNumber)) {
    errors.roomNumber = 'Tên phòng cần 1–30 ký tự hợp lệ (chữ, số, chấm, gạch ngang).';
  } else {
    const existingSet = new Set(existingRoomNumbers.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean));
    const previewSet = new Set(currentRows.map(item => String(item.roomNumber ?? '').trim().toUpperCase()).filter(Boolean));
    if (existingSet.has(normalizedNumber)) {
      errors.roomNumber = `Phòng ${normalizedNumber} đã tồn tại trong nhà trọ.`;
    } else if (previewSet.has(normalizedNumber)) {
      errors.roomNumber = `Phòng ${normalizedNumber} đã có trong danh sách dự kiến.`;
    }
  }

  if (!errors.roomNumber && currentRows.length >= MAX_BATCH_ROOMS) {
    errors.roomNumber = `Tối đa ${MAX_BATCH_ROOMS} phòng mỗi lần tạo.`;
  }

  const valid = !errors.floor && !errors.roomNumber;
  return {
    valid,
    errors,
    normalizedRoom: valid
      ? {
          roomNumber: normalizedNumber,
          floor: floorInfo.label,
          floorInput: floorInfo.canonical,
        }
      : null,
  };
}

export function validateRoomDrafts(rows, existingNumbers = []) {
  const errors = { rows: {}, list: '' };
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_BATCH_ROOMS) {
    errors.list = `Cần từ 1 đến ${MAX_BATCH_ROOMS} phòng trong danh sách xem trước.`;
  }
  const seen = new Map();
  const existing = new Set(existingNumbers.map(value => String(value ?? '').trim().toUpperCase()).filter(Boolean));

  (rows || []).forEach((room, index) => {
    const invalid = {};
    const number = String(room?.roomNumber ?? '').trim().toUpperCase();
    const floor = String(room?.floor ?? '').trim();

    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u.test(number)) {
      invalid.roomNumber = 'Mã phòng cần 1–30 ký tự hợp lệ.';
    }
    if (existing.has(number)) {
      invalid.roomNumber = 'Mã phòng đã có trong nhà trọ.';
    }
    if (number && seen.has(number)) {
      invalid.roomNumber = 'Trùng mã phòng trong danh sách.';
      const previousIndex = seen.get(number);
      errors.rows[previousIndex] = { ...errors.rows[previousIndex], roomNumber: invalid.roomNumber };
    }
    if (number) seen.set(number, index);

    if (!floor || floor.length > 50 || /^-\d+$/.test(floor) || /^tầng\s+-\d+$/iu.test(floor)) {
      invalid.floor = 'Tầng / khu vực cần 1–50 ký tự hợp lệ.';
    }
    if (Object.keys(invalid).length) {
      errors.rows[index] = { ...errors.rows[index], ...invalid };
    }
  });

  return errors;
}

export function generateRoomDrafts(groups, existingNumbers = []) {
  const errors = { groups: {}, list: '' };
  if (!Array.isArray(groups) || !groups.length || groups.length > MAX_FLOOR_GROUPS) {
    errors.list = `Cần từ 1 đến ${MAX_FLOOR_GROUPS} nhóm tầng.`;
    return { rows: [], errors };
  }

  let total = 0;
  const seen = new Set();
  const existing = new Set(existingNumbers.map(value => String(value ?? '').trim().toUpperCase()).filter(Boolean));
  const generated = [];

  groups.forEach((group, index) => {
    const info = inspectFloorGroup(group);
    if (!info.valid) {
      errors.groups[index] = info.errors;
      return;
    }
    const overlaps = [];
    const existingConflicts = [];
    for (const room of info.generatedRooms) {
      if (seen.has(room.roomNumber)) overlaps.push(room.roomNumber);
      if (existing.has(room.roomNumber)) existingConflicts.push(room.roomNumber);
    }
    if (overlaps.length) {
      errors.groups[index] = {
        ...errors.groups[index],
        start: `Trùng số phòng (${overlaps.slice(0, 3).join(', ')}) với nhóm tầng khác.`,
      };
      return;
    }
    if (existingConflicts.length) {
      errors.groups[index] = {
        ...errors.groups[index],
        start: `Phòng (${existingConflicts.slice(0, 3).join(', ')}) đã tồn tại trong nhà trọ.`,
      };
      return;
    }
    total += info.generatedRooms.length;
    for (const room of info.generatedRooms) {
      seen.add(room.roomNumber);
      generated.push({ roomNumber: room.roomNumber, floor: room.floor });
    }
  });

  if (total > MAX_BATCH_ROOMS) {
    errors.list = `Tổng số phòng không được vượt quá ${MAX_BATCH_ROOMS}.`;
  }
  if (errors.list || Object.keys(errors.groups).length) {
    return { rows: [], errors };
  }
  return { rows: generated, errors };
}

const COMPACT_PREVIEW_LIMIT = 9;

export function reconcileRoomBatch({
  groups = [],
  oddRooms = [],
  excludedAutoRooms = [],
  existingRoomNumbers = [],
} = {}) {
  const existingSet = new Set(existingRoomNumbers.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean));
  const excludedSet = new Set(excludedAutoRooms.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean));

  const groupMeta = {};
  const groupErrors = {};
  let hasIncompleteGroup = false;
  let hasOverlappingGroup = false;

  const seenAuto = new Set();
  const autoItems = [];

  groups.forEach((group, index) => {
    const id = group.id || `idx-${index}`;
    const info = inspectFloorGroup(group);

    if (info.blank) {
      groupMeta[id] = { ...info, activeRooms: [], excludedRooms: [], existingConflicts: [], overlaps: [], suggestedStart: '' };
      return;
    }

    if (!info.valid) {
      hasIncompleteGroup = true;
      groupErrors[id] = info.errors;
      groupMeta[id] = { ...info, activeRooms: [], excludedRooms: [], existingConflicts: [], overlaps: [], suggestedStart: '' };
      return;
    }

    const activeInGroup = [];
    const excludedInGroup = [];
    for (const room of info.generatedRooms) {
      if (excludedSet.has(room.roomNumber)) {
        excludedInGroup.push(room.roomNumber);
      } else {
        activeInGroup.push(room);
      }
    }

    const overlaps = activeInGroup.filter(room => seenAuto.has(room.roomNumber)).map(room => room.roomNumber);
    const existingConflicts = activeInGroup.filter(room => existingSet.has(room.roomNumber)).map(room => room.roomNumber);

    if (overlaps.length > 0) {
      hasOverlappingGroup = true;
      const suggestedStart = nextAvailableStartForFloor(group.floor, {
        groups,
        oddRooms,
        existingRoomNumbers,
        ignoreGroupId: group.id,
      });
      groupErrors[id] = {
        ...groupErrors[id],
        overlap: `Trùng phòng (${overlaps.slice(0, 3).join(', ')}${overlaps.length > 3 ? '…' : ''}) với nhóm khác.`,
      };
      groupMeta[id] = {
        ...info,
        activeRooms: [],
        excludedRooms: excludedInGroup,
        existingConflicts,
        overlaps,
        suggestedStart,
      };
      return;
    }

    let suggestedStart = '';
    if (existingConflicts.length > 0) {
      suggestedStart = nextAvailableStartForFloor(group.floor, {
        groups,
        oddRooms,
        existingRoomNumbers,
        ignoreGroupId: group.id,
      });
    }

    for (const room of activeInGroup) {
      seenAuto.add(room.roomNumber);
      autoItems.push(room);
    }

    groupMeta[id] = {
      ...info,
      activeRooms: activeInGroup,
      excludedRooms: excludedInGroup,
      existingConflicts,
      overlaps: [],
      suggestedStart,
    };
  });

  const oddItems = oddRooms
    .filter(item => item && String(item.roomNumber ?? '').trim())
    .map((item, idx) => ({
      roomNumber: String(item.roomNumber).trim().toUpperCase(),
      floor: normalizeFloorValue(item.floor),
      source: 'ODD',
      oddId: item.id || `odd-${idx}`,
    }));

  const combined = [...autoItems, ...oddItems].sort((a, b) => {
    const floorDiff = compareFloors(a.floor, b.floor);
    if (floorDiff !== 0) return floorDiff;
    return a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true });
  });

  const draftValidation = validateRoomDrafts(combined, existingRoomNumbers);
  const annotatedRows = combined.map((room, index) => ({
    ...room,
    error: draftValidation.rows[index]?.roomNumber || draftValidation.rows[index]?.floor || '',
  }));

  const bucketMap = new Map();
  for (const room of annotatedRows) {
    const key = room.floor || 'Chưa phân tầng';
    if (!bucketMap.has(key)) {
      bucketMap.set(key, []);
    }
    bucketMap.get(key).push(room);
  }

  const floorBuckets = [...bucketMap.entries()]
    .sort(([floorA], [floorB]) => compareFloors(floorA, floorB))
    .map(([floor, items]) => {
      const shownNames = items.slice(0, COMPACT_PREVIEW_LIMIT).map(item => item.roomNumber);
      const overflowCount = Math.max(0, items.length - COMPACT_PREVIEW_LIMIT);
      return {
        floor,
        floorKey: floor,
        rooms: items,
        count: items.length,
        hasError: items.some(item => Boolean(item.error)),
        compactText: shownNames.join(' · '),
        overflowCount,
      };
    });

  let listError = '';
  if (hasIncompleteGroup) {
    listError = 'Hoàn thiện hoặc xóa nhóm tầng đang nhập dở trước khi lưu.';
  } else if (hasOverlappingGroup) {
    listError = 'Có nhóm tầng bị trùng số phòng với nhóm khác. Hãy điều chỉnh Phòng bắt đầu.';
  } else if (annotatedRows.length === 0) {
    listError = 'Cần thiết lập ít nhất 1 phòng trước khi tạo loại phòng.';
  } else if (annotatedRows.length > MAX_BATCH_ROOMS) {
    listError = `Danh sách vượt quá giới hạn ${MAX_BATCH_ROOMS} phòng (${annotatedRows.length}/${MAX_BATCH_ROOMS}).`;
  } else if (Object.keys(draftValidation.rows).length > 0) {
    const firstErrIndex = Object.keys(draftValidation.rows)[0];
    const badRoom = annotatedRows[firstErrIndex];
    const reason = draftValidation.rows[firstErrIndex].roomNumber || draftValidation.rows[firstErrIndex].floor;
    listError = badRoom ? `Phòng ${badRoom.roomNumber}: ${reason}` : reason;
  }

  const hasBlockingErrors = Boolean(
    hasIncompleteGroup ||
    hasOverlappingGroup ||
    annotatedRows.length === 0 ||
    annotatedRows.length > MAX_BATCH_ROOMS ||
    Object.keys(draftValidation.rows).length > 0
  );

  return {
    rows: annotatedRows,
    floorBuckets,
    totalRooms: annotatedRows.length,
    totalFloors: floorBuckets.length,
    activeFloorGroupCount: groups.filter(group => !isBlankFloorGroup(group)).length,
    oddRoomCount: oddItems.length,
    groupMeta,
    groupErrors,
    draftValidation,
    listError,
    hasIncompleteGroup,
    hasOverlappingGroup,
    hasBlockingErrors,
  };
}

export function removeRoomFromBatch(state, targetRoom) {
  const key = String(typeof targetRoom === 'string' ? targetRoom : targetRoom?.roomNumber ?? '').trim().toUpperCase();
  if (!key) return state;

  const nextOddRooms = (state.oddRooms || []).filter(
    room => String(room.roomNumber ?? '').trim().toUpperCase() !== key
  );

  const generatedByGroups = (state.groups || []).some(group => {
    const info = inspectFloorGroup(group);
    return info.valid && info.generatedRooms.some(room => room.roomNumber === key);
  });

  const excludedSet = new Set((state.excludedAutoRooms || []).map(item => String(item).trim().toUpperCase()));
  if (generatedByGroups) {
    excludedSet.add(key);
  }

  return {
    ...state,
    oddRooms: nextOddRooms,
    excludedAutoRooms: [...excludedSet],
  };
}

export function restoreExcludedForGroup(state, groupId) {
  const group = (state.groups || []).find(item => item.id === groupId);
  if (!group) return state;
  const info = inspectFloorGroup(group);
  if (!info.valid) return state;
  const groupKeys = new Set(info.generatedRooms.map(room => room.roomNumber));
  const nextExcluded = (state.excludedAutoRooms || []).filter(
    key => !groupKeys.has(String(key).trim().toUpperCase())
  );
  return {
    ...state,
    excludedAutoRooms: nextExcluded,
  };
}

export function removeFloorFromBatch(state, floorLabel) {
  const normalizedTarget = normalizeFloorValue(floorLabel);
  const nextOddRooms = (state.oddRooms || []).filter(
    room => normalizeFloorValue(room.floor) !== normalizedTarget
  );

  const remainingGroups = (state.groups || []).filter(group => {
    if (isBlankFloorGroup(group)) return true;
    const info = parseFloorNumber(group.floor);
    return !(info.valid && info.label === normalizedTarget);
  });

  const nextGroups = remainingGroups.length > 0 ? remainingGroups : [blankRoomGroup()];

  const stillGenerated = new Set();
  for (const group of nextGroups) {
    const info = inspectFloorGroup(group);
    if (info.valid) {
      for (const room of info.generatedRooms) stillGenerated.add(room.roomNumber);
    }
  }
  const nextExcluded = (state.excludedAutoRooms || []).filter(key => stillGenerated.has(String(key).trim().toUpperCase()));

  return {
    ...state,
    groups: nextGroups,
    oddRooms: nextOddRooms,
    excludedAutoRooms: nextExcluded,
  };
}

export const roomBatchPayload = rows => ({
  rooms: rows.map(room => ({
    roomNumber: String(room.roomNumber ?? '').trim().toUpperCase(),
    floor: String(room.floor ?? '').trim(),
  })),
});
