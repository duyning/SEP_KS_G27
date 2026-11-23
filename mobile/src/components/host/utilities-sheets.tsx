import { Feather } from '@expo/vector-icons';
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
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import {
  formatIsoDateVi,
  formatMeterUsage,
  formatUtilityMonth,
  formatVndAmount,
  listDatesInRange,
  utilityCurrentMonth,
  waterModeLabel,
  type UtilityBatchItem,
  type UtilityRow,
  type UtilityStatusFilter,
} from '@/services/room-utilities';

/* -------------------------------------------------------------------------- */
/* 1. Month Picker Bottom Sheet (iOS & Android native-friendly grid)           */
/* -------------------------------------------------------------------------- */

export function UtilityMonthPickerSheet({
  visible,
  selectedMonth,
  currentMonth,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedMonth: string;
  currentMonth?: string;
  onClose: () => void;
  onSelect: (month: string) => void;
}) {
  if (!visible) return null;
  return (
    <UtilityMonthPickerContent
      selectedMonth={selectedMonth}
      currentMonth={currentMonth || utilityCurrentMonth()}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}

function UtilityMonthPickerContent({
  selectedMonth,
  currentMonth,
  onClose,
  onSelect,
}: {
  selectedMonth: string;
  currentMonth: string;
  onClose: () => void;
  onSelect: (month: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const initialYear = Number(selectedMonth.slice(0, 4)) || Number(currentMonth.slice(0, 4));
  const [year, setYear] = useState(initialYear);

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Chọn tháng ghi điện nước</Text>
            <AnimatedPressable accessibilityLabel="Đóng chọn tháng" style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={19} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={s.yearRow}>
            <AnimatedPressable
              accessibilityLabel="Năm trước"
              style={s.yearNavBtn}
              onPress={() => setYear(y => Math.max(2000, y - 1))}
            >
              <Feather name="chevron-left" size={18} color={c.forestInk} />
            </AnimatedPressable>
            <Text style={s.yearLabel}>Năm {year}</Text>
            <AnimatedPressable
              accessibilityLabel="Năm sau"
              style={s.yearNavBtn}
              onPress={() => setYear(y => Math.min(2100, y + 1))}
            >
              <Feather name="chevron-right" size={18} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={s.monthGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(monthNum => {
              const value = `${year}-${String(monthNum).padStart(2, '0')}`;
              const active = value === selectedMonth;
              const isCurrent = value === currentMonth;
              const isFuture = value > currentMonth;

              return (
                <AnimatedPressable
                  key={value}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  accessibilityLabel={`Tháng ${monthNum} năm ${year}`}
                  accessibilityState={{ selected: active }}
                  style={[
                    s.monthCell,
                    active && s.monthCellActive,
                    isCurrent && !active && s.monthCellCurrent,
                  ]}
                  onPress={() => {
                    onSelect(value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      s.monthCellText,
                      active && { color: '#FFFFFF', fontWeight: '700' },
                      isFuture && !active && { color: c.textMuted },
                    ]}
                  >
                    Tháng {monthNum}
                  </Text>
                  {isCurrent ? (
                    <Text
                      style={[
                        s.monthHint,
                        active && { color: 'rgba(255,255,255,0.85)' },
                      ]}
                    >
                      Hiện tại
                    </Text>
                  ) : isFuture ? (
                    <Text
                      style={[
                        s.monthHint,
                        active && { color: 'rgba(255,255,255,0.85)' },
                      ]}
                    >
                      Xem trước
                    </Text>
                  ) : null}
                </AnimatedPressable>
              );
            })}
          </View>

          <AnimatedPressable
            scaleTo={0.98}
            style={s.todayShortcut}
            onPress={() => {
              onSelect(currentMonth);
              onClose();
            }}
          >
            <Feather name="calendar" size={15} color={c.primary} />
            <Text style={s.todayShortcutText}>
              Về tháng hiện tại ({formatUtilityMonth(currentMonth)})
            </Text>
          </AnimatedPressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Date-Only Picker Sheet (Zero timezone shift, bounded to period range)   */
/* -------------------------------------------------------------------------- */

export function UtilityDatePickerSheet({
  visible,
  roomNumber,
  selectedDate,
  minDate,
  maxDate,
  onClose,
  onSelect,
}: {
  visible: boolean;
  roomNumber: string;
  selectedDate: string;
  minDate?: string | null;
  maxDate?: string | null;
  onClose: () => void;
  onSelect: (isoDate: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  const dates = listDatesInRange(minDate, maxDate);

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '78%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Ngày ghi phòng {roomNumber}</Text>
              {minDate && maxDate ? (
                <Text style={s.sheetSub}>
                  Hợp lệ trong kỳ: {formatIsoDateVi(minDate)} – {formatIsoDateVi(maxDate)}
                </Text>
              ) : null}
            </View>
            <AnimatedPressable accessibilityLabel="Đóng chọn ngày" style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={19} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={s.dateGrid} showsVerticalScrollIndicator={false}>
            {dates.map(iso => {
              const active = iso === selectedDate;
              const dayNum = Number(iso.slice(8, 10));
              const monthNum = Number(iso.slice(5, 7));
              return (
                <AnimatedPressable
                  key={iso}
                  scaleTo={0.96}
                  accessibilityLabel={`Ngày ${formatIsoDateVi(iso)}`}
                  accessibilityState={{ selected: active }}
                  style={[s.dateCell, active && s.dateCellActive]}
                  onPress={() => {
                    onSelect(iso);
                    onClose();
                  }}
                >
                  <Text style={[s.dateDay, active && { color: '#FFFFFF' }]}>{dayNum}</Text>
                  <Text style={[s.dateMonth, active && { color: 'rgba(255,255,255,0.85)' }]}>
                    Th{monthNum}
                  </Text>
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
/* 3. Filter Bottom Sheet (Status, Floor, Specific Room)                       */
/* -------------------------------------------------------------------------- */

export interface UtilityFilterValue {
  status: UtilityStatusFilter;
  floor: string;
  roomId: number | null;
}

export function UtilityFilterSheet({
  visible,
  value,
  floors,
  rows,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: UtilityFilterValue;
  floors: string[];
  rows: readonly UtilityRow[];
  onClose: () => void;
  onApply: (next: UtilityFilterValue) => void;
}) {
  if (!visible) return null;
  return (
    <UtilityFilterSheetContent
      value={value}
      floors={floors}
      rows={rows}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function UtilityFilterSheetContent({
  value,
  floors,
  rows,
  onClose,
  onApply,
}: {
  value: UtilityFilterValue;
  floors: string[];
  rows: readonly UtilityRow[];
  onClose: () => void;
  onApply: (next: UtilityFilterValue) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [draft, setDraft] = useState<UtilityFilterValue>(value);

  const uniqueRooms = Array.from(
    new Map(rows.map(r => [r.roomId, { roomId: r.roomId, roomNumber: r.roomNumber }])).values()
  );

  const statusOptions: readonly { key: UtilityStatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả phòng' },
    { key: 'UNRECORDED', label: 'Chưa ghi' },
    { key: 'UNSAVED', label: 'Chưa lưu' },
    { key: 'FINALIZED', label: 'Đã chốt' },
    { key: 'ISSUE', label: 'Có lỗi' },
  ];

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '84%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Bộ lọc ghi điện nước</Text>
            <AnimatedPressable accessibilityLabel="Đóng bộ lọc" style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={19} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              <Text style={s.filterLabel}>Trạng thái ghi chỉ số</Text>
              <View style={s.chipWrap}>
                {statusOptions.map(opt => {
                  const active = draft.status === opt.key;
                  return (
                    <AnimatedPressable
                      key={opt.key}
                      scaleTo={0.97}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setDraft(prev => ({ ...prev, status: opt.key }))}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {floors.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={s.filterLabel}>Tầng / Khu vực</Text>
                <View style={s.chipWrap}>
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={[s.chip, draft.floor === 'ALL' && s.chipActive]}
                    onPress={() => setDraft(prev => ({ ...prev, floor: 'ALL' }))}
                  >
                    <Text style={[s.chipText, draft.floor === 'ALL' && s.chipTextActive]}>
                      Tất cả tầng
                    </Text>
                  </AnimatedPressable>
                  {floors.map(floor => {
                    const active = draft.floor === floor;
                    return (
                      <AnimatedPressable
                        key={floor}
                        scaleTo={0.97}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setDraft(prev => ({ ...prev, floor }))}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>{floor}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {uniqueRooms.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={s.filterLabel}>Phòng cụ thể</Text>
                <View style={s.chipWrap}>
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={[s.chip, draft.roomId == null && s.chipActive]}
                    onPress={() => setDraft(prev => ({ ...prev, roomId: null }))}
                  >
                    <Text style={[s.chipText, draft.roomId == null && s.chipTextActive]}>
                      Tất cả
                    </Text>
                  </AnimatedPressable>
                  {uniqueRooms.map(room => {
                    const active = draft.roomId === room.roomId;
                    return (
                      <AnimatedPressable
                        key={room.roomId}
                        scaleTo={0.97}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setDraft(prev => ({ ...prev, roomId: room.roomId }))}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>
                          {room.roomNumber}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={s.footerRow}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.secondaryBtn}
              onPress={() => setDraft({ status: 'ALL', floor: 'ALL', roomId: null })}
            >
              <Text style={s.secondaryBtnText}>Đặt lại</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.primaryBtn}
              onPress={() => {
                onApply(draft);
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
/* 4. Finalize Confirmation Bottom Sheet (Single Room OR Valid Batch)         */
/* -------------------------------------------------------------------------- */

export function UtilityFinalizeConfirmSheet({
  visible,
  month,
  items,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  month: string;
  items: UtilityBatchItem[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible || items.length === 0) return null;

  const isSingle = items.length === 1;
  const first = items[0];
  const grandTotal = items.reduce(
    (sum, item) => sum + (item.validation.totalAmount ?? 0n),
    0n
  );

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={() => !busy && onClose()} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '85%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>
              {isSingle ? `Xác nhận chốt kỳ phòng ${first.row.roomNumber}` : `Xác nhận chốt ${items.length} phòng`}
            </Text>
            <AnimatedPressable
              accessibilityLabel="Đóng xác nhận chốt kỳ"
              disabled={busy}
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={19} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
            <View style={s.confirmBanner}>
              <Feather name="shield" size={16} color={c.primary} />
              <Text style={s.confirmBannerText}>
                Sau khi chốt kỳ ({formatUtilityMonth(month)}), số liệu điện nước sẽ khóa ở chế độ
                chỉ xem và dùng làm mốc chỉ số đầu cho kỳ kế tiếp.
              </Text>
            </View>

            {isSingle ? (
              <View style={s.summaryCard}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Phòng / Kỳ ghi</Text>
                  <Text style={s.summaryVal}>
                    {first.row.roomNumber} · {formatUtilityMonth(month)}
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Ngày ghi chỉ số</Text>
                  <Text style={s.summaryVal}>{formatIsoDateVi(first.draft.readOn)}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Điện ({formatMeterUsage(first.validation.electricityUsage)} kWh)</Text>
                  <Text style={s.summaryVal}>
                    {first.draft.electricityStart} → {first.draft.electricityEnd}
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Thành tiền điện</Text>
                  <Text style={s.summaryVal}>{formatVndAmount(first.validation.electricityAmount)}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Cách tính nước</Text>
                  <Text style={s.summaryVal}>{waterModeLabel(first.draft.waterMode)}</Text>
                </View>
                {first.draft.waterMode === 'METER' ? (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Nước ({formatMeterUsage(first.validation.waterUsage)} m³)</Text>
                    <Text style={s.summaryVal}>
                      {first.draft.waterStart} → {first.draft.waterEnd}
                    </Text>
                  </View>
                ) : first.draft.waterMode === 'PER_PERSON' ? (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Số người tính nước</Text>
                    <Text style={s.summaryVal}>
                      {first.draft.occupantCount || first.draft.suggestedOccupants} người
                    </Text>
                  </View>
                ) : null}
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Thành tiền nước</Text>
                  <Text style={s.summaryVal}>{formatVndAmount(first.validation.waterAmount)}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLabel}>Tổng tiền điện nước</Text>
                  <Text style={s.totalVal}>{formatVndAmount(first.validation.totalAmount)}</Text>
                </View>
              </View>
            ) : (
              <View style={s.summaryCard}>
                {items.map(item => (
                  <View key={item.key} style={s.batchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.batchRoom}>
                        Phòng {item.row.roomNumber}
                        {item.row.tenantName ? ` · ${item.row.tenantName}` : ''}
                      </Text>
                      <Text style={s.batchSub}>
                        Điện: {formatMeterUsage(item.validation.electricityUsage)} kWh · Nước:{' '}
                        {item.draft.waterMode === 'METER'
                          ? `${formatMeterUsage(item.validation.waterUsage)} m³`
                          : waterModeLabel(item.draft.waterMode)}
                      </Text>
                    </View>
                    <Text style={s.batchTotal}>{formatVndAmount(item.validation.totalAmount)}</Text>
                  </View>
                ))}
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.totalLabel}>Tổng {items.length} phòng</Text>
                  <Text style={s.totalVal}>{formatVndAmount(grandTotal)}</Text>
                </View>
              </View>
            )}

            <InlineError message={error} />
          </ScrollView>

          <View style={s.footerRow}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={s.secondaryBtn}
              onPress={onClose}
            >
              <Text style={s.secondaryBtnText}>Quay lại kiểm tra</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.primaryBtn, busy && { opacity: 0.7 }]}
              onPress={onConfirm}
            >
              {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={s.primaryBtnText}>
                {busy ? 'Đang chốt kỳ…' : 'Xác nhận chốt kỳ'}
              </Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Header Overflow Menu Sheet (Batch Finalize & Clear Local Drafts)         */
/* -------------------------------------------------------------------------- */

export function UtilityMenuSheet({
  visible,
  validUnsavedCount,
  hasAnyDrafts,
  editable,
  onClose,
  onBatchFinalize,
  onClearDrafts,
}: {
  visible: boolean;
  validUnsavedCount: number;
  hasAnyDrafts: boolean;
  editable: boolean;
  onClose: () => void;
  onBatchFinalize: () => void;
  onClearDrafts: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Tùy chọn kỳ ghi điện nước</Text>
            <AnimatedPressable accessibilityLabel="Đóng menu" style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={19} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={{ gap: 10, paddingBottom: 6 }}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={!editable || validUnsavedCount === 0}
              style={[s.menuOption, (!editable || validUnsavedCount === 0) && { opacity: 0.45 }]}
              onPress={() => {
                onClose();
                onBatchFinalize();
              }}
            >
              <View style={s.menuIcon}>
                <Feather name="check-square" size={17} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuTitle}>
                  Chốt tất cả phòng hợp lệ ({validUnsavedCount})
                </Text>
                <Text style={s.menuSub}>
                  Gửi đồng thời các bản ghi hợp lệ lên hệ thống (có màn xác nhận trước khi chốt)
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={!hasAnyDrafts}
              style={[s.menuOption, !hasAnyDrafts && { opacity: 0.45 }]}
              onPress={() => {
                onClose();
                onClearDrafts();
              }}
            >
              <View style={[s.menuIcon, { backgroundColor: '#FEF2F2' }]}>
                <Feather name="rotate-ccw" size={17} color={c.error} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.menuTitle, { color: c.error }]}>Hoàn tác tất cả thay đổi chưa chốt</Text>
                <Text style={s.menuSub}>
                  Xóa bản nháp cục bộ của kỳ này và giữ nguyên dữ liệu đã chốt trên máy chủ
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  sheetSub: {
    fontSize: 12.5,
    color: c.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  yearNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: c.forestInk,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  monthCell: {
    width: '31%',
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  monthCellCurrent: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  monthCellActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  monthCellText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  monthHint: {
    fontSize: 10.5,
    color: c.primary,
    fontWeight: '600',
  },
  todayShortcut: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: c.softMint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  todayShortcutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
  },
  dateCell: {
    width: '17.5%',
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dateCellActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  dateDay: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  dateMonth: {
    fontSize: 11,
    color: c.textSecondary,
  },
  filterLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  primaryBtn: {
    flex: 1.35,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.softMint,
  },
  confirmBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  summaryCard: {
    backgroundColor: c.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  summaryVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  totalVal: {
    fontSize: 17,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  batchRoom: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  batchSub: {
    fontSize: 12,
    color: c.textSecondary,
  },
  batchTotal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  menuSub: {
    fontSize: 12.5,
    lineHeight: 17,
    color: c.textSecondary,
  },
});
