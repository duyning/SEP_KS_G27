import { useMemo, useState } from 'react';
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
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import { formatMoneyVnd } from '@/services/host-room-types';
import {
  extractDraftFloorLabels,
  formatFloorDisplay,
  layoutFloorNumber,
  nextRoomSequence,
  roomKey,
  type DraftNewRoomType,
  type DraftRoomRow,
  type RoomSetupIssue,
  type SelectableRoomType,
} from '@/services/room-setup';

/* -------------------------------------------------------------------------- */
/* 0. Fast 1-Tap Room Type Picker Sheet ([Chọn loại] / [Thay đổi])            */
/* -------------------------------------------------------------------------- */

export function QuickTypePickSheet({
  visible,
  row,
  selectableTypes,
  onClose,
  onSelectType,
}: {
  visible: boolean;
  row: DraftRoomRow | null;
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onSelectType: (rowId: string, roomTypeId: number | null) => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible || !row) return null;

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Chọn loại phòng · {row.roomNumber}</Text>
              <Text style={s.sheetSub}>{formatFloorDisplay(row.floor)}</Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng chọn loại phòng"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 8, paddingBottom: 18 }}
            showsVerticalScrollIndicator={false}
          >
            <TypeOptionList
              selectableTypes={selectableTypes}
              selectedId={row.roomTypeId}
              allowUnassigned
              onSelect={nextId => {
                onSelectType(row.rowId, nextId);
                onClose();
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Edit Single Draft Room Sheet                                            */
/* -------------------------------------------------------------------------- */

export function DraftRoomEditSheet({
  visible,
  row,
  issue,
  selectableTypes,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  row: DraftRoomRow | null;
  issue?: RoomSetupIssue;
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onSave: (rowId: string, next: { roomNumber: string; floor: string; roomTypeId: number | null }) => void;
  onDelete: (rowId: string) => void;
}) {
  if (!visible || !row) return null;
  return (
    <DraftRoomEditSheetContent
      key={row.rowId}
      row={row}
      issue={issue}
      selectableTypes={selectableTypes}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}

function DraftRoomEditSheetContent({
  row,
  issue,
  selectableTypes,
  onClose,
  onSave,
  onDelete,
}: {
  row: DraftRoomRow;
  issue?: RoomSetupIssue;
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onSave: (rowId: string, next: { roomNumber: string; floor: string; roomTypeId: number | null }) => void;
  onDelete: (rowId: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [roomNumber, setRoomNumber] = useState(row.roomNumber);
  const [floor, setFloor] = useState(row.floor);
  const [roomTypeId, setRoomTypeId] = useState<number | null>(row.roomTypeId);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = () => {
    const trimmedCode = roomNumber.trim();
    const trimmedFloor = floor.trim();
    if (!trimmedCode) {
      setLocalError('Vui lòng nhập mã phòng.');
      return;
    }
    if (!trimmedFloor) {
      setLocalError('Vui lòng nhập tầng.');
      return;
    }
    onSave(row.rowId, {
      roomNumber: trimmedCode,
      floor: trimmedFloor,
      roomTypeId,
    });
    onClose();
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Chỉnh sửa phòng nháp</Text>
              <Text style={s.sheetSub}>{formatFloorDisplay(row.floor)}</Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng chỉnh sửa phòng"
              style={s.closeBtn}
              onPress={onClose}
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
            {issue && <InlineError message={issue.message} />}
            {localError && <InlineError message={localError} />}

            <View style={s.twoCol}>
              <View style={{ flex: 1.2 }}>
                <AuthInput
                  label="Mã phòng *"
                  value={roomNumber}
                  onChangeText={v => {
                    setRoomNumber(v);
                    setLocalError(null);
                  }}
                  placeholder="VD: 101"
                  maxLength={30}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AuthInput
                  label="Tầng *"
                  value={floor}
                  onChangeText={v => {
                    setFloor(v);
                    setLocalError(null);
                  }}
                  placeholder="VD: Tầng 1"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={s.groupLabel}>Loại phòng được gán</Text>
              <TypeOptionList
                selectableTypes={selectableTypes}
                selectedId={roomTypeId}
                allowUnassigned
                onSelect={setRoomTypeId}
              />
            </View>
          </ScrollView>

          <View style={s.sheetFooter}>
            <AnimatedPressable
              scaleTo={0.97}
              accessibilityLabel="Xóa phòng khỏi bản nháp"
              style={s.dangerOutlineBtn}
              onPress={() => {
                onDelete(row.rowId);
                onClose();
              }}
            >
              <Feather name="trash-2" size={16} color={c.error} />
              <Text style={s.dangerOutlineText}>Xóa</Text>
            </AnimatedPressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Lưu thay đổi" onPress={handleSave} />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Add Single Room (+ Phòng lẻ) Sheet                                      */
/* -------------------------------------------------------------------------- */

export function AddSingleDraftRoomSheet({
  visible,
  defaultFloorLabel,
  existingAndDraftRooms,
  selectableTypes,
  onClose,
  onAdd,
}: {
  visible: boolean;
  defaultFloorLabel: string;
  existingAndDraftRooms: readonly { floor?: string | null; roomNumber?: string | null }[];
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onAdd: (row: { floor: string; roomNumber: string; roomTypeId: number | null }) => void;
}) {
  if (!visible) return null;
  return (
    <AddSingleDraftRoomSheetContent
      key={defaultFloorLabel}
      defaultFloorLabel={defaultFloorLabel}
      existingAndDraftRooms={existingAndDraftRooms}
      selectableTypes={selectableTypes}
      onClose={onClose}
      onAdd={onAdd}
    />
  );
}

function AddSingleDraftRoomSheetContent({
  defaultFloorLabel,
  existingAndDraftRooms,
  selectableTypes,
  onClose,
  onAdd,
}: {
  defaultFloorLabel: string;
  existingAndDraftRooms: readonly { floor?: string | null; roomNumber?: string | null }[];
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onAdd: (row: { floor: string; roomNumber: string; roomTypeId: number | null }) => void;
}) {
  const reduced = useReducedMotionPreference();
  const initialFloorNo = layoutFloorNumber(defaultFloorLabel) ?? 1;
  const initialSeq = nextRoomSequence(existingAndDraftRooms, initialFloorNo, '');
  const suggestedCode = `${initialFloorNo}${String(initialSeq).padStart(2, '0')}`;

  const [floor, setFloor] = useState(
    defaultFloorLabel && defaultFloorLabel !== 'ALL'
      ? defaultFloorLabel
      : `Tầng ${initialFloorNo}`
  );
  const [roomNumber, setRoomNumber] = useState(suggestedCode);
  const [roomTypeId, setRoomTypeId] = useState<number | null>(
    selectableTypes.length === 1 ? selectableTypes[0].id : null
  );
  const [error, setError] = useState<string | null>(null);

  const handleFloorChange = (val: string) => {
    setFloor(val);
    setError(null);
    const num = layoutFloorNumber(val);
    if (num != null) {
      const seq = nextRoomSequence(existingAndDraftRooms, num, '');
      setRoomNumber(`${num}${String(seq).padStart(2, '0')}`);
    }
  };

  const handleAdd = () => {
    const trimmedCode = roomNumber.trim();
    const trimmedFloor = floor.trim();
    if (!trimmedFloor) {
      setError('Vui lòng nhập tầng cho phòng lẻ.');
      return;
    }
    if (!trimmedCode) {
      setError('Vui lòng nhập mã phòng.');
      return;
    }
    const key = roomKey(trimmedCode);
    const duplicate = existingAndDraftRooms.some(r => roomKey(r.roomNumber) === key);
    if (duplicate) {
      setError(`Mã phòng ${trimmedCode} đã tồn tại trong nhà trọ hoặc bản nháp.`);
      return;
    }
    onAdd({
      floor: /^\d+$/.test(trimmedFloor) ? `Tầng ${trimmedFloor}` : trimmedFloor,
      roomNumber: trimmedCode,
      roomTypeId,
    });
    onClose();
  };

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Thêm phòng lẻ vào bản nháp</Text>
              <Text style={s.sheetSub}>Tự gợi ý số phòng tiếp theo trên tầng</Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng thêm phòng lẻ"
              style={s.closeBtn}
              onPress={onClose}
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
            {error && <InlineError message={error} />}

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <AuthInput
                  label="Tầng *"
                  value={floor}
                  onChangeText={handleFloorChange}
                  placeholder="VD: Tầng 2"
                  maxLength={50}
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <AuthInput
                  label="Mã phòng *"
                  value={roomNumber}
                  onChangeText={v => {
                    setRoomNumber(v);
                    setError(null);
                  }}
                  placeholder="VD: 206"
                  maxLength={30}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={s.groupLabel}>Loại phòng (có thể gán sau)</Text>
              <TypeOptionList
                selectableTypes={selectableTypes}
                selectedId={roomTypeId}
                allowUnassigned
                onSelect={setRoomTypeId}
              />
            </View>
          </ScrollView>

          <View style={s.sheetFooter}>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Thêm vào bản nháp" onPress={handleAdd} />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Bulk / Explicit-Scope Type Assign Sheet                                 */
/* -------------------------------------------------------------------------- */

export type AssignScopeKey = 'SELECTED' | 'FLOOR_UNASSIGNED' | 'ALL_UNASSIGNED' | 'FLOOR_ALL';

export function BulkAssignTypeSheet({
  visible,
  mode,
  activeFloor,
  draftRooms,
  selectedRowIds,
  selectableTypes,
  onClose,
  onApply,
}: {
  visible: boolean;
  mode: 'SELECTED' | 'SCOPE';
  activeFloor: string; // 'ALL' or specific floor label
  draftRooms: DraftRoomRow[];
  selectedRowIds: ReadonlySet<string>;
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onApply: (targetIds: Set<string>, roomTypeId: number, scopeLabel: string) => void;
}) {
  if (!visible) return null;
  return (
    <BulkAssignTypeSheetContent
      key={`${mode}-${activeFloor}-${selectedRowIds.size}`}
      mode={mode}
      activeFloor={activeFloor}
      draftRooms={draftRooms}
      selectedRowIds={selectedRowIds}
      selectableTypes={selectableTypes}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function BulkAssignTypeSheetContent({
  mode,
  activeFloor,
  draftRooms,
  selectedRowIds,
  selectableTypes,
  onClose,
  onApply,
}: {
  mode: 'SELECTED' | 'SCOPE';
  activeFloor: string;
  draftRooms: DraftRoomRow[];
  selectedRowIds: ReadonlySet<string>;
  selectableTypes: SelectableRoomType[];
  onClose: () => void;
  onApply: (targetIds: Set<string>, roomTypeId: number, scopeLabel: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const hasSpecificFloor = activeFloor !== 'ALL';

  const defaultScope: AssignScopeKey =
    mode === 'SELECTED'
      ? 'SELECTED'
      : hasSpecificFloor
      ? 'FLOOR_UNASSIGNED'
      : 'ALL_UNASSIGNED';

  const [scope, setScope] = useState<AssignScopeKey>(defaultScope);
  const [chosenTypeId, setChosenTypeId] = useState<number | null>(
    selectableTypes.length === 1 ? selectableTypes[0].id : null
  );
  const [confirmAllUnassigned, setConfirmAllUnassigned] = useState(false);

  const scopeOptions = useMemo(() => {
    if (mode === 'SELECTED') {
      const selectedRows = draftRooms.filter(r => selectedRowIds.has(r.rowId));
      return [
        {
          key: 'SELECTED' as const,
          title: `Các phòng đang chọn (${selectedRows.length} phòng)`,
          desc: 'Chỉ cập nhật những phòng bạn đã đánh dấu trong chế độ chọn nhiều.',
          rows: selectedRows,
        },
      ];
    }

    const opts: {
      key: AssignScopeKey;
      title: string;
      desc: string;
      rows: DraftRoomRow[];
    }[] = [];

    if (hasSpecificFloor) {
      const floorUnassigned = draftRooms.filter(
        r => r.floor === activeFloor && r.roomTypeId == null
      );
      opts.push({
        key: 'FLOOR_UNASSIGNED',
        title: `Phòng chưa gán trong ${formatFloorDisplay(activeFloor)}`,
        desc: 'An toàn · Không ghi đè các phòng đã có loại trên tầng này.',
        rows: floorUnassigned,
      });
    }

    const allUnassigned = draftRooms.filter(r => r.roomTypeId == null);
    opts.push({
      key: 'ALL_UNASSIGNED',
      title: 'Tất cả phòng chưa gán trong bản nháp',
      desc: 'Chỉ gán cho các phòng đang để trống loại, giữ nguyên phòng đã gán.',
      rows: allUnassigned,
    });

    if (hasSpecificFloor) {
      const floorAll = draftRooms.filter(r => r.floor === activeFloor);
      opts.push({
        key: 'FLOOR_ALL',
        title: `Toàn bộ phòng trong ${formatFloorDisplay(activeFloor)}`,
        desc: 'Ghi đè cả những phòng đã gán loại thuộc tầng đang xem.',
        rows: floorAll,
      });
    }

    return opts;
  }, [activeFloor, draftRooms, hasSpecificFloor, mode, selectedRowIds]);

  const currentScopeObj =
    scopeOptions.find(opt => opt.key === scope) || scopeOptions[0];
  const affectedCount = currentScopeObj ? currentScopeObj.rows.length : 0;
  const chosenType = selectableTypes.find(t => t.id === chosenTypeId) || null;
  const needsAllConfirm = currentScopeObj?.key === 'ALL_UNASSIGNED' && affectedCount > 0;
  const canApply =
    chosenTypeId != null &&
    affectedCount > 0 &&
    (!needsAllConfirm || confirmAllUnassigned);

  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>
                {mode === 'SELECTED' ? 'Gán loại cho phòng đã chọn' : 'Gán nhanh loại phòng'}
              </Text>
              <Text style={s.sheetSub}>
                Xác nhận rõ phạm vi và số phòng bị ảnh hưởng trước khi áp dụng
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Đóng hộp thoại gán loại"
              style={s.closeBtn}
              onPress={onClose}
            >
              <Feather name="x" size={20} color={c.forestInk} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={s.sheetScroll}
            contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Scope Picker */}
            <View style={{ gap: 8 }}>
              <Text style={s.groupLabel}>Phạm vi áp dụng</Text>
              {scopeOptions.map(opt => {
                const active = currentScopeObj?.key === opt.key;
                return (
                  <AnimatedPressable
                    key={opt.key}
                    scaleTo={0.99}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[s.scopeOption, active && s.scopeOptionActive]}
                    onPress={() => setScope(opt.key)}
                  >
                    <View style={[s.radioOuter, active && s.radioOuterActive]}>
                      {active && <View style={s.radioInner} />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.scopeTitle}>{opt.title}</Text>
                      <Text style={s.scopeDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[s.countBadge, active && s.countBadgeActive]}>
                      <Text style={[s.countBadgeText, active && s.countBadgeTextActive]}>
                        {opt.rows.length}
                      </Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Room Type Picker */}
            <View style={{ gap: 8 }}>
              <Text style={s.groupLabel}>Chọn loại phòng muốn gán</Text>
              <TypeOptionList
                selectableTypes={selectableTypes}
                selectedId={chosenTypeId}
                allowUnassigned={false}
                onSelect={setChosenTypeId}
              />
            </View>

            {/* Impact Summary Banner */}
            <View style={s.impactBox}>
              <Feather name="check-circle" size={16} color={c.primary} style={{ marginTop: 1 }} />
              <Text style={s.impactText}>
                {affectedCount === 0
                  ? 'Không có phòng nào nằm trong phạm vi này.'
                  : chosenType
                  ? `Sẽ gán loại "${chosenType.roomType}" cho ${affectedCount} phòng. Các phòng ngoài phạm vi sẽ giữ nguyên.`
                  : `Đang chọn ${affectedCount} phòng. Hãy chọn loại phòng ở trên để áp dụng.`}
              </Text>
            </View>

            {needsAllConfirm && (
              <AnimatedPressable
                scaleTo={0.99}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmAllUnassigned }}
                style={s.confirmCheckRow}
                onPress={() => setConfirmAllUnassigned(prev => !prev)}
              >
                <View style={[s.confirmBox, confirmAllUnassigned && s.confirmBoxActive]}>
                  {confirmAllUnassigned && <Feather name="check" size={13} color="#FFFFFF" />}
                </View>
                <Text style={s.confirmCheckText}>
                  Xác nhận gán cho tất cả {affectedCount} phòng chưa gán trên mọi tầng
                </Text>
              </AnimatedPressable>
            )}
          </ScrollView>

          <View style={s.sheetFooter}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={
                  affectedCount > 0
                    ? `Gán loại (${affectedCount} phòng)`
                    : 'Không có phòng phù hợp'
                }
                disabled={!canApply}
                onPress={() => {
                  if (!canApply || chosenTypeId == null || !currentScopeObj) return;
                  onApply(
                    new Set(currentScopeObj.rows.map(r => r.rowId)),
                    chosenTypeId,
                    `Gán ${chosenType?.roomType || 'loại phòng'} (${affectedCount} phòng)`
                  );
                  onClose();
                }}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Review Before Submit Modal (Inside Step 3 — NOT a 4th step)             */
/* -------------------------------------------------------------------------- */

export function SetupReviewModal({
  visible,
  propertyName,
  draftTypes,
  usedSavedTypesCount,
  unassignedCount,
  draftRooms,
  selectableTypes,
  issues,
  busy,
  submitError,
  ambiguousAttempt,
  reconciling,
  reconcileNote,
  onClose,
  onJumpToRow,
  onReconcile,
  onConfirmCreate,
}: {
  visible: boolean;
  propertyName: string;
  draftTypes: DraftNewRoomType[];
  usedSavedTypesCount: number;
  unassignedCount: number;
  draftRooms: DraftRoomRow[];
  selectableTypes: SelectableRoomType[];
  issues: RoomSetupIssue[];
  busy: boolean;
  submitError: string | null;
  ambiguousAttempt: boolean;
  reconciling: boolean;
  reconcileNote: string | null;
  onClose: () => void;
  onJumpToRow: (row: DraftRoomRow) => void;
  onReconcile: () => void;
  onConfirmCreate: () => void;
}) {
  if (!visible) return null;
  return (
    <SetupReviewModalContent
      propertyName={propertyName}
      draftTypes={draftTypes}
      usedSavedTypesCount={usedSavedTypesCount}
      unassignedCount={unassignedCount}
      draftRooms={draftRooms}
      selectableTypes={selectableTypes}
      issues={issues}
      busy={busy}
      submitError={submitError}
      ambiguousAttempt={ambiguousAttempt}
      reconciling={reconciling}
      reconcileNote={reconcileNote}
      onClose={onClose}
      onJumpToRow={onJumpToRow}
      onReconcile={onReconcile}
      onConfirmCreate={onConfirmCreate}
    />
  );
}

function SetupReviewModalContent({
  propertyName,
  draftTypes,
  usedSavedTypesCount,
  unassignedCount,
  draftRooms,
  selectableTypes,
  issues,
  busy,
  submitError,
  ambiguousAttempt,
  reconciling,
  reconcileNote,
  onClose,
  onJumpToRow,
  onReconcile,
  onConfirmCreate,
}: {
  propertyName: string;
  draftTypes: DraftNewRoomType[];
  usedSavedTypesCount: number;
  unassignedCount: number;
  draftRooms: DraftRoomRow[];
  selectableTypes: SelectableRoomType[];
  issues: RoomSetupIssue[];
  busy: boolean;
  submitError: string | null;
  ambiguousAttempt: boolean;
  reconciling: boolean;
  reconcileNote: string | null;
  onClose: () => void;
  onJumpToRow: (row: DraftRoomRow) => void;
  onReconcile: () => void;
  onConfirmCreate: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(() => new Set());

  const floorLabels = useMemo(() => extractDraftFloorLabels(draftRooms), [draftRooms]);
  const typeById = useMemo(() => {
    const map = new Map<number, SelectableRoomType>();
    selectableTypes.forEach(t => map.set(t.id, t));
    return map;
  }, [selectableTypes]);

  const rowById = useMemo(() => {
    const map = new Map<string, DraftRoomRow>();
    draftRooms.forEach(r => map.set(r.rowId, r));
    return map;
  }, [draftRooms]);

  const totalPhotos = useMemo(
    () => draftTypes.reduce((sum, t) => sum + t.form.photos.length, 0),
    [draftTypes]
  );

  const toggleFloor = (label: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const hasIssues = issues.length > 0;
  const hasContent = draftTypes.length > 0 || draftRooms.length > 0;
  const canConfirm = !busy && !reconciling && !hasIssues && hasContent;

  return (
    <Modal
      visible
      animationType={reduced ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView style={s.reviewScreen} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header */}
        <View style={s.reviewHeader}>
          <AnimatedPressable
            disabled={busy}
            accessibilityLabel="Quay lại bước gán loại phòng"
            style={[s.closeBtn, busy && { opacity: 0.45 }]}
            onPress={onClose}
          >
            <Feather name="arrow-left" size={20} color={c.forestInk} />
          </AnimatedPressable>
          <View style={{ flex: 1 }}>
            <Text style={s.reviewTitle}>Kiểm tra & lưu</Text>
            <Text style={s.reviewSub} numberOfLines={1}>
              {propertyName} · Bước 3/3
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.reviewScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Property + Complete Review Summary Card */}
          <View style={s.reviewOverviewCard}>
            <View style={s.reviewPropRow}>
              <View style={s.reviewPropIcon}>
                <Feather name="home" size={15} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.reviewPropLabel}>Nhà trọ áp dụng</Text>
                <Text style={s.reviewPropName} numberOfLines={1}>
                  {propertyName}
                </Text>
              </View>
            </View>

            <View style={s.reviewMetricsGrid}>
              <ReviewMetric label="Tổng số phòng" value={draftRooms.length} highlight />
              <ReviewMetric label="Tổng số tầng" value={floorLabels.length} />
              <ReviewMetric label="Loại phòng mới" value={draftTypes.length} />
              <ReviewMetric label="Loại đã có sử dụng" value={usedSavedTypesCount} />
              <ReviewMetric
                label="Phòng chưa gán"
                value={unassignedCount}
                danger={unassignedCount > 0}
              />
              <ReviewMetric
                label="Vấn đề cần xử lý"
                value={issues.length}
                danger={issues.length > 0}
              />
            </View>
          </View>

          {/* Real creation notice */}
          <View style={s.realNoticeCard}>
            <Feather name="shield" size={16} color={c.primary} style={{ marginTop: 1 }} />
            <Text style={s.realNoticeText}>
              Nhấn <Text style={{ fontWeight: '700' }}>Xác nhận tạo</Text> sẽ tạo thật trên hệ thống
              {draftTypes.length > 0
                ? ` (${draftTypes.length} loại phòng mới${totalPhotos > 0 ? `, ${totalPhotos} ảnh` : ''} và ${draftRooms.length} phòng).`
                : ` (${draftRooms.length} phòng từ các loại phòng sẵn có).`}{' '}
              Phòng mới tạo sẽ ở chế độ Riêng tư cho đến khi bạn chọn công khai.
            </Text>
          </View>

          {/* Submit error + reconciliation banner */}
          {submitError && <InlineError message={submitError} />}

          {reconcileNote && (
            <View style={s.reconcileCard}>
              <Feather name="info" size={16} color={c.primaryDark} style={{ marginTop: 1 }} />
              <Text style={s.reconcileText}>{reconcileNote}</Text>
            </View>
          )}

          {ambiguousAttempt && (
            <AnimatedPressable
              scaleTo={0.98}
              disabled={reconciling || busy}
              style={s.reconcileBtn}
              onPress={onReconcile}
            >
              {reconciling ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Feather name="refresh-cw" size={15} color={c.primary} />
              )}
              <Text style={s.reconcileBtnText}>
                {reconciling
                  ? 'Đang đối chiếu dữ liệu máy chủ…'
                  : 'Kiểm tra lại máy chủ trước khi thử gửi lại'}
              </Text>
            </AnimatedPressable>
          )}

          {/* Blocking Issues List with Direct Jump */}
          {hasIssues && (
            <View style={s.issueCard}>
              <View style={s.issueHeader}>
                <Feather name="alert-triangle" size={17} color={c.error} />
                <Text style={s.issueTitle}>
                  Còn {issues.length} mục cần xử lý trước khi tạo
                </Text>
              </View>
              <Text style={s.issueSubtitle}>
                Chạm vào từng mục để chuyển thẳng đến phòng cần sửa.
              </Text>
              <View style={{ gap: 8 }}>
                {issues.slice(0, 12).map(item => {
                  const targetRow = rowById.get(item.rowId);
                  return (
                    <AnimatedPressable
                      key={item.rowId}
                      scaleTo={0.98}
                      style={s.issueRow}
                      onPress={() => {
                        if (targetRow) onJumpToRow(targetRow);
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.issueRowCode}>
                          {item.roomNumber || '(Trống mã)'} · {formatFloorDisplay(item.floor)}
                        </Text>
                        <Text style={s.issueRowMsg}>{item.message}</Text>
                      </View>
                      <Text style={s.issueJumpLabel}>Sửa</Text>
                      <Feather name="chevron-right" size={15} color={c.error} />
                    </AnimatedPressable>
                  );
                })}
                {issues.length > 12 && (
                  <Text style={s.issueMore}>
                    …và còn {issues.length - 12} phòng khác cần kiểm tra.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* New Draft Room Types Summary */}
          {draftTypes.length > 0 && (
            <View style={s.reviewSection}>
              <Text style={s.reviewSectionTitle}>
                Loại phòng mới sẽ tạo ({draftTypes.length})
              </Text>
              {draftTypes.map((item, idx) => (
                <View
                  key={item.localId}
                  style={[s.reviewTypeRow, idx === draftTypes.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.reviewTypeName}>{item.details.roomType}</Text>
                    <Text style={s.reviewTypeMeta}>
                      {item.details.areaSqm} m² · {item.details.capacity} người
                      {item.form.photos.length > 0 ? ` · ${item.form.photos.length} ảnh` : ''}
                    </Text>
                  </View>
                  <Text style={s.reviewTypePrice}>
                    {formatMoneyVnd(item.details.price)}/tháng
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Expandable Floors Preview */}
          {floorLabels.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={s.reviewSectionTitle}>
                Chi tiết theo từng tầng ({floorLabels.length} tầng)
              </Text>
              {floorLabels.map(floorLabel => {
                const floorRows = draftRooms.filter(r => r.floor === floorLabel);
                const expanded = expandedFloors.has(floorLabel);
                const floorIssueCount = issues.filter(i => i.floor === floorLabel).length;

                return (
                  <View key={floorLabel} style={s.floorAccordion}>
                    <AnimatedPressable
                      scaleTo={0.99}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      style={s.floorAccordionHeader}
                      onPress={() => toggleFloor(floorLabel)}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.floorAccordionTitle}>
                          {formatFloorDisplay(floorLabel)}
                        </Text>
                        <Text style={s.floorAccordionMeta}>
                          {floorRows.length} phòng
                          {floorIssueCount > 0 ? ` · ${floorIssueCount} cần sửa` : ' · Sẵn sàng'}
                        </Text>
                      </View>
                      <Feather
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={c.textSecondary}
                      />
                    </AnimatedPressable>

                    {expanded && (
                      <View style={s.floorAccordionBody}>
                        {floorRows.map((row, idx) => {
                          const assigned =
                            row.roomTypeId != null ? typeById.get(row.roomTypeId) : null;
                          const rowIssue = issues.find(i => i.rowId === row.rowId);
                          return (
                            <AnimatedPressable
                              key={row.rowId}
                              scaleTo={0.99}
                              style={[
                                s.floorRoomRow,
                                idx === floorRows.length - 1 && { borderBottomWidth: 0 },
                              ]}
                              onPress={() => onJumpToRow(row)}
                            >
                              <Text style={s.floorRoomCode}>{row.roomNumber}</Text>
                              <Text
                                style={[
                                  s.floorRoomType,
                                  (!assigned || rowIssue) && { color: c.error },
                                ]}
                                numberOfLines={1}
                              >
                                {rowIssue
                                  ? rowIssue.message
                                  : assigned
                                  ? assigned.roomType
                                  : 'Chưa gán loại'}
                              </Text>
                            </AnimatedPressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Review Footer */}
        <View style={s.reviewFooter}>
          <PrimaryButton
            title={
              busy
                ? 'Đang tạo phòng trên hệ thống…'
                : hasIssues
                ? `Còn ${issues.length} mục cần xử lý`
                : 'Xác nhận tạo'
            }
            loading={busy}
            disabled={!canConfirm}
            onPress={onConfirmCreate}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ReviewMetric({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <View style={s.metricBox}>
      <Text
        style={[
          s.metricVal,
          highlight && { color: c.primary },
          danger && { color: c.error },
        ]}
      >
        {value}
      </Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared Room Type Picker List                                               */
/* -------------------------------------------------------------------------- */

function TypeOptionList({
  selectableTypes,
  selectedId,
  allowUnassigned,
  onSelect,
}: {
  selectableTypes: SelectableRoomType[];
  selectedId: number | null;
  allowUnassigned: boolean;
  onSelect: (id: number | null) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {allowUnassigned && (
        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedId == null }}
          style={[s.typeOpt, selectedId == null && s.typeOptActive]}
          onPress={() => onSelect(null)}
        >
          <View style={[s.radioOuter, selectedId == null && s.radioOuterActive]}>
            {selectedId == null && <View style={s.radioInner} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.typeOptName}>Gán loại sau</Text>
            <Text style={s.typeOptMeta}>Chưa gán loại phòng ở lúc này</Text>
          </View>
        </AnimatedPressable>
      )}
      {selectableTypes.map(item => {
        const active = selectedId === item.id;
        return (
          <AnimatedPressable
            key={item.id}
            scaleTo={0.99}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[s.typeOpt, active && s.typeOptActive]}
            onPress={() => onSelect(item.id)}
          >
            <View style={[s.radioOuter, active && s.radioOuterActive]}>
              {active && <View style={s.radioInner} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.typeOptName} numberOfLines={1}>
                  {item.roomType}
                </Text>
                {item.isDraft && (
                  <View style={s.draftMiniBadge}>
                    <Text style={s.draftMiniBadgeText}>Nháp</Text>
                  </View>
                )}
              </View>
              <Text style={s.typeOptMeta}>
                {formatMoneyVnd(item.price)}/tháng
                {item.areaSqm != null ? ` · ${item.areaSqm} m²` : ''}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

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
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    maxHeight: '86%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  sheetTitle: {
    fontSize: 17,
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
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingTop: 14,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  groupLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  dangerOutlineBtn: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: '#F3B8B2',
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.error,
  },
  typeOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  typeOptActive: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  typeOptName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  typeOptMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  draftMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: authRadius.round,
    backgroundColor: '#FFF3DF',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  draftMiniBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9A6315',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: c.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  scopeOptionActive: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  scopeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  scopeDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  countBadge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  countBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
  impactBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.primaryDark,
  },
  reviewScreen: {
    flex: 1,
    backgroundColor: c.background,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.forestInk,
  },
  reviewSub: {
    fontSize: 12.5,
    color: c.textSecondary,
    marginTop: 1,
  },
  reviewScrollContent: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 14,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: '800',
    color: c.forestInk,
  },
  summaryLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: c.border,
  },
  realNoticeCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  realNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.primaryDark,
  },
  reconcileCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  reconcileText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#7A4D0D',
  },
  reconcileBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.surface,
    paddingHorizontal: 14,
  },
  reconcileBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  issueCard: {
    backgroundColor: '#FFF7F6',
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: '#F3B8B2',
    padding: 14,
    gap: 10,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.error,
  },
  issueSubtitle: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: '#F5CBC7',
  },
  issueRowCode: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  issueRowMsg: {
    fontSize: 12,
    color: c.error,
  },
  issueJumpLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.error,
  },
  issueMore: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
  },
  reviewSection: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 6,
  },
  reviewSectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  reviewTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  reviewTypeName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  reviewTypeMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  reviewTypePrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  floorAccordion: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  floorAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  floorAccordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  floorAccordionMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  floorAccordionBody: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingHorizontal: 14,
  },
  floorRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  floorRoomCode: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  floorRoomType: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: c.textSecondary,
  },
  confirmCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  confirmBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#B45309',
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBoxActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  confirmCheckText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#7A4D0D',
  },
  reviewOverviewCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 12,
  },
  reviewPropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  reviewPropIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewPropLabel: {
    fontSize: 11.5,
    color: c.textSecondary,
  },
  reviewPropName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  reviewMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: c.forestInk,
  },
  metricLabel: {
    fontSize: 11,
    color: c.textSecondary,
    textAlign: 'center',
  },
  reviewFooter: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});
