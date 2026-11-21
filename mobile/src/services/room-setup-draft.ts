import { File, Paths } from 'expo-file-system';

const draftFile = (userId: number, propertyId: number) =>
  new File(Paths.document, `hlrcs-room-setup-draft-${userId}-${propertyId}.json`);

export async function readRoomSetupDraft(
  userId: number,
  propertyId: number
): Promise<string | null> {
  const file = draftFile(userId, propertyId);
  return file.exists ? file.text() : null;
}

export async function writeRoomSetupDraft(
  userId: number,
  propertyId: number,
  contents: string
): Promise<void> {
  const pending = new File(
    Paths.document,
    `hlrcs-room-setup-draft-${userId}-${propertyId}.tmp`
  );
  await pending.write(contents);
  await pending.move(draftFile(userId, propertyId), { overwrite: true });
}

export async function clearRoomSetupDraft(
  userId: number,
  propertyId: number
): Promise<void> {
  const file = draftFile(userId, propertyId);
  if (file.exists) await file.delete();
}

export function isLocalFileAvailable(uri: string): boolean {
  try {
    if (!uri) return false;
    if (/^https?:\/\//i.test(uri)) return true;
    return new File(uri).exists;
  } catch {
    return false;
  }
}
