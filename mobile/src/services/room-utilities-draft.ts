import { File, Paths } from 'expo-file-system';

const draftFile = (userId: number, propertyId: number, month: string) =>
  new File(Paths.document, `hlrcs-utility-draft-${userId}-${propertyId}-${month}.json`);

export async function readUtilityDrafts(
  userId: number,
  propertyId: number,
  month: string
): Promise<string | null> {
  try {
    const file = draftFile(userId, propertyId, month);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

export async function writeUtilityDrafts(
  userId: number,
  propertyId: number,
  month: string,
  contents: string
): Promise<void> {
  const pending = new File(
    Paths.document,
    `hlrcs-utility-draft-${userId}-${propertyId}-${month}.tmp`
  );
  await pending.write(contents);
  await pending.move(draftFile(userId, propertyId, month), { overwrite: true });
}

export async function clearUtilityDrafts(
  userId: number,
  propertyId: number,
  month: string
): Promise<void> {
  const file = draftFile(userId, propertyId, month);
  if (file.exists) await file.delete();
}
