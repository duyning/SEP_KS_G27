import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, ReduceMotion } from 'react-native-reanimated';
import { useReducedMotionPreference } from '@/constants/motion';
import { authColors as c } from '@/components/auth/tokens';
import { AMENITY_LABELS, type SearchFilters } from '@/services/accommodations';
import { AMENITY_KEYS, defaultFilters, filterGroupCount, LOCATIONS, PRICE_OPTIONS, ROOM_TYPES, SORT_OPTIONS } from '@/services/room-search';
import { AnimatedPressable } from './animated-pressable';

export interface FilterBottomSheetProps { visible: boolean; onClose(): void; filters: SearchFilters; onApplyFilters(filters: SearchFilters): void; mode?: 'filters' | 'sort' }
export function FilterBottomSheet({ visible, onClose, filters, onApplyFilters, mode = 'filters' }: FilterBottomSheetProps) {
  const [draft, setDraft] = useState<SearchFilters>(() => ({ ...filters }));
  const insets = useSafeAreaInsets(), { height } = useWindowDimensions();
  const reduced = useReducedMotionPreference();
  const amenities = draft.amenities?.split(',').filter(Boolean) || [];
  const reset = () => setDraft(mode === 'sort' ? { ...draft, sort: 'newest' } : { ...defaultFilters(), sort: filters.sort });
  const group = (title: string, key: 'price' | 'type' | 'location' | 'sort', options: { id: string; label: string }[]) => <View style={s.section}><Text style={s.heading}>{title}</Text><View style={s.chips}>{options.map(option => <Choice key={option.id} label={option.label} selected={draft[key] === option.id} onPress={() => setDraft(value => ({ ...value, [key]: option.id }))} />)}</View></View>;
  return <Modal transparent visible={visible} animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={s.overlay}><Pressable accessibilityLabel="Đóng bộ lọc" accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View accessibilityViewIsModal entering={SlideInDown.duration(280).reduceMotion(ReduceMotion.System)} style={[s.sheet, { maxHeight: height - insets.top - 24, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={s.handle} /><View style={s.header}><View style={{ flex: 1, gap: 3 }}><Text style={s.title}>{mode === 'sort' ? 'Sắp xếp' : 'Bộ lọc'}</Text>{mode === 'filters' && filterGroupCount(draft) > 0 && <Text accessibilityLiveRegion="polite" style={s.note}>{filterGroupCount(draft)} nhóm tiêu chí đã chọn</Text>}</View><AnimatedPressable accessibilityLabel="Đóng" style={s.close} onPress={onClose}><Feather name="x" size={22} color={c.forestInk} /></AnimatedPressable></View>
        <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
          {mode === 'sort' ? group('Thứ tự kết quả', 'sort', SORT_OPTIONS) : <>
            {group('Khoảng giá / tháng', 'price', PRICE_OPTIONS)}

            {group('Loại phòng', 'type', ROOM_TYPES)}
            {group('Khu vực', 'location', LOCATIONS)}

            <View style={s.section}><Text style={s.heading}>Tiện ích</Text><Text style={s.note}>Kết quả cần đáp ứng tất cả tiện ích đã chọn. Máy giặt có thể là tiện ích chung.</Text><View style={s.chips}>{AMENITY_KEYS.map(key => <Choice key={key} label={AMENITY_LABELS[key]} selected={amenities.includes(key)} onPress={() => setDraft(value => ({ ...value, amenities: (amenities.includes(key) ? amenities.filter(x => x !== key) : [...amenities, key]).join(',') || undefined }))} />)}</View></View>
            <View style={s.availability}><View style={{ flex: 1, gap: 6 }}><Text style={s.heading}>Chỉ loại phòng còn trống</Text><Text style={s.note}>Chỉ hiện loại phòng đang có phòng trống.</Text></View><Switch accessibilityLabel="Chỉ loại phòng còn trống" value={Boolean(draft.availableOnly)} onValueChange={value => setDraft(previous => ({ ...previous, availableOnly: value }))} trackColor={{ false: c.border, true: c.primary }} thumbColor="#FFFFFF" /></View>
          </>}
        </ScrollView>
        <View style={s.footer}><AnimatedPressable style={s.reset} onPress={reset} accessibilityLabel="Đặt lại bộ lọc"><Text style={s.link}>Đặt lại</Text></AnimatedPressable><AnimatedPressable style={s.apply} accessibilityLabel="Xem kết quả" onPress={() => { onApplyFilters(draft); onClose(); }}><Text style={s.applyText}>Xem kết quả</Text></AnimatedPressable></View>
      </Animated.View>
    </View>
  </Modal>;
}
export function Choice({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress(): void; accessibilityLabel?: string }) {
  return <AnimatedPressable scaleTo={0.97} accessibilityLabel={accessibilityLabel || label} accessibilityState={{ selected }} style={[s.chip, selected && s.selected]} onPress={onPress}>{selected && <Feather name="check" size={14} color={c.primary} />}<Text style={[s.chipText, selected && { color: c.primary, fontWeight: '600' }]}>{label}</Text></AnimatedPressable>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,45,41,0.35)' }, sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, flexShrink: 1 }, handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 4, backgroundColor: c.border }, header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.border }, title: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: c.forestInk }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, body: { padding: 20, gap: 20 }, section: { gap: 12 }, heading: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: c.forestInk }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.surface }, selected: { backgroundColor: c.softMint, borderColor: c.primary }, chipText: { fontSize: 13, lineHeight: 20, color: c.textSecondary, flexShrink: 1 }, note: { fontSize: 12, lineHeight: 19, color: c.textSecondary }, availability: { flexDirection: 'row', alignItems: 'center', gap: 14 }, footer: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }, reset: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 8 }, link: { fontSize: 15, color: c.primary, fontWeight: '600' }, apply: { flex: 1, minHeight: 52, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }, applyText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontWeight: '600' },
});

