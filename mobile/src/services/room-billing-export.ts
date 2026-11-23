import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';
import { buildBillsCsv, type BillingBill } from './room-billing';

export async function exportBillsCsvReport(
  bills: readonly BillingBill[],
  meta: { propertyName?: string; month?: string }
): Promise<void> {
  const csv = buildBillsCsv(bills, meta);
  const safeMonth = (meta.month || 'ky').replace(/[^0-9-]/g, '');
  const file = new File(Paths.cache, `Bao-cao-phieu-thu-${safeMonth}.csv`);
  await file.write(csv);
  await Share.share({
    title: `Báo cáo phiếu thu ${meta.month || ''}`,
    message: csv,
    url: file.uri,
  });
}
