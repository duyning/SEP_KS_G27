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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import type { HostManagedProperty, HostRoom, HostRoomType } from '@/services/host';
import {
  addMonthsIso,
  formatFloorKey,
  roomRentalStatusMeta,
  todayIsoVietnam,
  validateBulkLeaseDates,
  type BulkRoomStatusPayload,
  type RoomStatusFilter,
  type RoomVisibilityFilter,
} from '@/services/host-rooms';

/* -------------------------------------------------------------------------- */
/* 1. Filter Bottom Sheet (Floor, Room Type, Status, Visibility)               */
/* -------------------------------------------------------------------------- */

export interface RoomsFilterValue {
  floor: string;
  typeId: string;
  status: RoomStatusFilter;
  visibility: RoomVisibilityFilter;
}

export function RoomsFilterSheet({
  visible,
  value,
  floors,
  roomTypes,
  hasMaintenance,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: RoomsFilterValue;
  floors: string[];
  roomTypes: HostRoomType[];
  hasMaintenance: boolean;
  onClose: () => void;
  onApply: (next: RoomsFilterValue) => void;
}) {
  if (!visible) return null;
  return (
    <RoomsFilterSheetContent
      value={value}
      floors={floors}
      roomTypes={roomTypes}
      hasMaintenance={hasMaintenance}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function RoomsFilterSheetContent({
  value,
  floors,
  roomTypes,
  hasMaintenance,
  onClose,
  onApply,
}: {
  value: RoomsFilterValue;
  floors: string[];
  roomTypes: HostRoomType[];
  hasMaintenance: boolean;
  onClose: () => void;
  onApply: (next: RoomsFilterValue) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [draft, setDraft] = useState<RoomsFilterValue>(value);

  const statusOptions: { key: RoomStatusFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'VACANT', label: 'Còn trống' },
    { key: 'OCCUPIED', label: 'Đang thuê' },
    ...(hasMaintenance ? [{ key: 'MAINTENANCE' as const, label: 'Bảo trì' }] : []),
  ];

  const visibilityOptions: { key: RoomVisibilityFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PUBLIC', label: 'Công khai' },
    { key: 'PRIVATE', label: 'Riêng tư' },
  ];

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Bộ lọc phòng</Text>
            <AnimatedPressable
              accessibilityLabel="Đóng bộ lọc phòng"
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
            {/* Tình trạng thuê */}
            <View style={{ gap: 10 }}>
              <Text style={s.groupLabel}>Tình trạng thuê</Text>
              <View style={s.chipsWrap}>
                {statusOptions.map(opt => {
                  const active = draft.status === opt.key;
                  return (
                    <AnimatedPressable
                      key={opt.key}
                      scaleTo={0.97}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setDraft(prev => ({ ...prev, status: opt.key }))}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {/* Chế độ hiển thị */}
            <View style={{ gap: 10 }}>
              <Text style={s.groupLabel}>Chế độ hiển thị</Text>
              <View style={s.chipsWrap}>
                {visibilityOptions.map(opt => {
                  const active = draft.visibility === opt.key;
                  return (
                    <AnimatedPressable
                      key={opt.key}
                      scaleTo={0.97}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setDraft(prev => ({ ...prev, visibility: opt.key }))}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {/* Loại phòng */}
            {roomTypes.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={s.groupLabel}>Loại phòng</Text>
                <View style={s.chipsWrap}>
                  <AnimatedPressable
                    scaleTo={0.97}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: draft.typeId === 'ALL' }}
                    onPress={() => setDraft(prev => ({ ...prev, typeId: 'ALL' }))}
                    style={[s.chip, draft.typeId === 'ALL' && s.chipActive]}
                  >
                    <Text style={[s.chipText, draft.typeId === 'ALL' && s.chipTextActive]}>
                      Tất cả loại phòng
                    </Text>
                  </AnimatedPressable>
                  {roomTypes.map(type => {
                    const key = String(type.roomTypeId);
                    const active = draft.typeId === key;
                    return (
                      <AnimatedPressable
                        key={type.roomTypeId}
                        scaleTo={0.97}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setDraft(prev => ({ ...prev, typeId: key }))}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>
                          {type.roomType}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tầng */}
            {floors.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={s.groupLabel}>Tầng / Khu vực</Text>
                <View style={s.chipsWrap}>
                  <AnimatedPressable
                    scaleTo={0.97}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: draft.floor === 'ALL' }}
                    onPress={() => setDraft(prev => ({ ...prev, floor: 'ALL' }))}
                    style={[s.chip, draft.floor === 'ALL' && s.chipActive]}
                  >
                    <Text style={[s.chipText, draft.floor === 'ALL' && s.chipTextActive]}>
                      Tất cả tầng
                    </Text>
                  </AnimatedPressable>
                  {floors.map(floorName => {
                    const active = draft.floor === floorName;
                    return (
                      <AnimatedPressable
                        key={floorName}
                        scaleTo={0.97}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setDraft(prev => ({ ...prev, floor: floorName }))}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>{floorName}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.secondaryBtn}
              accessibilityLabel="Đặt lại bộ lọc"
              onPress={() =>
                setDraft({ floor: 'ALL', typeId: 'ALL', status: 'ALL', visibility: 'ALL' })
              }
            >
              <Text style={s.secondaryBtnText}>Đặt lại</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.primaryBtn}
              accessibilityLabel="Áp dụng bộ lọc"
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
/* 2. Overflow Menu Sheet (⋯)                                                  */
/* -------------------------------------------------------------------------- */

export function RoomsMenuSheet({
  visible,
  canManage,
  hasRooms,
  selectionMode,
  onClose,
  onOpenUtilities,
  onOpenBilling,
  onOpenMultiFloorSetup,
  onOpenPublication,
  onToggleSelectionMode,
}: {
  visible: boolean;
  canManage: boolean;
  hasRooms: boolean;
  selectionMode: boolean;
  onClose: () => void;
  onOpenUtilities: () => void;
  onOpenBilling?: () => void;
  onOpenMultiFloorSetup: () => void;
  onOpenPublication: () => void;
  onToggleSelectionMode: () => void;
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
            <Text style={s.sheetTitle}>Tùy chọn quản lý phòng</Text>
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
              disabled={!hasRooms}
              style={[s.menuOption, !hasRooms && { opacity: 0.45 }]}
              accessibilityLabel="Ghi điện nước"
              onPress={() => {
                onClose();
                onOpenUtilities();
              }}
            >
              <View style={s.menuOptionIcon}>
                <Feather name="zap" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuOptionTitle}>Ghi điện nước hàng tháng</Text>
                <Text style={s.menuOptionSub}>
                  Ghi chỉ số điện nước, xem tiền tạm tính và chốt kỳ theo từng phòng
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            {onOpenBilling ? (
              <AnimatedPressable
                scaleTo={0.98}
                disabled={!hasRooms}
                style={[s.menuOption, !hasRooms && { opacity: 0.45 }]}
                accessibilityLabel="Phiếu thu và công nợ"
                onPress={() => {
                  onClose();
                  onOpenBilling();
                }}
              >
                <View style={s.menuOptionIcon}>
                  <Feather name="file-text" size={18} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.menuOptionTitle}>Phiếu thu & Công nợ</Text>
                  <Text style={s.menuOptionSub}>
                    Lập phiếu thu, theo dõi công nợ, ghi nhận thanh toán và chu kỳ thu
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={c.textMuted} />
              </AnimatedPressable>
            ) : null}

            <AnimatedPressable
              scaleTo={0.98}
              disabled={!canManage}
              style={[s.menuOption, !canManage && { opacity: 0.45 }]}
              accessibilityLabel="Thiết lập phòng nhiều tầng"
              onPress={() => {
                onClose();
                onOpenMultiFloorSetup();
              }}
            >
              <View style={s.menuOptionIcon}>
                <Feather name="layers" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuOptionTitle}>Thiết lập phòng nhiều tầng</Text>
                <Text style={s.menuOptionSub}>
                  Tạo nhanh loại phòng, sinh phòng theo tầng và gán loại trước khi lưu
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={!canManage || !hasRooms}
              style={[s.menuOption, (!canManage || !hasRooms) && { opacity: 0.45 }]}
              accessibilityLabel="Chọn phòng công khai"
              onPress={() => {
                onClose();
                onOpenPublication();
              }}
            >
              <View style={s.menuOptionIcon}>
                <Feather name="eye" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuOptionTitle}>Chọn phòng công khai</Text>
                <Text style={s.menuOptionSub}>
                  Chọn những phòng hiển thị với người thuê (không đổi tình trạng thuê)
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={c.textMuted} />
            </AnimatedPressable>

            <AnimatedPressable
              scaleTo={0.98}
              disabled={!canManage || !hasRooms}
              style={[s.menuOption, (!canManage || !hasRooms) && { opacity: 0.45 }]}
              accessibilityLabel={selectionMode ? 'Thoát chế độ chọn nhiều' : 'Chọn nhiều phòng'}
              onPress={() => {
                onClose();
                onToggleSelectionMode();
              }}
            >
              <View style={s.menuOptionIcon}>
                <Feather name={selectionMode ? 'x-square' : 'check-square'} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.menuOptionTitle}>
                  {selectionMode ? 'Thoát chế độ chọn nhiều' : 'Chọn nhiều phòng'}
                </Text>
                <Text style={s.menuOptionSub}>
                  Cập nhật hàng loạt tình trạng Còn trống / Đang thuê
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

/* -------------------------------------------------------------------------- */
/* 3. Bulk Room Status Update Sheet (PATCH /api/host/rooms/status)             */
/* -------------------------------------------------------------------------- */

export function BulkRoomStatusSheet({
  visible,
  propertyId,
  rooms,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  propertyId: number | null;
  rooms: HostRoom[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: BulkRoomStatusPayload) => void;
}) {
  if (!visible || propertyId == null || rooms.length === 0) return null;
  return (
    <BulkRoomStatusSheetContent
      propertyId={propertyId}
      rooms={rooms}
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function BulkRoomStatusSheetContent({
  propertyId,
  rooms,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  propertyId: number;
  rooms: HostRoom[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: BulkRoomStatusPayload) => void;
}) {
  const reduced = useReducedMotionPreference();
  const initialTarget: 'VACANT' | 'OCCUPIED' = rooms.every(r => r.status === 'OCCUPIED')
    ? 'VACANT'
    : 'OCCUPIED';
  const defaultStart = (rooms.length === 1 && rooms[0].leaseStartDate) || todayIsoVietnam();
  const defaultEnd =
    (rooms.length === 1 && rooms[0].leaseEndDate) || addMonthsIso(defaultStart, 6);

  const [targetStatus, setTargetStatus] = useState<'VACANT' | 'OCCUPIED'>(initialTarget);
  const [leaseStartDate, setLeaseStartDate] = useState(defaultStart);
  const [leaseEndDate, setLeaseEndDate] = useState(defaultEnd);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const previewNames =
    rooms
      .slice(0, 6)
      .map(r => r.roomNumber)
      .join(', ') + (rooms.length > 6 ? ` và ${rooms.length - 6} phòng khác` : '');

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handlePressSubmit = () => {
    if (busy) return;
    const nextErrors = validateBulkLeaseDates(targetStatus, leaseStartDate.trim(), leaseEndDate.trim());
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      propertyId,
      roomIds: rooms.map(r => r.roomId),
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
            <Text style={s.sheetTitle}>Đổi trạng thái {rooms.length} phòng</Text>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng đổi trạng thái phòng"
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
            <View style={s.selectedPreviewBox}>
              <Text style={s.selectedPreviewLabel}>
                Phòng áp dụng ({rooms.length} phòng)
              </Text>
              <Text style={s.selectedPreviewText}>{previewNames}</Text>
            </View>

            {/* Target Status Selector */}
            <View style={{ gap: 8 }}>
              <Text style={s.groupLabel}>Trạng thái đích</Text>
              <View style={s.statusSwitchRow}>
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: targetStatus === 'VACANT' }}
                  style={[s.statusChoice, targetStatus === 'VACANT' && s.statusChoiceActive]}
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
                  style={[s.statusChoice, targetStatus === 'OCCUPIED' && s.statusChoiceActive]}
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
                <Text style={s.helperNote}>
                  Khoảng thời gian thuê áp dụng chung cho {rooms.length} phòng đã chọn. Chế độ
                  Công khai / Riêng tư không bị thay đổi.
                </Text>
              </View>
            ) : (
              <View style={s.infoBanner}>
                <Feather name="info" size={15} color={c.primary} style={{ marginTop: 2 }} />
                <Text style={s.infoBannerText}>
                  {rooms.length} phòng sẽ chuyển sang Còn trống và xóa khoảng ngày thuê hiện tại.
                  Chế độ Công khai / Riêng tư được giữ nguyên.
                </Text>
              </View>
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
              <Text style={s.secondaryBtnText}>Hủy</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy}
              style={[s.primaryBtn, busy && { opacity: 0.85 }]}
              accessibilityState={{ busy, disabled: busy }}
              onPress={handlePressSubmit}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="check" size={16} color="#FFFFFF" />
              )}
              <Text style={s.primaryBtnText}>
                {busy
                  ? 'Đang cập nhật…'
                  : `Cập nhật ${rooms.length} phòng`}
              </Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Room Publication Sheet (PUT /api/host/rooms/publication)                 */
/* -------------------------------------------------------------------------- */

export function RoomPublicationSheet({
  visible,
  property,
  rooms,
  busy,
  error,
  onClose,
  onSave,
}: {
  visible: boolean;
  property?: HostManagedProperty;
  rooms: HostRoom[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (roomIds: number[]) => void;
}) {
  if (!visible || !property) return null;
  return (
    <RoomPublicationSheetContent
      property={property}
      rooms={rooms}
      busy={busy}
      error={error}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function RoomPublicationSheetContent({
  property,
  rooms,
  busy,
  error,
  onClose,
  onSave,
}: {
  property: HostManagedProperty;
  rooms: HostRoom[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (roomIds: number[]) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [publicIds, setPublicIds] = useState<Set<number>>(
    () => new Set(rooms.filter(r => r.publicVisible).map(r => r.roomId))
  );

  const enabled = property.status === 'ACTIVE';
  const allSelected = rooms.length > 0 && publicIds.size === rooms.length;

  const toggle = (roomId: number) => {
    if (busy || !enabled) return;
    setPublicIds(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={handleClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[s.sheet, { maxHeight: '88%' }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sheetTitle}>Chọn phòng công khai</Text>
              <Text style={s.optionSub} numberOfLines={1}>
                {property.name}
              </Text>
            </View>
            <AnimatedPressable
              disabled={busy}
              accessibilityLabel="Đóng chọn phòng công khai"
              style={[s.closeBtn, busy && { opacity: 0.4 }]}
              onPress={handleClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <View style={s.infoBanner}>
            <Feather name="eye" size={15} color={c.primary} style={{ marginTop: 2 }} />
            <Text style={s.infoBannerText}>
              Chỉ các phòng được chọn công khai mới hiển thị cho người tìm trọ. Thao tác này không
              thay đổi tình trạng thuê của phòng.
            </Text>
          </View>

          {rooms.length > 0 && (
            <View style={s.pubToolbar}>
              <AnimatedPressable
                disabled={busy || !enabled}
                style={s.pubSelectAllBtn}
                onPress={() =>
                  setPublicIds(allSelected ? new Set() : new Set(rooms.map(r => r.roomId)))
                }
              >
                <Feather
                  name={allSelected ? 'check-square' : 'square'}
                  size={16}
                  color={c.primary}
                />
                <Text style={s.pubSelectAllText}>
                  {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${rooms.length})`}
                </Text>
              </AnimatedPressable>
              <Text style={s.pubCountText}>
                {publicIds.size}/{rooms.length} công khai
              </Text>
            </View>
          )}

          <ScrollView
            style={[s.sheetScroll, { marginTop: 8 }]}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {rooms.map(room => {
              const checked = publicIds.has(room.roomId);
              const rental = roomRentalStatusMeta(room.status);
              return (
                <AnimatedPressable
                  key={room.roomId}
                  scaleTo={0.99}
                  disabled={busy || !enabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`Phòng ${room.roomNumber}, ${checked ? 'Công khai' : 'Riêng tư'}`}
                  style={[s.pubRoomRow, checked && s.pubRoomRowActive]}
                  onPress={() => toggle(room.roomId)}
                >
                  <Feather
                    name={checked ? 'check-square' : 'square'}
                    size={18}
                    color={checked ? c.primary : c.textMuted}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.pubRoomTitle}>{room.roomNumber}</Text>
                    <Text style={s.optionSub} numberOfLines={1}>
                      {formatFloorKey(room.floor)} · {room.roomType} · {rental.label}
                    </Text>
                  </View>
                  <View style={[s.visBadge, checked ? s.visPublic : s.visPrivate]}>
                    <Feather
                      name={checked ? 'eye' : 'eye-off'}
                      size={11}
                      color={checked ? c.primary : c.textSecondary}
                    />
                    <Text
                      style={[
                        s.visBadgeText,
                        { color: checked ? c.primary : c.textSecondary },
                      ]}
                    >
                      {checked ? 'Công khai' : 'Riêng tư'}
                    </Text>
                  </View>
                </AnimatedPressable>
              );
            })}
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
              disabled={busy || !enabled || !rooms.length}
              style={[s.primaryBtn, (busy || !enabled || !rooms.length) && { opacity: 0.6 }]}
              accessibilityState={{ busy }}
              onPress={() => onSave([...publicIds])}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="check" size={16} color="#FFFFFF" />
              )}
              <Text style={s.primaryBtnText}>
                {busy ? 'Đang lưu…' : 'Lưu phòng công khai'}
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
    maxHeight: '84%',
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
  optionSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  selectedPreviewBox: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 4,
  },
  selectedPreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  selectedPreviewText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  helperNote: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
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
  pubToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  pubSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  pubSelectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  pubCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  pubRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 56,
  },
  pubRoomRowActive: {
    backgroundColor: '#F4FBF8',
    borderColor: '#CBE6D8',
  },
  pubRoomTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: authRadius.round,
  },
  visPublic: {
    backgroundColor: '#E8F5EE',
  },
  visPrivate: {
    backgroundColor: '#EEF2F0',
  },
  visBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
