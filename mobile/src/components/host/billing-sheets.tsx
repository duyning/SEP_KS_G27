import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import {
  PAYMENT_METHOD_LABELS,
  describeCycle,
  describeDueDayRule,
  formatBillCode,
  formatBillMoney,
  formatBillingMonthShort,
  formatIsoDateShort,
  formatVndInput,
  generatePaymentRequestKey,
  validateDraftInput,
  validatePaymentInput,
  validateScheduleInput,
  vndValue,
  type BillKind,
  type BillingBill,
  type BillingCandidate,
  type BillingDraftPayload,
  type BillingPaymentPayload,
  type BillingSchedulePayload,
  type BillingStatusFilter,
  type PaymentMethod,
} from '@/services/room-billing';

function shiftIsoDate(iso: string, deltaDays: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* 1. Billing Filter Bottom Sheet                                              */
/* -------------------------------------------------------------------------- */

export interface BillingFilterValue {
  status: BillingStatusFilter;
  roomId: number | null;
}

export function BillingFilterSheet({
  visible,
  value,
  rooms,
  earlierCount,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: BillingFilterValue;
  rooms: { roomId: number; roomNumber: string }[];
  earlierCount: number;
  onClose: () => void;
  onApply: (next: BillingFilterValue) => void;
}) {
  if (!visible) return null;
  return (
    <BillingFilterContent
      value={value}
      rooms={rooms}
      earlierCount={earlierCount}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function BillingFilterContent({
  value,
  rooms,
  earlierCount,
  onClose,
  onApply,
}: {
  value: BillingFilterValue;
  rooms: { roomId: number; roomNumber: string }[];
  earlierCount: number;
  onClose: () => void;
  onApply: (next: BillingFilterValue) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [draft, setDraft] = useState<BillingFilterValue>(value);

  const statuses: readonly { key: BillingStatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'UNPAID', label: 'Chưa thanh toán' },
    { key: 'PARTIAL', label: 'Thu một phần' },
    { key: 'PAID', label: 'Đã thanh toán' },
    { key: 'OVERDUE', label: 'Quá hạn' },
    { key: 'DRAFT', label: 'Bản nháp' },
    { key: 'EARLIER', label: `Công nợ kỳ trước (${earlierCount})` },
  ];

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '84%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Lọc phiếu thu & công nợ</Text>
            <AnimatedPressable accessibilityLabel="Đóng bộ lọc" style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={19} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              <Text style={s.sectionLbl}>Trạng thái</Text>
              <View style={s.chipWrap}>
                {statuses.map(opt => {
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

            {rooms.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={s.sectionLbl}>Phòng</Text>
                <View style={s.chipWrap}>
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={[s.chip, draft.roomId == null && s.chipActive]}
                    onPress={() => setDraft(prev => ({ ...prev, roomId: null }))}
                  >
                    <Text style={[s.chipText, draft.roomId == null && s.chipTextActive]}>
                      Tất cả phòng
                    </Text>
                  </AnimatedPressable>
                  {rooms.map(r => {
                    const active = draft.roomId === r.roomId;
                    return (
                      <AnimatedPressable
                        key={r.roomId}
                        scaleTo={0.97}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setDraft(prev => ({ ...prev, roomId: r.roomId }))}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>
                          P.{r.roomNumber}
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
              onPress={() => setDraft({ status: 'ALL', roomId: null })}
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
/* 2. Record Payment Sheet (with In-Sheet Confirmation & Idempotent UUID)     */
/* -------------------------------------------------------------------------- */

export function BillingPaymentSheet({
  visible,
  bill,
  todayIso,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  bill: BillingBill | null;
  todayIso: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: BillingPaymentPayload) => void;
}) {
  if (!visible || !bill) return null;
  return (
    <BillingPaymentContent
      bill={bill}
      todayIso={todayIso}
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function BillingPaymentContent({
  bill,
  todayIso,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  bill: BillingBill;
  todayIso: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: BillingPaymentPayload) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [amountText, setAmountText] = useState(() => formatVndInput(bill.outstanding));
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');
  const [paidOn, setPaidOn] = useState(todayIso);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const requestKeyRef = useRef<string>(generatePaymentRequestKey());

  const check = validatePaymentInput({
    amountText,
    paidOn,
    todayIso,
    outstanding: bill.outstanding,
  });

  const handleNext = () => {
    if (!check.valid) {
      setLocalError(check.error);
      return;
    }
    setLocalError(null);
    setConfirming(true);
  };

  const handleConfirm = () => {
    if (busy || !check.valid) return;
    onSubmit({
      requestKey: requestKeyRef.current,
      amount: check.amount.toString(),
      paidOn,
      method,
      note: note.trim() ? note.trim() : null,
    });
  };

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (busy) return;
        if (confirming) setConfirming(false);
        else onClose();
      }}
    >
      <View style={s.backdrop}>
        <Pressable
          style={s.backdropTap}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '90%' }]}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>
                  {confirming ? 'Xác nhận ghi nhận thanh toán' : 'Ghi nhận thanh toán'}
                </Text>
                <Text style={s.sheetSub}>
                  Phiếu {formatBillCode(bill.id)} · Phòng {bill.roomNumber} ·{' '}
                  {bill.tenantName || 'Người thuê'}
                </Text>
              </View>
              <AnimatedPressable
                accessibilityLabel="Đóng ghi nhận thanh toán"
                disabled={busy}
                style={s.closeBtn}
                onPress={onClose}
              >
                <Feather name="x" size={19} color={c.forestInk} />
              </AnimatedPressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 13, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {confirming ? (
                <View style={{ gap: 12 }}>
                  <View style={s.summaryBox}>
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Phòng / Phiếu</Text>
                      <Text style={s.kvVal}>
                        P.{bill.roomNumber} · {formatBillCode(bill.id)}
                      </Text>
                    </View>
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Số tiền ghi nhận</Text>
                      <Text style={[s.kvVal, { color: c.primary, fontSize: 16 }]}>
                        {formatBillMoney(check.amount)}
                      </Text>
                    </View>
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Phương thức</Text>
                      <Text style={s.kvVal}>{PAYMENT_METHOD_LABELS[method]}</Text>
                    </View>
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Ngày thanh toán</Text>
                      <Text style={s.kvVal}>{formatIsoDateShort(paidOn)}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Dư nợ dự kiến còn lại</Text>
                      <Text style={s.kvVal}>{formatBillMoney(check.remainingAfter)}</Text>
                    </View>
                  </View>

                  {method === 'TRANSFER' ? (
                    <View style={s.noteBox}>
                      <Feather name="info" size={15} color={c.primary} />
                      <Text style={s.noteText}>
                        Giao dịch chuyển khoản này được lưu theo xác nhận thủ công của chủ trọ,
                        không phải đối soát ngân hàng tự động.
                      </Text>
                    </View>
                  ) : null}

                  <InlineError message={error} />
                </View>
              ) : (
                <>
                  {/* Current Debt Strip */}
                  <View style={s.debtBanner}>
                    <Text style={s.debtLbl}>Công nợ còn thiếu hiện tại</Text>
                    <Text style={s.debtVal}>{formatBillMoney(bill.outstanding)}</Text>
                  </View>

                  {/* Amount Input + Quick Fill Full Remaining */}
                  <View style={{ gap: 6 }}>
                    <View style={s.rowBetween}>
                      <Text style={s.fieldLbl}>Số tiền thực nhận (đ) *</Text>
                      <AnimatedPressable
                        scaleTo={0.97}
                        onPress={() => {
                          setAmountText(formatVndInput(bill.outstanding));
                          setLocalError(null);
                        }}
                      >
                        <Text style={s.quickFillLink}>Điền đủ số còn thiếu</Text>
                      </AnimatedPressable>
                    </View>
                    <TextInput
                      style={[s.input, Boolean(localError) && s.inputErr]}
                      value={amountText}
                      onChangeText={val => {
                        setAmountText(formatVndInput(val.replace(/[^\d.,\s]/g, '')));
                        setLocalError(null);
                      }}
                      placeholder="Nhập số tiền VND"
                      placeholderTextColor={c.textMuted}
                      keyboardType="number-pad"
                      editable={!busy}
                    />
                    <Text style={s.helperText}>
                      Dư nợ dự kiến sau thanh toán:{' '}
                      <Text style={{ fontWeight: '700', color: c.forestInk }}>
                        {formatBillMoney(check.remainingAfter)}
                      </Text>
                    </Text>
                  </View>

                  {/* Payment Method */}
                  <View style={{ gap: 7 }}>
                    <Text style={s.fieldLbl}>Phương thức thanh toán</Text>
                    <View style={s.methodRow}>
                      {(['CASH', 'TRANSFER', 'OTHER'] as const).map(m => {
                        const active = method === m;
                        return (
                          <AnimatedPressable
                            key={m}
                            scaleTo={0.97}
                            style={[s.methodPill, active && s.methodPillActive]}
                            onPress={() => setMethod(m)}
                          >
                            <Text style={[s.methodPillText, active && { color: '#FFFFFF' }]}>
                              {PAYMENT_METHOD_LABELS[m]}
                            </Text>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                    {method === 'TRANSFER' ? (
                      <Text style={s.helperText}>
                        Chủ trọ tự xác nhận đã nhận tiền chuyển khoản (chưa có đối soát ngân hàng tự
                        động).
                      </Text>
                    ) : null}
                  </View>

                  {/* Payment Date (Date-only <= today) */}
                  <View style={{ gap: 6 }}>
                    <Text style={s.fieldLbl}>Ngày thanh toán</Text>
                    <View style={s.dateStepperRow}>
                      <AnimatedPressable
                        style={s.dateStepBtn}
                        accessibilityLabel="Lùi 1 ngày"
                        onPress={() => {
                          setPaidOn(prev => shiftIsoDate(prev, -1));
                          setLocalError(null);
                        }}
                      >
                        <Feather name="chevron-left" size={17} color={c.forestInk} />
                      </AnimatedPressable>
                      <TextInput
                        style={[s.input, { flex: 1, textAlign: 'center' }]}
                        value={paidOn}
                        onChangeText={val => {
                          setPaidOn(val.replace(/[^0-9-]/g, '').slice(0, 10));
                          setLocalError(null);
                        }}
                        placeholder="YYYY-MM-DD"
                        maxLength={10}
                        editable={!busy}
                      />
                      <AnimatedPressable
                        disabled={paidOn >= todayIso}
                        style={[s.dateStepBtn, paidOn >= todayIso && { opacity: 0.4 }]}
                        accessibilityLabel="Tăng 1 ngày"
                        onPress={() => {
                          const next = shiftIsoDate(paidOn, 1);
                          if (next <= todayIso) setPaidOn(next);
                          setLocalError(null);
                        }}
                      >
                        <Feather name="chevron-right" size={17} color={c.forestInk} />
                      </AnimatedPressable>
                    </View>
                  </View>

                  {/* Optional Note / Transaction Ref */}
                  <View style={{ gap: 6 }}>
                    <Text style={s.fieldLbl}>Ghi chú / mã tham chiếu (tùy chọn)</Text>
                    <TextInput
                      style={s.textArea}
                      multiline
                      textAlignVertical="top"
                      value={note}
                      onChangeText={setNote}
                      placeholder="Ví dụ: Mã giao dịch ngân hàng hoặc ghi chú người nộp..."
                      placeholderTextColor={c.textMuted}
                      maxLength={400}
                      editable={!busy}
                    />
                  </View>

                  <InlineError message={localError || error} />
                </>
              )}
            </ScrollView>

            <View style={s.footerRow}>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={s.secondaryBtn}
                onPress={() => {
                  if (confirming) setConfirming(false);
                  else onClose();
                }}
              >
                <Text style={s.secondaryBtnText}>{confirming ? 'Quay lại' : 'Đóng'}</Text>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy || !check.valid}
                style={[s.primaryBtn, (busy || !check.valid) && { opacity: 0.5 }]}
                onPress={confirming ? handleConfirm : handleNext}
              >
                {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text style={s.primaryBtnText}>
                  {busy
                    ? 'Đang ghi nhận…'
                    : confirming
                      ? 'Xác nhận ghi nhận'
                      : 'Tiếp tục xác nhận'}
                </Text>
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Create / Edit Bill Draft & Supplemental Utilities Sheet                 */
/* -------------------------------------------------------------------------- */

export function BillingDraftSheet({
  visible,
  propertyId,
  propertyName,
  month,
  candidate,
  kind,
  bill,
  busy,
  error,
  onClose,
  onSaveDraft,
  onSaveAndIssue,
}: {
  visible: boolean;
  propertyId: number;
  propertyName: string;
  month: string;
  candidate: BillingCandidate | null;
  kind: BillKind;
  bill: BillingBill | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSaveDraft: (payload: BillingDraftPayload) => void;
  onSaveAndIssue: (payload: BillingDraftPayload) => void;
}) {
  if (!visible || !candidate) return null;
  return (
    <BillingDraftContent
      propertyId={propertyId}
      propertyName={propertyName}
      month={month}
      candidate={candidate}
      kind={kind}
      bill={bill}
      busy={busy}
      error={error}
      onClose={onClose}
      onSaveDraft={onSaveDraft}
      onSaveAndIssue={onSaveAndIssue}
    />
  );
}

function BillingDraftContent({
  propertyId,
  propertyName,
  month,
  candidate,
  kind,
  bill,
  busy,
  error,
  onClose,
  onSaveDraft,
  onSaveAndIssue,
}: {
  propertyId: number;
  propertyName: string;
  month: string;
  candidate: BillingCandidate;
  kind: BillKind;
  bill: BillingBill | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSaveDraft: (payload: BillingDraftPayload) => void;
  onSaveAndIssue: (payload: BillingDraftPayload) => void;
}) {
  const reduced = useReducedMotionPreference();
  const isSupplemental = kind === 'UTILITIES';
  const utilities = candidate.utilities;
  const utilitiesBlocked = Boolean(candidate.utilitiesAlreadyBilled && !bill?.includesUtilities);

  const [dueDate, setDueDate] = useState(
    () => bill?.dueDate || (isSupplemental ? candidate.utilityDueDate : candidate.dueDate) || ''
  );
  const [rentText, setRentText] = useState(() =>
    isSupplemental ? '0' : formatVndInput(bill?.rentAmount ?? candidate.rent?.amount ?? '0')
  );
  const [includeUtilities, setIncludeUtilities] = useState(() =>
    isSupplemental
      ? true
      : bill
        ? Boolean(bill.includesUtilities)
        : Boolean(utilities && !utilitiesBlocked)
  );
  const [charges, setCharges] = useState<{ key: number; label: string; amount: string }[]>(() => {
    const source = isSupplemental ? [] : bill?.charges ?? candidate.suggestedCharges ?? [];
    return source.map((item, idx) => ({
      key: idx + 1,
      label: item.label || '',
      amount: formatVndInput(item.amount),
    }));
  });
  const [showMeterDetail, setShowMeterDetail] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const nextChargeKey = useRef(charges.length + 1);

  const validation = validateDraftInput({
    kind,
    dueDate,
    rentText,
    includeUtilities,
    utilities,
    utilitiesBlockedByOtherBill: utilitiesBlocked,
    charges,
  });

  const utilitiesSum = utilities
    ? vndValue(utilities.electricityAmount) + vndValue(utilities.waterAmount)
    : 0n;

  const canIssueDirectly = Boolean(
    !candidate.issue &&
      validation.valid &&
      (isSupplemental || candidate.schedule || vndValue(validation.rentAmount) === 0n)
  );

  const buildPayload = (): BillingDraftPayload | null => {
    if (!validation.valid) {
      setLocalError(validation.error);
      return null;
    }
    setLocalError(null);
    return {
      period: {
        propertyId,
        roomId: candidate.roomId,
        tenancyKey: candidate.tenancyKey,
        month,
      },
      kind,
      revision: bill?.revision ?? null,
      dueDate,
      rentAmount: validation.rentAmount,
      includeUtilities,
      charges: validation.cleanCharges,
    };
  };

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (busy) return;
        if (confirmIssue) setConfirmIssue(false);
        else onClose();
      }}
    >
      <View style={s.backdrop}>
        <Pressable
          style={s.backdropTap}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '90%' }]}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>
                  {confirmIssue
                    ? 'Xác nhận phát hành phiếu'
                    : isSupplemental
                      ? 'Lập phiếu điện nước bổ sung'
                      : bill
                        ? 'Chỉnh sửa bản nháp phiếu thu'
                        : 'Lập phiếu thu chính'}
                </Text>
                <Text style={s.sheetSub}>
                  {propertyName} · P.{candidate.roomNumber} · Kỳ {formatBillingMonthShort(month)}
                </Text>
              </View>
              <AnimatedPressable
                accessibilityLabel="Đóng lập phiếu"
                disabled={busy}
                style={s.closeBtn}
                onPress={onClose}
              >
                <Feather name="x" size={19} color={c.forestInk} />
              </AnimatedPressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 13, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {confirmIssue ? (
                <View style={{ gap: 12 }}>
                  <View style={s.noteBox}>
                    <Feather name="send" size={15} color={c.primary} />
                    <Text style={s.noteText}>
                      Phát hành phiếu sẽ chốt các khoản thu và đưa vào công nợ. Phát hành không tự
                      đánh dấu là đã thanh toán.
                    </Text>
                  </View>
                  <View style={s.summaryBox}>
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Loại phiếu</Text>
                      <Text style={s.kvVal}>
                        {isSupplemental ? 'Điện nước bổ sung' : 'Phiếu thu chính'}
                      </Text>
                    </View>
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Hạn thanh toán</Text>
                      <Text style={s.kvVal}>{formatIsoDateShort(dueDate)}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.kvRow}>
                      <Text style={s.kvLbl}>Tổng phải thu</Text>
                      <Text style={[s.kvVal, { color: c.primary, fontSize: 16 }]}>
                        {formatBillMoney(validation.totalAmount)}
                      </Text>
                    </View>
                  </View>
                  <InlineError message={error} />
                </View>
              ) : (
                <>
                  {/* Due Date */}
                  <View style={{ gap: 6 }}>
                    <Text style={s.fieldLbl}>Hạn thanh toán (YYYY-MM-DD) *</Text>
                    <TextInput
                      style={s.input}
                      value={dueDate}
                      onChangeText={val => {
                        setDueDate(val.replace(/[^0-9-]/g, '').slice(0, 10));
                        setLocalError(null);
                      }}
                      placeholder="YYYY-MM-DD"
                      maxLength={10}
                      editable={!busy}
                    />
                  </View>

                  {/* Rent Amount (Main bill only) */}
                  {!isSupplemental ? (
                    <View style={{ gap: 6 }}>
                      <Text style={s.fieldLbl}>
                        Tiền phòng kỳ này (đ)
                        {candidate.rent
                          ? ` · ${formatIsoDateShort(candidate.rent.from)} – ${formatIsoDateShort(candidate.rent.through)}`
                          : ''}
                      </Text>
                      <TextInput
                        style={s.input}
                        value={rentText}
                        onChangeText={val => {
                          setRentText(formatVndInput(val.replace(/[^\d.,\s]/g, '')));
                          setLocalError(null);
                        }}
                        keyboardType="number-pad"
                        placeholder="0"
                        editable={!busy && Boolean(candidate.rent)}
                      />
                      {!candidate.rent ? (
                        <Text style={s.helperText}>
                          Kỳ này chưa đến lượt thu tiền phòng theo chu kỳ đã thiết lập.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Finalized Utilities Block (Anti-Duplicate Protected) */}
                  <View style={s.summaryBox}>
                    <View style={s.rowBetween}>
                      <Text style={s.sectionLbl}>Điện nước đã chốt kỳ {formatBillingMonthShort(month)}</Text>
                      {!isSupplemental && utilities && !utilitiesBlocked ? (
                        <AnimatedPressable
                          scaleTo={0.97}
                          style={[s.togglePill, includeUtilities && s.togglePillActive]}
                          onPress={() => setIncludeUtilities(v => !v)}
                        >
                          <Text style={[s.togglePillText, includeUtilities && { color: '#FFFFFF' }]}>
                            {includeUtilities ? 'Đang gộp' : 'Không gộp'}
                          </Text>
                        </AnimatedPressable>
                      ) : null}
                    </View>

                    {utilitiesBlocked ? (
                      <Text style={s.blockedText}>
                        Khoản điện nước kỳ này đã được tính ở một phiếu khác — hệ thống khóa để
                        chống tính trùng.
                      </Text>
                    ) : !utilities ? (
                      <Text style={s.helperText}>
                        Chưa có chỉ số điện nước đã chốt trong mục Ghi điện nước.
                      </Text>
                    ) : (
                      <>
                        <View style={s.kvRow}>
                          <Text style={s.kvLbl}>Tiền điện (đã chốt)</Text>
                          <Text style={s.kvVal}>{formatBillMoney(utilities.electricityAmount)}</Text>
                        </View>
                        <View style={s.kvRow}>
                          <Text style={s.kvLbl}>Tiền nước (đã chốt)</Text>
                          <Text style={s.kvVal}>{formatBillMoney(utilities.waterAmount)}</Text>
                        </View>
                        <View style={s.kvRow}>
                          <Text style={[s.kvLbl, { fontWeight: '700', color: c.forestInk }]}>
                            Tổng điện nước
                          </Text>
                          <Text style={[s.kvVal, { color: c.primary }]}>
                            {formatBillMoney(utilitiesSum)}
                          </Text>
                        </View>

                        <AnimatedPressable
                          onPress={() => setShowMeterDetail(v => !v)}
                          style={{ paddingVertical: 2 }}
                        >
                          <Text style={s.quickFillLink}>
                            {showMeterDetail ? 'Ẩn chi tiết chỉ số' : 'Xem chi tiết chỉ số đã chốt'}
                          </Text>
                        </AnimatedPressable>

                        {showMeterDetail ? (
                          <View style={s.meterReadOnlyBox}>
                            <Text style={s.helperText}>
                              Ngày chốt: {formatIsoDateShort(utilities.readOn)}
                            </Text>
                            <Text style={s.helperText}>
                              Điện: {utilities.electricityStart ?? '—'} →{' '}
                              {utilities.electricityEnd ?? '—'} kWh (đơn giá{' '}
                              {formatBillMoney(utilities.electricityRate)})
                            </Text>
                            <Text style={s.helperText}>
                              Nước ({utilities.waterMode || 'METER'}):{' '}
                              {utilities.waterMode === 'METER'
                                ? `${utilities.waterStart ?? '—'} → ${utilities.waterEnd ?? '—'} m³`
                                : utilities.waterMode === 'PER_PERSON'
                                  ? `${utilities.occupantCount ?? '—'} người`
                                  : 'Cố định'}{' '}
                              (đơn giá {formatBillMoney(utilities.waterRate)})
                            </Text>
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>

                  {/* Extra Charges (Main bill only) */}
                  {!isSupplemental ? (
                    <View style={{ gap: 8 }}>
                      <View style={s.rowBetween}>
                        <Text style={s.fieldLbl}>Khoản phí khác ({charges.length}/20)</Text>
                        {charges.length < 20 ? (
                          <AnimatedPressable
                            onPress={() =>
                              setCharges(prev => [
                                ...prev,
                                { key: nextChargeKey.current++, label: '', amount: '' },
                              ])
                            }
                          >
                            <Text style={s.quickFillLink}>+ Thêm khoản phí</Text>
                          </AnimatedPressable>
                        ) : null}
                      </View>
                      {charges.map(item => (
                        <View key={item.key} style={s.chargeEditRow}>
                          <TextInput
                            style={[s.input, { flex: 1.3 }]}
                            value={item.label}
                            onChangeText={val =>
                              setCharges(prev =>
                                prev.map(row => (row.key === item.key ? { ...row, label: val } : row))
                              )
                            }
                            placeholder="Tên phí (VD: Internet)"
                            placeholderTextColor={c.textMuted}
                            maxLength={100}
                            editable={!busy}
                          />
                          <TextInput
                            style={[s.input, { flex: 1 }]}
                            value={item.amount}
                            onChangeText={val =>
                              setCharges(prev =>
                                prev.map(row =>
                                  row.key === item.key
                                    ? { ...row, amount: formatVndInput(val.replace(/[^\d.,\s]/g, '')) }
                                    : row
                                )
                              )
                            }
                            placeholder="Số tiền"
                            placeholderTextColor={c.textMuted}
                            keyboardType="number-pad"
                            editable={!busy}
                          />
                          <AnimatedPressable
                            accessibilityLabel="Xóa khoản phí"
                            style={s.removeChargeBtn}
                            onPress={() =>
                              setCharges(prev => prev.filter(row => row.key !== item.key))
                            }
                          >
                            <Feather name="trash-2" size={16} color={c.error} />
                          </AnimatedPressable>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Total Summary */}
                  <View style={s.debtBanner}>
                    <Text style={s.debtLbl}>Tổng phải thu</Text>
                    <Text style={[s.debtVal, { color: c.primary }]}>
                      {formatBillMoney(validation.totalAmount)}
                    </Text>
                  </View>

                  <InlineError message={localError || error} />
                </>
              )}
            </ScrollView>

            <View style={s.footerRow}>
              {confirmIssue ? (
                <>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy}
                    style={s.secondaryBtn}
                    onPress={() => setConfirmIssue(false)}
                  >
                    <Text style={s.secondaryBtnText}>Quay lại</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy}
                    style={[s.primaryBtn, busy && { opacity: 0.6 }]}
                    onPress={() => {
                      const payload = buildPayload();
                      if (payload) onSaveAndIssue(payload);
                    }}
                  >
                    {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                    <Text style={s.primaryBtnText}>
                      {busy ? 'Đang phát hành…' : 'Xác nhận phát hành'}
                    </Text>
                  </AnimatedPressable>
                </>
              ) : (
                <>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy}
                    style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
                    onPress={() => {
                      const payload = buildPayload();
                      if (payload) onSaveDraft(payload);
                    }}
                  >
                    <Text style={s.secondaryBtnText}>Lưu bản nháp</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.98}
                    disabled={busy || !canIssueDirectly}
                    style={[s.primaryBtn, (busy || !canIssueDirectly) && { opacity: 0.5 }]}
                    onPress={() => {
                      const payload = buildPayload();
                      if (payload) setConfirmIssue(true);
                    }}
                  >
                    <Text style={s.primaryBtnText}>Phát hành phiếu</Text>
                  </AnimatedPressable>
                </>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Billing Cycle Schedule Sheet                                             */
/* -------------------------------------------------------------------------- */

export function BillingScheduleSheet({
  visible,
  propertyId,
  month,
  candidate,
  busy,
  error,
  onClose,
  onSave,
}: {
  visible: boolean;
  propertyId: number;
  month: string;
  candidate: BillingCandidate | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: BillingSchedulePayload) => void;
}) {
  if (!visible || !candidate) return null;
  return (
    <BillingScheduleContent
      propertyId={propertyId}
      month={month}
      candidate={candidate}
      busy={busy}
      error={error}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function BillingScheduleContent({
  propertyId,
  month,
  candidate,
  busy,
  error,
  onClose,
  onSave,
}: {
  propertyId: number;
  month: string;
  candidate: BillingCandidate;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: BillingSchedulePayload) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [cycleMonths, setCycleMonths] = useState(candidate.schedule?.cycleMonths || 1);
  const [dueDayText, setDueDayText] = useState(String(candidate.schedule?.dueDay || 5));
  const [firstDueDate, setFirstDueDate] = useState(
    candidate.schedule?.firstDueDate || candidate.dueDate || candidate.startDate || ''
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const dueDayNum = Number(dueDayText);
  const monthEndNote = describeDueDayRule(dueDayNum);

  const handleSave = () => {
    const err = validateScheduleInput({
      cycleMonths,
      dueDay: dueDayNum,
      firstDueDate,
    });
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    onSave({
      period: {
        propertyId,
        roomId: candidate.roomId,
        tenancyKey: candidate.tenancyKey,
        month,
      },
      cycleMonths,
      dueDay: dueDayNum,
      firstDueDate,
    });
  };

  return (
    <Modal
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={s.backdrop}>
        <Pressable
          style={s.backdropTap}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '88%' }]}>
            <View style={s.handle} />
            <View style={s.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Thiết lập chu kỳ thu tiền</Text>
                <Text style={s.sheetSub}>
                  Phòng {candidate.roomNumber} · {candidate.tenantName || 'Người thuê'}
                </Text>
              </View>
              <AnimatedPressable
                accessibilityLabel="Đóng thiết lập chu kỳ"
                disabled={busy}
                style={s.closeBtn}
                onPress={onClose}
              >
                <Feather name="x" size={19} color={c.forestInk} />
              </AnimatedPressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 14, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={s.noteBox}>
                <Feather name="calendar" size={15} color={c.primary} />
                <Text style={s.noteText}>
                  Đợt thuê bắt đầu từ {formatIsoDateShort(candidate.startDate)}. Lưu chu kỳ chỉ áp
                  dụng lịch thu cho đợt thuê này — không tự phát hành phiếu hay ghi nhận thanh toán.
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={s.fieldLbl}>Chu kỳ thu tiền ({describeCycle(cycleMonths)})</Text>
                <View style={s.chipWrap}>
                  {[1, 2, 3, 6, 12].map(m => {
                    const active = cycleMonths === m;
                    return (
                      <AnimatedPressable
                        key={m}
                        scaleTo={0.97}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setCycleMonths(m)}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>
                          {describeCycle(m)}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={s.fieldLbl}>Ngày thu dự định hằng kỳ (1–31) *</Text>
                <TextInput
                  style={s.input}
                  value={dueDayText}
                  onChangeText={val => {
                    setDueDayText(val.replace(/\D/g, '').slice(0, 2));
                    setLocalError(null);
                  }}
                  keyboardType="number-pad"
                  placeholder="Ví dụ: 5"
                  editable={!busy}
                />
                {monthEndNote ? <Text style={s.helperText}>{monthEndNote}</Text> : null}
              </View>

              <View style={{ gap: 6 }}>
                <Text style={s.fieldLbl}>Hạn thanh toán lần đầu (YYYY-MM-DD) *</Text>
                <TextInput
                  style={s.input}
                  value={firstDueDate}
                  onChangeText={val => {
                    setFirstDueDate(val.replace(/[^0-9-]/g, '').slice(0, 10));
                    setLocalError(null);
                  }}
                  placeholder="YYYY-MM-DD"
                  maxLength={10}
                  editable={!busy}
                />
                <Text style={s.helperText}>
                  Các kỳ sau sẽ nối tiếp từ hạn thanh toán lần đầu theo đúng chu kỳ đã chọn và tự
                  khóa chu kỳ sau khi phát hành phiếu chính đầu tiên.
                </Text>
              </View>

              <InlineError message={localError || error} />
            </ScrollView>

            <View style={s.footerRow}>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={s.secondaryBtn}
                onPress={onClose}
              >
                <Text style={s.secondaryBtnText}>Hủy</Text>
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={[s.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={handleSave}
              >
                {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text style={s.primaryBtnText}>
                  {busy ? 'Đang lưu chu kỳ…' : 'Lưu chu kỳ'}
                </Text>
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  sectionLbl: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  fieldLbl: {
    fontSize: 13,
    fontWeight: '600',
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
  debtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 13,
    backgroundColor: c.softMint,
  },
  debtLbl: {
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  debtVal: {
    fontSize: 17,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickFillLink: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  inputErr: {
    borderColor: c.error,
  },
  textArea: {
    minHeight: 74,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 11,
    fontSize: 14,
    color: c.forestInk,
  },
  helperText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  blockedText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#92400E',
    fontWeight: '600',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodPillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  methodPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  dateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateStepBtn: {
    width: 44,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBox: {
    backgroundColor: c.background,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kvLbl: {
    fontSize: 13,
    color: c.textSecondary,
  },
  kvVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: c.softMint,
  },
  noteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.forestInk,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  togglePillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.forestInk,
  },
  meterReadOnlyBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  chargeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeChargeBtn: {
    width: 38,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
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
});
