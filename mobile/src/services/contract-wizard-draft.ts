import { File, Paths } from 'expo-file-system';

const draftFile = (userId: number, roomId: number) =>
  new File(Paths.document, `hlrcs-contract-wizard-${userId}-${roomId}.json`);

export async function readContractWizardDraft(
  userId: number,
  roomId: number
): Promise<string | null> {
  try {
    const file = draftFile(userId, roomId);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

export async function writeContractWizardDraft(
  userId: number,
  roomId: number,
  contents: string
): Promise<void> {
  const pending = new File(
    Paths.document,
    `hlrcs-contract-wizard-${userId}-${roomId}.tmp`
  );
  await pending.write(contents);
  await pending.move(draftFile(userId, roomId), { overwrite: true });
}

export async function clearContractWizardDraft(
  userId: number,
  roomId: number
): Promise<void> {
  try {
    const file = draftFile(userId, roomId);
    if (file.exists) await file.delete();
  } catch {
    /* Ignore missing draft cleanup error. */
  }
}
