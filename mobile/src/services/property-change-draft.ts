import { File, Paths } from 'expo-file-system';

const draftFile = (userId: number, registrationId: number) =>
  new File(Paths.document, `hlrcs-change-draft-${userId}-${registrationId}.json`);

export async function readPropertyChangeDraft(
  userId: number,
  registrationId: number
): Promise<string | null> {
  try {
    const file = draftFile(userId, registrationId);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

export async function hasPropertyChangeDraft(
  userId: number,
  registrationId: number
): Promise<boolean> {
  try {
    return draftFile(userId, registrationId).exists;
  } catch {
    return false;
  }
}

export async function writePropertyChangeDraft(
  userId: number,
  registrationId: number,
  contents: string
): Promise<void> {
  const pending = new File(
    Paths.document,
    `hlrcs-change-draft-${userId}-${registrationId}.tmp`
  );
  await pending.write(contents);
  await pending.move(draftFile(userId, registrationId), { overwrite: true });
}

export async function clearPropertyChangeDraft(
  userId: number,
  registrationId: number
): Promise<void> {
  const file = draftFile(userId, registrationId);
  if (file.exists) await file.delete();
}
