import { HostError, hostRequest, type HostRoom, type HostRoomType } from './host';

export type RoomStatusFilter = 'ALL' | 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
export type RoomVisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';
export type RoomViewMode = 'floors' | 'list';

export interface PropertyRoomsOverview {
  totalRooms: number | null;
  vacantRooms: number | null;
  occupiedRooms: number | null;
}

export interface FloorRoomGroup {
  key: string;
  floor: string;
  rooms: HostRoom[];
  total: number;
  vacant: number;
  occupied: number;
  other: number;
}

export interface BulkRoomStatusPayload {
  propertyId: number;
  roomIds: number[];
  status: 'VACANT' | 'OCCUPIED';
  leaseStartDate: string | null;
  leaseEndDate: string | null;
}

export interface RoomPublicationPayload {
  propertyId: number;
  roomIds: number[];
}

function foldText(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Exact floor bucket key matching backend string data.
 * Pure numeric values (e.g. "1") are displayed as "Tầng 1";
 * distinct stored strings like "Tầng 1" and "Tầng 01" are NEVER merged automatically.
 */
export function formatFloorKey(floor?: string | null): string {
  const trimmed = String(floor ?? '').trim();
  if (!trimmed) return 'Chưa phân tầng';
  if (/^\d+$/.test(trimmed)) return `Tầng ${trimmed}`;
  return trimmed;
}

function parseFloorSortRank(floor: string) {
  const label = String(floor || '').trim();
  const norm = foldText(label);
  if (!label || norm === 'chua phan tang') {
    return { group: 3, number: 9999, normalized: 'zzzz' };
  }
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

export function compareFloorNames(a: string, b: string): number {
  const rankA = parseFloorSortRank(a);
  const rankB = parseFloorSortRank(b);
  if (rankA.group !== rankB.group) return rankA.group - rankB.group;
  if (rankA.number !== rankB.number) return rankA.number - rankB.number;
  return String(a || '').localeCompare(String(b || ''), 'vi', { numeric: true });
}

export function propertyRoomsOverview(rooms: HostRoom[] | undefined): PropertyRoomsOverview {
  if (!Array.isArray(rooms)) {
    return { totalRooms: null, vacantRooms: null, occupiedRooms: null };
  }
  let vacant = 0;
  let occupied = 0;
  for (const room of rooms) {
    if (room.status === 'VACANT') vacant++;
    else if (room.status === 'OCCUPIED') occupied++;
  }
  return {
    totalRooms: rooms.length,
    vacantRooms: vacant,
    occupiedRooms: occupied,
  };
}

export function extractDistinctFloors(rooms: HostRoom[]): string[] {
  const seen = new Set<string>();
  for (const room of rooms) {
    seen.add(formatFloorKey(room.floor));
  }
  return [...seen].sort(compareFloorNames);
}

export function filterHostRooms(
  rooms: HostRoom[],
  options: {
    search?: string;
    typeId?: string;
    floor?: string;
    status?: RoomStatusFilter;
    visibility?: RoomVisibilityFilter;
  }
): HostRoom[] {
  const query = foldText(options.search || '');
  const typeId = options.typeId || 'ALL';
  const floor = options.floor || 'ALL';
  const status = options.status || 'ALL';
  const visibility = options.visibility || 'ALL';

  return rooms
    .filter(room => {
      if (typeId !== 'ALL' && String(room.roomTypeId) !== String(typeId)) return false;
      if (floor !== 'ALL' && formatFloorKey(room.floor) !== floor) return false;
      if (status !== 'ALL' && room.status !== status) return false;
      if (visibility === 'PUBLIC' && room.publicVisible !== true) return false;
      if (visibility === 'PRIVATE' && room.publicVisible === true) return false;
      if (query) {
        const haystack = foldText(`${room.roomNumber} ${room.roomType}`);
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) =>
      String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''), 'vi', { numeric: true })
    );
}

export function groupRoomsByFloor(rooms: HostRoom[]): FloorRoomGroup[] {
  const buckets = new Map<string, FloorRoomGroup>();

  for (const room of rooms) {
    const key = formatFloorKey(room.floor);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        floor: key,
        rooms: [],
        total: 0,
        vacant: 0,
        occupied: 0,
        other: 0,
      };
      buckets.set(key, bucket);
    }
    bucket.rooms.push(room);
    bucket.total += 1;
    if (room.status === 'VACANT') bucket.vacant += 1;
    else if (room.status === 'OCCUPIED') bucket.occupied += 1;
    else bucket.other += 1;
  }

  return [...buckets.values()].sort((a, b) => compareFloorNames(a.floor, b.floor));
}

export function roomRentalStatusMeta(status: string): {
  label: string;
  tone: 'vacant' | 'occupied' | 'other';
} {
  if (status === 'VACANT') return { label: 'Còn trống', tone: 'vacant' };
  if (status === 'OCCUPIED') return { label: 'Đang thuê', tone: 'occupied' };
  if (status === 'MAINTENANCE') return { label: 'Bảo trì', tone: 'other' };
  return { label: status || 'Khác', tone: 'other' };
}

export function canToggleRoomStatus(room: HostRoom): boolean {
  return room.status === 'VACANT' || room.status === 'OCCUPIED';
}

export function isValidIsoDate(value?: string | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) === '0000') {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function validateBulkLeaseDates(
  status: 'VACANT' | 'OCCUPIED',
  leaseStartDate?: string | null,
  leaseEndDate?: string | null
): Record<string, string> {
  if (status !== 'OCCUPIED') return {};
  const errors: Record<string, string> = {};
  if (!isValidIsoDate(leaseStartDate)) {
    errors.leaseStartDate = 'Nhập ngày bắt đầu dạng YYYY-MM-DD hợp lệ.';
  }
  if (!isValidIsoDate(leaseEndDate)) {
    errors.leaseEndDate = 'Nhập ngày kết thúc dạng YYYY-MM-DD hợp lệ.';
  }
  if (!errors.leaseStartDate && !errors.leaseEndDate && leaseEndDate! < leaseStartDate!) {
    errors.leaseEndDate = 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.';
  }
  return errors;
}

export function todayIsoVietnam(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value || '2026';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

export function addMonthsIso(startIso: string, months: number): string {
  if (!isValidIsoDate(startIso)) return '';
  const [y, m, d] = startIso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().slice(0, 10);
}

export function validateBulkStatusResponse(
  payload: BulkRoomStatusPayload,
  result: unknown
): HostRoom[] {
  const expected = new Set(payload.roomIds);
  if (
    !Array.isArray(result) ||
    result.length !== expected.size ||
    new Set(result.map(item => (item as HostRoom)?.roomId)).size !== expected.size ||
    !result.every(item => {
      const room = item as HostRoom;
      return (
        room &&
        Number.isSafeInteger(room.roomId) &&
        expected.has(room.roomId) &&
        room.propertyId === payload.propertyId &&
        room.status === payload.status &&
        (payload.status !== 'OCCUPIED' ||
          (room.leaseStartDate === payload.leaseStartDate &&
            room.leaseEndDate === payload.leaseEndDate))
      );
    })
  ) {
    throw new HostError('Chưa xác nhận được đầy đủ kết quả cập nhật. Vui lòng tải lại danh sách.', 502);
  }
  return result as HostRoom[];
}

export async function updateHostRoomStatuses(
  payload: BulkRoomStatusPayload,
  token: string,
  signal: AbortSignal
): Promise<HostRoom[]> {
  const result = await hostRequest<HostRoom[]>(
    '/host/rooms/status',
    token,
    signal,
    payload,
    'PATCH'
  );
  return validateBulkStatusResponse(payload, result);
}

export function validatePublicationResponse(
  payload: RoomPublicationPayload,
  result: unknown
): HostRoom[] {
  const expectedPublic = new Set(payload.roomIds);
  if (
    !Array.isArray(result) ||
    !result.every(item => {
      const room = item as HostRoom;
      return (
        room &&
        Number.isSafeInteger(room.roomId) &&
        room.propertyId === payload.propertyId &&
        typeof room.publicVisible === 'boolean' &&
        room.publicVisible === expectedPublic.has(room.roomId)
      );
    }) ||
    !payload.roomIds.every(id => (result as HostRoom[]).some(room => room.roomId === id))
  ) {
    throw new HostError('Chưa xác nhận được kết quả công khai phòng. Vui lòng tải lại.', 502);
  }
  return result as HostRoom[];
}

export async function publishHostRooms(
  payload: RoomPublicationPayload,
  token: string,
  signal: AbortSignal
): Promise<HostRoom[]> {
  const result = await hostRequest<HostRoom[]>(
    '/host/rooms/publication',
    token,
    signal,
    payload,
    'PUT'
  );
  return validatePublicationResponse(payload, result);
}

/* -------------------------------------------------------------------------- */
/* Room Detail, Contracts, Confirmation & Deletion Helpers                     */
/* -------------------------------------------------------------------------- */

export interface RentalContractDetails {
  roomId?: number;
  template?: string;
  contractDate?: string | null;
  landlordName?: string;
  landlordPhone?: string;
  landlordAddress?: string | null;
  landlordIdentity?: string | null;
  tenantName?: string;
  tenantPhone?: string;
  tenantAddress?: string | null;
  tenantIdentity?: string | null;
  rent?: number | null;
  deposit?: number | null;
  paymentDay?: number | null;
  paymentMethod?: string | null;
  electricityPrice?: number | null;
  waterPrice?: number | null;
  waterUnit?: string | null;
  internetPrice?: number | null;
  servicePrice?: number | null;
  terms: string;
}

export interface RentalContractView {
  id: number;
  status: 'ACTIVE' | 'CLOSED';
  propertyName?: string | null;
  propertyAddress?: string | null;
  roomNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  details: RentalContractDetails;
}

/**
 * Formats YYYY-MM-DD strictly by string components so date-only fields never drift across timezones.
 */
export function formatIsoDateVi(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'Chưa cập nhật';
  const [y, m, d] = raw.split('-');
  return `${d}/${m}/${y}`;
}

export function selectDisplayContract(
  records?: RentalContractView[] | null
): RentalContractView | null {
  if (!Array.isArray(records) || records.length === 0) return null;
  return records.find(item => item.status === 'ACTIVE') ?? records[0];
}

export function validateRoomContractsResponse(value: unknown): RentalContractView[] {
  if (
    !Array.isArray(value) ||
    !value.every(item => {
      const c = item as RentalContractView;
      return (
        c &&
        Number.isSafeInteger(c.id) &&
        (c.status === 'ACTIVE' || c.status === 'CLOSED') &&
        c.details != null &&
        typeof c.details.terms === 'string'
      );
    })
  ) {
    throw new HostError('Chưa tải được hợp đồng. Vui lòng thử lại.', 502);
  }
  return value as RentalContractView[];
}

export async function fetchRoomContracts(
  roomId: number,
  token: string,
  signal: AbortSignal
): Promise<RentalContractView[]> {
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    throw new HostError('Mã phòng không hợp lệ.', 400);
  }
  const result = await hostRequest<RentalContractView[]>(
    `/host/rental-contracts/rooms/${roomId}`,
    token,
    signal
  );
  return validateRoomContractsResponse(result);
}

/**
 * Exact port of web roomAvailability + availabilityPresentation.
 * Room confirmedAt datetimes are Vietnam local time (+07:00).
 */
export function roomConfirmationPresentation(
  room?: Pick<HostRoom, 'confirmedAt' | 'confirmationStatus'> | null,
  now = Date.now()
): { state: 'CURRENT' | 'STALE' | 'UNCONFIRMED'; label: string; detail: string } {
  const raw = room?.confirmedAt;
  const timestamp =
    raw && !/(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? `${raw}+07:00` : raw || '';
  const time = timestamp ? Date.parse(timestamp) : NaN;
  const validDate = Number.isFinite(time);
  const fallback =
    !validDate || time > now
      ? 'UNCONFIRMED'
      : now - time > 7 * 24 * 60 * 60 * 1000
      ? 'STALE'
      : 'CURRENT';
  const status = room?.confirmationStatus || fallback;

  if (!validDate || (status !== 'CURRENT' && status !== 'STALE')) {
    return {
      state: 'UNCONFIRMED',
      label: 'Chưa xác nhận',
      detail: 'Chưa xác nhận tình trạng phòng trống',
    };
  }

  const formatted = new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(time));

  if (status === 'STALE') {
    return {
      state: 'STALE',
      label: 'Quá 7 ngày chưa xác nhận',
      detail: `Lần cuối: ${formatted}`,
    };
  }

  return {
    state: 'CURRENT',
    label: 'Đã xác nhận',
    detail: `Đã xác nhận lúc ${formatted}`,
  };
}

/**
 * Resolves deposit from room or its linked room type.
 * NEVER falls back to monthly rent as deposit.
 */
export function resolveRoomDeposit(
  room?: Pick<HostRoom, 'deposit'> | null,
  roomType?: Pick<HostRoomType, 'deposit'> | null
): number | null {
  if (room?.deposit != null && Number.isFinite(room.deposit)) return room.deposit;
  if (roomType?.deposit != null && Number.isFinite(roomType.deposit)) return roomType.deposit;
  return null;
}

export function roomPriceMechanism(
  room: Pick<HostRoom, 'price' | 'customPrice'>,
  roomType?: Pick<HostRoomType, 'price'> | null
): {
  isCustom: boolean;
  label: string;
  baseTypePrice: number | null;
} {
  const isCustom = room.customPrice != null && Number.isFinite(room.customPrice);
  const baseTypePrice =
    roomType?.price != null && Number.isFinite(roomType.price) ? roomType.price : null;
  return {
    isCustom,
    label: isCustom ? 'Giá riêng của phòng' : 'Theo niêm yết loại phòng',
    baseTypePrice,
  };
}

export function canDeleteRoom(
  room?: Pick<HostRoom, 'status'> | null,
  canManage = false
): { allowed: boolean; reason: string | null } {
  if (!canManage || !room) {
    return {
      allowed: false,
      reason: 'Tài khoản hoặc nhà trọ hiện tại không có quyền xóa phòng.',
    };
  }
  if (room.status === 'OCCUPIED') {
    return {
      allowed: false,
      reason: 'Phòng đang có người thuê. Cần cập nhật trạng thái thực tế sang Còn trống trước khi xóa.',
    };
  }
  return { allowed: true, reason: null };
}

export async function deleteHostRoom(
  roomId: number,
  token: string,
  signal: AbortSignal
): Promise<void> {
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    throw new HostError('Mã phòng không hợp lệ.', 400);
  }
  await hostRequest(`/host/rooms/${roomId}`, token, signal, undefined, 'DELETE');
}
