import { getApiBase } from './accommodations';
import type {
  PropertyChangeReplacementDocs,
  PropertyEditSnapshot,
} from './property-change';
import type { RegistrationAsset, RegistrationValues } from './property-registration';

const REQUEST_TIMEOUT_MS = 25_000;
const UPLOAD_TIMEOUT_MS = 90_000;

export class PropertyChangeApiError extends Error {
  constructor(
    message: string,
    public readonly status = 0
  ) {
    super(message);
    this.name = 'PropertyChangeApiError';
  }
  get isConflict() {
    return this.status === 409;
  }
}

export interface PropertyChangeSubmitResult {
  registrationId: number;
  propertyId?: number | null;
  status: string;
  name?: string | null;
  reasonNote?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
}

export function hostPropertyPhotoSource(documentId: number, token: string) {
  return {
    uri: `${getApiBase()}/api/host/property/photos/${documentId}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

async function assetBlob(asset: RegistrationAsset, signal?: AbortSignal): Promise<Blob> {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri, { signal });
  if (!response.ok) {
    throw new PropertyChangeApiError(
      `Tệp "${asset.fileName || 'đính kèm'}" không còn khả dụng. Vui lòng chọn lại.`
    );
  }
  return response.blob();
}

export async function fetchPropertyEditSnapshot(
  registrationId: number,
  token: string,
  signal?: AbortSignal
): Promise<PropertyEditSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(
      `${getApiBase()}/api/host/property-registrations/${registrationId}/edit`,
      {
        method: 'GET',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true || !result.data) {
      throw new PropertyChangeApiError(
        result?.message || 'Chưa thể tải dữ liệu đề nghị thay đổi nhà trọ.',
        response.status
      );
    }
    return result.data as PropertyEditSnapshot;
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof PropertyChangeApiError) throw cause;
    if (controller.signal.aborted) {
      throw new PropertyChangeApiError(
        'Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối và thử lại.'
      );
    }
    throw new PropertyChangeApiError(
      cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ NestHub.'
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function submitPropertyChangeRequest(
  registrationId: number,
  editPayload: {
    details: RegistrationValues;
    versionToken: string;
    retainedPhotoIds: number[];
  },
  files: {
    photos: readonly RegistrationAsset[];
    documents: PropertyChangeReplacementDocs;
  },
  token: string,
  signal?: AbortSignal
): Promise<PropertyChangeSubmitResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const form = new FormData();
    form.append(
      'edit',
      new Blob([JSON.stringify(editPayload)], { type: 'application/json' }),
      'edit.json'
    );

    const appendAsset = async (key: string, asset: RegistrationAsset) => {
      const blob = await assetBlob(asset, controller.signal);
      const ext =
        asset.mimeType === 'application/pdf' ? 'pdf' : asset.mimeType?.split('/')[1] || 'jpg';
      form.append(
        key,
        blob.slice(0, blob.size, asset.mimeType || undefined),
        asset.fileName || `${key}.${ext}`
      );
    };

    for (const photo of files.photos) {
      await appendAsset('photos', photo);
    }
    if (files.documents.ownership) await appendAsset('ownership', files.documents.ownership);
    if (files.documents.idCard) await appendAsset('idCard', files.documents.idCard);
    if (files.documents.fireSafety) await appendAsset('fireSafety', files.documents.fireSafety);

    const response = await fetch(
      `${getApiBase()}/api/host/property-registrations/${registrationId}/resubmit`,
      {
        method: 'POST',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: controller.signal,
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new PropertyChangeApiError(
        result?.message || 'Chưa thể gửi yêu cầu thay đổi thông tin nhà trọ.',
        response.status
      );
    }
    if (!Number.isSafeInteger(result.data?.registrationId)) {
      throw new PropertyChangeApiError(
        'Chưa xác nhận được kết quả từ máy chủ. Vui lòng kiểm tra trạng thái nhà trọ trước khi gửi lại.'
      );
    }
    return result.data as PropertyChangeSubmitResult;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
