import type { SearchFilters } from './accommodations';
// Exact values accepted by AccommodationService; labels describe its existing address matching.
export const ROOM_TYPES = [{ id: 'all', label: 'Tất cả' }, { id: 'khep-kin', label: 'Khép kín' }, { id: 'chung-cu-mini', label: 'Chung cư mini' }, { id: 'gac-lung', label: 'Gác lửng' }];
export const PRICE_OPTIONS = [{ id: 'all', label: 'Mọi mức giá' }, { id: 'under-15', label: 'Dưới 1,5 triệu' }, { id: '15-25', label: '1,5–2,5 triệu' }, { id: '25-35', label: 'Trên 2,5–3,5 triệu' }, { id: 'above-35', label: 'Trên 3,5 triệu' }];
export const LOCATIONS = [{ id: 'all', label: 'Tất cả khu vực' }, { id: 'tan-xa', label: 'Tân Xã' }, { id: 'thach-hoa', label: 'Thạch Hòa' }, { id: 'binh-yen', label: 'Bình Yên' }, { id: 'cnc', label: 'Khu công nghệ cao' }];
export const SORT_OPTIONS: { id: NonNullable<SearchFilters['sort']>; label: string }[] = [{ id: 'newest', label: 'Mới nhất' }, { id: 'price-asc', label: 'Giá thấp đến cao' }, { id: 'price-desc', label: 'Giá cao đến thấp' }, { id: 'area-desc', label: 'Diện tích lớn nhất' }];
export const AMENITY_KEYS = ['airConditioner', 'waterHeater', 'washingMachine', 'balcony', 'refrigerator', 'kitchen', 'elevator', 'fingerprint', 'camera', 'flexibleHours', 'fireSafety', 'separateOwner'];
export const defaultFilters = (): SearchFilters => ({ price: 'all', type: 'all', location: 'all', availableOnly: false, sort: 'newest' });
export function normalizeFilters(value: SearchFilters): SearchFilters {
  return { price: PRICE_OPTIONS.some(x => x.id === value.price) ? value.price : 'all', type: ROOM_TYPES.some(x => x.id === value.type) ? value.type : 'all', location: LOCATIONS.some(x => x.id === value.location) ? value.location : 'all', availableOnly: Boolean(value.availableOnly), sort: SORT_OPTIONS.some(x => x.id === value.sort) ? value.sort : 'newest', amenities: [...new Set(value.amenities?.split(',').filter(x => AMENITY_KEYS.includes(x)) || [])].sort().join(',') || undefined };
}
export function filterGroupCount(value: SearchFilters): number {
  const f = normalizeFilters(value);
  return Number(f.price !== 'all') + Number(f.type !== 'all') + Number(f.location !== 'all') + Number(Boolean(f.amenities)) + Number(f.availableOnly);
}
export function applyCategory(filters: SearchFilters, id: string): SearchFilters {
  return normalizeFilters(id === 'con-phong' ? { ...filters, availableOnly: true } : { ...filters, type: id });
}
export function searchKey(filters: SearchFilters): string {
  return JSON.stringify({ ...normalizeFilters(filters), q: filters.q?.trim() || '' });
}
