import { roomCoordinates } from './map-location.js';

export const FPT_ORIGIN = { originLat: 21.01354, originLng: 105.52522 };
export const MAX_RADIUS_KM = 50;

export function parseSearchOrigin(latitude, longitude) {
  const number = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i;
  if (![latitude, longitude].every(value => value != null && number.test(String(value).trim()))) return null;
  const point = roomCoordinates({ latitude: Number(latitude), longitude: Number(longitude) });
  return point ? { originLat: point[0], originLng: point[1] } : null;
}

export const readSearchOrigin = params => parseSearchOrigin(params.get('originLat'), params.get('originLng'));

export function withSearchOrigin(url, origin) {
  if (!origin) return url;
  const [path, hash] = url.split('#');
  const [pathname, query] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('originLat', origin.originLat);
  params.set('originLng', origin.originLng);
  return `${pathname}?${params}${hash ? '#' + hash : ''}`;
}

const distanceFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
export const formatDistance = value => Number.isFinite(value) && value >= 0
  ? `${distanceFormat.format(value)} km` : 'Chưa có dữ liệu';
export const availabilityWarning = 'Tình trạng phòng đã quá 7 ngày chưa được xác nhận lại.';
