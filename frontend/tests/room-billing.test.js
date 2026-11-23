import assert from 'node:assert/strict';
import test from 'node:test';
import {
  billPaidPercent,
  billTotals,
  buildBillsCsv,
  candidateNeedsBilling,
  candidateNeedsSupplementalUtilities,
  describeDueDayRule,
  filterBills,
  formatBillCode,
  formatVndInput,
  vndDigits,
  vndValue,
} from '../src/services/room-billing.js';

const issuedPartial = {
  id: 1, roomId: 102, roomNumber: '102', tenantName: 'Duy Ninh', month: '2026-11',
  kind: 'MAIN', dueDate: '2026-11-21', status: 'PARTIAL', overdue: true,
  rentAmount: '2200000', includesUtilities: false, electricityAmount: '0', waterAmount: '0',
  totalAmount: '2350000', paidAmount: '200000', outstanding: '2150000',
};
const draftBill = {
  id: 2, roomId: 103, roomNumber: '103', tenantName: 'Lan Anh', month: '2026-11',
  kind: 'MAIN', dueDate: '2026-11-25', status: 'DRAFT', overdue: false,
  rentAmount: '2200000', includesUtilities: false, electricityAmount: '0', waterAmount: '0',
  totalAmount: '2200000', paidAmount: '0', outstanding: '2200000',
};

test('billTotals excludes DRAFT bills and calculates exact BigInt sums', () => {
  const totals = billTotals([issuedPartial, draftBill]);
  assert.equal(totals.total, 2350000n);
  assert.equal(totals.paid, 200000n);
  assert.equal(totals.outstanding, 2150000n);
  assert.equal(totals.issuedCount, 1);
  assert.equal(totals.unpaidCount, 1);
  assert.equal(totals.overdueCount, 1);
});

test('formatting, progress percentage and month-end due day rule behave accurately', () => {
  assert.equal(formatBillCode(1), '#001');
  assert.equal(formatBillCode(1234), '#1234');
  assert.equal(formatVndInput('2350000'), '2.350.000');
  assert.equal(vndDigits('2.350.000'), '2350000');
  assert.equal(vndValue('2350000'), 2350000n);
  assert.equal(billPaidPercent(issuedPartial), 8);
  assert.equal(billPaidPercent(draftBill), 0);
  assert.equal(describeDueDayRule(15), '');
  assert.ok(describeDueDayRule(31).includes('ngày cuối cùng'));
});

test('pending candidate filtering excludes already-billed tenancies except intentional supplemental utility bills', () => {
  const unbilled = { tenancyKey: 't-1', mainBillId: null, mainIssued: false, issue: null, utilities: null };
  const billedComplete = {
    tenancyKey: 't-2', mainBillId: 1, mainIssued: true, issue: null,
    utilities: { electricityAmount: '100000', waterAmount: '50000' }, utilitiesAlreadyBilled: true, utilityBillId: null,
  };
  const needsSupp = {
    tenancyKey: 't-3', mainBillId: 3, mainIssued: true, issue: null,
    utilities: { electricityAmount: '100000', waterAmount: '50000' }, utilitiesAlreadyBilled: false, utilityBillId: null,
  };
  assert.equal(candidateNeedsBilling(unbilled), true);
  assert.equal(candidateNeedsBilling(billedComplete), false);
  assert.equal(candidateNeedsBilling(needsSupp), true);
  assert.equal(candidateNeedsSupplementalUtilities(needsSupp), true);
});

test('filterBills supports room, payment status, overdue, earlier debt, code/tenant search and CSV export', () => {
  assert.equal(filterBills([issuedPartial, draftBill], [], { status: 'OVERDUE' }).length, 1);
  assert.equal(filterBills([issuedPartial, draftBill], [], { status: 'DRAFT' }).length, 1);
  assert.equal(filterBills([issuedPartial, draftBill], [], { query: '#001' }).length, 1);
  assert.equal(filterBills([issuedPartial, draftBill], [], { query: 'Duy Ninh' }).length, 1);
  assert.equal(filterBills([issuedPartial, draftBill], [], { roomFilter: '103' }).length, 1);
  const csv = buildBillsCsv([issuedPartial], { propertyName: 'Nhà trọ A', month: '2026-11' });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('#001'));
  assert.ok(csv.includes('2350000'));
});
