import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import {
  WATER_MODE_OPTIONS,
  formatIsoDateVi,
  formatMeterUsage,
  formatVndAmount,
  isUtilityRowFinal,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  waterModeLabel,
  type UtilityDraft,
  type UtilityDraftPatch,
  type UtilityRow,
  type UtilityRowValidation,
} from '@/services/room-utilities';

interface UtilityRoomCardProps {
  row: UtilityRow;
  draft: UtilityDraft;
  validation: UtilityRowValidation;
  edited: boolean;
  expanded: boolean;
  editable: boolean;
  preview: boolean;
  unlockedFinalized: boolean;
  carriedDate: string | null;
  justFinalized: boolean;
  hasNextRoom: boolean;
  onToggleExpand: () => void;
  onChangeField: (patch: UtilityDraftPatch) => void;
  onOpenDatePicker: () => void;
  onSaveLocalDraft: () => void;
  onRequestFinalize: () => void;
  onUnlockFinalized: () => void;
  onDiscardRowEdit: () => void;
  onGoNextRoom: () => void;
}

export const UtilityRoomCard = memo(function UtilityRoomCard({
  row,
  draft,
  validation,
  edited,
  expanded,
  editable,
  preview,
  unlockedFinalized,
  carriedDate,
  justFinalized,
  hasNextRoom,
  onToggleExpand,
  onChangeField,
  onOpenDatePicker,
  onSaveLocalDraft,
  onRequestFinalize,
  onUnlockFinalized,
  onDiscardRowEdit,
  onGoNextRoom,
}: UtilityRoomCardProps) {
  const reducedMotion = useReducedMotionPreference();
  const isFinal = isUtilityRowFinal(row);
  const canEditInputs = editable && !row.issue && (!isFinal || unlockedFinalized);

  // Compute displayed amounts (backend confirmed when finalized & unedited, live estimate when editing)
  const electricityAmount =
    edited || !row.saved ? validation.electricityAmount : BigInt(row.saved.electricityAmount);
  const waterAmount =
    edited || !row.saved ? validation.waterAmount : BigInt(row.saved.waterAmount);
  const totalAmount =
    electricityAmount !== null && waterAmount !== null
      ? electricityAmount + waterAmount
      : null;

  // Status presentation mapped strictly from backend saved state + local dirty edits
  let statusLabel = preview ? 'Xem trước' : 'Chưa ghi';
  let statusStyle: {
    bg: string;
    fg: string;
    icon: 'edit-3' | 'alert-circle' | 'clock' | 'check-circle';
  } = { bg: '#F1F5F3', fg: c.textSecondary, icon: 'edit-3' };
  if (row.issue) {
    statusLabel = 'Cần xử lý';
    statusStyle = { bg: '#FEE2E2', fg: '#991B1B', icon: 'alert-circle' };
  } else if (edited) {
    statusLabel = 'Chưa lưu chốt';
    statusStyle = { bg: '#FEF3C7', fg: '#92400E', icon: 'clock' };
  } else if (isFinal) {
    statusLabel =
      row.handover && row.saved?.readOn === row.periodEnd ? 'Đã chốt bàn giao' : 'Đã chốt kỳ';
    statusStyle = { bg: '#DCFCE7', fg: '#166534', icon: 'check-circle' };
  }

  const waterSummaryText =
    draft.waterMode === 'METER'
      ? `Nước: ${formatMeterUsage(validation.waterUsage)} m³`
      : draft.waterMode === 'PER_PERSON'
        ? `Nước: ${draft.occupantCount || draft.suggestedOccupants} người`
        : 'Nước: Cố định';

  const effectiveOccupants =
    draft.occupantCount.trim() === '' ? String(draft.suggestedOccupants) : draft.occupantCount;

  return (
    <View
      style={[
        s.card,
        expanded && s.cardExpanded,
        edited && s.cardDirty,
        Boolean(row.issue) && s.cardError,
      ]}
    >
      {/* Collapsed Compact Summary Header */}
      <AnimatedPressable
        scaleTo={0.995}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Phòng ${row.roomNumber}, trạng thái ${statusLabel}`}
        style={s.cardHeader}
        onPress={onToggleExpand}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <View style={s.topLine}>
            <Text style={s.roomTitle} numberOfLines={1}>
              Phòng {row.roomNumber}
              {row.floor ? ` — ${row.floor}` : ''}
            </Text>
            <View style={[s.statusPill, { backgroundColor: statusStyle.bg }]}>
              <Feather name={statusStyle.icon} size={11} color={statusStyle.fg} />
              <Text style={[s.statusPillText, { color: statusStyle.fg }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={s.metaLine}>
            <Feather name="user" size={13} color={c.textMuted} />
            <Text style={s.tenantText} numberOfLines={1}>
              {row.tenantName || 'Chưa có tên người thuê'}
            </Text>
            {row.saved?.readOn ? (
              <Text style={s.readDateTag}>· Ghi {formatIsoDateVi(row.saved.readOn)}</Text>
            ) : null}
          </View>

          <View style={s.summaryBar}>
            <Text style={s.usageLine} numberOfLines={1}>
              Điện: {formatMeterUsage(validation.electricityUsage)} kWh · {waterSummaryText}
            </Text>
            <Text style={s.totalInline}>{formatVndAmount(totalAmount)}</Text>
          </View>
        </View>

        <View style={s.chevronWrap}>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={19}
            color={c.textSecondary}
          />
        </View>
      </AnimatedPressable>

      {/* Expanded Vertical Reading Detail / Form */}
      {expanded ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(170)}
          style={s.expandedBody}
        >
          {/* Period & Anchor Info */}
          {row.periodStart && row.periodEnd ? (
            <View style={s.periodNotice}>
              <Feather name="calendar" size={13} color={c.primary} />
              <Text style={s.periodNoticeText}>
                Kỳ thuê: {formatIsoDateVi(row.periodStart)} – {formatIsoDateVi(row.periodEnd)}
                {row.handover ? ' (Bàn giao trả phòng)' : ''}
                {carriedDate
                  ? ` · Kế thừa từ bàn giao ${formatIsoDateVi(carriedDate)}`
                  : row.previousReadOn
                    ? ` · Mốc đầu từ ${formatIsoDateVi(row.previousReadOn)}`
                    : ''}
              </Text>
            </View>
          ) : null}

          {/* Blocking Issue Banner */}
          {row.issue ? (
            <View style={s.issueBox}>
              <Feather name="alert-triangle" size={16} color={c.error} />
              <Text style={s.issueText}>{row.issue}</Text>
            </View>
          ) : isFinal && !unlockedFinalized ? (
            /* READ-ONLY VIEW FOR FINALIZED READING */
            <View style={{ gap: 12 }}>
              <View style={s.lockedBanner}>
                <Feather name="lock" size={14} color="#166534" />
                <Text style={s.lockedBannerText}>
                  Kỳ này đã được chốt ngày {formatIsoDateVi(row.saved?.readOn)}. Các trường đang ở
                  trạng thái chỉ xem để bảo vệ số liệu.
                </Text>
              </View>

              <View style={s.readOnlySection}>
                <View style={s.sectionTitleRow}>
                  <Feather name="zap" size={15} color="#D97706" />
                  <Text style={s.sectionTitle}>Điện tiêu thụ</Text>
                </View>
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Chỉ số đầu → mới</Text>
                  <Text style={s.kvVal}>
                    {row.saved?.electricityStart} → {row.saved?.electricityEnd} kWh
                  </Text>
                </View>
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Tiêu thụ · Đơn giá</Text>
                  <Text style={s.kvVal}>
                    {formatMeterUsage(validation.electricityUsage)} kWh ×{' '}
                    {formatVndAmount(row.saved?.electricityRate)}
                  </Text>
                </View>
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Thành tiền điện</Text>
                  <Text style={[s.kvVal, { color: c.primary }]}>
                    {formatVndAmount(electricityAmount)}
                  </Text>
                </View>
              </View>

              <View style={s.readOnlySection}>
                <View style={s.sectionTitleRow}>
                  <Feather name="droplet" size={15} color="#0284C7" />
                  <Text style={s.sectionTitle}>Nước ({waterModeLabel(row.saved?.waterMode)})</Text>
                </View>
                {row.saved?.waterMode === 'METER' ? (
                  <View style={s.kvRow}>
                    <Text style={s.kvLabel}>Chỉ số đầu → mới</Text>
                    <Text style={s.kvVal}>
                      {row.saved.waterStart} → {row.saved.waterEnd} m³ (
                      {formatMeterUsage(validation.waterUsage)} m³)
                    </Text>
                  </View>
                ) : row.saved?.waterMode === 'PER_PERSON' ? (
                  <View style={s.kvRow}>
                    <Text style={s.kvLabel}>Số người tính nước</Text>
                    <Text style={s.kvVal}>{row.saved.occupantCount ?? row.suggestedOccupants} người</Text>
                  </View>
                ) : null}
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Đơn giá</Text>
                  <Text style={s.kvVal}>{formatVndAmount(row.saved?.waterRate)}</Text>
                </View>
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Thành tiền nước</Text>
                  <Text style={[s.kvVal, { color: c.primary }]}>
                    {formatVndAmount(waterAmount)}
                  </Text>
                </View>
              </View>

              <View style={s.totalCard}>
                <View style={s.kvRow}>
                  <Text style={s.totalHeading}>Tổng cộng điện nước</Text>
                  <Text style={s.totalAmount}>{formatVndAmount(totalAmount)}</Text>
                </View>
              </View>

              {justFinalized ? (
                <View style={s.nextBanner}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.nextBannerTitle}>Đã chốt kỳ thành công</Text>
                    <Text style={s.nextBannerSub}>
                      {hasNextRoom
                        ? 'Tiếp tục ghi phòng kế tiếp trong danh sách lọc.'
                        : 'Đã hoàn tất ghi điện nước cho các phòng trong danh sách.'}
                    </Text>
                  </View>
                  {hasNextRoom ? (
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.nextBtn}
                      onPress={onGoNextRoom}
                    >
                      <Text style={s.nextBtnText}>Phòng tiếp theo</Text>
                      <Feather name="arrow-right" size={14} color="#FFFFFF" />
                    </AnimatedPressable>
                  ) : null}
                </View>
              ) : null}

              {editable ? (
                <AnimatedPressable
                  scaleTo={0.98}
                  accessibilityLabel={`Mở điều chỉnh chỉ số đã chốt phòng ${row.roomNumber}`}
                  style={s.unlockBtn}
                  onPress={onUnlockFinalized}
                >
                  <Feather name="edit-2" size={14} color={c.primary} />
                  <Text style={s.unlockBtnText}>Điều chỉnh chỉ số đã chốt</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : (
            /* EDITABLE FORM FOR UNRECORDED OR UNLOCKED REVISION */
            <View style={{ gap: 14 }}>
              {/* Read Date Selector */}
              <View style={{ gap: 6 }}>
                <Text style={s.fieldLabel}>Ngày ghi chỉ số</Text>
                <AnimatedPressable
                  scaleTo={0.99}
                  disabled={!canEditInputs}
                  style={[
                    s.dateTrigger,
                    Boolean(validation.errors.readOn) && s.inputInvalid,
                  ]}
                  onPress={onOpenDatePicker}
                >
                  <View style={s.rowGap}>
                    <Feather name="calendar" size={16} color={c.primary} />
                    <Text style={s.dateTriggerText}>
                      {draft.readOn ? formatIsoDateVi(draft.readOn) : 'Chọn ngày ghi'}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={16} color={c.textMuted} />
                </AnimatedPressable>
                <InlineError message={validation.errors.readOn} />
              </View>

              {/* ELECTRICITY SECTION */}
              <View style={s.subPanel}>
                <View style={s.sectionTitleRow}>
                  <Feather name="zap" size={15} color="#D97706" />
                  <Text style={s.sectionTitle}>Chỉ số điện (kWh)</Text>
                </View>

                <View style={s.twoCol}>
                  <View style={s.colField}>
                    <Text style={s.inputLabel}>Chỉ số đầu kỳ</Text>
                    <TextInput
                      style={[
                        s.input,
                        Boolean(validation.errors.electricityStart) && s.inputInvalid,
                      ]}
                      value={draft.electricityStart}
                      onChangeText={val =>
                        onChangeField({ electricityStart: sanitizeDecimalInput(val) })
                      }
                      placeholder="Chưa có mốc"
                      placeholderTextColor={c.textMuted}
                      keyboardType="decimal-pad"
                      editable={canEditInputs}
                    />
                    <InlineError message={validation.errors.electricityStart} />
                  </View>

                  <View style={s.colField}>
                    <Text style={s.inputLabel}>Chỉ số mới *</Text>
                    <TextInput
                      style={[
                        s.input,
                        Boolean(validation.errors.electricityEnd) && s.inputInvalid,
                      ]}
                      value={draft.electricityEnd}
                      onChangeText={val =>
                        onChangeField({ electricityEnd: sanitizeDecimalInput(val) })
                      }
                      placeholder="Nhập chỉ số mới"
                      placeholderTextColor={c.textMuted}
                      keyboardType="decimal-pad"
                      editable={canEditInputs}
                    />
                    <InlineError message={validation.errors.electricityEnd} />
                  </View>
                </View>

                <View style={s.colField}>
                  <Text style={s.inputLabel}>Đơn giá điện (đ/kWh)</Text>
                  <TextInput
                    style={[
                      s.input,
                      Boolean(validation.errors.electricityRate) && s.inputInvalid,
                    ]}
                    value={draft.electricityRate}
                    onChangeText={val =>
                      onChangeField({ electricityRate: sanitizeIntegerInput(val) })
                    }
                    placeholder="Ví dụ: 3500"
                    placeholderTextColor={c.textMuted}
                    keyboardType="number-pad"
                    editable={canEditInputs}
                  />
                  <InlineError message={validation.errors.electricityRate} />
                </View>

                <View style={s.calcFooter}>
                  <Text style={s.calcMeta}>
                    Tiêu thụ: {formatMeterUsage(validation.electricityUsage)} kWh
                  </Text>
                  <Text style={s.calcMoney}>{formatVndAmount(electricityAmount)}</Text>
                </View>
              </View>

              {/* WATER SECTION */}
              <View style={s.subPanel}>
                <View style={s.sectionTitleRow}>
                  <Feather name="droplet" size={15} color="#0284C7" />
                  <Text style={s.sectionTitle}>Chỉ số & cách tính nước</Text>
                </View>

                {/* WaterMode selector — keeps entered values in draft safely */}
                <View style={s.modeRow}>
                  {WATER_MODE_OPTIONS.map(opt => {
                    const active = draft.waterMode === opt.key;
                    return (
                      <AnimatedPressable
                        key={opt.key}
                        scaleTo={0.97}
                        disabled={!canEditInputs}
                        style={[s.modePill, active && s.modePillActive]}
                        onPress={() => onChangeField({ waterMode: opt.key })}
                      >
                        <Text style={[s.modePillText, active && s.modePillTextActive]}>
                          {opt.shortLabel}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {draft.waterMode === 'METER' ? (
                  <View style={s.twoCol}>
                    <View style={s.colField}>
                      <Text style={s.inputLabel}>Chỉ số nước đầu</Text>
                      <TextInput
                        style={[
                          s.input,
                          Boolean(validation.errors.waterStart) && s.inputInvalid,
                        ]}
                        value={draft.waterStart}
                        onChangeText={val =>
                          onChangeField({ waterStart: sanitizeDecimalInput(val) })
                        }
                        placeholder="Chưa có mốc"
                        placeholderTextColor={c.textMuted}
                        keyboardType="decimal-pad"
                        editable={canEditInputs}
                      />
                      <InlineError message={validation.errors.waterStart} />
                    </View>

                    <View style={s.colField}>
                      <Text style={s.inputLabel}>Chỉ số nước mới *</Text>
                      <TextInput
                        style={[
                          s.input,
                          Boolean(validation.errors.waterEnd) && s.inputInvalid,
                        ]}
                        value={draft.waterEnd}
                        onChangeText={val =>
                          onChangeField({ waterEnd: sanitizeDecimalInput(val) })
                        }
                        placeholder="Nhập chỉ số mới"
                        placeholderTextColor={c.textMuted}
                        keyboardType="decimal-pad"
                        editable={canEditInputs}
                      />
                      <InlineError message={validation.errors.waterEnd} />
                    </View>
                  </View>
                ) : draft.waterMode === 'PER_PERSON' ? (
                  <View style={s.colField}>
                    <Text style={s.inputLabel}>
                      Số người tính nước (gợi ý theo đợt thuê: {draft.suggestedOccupants})
                    </Text>
                    <TextInput
                      style={[
                        s.input,
                        Boolean(validation.errors.occupantCount) && s.inputInvalid,
                      ]}
                      value={draft.occupantCount}
                      onChangeText={val =>
                        onChangeField({ occupantCount: sanitizeIntegerInput(val, 3) })
                      }
                      placeholder={String(draft.suggestedOccupants)}
                      placeholderTextColor={c.textMuted}
                      keyboardType="number-pad"
                      editable={canEditInputs}
                    />
                    <InlineError message={validation.errors.occupantCount} />
                  </View>
                ) : (
                  <Text style={s.fixedHint}>
                    Tính phí nước cố định cho cả phòng trong kỳ ghi này.
                  </Text>
                )}

                <View style={s.colField}>
                  <Text style={s.inputLabel}>
                    {draft.waterMode === 'METER'
                      ? 'Đơn giá nước (đ/m³)'
                      : draft.waterMode === 'PER_PERSON'
                        ? 'Đơn giá nước (đ/người)'
                        : 'Phí nước cố định (đ/phòng)'}
                  </Text>
                  <TextInput
                    style={[
                      s.input,
                      Boolean(validation.errors.waterRate) && s.inputInvalid,
                    ]}
                    value={draft.waterRate}
                    onChangeText={val =>
                      onChangeField({ waterRate: sanitizeIntegerInput(val) })
                    }
                    placeholder="Ví dụ: 30000"
                    placeholderTextColor={c.textMuted}
                    keyboardType="number-pad"
                    editable={canEditInputs}
                  />
                  <InlineError message={validation.errors.waterRate} />
                </View>

                <View style={s.calcFooter}>
                  <Text style={s.calcMeta}>
                    {draft.waterMode === 'METER'
                      ? `Tiêu thụ: ${formatMeterUsage(validation.waterUsage)} m³`
                      : draft.waterMode === 'PER_PERSON'
                        ? `${effectiveOccupants} người`
                        : '1 phòng (cố định)'}
                  </Text>
                  <Text style={s.calcMoney}>{formatVndAmount(waterAmount)}</Text>
                </View>
              </View>

              {/* TOTAL SUMMARY CARD */}
              <View style={s.totalCard}>
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Tiền điện (tạm tính)</Text>
                  <Text style={s.kvVal}>{formatVndAmount(electricityAmount)}</Text>
                </View>
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Tiền nước (tạm tính)</Text>
                  <Text style={s.kvVal}>{formatVndAmount(waterAmount)}</Text>
                </View>
                <View style={s.totalDivider} />
                <View style={s.kvRow}>
                  <Text style={s.totalHeading}>Tổng cộng điện nước</Text>
                  <Text style={s.totalAmount}>{formatVndAmount(totalAmount)}</Text>
                </View>
                <Text style={s.totalDisclaimer}>
                  Chỉ gồm tiền điện nước của kỳ ghi này (không cộng tiền thuê/phí khác). Giá trị
                  chính thức xác nhận từ máy chủ khi chốt kỳ.
                </Text>
              </View>

              {/* ROW ACTIONS: SAVE LOCAL DRAFT vs FINALIZE PERIOD */}
              {canEditInputs ? (
                <View style={s.actionBar}>
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.draftActionBtn}
                    accessibilityLabel={`Lưu bản nháp phòng ${row.roomNumber}`}
                    onPress={onSaveLocalDraft}
                  >
                    <Feather name="save" size={15} color={c.forestInk} />
                    <Text style={s.draftActionText}>Lưu nháp</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={!validation.valid}
                    style={[
                      s.finalizeBtn,
                      !validation.valid && { opacity: 0.45 },
                    ]}
                    accessibilityLabel={`Chốt kỳ phòng ${row.roomNumber}`}
                    onPress={onRequestFinalize}
                  >
                    <Feather name="check-circle" size={15} color="#FFFFFF" />
                    <Text style={s.finalizeBtnText}>Chốt kỳ</Text>
                  </AnimatedPressable>
                </View>
              ) : null}

              {edited || unlockedFinalized ? (
                <AnimatedPressable
                  scaleTo={0.98}
                  style={s.discardLink}
                  onPress={onDiscardRowEdit}
                >
                  <Text style={s.discardLinkText}>
                    {unlockedFinalized ? 'Hủy điều chỉnh (khóa lại)' : 'Hoàn tác thay đổi phòng này'}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#99D5C9',
  },
  cardDirty: {
    borderColor: '#FCD34D',
  },
  cardError: {
    borderColor: '#FCA5A5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tenantText: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    flexShrink: 1,
  },
  readDateTag: {
    fontSize: 12,
    color: c.textMuted,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  usageLine: {
    flex: 1,
    fontSize: 12.5,
    color: c.textSecondary,
  },
  totalInline: {
    fontSize: 14.5,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  chevronWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 15,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: 12,
  },
  periodNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 11,
    backgroundColor: c.softMint,
  },
  periodNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.forestInk,
  },
  issueBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  issueText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#991B1B',
    fontWeight: '500',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#166534',
  },
  readOnlySection: {
    borderRadius: 13,
    padding: 12,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    gap: 7,
  },
  subPanel: {
    borderRadius: 14,
    padding: 13,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kvLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  kvVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  dateTrigger: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTriggerText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  colField: {
    flex: 1,
    gap: 5,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  inputInvalid: {
    borderColor: c.error,
    backgroundColor: '#FFF8F8',
  },
  calcFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  calcMeta: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  calcMoney: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  modePillActive: {
    borderColor: c.primary,
    backgroundColor: c.primary,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.forestInk,
  },
  modePillTextActive: {
    color: '#FFFFFF',
  },
  fixedHint: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  totalCard: {
    borderRadius: 14,
    padding: 13,
    backgroundColor: '#F2FAF8',
    borderWidth: 1,
    borderColor: '#C5E6DF',
    gap: 6,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#C5E6DF',
    marginVertical: 2,
  },
  totalHeading: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  totalDisclaimer: {
    fontSize: 11.5,
    lineHeight: 16,
    color: c.textSecondary,
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
  },
  draftActionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  draftActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  finalizeBtn: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  finalizeBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  discardLink: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  unlockBtn: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  unlockBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  nextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E6F4F1',
  },
  nextBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#06665C',
  },
  nextBannerSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.forestInk,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.primary,
  },
  nextBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
