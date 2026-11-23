import { HostError, hostRequest, type HostRoom } from './host';
import type { BillingLedger } from './room-billing';

export interface RoomOccupant {
  id: number | null;
  name: string;
  phone: string | null;
  joinedOn: string;
  leftOn: string | null;
  primaryTenant: boolean;
}

export interface RoomTenancy {
  key: string;
  startDate: string;
  endDate: string;
  closedDate: string | null;
  monthlyRent: number | null;
  deposit: number | null;
  contractId: number | null;
  landlordSigned: boolean;
  tenantSigned: boolean;
  occupants: RoomOccupant[];
}

export interface RoomTenancyProfile {
  today: string;
  current: RoomTenancy | null;
  history: RoomTenancy[];
}

export interface RoomTenancyMutationResult {
  room?: HostRoom;
  profile: RoomTenancyProfile;
}

export interface RoomTenancyDebtSummary {
  unpaidBillCount: number;
  totalOutstandingVnd: number;
  hasOverdue: boolean;
  checkedMonth: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^[+0-9 ().-]{8,20}$/;

export function isValidIsoDate(value?: string | null): boolean {
  const raw = String(value ?? '').trim();
  if (!ISO_DATE_RE.test(raw)) return false;
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function normalizePhoneDigits(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function occupantInitials(name?: string | null): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'NT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function tenancyContractStatusMeta(tenancy: Pick<
  RoomTenancy,
  'contractId' | 'landlordSigned' | 'tenantSigned'
>): {
  hasContract: boolean;
  label: string;
  tone: 'success' | 'warning' | 'neutral';
} {
  if (!tenancy.contractId) {
    return { hasContract: false, label: 'Chưa có hợp đồng', tone: 'neutral' };
  }
  if (tenancy.landlordSigned && tenancy.tenantSigned) {
    return { hasContract: true, label: 'Hai bên đã ký (2/2)', tone: 'success' };
  }
  if (tenancy.landlordSigned) {
    return { hasContract: true, label: 'Chủ trọ đã ký · Chờ bên thuê', tone: 'warning' };
  }
  if (tenancy.tenantSigned) {
    return { hasContract: true, label: 'Bên thuê đã ký · Chờ chủ trọ', tone: 'warning' };
  }
  return { hasContract: true, label: 'Chưa ký (0/2)', tone: 'warning' };
}

export function splitTenancyOccupants(tenancy: Pick<RoomTenancy, 'occupants'>): {
  primary: RoomOccupant | null;
  active: RoomOccupant[];
  former: RoomOccupant[];
} {
  const list = Array.isArray(tenancy.occupants) ? tenancy.occupants : [];
  const active = list.filter(person => !person.leftOn);
  const former = list.filter(person => Boolean(person.leftOn));
  const primary = list.find(person => person.primaryTenant) ?? list[0] ?? null;
  return { primary, active, former };
}

export function defaultOccupantJoinDate(
  today: string,
  lease: Pick<RoomTenancy, 'startDate' | 'endDate'>
): string {
  if (!isValidIsoDate(today)) return lease.startDate;
  if (today < lease.startDate) return lease.startDate;
  if (today > lease.endDate) return lease.endDate;
  return today;
}

export function earliestTenancyCloseDate(
  today: string,
  lease: Pick<RoomTenancy, 'startDate' | 'occupants'>
): string {
  let min = lease.startDate <= today ? lease.startDate : today;
  for (const person of lease.occupants || []) {
    if (person.leftOn && person.leftOn > min && person.leftOn <= today) {
      min = person.leftOn;
    }
  }
  return min;
}

export function validateStartTenancyInput(input: {
  name: string;
  phone: string;
  startDate: string;
  endDate: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (name.length < 2 || name.length > 150) {
    errors.name = 'Nhập họ tên người thuê chính từ 2 đến 150 ký tự.';
  }
  if (!PHONE_RE.test(phone) || normalizePhoneDigits(phone).length < 8) {
    errors.phone = 'Nhập số điện thoại hợp lệ (từ 8 đến 20 ký tự).';
  }
  if (!isValidIsoDate(input.startDate)) {
    errors.startDate = 'Chọn ngày bắt đầu thuê hợp lệ.';
  }
  if (!isValidIsoDate(input.endDate)) {
    errors.endDate = 'Chọn ngày dự kiến kết thúc hợp lệ.';
  } else if (isValidIsoDate(input.startDate) && input.endDate < input.startDate) {
    errors.endDate = 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu thuê.';
  }
  return errors;
}

export function validateAddOccupantInput(
  input: { name: string; phone: string; joinedOn: string },
  lease: Pick<RoomTenancy, 'startDate' | 'endDate' | 'occupants'>
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (name.length < 2 || name.length > 150) {
    errors.name = 'Nhập họ tên người ở cùng từ 2 đến 150 ký tự.';
  }
  if (phone && (!PHONE_RE.test(phone) || normalizePhoneDigits(phone).length < 8)) {
    errors.phone = 'Số điện thoại chưa hợp lệ (8–20 ký tự) hoặc để trống.';
  }
  if (!isValidIsoDate(input.joinedOn)) {
    errors.joinedOn = 'Chọn ngày chuyển vào hợp lệ.';
  } else if (input.joinedOn < lease.startDate || input.joinedOn > lease.endDate) {
    errors.joinedOn = 'Ngày chuyển vào phải nằm trong kỳ thuê hiện tại.';
  }

  if (!errors.name && !errors.phone) {
    const targetDigits = phone ? normalizePhoneDigits(phone) : '';
    const duplicated = (lease.occupants || []).some(
      person =>
        !person.leftOn &&
        person.name.trim().toLowerCase() === name.toLowerCase() &&
        normalizePhoneDigits(person.phone) === targetDigits
    );
    if (duplicated) {
      errors.name = 'Người này đã có trong danh sách đang ở của đợt thuê.';
    }
  }
  return errors;
}

export function validateOccupantLeaveDate(
  date: string,
  person: Pick<RoomOccupant, 'joinedOn'>,
  today: string
): string | null {
  if (!isValidIsoDate(date)) return 'Chọn ngày rời phòng hợp lệ.';
  if (date < person.joinedOn || date > today) {
    return 'Chọn ngày rời phòng từ ngày vào ở đến hôm nay.';
  }
  return null;
}

export function validateCloseTenancyDate(
  date: string,
  lease: Pick<RoomTenancy, 'startDate' | 'occupants'>,
  today: string
): string | null {
  if (!isValidIsoDate(date)) return 'Chọn ngày trả phòng thực tế hợp lệ.';
  const earliest = earliestTenancyCloseDate(today, lease);
  if (date > today) return 'Ngày trả phòng không được lớn hơn hôm nay.';
  if (date < earliest) {
    return 'Ngày trả phòng phải từ ngày bắt đầu thuê (và sau ngày rời phòng gần nhất) đến hôm nay.';
  }
  return null;
}

/**
 * Summarizes unpaid/partial bills for a specific room from the billing ledger
 * so the End Tenancy confirmation sheet displays accurate debt obligations.
 */
export function summarizeRoomOutstandingDebt(
  ledger: Pick<BillingLedger, 'month' | 'bills' | 'earlierDebt'> | null | undefined,
  roomId: number
): RoomTenancyDebtSummary | null {
  if (!ledger) return null;
  const seen = new Set<number>();
  let unpaidBillCount = 0;
  let totalOutstandingVnd = 0;
  let hasOverdue = false;

  const inspectList = [...(ledger.bills || []), ...(ledger.earlierDebt || [])];
  for (const bill of inspectList) {
    if (bill.roomId !== roomId || seen.has(bill.id)) continue;
    seen.add(bill.id);
    if (bill.status === 'DRAFT' || bill.status === 'PAID') continue;
    const outstanding = Number(bill.outstanding ?? 0);
    if (Number.isFinite(outstanding) && outstanding > 0) {
      unpaidBillCount += 1;
      totalOutstandingVnd += Math.round(outstanding);
      if (bill.overdue) hasOverdue = true;
    }
  }

  return {
    unpaidBillCount,
    totalOutstandingVnd,
    hasOverdue,
    checkedMonth: ledger.month,
  };
}

function validateTenancyProfile(value: unknown): RoomTenancyProfile {
  const obj = value as Partial<RoomTenancyProfile> | null | undefined;
  if (
    !obj ||
    typeof obj.today !== 'string' ||
    !Array.isArray(obj.history) ||
    (obj.current != null && typeof obj.current.key !== 'string')
  ) {
    throw new HostError('Dữ liệu hồ sơ đợt thuê từ máy chủ không hợp lệ.', 502);
  }
  return obj as RoomTenancyProfile;
}

export async function fetchRoomTenancyProfile(
  roomId: number,
  token: string,
  signal: AbortSignal
): Promise<RoomTenancyProfile> {
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    throw new HostError('Mã phòng không hợp lệ.', 400);
  }
  const data = await hostRequest<RoomTenancyProfile>(
    `/host/rooms/${roomId}/tenancies`,
    token,
    signal
  );
  return validateTenancyProfile(data);
}

export async function startRoomTenancy(
  roomId: number,
  payload: { name: string; phone: string; startDate: string; endDate: string },
  token: string,
  signal: AbortSignal
): Promise<RoomTenancyMutationResult> {
  const data = await hostRequest<{ room?: HostRoom; profile?: RoomTenancyProfile }>(
    `/host/rooms/${roomId}/tenancies`,
    token,
    signal,
    payload,
    'POST'
  );
  const profile = validateTenancyProfile(data?.profile ?? data);
  return { room: data?.room, profile };
}

export async function addRoomOccupant(
  roomId: number,
  tenancyKey: string,
  payload: { name: string; phone: string | null; joinedOn: string },
  token: string,
  signal: AbortSignal
): Promise<RoomTenancyProfile> {
  const data = await hostRequest<RoomTenancyProfile>(
    `/host/rooms/${roomId}/tenancies/${encodeURIComponent(tenancyKey)}/occupants`,
    token,
    signal,
    payload,
    'POST'
  );
  return validateTenancyProfile(data);
}

export async function markRoomOccupantLeft(
  roomId: number,
  tenancyKey: string,
  occupantId: number,
  date: string,
  token: string,
  signal: AbortSignal
): Promise<RoomTenancyProfile> {
  const data = await hostRequest<RoomTenancyProfile>(
    `/host/rooms/${roomId}/tenancies/${encodeURIComponent(tenancyKey)}/occupants/${occupantId}/leave`,
    token,
    signal,
    { date },
    'POST'
  );
  return validateTenancyProfile(data);
}

export async function closeRoomTenancy(
  roomId: number,
  tenancyKey: string,
  date: string,
  token: string,
  signal: AbortSignal
): Promise<RoomTenancyMutationResult> {
  const data = await hostRequest<{ room?: HostRoom; profile?: RoomTenancyProfile }>(
    `/host/rooms/${roomId}/tenancies/${encodeURIComponent(tenancyKey)}/close`,
    token,
    signal,
    { date },
    'POST'
  );
  const profile = validateTenancyProfile(data?.profile ?? data);
  return { room: data?.room, profile };
}
