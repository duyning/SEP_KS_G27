import { request } from './auth.js';

const basePath = '/api/host/room-billing';
const write = (path, method, body, signal) => request(path, { basePath, method, body, signal });

export function roomBillingPath(propertyId, roomId, month) {
  const params = new URLSearchParams({ propertyId, billing: '1' });
  if (roomId) params.set('roomId', roomId);
  if (month) params.set('month', month);
  return `/host/rooms?${params}`;
}

export const roomBillingApi = {
  list: (propertyId, month, signal) => request(`?${new URLSearchParams({ propertyId, month })}`, { basePath, signal }),
  detail: (id, signal) => request(`/${id}`, { basePath, signal }),
  schedule: (body, signal) => write('/schedule', 'PUT', body, signal),
  draft: (body, signal) => write('/draft', 'PUT', body, signal),
  issue: (id, revision, signal) => write(`/${id}/issue`, 'POST', { revision }, signal),
  payment: (id, body, signal) => write(`/${id}/payments`, 'POST', body, signal),
};

export const billStatuses = {
  DRAFT: 'Bản nháp',
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thu một phần',
  PAID: 'Đã thanh toán',
};

export const paymentMethods = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  OTHER: 'Khác',
};

export const vndDigits = value => String(value ?? '').replace(/[.\s,]/g, '');
export const vndValue = value => (/^\d+$/.test(String(value)) ? BigInt(value) : 0n);

export function formatVndInput(value) {
  const digits = vndDigits(value);
  if (!digits) return '';
  if (!/^\d+$/.test(digits)) return String(value ?? '');
  return new Intl.NumberFormat('vi-VN').format(BigInt(digits));
}

export function formatBillCode(id) {
  if (id == null) return '#—';
  return `#${String(id).padStart(3, '0')}`;
}

export function formatBillingMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return month || '';
  const [year, m] = month.split('-');
  return `${m}/${year}`;
}

export function billPaidPercent(bill) {
  if (!bill || bill.status === 'DRAFT') return 0;
  const total = vndValue(bill.totalAmount);
  if (total <= 0n) return 0;
  const paid = vndValue(bill.paidAmount);
  if (paid >= total) return 100;
  if (paid <= 0n) return 0;
  return Number((paid * 100n) / total);
}

/**
 * Totals strictly exclude DRAFT bills (only officially issued bills count toward debt/revenue KPIs).
 */
export function billTotals(bills) {
  return (bills || [])
    .filter(bill => bill.status !== 'DRAFT')
    .reduce(
      (totals, bill) => ({
        total: totals.total + vndValue(bill.totalAmount),
        paid: totals.paid + vndValue(bill.paidAmount),
        outstanding: totals.outstanding + vndValue(bill.outstanding),
        issuedCount: totals.issuedCount + 1,
        unpaidCount: totals.unpaidCount + (vndValue(bill.outstanding) > 0n ? 1 : 0),
        overdueCount: totals.overdueCount + (bill.overdue ? 1 : 0),
      }),
      { total: 0n, paid: 0n, outstanding: 0n, issuedCount: 0, unpaidCount: 0, overdueCount: 0 }
    );
}

/**
 * Determines whether a tenancy candidate requires billing action for this period:
 * - No main bill created yet (or has tenancy issue requiring attention), OR
 * - Main bill was issued without utilities, finalized utilities now exist (> 0), and no supplemental utility bill exists yet.
 */
export function candidateNeedsBilling(candidate) {
  if (!candidate) return false;
  if (candidate.issue) return true;
  if (!candidate.mainBillId) return true;
  if (
    candidate.mainIssued &&
    candidate.utilities &&
    !candidate.utilitiesAlreadyBilled &&
    !candidate.utilityBillId &&
    vndValue(candidate.utilities.electricityAmount) + vndValue(candidate.utilities.waterAmount) > 0n
  ) {
    return true;
  }
  return false;
}

export function candidateNeedsSupplementalUtilities(candidate) {
  return Boolean(
    candidate &&
      !candidate.issue &&
      candidate.mainIssued &&
      candidate.utilities &&
      !candidate.utilitiesAlreadyBilled &&
      !candidate.utilityBillId &&
      vndValue(candidate.utilities.electricityAmount) + vndValue(candidate.utilities.waterAmount) > 0n
  );
}

export function filterBills(bills, earlierDebt, { roomFilter = '', status = 'ALL', query = '' } = {}) {
  const source = status === 'EARLIER' ? earlierDebt || [] : bills || [];
  const q = query.trim().toLowerCase();
  return source.filter(bill => {
    if (roomFilter && String(bill.roomId) !== String(roomFilter)) return false;
    if (status !== 'ALL' && status !== 'EARLIER') {
      if (status === 'OVERDUE') {
        if (!bill.overdue) return false;
      } else if (bill.status !== status) {
        return false;
      }
    }
    if (q) {
      const code = formatBillCode(bill.id).toLowerCase();
      const hay = `${code} ${bill.id} p.${bill.roomNumber} phòng ${bill.roomNumber} ${bill.roomNumber} ${bill.tenantName || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function describeDueDayRule(dueDay) {
  const day = Number(dueDay);
  if (!Number.isInteger(day) || day < 29 || day > 31) return '';
  return `Quy tắc ngày cuối tháng: với các tháng không có ngày ${day} (ví dụ tháng 2${day === 31 ? ', 4, 6, 9, 11' : ''}), hạn thu sẽ tự động áp dụng vào ngày cuối cùng của tháng đó.`;
}

export function describeCycle(cycleMonths) {
  const n = Number(cycleMonths);
  if (n === 1) return 'Hằng tháng';
  return `Mỗi ${n} tháng`;
}

export function buildBillsCsv(bills, { propertyName = '', month = '' } = {}) {
  const escape = value => {
    const str = String(value ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = [
    'Mã phiếu',
    'Nhà trọ',
    'Phòng',
    'Người thuê',
    'Kỳ thu',
    'Loại phiếu',
    'Hạn thanh toán',
    'Trạng thái thanh toán',
    'Quá hạn',
    'Tiền phòng (đ)',
    'Tiền điện (đ)',
    'Tiền nước (đ)',
    'Tổng phải thu (đ)',
    'Đã thu (đ)',
    'Còn thiếu (đ)',
  ];
  const rows = (bills || []).map(bill => [
    formatBillCode(bill.id),
    propertyName,
    `P.${bill.roomNumber}`,
    bill.tenantName || '',
    formatBillingMonth(bill.month || month),
    bill.kind === 'UTILITIES' ? 'Điện nước bổ sung' : 'Phiếu chính',
    bill.dueDate || '',
    billStatuses[bill.status] || bill.status,
    bill.overdue ? 'Quá hạn' : 'Không',
    bill.rentAmount || '0',
    bill.includesUtilities ? bill.electricityAmount || '0' : '0',
    bill.includesUtilities ? bill.waterAmount || '0' : '0',
    bill.totalAmount || '0',
    bill.status === 'DRAFT' ? '0' : bill.paidAmount || '0',
    bill.status === 'DRAFT' ? '0' : bill.outstanding || '0',
  ]);
  return '\uFEFF' + [header, ...rows].map(cols => cols.map(escape).join(',')).join('\r\n');
}

export function downloadBillsCsv(bills, meta) {
  const csv = buildBillsCsv(bills, meta);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao-cao-phieu-thu-${meta.month || 'ky'}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function paymentKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
