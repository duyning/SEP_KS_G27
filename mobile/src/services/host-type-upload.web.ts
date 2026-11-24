import { getApiBase } from './accommodations';
import { HostError, hostRequest, type HostRoomType } from './host';
import type { NewRoomTypePhoto } from './host-room-type-editor';

async function assetToBlob(asset: NewRoomTypePhoto, signal: AbortSignal): Promise<Blob> {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri, { signal });
  if (!response.ok) {
    throw new HostError(
      `Ảnh "${asset.fileName || 'đã chọn'}" không còn khả dụng. Vui lòng chọn lại.`,
      400
    );
  }
  return response.blob();
}

async function appendPhotosWeb(
  form: FormData,
  photos: readonly NewRoomTypePhoto[],
  signal: AbortSignal
) {
  for (let i = 0; i < photos.length; i += 1) {
    const asset = photos[i];
    const blob = await assetToBlob(asset, signal);
    const ext = asset.mimeType?.split('/')[1] || 'jpg';
    form.append(
      'photos',
      blob.slice(0, blob.size, asset.mimeType || 'image/jpeg'),
      asset.fileName || `room-type-photo-${i + 1}.${ext}`
    );
  }
}

export async function updateHostType(
  id: number,
  details: unknown,
  token: string,
  signal: AbortSignal,
  photos: readonly NewRoomTypePhoto[] = []
): Promise<HostRoomType> {
  if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
  const form = new FormData();
  form.append(
    'details',
    new Blob([JSON.stringify(details)], { type: 'application/json' }),
    'details.json'
  );
  await appendPhotosWeb(form, photos, signal);
  const response = await fetch(`${getApiBase()}/api/host/room-types/${id}`, {
    method: 'PUT',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) {
    throw new HostError(result?.message || 'Chưa thể lưu loại phòng.', response.status);
  }
  return result.data as HostRoomType;
}

export async function createHostType(
  details: unknown,
  token: string,
  signal: AbortSignal,
  photos: readonly NewRoomTypePhoto[] = []
): Promise<HostRoomType> {
  if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
  const form = new FormData();
  form.append(
    'details',
    new Blob([JSON.stringify(details)], { type: 'application/json' }),
    'details.json'
  );
  await appendPhotosWeb(form, photos, signal);
  const response = await fetch(`${getApiBase()}/api/host/room-types`, {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) {
    throw new HostError(result?.message || 'Chưa thể tạo loại phòng.', response.status);
  }
  return result.data as HostRoomType;
}

export async function deleteHostRoomType(
  id: number,
  token: string,
  signal: AbortSignal
): Promise<void> {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HostError('Mã loại phòng không hợp lệ.', 400);
  }
  await hostRequest<null>(`/host/room-types/${id}`, token, signal, undefined, 'DELETE');
}
