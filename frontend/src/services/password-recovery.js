import { ApiError, request } from './auth.js';

export function recoveryIdentifier(value) {
  const text = value.trim().toLowerCase();
  if (text.includes('@')) return text;
  const phone = text.replace(/[\s.()-]/g, '');
  return phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
}
export function passwordErrors(password, confirm, current) {
  const errors = {};
  if (!password.trim() || password.length < 6 || new TextEncoder().encode(password).length > 72)
    errors.newPassword = 'Mật khẩu cần ít nhất 6 ký tự và không quá 72 byte UTF-8.';
  else if (current !== undefined && password === current) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  if (!confirm || password !== confirm) errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.';
  return errors;
}
export function recoveryContacts(user) {
  if (!user) return [];
  const phone = recoveryIdentifier(user.phoneNumber || '');
  const email = (user.email || '').toLowerCase();
  const phoneRegistration = email === `${phone}@hlrcs.user`
    || (phone.startsWith('0') && email === `+84${phone.slice(1)}@hlrcs.user`);
  return [email && !email.endsWith('@hlrcs.user') ? user.email : null,
    phone && (user.phoneVerifiedAt || phoneRegistration) ? user.phoneNumber : null].filter(Boolean);
}
export function passwordRecoveryApi(profile = false) {
  const basePath = `/api/auth/${profile ? 'profile/' : ''}password-reset`;
  const call = (path, body, signal) => request(path, { basePath, method: 'POST', body, signal, authenticated: profile });
  const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  return {
    send: async (identifier, signal) => {
      const data = await call('/send-otp', { identifier }, signal);
      if (!timestamp(data?.resendAt) || !timestamp(data?.expiresAt) || !['EMAIL', 'SMS'].includes(data?.channel))
        throw new ApiError('Không xác minh được kết quả gửi mã. Vui lòng thử lại sau.', 502);
      return data;
    },
    verify: async (identifier, code, signal) => {
      const data = await call('/verify-otp', { identifier, code }, signal);
      if (typeof data?.verificationToken !== 'string' || !data.verificationToken || !timestamp(data.expiresAt))
        throw new ApiError('Kết quả xác minh không hợp lệ. Vui lòng yêu cầu mã mới.', 502);
      return data;
    },
    confirm: (identifier, verificationToken, newPassword, signal) => call('/confirm', { identifier, verificationToken, newPassword }, signal),
  };
}
