import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessUtilityDraft,
  buildUtilityDraft,
  calculateUtilityUsage,
  formatMeterUsage,
  hasRealUtilityEdit,
  partitionUtilitySaveBatch,
  summarizeUtilityStats,
  utilityOccupantCount,
  utilityPayload,
} from '../src/services/room-utilities.js';

test('saving any measured date closes the period and the next draft fills both meter baselines', () => {
  const stats = summarizeUtilityStats([
    { roomId: 1, tenancyKey: 't-1', periodEnd: '2026-11-30', saved: { readOn: '2026-11-21' } },
    { roomId: 2, tenancyKey: 't-2', periodEnd: '2026-11-30', saved: { readOn: '2026-11-30' } },
    { roomId: 3, tenancyKey: 't-3', periodEnd: '2026-11-30' },
    { roomId: 4, issue: 'Cần bổ sung hồ sơ.' },
  ], {});
  assert.equal(stats.completed, 2);
  assert.equal(stats.unrecorded, 1);
  assert.equal(stats.issueCount, 1);
  assert.equal(stats.dirty, 0);
  const next = buildUtilityDraft({ latestReadOn: '2026-12-21', suggestedElectricityStart: 150, suggestedWaterStart: 4, defaultWaterMode: 'METER' });
  assert.equal(next.electricityStart, '150');
  assert.equal(next.waterStart, '4');
});

const draft = {
  readOn: '2026-11-15', electricityStart: '120', electricityEnd: '195', electricityRate: '3500',
  waterStart: '8.125', waterEnd: '12.125', waterRate: '10000', waterMode: 'METER', suggestedOccupants: 2, occupantCount: '',
};

test('meter, per-person and fixed charges are calculated with integer VND rounding', () => {
  assert.deepEqual(assessUtilityDraft(draft), { errors: {}, electricityAmount: 262500n, waterAmount: 40000n });
  assert.equal(assessUtilityDraft({ ...draft, waterMode: 'PER_PERSON' }).waterAmount, 20000n);
  assert.equal(assessUtilityDraft({ ...draft, waterMode: 'FIXED' }).waterAmount, 10000n);
  assert.equal(assessUtilityDraft({ ...draft, electricityEnd: '120.001' }).electricityAmount, 4n);
  assert.equal(assessUtilityDraft({ ...draft, electricityStart: '0', electricityEnd: '999999999.999', electricityRate: '999999999' }).electricityAmount,
    999999998999000000n);
});

test('a missing or decreasing reading has a field error and does not become a zero charge', () => {
  const result = assessUtilityDraft({ ...draft, electricityEnd: '119', waterStart: '' });
  assert.ok(result.errors.electricityEnd);
  assert.ok(result.errors.waterStart);
  assert.equal(result.electricityAmount, null);
  assert.equal(result.waterAmount, null);
  const entry = utilityPayload({ roomId: 8, tenancyKey: 't-3', saved: { revision: 0 } }, { ...draft, waterMode: 'PER_PERSON' });
  assert.equal(entry.revision, 0);
  assert.equal(entry.occupantCount, null);
  assert.equal(entry.waterStart, null);
});

test('the per-person preview counts occupants who stayed during the selected part of the month', () => {
  const row = {
    periodStart: '2026-11-15',
    stays: [
      { joinedOn: '2026-10-01', leftOn: '2026-11-14' },
      { joinedOn: '2026-11-15', leftOn: null },
      { joinedOn: '2026-11-20', leftOn: null },
    ],
  };
  assert.equal(utilityOccupantCount(row, '2026-11-16'), 1);
  assert.equal(utilityOccupantCount(row, '2026-11-21'), 2);
});

test('usage calculation and formatting handle exact decimals and missing/decreasing inputs', () => {
  const usage = calculateUtilityUsage(draft);
  assert.equal(usage.electricityUsage, 75000n);
  assert.equal(usage.waterUsage, 4000n);
  assert.equal(formatMeterUsage(usage.electricityUsage), '75');
  assert.equal(formatMeterUsage(4125n), '4,125');
  assert.equal(formatMeterUsage(null), '—');
  assert.equal(calculateUtilityUsage({ ...draft, electricityEnd: '119' }).electricityUsage, null);
});

test('partial bulk save partitions valid and invalid edits and respects handover carry-over dependencies', () => {
  const r1 = {
    roomId: 1, roomNumber: '101', floor: 'Tầng 1', tenancyKey: 't-1', tenantName: 'An',
    periodStart: '2026-11-01', periodEnd: '2026-11-30', latestReadOn: '2026-11-30',
    handover: false, issue: null, suggestedElectricityStart: 100, suggestedWaterStart: 10,
    suggestedOccupants: 1, defaultElectricityRate: 3500, defaultWaterRate: 15000, defaultWaterMode: 'METER', saved: null,
  };
  const r2Old = {
    roomId: 2, roomNumber: '102', floor: 'Tầng 1', tenancyKey: 't-2', tenantName: 'Cũ',
    periodStart: '2026-11-01', periodEnd: '2026-11-14', latestReadOn: '2026-11-14',
    handover: true, issue: null, suggestedElectricityStart: 200, suggestedWaterStart: 20,
    suggestedOccupants: 1, defaultElectricityRate: 3500, defaultWaterRate: 15000, defaultWaterMode: 'METER', saved: null,
  };
  const r2New = {
    roomId: 2, roomNumber: '102', floor: 'Tầng 1', tenancyKey: 't-3', tenantName: 'Mới',
    periodStart: '2026-11-15', periodEnd: '2026-11-30', latestReadOn: '2026-11-30',
    handover: false, issue: null, suggestedElectricityStart: null, suggestedWaterStart: null,
    suggestedOccupants: 2, defaultElectricityRate: 3500, defaultWaterRate: 90000, defaultWaterMode: 'PER_PERSON', saved: null,
  };

  // Editing and reverting back to baseline does NOT count as dirty
  assert.equal(hasRealUtilityEdit(r1, { electricityStart: '100' }), false);
  assert.equal(hasRealUtilityEdit(r1, { electricityEnd: '150' }), true);

  // r1 valid, r2Old invalid (decreasing electricity), r2New depends on r2Old's handover reading -> held back!
  const edits = {
    't-1': { electricityEnd: '160', waterEnd: '14' },
    't-2': { readOn: '2026-11-14', electricityEnd: '190', waterEnd: '22' },
    't-3': { electricityEnd: '250' },
  };
  const batch = partitionUtilitySaveBatch([r1, r2Old, r2New], edits);
  assert.deepEqual(batch.validItems.map(i => i.key), ['t-1']);
  assert.deepEqual(batch.invalidItems.map(i => i.key), ['t-2', 't-3']);
  assert.equal(batch.invalidItems.find(i => i.key === 't-3').blockedByPrior, true);

  const stats = summarizeUtilityStats([r1, r2Old, r2New], edits);
  assert.equal(stats.total, 3);
  assert.equal(stats.completed, 0);
  assert.equal(stats.dirty, 3);
  assert.equal(stats.validDirty, 1);
  assert.equal(stats.invalidDirty, 2);
});
