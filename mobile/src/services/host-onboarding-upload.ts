import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
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
      headers,
      body,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new Error(result?.message || 'Không thể kết nối máy chủ NestHub. Vui lòng thử lại.');
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

export async function prepareIdentityImage(input: {
  uri: string;
  fileName?: string | null;
  base64?: string | null;
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

  const file = new File(input.uri);
  if (!file.exists) {
    throw new Error('Ảnh CCCD không còn khả dụng trên thiết bị. Vui lòng chọn lại.');
  }
  const fileSize = file.size;
  if (fileSize <= 0 || fileSize > IDENTITY_MAX_BYTES) {
    throw new Error('Ảnh CCCD phải có dữ liệu và không vượt quá 5 MB.');
  }
  const handle = file.open();
  let mime: string | null = null;
  try {
    mime = attachmentMime(await handle.readBytes(Math.min(fileSize, 16)));
  } finally {
    handle.close();
  }
  if (mime !== 'image/jpeg' && mime !== 'image/png') {
    throw new Error('Chỉ hỗ trợ ảnh CCCD định dạng JPG hoặc PNG.');
  }
  const b64 = await file.base64();
  return {
    uri: input.uri,
    fileName: input.fileName || (mime === 'image/png' ? 'cccd.png' : 'cccd.jpg'),
    mimeType: mime,
    fileSize,
    dataUri: `data:${mime};base64,${b64}`,
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
  const stamp = Date.now();
  const accountFile = new File(Paths.cache, `hlrcs-onboarding-account-${stamp}.json`);
  const detailsFile = new File(Paths.cache, `hlrcs-onboarding-details-${stamp}.json`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

  try {
    await accountFile.write(JSON.stringify(accountPayload));
    await detailsFile.write(JSON.stringify(propertyValues));

    const form = new FormData();
    form.append('account', accountFile, 'account.json');
    form.append('details', detailsFile, 'details.json');

    const appendAsset = async (key: string, asset: RegistrationAsset) => {
      const file = new File(asset.uri);
      const body =
        file.type === asset.mimeType
          ? file
          : new Blob([await file.bytes()], { type: asset.mimeType || undefined });
      const ext =
        asset.mimeType === 'application/pdf' ? 'pdf' : asset.mimeType?.split('/')[1] || 'jpg';
      form.append(key, body, asset.fileName || `${key}.${ext}`);
    };

    for (const photo of propertyFiles.photos) {
      await appendAsset('photos', photo);
    }
    if (propertyFiles.ownership) {
      await appendAsset('ownership', propertyFiles.ownership);
    }
    if (propertyFiles.fireSafety) {
      await appendAsset('fireSafety', propertyFiles.fireSafety);
    }

    const response = await fetch(`${getApiBase()}/api/host-onboarding`, {
      method: 'POST',
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
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new Error('Quá thời gian tải lên hồ sơ. Kiểm tra mạng và tải lại trạng thái trước khi gửi lại.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
    try {
      if (accountFile.exists) await accountFile.delete();
    } catch {
      /* Ignore cache cleanup failure. */
    }
    try {
      if (detailsFile.exists) await detailsFile.delete();
    } catch {
      /* Ignore cache cleanup failure. */
    }
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
  const editFile = new File(Paths.cache, `hlrcs-onboarding-edit-${Date.now()}.json`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

  try {
    await editFile.write(JSON.stringify(editPayload));
    const form = new FormData();
    form.append('edit', editFile, 'edit.json');

    const appendAsset = async (key: string, asset: RegistrationAsset) => {
      const file = new File(asset.uri);
      const body =
        file.type === asset.mimeType
          ? file
          : new Blob([await file.bytes()], { type: asset.mimeType || undefined });
      const ext =
        asset.mimeType === 'application/pdf' ? 'pdf' : asset.mimeType?.split('/')[1] || 'jpg';
      form.append(key, body, asset.fileName || `${key}.${ext}`);
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
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new Error('Quá thời gian gửi bổ sung hồ sơ. Vui lòng thử lại.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
    try {
      if (editFile.exists) await editFile.delete();
    } catch {
      /* Ignore cleanup failure. */
    }
  }
}
