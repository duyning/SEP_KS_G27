import { File, Paths } from 'expo-file-system';

const draftFile = (userId: number) => new File(Paths.document, `hlrcs-property-draft-${userId}.json`);
export async function readRegistrationDraft(userId: number) {
  const file = draftFile(userId);
  return file.exists ? file.text() : null;
}
export async function writeRegistrationDraft(userId: number, contents: string) {
  const pending = new File(Paths.document, `hlrcs-property-draft-${userId}.tmp`);
  await pending.write(contents);
  await pending.move(draftFile(userId), { overwrite: true });
}
export async function clearRegistrationDraft(userId: number) {
  const file = draftFile(userId);
  if (file.exists) await file.delete();
}
