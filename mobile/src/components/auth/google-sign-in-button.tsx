import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthError, type GoogleBrowserAttempt } from '@/services/auth';
import { googleSignInAvailability, requestGoogleIdToken, startGoogleBrowser } from '@/services/google-sign-in';
import { AuthInput } from './auth-input';
import { authColors as c } from './tokens';
import type { GoogleSignInButtonProps } from './google-sign-in.types';

export function GoogleSignInButton({ disabled, onCredential, onBrowserCode, onError, onBusyChange }: GoogleSignInButtonProps) {
  const availability = googleSignInAvailability();
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<GoogleBrowserAttempt | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const press = async () => {
    if (disabled || request.current || !availability.available || (attempt && code.length !== 8)) return;
    const controller = new AbortController();
    request.current = controller;
    setCodeError('');
    setBusy(true);
    onBusyChange(true);
    try {
      if (attempt) {
        await onBrowserCode(attempt, code);
      } else if (availability.mode === 'browser') {
        const next = await startGoogleBrowser(controller.signal);
        if (mounted.current) setAttempt(next);
      } else {
        const token = await requestGoogleIdToken();
        if (token && mounted.current) await onCredential(token);
      }
    } catch (error) {
      if (!mounted.current) return;
      const message = error instanceof Error ? error.message : 'Đăng nhập Google không thành công.';
      if (attempt && error instanceof AuthError && error.status === 410) {
        setAttempt(null);
        setCode('');
        onError(message);
      } else if (attempt) {
        setCodeError(message);
      } else {
        onError(message);
      }
    } finally {
      request.current = null;
      if (mounted.current) { setBusy(false); onBusyChange(false); }
    }
  };
  const inactive = disabled || busy || !availability.available || Boolean(attempt && code.length !== 8);
  const label = attempt ? 'Xác nhận đăng nhập Google' : 'Tiếp tục với Google';
  return <View style={styles.group}>
    {attempt && <AuthInput
      label="Mã xác nhận Google"
      hint="Nhập mã 8 chữ số từ trang Google vừa mở."
      placeholder="Nhập 8 chữ số"
      inputMode="numeric"
      maxLength={8}
      editable={!disabled && !busy}
      value={code}
      error={codeError || undefined}
      onChangeText={value => { setCode(value.replace(/[^0-9]/g, '')); setCodeError(''); }}
    />}
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive} onPress={press} style={({ pressed }) => [styles.button, inactive && styles.inactive, pressed && !inactive && { backgroundColor: c.softMint }]}>
      {busy ? <ActivityIndicator color={c.primary} /> : <Text style={styles.text}>{label}</Text>}
    </Pressable>
    {attempt && <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={() => { setAttempt(null); setCode(''); setCodeError(''); }}
      style={styles.cancel}
    >
      <Text style={styles.cancelText}>Bắt đầu lại</Text>
    </Pressable>}
    {!!availability.reason && <Text style={styles.note}>{availability.reason}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 8 }, button: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 14, alignItems: 'center', justifyContent: 'center' }, text: { fontSize: 15, fontWeight: '600', color: c.forestInk }, inactive: { opacity: 0.6 }, note: { fontSize: 12, lineHeight: 18, color: c.textSecondary, textAlign: 'center' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: c.primary, fontWeight: '600' },
});
