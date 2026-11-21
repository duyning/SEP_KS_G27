import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { AuthInput } from '@/components/auth/auth-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useManagedProperty } from '@/components/host/management-ui';
import {
  AddSingleDraftRoomSheet,
  BulkAssignTypeSheet,
  DraftRoomEditSheet,
  SetupReviewModal,
} from '@/components/host/room-setup-sheets';
import { RoomSetupTypeModal } from '@/components/host/room-setup-type-modal';
import { useReducedMotionPreference } from '@/constants/motion';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError } from '@/services/host';
import { formatMoneyVnd } from '@/services/host-room-types';
import {
  SETUP_LIMITS,
  applyScopedTypeAssignment,
  buildSetupRequest,
  collectNumericFloors,
  combineSelectableRoomTypes,
  extractDraftFloorLabels,
  formatBatchPreview,
  formatFloorDisplay,
  generateExistingFloorBatch,
  generateFloorRangeBatch,
  reconcileDraftAgainstServer,
  roomKey,
  sanitizeDigitsInput,
  undoTypeAssignment,
  validateDraftRooms,
  type AssignmentSnapshot,
  type DraftBatchSummary,
  type DraftNewRoomType,
  type DraftRoomRow,
  type RoomNumberingStyle,
  type RoomTypeFormDraft,
  type RoomTypeRequestPayload,
} from '@/services/room-setup';
import {
  fetchLatestHostInventory,
  submitRoomLayoutJson,
  submitRoomSetupMultipart,
} from '@/services/room-setup-upload';

type SetupStep = 1 | 2 | 3;
type FloorGenMode = 'RANGE' | 'EXISTING';

const STEP_META: Record<SetupStep, { label: string; title: string }> = {
  1: { label: 'Loại phòng', title: 'Chuẩn bị loại phòng' },
  2: { label: 'Tạo theo tầng', title: 'Tạo phòng theo tầng' },
  3: { label: 'Gán loại phòng', title: 'Gán loại và kiểm tra' },
};

export default function MultiFloorRoomSetupScreen() {
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const { property } = useManagedProperty(params.propertyId);
  const propertyId = property?.propertyId ?? null;
  const propertyName = property?.name || 'Nhà trọ đang quản lý';

  const savedTypes = useMemo(() => {
    if (propertyId == null) return [];
    return (host.data.roomTypes?.roomTypes || []).filter(t => t.propertyId === propertyId);
  }, [host.data.roomTypes?.roomTypes, propertyId]);

  const savedRooms = useMemo(() => {
    if (propertyId == null) return [];
    return (host.data.rooms?.rooms || []).filter(r => r.propertyId === propertyId);
  }, [host.data.rooms?.rooms, propertyId]);

  // Persistent 3-step draft state (never discarded when switching steps)
  const [step, setStep] = useState<SetupStep>(1);
  const [draftTypes, setDraftTypes] = useState<DraftNewRoomType[]>([]);
  const [draftRooms, setDraftRooms] = useState<DraftRoomRow[]>([]);
  const [batches, setBatches] = useState<DraftBatchSummary[]>([]);
  const nextLocalTypeIdRef = useRef(-1);
  const nextBatchIndexRef = useRef(1);

  // Step 1 modal state
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingDraftType, setEditingDraftType] = useState<DraftNewRoomType | null>(null);

  // Step 2 generator form state
  const [genMode, setGenMode] = useState<FloorGenMode>('RANGE');
  const [floorCountInput, setFloorCountInput] = useState('3');
  const [roomsPerFloorInput, setRoomsPerFloorInput] = useState('4');
  const [selectedExistingFloor, setSelectedExistingFloor] = useState<string>('');
  const [extraRoomsInput, setExtraRoomsInput] = useState('2');
  const [groupRoomTypeId, setGroupRoomTypeId] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [fromFloorInput, setFromFloorInput] = useState('1');
  const [manualStartSeqInput, setManualStartSeqInput] = useState('');
  const [numberingStyle, setNumberingStyle] = useState<RoomNumberingStyle>('ALL');
  const [step2Notice, setStep2Notice] = useState<string | null>(null);

  // Step 3 assign & filter state
  const [activeFloorFilter, setActiveFloorFilter] = useState<string>('ALL');
  const [searchCode, setSearchCode] = useState('');
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [undoStack, setUndoStack] = useState<AssignmentSnapshot[]>([]);
  const [step3Banner, setStep3Banner] = useState<string | null>(null);

  // Step 3 sheets & review modal
  const [editingRow, setEditingRow] = useState<DraftRoomRow | null>(null);
  const [addSingleOpen, setAddSingleOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'SELECTED' | 'SCOPE' | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Submission & reconciliation state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ambiguousAttempt, setAmbiguousAttempt] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileNote, setReconcileNote] = useState<string | null>(null);
  const [completedSummary, setCompletedSummary] = useState<{
    createdTypeCount: number;
    createdRoomCount: number;
  } | null>(null);

  const submitLockRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const selectableTypes = useMemo(
    () => combineSelectableRoomTypes(savedTypes, draftTypes),
    [savedTypes, draftTypes]
  );

  const typeById = useMemo(() => {
    const map = new Map(selectableTypes.map(item => [item.id, item]));
    return map;
  }, [selectableTypes]);

  const existingAndDraftRooms = useMemo(
    () => [
      ...savedRooms.map(r => ({ floor: r.floor, roomNumber: r.roomNumber })),
      ...draftRooms.map(r => ({ floor: r.floor, roomNumber: r.roomNumber })),
    ],
    [savedRooms, draftRooms]
  );

  const availableNumericFloors = useMemo(
    () => collectNumericFloors(savedRooms, draftRooms),
    [savedRooms, draftRooms]
  );

  const effectiveExistingFloor = useMemo(() => {
    if (selectedExistingFloor.trim()) return selectedExistingFloor.trim();
    if (availableNumericFloors.length > 0) return String(availableNumericFloors[0]);
    return '1';
  }, [availableNumericFloors, selectedExistingFloor]);

  const validation = useMemo(
    () => validateDraftRooms(draftRooms, selectableTypes, savedRooms),
    [draftRooms, selectableTypes, savedRooms]
  );

  const draftFloorLabels = useMemo(
    () => extractDraftFloorLabels(draftRooms),
    [draftRooms]
  );

  const effectiveActiveFloor =
    activeFloorFilter !== 'ALL' && !draftFloorLabels.includes(activeFloorFilter)
      ? 'ALL'
      : activeFloorFilter;

  const filteredStep3Rooms = useMemo(() => {
    const query = roomKey(searchCode);
    return draftRooms.filter(row => {
      if (effectiveActiveFloor !== 'ALL' && row.floor !== effectiveActiveFloor) return false;
      if (onlyNeedsAttention && !validation.issueByRowId[row.rowId]) return false;
      if (query && !roomKey(row.roomNumber).includes(query)) return false;
      return true;
    });
  }, [draftRooms, effectiveActiveFloor, onlyNeedsAttention, searchCode, validation.issueByRowId]);

  // Step 2 live batch preview
  const batchPreview = useMemo(() => {
    const manualSeq = manualStartSeqInput.trim() ? Number(manualStartSeqInput.trim()) : null;
    const batchId = `preview`;
    if (genMode === 'RANGE') {
      return generateFloorRangeBatch({
        fromFloor: Number(fromFloorInput || '1'),
        floorCount: Number(floorCountInput || '0'),
        roomsPerFloor: Number(roomsPerFloorInput || '0'),
        prefix: prefixInput,
        startNumber: manualSeq,
        numbering: numberingStyle,
        roomTypeId: groupRoomTypeId,
        existingAndDraftRooms,
        batchId,
      });
    }
    return generateExistingFloorBatch({
      floor: Number(effectiveExistingFloor || '0'),
      extraRooms: Number(extraRoomsInput || '0'),
      prefix: prefixInput,
      startNumber: manualSeq,
      numbering: numberingStyle,
      roomTypeId: groupRoomTypeId,
      existingAndDraftRooms,
      batchId,
    });
  }, [
    effectiveExistingFloor,
    existingAndDraftRooms,
    extraRoomsInput,
    floorCountInput,
    fromFloorInput,
    genMode,
    groupRoomTypeId,
    manualStartSeqInput,
    numberingStyle,
    prefixInput,
    roomsPerFloorInput,
  ]);

  const previewCollisionCount = useMemo(() => {
    if (!batchPreview.rows.length) return 0;
    const existingKeys = new Set(existingAndDraftRooms.map(r => roomKey(r.roomNumber)));
    return batchPreview.rows.filter(r => existingKeys.has(roomKey(r.roomNumber))).length;
  }, [batchPreview.rows, existingAndDraftRooms]);

  const hasDraftWork = draftTypes.length > 0 || draftRooms.length > 0;

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as SetupStep);
      setSelectionMode(false);
      setSelectedRowIds(new Set());
      return;
    }
    if (hasDraftWork && !completedSummary) {
      Alert.alert(
        'Rời khỏi thiết lập phòng?',
        'Bản nháp loại phòng và danh sách phòng chưa lưu sẽ không được giữ lại sau khi thoát.',
        [
          { text: 'Ở lại', style: 'cancel' },
          { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
        ]
      );
      return;
    }
    router.back();
  };

  /* ---- Step 1 handlers ---- */
  const handleSaveDraftType = (
    form: RoomTypeFormDraft,
    payload: RoomTypeRequestPayload,
    editingLocalId?: number
  ) => {
    if (editingLocalId != null) {
      setDraftTypes(prev =>
        prev.map(item =>
          item.localId === editingLocalId ? { ...item, form, details: payload } : item
        )
      );
    } else {
      const localId = nextLocalTypeIdRef.current;
      nextLocalTypeIdRef.current -= 1;
      setDraftTypes(prev => [{ localId, form, details: payload }, ...prev]);
    }
    setTypeModalOpen(false);
    setEditingDraftType(null);
  };

  const handleDeleteDraftType = (target: DraftNewRoomType) => {
    const affectedCount = draftRooms.filter(r => r.roomTypeId === target.localId).length;
    setDraftTypes(prev => prev.filter(item => item.localId !== target.localId));
    if (groupRoomTypeId === target.localId) setGroupRoomTypeId(null);
    if (affectedCount > 0) {
      setDraftRooms(prev =>
        prev.map(r => (r.roomTypeId === target.localId ? { ...r, roomTypeId: null } : r))
      );
    }
  };

  /* ---- Step 2 handlers ---- */
  const handleAddBatchToDraft = () => {
    setStep2Notice(null);
    if (batchPreview.error) {
      setStep2Notice(batchPreview.error);
      return;
    }
    if (!batchPreview.rows.length) {
      setStep2Notice('Chưa có phòng nào được tạo từ thông số hiện tại.');
      return;
    }
    if (draftRooms.length + batchPreview.rows.length > SETUP_LIMITS.maxRooms) {
      setStep2Notice(`Tổng số phòng nháp không được vượt quá ${SETUP_LIMITS.maxRooms} phòng.`);
      return;
    }

    const batchId = `batch-${Date.now()}-${nextBatchIndexRef.current}`;
    nextBatchIndexRef.current += 1;

    const committedRows: DraftRoomRow[] = batchPreview.rows.map((row, idx) => ({
      ...row,
      rowId: `${batchId}-${idx}`,
      batchId,
    }));

    const summaryLabel =
      genMode === 'RANGE'
        ? Number(floorCountInput) === 1
          ? `Tầng ${fromFloorInput || '1'}`
          : `Tầng ${fromFloorInput || '1'}–${
              Number(fromFloorInput || '1') + Number(floorCountInput || '1') - 1
            }`
        : `Thêm vào Tầng ${effectiveExistingFloor}`;

    setDraftRooms(prev => [...prev, ...committedRows]);
    setBatches(prev => [
      {
        batchId,
        mode: genMode === 'RANGE' ? 'RANGE' : 'EXISTING_FLOOR',
        label: summaryLabel,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setStep2Notice(
      `Đã thêm ${committedRows.length} phòng vào bản nháp (${formatBatchPreview(committedRows)}).`
    );
    // Clear manual override after adding so subsequent batches auto-continue cleanly
    if (manualStartSeqInput.trim()) {
      setManualStartSeqInput('');
    }
  };

  const handleRemoveBatch = (batchId: string) => {
    setDraftRooms(prev => prev.filter(r => r.batchId !== batchId));
    setBatches(prev => prev.filter(b => b.batchId !== batchId));
  };

  /* ---- Step 3 handlers ---- */
  const handleEditSingleRow = (
    rowId: string,
    next: { roomNumber: string; floor: string; roomTypeId: number | null }
  ) => {
    setDraftRooms(prev =>
      prev.map(row => (row.rowId === rowId ? { ...row, ...next } : row))
    );
  };

  const handleDeleteSingleRow = (rowId: string) => {
    setDraftRooms(prev => prev.filter(row => row.rowId !== rowId));
    setSelectedRowIds(prev => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  };

  const handleAddSingleRoom = (next: {
    floor: string;
    roomNumber: string;
    roomTypeId: number | null;
  }) => {
    if (draftRooms.length >= SETUP_LIMITS.maxRooms) {
      setStep3Banner(`Đã đạt giới hạn tối đa ${SETUP_LIMITS.maxRooms} phòng trong bản nháp.`);
      return;
    }
    const batchId = `single-${Date.now()}`;
    const newRow: DraftRoomRow = {
      rowId: `${batchId}-0`,
      batchId,
      floor: next.floor,
      roomNumber: next.roomNumber,
      roomTypeId: next.roomTypeId,
    };
    setDraftRooms(prev => [...prev, newRow]);
    setStep3Banner(`Đã thêm phòng lẻ ${next.roomNumber} (${formatFloorDisplay(next.floor)}) vào bản nháp.`);
  };

  const handleApplyScopedAssign = (
    targetIds: Set<string>,
    roomTypeId: number,
    scopeLabel: string
  ) => {
    const result = applyScopedTypeAssignment(draftRooms, targetIds, roomTypeId, scopeLabel);
    if (result.affectedCount === 0 || !result.snapshot) {
      setStep3Banner('Không có phòng nào thay đổi vì đã mang loại phòng này.');
      return;
    }
    setDraftRooms(result.nextRooms);
    setUndoStack(prev => [result.snapshot!, ...prev].slice(0, 10));
    setStep3Banner(`Đã cập nhật ${result.affectedCount} phòng (${scopeLabel}).`);
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedRowIds(new Set());
    }
  };

  const handleUndoLastAssign = () => {
    if (undoStack.length === 0) return;
    const [latest, ...rest] = undoStack;
    setDraftRooms(prev => undoTypeAssignment(prev, latest));
    setUndoStack(rest);
    setStep3Banner(`Đã hoàn tác: ${latest.label}.`);
  };

  const toggleSelectRow = (rowId: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const allVisibleSelected =
    filteredStep3Rooms.length > 0 &&
    filteredStep3Rooms.every(r => selectedRowIds.has(r.rowId));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredStep3Rooms.map(r => r.rowId)));
    }
  };

  const handleJumpToRowFromReview = (row: DraftRoomRow) => {
    setReviewOpen(false);
    setStep(3);
    setActiveFloorFilter(row.floor);
    setSearchCode('');
    setOnlyNeedsAttention(false);
    setSelectionMode(false);
    setSelectedRowIds(new Set());
    setEditingRow(row);
  };

  /* ---- Server Reconciliation & Final Confirmation ---- */
  const handleReconcileServer = useCallback(async () => {
    if (propertyId == null || reconciling || submitting) return;
    setReconciling(true);
    setReconcileNote(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
      const latest = await fetchLatestHostInventory(token, controller.signal);
      if (!mountedRef.current) return;
      const latestPropTypes = latest.roomTypes.filter(t => t.propertyId === propertyId);
      const latestPropRooms = latest.rooms.filter(r => r.propertyId === propertyId);

      const report = reconcileDraftAgainstServer(
        draftTypes,
        draftRooms,
        latestPropTypes,
        latestPropRooms
      );
      await host.store.refresh();
      if (!mountedRef.current) return;

      if (report.allAlreadyCreated) {
        setAmbiguousAttempt(false);
        setSubmitError(null);
        setReconcileNote(report.conflictSummary);
      } else if (report.conflictSummary) {
        setSubmitError(report.conflictSummary);
        setReconcileNote(
          'Đã tải lại dữ liệu mới nhất từ máy chủ. Hãy sửa các mục trùng được đánh dấu trước khi gửi tiếp.'
        );
      } else {
        setAmbiguousAttempt(false);
        setSubmitError(null);
        setReconcileNote(
          'Đã đối chiếu máy chủ: chưa có bản ghi nào từ lần gửi trước. Bạn có thể bấm Xác nhận tạo lại an toàn.'
        );
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setReconcileNote(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối máy chủ để đối chiếu. Vui lòng thử lại sau.'
      );
    } finally {
      clearTimeout(timer);
      if (mountedRef.current) setReconciling(false);
    }
  }, [draftRooms, draftTypes, host.store, propertyId, reconciling, submitting]);

  const handleConfirmCreate = async () => {
    if (submitLockRef.current || propertyId == null) return;
    if (validation.issues.length > 0) return;
    if (draftTypes.length === 0 && draftRooms.length === 0) return;

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setReconcileNote(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);

      // 1. Pre-submit live re-validation against latest server state
      const latest = await fetchLatestHostInventory(token, controller.signal);
      if (!mountedRef.current) return;

      const latestPropTypes = latest.roomTypes.filter(t => t.propertyId === propertyId);
      const latestPropRooms = latest.rooms.filter(r => r.propertyId === propertyId);

      // Check duplicate type names against latest server types
      const latestTypeNameSet = new Set(
        latestPropTypes.map(t => t.roomType.trim().toLowerCase())
      );
      const conflictingType = draftTypes.find(t =>
        latestTypeNameSet.has(t.details.roomType.trim().toLowerCase())
      );
      if (conflictingType) {
        await host.store.refresh();
        throw new HostError(
          `Loại phòng "${conflictingType.details.roomType}" đã tồn tại trên hệ thống. Dữ liệu đã được làm mới, vui lòng kiểm tra trước khi gửi lại.`,
          409
        );
      }

      // Check draft rooms against latest server rooms & saved types
      const liveSelectableTypes = combineSelectableRoomTypes(latestPropTypes, draftTypes);
      const liveValidation = validateDraftRooms(
        draftRooms,
        liveSelectableTypes,
        latestPropRooms
      );
      if (liveValidation.issues.length > 0) {
        await host.store.refresh();
        const first = liveValidation.issues[0];
        throw new HostError(
          `Dữ liệu trên máy chủ vừa thay đổi (${liveValidation.issues.length} mục cần kiểm tra, ví dụ ${first.roomNumber}: ${first.message}).`,
          409
        );
      }

      // 2. Build & send real API request
      const req = buildSetupRequest(propertyId, draftTypes, draftRooms);
      if (req.mode === 'SETUP_MULTIPART' && req.setupPayload) {
        await submitRoomSetupMultipart(req.setupPayload, req.photos, token, controller.signal);
      } else if (req.layoutPayload) {
        await submitRoomLayoutJson(req.layoutPayload, token, controller.signal);
      }

      if (!mountedRef.current) return;

      const createdTypeCount = draftTypes.length;
      const createdRoomCount = draftRooms.length;

      // Refresh host store so Rooms & Room Types screens reflect newly created entities immediately
      await host.store.refresh();
      if (!mountedRef.current) return;

      setReviewOpen(false);
      setAmbiguousAttempt(false);
      setCompletedSummary({ createdTypeCount, createdRoomCount });
    } catch (err) {
      if (!mountedRef.current) return;
      const isConflict = err instanceof HostError && err.status === 409;
      const isClientError =
        err instanceof HostError && err.status >= 400 && err.status < 500 && !isConflict;
      const isAmbiguous = controller.signal.aborted || (!isClientError && !isConflict);

      if (isAmbiguous) {
        setAmbiguousAttempt(true);
      }
      setSubmitError(
        controller.signal.aborted
          ? 'Yêu cầu quá thời gian chờ. Bản nháp vẫn được giữ nguyên — hãy bấm kiểm tra lại máy chủ trước khi thử gửi lại để tránh tạo trùng.'
          : err instanceof Error
          ? err.message
          : 'Không thể hoàn tất tạo phòng. Bản nháp vẫn được giữ nguyên.'
      );
    } finally {
      clearTimeout(timeout);
      submitLockRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };

  /* ---- Completed Success View ---- */
  if (completedSummary) {
    return (
      <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.successWrap}>
          <View style={s.successIconCircle}>
            <Feather name="check" size={32} color={c.primary} />
          </View>
          <Text style={s.successTitle}>Thiết lập phòng hoàn tất</Text>
          <Text style={s.successDesc}>
            Đã tạo thành công{' '}
            {completedSummary.createdTypeCount > 0
              ? `${completedSummary.createdTypeCount} loại phòng mới và `
              : ''}
            {completedSummary.createdRoomCount} phòng cho{' '}
            <Text style={{ fontWeight: '700', color: c.forestInk }}>{propertyName}</Text>.
          </Text>
          <View style={s.successHintBox}>
            <Feather name="eye-off" size={15} color={c.primary} style={{ marginTop: 1 }} />
            <Text style={s.successHintText}>
              Các phòng mới tạo mặc định ở chế độ Riêng tư. Bạn có thể vào menu ⋯ → Chọn phòng công khai trong Danh sách phòng khi sẵn sàng mở cho thuê.
            </Text>
          </View>
          <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
            <PrimaryButton
              title="Về danh sách phòng"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace({
                    pathname: '/host/rooms',
                    params: propertyId != null ? { propertyId: String(propertyId) } : undefined,
                  });
                }
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ---- Guard if property not active or not host ---- */
  if (!host.allowed || !property || property.status !== 'ACTIVE') {
    return (
      <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.header}>
          <AnimatedPressable accessibilityLabel="Quay lại" style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={c.forestInk} />
          </AnimatedPressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Thiết lập phòng nhiều tầng</Text>
          </View>
        </View>
        <View style={s.emptyGuard}>
          <Feather name="home" size={28} color={c.primary} />
          <Text style={s.emptyGuardTitle}>Chưa chọn được nhà trọ đang hoạt động</Text>
          <Text style={s.emptyGuardDesc}>
            Chỉ nhà trọ đã được duyệt và đang hoạt động mới có thể thiết lập phòng nhiều tầng.
          </Text>
          <AnimatedPressable style={s.secondaryBtn} onPress={() => router.back()}>
            <Text style={s.secondaryBtnText}>Quay lại</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  const canProceedStep1 = selectableTypes.length > 0;
  const canProceedStep2 = draftRooms.length > 0 || draftTypes.length > 0;

  const primaryFooterLabel =
    step === 1
      ? 'Tiếp tục: Tạo theo tầng'
      : step === 2
      ? 'Tiếp tục: Gán loại phòng'
      : 'Kiểm tra trước khi lưu';

  const primaryFooterDisabled =
    step === 1 ? !canProceedStep1 : step === 2 ? !canProceedStep2 : !canProceedStep2;

  const handlePrimaryFooterPress = () => {
    if (step === 1) {
      if (!canProceedStep1) return;
      setStep(2);
    } else if (step === 2) {
      if (!canProceedStep2) return;
      setStep(3);
    } else {
      setSubmitError(null);
      setReviewOpen(true);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Compact Header with Property Name + Bước N/3 */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel={step > 1 ? 'Quay lại bước trước' : 'Thoát thiết lập phòng'}
          style={s.backBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Thiết lập phòng nhiều tầng
          </Text>
          <Text style={s.headerProperty} numberOfLines={1}>
            {propertyName}
          </Text>
        </View>
        <View style={s.stepBadge}>
          <Text style={s.stepBadgeText}>Bước {step}/3</Text>
        </View>
      </View>

      {/* Low Step Progress Bar */}
      <View style={s.progressStrip}>
        <View style={s.progressMetaRow}>
          <Text style={s.progressStepTitle}>{STEP_META[step].title}</Text>
          <View style={s.stepPillsRow}>
            {([1, 2, 3] as SetupStep[]).map(n => {
              const active = step === n;
              const reachable =
                n === 1 ||
                (n === 2 && canProceedStep1) ||
                (n === 3 && canProceedStep1 && canProceedStep2);
              return (
                <AnimatedPressable
                  key={n}
                  disabled={!reachable}
                  scaleTo={0.96}
                  accessibilityLabel={`Chuyển đến bước ${n}: ${STEP_META[n].label}`}
                  style={[
                    s.stepMiniPill,
                    active && s.stepMiniPillActive,
                    !reachable && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    if (reachable) {
                      setStep(n);
                      setSelectionMode(false);
                      setSelectedRowIds(new Set());
                    }
                  }}
                >
                  <Text style={[s.stepMiniPillText, active && s.stepMiniPillTextActive]}>
                    {n}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.scrollContent,
            step === 3 && selectionMode && { paddingBottom: 96 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ============================================================== */}
          {/* STEP 1: Chuẩn bị loại phòng                                    */}
          {/* ============================================================== */}
          {step === 1 && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(220)}
              style={{ gap: 14 }}
            >
              {/* Saved Room Types */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>
                      Loại phòng đã lưu ({savedTypes.length})
                    </Text>
                    <Text style={s.cardSub}>
                      {savedTypes.length > 0
                        ? 'Đã có loại phòng phù hợp — bạn có thể bấm Tiếp tục ngay mà không cần tạo mới.'
                        : 'Nhà trọ chưa có loại phòng. Hãy thêm ít nhất 1 loại phòng vào bản nháp.'}
                    </Text>
                  </View>
                </View>

                {savedTypes.length > 0 && (
                  <View style={s.compactList}>
                    {savedTypes.map((item, idx) => (
                      <View
                        key={item.roomTypeId}
                        style={[
                          s.compactTypeRow,
                          idx === savedTypes.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          <Text style={s.compactTypeName} numberOfLines={1}>
                            {item.roomType}
                          </Text>
                          <Text style={s.compactTypeMeta}>
                            {item.areaSqm != null ? `${item.areaSqm} m²` : 'Chưa rõ m²'} ·{' '}
                            {item.capacity} người
                          </Text>
                        </View>
                        <Text style={s.compactTypePrice}>
                          {formatMoneyVnd(item.price)}/tháng
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Draft New Room Types */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>
                      Loại phòng mới trong bản nháp ({draftTypes.length})
                    </Text>
                    <Text style={s.cardSub}>
                      Chưa lưu lên hệ thống cho đến khi bạn xác nhận ở Bước 3.
                    </Text>
                  </View>
                </View>

                {draftTypes.length > 0 && (
                  <View style={s.compactList}>
                    {draftTypes.map((item, idx) => (
                      <View
                        key={item.localId}
                        style={[
                          s.draftTypeRow,
                          idx === draftTypes.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.compactTypeName} numberOfLines={1}>
                              {item.details.roomType}
                            </Text>
                            <View style={s.draftPill}>
                              <Text style={s.draftPillText}>Bản nháp</Text>
                            </View>
                          </View>
                          <Text style={s.compactTypeMeta}>
                            {formatMoneyVnd(item.details.price)}/tháng · {item.details.areaSqm} m² ·{' '}
                            {item.details.capacity} người
                            {item.form.photos.length > 0 ? ` · ${item.form.photos.length} ảnh` : ''}
                          </Text>
                        </View>
                        <View style={s.rowActions}>
                          <AnimatedPressable
                            accessibilityLabel={`Sửa loại phòng nháp ${item.details.roomType}`}
                            style={s.iconBtn}
                            onPress={() => {
                              setEditingDraftType(item);
                              setTypeModalOpen(true);
                            }}
                          >
                            <Feather name="edit-2" size={15} color={c.primary} />
                          </AnimatedPressable>
                          <AnimatedPressable
                            accessibilityLabel={`Xóa loại phòng nháp ${item.details.roomType}`}
                            style={s.iconBtnDanger}
                            onPress={() => handleDeleteDraftType(item)}
                          >
                            <Feather name="trash-2" size={15} color={c.error} />
                          </AnimatedPressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={draftTypes.length >= SETUP_LIMITS.maxNewTypes}
                  style={[
                    s.addTypeOutlineBtn,
                    draftTypes.length >= SETUP_LIMITS.maxNewTypes && { opacity: 0.45 },
                  ]}
                  accessibilityLabel="Thêm loại phòng vào bản nháp"
                  onPress={() => {
                    setEditingDraftType(null);
                    setTypeModalOpen(true);
                  }}
                >
                  <Feather name="plus-circle" size={18} color={c.primary} />
                  <Text style={s.addTypeOutlineText}>Thêm loại phòng</Text>
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}

          {/* ============================================================== */}
          {/* STEP 2: Tạo phòng theo tầng                                    */}
          {/* ============================================================== */}
          {step === 2 && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(220)}
              style={{ gap: 14 }}
            >
              {/* Mode Switcher */}
              <View style={s.segmentWrap}>
                <AnimatedPressable
                  scaleTo={0.98}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: genMode === 'RANGE' }}
                  style={[s.segmentBtn, genMode === 'RANGE' && s.segmentBtnActive]}
                  onPress={() => {
                    setGenMode('RANGE');
                    setStep2Notice(null);
                  }}
                >
                  <Text style={[s.segmentText, genMode === 'RANGE' && s.segmentTextActive]}>
                    Tạo theo dãy tầng
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  scaleTo={0.98}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: genMode === 'EXISTING' }}
                  style={[s.segmentBtn, genMode === 'EXISTING' && s.segmentBtnActive]}
                  onPress={() => {
                    setGenMode('EXISTING');
                    setStep2Notice(null);
                  }}
                >
                  <Text style={[s.segmentText, genMode === 'EXISTING' && s.segmentTextActive]}>
                    Thêm vào tầng đã có
                  </Text>
                </AnimatedPressable>
              </View>

              {/* Generator Form Card */}
              <View style={s.card}>
                {genMode === 'RANGE' ? (
                  <>
                    <Text style={s.cardTitle}>Thông số dãy tầng</Text>
                    <View style={s.twoCol}>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Số tầng *"
                          value={floorCountInput}
                          onChangeText={v => {
                            setFloorCountInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="VD: 3"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Số phòng mỗi tầng *"
                          value={roomsPerFloorInput}
                          onChangeText={v => {
                            setRoomsPerFloorInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="VD: 5"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>
                    <Text style={s.helperNote}>
                      Tầng trống tự bắt đầu từ 01 (VD: 101). Tầng đã có phòng (đã lưu hoặc trong bản nháp) tự đánh tiếp nối tiếp theo.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={s.cardTitle}>Chọn tầng cần thêm phòng</Text>
                    {availableNumericFloors.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.chipsRow}
                      >
                        {availableNumericFloors.map(floorNo => {
                          const active = effectiveExistingFloor === String(floorNo);
                          return (
                            <AnimatedPressable
                              key={floorNo}
                              scaleTo={0.97}
                              style={[s.floorPickChip, active && s.floorPickChipActive]}
                              onPress={() => {
                                setSelectedExistingFloor(String(floorNo));
                                setStep2Notice(null);
                              }}
                            >
                              <Text
                                style={[
                                  s.floorPickChipText,
                                  active && s.floorPickChipTextActive,
                                ]}
                              >
                                Tầng {floorNo}
                              </Text>
                            </AnimatedPressable>
                          );
                        })}
                      </ScrollView>
                    )}

                    <View style={s.twoCol}>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Số tầng *"
                          value={effectiveExistingFloor}
                          onChangeText={v => {
                            setSelectedExistingFloor(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="VD: 2"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Số phòng thêm *"
                          value={extraRoomsInput}
                          onChangeText={v => {
                            setExtraRoomsInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="VD: 3"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* Optional Group Room Type Picker */}
                <View style={{ gap: 8 }}>
                  <Text style={s.fieldSubLabel}>Loại phòng cho đợt này (tùy chọn)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.chipsRow}
                  >
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={[s.typeChip, groupRoomTypeId == null && s.typeChipActive]}
                      onPress={() => setGroupRoomTypeId(null)}
                    >
                      <Text
                        style={[s.typeChipText, groupRoomTypeId == null && s.typeChipTextActive]}
                      >
                        Gán loại sau
                      </Text>
                    </AnimatedPressable>
                    {selectableTypes.map(t => {
                      const active = groupRoomTypeId === t.id;
                      return (
                        <AnimatedPressable
                          key={t.id}
                          scaleTo={0.97}
                          style={[s.typeChip, active && s.typeChipActive]}
                          onPress={() => setGroupRoomTypeId(t.id)}
                        >
                          <Text
                            style={[s.typeChipText, active && s.typeChipTextActive]}
                            numberOfLines={1}
                          >
                            {t.roomType}
                            {t.isDraft ? ' (Nháp)' : ''}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Collapsible Advanced Numbering Options */}
                <View style={s.advancedBox}>
                  <AnimatedPressable
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: advancedOpen }}
                    style={s.advancedHeader}
                    onPress={() => setAdvancedOpen(prev => !prev)}
                  >
                    <Feather name="sliders" size={15} color={c.primary} />
                    <Text style={s.advancedTitle}>Tùy chọn nâng cao (tiền tố, tầng bắt đầu, chẵn/lẻ)</Text>
                    <Feather
                      name={advancedOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={c.textSecondary}
                    />
                  </AnimatedPressable>

                  {advancedOpen && (
                    <View style={s.advancedBody}>
                      <View style={s.twoCol}>
                        <View style={{ flex: 1 }}>
                          <AuthInput
                            label="Tiền tố mã phòng"
                            value={prefixInput}
                            onChangeText={setPrefixInput}
                            placeholder="VD: P. hoặc A-"
                            maxLength={SETUP_LIMITS.maxPrefixLength}
                          />
                        </View>
                        {genMode === 'RANGE' && (
                          <View style={{ flex: 1 }}>
                            <AuthInput
                              label="Tầng bắt đầu"
                              value={fromFloorInput}
                              onChangeText={v => setFromFloorInput(sanitizeDigitsInput(v))}
                              placeholder="1"
                              keyboardType="number-pad"
                              maxLength={3}
                            />
                          </View>
                        )}
                      </View>

                      <AuthInput
                        label="Số thứ tự bắt đầu (để trống để tự đánh tiếp)"
                        value={manualStartSeqInput}
                        onChangeText={v => setManualStartSeqInput(sanitizeDigitsInput(v))}
                        placeholder="Tự động (01 hoặc tiếp nối phòng đã có)"
                        keyboardType="number-pad"
                        maxLength={4}
                      />

                      <View style={{ gap: 8 }}>
                        <Text style={s.fieldSubLabel}>Kiểu đánh số</Text>
                        <View style={s.numberingRow}>
                          {(
                            [
                              { key: 'ALL', label: 'Liên tiếp' },
                              { key: 'ODD', label: 'Số lẻ' },
                              { key: 'EVEN', label: 'Số chẵn' },
                            ] as const
                          ).map(opt => {
                            const active = numberingStyle === opt.key;
                            return (
                              <AnimatedPressable
                                key={opt.key}
                                scaleTo={0.97}
                                style={[s.numChip, active && s.numChipActive]}
                                onPress={() => setNumberingStyle(opt.key)}
                              >
                                <Text style={[s.numChipText, active && s.numChipTextActive]}>
                                  {opt.label}
                                </Text>
                              </AnimatedPressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Compact Live Preview */}
                <View style={s.previewBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="eye" size={15} color={c.primary} />
                    <Text style={s.previewLabel}>Xem trước đợt này</Text>
                  </View>
                  {batchPreview.error ? (
                    <Text style={s.previewError}>{batchPreview.error}</Text>
                  ) : (
                    <Text style={s.previewValue}>{formatBatchPreview(batchPreview.rows)}</Text>
                  )}
                  {previewCollisionCount > 0 && (
                    <Text style={s.previewWarn}>
                      Lưu ý: Có {previewCollisionCount} mã phòng trùng với phòng đã lưu hoặc bản nháp (bạn có thể đổi mã ở Bước 3 hoặc để trống số bắt đầu để tự nối tiếp).
                    </Text>
                  )}
                </View>

                {step2Notice && (
                  <View style={s.inlineBanner}>
                    <Feather name="check-circle" size={15} color={c.primary} />
                    <Text style={s.inlineBannerText}>{step2Notice}</Text>
                  </View>
                )}

                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={Boolean(batchPreview.error) || batchPreview.rows.length === 0}
                  style={[
                    s.addBatchBtn,
                    (Boolean(batchPreview.error) || batchPreview.rows.length === 0) && {
                      opacity: 0.45,
                    },
                  ]}
                  onPress={handleAddBatchToDraft}
                >
                  <Feather name="plus" size={17} color="#FFFFFF" />
                  <Text style={s.addBatchBtnText}>Thêm vào bản nháp</Text>
                </AnimatedPressable>
              </View>

              {/* Added Draft Batches List (Compact) */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>
                      Phòng đã thêm vào bản nháp ({draftRooms.length})
                    </Text>
                    <Text style={s.cardSub}>
                      Bạn có thể thêm nhiều đợt nếu các tầng có số phòng khác nhau.
                    </Text>
                  </View>
                </View>

                {draftRooms.length === 0 ? (
                  <Text style={s.emptyInlineText}>
                    Chưa có phòng nào trong bản nháp. Nhấn “Thêm vào bản nháp” ở trên để bắt đầu.
                  </Text>
                ) : (
                  <View style={s.compactList}>
                    {batches.map((batch, idx) => {
                      const batchRows = draftRooms.filter(r => r.batchId === batch.batchId);
                      if (batchRows.length === 0) return null;
                      return (
                        <View
                          key={batch.batchId}
                          style={[
                            s.batchRow,
                            idx === batches.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                            <Text style={s.batchTitle}>{batch.label}</Text>
                            <Text style={s.batchPreviewText} numberOfLines={1}>
                              {formatBatchPreview(batchRows)}
                            </Text>
                          </View>
                          <AnimatedPressable
                            accessibilityLabel={`Xóa đợt ${batch.label} khỏi bản nháp`}
                            style={s.iconBtnDanger}
                            onPress={() => handleRemoveBatch(batch.batchId)}
                          >
                            <Feather name="trash-2" size={15} color={c.error} />
                          </AnimatedPressable>
                        </View>
                      );
                    })}
                    {/* Rooms added via + Phòng lẻ in Step 3 */}
                    {(() => {
                      const batchIdSet = new Set(batches.map(b => b.batchId));
                      const singleRows = draftRooms.filter(r => !batchIdSet.has(r.batchId));
                      if (singleRows.length === 0) return null;
                      return (
                        <View style={[s.batchRow, { borderBottomWidth: 0 }]}>
                          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                            <Text style={s.batchTitle}>Phòng lẻ đã thêm</Text>
                            <Text style={s.batchPreviewText} numberOfLines={1}>
                              {formatBatchPreview(singleRows)}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ============================================================== */}
          {/* STEP 3: Gán loại phòng và kiểm tra                             */}
          {/* ============================================================== */}
          {step === 3 && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(220)}
              style={{ gap: 12 }}
            >
              {/* Floor Picker Chips */}
              {draftFloorLabels.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipsRow}
                >
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={[
                      s.floorTabChip,
                      effectiveActiveFloor === 'ALL' && s.floorTabChipActive,
                    ]}
                    onPress={() => setActiveFloorFilter('ALL')}
                  >
                    <Text
                      style={[
                        s.floorTabText,
                        effectiveActiveFloor === 'ALL' && s.floorTabTextActive,
                      ]}
                    >
                      Tất cả ({draftRooms.length})
                    </Text>
                  </AnimatedPressable>
                  {draftFloorLabels.map(floorLabel => {
                    const count = draftRooms.filter(r => r.floor === floorLabel).length;
                    const hasFloorIssue = validation.issues.some(i => i.floor === floorLabel);
                    const active = effectiveActiveFloor === floorLabel;
                    return (
                      <AnimatedPressable
                        key={floorLabel}
                        scaleTo={0.97}
                        style={[s.floorTabChip, active && s.floorTabChipActive]}
                        onPress={() => setActiveFloorFilter(floorLabel)}
                      >
                        <Text style={[s.floorTabText, active && s.floorTabTextActive]}>
                          {formatFloorDisplay(floorLabel)} ({count})
                        </Text>
                        {hasFloorIssue && (
                          <View
                            style={[
                              s.issueDot,
                              active && { backgroundColor: '#FFD166' },
                            ]}
                          />
                        )}
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Search + Needs Attention + Add Single Room */}
              <View style={s.step3Controls}>
                <View style={s.searchBox}>
                  <Feather name="search" size={16} color={c.textSecondary} />
                  <TextInput
                    value={searchCode}
                    onChangeText={setSearchCode}
                    placeholder="Tìm mã phòng…"
                    placeholderTextColor={c.placeholder}
                    accessibilityLabel="Tìm mã phòng trong bản nháp"
                    style={s.searchInput}
                  />
                  {searchCode.length > 0 && (
                    <AnimatedPressable
                      accessibilityLabel="Xóa từ khóa tìm kiếm"
                      onPress={() => setSearchCode('')}
                    >
                      <Feather name="x" size={15} color={c.textSecondary} />
                    </AnimatedPressable>
                  )}
                </View>

                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.addSingleBtn}
                  accessibilityLabel="Thêm một phòng lẻ vào tầng đang xem"
                  onPress={() => setAddSingleOpen(true)}
                >
                  <Feather name="plus" size={15} color={c.primary} />
                  <Text style={s.addSingleBtnText}>Phòng lẻ</Text>
                </AnimatedPressable>
              </View>

              {/* Quick Actions Bar: Needs Attention / Scope Assign / Multi-select / Undo */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsRow}
              >
                <AnimatedPressable
                  scaleTo={0.97}
                  style={[s.toolChip, onlyNeedsAttention && s.toolChipWarnActive]}
                  onPress={() => setOnlyNeedsAttention(prev => !prev)}
                >
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={onlyNeedsAttention ? '#FFFFFF' : validation.issues.length > 0 ? c.error : c.textSecondary}
                  />
                  <Text
                    style={[
                      s.toolChipText,
                      onlyNeedsAttention && { color: '#FFFFFF' },
                      !onlyNeedsAttention && validation.issues.length > 0 && { color: c.error },
                    ]}
                  >
                    Cần xử lý ({validation.issues.length})
                  </Text>
                </AnimatedPressable>

                {draftRooms.length > 0 && (
                  <>
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.toolChip}
                      onPress={() => setBulkModalMode('SCOPE')}
                    >
                      <Feather name="layers" size={14} color={c.primary} />
                      <Text style={[s.toolChipText, { color: c.primary }]}>
                        Gán theo phạm vi
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      scaleTo={0.97}
                      style={[s.toolChip, selectionMode && s.toolChipActive]}
                      onPress={() => {
                        setSelectionMode(prev => !prev);
                        setSelectedRowIds(new Set());
                      }}
                    >
                      <Feather
                        name={selectionMode ? 'x-square' : 'check-square'}
                        size={14}
                        color={selectionMode ? '#FFFFFF' : c.forestInk}
                      />
                      <Text
                        style={[
                          s.toolChipText,
                          selectionMode && { color: '#FFFFFF' },
                        ]}
                      >
                        {selectionMode ? 'Xong chọn nhiều' : 'Chọn nhiều'}
                      </Text>
                    </AnimatedPressable>
                  </>
                )}

                {undoStack.length > 0 && (
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={s.undoChip}
                    accessibilityLabel="Hoàn tác lần gán loại gần nhất"
                    onPress={handleUndoLastAssign}
                  >
                    <Feather name="rotate-ccw" size={14} color={c.primaryDark} />
                    <Text style={s.undoChipText}>Hoàn tác</Text>
                  </AnimatedPressable>
                )}
              </ScrollView>

              {step3Banner && (
                <View style={s.inlineBanner}>
                  <Feather name="check-circle" size={15} color={c.primary} />
                  <Text style={s.inlineBannerText}>{step3Banner}</Text>
                  <AnimatedPressable onPress={() => setStep3Banner(null)}>
                    <Feather name="x" size={14} color={c.primaryDark} />
                  </AnimatedPressable>
                </View>
              )}

              {/* Selection Mode Helper Bar */}
              {selectionMode && filteredStep3Rooms.length > 0 && (
                <View style={s.selectHelperRow}>
                  <Text style={s.selectHelperText}>
                    Đã chọn {selectedRowIds.size} phòng
                  </Text>
                  <AnimatedPressable onPress={toggleSelectAllVisible}>
                    <Text style={s.selectAllLink}>
                      {allVisibleSelected
                        ? 'Bỏ chọn tất cả'
                        : `Chọn tất cả đang hiện (${filteredStep3Rooms.length})`}
                    </Text>
                  </AnimatedPressable>
                </View>
              )}

              {/* Room Rows List */}
              {draftRooms.length === 0 ? (
                <View style={s.emptyStep3Card}>
                  <Feather name="grid" size={24} color={c.primary} />
                  <Text style={s.emptyStep3Title}>Chưa có phòng trong bản nháp</Text>
                  <Text style={s.emptyStep3Desc}>
                    {draftTypes.length > 0
                      ? 'Bạn có thể tạo riêng các loại phòng mới vừa chuẩn bị, hoặc quay lại Bước 2 / bấm + Phòng lẻ để thêm phòng.'
                      : 'Quay lại Bước 2 để tạo phòng theo tầng hoặc bấm + Phòng lẻ để thêm phòng.'}
                  </Text>
                </View>
              ) : filteredStep3Rooms.length === 0 ? (
                <View style={s.emptyStep3Card}>
                  <Feather name="search" size={22} color={c.primary} />
                  <Text style={s.emptyStep3Title}>Không có phòng khớp bộ lọc</Text>
                  <AnimatedPressable
                    style={s.secondaryBtn}
                    onPress={() => {
                      setSearchCode('');
                      setOnlyNeedsAttention(false);
                      setActiveFloorFilter('ALL');
                    }}
                  >
                    <Text style={s.secondaryBtnText}>Xem tất cả phòng nháp</Text>
                  </AnimatedPressable>
                </View>
              ) : (
                <View style={s.roomRowsCard}>
                  {filteredStep3Rooms.map((row, idx) => {
                    const assigned =
                      row.roomTypeId != null ? typeById.get(row.roomTypeId) : null;
                    const issue = validation.issueByRowId[row.rowId];
                    const selected = selectedRowIds.has(row.rowId);

                    return (
                      <AnimatedPressable
                        key={row.rowId}
                        scaleTo={0.99}
                        style={[
                          s.roomRow,
                          idx === filteredStep3Rooms.length - 1 && { borderBottomWidth: 0 },
                          selected && s.roomRowSelected,
                        ]}
                        onPress={() => {
                          if (selectionMode) {
                            toggleSelectRow(row.rowId);
                          } else {
                            setEditingRow(row);
                          }
                        }}
                      >
                        {selectionMode && (
                          <View style={[s.checkbox, selected && s.checkboxChecked]}>
                            {selected && <Feather name="check" size={13} color="#FFFFFF" />}
                          </View>
                        )}

                        <View style={s.roomCodeBadge}>
                          <Text style={s.roomCodeText}>{row.roomNumber || '—'}</Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          {assigned ? (
                            <Text style={s.roomTypeText} numberOfLines={1}>
                              {assigned.roomType}
                            </Text>
                          ) : (
                            <Text style={s.roomUnassignedText}>Chưa gán loại</Text>
                          )}

                          <Text
                            style={[
                              s.roomSubMeta,
                              issue && issue.code !== 'MISSING_TYPE' && { color: c.error },
                            ]}
                            numberOfLines={1}
                          >
                            {issue && issue.code !== 'MISSING_TYPE'
                              ? issue.message
                              : effectiveActiveFloor === 'ALL'
                              ? `${formatFloorDisplay(row.floor)}${
                                  assigned ? ` · ${formatMoneyVnd(assigned.price)}/tháng` : ''
                                }`
                              : assigned
                              ? `${formatMoneyVnd(assigned.price)}/tháng`
                              : 'Chạm để chọn loại phòng hoặc sửa mã'}
                          </Text>
                        </View>

                        {!selectionMode && (
                          <Feather
                            name={issue ? 'alert-circle' : 'chevron-right'}
                            size={16}
                            color={issue ? c.error : c.textMuted}
                          />
                        )}
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Selection Mode Action Bar (Step 3 only when selectionMode ON) */}
        {step === 3 && selectionMode && (
          <View style={s.selectionBar}>
            <View style={{ flex: 1 }}>
              <Text style={s.selectionBarCount}>Đã chọn {selectedRowIds.size} phòng</Text>
              <Text style={s.selectionBarHint}>
                {selectedRowIds.size > 0
                  ? 'Chỉ cập nhật các phòng đã chọn'
                  : 'Chạm vào hàng phòng để chọn'}
              </Text>
            </View>
            <AnimatedPressable
              scaleTo={0.97}
              disabled={selectedRowIds.size === 0}
              style={[
                s.selectionAssignBtn,
                selectedRowIds.size === 0 && { opacity: 0.45 },
              ]}
              onPress={() => setBulkModalMode('SELECTED')}
            >
              <Text style={s.selectionAssignText}>Gán loại</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Unified Sticky Footer: Live Draft Status + Single Primary CTA */}
        <View style={s.footer}>
          <View style={s.footerStatsRow}>
            <Text style={s.footerStatText}>
              <Text style={s.footerStatStrong}>{draftTypes.length}</Text> loại mới ·{' '}
              <Text style={s.footerStatStrong}>{draftRooms.length}</Text> phòng nháp
              {step === 3 && draftRooms.length > 0 ? (
                <>
                  {' · '}
                  <Text
                    style={[
                      s.footerStatStrong,
                      validation.unassignedCount > 0 && { color: '#B45309' },
                    ]}
                  >
                    {validation.unassignedCount}
                  </Text>{' '}
                  chưa gán
                </>
              ) : null}
            </Text>
            {step === 3 && validation.duplicateCount > 0 && (
              <Text style={s.footerDupText}>{validation.duplicateCount} trùng mã</Text>
            )}
          </View>
          <PrimaryButton
            title={primaryFooterLabel}
            disabled={primaryFooterDisabled}
            onPress={handlePrimaryFooterPress}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Step 1 Full-Height Child Modal: Add / Edit Draft Room Type */}
      <RoomSetupTypeModal
        visible={typeModalOpen}
        propertyId={property.propertyId}
        propertyName={propertyName}
        savedTypes={savedTypes}
        draftTypes={draftTypes}
        editing={editingDraftType}
        onClose={() => {
          setTypeModalOpen(false);
          setEditingDraftType(null);
        }}
        onSaveDraft={handleSaveDraftType}
      />

      {/* Step 3 Sheets */}
      <DraftRoomEditSheet
        visible={Boolean(editingRow)}
        row={editingRow}
        issue={editingRow ? validation.issueByRowId[editingRow.rowId] : undefined}
        selectableTypes={selectableTypes}
        onClose={() => setEditingRow(null)}
        onSave={handleEditSingleRow}
        onDelete={handleDeleteSingleRow}
      />

      <AddSingleDraftRoomSheet
        visible={addSingleOpen}
        defaultFloorLabel={effectiveActiveFloor}
        existingAndDraftRooms={existingAndDraftRooms}
        selectableTypes={selectableTypes}
        onClose={() => setAddSingleOpen(false)}
        onAdd={handleAddSingleRoom}
      />

      <BulkAssignTypeSheet
        visible={bulkModalMode != null}
        mode={bulkModalMode || 'SCOPE'}
        activeFloor={effectiveActiveFloor}
        draftRooms={draftRooms}
        selectedRowIds={selectedRowIds}
        selectableTypes={selectableTypes}
        onClose={() => setBulkModalMode(null)}
        onApply={handleApplyScopedAssign}
      />

      {/* Review Before Submit Modal (within Step 3, NOT a 4th step) */}
      <SetupReviewModal
        visible={reviewOpen}
        propertyName={propertyName}
        draftTypes={draftTypes}
        draftRooms={draftRooms}
        selectableTypes={selectableTypes}
        issues={validation.issues}
        busy={submitting}
        submitError={submitError}
        ambiguousAttempt={ambiguousAttempt}
        reconciling={reconciling}
        reconcileNote={reconcileNote}
        onClose={() => setReviewOpen(false)}
        onJumpToRow={handleJumpToRowFromReview}
        onReconcile={() => {
          void handleReconcileServer();
        }}
        onConfirmCreate={() => {
          void handleConfirmCreate();
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: c.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: c.forestInk,
  },
  headerProperty: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.primary,
    marginTop: 1,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
  },
  progressStrip: {
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 8,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressStepTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  stepPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepMiniPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMiniPillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  stepMiniPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  stepMiniPillTextActive: {
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E3EBE8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  cardSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
    marginTop: 2,
  },
  compactList: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  compactTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  draftTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  compactTypeName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  compactTypeMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  compactTypePrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  draftPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: authRadius.round,
    backgroundColor: '#FFF3DF',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  draftPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9A6315',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF0EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTypeOutlineBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.primary,
    backgroundColor: c.softMint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addTypeOutlineText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.primary,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#EBF1EE',
    borderRadius: authRadius.md,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentBtnActive: {
    backgroundColor: c.surface,
    shadowColor: '#142D29',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  segmentTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  helperNote: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  fieldSubLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  floorPickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  floorPickChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  floorPickChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  floorPickChipTextActive: {
    color: '#FFFFFF',
  },
  typeChip: {
    maxWidth: 210,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  typeChipActive: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  typeChipTextActive: {
    color: c.primaryDark,
    fontWeight: '700',
  },
  advancedBox: {
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    overflow: 'hidden',
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  advancedTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  advancedBody: {
    padding: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 12,
  },
  numberingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numChipActive: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  numChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  numChipTextActive: {
    color: c.primaryDark,
    fontWeight: '700',
  },
  previewBox: {
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
    padding: 12,
    gap: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
  },
  previewValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  previewError: {
    fontSize: 13,
    color: c.error,
    fontWeight: '600',
  },
  previewWarn: {
    fontSize: 12,
    lineHeight: 17,
    color: '#9A6315',
    marginTop: 2,
  },
  addBatchBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBatchBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  inlineBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.primaryDark,
  },
  emptyInlineText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  batchPreviewText: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  floorTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  floorTabChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  floorTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  floorTabTextActive: {
    color: '#FFFFFF',
  },
  issueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.error,
  },
  step3Controls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.forestInk,
    paddingVertical: 8,
  },
  addSingleBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addSingleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  toolChipActive: {
    backgroundColor: c.forestInk,
    borderColor: c.forestInk,
  },
  toolChipWarnActive: {
    backgroundColor: c.error,
    borderColor: c.error,
  },
  toolChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  undoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: '#FFF3DF',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  undoChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7A4D0D',
  },
  selectHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  selectHelperText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  selectAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  roomRowsCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  roomRowSelected: {
    backgroundColor: c.softMint,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  roomCodeBadge: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.sm,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  roomCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.forestInk,
  },
  roomTypeText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  roomUnassignedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  roomSubMeta: {
    fontSize: 12,
    color: c.textSecondary,
  },
  emptyStep3Card: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyStep3Title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  emptyStep3Desc: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 10,
    backgroundColor: c.forestInk,
  },
  selectionBarCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectionBarHint: {
    fontSize: 12,
    color: '#C7DBD6',
  },
  selectionAssignBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
  },
  selectionAssignText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 8,
  },
  footerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerStatText: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  footerStatStrong: {
    fontWeight: '800',
    color: c.forestInk,
  },
  footerDupText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.error,
  },
  successWrap: {
    flex: 1,
    paddingHorizontal: authSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.forestInk,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 14.5,
    lineHeight: 22,
    color: c.textSecondary,
    textAlign: 'center',
  },
  successHintBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    width: '100%',
  },
  successHintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  emptyGuard: {
    flex: 1,
    paddingHorizontal: authSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyGuardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  emptyGuardDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    marginTop: 6,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
});
