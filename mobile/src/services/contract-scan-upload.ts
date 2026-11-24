import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiBase } from './accommodations';
import { HostError, hostRequest } from './host';
import type { ContractCreatePayload, ContractTemplateCatalog } from './contract-wizard';
import { validateRentalContractsList, type RentalContractRecord } from './rental-contracts';

export interface ScanLocalFile {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  file?: globalThis.File;
}

export interface ScanUncertainSpan {
  code: string;
  line: number;
  reason: string;
}

export interface ScanReviewReminder {
  id: string;
  category: string;
  label: string;
  line: number;
  value: string;
}

export interface ScanPageResult {
  pageId: string;
  fileId: string;
  fileIndex: number;
  fileName: string;
  sourcePageIndex: number;
  pageNumber: number;
  totalPages: number;
  extractionMethod: string;
  pageStatus: 'readable' | 'needs_review' | 'blank' | 'unreadable' | string;
  text: string;
  uncertainSpans: ScanUncertainSpan[];
  reviewReminders: ScanReviewReminder[];
  previewDataUrl?: string | null;
  error?: string | null;
}

export interface ContractScanResult {
  totalFiles: number;
  totalPages: number;
  processedPages: number;
  pages: ScanPageResult[];
  warnings: string[];
}

export async function fetchContractTemplates(
  token: string,
  signal: AbortSignal
): Promise<ContractTemplateCatalog> {
  const data = await hostRequest<ContractTemplateCatalog>(
    '/host/rental-contracts/templates',
    token,
    signal
  );
  if (
    !data ||
    !Array.isArray(data.templates) ||
    typeof data.scanAvailable !== 'boolean' ||
    !data.templates.every(
      t => typeof t.id === 'string' && typeof t.name === 'string' && typeof t.terms === 'string'
    )
  ) {
    throw new HostError('Không tải được danh mục mẫu hợp đồng hợp lệ.', 502);
  }
  return data;
}

export async function createRoomContractApi(
  roomId: number,
  payload: ContractCreatePayload,
  token: string,
  signal: AbortSignal
): Promise<RentalContractRecord> {
  const result = await hostRequest<RentalContractRecord>(
    `/host/rental-contracts/rooms/${roomId}`,
    token,
    signal,
    payload,
    'POST'
  );
  return validateRentalContractsList([result])[0];
}

export async function occupyRoomAndCreateContractApi(
  params: {
    propertyId: number;
    roomId: number;
    leaseStartDate: string;
    leaseEndDate: string;
    contract: ContractCreatePayload;
  },
  token: string,
  signal: AbortSignal
): Promise<void> {
  await hostRequest(
    '/host/rooms/status',
    token,
    signal,
    {
      propertyId: params.propertyId,
      roomIds: [params.roomId],
      status: 'OCCUPIED',
      leaseStartDate: params.leaseStartDate,
      leaseEndDate: params.leaseEndDate,
      contracts: [params.contract],
    },
    'PATCH'
  );
}

export async function scanContractFilesNative(
  roomId: number,
  files: readonly ScanLocalFile[],
  token: string,
  signal: AbortSignal
): Promise<ContractScanResult> {
  if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
  const form = new FormData();
  form.append('roomId', String(roomId));
  form.append('consent', 'true');

  for (let i = 0; i < files.length; i += 1) {
    const item = files[i];
    const file = new File(item.uri);
    if (!file.exists) {
      throw new HostError(`Tệp "${item.fileName}" không còn khả dụng. Vui lòng chọn lại.`, 400);
    }
    const body =
      file.type === item.mimeType
        ? file
        : new Blob([await file.bytes()], { type: item.mimeType });
    form.append('files', body, item.fileName);
  }

  const response = await fetch(`${getApiBase()}/api/host/rental-contracts/scan`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true || !Array.isArray(result.data?.pages)) {
    throw new HostError(
      result?.message || 'Chưa thể quét tài liệu hợp đồng. Vui lòng thử lại.',
      response.status
    );
  }
  return result.data as ContractScanResult;
}
