import { File, Paths } from 'expo-file-system';

const draftFile = (userId: number) =>
  new File(Paths.document, `hlrcs-onboarding-draft-${userId}.json`);

export async function readOnboardingDraft(userId: number): Promise<string | null> {
  try {
    const file = draftFile(userId);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

export async function hasOnboardingDraft(userId: number): Promise<boolean> {
  try {
    return draftFile(userId).exists;
  } catch {
    return false;
  }
}

export async function writeOnboardingDraft(userId: number, contents: string): Promise<void> {
  const pending = new File(Paths.document, `hlrcs-onboarding-draft-${userId}.tmp`);
  await pending.write(contents);
  await pending.move(draftFile(userId), { overwrite: true });
}

export async function clearOnboardingDraft(userId: number): Promise<void> {
  const file = draftFile(userId);
  if (file.exists) await file.delete();
}
