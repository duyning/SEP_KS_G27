import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiBase } from './accommodations';
import { HostError, hostRequest, type HostRoomType } from './host';
import type { NewRoomTypePhoto } from './host-room-type-editor';

async function appendPhotosToForm(form: FormData, photos: readonly NewRoomTypePhoto[]) {
  for (let i = 0; i < photos.length; i += 1) {
    const asset = photos[i];
    const file = new File(asset.uri);
    if (!file.exists) {
      throw new HostError(
        `Ảnh "${asset.fileName || `#${i + 1}`}" không còn khả dụng trên thiết bị. Vui lòng chọn lại.`,
        400
      );
    }
    const body =
      file.type === asset.mimeType
        ? file
        : new Blob([await file.bytes()], { type: asset.mimeType || 'image/jpeg' });
    const ext = asset.mimeType?.split('/')[1] || 'jpg';
    form.append('photos', body, asset.fileName || `room-type-photo-${i + 1}.${ext}`);
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
  const file = new File(Paths.cache, `hlrcs-room-type-${Date.now()}.json`);
  try {
    await file.write(JSON.stringify(details));
    const form = new FormData();
    form.append('details', file, 'details.json');
    await appendPhotosToForm(form, photos);
    const response = await fetch(`${getApiBase()}/api/host/room-types/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new HostError(result?.message || 'Chưa thể lưu loại phòng.', response.status);
    }
    return result.data as HostRoomType;
  } finally {
    try {
      if (file.exists) await file.delete();
    } catch {
      /* Cache cleanup must not mask a committed update. */
    }
  }
}

export async function createHostType(
  details: unknown,
  token: string,
  signal: AbortSignal,
  photos: readonly NewRoomTypePhoto[] = []
): Promise<HostRoomType> {
  if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
  const file = new File(Paths.cache, `hlrcs-room-type-new-${Date.now()}.json`);
  try {
    await file.write(JSON.stringify(details));
    const form = new FormData();
    form.append('details', file, 'details.json');
    await appendPhotosToForm(form, photos);
    const response = await fetch(`${getApiBase()}/api/host/room-types`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new HostError(result?.message || 'Chưa thể tạo loại phòng.', response.status);
    }
    return result.data as HostRoomType;
  } finally {
    try {
      if (file.exists) await file.delete();
    } catch {
      /* Cache cleanup must not mask a committed create. */
    }
  }
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
