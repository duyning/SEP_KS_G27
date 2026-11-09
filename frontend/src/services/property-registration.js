export const PROPERTY_TYPES = ['Nhà trọ truyền thống / Phòng trọ sinh viên', 'Chung cư mini', 'Căn hộ dịch vụ / Studio', 'Homestay'];
export const AREAS = ['Tân Xã', 'Thạch Hòa', 'Bình Yên', 'Khu Công nghệ cao Hòa Lạc'];
// Approximate navigation centers from the original prototype, not property addresses.
export const AREA_CENTERS = {
  'Tân Xã': [21.0188, 105.5215],
  'Thạch Hòa': [21.0085, 105.5342],
  'Bình Yên': [21.0285, 105.5120],
  'Khu Công nghệ cao Hòa Lạc': [21.0135, 105.5265],
};
export function parsePropertyCoordinates(latitude, longitude) {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!decimal.test(String(latitude).trim()) || !decimal.test(String(longitude).trim())) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
export const AMENITIES = [['parking', 'Bãi để xe máy có mái che'], ['fingerprint', 'Cổng khóa vân tay / Thẻ từ'], ['camera', 'Camera an ninh 24/7'], ['flexibleHours', 'Giờ giấc tự do 24/7'], ['fireSafety', 'Hệ thống PCCC đạt chuẩn'], ['separateOwner', 'Không chung chủ'], ['wifi', 'Wifi 6 toàn tòa nhà'], ['laundry', 'Máy giặt dùng chung'], ['drying', 'Sân phơi đồ có mái che'], ['cleaning', 'Vệ sinh hành lang định kỳ'], ['water', 'Hệ thống lọc nước tổng'], ['elevator', 'Thang máy di chuyển'], ['security', 'Bảo vệ / Người trực quản lý'], ['emergencyExit', 'Lối thoát nạn riêng'], ['emergencyLighting', 'Đèn sự cố & Biển chỉ dẫn thoát nạn'], ['wasteCollection', 'Khu tập kết rác & Thu gom định kỳ'], ['bicycleParking', 'Chỗ để xe đạp'], ['commonArea', 'Khu sinh hoạt chung']];
export const DEFAULT_QUIET_HOURS_TIME = '23:00';
export const QUIET_HOURS_PATTERN = /^quietHours(?::((?:[01]\d|2[0-3]):[0-5]\d))?$/;
export const RULES = [['quietHours', 'Giữ trật tự sau 23h'], ['noSmoking', 'Không hút thuốc trong nhà'], ['noUnsafeStoves', 'Nghiêm cấm bếp than/ga mini'], ['residenceRegistration', 'Đăng ký tạm trú đầy đủ'], ['cleanliness', 'Giữ vệ sinh chung'], ['pets', 'Cho phép nuôi thú cưng'], ['guestRegistration', 'Đăng ký khách đến thăm / Lưu trú'], ['noBlockedExits', 'Không để đồ chắn hành lang, lối thoát nạn'], ['safeCharging', 'Sạc xe điện tại khu vực được cho phép'], ['wasteSorting', 'Bỏ rác đúng nơi & Đúng giờ'], ['noSubletting', 'Không tự ý cho thuê lại / Chuyển nhượng'], ['reportIncidents', 'Báo ngay sự cố điện, nước & An toàn']];
export const DOCUMENTS = [['ownership', 'Giấy phép kinh doanh'], ['idCard', 'Căn cước công dân (CCCD / CMND) chủ trọ'], ['fireSafety', 'Chứng nhận an toàn PCCC']];
export const REQUIRED_DOCUMENTS = ['ownership', 'idCard', 'fireSafety'];
export const STEPS = ['Thông tin cơ bản', 'Vị trí', 'Tiện ích', 'Hình ảnh', 'Hồ sơ xác minh', 'Kiểm tra & Gửi'];

export function isQuietHoursKey(key) {
  return typeof key === 'string' && QUIET_HOURS_PATTERN.test(key);
}
export function isValidRuleKey(key) {
  return typeof key === 'string' && (isQuietHoursKey(key) || RULES.some(([allowed]) => allowed !== 'quietHours' && allowed === key));
}
export function hasQuietHoursRule(selectedRules = []) {
  return Array.isArray(selectedRules) && selectedRules.some(isQuietHoursKey);
}
export function getQuietHoursTime(selectedRules = []) {
  const found = Array.isArray(selectedRules) ? selectedRules.find(isQuietHoursKey) : null;
  return found?.match(QUIET_HOURS_PATTERN)?.[1] || DEFAULT_QUIET_HOURS_TIME;
}
export function formatQuietHoursTime(time = DEFAULT_QUIET_HOURS_TIME) {
  const match = String(time || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return '23h';
  const hour = String(Number(match[1]));
  return match[2] === '00' ? `${hour}h` : `${hour}h${match[2]}`;
}
export function formatRuleLabel(key) {
  if (isQuietHoursKey(key)) return `Giữ trật tự sau ${formatQuietHoursTime(key.match(QUIET_HOURS_PATTERN)?.[1] || DEFAULT_QUIET_HOURS_TIME)}`;
  return RULES.find(([allowed]) => allowed === key)?.[1] || key;
}
export function setQuietHoursRule(selectedRules = [], enabled, time = DEFAULT_QUIET_HOURS_TIME) {
  const others = (Array.isArray(selectedRules) ? selectedRules : []).filter(item => !isQuietHoursKey(item));
  if (!enabled) return others;
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time || '')) ? time : DEFAULT_QUIET_HOURS_TIME;
  return [`quietHours:${validTime}`, ...others];
}

export function createPropertyForm(user = {}) {
  return { name: '', propertyType: PROPERTY_TYPES[0], description: '', managerName: user.fullName || '', contactPhone: user.phoneNumber || '', zaloPhone: '', commune: '', addressDetail: '', nearby: '', latitude: '', longitude: '', amenities: [], selectedRules: [], rules: '', photos: [], documents: {}, termsAccepted: false };
}
export function isVietnamesePhone(value) {
  return /^(?:0|\+84)[35789]\d{8}$/.test(value.replace(/[\s.-]/g, ''));
}
export function validatePropertyStep(data, step) {
  const errors = {};
  const length = (key, min, max, label) => {
    const size = data[key].trim().length;
    if (size < min || size > max) errors[key] = `${label} phải có từ ${min} đến ${max} ký tự.`;
  };
  if (step === 0) {
    length('name', 3, 100, 'Tên nhà trọ');
    length('description', 30, 2000, 'Mô tả nhà trọ');
    length('managerName', 2, 100, 'Tên người quản lý');
    if (!PROPERTY_TYPES.includes(data.propertyType)) errors.propertyType = 'Vui lòng chọn loại hình nhà trọ hợp lệ.';
    if (!isVietnamesePhone(data.contactPhone)) errors.contactPhone = 'Nhập số di động Việt Nam hợp lệ (10 số hoặc +84).';
    if (data.zaloPhone.trim() && !isVietnamesePhone(data.zaloPhone)) errors.zaloPhone = 'Số Zalo không hợp lệ.';
  }
  if (step === 1) {
    if (!AREAS.includes(data.commune)) errors.commune = 'Vui lòng chọn khu vực nhà trọ.';
    length('addressDetail', 10, 255, 'Địa chỉ chi tiết');
    if (data.nearby.length > 255) errors.nearby = 'Địa điểm lân cận tối đa 255 ký tự.';
    const latitude = String(data.latitude ?? '').trim(), longitude = String(data.longitude ?? '').trim();
    if ((latitude || longitude) && !parsePropertyCoordinates(latitude, longitude)) {
      for (const [key, limit, label] of [['latitude', 90, 'Vĩ độ'], ['longitude', 180, 'Kinh độ']]) {
        const value = String(data[key] ?? '').trim();
        if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit) errors[key] = `${label} phải là số thập phân từ -${limit} đến ${limit}; cần nhập đủ cả hai tọa độ.`;
      }
    }
  }
  if (step === 2) {
    if (data.rules.length > 2000) errors.rules = 'Nội quy tối đa 2000 ký tự.';
    if (!Array.isArray(data.amenities) || data.amenities.some(key => !AMENITIES.some(([allowed]) => allowed === key))) errors.amenities = 'Tiện ích đã chọn không hợp lệ.';
    if (!Array.isArray(data.selectedRules) || data.selectedRules.some(key => !isValidRuleKey(key)) || data.selectedRules.filter(isQuietHoursKey).length > 1) errors.selectedRules = 'Quy định đã chọn không hợp lệ.';
  }
  if (step === 3 && (data.photos.length < 1 || data.photos.length > 10)) errors.photos = 'Vui lòng chọn từ 1 đến 10 ảnh thực tế của nhà trọ.';
  if (step === 4) for (const key of REQUIRED_DOCUMENTS) if (!data.documents[key]) errors[key] = 'Vui lòng đính kèm tài liệu bắt buộc này.';
  if (step === 5 && !data.termsAccepted) errors.termsAccepted = 'Vui lòng xác nhận cam kết thông tin trước khi gửi.';
  return errors;
}
export function validateRegistrationFile(file, document = false) {
  const allowed = document ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) return document ? 'Chỉ chấp nhận PDF, JPG, PNG hoặc WEBP.' : 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.';
  if (file.size === 0) return 'Tệp rỗng, vui lòng chọn lại.';
  if (file.size > (document ? 10 : 5) * 1024 * 1024) return `Tệp không được vượt quá ${document ? 10 : 5} MB.`;
  return '';
}

// Only text fields are stored. Identity documents, photos and consent never enter browser storage.
export function propertyDraft(data, resumeStep = 0) {
  const { photos, documents, termsAccepted, ...fields } = data;
  return { version: 1, fields, resumeStep: Math.max(0, Math.min(5, Number(resumeStep) || 0)), savedAt: new Date().toISOString() };
}
// Uploaded files are deliberately excluded; resume at the photo step at most.
export function propertyDraftStep(raw, data) {
  const parsed = JSON.parse(raw);
  const target = Number.isInteger(parsed.resumeStep) ? Math.max(0, Math.min(3, parsed.resumeStep)) : 0;
  for (let index = 0; index < target; index++) if (Object.keys(validatePropertyStep(data, index)).length) return index;
  return target;
}
export function restorePropertyDraft(raw, user) {
  const base = createPropertyForm(user);
  const parsed = JSON.parse(raw);
  if (parsed?.version !== 1 || !parsed.fields || typeof parsed.fields !== 'object') throw new Error('Invalid draft');
  for (const key of Object.keys(base)) {
    if (typeof base[key] === 'string' && typeof parsed.fields[key] === 'string') base[key] = parsed.fields[key].slice(0, 2000);
  }
  if (Array.isArray(parsed.fields.amenities)) base.amenities = parsed.fields.amenities.filter(key => AMENITIES.some(([allowed]) => key === allowed));
  if (Array.isArray(parsed.fields.selectedRules)) {
    let seenQuietHours = false;
    base.selectedRules = parsed.fields.selectedRules.filter(key => {
      if (!isValidRuleKey(key)) return false;
      if (!isQuietHoursKey(key)) return true;
      if (seenQuietHours) return false;
      seenQuietHours = true;
      return true;
    });
  }
  return base;
}
