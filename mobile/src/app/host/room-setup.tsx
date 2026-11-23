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
import { Image } from 'expo-image';
import { AuthInput } from '@/components/auth/auth-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useManagedProperty } from '@/components/host/management-ui';
import {
  AddSingleDraftRoomSheet,
  BulkAssignTypeSheet,
  DraftRoomEditSheet,
  QuickTypePickSheet,
  SetupReviewModal,
} from '@/components/host/room-setup-sheets';
import { RoomSetupTypeModal } from '@/components/host/room-setup-type-modal';
import { useReducedMotionPreference } from '@/constants/motion';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { getApiBase, resolveImageUrl } from '@/services/accommodations';
import { tokenStore } from '@/services/auth';
import { HostError, type HostRoomType } from '@/services/host';
import { formatMoneyVnd } from '@/services/host-room-types';
import {
  SETUP_LIMITS,
  applyScopedTypeAssignment,
  buildSetupRequest,
  collectNumericFloors,
  combineSelectableRoomTypes,
  countUsedSavedTypes,
  extractDraftFloorLabels,
  formatBatchPreview,
  formatFloorDisplay,
  generateExistingFloorBatch,
  generateFloorRangeBatch,
  groupPreviewByFloor,
  parseRoomSetupDraft,
  reconcileDraftAgainstServer,
  roomKey,
  roomIdentityKey,
  sanitizeDigitsInput,
  serializeRoomSetupDraft,
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
  clearRoomSetupDraft,
  isLocalFileAvailable,
  readRoomSetupDraft,
  writeRoomSetupDraft,
} from '@/services/room-setup-draft';
import {
  fetchLatestHostInventory,
  submitRoomLayoutJson,
  submitRoomSetupMultipart,
} from '@/services/room-setup-upload';

type SetupStep = 1 | 2 | 3;
type FloorGenMode = 'RANGE' | 'EXISTING';

const STEP_ITEMS: readonly { step: SetupStep; label: string }[] = [
  { step: 1, label: 'Loại phòng' },
  { step: 2, label: 'Tạo theo tầng' },
  { step: 3, label: 'Gán loại phòng' },
];

function savedTypeThumbSource(item: HostRoomType, imageToken: string | null) {
  const firstImg = item.images?.[0];
  if (firstImg?.imageId) {
    return {
      uri: `${getApiBase()}/api/host/room-types/${item.roomTypeId}/images/${firstImg.imageId}`,
      headers: imageToken ? { Authorization: `Bearer ${imageToken}` } : undefined,
    };
  }
  const url = resolveImageUrl(item.imageUrl);
  if (url) return { uri: url };
  return null;
}

function formatSavedTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function MultiFloorRoomSetupScreen() {
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const { user } = useAuth();
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const { property } = useManagedProperty(params.propertyId);
  const propertyId = property?.propertyId ?? null;
  const propertyName = property?.name || 'Nhà trọ đang quản lý';
  const userId = user?.userId ?? null;

  const allStoreRoomTypes = host.data.roomTypes?.roomTypes;
  const allStoreRooms = host.data.rooms?.rooms;

  const savedTypes = useMemo(() => {
    if (propertyId == null) return [];
    return (allStoreRoomTypes || []).filter(t => t.propertyId === propertyId);
  }, [allStoreRoomTypes, propertyId]);

  const savedRooms = useMemo(() => {
    if (propertyId == null) return [];
    return (allStoreRooms || []).filter(r => r.propertyId === propertyId);
  }, [allStoreRooms, propertyId]);

  // Persistent 3-step draft state
  const [step, setStep] = useState<SetupStep>(1);
  // null means "not customized yet -> default all saved types selected"
  const [selectedSavedIdsOverride, setSelectedSavedIdsOverride] = useState<number[] | null>(null);
  const [draftTypes, setDraftTypes] = useState<DraftNewRoomType[]>([]);
  const [draftRooms, setDraftRooms] = useState<DraftRoomRow[]>([]);
  const [batches, setBatches] = useState<DraftBatchSummary[]>([]);
  const nextLocalTypeIdRef = useRef(-1);
  const nextBatchIndexRef = useRef(1);

  // Local draft storage status (never claims saved unless writeRoomSetupDraft succeeded)
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastPersistedAt, setLastPersistedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftStorageBanner, setDraftStorageBanner] = useState<string | null>(null);
  const [draftStorageError, setDraftStorageError] = useState<string | null>(null);
  const restoredForKeyRef = useRef<string | null>(null);

  // Step 1 modal state
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingDraftType, setEditingDraftType] = useState<DraftNewRoomType | null>(null);

  // Step 2 generator form state
  const [genMode, setGenMode] = useState<FloorGenMode>('RANGE');
  const [fromFloorInput, setFromFloorInput] = useState('1');
  const [floorCountInput, setFloorCountInput] = useState('3');
  const [roomsPerFloorInput, setRoomsPerFloorInput] = useState('4');
  const [startSeqInput, setStartSeqInput] = useState(''); // empty = default 01 / auto-continue existing
  const [selectedExistingFloor, setSelectedExistingFloor] = useState<string>('');
  const [extraRoomsInput, setExtraRoomsInput] = useState('2');
  const [groupRoomTypeId, setGroupRoomTypeId] = useState<number | null>(null);
  const [numberingAccordionOpen, setNumberingAccordionOpen] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [numberingStyle, setNumberingStyle] = useState<RoomNumberingStyle>('ALL');
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [step2Notice, setStep2Notice] = useState<string | null>(null);

  // Step 3 assign & filter state
  const [activeFloorFilter, setActiveFloorFilter] = useState<string>('ALL');
  const [searchCode, setSearchCode] = useState('');
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [undoStack, setUndoStack] = useState<AssignmentSnapshot[]>([]);
  const [step3Banner, setStep3Banner] = useState<string | null>(null);

  // Modals & sheets
  const [quickPickRow, setQuickPickRow] = useState<DraftRoomRow | null>(null);
  const [editingRow, setEditingRow] = useState<DraftRoomRow | null>(null);
  const [addSingleOpen, setAddSingleOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'SELECTED' | 'SCOPE' | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Final submit & reconciliation state
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

  // Restore saved local draft on mount for (userId, propertyId)
  useEffect(() => {
    if (userId == null || propertyId == null) return;
    const restoreKey = `${userId}:${propertyId}`;
    if (restoredForKeyRef.current === restoreKey) return;
    restoredForKeyRef.current = restoreKey;

    let cancelled = false;
    void (async () => {
      try {
        const raw = await readRoomSetupDraft(userId, propertyId);
        if (cancelled || !raw) return;
        const { draft, droppedPhotoCount, nextLocalTypeId } = parseRoomSetupDraft(
          raw,
          propertyId,
          isLocalFileAvailable
        );
        if (!draft) return;

        nextLocalTypeIdRef.current = nextLocalTypeId;
        setStep(draft.step);
        setSelectedSavedIdsOverride(draft.selectedSavedTypeIds);
        setDraftTypes(draft.draftTypes);
        setBatches(draft.batches);
        setDraftRooms(draft.draftRooms);
        setLastPersistedAt(draft.savedAt);
        setHasUnsavedChanges(false);

        const timeLabel = formatSavedTime(draft.savedAt);
        setDraftStorageBanner(
          droppedPhotoCount > 0
            ? `Đã khôi phục bản nháp${timeLabel ? ` lúc ${timeLabel}` : ''} (${droppedPhotoCount} ảnh tạm không còn trên máy, hãy chọn lại nếu cần).`
            : `Đã khôi phục bản nháp đã lưu${timeLabel ? ` lúc ${timeLabel}` : ''}.`
        );
      } catch {
        // Silently ignore corrupted storage without crashing the flow
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propertyId, userId]);

  // Effective selected saved types
  const selectedSavedTypeIds = useMemo(() => {
    const validSavedIds = new Set(savedTypes.map(t => t.roomTypeId));
    if (selectedSavedIdsOverride === null) {
      return savedTypes.map(t => t.roomTypeId);
    }
    return selectedSavedIdsOverride.filter(id => validSavedIds.has(id));
  }, [savedTypes, selectedSavedIdsOverride]);

  const selectedSavedSet = useMemo(
    () => new Set(selectedSavedTypeIds),
    [selectedSavedTypeIds]
  );

  const selectedSavedTypes = useMemo(
    () => savedTypes.filter(t => selectedSavedSet.has(t.roomTypeId)),
    [savedTypes, selectedSavedSet]
  );

  const selectableTypes = useMemo(
    () => combineSelectableRoomTypes(selectedSavedTypes, draftTypes),
    [selectedSavedTypes, draftTypes]
  );

  const typeById = useMemo(
    () => new Map(selectableTypes.map(item => [item.id, item])),
    [selectableTypes]
  );

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

  const usedSavedTypesCount = useMemo(
    () => countUsedSavedTypes(draftRooms, savedTypes),
    [draftRooms, savedTypes]
  );

  const assignedRoomsCount = draftRooms.length - validation.unassignedCount;

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

  // Step 2 live preview + floor-grouped chips
  const batchPreview = useMemo(() => {
    const manualSeq = startSeqInput.trim() ? Number(startSeqInput.trim()) : null;
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
        batchId: 'preview',
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
      batchId: 'preview',
    });
  }, [
    effectiveExistingFloor,
    existingAndDraftRooms,
    extraRoomsInput,
    floorCountInput,
    fromFloorInput,
    genMode,
    groupRoomTypeId,
    numberingStyle,
    prefixInput,
    roomsPerFloorInput,
    startSeqInput,
  ]);

  const previewFloorGroups = useMemo(
    () => groupPreviewByFloor(batchPreview.rows),
    [batchPreview.rows]
  );

  const previewCollisionCount = useMemo(() => {
    if (!batchPreview.rows.length) return 0;
    const existingKeys = new Set(existingAndDraftRooms.map(r => roomIdentityKey(r.roomNumber)));
    return batchPreview.rows.filter(r => existingKeys.has(roomIdentityKey(r.roomNumber))).length;
  }, [batchPreview.rows, existingAndDraftRooms]);

  const markDirty = () => {
    setHasUnsavedChanges(true);
    setDraftStorageError(null);
  };

  /* ---- Local Draft Save / Clear ---- */
  const handleSaveLocalDraft = async () => {
    if (userId == null || propertyId == null || savingDraft) return;
    setSavingDraft(true);
    setDraftStorageError(null);
    try {
      const savedAt = new Date().toISOString();
      const serialized = serializeRoomSetupDraft({
        propertyId,
        step,
        selectedSavedTypeIds,
        draftTypes,
        batches,
        draftRooms,
        savedAt,
      });
      await writeRoomSetupDraft(userId, propertyId, serialized);
      if (!mountedRef.current) return;
      setLastPersistedAt(savedAt);
      setHasUnsavedChanges(false);
      setDraftStorageBanner(`Đã lưu bản nháp vào máy lúc ${formatSavedTime(savedAt)}.`);
    } catch (err) {
      if (!mountedRef.current) return;
      setDraftStorageError(
        err instanceof Error ? err.message : 'Không thể lưu bản nháp cục bộ. Vui lòng thử lại.'
      );
    } finally {
      if (mountedRef.current) setSavingDraft(false);
    }
  };

  const handleClearSavedDraft = () => {
    Alert.alert(
      'Xóa bản nháp đã lưu?',
      'Thao tác này xóa toàn bộ loại phòng nháp và danh sách phòng nháp đang làm cho nhà trọ này.',
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Xóa nháp',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (userId != null && propertyId != null) {
                try {
                  await clearRoomSetupDraft(userId, propertyId);
                } catch {
                  /* Best effort */
                }
              }
              if (!mountedRef.current) return;
              setStep(1);
              setSelectedSavedIdsOverride(null);
              setDraftTypes([]);
              setDraftRooms([]);
              setBatches([]);
              setUndoStack([]);
              setLastPersistedAt(null);
              setHasUnsavedChanges(false);
              setDraftStorageBanner(null);
              setStep2Notice(null);
              setStep3Banner(null);
            })();
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as SetupStep);
      setSelectionMode(false);
      setSelectedRowIds(new Set());
      return;
    }
    if (hasUnsavedChanges && (draftTypes.length > 0 || draftRooms.length > 0) && !completedSummary) {
      Alert.alert(
        'Có thay đổi chưa lưu nháp',
        'Bạn có muốn lưu bản nháp vào máy trước khi thoát để tiếp tục sau không?',
        [
          { text: 'Ở lại', style: 'cancel' },
          {
            text: 'Thoát không lưu',
            style: 'destructive',
            onPress: () => router.back(),
          },
          {
            text: 'Lưu nháp & thoát',
            onPress: () => {
              void (async () => {
                await handleSaveLocalDraft();
                if (mountedRef.current) router.back();
              })();
            },
          },
        ]
      );
      return;
    }
    router.back();
  };

  /* ---- Step 1 handlers ---- */
  const toggleSavedType = (item: HostRoomType) => {
    const currentlySelected = selectedSavedSet.has(item.roomTypeId);
    if (!currentlySelected) {
      setSelectedSavedIdsOverride([...selectedSavedTypeIds, item.roomTypeId]);
      markDirty();
      return;
    }

    const linkedCount = draftRooms.filter(r => r.roomTypeId === item.roomTypeId).length;
    const applyDeselect = () => {
      setSelectedSavedIdsOverride(selectedSavedTypeIds.filter(id => id !== item.roomTypeId));
      if (groupRoomTypeId === item.roomTypeId) setGroupRoomTypeId(null);
      if (linkedCount > 0) {
        setDraftRooms(prev =>
          prev.map(r => (r.roomTypeId === item.roomTypeId ? { ...r, roomTypeId: null } : r))
        );
      }
      markDirty();
    };

    if (linkedCount > 0) {
      Alert.alert(
        'Bỏ chọn loại phòng đã gán?',
        `Loại "${item.roomType}" đang được gán cho ${linkedCount} phòng trong bản nháp. Nếu bỏ chọn, các phòng đó sẽ chuyển về Chưa gán loại.`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Bỏ chọn & gỡ gán', style: 'destructive', onPress: applyDeselect },
        ]
      );
      return;
    }
    applyDeselect();
  };

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
    markDirty();
    setTypeModalOpen(false);
    setEditingDraftType(null);
  };

  const handleDeleteDraftType = (target: DraftNewRoomType) => {
    const linkedCount = draftRooms.filter(r => r.roomTypeId === target.localId).length;
    const applyDelete = () => {
      setDraftTypes(prev => prev.filter(item => item.localId !== target.localId));
      if (groupRoomTypeId === target.localId) setGroupRoomTypeId(null);
      if (linkedCount > 0) {
        setDraftRooms(prev =>
          prev.map(r => (r.roomTypeId === target.localId ? { ...r, roomTypeId: null } : r))
        );
      }
      markDirty();
    };

    if (linkedCount > 0) {
      Alert.alert(
        'Xóa loại phòng đang được gán?',
        `Loại "${target.details.roomType}" đang được gán cho ${linkedCount} phòng trong bản nháp. Xóa loại này sẽ chuyển các phòng liên quan về trạng thái Chưa gán loại.`,
        [
          { text: 'Giữ lại', style: 'cancel' },
          { text: 'Xóa loại phòng', style: 'destructive', onPress: applyDelete },
        ]
      );
      return;
    }
    applyDelete();
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
    markDirty();
    setStep2Notice(
      `Đã thêm ${committedRows.length} phòng vào bản nháp (${formatBatchPreview(committedRows)}).`
    );
    if (startSeqInput.trim()) {
      setStartSeqInput('');
    }
  };

  const handleRemoveBatch = (batchId: string) => {
    setDraftRooms(prev => prev.filter(r => r.batchId !== batchId));
    setBatches(prev => prev.filter(b => b.batchId !== batchId));
    markDirty();
  };

  /* ---- Step 3 handlers ---- */
  const handleQuickAssignSingle = (rowId: string, nextTypeId: number | null) => {
    const target = draftRooms.find(r => r.rowId === rowId);
    if (!target || target.roomTypeId === nextTypeId) return;
    const typeName = nextTypeId != null ? typeById.get(nextTypeId)?.roomType : null;
    const snapshot: AssignmentSnapshot = {
      label: typeName
        ? `Gán ${target.roomNumber} → ${typeName}`
        : `Bỏ gán loại phòng ${target.roomNumber}`,
      previousTypes: { [rowId]: target.roomTypeId },
    };
    setDraftRooms(prev =>
      prev.map(row => (row.rowId === rowId ? { ...row, roomTypeId: nextTypeId } : row))
    );
    setUndoStack(prev => [snapshot, ...prev].slice(0, 12));
    markDirty();
  };

  const handleEditSingleRow = (
    rowId: string,
    next: { roomNumber: string; floor: string; roomTypeId: number | null }
  ) => {
    setDraftRooms(prev =>
      prev.map(row => (row.rowId === rowId ? { ...row, ...next } : row))
    );
    markDirty();
  };

  const handleDeleteSingleRow = (rowId: string) => {
    setDraftRooms(prev => prev.filter(row => row.rowId !== rowId));
    setSelectedRowIds(prev => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    markDirty();
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
    markDirty();
    const msg = `Đã thêm phòng lẻ ${next.roomNumber} (${formatFloorDisplay(next.floor)}) vào bản nháp.`;
    if (step === 2) setStep2Notice(msg);
    else setStep3Banner(msg);
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
    setUndoStack(prev => [result.snapshot!, ...prev].slice(0, 12));
    setStep3Banner(`Đã cập nhật ${result.affectedCount} phòng (${scopeLabel}).`);
    markDirty();
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
    markDirty();
  };

  const handleJumpToFirstIssue = () => {
    const firstIssue = validation.issues[0];
    if (!firstIssue) return;
    const targetRow = draftRooms.find(r => r.rowId === firstIssue.rowId);
    if (!targetRow) return;
    setActiveFloorFilter(targetRow.floor);
    setSearchCode('');
    setOnlyNeedsAttention(true);
    if (firstIssue.code === 'MISSING_TYPE') {
      setQuickPickRow(targetRow);
    } else {
      setEditingRow(targetRow);
    }
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
    const rowIssue = validation.issueByRowId[row.rowId];
    if (rowIssue?.code === 'MISSING_TYPE') {
      setQuickPickRow(row);
    } else {
      setEditingRow(row);
    }
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

      // 1. Pre-submit live re-validation against latest DB state
      const latest = await fetchLatestHostInventory(token, controller.signal);
      if (!mountedRef.current) return;

      const latestPropTypes = latest.roomTypes.filter(t => t.propertyId === propertyId);
      const latestPropRooms = latest.rooms.filter(r => r.propertyId === propertyId);

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

      // 2. Single atomic transactional backend API call
      const req = buildSetupRequest(propertyId, draftTypes, draftRooms);
      if (req.mode === 'SETUP_MULTIPART' && req.setupPayload) {
        await submitRoomSetupMultipart(req.setupPayload, req.photos, token, controller.signal);
      } else if (req.layoutPayload) {
        await submitRoomLayoutJson(req.layoutPayload, token, controller.signal);
      }

      if (!mountedRef.current) return;

      const createdTypeCount = draftTypes.length;
      const createdRoomCount = draftRooms.length;

      // Clear persisted local draft ONLY after backend confirmed creation
      if (userId != null) {
        try {
          await clearRoomSetupDraft(userId, propertyId);
        } catch {
          /* Non-blocking cleanup */
        }
      }

      await host.store.refresh();
      if (!mountedRef.current) return;

      setReviewOpen(false);
      setAmbiguousAttempt(false);
      setHasUnsavedChanges(false);
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
              ? `${completedSummary.createdTypeCount} loại phòng mới${completedSummary.createdRoomCount > 0 ? ' và ' : ''}`
              : ''}
            {completedSummary.createdRoomCount > 0
              ? `${completedSummary.createdRoomCount} phòng`
              : ''}{' '}
            cho <Text style={{ fontWeight: '700', color: c.forestInk }}>{propertyName}</Text>.
          </Text>
          <View style={s.successHintBox}>
            <Feather name="eye-off" size={15} color={c.primary} style={{ marginTop: 1 }} />
            <Text style={s.successHintText}>
              Các phòng mới tạo mặc định ở chế độ Riêng tư. Bạn có thể chọn công khai trong Danh sách phòng khi sẵn sàng mở cho thuê.
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
            <Text style={s.headerTitle}>Thiết lập phòng</Text>
          </View>
        </View>
        <View style={s.emptyGuard}>
          <Feather name="home" size={28} color={c.primary} />
          <Text style={s.emptyGuardTitle}>Chưa chọn được nhà trọ đang hoạt động</Text>
          <Text style={s.emptyGuardDesc}>
            Chỉ nhà trọ đã được duyệt và đang hoạt động mới có thể thiết lập loại phòng và danh sách phòng.
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

  const primaryFooterTitle =
    step === 1
      ? 'Tiếp tục: Tạo theo tầng'
      : step === 2
      ? 'Tiếp tục: Gán loại phòng'
      : 'Kiểm tra & lưu';

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

  const canSaveDraftNow =
    !savingDraft &&
    userId != null &&
    propertyId != null &&
    (hasUnsavedChanges || !lastPersistedAt) &&
    (draftTypes.length > 0 || draftRooms.length > 0 || selectedSavedIdsOverride !== null);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Unified Header: Back | Thiết lập phòng + Property | Lưu nháp */}
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
            Thiết lập phòng
          </Text>
          <Text style={s.headerProperty} numberOfLines={1}>
            {propertyName}
          </Text>
        </View>
        <AnimatedPressable
          scaleTo={0.96}
          disabled={!canSaveDraftNow}
          accessibilityLabel="Lưu bản nháp vào thiết bị"
          style={[
            s.saveDraftBtn,
            lastPersistedAt && !hasUnsavedChanges && s.saveDraftBtnSaved,
            !canSaveDraftNow && !lastPersistedAt && { opacity: 0.45 },
          ]}
          onPress={() => {
            void handleSaveLocalDraft();
          }}
        >
          <Feather
            name={lastPersistedAt && !hasUnsavedChanges ? 'check' : 'bookmark'}
            size={14}
            color={c.primaryDark}
          />
          <Text style={s.saveDraftText}>
            {savingDraft
              ? 'Đang lưu…'
              : lastPersistedAt && !hasUnsavedChanges
              ? 'Đã lưu nháp'
              : 'Lưu nháp'}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Compact Horizontal 3-Step Stepper */}
      <View style={s.stepperWrap}>
        {STEP_ITEMS.map((item, idx) => {
          const active = step === item.step;
          const completed = step > item.step;
          const reachable =
            item.step === 1 ||
            (item.step === 2 && canProceedStep1) ||
            (item.step === 3 && canProceedStep1 && canProceedStep2);
          return (
            <View key={item.step} style={s.stepperItemOuter}>
              <AnimatedPressable
                scaleTo={0.97}
                disabled={!reachable}
                accessibilityRole="tab"
                accessibilityState={{ selected: active, disabled: !reachable }}
                style={[
                  s.stepperTab,
                  active && s.stepperTabActive,
                  !reachable && { opacity: 0.45 },
                ]}
                onPress={() => {
                  if (!reachable) return;
                  setStep(item.step);
                  setSelectionMode(false);
                  setSelectedRowIds(new Set());
                }}
              >
                <View
                  style={[
                    s.stepperDot,
                    active && s.stepperDotActive,
                    completed && s.stepperDotDone,
                  ]}
                >
                  {completed ? (
                    <Feather name="check" size={11} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        s.stepperDotText,
                        (active || completed) && { color: '#FFFFFF' },
                      ]}
                    >
                      {item.step}
                    </Text>
                  )}
                </View>
                <Text
                  style={[s.stepperLabel, active && s.stepperLabelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </AnimatedPressable>
              {idx < STEP_ITEMS.length - 1 && <View style={s.stepperDivider} />}
            </View>
          );
        })}
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
          {/* Persisted Draft Feedback / Error Banner */}
          {draftStorageBanner && (
            <View style={s.draftStatusBanner}>
              <Feather name="bookmark" size={14} color={c.primary} />
              <Text style={s.draftStatusText}>{draftStorageBanner}</Text>
              {lastPersistedAt && (
                <AnimatedPressable onPress={handleClearSavedDraft}>
                  <Text style={s.draftClearLink}>Xóa nháp</Text>
                </AnimatedPressable>
              )}
              <AnimatedPressable
                accessibilityLabel="Đóng thông báo bản nháp"
                onPress={() => setDraftStorageBanner(null)}
              >
                <Feather name="x" size={14} color={c.textSecondary} />
              </AnimatedPressable>
            </View>
          )}
          {draftStorageError && (
            <View style={s.draftErrorBanner}>
              <Feather name="alert-circle" size={14} color={c.error} />
              <Text style={s.draftErrorText}>{draftStorageError}</Text>
            </View>
          )}

          {/* ============================================================== */}
          {/* STEP 1: Chuẩn bị loại phòng                                    */}
          {/* ============================================================== */}
          {step === 1 && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(200)}
              style={{ gap: 14 }}
            >
              <View style={s.stepIntro}>
                <Text style={s.stepHeading}>Chuẩn bị loại phòng</Text>
                <Text style={s.stepSubtitle}>
                  Chọn loại phòng đã có hoặc tạo loại phòng mới.
                </Text>
              </View>

              {/* Saved Room Types (Compact Cards with Thumbnail & Đã chọn / Sử dụng Toggle) */}
              {savedTypes.length > 0 && (
                <View style={s.sectionBlock}>
                  <View style={s.sectionLabelRow}>
                    <Text style={s.sectionLabel}>
                      Loại phòng đã lưu ({selectedSavedTypeIds.length}/{savedTypes.length})
                    </Text>
                  </View>

                  <View style={{ gap: 10 }}>
                    {savedTypes.map(item => {
                      const selected = selectedSavedSet.has(item.roomTypeId);
                      const thumb = savedTypeThumbSource(item, host.imageToken);
                      return (
                        <AnimatedPressable
                          key={item.roomTypeId}
                          scaleTo={0.99}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          style={[s.savedTypeCard, selected && s.savedTypeCardSelected]}
                          onPress={() => toggleSavedType(item)}
                        >
                          {thumb ? (
                            <Image
                              source={thumb}
                              style={s.typeThumb}
                              contentFit="cover"
                              transition={150}
                            />
                          ) : (
                            <View style={s.typeThumbFallback}>
                              <Feather name="home" size={20} color={c.primary} />
                            </View>
                          )}

                          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                            <Text style={s.typeCardName} numberOfLines={1}>
                              {item.roomType}
                            </Text>
                            <Text style={s.typeCardPrice}>
                              {formatMoneyVnd(item.price)}/tháng
                            </Text>
                            <Text style={s.typeCardSpecs}>
                              {item.areaSqm != null ? `${item.areaSqm} m²` : 'Chưa rõ m²'} ·{' '}
                              {item.capacity} người
                            </Text>
                          </View>

                          <View
                            style={[
                              s.selectPill,
                              selected ? s.selectPillActive : s.selectPillIdle,
                            ]}
                          >
                            {selected && <Feather name="check" size={12} color="#FFFFFF" />}
                            <Text
                              style={[
                                s.selectPillText,
                                selected && s.selectPillTextActive,
                              ]}
                            >
                              {selected ? 'Đã chọn' : 'Sử dụng'}
                            </Text>
                          </View>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Draft New Room Types */}
              <View style={s.sectionBlock}>
                <View style={s.sectionLabelRow}>
                  <Text style={s.sectionLabel}>
                    Loại phòng mới trong bản nháp ({draftTypes.length})
                  </Text>
                </View>

                {draftTypes.length > 0 && (
                  <View style={{ gap: 10 }}>
                    {draftTypes.map(item => {
                      const coverUri = item.form.photos[0]?.uri || resolveImageUrl(item.form.imageUrl);
                      const linkedRoomsCount = draftRooms.filter(
                        r => r.roomTypeId === item.localId
                      ).length;
                      return (
                        <View key={item.localId} style={s.draftTypeCard}>
                          {coverUri ? (
                            <Image
                              source={{ uri: coverUri }}
                              style={s.typeThumb}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={s.typeThumbFallback}>
                              <Feather name="layers" size={20} color={c.primary} />
                            </View>
                          )}

                          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={s.typeCardName} numberOfLines={1}>
                                {item.details.roomType}
                              </Text>
                              <View style={s.draftPill}>
                                <Text style={s.draftPillText}>Nháp</Text>
                              </View>
                            </View>
                            <Text style={s.typeCardPrice}>
                              {formatMoneyVnd(item.details.price)}/tháng
                            </Text>
                            <Text style={s.typeCardSpecs}>
                              {item.details.areaSqm} m² · {item.details.capacity} người
                              {item.form.photos.length > 0 ? ` · ${item.form.photos.length} ảnh` : ''}
                              {linkedRoomsCount > 0 ? ` · ${linkedRoomsCount} phòng` : ''}
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
                      );
                    })}
                  </View>
                )}

                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={draftTypes.length >= SETUP_LIMITS.maxNewTypes}
                  style={[
                    s.addTypeOutlineBtn,
                    draftTypes.length >= SETUP_LIMITS.maxNewTypes && { opacity: 0.45 },
                  ]}
                  accessibilityLabel="Thêm loại phòng mới vào bản nháp"
                  onPress={() => {
                    setEditingDraftType(null);
                    setTypeModalOpen(true);
                  }}
                >
                  <Feather name="plus" size={18} color={c.primary} />
                  <Text style={s.addTypeOutlineText}>Thêm loại phòng mới</Text>
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}

          {/* ============================================================== */}
          {/* STEP 2: Tạo theo tầng                                          */}
          {/* ============================================================== */}
          {step === 2 && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(200)}
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

              {/* Short Generator Form */}
              <View style={s.card}>
                {genMode === 'RANGE' ? (
                  <>
                    <View style={s.twoCol}>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Tầng bắt đầu *"
                          value={fromFloorInput}
                          onChangeText={v => {
                            setFromFloorInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="1"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Số tầng *"
                          value={floorCountInput}
                          onChangeText={v => {
                            setFloorCountInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="3"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>

                    <View style={s.twoCol}>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Số phòng mỗi tầng *"
                          value={roomsPerFloorInput}
                          onChangeText={v => {
                            setRoomsPerFloorInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="4"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AuthInput
                          label="Phòng bắt đầu"
                          value={startSeqInput}
                          onChangeText={v => {
                            setStartSeqInput(sanitizeDigitsInput(v));
                            setStep2Notice(null);
                          }}
                          placeholder="01 (tự nối tiếp)"
                          keyboardType="number-pad"
                          maxLength={4}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
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
                          placeholder="2"
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
                          placeholder="2"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* Optional Group Type */}
                <View style={{ gap: 8 }}>
                  <Text style={s.fieldSubLabel}>Loại chung cho nhóm (tùy chọn)</Text>
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

                {/* Accordion: Tùy chỉnh cách đánh số */}
                <View style={s.advancedBox}>
                  <AnimatedPressable
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: numberingAccordionOpen }}
                    style={s.advancedHeader}
                    onPress={() => setNumberingAccordionOpen(prev => !prev)}
                  >
                    <Feather name="sliders" size={15} color={c.primary} />
                    <Text style={s.advancedTitle}>Tùy chỉnh cách đánh số (tiền tố, chẵn/lẻ)</Text>
                    <Feather
                      name={numberingAccordionOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={c.textSecondary}
                    />
                  </AnimatedPressable>

                  {numberingAccordionOpen && (
                    <View style={s.advancedBody}>
                      <AuthInput
                        label="Tiền tố mã phòng (không bắt buộc)"
                        value={prefixInput}
                        onChangeText={setPrefixInput}
                        placeholder="VD: P. hoặc A-"
                        maxLength={SETUP_LIMITS.maxPrefixLength}
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

                {/* Floor-Grouped Chip Preview */}
                <View style={s.previewBox}>
                  <View style={s.previewTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="eye" size={14} color={c.primary} />
                      <Text style={s.previewLabel}>
                        Xem trước ({batchPreview.rows.length} phòng)
                      </Text>
                    </View>
                    {(previewFloorGroups.length > 2 || batchPreview.rows.length > 10) && (
                      <AnimatedPressable onPress={() => setPreviewExpanded(prev => !prev)}>
                        <Text style={s.previewToggleLink}>
                          {previewExpanded ? 'Thu gọn' : 'Xem tất cả'}
                        </Text>
                      </AnimatedPressable>
                    )}
                  </View>

                  {batchPreview.error ? (
                    <Text style={s.previewError}>{batchPreview.error}</Text>
                  ) : (
                    <View style={{ gap: 10, marginTop: 4 }}>
                      {(previewExpanded
                        ? previewFloorGroups
                        : previewFloorGroups.slice(0, 2)
                      ).map(group => {
                        const visibleChips = previewExpanded
                          ? group.rooms
                          : group.rooms.slice(0, 6);
                        const hiddenCount = group.rooms.length - visibleChips.length;
                        return (
                          <View key={group.floor} style={{ gap: 6 }}>
                            <Text style={s.previewFloorTitle}>
                              {group.displayFloor} · {group.rooms.length} phòng
                            </Text>
                            <View style={s.previewChipsWrap}>
                              {visibleChips.map(r => (
                                <View key={r.rowId} style={s.previewCodeChip}>
                                  <Text style={s.previewCodeChipText}>{r.roomNumber}</Text>
                                </View>
                              ))}
                              {hiddenCount > 0 && (
                                <AnimatedPressable
                                  style={s.previewMoreChip}
                                  onPress={() => setPreviewExpanded(true)}
                                >
                                  <Text style={s.previewMoreChipText}>+{hiddenCount}</Text>
                                </AnimatedPressable>
                              )}
                            </View>
                          </View>
                        );
                      })}
                      {!previewExpanded && previewFloorGroups.length > 2 && (
                        <Text style={s.previewMoreFloorsNote}>
                          …và còn {previewFloorGroups.length - 2} tầng nữa
                        </Text>
                      )}
                    </View>
                  )}

                  {previewCollisionCount > 0 && (
                    <Text style={s.previewWarn}>
                      Lưu ý: Có {previewCollisionCount} mã phòng trùng với phòng đã lưu hoặc bản nháp. Hãy để trống “Phòng bắt đầu” để tự nối tiếp không trùng.
                    </Text>
                  )}
                </View>

                {step2Notice && (
                  <View style={s.inlineBanner}>
                    <Feather name="check-circle" size={15} color={c.primary} />
                    <Text style={s.inlineBannerText}>{step2Notice}</Text>
                  </View>
                )}

                {/* Actions: Thêm dãy vào bản nháp + Thêm phòng lẻ */}
                <View style={{ gap: 8 }}>
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
                    <Text style={s.addBatchBtnText}>Thêm dãy vào bản nháp</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.addSingleOutlineBtn}
                    accessibilityLabel="Thêm một phòng lẻ vào bản nháp"
                    onPress={() => setAddSingleOpen(true)}
                  >
                    <Feather name="plus-circle" size={16} color={c.primary} />
                    <Text style={s.addSingleOutlineText}>Thêm phòng lẻ</Text>
                  </AnimatedPressable>
                </View>
              </View>

              {/* Added Floor Groups in Draft */}
              <View style={s.sectionBlock}>
                <Text style={s.sectionLabel}>
                  Nhóm tầng trong bản nháp ({draftRooms.length} phòng)
                </Text>

                {draftRooms.length === 0 ? (
                  <View style={s.emptyInlineCard}>
                    <Text style={s.emptyInlineText}>
                      Chưa có phòng nào trong bản nháp. Bấm “Thêm dãy vào bản nháp” hoặc “+ Thêm phòng lẻ” ở trên.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {batches.map(batch => {
                      const batchRows = draftRooms.filter(r => r.batchId === batch.batchId);
                      if (batchRows.length === 0) return null;
                      return (
                        <View key={batch.batchId} style={s.batchCard}>
                          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                            <Text style={s.batchTitle}>{batch.label}</Text>
                            <Text style={s.batchPreviewText} numberOfLines={1}>
                              {formatBatchPreview(batchRows)}
                            </Text>
                          </View>
                          <View style={s.rowActions}>
                            <AnimatedPressable
                              accessibilityLabel={`Xem và sửa nhóm ${batch.label}`}
                              style={s.iconBtn}
                              onPress={() => {
                                setActiveFloorFilter(batchRows[0]?.floor || 'ALL');
                                setStep(3);
                              }}
                            >
                              <Feather name="edit-2" size={14} color={c.primary} />
                            </AnimatedPressable>
                            <AnimatedPressable
                              accessibilityLabel={`Xóa nhóm ${batch.label}`}
                              style={s.iconBtnDanger}
                              onPress={() => handleRemoveBatch(batch.batchId)}
                            >
                              <Feather name="trash-2" size={14} color={c.error} />
                            </AnimatedPressable>
                          </View>
                        </View>
                      );
                    })}
                    {(() => {
                      const batchIdSet = new Set(batches.map(b => b.batchId));
                      const singleRows = draftRooms.filter(r => !batchIdSet.has(r.batchId));
                      if (singleRows.length === 0) return null;
                      return (
                        <View style={s.batchCard}>
                          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                            <Text style={s.batchTitle}>Phòng lẻ đã thêm</Text>
                            <Text style={s.batchPreviewText} numberOfLines={1}>
                              {formatBatchPreview(singleRows)}
                            </Text>
                          </View>
                          <AnimatedPressable
                            accessibilityLabel="Xem các phòng lẻ ở bước 3"
                            style={s.iconBtn}
                            onPress={() => {
                              setActiveFloorFilter('ALL');
                              setStep(3);
                            }}
                          >
                            <Feather name="arrow-right" size={14} color={c.primary} />
                          </AnimatedPressable>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ============================================================== */}
          {/* STEP 3: Gán loại phòng                                         */}
          {/* ============================================================== */}
          {step === 3 && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(200)}
              style={{ gap: 12 }}
            >
              {/* Compact 3-Stat Overview Strip: Tổng · Đã gán · Chưa gán */}
              <View style={s.overviewStrip}>
                <View style={s.overviewCell}>
                  <Text style={s.overviewValue}>{draftRooms.length}</Text>
                  <Text style={s.overviewLabel}>Tổng số phòng</Text>
                </View>
                <View style={s.overviewDivider} />
                <View style={s.overviewCell}>
                  <Text style={[s.overviewValue, { color: c.primary }]}>{assignedRoomsCount}</Text>
                  <Text style={s.overviewLabel}>Đã gán</Text>
                </View>
                <View style={s.overviewDivider} />
                <View style={s.overviewCell}>
                  <Text
                    style={[
                      s.overviewValue,
                      validation.unassignedCount > 0 && { color: '#B45309' },
                    ]}
                  >
                    {validation.unassignedCount}
                  </Text>
                  <Text style={s.overviewLabel}>Chưa gán</Text>
                </View>
              </View>

              {/* Validation Readiness Banner */}
              {draftRooms.length > 0 && (
                validation.issues.length > 0 ? (
                  <View style={s.attentionBar}>
                    <Feather name="alert-circle" size={16} color="#B45309" />
                    <Text style={s.attentionText}>
                      Còn <Text style={{ fontWeight: '800' }}>{validation.issues.length} phòng</Text>{' '}
                      cần xử lý trước khi tạo.
                    </Text>
                    <AnimatedPressable
                      scaleTo={0.96}
                      style={s.jumpIssueBtn}
                      onPress={handleJumpToFirstIssue}
                    >
                      <Text style={s.jumpIssueText}>Đến phòng</Text>
                    </AnimatedPressable>
                  </View>
                ) : (
                  <View style={s.readyBar}>
                    <Feather name="check-circle" size={16} color={c.primary} />
                    <Text style={s.readyText}>
                      Tất cả phòng đã đủ loại và hợp lệ — sẵn sàng Kiểm tra & lưu.
                    </Text>
                  </View>
                )
              )}

              {/* Horizontal Floor Filter Chips */}
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

              {/* Search + Add Single Room */}
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
                  accessibilityLabel="Thêm phòng lẻ"
                  onPress={() => setAddSingleOpen(true)}
                >
                  <Feather name="plus" size={15} color={c.primary} />
                  <Text style={s.addSingleBtnText}>Phòng lẻ</Text>
                </AnimatedPressable>
              </View>

              {/* Quick Actions: Gán nhanh · Chọn nhiều · Cần xử lý · Hoàn tác */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsRow}
              >
                {draftRooms.length > 0 && (
                  <>
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.quickAssignPill}
                      onPress={() => setBulkModalMode('SCOPE')}
                    >
                      <Feather name="zap" size={14} color="#FFFFFF" />
                      <Text style={s.quickAssignPillText}>Gán nhanh</Text>
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
                        {selectionMode ? 'Xong chọn' : 'Chọn nhiều'}
                      </Text>
                    </AnimatedPressable>
                  </>
                )}

                <AnimatedPressable
                  scaleTo={0.97}
                  style={[s.toolChip, onlyNeedsAttention && s.toolChipWarnActive]}
                  onPress={() => setOnlyNeedsAttention(prev => !prev)}
                >
                  <Feather
                    name="filter"
                    size={13}
                    color={
                      onlyNeedsAttention
                        ? '#FFFFFF'
                        : validation.issues.length > 0
                        ? c.error
                        : c.textSecondary
                    }
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

                {undoStack.length > 0 && (
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={s.undoChip}
                    accessibilityLabel="Hoàn tác lần gán gần nhất"
                    onPress={handleUndoLastAssign}
                  >
                    <Feather name="rotate-ccw" size={13} color="#7A4D0D" />
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

              {/* Mobile-Native Room Rows (No Desktop Table!) */}
              {draftRooms.length === 0 ? (
                <View style={s.emptyStep3Card}>
                  <Feather name="grid" size={24} color={c.primary} />
                  <Text style={s.emptyStep3Title}>Chưa có phòng trong bản nháp</Text>
                  <Text style={s.emptyStep3Desc}>
                    {draftTypes.length > 0
                      ? 'Bạn có thể tạo trước các loại phòng mới vừa chuẩn bị, hoặc quay lại Bước 2 / bấm + Phòng lẻ để thêm phòng.'
                      : 'Quay lại Bước 2 để sinh phòng theo tầng hoặc bấm + Phòng lẻ.'}
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
                <View style={{ gap: 8 }}>
                  {filteredStep3Rooms.map(row => {
                    const assigned =
                      row.roomTypeId != null ? typeById.get(row.roomTypeId) : null;
                    const issue = validation.issueByRowId[row.rowId];
                    const selected = selectedRowIds.has(row.rowId);

                    return (
                      <AnimatedPressable
                        key={row.rowId}
                        scaleTo={0.995}
                        style={[
                          s.mobileRoomCard,
                          selected && s.mobileRoomCardSelected,
                          issue && issue.code !== 'MISSING_TYPE' && s.mobileRoomCardError,
                        ]}
                        onPress={() => {
                          if (selectionMode) {
                            toggleSelectRow(row.rowId);
                          } else {
                            setQuickPickRow(row);
                          }
                        }}
                      >
                        <View style={s.mobileRoomTop}>
                          {selectionMode && (
                            <View style={[s.checkbox, selected && s.checkboxChecked]}>
                              {selected && <Feather name="check" size={13} color="#FFFFFF" />}
                            </View>
                          )}

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.mobileRoomCode}>{row.roomNumber || '—'}</Text>
                            <Text style={s.mobileRoomFloor}>
                              {formatFloorDisplay(row.floor)}
                            </Text>
                          </View>

                          {!selectionMode && (
                            <AnimatedPressable
                              accessibilityLabel={`Sửa mã hoặc xóa phòng ${row.roomNumber}`}
                              style={s.rowMoreBtn}
                              onPress={() => setEditingRow(row)}
                            >
                              <Feather name="more-horizontal" size={18} color={c.textSecondary} />
                            </AnimatedPressable>
                          )}
                        </View>

                        <View style={s.mobileRoomBottom}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            {issue && issue.code !== 'MISSING_TYPE' ? (
                              <Text style={s.mobileRoomErrText} numberOfLines={2}>
                                {issue.message}
                              </Text>
                            ) : assigned ? (
                              <Text style={s.mobileRoomAssignedName} numberOfLines={1}>
                                {assigned.roomType}
                              </Text>
                            ) : (
                              <Text style={s.mobileRoomUnassigned}>Chưa gán loại</Text>
                            )}
                          </View>

                          {!selectionMode && (
                            <AnimatedPressable
                              scaleTo={0.96}
                              style={[
                                s.inlineActionChip,
                                assigned ? s.inlineActionChipChange : s.inlineActionChipPick,
                              ]}
                              onPress={() => setQuickPickRow(row)}
                            >
                              <Text
                                style={[
                                  s.inlineActionText,
                                  assigned ? s.inlineActionTextChange : s.inlineActionTextPick,
                                ]}
                              >
                                {assigned ? 'Thay đổi' : 'Chọn loại'}
                              </Text>
                            </AnimatedPressable>
                          )}
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Selection Mode Bar (Step 3 only when selectionMode ON) */}
        {step === 3 && selectionMode && (
          <View style={s.selectionBar}>
            <View style={{ flex: 1 }}>
              <Text style={s.selectionBarCount}>Đã chọn {selectedRowIds.size} phòng</Text>
              <Text style={s.selectionBarHint}>
                {selectedRowIds.size > 0
                  ? 'Chỉ cập nhật các phòng đã chọn'
                  : 'Chạm vào thẻ phòng để chọn'}
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

        {/* Unified Sticky Footer */}
        <View style={s.footer}>
          <View style={s.footerStatsRow}>
            <Text style={s.footerStatText}>
              <Text style={s.footerStatStrong}>{selectableTypes.length}</Text> loại dùng ·{' '}
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
            title={primaryFooterTitle}
            disabled={primaryFooterDisabled}
            onPress={handlePrimaryFooterPress}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Step 1 Full-Screen Child Modal */}
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

      {/* Step 2 & 3 Bottom Sheets */}
      <QuickTypePickSheet
        visible={Boolean(quickPickRow)}
        row={quickPickRow}
        selectableTypes={selectableTypes}
        onClose={() => setQuickPickRow(null)}
        onSelectType={handleQuickAssignSingle}
      />

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
        defaultFloorLabel={step === 3 ? effectiveActiveFloor : `Tầng ${fromFloorInput || '1'}`}
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

      {/* Review & Save Sheet inside Step 3 (NO 4th step) */}
      <SetupReviewModal
        visible={reviewOpen}
        propertyName={propertyName}
        draftTypes={draftTypes}
        usedSavedTypesCount={usedSavedTypesCount}
        unassignedCount={validation.unassignedCount}
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
    gap: 10,
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
  saveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  saveDraftBtnSaved: {
    backgroundColor: c.softMint,
    borderColor: '#C5E3DB',
  },
  saveDraftText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  stepperItemOuter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: authRadius.round,
  },
  stepperTabActive: {
    backgroundColor: c.softMint,
  },
  stepperDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E3EBE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDotActive: {
    backgroundColor: c.primary,
  },
  stepperDotDone: {
    backgroundColor: c.primaryDark,
  },
  stepperDotText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.textSecondary,
  },
  stepperLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textSecondary,
    flexShrink: 1,
  },
  stepperLabelActive: {
    color: c.primaryDark,
    fontWeight: '700',
  },
  stepperDivider: {
    width: 8,
    height: 1.5,
    backgroundColor: c.border,
    marginHorizontal: 2,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  draftStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  draftStatusText: {
    flex: 1,
    fontSize: 12.5,
    color: c.primaryDark,
  },
  draftClearLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.error,
  },
  draftErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: authRadius.md,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F3B8B2',
  },
  draftErrorText: {
    flex: 1,
    fontSize: 12.5,
    color: c.error,
  },
  stepIntro: {
    gap: 3,
  },
  stepHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 14,
    color: c.textSecondary,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  savedTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: authRadius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  savedTypeCardSelected: {
    borderColor: c.primary,
    backgroundColor: '#F7FCFA',
  },
  draftTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: authRadius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  typeThumb: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#EAF2EF',
  },
  typeThumbFallback: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  typeCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: c.primary,
  },
  typeCardSpecs: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: authRadius.round,
  },
  selectPillActive: {
    backgroundColor: c.primary,
  },
  selectPillIdle: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.forestInk,
  },
  selectPillTextActive: {
    color: '#FFFFFF',
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
    minHeight: 48,
    borderRadius: authRadius.lg,
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
  card: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 13,
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
    backgroundColor: '#F3FAF7',
    borderWidth: 1,
    borderColor: '#C5E3DB',
    padding: 12,
    gap: 6,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  previewToggleLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  previewFloorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  previewChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewCodeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: '#CFE5DE',
  },
  previewCodeChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  previewMoreChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: c.softMint,
  },
  previewMoreChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  previewMoreFloorsNote: {
    fontSize: 12,
    color: c.textSecondary,
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
  addSingleOutlineBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addSingleOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
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
  emptyInlineCard: {
    padding: 14,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyInlineText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  batchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: authRadius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  batchTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  batchPreviewText: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  overviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 12,
  },
  overviewCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '800',
    color: c.forestInk,
  },
  overviewLabel: {
    fontSize: 11.5,
    color: c.textSecondary,
  },
  overviewDivider: {
    width: 1,
    height: 28,
    backgroundColor: c.border,
  },
  attentionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F1D4A7',
  },
  attentionText: {
    flex: 1,
    fontSize: 13,
    color: '#7A4D0D',
  },
  jumpIssueBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.round,
    backgroundColor: '#B45309',
  },
  jumpIssueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readyBar: {
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
  readyText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.primaryDark,
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
  quickAssignPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
  },
  quickAssignPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
  mobileRoomCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 13,
    gap: 10,
  },
  mobileRoomCardSelected: {
    backgroundColor: c.softMint,
    borderColor: c.primary,
  },
  mobileRoomCardError: {
    borderColor: '#F3B8B2',
  },
  mobileRoomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileRoomCode: {
    fontSize: 16,
    fontWeight: '800',
    color: c.forestInk,
  },
  mobileRoomFloor: {
    fontSize: 12.5,
    color: c.textSecondary,
    marginTop: 1,
  },
  rowMoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileRoomBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFF3F1',
  },
  mobileRoomAssignedName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  mobileRoomUnassigned: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#B45309',
  },
  mobileRoomErrText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.error,
  },
  inlineActionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: authRadius.round,
  },
  inlineActionChipPick: {
    backgroundColor: c.primary,
  },
  inlineActionChipChange: {
    backgroundColor: c.softMint,
  },
  inlineActionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  inlineActionTextPick: {
    color: '#FFFFFF',
  },
  inlineActionTextChange: {
    color: c.primaryDark,
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
