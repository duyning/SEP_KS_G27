import { createElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { authColors as c } from './tokens';
import type { GoogleSignInButtonProps } from './google-sign-in.types';

type Identity = {
  initialize(options: { client_id: string; callback(response: { credential?: string }): void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: { type: string; theme: string; size: string; text: string; shape: string; locale: string; width: number }): void;
};
const identity = () => (window as Window & { google?: { accounts?: { id?: Identity } } }).google?.accounts?.id;
let scriptPromise: Promise<Identity> | undefined;
function loadIdentity(): Promise<Identity> {
  const existing = identity();
  if (existing) return Promise.resolve(existing);
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    const fail = () => { clearTimeout(timer); script.remove(); scriptPromise = undefined; reject(new Error('Không tải được đăng nhập Google. Kiểm tra kết nối rồi thử lại.')); };
    const timer = setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => { const sdk = identity(); if (!sdk) { fail(); return; } clearTimeout(timer); resolve(sdk); };
    document.head.append(script);
  });
  return scriptPromise;
}

export function GoogleSignInButton({ disabled, onCredential, onError }: GoogleSignInButtonProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const receive = useEffectEvent((credential?: string) => {
    if (disabled) return;
    if (!credential) { onError('Google không trả về ID token. Vui lòng thử lại.'); return; }
    void onCredential(credential).catch(error => onError(error instanceof Error ? error.message : 'Đăng nhập Google không thành công.'));
  });
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const element = container.current;
    void loadIdentity().then(sdk => {
      if (!active || !element) return;
      sdk.initialize({ client_id: clientId, auto_select: false, callback: ({ credential }) => { if (active) receive(credential); } });
      sdk.renderButton(element, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', locale: 'vi', width: Math.max(200, Math.min(400, element.offsetWidth)) });
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; element?.replaceChildren(); };
  }, [clientId, attempt]);
  if (!clientId) return <Text style={styles.note}>Đăng nhập Google chưa được cấu hình.</Text>;
  return <View style={styles.group}>
    {createElement('div', { ref: container, inert: disabled, style: { minHeight: 44, width: '100%', opacity: disabled ? 0.6 : 1, display: 'flex', justifyContent: 'center' } })}
    {!!error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setError(''); setAttempt(value => value + 1); }}><Text style={styles.retry}>Thử tải lại Google</Text></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8 }, note: { color: c.textSecondary, fontSize: 12, lineHeight: 18 }, error: { color: c.error, fontSize: 13, lineHeight: 20 }, retry: { color: c.primary, fontWeight: '600', paddingVertical: 12 } });
