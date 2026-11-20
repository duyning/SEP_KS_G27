import { getApiBase, requestJson, type AccommodationSummary } from './accommodations';

export interface FavoriteItem { favoriteId: number; roomTypeId: number; createdAt?: string; available: boolean; accommodation: AccommodationSummary | null }
export interface FavoritePage { items: FavoriteItem[]; page: number; size: number; totalElements: number; totalPages: number }
export class FavoritesError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.name = 'FavoritesError'; this.status = status; }
}
export interface FavoritesApi {
  list(page: number, token: string, signal?: AbortSignal): Promise<FavoritePage>;
  states(ids: number[], token: string, signal?: AbortSignal): Promise<Record<number, number>>;
  save(roomTypeId: number, token: string, signal?: AbortSignal): Promise<FavoriteItem>;
  remove(favoriteId: number, token: string, signal?: AbortSignal): Promise<void>;
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function positive(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) > 0; }
function item(value: unknown): FavoriteItem {
  if (!isRecord(value) || !positive(value.favoriteId) || !positive(value.roomTypeId) || typeof value.available !== 'boolean') throw new FavoritesError('Dữ liệu phòng đã lưu không hợp lệ.');
  const accommodation = value.accommodation;
  if (value.available && (!isRecord(accommodation) || accommodation.roomTypeId !== value.roomTypeId || !positive(accommodation.propertyId) || typeof accommodation.roomTypeName !== 'string' || typeof accommodation.propertyName !== 'string')) throw new FavoritesError('Dữ liệu loại phòng không hợp lệ.');
  return { favoriteId: value.favoriteId, roomTypeId: value.roomTypeId, available: value.available, accommodation: value.available ? accommodation as unknown as AccommodationSummary : null, ...(typeof value.createdAt === 'string' ? { createdAt: value.createdAt } : {}) };
}
export function createFavoritesApi(): FavoritesApi {
  async function request(path: string, token: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<unknown> {
    if (!token) throw new FavoritesError('Vui lòng đăng nhập để quản lý phòng đã lưu.', 401);
    const { response, result } = await requestJson(`${getApiBase()}/api/favorites${path}`, { method, signal, credentials: 'omit', headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok || !isRecord(result) || result.success !== true) throw new FavoritesError(isRecord(result) && typeof result.message === 'string' ? result.message : 'Không thể tải hoặc cập nhật phòng đã lưu.', response.status);
    return result.data;
  }
  return {
    async list(page, token, signal) {
      const data = await request(`?page=${page}&size=15`, token, 'GET', undefined, signal);
      if (!isRecord(data) || !Array.isArray(data.items) || data.page !== page || ![data.page, data.size, data.totalElements, data.totalPages].every(value => Number.isSafeInteger(value) && (value as number) >= 0) || (data.size as number) < 1 || (data.size as number) > 50) throw new FavoritesError('Dữ liệu danh sách đã lưu không hợp lệ.');
      return { items: data.items.map(item), page: data.page as number, size: data.size as number, totalElements: data.totalElements as number, totalPages: data.totalPages as number };
    },
    async states(ids, token, signal) {
      const map: Record<number, number> = {};
      const unique = [...new Set(ids)].filter(positive);
      for (let offset = 0; offset < unique.length; offset += 50) {
        const data = await request(`/state?roomTypeIds=${unique.slice(offset, offset + 50).join(',')}`, token, 'GET', undefined, signal);
        if (!isRecord(data) || !Array.isArray(data.items)) throw new FavoritesError('Trạng thái yêu thích không hợp lệ.');
        for (const entry of data.items) {
          if (!isRecord(entry) || !positive(entry.roomTypeId) || !positive(entry.favoriteId)) throw new FavoritesError('Trạng thái yêu thích không hợp lệ.');
          map[entry.roomTypeId] = entry.favoriteId;
        }
      }
      return map;
    },
    async save(id, token, signal) {
      if (!positive(id)) throw new FavoritesError('Mã loại phòng không hợp lệ.');
      const saved = item(await request('', token, 'POST', { roomTypeId: id }, signal));
      if (saved.roomTypeId !== id || !saved.available) throw new FavoritesError('Máy chủ chưa xác nhận đúng loại phòng đã lưu.');
      return saved;
    },
    async remove(id, token, signal) {
      if (!positive(id)) throw new FavoritesError('Mã phòng đã lưu không hợp lệ.');
      const result = await request(`/${id}`, token, 'DELETE', undefined, signal);
      if (result !== null) throw new FavoritesError('Máy chủ chưa xác nhận bỏ lưu.');
    },
  };
}
export const favoritesApi = createFavoritesApi();
