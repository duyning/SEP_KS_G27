const key = (userId: number, registrationId: number) =>
  `hlrcs:mobile-change-draft:${userId}:${registrationId}`;

export async function readPropertyChangeDraft(
  userId: number,
  registrationId: number
): Promise<string | null> {
  try {
    return localStorage.getItem(key(userId, registrationId));
  } catch {
    return null;
  }
}

export async function hasPropertyChangeDraft(
  userId: number,
  registrationId: number
): Promise<boolean> {
  try {
    return localStorage.getItem(key(userId, registrationId)) !== null;
  } catch {
    return false;
  }
}

export async function writePropertyChangeDraft(
  userId: number,
  registrationId: number,
  contents: string
): Promise<void> {
  localStorage.setItem(key(userId, registrationId), contents);
}

export async function clearPropertyChangeDraft(
  userId: number,
  registrationId: number
): Promise<void> {
  localStorage.removeItem(key(userId, registrationId));
}
