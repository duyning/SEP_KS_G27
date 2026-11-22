export type BillKind = 'MAIN' | 'UTILITIES';
export type BillStatus = 'DRAFT' | 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'OTHER';
export type BillingStatusFilter =
  | 'ALL'
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'DRAFT'
  | 'EARLIER';

export interface BillingSchedule {
  cycleMonths: number;
  dueDay: number;
  firstDueDate: string;
}

export interface BillingProposedRent {
  from: string;
  through: string;
  amount: string;
}

export interface BillingUtilityCharge {
  readOn: string;
  electricityAmount: string;
  waterAmount: string;
  electricityStart?: number | string | null;
  electricityEnd?: number | string | null;
  electricityRate?: number | string | null;
  waterMode?: string | null;
  waterStart?: number | string | null;
  waterEnd?: number | string | null;
  waterRate?: number | string | null;
  occupantCount?: number | null;
}

export interface BillingCharge {
  label: string;
  amount: string | number;
}

export interface BillingCandidate {
  roomId: number;
  roomNumber: string;
  tenantName: string | null;
  floor: string | null;
  tenancyKey: string;
  startDate: string;
  ended: boolean;
  issue: string | null;
  schedule: BillingSchedule | null;
  scheduleLocked: boolean;
  rent: BillingProposedRent | null;
  dueDate: string | null;
  utilityDueDate: string | null;
  utilities: BillingUtilityCharge | null;
  suggestedCharges: BillingCharge[];
  mainBillId: number | null;
  mainIssued: boolean;
  utilityBillId: number | null;
  utilitiesAlreadyBilled: boolean;
}

export interface BillingBill {
  id: number;
  revision: number;
  propertyId: number;
  roomId: number;
  tenancyKey: string;
  roomNumber: string;
  tenantName: string | null;
  month: string;
  kind: BillKind;
  dueDate: string;
  issuedAt: string | null;
  status: BillStatus;
  overdue: boolean;
  rentFrom: string | null;
  rentThrough: string | null;
  rentAmount: string;
  includesUtilities: boolean;
  electricityAmount: string;
  waterAmount: string;
  charges: BillingCharge[];
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
}

export interface BillingPayment {
  id: number;
  paidOn: string;
  amount: string;
  method: PaymentMethod;
  note: string | null;
}

export interface BillingDetail {
  bill: BillingBill;
  payments: BillingPayment[];
}

export interface BillingLedger {
  month: string;
  today: string;
  candidates: BillingCandidate[];
  bills: BillingBill[];
  earlierDebt: BillingBill[];
}

export interface BillingPeriodPayload {
  propertyId: number;
  roomId: number;
  tenancyKey: string;
  month: string;
}

export interface BillingSchedulePayload {
  period: BillingPeriodPayload;
  cycleMonths: number;
  dueDay: number;
  firstDueDate: string;
}

export interface BillingDraftPayload {
  period: BillingPeriodPayload;
  kind: BillKind;
  revision: number | null;
  dueDate: string;
  rentAmount: string;
  includeUtilities: boolean;
  charges: { label: string; amount: string }[];
}

export interface BillingPaymentPayload {
  requestKey: string;
  amount: string;
  paidOn: string;
  method: PaymentMethod;
  note: string | null;
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: 'Bản nháp',
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thu một phần',
  PAID: 'Đã thanh toán',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  OTHER: 'Khác',
};

export function vndDigits(value: string | number | bigint | null | undefined): string {
  return String(value ?? '').replace(/[.\s,]/g, '');
}

export function vndValue(value: string | number | bigint | null | undefined): bigint {
  if (typeof value === 'bigint') return value >= 0n ? value : 0n;
  const digits = vndDigits(value);
  return /^\d+$/.test(digits) ? BigInt(digits) : 0n;
}

function groupVndBigInt(value: bigint): string {
  const negative = value < 0n;
  const absStr = (negative ? -value : value).toString();
  const grouped = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return negative ? `-${grouped}` : grouped;
}

export function formatVndInput(value: string | number | null | undefined): string {
  const digits = vndDigits(value);
  if (!digits) return '';
  if (!/^\d+$/.test(digits)) return String(value ?? '');
  return groupVndBigInt(BigInt(digits));
}

export function formatBillMoney(value: string | number | bigint | null | undefined): string {
  return `${groupVndBigInt(vndValue(value))}đ`;
}

export function formatBillCode(id: number | null | undefined): string {
  if (id == null) return '#—';
  return `#${String(id).padStart(3, '0')}`;
}

export function formatBillingMonthShort(month?: string | null): string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month || '';
  const [year, m] = month.split('-');
  return `${m}/${year}`;
}

export function formatIsoDateShort(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function billPaidPercent(bill: Pick<BillingBill, 'status' | 'totalAmount' | 'paidAmount'> | null): number {
  if (!bill || bill.status === 'DRAFT') return 0;
  const total = vndValue(bill.totalAmount);
  if (total <= 0n) return 0;
  const paid = vndValue(bill.paidAmount);
  if (paid >= total) return 100;
  if (paid <= 0n) return 0;
  const pct = Number((paid * 100n) / total);
  // Never report 100% if paid < total
  return Math.min(99, Math.max(0, pct));
}

export interface BillingTotals {
  total: bigint;
  paid: bigint;
  outstanding: bigint;
  issuedCount: number;
  unpaidCount: number;
  overdueCount: number;
  draftCount: number;
  paidPercent: number;
}

/**
 * Financial KPIs strictly exclude DRAFT bills (only officially issued bills count toward debt/collection).
 */
export function billTotals(bills: readonly BillingBill[]): BillingTotals {
  let total = 0n;
  let paid = 0n;
  let outstanding = 0n;
  let issuedCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  let draftCount = 0;

  for (const bill of bills) {
    if (bill.status === 'DRAFT') {
      draftCount++;
      continue;
    }
    const bTotal = vndValue(bill.totalAmount);
    const bPaid = vndValue(bill.paidAmount);
    const bOut = vndValue(bill.outstanding);
    total += bTotal;
    paid += bPaid;
    outstanding += bOut;
    issuedCount++;
    if (bOut > 0n) unpaidCount++;
    if (bill.overdue) overdueCount++;
  }

  let paidPercent = 0;
  if (total > 0n) {
    if (paid >= total) paidPercent = 100;
    else if (paid > 0n) paidPercent = Math.min(99, Number((paid * 100n) / total));
  }

  return {
    total,
    paid,
    outstanding,
    issuedCount,
    unpaidCount,
    overdueCount,
    draftCount,
    paidPercent,
  };
}

export function candidateUtilitiesTotal(candidate: BillingCandidate | null | undefined): bigint {
  if (!candidate?.utilities) return 0n;
  return vndValue(candidate.utilities.electricityAmount) + vndValue(candidate.utilities.waterAmount);
}

export function candidateNeedsSupplementalUtilities(candidate: BillingCandidate | null | undefined): boolean {
  return Boolean(
    candidate &&
      !candidate.issue &&
      candidate.mainIssued &&
      candidate.utilities &&
      !candidate.utilitiesAlreadyBilled &&
      !candidate.utilityBillId &&
      candidateUtilitiesTotal(candidate) > 0n
  );
}

export function candidateNeedsBilling(candidate: BillingCandidate | null | undefined): boolean {
  if (!candidate) return false;
  if (candidate.issue) return true;
  if (!candidate.mainBillId) return true;
  return candidateNeedsSupplementalUtilities(candidate);
}

function foldVi(text?: string | null): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function filterBills(
  bills: readonly BillingBill[],
  earlierDebt: readonly BillingBill[],
  options: {
    status?: BillingStatusFilter;
    roomId?: number | null;
    query?: string;
  } = {}
): BillingBill[] {
  const status = options.status || 'ALL';
  const source = status === 'EARLIER' ? earlierDebt : bills;
  const q = foldVi(options.query);

  return source.filter(bill => {
    if (options.roomId != null && bill.roomId !== options.roomId) return false;
    if (status !== 'ALL' && status !== 'EARLIER') {
      if (status === 'OVERDUE') {
        if (!bill.overdue) return false;
      } else if (bill.status !== status) {
        return false;
      }
    }
    if (q) {
      const code = formatBillCode(bill.id);
      const hay = foldVi(`${code} ${bill.id} p.${bill.roomNumber} phong ${bill.roomNumber} ${bill.roomNumber} ${bill.tenantName || ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filterCandidates(
  candidates: readonly BillingCandidate[],
  options: { roomId?: number | null; query?: string } = {}
): BillingCandidate[] {
  const q = foldVi(options.query);
  return candidates.filter(candidate => {
    if (options.roomId != null && candidate.roomId !== options.roomId) return false;
    if (q) {
      const hay = foldVi(`p.${candidate.roomNumber} phong ${candidate.roomNumber} ${candidate.roomNumber} ${candidate.tenantName || ''} ${candidate.floor || ''}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function describeCycle(cycleMonths?: number | null): string {
  const n = Number(cycleMonths);
  if (!Number.isInteger(n) || n < 1) return 'Chưa thiết lập';
  if (n === 1) return 'Hằng tháng';
  return `Mỗi ${n} tháng`;
}

export function describeDueDayRule(dueDay: number): string {
  if (!Number.isInteger(dueDay) || dueDay < 29 || dueDay > 31) return '';
  return `Quy tắc ngày cuối tháng: với tháng không có ngày ${dueDay} (ví dụ tháng 2${dueDay === 31 ? ', 4, 6, 9, 11' : ''}), hạn thu tự động áp dụng vào ngày cuối cùng của tháng đó.`;
}

export function validatePaymentInput(input: {
  amountText: string;
  paidOn: string;
  todayIso: string;
  outstanding: string | bigint;
}): {
  valid: boolean;
  error: string | null;
  amount: bigint;
  remainingAfter: bigint;
} {
  const maxDebt = vndValue(input.outstanding);
  const digits = vndDigits(input.amountText);
  if (!digits || !/^\d{1,20}$/.test(digits)) {
    return {
      valid: false,
      error: 'Nhập số tiền thanh toán hợp lệ (VND nguyên).',
      amount: 0n,
      remainingAfter: maxDebt,
    };
  }
  const amount = BigInt(digits);
  if (amount <= 0n) {
    return {
      valid: false,
      error: 'Số tiền thanh toán phải lớn hơn 0đ.',
      amount: 0n,
      remainingAfter: maxDebt,
    };
  }
  if (amount > maxDebt) {
    return {
      valid: false,
      error: `Số tiền vượt quá dư nợ hiện tại (${formatBillMoney(maxDebt)}).`,
      amount,
      remainingAfter: 0n,
    };
  }
  if (!input.paidOn || !/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)) {
    return {
      valid: false,
      error: 'Chọn ngày thanh toán hợp lệ.',
      amount,
      remainingAfter: maxDebt - amount,
    };
  }
  if (input.todayIso && input.paidOn > input.todayIso) {
    return {
      valid: false,
      error: 'Ngày thu tiền không thể ở tương lai.',
      amount,
      remainingAfter: maxDebt - amount,
    };
  }
  return {
    valid: true,
    error: null,
    amount,
    remainingAfter: maxDebt - amount,
  };
}

export function validateDraftInput(input: {
  kind: BillKind;
  dueDate: string;
  rentText: string;
  includeUtilities: boolean;
  utilities: BillingUtilityCharge | null;
  utilitiesBlockedByOtherBill: boolean;
  charges: readonly { label: string; amount: string }[];
}): {
  valid: boolean;
  error: string | null;
  rentAmount: string;
  totalAmount: bigint;
  cleanCharges: { label: string; amount: string }[];
} {
  const isSupplemental = input.kind === 'UTILITIES';
  const rentDigits = isSupplemental ? '0' : vndDigits(input.rentText) || '0';

  if (!input.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    return {
      valid: false,
      error: 'Chọn hạn thanh toán hợp lệ (YYYY-MM-DD).',
      rentAmount: rentDigits,
      totalAmount: 0n,
      cleanCharges: [],
    };
  }
  if (!/^\d{1,12}$/.test(rentDigits)) {
    return {
      valid: false,
      error: 'Tiền phòng phải là số tiền VND nguyên hợp lệ.',
      rentAmount: '0',
      totalAmount: 0n,
      cleanCharges: [],
    };
  }

  const cleanCharges: { label: string; amount: string }[] = [];
  if (!isSupplemental) {
    for (let i = 0; i < input.charges.length; i++) {
      const label = input.charges[i].label.trim();
      const amount = vndDigits(input.charges[i].amount);
      if (!label || !/^\d{1,12}$/.test(amount) || vndValue(amount) <= 0n) {
        return {
          valid: false,
          error: `Kiểm tra tên khoản phí và số tiền lớn hơn 0đ ở dòng phí #${i + 1}.`,
          rentAmount: rentDigits,
          totalAmount: 0n,
          cleanCharges: [],
        };
      }
      cleanCharges.push({ label, amount });
    }
  }

  if (input.includeUtilities) {
    if (!input.utilities) {
      return {
        valid: false,
        error: 'Điện nước kỳ này chưa được chốt trong mục Ghi điện nước.',
        rentAmount: rentDigits,
        totalAmount: 0n,
        cleanCharges,
      };
    }
    if (input.utilitiesBlockedByOtherBill) {
      return {
        valid: false,
        error: 'Khoản điện nước kỳ này đã nằm trong phiếu khác — không thể tính trùng.',
        rentAmount: rentDigits,
        totalAmount: 0n,
        cleanCharges,
      };
    }
  }

  const rentVal = BigInt(rentDigits);
  const utilVal =
    input.includeUtilities && input.utilities
      ? vndValue(input.utilities.electricityAmount) + vndValue(input.utilities.waterAmount)
      : 0n;
  const chargesVal = cleanCharges.reduce((sum, item) => sum + BigInt(item.amount), 0n);
  const totalAmount = rentVal + utilVal + chargesVal;

  if (totalAmount <= 0n) {
    return {
      valid: false,
      error: 'Phiếu thu phải có tổng số tiền lớn hơn 0đ.',
      rentAmount: rentDigits,
      totalAmount,
      cleanCharges,
    };
  }

  return {
    valid: true,
    error: null,
    rentAmount: rentDigits,
    totalAmount,
    cleanCharges,
  };
}

export function validateScheduleInput(input: {
  cycleMonths: number;
  dueDay: number;
  firstDueDate: string;
}): string | null {
  if (!Number.isInteger(input.cycleMonths) || input.cycleMonths < 1 || input.cycleMonths > 12) {
    return 'Chọn chu kỳ thu tiền từ 1 đến 12 tháng.';
  }
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return 'Ngày thu dự định phải từ ngày 1 đến ngày 31.';
  }
  if (!input.firstDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.firstDueDate)) {
    return 'Chọn hạn thanh toán lần đầu hợp lệ.';
  }
  return null;
}

/**
 * Generates an RFC 4122 lowercase UUID v4 matching RoomBillingRequest.Payment.requestKey.
 */
export function generatePaymentRequestKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID().toLowerCase();
  }
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const str = Array.from(bytes, hex).join('');
  return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20)}`;
}

export function buildBillsCsv(
  bills: readonly BillingBill[],
  meta: { propertyName?: string; month?: string } = {}
): string {
  const escape = (value: unknown) => {
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
  const rows = bills.map(bill => [
    formatBillCode(bill.id),
    meta.propertyName || '',
    `P.${bill.roomNumber}`,
    bill.tenantName || '',
    formatBillingMonthShort(bill.month || meta.month),
    bill.kind === 'UTILITIES' ? 'Điện nước bổ sung' : 'Phiếu chính',
    bill.dueDate || '',
    BILL_STATUS_LABELS[bill.status] || bill.status,
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
