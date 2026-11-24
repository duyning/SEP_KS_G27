const storageKey = (userId: number, roomId: number) =>
  `hlrcs-contract-wizard-${userId}-${roomId}`;

export async function readContractWizardDraft(
  userId: number,
  roomId: number
): Promise<string | null> {
  try {
    return globalThis.sessionStorage?.getItem(storageKey(userId, roomId)) ?? null;
  } catch {
    return null;
  }
}

export async function writeContractWizardDraft(
  userId: number,
  roomId: number,
  contents: string
): Promise<void> {
  try {
    globalThis.sessionStorage?.setItem(storageKey(userId, roomId), contents);
  } catch {
    /* Ignore web storage quota error. */
  }
}

export async function clearContractWizardDraft(
  userId: number,
  roomId: number
): Promise<void> {
  try {
    globalThis.sessionStorage?.removeItem(storageKey(userId, roomId));
  } catch {
    /* Ignore web storage error. */
  }
}
