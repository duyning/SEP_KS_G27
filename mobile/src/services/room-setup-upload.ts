import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiBase } from './accommodations';
import {
  HostError,
  hostRequest,
  validateHostResource,
  type HostData,
  type HostRoom,
} from './host';
import {
  validateLayoutResponse,
  validateSetupResponse,
  type RoomLayoutJsonPayload,
  type RoomSetupMultipartPayload,
  type SetupPhotoAsset,
} from './room-setup';

export async function fetchLatestHostInventory(
  token: string,
  signal: AbortSignal
): Promise<{ roomTypes: HostData['roomTypes']['roomTypes']; rooms: HostRoom[] }> {
  const [typesData, roomsData] = await Promise.all([
    hostRequest<HostData['roomTypes']>('/host/room-types', token, signal),
    hostRequest<HostData['rooms']>('/host/rooms', token, signal),
  ]);
  const validTypes = validateHostResource('roomTypes', typesData);
  const validRooms = validateHostResource('rooms', roomsData);
  return {
    roomTypes: validTypes.roomTypes,
    rooms: validRooms.rooms,
  };
}

export async function submitRoomSetupMultipart(
  payload: RoomSetupMultipartPayload,
  photos: SetupPhotoAsset[],
  token: string,
  signal: AbortSignal
): Promise<{ createdTypes: Record<string, number>; rooms: HostRoom[] }> {
  if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);

  const setupFile = new File(Paths.cache, `hlrcs-room-setup-${Date.now()}.json`);
  try {
    await setupFile.write(JSON.stringify(payload));
    const form = new FormData();
    form.append('setup', setupFile, 'setup.json');

    for (let i = 0; i < photos.length; i += 1) {
      const asset = photos[i];
      const file = new File(asset.uri);
      if (!file.exists) {
        throw new HostError('Một ảnh trong bản nháp không còn khả dụng. Vui lòng chọn lại.', 400);
      }
      const body =
        file.type === asset.mimeType
          ? file
          : new Blob([await file.bytes()], { type: asset.mimeType || 'image/jpeg' });
      const ext = asset.mimeType?.split('/')[1] || 'jpg';
      form.append('photos', body, asset.fileName || `room-type-photo-${i + 1}.${ext}`);
    }

    const response = await fetch(`${getApiBase()}/api/host/rooms/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true) {
      throw new HostError(
        result?.message || 'Chưa thể tạo loại phòng và danh sách phòng.',
        response.status
      );
    }
    return validateSetupResponse(
      result.data,
      payload.propertyId,
      payload.types.map(t => t.localId),
      payload.rooms.length
    );
  } finally {
    try {
      if (setupFile.exists) await setupFile.delete();
    } catch {
      /* Cache cleanup must not mask server confirmation. */
    }
  }
}

export async function submitRoomLayoutJson(
  payload: RoomLayoutJsonPayload,
  token: string,
  signal: AbortSignal
): Promise<HostRoom[]> {
  const data = await hostRequest<HostRoom[]>(
    '/host/rooms/layout',
    token,
    signal,
    payload,
    'POST'
  );
  return validateLayoutResponse(data, payload.propertyId, payload.rooms.length);
}
