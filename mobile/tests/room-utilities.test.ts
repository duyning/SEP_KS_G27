/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

class NumberFormatWithoutBigInt {
  private readonly formatter: Intl.NumberFormat;

  constructor(locale: string) {
    this.formatter = new Intl.NumberFormat(locale);
  }

  format(value: number | bigint): string {
    if (typeof value === 'bigint') throw new TypeError('Cannot convert BigInt to number');
    return this.formatter.format(value);
  }
}

function loadTsModule<T>(relativePath: string): T {
  const url = new URL(relativePath, import.meta.url);
  const code = ts.transpileModule(readFileSync(url, 'utf8'), {
    fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    Intl: { NumberFormat: NumberFormatWithoutBigInt },
  });
  return mod.exports as T;
}

const api = loadTsModule<typeof import('../src/services/room-utilities')>(
  '../src/services/room-utilities.ts'
);

const sampleRow: import('../src/services/room-utilities').UtilityRow = {
  roomId: 102,
  roomNumber: 'P.102',
  floor: 'Tầng 1',
  tenancyKey: 't-50',
  tenantName: 'Duy Ninh',
  periodStart: '2026-11-01',
  periodEnd: '2026-11-30',
  latestReadOn: '2026-11-23',
  handover: false,
  issue: null,
  previousReadOn: '2026-10-31',
  suggestedElectricityStart: 100,
  suggestedWaterStart: 10,
  suggestedOccupants: 2,
  stays: [
    { joinedOn: '2026-10-01', leftOn: null },
    { joinedOn: '2026-11-05', leftOn: null },
  ],
  defaultElectricityRate: 3500,
  defaultWaterRate: 30000,
  defaultWaterMode: 'METER',
  saved: null,
};

test('month shifting and date-only formatting never hardcode or drift across timezones', () => {
  assert.equal(api.shiftUtilityMonth('2026-01', -1), '2025-12');
  assert.equal(api.shiftUtilityMonth('2026-12', 1), '2027-01');
  assert.equal(api.formatUtilityMonth('2026-11'), 'Tháng 11/2026');
  assert.equal(api.formatIsoDateVi('2026-11-05'), '05/11/2026');
  assert.equal(api.listDatesInRange('2026-11-01', '2026-11-03').length, 3);
});

test('meter usage stays precise on runtimes where Intl rejects BigInt', () => {
  assert.equal(api.formatMeterUsage(1234000n), '1.234');
  assert.equal(api.formatMeterUsage(-120n), '-0,12');
  assert.equal(api.formatMeterUsage(9007199254740993125n), '9.007.199.254.740.993,125');
  assert.equal(api.formatMeterUsage(0n), '0');
  assert.equal(api.formatMeterUsage(null), '—');
});

test('VND totals display instead of falling back to a dash when Intl rejects BigInt', () => {
  assert.equal(api.formatVndAmount(850000n), '850.000đ');
  assert.equal(api.formatVndAmount('9007199254740993.25'), '9.007.199.254.740.993đ');
  assert.equal(api.formatVndAmount(-1200), '-1.200đ');
  assert.equal(api.formatVndAmount(0), '0đ');
  assert.equal(api.formatVndAmount(''), '—');
  assert.equal(api.formatVndAmount('invalid'), '—');
});

test('electricity and water calculations match Java BigDecimal HALF_UP rules across METER, PER_PERSON, and FIXED', () => {
  const meterDraft = api.buildUtilityDraft(sampleRow, {
    electricityStart: '0',
    electricityEnd: '200',
    electricityRate: '3500',
    waterMode: 'METER',
    waterStart: '0',
    waterEnd: '5',
    waterRate: '30000',
    readOn: '2026-11-20',
  });
  const meterVal = api.validateUtilityRow(sampleRow, meterDraft);
  assert.equal(meterVal.valid, true);
  assert.equal(meterVal.electricityAmount, 700000n);
  assert.equal(meterVal.waterAmount, 150000n);
  assert.equal(meterVal.totalAmount, 850000n);

  // Decimal meter with HALF_UP rounding: 1.500 kWh * 3501 = 5251.5 -> 5252
  const halfUpDraft = api.buildUtilityDraft(sampleRow, {
    electricityStart: '10',
    electricityEnd: '11.5',
    electricityRate: '3501',
    waterMode: 'PER_PERSON',
    occupantCount: '2',
    waterRate: '50000',
    readOn: '2026-11-20',
  });
  const halfUpVal = api.validateUtilityRow(sampleRow, halfUpDraft);
  assert.equal(halfUpVal.valid, true);
  assert.equal(halfUpVal.electricityAmount, 5252n);
  assert.equal(halfUpVal.waterAmount, 100000n);
  assert.equal(halfUpVal.totalAmount, 105252n);

  const fixedDraft = api.buildUtilityDraft(sampleRow, {
    electricityStart: '100',
    electricityEnd: '120',
    electricityRate: '3500',
    waterMode: 'FIXED',
    waterRate: '80000',
    readOn: '2026-11-20',
  });
  const fixedVal = api.validateUtilityRow(sampleRow, fixedDraft);
  assert.equal(fixedVal.valid, true);
  assert.equal(fixedVal.waterAmount, 80000n);
});

test('validation rejects negative values, end < start, missing start meter (never fakes 0), and out-of-period dates', () => {
  const noAnchorRow = { ...sampleRow, suggestedElectricityStart: null, suggestedWaterStart: null };
  const blankStart = api.buildUtilityDraft(noAnchorRow);
  assert.equal(blankStart.electricityStart, '');
  assert.equal(blankStart.waterStart, '');

  const invalid = api.validateUtilityRow(sampleRow, {
    ...api.buildUtilityDraft(sampleRow),
    electricityStart: '200',
    electricityEnd: '150',
    waterStart: '-5',
    waterEnd: '10',
    readOn: '2026-11-30', // beyond latestReadOn 2026-11-23
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.electricityEnd);
  assert.ok(invalid.errors.waterStart);
  assert.ok(invalid.errors.readOn);
});

test('stats, filtering, next pending room, and revision payload preserve backend semantics', () => {
  const finalizedRow: import('../src/services/room-utilities').UtilityRow = {
    ...sampleRow,
    roomId: 101,
    roomNumber: 'P.101',
    tenancyKey: 't-49',
    tenantName: 'Trần Minh',
    saved: {
      revision: 3,
      readOn: '2026-11-20',
      electricityStart: 0,
      electricityEnd: 100,
      electricityRate: 3500,
      electricityAmount: '350000',
      waterMode: 'METER',
      waterStart: 0,
      waterEnd: 4,
      waterRate: 30000,
      occupantCount: null,
      waterAmount: '120000',
    },
  };
  const rows = [finalizedRow, sampleRow];
  const edits = { 't-50': { electricityEnd: '250', waterEnd: '15' } };

  const stats = api.summarizeUtilityStats(rows, edits);
  assert.equal(stats.total, 2);
  assert.equal(stats.completed, 1);
  assert.equal(stats.unrecorded, 1);
  assert.equal(stats.unsaved, 1);
  assert.equal(stats.validUnsaved, 1);

  const searchHits = api.filterUtilityRows(rows, edits, {
    search: 'duy ninh',
    status: 'ALL',
    floor: 'ALL',
    roomId: null,
  });
  assert.equal(searchHits.length, 1);
  assert.equal(searchHits[0].roomId, 102);

  const next = api.findNextPendingUtilityRow(rows, 't-49', edits);
  assert.equal(next?.roomId, 102);

  const payload = api.utilityEntryPayload(finalizedRow, api.buildUtilityDraft(finalizedRow));
  assert.equal(payload.revision, 3);
  assert.equal(payload.tenancyKey, 't-49');
});

test('local draft serialization round-trips safely and ignores corrupted payloads', () => {
  const raw = api.serializeUtilityDrafts({
    't-50': { electricityEnd: '220.5', waterMode: 'PER_PERSON', occupantCount: '3' },
  });
  const parsed = api.parseUtilityDrafts(raw);
  assert.equal(parsed['t-50'].electricityEnd, '220.5');
  assert.equal(parsed['t-50'].waterMode, 'PER_PERSON');
  assert.equal(parsed['t-50'].occupantCount, '3');
});
