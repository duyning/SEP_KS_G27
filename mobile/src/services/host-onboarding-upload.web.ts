import { getApiBase } from './accommodations';
import {
  IDENTITY_MAX_BYTES,
  identityAssetError,
  type HostOnboardingCurrent,
  type OnboardingEditSnapshot,
  type OnboardingIdentityAsset,
  type OnboardingIdentitySide,
  type OnboardingRegistrationView,
} from './host-onboarding';
import {
  attachmentMime,
  type RegistrationAsset,
  type RegistrationFiles,
  type RegistrationValues,
} from './property-registration';

const REQUEST_TIMEOUT_MS = 25_000;
const UPLOAD_TIMEOUT_MS = 90_000;

async function fetchJsonWithTimeout<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    token: string;
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onParentAbort);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${options.token}`,
    };
    let body: string | undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${getApiBase()}/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'omit',
      headers,
      body,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new Error(result?.message || 'Không thể kết nối máy chủ HL_RCS. Vui lòng thử lại.');
    }
    return result.data as T;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new Error('Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối và thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onParentAbort);
  }
}

export async function fetchOnboardingCurrent(
  token: string,
  signal?: AbortSignal
): Promise<HostOnboardingCurrent> {
  return fetchJsonWithTimeout<HostOnboardingCurrent>('/host-onboarding/current', {
    method: 'GET',
    token,
    signal,
  });
}

export async function confirmPhoneVerification(
  phoneNumber: string,
  token: string,
  signal?: AbortSignal
): Promise<void> {
  await fetchJsonWithTimeout<unknown>('/auth/profile/phone/confirm', {
    method: 'POST',
    token,
    body: { phoneNumber: phoneNumber.trim() },
    signal,
  });
}

export function identityPreviewSource(
  applicationId: number,
  side: OnboardingIdentitySide,
  token: string
) {
  return {
    uri: `${getApiBase()}/api/host-applications/${applicationId}/identity?side=${side}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

export function onboardingPhotoSource(documentId: number, token: string) {
  return {
    uri: `${getApiBase()}/api/host-onboarding/photos/${documentId}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

function detectIdentityMimeFromBase64(b64: string): 'image/jpeg' | 'image/png' | null {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  return null;
}

async function assetBlob(asset: RegistrationAsset, signal?: AbortSignal): Promise<Blob> {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri, { signal });
  if (!response.ok) throw new Error('Tệp không còn khả dụng. Vui lòng chọn lại.');
  return response.blob();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không đọc được dữ liệu ảnh CCCD.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareIdentityImage(input: {
  uri: string;
  fileName?: string | null;
  base64?: string | null;
  file?: File;
}): Promise<OnboardingIdentityAsset> {
  if (input.base64) {
    const clean = input.base64.replace(/\s+/g, '');
    const mimeType = detectIdentityMimeFromBase64(clean);
    const fileSize = Math.floor(
      (clean.length * 3) / 4 - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0)
    );
    const error = identityAssetError({ mimeType, fileSize });
    if (error || !mimeType) throw new Error(error || 'Chỉ hỗ trợ ảnh CCCD định dạng JPG hoặc PNG.');
    return {
      uri: input.uri,
      fileName: input.fileName || (mimeType === 'image/png' ? 'cccd.png' : 'cccd.jpg'),
      mimeType,
      fileSize,
      dataUri: `data:${mimeType};base64,${clean}`,
    };
  }

  const blob = await assetBlob({ uri: input.uri, file: input.file });
  if (blob.size <= 0 || blob.size > IDENTITY_MAX_BYTES) {
    throw new Error('Ảnh CCCD phải có dữ liệu và không vượt quá 5 MB.');
  }
  const mime = attachmentMime(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
  if (mime !== 'image/jpeg' && mime !== 'image/png') {
    throw new Error('Chỉ hỗ trợ ảnh CCCD định dạng JPG hoặc PNG.');
  }
  const dataUri = await blobToDataUrl(blob.slice(0, blob.size, mime));
  return {
    uri: input.uri,
    fileName: input.fileName || (mime === 'image/png' ? 'cccd.png' : 'cccd.jpg'),
    mimeType: mime,
    fileSize: blob.size,
    dataUri,
  };
}

export interface CombinedAccountPayload {
  introduction: string;
  agreementAccepted: boolean;
  version: number | null;
  identityImage: string | null;
  identityBackImage: string | null;
}

export async function submitCombinedOnboarding(
  accountPayload: CombinedAccountPayload,
  propertyValues: RegistrationValues,
  propertyFiles: RegistrationFiles,
  token: string,
  signal?: AbortSignal
): Promise<OnboardingRegistrationView> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

  try {
    const form = new FormData();
    form.append(
      'account',
      new Blob([JSON.stringify(accountPayload)], { type: 'application/json' }),
      'account.json'
    );
    form.append(
      'details',
      new Blob([JSON.stringify(propertyValues)], { type: 'application/json' }),
      'details.json'
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

    for (const photo of propertyFiles.photos) {
      await appendAsset('photos', photo);
    }
    if (propertyFiles.ownership) await appendAsset('ownership', propertyFiles.ownership);
    if (propertyFiles.fireSafety) await appendAsset('fireSafety', propertyFiles.fireSafety);

    const response = await fetch(`${getApiBase()}/api/host-onboarding`, {
      method: 'POST',
      credentials: 'omit',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new Error(result?.message || 'Chưa thể gửi hồ sơ đăng ký chủ trọ. Vui lòng thử lại.');
    }
    if (!Number.isSafeInteger(result.data?.registrationId)) {
      throw new Error(
        'Chưa xác nhận được mã hồ sơ từ máy chủ. Vui lòng tải lại trạng thái trước khi gửi lại.'
      );
    }
    return result.data as OnboardingRegistrationView;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
  }
}

export async function fetchOnboardingEditSnapshot(
  registrationId: number,
  token: string,
  signal?: AbortSignal
): Promise<OnboardingEditSnapshot> {
  return fetchJsonWithTimeout<OnboardingEditSnapshot>(`/host-onboarding/${registrationId}/edit`, {
    method: 'GET',
    token,
    signal,
  });
}

export interface SupplementFiles {
  photos?: RegistrationAsset[];
  ownership?: RegistrationAsset | null;
  idCard?: RegistrationAsset | null;
  idCardBack?: RegistrationAsset | null;
  fireSafety?: RegistrationAsset | null;
}

export async function resubmitOnboardingSupplement(
  registrationId: number,
  editPayload: {
    details: RegistrationValues;
    versionToken: string;
    retainedPhotoIds: number[];
  },
  files: SupplementFiles,
  token: string,
  signal?: AbortSignal
): Promise<OnboardingRegistrationView> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

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

    for (const photo of files.photos || []) {
      await appendAsset('photos', photo);
    }
    if (files.ownership) await appendAsset('ownership', files.ownership);
    if (files.idCard) await appendAsset('idCard', files.idCard);
    if (files.idCardBack) await appendAsset('idCardBack', files.idCardBack);
    if (files.fireSafety) await appendAsset('fireSafety', files.fireSafety);

    const response = await fetch(`${getApiBase()}/api/host-onboarding/${registrationId}/resubmit`, {
      method: 'POST',
      credentials: 'omit',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new Error(result?.message || 'Chưa thể gửi bổ sung hồ sơ. Vui lòng thử lại.');
    }
    if (!Number.isSafeInteger(result.data?.registrationId)) {
      throw new Error('Chưa xác nhận được kết quả cập nhật hồ sơ từ máy chủ.');
    }
    return result.data as OnboardingRegistrationView;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
  }
}
