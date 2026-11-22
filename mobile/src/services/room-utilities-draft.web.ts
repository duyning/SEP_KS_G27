const key = (userId: number, propertyId: number, month: string) =>
  `hlrcs:mobile-utility-draft:${userId}:${propertyId}:${month}`;

export async function readUtilityDrafts(
  userId: number,
  propertyId: number,
  month: string
): Promise<string | null> {
  try {
    return localStorage.getItem(key(userId, propertyId, month));
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
  localStorage.setItem(key(userId, propertyId, month), contents);
}

export async function clearUtilityDrafts(
  userId: number,
  propertyId: number,
  month: string
): Promise<void> {
  localStorage.removeItem(key(userId, propertyId, month));
}
