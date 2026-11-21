import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import type { HostRoom } from '@/services/host';
import { formatMoneyVnd } from '@/services/host-room-types';
import {
  addMonthsIso,
  canDeleteRoom,
  formatIsoDateVi,
  roomConfirmationPresentation,
  roomRentalStatusMeta,
  selectDisplayContract,
  todayIsoVietnam,
  validateBulkLeaseDates,
  type RentalContractView,
} from '@/services/host-rooms';

/* -------------------------------------------------------------------------- */
/* 1. Header Overflow Menu Sheet (⋯) — Includes Delete Room                    */
/* -------------------------------------------------------------------------- */

export function RoomDetailMenuSheet({
  visible,
  room,
  canManage,
  onClose,
  onOpenRoomType,
  onRequestDelete,
}: {
  visible: boolean;
  room: HostRoom;
  canManage: boolean;
  onClose: () => void;
  onOpenRoomType: () => void;
  onRequestDelete: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  const deletion = canDeleteRoom(room, canManage);

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Tùy chọn phòng {room.roomNumber}</Text>
            <AnimatedPressable
              accessibilityLabel="Đóng menu tùy chọn"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={{ gap: 10, paddingBottom: 6 }}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.menuOption}
              accessibilityLabel={`Xem loại phòng ${room.roomType}`}
              onPress={() => {
                onClose();
                onOpenRoomType();
              }}
            >
              <View style={s.menuOptionIcon}>
                <Feather name="layers" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuOptionTitle}>Xem loại phòng liên kết</Text>
                <Text style={s.menuOptionSub} numberOfLines={1}>
                  {room.roomType || 'Chi tiết loại phòng & bảng giá'}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={!deletion.allowed}
              style={[
                s.menuOption,
                s.menuOptionDanger,
                !deletion.allowed && { opacity: 0.65 },
              ]}
              accessibilityLabel={`Xóa phòng ${room.roomNumber}`}
              accessibilityState={{ disabled: !deletion.allowed }}
              onPress={() => {
                if (!deletion.allowed) return;
                onClose();
                onRequestDelete();
              }}
            >
              <View style={[s.menuOptionIcon, { backgroundColor: '#FDECEC' }]}>
                <Feather name="trash-2" size={18} color={c.error} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.menuOptionTitle, { color: c.error }]}>
                  Xóa phòng {room.roomNumber}
                </Text>
                <Text style={s.menuOptionSub}>
                  {deletion.reason || 'Xóa vĩnh viễn phòng này khỏi danh sách nhà trọ'}
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Delete Room Confirmation Dialog (with Room Code + Hủy + Error handling) */
/* -------------------------------------------------------------------------- */

export function DeleteRoomConfirmModal({
  visible,
  room,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  room: HostRoom;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;

  const handleCancel = () => {
    if (!busy) onCancel();
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={handleCancel}>
      <View style={s.dialogBackdrop}>
        <View style={s.dialogCard}>
          <View style={s.dialogIconCircle}>
            <Feather name="trash-2" size={22} color={c.error} />
          </View>
          <Text style={s.dialogTitle}>Xóa phòng {room.roomNumber}?</Text>
          <Text style={s.dialogDesc}>
            Bạn có chắc chắn muốn xóa phòng <Text style={{ fontWeight: '700' }}>{room.roomNumber}</Text> khỏi nhà trọ? Thao tác này không thể hoàn tác.
          </Text>

          <InlineError message={error} />

          <View style={s.dialogActions}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
              accessibilityLabel="Hủy xóa phòng"
              onPress={handleCancel}
            >
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.dangerBtn, busy && { opacity: 0.85 }]}
              accessibilityLabel={`Xác nhận xóa phòng ${room.roomNumber}`}
              accessibilityState={{ busy, disabled: busy }}
              onPress={onConfirm}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="trash-2" size={15} color="#FFFFFF" />
              )}
              <Text style={s.primaryBtnText}>{busy ? 'Đang xóa…' : 'Xóa phòng'}</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Update Room Status Bottom Sheet (Respects Active Contract Constraint)   */
/* -------------------------------------------------------------------------- */

export function RoomStatusUpdateSheet({
  visible,
  room,
  activeContract,
  busy,
  error,
  onClose,
  onOpenContract,
  onSubmit,
}: {
  visible: boolean;
  room: HostRoom;
  activeContract: RentalContractView | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onOpenContract: () => void;
  onSubmit: (next: {
    status: 'VACANT' | 'OCCUPIED';
    leaseStartDate: string | null;
    leaseEndDate: string | null;
  }) => void;
}) {
  if (!visible) return null;
  return (
    <RoomStatusUpdateSheetContent
      room={room}
      activeContract={activeContract}
      busy={busy}
      error={error}
      onClose={onClose}
      onOpenContract={onOpenContract}
      onSubmit={onSubmit}
    />
  );
}

function RoomStatusUpdateSheetContent({
  room,
  activeContract,
  busy,
  error,
  onClose,
  onOpenContract,
  onSubmit,
}: {
  room: HostRoom;
  activeContract: RentalContractView | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onOpenContract: () => void;
  onSubmit: (next: {
    status: 'VACANT' | 'OCCUPIED';
    leaseStartDate: string | null;
    leaseEndDate: string | null;
  }) => void;
}) {
  const reduced = useReducedMotionPreference();
  const currentMeta = roomRentalStatusMeta(room.status);
  const confirmation = roomConfirmationPresentation(room);
  const isContractBound = Boolean(activeContract && activeContract.status === 'ACTIVE');

  const initialTarget: 'VACANT' | 'OCCUPIED' =
    room.status === 'OCCUPIED' ? 'OCCUPIED' : 'VACANT';
  const defaultStart = room.leaseStartDate || todayIsoVietnam();
  const defaultEnd = room.leaseEndDate || addMonthsIso(defaultStart, 6);

  const [targetStatus, setTargetStatus] = useState<'VACANT' | 'OCCUPIED'>(initialTarget);
  const [leaseStartDate, setLeaseStartDate] = useState(defaultStart);
  const [leaseEndDate, setLeaseEndDate] = useState(defaultEnd);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleConfirmSubmit = () => {
    if (busy) return;
    if (isContractBound) {
      // Only re-confirm current OCCUPIED status with exact existing contract/room dates
      onSubmit({
        status: 'OCCUPIED',
        leaseStartDate: activeContract?.startDate || room.leaseStartDate || null,
        leaseEndDate: activeContract?.endDate || room.leaseEndDate || null,
      });
      return;
    }

    const nextErrors = validateBulkLeaseDates(
      targetStatus,
      leaseStartDate.trim(),
      leaseEndDate.trim()
    );
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      status: targetStatus,
      leaseStartDate: targetStatus === 'OCCUPIED' ? leaseStartDate.trim() : null,
      leaseEndDate: targetStatus === 'OCCUPIED' ? leaseEndDate.trim() : null,
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
            <Text style={s.sheetTitle}>Cập nhật tình trạng · {room.roomNumber}</Text>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng cập nhật tình trạng"
              style={[s.closeBtn, busy && { opacity: 0.4 }]}
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
            {/* Current Status Summary */}
            <View style={s.currentStatusBox}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.smallMuted}>Trạng thái hiện tại</Text>
                <Text style={s.currentStatusValue}>{currentMeta.label}</Text>
                <Text style={s.smallMuted}>{confirmation.detail}</Text>
              </View>
            </View>

            {isContractBound ? (
              /* Contract-bound explanation & direct link to contract flow */
              <View style={s.contractLockBox}>
                <View style={s.contractLockHeader}>
                  <Feather name="file-text" size={17} color="#9A5B0A" />
                  <Text style={s.contractLockTitle}>
                    Tình trạng thuê đang gắn với hợp đồng
                  </Text>
                </View>
                <Text style={s.contractLockText}>
                  Phòng {room.roomNumber} đang có hợp đồng đang quản lý (
                  {formatIsoDateVi(activeContract?.startDate)} –{' '}
                  {formatIsoDateVi(activeContract?.endDate)}). Hệ thống không tự động chuyển phòng
                  sang Còn trống, sửa ngày ở hoặc kết thúc hợp đồng tại đây.
                </Text>
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={s.openContractBtn}
                  accessibilityLabel="Xem hợp đồng hiện tại"
                  onPress={() => {
                    onClose();
                    onOpenContract();
                  }}
                >
                  <Feather name="file-text" size={15} color={c.primary} />
                  <Text style={s.openContractBtnText}>Xem hợp đồng hiện tại</Text>
                  <Feather name="arrow-right" size={14} color={c.primary} />
                </AnimatedPressable>
              </View>
            ) : (
              <>
                <View style={{ gap: 8 }}>
                  <Text style={s.groupLabel}>Chọn trạng thái đích</Text>
                  <View style={s.statusSwitchRow}>
                    <AnimatedPressable
                      scaleTo={0.98}
                      disabled={busy}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: targetStatus === 'VACANT' }}
                      style={[
                        s.statusChoice,
                        targetStatus === 'VACANT' && s.statusChoiceActive,
                      ]}
                      onPress={() => {
                        setTargetStatus('VACANT');
                        setFieldErrors({});
                      }}
                    >
                      <Feather
                        name="check-circle"
                        size={16}
                        color={targetStatus === 'VACANT' ? c.primary : c.textSecondary}
                      />
                      <Text
                        style={[
                          s.statusChoiceText,
                          targetStatus === 'VACANT' && { color: c.primary },
                        ]}
                      >
                        Còn trống
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      scaleTo={0.98}
                      disabled={busy}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: targetStatus === 'OCCUPIED' }}
                      style={[
                        s.statusChoice,
                        targetStatus === 'OCCUPIED' && s.statusChoiceActive,
                      ]}
                      onPress={() => {
                        setTargetStatus('OCCUPIED');
                        setFieldErrors({});
                      }}
                    >
                      <Feather
                        name="users"
                        size={16}
                        color={targetStatus === 'OCCUPIED' ? c.primary : c.textSecondary}
                      />
                      <Text
                        style={[
                          s.statusChoiceText,
                          targetStatus === 'OCCUPIED' && { color: c.primary },
                        ]}
                      >
                        Đang thuê
                      </Text>
                    </AnimatedPressable>
                  </View>
                </View>

                {targetStatus === 'OCCUPIED' ? (
                  <View style={{ gap: 10 }}>
                    <AuthInput
                      label="Ngày bắt đầu ở (YYYY-MM-DD)"
                      accessibilityLabel="Ngày bắt đầu ở"
                      value={leaseStartDate}
                      placeholder="2026-11-20"
                      editable={!busy}
                      error={fieldErrors.leaseStartDate}
                      onChangeText={val => {
                        setLeaseStartDate(val);
                        setFieldErrors(prev => ({ ...prev, leaseStartDate: '' }));
                      }}
                    />
                    <AuthInput
                      label="Ngày kết thúc ở (YYYY-MM-DD)"
                      accessibilityLabel="Ngày kết thúc ở"
                      value={leaseEndDate}
                      placeholder="2027-05-20"
                      editable={!busy}
                      error={fieldErrors.leaseEndDate}
                      onChangeText={val => {
                        setLeaseEndDate(val);
                        setFieldErrors(prev => ({ ...prev, leaseEndDate: '' }));
                      }}
                    />
                    <View style={s.presetRow}>
                      {[3, 6, 12].map(months => (
                        <AnimatedPressable
                          key={months}
                          scaleTo={0.97}
                          disabled={busy}
                          style={s.presetChip}
                          onPress={() => {
                            const base = leaseStartDate.trim() || todayIsoVietnam();
                            const end = addMonthsIso(base, months);
                            if (end) {
                              setLeaseStartDate(base);
                              setLeaseEndDate(end);
                              setFieldErrors({});
                            }
                          }}
                        >
                          <Text style={s.presetChipText}>+{months} tháng</Text>
                        </AnimatedPressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={s.infoBanner}>
                    <Feather name="info" size={15} color={c.primary} style={{ marginTop: 2 }} />
                    <Text style={s.infoBannerText}>
                      Phòng sẽ ở trạng thái Còn trống, sẵn sàng đón khách thuê và cập nhật thời điểm
                      xác nhận mới nhất.
                    </Text>
                  </View>
                )}
              </>
            )}

            <InlineError message={error} />
          </ScrollView>

          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.secondaryBtn, busy && { opacity: 0.5 }]}
              onPress={handleClose}
            >
              <Text style={s.secondaryBtnText}>Đóng</Text>
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.primaryBtn, busy && { opacity: 0.85 }]}
              accessibilityState={{ busy, disabled: busy }}
              onPress={handleConfirmSubmit}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="check-circle" size={16} color="#FFFFFF" />
              )}
              <Text style={s.primaryBtnText}>
                {busy
                  ? 'Đang lưu…'
                  : isContractBound
                  ? 'Xác nhận lại Đang thuê'
                  : targetStatus === room.status
                  ? 'Xác nhận tình trạng'
                  : 'Lưu trạng thái mới'}
              </Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Rental Contract Reader Modal (Xem hợp đồng)                              */
/* -------------------------------------------------------------------------- */

export function RoomContractReaderModal({
  visible,
  roomNumber,
  contracts,
  onClose,
}: {
  visible: boolean;
  roomNumber: string;
  contracts: RentalContractView[];
  onClose: () => void;
}) {
  if (!visible || contracts.length === 0) return null;
  return (
    <RoomContractReaderContent
      roomNumber={roomNumber}
      contracts={contracts}
      onClose={onClose}
    />
  );
}

function RoomContractReaderContent({
  roomNumber,
  contracts,
  onClose,
}: {
  roomNumber: string;
  contracts: RentalContractView[];
  onClose: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const initial = selectDisplayContract(contracts) || contracts[0];
  const [selectedId, setSelectedId] = useState<number>(initial.id);

  const current = contracts.find(c => c.id === selectedId) || initial;
  const d = current.details;
  const isActive = current.status === 'ACTIVE';

  return (
    <Modal animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={s.readerScreen} edges={['top', 'bottom', 'left', 'right']}>
          <View style={s.readerHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.readerTitle}>Hợp đồng thuê phòng</Text>
              <Text style={s.readerSubtitle} numberOfLines={1}>
                Phòng {roomNumber}
                {current.propertyName ? ` · ${current.propertyName}` : ''}
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng hợp đồng"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={22} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          {/* Contract History Selector when multiple contracts exist */}
          {contracts.length > 1 && (
            <View style={s.historyStripWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.historyStrip}
              >
                {contracts.map(record => {
                  const active = record.id === current.id;
                  return (
                    <AnimatedPressable
                      key={record.id}
                      scaleTo={0.97}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      style={[s.historyChip, active && s.historyChipActive]}
                      onPress={() => setSelectedId(record.id)}
                    >
                      <Text style={[s.historyChipText, active && s.historyChipTextActive]}>
                        {record.details.tenantName || `HĐ #${record.id}`} ·{' '}
                        {formatIsoDateVi(record.startDate)}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.readerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status & Lease Period Card */}
            <View style={s.readerCard}>
              <View style={s.readerStatusRow}>
                <View
                  style={[
                    s.contractBadge,
                    isActive ? s.contractBadgeActive : s.contractBadgeClosed,
                  ]}
                >
                  <Text
                    style={[
                      s.contractBadgeText,
                      { color: isActive ? c.primary : c.textSecondary },
                    ]}
                  >
                    {isActive ? 'Đang quản lý' : 'Đã kết thúc'}
                  </Text>
                </View>
                <Text style={s.contractCodeText}>Mã HĐ #{current.id}</Text>
              </View>

              <View style={s.contractDatesGrid}>
                <View style={s.contractDateBox}>
                  <Text style={s.smallMuted}>Ngày bắt đầu ở</Text>
                  <Text style={s.contractDateVal}>{formatIsoDateVi(current.startDate)}</Text>
                </View>
                <View style={s.contractDateBox}>
                  <Text style={s.smallMuted}>Ngày kết thúc ở</Text>
                  <Text style={s.contractDateVal}>{formatIsoDateVi(current.endDate)}</Text>
                </View>
              </View>
            </View>

            {/* Parties Info */}
            <View style={s.readerCard}>
              <Text style={s.readerSectionHeading}>Thông tin các bên</Text>
              <View style={s.partyBox}>
                <Text style={s.partyRole}>Bên cho thuê (Bên A)</Text>
                <Text style={s.partyName}>{d.landlordName || 'Chưa cập nhật'}</Text>
                {d.landlordPhone ? (
                  <Text selectable style={s.partyMeta}>
                    SĐT: {d.landlordPhone}
                  </Text>
                ) : null}
                {d.landlordIdentity ? (
                  <Text selectable style={s.partyMeta}>
                    CCCD/CMND: {d.landlordIdentity}
                  </Text>
                ) : null}
              </View>

              <View style={s.partyBox}>
                <Text style={s.partyRole}>Bên thuê phòng (Bên B)</Text>
                <Text style={s.partyName}>{d.tenantName || 'Chưa cập nhật'}</Text>
                {d.tenantPhone ? (
                  <Text selectable style={s.partyMeta}>
                    SĐT: {d.tenantPhone}
                  </Text>
                ) : null}
                {d.tenantIdentity ? (
                  <Text selectable style={s.partyMeta}>
                    CCCD/CMND: {d.tenantIdentity}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Financial Terms */}
            <View style={s.readerCard}>
              <Text style={s.readerSectionHeading}>Giá thuê & Chi phí trong hợp đồng</Text>
              <ContractKv label="Tiền thuê mỗi tháng" value={formatMoneyVnd(d.rent)} />
              <ContractKv label="Tiền đặt cọc" value={formatMoneyVnd(d.deposit)} />
              {d.paymentDay != null && (
                <ContractKv
                  label="Ngày thanh toán"
                  value={`Ngày ${d.paymentDay} hằng tháng`}
                />
              )}
              {d.paymentMethod ? (
                <ContractKv label="Hình thức thanh toán" value={d.paymentMethod} />
              ) : null}
              {d.electricityPrice != null && (
                <ContractKv
                  label="Tiền điện"
                  value={`${formatMoneyVnd(d.electricityPrice)}/kWh`}
                />
              )}
              {d.waterPrice != null && (
                <ContractKv
                  label="Tiền nước"
                  value={`${formatMoneyVnd(d.waterPrice)}/${d.waterUnit || 'm³'}`}
                />
              )}
              {d.internetPrice != null && (
                <ContractKv label="Internet / Wifi" value={formatMoneyVnd(d.internetPrice)} />
              )}
              {d.servicePrice != null && (
                <ContractKv label="Dịch vụ chung" value={formatMoneyVnd(d.servicePrice)} />
              )}
            </View>

            {/* Contract Terms Text */}
            <View style={s.readerCard}>
              <Text style={s.readerSectionHeading}>Điều khoản hợp đồng</Text>
              <Text selectable style={s.termsText}>
                {d.terms || 'Chưa có điều khoản chi tiết.'}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function ContractKv({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.contractKvRow}>
      <Text style={s.smallMuted}>{label}</Text>
      <Text style={s.contractKvValue}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
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
    maxHeight: '85%',
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
    flex: 1,
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
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 64,
  },
  menuOptionDanger: {
    backgroundColor: '#FFF9F9',
    borderColor: '#F8D4D4',
  },
  menuOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  menuOptionSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: authSpacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: 22,
    padding: authSpacing.xl,
    alignItems: 'center',
    gap: 10,
  },
  dialogIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dialogTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: c.forestInk,
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  currentStatusBox: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
  },
  currentStatusValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  smallMuted: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  contractLockBox: {
    backgroundColor: '#FEF9EE',
    borderWidth: 1,
    borderColor: '#F6DFB0',
    borderRadius: authRadius.lg,
    padding: 14,
    gap: 8,
  },
  contractLockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contractLockTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#9A5B0A',
  },
  contractLockText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  openContractBtn: {
    marginTop: 2,
    minHeight: 42,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  openContractBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  groupLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.forestInk,
  },
  statusSwitchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusChoice: {
    flex: 1,
    minHeight: 48,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1.2,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusChoiceActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  statusChoiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: authRadius.round,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#D4E8E0',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
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
  dangerBtn: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: authRadius.lg,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readerScreen: {
    flex: 1,
    backgroundColor: c.background,
  },
  readerHeader: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  readerTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: c.forestInk,
  },
  readerSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  historyStripWrap: {
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  historyStrip: {
    paddingHorizontal: authSpacing.xl,
    paddingVertical: 10,
    gap: 8,
  },
  historyChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: authRadius.round,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  historyChipActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  historyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  historyChipTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  readerScrollContent: {
    padding: authSpacing.xl,
    gap: 14,
  },
  readerCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 12,
  },
  readerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: authRadius.round,
  },
  contractBadgeActive: {
    backgroundColor: '#E8F5EE',
  },
  contractBadgeClosed: {
    backgroundColor: '#EEF2F0',
  },
  contractBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contractCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  contractDatesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  contractDateBox: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    gap: 2,
  },
  contractDateVal: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  readerSectionHeading: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  partyBox: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 3,
  },
  partyRole: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  partyMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  contractKvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  contractKvValue: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  termsText: {
    fontSize: 13,
    lineHeight: 21,
    color: c.forestInk,
  },
});
