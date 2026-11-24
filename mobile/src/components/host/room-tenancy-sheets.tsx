import { useEffect, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import { tokenStore } from '@/services/auth';
import type { HostRoom } from '@/services/host';
import { formatMoneyVnd } from '@/services/host-room-types';
import { fetchBillingLedger } from '@/services/room-billing-api';
import { formatContractIsoDate } from '@/services/rental-contracts';
import {
  defaultOccupantJoinDate,
  earliestTenancyCloseDate,
  summarizeRoomOutstandingDebt,
  validateAddOccupantInput,
  validateCloseTenancyDate,
  validateOccupantLeaveDate,
  validateStartTenancyInput,
  type RoomOccupant,
  type RoomTenancy,
  type RoomTenancyDebtSummary,
} from '@/services/room-tenancy';
import { addMonthsIso } from '@/services/contract-wizard';
import { DateFieldButton, IsoDatePickerSheet } from './date-picker-sheet';

/* -------------------------------------------------------------------------- */
/* 1. Start / Backfill Tenancy Sheet                                           */
/* -------------------------------------------------------------------------- */

export function TenancyStartSheet({
  visible,
  room,
  today,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  room: HostRoom;
  today: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    phone: string;
    startDate: string;
    endDate: string;
  }) => void;
}) {
  if (!visible) return null;
  return (
    <TenancyStartContent
      room={room}
      today={today}
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function TenancyStartContent({
  room,
  today,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  room: HostRoom;
  today: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    phone: string;
    startDate: string;
    endDate: string;
  }) => void;
}) {
  const reduced = useReducedMotionPreference();
  const isOccupied = room.status === 'OCCUPIED';
  const defaultStart = room.leaseStartDate || today;
  const defaultEnd = room.leaseEndDate || addMonthsIso(defaultStart, 12);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleSubmit = () => {
    const errs = validateStartTenancyInput({ name, phone, startDate, endDate });
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      startDate,
      endDate,
    });
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle}>
                {isOccupied ? 'Bổ sung hồ sơ đợt thuê' : 'Tạo đợt thuê mới'}
              </Text>
              <Text style={s.sheetSub}>Phòng {room.roomNumber}</Text>
            </View>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng"
              style={s.closeBtn}
              onPress={handleClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.field}>
              <Text style={s.label}>
                Họ và tên người thuê chính <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={v => {
                  setName(v);
                  if (fieldErrors.name) setFieldErrors(e => ({ ...e, name: '' }));
                }}
                editable={!busy}
                maxLength={150}
                placeholder="VD: Nguyễn Văn An"
                placeholderTextColor={c.placeholder}
                style={[s.input, Boolean(fieldErrors.name) && s.inputErr]}
              />
              {fieldErrors.name ? <Text style={s.errText}>{fieldErrors.name}</Text> : null}
            </View>

            <View style={s.field}>
              <Text style={s.label}>
                Số điện thoại <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                value={phone}
                onChangeText={v => {
                  setPhone(v);
                  if (fieldErrors.phone) setFieldErrors(e => ({ ...e, phone: '' }));
                }}
                editable={!busy}
                keyboardType="phone-pad"
                maxLength={20}
                placeholder="VD: 0912345678"
                placeholderTextColor={c.placeholder}
                style={[s.input, Boolean(fieldErrors.phone) && s.inputErr]}
              />
              {fieldErrors.phone ? <Text style={s.errText}>{fieldErrors.phone}</Text> : null}
            </View>

            <DateFieldButton
              label="Ngày bắt đầu thuê"
              required
              value={startDate}
              disabled={busy}
              error={fieldErrors.startDate}
              onPress={() => setPickerTarget('start')}
            />

            <DateFieldButton
              label="Ngày dự kiến kết thúc"
              required
              value={endDate}
              disabled={busy}
              error={fieldErrors.endDate}
              onPress={() => setPickerTarget('end')}
            />

            <InlineError message={error} />
          </ScrollView>

          <View style={s.footer}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={s.secondaryBtn}
              onPress={handleClose}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <View style={{ flex: 1.4 }}>
              <PrimaryButton
                title={busy ? 'Đang lưu…' : 'Lưu hồ sơ thuê'}
                loading={busy}
                disabled={busy}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <IsoDatePickerSheet
        visible={pickerTarget !== null}
        title={pickerTarget === 'start' ? 'Chọn ngày bắt đầu thuê' : 'Chọn ngày dự kiến kết thúc'}
        value={pickerTarget === 'start' ? startDate : endDate}
        minDate={pickerTarget === 'end' ? startDate : undefined}
        onClose={() => setPickerTarget(null)}
        onSelect={iso => {
          if (pickerTarget === 'start') {
            setStartDate(iso);
            if (fieldErrors.startDate) setFieldErrors(e => ({ ...e, startDate: '' }));
          } else {
            setEndDate(iso);
            if (fieldErrors.endDate) setFieldErrors(e => ({ ...e, endDate: '' }));
          }
        }}
      />
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Add Co-Occupant Sheet                                                    */
/* -------------------------------------------------------------------------- */

export function TenancyAddOccupantSheet({
  visible,
  lease,
  today,
  hasActiveContract,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  lease: RoomTenancy | null;
  today: string;
  hasActiveContract: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; phone: string | null; joinedOn: string }) => void;
}) {
  if (!visible || !lease) return null;
  return (
    <TenancyAddOccupantContent
      lease={lease}
      today={today}
      hasActiveContract={hasActiveContract}
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function TenancyAddOccupantContent({
  lease,
  today,
  hasActiveContract,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  lease: RoomTenancy;
  today: string;
  hasActiveContract: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; phone: string | null; joinedOn: string }) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [joinedOn, setJoinedOn] = useState(() => defaultOccupantJoinDate(today, lease));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleSubmit = () => {
    const errs = validateAddOccupantInput({ name, phone, joinedOn }, lease);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim() || null,
      joinedOn,
    });
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle}>Thêm người ở cùng</Text>
              <Text style={s.sheetSub}>
                Kỳ thuê {formatContractIsoDate(lease.startDate)} –{' '}
                {formatContractIsoDate(lease.endDate)}
              </Text>
            </View>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng"
              style={s.closeBtn}
              onPress={handleClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.field}>
              <Text style={s.label}>
                Họ và tên người ở cùng <Text style={s.req}>*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={v => {
                  setName(v);
                  if (fieldErrors.name) setFieldErrors(e => ({ ...e, name: '' }));
                }}
                editable={!busy}
                maxLength={150}
                placeholder="VD: Trần Minh Anh"
                placeholderTextColor={c.placeholder}
                style={[s.input, Boolean(fieldErrors.name) && s.inputErr]}
              />
              {fieldErrors.name ? <Text style={s.errText}>{fieldErrors.name}</Text> : null}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Số điện thoại (tùy chọn)</Text>
              <TextInput
                value={phone}
                onChangeText={v => {
                  setPhone(v);
                  if (fieldErrors.phone) setFieldErrors(e => ({ ...e, phone: '' }));
                }}
                editable={!busy}
                keyboardType="phone-pad"
                maxLength={20}
                placeholder="VD: 0987654321"
                placeholderTextColor={c.placeholder}
                style={[s.input, Boolean(fieldErrors.phone) && s.inputErr]}
              />
              {fieldErrors.phone ? <Text style={s.errText}>{fieldErrors.phone}</Text> : null}
            </View>

            <DateFieldButton
              label="Ngày chuyển vào"
              required
              value={joinedOn}
              disabled={busy}
              error={fieldErrors.joinedOn}
              helper={`Trong khoảng ${formatContractIsoDate(lease.startDate)} – ${formatContractIsoDate(
                lease.endDate
              )}`}
              onPress={() => setPickerOpen(true)}
            />

            <View style={s.infoNotice}>
              <Feather name="info" size={14} color={c.primary} style={{ marginTop: 2 }} />
              <Text style={s.infoNoticeText}>
                {hasActiveContract
                  ? 'Chỉ ghi nhận nhân khẩu trong hồ sơ đợt thuê; không tạo tài khoản mới, không thay đổi người thuê chính và không tự sửa nội dung hợp đồng đã lập.'
                  : 'Chỉ ghi nhận người ở cùng vào hồ sơ đợt thuê hiện tại; không tạo tài khoản mới và giữ nguyên người thuê chính.'}
              </Text>
            </View>

            <InlineError message={error} />
          </ScrollView>

          <View style={s.footer}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={s.secondaryBtn}
              onPress={handleClose}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <View style={{ flex: 1.4 }}>
              <PrimaryButton
                title={busy ? 'Đang lưu…' : 'Lưu người ở cùng'}
                loading={busy}
                disabled={busy}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <IsoDatePickerSheet
        visible={pickerOpen}
        title="Chọn ngày chuyển vào"
        value={joinedOn}
        minDate={lease.startDate}
        maxDate={lease.endDate}
        onClose={() => setPickerOpen(false)}
        onSelect={iso => {
          setJoinedOn(iso);
          if (fieldErrors.joinedOn) setFieldErrors(e => ({ ...e, joinedOn: '' }));
        }}
      />
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Mark Co-Occupant Left Sheet                                              */
/* -------------------------------------------------------------------------- */

export function TenancyLeaveOccupantSheet({
  person,
  today,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  person: RoomOccupant | null;
  today: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (date: string) => void;
}) {
  if (!person) return null;
  return (
    <TenancyLeaveOccupantContent
      person={person}
      today={today}
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function TenancyLeaveOccupantContent({
  person,
  today,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  person: RoomOccupant;
  today: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (date: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [date, setDate] = useState(() => (today >= person.joinedOn ? today : person.joinedOn));
  const [dateError, setDateError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleConfirm = () => {
    const err = validateOccupantLeaveDate(date, person, today);
    setDateError(err);
    if (err) return;
    onSubmit(date);
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={handleClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle}>Ghi nhận rời phòng</Text>
              <Text style={s.sheetSub}>{person.name}</Text>
            </View>
            <AnimatedPressable disabled={busy} style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={{ gap: 14, paddingBottom: 8 }}>
            <Text style={s.bodyText}>
              Lưu ngày rời phòng thực tế của <Text style={{ fontWeight: '700' }}>{person.name}</Text>{' '}
              trong hồ sơ đợt thuê hiện tại.
            </Text>

            <DateFieldButton
              label="Ngày rời phòng thực tế"
              required
              value={date}
              disabled={busy}
              error={dateError || undefined}
              helper={`Từ ${formatContractIsoDate(person.joinedOn)} đến ${formatContractIsoDate(today)}`}
              onPress={() => setPickerOpen(true)}
            />

            <InlineError message={error} />
          </View>

          <View style={s.footer}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={s.secondaryBtn}
              onPress={handleClose}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <View style={{ flex: 1.4 }}>
              <PrimaryButton
                title={busy ? 'Đang lưu…' : 'Xác nhận rời phòng'}
                loading={busy}
                disabled={busy}
                onPress={handleConfirm}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>

      <IsoDatePickerSheet
        visible={pickerOpen}
        title="Chọn ngày rời phòng"
        value={date}
        minDate={person.joinedOn}
        maxDate={today}
        onClose={() => setPickerOpen(false)}
        onSelect={iso => {
          setDate(iso);
          setDateError(null);
        }}
      />
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. End Tenancy Confirmation Sheet (Debt + Deposit + Date Check)             */
/* -------------------------------------------------------------------------- */

export function TenancyCloseSheet({
  visible,
  room,
  lease,
  today,
  busy,
  error,
  onClose,
  onOpenBilling,
  onConfirm,
}: {
  visible: boolean;
  room: HostRoom;
  lease: RoomTenancy | null;
  today: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onOpenBilling: () => void;
  onConfirm: (date: string) => void;
}) {
  if (!visible || !lease) return null;
  return (
    <TenancyCloseContent
      room={room}
      lease={lease}
      today={today}
      busy={busy}
      error={error}
      onClose={onClose}
      onOpenBilling={onOpenBilling}
      onConfirm={onConfirm}
    />
  );
}

function TenancyCloseContent({
  room,
  lease,
  today,
  busy,
  error,
  onClose,
  onOpenBilling,
  onConfirm,
}: {
  room: HostRoom;
  lease: RoomTenancy;
  today: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onOpenBilling: () => void;
  onConfirm: (date: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const earliest = earliestTenancyCloseDate(today, lease);
  const [date, setDate] = useState(today);
  const [dateError, setDateError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Check current room billing debt asynchronously (non-blocking)
  const [debtLoading, setDebtLoading] = useState(true);
  const [debtSummary, setDebtSummary] = useState<RoomTenancyDebtSummary | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const month = today.slice(0, 7);
    void (async () => {
      try {
        const token = await tokenStore.get();
        if (!active || !token) return;
        const ledger = await fetchBillingLedger(room.propertyId, month, token, controller.signal);
        if (!active) return;
        setDebtSummary(summarizeRoomOutstandingDebt(ledger, room.roomId));
      } catch {
        if (active) setDebtSummary(null);
      } finally {
        if (active) setDebtLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [room.propertyId, room.roomId, today]);

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleSubmit = () => {
    const err = validateCloseTenancyDate(date, lease, today);
    setDateError(err);
    if (err || !confirmed) return;
    onConfirm(date);
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={handleClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '88%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={s.warnHeaderLeft}>
              <View style={s.warnBadgeCircle}>
                <Feather name="log-out" size={18} color={c.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Kết thúc đợt thuê?</Text>
                <Text style={s.sheetSub}>Phòng {room.roomNumber}</Text>
              </View>
            </View>
            <AnimatedPressable disabled={busy} style={s.closeBtn} onPress={handleClose}>
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Obligations & Deposit Summary */}
            <View style={s.checkCard}>
              <View style={s.checkRow}>
                <Text style={s.checkLabel}>Tiền đặt cọc đợt thuê</Text>
                <Text style={s.checkValue}>{formatMoneyVnd(lease.deposit)}</Text>
              </View>
              <View style={s.checkRow}>
                <Text style={s.checkLabel}>Công nợ hiện tại</Text>
                {debtLoading ? (
                  <ActivityIndicator size="small" color={c.primary} />
                ) : debtSummary && debtSummary.totalOutstandingVnd > 0 ? (
                  <Text style={[s.checkValue, { color: c.error }]}>
                    {formatMoneyVnd(debtSummary.totalOutstandingVnd)} ({debtSummary.unpaidBillCount} phiếu)
                  </Text>
                ) : debtSummary ? (
                  <Text style={[s.checkValue, { color: c.primary }]}>Không có nợ tồn đọng</Text>
                ) : (
                  <Text style={s.checkMuted}>Kiểm tra tại mục Phiếu thu</Text>
                )}
              </View>
              <View style={[s.checkRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={s.checkLabel}>Hồ sơ & Hợp đồng</Text>
                <Text style={s.checkValue}>Được lưu vĩnh viễn trong lịch sử</Text>
              </View>
            </View>

            {/* Outstanding Debt Alert with Shortcut */}
            {debtSummary && debtSummary.totalOutstandingVnd > 0 && (
              <View style={s.debtWarnBox}>
                <Feather name="alert-triangle" size={16} color="#9A5B0A" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.debtWarnText}>
                    Phòng còn {debtSummary.unpaidBillCount} phiếu thu chưa tất toán (
                    {formatMoneyVnd(debtSummary.totalOutstandingVnd)}). Hãy đối soát tiền cọc và
                    công nợ trước khi hoàn tất bàn giao.
                  </Text>
                  <AnimatedPressable
                    disabled={busy}
                    style={s.debtLinkBtn}
                    onPress={() => {
                      onClose();
                      onOpenBilling();
                    }}
                  >
                    <Text style={s.debtLinkText}>Mở Phiếu thu & Công nợ →</Text>
                  </AnimatedPressable>
                </View>
              </View>
            )}

            <DateFieldButton
              label="Ngày trả phòng thực tế"
              required
              value={date}
              disabled={busy}
              error={dateError || undefined}
              helper={`Chọn từ ${formatContractIsoDate(earliest)} đến ${formatContractIsoDate(today)}`}
              onPress={() => setPickerOpen(true)}
            />

            <View style={s.infoNotice}>
              <Feather name="shield" size={14} color={c.primary} style={{ marginTop: 2 }} />
              <Text style={s.infoNoticeText}>
                Sau khi máy chủ xác nhận kết thúc, đợt thuê và hợp đồng liên kết sẽ chuyển sang
                Lịch sử đợt thuê (không bị xóa) và phòng trở về trạng thái Còn trống. Bạn có thể
                chốt chỉ số điện nước bàn giao ngay bước sau.
              </Text>
            </View>

            <AnimatedPressable
              scaleTo={0.99}
              disabled={busy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              style={s.consentRow}
              onPress={() => setConfirmed(v => !v)}
            >
              <View style={[s.checkbox, confirmed && s.checkboxActive]}>
                {confirmed && <Feather name="check" size={13} color="#FFFFFF" />}
              </View>
              <Text style={s.consentText}>
                Tôi đã kiểm tra ngày trả phòng, tình trạng công nợ và tiền đặt cọc để kết thúc đợt
                thuê này.
              </Text>
            </AnimatedPressable>

            <InlineError message={error} />
          </ScrollView>

          <View style={s.footer}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
              onPress={handleClose}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy || !confirmed}
              accessibilityState={{ disabled: busy || !confirmed, busy }}
              style={[s.dangerBtn, (busy || !confirmed) && { opacity: 0.48 }]}
              onPress={handleSubmit}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="log-out" size={15} color="#FFFFFF" />
              )}
              <Text style={s.dangerBtnText}>
                {busy ? 'Đang kết thúc…' : 'Xác nhận kết thúc'}
              </Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>

      <IsoDatePickerSheet
        visible={pickerOpen}
        title="Chọn ngày trả phòng thực tế"
        value={date}
        minDate={earliest}
        maxDate={today}
        onClose={() => setPickerOpen(false)}
        onSelect={iso => {
          setDate(iso);
          setDateError(null);
        }}
      />
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: authSpacing.xl,
    paddingTop: 10,
    paddingBottom: authSpacing.lg,
    maxHeight: '86%',
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
    gap: 10,
    marginBottom: 12,
  },
  warnHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warnBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  req: {
    color: c.error,
  },
  input: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 14,
    fontSize: 15,
    color: c.forestInk,
  },
  inputErr: {
    borderColor: c.error,
    borderWidth: 1.5,
  },
  errText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.error,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.forestInk,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 12,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.primaryDark,
  },
  checkCard: {
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  checkLabel: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '600',
  },
  checkValue: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'right',
    flexShrink: 1,
  },
  checkMuted: {
    fontSize: 12,
    color: c.textMuted,
  },
  debtWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF6E7',
    borderWidth: 1,
    borderColor: '#F5DCB0',
    borderRadius: authRadius.md,
    padding: 12,
  },
  debtWarnText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A4F07',
  },
  debtLinkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  debtLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.textMuted,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
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
  dangerBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
