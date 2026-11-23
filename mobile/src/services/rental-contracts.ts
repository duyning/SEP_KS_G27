import { getApiBase } from './accommodations';
import { HostError, hostRequest } from './host';

export const HOUSE_RENTAL_TEMPLATE = 'HOUSE_RENTAL';

export interface SignaturePoint {
  x: number;
  y: number;
}

export interface ContractSignatureView {
  name: string;
  signedAt: string;
  method: 'TYPED' | 'DRAWN' | string;
  strokes?: SignaturePoint[][];
}

export interface RentalContractFullDetails {
  roomId?: number;
  template?: string;
  contractDate?: string | null;
  landlordName?: string;
  landlordBirthDate?: string | null;
  landlordAddress?: string | null;
  landlordIdentity?: string | null;
  landlordIdentityDate?: string | null;
  landlordIdentityPlace?: string | null;
  landlordPhone?: string;
  tenantName?: string;
  tenantBirthDate?: string | null;
  tenantAddress?: string | null;
  tenantIdentity?: string | null;
  tenantIdentityDate?: string | null;
  tenantIdentityPlace?: string | null;
  tenantPhone?: string;
  rent?: number | null;
  deposit?: number | null;
  paymentDay?: number | null;
  paymentMethod?: string | null;
  electricityPrice?: number | null;
  waterPrice?: number | null;
  waterUnit?: string | null;
  internetPrice?: number | null;
  servicePrice?: number | null;
  terms: string;
  sourceName?: string | null;
  fullScannedTranscript?: string | null;
  scanFullDocument?: boolean;
  blankValues?: Record<string, string>;
  rentalScope?: string | null;
  includedEquipment?: string | null;
  occupantCount?: number | null;
  firstPaymentDate?: string | null;
  tenantCurrentAddress?: string | null;
  paymentCycle?: string | null;
  reviewed?: boolean;
}

export interface RentalContractRecord {
  id: number;
  status: 'ACTIVE' | 'CLOSED';
  propertyName?: string | null;
  propertyAddress?: string | null;
  roomNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  details: RentalContractFullDetails;
  documentHash?: string | null;
  ownerSignature?: ContractSignatureView | null;
  tenantSignature?: ContractSignatureView | null;
}

export interface SigningLinkResult {
  token: string;
  expiresAt: string;
}

export interface ActiveSigningInvitation {
  url: string;
  expiresAt: string;
}

export interface ContractTocItem {
  id: string;
  label: string;
}

export interface ContractManagementMeta {
  isActive: boolean;
  label: string;
}

export interface ContractSignatureProgress {
  signedCount: 0 | 1 | 2;
  ownerSigned: boolean;
  tenantSigned: boolean;
  summaryLabel: string;
  detailLabel: string;
  canInviteTenant: boolean;
  inviteDisabledReason: string | null;
  canOwnerSign: boolean;
  ownerSignDisabledReason: string | null;
}

/* -------------------------------------------------------------------------- */
/* Validators & Authenticated API Clients                                     */
/* -------------------------------------------------------------------------- */

function isValidSignature(value: unknown): value is ContractSignatureView {
  if (!value || typeof value !== 'object') return false;
  const sig = value as ContractSignatureView;
  return typeof sig.name === 'string' && typeof sig.signedAt === 'string';
}

export function validateRentalContractsList(value: unknown): RentalContractRecord[] {
  if (
    !Array.isArray(value) ||
    !value.every(item => {
      const c = item as RentalContractRecord;
      return (
        c &&
        Number.isSafeInteger(c.id) &&
        (c.status === 'ACTIVE' || c.status === 'CLOSED') &&
        c.details != null &&
        typeof c.details.terms === 'string' &&
        (c.ownerSignature == null || isValidSignature(c.ownerSignature)) &&
        (c.tenantSignature == null || isValidSignature(c.tenantSignature))
      );
    })
  ) {
    throw new HostError('Chưa tải được dữ liệu hợp đồng hợp lệ. Vui lòng thử lại.', 502);
  }
  return value as RentalContractRecord[];
}

export function validateSigningLinkResult(value: unknown): SigningLinkResult {
  if (!value || typeof value !== 'object') {
    throw new HostError('Phản hồi tạo liên kết ký không hợp lệ.', 502);
  }
  const obj = value as Partial<SigningLinkResult>;
  if (
    typeof obj.token !== 'string' ||
    !/^[A-Za-z0-9_-]{20,}$/.test(obj.token) ||
    typeof obj.expiresAt !== 'string' ||
    Number.isNaN(Date.parse(obj.expiresAt))
  ) {
    throw new HostError('Dữ liệu liên kết mời ký từ máy chủ không đầy đủ.', 502);
  }
  return { token: obj.token, expiresAt: obj.expiresAt };
}

export async function fetchRoomContractsFull(
  roomId: number,
  token: string,
  signal: AbortSignal
): Promise<RentalContractRecord[]> {
  if (!Number.isSafeInteger(roomId) || roomId < 1) {
    throw new HostError('Mã phòng không hợp lệ.', 400);
  }
  const result = await hostRequest<RentalContractRecord[]>(
    `/host/rental-contracts/rooms/${roomId}`,
    token,
    signal
  );
  return validateRentalContractsList(result);
}

export async function createContractSigningLink(
  contractId: number,
  token: string,
  signal: AbortSignal
): Promise<SigningLinkResult> {
  if (!Number.isSafeInteger(contractId) || contractId < 1) {
    throw new HostError('Mã hợp đồng không hợp lệ.', 400);
  }
  const result = await hostRequest<SigningLinkResult>(
    `/host/rental-contracts/${contractId}/signing-link`,
    token,
    signal,
    undefined,
    'POST'
  );
  return validateSigningLinkResult(result);
}

export async function signContractAsOwner(
  contractId: number,
  payload: {
    documentHash: string;
    method: 'TYPED' | 'DRAWN';
    confirmed: boolean;
    strokes: SignaturePoint[][];
  },
  token: string,
  signal: AbortSignal
): Promise<RentalContractRecord> {
  if (!Number.isSafeInteger(contractId) || contractId < 1) {
    throw new HostError('Mã hợp đồng không hợp lệ.', 400);
  }
  const result = await hostRequest<RentalContractRecord>(
    `/host/rental-contracts/${contractId}/signature`,
    token,
    signal,
    payload,
    'POST'
  );
  const validated = validateRentalContractsList([result]);
  return validated[0];
}

export function buildSigningUrl(token: string, webBaseOverride?: string): string {
  const configured = (webBaseOverride ?? process.env.EXPO_PUBLIC_WEB_URL ?? '').trim();
  let origin = configured.replace(/\/+$/, '');
  if (!origin) {
    try {
      origin = new URL(getApiBase()).origin;
    } catch {
      origin = '';
    }
  }
  return origin ? `${origin}/contracts/sign#${token}` : `/contracts/sign#${token}`;
}

export function isInvitationExpired(
  invitation: ActiveSigningInvitation | null,
  now = Date.now()
): boolean {
  if (!invitation) return false;
  const ts = Date.parse(invitation.expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts <= now;
}

/* -------------------------------------------------------------------------- */
/* Status & Formatting Helpers (Strictly Separating Management vs Signature)  */
/* -------------------------------------------------------------------------- */

export function contractTitle(contract: Pick<RentalContractRecord, 'details'>): string {
  return contract.details?.template === HOUSE_RENTAL_TEMPLATE
    ? 'Hợp đồng thuê nhà trọ'
    : 'Hợp đồng thuê phòng trọ';
}

export function contractManagementMeta(status: RentalContractRecord['status']): ContractManagementMeta {
  return status === 'ACTIVE'
    ? { isActive: true, label: 'Đang quản lý' }
    : { isActive: false, label: 'Đã kết thúc' };
}

export function evaluateSignatureProgress(
  contract: Pick<
    RentalContractRecord,
    'status' | 'ownerSignature' | 'tenantSignature' | 'documentHash' | 'details'
  >
): ContractSignatureProgress {
  const ownerSigned = Boolean(contract.ownerSignature);
  const tenantSigned = Boolean(contract.tenantSignature);
  const signedCount = ((ownerSigned ? 1 : 0) + (tenantSigned ? 1 : 0)) as 0 | 1 | 2;

  const summaryLabel =
    signedCount === 0
      ? '0/2 bên đã ký'
      : signedCount === 1
      ? '1/2 bên đã ký'
      : '2/2 bên đã ký';

  const detailLabel =
    signedCount === 0
      ? 'Chưa bên nào ký trên hệ thống'
      : ownerSigned && !tenantSigned
      ? 'Bên cho thuê đã ký · Chờ bên thuê ký'
      : !ownerSigned && tenantSigned
      ? 'Bên thuê đã ký · Chờ bên cho thuê ký'
      : 'Cả hai bên đã ghi nhận chữ ký trên hệ thống';

  const isActive = contract.status === 'ACTIVE';
  const hasTenantPhone = Boolean(contract.details?.tenantPhone?.trim());

  let canInviteTenant = true;
  let inviteDisabledReason: string | null = null;
  if (!isActive) {
    canInviteTenant = false;
    inviteDisabledReason = 'Hợp đồng đã kết thúc, không thể tạo lời mời ký thêm.';
  } else if (tenantSigned) {
    canInviteTenant = false;
    inviteDisabledReason = 'Bên thuê đã ký hợp đồng này.';
  } else if (!hasTenantPhone) {
    canInviteTenant = false;
    inviteDisabledReason = 'Hợp đồng chưa có số điện thoại bên thuê để xác thực người ký.';
  }

  let canOwnerSign = true;
  let ownerSignDisabledReason: string | null = null;
  if (!isActive) {
    canOwnerSign = false;
    ownerSignDisabledReason = 'Hợp đồng đã kết thúc, không thể ký thêm.';
  } else if (ownerSigned) {
    canOwnerSign = false;
    ownerSignDisabledReason = 'Bên cho thuê đã ký hợp đồng này.';
  } else if (!contract.documentHash) {
    canOwnerSign = false;
    ownerSignDisabledReason = 'Thiếu mã xác thực phiên bản hợp đồng từ máy chủ.';
  }

  return {
    signedCount,
    ownerSigned,
    tenantSigned,
    summaryLabel,
    detailLabel,
    canInviteTenant,
    inviteDisabledReason,
    canOwnerSign,
    ownerSignDisabledReason,
  };
}

export function formatContractIsoDate(value?: string | null): string | null {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-');
  return `${d}/${m}/${y}`;
}

export function formatVietnameseDateLong(value?: string | null): string | null {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-');
  return `ngày ${d} tháng ${m} năm ${y}`;
}

export function formatSigningTimestamp(iso?: string | null): string {
  if (!iso) return 'Chưa có thời gian';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

export function formatContractMoneyVnd(value?: number | string | null): string | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(num))} đ`;
}

/**
 * Masks sensitive phone digits for confirmation sheets without altering underlying contract data.
 */
export function maskPhoneForPreview(phone?: string | null): string {
  const clean = String(phone ?? '').trim();
  if (!clean) return 'Chưa có SĐT';
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}

/* -------------------------------------------------------------------------- */
/* Exact Port of Web Contract Model & Official HTML Document Renderer         */
/* -------------------------------------------------------------------------- */

interface ParsedTermSection {
  index: string;
  title: string;
  heading: string;
  body: string;
}

export function parseSystemTermsSections(terms: string): ParsedTermSection[] | null {
  if (typeof terms !== 'string' || !terms.trim()) return null;
  const blocks = terms
    .trim()
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}(?=(?:\d+\.\s+|ĐIỀU\s+\d+:\s+))/i);
  if (blocks.length < 2) return null;
  const sections: ParsedTermSection[] = [];
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

function fillContractBlanks(terms: string, values?: Record<string, string>): string {
  if (!values || Object.keys(values).length === 0) return terms || '';
  const pattern = /\.(?:[ \t]*\.){2,}|[…‥]+|[_＿]{2,}/g;
  const fieldLabel =
    /(?:tên|ông\s*[/]\s*bà|cccd|cmnd|điện thoại|địa chỉ|thường trú|nơi cấp|ngày cấp|ngày sinh|chỗ ở|tiền thuê|tiền cọc|đặt cọc|diện tích|thiết bị|số người|thanh toán)[^:\n]{0,50}:[ \t]*$/iu;
  const occurrences = new Map<string, number>();
  const lines = (terms || '').split('\n');

  interface BlankMatch {
    key: string;
    line: number;
    start: number;
    token: string;
  }

  const blanks: BlankMatch[] = [];
  lines.forEach((line, index) => {
    const matches = Array.from(line.matchAll(pattern)).map(m => ({
      token: m[0],
      index: m.index ?? 0,
    }));
    if (fieldLabel.test(line) && matches.length === 0) {
      matches.push({ token: '', index: line.trimEnd().length });
    }
    const occ = (occurrences.get(line) || 0) + 1;
    if (matches.length > 0) occurrences.set(line, occ);
    matches.forEach((m, position) => {
      blanks.push({
        key: JSON.stringify([line, occ, position]),
        line: index,
        start: m.index,
        token: m.token,
      });
    });
  });

  for (const blank of blanks.reverse()) {
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

interface UtilityLine {
  key: string;
  label: string;
  amount: number | null;
  unit: string;
  basis: string;
  display: string | null;
}

function resolveContractUtilities(details: RentalContractFullDetails): UtilityLine[] {
  const toAmount = (v: unknown): number | null =>
    v === null || v === undefined || v === '' || !Number.isFinite(Number(v))
      ? null
      : Number(v);
  const waterUnit =
    typeof details.waterUnit === 'string' && details.waterUnit.trim()
      ? details.waterUnit.trim()
      : 'người';

  const raw: Omit<UtilityLine, 'display'>[] = [
    {
      key: 'electricityPrice',
      label: 'Tiền điện',
      amount: toAmount(details.electricityPrice),
      unit: 'kWh',
      basis: 'tính theo chỉ số công tơ, thanh toán vào cuối các tháng',
    },
    {
      key: 'waterPrice',
      label: 'Tiền nước',
      amount: toAmount(details.waterPrice),
      unit: waterUnit,
      basis:
        waterUnit === 'm³'
          ? 'tính theo chỉ số đồng hồ, thanh toán vào cuối các tháng'
          : 'thanh toán vào đầu các tháng',
    },
    {
      key: 'internetPrice',
      label: 'Internet / Wifi',
      amount: toAmount(details.internetPrice),
      unit: 'phòng / tháng',
      basis: 'cố định theo phòng',
    },
    {
      key: 'servicePrice',
      label: 'Dịch vụ chung',
      amount: toAmount(details.servicePrice),
      unit: 'người / tháng',
      basis: 'tính theo số người ở',
    },
  ];

  return raw.map(item => ({
    ...item,
    display:
      item.amount == null
        ? null
        : `${new Intl.NumberFormat('vi-VN').format(item.amount)} đ/${item.unit}`,
  }));
}

export interface BuiltContractModel {
  nationalHeader: string;
  nationalMotto: string;
  title: string;
  contractCode: string | null;
  contractDateLong: string | null;
  propertyName: string | null;
  propertyAddress: string | null;
  roomNumber: string | null;
  rentalLocation: string | null;
  landlord: {
    name: string | null;
    birthDate: string | null;
    address: string | null;
    identity: string | null;
    identityDate: string | null;
    identityPlace: string | null;
    phone: string | null;
  };
  tenant: {
    name: string | null;
    birthDate: string | null;
    address: string | null;
    identity: string | null;
    identityDate: string | null;
    identityPlace: string | null;
    phone: string | null;
  };
  lease: {
    startDate: string | null;
    endDate: string | null;
    startDateLong: string | null;
    endDateLong: string | null;
  };
  finance: {
    rent: string | null;
    deposit: string | null;
    paymentDay: string | null;
    paymentMethod: string | null;
  };
  electricity: UtilityLine | undefined;
  water: UtilityLine | undefined;
  extraUtilities: UtilityLine[];
  utilities: UtilityLine[];
  terms: string | null;
  officialSections: {
    partyA: ParsedTermSection;
    partyB: ParsedTermSection;
    general: ParsedTermSection;
  } | null;
  template: string;
  houseRental: {
    rentalScope: string | null;
    equipment: string | null;
    occupants: string | null;
    firstPayment: string | null;
    currentAddress: string | null;
    paymentCycle: string | null;
  };
  scanFullDocument: boolean;
  ownerSignature: ContractSignatureView | null;
  tenantSignature: ContractSignatureView | null;
}

export function buildContractModel(record: RentalContractRecord): BuiltContractModel {
  const details = record.details || ({ terms: '' } as RentalContractFullDetails);
  const clean = (v?: string | null) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const utilities = resolveContractUtilities(details);
  const electricity = utilities.find(u => u.key === 'electricityPrice');
  const water = utilities.find(u => u.key === 'waterPrice');
  const extraUtilities = utilities.filter(u =>
    ['internetPrice', 'servicePrice'].includes(u.key)
  );

  const cleanRoom = clean(record.roomNumber);
  const cleanProperty = clean(record.propertyName);
  const cleanAddress = clean(record.propertyAddress);
  const rentalLocation =
    [cleanRoom ? `Phòng ${cleanRoom}` : null, cleanProperty, cleanAddress]
      .filter(Boolean)
      .join(' – ') || null;

  const isHouse = details.template === HOUSE_RENTAL_TEMPLATE;
  const rawDate = isHouse
    ? details.contractDate || (record.createdAt ? record.createdAt.slice(0, 10) : null)
    : details.contractDate;

  const filledTerms = fillContractBlanks(details.terms, details.blankValues);
  const termsClean = clean(filledTerms);
  const parsedSections =
    (details.template || 'BASIC') !== 'OWNER_SCAN'
      ? parseSystemTermsSections(termsClean || '')
      : null;

  const isOfficialThreePart = Boolean(
    parsedSections &&
      parsedSections.length === 3 &&
      /trách nhiệm.*bên a/i.test(parsedSections[0].title) &&
      /trách nhiệm.*bên b/i.test(parsedSections[1].title) &&
      /trách nhiệm chung/i.test(parsedSections[2].title)
  );

  const paymentDayValid = /^([1-9]|1\d|2[0-8])$/.test(String(details.paymentDay ?? ''));

  return {
    nationalHeader: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    nationalMotto: 'Độc lập – Tự do – Hạnh phúc',
    title: isHouse ? 'HỢP ĐỒNG THUÊ NHÀ TRỌ' : 'HỢP ĐỒNG THUÊ PHÒNG TRỌ',
    contractCode: record.id ? `#HD-${record.id}` : null,
    contractDateLong: formatVietnameseDateLong(rawDate),
    propertyName: cleanProperty,
    propertyAddress: cleanAddress,
    roomNumber: cleanRoom,
    rentalLocation,
    landlord: {
      name: clean(details.landlordName),
      birthDate: formatContractIsoDate(details.landlordBirthDate),
      address: clean(details.landlordAddress),
      identity: clean(details.landlordIdentity),
      identityDate: formatContractIsoDate(details.landlordIdentityDate),
      identityPlace: clean(details.landlordIdentityPlace),
      phone: clean(details.landlordPhone),
    },
    tenant: {
      name: clean(details.tenantName),
      birthDate: formatContractIsoDate(details.tenantBirthDate),
      address: clean(details.tenantAddress),
      identity: clean(details.tenantIdentity),
      identityDate: formatContractIsoDate(details.tenantIdentityDate),
      identityPlace: clean(details.tenantIdentityPlace),
      phone: clean(details.tenantPhone),
    },
    lease: {
      startDate: formatContractIsoDate(record.startDate),
      endDate: formatContractIsoDate(record.endDate),
      startDateLong: formatVietnameseDateLong(record.startDate),
      endDateLong: formatVietnameseDateLong(record.endDate),
    },
    finance: {
      rent: formatContractMoneyVnd(details.rent),
      deposit: formatContractMoneyVnd(details.deposit),
      paymentDay: paymentDayValid ? String(details.paymentDay) : null,
      paymentMethod: clean(details.paymentMethod),
    },
    electricity,
    water,
    extraUtilities,
    utilities,
    terms: details.template === 'OWNER_SCAN' ? filledTerms : termsClean,
    officialSections:
      isOfficialThreePart && parsedSections
        ? {
            partyA: parsedSections[0],
            partyB: parsedSections[1],
            general: parsedSections[2],
          }
        : null,
    template: details.template || 'BASIC',
    houseRental: {
      rentalScope: clean(details.rentalScope),
      equipment: clean(details.includedEquipment),
      occupants: details.occupantCount ? String(details.occupantCount) : null,
      firstPayment: formatContractIsoDate(details.firstPaymentDate),
      currentAddress: clean(details.tenantCurrentAddress),
      paymentCycle: clean(details.paymentCycle),
    },
    scanFullDocument:
      details.template === 'OWNER_SCAN' && Boolean(details.scanFullDocument),
    ownerSignature: record.ownerSignature ?? null,
    tenantSignature: record.tenantSignature ?? null,
  };
}

interface HouseRentalGroup {
  title: string;
  fields: [string, string][];
  body?: string;
}

interface HouseRentalSection {
  id: string;
  title: string;
  fields: [string, string][];
  groups: HouseRentalGroup[];
  body?: string;
}

function buildHouseRentalSections(model: BuiltContractModel): HouseRentalSection[] {
  const placeholder = '……………………';
  const withPlaceholders = (fields: [string, string | null][]): [string, string][] =>
    fields.map(([label, value]) => [label, value || placeholder]);

  const partyFields = (party: BuiltContractModel['landlord']): [string, string | null][] => [
    ['Ông/bà', party.name],
    ['CMND/CCCD số', party.identity],
    ['Nơi đăng ký thường trú', party.address],
    ['Điện thoại liên hệ', party.phone],
  ];

  const tenantFields = partyFields(model.tenant);
  tenantFields.splice(3, 0, ['Chỗ ở hiện tại', model.houseRental.currentAddress]);

  const rawGroups: { title: string; fields: [string, string | null][] }[] = [
    {
      title: '1.1 Nhà cho thuê',
      fields: [
        ['Địa chỉ và phòng cho thuê', model.rentalLocation],
        ['Phần diện tích thuê', model.houseRental.rentalScope || 'Chưa có dữ liệu'],
        ['Trang thiết bị kèm theo', model.houseRental.equipment || 'Không có thiết bị ghi nhận'],
      ],
    },
    {
      title: '1.2 Mục đích thuê nhà',
      fields: [['Số người ở', model.houseRental.occupants]],
    },
    {
      title: '1.3 Giá cho thuê',
      fields: [
        ['Giá thuê', model.finance.rent ? `${model.finance.rent} / tháng` : null],
        ['Tiền đặt cọc', model.finance.deposit],
        ...model.utilities
          .filter(item => Boolean(item.display))
          .map(item => [item.label, item.display] as [string, string | null]),
      ],
    },
    {
      title: '1.4 Thời hạn cho thuê',
      fields: [
        [
          'Thời hạn',
          model.lease.startDate && model.lease.endDate
            ? `Từ ${model.lease.startDate} đến ${model.lease.endDate}`
            : null,
        ],
      ],
    },
    {
      title: '1.5 Hình thức thanh toán',
      fields: [
        ['Chu kỳ thanh toán', model.houseRental.paymentCycle],
        ['Ngày thanh toán định kỳ', model.finance.paymentDay],
        ['Ngày thanh toán lần đầu', model.houseRental.firstPayment],
        ['Hình thức thanh toán', model.finance.paymentMethod],
      ],
    },
  ];

  const terms = parseSystemTermsSections(model.terms || '');
  const articles: Omit<HouseRentalSection, 'id'>[] = terms
    ? terms.map(sec => {
        if (sec.index !== '1') {
          return { title: sec.heading, fields: [], groups: [], body: sec.body };
        }
        const [body, ...subsections] = sec.body.split(/^1\.([1-5])\s+[^\n]+\n?/m);
        const groupBodies = new Map<string, string>();
        for (let i = 0; i < subsections.length; i += 2) {
          groupBodies.set(subsections[i], (subsections[i + 1] || '').trim());
        }
        return {
          title: sec.heading,
          fields: [],
          body: body.trim(),
          groups: rawGroups.map((group, idx) => ({
            title: group.title,
            fields: withPlaceholders(group.fields),
            body: groupBodies.get(String(idx + 1)),
          })),
        };
      })
    : [
        {
          title: 'ĐIỀU 1: NỘI DUNG HỢP ĐỒNG',
          fields: [],
          groups: rawGroups.map(g => ({
            title: g.title,
            fields: withPlaceholders(g.fields),
          })),
        },
        ...(model.terms
          ? [{ title: 'Điều khoản thỏa thuận', fields: [], groups: [], body: model.terms }]
          : []),
      ];

  const all: Omit<HouseRentalSection, 'id'>[] = [
    { title: 'I. BÊN CHO THUÊ NHÀ (BÊN A)', fields: withPlaceholders(partyFields(model.landlord)), groups: [] },
    { title: 'II. BÊN THUÊ NHÀ (BÊN B)', fields: withPlaceholders(tenantFields), groups: [] },
    ...articles,
  ];

  return all.map((sec, idx) => ({
    ...sec,
    id: `sec-house-${idx}`,
  }));
}

export function extractContractToc(record: RentalContractRecord): ContractTocItem[] {
  const model = buildContractModel(record);
  if (model.scanFullDocument) {
    return [
      { id: 'sec-doc-top', label: 'Nội dung bản quét' },
      ...(model.ownerSignature || model.tenantSignature
        ? [{ id: 'sec-signatures', label: 'Phần chữ ký' }]
        : []),
    ];
  }
  if (model.template === HOUSE_RENTAL_TEMPLATE) {
    const sections = buildHouseRentalSections(model);
    return [
      ...sections.map(s => ({ id: s.id, label: s.title })),
      { id: 'sec-signatures', label: 'Phần chữ ký các bên' },
    ];
  }
  const items: ContractTocItem[] = [
    { id: 'sec-party-a', label: '1. Bên cho thuê (Bên A)' },
    { id: 'sec-party-b', label: '2. Bên thuê phòng (Bên B)' },
    { id: 'sec-agreement', label: 'Thỏa thuận thuê & chi phí' },
  ];
  if (model.officialSections) {
    items.push(
      { id: 'sec-resp-parties', label: 'Trách nhiệm của các bên' },
      { id: 'sec-resp-general', label: 'Trách nhiệm chung' }
    );
  } else {
    items.push({ id: 'sec-terms', label: 'Điều khoản thỏa thuận' });
  }
  items.push({ id: 'sec-signatures', label: 'Phần chữ ký các bên' });
  return items;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSignatureSvg(strokes?: SignaturePoint[][]): string {
  if (!strokes || strokes.length === 0) return '';
  const polylines = strokes
    .filter(stroke => Array.isArray(stroke) && stroke.length > 0)
    .map(stroke => {
      const pts = stroke
        .map(p => `${Math.round(Number(p.x) || 0)},${Math.round(Number(p.y) || 0)}`)
        .join(' ');
      return `<polyline points="${pts}" fill="none" stroke="#134c59" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join('');
  return `<svg class="sig-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">${polylines}</svg>`;
}

function renderSignatureBlockHtml(
  model: BuiltContractModel,
  tenantLabel: string,
  ownerLabel: string
): string {
  const renderSide = (
    label: string,
    fallbackName: string | null,
    sig: ContractSignatureView | null
  ) => {
    const sigVisual =
      sig?.method === 'DRAWN' && sig.strokes?.length
        ? renderSignatureSvg(sig.strokes)
        : sig
        ? `<div class="sig-typed">${escapeHtml(sig.name)}</div>`
        : `<div class="sig-space"></div>`;
    const dateHtml = sig
      ? `<div class="sig-date">${escapeHtml(formatSigningTimestamp(sig.signedAt))}</div>`
      : '';
    return `
      <div class="sig-col">
        <div class="sig-role">${escapeHtml(label)}</div>
        <div class="sig-hint">${sig ? 'Đã ký trên hệ thống' : '(Ký, ghi rõ họ tên)'}</div>
        ${sigVisual}
        <div class="sig-name">${escapeHtml(sig?.name || fallbackName || '')}</div>
        ${dateHtml}
      </div>
    `;
  };

  return `
    <section id="sec-signatures" class="sig-grid">
      ${renderSide(tenantLabel, model.tenant.name, model.tenantSignature)}
      ${renderSide(ownerLabel, model.landlord.name, model.ownerSignature)}
    </section>
  `;
}

/**
 * Generates the exact, faithful official HTML document matching HL_RCS Web
 * (preserving all wording, clauses, confirmed values, and SVG/typed signatures).
 */
export function buildContractHtmlDocument(
  record: RentalContractRecord,
  options: { fontScalePercent?: number; forPrint?: boolean } = {}
): string {
  const model = buildContractModel(record);
  const contractCodeHtml = options.forPrint && model.contractCode
    ? `<div class="meta">Mã hợp đồng: ${escapeHtml(model.contractCode)}</div>`
    : '';
  const scale = Math.max(85, Math.min(165, options.fontScalePercent ?? 100));
  const baseFontPx = Math.round((15 * scale) / 100);
  const val = (v: string | null, fallback = 'Chưa điền') =>
    v
      ? `<span class="val">${escapeHtml(v)}</span>`
      : `<span class="empty">${escapeHtml(fallback)}</span>`;

  let bodyHtml = '';

  if (model.scanFullDocument) {
    bodyHtml = `
      <article id="sec-doc-top" class="doc">
        <pre class="terms-pre">${escapeHtml(model.terms || '')}</pre>
        ${
          model.ownerSignature || model.tenantSignature
            ? renderSignatureBlockHtml(model, 'ĐẠI DIỆN BÊN B', 'ĐẠI DIỆN BÊN A')
            : ''
        }
      </article>
    `;
  } else if (model.template === HOUSE_RENTAL_TEMPLATE) {
    const sections = buildHouseRentalSections(model);
    const sectionsHtml = sections
      .map((sec, index) => {
        const fieldsHtml = sec.fields
          .map(
            ([label, value]) =>
              `<p class="field-line"><strong>${escapeHtml(label)}</strong>: ${escapeHtml(value)}</p>`
          )
          .join('');
        const groupsHtml = sec.groups
          .map(
            g => `
            <div class="house-group">
              <h5>${escapeHtml(g.title)}</h5>
              ${g.fields
                .map(
                  ([l, v]) =>
                    `<p class="field-line"><strong>${escapeHtml(l)}</strong>: ${escapeHtml(v)}</p>`
                )
                .join('')}
              ${g.body ? `<pre class="terms-pre">${escapeHtml(g.body)}</pre>` : ''}
            </div>
          `
          )
          .join('');
        const lead =
          index === 2
            ? '<p class="lead">Hai bên thống nhất ký kết hợp đồng với các nội dung sau:</p>'
            : '';
        return `
          <section id="${sec.id}" class="sec">
            ${lead}
            <h4>${escapeHtml(sec.title)}</h4>
            ${fieldsHtml}
            ${groupsHtml}
            ${sec.body ? `<pre class="terms-pre">${escapeHtml(sec.body.trim())}</pre>` : ''}
          </section>
        `;
      })
      .join('');

    bodyHtml = `
      <article id="sec-doc-top" class="doc">
        <header class="doc-head">
          <div class="nation">${escapeHtml(model.nationalHeader)}</div>
          <div class="motto">${escapeHtml(model.nationalMotto)}</div>
          <div class="rule"></div>
          <div class="house-date">Hà Nội, ${escapeHtml(model.contractDateLong || 'ngày …… tháng …… năm ……')}</div>
          <h3>${escapeHtml(model.title)}</h3>
          ${contractCodeHtml}
        </header>
        <p class="lead">Chúng tôi gồm:</p>
        ${sectionsHtml}
        ${renderSignatureBlockHtml(model, 'BÊN THUÊ NHÀ', 'BÊN CHO THUÊ NHÀ')}
      </article>
    `;
  } else {
    const paymentDisplay = model.finance.paymentDay
      ? model.finance.paymentMethod
        ? `${model.finance.paymentMethod} (hạn trả: ngày ${model.finance.paymentDay} hằng tháng)`
        : `Thanh toán vào ngày ${model.finance.paymentDay} hằng tháng`
      : model.finance.paymentMethod;

    const extrasHtml = model.extraUtilities
      .filter(item => Boolean(item.display))
      .map(
        item =>
          `<p><strong>${escapeHtml(item.label)}:</strong> <span class="val">${escapeHtml(
            item.display || ''
          )}</span> (${escapeHtml(item.basis)}).</p>`
      )
      .join('');

    const termsHtml = model.officialSections
      ? `
        <section id="sec-resp-parties" class="sec">
          <h4 class="upper">TRÁCH NHIỆM CỦA CÁC BÊN</h4>
          <p class="subhead">* ${escapeHtml(model.officialSections.partyA.title)}:</p>
          <pre class="terms-pre">${escapeHtml(model.officialSections.partyA.body.trim())}</pre>
          <p class="subhead">* ${escapeHtml(model.officialSections.partyB.title)}:</p>
          <pre class="terms-pre">${escapeHtml(model.officialSections.partyB.body.trim())}</pre>
        </section>
        <section id="sec-resp-general" class="sec">
          <h4 class="upper">TRÁCH NHIỆM CHUNG</h4>
          <pre class="terms-pre">${escapeHtml(model.officialSections.general.body.trim())}</pre>
        </section>
      `
      : `
        <section id="sec-terms" class="sec">
          <h4 class="upper">TRÁCH NHIỆM CỦA CÁC BÊN VÀ ĐIỀU KHOẢN THỎA THUẬN</h4>
          <pre class="terms-pre">${escapeHtml(model.terms || 'Chưa nhập điều khoản thỏa thuận')}</pre>
        </section>
      `;

    bodyHtml = `
      <article id="sec-doc-top" class="doc">
        <header class="doc-head">
          <div class="nation">${escapeHtml(model.nationalHeader)}</div>
          <div class="motto">${escapeHtml(model.nationalMotto)}</div>
          <div class="rule"></div>
          <h3>${escapeHtml(model.title)}</h3>
          ${contractCodeHtml}
        </header>

        <p>
          Hôm nay ${val(model.contractDateLong, 'ngày …… tháng …… năm ……')}; tại địa chỉ:
          ${val(model.propertyAddress || model.propertyName, 'Chưa cập nhật')}
        </p>
        <p class="lead">Chúng tôi gồm:</p>

        <section id="sec-party-a" class="sec">
          <h4>1. Đại diện bên cho thuê phòng trọ (Bên A):</h4>
          <p>Ông/bà: ${val(model.landlord.name)} &nbsp;·&nbsp; Sinh ngày: ${val(model.landlord.birthDate, 'Chưa cung cấp')}</p>
          <p>Nơi đăng ký HK: ${val(model.landlord.address, 'Chưa cung cấp')}</p>
          <p>CMND/CCCD số: ${val(model.landlord.identity, 'Chưa cung cấp')} &nbsp;·&nbsp; Cấp ngày: ${val(model.landlord.identityDate, 'Chưa cung cấp')} &nbsp;·&nbsp; Tại: ${val(model.landlord.identityPlace, 'Chưa cung cấp')}</p>
          <p>Số điện thoại: ${val(model.landlord.phone)}</p>
        </section>

        <section id="sec-party-b" class="sec">
          <h4>2. Bên thuê phòng trọ (Bên B):</h4>
          <p>Ông/bà: ${val(model.tenant.name)} &nbsp;·&nbsp; Sinh ngày: ${val(model.tenant.birthDate, 'Chưa cung cấp')}</p>
          <p>Nơi đăng ký HK thường trú: ${val(model.tenant.address, 'Chưa cung cấp')}</p>
          <p>Số CMND/CCCD: ${val(model.tenant.identity, 'Chưa cung cấp')} &nbsp;·&nbsp; Cấp ngày: ${val(model.tenant.identityDate, 'Chưa cung cấp')} &nbsp;·&nbsp; Tại: ${val(model.tenant.identityPlace, 'Chưa cung cấp')}</p>
          <p>Số điện thoại: ${val(model.tenant.phone)}</p>
        </section>

        <p class="italic-lead">
          Sau khi bàn bạc trên tinh thần dân chủ, hai bên cùng có lợi, cùng thống nhất như sau:
        </p>

        <section id="sec-agreement" class="sec">
          <p>Bên A đồng ý cho bên B thuê 01 phòng ở tại địa chỉ: ${val(model.rentalLocation, 'Chưa cập nhật')}</p>
          <p><strong>Giá thuê:</strong> ${val(model.finance.rent ? `${model.finance.rent}/tháng` : null)}</p>
          <p><strong>Hình thức thanh toán:</strong> ${val(paymentDisplay)}</p>
          <p><strong>Tiền điện:</strong> ${
            model.electricity?.display
              ? `<span class="val">${escapeHtml(model.electricity.display)}</span> ${escapeHtml(model.electricity.basis)}.`
              : '<span class="empty">Chưa thiết lập</span>'
          }</p>
          <p><strong>Tiền nước:</strong> ${
            model.water?.display
              ? `<span class="val">${escapeHtml(model.water.display)}</span> ${escapeHtml(model.water.basis)}.`
              : '<span class="empty">Chưa thiết lập</span>'
          }</p>
          ${extrasHtml}
          <p><strong>Tiền đặt cọc:</strong> ${val(model.finance.deposit)}</p>
          <p>
            Hợp đồng có giá trị kể từ ${val(model.lease.startDateLong, 'Chưa điền ngày bắt đầu')}
            đến ${val(model.lease.endDateLong, 'Chưa điền ngày kết thúc')}.
          </p>
        </section>

        ${termsHtml}
        ${renderSignatureBlockHtml(model, 'ĐẠI DIỆN BÊN B', 'ĐẠI DIỆN BÊN A')}
      </article>
    `;
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes" />
<title>${escapeHtml(model.title)}${model.roomNumber ? ` - Phòng ${escapeHtml(model.roomNumber)}` : ''}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: ${options.forPrint ? '#FFFFFF' : '#FAFAF7'};
    color: #142D29;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: ${baseFontPx}px;
    line-height: 1.65;
    -webkit-text-size-adjust: 100%;
  }
  .doc {
    max-width: 780px;
    margin: ${options.forPrint ? '0 auto' : '12px auto 32px'};
    background: #FFFFFF;
    padding: ${options.forPrint ? '8px' : '22px 18px 28px'};
    border-radius: ${options.forPrint ? '0' : '14px'};
    border: ${options.forPrint ? 'none' : '1px solid #E2E8E4'};
  }
  .doc-head { text-align: center; margin-bottom: 18px; }
  .nation { font-weight: 800; font-size: 0.96em; letter-spacing: 0.2px; }
  .motto { font-weight: 700; font-size: 0.94em; margin-top: 2px; }
  .rule { width: 140px; height: 1.5px; background: #142D29; margin: 8px auto 12px; }
  .house-date { text-align: right; font-style: italic; font-size: 0.92em; margin-bottom: 8px; }
  h3 { font-size: 1.24em; font-weight: 800; margin: 6px 0 4px; color: #064F49; }
  .meta { font-size: 0.88em; color: #657570; margin-top: 2px; }
  .sec { margin-top: 16px; }
  h4 { font-size: 1.02em; font-weight: 800; margin: 0 0 8px; color: #142D29; }
  h4.upper { text-transform: uppercase; letter-spacing: 0.2px; color: #064F49; }
  h5 { font-size: 0.98em; font-weight: 700; margin: 10px 0 6px; color: #086B62; }
  p { margin: 0 0 8px; }
  .lead { font-weight: 600; margin: 10px 0 6px; }
  .italic-lead { font-style: italic; margin: 14px 0 8px; color: #3A4D48; }
  .subhead { font-weight: 700; margin: 10px 0 4px; }
  .val { font-weight: 600; color: #142D29; }
  .empty { color: #84928D; font-style: italic; }
  .terms-pre {
    margin: 4px 0 10px;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: 0.97em;
    line-height: 1.68;
  }
  .house-group { margin-top: 8px; }
  .sig-grid {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 16px;
    margin-top: 28px;
    padding-top: 18px;
    border-top: 1px dashed #CBD7D2;
    page-break-inside: avoid;
  }
  .sig-col { flex: 1; text-align: center; min-width: 0; }
  .sig-role { font-weight: 800; font-size: 0.92em; color: #142D29; }
  .sig-hint { font-style: italic; font-size: 0.84em; color: #657570; margin-top: 2px; }
  .sig-svg { width: 100%; max-width: 150px; height: auto; margin: 8px auto 4px; display: block; }
  .sig-typed { font-style: italic; font-size: 1.15em; font-weight: 700; color: #086B62; margin: 14px 0 8px; }
  .sig-space { height: 48px; }
  .sig-name { font-weight: 700; font-size: 0.95em; margin-top: 4px; word-break: break-word; }
  .sig-date { font-size: 0.8em; color: #657570; margin-top: 3px; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
