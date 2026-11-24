/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function loadTsModule<T>(relativePath: string): T {
  const url = new URL(relativePath, import.meta.url);
  const code = ts.transpileModule(readFileSync(url, 'utf8'), {
    fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, { module: mod, exports: mod.exports });
  return mod.exports as T;
}

const api = loadTsModule<typeof import('../src/services/room-billing')>(
  '../src/services/room-billing.ts'
);

const partialOverdueBill: import('../src/services/room-billing').BillingBill = {
  id: 1,
  revision: 2,
  propertyId: 10,
  roomId: 102,
  tenancyKey: 't-50',
  roomNumber: 'P.102',
  tenantName: 'Duy Ninh',
  month: '2026-11',
  kind: 'MAIN',
  dueDate: '2026-11-21',
  issuedAt: '2026-11-05T08:00:00Z',
  status: 'PARTIAL',
  overdue: true,
  rentFrom: '2026-11-01',
  rentThrough: '2026-11-30',
  rentAmount: '2200000',
  includesUtilities: false,
  electricityAmount: '0',
  waterAmount: '0',
  charges: [
    { label: 'Internet', amount: '100000' },
    { label: 'Phí dịch vụ', amount: '50000' },
  ],
  totalAmount: '2350000',
  paidAmount: '300000',
  outstanding: '2050000',
};

const draftBill: import('../src/services/room-billing').BillingBill = {
  ...partialOverdueBill,
  id: 2,
  roomId: 103,
  roomNumber: 'P.103',
  status: 'DRAFT',
  overdue: false,
  issuedAt: null,
  totalAmount: '6600000',
  paidAmount: '0',
  outstanding: '6600000',
};

test('billTotals excludes DRAFT bills, handles zero total safely, and preserves dual status + overdue counts', () => {
  const totals = api.billTotals([partialOverdueBill, draftBill]);
  assert.equal(totals.total, 2350000n);
  assert.equal(totals.paid, 300000n);
  assert.equal(totals.outstanding, 2050000n);
  assert.equal(totals.issuedCount, 1);
  assert.equal(totals.draftCount, 1);
  assert.equal(totals.overdueCount, 1);
  assert.equal(totals.paidPercent, 12);

  const empty = api.billTotals([]);
  assert.equal(empty.total, 0n);
  assert.equal(empty.paidPercent, 0);

  // Never reports 100% when paid < total
  assert.equal(
    api.billPaidPercent({ status: 'PARTIAL', totalAmount: '1000000', paidAmount: '999999' }),
    99
  );
  assert.equal(
    api.billPaidPercent({ status: 'PAID', totalAmount: '1000000', paidAmount: '1000000' }),
    100
  );
});

test('filterBills supports code/room/tenant search, simultaneous PARTIAL + OVERDUE filtering, and earlier debt', () => {
  assert.equal(
    api.filterBills([partialOverdueBill, draftBill], [], { status: 'PARTIAL' }).length,
    1
  );
  assert.equal(
    api.filterBills([partialOverdueBill, draftBill], [], { status: 'OVERDUE' }).length,
    1
  );
  assert.equal(
    api.filterBills([partialOverdueBill, draftBill], [], { query: '#001' }).length,
    1
  );
  assert.equal(
    api.filterBills([], [partialOverdueBill], { status: 'EARLIER' }).length,
    1
  );
});

test('validatePaymentInput enforces positive integer <= outstanding and non-future paidOn', () => {
  const validPartial = api.validatePaymentInput({
    amountText: '500.000',
    paidOn: '2026-11-22',
    todayIso: '2026-11-23',
    outstanding: '2050000',
  });
  assert.equal(validPartial.valid, true);
  assert.equal(validPartial.amount, 500000n);
  assert.equal(validPartial.remainingAfter, 1550000n);

  const overpay = api.validatePaymentInput({
    amountText: '2500000',
    paidOn: '2026-11-22',
    todayIso: '2026-11-23',
    outstanding: '2050000',
  });
  assert.equal(overpay.valid, false);
  assert.ok(overpay.error?.includes('vượt quá'));

  const zero = api.validatePaymentInput({
    amountText: '0',
    paidOn: '2026-11-22',
    todayIso: '2026-11-23',
    outstanding: '2050000',
  });
  assert.equal(zero.valid, false);

  const futureDate = api.validatePaymentInput({
    amountText: '100000',
    paidOn: '2026-11-25',
    todayIso: '2026-11-23',
    outstanding: '2050000',
  });
  assert.equal(futureDate.valid, false);
  assert.ok(futureDate.error?.includes('tương lai'));
});

test('anti-duplicate utilities validation blocks double billing and allows valid supplemental utility bill', () => {
  const finalizedUtilities = {
    readOn: '2026-11-20',
    electricityAmount: '700000',
    waterAmount: '150000',
  };

  const blocked = api.validateDraftInput({
    kind: 'UTILITIES',
    dueDate: '2026-11-28',
    rentText: '0',
    includeUtilities: true,
    utilities: finalizedUtilities,
    utilitiesBlockedByOtherBill: true,
    charges: [],
  });
  assert.equal(blocked.valid, false);
  assert.ok(blocked.error?.includes('tính trùng'));

  const validSupp = api.validateDraftInput({
    kind: 'UTILITIES',
    dueDate: '2026-11-28',
    rentText: '0',
    includeUtilities: true,
    utilities: finalizedUtilities,
    utilitiesBlockedByOtherBill: false,
    charges: [],
  });
  assert.equal(validSupp.valid, true);
  assert.equal(validSupp.totalAmount, 850000n);
});

test('schedule validation, month-end rule for 29-31, UUID requestKey, and CSV export match backend contracts', () => {
  assert.equal(api.validateScheduleInput({ cycleMonths: 3, dueDay: 5, firstDueDate: '2026-11-21' }), null);
  assert.ok(api.validateScheduleInput({ cycleMonths: 13, dueDay: 5, firstDueDate: '2026-11-21' }));
  assert.ok(api.validateScheduleInput({ cycleMonths: 1, dueDay: 32, firstDueDate: '2026-11-21' }));
  assert.ok(api.describeDueDayRule(31).includes('ngày cuối cùng'));
  assert.equal(api.describeDueDayRule(15), '');

  const uuid = api.generatePaymentRequestKey();
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  const csv = api.buildBillsCsv([partialOverdueBill], { propertyName: 'Nhà trọ Xanh', month: '2026-11' });
  assert.ok(csv.includes('#001'));
  assert.ok(csv.includes('2350000'));
  assert.ok(csv.includes('Quá hạn'));
});
