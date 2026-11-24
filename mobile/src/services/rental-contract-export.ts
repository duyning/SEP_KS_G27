import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { HostError } from './host';
import {
  buildContractHtmlDocument,
  buildContractModel,
  fetchRoomContractsFull,
  type RentalContractRecord,
} from './rental-contracts';

const trackedExportFiles = new Set<File>();

export async function cleanupTemporaryContractExports(): Promise<void> {
  for (const file of Array.from(trackedExportFiles)) {
    trackedExportFiles.delete(file);
    try {
      if (file.exists) await file.delete();
    } catch {
      /* Cleanup failure must not break user flow or log PII. */
    }
  }
}

function safeFileSlug(roomNumber?: string | null): string {
  const raw = String(roomNumber || 'phong').trim();
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'phong';
}

function buildPlainContractSummaryForAndroidShare(record: RentalContractRecord): string {
  const model = buildContractModel(record);
  const lines = [
    model.title,
    model.contractCode ? `Mã hợp đồng: ${model.contractCode}` : null,
    model.rentalLocation ? `Phòng / Nhà trọ: ${model.rentalLocation}` : null,
    model.lease.startDate && model.lease.endDate
      ? `Thời hạn: ${model.lease.startDate} – ${model.lease.endDate}`
      : null,
    model.finance.rent ? `Giá thuê: ${model.finance.rent}/tháng` : null,
    model.finance.deposit ? `Tiền đặt cọc: ${model.finance.deposit}` : null,
    `Bên cho thuê: ${model.ownerSignature ? 'Đã ký trên hệ thống' : 'Chưa ký'}`,
    `Bên thuê: ${model.tenantSignature ? 'Đã ký trên hệ thống' : 'Chưa ký'}`,
    '',
    'Mở ứng dụng NestHub hoặc cổng web để in / lưu bản PDF đầy đủ theo đúng định dạng A4.',
  ].filter(Boolean);
  return lines.join('\n');
}

/**
 * Verifies backend access & authoritative version before exporting/sharing the contract document.
 * Always cleans up temporary cache files promptly so sensitive contract PII does not linger.
 */
export async function exportContractDocument(params: {
  roomId: number;
  contractId: number;
  token: string;
  signal: AbortSignal;
}): Promise<{ exportedContract: RentalContractRecord; note: string }> {
  if (!params.token) {
    throw new HostError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
  }

  // Always verify permission & latest authoritative signed version from backend
  const latestList = await fetchRoomContractsFull(params.roomId, params.token, params.signal);
  const authoritative = latestList.find(item => item.id === params.contractId);
  if (!authoritative) {
    throw new HostError('Không tìm thấy phiên bản hợp đồng này trên hệ thống.', 404);
  }

  const title = `Hop-dong-phong-${safeFileSlug(authoritative.roomNumber)}`;
  const html = buildContractHtmlDocument(authoritative, { forPrint: true, fontScalePercent: 100 });

  if (Platform.OS === 'ios') {
    const tempFile = new File(Paths.cache, `${title}-${Date.now()}.html`);
    trackedExportFiles.add(tempFile);
    try {
      await tempFile.write(html);
      await Share.share({
        title,
        url: tempFile.uri,
      });
      return {
        exportedContract: authoritative,
        note: 'Đã mở trình chia sẻ / in PDF cho bản hợp đồng chính thức mới nhất.',
      };
    } finally {
      // Remove temporary file after share sheet closes so PII is not retained in cache
      setTimeout(() => {
        void cleanupTemporaryContractExports();
      }, 3000);
    }
  }

  // Android: native Share sheet without leaving lingering sensitive files in shared storage
  await Share.share({
    title,
    message: buildPlainContractSummaryForAndroidShare(authoritative),
  });
  return {
    exportedContract: authoritative,
    note: 'Đã mở hộp thoại chia sẻ thông tin hợp đồng. Để xuất tệp PDF A4 có đầy đủ nét ký, hãy dùng trình in trên bản web hoặc bản build có expo-print.',
  };
}
