import { AVAILABILITY_FRESHNESS_DAYS } from './availability.js';
import { roomCoordinates } from './map-location.js';

export const FPT_ORIGIN = { originLat: 21.01354, originLng: 105.52522 };
export const MAX_RADIUS_KM = 50;
export const CAMPUS_RADIUS_KM = 2;

export const SEARCH_CAMPUSES = [
  {
    // FPT Hà Nội, https://daihoc.fpt.edu.vn/HN/
    id: 'fpt', name: 'Đại học FPT', mapLabel: 'FPT', site: 'Campus Hà Nội · Km29 Đại lộ Thăng Long',
    origin: FPT_ORIGIN,
  },
  {
    // HT2A inside the HT1–HT2 teaching complex, https://www.openstreetmap.org/way/1078183543
    id: 'vnu', name: 'Đại học Quốc gia Hà Nội', mapLabel: 'ĐHQG', site: 'Khu giảng đường HT1–HT2 · Khu đô thị ĐHQGHN',
    origin: { originLat: 20.99962, originLng: 105.50743 },
  },
  {
    // Pin linked by the Academy of Finance's CQ64 handbook, https://maps.app.goo.gl/9ixBM3uYqqapUhrKA
    id: 'aof', name: 'Học viện Tài chính', mapLabel: 'HVTC', site: 'Cơ sở Hòa Lạc · Đường Thạch Sanh (N18)',
    origin: { originLat: 21.0212183, originLng: 105.5273398 },
  },
  {
    // HOU admissions locates the faculty at NIC, https://tuyensinh.hou.edu.vn/tuvan/home
    // The anchor is the NIC venue pin from the VIIE venue map, https://plus.codes/7PH72G5J+XG
    id: 'hou', name: 'Đại học Mở Hà Nội', mapLabel: 'ĐH Mở', site: 'Khoa Điện – Điện tử · Tòa A, NIC Hòa Lạc',
    origin: { originLat: 21.0099375, originLng: 105.5313125 },
  },
];

export function searchCampusForOrigin(origin) {
  return SEARCH_CAMPUSES.find(campus =>
    campus.origin.originLat === origin?.originLat && campus.origin.originLng === origin?.originLng);
}

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
export const availabilityWarning = `Tình trạng phòng đã quá ${AVAILABILITY_FRESHNESS_DAYS} ngày chưa được xác nhận lại.`;
