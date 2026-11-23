import { tokenStore } from './auth';

export interface AccommodationSummary {
  propertyId: number;
  roomTypeId: number;
  propertyName: string;
  roomTypeName: string;
  address?: string;
  imageUrl?: string;
  price: number;
  areaSqm: number;
  verificationStatus: string;
  availableRooms: number;
  capacity?: number;
  amenities?: string[];
  electricityPrice?: number;
  waterPrice?: number;
  latitude?: number;
  longitude?: number;
  availabilityStale?: boolean;
}

export interface AccommodationPage {
  items: AccommodationSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SearchFilters {
  page?: number;
  size?: number;
  q?: string;
  location?: string;
  price?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'area-desc';
  type?: string;
  amenities?: string;
  availableOnly?: boolean;
}

export function getApiBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL cho máy chủ HL_RCS.');
}

export interface JsonRequestOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

// Bound both the connection and response-body wait, including on physical phones.
export async function requestJson(url: string, init: RequestInit, options: JsonRequestOptions = {}) {
  const controller = new AbortController();
  const signal = init.signal;
  const abort = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 15000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new Error('Yêu cầu đã bị hủy.');
    return { response, result };
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut) {
      throw new Error(options.timeoutMessage ?? 'Máy chủ phản hồi quá lâu. Kiểm tra kết nối Wi-Fi và thử lại.');
    }
    throw new Error('Không thể kết nối đến máy chủ HL_RCS. Kiểm tra địa chỉ API, Wi-Fi và máy chủ backend.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export interface AccommodationDetail {
  summary: AccommodationSummary;
  gallery: { url: string; caption?: string }[];
  propertyGallery: { url: string; caption?: string }[];
  capacity?: number;
  deposit?: number;
  electricityPrice?: number;
  waterPrice?: number;
  internetPrice?: number;
  servicePrice?: number;
  description?: string;
  propertyDescription?: string;
  amenities: string[];
  propertyAmenities: string[];
  selectedRules: string[];
  rules?: string;
  mapUrl?: string;
  nearby?: string;
  publicContact?: { phone?: string; zaloPhone?: string; hostName?: string };
  roomTypes: AccommodationSummary[];
}

export async function fetchAccommodationDetail(propertyId: number, roomTypeId: number, signal?: AbortSignal): Promise<AccommodationDetail> {
  if (![propertyId, roomTypeId].every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('Đường dẫn phòng không hợp lệ.');
  const { response, result } = await requestJson(`${getApiBase()}/api/properties/${propertyId}/room-types/${roomTypeId}/details`, { signal });
  if (!response.ok || !result?.success || !result.data?.summary) throw new Error(result?.message || 'Không thể tải chi tiết. Phòng có thể đã ngừng công khai.');
  return result.data;
}

export interface ViewingInput {
  propertyId: number; roomTypeId: number; scheduledDate: string;
  contactName: string; contactPhone: string; note?: string;
}

export function validateViewingTime(date: string, time: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'Nhập ngày YYYY-MM-DD và giờ HH:mm hợp lệ.';
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) return 'Ngày xem không hợp lệ.';
  const latest = new Date(now + 7 * 60 * 60 * 1000);
  latest.setUTCDate(latest.getUTCDate() + 30);
  if (date > latest.toISOString().slice(0, 10) || Date.parse(`${date}T${time}:00+07:00`) <= now) return 'Chọn giờ trong tương lai, tối đa 30 ngày tới theo giờ Việt Nam.';
  return null;
}

export async function createViewing(input: ViewingInput, signal?: AbortSignal): Promise<{ bookingId: number; scheduledDate: string; status: string }> {
  const token = await tokenStore.get();
  if (!token) throw new Error('Vui lòng đăng nhập để đặt lịch xem phòng.');
  const { response, result } = await requestJson(`${getApiBase()}/api/viewings`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!response.ok || !result?.success || !result.data?.bookingId) throw new Error(result?.message || 'Chưa thể gửi lịch xem phòng.');
  return result.data;
}

export const AMENITY_LABELS: Record<string, string> = {
  airConditioner: 'Điều hòa', waterHeater: 'Bình nóng lạnh', washingMachine: 'Máy giặt',
  balcony: 'Ban công', refrigerator: 'Tủ lạnh', kitchen: 'Bếp nấu', elevator: 'Thang máy',
  fingerprint: 'Khóa vân tay', camera: 'Camera an ninh', flexibleHours: 'Tự do giờ giấc',
  fireSafety: 'Phòng cháy chữa cháy', separateOwner: 'Không chung chủ', laundry: 'Khu giặt đồ',
};

export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = getApiBase();
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function formatPriceVND(amount?: number): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return 'Liên hệ giá';
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted} triệu/tháng`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ/tháng`;
}

export async function fetchAccommodations(
  filters: SearchFilters = {},
  signal?: AbortSignal
): Promise<AccommodationPage> {
  const base = getApiBase();
  const params = new URLSearchParams();

  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.size != null) params.set('size', String(filters.size));
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.location?.trim() && filters.location !== 'all') params.set('location', filters.location.trim());
  if (filters.price?.trim() && filters.price !== 'all') params.set('price', filters.price.trim());
  if (filters.sort?.trim()) params.set('sort', filters.sort.trim());
  if (filters.type?.trim() && filters.type !== 'all') params.set('type', filters.type.trim());
  if (filters.amenities?.trim()) params.set('amenities', filters.amenities.trim());
  if (filters.availableOnly != null) params.set('availableOnly', String(filters.availableOnly));

  const url = `${base}/api/properties/search?${params.toString()}`;
  const { response, result } = await requestJson(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Máy chủ phản hồi mã lỗi ${response.status}`);
  }

  if (!result || !result.success || !result.data) {
    throw new Error('Dữ liệu phòng không hợp lệ từ máy chủ.');
  }

  const data = result.data;
  return {
    items: Array.isArray(data.items) ? data.items : [],
    page: data.page ?? 0,
    size: data.size ?? 10,
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  };
}

/**
 * Fetch favorite states for a list of roomTypeIds
 * Returns a map of roomTypeId -> favoriteId
 */
export async function fetchFavoriteStates(
  roomTypeIds: number[],
  signal?: AbortSignal
): Promise<Record<number, number>> {
  if (!roomTypeIds.length) return {};
  if (roomTypeIds.length > 50) {
    const chunks = [];
    for (let i = 0; i < roomTypeIds.length; i += 50) chunks.push(fetchFavoriteStates(roomTypeIds.slice(i, i + 50), signal));
    return Object.assign({}, ...await Promise.all(chunks));
  }
  try {
    const token = await tokenStore.get();
    if (!token) return {};

    const base = getApiBase();
    const url = `${base}/api/favorites/state?roomTypeIds=${roomTypeIds.join(',')}`;
    const { response, result } = await requestJson(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!response.ok) return {};
    if (!result?.success || !Array.isArray(result?.data?.items)) return {};

    const map: Record<number, number> = {};
    for (const item of result.data.items) {
      if (item?.roomTypeId && item?.favoriteId) {
        map[item.roomTypeId] = item.favoriteId;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export async function toggleFavoriteApi(
  roomTypeId: number,
  existingFavoriteId?: number,
  signal?: AbortSignal
): Promise<{ saved: boolean; favoriteId?: number }> {
  const token = await tokenStore.get();
  if (!token) {
    throw new Error('Vui lòng đăng nhập để lưu phòng trọ yêu thích.');
  }

  const base = getApiBase();

  if (existingFavoriteId) {
    const { response, result } = await requestJson(`${base}/api/favorites/${existingFavoriteId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal,
    });
    if (!response.ok || result?.success === false) {
      throw new Error('Chưa thể xóa khỏi danh sách yêu thích.');
    }
    return { saved: false };
  } else {
    const { response, result } = await requestJson(`${base}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ roomTypeId }),
      signal,
    });
    if (!response.ok || !result?.success) {
      throw new Error('Chưa thể lưu phòng trọ vào danh sách yêu thích.');
    }
    const newId = result?.data?.favoriteId ?? result?.data?.id;
    if (!Number.isSafeInteger(newId) || newId <= 0) throw new Error('Máy chủ chưa xác nhận phòng yêu thích.');
    return { saved: true, favoriteId: newId };
  }
}
