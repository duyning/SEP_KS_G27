import { ApiError, request } from './auth.js';
import { isVietnamesePhone, validateRegistrationFile } from './property-registration.js';

const basePath = '/api/service-registrations';
const validRegistration = data => data && Number.isInteger(data.registrationId) && data.registrationId > 0
  && ['PENDING', 'NEEDS_SUPPLEMENT', 'APPROVED', 'REJECTED'].includes(data.status)
  && typeof data.serviceName === 'string' && Array.isArray(data.documents);
export const serviceRegistrationApi = {
  categories: signal => request('/categories', { basePath, signal }),
  current: async signal => {
    const data = await request('/current', { basePath, signal });
    if (!data || typeof data.canRegister !== 'boolean' || !['ELIGIBLE', 'HAS_CAPABILITY', 'APPROVED', 'IN_REVIEW'].includes(data.reason)
        || data.canRegister !== (data.reason === 'ELIGIBLE') || (data.registration !== null && !validRegistration(data.registration)))
      throw new ApiError('Không thể xác minh trạng thái hồ sơ. Vui lòng thử lại.', 502);
    return data;
  },
  submit: async (details, documents, signal) => {
    const body = new FormData();
    body.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    documents.forEach(file => body.append('documents', file));
    const data = await request('', { basePath, method: 'POST', body, signal });
    if (!validRegistration(data) || data.status !== 'PENDING' || !data.documents.length)
      throw new ApiError('Chưa xác nhận được hồ sơ đã lưu. Vui lòng đóng và mở lại để kiểm tra trạng thái trước khi gửi lại.', 502);
    return data;
  },
  document: id => request(`/documents/${id}`, { basePath, responseType: 'blob' }),
};

export function validateServiceRegistrationFields(form, files) {
  const errors = {};
  for (const [key,label,min,max] of [['serviceName','Tên dịch vụ',3,255],['description','Mô tả dịch vụ',20,5000],['serviceArea','Khu vực phục vụ',2,500],['applicantName','Họ tên người đăng ký',2,100]]) {
    const size = String(form[key] || '').trim().length;
    if (size < min || size > max) errors[key] = `${label} cần từ ${min} đến ${max} ký tự.`;
  }
  if (!Number.isInteger(Number(form.categoryId)) || Number(form.categoryId) < 1) errors.categoryId = 'Vui lòng chọn danh mục dịch vụ.';
  if (!isVietnamesePhone(form.contactPhone)) errors.contactPhone = 'Số điện thoại Việt Nam không hợp lệ.';
  if (form.contactEmail && (form.contactEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))) errors.contactEmail = 'Nhập địa chỉ email hợp lệ hoặc để trống.';
  if (!['FIXED', 'FROM', 'NEGOTIABLE'].includes(form.pricingType)) errors.pricingType = 'Loại giá không hợp lệ.';
  if (form.pricingType !== 'NEGOTIABLE' && (!/^\d+(\.\d{1,2})?$/.test(String(form.price)) || Number(form.price) <= 0 || Number(form.price) > 9999999999.99))
    errors.price = 'Nhập giá lớn hơn 0, tối đa 9.999.999.999,99 VNĐ và tối đa 2 chữ số thập phân.';
  if (!files.length || files.length > 5) errors.documents = 'Vui lòng chọn từ 1 đến 5 tài liệu xác minh.';
  for (const file of files) {
    const error = validateRegistrationFile(file, true);
    if (error) errors.documents = `${file.name}: ${error}`;
  }
  return errors;
}
export function validateServiceRegistration(form, files) { return Object.values(validateServiceRegistrationFields(form, files))[0] || ''; }
