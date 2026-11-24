import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiBase } from './accommodations';
import { attachmentMime, DOCUMENTS, registrationAssetError, type RegistrationAsset, type RegistrationFiles, type RegistrationValues } from './property-registration';

export async function checkRegistrationAsset(asset: RegistrationAsset, document: boolean) {
  const file = new File(asset.uri);
  if (!file.exists) throw new Error('Tệp không còn khả dụng. Vui lòng chọn lại.');
  const fileSize = file.size;
  const limitError = registrationAssetError({ ...asset, fileSize, mimeType: 'image/jpeg' }, document);
  if (limitError) throw new Error(limitError);
  const handle = file.open();
  try {
    const mimeType = attachmentMime(await handle.readBytes(Math.min(fileSize, 16)));
    const checked = { ...asset, mimeType, fileSize };
    const error = registrationAssetError(checked, document);
    if (error) throw new Error(error);
    return checked;
  } finally {
    handle.close();
  }
}

export async function uploadRegistration(values: RegistrationValues, files: RegistrationFiles, token: string, signal: AbortSignal) {
  const details = new File(Paths.cache, `hlrcs-registration-${Date.now()}.json`);
  try {
    await details.write(JSON.stringify(values));
    const form = new FormData();
    form.append('details', details, 'details.json');
    const append = async (key: string, asset: RegistrationAsset) => {
      const file = new File(asset.uri);
      const body = file.type === asset.mimeType ? file : new Blob([await file.bytes()], { type: asset.mimeType || undefined });
      const extension = asset.mimeType === 'application/pdf' ? 'pdf' : asset.mimeType?.split('/')[1] || 'jpg';
      form.append(key, body, asset.fileName || `${key}.${extension}`);
    };
    for (const photo of files.photos) await append('photos', photo);
    for (const [key] of DOCUMENTS) {
      const asset = files[key];
      if (asset) await append(key, asset);
    }
    const response = await fetch(`${getApiBase()}/api/host/property-registrations`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) throw new Error(result?.message || 'Chưa thể gửi hồ sơ đăng ký.');
    if (!Number.isSafeInteger(result.data?.registrationId) || result.data?.status !== 'PENDING')
      throw new Error('Chưa xác nhận được kết quả. Kiểm tra Nhà trọ của tôi trước khi gửi lại.');
    return result.data.registrationId as number;
  } finally {
    try { if (details.exists) await details.delete(); } catch { /* Confirmation is independent of cache cleanup. */ }
  }
}
