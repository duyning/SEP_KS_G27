import { AREAS } from './property-registration.js';

export const ALL_SERVICE_AREAS = 'Tất cả các khu vực';
export const STANDARD_SERVICE_AREAS = [...AREAS];
const clean = value => String(value || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
const key = value => clean(value).toLowerCase();
export const formatServiceArea = value => {
  const text = clean(value);
  const canonical = [ALL_SERVICE_AREAS, ...STANDARD_SERVICE_AREAS].find(area => key(area) === key(text));
  return canonical || text.toLocaleLowerCase('vi-VN').replace(/(^|[\s-])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('vi-VN'));
};
export const areaList = (value, separator = /,/) => {
  const unique = new Map();
  for (const item of String(value || '').split(separator).map(clean).filter(Boolean)) {
    if (!unique.has(key(item))) unique.set(key(item), formatServiceArea(item));
  }
  return [...unique.values()];
};

export function splitServiceAreas(row) {
  const standard = [], custom = areaList(row.customServiceAreas);
  for (const area of areaList(row.serviceArea, /[,;|/\n]+/)) {
    if (key(area) === key(ALL_SERVICE_AREAS)) return { serviceArea: ALL_SERVICE_AREAS, customServiceAreas: '', otherAreasEnabled: false };
    const canonical = STANDARD_SERVICE_AREAS.find(item => key(item) === key(area));
    (canonical ? standard : custom).push(canonical || area);
  }
  const customServiceAreas = areaList(custom.join(', ')).join(', ');
  return { serviceArea: areaList(standard.join(', ')).join(', '), customServiceAreas, otherAreasEnabled: !!customServiceAreas };
}

export function serviceAreaText(row) {
  const areas = splitServiceAreas(row);
  return areaList([areas.serviceArea, areas.customServiceAreas].filter(Boolean).join(', ')).join(', ');
}

export function serviceAreaErrors(form) {
  const errors = {}, standard = areaList(form.serviceArea), custom = areaList(form.customServiceAreas);
  const all = standard.some(item => key(item) === key(ALL_SERVICE_AREAS));
  if (all && (standard.length > 1 || form.otherAreasEnabled || custom.length)) errors.serviceArea = 'Tất cả các khu vực không được chọn cùng khu vực khác.';
  if (!all && !standard.length && !custom.length && !form.otherAreasEnabled) errors.serviceArea = 'Vui lòng chọn ít nhất một khu vực phục vụ.';
  if (form.otherAreasEnabled && !custom.length) errors.customServiceAreas = 'Vui lòng nhập ít nhất một khu vực khác.';
  else if (custom.length > 5) errors.customServiceAreas = 'Chỉ được nhập tối đa 5 khu vực khác.';
  else if (custom.some(item => item.length < 2 || item.length > 100)) errors.customServiceAreas = 'Mỗi khu vực phải có từ 2 đến 100 ký tự.';
  else if (custom.some(item => key(item) === key(ALL_SERVICE_AREAS))) errors.customServiceAreas = 'Hãy chọn ô Tất cả các khu vực ở phía trên.';
  return errors;
}
