export type WaterMode = 'METER' | 'PER_PERSON' | 'FIXED';

export interface UtilityStay {
  joinedOn: string;
  leftOn: string | null;
}

export interface UtilitySavedReading {
  revision: number | null;
  readOn: string;
  electricityStart: number | string;
  electricityEnd: number | string;
  electricityRate: number | string;
  electricityAmount: string;
  waterMode: WaterMode;
  waterStart: number | string | null;
  waterEnd: number | string | null;
  waterRate: number | string;
  occupantCount: number | null;
  waterAmount: string;
}

export interface UtilityRow {
  roomId: number;
  roomNumber: string;
  floor: string | null;
  tenancyKey: string | null;
  tenantName: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  latestReadOn: string | null;
  handover: boolean;
  issue: string | null;
  previousReadOn: string | null;
  suggestedElectricityStart: number | string | null;
  suggestedWaterStart: number | string | null;
  suggestedOccupants: number;
  stays: UtilityStay[];
  defaultElectricityRate: number | string | null;
  defaultWaterRate: number | string | null;
  defaultWaterMode: WaterMode | null;
  saved: UtilitySavedReading | null;
}

export interface UtilityLedger {
  month: string;
  currentMonth: string;
  editable: boolean;
  rows: UtilityRow[];
}

export interface UtilityDraft {
  readOn: string;
  electricityStart: string;
  electricityEnd: string;
  electricityRate: string;
  waterMode: WaterMode;
  waterStart: string;
  waterEnd: string;
  waterRate: string;
  occupantCount: string;
  suggestedOccupants: number;
}

export type UtilityDraftPatch = Partial<Omit<UtilityDraft, 'suggestedOccupants'>>;

export type UtilityStatusFilter = 'ALL' | 'UNRECORDED' | 'UNSAVED' | 'FINALIZED' | 'ISSUE';

export interface UtilityEntryPayload {
  roomId: number;
  tenancyKey: string;
  revision: number | null;
  readOn: string;
  electricityStart: string;
  electricityEnd: string;
  electricityRate: string;
  waterMode: WaterMode;
  waterStart: string | null;
  waterEnd: string | null;
  waterRate: string;
  occupantCount: number | null;
}

export interface UtilitySaveRequest {
  propertyId: number;
  month: string;
  entries: UtilityEntryPayload[];
}

export interface UtilityDraftErrors {
  readOn?: string;
  electricityStart?: string;
  electricityEnd?: string;
  electricityRate?: string;
  waterStart?: string;
  waterEnd?: string;
  waterRate?: string;
  occupantCount?: string;
}

export interface UtilityRowValidation {
  errors: UtilityDraftErrors;
  electricityUsage: bigint | null;
  waterUsage: bigint | null;
  electricityAmount: bigint | null;
  waterAmount: bigint | null;
  totalAmount: bigint | null;
  valid: boolean;
}

export interface UtilityBatchItem {
  key: string;
  row: UtilityRow;
  draft: UtilityDraft;
  carried: string | null;
  validation: UtilityRowValidation;
  blockedByPrior: boolean;
  valid: boolean;
}

export interface UtilityStats {
  total: number;
  completed: number;
  unrecorded: number;
  unsaved: number;
  validUnsaved: number;
  invalidUnsaved: number;
  issueCount: number;
}

export const WATER_MODE_OPTIONS: readonly { key: WaterMode; label: string; shortLabel: string }[] = [
  { key: 'METER', label: 'Theo đồng hồ (m³)', shortLabel: 'Đồng hồ (m³)' },
  { key: 'PER_PERSON', label: 'Theo số người', shortLabel: 'Theo người' },
  { key: 'FIXED', label: 'Phí cố định / phòng', shortLabel: 'Cố định' },
] as const;

const METER_SYNTAX = /^\d{1,9}(?:\.\d{1,3})?$/;
const RATE_SYNTAX = /^\d{1,9}$/;
const EDITABLE_KEYS: readonly (keyof Omit<UtilityDraft, 'suggestedOccupants'>)[] = [
  'readOn',
  'electricityStart',
  'electricityEnd',
  'electricityRate',
  'waterMode',
  'waterStart',
  'waterEnd',
  'waterRate',
  'occupantCount',
];

export function utilityCurrentMonth(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    if (y && m) return `${y}-${m}`;
  } catch {
    /* Fallback to UTC+7 offset calculation */
  }
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = vn.getUTCFullYear();
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftUtilityMonth(month: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return utilityCurrentMonth();
  const year = Number(match[1]);
  const mIndex = Number(match[2]) - 1 + delta;
  const target = new Date(Date.UTC(year, mIndex, 1));
  const y = Math.max(1900, Math.min(9998, target.getUTCFullYear()));
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatUtilityMonth(month?: string | null): string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month || '';
  const [year, m] = month.split('-');
  return `Tháng ${Number(m)}/${year}`;
}

export function formatIsoDateVi(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function utilityRowKey(row: Pick<UtilityRow, 'roomId' | 'tenancyKey'>): string {
  return row.tenancyKey || `room-${row.roomId}`;
}

export function isUtilityRowFinal(row: Pick<UtilityRow, 'saved'>): boolean {
  return Boolean(row.saved);
}

export function waterModeLabel(mode?: WaterMode | null): string {
  return WATER_MODE_OPTIONS.find(item => item.key === mode)?.label || 'Theo đồng hồ (m³)';
}

function textValue(value: number | string | null | undefined): string {
  return value == null ? '' : String(value);
}

function previousDay(isoDate: string): string {
  const instant = new Date(`${isoDate}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() - 1);
  return instant.toISOString().slice(0, 10);
}

export function parseMeterMilliUnits(value: string): bigint | null {
  if (!METER_SYNTAX.test(value)) return null;
  const [integer, fraction = ''] = value.split('.');
  return BigInt(integer) * 1000n + BigInt(fraction.padEnd(3, '0'));
}

function formatVietnameseInteger(value: bigint): string {
  // Group the digits directly because some mobile runtimes reject BigInt in Intl.NumberFormat.
  return value.toString().replace(/\B(?=(?:\d{3})+$)/g, '.');
}

export function formatMeterUsage(milliUnits: bigint | null | undefined): string {
  if (milliUnits == null) return '—';
  const negative = milliUnits < 0n;
  const abs = negative ? -milliUnits : milliUnits;
  const integer = formatVietnameseInteger(abs / 1000n);
  const fraction = (abs % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${integer}${fraction ? `,${fraction}` : ''}`;
}

export function formatVndAmount(amount: bigint | number | string | null | undefined): string {
  if (amount == null || amount === '') return '—';
  try {
    const val = typeof amount === 'bigint' ? amount : BigInt(String(amount).split('.')[0]);
    return `${formatVietnameseInteger(val)}đ`;
  } catch {
    return '—';
  }
}

export function sanitizeDecimalInput(raw: string): string {
  const normalized = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const firstDot = normalized.indexOf('.');
  if (firstDot === -1) return normalized.slice(0, 9);
  const intPart = normalized.slice(0, firstDot).slice(0, 9);
  const fracPart = normalized
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, 3);
  return `${intPart}.${fracPart}`;
}

export function sanitizeIntegerInput(raw: string, maxDigits = 9): string {
  return raw.replace(/\D/g, '').slice(0, maxDigits);
}

export function utilityOccupantCount(row: UtilityRow, readOn: string): number {
  if (!row.stays?.length || !readOn || !row.periodStart) return row.suggestedOccupants;
  return row.stays.filter(
    stay => stay.joinedOn <= readOn && (!stay.leftOn || stay.leftOn >= row.periodStart!)
  ).length;
}

export function buildUtilityDraft(
  row: UtilityRow,
  changes?: UtilityDraftPatch | null,
  preceding?: UtilityDraft | null
): UtilityDraft {
  const saved = row.saved;
  const readOn = changes?.readOn ?? saved?.readOn ?? row.latestReadOn ?? '';
  return {
    readOn,
    electricityStart: textValue(
      saved?.electricityStart ?? preceding?.electricityEnd ?? row.suggestedElectricityStart
    ),
    electricityEnd: textValue(saved?.electricityEnd),
    electricityRate: textValue(saved?.electricityRate ?? row.defaultElectricityRate),
    waterMode: saved?.waterMode ?? row.defaultWaterMode ?? 'METER',
    waterStart: textValue(
      saved?.waterStart ?? preceding?.waterEnd ?? row.suggestedWaterStart
    ),
    waterEnd: textValue(saved?.waterEnd),
    waterRate: textValue(saved?.waterRate ?? row.defaultWaterRate),
    occupantCount: textValue(saved?.occupantCount),
    ...(changes || {}),
    suggestedOccupants: utilityOccupantCount(row, readOn),
  };
}

export function hasRealUtilityEdit(
  row: UtilityRow,
  changes?: UtilityDraftPatch | null,
  preceding?: UtilityDraft | null
): boolean {
  if (!changes || Object.keys(changes).length === 0) return false;
  const baseline = buildUtilityDraft(row, null, preceding);
  const current = buildUtilityDraft(row, changes, preceding);
  return EDITABLE_KEYS.some(key => String(baseline[key] ?? '') !== String(current[key] ?? ''));
}

export function assessUtilityDraft(draft: UtilityDraft): Omit<UtilityRowValidation, 'valid'> {
  const errors: UtilityDraftErrors = {};

  const computeMeter = (
    startKey: 'electricityStart' | 'waterStart',
    endKey: 'electricityEnd' | 'waterEnd'
  ): bigint | null => {
    const startVal = draft[startKey].trim();
    const endVal = draft[endKey].trim();
    if (!METER_SYNTAX.test(startVal)) {
      errors[startKey] = 'Nhập chỉ số ≥ 0, tối đa 3 chữ số thập phân.';
    }
    if (!METER_SYNTAX.test(endVal)) {
      errors[endKey] = 'Nhập chỉ số ≥ 0, tối đa 3 chữ số thập phân.';
    }
    if (errors[startKey] || errors[endKey]) return null;
    const startMilli = parseMeterMilliUnits(startVal)!;
    const endMilli = parseMeterMilliUnits(endVal)!;
    const diff = endMilli - startMilli;
    if (diff < 0n) {
      errors[endKey] = 'Chỉ số mới không được nhỏ hơn chỉ số đầu kỳ.';
      return null;
    }
    return diff;
  };

  if (!draft.readOn || !/^\d{4}-\d{2}-\d{2}$/.test(draft.readOn)) {
    errors.readOn = 'Chọn ngày ghi hợp lệ.';
  }

  for (const key of ['electricityRate', 'waterRate'] as const) {
    if (!RATE_SYNTAX.test(draft[key].trim())) {
      errors[key] = 'Nhập đơn giá VND nguyên, từ 0 trở lên.';
    }
  }

  const electricityUsage = computeMeter('electricityStart', 'electricityEnd');

  let waterUsage: bigint | null = null;
  let waterQuantityMilli: bigint | null = 1000n;
  if (draft.waterMode === 'METER') {
    waterUsage = computeMeter('waterStart', 'waterEnd');
    waterQuantityMilli = waterUsage;
  } else if (draft.waterMode === 'PER_PERSON') {
    const countText =
      draft.occupantCount.trim() === ''
        ? String(draft.suggestedOccupants)
        : draft.occupantCount.trim();
    if (!/^\d{1,3}$/.test(countText) || Number(countText) > 200) {
      errors.occupantCount = 'Nhập số người từ 0 đến 200.';
      waterQuantityMilli = null;
    } else {
      waterQuantityMilli = BigInt(countText) * 1000n;
    }
  }

  // Exact RoundingMode.HALF_UP matching Java BigDecimal.setScale(0, RoundingMode.HALF_UP)
  const charge = (unitsMilli: bigint | null, rateKey: 'electricityRate' | 'waterRate'): bigint | null => {
    if (unitsMilli === null || errors[rateKey]) return null;
    return (unitsMilli * BigInt(draft[rateKey].trim()) + 500n) / 1000n;
  };

  const electricityAmount = charge(electricityUsage, 'electricityRate');
  const waterAmount = charge(waterQuantityMilli, 'waterRate');
  const totalAmount =
    electricityAmount !== null && waterAmount !== null ? electricityAmount + waterAmount : null;

  return {
    errors,
    electricityUsage,
    waterUsage,
    electricityAmount,
    waterAmount,
    totalAmount,
  };
}

export function validateUtilityRow(row: UtilityRow, draft: UtilityDraft): UtilityRowValidation {
  const base = assessUtilityDraft(draft);
  const errors: UtilityDraftErrors = { ...base.errors };

  if (!errors.readOn && row.periodStart && row.latestReadOn) {
    if (draft.readOn < row.periodStart || draft.readOn > row.latestReadOn) {
      errors.readOn = `Ngày ghi phải nằm trong kỳ (${formatIsoDateVi(row.periodStart)} – ${formatIsoDateVi(row.latestReadOn)}).`;
    }
  }

  return {
    ...base,
    errors,
    valid: !row.issue && Object.keys(errors).length === 0,
  };
}

export function findCarriedHandover(
  row: UtilityRow,
  allRows: readonly UtilityRow[],
  edits: Record<string, UtilityDraftPatch>
): { priorRow: UtilityRow | null; linkedDraft: UtilityDraft | null; carriedDate: string | null } {
  if (!row.periodStart) {
    return { priorRow: null, linkedDraft: null, carriedDate: null };
  }
  const prior = allRows.find(
    candidate =>
      candidate !== row &&
      candidate.roomId === row.roomId &&
      candidate.handover &&
      !candidate.issue &&
      Boolean(candidate.periodStart && candidate.periodStart <= row.periodStart!) &&
      (candidate.periodEnd === row.periodStart ||
        candidate.periodEnd === previousDay(row.periodStart!)) &&
      hasRealUtilityEdit(candidate, edits[utilityRowKey(candidate)])
  );
  if (!prior) return { priorRow: null, linkedDraft: null, carriedDate: null };
  const priorDraft = buildUtilityDraft(prior, edits[utilityRowKey(prior)]);
  const linkedDraft = priorDraft.readOn === prior.periodEnd ? priorDraft : null;
  return { priorRow: prior, linkedDraft, carriedDate: linkedDraft?.readOn ?? null };
}

export function partitionUtilitySaveBatch(
  rows: readonly UtilityRow[],
  edits: Record<string, UtilityDraftPatch>
): {
  dirtyItems: UtilityBatchItem[];
  validItems: UtilityBatchItem[];
  invalidItems: UtilityBatchItem[];
} {
  const items: UtilityBatchItem[] = [];
  const priorValidity = new Map<string, boolean>();

  for (const row of rows) {
    if (!row.handover) continue;
    const key = utilityRowKey(row);
    if (!hasRealUtilityEdit(row, edits[key])) continue;
    const draft = buildUtilityDraft(row, edits[key]);
    priorValidity.set(key, validateUtilityRow(row, draft).valid);
  }

  for (const row of rows) {
    const key = utilityRowKey(row);
    const { priorRow, linkedDraft, carriedDate } = findCarriedHandover(row, rows, edits);
    if (!hasRealUtilityEdit(row, edits[key], linkedDraft)) continue;
    const draft = buildUtilityDraft(row, edits[key], linkedDraft);
    const validation = validateUtilityRow(row, draft);
    const blockedByPrior = Boolean(
      priorRow && linkedDraft && priorValidity.get(utilityRowKey(priorRow)) === false
    );
    items.push({
      key,
      row,
      draft,
      carried: carriedDate,
      validation,
      blockedByPrior,
      valid: validation.valid && !blockedByPrior,
    });
  }

  return {
    dirtyItems: items,
    validItems: items.filter(item => item.valid),
    invalidItems: items.filter(item => !item.valid),
  };
}

export function summarizeUtilityStats(
  rows: readonly UtilityRow[],
  edits: Record<string, UtilityDraftPatch>
): UtilityStats {
  const { dirtyItems, validItems, invalidItems } = partitionUtilitySaveBatch(rows, edits);
  let completed = 0;
  let unrecorded = 0;
  let issueCount = 0;

  for (const row of rows) {
    if (row.issue) issueCount++;
    else if (isUtilityRowFinal(row)) completed++;
    else unrecorded++;
  }

  return {
    total: rows.length,
    completed,
    unrecorded,
    unsaved: dirtyItems.length,
    validUnsaved: validItems.length,
    invalidUnsaved: invalidItems.length,
    issueCount,
  };
}

function foldVietnamese(text?: string | null): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function extractUtilityFloors(rows: readonly UtilityRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const label = (row.floor || '').trim();
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
}

export function filterUtilityRows(
  rows: readonly UtilityRow[],
  edits: Record<string, UtilityDraftPatch>,
  filter: {
    search: string;
    status: UtilityStatusFilter;
    floor: string;
    roomId: number | null;
  }
): UtilityRow[] {
  const query = foldVietnamese(filter.search);

  return rows.filter(row => {
    if (filter.roomId != null && row.roomId !== filter.roomId) return false;
    if (filter.floor !== 'ALL' && (row.floor || '').trim() !== filter.floor) return false;

    const key = utilityRowKey(row);
    const { linkedDraft } = findCarriedHandover(row, rows, edits);
    const edited = hasRealUtilityEdit(row, edits[key], linkedDraft);

    if (filter.status === 'FINALIZED' && (!isUtilityRowFinal(row) || edited)) return false;
    if (filter.status === 'UNRECORDED' && (isUtilityRowFinal(row) || Boolean(row.issue) || edited)) {
      return false;
    }
    if (filter.status === 'UNSAVED' && !edited) return false;
    if (filter.status === 'ISSUE' && !row.issue) return false;

    if (query) {
      const hay = foldVietnamese(`${row.roomNumber} ${row.tenantName || ''} ${row.floor || ''}`);
      if (!hay.includes(query)) return false;
    }

    return true;
  });
}

export function findNextPendingUtilityRow(
  rows: readonly UtilityRow[],
  currentKey: string | null,
  edits: Record<string, UtilityDraftPatch>
): UtilityRow | null {
  if (!rows.length) return null;
  const startIdx = currentKey ? rows.findIndex(r => utilityRowKey(r) === currentKey) : -1;
  const ordered =
    startIdx >= 0 ? [...rows.slice(startIdx + 1), ...rows.slice(0, startIdx)] : [...rows];

  const isPending = (row: UtilityRow) => {
    if (row.issue) return false;
    const edited = hasRealUtilityEdit(row, edits[utilityRowKey(row)]);
    return !isUtilityRowFinal(row) || edited;
  };

  return ordered.find(isPending) || null;
}

export function utilityEntryPayload(row: UtilityRow, draft: UtilityDraft): UtilityEntryPayload {
  return {
    roomId: row.roomId,
    tenancyKey: row.tenancyKey || '',
    revision: row.saved?.revision ?? null,
    readOn: draft.readOn,
    electricityStart: draft.electricityStart.trim(),
    electricityEnd: draft.electricityEnd.trim(),
    electricityRate: draft.electricityRate.trim(),
    waterMode: draft.waterMode,
    waterStart: draft.waterMode === 'METER' ? draft.waterStart.trim() : null,
    waterEnd: draft.waterMode === 'METER' ? draft.waterEnd.trim() : null,
    waterRate: draft.waterRate.trim(),
    occupantCount:
      draft.waterMode === 'PER_PERSON' && draft.occupantCount.trim() !== ''
        ? Number(draft.occupantCount.trim())
        : null,
  };
}

export function serializeUtilityDrafts(edits: Record<string, UtilityDraftPatch>): string {
  return JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    edits,
  });
}

export function parseUtilityDrafts(raw: string): Record<string, UtilityDraftPatch> {
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (data?.version !== 1 || typeof data.edits !== 'object' || !data.edits) {
    return {};
  }
  const clean: Record<string, UtilityDraftPatch> = {};
  for (const [rowKey, rawPatch] of Object.entries(data.edits as Record<string, unknown>)) {
    if (typeof rawPatch !== 'object' || !rawPatch) continue;
    const p = rawPatch as Record<string, unknown>;
    const patch: UtilityDraftPatch = {};
    for (const field of EDITABLE_KEYS) {
      if (typeof p[field] === 'string') {
        if (field === 'waterMode') {
          if (p[field] === 'METER' || p[field] === 'PER_PERSON' || p[field] === 'FIXED') {
            patch.waterMode = p[field];
          }
        } else {
          Object.assign(patch, { [field]: (p[field] as string).slice(0, 24) });
        }
      }
    }
    if (Object.keys(patch).length > 0) clean[rowKey] = patch;
  }
  return clean;
}

export function listDatesInRange(startIso?: string | null, endIso?: string | null): string[] {
  if (
    !startIso ||
    !endIso ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startIso) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endIso) ||
    startIso > endIso
  ) {
    return [];
  }
  const dates: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00Z`);
  const limit = new Date(`${endIso}T00:00:00Z`);
  let guard = 0;
  while (cursor <= limit && guard < 40) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return dates;
}
