const key = (userId: number) => `hlrcs:mobile-onboarding-draft:${userId}`;

export async function readOnboardingDraft(userId: number): Promise<string | null> {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

export async function hasOnboardingDraft(userId: number): Promise<boolean> {
  try {
    return localStorage.getItem(key(userId)) !== null;
  } catch {
    return false;
  }
}

export async function writeOnboardingDraft(userId: number, contents: string): Promise<void> {
  localStorage.setItem(key(userId), contents);
}

export async function clearOnboardingDraft(userId: number): Promise<void> {
  localStorage.removeItem(key(userId));
}
