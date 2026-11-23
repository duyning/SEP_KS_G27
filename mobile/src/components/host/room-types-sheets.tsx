import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import type { HostManagedProperty, HostRoomType } from '@/services/host';
import type {
  RoomTypeFilterKey,
  RoomTypeInventory,
  RoomTypeSortKey,
} from '@/services/host-room-types';

/* -------------------------------------------------------------------------- */
/* 1. Compact Property Selector Row + Bottom Sheet                             */
/* -------------------------------------------------------------------------- */

export function CompactPropertyPicker({
  properties,
  property,
  onSelect,
}: {
  properties: HostManagedProperty[];
  property?: HostManagedProperty;
  onSelect: (propertyId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotionPreference();
  const canSwitch = properties.length > 1;

  const rowContent = (
    <>
      <View style={s.pickerIconBox}>
        <Feather name="home" size={16} color={c.primary} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.pickerLabel}>Nhà trọ đang quản lý</Text>
        <Text style={s.pickerName} numberOfLines={1}>
          {property?.name || 'Chưa có nhà trọ'}
        </Text>
      </View>
      {canSwitch && (
        <View style={s.pickerChevron}>
          <Feather name="chevron-down" size={18} color={c.textSecondary} />
        </View>
      )}
    </>
  );

  return (
    <>
      {canSwitch ? (
        <AnimatedPressable
          scaleTo={0.99}
          style={s.pickerRow}
          accessibilityLabel={`Nhà trọ đang quản lý: ${property?.name || 'Chưa chọn'}. Chạm để đổi nhà trọ`}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(true)}
        >
          {rowContent}
        </AnimatedPressable>
      ) : (
        <View
          style={s.pickerRow}
          accessibilityLabel={`Nhà trọ đang quản lý: ${property?.name || 'Chưa có nhà trọ'}`}
        >
          {rowContent}
        </View>
      )}

      {open && (
        <Modal
          transparent
          animationType={reduced ? 'none' : 'fade'}
          onRequestClose={() => setOpen(false)}
        >
          <View style={s.backdrop}>
            <Pressable style={s.backdropTap} onPress={() => setOpen(false)} />
            <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
              <View style={s.handle} />
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Chọn nhà trọ</Text>
                <AnimatedPressable
                  accessibilityLabel="Đóng chọn nhà trọ"
                  style={s.closeBtn}
                  onPress={() => setOpen(false)}
                >
                  <Feather name="x" size={20} color={c.forestInk} />
                </AnimatedPressable>
              </View>

              <ScrollView
                style={s.sheetScroll}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {properties.map(item => {
                  const selected = item.propertyId === property?.propertyId;
                  return (
                    <AnimatedPressable
                      key={item.propertyId}
                      scaleTo={0.99}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={item.name}
                      style={[s.propertyOption, selected && s.propertyOptionSelected]}
                      onPress={() => {
                        onSelect(item.propertyId);
                        setOpen(false);
                      }}
                    >
                      <View style={[s.optionIcon, selected && s.optionIconSelected]}>
                        <Feather
                          name="home"
                          size={16}
                          color={selected ? c.primary : c.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[s.optionTitle, selected && { color: c.primary }]}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        {item.address ? (
                          <Text style={s.optionSub} numberOfLines={1}>
                            {item.address}
                          </Text>
                        ) : null}
                      </View>
                      {selected && <Feather name="check" size={18} color={c.primary} />}
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Filter & Sort Bottom Sheet                                               */
/* -------------------------------------------------------------------------- */

const FILTER_OPTIONS: { key: RoomTypeFilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'AVAILABLE', label: 'Còn phòng trống' },
  { key: 'UNCONFIRMED', label: 'Chưa xác nhận' },
  { key: 'FULL', label: 'Đã lấp đầy' },
  { key: 'EMPTY', label: 'Chưa có phòng' },
];

const SORT_OPTIONS: { key: RoomTypeSortKey; label: string }[] = [
  { key: 'NEWEST', label: 'Mới nhất' },
  { key: 'PRICE_ASC', label: 'Giá thấp trước' },
  { key: 'PRICE_DESC', label: 'Giá cao trước' },
];

export function RoomTypeFilterSheet({
  visible,
  filter,
  sort,
  onClose,
  onApply,
}: {
  visible: boolean;
  filter: RoomTypeFilterKey;
  sort: RoomTypeSortKey;
  onClose: () => void;
  onApply: (next: { filter: RoomTypeFilterKey; sort: RoomTypeSortKey }) => void;
}) {
  if (!visible) return null;
  return (
    <RoomTypeFilterSheetContent
      filter={filter}
      sort={sort}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function RoomTypeFilterSheetContent({
  filter,
  sort,
  onClose,
  onApply,
}: {
  filter: RoomTypeFilterKey;
  sort: RoomTypeSortKey;
  onClose: () => void;
  onApply: (next: { filter: RoomTypeFilterKey; sort: RoomTypeSortKey }) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [draftFilter, setDraftFilter] = useState<RoomTypeFilterKey>(filter);
  const [draftSort, setDraftSort] = useState<RoomTypeSortKey>(sort);

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Bộ lọc & Sắp xếp</Text>
            <AnimatedPressable
              accessibilityLabel="Đóng bộ lọc"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 18, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 10 }}>
              <Text style={s.groupLabel}>Lọc theo tình trạng</Text>
              <View style={s.chipsWrap}>
                {FILTER_OPTIONS.map(opt => {
                  const active = draftFilter === opt.key;
                  return (
                    <AnimatedPressable
                      key={opt.key}
                      scaleTo={0.97}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setDraftFilter(opt.key)}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={s.groupLabel}>Sắp xếp theo</Text>
              <View style={s.chipsWrap}>
                {SORT_OPTIONS.map(opt => {
                  const active = draftSort === opt.key;
                  return (
                    <AnimatedPressable
                      key={opt.key}
                      scaleTo={0.97}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setDraftSort(opt.key)}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.secondaryBtn}
              accessibilityLabel="Đặt lại bộ lọc"
              onPress={() => {
                setDraftFilter('ALL');
                setDraftSort('NEWEST');
              }}
            >
              <Text style={s.secondaryBtnText}>Đặt lại</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.primaryBtn}
              accessibilityLabel="Áp dụng bộ lọc"
              onPress={() => {
                onApply({ filter: draftFilter, sort: draftSort });
                onClose();
              }}
            >
              <Text style={s.primaryBtnText}>Áp dụng</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Availability Confirmation Bottom Sheet                                   */
/* -------------------------------------------------------------------------- */

export function AvailabilityConfirmSheet({
  target,
  propertyName,
  inventory,
  busy,
  error,
  onClose,
  onInspectRooms,
  onConfirm,
}: {
  target: HostRoomType | null;
  propertyName?: string;
  inventory: RoomTypeInventory | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onInspectRooms: () => void;
  onConfirm: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!target || !inventory) return null;

  const handleRequestClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={handleRequestClose}
    >
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={handleRequestClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Xác nhận tình trạng phòng</Text>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng xác nhận tình trạng phòng"
              style={[s.closeBtn, busy && { opacity: 0.4 }]}
              onPress={handleRequestClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Context Card */}
            <View style={s.confirmContext}>
              <View style={s.confirmIconBox}>
                <Feather name="layers" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.confirmTypeName}>{target.roomType}</Text>
                {propertyName ? (
                  <Text style={s.confirmPropertyName} numberOfLines={2}>
                    {propertyName}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Current Inventory Stats */}
            <View style={s.confirmStatsRow}>
              <View style={s.confirmStatBox}>
                <Text style={s.confirmStatValue}>
                  {inventory.total != null ? inventory.total : '—'}
                </Text>
                <Text style={s.confirmStatLabel}>Tổng phòng</Text>
              </View>
              <View style={[s.confirmStatBox, s.confirmStatHighlight]}>
                <Text style={[s.confirmStatValue, { color: c.primary }]}>
                  {inventory.vacant != null ? inventory.vacant : '—'}
                </Text>
                <Text style={[s.confirmStatLabel, { color: c.primaryDark }]}>Còn trống</Text>
              </View>
              <View style={s.confirmStatBox}>
                <Text style={s.confirmStatValue}>
                  {inventory.occupied != null ? inventory.occupied : '—'}
                </Text>
                <Text style={s.confirmStatLabel}>Đang thuê</Text>
              </View>
              {inventory.other != null && inventory.other > 0 && (
                <View style={s.confirmStatBox}>
                  <Text style={s.confirmStatValue}>{inventory.other}</Text>
                  <Text style={s.confirmStatLabel}>Khác</Text>
                </View>
              )}
            </View>

            {/* Explanation Note */}
            <View style={s.infoBanner}>
              <Feather name="info" size={15} color={c.primary} style={{ marginTop: 2 }} />
              <Text style={s.infoBannerText}>
                Xác nhận sẽ cập nhật thời điểm kiểm tra cho loại phòng này. Trạng thái của từng
                phòng thực tế được giữ nguyên, không tự ý thay đổi.
              </Text>
            </View>

            <InlineError message={error} />
          </ScrollView>

          {/* Two clear choices */}
          <View style={s.confirmActions}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.inspectBtn, busy && { opacity: 0.5 }]}
              accessibilityLabel="Kiểm tra danh sách phòng"
              onPress={onInspectRooms}
            >
              <Feather name="key" size={16} color={c.primary} />
              <Text style={s.inspectBtnText}>Kiểm tra danh sách phòng</Text>
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.confirmPrimaryBtn, busy && { opacity: 0.85 }]}
              accessibilityLabel="Xác nhận số liệu"
              accessibilityState={{ busy, disabled: busy }}
              onPress={onConfirm}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="check-circle" size={16} color="#FFFFFF" />
              )}
              <Text style={s.primaryBtnText}>
                {busy ? 'Đang xác nhận…' : 'Xác nhận số liệu'}
              </Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 54,
  },
  pickerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.textSecondary,
  },
  pickerName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  pickerChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: authSpacing.xl,
    paddingTop: 10,
    paddingBottom: authSpacing.lg,
    maxHeight: '82%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 56,
  },
  propertyOptionSelected: {
    backgroundColor: '#EFF7F4',
    borderColor: c.primary,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: {
    backgroundColor: c.softMint,
  },
  optionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: c.forestInk,
  },
  optionSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  groupLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.forestInk,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  primaryBtn: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
  },
  confirmIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTypeName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  confirmPropertyName: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  confirmStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmStatBox: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  confirmStatHighlight: {
    backgroundColor: '#EFF7F4',
    borderColor: '#CBE6D8',
  },
  confirmStatValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  confirmStatLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.textSecondary,
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.primaryDark,
  },
  confirmActions: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 8,
  },
  inspectBtn: {
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inspectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  confirmPrimaryBtn: {
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
