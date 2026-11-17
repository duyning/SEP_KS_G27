import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authColors as c } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { PrimaryButton } from '@/components/auth/primary-button';
import { useReducedMotionPreference } from '@/constants/motion';

export const roleLabels = { USER: 'Người thuê', ROOM_HOST: 'Chủ trọ', STAFF: 'Nhân viên', ADMIN: 'Quản trị viên' };
export function UserAvatar({ name, uri, size = 72 }: { name?: string; uri?: string; size?: number }) {
  const [failed, setFailed] = useState<string | undefined>();
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: c.softMint, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {uri && uri !== failed ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" accessibilityLabel="Ảnh đại diện" onError={() => setFailed(uri)} /> : <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: c.primary }}>{name?.trim().charAt(0).toUpperCase() || <Feather name="user" size={size * 0.4} color={c.primary} />}</Text>}
  </View>;
}
export function ProfileHeader({ title, showBack = true }: { title: string; showBack?: boolean }) {
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };
  return <View style={s.header}>{showBack && <AnimatedPressable accessibilityLabel="Quay lại" onPress={back} style={s.back}><Feather name="arrow-left" size={22} color={c.forestInk} /></AnimatedPressable>}<Text style={s.title}>{title}</Text></View>;
}
export function ProfilePage({ title, children, footer, rootTab = false }: { title: string; children: ReactNode; footer?: ReactNode; rootTab?: boolean }) {
  // NativeTabs owns the bottom inset for its screens; Stack subscreens own theirs.
  return <SafeAreaView style={s.screen} edges={rootTab ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}><ProfileHeader title={title} showBack={!rootTab} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior={rootTab ? 'automatic' : 'never'} contentContainerStyle={s.body}>{children}</ScrollView>{footer && <View style={s.footer}>{footer}</View>}</KeyboardAvoidingView></SafeAreaView>;
}
export function ProfileMenuRow({ icon, title, subtitle, onPress, danger, disabled }: { icon: ComponentProps<typeof Feather>['name']; title: string; subtitle?: string; onPress(): void; danger?: boolean; disabled?: boolean }) {
  return <AnimatedPressable onPress={onPress} scaleTo={0.98} disabled={disabled} style={[s.row, disabled && { opacity: 0.5 }]} accessibilityLabel={title}>
    <Feather name={icon} size={21} color={danger ? c.error : c.primary} />
    <View style={{ flex: 1, gap: 3 }}><Text style={[s.rowTitle, danger && { color: c.error }]}>{title}</Text>{!!subtitle && <Text style={s.secondary}>{subtitle}</Text>}</View>
    <Feather name="chevron-right" size={18} color={c.textMuted} />
  </AnimatedPressable>;
}
export function ConfirmDialog({ title, description, confirmLabel, cancelLabel = 'Hủy', busy, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; cancelLabel?:string; busy?: boolean; onCancel(): void; onConfirm(): void }) {
  const reduceMotion = useReducedMotionPreference();
  return <Modal transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={s.backdrop}><View accessibilityViewIsModal style={s.dialog}><Text style={s.dialogTitle}>{title}</Text><Text style={s.secondary}>{description}</Text><PrimaryButton title={confirmLabel} onPress={onConfirm} loading={busy} disabled={busy} style={{ backgroundColor: c.error, height: 'auto', minHeight: 54, paddingVertical: 14 }} /><AnimatedPressable onPress={onCancel} disabled={busy} style={s.cancel}><Text style={s.link}>{cancelLabel}</Text></AnimatedPressable></View></View>
  </Modal>;
}
export function ProfileSkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="Đang tải hồ sơ" style={{ gap: 20 }}><View style={s.identity}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.softMint }} /><View style={{ flex: 1, gap: 12 }}><View style={s.skeletonLine} /><View style={[s.skeletonLine, { width: '90%' }]} /></View></View>{[0, 1].map(value => <View key={value} style={[s.skeletonLine, { width: '100%', height: 58 }]} />)}</View>;
}
export const profileStyles = StyleSheet.create({
  sectionLabel: { color: c.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 0.7, marginTop: 8 },
  group: { backgroundColor: c.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  divider: { height: 1, backgroundColor: c.border, marginLeft: 52 },
  message: { color: c.primary, fontSize: 14, lineHeight: 22, padding: 14, backgroundColor: c.softMint, borderRadius: 12 },
  hint: { color: c.textSecondary, fontSize: 13, lineHeight: 21 },
});
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border }, title: { fontSize: 28, lineHeight: 35, fontWeight: '700', color: c.forestInk, flex: 1 }, body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 20 }, footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 }, row: { paddingHorizontal: 16, paddingVertical: 16, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14 }, rowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: c.forestInk }, secondary: { color: c.textSecondary, fontSize: 13, lineHeight: 21 }, backdrop: { flex: 1, backgroundColor: 'rgba(20,45,41,0.4)', justifyContent: 'center', padding: 24 }, dialog: { backgroundColor: c.surface, borderRadius: 22, padding: 24, gap: 16 }, dialogTitle: { fontSize: 22, lineHeight: 28, color: c.forestInk, fontWeight: '700' }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, link: { color: c.primary, fontWeight: '700', fontSize: 15 }, skeletonLine: { height: 18, width: '65%', borderRadius: 8, backgroundColor: c.border },
});

