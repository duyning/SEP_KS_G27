import { useHostMode } from '@/context/host-mode-context';
import { Feather } from '@expo/vector-icons';
import { Tabs, TabList, TabTrigger, TabSlot, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { type ComponentProps, type ComponentRef, type Ref } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authColors as c } from '@/components/auth/tokens';

export default function AppTabs() {
 const {isHostMode}=useHostMode();

  return <Tabs>
    <TabSlot style={{ flex: 1 }} />
    {/* In normal flow: the slot ends above the capsule, so no duplicated inset. */}
    <TabList asChild><CustomTabList>
        <TabTrigger name="home" href="/home" asChild><TabButton icon="home">{isHostMode?'Nhà trọ':'Trang chủ'}</TabButton></TabTrigger>
        <TabTrigger name="explore" href="/explore" asChild><TabButton hidden={isHostMode} icon="search">Tìm phòng</TabButton></TabTrigger>
        <TabTrigger name="host/room-types" href="/host/room-types" asChild><TabButton hidden={!isHostMode} icon="layers">Loại &amp; giá</TabButton></TabTrigger>
<TabTrigger name="host/rooms" href="/host/rooms" asChild><TabButton hidden={!isHostMode} icon="key">Phòng</TabButton></TabTrigger>
<TabTrigger name="host/viewings" href="/host/viewings" asChild><TabButton hidden={!isHostMode} icon="calendar">Yêu cầu</TabButton></TabTrigger><TabTrigger name="account" href="/account" asChild><TabButton icon="user">Cá nhân</TabButton></TabTrigger>
      </CustomTabList></TabList>
  </Tabs>;
}
function CustomTabList({ children, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  return <View {...props} style={StyleSheet.flatten([s.container, { paddingBottom: Math.max(insets.bottom, 8) }])}><View style={s.capsule}>{children}</View></View>;
}
function TabButton({ children, isFocused, ref, icon, hidden, ...props }: TabTriggerSlotProps & { icon: ComponentProps<typeof Feather>['name']; hidden?: boolean }) {
  const {isHostMode}=useHostMode();
  return <Pressable {...props} ref={ref as Ref<ComponentRef<typeof Pressable>>} accessibilityRole="tab" aria-selected={isFocused} accessibilityLabel={typeof children === 'string' ? children : undefined} accessibilityState={{ selected: isFocused }} style={({ pressed }) => [s.button, isHostMode && { paddingHorizontal: 0 }, hidden && { display: 'none' }, isFocused && s.selected, pressed && { opacity: 0.75 }]}>
    <Feather name={icon} size={23} color={isFocused ? c.primary : '#84928D'} />
    <Text style={[s.label, isHostMode && { fontSize: 11, lineHeight: 16 }, { color: isFocused ? c.primary : c.textSecondary }]}>{children}</Text>
  </Pressable>;
}
const s = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, backgroundColor: c.background },
  capsule: { width: '100%', maxWidth: 360, flexDirection: 'row', padding: 5, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, boxShadow: '0px 3px 12px rgba(20,45,41,0.07)' },
  button: { flex: 1, minHeight: 52, minWidth: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 3, paddingVertical: 6 },
  selected: { backgroundColor: c.softMint }, label: { fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
});





