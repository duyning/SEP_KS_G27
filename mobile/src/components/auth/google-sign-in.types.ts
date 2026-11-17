export interface GoogleSignInButtonProps {
  disabled: boolean;
  onCredential(idToken: string): Promise<void>;
  onError(message: string): void;
  onBusyChange(busy: boolean): void;
}
