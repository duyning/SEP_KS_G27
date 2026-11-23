import { HostError, hostRequest, type HostRoom, type HostRoomType } from './host';

export type AvailabilityState = 'CURRENT' | 'STALE' | 'UNCONFIRMED';
export type RoomTypeFilterKey = 'ALL' | 'AVAILABLE' | 'UNCONFIRMED' | 'FULL' | 'EMPTY';
export type RoomTypeSortKey = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';

export interface RoomTypeInventory {
  total: number | null;
  vacant: number | null;
  occupied: number | null;
  other: number | null;
}

export interface PropertyRoomTypesOverview {
  roomTypeCount: number | null;
  totalRooms: number | null;
  vacantRooms: number | null;
  occupiedRooms: number | null;
}

export interface RoomTypeOperationalMeta {
  key: 'ACTIVE' | 'FULL' | 'EMPTY' | 'UNKNOWN';
  label: string;
}

export interface AvailabilityInfo {
  state: AvailabilityState;
  label: string;
  detail: string;
}

export const ROOM_AMENITY_LABELS: Record<string, string> = {
  airConditioner: 'Điều hòa Inverter',
  waterHeater: 'Bình nóng lạnh',
  balcony: 'Ban công riêng',
  kitchen: 'Kệ bếp nấu ăn',
  loft: 'Gác lửng ngủ',
  refrigerator: 'Tủ lạnh riêng',
  washingMachine: 'Máy giặt riêng',
  bed: 'Giường & Đệm',
  wardrobe: 'Tủ quần áo',
  desk: 'Bàn ghế làm việc',
  wifi: 'Wifi tốc độ cao',
  privateBathroom: 'Vệ sinh khép kín',
  ceilingFan: 'Quạt trần',
  window: 'Cửa sổ thoáng',
  curtains: 'Rèm cửa',
  smartLock: 'Khóa cửa thông minh',
  television: 'Tivi',
  sofa: 'Sofa',
  diningTable: 'Bàn ăn',
  inductionCooker: 'Bếp từ',
  microwave: 'Lò vi sóng',
  kitchenHood: 'Máy hút mùi',
  privateDrying: 'Khu phơi đồ riêng',
};

export function roomAmenityLabel(key: string): string {
  return ROOM_AMENITY_LABELS[key] || key;
}

export function formatMoneyVnd(value: number | null | undefined, emptyLabel = 'Chưa cấu hình'): string {
  if (value == null || !Number.isFinite(value)) return emptyLabel;
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

export function formatFeeWithUnit(
  value: number | null | undefined,
  unit: string,
  emptyLabel = 'Chưa cấu hình'
): string {
  if (value == null || !Number.isFinite(value)) return emptyLabel;
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ/${unit}`;
}

export function formatFloorLabel(floor?: string | null): string {
  const raw = floor?.trim();
  if (!raw) return 'Chưa rõ tầng';
  if (/^tầng\s+/i.test(raw) || /^gác/i.test(raw) || /^trệt/i.test(raw)) return raw;
  return `Tầng ${raw}`;
}

export function resolveRoomEffectivePrice(
  room: Pick<HostRoom, 'price' | 'customPrice'>,
  fallbackTypePrice?: number | null
): { amount: number | null; isCustom: boolean } {
  if (room.customPrice != null && Number.isFinite(room.customPrice)) {
    return { amount: room.customPrice, isCustom: true };
  }
  if (room.price != null && Number.isFinite(room.price)) {
    return { amount: room.price, isCustom: false };
  }
  if (fallbackTypePrice != null && Number.isFinite(fallbackTypePrice)) {
    return { amount: fallbackTypePrice, isCustom: false };
  }
  return { amount: null, isCustom: false };
}

export function foldVietnamese(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');
}

function isValidCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function availabilityPresentation(
  value?: Pick<HostRoomType, 'availabilityConfirmedAt' | 'availabilityConfirmationStatus'> | null
): AvailabilityInfo {
  const raw = value?.availabilityConfirmedAt;
  const parsed = raw ? new Date(raw) : null;
  const validDate = Boolean(parsed && Number.isFinite(parsed.getTime()));
  const state = value?.availabilityConfirmationStatus;

  if (!validDate || (state !== 'CURRENT' && state !== 'STALE')) {
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
  }).format(parsed!);

  if (state === 'STALE') {
    return {
      state: 'STALE',
      label: 'Cần xác nhận lại',
      detail: `Quá 7 ngày chưa xác nhận · Lần cuối: ${formatted}`,
    };
  }

  return {
    state: 'CURRENT',
    label: 'Đã xác nhận',
    detail: `Đã xác nhận lúc ${formatted}`,
  };
}

/**
 * Compute authoritative room counts for a room type.
 * Never derives occupied as (total - vacant) because rooms can have maintenance/other statuses.
 */
export function roomTypeInventory(
  type: HostRoomType,
  propertyRooms?: HostRoom[]
): RoomTypeInventory {
  const sourceRooms = Array.isArray(type.rooms)
    ? type.rooms
    : Array.isArray(propertyRooms)
    ? propertyRooms.filter(room => room.roomTypeId === type.roomTypeId)
    : null;

  if (sourceRooms) {
    let vacant = 0;
    let occupied = 0;
    let other = 0;
    for (const room of sourceRooms) {
      if (room.status === 'VACANT') vacant++;
      else if (room.status === 'OCCUPIED') occupied++;
      else other++;
    }
    return {
      total: sourceRooms.length,
      vacant,
      occupied,
      other,
    };
  }

  const totalValid = isValidCount(type.totalRooms);
  const vacantValid = isValidCount(type.vacantRooms);
  if (totalValid && vacantValid && type.vacantRooms <= type.totalRooms) {
    return {
      total: type.totalRooms,
      vacant: type.vacantRooms,
      occupied: type.totalRooms === 0 ? 0 : null,
      other: type.totalRooms === 0 ? 0 : null,
    };
  }

  return {
    total: totalValid ? type.totalRooms : null,
    vacant: null,
    occupied: null,
    other: null,
  };
}

/**
 * Compute overview totals strictly for the selected property (never from filtered rows).
 * Leaves unknown values as null so UI renders '—' instead of fabricating 0.
 */
export function propertyRoomTypesOverview(
  propertyTypes: HostRoomType[] | undefined,
  propertyRooms: HostRoom[] | undefined
): PropertyRoomTypesOverview {
  const roomTypeCount = Array.isArray(propertyTypes) ? propertyTypes.length : null;

  if (Array.isArray(propertyRooms)) {
    let vacant = 0;
    let occupied = 0;
    for (const room of propertyRooms) {
      if (room.status === 'VACANT') vacant++;
      else if (room.status === 'OCCUPIED') occupied++;
    }
    return {
      roomTypeCount,
      totalRooms: propertyRooms.length,
      vacantRooms: vacant,
      occupiedRooms: occupied,
    };
  }

  if (Array.isArray(propertyTypes)) {
    const allValid = propertyTypes.every(
      item =>
        isValidCount(item.totalRooms) &&
        isValidCount(item.vacantRooms) &&
        item.vacantRooms <= item.totalRooms
    );
    if (allValid) {
      const totalRooms = propertyTypes.reduce((sum, item) => sum + item.totalRooms, 0);
      const vacantRooms = propertyTypes.reduce((sum, item) => sum + item.vacantRooms, 0);
      return {
        roomTypeCount,
        totalRooms,
        vacantRooms,
        occupiedRooms: totalRooms === 0 ? 0 : null,
      };
    }
  }

  return {
    roomTypeCount,
    totalRooms: null,
    vacantRooms: null,
    occupiedRooms: null,
  };
}

export function roomTypeOperationalStatus(inventory: RoomTypeInventory): RoomTypeOperationalMeta {
  if (inventory.total == null || inventory.vacant == null) {
    return { key: 'UNKNOWN', label: 'Chưa rõ số phòng' };
  }
  if (inventory.total === 0) {
    return { key: 'EMPTY', label: 'Chưa có phòng' };
  }
  if (inventory.vacant > 0) {
    return { key: 'ACTIVE', label: 'Đang khai thác' };
  }
  return { key: 'FULL', label: 'Đã lấp đầy' };
}

export function canConfirmRoomTypeAvailability(inventory: RoomTypeInventory): boolean {
  return inventory.total != null && inventory.total > 0;
}

export function filterAndSortHostRoomTypes(
  types: HostRoomType[],
  propertyRooms: HostRoom[] | undefined,
  options: {
    search?: string;
    filter?: RoomTypeFilterKey;
    sort?: RoomTypeSortKey;
  }
): HostRoomType[] {
  const keyword = foldVietnamese((options.search || '').trim());
  const filter = options.filter || 'ALL';
  const sort = options.sort || 'NEWEST';

  const filtered = types.filter(item => {
    if (keyword) {
      const haystack = foldVietnamese(item.roomType || '');
      if (!haystack.includes(keyword)) return false;
    }

    if (filter === 'ALL') return true;
    const inv = roomTypeInventory(item, propertyRooms);
    if (filter === 'AVAILABLE') {
      return inv.vacant != null && inv.vacant > 0;
    }
    if (filter === 'UNCONFIRMED') {
      if (!canConfirmRoomTypeAvailability(inv)) return false;
      const avail = availabilityPresentation(item);
      return avail.state !== 'CURRENT';
    }
    if (filter === 'FULL') {
      return inv.total != null && inv.total > 0 && inv.vacant === 0;
    }
    if (filter === 'EMPTY') {
      return inv.total === 0;
    }
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (sort === 'PRICE_ASC') {
      const aPrice = a.price ?? Number.POSITIVE_INFINITY;
      const bPrice = b.price ?? Number.POSITIVE_INFINITY;
      if (aPrice !== bPrice) return aPrice - bPrice;
      return b.roomTypeId - a.roomTypeId;
    }
    if (sort === 'PRICE_DESC') {
      const aPrice = a.price ?? Number.NEGATIVE_INFINITY;
      const bPrice = b.price ?? Number.NEGATIVE_INFINITY;
      if (aPrice !== bPrice) return bPrice - aPrice;
      return b.roomTypeId - a.roomTypeId;
    }
    // NEWEST: createdAt desc, fallback roomTypeId desc
    const aTime = a.createdAt ? Date.parse(a.createdAt) : NaN;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : NaN;
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
      return bTime - aTime;
    }
    return b.roomTypeId - a.roomTypeId;
  });

  return sorted;
}

export function validateAvailabilityConfirmationResponse(
  expectedRoomTypeId: number,
  value: unknown
): HostRoomType {
  const data = value as Partial<HostRoomType> | null | undefined;
  if (
    !data ||
    data.roomTypeId !== expectedRoomTypeId ||
    data.availabilityConfirmationStatus !== 'CURRENT' ||
    !data.availabilityConfirmedAt ||
    !Number.isFinite(Date.parse(data.availabilityConfirmedAt)) ||
    data.availabilityStale !== false ||
    !isValidCount(data.vacantRooms) ||
    !isValidCount(data.totalRooms) ||
    data.vacantRooms > data.totalRooms ||
    data.totalRooms < 1
  ) {
    throw new HostError('Chưa xác nhận được kết quả đã lưu. Vui lòng tải lại danh sách.', 502);
  }
  return data as HostRoomType;
}

export async function confirmRoomTypeAvailability(
  roomTypeId: number,
  token: string,
  signal: AbortSignal
): Promise<HostRoomType> {
  if (!Number.isSafeInteger(roomTypeId) || roomTypeId < 1) {
    throw new HostError('Mã loại phòng không hợp lệ.', 400);
  }
  const result = await hostRequest<HostRoomType>(
    `/host/room-types/${roomTypeId}/availability-confirmation`,
    token,
    signal,
    undefined,
    'POST'
  );
  return validateAvailabilityConfirmationResponse(roomTypeId, result);
}
