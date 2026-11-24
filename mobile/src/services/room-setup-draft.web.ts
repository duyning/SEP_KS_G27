const key = (userId: number, propertyId: number) =>
  `hlrcs:mobile-room-setup-draft:${userId}:${propertyId}`;

export async function readRoomSetupDraft(
  userId: number,
  propertyId: number
): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key(userId, propertyId));
}

export async function writeRoomSetupDraft(
  userId: number,
  propertyId: number,
  contents: string
): Promise<void> {
  if (typeof localStorage === 'undefined') {
    throw new Error('Trình duyệt không hỗ trợ lưu bản nháp cục bộ.');
  }
  localStorage.setItem(key(userId, propertyId), contents);
}

export async function clearRoomSetupDraft(
  userId: number,
  propertyId: number
): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key(userId, propertyId));
}

export function isLocalFileAvailable(uri: string): boolean {
  return Boolean(uri && /^https?:\/\//i.test(uri));
}
