import { getApiBase } from './accommodations';
import { attachmentMime, DOCUMENTS, registrationAssetError, type RegistrationAsset, type RegistrationFiles, type RegistrationValues } from './property-registration';

async function assetBlob(asset: RegistrationAsset, signal?: AbortSignal) {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri, { signal });
  if (!response.ok) throw new Error('Tệp không còn khả dụng. Vui lòng chọn lại.');
  return response.blob();
}

export async function checkRegistrationAsset(asset: RegistrationAsset, document: boolean) {
  const blob = await assetBlob(asset);
  const mimeType = attachmentMime(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
  const checked = { ...asset, mimeType, fileSize: blob.size };
  const error = registrationAssetError(checked, document);
  if (error) throw new Error(error);
  return checked;
}

export async function uploadRegistration(values: RegistrationValues, files: RegistrationFiles, token: string, signal: AbortSignal) {
  const form = new FormData();
  form.append('details', new Blob([JSON.stringify(values)], { type: 'application/json' }), 'details.json');
  const append = async (key: string, asset: RegistrationAsset) => {
    const blob = await assetBlob(asset, signal);
    const extension = asset.mimeType === 'application/pdf' ? 'pdf' : asset.mimeType?.split('/')[1] || 'jpg';
    form.append(key, blob.slice(0, blob.size, asset.mimeType || undefined), asset.fileName || `${key}.${extension}`);
  };
  for (const photo of files.photos) await append('photos', photo);
  for (const [key] of DOCUMENTS) {
    const asset = files[key];
    if (asset) await append(key, asset);
  }
  const response = await fetch(`${getApiBase()}/api/host/property-registrations`, {
    method: 'POST', credentials: 'omit', headers: { Authorization: `Bearer ${token}` }, body: form, signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) throw new Error(result?.message || 'Chưa thể gửi hồ sơ đăng ký.');
  if (!Number.isSafeInteger(result.data?.registrationId) || result.data?.status !== 'PENDING')
    throw new Error('Chưa xác nhận được kết quả. Kiểm tra Nhà trọ của tôi trước khi gửi lại.');
  return result.data.registrationId as number;
}
