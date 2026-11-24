import type { HostRoomType } from './host';
import {
  ROOM_AMENITY_LABELS,
  foldVietnamese,
  type RoomTypeInventory,
} from './host-room-types';

export const ROOM_TYPE_MAX_PHOTOS = 10;
export const ROOM_TYPE_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ROOM_TYPE_MIN_NAME_LENGTH = 3;
export const ROOM_TYPE_MAX_NAME_LENGTH = 100;
export const ROOM_TYPE_MAX_DESCRIPTION_LENGTH = 2000;
export const ROOM_TYPE_MAX_AMOUNT = 999_999_999;

export const ALLOWED_ROOM_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VALID_AMENITY_KEYS = new Set(Object.keys(ROOM_AMENITY_LABELS));

export interface RoomTypeAmenityGroup {
  id: 'space' | 'living' | 'kitchenBath';
  title: string;
  keys: readonly string[];
}

/**
 * Exact 3 amenity groups matching the web portal (frontend/src/services/room-types.js)
 * covering all 23 backend amenity keys in HostRoomTypeService.AMENITIES.
 */
export const ROOM_TYPE_AMENITY_GROUPS: readonly RoomTypeAmenityGroup[] = [
  {
    id: 'space',
    title: 'Không gian & Tiện nghi',
    keys: [
      'airConditioner',
      'ceilingFan',
      'waterHeater',
      'window',
      'curtains',
      'balcony',
      'wifi',
      'smartLock',
    ],
  },
  {
    id: 'living',
    title: 'Nội thất & Sinh hoạt',
    keys: ['bed', 'wardrobe', 'desk', 'loft', 'television', 'sofa', 'diningTable'],
  },
  {
    id: 'kitchenBath',
    title: 'Bếp & Vệ sinh',
    keys: [
      'kitchen',
      'refrigerator',
      'inductionCooker',
      'microwave',
      'kitchenHood',
      'washingMachine',
      'privateBathroom',
      'privateDrying',
    ],
  },
];

export type RoomTypeServiceFeeKey =
  | 'electricityPrice'
  | 'waterPrice'
  | 'internetPrice'
  | 'servicePrice';

export interface RoomTypeServiceFeeMeta {
  key: RoomTypeServiceFeeKey;
  label: string;
  unit: string;
  unitShort: string;
  placeholder: string;
}

export const ROOM_TYPE_SERVICE_FEES: readonly RoomTypeServiceFeeMeta[] = [
  {
    key: 'electricityPrice',
    label: 'Tiền điện',
    unit: 'đ/kWh',
    unitShort: 'kWh',
    placeholder: 'VD: 3.500',
  },
  {
    key: 'waterPrice',
    label: 'Tiền nước',
    unit: 'đ/m³',
    unitShort: 'm³',
    placeholder: 'VD: 20.000',
  },
  {
    key: 'internetPrice',
    label: 'Internet / Wi-Fi',
    unit: 'đ/phòng',
    unitShort: 'phòng',
    placeholder: 'VD: 100.000',
  },
  {
    key: 'servicePrice',
    label: 'Dịch vụ chung',
    unit: 'đ/người',
    unitShort: 'người',
    placeholder: 'VD: 150.000',
  },
];

export interface ExistingRoomTypeImage {
  imageId: number;
  fileName: string;
  markedForDeletion: boolean;
}

export interface NewRoomTypePhoto {
  id: string;
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  file?: File;
  status: 'ready' | 'loading' | 'error';
  error?: string;
}

export interface RoomTypeEditorDraft {
  roomType: string;
  areaSqm: string;
  capacity: string;
  price: string;
  deposit: string;
  description: string;
  imageUrl: string;
  amenities: string[];
  electricityPrice: string;
  waterPrice: string;
  internetPrice: string;
  servicePrice: string;
  existingImages: ExistingRoomTypeImage[];
  newPhotos: NewRoomTypePhoto[];
}

export interface RoomTypeUpdatePayload {
  propertyId: number;
  roomType: string;
  areaSqm: number;
  capacity: number;
  price: number;
  deposit: number | null;
  imageUrl: string | null;
  description: string;
  amenities: string[];
  electricityPrice: number | null;
  waterPrice: number | null;
  internetPrice: number | null;
  servicePrice: number | null;
  retainedImageIds: number[];
}

export type RoomTypeEditorErrorKey =
  | 'roomType'
  | 'areaSqm'
  | 'capacity'
  | 'price'
  | 'deposit'
  | 'description'
  | 'imageUrl'
  | 'amenities'
  | 'electricityPrice'
  | 'waterPrice'
  | 'internetPrice'
  | 'servicePrice'
  | 'photos';

export type RoomTypeEditorErrors = Partial<Record<RoomTypeEditorErrorKey, string>>;

export interface ActiveRoomTypePhotosSummary {
  retained: ExistingRoomTypeImage[];
  markedRemoved: ExistingRoomTypeImage[];
  newPhotos: NewRoomTypePhoto[];
  totalActive: number;
  remainingSlots: number;
  coverKey: string | null;
  hasPendingUploads: boolean;
  hasErrorPhotos: boolean;
}

export type RoomTypeDeleteEvaluation =
  | {
      status: 'BLOCKED_PERMISSION';
      title: string;
      message: string;
    }
  | {
      status: 'BLOCKED_ROOMS';
      roomCount: number;
      vacantCount: number | null;
      occupiedCount: number | null;
      otherCount: number | null;
      title: string;
      message: string;
    }
  | {
      status: 'ELIGIBLE';
      title: string;
      message: string;
      warning: string;
      imageCount: number;
    };

/**
 * Hermes-safe integer grouping (no Intl.NumberFormat(BigInt) dependency).
 * Preserves exact integer digits without rounding.
 */
export function formatVndIntegerInput(rawDigits: string): string {
  const trimmed = String(rawDigits ?? '').trim();
  if (!trimmed) return '';
  if (!/^\d+$/.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Extracts raw integer digits from a formatted VND text input.
 * Preserves empty string as '' and '0' as '0' without coercing blank to zero.
 */
export function parseVndDigitsInput(text: string): string {
  const raw = String(text ?? '');
  if (!raw.trim()) return '';
  // Reject negative sign by preserving it so validator can report a clear error if pasted
  if (/^\s*-/.test(raw)) {
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `-${digits}` : '-';
  }
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/^0+(?=\d)/, '');
}

export function sanitizeAreaInput(raw: string): string {
  const normalized = String(raw ?? '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const parts = normalized.split('.');
  if (parts.length <= 1) return normalized;
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

export function sanitizeCapacityInput(raw: string): string {
  return String(raw ?? '').replace(/[^0-9]/g, '').slice(0, 2);
}

function numericToDraftString(value: number | null | undefined, integer = true): string {
  if (value == null || !Number.isFinite(value)) return '';
  if (integer) return String(Math.trunc(value));
  return String(value);
}

export function createEmptyRoomTypeEditorDraft(): RoomTypeEditorDraft {
  return {
    roomType: '',
    areaSqm: '',
    capacity: '2',
    price: '',
    deposit: '',
    description: '',
    imageUrl: '',
    amenities: [],
    electricityPrice: '',
    waterPrice: '',
    internetPrice: '',
    servicePrice: '',
    existingImages: [],
    newPhotos: [],
  };
}

export function createRoomTypeEditorDraft(source: HostRoomType): RoomTypeEditorDraft {
  const sortedImages = [...(source.images || [])]
    .sort((a, b) => a.imageId - b.imageId)
    .map(img => ({
      imageId: img.imageId,
      fileName: img.fileName || `anh-${img.imageId}.jpg`,
      markedForDeletion: false,
    }));

  const amenities = Array.from(
    new Set((source.amenities || []).filter(key => VALID_AMENITY_KEYS.has(key)))
  );

  return {
    roomType: source.roomType ?? '',
    areaSqm: numericToDraftString(source.areaSqm, false),
    capacity: numericToDraftString(source.capacity, true),
    price: numericToDraftString(source.price, true),
    deposit: numericToDraftString(source.deposit, true),
    description: source.description ?? '',
    imageUrl: source.imageUrl ?? '',
    amenities,
    electricityPrice: numericToDraftString(source.electricityPrice, true),
    waterPrice: numericToDraftString(source.waterPrice, true),
    internetPrice: numericToDraftString(source.internetPrice, true),
    servicePrice: numericToDraftString(source.servicePrice, true),
    existingImages: sortedImages,
    newPhotos: [],
  };
}

export function activeRoomTypePhotos(draft: RoomTypeEditorDraft): ActiveRoomTypePhotosSummary {
  const retained = draft.existingImages
    .filter(img => !img.markedForDeletion)
    .sort((a, b) => a.imageId - b.imageId);
  const markedRemoved = draft.existingImages
    .filter(img => img.markedForDeletion)
    .sort((a, b) => a.imageId - b.imageId);
  const newPhotos = draft.newPhotos;
  const totalActive = retained.length + newPhotos.length;
  const remainingSlots = Math.max(0, ROOM_TYPE_MAX_PHOTOS - totalActive);

  let coverKey: string | null = null;
  if (retained.length > 0) {
    coverKey = `existing:${retained[0].imageId}`;
  } else if (newPhotos.length > 0) {
    coverKey = `new:${newPhotos[0].id}`;
  }

  return {
    retained,
    markedRemoved,
    newPhotos,
    totalActive,
    remainingSlots,
    coverKey,
    hasPendingUploads: newPhotos.some(p => p.status === 'loading'),
    hasErrorPhotos: newPhotos.some(p => p.status === 'error'),
  };
}

function normalizeAmenitiesKey(keys: readonly string[]): string {
  return Array.from(new Set(keys.filter(key => VALID_AMENITY_KEYS.has(key))))
    .sort()
    .join(',');
}

function normalizeDecimalForComparison(raw: string): string {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return '';
  const num = Number(trimmed);
  return Number.isFinite(num) ? String(Number(num.toFixed(2))) : trimmed;
}

function normalizeOptionalIntForComparison(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return String(Number(trimmed));
}

export function isRoomTypeDraftDirty(
  draft: RoomTypeEditorDraft,
  baseline: RoomTypeEditorDraft
): boolean {
  if (draft.roomType.trim() !== baseline.roomType.trim()) return true;
  if (normalizeDecimalForComparison(draft.areaSqm) !== normalizeDecimalForComparison(baseline.areaSqm)) {
    return true;
  }
  if (normalizeOptionalIntForComparison(draft.capacity) !== normalizeOptionalIntForComparison(baseline.capacity)) {
    return true;
  }
  if (normalizeOptionalIntForComparison(draft.price) !== normalizeOptionalIntForComparison(baseline.price)) {
    return true;
  }
  if (normalizeOptionalIntForComparison(draft.deposit) !== normalizeOptionalIntForComparison(baseline.deposit)) {
    return true;
  }
  if (draft.description.trim() !== baseline.description.trim()) return true;
  if (draft.imageUrl.trim() !== baseline.imageUrl.trim()) return true;
  if (
    normalizeOptionalIntForComparison(draft.electricityPrice) !==
    normalizeOptionalIntForComparison(baseline.electricityPrice)
  ) {
    return true;
  }
  if (
    normalizeOptionalIntForComparison(draft.waterPrice) !==
    normalizeOptionalIntForComparison(baseline.waterPrice)
  ) {
    return true;
  }
  if (
    normalizeOptionalIntForComparison(draft.internetPrice) !==
    normalizeOptionalIntForComparison(baseline.internetPrice)
  ) {
    return true;
  }
  if (
    normalizeOptionalIntForComparison(draft.servicePrice) !==
    normalizeOptionalIntForComparison(baseline.servicePrice)
  ) {
    return true;
  }
  if (normalizeAmenitiesKey(draft.amenities) !== normalizeAmenitiesKey(baseline.amenities)) {
    return true;
  }

  const draftRetainedIds = draft.existingImages
    .filter(img => !img.markedForDeletion)
    .map(img => img.imageId)
    .sort((a, b) => a - b);
  const baseRetainedIds = baseline.existingImages
    .filter(img => !img.markedForDeletion)
    .map(img => img.imageId)
    .sort((a, b) => a - b);
  if (draftRetainedIds.join(',') !== baseRetainedIds.join(',')) return true;

  if (draft.newPhotos.length !== baseline.newPhotos.length) return true;
  for (let i = 0; i < draft.newPhotos.length; i += 1) {
    if (draft.newPhotos[i].id !== baseline.newPhotos[i].id) return true;
  }

  return false;
}

function validateOptionalNonNegativeVnd(raw: string, label: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('-')) {
    return `${label} không được là số âm.`;
  }
  if (!/^\d+$/.test(trimmed)) {
    return `${label} phải là số nguyên không âm.`;
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0 || value > ROOM_TYPE_MAX_AMOUNT) {
    return `${label} phải nằm trong khoảng 0 đến 999.999.999 đ.`;
  }
  return undefined;
}

export function validateRoomTypeEditorDraft(
  draft: RoomTypeEditorDraft,
  options?: {
    siblingRoomTypes?: readonly Pick<HostRoomType, 'roomTypeId' | 'roomType'>[];
    currentRoomTypeId?: number;
  }
): RoomTypeEditorErrors {
  const errors: RoomTypeEditorErrors = {};

  const name = draft.roomType.trim();
  if (name.length < ROOM_TYPE_MIN_NAME_LENGTH || name.length > ROOM_TYPE_MAX_NAME_LENGTH) {
    errors.roomType = 'Tên loại phòng cần từ 3 đến 100 ký tự.';
  } else if (options?.siblingRoomTypes?.length) {
    const normalizedName = name.toLowerCase();
    const duplicated = options.siblingRoomTypes.some(
      sibling =>
        sibling.roomTypeId !== options.currentRoomTypeId &&
        sibling.roomType.trim().toLowerCase() === normalizedName
    );
    if (duplicated) {
      errors.roomType = 'Tên loại phòng đã tồn tại trong nhà trọ này.';
    }
  }

  const areaRaw = draft.areaSqm.trim().replace(',', '.');
  const areaNum = Number(areaRaw);
  if (!areaRaw || !/^\d+(?:\.\d{1,2})?$/.test(areaRaw) || !Number.isFinite(areaNum) || areaNum < 1 || areaNum > 10000) {
    errors.areaSqm = 'Diện tích từ 1 đến 10.000 m², tối đa 2 chữ số thập phân.';
  }

  const capRaw = draft.capacity.trim();
  const capNum = Number(capRaw);
  if (!/^\d+$/.test(capRaw) || !Number.isSafeInteger(capNum) || capNum < 1 || capNum > 20) {
    errors.capacity = 'Sức chứa phải là số nguyên từ 1 đến 20 người.';
  }

  const priceRaw = draft.price.trim();
  const priceNum = Number(priceRaw);
  if (priceRaw.startsWith('-')) {
    errors.price = 'Giá thuê không được là số âm.';
  } else if (
    !/^\d+$/.test(priceRaw) ||
    !Number.isSafeInteger(priceNum) ||
    priceNum < 1 ||
    priceNum > ROOM_TYPE_MAX_AMOUNT
  ) {
    errors.price = 'Giá thuê phải là số nguyên từ 1 đến 999.999.999 đ/tháng.';
  }

  const depositErr = validateOptionalNonNegativeVnd(draft.deposit, 'Tiền đặt cọc');
  if (depositErr) errors.deposit = depositErr;

  const elecErr = validateOptionalNonNegativeVnd(draft.electricityPrice, 'Tiền điện');
  if (elecErr) errors.electricityPrice = elecErr;

  const waterErr = validateOptionalNonNegativeVnd(draft.waterPrice, 'Tiền nước');
  if (waterErr) errors.waterPrice = waterErr;

  const internetErr = validateOptionalNonNegativeVnd(draft.internetPrice, 'Phí Internet / Wi-Fi');
  if (internetErr) errors.internetPrice = internetErr;

  const serviceErr = validateOptionalNonNegativeVnd(draft.servicePrice, 'Phí dịch vụ chung');
  if (serviceErr) errors.servicePrice = serviceErr;

  if (draft.description.trim().length > ROOM_TYPE_MAX_DESCRIPTION_LENGTH) {
    errors.description = `Mô tả tối đa ${ROOM_TYPE_MAX_DESCRIPTION_LENGTH} ký tự.`;
  }

  const imageUrl = draft.imageUrl.trim();
  if (imageUrl) {
    let validHttps = false;
    try {
      const parsed = new URL(imageUrl);
      validHttps =
        parsed.protocol === 'https:' &&
        !parsed.username &&
        !parsed.password &&
        imageUrl.length <= 1000;
    } catch {
      validHttps = false;
    }
    if (!validHttps) {
      errors.imageUrl = 'Đường dẫn ảnh phải là HTTPS hợp lệ, tối đa 1.000 ký tự.';
    }
  }

  if (
    draft.amenities.length > VALID_AMENITY_KEYS.size ||
    draft.amenities.some(key => !VALID_AMENITY_KEYS.has(key)) ||
    new Set(draft.amenities).size !== draft.amenities.length
  ) {
    errors.amenities = 'Danh sách tiện nghi không hợp lệ.';
  }

  const photoSummary = activeRoomTypePhotos(draft);
  if (photoSummary.totalActive > ROOM_TYPE_MAX_PHOTOS) {
    errors.photos = `Mỗi loại phòng chỉ hỗ trợ tối đa ${ROOM_TYPE_MAX_PHOTOS} ảnh.`;
  } else if (photoSummary.hasPendingUploads) {
    errors.photos = 'Đang xử lý ảnh vừa chọn. Vui lòng chờ hoàn tất trước khi lưu.';
  } else if (photoSummary.hasErrorPhotos) {
    errors.photos = 'Có ảnh gặp lỗi. Hãy thử lại hoặc bỏ ảnh lỗi trước khi lưu.';
  } else {
    const invalidNew = draft.newPhotos.find(
      p =>
        (p.mimeType && !ALLOWED_ROOM_PHOTO_MIMES.has(p.mimeType)) ||
        (typeof p.fileSize === 'number' && (p.fileSize <= 0 || p.fileSize > ROOM_TYPE_MAX_PHOTO_BYTES))
    );
    if (invalidNew) {
      errors.photos = 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP không rỗng và tối đa 5 MB/ảnh.';
    }
  }

  return errors;
}

function parseOptionalIntValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

export function buildRoomTypeUpdatePayload(
  propertyId: number,
  draft: RoomTypeEditorDraft
): RoomTypeUpdatePayload {
  const retainedImageIds = draft.existingImages
    .filter(img => !img.markedForDeletion)
    .map(img => img.imageId)
    .sort((a, b) => a - b);

  const amenities = Array.from(
    new Set(draft.amenities.filter(key => VALID_AMENITY_KEYS.has(key)))
  );

  const areaNum = Number(draft.areaSqm.trim().replace(',', '.'));
  const imageUrl = draft.imageUrl.trim();

  return {
    propertyId,
    roomType: draft.roomType.trim(),
    areaSqm: Number(areaNum.toFixed(2)),
    capacity: Number(draft.capacity.trim()),
    price: Number(draft.price.trim()),
    deposit: parseOptionalIntValue(draft.deposit),
    imageUrl: imageUrl || null,
    description: draft.description.trim(),
    amenities,
    electricityPrice: parseOptionalIntValue(draft.electricityPrice),
    waterPrice: parseOptionalIntValue(draft.waterPrice),
    internetPrice: parseOptionalIntValue(draft.internetPrice),
    servicePrice: parseOptionalIntValue(draft.servicePrice),
    retainedImageIds,
  };
}

export function formatDepositHint(
  depositRaw: string,
  priceRaw: string
): { text: string; tone: 'muted' | 'free' | 'active' | 'error' } {
  const trimmed = depositRaw.trim();
  if (!trimmed) {
    const validPrice = /^\d+$/.test(priceRaw.trim()) && Number(priceRaw.trim()) > 0;
    return {
      text: validPrice
        ? `Để trống: tự động bằng 1 tháng thuê (${formatVndIntegerInput(priceRaw.trim())} đ) · Nhập 0 nếu không cọc`
        : 'Để trống: tự động bằng 1 tháng tiền thuê · Nhập 0 nếu không yêu cầu cọc',
      tone: 'muted',
    };
  }
  if (trimmed.startsWith('-') || !/^\d+$/.test(trimmed)) {
    return { text: 'Tiền đặt cọc không hợp lệ', tone: 'error' };
  }
  const num = Number(trimmed);
  if (num === 0) {
    return { text: 'Không yêu cầu đặt cọc (0 đ)', tone: 'free' };
  }
  if (num > ROOM_TYPE_MAX_AMOUNT) {
    return { text: 'Vượt quá giới hạn 999.999.999 đ', tone: 'error' };
  }
  return { text: `${formatVndIntegerInput(trimmed)} đ`, tone: 'active' };
}

export function formatServiceFeeHint(
  raw: string,
  unit: string
): { text: string; tone: 'muted' | 'free' | 'active' | 'error' } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { text: 'Chưa thiết lập', tone: 'muted' };
  }
  if (trimmed.startsWith('-') || !/^\d+$/.test(trimmed)) {
    return { text: 'Giá trị chưa hợp lệ', tone: 'error' };
  }
  const num = Number(trimmed);
  if (num === 0) {
    return { text: 'Không thu phí (0 đ)', tone: 'free' };
  }
  if (num > ROOM_TYPE_MAX_AMOUNT) {
    return { text: 'Vượt quá 999.999.999 đ', tone: 'error' };
  }
  return { text: `${formatVndIntegerInput(trimmed)} ${unit}`, tone: 'active' };
}

export function filterAmenityGroups(query: string): RoomTypeAmenityGroup[] {
  const keyword = foldVietnamese(query.trim());
  if (!keyword) {
    return ROOM_TYPE_AMENITY_GROUPS.map(g => ({ ...g, keys: [...g.keys] }));
  }
  const filtered: RoomTypeAmenityGroup[] = [];
  for (const group of ROOM_TYPE_AMENITY_GROUPS) {
    const matchedKeys = group.keys.filter(key => {
      const label = ROOM_AMENITY_LABELS[key] || key;
      return foldVietnamese(label).includes(keyword) || foldVietnamese(key).includes(keyword);
    });
    if (matchedKeys.length > 0) {
      filtered.push({ ...group, keys: matchedKeys });
    }
  }
  return filtered;
}

export function sectionErrorCounts(errors: RoomTypeEditorErrors): {
  infoErrors: number;
  amenitiesFeesErrors: number;
} {
  const infoKeys: RoomTypeEditorErrorKey[] = [
    'roomType',
    'areaSqm',
    'capacity',
    'price',
    'deposit',
    'description',
    'imageUrl',
    'photos',
  ];
  const group2Keys: RoomTypeEditorErrorKey[] = [
    'amenities',
    'electricityPrice',
    'waterPrice',
    'internetPrice',
    'servicePrice',
  ];

  let infoErrors = 0;
  let amenitiesFeesErrors = 0;
  for (const key of infoKeys) {
    if (errors[key]) infoErrors += 1;
  }
  for (const key of group2Keys) {
    if (errors[key]) amenitiesFeesErrors += 1;
  }
  return { infoErrors, amenitiesFeesErrors };
}

/**
 * Evaluates pre-delete eligibility on the client.
 * Note: Backend DELETE /api/host/room-types/{id} remains the final authority
 * (checks rooms, bookings/viewings, and database FK constraints atomically).
 */
export function evaluateRoomTypeDeletion(
  type: Pick<HostRoomType, 'roomTypeId' | 'roomType' | 'images' | 'totalRooms'>,
  inventory: RoomTypeInventory | null,
  options: { canManage: boolean }
): RoomTypeDeleteEvaluation {
  if (!options.canManage) {
    return {
      status: 'BLOCKED_PERMISSION',
      title: 'Không có quyền xóa loại phòng',
      message: 'Tài khoản hiện tại không có quyền xóa loại phòng cho nhà trọ này.',
    };
  }

  const authoritativeCount =
    inventory?.total != null
      ? inventory.total
      : typeof type.totalRooms === 'number' && Number.isSafeInteger(type.totalRooms) && type.totalRooms >= 0
      ? type.totalRooms
      : null;

  if (authoritativeCount != null && authoritativeCount > 0) {
    return {
      status: 'BLOCKED_ROOMS',
      roomCount: authoritativeCount,
      vacantCount: inventory?.vacant ?? null,
      occupiedCount: inventory?.occupied ?? null,
      otherCount: inventory?.other ?? null,
      title: 'Chưa thể xóa loại phòng',
      message: `Loại phòng này đang được sử dụng bởi ${authoritativeCount} phòng. Bạn cần xử lý các phòng liên quan trước khi xóa.`,
    };
  }

  const imageCount = type.images?.length ?? 0;
  return {
    status: 'ELIGIBLE',
    title: 'Xóa loại phòng?',
    message: `Bạn chắc chắn muốn xóa loại phòng "${type.roomType}"?`,
    warning:
      imageCount > 0
        ? `Thao tác này sẽ xóa vĩnh viễn loại phòng cùng ${imageCount} ảnh đính kèm và không thể khôi phục. Máy chủ sẽ kiểm tra lại lần cuối toàn bộ phòng và lịch hẹn liên quan trước khi xóa.`
        : 'Thao tác này sẽ xóa vĩnh viễn loại phòng và không thể khôi phục. Máy chủ sẽ kiểm tra lại lần cuối toàn bộ phòng và lịch hẹn liên quan trước khi xóa.',
    imageCount,
  };
}

/**
 * Moves a newly added photo to the front of newPhotos.
 * Note: Backend orders saved photos by imageId ASC (retained images first, then newly uploaded photos in upload order).
 * When no retained server images remain, moving a new photo to index 0 makes it the persisted cover photo.
 */
export function promoteNewPhotoToFront(
  newPhotos: readonly NewRoomTypePhoto[],
  photoId: string
): NewRoomTypePhoto[] {
  const index = newPhotos.findIndex(item => item.id === photoId);
  if (index <= 0) return [...newPhotos];
  const next = [...newPhotos];
  const [chosen] = next.splice(index, 1);
  if (chosen) next.unshift(chosen);
  return next;
}
