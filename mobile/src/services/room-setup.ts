import type { HostRoom, HostRoomType } from './host';
import { ROOM_AMENITY_LABELS } from './host-room-types';
import type { RegistrationAsset } from './property-registration';

export const SETUP_LIMITS = {
  maxNewTypes: 20,
  maxRooms: 5000,
  maxFloorsPerBatch: 200,
  maxRoomsPerFloor: 500,
  maxSequence: 9999,
  maxPrefixLength: 12,
  maxRoomNumberLength: 30,
  maxFloorLength: 50,
  maxPhotosPerType: 10,
  maxPhotoBytes: 5 * 1024 * 1024,
  maxTotalPhotos: 40,
  maxTotalPhotoBytes: 80 * 1024 * 1024,
} as const;

export type RoomNumberingStyle = 'ALL' | 'ODD' | 'EVEN';

export interface SetupPhotoAsset extends RegistrationAsset {
  id: string;
}

export interface RoomTypeFormDraft {
  roomType: string;
  areaSqm: string;
  capacity: string;
  price: string;
  deposit: string;
  electricityPrice: string;
  waterPrice: string;
  internetPrice: string;
  servicePrice: string;
  description: string;
  imageUrl: string;
  amenities: string[];
  photos: SetupPhotoAsset[];
}

export interface RoomTypeRequestPayload {
  propertyId: number;
  roomType: string;
  areaSqm: number;
  capacity: number;
  price: number;
  deposit: number | null;
  electricityPrice: number | null;
  waterPrice: number | null;
  internetPrice: number | null;
  servicePrice: number | null;
  description: string;
  imageUrl: string | null;
  amenities: string[];
  retainedImageIds: number[];
}

export interface DraftNewRoomType {
  localId: number; // Always negative (-1, -2, ...)
  form: RoomTypeFormDraft;
  details: RoomTypeRequestPayload;
}

export interface SelectableRoomType {
  id: number; // > 0 for saved, < 0 for draft
  roomType: string;
  price: number | null;
  areaSqm: number | null;
  capacity: number;
  isDraft: boolean;
  photoCount?: number;
}

export interface DraftRoomRow {
  rowId: string;
  batchId: string;
  floor: string;
  roomNumber: string;
  roomTypeId: number | null; // > 0 saved, < 0 draft, null unassigned
}

export interface DraftBatchSummary {
  batchId: string;
  mode: 'RANGE' | 'EXISTING_FLOOR' | 'SINGLE';
  label: string;
  createdAt: number;
}

export interface RoomSetupIssue {
  rowId: string;
  roomNumber: string;
  floor: string;
  code: 'MISSING_NUMBER' | 'INVALID_NUMBER' | 'MISSING_FLOOR' | 'DUPLICATE_SAVED' | 'DUPLICATE_DRAFT' | 'MISSING_TYPE' | 'INVALID_TYPE';
  message: string;
}

export interface AssignmentSnapshot {
  label: string;
  previousTypes: Record<string, number | null>;
}

export const EMPTY_ROOM_TYPE_FORM: RoomTypeFormDraft = {
  roomType: '',
  areaSqm: '',
  capacity: '2',
  price: '',
  deposit: '',
  electricityPrice: '',
  waterPrice: '',
  internetPrice: '',
  servicePrice: '',
  description: '',
  imageUrl: '',
  amenities: [],
  photos: [],
};

const VALID_AMENITY_SET = new Set(Object.keys(ROOM_AMENITY_LABELS));
const ROOM_NUMBER_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u;
const PREFIX_PATTERN = /^[\p{L}\p{N} ._-]*$/u;

export function roomKey(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

export function layoutFloorNumber(label: unknown): number | null {
  const match = String(label ?? '').trim().match(/^(?:tầng\s+)?(\d+)$/iu);
  return match ? Number(match[1]) : null;
}

export function formatFloorDisplay(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'Chưa rõ tầng';
  if (/^tầng\s+/i.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `Tầng ${trimmed}`;
  return trimmed;
}

export function sanitizeDecimalInput(raw: string): string {
  const normalized = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');
  if (parts.length <= 1) return normalized;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

export function sanitizeDigitsInput(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

/**
 * Parses an optional non-negative integer fee or deposit.
 * Critically distinguishes:
 * - empty / whitespace -> null ("chưa xác định")
 * - "0" -> 0 ("miễn phí" / "không yêu cầu cọc")
 */
export function parseOptionalNonNegativeInt(
  raw: string,
  label: string,
  max = 999999999
): { value: number | null; error?: string } {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { value: null };
  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: `${label} phải là số nguyên không âm.` };
  }
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < 0 || num > max) {
    return { value: null, error: `${label} phải nằm trong khoảng 0 đến ${new Intl.NumberFormat('vi-VN').format(max)} đ.` };
  }
  return { value: num };
}

export function formatOptionalFeePreview(
  raw: string,
  unit: string,
  zeroLabel = 'Miễn phí'
): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return 'Chưa xác định';
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (num === 0) return zeroLabel;
    if (Number.isSafeInteger(num)) {
      return `${new Intl.NumberFormat('vi-VN').format(num)} ${unit}`;
    }
  }
  return 'Chưa hợp lệ';
}

export function totalDraftPhotoStats(
  draftTypes: DraftNewRoomType[],
  excludeLocalId?: number
): { count: number; bytes: number } {
  let count = 0;
  let bytes = 0;
  for (const item of draftTypes) {
    if (excludeLocalId != null && item.localId === excludeLocalId) continue;
    for (const photo of item.form.photos) {
      count += 1;
      bytes += photo.fileSize || 0;
    }
  }
  return { count, bytes };
}

export function validateSetupRoomTypeDraft(
  form: RoomTypeFormDraft,
  propertyId: number,
  savedTypes: HostRoomType[],
  draftTypes: DraftNewRoomType[],
  editingLocalId?: number
): {
  valid: boolean;
  errors: Record<string, string>;
  payload?: RoomTypeRequestPayload;
} {
  const errors: Record<string, string> = {};

  const name = form.roomType.trim();
  if (name.length < 3 || name.length > 100) {
    errors.roomType = 'Tên loại phòng cần từ 3 đến 100 ký tự.';
  } else {
    const nameKey = name.toLowerCase();
    const dupSaved = savedTypes.some(t => t.roomType.trim().toLowerCase() === nameKey);
    const dupDraft = draftTypes.some(
      t => t.localId !== editingLocalId && t.details.roomType.trim().toLowerCase() === nameKey
    );
    if (dupSaved || dupDraft) {
      errors.roomType = 'Tên loại phòng này đã tồn tại trong nhà trọ hoặc bản nháp.';
    }
  }

  const areaRaw = form.areaSqm.trim().replace(',', '.');
  const areaNum = Number(areaRaw);
  if (!areaRaw || !Number.isFinite(areaNum) || areaNum < 1 || areaNum > 10000) {
    errors.areaSqm = 'Diện tích cần từ 1 đến 10.000 m².';
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(areaRaw)) {
    errors.areaSqm = 'Diện tích chỉ hỗ trợ tối đa 2 chữ số thập phân.';
  }

  const capRaw = form.capacity.trim();
  const capNum = Number(capRaw);
  if (!/^\d+$/.test(capRaw) || !Number.isSafeInteger(capNum) || capNum < 1 || capNum > 20) {
    errors.capacity = 'Sức chứa cần từ 1 đến 20 người.';
  }

  const priceRaw = form.price.trim();
  const priceNum = Number(priceRaw);
  if (!/^\d+$/.test(priceRaw) || !Number.isSafeInteger(priceNum) || priceNum < 1 || priceNum > 999999999) {
    errors.price = 'Giá thuê niêm yết cần lớn hơn 0 đ/tháng.';
  }

  const deposit = parseOptionalNonNegativeInt(form.deposit, 'Tiền đặt cọc');
  if (deposit.error) errors.deposit = deposit.error;

  const electricity = parseOptionalNonNegativeInt(form.electricityPrice, 'Giá điện');
  if (electricity.error) errors.electricityPrice = electricity.error;

  const water = parseOptionalNonNegativeInt(form.waterPrice, 'Giá nước');
  if (water.error) errors.waterPrice = water.error;

  const internet = parseOptionalNonNegativeInt(form.internetPrice, 'Phí Internet');
  if (internet.error) errors.internetPrice = internet.error;

  const service = parseOptionalNonNegativeInt(form.servicePrice, 'Phí dịch vụ chung');
  if (service.error) errors.servicePrice = service.error;

  const description = form.description.trim();
  if (description.length > 2000) {
    errors.description = 'Mô tả không được vượt quá 2.000 ký tự.';
  }

  const imageUrl = form.imageUrl.trim();
  if (imageUrl) {
    if (imageUrl.length > 1000) {
      errors.imageUrl = 'Đường dẫn ảnh không được vượt quá 1.000 ký tự.';
    } else if (!/^https?:\/\/\S+$/i.test(imageUrl)) {
      errors.imageUrl = 'Đường dẫn ảnh cần bắt đầu bằng http:// hoặc https://.';
    }
  }

  if (form.photos.length > SETUP_LIMITS.maxPhotosPerType) {
    errors.photos = `Mỗi loại phòng chỉ hỗ trợ tối đa ${SETUP_LIMITS.maxPhotosPerType} ảnh.`;
  } else {
    const otherStats = totalDraftPhotoStats(draftTypes, editingLocalId);
    const currentBytes = form.photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);
    if (otherStats.count + form.photos.length > SETUP_LIMITS.maxTotalPhotos) {
      errors.photos = `Tổng số ảnh cho tất cả loại mới không vượt quá ${SETUP_LIMITS.maxTotalPhotos} ảnh.`;
    } else if (otherStats.bytes + currentBytes > SETUP_LIMITS.maxTotalPhotoBytes) {
      errors.photos = 'Tổng dung lượng ảnh cho tất cả loại mới không vượt quá 80 MB.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const amenities = Array.from(
    new Set(form.amenities.filter(key => VALID_AMENITY_SET.has(key)))
  );

  return {
    valid: true,
    errors: {},
    payload: {
      propertyId,
      roomType: name,
      areaSqm: Number(areaNum.toFixed(2)),
      capacity: capNum,
      price: priceNum,
      deposit: deposit.value,
      electricityPrice: electricity.value,
      waterPrice: water.value,
      internetPrice: internet.value,
      servicePrice: service.value,
      description,
      imageUrl: imageUrl || null,
      amenities,
      retainedImageIds: [],
    },
  };
}

/**
 * Computes the next available room sequence number on a numeric floor,
 * taking into account BOTH saved rooms and rooms already in the draft.
 * Empty floors always return 1 (renders as "01", e.g., 101).
 */
export function nextRoomSequence(
  existingAndDraftRooms: readonly { floor?: string | null; roomNumber?: string | null }[],
  floor: number,
  prefix = ''
): number {
  const floorNo = Number(floor);
  if (!Number.isInteger(floorNo) || floorNo < 0) return 1;
  const stem = roomKey(`${prefix}${floorNo}`);
  const highest = existingAndDraftRooms.reduce((max, row) => {
    const rowFloor = layoutFloorNumber(row.floor);
    if (rowFloor !== floorNo) return max;
    const code = roomKey(row.roomNumber);
    if (!code.startsWith(stem)) return max;
    const suffix = code.slice(stem.length);
    return /^\d{2,4}$/.test(suffix) ? Math.max(max, Number(suffix)) : max;
  }, 0);
  return highest + 1;
}

export interface GenerateRangeInput {
  fromFloor: number;
  floorCount: number;
  roomsPerFloor: number;
  prefix?: string;
  startNumber?: number | null; // null/undefined => auto-continue per floor from saved+draft
  numbering?: RoomNumberingStyle;
  roomTypeId?: number | null;
  existingAndDraftRooms: readonly { floor?: string | null; roomNumber?: string | null }[];
  batchId: string;
}

export interface GenerateExistingFloorInput {
  floor: number;
  extraRooms: number;
  prefix?: string;
  startNumber?: number | null;
  numbering?: RoomNumberingStyle;
  roomTypeId?: number | null;
  existingAndDraftRooms: readonly { floor?: string | null; roomNumber?: string | null }[];
  batchId: string;
}

function generateFloorRows(params: {
  floor: number;
  count: number;
  prefix: string;
  startNumber: number;
  numbering: RoomNumberingStyle;
  roomTypeId: number | null;
  batchId: string;
  idOffset: number;
}): { rows: DraftRoomRow[]; error?: string } {
  const { floor, count, prefix, numbering, roomTypeId, batchId } = params;
  let seq = params.startNumber;
  if (!Number.isInteger(seq) || seq < 1 || seq > SETUP_LIMITS.maxSequence) {
    return { rows: [], error: 'Số thứ tự bắt đầu phải từ 1 đến 9999.' };
  }
  const step = numbering === 'ALL' ? 1 : 2;
  if (numbering === 'ODD' && seq % 2 === 0) seq += 1;
  if (numbering === 'EVEN' && seq % 2 !== 0) seq += 1;

  const rows: DraftRoomRow[] = [];
  for (let idx = 0; idx < count; idx += 1) {
    const number = seq + idx * step;
    if (number > SETUP_LIMITS.maxSequence) {
      return { rows: [], error: `Mã phòng trên tầng ${floor} vượt quá giới hạn 9999.` };
    }
    const roomNumber = `${prefix}${floor}${String(number).padStart(2, '0')}`;
    if (!ROOM_NUMBER_PATTERN.test(roomNumber)) {
      return { rows: [], error: `Mã phòng "${roomNumber}" không hợp lệ (tối đa 30 ký tự).` };
    }
    rows.push({
      rowId: `${batchId}-${params.idOffset + idx}`,
      batchId,
      floor: `Tầng ${floor}`,
      roomNumber,
      roomTypeId,
    });
  }
  return { rows };
}

export function generateFloorRangeBatch(input: GenerateRangeInput): {
  rows: DraftRoomRow[];
  error?: string;
} {
  const from = Number(input.fromFloor);
  const floorCount = Number(input.floorCount);
  const perFloor = Number(input.roomsPerFloor);
  const prefix = (input.prefix || '').trim();
  const numbering: RoomNumberingStyle = input.numbering || 'ALL';
  const roomTypeId = input.roomTypeId ?? null;

  if (!Number.isInteger(from) || from < 0) {
    return { rows: [], error: 'Tầng bắt đầu phải là số nguyên từ 0 trở lên.' };
  }
  if (!Number.isInteger(floorCount) || floorCount < 1 || floorCount > SETUP_LIMITS.maxFloorsPerBatch) {
    return { rows: [], error: `Số tầng mỗi đợt cần từ 1 đến ${SETUP_LIMITS.maxFloorsPerBatch}.` };
  }
  if (!Number.isInteger(perFloor) || perFloor < 1 || perFloor > SETUP_LIMITS.maxRoomsPerFloor) {
    return { rows: [], error: `Số phòng mỗi tầng cần từ 1 đến ${SETUP_LIMITS.maxRoomsPerFloor}.` };
  }
  if (floorCount * perFloor > SETUP_LIMITS.maxRooms) {
    return { rows: [], error: `Tối đa ${SETUP_LIMITS.maxRooms} phòng trong một đợt thiết lập.` };
  }
  if (prefix.length > SETUP_LIMITS.maxPrefixLength || !PREFIX_PATTERN.test(prefix)) {
    return { rows: [], error: 'Tiền tố tối đa 12 ký tự chữ, số, khoảng trắng, dấu chấm, _ hoặc -.' };
  }

  const allRows: DraftRoomRow[] = [];
  for (let i = 0; i < floorCount; i += 1) {
    const floor = from + i;
    const autoStart = nextRoomSequence(input.existingAndDraftRooms, floor, prefix);
    const startNumber = input.startNumber != null ? Number(input.startNumber) : autoStart;
    const result = generateFloorRows({
      floor,
      count: perFloor,
      prefix,
      startNumber,
      numbering,
      roomTypeId,
      batchId: input.batchId,
      idOffset: allRows.length,
    });
    if (result.error) return { rows: [], error: result.error };
    allRows.push(...result.rows);
  }
  return { rows: allRows };
}

export function generateExistingFloorBatch(input: GenerateExistingFloorInput): {
  rows: DraftRoomRow[];
  error?: string;
} {
  const floor = Number(input.floor);
  const extraRooms = Number(input.extraRooms);
  const prefix = (input.prefix || '').trim();
  const numbering: RoomNumberingStyle = input.numbering || 'ALL';
  const roomTypeId = input.roomTypeId ?? null;

  if (!Number.isInteger(floor) || floor < 0) {
    return { rows: [], error: 'Vui lòng chọn tầng hợp lệ.' };
  }
  if (!Number.isInteger(extraRooms) || extraRooms < 1 || extraRooms > SETUP_LIMITS.maxRoomsPerFloor) {
    return { rows: [], error: `Số phòng thêm cần từ 1 đến ${SETUP_LIMITS.maxRoomsPerFloor}.` };
  }
  if (prefix.length > SETUP_LIMITS.maxPrefixLength || !PREFIX_PATTERN.test(prefix)) {
    return { rows: [], error: 'Tiền tố tối đa 12 ký tự chữ, số, khoảng trắng, dấu chấm, _ hoặc -.' };
  }

  const autoStart = nextRoomSequence(input.existingAndDraftRooms, floor, prefix);
  const startNumber = input.startNumber != null ? Number(input.startNumber) : autoStart;
  return generateFloorRows({
    floor,
    count: extraRooms,
    prefix,
    startNumber,
    numbering,
    roomTypeId,
    batchId: input.batchId,
    idOffset: 0,
  });
}

/**
 * Formats a compact, scannable preview string like:
 * - "5 phòng · 101, 102, 103…105"
 * - "3 phòng · 101, 102, 103"
 * - "15 phòng · 101, 102, 103…305"
 */
export function formatBatchPreview(rows: readonly { roomNumber: string }[]): string {
  const count = rows.length;
  if (count === 0) return '0 phòng';
  if (count <= 4) {
    return `${count} phòng · ${rows.map(r => r.roomNumber).join(', ')}`;
  }
  const head = rows.slice(0, 3).map(r => r.roomNumber).join(', ');
  const tail = rows[count - 1].roomNumber;
  return `${count} phòng · ${head}…${tail}`;
}

export function collectNumericFloors(
  savedRooms: readonly { floor?: string | null }[],
  draftRooms: readonly { floor?: string | null }[]
): number[] {
  const set = new Set<number>();
  for (const r of savedRooms) {
    const n = layoutFloorNumber(r.floor);
    if (n != null) set.add(n);
  }
  for (const r of draftRooms) {
    const n = layoutFloorNumber(r.floor);
    if (n != null) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function extractDraftFloorLabels(draftRooms: readonly { floor: string }[]): string[] {
  const unique = Array.from(new Set(draftRooms.map(r => r.floor.trim()).filter(Boolean)));
  return unique.sort((a, b) => {
    const na = layoutFloorNumber(a);
    const nb = layoutFloorNumber(b);
    if (na != null && nb != null) return na - nb;
    if (na != null) return -1;
    if (nb != null) return 1;
    return a.localeCompare(b, 'vi', { numeric: true });
  });
}

export function combineSelectableRoomTypes(
  savedTypes: HostRoomType[],
  draftTypes: DraftNewRoomType[]
): SelectableRoomType[] {
  const drafts: SelectableRoomType[] = draftTypes.map(item => ({
    id: item.localId,
    roomType: item.details.roomType,
    price: item.details.price,
    areaSqm: item.details.areaSqm,
    capacity: item.details.capacity,
    isDraft: true,
    photoCount: item.form.photos.length,
  }));
  const saved: SelectableRoomType[] = savedTypes.map(item => ({
    id: item.roomTypeId,
    roomType: item.roomType,
    price: item.price,
    areaSqm: item.areaSqm,
    capacity: item.capacity,
    isDraft: false,
  }));
  return [...drafts, ...saved];
}

export function validateDraftRooms(
  draftRooms: readonly DraftRoomRow[],
  selectableTypes: readonly SelectableRoomType[],
  savedRooms: readonly Pick<HostRoom, 'roomNumber'>[]
): {
  issues: RoomSetupIssue[];
  issueByRowId: Record<string, RoomSetupIssue>;
  unassignedCount: number;
  duplicateCount: number;
} {
  const savedKeys = new Set(savedRooms.map(r => roomKey(r.roomNumber)).filter(Boolean));
  const typeById = new Map<number, SelectableRoomType>();
  for (const t of selectableTypes) {
    typeById.set(t.id, t);
  }

  const draftCounts = new Map<string, number>();
  for (const row of draftRooms) {
    const key = roomKey(row.roomNumber);
    if (key) draftCounts.set(key, (draftCounts.get(key) || 0) + 1);
  }

  const issues: RoomSetupIssue[] = [];
  const issueByRowId: Record<string, RoomSetupIssue> = {};
  let unassignedCount = 0;
  let duplicateCount = 0;

  for (const row of draftRooms) {
    const code = row.roomNumber.trim();
    const key = roomKey(code);
    const floor = row.floor.trim();

    let issue: RoomSetupIssue | null = null;

    if (!code) {
      issue = {
        rowId: row.rowId,
        roomNumber: code,
        floor,
        code: 'MISSING_NUMBER',
        message: 'Chưa nhập mã phòng.',
      };
    } else if (!ROOM_NUMBER_PATTERN.test(code)) {
      issue = {
        rowId: row.rowId,
        roomNumber: code,
        floor,
        code: 'INVALID_NUMBER',
        message: 'Mã phòng chỉ gồm chữ, số, khoảng trắng, dấu chấm, _ hoặc - (tối đa 30 ký tự).',
      };
    } else if (!floor || floor.length > SETUP_LIMITS.maxFloorLength) {
      issue = {
        rowId: row.rowId,
        roomNumber: code,
        floor,
        code: 'MISSING_FLOOR',
        message: 'Chưa có tầng hợp lệ.',
      };
    } else if (savedKeys.has(key)) {
      duplicateCount += 1;
      issue = {
        rowId: row.rowId,
        roomNumber: code,
        floor,
        code: 'DUPLICATE_SAVED',
        message: `Mã phòng ${code} đã tồn tại trong nhà trọ.`,
      };
    } else if ((draftCounts.get(key) || 0) > 1) {
      duplicateCount += 1;
      issue = {
        rowId: row.rowId,
        roomNumber: code,
        floor,
        code: 'DUPLICATE_DRAFT',
        message: `Mã phòng ${code} đang bị trùng trong bản nháp.`,
      };
    } else if (row.roomTypeId == null) {
      unassignedCount += 1;
      issue = {
        rowId: row.rowId,
        roomNumber: code,
        floor,
        code: 'MISSING_TYPE',
        message: 'Chưa gán loại phòng.',
      };
    } else {
      const assigned = typeById.get(row.roomTypeId);
      if (!assigned || assigned.price == null || assigned.price <= 0) {
        issue = {
          rowId: row.rowId,
          roomNumber: code,
          floor,
          code: 'INVALID_TYPE',
          message: 'Loại phòng được gán không còn hợp lệ hoặc chưa có giá.',
        };
      }
    }

    if (issue) {
      issues.push(issue);
      issueByRowId[row.rowId] = issue;
    }
  }

  return { issues, issueByRowId, unassignedCount, duplicateCount };
}

export interface RoomSetupMultipartPayload {
  propertyId: number;
  types: {
    localId: number;
    details: RoomTypeRequestPayload;
    photoCount: number;
  }[];
  rooms: {
    roomTypeId: number;
    roomNumber: string;
    floor: string;
  }[];
}

export interface RoomLayoutJsonPayload {
  propertyId: number;
  rooms: {
    roomTypeId: number;
    roomNumber: string;
    floor: string;
  }[];
}

export function buildSetupRequest(
  propertyId: number,
  draftTypes: DraftNewRoomType[],
  draftRooms: DraftRoomRow[]
): {
  mode: 'SETUP_MULTIPART' | 'LAYOUT_JSON';
  setupPayload?: RoomSetupMultipartPayload;
  layoutPayload?: RoomLayoutJsonPayload;
  photos: SetupPhotoAsset[];
} {
  const rooms = draftRooms.map(row => ({
    roomTypeId: Number(row.roomTypeId),
    roomNumber: row.roomNumber.trim(),
    floor: row.floor.trim(),
  }));

  if (draftTypes.length === 0) {
    return {
      mode: 'LAYOUT_JSON',
      layoutPayload: { propertyId, rooms },
      photos: [],
    };
  }

  const photos: SetupPhotoAsset[] = [];
  const types = draftTypes.map(item => {
    photos.push(...item.form.photos);
    return {
      localId: item.localId,
      details: { ...item.details, propertyId },
      photoCount: item.form.photos.length,
    };
  });

  return {
    mode: 'SETUP_MULTIPART',
    setupPayload: { propertyId, types, rooms },
    photos,
  };
}

export function validateSetupResponse(
  data: unknown,
  propertyId: number,
  expectedTypeLocalIds: number[],
  expectedRoomCount: number
): { createdTypes: Record<string, number>; rooms: HostRoom[] } {
  if (!data || typeof data !== 'object') {
    throw new Error('Không xác nhận được kết quả tạo phòng. Hãy tải lại danh sách trước khi gửi lại.');
  }
  const obj = data as { createdTypes?: unknown; rooms?: unknown };
  const createdTypes =
    obj.createdTypes && typeof obj.createdTypes === 'object'
      ? (obj.createdTypes as Record<string, number>)
      : null;
  const rooms = Array.isArray(obj.rooms) ? (obj.rooms as HostRoom[]) : null;

  if (!createdTypes || !rooms) {
    throw new Error('Phản hồi thiết lập phòng không đầy đủ. Hãy kiểm tra lại danh sách phòng.');
  }

  const allTypesConfirmed = expectedTypeLocalIds.every(localId => {
    const createdId = createdTypes[String(localId)];
    return Number.isSafeInteger(createdId) && createdId > 0;
  });

  const allRoomsConfirmed =
    rooms.length === expectedRoomCount &&
    rooms.every(
      r =>
        Number.isSafeInteger(r?.roomId) &&
        r.roomId > 0 &&
        Number(r.propertyId) === propertyId
    );

  if (!allTypesConfirmed || !allRoomsConfirmed) {
    throw new Error('Dữ liệu xác nhận từ máy chủ không khớp. Hãy tải lại để kiểm tra trước khi thử lại.');
  }

  return { createdTypes, rooms };
}

export function validateLayoutResponse(
  data: unknown,
  propertyId: number,
  expectedRoomCount: number
): HostRoom[] {
  if (!Array.isArray(data)) {
    throw new Error('Không xác nhận được danh sách phòng vừa tạo. Hãy tải lại trước khi gửi lại.');
  }
  const rooms = data as HostRoom[];
  const valid =
    rooms.length === expectedRoomCount &&
    rooms.every(
      r =>
        Number.isSafeInteger(r?.roomId) &&
        r.roomId > 0 &&
        Number(r.propertyId) === propertyId
    );
  if (!valid) {
    throw new Error('Số lượng phòng xác nhận từ máy chủ không khớp. Hãy kiểm tra danh sách phòng.');
  }
  return rooms;
}

/**
 * Reconciles draft state against fresh server data after an ambiguous network failure
 * so a retry cannot silently duplicate already-created types or rooms.
 */
export function reconcileDraftAgainstServer(
  draftTypes: DraftNewRoomType[],
  draftRooms: DraftRoomRow[],
  latestServerTypes: HostRoomType[],
  latestServerRooms: HostRoom[]
): {
  matchedTypesCount: number;
  matchedRoomsCount: number;
  allAlreadyCreated: boolean;
  conflictSummary: string | null;
} {
  const serverTypeNames = new Set(latestServerTypes.map(t => t.roomType.trim().toLowerCase()));
  const serverRoomCodes = new Set(latestServerRooms.map(r => roomKey(r.roomNumber)));

  const matchedTypes = draftTypes.filter(t =>
    serverTypeNames.has(t.details.roomType.trim().toLowerCase())
  );
  const matchedRooms = draftRooms.filter(r => serverRoomCodes.has(roomKey(r.roomNumber)));

  const allTypesMatched = matchedTypes.length === draftTypes.length;
  const allRoomsMatched = matchedRooms.length === draftRooms.length;
  const allAlreadyCreated =
    (draftTypes.length > 0 || draftRooms.length > 0) && allTypesMatched && allRoomsMatched;

  let conflictSummary: string | null = null;
  if (allAlreadyCreated) {
    conflictSummary =
      'Tất cả loại phòng và phòng trong bản nháp đã xuất hiện trên hệ thống từ lần gửi trước.';
  } else if (matchedTypes.length > 0 || matchedRooms.length > 0) {
    const parts: string[] = [];
    if (matchedTypes.length > 0) parts.push(`${matchedTypes.length} loại phòng`);
    if (matchedRooms.length > 0) parts.push(`${matchedRooms.length} phòng`);
    conflictSummary = `Hệ thống đã có ${parts.join(' và ')} trùng với bản nháp. Vui lòng kiểm tra lại trước khi gửi tiếp.`;
  }

  return {
    matchedTypesCount: matchedTypes.length,
    matchedRoomsCount: matchedRooms.length,
    allAlreadyCreated,
    conflictSummary,
  };
}

export function applyScopedTypeAssignment(
  draftRooms: DraftRoomRow[],
  targetRowIds: ReadonlySet<string>,
  roomTypeId: number | null,
  label: string
): {
  nextRooms: DraftRoomRow[];
  affectedCount: number;
  snapshot: AssignmentSnapshot | null;
} {
  const previousTypes: Record<string, number | null> = {};
  let affectedCount = 0;

  const nextRooms = draftRooms.map(row => {
    if (!targetRowIds.has(row.rowId)) return row;
    if (row.roomTypeId === roomTypeId) return row;
    previousTypes[row.rowId] = row.roomTypeId;
    affectedCount += 1;
    return { ...row, roomTypeId };
  });

  if (affectedCount === 0) {
    return { nextRooms: draftRooms, affectedCount: 0, snapshot: null };
  }

  return {
    nextRooms,
    affectedCount,
    snapshot: { label, previousTypes },
  };
}

export function undoTypeAssignment(
  draftRooms: DraftRoomRow[],
  snapshot: AssignmentSnapshot
): DraftRoomRow[] {
  return draftRooms.map(row => {
    if (Object.prototype.hasOwnProperty.call(snapshot.previousTypes, row.rowId)) {
      return { ...row, roomTypeId: snapshot.previousTypes[row.rowId] };
    }
    return row;
  });
}
