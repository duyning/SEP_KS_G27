import { buildBillsCsv, type BillingBill } from './room-billing';

export async function exportBillsCsvReport(
  bills: readonly BillingBill[],
  meta: { propertyName?: string; month?: string }
): Promise<void> {
  const csv = buildBillsCsv(bills, meta);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Bao-cao-phieu-thu-${meta.month || 'ky'}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
