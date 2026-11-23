import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AuthSession, type AuthSnapshot, type GoogleBrowserAttempt, type LoginValues, type VerifiedRegisterValues, type ProfileValues, type PasswordValues } from '../services/auth';

export type { AuthUser } from '../services/auth';
export interface AuthContextValue extends Omit<AuthSnapshot, 'sessionError'> {
  sessionError: string | null;
  retry(): Promise<void>;
  signIn(values: LoginValues): Promise<void>;
  signInWithGoogle(idToken: string): Promise<void>;
  signInWithGoogleCode(attempt: GoogleBrowserAttempt, code: string): Promise<void>;
  signUp(values: VerifiedRegisterValues): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(values: ProfileValues): Promise<void>;
  sendPhoneOtp(phone: string): Promise<import('../services/auth').PhoneChallenge>;
  verifyPhoneOtp(phone: string,code: string): Promise<void>;
  changePassword(values: PasswordValues): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session] = useState(() => new AuthSession());
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    session.start();
    return session.stop;
  }, [session]);
  return (
    <AuthContext.Provider value={{ ...snapshot, sessionError: snapshot.sessionError?.message ?? null, retry: session.retry, signIn: session.signIn, signInWithGoogle: session.signInWithGoogle, signInWithGoogleCode: session.signInWithGoogleCode, signUp: session.signUp, signOut: session.signOut, updateProfile: session.updateProfile, sendPhoneOtp: session.sendPhoneOtp, verifyPhoneOtp: session.verifyPhoneOtp, changePassword: session.changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được sử dụng bên trong AuthProvider.');
  return context;
}
