export const applicationStatuses = { PENDING: 'Chờ xét duyệt', NEEDS_SUPPLEMENT: 'Cần bổ sung', APPROVED: 'Đã cấp quyền', REJECTED: 'Đã từ chối' };
const normalized = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const timestamp = value => { const result = Date.parse(value); return Number.isFinite(result) ? result : 0; };
export function filterServiceApplications(rows, {q = '', status = 'ALL', category = '', sort = 'OLDEST'} = {}) {
  const query = normalized(q);
  return rows.filter(row => (status === 'ALL' || row.status === status)
    && (!category || row.categoryName === category)
    && (!query || [row.registrationId, `DV-${row.registrationId}`, row.serviceName, row.applicantName, row.contactPhone, row.contactEmail, row.serviceArea].some(value => normalized(value).includes(query))))
    .sort((a, b) => (sort === 'NEWEST' ? timestamp(b.createdAt) - timestamp(a.createdAt) : timestamp(a.createdAt) - timestamp(b.createdAt)) || a.registrationId - b.registrationId);
}
export function serviceApplicationCounts(rows) {
  return rows.reduce((counts, row) => { counts.ALL++; if (row.status in counts) counts[row.status]++; return counts; }, {ALL: 0, PENDING: 0, NEEDS_SUPPLEMENT: 0, APPROVED: 0, REJECTED: 0});
}
export function serviceApplicationPrice(row) {
  if (row.pricingType === 'NEGOTIABLE') return 'Thỏa thuận';
  if (row.price == null || row.price === '' || !Number.isFinite(Number(row.price))) return 'Chưa có giá';
  return `${row.pricingType === 'FROM' ? 'Từ ' : ''}${Number(row.price).toLocaleString('vi-VN')} VNĐ`;
}
