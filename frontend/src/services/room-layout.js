export const ROOM_LAYOUT_LIMIT = 5000;
let generationSequence = 0;
export const roomKey = value => String(value || '').trim().toUpperCase();
const validRoomName = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u;

export function layoutFloorNumber(label) {
  const match = String(label || '').trim().match(/^(?:tầng\s+)?(\d+)$/iu);
  return match && Number.isSafeInteger(Number(match[1])) ? Number(match[1]) : null;
}

function alignNumber(number, numbering) {
  if (numbering === 'ODD' && number % 2 === 0) return number + 1;
  if (numbering === 'EVEN' && number % 2 === 1) return number + 1;
  return number;
}

export function generateRoomLayout({ from, to, count, start = 1, prefix = '', numbering = 'ALL', floorLabel, floorPlans }, existing = []) {
  if ([from, to, count, start].some(value => value == null || String(value).trim() === '')) {
    throw Error('Nhập đủ tầng, số lượng và số thứ tự bắt đầu.');
  }
  const [first, last, size, begin] = [from, to, count, start].map(Number);
  const firstNumber = alignNumber(begin, numbering);
  const step = numbering === 'ALL' ? 1 : 2;
  const lastNumber = firstNumber + (size - 1) * step;
  if (![first, last, size, begin].every(Number.isSafeInteger) || first < 0 || last < first || last - first > 199 ||
      size < 1 || size > 500 || begin < 1 || lastNumber > 9999 || (last - first + 1) * size > ROOM_LAYOUT_LIMIT) {
    throw Error('Tối đa 200 tầng, 500 phòng mỗi tầng và 5.000 phòng mỗi lần. Số thứ tự từ 01 đến 9.999.');
  }
  if (prefix.length > 12 || !/^[\p{L}\p{N} ._-]*$/u.test(prefix)) {
    throw Error('Tên phòng tối đa 12 ký tự, gồm chữ, số, dấu cách, chấm, gạch ngang hoặc gạch dưới.');
  }
  const batchId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++generationSequence}`;
  const used = new Set(existing.map(roomKey));
  const rooms = [];
  let skipped = 0;
  for (let offset = 0; offset <= last - first; offset++) {
    const floor = first + offset;
    const plan = floorPlans?.get(floor);
    const beginOnFloor = plan ? alignNumber(plan.start, numbering) : firstNumber;
    const endOnFloor = beginOnFloor + (size - 1) * step;
    if (endOnFloor > 9999) throw Error('Tầng ' + floor + ' vượt số thứ tự phòng tối đa 9.999.');
    for (let number = beginOnFloor; number <= endOnFloor; number += step) {
      const roomNumber = prefix + floor + String(number).padStart(2, '0');
      if (roomNumber.trim().length > 30 || !validRoomName.test(roomKey(roomNumber))) throw Error('Tên phòng phải hợp lệ và có tối đa 30 ký tự.');
      if (used.has(roomKey(roomNumber))) {
        skipped++;
        continue;
      }
      used.add(roomKey(roomNumber));
      rooms.push({ id: `${batchId}:${roomNumber}`, roomNumber, floor: plan?.label || floorLabel || `Tầng ${floor}`, roomTypeId: null });
    }
  }
  return { rooms, skipped };
}

export function nextRoomSequence(rows, floor, prefix) {
  const number = layoutFloorNumber(floor);
  const stem = roomKey(prefix + number);
  let last = 0;
  for (const row of rows) {
    if (layoutFloorNumber(row.floor) !== number) continue;
    const name = roomKey(row.roomNumber);
    const suffix = name.startsWith(stem) ? name.slice(stem.length) : '';
    if (/^\d{2,4}$/.test(suffix)) last = Math.max(last, Number(suffix));
  }
  return last + 1;
}

export function layoutIssues(rows, types, existing = []) {
  const savedNames = new Set(existing.map(roomKey));
  const counts = new Map();
  for (const row of rows) {
    const key = roomKey(row.roomNumber);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const typeById = new Map(types.map(type => [type.roomTypeId, type]));
  const issues = new Map();
  for (const row of rows) {
    const number = roomKey(row.roomNumber);
    const duplicate = Boolean(number) && (savedNames.has(number) || counts.get(number) > 1);
    const type = typeById.get(row.roomTypeId);
    const assigned = Boolean(type);
    const messages = [];
    if (duplicate) messages.push('Trùng tên phòng');
    if (row.roomNumber.trim().length > 30 || !validRoomName.test(number)) messages.push('Tên phòng không hợp lệ');
    if (!row.floor?.trim() || row.floor.length > 50) messages.push('Tầng không hợp lệ');
    if (!assigned) messages.push('Chưa gán loại');
    if (type && !(Number(type.price) > 0)) messages.push('Loại phòng chưa có giá hợp lệ');
    issues.set(row.id, { assigned, duplicate, messages });
  }
  return issues;
}

export function applyLayoutPattern(rows, ids, pattern) {
  if (!pattern.length || pattern.some(id => !Number.isSafeInteger(id))) throw Error('Chọn đầy đủ các loại phòng trong mẫu so le.');
  let index = 0;
  return rows.map(row => ids.has(row.id) ? { ...row, roomTypeId: pattern[index++ % pattern.length] } : row);
}

export function selectLayoutNumbers(rows, text) {
  const requested = new Set(String(text).split(/[,;\n]+/).map(roomKey).filter(Boolean));
  if (!requested.size) throw Error('Nhập tên phòng, ngăn cách bằng dấu phẩy hoặc xuống dòng.');
  const available = new Set(rows.map(row => roomKey(row.roomNumber)));
  const missing = [...requested].filter(number => !available.has(number));
  if (missing.length) throw Error(`Không tìm thấy trong bản nháp: ${missing.slice(0, 6).join(', ')}. Lựa chọn được giữ nguyên.`);
  return new Set(rows.filter(row => requested.has(roomKey(row.roomNumber))).map(row => row.id));
}

export function copyFloorLayout(rows, source, targets, overwrite = false) {
  const original = rows.filter(row => row.floor === source);
  const destinations = new Set(targets.filter(floor => floor !== source));
  const positions = new Map();
  return rows.map(row => {
    if (!destinations.has(row.floor)) return row;
    const index = positions.get(row.floor) || 0;
    positions.set(row.floor, index + 1);
    const type = original[index]?.roomTypeId;
    if (!type || row.roomTypeId === type || (row.roomTypeId && !overwrite)) return row;
    return { ...row, roomTypeId: type };
  });
}
