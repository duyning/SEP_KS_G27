import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { googleSignInAvailability, requestGoogleIdToken } from '@/services/google-sign-in';
import { authColors as c } from './tokens';
import type { GoogleSignInButtonProps } from './google-sign-in.types';

export function GoogleSignInButton({ disabled, onCredential, onError, onBusyChange }: GoogleSignInButtonProps) {
  const availability = googleSignInAvailability();
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    if (disabled || lock.current || !availability.available) return;
    lock.current = true; setBusy(true); onBusyChange(true);
    try {
      const token = await requestGoogleIdToken();
      if (token && mounted.current) await onCredential(token);
    } catch (error) { if (mounted.current) onError(error instanceof Error ? error.message : 'Đăng nhập Google không thành công.'); }
    finally { lock.current = false; if (mounted.current) { setBusy(false); onBusyChange(false); } }
  };
  const inactive = disabled || busy || !availability.available;
  return <View style={styles.group}>
    <Pressable accessibilityRole="button" accessibilityLabel="Tiếp tục với Google" accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive} onPress={start} style={({ pressed }) => [styles.button, inactive && styles.inactive, pressed && !inactive && { backgroundColor: c.softMint }]}>
      {busy ? <ActivityIndicator color={c.primary} /> : <Text style={styles.text}>Tiếp tục với Google</Text>}
    </Pressable>
    {!!availability.reason && <Text style={styles.note}>{availability.reason}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 8 }, button: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 14, alignItems: 'center', justifyContent: 'center' }, text: { fontSize: 15, fontWeight: '600', color: c.forestInk }, inactive: { opacity: 0.6 }, note: { fontSize: 12, lineHeight: 18, color: c.textSecondary, textAlign: 'center' },
});
