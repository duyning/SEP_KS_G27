import { request } from './auth.js';

const basePath = '/api/host-applications';

export const hostApplicationApi = {
  current: (signal) => request('/current', { basePath, signal }),
  submit: (body) => request('', { basePath, method: 'POST', body })
};

export const applicantCapacities = [
  ['OWNER', 'Chủ sở hữu'],
  ['AUTHORIZED_MANAGER', 'Người được ủy quyền quản lý'],
  ['SUBLESSOR', 'Người thuê để cho thuê lại']
];

export const rentalExperiences = [
  ['FIRST_TIME', 'Chưa có kinh nghiệm'],
  ['UNDER_TWO_YEARS', 'Dưới 2 năm'],
  ['TWO_YEARS_OR_MORE', 'Từ 2 năm trở lên']
];

export const hostApplicationFieldLabels = {
  targetCommune: 'Khu vực hoạt động chính',
  expectedScale: 'Quy mô phòng dự kiến',
  introduction: 'Giới thiệu bản thân & cơ sở cho thuê',
  applicantCapacity: 'Tư cách cho thuê',
  rentalExperience: 'Kinh nghiệm quản lý',
  accPhone: 'Số điện thoại liên hệ chính chủ',
  accFullName: 'Họ và tên người đăng ký',
  accEmail: 'Email tài khoản'
};

export const applicationFieldLabel = (options, value) =>
  options.find(([key]) => key === value)?.[1] || 'Chưa cung cấp';
