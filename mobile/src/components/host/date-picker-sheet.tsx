import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { contractTodayIso } from '@/services/contract-wizard';
import { formatContractIsoDate } from '@/services/rental-contracts';
import { isValidIsoDate } from '@/services/room-tenancy';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

function buildCalendarDays(year: number, monthIndex: number): (string | null)[] {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  // Monday = 0, Sunday = 6
  const startOffset = (firstDay.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(
      `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateFieldButton({
  label,
  value,
  placeholder = 'Chọn ngày',
  required = false,
  disabled = false,
  error,
  helper,
  onPress,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helper?: string;
  onPress: () => void;
}) {
  const formatted = formatContractIsoDate(value);

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>
        {label}
        {required ? <Text style={{ color: c.error }}> *</Text> : null}
      </Text>
      <AnimatedPressable
        scaleTo={0.99}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatted || placeholder}`}
        style={[
          s.fieldBtn,
          Boolean(error) && s.fieldBtnError,
          disabled && { opacity: 0.55 },
        ]}
        onPress={onPress}
      >
        <Feather
          name="calendar"
          size={16}
          color={formatted ? c.primary : c.textSecondary}
        />
        <Text
          style={[s.fieldBtnText, !formatted && { color: c.placeholder, fontWeight: '400' }]}
          numberOfLines={1}
        >
          {formatted || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={c.textSecondary} />
      </AnimatedPressable>
      {helper && !error ? <Text style={s.helperText}>{helper}</Text> : null}
      {error ? (
        <View style={s.errorRow} accessibilityRole="alert">
          <Feather name="alert-circle" size={12} color={c.error} style={{ marginTop: 2 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function IsoDatePickerSheet({
  visible,
  title,
  value,
  minDate,
  maxDate,
  allowClear = false,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  value: string;
  minDate?: string;
  maxDate?: string;
  allowClear?: boolean;
  onClose: () => void;
  onSelect: (isoDate: string) => void;
}) {
  if (!visible) return null;
  return (
    <IsoDatePickerContent
      key={`${title}:${value}:${minDate || ''}:${maxDate || ''}`}
      title={title}
      value={value}
      minDate={minDate}
      maxDate={maxDate}
      allowClear={allowClear}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}

function IsoDatePickerContent({
  title,
  value,
  minDate,
  maxDate,
  allowClear,
  onClose,
  onSelect,
}: {
  title: string;
  value: string;
  minDate?: string;
  maxDate?: string;
  allowClear: boolean;
  onClose: () => void;
  onSelect: (isoDate: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const today = contractTodayIso();
  const anchor = isValidIsoDate(value)
    ? value
    : maxDate && isValidIsoDate(maxDate) && maxDate < today
    ? maxDate
    : minDate && isValidIsoDate(minDate) && minDate > today
    ? minDate
    : today;

  const [cursor, setCursor] = useState(() => ({
    year: Number(anchor.slice(0, 4)),
    month: Number(anchor.slice(5, 7)) - 1,
  }));

  const cells = useMemo(
    () => buildCalendarDays(cursor.year, cursor.month),
    [cursor.month, cursor.year]
  );

  const shiftMonth = (delta: number) => {
    setCursor(prev => {
      const total = prev.year * 12 + prev.month + delta;
      const nextYear = Math.max(1900, Math.min(2100, Math.floor(total / 12)));
      const nextMonth = ((total % 12) + 12) % 12;
      return { year: nextYear, month: nextMonth };
    });
  };

  const shiftYear = (delta: number) => {
    setCursor(prev => ({
      ...prev,
      year: Math.max(1900, Math.min(2100, prev.year + delta)),
    }));
  };

  const isDisabled = (iso: string): boolean => {
    if (minDate && isValidIsoDate(minDate) && iso < minDate) return true;
    if (maxDate && isValidIsoDate(maxDate) && iso > maxDate) return true;
    return false;
  };

  const todayAllowed = !isDisabled(today);

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle} numberOfLines={1}>
              {title}
            </Text>
            <AnimatedPressable
              accessibilityLabel="Đóng chọn ngày"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          {/* Month & Year Controls */}
          <View style={s.navRow}>
            <View style={s.navGroup}>
              <AnimatedPressable
                accessibilityLabel="Năm trước"
                style={s.navBtn}
                onPress={() => shiftYear(-1)}
              >
                <Feather name="chevrons-left" size={16} color={c.forestInk} />
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityLabel="Tháng trước"
                style={s.navBtn}
                onPress={() => shiftMonth(-1)}
              >
                <Feather name="chevron-left" size={18} color={c.forestInk} />
              </AnimatedPressable>
            </View>

            <Text style={s.monthTitle}>
              Tháng {cursor.month + 1} / {cursor.year}
            </Text>

            <View style={s.navGroup}>
              <AnimatedPressable
                accessibilityLabel="Tháng sau"
                style={s.navBtn}
                onPress={() => shiftMonth(1)}
              >
                <Feather name="chevron-right" size={18} color={c.forestInk} />
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityLabel="Năm sau"
                style={s.navBtn}
                onPress={() => shiftYear(1)}
              >
                <Feather name="chevrons-right" size={16} color={c.forestInk} />
              </AnimatedPressable>
            </View>
          </View>

          {/* Weekday Headers */}
          <View style={s.weekRow}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={s.weekText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={s.grid}>
            {cells.map((iso, idx) => {
              if (!iso) {
                return <View key={`empty-${idx}`} style={s.dayCellWrap} />;
              }
              const disabled = isDisabled(iso);
              const selected = iso === value;
              const isToday = iso === today;
              const dayNum = Number(iso.slice(8, 10));

              return (
                <View key={iso} style={s.dayCellWrap}>
                  <AnimatedPressable
                    scaleTo={0.94}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Ngày ${formatContractIsoDate(iso)}`}
                    accessibilityState={{ selected, disabled }}
                    style={[
                      s.dayCell,
                      isToday && !selected && s.dayCellToday,
                      selected && s.dayCellSelected,
                      disabled && { opacity: 0.28 },
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      onSelect(iso);
                      onClose();
                    }}
                  >
                    <Text
                      style={[
                        s.dayText,
                        isToday && !selected && { color: c.primary, fontWeight: '800' },
                        selected && { color: '#FFFFFF', fontWeight: '800' },
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </AnimatedPressable>
                </View>
              );
            })}
          </View>

          {/* Footer Shortcuts */}
          <View style={s.footerRow}>
            {allowClear && value ? (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.clearBtn}
                onPress={() => {
                  onSelect('');
                  onClose();
                }}
              >
                <Text style={s.clearBtnText}>Xóa ngày</Text>
              </AnimatedPressable>
            ) : null}

            {todayAllowed && (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.todayBtn}
                onPress={() => {
                  triggerHaptic('selection');
                  onSelect(today);
                  onClose();
                }}
              >
                <Feather name="calendar" size={14} color={c.primary} />
                <Text style={s.todayBtnText}>
                  Hôm nay ({formatContractIsoDate(today)})
                </Text>
              </AnimatedPressable>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.forestInk,
  },
  fieldBtn: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldBtnError: {
    borderColor: c.error,
    borderWidth: 1.5,
  },
  fieldBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.error,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.48)',
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
    gap: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: c.forestInk,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrap: {
    width: '14.2857%',
    aspectRatio: 1.08,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellToday: {
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#CBE6D8',
  },
  dayCellSelected: {
    backgroundColor: c.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  clearBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
  },
  todayBtn: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: authRadius.md,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryDark,
  },
});
