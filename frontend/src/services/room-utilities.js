import { request } from './auth.js';

const basePath = '/api/host/room-utilities';
const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' });

export function utilityCurrentMonth() {
  const parts = dateParts.formatToParts();
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
}

export function formatUtilityMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return month || '';
  const [year, m] = month.split('-');
  return `Tháng ${Number(m)}/${year}`;
}

export function roomUtilitiesPath(propertyId, roomId, month) {
  const params = new URLSearchParams({ propertyId, utilities: '1' });
  if (roomId) params.set('roomId', roomId);
  if (month) params.set('month', month);
  return `/host/rooms?${params}`;
}

export const roomUtilitiesApi = {
  list: (propertyId, month, signal) => request(`?${new URLSearchParams({ propertyId, month })}`, { basePath, signal }),
  save: (body, signal) => request('', { basePath, method: 'POST', body, signal }),
};

export const utilityRowKey = row => row.tenancyKey || `room-${row.roomId}`;
export const isUtilityRowFinal = row => Boolean(row.saved);

const textValue = value => (value == null ? '' : String(value));
const previousDay = date => {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() - 1);
  return instant.toISOString().slice(0, 10);
};

export function utilityOccupantCount(row, readOn) {
  if (!row.stays || !readOn) return row.suggestedOccupants;
  return row.stays.filter(stay => stay.joinedOn <= readOn && (!stay.leftOn || stay.leftOn >= row.periodStart)).length;
}

const meterSyntax = /^\d{1,9}(?:\.\d{1,3})?$/;
const rateSyntax = /^\d{1,9}$/;
const whole = value => BigInt(value);
const meterUnits = value => {
  const [integer, fraction = ''] = value.split('.');
  return whole(integer) * 1000n + whole(fraction.padEnd(3, '0'));
};

export function formatMeterUsage(milliUnits) {
  if (milliUnits === null || milliUnits === undefined) return '—';
  const negative = milliUnits < 0n;
  const abs = negative ? -milliUnits : milliUnits;
  const intPart = abs / 1000n;
  const fracPart = Number(abs % 1000n);
  const formattedInt = new Intl.NumberFormat('vi-VN').format(intPart);
  if (fracPart === 0) return `${negative ? '-' : ''}${formattedInt}`;
  const trimmedFrac = String(fracPart).padStart(3, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${formattedInt},${trimmedFrac}`;
}

export function calculateUtilityUsage(draft) {
  const delta = (startKey, endKey) => {
    if (!meterSyntax.test(draft[startKey] ?? '') || !meterSyntax.test(draft[endKey] ?? '')) return null;
    const diff = meterUnits(draft[endKey]) - meterUnits(draft[startKey]);
    return diff < 0n ? null : diff;
  };
  const electricityUsage = delta('electricityStart', 'electricityEnd');
  const waterUsage = draft.waterMode === 'METER' ? delta('waterStart', 'waterEnd') : null;
  return { electricityUsage, waterUsage };
}

export function assessUtilityDraft(draft) {
  const errors = {};
  const meters = (start, end) => {
    for (const key of [start, end]) {
      if (!meterSyntax.test(draft[key])) errors[key] = 'Nhập chỉ số dương hoặc 0, tối đa 3 chữ số thập phân.';
    }
    if (errors[start] || errors[end]) return null;
    const delta = meterUnits(draft[end]) - meterUnits(draft[start]);
    if (delta < 0n) errors[end] = 'Chỉ số mới thấp hơn chỉ số đầu.';
    return delta < 0n ? null : delta;
  };
  if (!draft.readOn) errors.readOn = 'Chọn ngày ghi.';
  for (const key of ['electricityRate', 'waterRate']) {
    if (!rateSyntax.test(draft[key])) errors[key] = 'Nhập đơn giá VND nguyên, từ 0 trở lên.';
  }
  const electricity = meters('electricityStart', 'electricityEnd');
  let water = 1000n;
  if (draft.waterMode === 'METER') water = meters('waterStart', 'waterEnd');
  if (draft.waterMode === 'PER_PERSON') {
    const count = draft.occupantCount === '' ? String(draft.suggestedOccupants) : draft.occupantCount;
    if (!/^\d{1,3}$/.test(count) || Number(count) > 200) errors.occupantCount = 'Nhập số người từ 0 đến 200.';
    water = errors.occupantCount ? null : whole(count) * 1000n;
  }
  const charge = (units, key) => (units === null || errors[key] ? null : (units * whole(draft[key]) + 500n) / 1000n);
  return { errors, electricityAmount: charge(electricity, 'electricityRate'), waterAmount: charge(water, 'waterRate') };
}

export function buildUtilityDraft(row, changes = null, preceding = null) {
  const values = row.saved;
  const readOn = changes?.readOn ?? values?.readOn ?? row.latestReadOn ?? '';
  return {
    readOn,
    electricityStart: textValue(values?.electricityStart ?? preceding?.electricityEnd ?? row.suggestedElectricityStart),
    electricityEnd: textValue(values?.electricityEnd),
    electricityRate: textValue(values?.electricityRate ?? row.defaultElectricityRate),
    waterMode: values?.waterMode ?? row.defaultWaterMode ?? 'METER',
    waterStart: textValue(values?.waterStart ?? preceding?.waterEnd ?? row.suggestedWaterStart),
    waterEnd: textValue(values?.waterEnd),
    waterRate: textValue(values?.waterRate ?? row.defaultWaterRate),
    occupantCount: textValue(values?.occupantCount),
    ...(changes || {}),
    suggestedOccupants: utilityOccupantCount(row, readOn),
  };
}

const EDITABLE_KEYS = [
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

export function hasRealUtilityEdit(row, changes, preceding = null) {
  if (!changes || Object.keys(changes).length === 0) return false;
  const baseline = buildUtilityDraft(row, null, preceding);
  const current = buildUtilityDraft(row, changes, preceding);
  return EDITABLE_KEYS.some(key => String(baseline[key] ?? '') !== String(current[key] ?? ''));
}

export function validateUtilityRow(row, draft) {
  const base = assessUtilityDraft(draft);
  const errors = { ...base.errors };
  if (!errors.readOn && row.periodStart && row.latestReadOn) {
    if (draft.readOn < row.periodStart || draft.readOn > row.latestReadOn) {
      errors.readOn = `Ngày ghi phải nằm trong kỳ (${row.periodStart.split('-').reverse().join('/')} – ${row.latestReadOn.split('-').reverse().join('/')}).`;
    }
  }
  const usage = calculateUtilityUsage(draft);
  return {
    errors,
    electricityAmount: base.electricityAmount,
    waterAmount: base.waterAmount,
    electricityUsage: usage.electricityUsage,
    waterUsage: usage.waterUsage,
    valid: !row.issue && Object.keys(errors).length === 0,
  };
}

export function findCarriedHandover(row, allRows, edits) {
  if (!row.periodStart || !Array.isArray(allRows)) return { priorRow: null, linkedDraft: null, carriedDate: null };
  const prior = allRows.find(
    candidate =>
      candidate !== row &&
      candidate.roomId === row.roomId &&
      candidate.handover &&
      !candidate.issue &&
      candidate.periodStart <= row.periodStart &&
      (candidate.periodEnd === row.periodStart || candidate.periodEnd === previousDay(row.periodStart)) &&
      hasRealUtilityEdit(candidate, edits[utilityRowKey(candidate)])
  );
  if (!prior) return { priorRow: null, linkedDraft: null, carriedDate: null };
  const priorDraft = buildUtilityDraft(prior, edits[utilityRowKey(prior)]);
  const linkedDraft = priorDraft.readOn === prior.periodEnd ? priorDraft : null;
  return { priorRow: prior, linkedDraft, carriedDate: linkedDraft?.readOn ?? null };
}

export function partitionUtilitySaveBatch(rows, edits) {
  const allRows = Array.isArray(rows) ? rows : [];
  const items = [];
  const priorValidity = new Map();

  // First pass: assess handover rows so dependent successor rows know if handover is valid.
  for (const row of allRows) {
    if (!row.handover) continue;
    const key = utilityRowKey(row);
    const edited = hasRealUtilityEdit(row, edits[key]);
    if (!edited) continue;
    const draft = buildUtilityDraft(row, edits[key]);
    const validation = validateUtilityRow(row, draft);
    priorValidity.set(key, validation.valid);
  }

  for (const row of allRows) {
    const key = utilityRowKey(row);
    const { priorRow, linkedDraft, carriedDate } = findCarriedHandover(row, allRows, edits);
    const edited = hasRealUtilityEdit(row, edits[key], linkedDraft);
    if (!edited) continue;
    const draft = buildUtilityDraft(row, edits[key], linkedDraft);
    const validation = validateUtilityRow(row, draft);
    const blockedByPrior = Boolean(priorRow && linkedDraft && priorValidity.get(utilityRowKey(priorRow)) === false);
    const valid = validation.valid && !blockedByPrior;
    items.push({
      key,
      row,
      draft,
      carried: carriedDate,
      validation,
      blockedByPrior,
      valid,
    });
  }

  return {
    dirtyItems: items,
    validItems: items.filter(item => item.valid),
    invalidItems: items.filter(item => !item.valid),
  };
}

export function summarizeUtilityStats(rows, edits) {
  const allRows = Array.isArray(rows) ? rows : [];
  const { dirtyItems, validItems, invalidItems } = partitionUtilitySaveBatch(allRows, edits);
  let completed = 0;
  let unrecorded = 0;
  let issueCount = 0;
  for (const row of allRows) {
    if (row.issue) issueCount++;
    else if (isUtilityRowFinal(row)) completed++;
    else unrecorded++;
  }
  return {
    total: allRows.length,
    completed,
    unrecorded,
    dirty: dirtyItems.length,
    validDirty: validItems.length,
    invalidDirty: invalidItems.length,
    issueCount,
  };
}

export function utilityPayload(row, draft) {
  return {
    roomId: row.roomId,
    tenancyKey: row.tenancyKey,
    revision: row.saved?.revision ?? null,
    readOn: draft.readOn,
    electricityStart: draft.electricityStart,
    electricityEnd: draft.electricityEnd,
    electricityRate: draft.electricityRate,
    waterMode: draft.waterMode,
    waterRate: draft.waterRate,
    waterStart: draft.waterMode === 'METER' ? draft.waterStart : null,
    waterEnd: draft.waterMode === 'METER' ? draft.waterEnd : null,
    occupantCount: draft.waterMode === 'PER_PERSON' && draft.occupantCount !== '' ? Number(draft.occupantCount) : null,
  };
}
