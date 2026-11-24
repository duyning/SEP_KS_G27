import type { HostRoom, HostRoomType } from './host';
import { roomAmenityLabel } from './host-room-types';
import {
  HOUSE_RENTAL_TEMPLATE,
  type RentalContractFullDetails,
  type RentalContractRecord,
  type SignaturePoint,
} from './rental-contracts';
import {
  isValidIsoDate,
  normalizePhoneDigits,
  type RoomTenancy,
} from './room-tenancy';

export const CONTRACT_WIZARD_STEPS = [
  { id: 1 as const, shortLabel: 'Chọn mẫu', title: 'Chọn mẫu hợp đồng' },
  { id: 2 as const, shortLabel: 'Hai bên', title: 'Thông tin hai bên' },
  { id: 3 as const, shortLabel: 'Kỳ thuê', title: 'Kỳ thuê & chi phí' },
  { id: 4 as const, shortLabel: 'Duyệt', title: 'Điều khoản & duyệt' },
] as const;

export type ContractWizardStep = 1 | 2 | 3 | 4;
export type ContractTemplateId = 'BASIC' | 'HOUSE_RENTAL' | 'SHARED' | 'OWNER_SCAN';
export type ContractSourceMode = 'template' | 'scan';

export const SIGNATURE_MAX_STROKES = 24;
export const SIGNATURE_MAX_POINTS_PER_STROKE = 180;
export const SIGNATURE_CANVAS_WIDTH = 600;
export const SIGNATURE_CANVAS_HEIGHT = 200;

export const SCAN_MAX_FILES = 5;
export const SCAN_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const SCAN_MAX_TOTAL_BYTES = 10 * 1024 * 1024;
export const SCAN_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export interface ContractTemplateItem {
  id: string;
  name: string;
  description: string;
  terms: string;
}

export interface ContractTemplateCatalog {
  templates: ContractTemplateItem[];
  scanAvailable: boolean;
}

export interface ContractBlankMatch {
  key: string;
  line: number;
  start: number;
  token: string;
  context: string;
  position: number;
  total: number;
}

export interface ParsedTermClause {
  index: string;
  title: string;
  heading: string;
  body: string;
}

export interface ContractWizardDraft {
  roomId: number;
  propertyId: number;
  tenancyKey: string | null;
  template: ContractTemplateId;
  sourceMode: ContractSourceMode;
  leaseStartDate: string;
  leaseEndDate: string;
  contractDate: string;
  landlordName: string;
  landlordPhone: string;
  landlordBirthDate: string;
  landlordAddress: string;
  landlordIdentity: string;
  landlordIdentityDate: string;
  landlordIdentityPlace: string;
  tenantName: string;
  tenantPhone: string;
  tenantBirthDate: string;
  tenantIdentity: string;
  tenantIdentityDate: string;
  tenantIdentityPlace: string;
  tenantAddress: string;
  tenantCurrentAddress: string;
  occupantCount: string;
  rent: string;
  deposit: string;
  paymentDay: string;
  paymentMethod: string;
  paymentCycle: string;
  firstPaymentDate: string;
  electricityPrice: string;
  waterPrice: string;
  waterUnit: 'người' | 'm³';
  internetPrice: string;
  servicePrice: string;
  rentalScope: string;
  includedEquipment: string;
  terms: string;
  sourceName: string;
  fullScannedTranscript: string;
  scanFullDocument: boolean;
  blankValues: Record<string, string>;
  reviewed: boolean;
}

export interface ContractCreatePayload {
  roomId: number;
  template: ContractTemplateId;
  landlordName: string;
  landlordPhone: string;
  tenantName: string;
  tenantPhone: string;
  tenantIdentity: string;
  tenantAddress: string;
  rent: number;
  deposit: number;
  paymentDay: number;
  terms: string;
  sourceName: string;
  reviewed: boolean;
  contractDate: string | null;
  landlordBirthDate: string | null;
  landlordAddress: string | null;
  landlordIdentity: string | null;
  landlordIdentityDate: string | null;
  landlordIdentityPlace: string | null;
  tenantBirthDate: string | null;
  tenantIdentityDate: string | null;
  tenantIdentityPlace: string | null;
  paymentMethod: string | null;
  electricityPrice: number | null;
  waterPrice: number | null;
  waterUnit: string | null;
  internetPrice: number | null;
  servicePrice: number | null;
  fullScannedTranscript: string | null;
  scanFullDocument: boolean;
  rentalScope?: string | null;
  includedEquipment?: string | null;
  occupantCount?: number | null;
  firstPaymentDate?: string | null;
  tenantCurrentAddress?: string | null;
  paymentCycle?: string | null;
}

export interface PersistedContractWizardDraft {
  version: 1;
  savedAt: string;
  step: ContractWizardStep;
  draft: ContractWizardDraft;
}

const STEP_FIELDS: Record<ContractWizardStep, readonly string[]> = {
  1: ['source'],
  2: [
    'landlordName',
    'landlordPhone',
    'landlordBirthDate',
    'landlordAddress',
    'landlordIdentity',
    'landlordIdentityDate',
    'landlordIdentityPlace',
    'tenantName',
    'tenantPhone',
    'tenantBirthDate',
    'tenantIdentity',
    'tenantIdentityDate',
    'tenantIdentityPlace',
    'tenantAddress',
    'tenantCurrentAddress',
    'occupantCount',
    'blankValues',
  ],
  3: [
    'leaseStartDate',
    'leaseEndDate',
    'contractDate',
    'rent',
    'deposit',
    'paymentDay',
    'paymentMethod',
    'paymentCycle',
    'firstPaymentDate',
    'electricityPrice',
    'waterPrice',
    'waterUnit',
    'internetPrice',
    'servicePrice',
    'rentalScope',
    'includedEquipment',
  ],
  4: ['terms', 'reviewed'],
};

const OPTIONAL_DATE_FIELDS = [
  'contractDate',
  'landlordBirthDate',
  'landlordIdentityDate',
  'tenantBirthDate',
  'tenantIdentityDate',
] as const;

const OPTIONAL_MONEY_FIELDS = [
  'electricityPrice',
  'waterPrice',
  'internetPrice',
  'servicePrice',
] as const;

export function contractTodayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function addMonthsIso(isoDate: string, months: number): string {
  if (!isValidIsoDate(isoDate)) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(d, maxDay);
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(
    clampedDay
  ).padStart(2, '0')}`;
}

function toDigitString(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return '';
  return String(Math.round(value));
}

export function createContractWizardDraft(params: {
  room: HostRoom;
  roomType?: HostRoomType | null;
  user?: { fullName?: string | null; phoneNumber?: string | null } | null;
  currentTenancy?: RoomTenancy | null;
  defaultTemplate?: ContractTemplateItem | null;
  today?: string;
}): ContractWizardDraft {
  const { room, roomType, user, currentTenancy, defaultTemplate } = params;
  const today = params.today || contractTodayIso();
  const primary = currentTenancy?.occupants.find(p => p.primaryTenant) ?? currentTenancy?.occupants[0];
  const activeCount = currentTenancy
    ? currentTenancy.occupants.filter(p => !p.leftOn).length
    : 0;

  const startDate =
    currentTenancy?.startDate ||
    (room.status === 'OCCUPIED' && room.leaseStartDate ? room.leaseStartDate : today);
  const endDate =
    currentTenancy?.endDate ||
    (room.status === 'OCCUPIED' && room.leaseEndDate
      ? room.leaseEndDate
      : addMonthsIso(startDate, 12));

  const effectiveRent =
    currentTenancy?.monthlyRent ?? room.customPrice ?? room.price ?? roomType?.price ?? null;
  const effectiveDeposit =
    currentTenancy?.deposit ?? room.deposit ?? roomType?.deposit ?? effectiveRent ?? 0;

  const area = room.areaSqm ?? roomType?.areaSqm ?? null;
  const amenities = room.amenities ?? roomType?.amenities ?? [];
  const equipment = amenities.map(key => roomAmenityLabel(key)).join(', ');

  return {
    roomId: room.roomId,
    propertyId: room.propertyId,
    tenancyKey: currentTenancy?.key ?? null,
    template: (defaultTemplate?.id as ContractTemplateId) || 'BASIC',
    sourceMode: 'template',
    leaseStartDate: startDate,
    leaseEndDate: endDate,
    contractDate: today,
    landlordName: user?.fullName?.trim() || '',
    landlordPhone: user?.phoneNumber?.trim() || '',
    landlordBirthDate: '',
    landlordAddress: '',
    landlordIdentity: '',
    landlordIdentityDate: '',
    landlordIdentityPlace: '',
    tenantName: primary?.name?.trim() || '',
    tenantPhone: primary?.phone?.trim() || '',
    tenantBirthDate: '',
    tenantIdentity: '',
    tenantIdentityDate: '',
    tenantIdentityPlace: '',
    tenantAddress: '',
    tenantCurrentAddress: '',
    occupantCount: activeCount > 0 ? String(activeCount) : '',
    rent: toDigitString(effectiveRent),
    deposit: toDigitString(effectiveDeposit),
    paymentDay: '5',
    paymentMethod: 'Chuyển khoản hoặc tiền mặt',
    paymentCycle: '1 tháng/lần',
    firstPaymentDate: '',
    electricityPrice: toDigitString(roomType?.electricityPrice),
    waterPrice: toDigitString(roomType?.waterPrice),
    waterUnit: 'người',
    internetPrice: toDigitString(roomType?.internetPrice),
    servicePrice: toDigitString(roomType?.servicePrice),
    rentalScope: area != null ? `${String(area).replace('.', ',')} m²` : '',
    includedEquipment: equipment,
    terms: defaultTemplate?.terms || '',
    sourceName: '',
    fullScannedTranscript: '',
    scanFullDocument: false,
    blankValues: {},
    reviewed: false,
  };
}

export function findContractBlanks(terms: string): ContractBlankMatch[] {
  const pattern = /\.(?:[ \t]*\.){2,}|[…‥]+|[_＿]{2,}/g;
  const fieldLabel =
    /(?:tên|ông\s*[/]\s*bà|cccd|cmnd|điện thoại|địa chỉ|thường trú|nơi cấp|ngày cấp|ngày sinh|chỗ ở|tiền thuê|tiền cọc|đặt cọc|diện tích|thiết bị|số người|thanh toán)[^:\n]{0,50}:[ \t]*$/iu;
  const occurrences = new Map<string, number>();

  return (terms || '').split('\n').flatMap((line, index) => {
    const matches = Array.from(line.matchAll(pattern)).map(m => ({
      token: m[0],
      index: m.index ?? 0,
    }));
    if (fieldLabel.test(line) && matches.length === 0) {
      matches.push({ token: '', index: line.trimEnd().length });
    }
    const occ = (occurrences.get(line) || 0) + 1;
    if (matches.length > 0) occurrences.set(line, occ);
    return matches.map((m, position) => ({
      key: JSON.stringify([line, occ, position]),
      line: index,
      start: m.index,
      token: m.token,
      context: line,
      position: position + 1,
      total: matches.length,
    }));
  });
}

export function applyContractBlanks(terms: string, values?: Record<string, string>): string {
  if (!values || Object.keys(values).length === 0) return terms || '';
  const lines = (terms || '').split('\n');
  for (const blank of findContractBlanks(terms).reverse()) {
    const val = values[blank.key]?.trim();
    if (!val) continue;
    const line = lines[blank.line];
    lines[blank.line] =
      line.slice(0, blank.start) +
      (blank.token ? '' : ' ') +
      val +
      line.slice(blank.start + blank.token.length);
  }
  return lines.join('\n');
}

export function splitSystemTermsClauses(terms: string): ParsedTermClause[] | null {
  if (typeof terms !== 'string' || !terms.trim()) return null;
  const blocks = terms
    .trim()
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}(?=(?:\d+\.\s+|ĐIỀU\s+\d+:\s+))/i);
  if (blocks.length < 2) return null;
  const sections: ParsedTermClause[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const heading = lines[0]?.trim() || '';
    const match = heading.match(/^(?:ĐIỀU\s+)?(\d+)[.:]\s+(.+)$/i);
    if (!match) return null;
    sections.push({
      index: match[1],
      title: match[2].trim(),
      heading,
      body: lines.slice(1).join('\n'),
    });
  }
  return sections;
}

export function joinSystemTermsClauses(clauses: readonly ParsedTermClause[]): string {
  return clauses
    .map(clause => {
      const body = (clause.body || '').replace(/^\n+/, '');
      return body ? `${clause.heading}\n${body}` : clause.heading;
    })
    .join('\n\n');
}

export function validateContractWizardDraft(
  draft: ContractWizardDraft,
  options?: {
    currentTenancy?: RoomTenancy | null;
    history?: readonly RoomTenancy[];
  }
): Record<string, string> {
  const errors: Record<string, string> = {};
  const scanSelected = draft.sourceMode === 'scan';
  const scanned = draft.template === 'OWNER_SCAN';

  if (scanSelected !== scanned || (!scanned && !draft.terms.trim())) {
    errors.source = scanSelected
      ? 'Hãy quét, đối chiếu và áp dụng mẫu hợp đồng của bạn để tiếp tục.'
      : 'Chọn một mẫu hợp đồng hệ thống để tiếp tục.';
  }

  for (const field of ['landlordName', 'tenantName'] as const) {
    const val = draft[field].trim();
    if (!val || val.length > 150) {
      errors[field] = 'Nhập họ tên, tối đa 150 ký tự.';
    }
  }
  for (const field of ['landlordPhone', 'tenantPhone'] as const) {
    const val = draft[field].trim();
    if (!/^[+0-9 ()-]{8,20}$/.test(val)) {
      errors[field] = 'Nhập số điện thoại hợp lệ từ 8 đến 20 ký tự.';
    }
  }

  // Match backend RoomTenancyService.attach primary tenant consistency guard
  if (options?.currentTenancy && !errors.tenantName && !errors.tenantPhone) {
    const primary =
      options.currentTenancy.occupants.find(p => p.primaryTenant) ??
      options.currentTenancy.occupants[0];
    if (primary) {
      if (primary.name.trim().toLowerCase() !== draft.tenantName.trim().toLowerCase()) {
        errors.tenantName = `Họ tên Bên B cần khớp với người thuê chính của đợt thuê (${primary.name}).`;
      }
      if (
        normalizePhoneDigits(primary.phone) !== normalizePhoneDigits(draft.tenantPhone)
      ) {
        errors.tenantPhone = `Số điện thoại Bên B cần khớp với hồ sơ đợt thuê (${primary.phone || 'chưa rõ'}).`;
      }
    }
  }

  if (draft.landlordIdentity.length > 30) errors.landlordIdentity = 'Tối đa 30 ký tự.';
  if (draft.tenantIdentity.length > 30) errors.tenantIdentity = 'Tối đa 30 ký tự.';
  if (draft.landlordAddress.length > 300) errors.landlordAddress = 'Tối đa 300 ký tự.';
  if (draft.tenantAddress.length > 300) errors.tenantAddress = 'Tối đa 300 ký tự.';
  if (draft.landlordIdentityPlace.length > 150) errors.landlordIdentityPlace = 'Tối đa 150 ký tự.';
  if (draft.tenantIdentityPlace.length > 150) errors.tenantIdentityPlace = 'Tối đa 150 ký tự.';
  if (draft.paymentMethod.length > 200) errors.paymentMethod = 'Tối đa 200 ký tự.';

  if (!isValidIsoDate(draft.leaseStartDate)) {
    errors.leaseStartDate = 'Chọn ngày bắt đầu thuê hợp lệ.';
  }
  if (!isValidIsoDate(draft.leaseEndDate)) {
    errors.leaseEndDate = 'Chọn ngày kết thúc thuê hợp lệ.';
  } else if (
    isValidIsoDate(draft.leaseStartDate) &&
    draft.leaseEndDate < draft.leaseStartDate
  ) {
    errors.leaseEndDate = 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu thuê.';
  }

  // Overlap check against closed historical tenancies when creating a brand-new tenancy
  if (
    !options?.currentTenancy &&
    options?.history?.length &&
    !errors.leaseStartDate &&
    !errors.leaseEndDate
  ) {
    const overlapping = options.history.find(h => {
      const end = h.closedDate || h.endDate;
      return (
        isValidIsoDate(h.startDate) &&
        isValidIsoDate(end) &&
        draft.leaseStartDate < end &&
        draft.leaseEndDate > h.startDate
      );
    });
    if (overlapping) {
      errors.leaseStartDate = `Khoảng ngày thuê đang chồng lấn với đợt thuê trước (${overlapping.startDate} – ${
        overlapping.closedDate || overlapping.endDate
      }).`;
    }
  }

  const isHouse = draft.template === HOUSE_RENTAL_TEMPLATE;
  if (!isHouse) {
    for (const field of OPTIONAL_DATE_FIELDS) {
      const raw = draft[field].trim();
      if (raw && !isValidIsoDate(raw)) {
        errors[field] = 'Chọn ngày hợp lệ (YYYY-MM-DD).';
      }
    }
  }

  for (const field of ['rent', 'deposit'] as const) {
    const raw = draft[field].trim();
    if (!/^\d{1,10}$/.test(raw) || Number(raw) < (field === 'rent' ? 1 : 0)) {
      errors[field] =
        field === 'rent'
          ? 'Nhập tiền thuê nguyên lớn hơn 0, tối đa 9.999.999.999 đ.'
          : 'Nhập tiền cọc nguyên từ 0 đến 9.999.999.999 đ.';
    }
  }

  for (const field of OPTIONAL_MONEY_FIELDS) {
    const raw = draft[field].trim();
    if (raw && !/^\d{1,9}$/.test(raw)) {
      errors[field] = 'Nhập số tiền nguyên từ 0 đến 999.999.999 đ.';
    }
  }

  if (!/^([1-9]|1\d|2[0-8])$/.test(draft.paymentDay.trim())) {
    errors.paymentDay = 'Chọn ngày thanh toán từ 1 đến 28 hằng tháng.';
  }

  if (isHouse) {
    if (draft.rentalScope.length > 300) errors.rentalScope = 'Tối đa 300 ký tự.';
    if (draft.includedEquipment.length > 2000) errors.includedEquipment = 'Tối đa 2.000 ký tự.';
    if (draft.tenantCurrentAddress.length > 300) errors.tenantCurrentAddress = 'Tối đa 300 ký tự.';
    if (draft.paymentCycle.length > 100) errors.paymentCycle = 'Tối đa 100 ký tự.';
    if (draft.occupantCount.trim() && !/^[1-9]\d{0,8}$/.test(draft.occupantCount.trim())) {
      errors.occupantCount = 'Nhập số người ở là số nguyên dương.';
    }
    if (draft.firstPaymentDate.trim() && !isValidIsoDate(draft.firstPaymentDate.trim())) {
      errors.firstPaymentDate = 'Chọn ngày thanh toán lần đầu hợp lệ.';
    }
  }

  const filledTerms = applyContractBlanks(draft.terms, draft.blankValues);
  if (!filledTerms.trim() || filledTerms.length > 30000) {
    errors.terms = 'Nội dung điều khoản không được rỗng và tối đa 30.000 ký tự.';
    if (Object.keys(draft.blankValues).length > 0 && filledTerms.length > 30000) {
      errors.blankValues = 'Rút gọn nội dung điền chỗ trống để hợp đồng không vượt 30.000 ký tự.';
    }
  }

  if (!draft.reviewed) {
    errors.reviewed = 'Vui lòng đánh dấu xác nhận đã kiểm tra thông tin và đọc bản hợp đồng.';
  }

  return errors;
}

export function validateContractWizardStep(
  step: ContractWizardStep,
  draft: ContractWizardDraft,
  options?: {
    currentTenancy?: RoomTenancy | null;
    history?: readonly RoomTenancy[];
  }
): Record<string, string> {
  const all = validateContractWizardDraft(draft, options);
  const allowed = new Set(STEP_FIELDS[step]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

export function firstContractErrorStep(errors: Record<string, string>): ContractWizardStep | null {
  for (const step of [1, 2, 3, 4] as const) {
    if (STEP_FIELDS[step].some(field => Boolean(errors[field]))) {
      return step;
    }
  }
  return null;
}

const optText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed || null;
};

const optInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
};

export function buildContractCreatePayload(draft: ContractWizardDraft): ContractCreatePayload {
  const filledTerms = applyContractBlanks(draft.terms, draft.blankValues);
  const isHouse = draft.template === HOUSE_RENTAL_TEMPLATE;
  const isScan = draft.template === 'OWNER_SCAN';

  return {
    roomId: draft.roomId,
    template: draft.template,
    landlordName: draft.landlordName.trim(),
    landlordPhone: draft.landlordPhone.trim(),
    tenantName: draft.tenantName.trim(),
    tenantPhone: draft.tenantPhone.trim(),
    tenantIdentity: draft.tenantIdentity.trim(),
    tenantAddress: draft.tenantAddress.trim(),
    rent: Number(draft.rent.trim()),
    deposit: Number(draft.deposit.trim()),
    paymentDay: Number(draft.paymentDay.trim()),
    terms: isScan ? filledTerms : filledTerms.trim(),
    sourceName: draft.sourceName.trim(),
    reviewed: Boolean(draft.reviewed),
    contractDate: isHouse ? contractTodayIso() : optText(draft.contractDate),
    landlordBirthDate: optText(draft.landlordBirthDate),
    landlordAddress: optText(draft.landlordAddress),
    landlordIdentity: optText(draft.landlordIdentity),
    landlordIdentityDate: optText(draft.landlordIdentityDate),
    landlordIdentityPlace: optText(draft.landlordIdentityPlace),
    tenantBirthDate: optText(draft.tenantBirthDate),
    tenantIdentityDate: optText(draft.tenantIdentityDate),
    tenantIdentityPlace: optText(draft.tenantIdentityPlace),
    paymentMethod: optText(draft.paymentMethod),
    electricityPrice: optInt(draft.electricityPrice),
    waterPrice: optInt(draft.waterPrice),
    waterUnit: draft.waterUnit,
    internetPrice: optInt(draft.internetPrice),
    servicePrice: optInt(draft.servicePrice),
    fullScannedTranscript: isScan ? draft.fullScannedTranscript || null : null,
    scanFullDocument: isScan && Boolean(draft.scanFullDocument),
    ...(isHouse
      ? {
          rentalScope: optText(draft.rentalScope),
          includedEquipment: optText(draft.includedEquipment),
          occupantCount: optInt(draft.occupantCount),
          firstPaymentDate: optText(draft.firstPaymentDate),
          tenantCurrentAddress: optText(draft.tenantCurrentAddress),
          paymentCycle: optText(draft.paymentCycle),
        }
      : {}),
  };
}

/**
 * Builds an in-memory RentalContractRecord for full-screen document preview
 * inside the wizard, preserving 100% of legal clauses and current form values.
 */
export function buildContractPreviewRecord(
  draft: ContractWizardDraft,
  context: {
    roomNumber: string;
    propertyName?: string | null;
    propertyAddress?: string | null;
  }
): RentalContractRecord {
  const details: RentalContractFullDetails = {
    roomId: draft.roomId,
    template: draft.template,
    contractDate:
      draft.template === HOUSE_RENTAL_TEMPLATE
        ? contractTodayIso()
        : draft.contractDate.trim() || null,
    landlordName: draft.landlordName.trim(),
    landlordBirthDate: draft.landlordBirthDate.trim() || null,
    landlordAddress: draft.landlordAddress.trim() || null,
    landlordIdentity: draft.landlordIdentity.trim() || null,
    landlordIdentityDate: draft.landlordIdentityDate.trim() || null,
    landlordIdentityPlace: draft.landlordIdentityPlace.trim() || null,
    landlordPhone: draft.landlordPhone.trim(),
    tenantName: draft.tenantName.trim(),
    tenantBirthDate: draft.tenantBirthDate.trim() || null,
    tenantAddress: draft.tenantAddress.trim() || null,
    tenantIdentity: draft.tenantIdentity.trim() || null,
    tenantIdentityDate: draft.tenantIdentityDate.trim() || null,
    tenantIdentityPlace: draft.tenantIdentityPlace.trim() || null,
    tenantPhone: draft.tenantPhone.trim(),
    rent: draft.rent.trim() ? Number(draft.rent.trim()) : null,
    deposit: draft.deposit.trim() ? Number(draft.deposit.trim()) : null,
    paymentDay: draft.paymentDay.trim() ? Number(draft.paymentDay.trim()) : null,
    paymentMethod: draft.paymentMethod.trim() || null,
    electricityPrice: draft.electricityPrice.trim() ? Number(draft.electricityPrice.trim()) : null,
    waterPrice: draft.waterPrice.trim() ? Number(draft.waterPrice.trim()) : null,
    waterUnit: draft.waterUnit,
    internetPrice: draft.internetPrice.trim() ? Number(draft.internetPrice.trim()) : null,
    servicePrice: draft.servicePrice.trim() ? Number(draft.servicePrice.trim()) : null,
    terms: draft.terms,
    sourceName: draft.sourceName.trim() || null,
    fullScannedTranscript: draft.fullScannedTranscript || null,
    scanFullDocument: draft.template === 'OWNER_SCAN' && draft.scanFullDocument,
    blankValues: draft.blankValues,
    rentalScope: draft.rentalScope.trim() || null,
    includedEquipment: draft.includedEquipment.trim() || null,
    occupantCount: draft.occupantCount.trim() ? Number(draft.occupantCount.trim()) : null,
    firstPaymentDate: draft.firstPaymentDate.trim() || null,
    tenantCurrentAddress: draft.tenantCurrentAddress.trim() || null,
    paymentCycle: draft.paymentCycle.trim() || null,
    reviewed: draft.reviewed,
  };

  return {
    id: 0,
    status: 'ACTIVE',
    propertyName: context.propertyName ?? null,
    propertyAddress: context.propertyAddress ?? null,
    roomNumber: context.roomNumber,
    startDate: draft.leaseStartDate || null,
    endDate: draft.leaseEndDate || null,
    createdAt: null,
    closedAt: null,
    details,
    documentHash: null,
    ownerSignature: null,
    tenantSignature: null,
  };
}

export function validateSignatureSubmission(input: {
  method: 'TYPED' | 'DRAWN';
  confirmed: boolean;
  documentHash?: string | null;
  strokes: readonly (readonly SignaturePoint[])[];
}): string | null {
  if (!input.documentHash || !/^[a-f0-9]{64}$/.test(input.documentHash)) {
    return 'Thiếu mã xác thực phiên bản hợp đồng từ máy chủ. Vui lòng tải lại hợp đồng.';
  }
  if (!input.confirmed) {
    return 'Vui lòng xác nhận đã đọc nội dung và đồng ý ký hợp đồng.';
  }
  if (input.method === 'DRAWN') {
    if (input.strokes.length === 0) {
      return 'Vui lòng vẽ chữ ký trong khung trước khi xác nhận.';
    }
    if (input.strokes.length > SIGNATURE_MAX_STROKES) {
      return `Chữ ký chỉ hỗ trợ tối đa ${SIGNATURE_MAX_STROKES} nét vẽ.`;
    }
    const hasInk = input.strokes.some(
      stroke =>
        stroke.length >= 2 &&
        stroke.some(pt => pt.x !== stroke[0].x || pt.y !== stroke[0].y)
    );
    if (!hasInk) {
      return 'Vui lòng vẽ ít nhất một nét chữ ký rõ ràng trong khung.';
    }
    for (const stroke of input.strokes) {
      if (stroke.length < 2 || stroke.length > SIGNATURE_MAX_POINTS_PER_STROKE) {
        return 'Nét vẽ chữ ký không hợp lệ. Vui lòng xóa và vẽ lại.';
      }
      for (const pt of stroke) {
        if (
          !Number.isInteger(pt.x) ||
          !Number.isInteger(pt.y) ||
          pt.x < 0 ||
          pt.x > SIGNATURE_CANVAS_WIDTH ||
          pt.y < 0 ||
          pt.y > SIGNATURE_CANVAS_HEIGHT
        ) {
          return 'Tọa độ nét ký vượt khung hợp lệ. Vui lòng vẽ lại.';
        }
      }
    }
  } else if (input.strokes.length > 0) {
    return 'Chữ ký họ tên không đi kèm nét vẽ.';
  }
  return null;
}

export function validateScanUploadFiles(
  files: readonly { fileName?: string; mimeType?: string; fileSize?: number }[]
): string | null {
  if (files.length === 0 || files.length > SCAN_MAX_FILES) {
    return `Chọn từ 1 đến ${SCAN_MAX_FILES} ảnh JPG/PNG hoặc PDF theo thứ tự trang.`;
  }
  let total = 0;
  for (const f of files) {
    if (!f.mimeType || !SCAN_ALLOWED_MIMES.has(f.mimeType)) {
      return 'Chỉ hỗ trợ ảnh JPG, PNG hoặc tệp PDF.';
    }
    if (!f.fileSize || f.fileSize <= 0 || f.fileSize > SCAN_MAX_FILE_BYTES) {
      return 'Mỗi tệp phải khác rỗng và tối đa 5 MB.';
    }
    total += f.fileSize;
  }
  if (total > SCAN_MAX_TOTAL_BYTES) {
    return 'Tổng dung lượng các tệp không được vượt quá 10 MB.';
  }
  return null;
}

export function serializeContractWizardDraft(
  step: ContractWizardStep,
  draft: ContractWizardDraft,
  savedAt = new Date().toISOString()
): string {
  const payload: PersistedContractWizardDraft = {
    version: 1,
    savedAt,
    step,
    draft: { ...draft, reviewed: false },
  };
  return JSON.stringify(payload);
}

export function parseContractWizardDraft(
  raw: string | null | undefined,
  expectedRoomId: number,
  fallback: ContractWizardDraft
): PersistedContractWizardDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedContractWizardDraft> | null;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !parsed.draft ||
      Number(parsed.draft.roomId) !== expectedRoomId
    ) {
      return null;
    }
    const step: ContractWizardStep =
      parsed.step === 2 || parsed.step === 3 || parsed.step === 4 ? parsed.step : 1;
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      step,
      draft: {
        ...fallback,
        ...parsed.draft,
        roomId: expectedRoomId,
        blankValues:
          parsed.draft.blankValues && typeof parsed.draft.blankValues === 'object'
            ? parsed.draft.blankValues
            : {},
        reviewed: false,
      },
    };
  } catch {
    return null;
  }
}
