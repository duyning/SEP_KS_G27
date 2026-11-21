const key = (userId: number) => `hlrcs:mobile-property-draft:${userId}`;
export async function readRegistrationDraft(userId: number) {
  return localStorage.getItem(key(userId));
}
export async function writeRegistrationDraft(userId: number, contents: string) {
  localStorage.setItem(key(userId), contents);
}
export async function clearRegistrationDraft(userId: number) {
  localStorage.removeItem(key(userId));
}
