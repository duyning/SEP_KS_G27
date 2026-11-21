import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import type { RegistrationAsset } from '@/services/property-registration';

/* -------------------------------------------------------------------------- */
/* 1. Uniform Selection Row (Replaces chip walls for Type & Area)              */
/* -------------------------------------------------------------------------- */

export function SelectRow({
  label,
  value,
  placeholder,
  error,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onPress: () => void;
}) {
  const hasValue = Boolean(value.trim());
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <AnimatedPressable
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${hasValue ? value : placeholder}`}
        style={[s.selectBox, Boolean(error) && s.selectBoxInvalid]}
        onPress={onPress}
      >
        <Text
          style={[s.selectValue, !hasValue && s.selectPlaceholder]}
          numberOfLines={2}
        >
          {hasValue ? value : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={c.textSecondary} />
      </AnimatedPressable>
      {error ? (
        <View style={s.errorRow} accessibilityRole="alert">
          <Feather name="alert-circle" size={13} color={c.error} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Single-Select Bottom Sheet (Property Type / Area)                        */
/* -------------------------------------------------------------------------- */

export function SingleSelectSheet({
  visible,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: { key: string; label: string }[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (key: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <AnimatedPressable
              accessibilityLabel={`Đóng ${title}`}
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {options.map(opt => {
              const checked = opt.key === selectedValue;
              return (
                <AnimatedPressable
                  key={opt.key}
                  scaleTo={0.99}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  accessibilityLabel={opt.label}
                  style={[s.radioRow, checked && s.radioRowActive]}
                  onPress={() => {
                    onSelect(opt.key);
                    onClose();
                  }}
                >
                  <Text style={[s.radioLabel, checked && { color: c.primary, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {checked && <Feather name="check" size={18} color={c.primary} />}
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Multi-Select Checklist Bottom Sheet (Amenities & Rules)                  */
/* -------------------------------------------------------------------------- */

export function MultiSelectChecklistSheet({
  visible,
  title,
  items,
  isSelected,
  selectedCount,
  onToggle,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: readonly (readonly string[])[];
  isSelected: (key: string) => boolean;
  selectedCount: number;
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '86%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle}>{title}</Text>
              <Text style={s.sheetSub}>
                Đã chọn {selectedCount}/{items.length} mục
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel={`Đóng ${title}`}
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {items.map(([key, label]) => {
              const checked = isSelected(key);
              return (
                <AnimatedPressable
                  key={key}
                  scaleTo={0.99}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={label}
                  style={[s.checkRow, checked && s.checkRowActive]}
                  onPress={() => onToggle(key)}
                >
                  <Feather
                    name={checked ? 'check-square' : 'square'}
                    size={19}
                    color={checked ? c.primary : c.textMuted}
                  />
                  <Text style={[s.checkLabel, checked && { color: c.forestInk, fontWeight: '600' }]}>
                    {label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.doneBtn}
              accessibilityLabel="Xong"
              onPress={onClose}
            >
              <Text style={s.doneBtnText}>Xong ({selectedCount})</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Photo Thumbnail Tile with Cover Badge, Error Retry & Delete              */
/* -------------------------------------------------------------------------- */

export function PhotoThumbnailTile({
  asset,
  index,
  disabled,
  onMakeCover,
  onRemove,
}: {
  asset: RegistrationAsset;
  index: number;
  disabled: boolean;
  onMakeCover: () => void;
  onRemove: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isCover = index === 0;

  return (
    <View style={s.photoTile}>
      <View style={s.photoFrame}>
        {failed ? (
          <View style={s.photoFallback}>
            <Feather name="image" size={20} color={c.textSecondary} />
            <AnimatedPressable
              style={s.photoRetryBtn}
              accessibilityLabel={`Thử lại tải ảnh ${index + 1}`}
              onPress={() => {
                setAttempt(v => v + 1);
                setFailed(false);
              }}
            >
              <Feather name="refresh-cw" size={12} color={c.primary} />
              <Text style={s.photoRetryText}>Thử lại</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <Image
            key={`${asset.uri}:${attempt}`}
            accessibilityLabel={`Ảnh nhà trọ ${index + 1}`}
            source={{ uri: asset.uri }}
            style={s.photoImg}
            contentFit="cover"
            cachePolicy="none"
            onError={() => setFailed(true)}
          />
        )}

        {isCover && (
          <View style={s.coverBadge}>
            <Text style={s.coverBadgeText}>Ảnh bìa</Text>
          </View>
        )}

        <AnimatedPressable
          accessibilityLabel={`Xóa ảnh ${index + 1}`}
          disabled={disabled}
          style={s.removeIconBtn}
          onPress={onRemove}
        >
          <Feather name="trash-2" size={14} color="#FFFFFF" />
        </AnimatedPressable>
      </View>

      {!isCover ? (
        <AnimatedPressable
          scaleTo={0.97}
          accessibilityLabel={`Đặt ảnh ${index + 1} làm ảnh bìa`}
          disabled={disabled}
          style={s.setCoverBtn}
          onPress={onMakeCover}
        >
          <Feather name="star" size={12} color={c.primary} />
          <Text style={s.setCoverText}>Đặt làm bìa</Text>
        </AnimatedPressable>
      ) : (
        <View style={s.coverMetaBar}>
          <Text style={s.coverMetaText}>Hiển thị đầu tiên</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: c.forestInk,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  selectBoxInvalid: {
    borderColor: c.error,
    borderWidth: 1.5,
  },
  selectValue: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: c.forestInk,
  },
  selectPlaceholder: {
    color: c.placeholder,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: c.error,
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
    maxHeight: '80%',
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
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
  },
  sheetSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  radioRowActive: {
    backgroundColor: '#EFF7F4',
    borderColor: c.primary,
  },
  radioLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: c.forestInk,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  checkRowActive: {
    backgroundColor: '#F3FAF7',
    borderColor: '#CBE6D8',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: c.forestInk,
  },
  sheetFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 8,
  },
  doneBtn: {
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoTile: {
    flexBasis: '48%',
    flexGrow: 0,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  photoFrame: {
    width: '100%',
    height: 124,
    backgroundColor: '#EEF4F1',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  photoRetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
  },
  coverBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: c.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  coverBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  removeIconBtn: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 45, 41, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCoverBtn: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  setCoverText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  coverMetaBar: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FBF8',
  },
  coverMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.primaryDark,
  },
});
