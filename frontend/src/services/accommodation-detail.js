export const detailPhone = value => {
  const phone = String(value || '').replace(/[\s.()-]/g, '');
  return /^(?:0|\+84)[35789]\d{8}$/.test(phone) ? phone : null;
};
export const zaloLink = value => {
  const phone = detailPhone(value);
  return phone ? `https://zalo.me/${phone.startsWith('0') ? `84${phone.slice(1)}` : phone.replace('+', '')}` : null;
};
export function moveInEstimate(price, deposit) {
  return Number.isFinite(price) && price > 0 && Number.isFinite(deposit) && deposit >= 0 ? price + deposit : null;
}
export function ratingPercent(count, total) {
  return total > 0 ? Math.max(0, Math.min(100, Math.round(count * 100 / total))) : 0;
}
export const detailDate = value => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : new Intl.DateTimeFormat('vi-VN').format(date);
};
