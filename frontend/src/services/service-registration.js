import { ApiError, request } from './auth.js';
import { isVietnamesePhone, validateRegistrationFile } from './property-registration.js';

const basePath = '/api/service-registrations';
const validRegistration = data => data && Number.isInteger(data.registrationId) && data.registrationId > 0
  && ['PENDING', 'NEEDS_SUPPLEMENT', 'APPROVED', 'REJECTED'].includes(data.status)
  && typeof data.serviceName === 'string' && Array.isArray(data.documents);
export const serviceRegistrationApi = {
  mine: async signal => {
    const rows = await request('/mine', { basePath, signal });
    if (!Array.isArray(rows) || !rows.every(validRegistration)) throw new ApiError('Danh sách dịch vụ không hợp lệ.', 502);
    return rows;
  },
  image: (id, signal, index = 0) => request('/' + id + '/image?index=' + index, { basePath, signal, responseType: 'blob' }),
  change: async (id, details, image, signal) => {
    const body = new FormData(); body.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    for (const file of (Array.isArray(image) ? image : image ? [image] : [])) body.append('image', file);
    const data = await request('/services/' + id + '/changes', { basePath, method: 'POST', body, signal });
    if (!validRegistration(data) || data.status !== 'PENDING' || data.targetServiceId !== id || data.operation !== details.operation) throw new ApiError('Chưa xác nhận được yêu cầu. Vui lòng tải lại danh sách.', 502);
    return data;
  },
  categories: signal => request('/categories', { basePath, signal }),
  current: async signal => {
    const data = await request('/current', { basePath, signal });
    if (!data || typeof data.canRegister !== 'boolean' || !['ELIGIBLE', 'HAS_CAPABILITY', 'APPROVED', 'IN_REVIEW'].includes(data.reason)
        || data.canRegister !== (data.reason === 'ELIGIBLE') || (data.registration !== null && !validRegistration(data.registration)))
      throw new ApiError('Không thể xác minh trạng thái hồ sơ. Vui lòng thử lại.', 502);
    return data;
  },
  submit: async (details, documents, image, signal) => {
    // Retain the original cancellable submit contract for existing callers.
    if (image && typeof image.aborted === "boolean" && typeof image.addEventListener === "function") { signal = image; image = undefined; }
    const body = new FormData();
    body.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    documents.forEach(file => body.append('documents', file));
    for (const file of (Array.isArray(image) ? image : image ? [image] : [])) body.append('image', file);
    const data = await request('', { basePath, method: 'POST', body, signal });
    if (!validRegistration(data) || data.status !== 'PENDING' || !data.documents.length)
      throw new ApiError('Chưa xác nhận được hồ sơ đã lưu. Vui lòng đóng và mở lại để kiểm tra trạng thái trước khi gửi lại.', 502);
    return data;
  },
  resubmit: async (id, details, documents, image, signal) => {
    const body = new FormData();
    body.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    documents.forEach(file => body.append('documents', file));
    for (const file of (Array.isArray(image) ? image : image ? [image] : [])) body.append('image', file);
    const data = await request('/' + id + '/resubmit', { basePath, method: 'POST', body, signal });
    if (!validRegistration(data) || data.status !== 'PENDING' || data.registrationId !== id || data.revision !== details.revision + 1)
      throw new ApiError('Chưa xác nhận được lần nộp lại. Vui lòng cập nhật kết quả hồ sơ.', 502);
    return data;
  },
  document: id => request(`/documents/${id}`, { basePath, responseType: 'blob' }),
};

export function validateServiceRegistrationFields(form, files, options = {}) {
  const errors = {};
  const length = (key, min, max, label) => {
    const size = String(form[key] ?? '').trim().length;
    if (size < min || size > max) errors[key] = label + ' phải có từ ' + min + ' đến ' + max + ' ký tự.';
  };
  const images = Array.isArray(options.image) ? options.image : options.image ? [options.image] : [];
  if (options.imageRequired && !images.length) errors.image = 'Vui lòng chọn ảnh đại diện dịch vụ.';
  if (images.length > 5) errors.image = 'Chọn tối đa 5 ảnh dịch vụ.';
  for (const image of images) { const message = validateRegistrationFile(image); if (message) { errors.image = message; break; } }
  length('applicantName', 2, 100, 'Họ tên'); length('serviceName', 3, 255, 'Tên dịch vụ');
  if (!Number.isInteger(Number(form.categoryId)) || Number(form.categoryId) < 1 || (options.categories && !options.categories.some(cat => String(cat.categoryId) === String(form.categoryId)))) errors.categoryId = 'Vui lòng chọn danh mục dịch vụ hợp lệ.';
  length('description', 20, 5000, 'Mô tả dịch vụ');
  if (!['FIXED', 'FROM', 'NEGOTIABLE'].includes(form.pricingType)) errors.pricingType = 'Vui lòng chọn loại giá hợp lệ.';
  if (form.pricingType !== 'NEGOTIABLE' && (!/^\d+(\.\d{1,2})?$/.test(String(form.price)) || Number(form.price) <= 0 || Number(form.price) > 9999999999.99)) errors.price = String(form.price ?? '').trim() ? 'Số tiền không hợp lệ.' : 'Vui lòng nhập số tiền.';
  length('serviceArea', 2, 500, 'Khu vực phục vụ');
  if (!isVietnamesePhone(String(form.contactPhone ?? ''))) errors.contactPhone = 'Nhập số di động Việt Nam hợp lệ: 10 số hoặc bắt đầu bằng +84.';
  if (form.contactEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail) || form.contactEmail.length > 255)) errors.contactEmail = 'Email chưa đúng định dạng, ví dụ: ten@example.com (tối đa 255 ký tự).';
  if (options.noteRequired && (String(options.note ?? '').trim().length < 10 || options.note.length > 2000)) errors.note = 'Mô tả nội dung thay đổi từ 10 đến 2000 ký tự.';
  if (files.length + (options.retainedCount || 0) < 1 || files.length + (options.retainedCount || 0) > 5) errors.documents = 'Hồ sơ cần tổng cộng từ 1 đến 5 tài liệu xác minh.';
  for (const file of files) { const message = validateRegistrationFile(file, true); if (message) { errors.documents = file.name + ': ' + message; break; } }
  return errors;
}
export function validateServiceRegistration(form, files, retainedCount = 0) {
  return Object.values(validateServiceRegistrationFields(form, files, { retainedCount }))[0] || '';
}
export function serviceRegistrationFieldErrors(error) {
  const result = {};
  for (const [key, value] of Object.entries(error.fields || {})) {
    const name = key.split('.').pop();
    if (['image', 'applicantName', 'serviceName', 'categoryId', 'description', 'pricingType', 'price', 'serviceArea', 'contactPhone', 'contactEmail', 'note', 'documents'].includes(name)) result[name] = String(value);
  }
  if (!Object.keys(result).length) {
    const message = error.message || '';
    if (/tên dịch vụ|trùng tên/i.test(message)) result.serviceName = message;
    else if (/ảnh/i.test(message) && error.status === 400) result.image = message;
    else if (/tài liệu|định dạng tệp/i.test(message) && error.status === 400) result.documents = message;
    else if (/điện thoại/i.test(message) && error.status === 400) result.contactPhone = message;
    else if (/giá cố định|giá dịch vụ|số tiền/i.test(message) && error.status === 400) result.price = message;
  }
  return result;
}
