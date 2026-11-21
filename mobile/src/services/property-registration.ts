export const PROPERTY_TYPES = ['Nhà trọ truyền thống / Phòng trọ sinh viên', 'Chung cư mini', 'Căn hộ dịch vụ / Studio', 'Homestay'];
export const PROPERTY_AREAS = ['Tân Xã', 'Thạch Hòa', 'Bình Yên', 'Khu Công nghệ cao Hòa Lạc', 'Hòa Lạc', 'Hạ Bằng'];
export const AMENITIES = [['parking', 'Bãi để xe máy có mái che'], ['fingerprint', 'Cổng khóa vân tay / Thẻ từ'], ['camera', 'Camera an ninh 24/7'], ['flexibleHours', 'Giờ giấc tự do 24/7'], ['fireSafety', 'Hệ thống PCCC đạt chuẩn'], ['separateOwner', 'Không chung chủ'], ['wifi', 'Wifi 6 toàn tòa nhà'], ['laundry', 'Máy giặt dùng chung'], ['drying', 'Sân phơi đồ có mái che'], ['cleaning', 'Vệ sinh hành lang định kỳ'], ['water', 'Hệ thống lọc nước tổng'], ['elevator', 'Thang máy di chuyển'], ['security', 'Bảo vệ / Người trực quản lý'], ['emergencyExit', 'Lối thoát nạn riêng'], ['emergencyLighting', 'Đèn sự cố & Biển chỉ dẫn thoát nạn'], ['wasteCollection', 'Khu tập kết rác & Thu gom định kỳ'], ['bicycleParking', 'Chỗ để xe đạp'], ['commonArea', 'Khu sinh hoạt chung']];
export const RULES = [['quietHours', 'Giờ trật tự'], ['noSmoking', 'Không hút thuốc trong nhà'], ['noUnsafeStoves', 'Nghiêm cấm bếp than/ga mini'], ['residenceRegistration', 'Đăng ký tạm trú đầy đủ'], ['cleanliness', 'Giữ vệ sinh chung'], ['pets', 'Cho phép nuôi thú cưng'], ['guestRegistration', 'Đăng ký khách đến thăm / Lưu trú'], ['noBlockedExits', 'Không để đồ chắn hành lang, lối thoát nạn'], ['safeCharging', 'Sạc xe điện tại khu vực được cho phép'], ['wasteSorting', 'Bỏ rác đúng nơi & Đúng giờ'], ['noSubletting', 'Không tự ý cho thuê lại / Chuyển nhượng'], ['reportIncidents', 'Báo ngay sự cố điện, nước & An toàn']];
export const STEPS = ['Thông tin cơ bản', 'Vị trí', 'Tiện ích & Quy định', 'Hình ảnh', 'Hồ sơ xác minh', 'Kiểm tra & Gửi'];
export const DOCUMENTS = [
  ['ownership', 'Giấy phép kinh doanh'],
  ['idCard', 'Căn cước chủ trọ'],
  ['fireSafety', 'Chứng nhận an toàn PCCC'],
] as const;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_TYPES = [...PHOTO_TYPES, 'application/pdf'];
export type DocumentKey = (typeof DOCUMENTS)[number][0];
export interface RegistrationValues {
  name: string; propertyType: string; description: string; managerName: string;
  contactPhone: string; zaloPhone: string; commune: string; addressDetail: string;
  nearby: string; latitude?: string; longitude?: string; amenities: string[];
  selectedRules: string[]; rules: string; termsAccepted: boolean;
}
export interface RegistrationAsset {
  uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number; file?: File;
}
export interface RegistrationFiles extends Record<DocumentKey, RegistrationAsset | null> { photos: RegistrationAsset[] }
export type RegistrationField = keyof RegistrationValues | keyof RegistrationFiles;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;
export const emptyFiles: RegistrationFiles = { photos: [], ownership: null, idCard: null, fireSafety: null };
export const quietHours = /^quietHours(?::((?:[01]\d|2[0-3]):[0-5]\d))?$/;
export const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const MAX_UPLOAD_BYTES = 85 * 1024 * 1024 - 64 * 1024; // Room for multipart metadata and boundaries.
export const FIELD_STEPS: readonly (readonly RegistrationField[])[] = [
  ['name', 'propertyType', 'description', 'managerName', 'contactPhone', 'zaloPhone'],
  ['addressDetail', 'commune', 'nearby', 'latitude', 'longitude'],
  ['amenities', 'selectedRules', 'rules'], ['photos'], ['ownership', 'idCard', 'fireSafety'], ['termsAccepted'],
];

export function registrationValues(user?: { fullName?: string; phoneNumber?: string }): RegistrationValues {
  return {
    name: '', propertyType: PROPERTY_TYPES[0], description: '', managerName: user?.fullName || '',
    contactPhone: user?.phoneNumber || '', zaloPhone: '', commune: '', addressDetail: '', nearby: '',
    latitude: '', longitude: '', amenities: [], selectedRules: [], rules: '', termsAccepted: false,
  };
}

export function validateRegistration(v: RegistrationValues, files: RegistrationFiles, step: number, reuseIdentity = false): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const length = (key: keyof RegistrationValues, label: string, min: number, max: number) => {
    const value = String(v[key] ?? '');
    if (value.trim().length < min || value.length > max) errors[key] = min
      ? `${label} phải có từ ${min} đến ${max} ký tự.`
      : `${label} tối đa ${max} ký tự.`;
  };
  const phone = (value: string) => /^(?:0|\+84)[35789]\d{8}$/.test(value.replace(/[\s.-]/g, ''));
  if (step === 0) {
    length('name', 'Tên nhà trọ', 3, 100);
    length('propertyType', 'Loại hình', 2, 100);
    if (/[\u0000-\u001f\u007f]/.test(v.propertyType)) errors.propertyType = 'Loại hình không hợp lệ.';
    length('description', 'Mô tả', 30, 2000);
    length('managerName', 'Tên người đón khách', 2, 100);
    if (v.contactPhone.length > 20 || !phone(v.contactPhone)) errors.contactPhone = 'Nhập số di động Việt Nam hợp lệ.';
    if (v.zaloPhone.length > 20 || (v.zaloPhone.trim() && !phone(v.zaloPhone))) errors.zaloPhone = 'Nhập số Zalo hợp lệ.';
  }
  if (step === 1) {
    length('addressDetail', 'Địa chỉ chi tiết', 10, 255);
    if (!PROPERTY_AREAS.includes(v.commune)) errors.commune = 'Chọn khu vực Hòa Lạc.';
    length('nearby', 'Địa điểm gần nhà trọ', 0, 255);
    if ((v.latitude?.trim() || v.longitude?.trim()) && !registrationPoint(v.latitude, v.longitude)) {
      errors.latitude = 'Chọn lại tọa độ hợp lệ hoặc bỏ ghim.';
    }
  }
  if (step === 2) {
    if (v.amenities.length > 18 || v.amenities.some(key => !AMENITIES.some(([id]) => id === key))) errors.amenities = 'Tiện ích đã chọn không hợp lệ.';
    if (v.selectedRules.length > 12 || v.selectedRules.filter(key => quietHours.test(key)).length > 1 ||
      v.selectedRules.some(key => !quietHours.test(key) && !RULES.some(([id]) => id === key))) {
      errors.selectedRules = 'Kiểm tra quy định và giờ trật tự (HH:mm).';
    }
    length('rules', 'Quy định khác', 0, 2000);
  }
  if (step === 3) {
    if (files.photos.length < 1 || files.photos.length > 10) errors.photos = 'Chọn từ 1 đến 10 ảnh nhà trọ.';
    else for (const photo of files.photos) {
      const error = registrationAssetError(photo, false);
      if (error) { errors.photos = error; break; }
    }
  }
  if (step === 4) for (const [key, label] of DOCUMENTS) {
    const file = files[key];
    if (file) {
      const error = registrationAssetError(file, true);
      if (error) errors[key] = error;
    } else if (key !== 'idCard' || !reuseIdentity) errors[key] = `Chọn tệp ${label.toLocaleLowerCase('vi')}.`;
  }
  if (step === 4 && [...files.photos, ...DOCUMENTS.flatMap(([key]) => files[key] ? [files[key]] : [])]
    .reduce((total, asset) => total + (asset?.fileSize || 0), 0) > MAX_UPLOAD_BYTES) {
    errors.ownership ??= 'Tổng dung lượng hồ sơ vượt giới hạn 85 MB. Dùng ảnh hoặc tài liệu nhẹ hơn.';
  }
  if (step === 5 && !v.termsAccepted) errors.termsAccepted = 'Xác nhận cam kết thông tin trước khi gửi.';
  return errors;
}

export function registrationPoint(lat?: string, lng?: string) {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  const a = lat?.trim() || '', b = lng?.trim() || '';
  if (a.length > 40 || b.length > 40 || !decimal.test(a) || !decimal.test(b)) return null;
  const latitude = Number(a), longitude = Number(b);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

export function registrationAssetError(asset: RegistrationAsset, document: boolean): string | null {
  if (!(document ? DOCUMENT_TYPES : PHOTO_TYPES).includes(asset.mimeType || '')) {
    return document ? 'Chọn tệp PDF, JPG, PNG hoặc WebP.' : 'Chọn ảnh JPG, PNG hoặc WebP.';
  }
  if (asset.fileSize != null && (asset.fileSize <= 0 || asset.fileSize > (document ? 10 : 5) * 1024 * 1024)) {
    return document ? 'Tệp phải có dữ liệu và không vượt 10 MB.' : 'Ảnh phải có dữ liệu và không vượt 5 MB.';
  }
  return null;
}

export function attachmentMime(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return 'image/png';
  const tag = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (tag(0, 4) === 'RIFF' && tag(8, 12) === 'WEBP') return 'image/webp';
  if (tag(0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

export function ruleLabel(key: string) {
  const quiet = key.match(quietHours);
  return quiet ? `Giờ trật tự từ ${quiet[1] || '23:00'}` : RULES.find(([id]) => id === key)?.[1] || key;
}

export function draftSnapshot(values: RegistrationValues, files: RegistrationFiles, step: number, missing: readonly string[], reuse = true) {
  return {
    version: 1, step, reuse, values: { ...values, termsAccepted: false },
    missing: [...new Set([...missing, ...FIELD_STEPS[3].filter(() => files.photos.length), ...DOCUMENTS.filter(([key]) => files[key]).map(([key]) => key)])],
  };
}

export function restoreDraft(raw: string, defaults: RegistrationValues) {
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !data.values || typeof data.values !== 'object') throw new Error('Bản nháp không hợp lệ.');
  const values = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof RegistrationValues)[]) {
    if (typeof defaults[key] === 'string' && typeof data.values[key] === 'string') Object.assign(values, { [key]: data.values[key].slice(0, 2000) });
  }
  values.amenities = AMENITIES.filter(([key]) => Array.isArray(data.values.amenities) && data.values.amenities.includes(key)).map(([key]) => key);
  const selected = Array.isArray(data.values.selectedRules) ? data.values.selectedRules : [];
  values.selectedRules = RULES.filter(([key]) => key !== 'quietHours' && selected.includes(key)).map(([key]) => key);
  const quiet = selected.find((key: unknown) => typeof key === 'string' && /^quietHours(?::.{0,5})?$/.test(key));
  if (quiet) values.selectedRules.push(quiet);
  values.termsAccepted = false;
  const step = Number.isInteger(data.step) ? Math.max(0, Math.min(5, data.step)) : 0;
  const missing = ['photos', ...DOCUMENTS.map(([key]) => key)].filter(key => Array.isArray(data.missing) && data.missing.includes(key));
  return { values, step, missing, reuse: data.reuse !== false };
}
