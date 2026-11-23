import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  RoomTypeActionSheet,
  RoomTypeAmenitiesSheet,
  RoomTypeDeleteSheet,
} from '@/components/host/room-type-editor-sheets';
import { RoomTypePhotoEditor } from '@/components/host/room-type-photo-editor';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError, hostRequest, type HostRoomType } from '@/services/host';
import {
  ROOM_AMENITY_LABELS,
  roomAmenityLabel,
  roomTypeInventory,
} from '@/services/host-room-types';
import {
  ROOM_TYPE_MAX_DESCRIPTION_LENGTH,
  ROOM_TYPE_MAX_NAME_LENGTH,
  ROOM_TYPE_SERVICE_FEES,
  activeRoomTypePhotos,
  buildRoomTypeUpdatePayload,
  createEmptyRoomTypeEditorDraft,
  createRoomTypeEditorDraft,
  formatDepositHint,
  formatServiceFeeHint,
  formatVndIntegerInput,
  isRoomTypeDraftDirty,
  parseVndDigitsInput,
  sanitizeAreaInput,
  sanitizeCapacityInput,
  sectionErrorCounts,
  validateRoomTypeEditorDraft,
  type RoomTypeEditorDraft,
  type RoomTypeEditorErrorKey,
} from '@/services/host-room-type-editor';
import {
  createHostType,
  deleteHostRoomType,
  updateHostType,
} from '@/services/host-type-upload';

type EditorTab = 'INFO_PHOTOS' | 'AMENITIES_FEES';

export default function RoomTypeScreen() {
  const params = useLocalSearchParams<{ id?: string; propertyId?: string }>();
  const { user } = useAuth();
  const numericId = params.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;
  const numericPropertyId =
    params.propertyId && /^\d+$/.test(params.propertyId) ? Number(params.propertyId) : NaN;

  return (
    <RoomTypeEditorContent
      key={`${user?.userId || 'guest'}:${numericId ?? 'new'}:${params.propertyId || 'none'}`}
      id={numericId}
      propertyId={numericPropertyId}
    />
  );
}

function RoomTypeEditorContent({
  id,
  propertyId,
}: {
  id?: number;
  propertyId: number;
}) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const isEditMode = typeof id === 'number' && Number.isSafeInteger(id) && id > 0;

  const [activeTab, setActiveTab] = useState<EditorTab>('INFO_PHOTOS');
  const [draft, setDraft] = useState<RoomTypeEditorDraft>(createEmptyRoomTypeEditorDraft);
  const [baseline, setBaseline] = useState<RoomTypeEditorDraft>(createEmptyRoomTypeEditorDraft);
  const [original, setOriginal] = useState<HostRoomType | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<RoomTypeEditorErrorKey, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Unsaved-changes guard & auxiliary sheets
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);
  const [amenitySheetOpen, setAmenitySheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedSuccess, setDeletedSuccess] = useState(false);

  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const saveLock = useRef(false);
  const deleteLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const property = useMemo(() => {
    if (!Number.isSafeInteger(propertyId)) return undefined;
    return (
      host.data.roomTypes?.properties?.find(p => p.propertyId === propertyId) ||
      host.data.properties?.records.find(p => p.propertyId === propertyId)
    );
  }, [host.data.properties?.records, host.data.roomTypes?.properties, propertyId]);

  const siblingRoomTypes = useMemo(
    () => (host.data.roomTypes?.roomTypes || []).filter(item => item.propertyId === propertyId),
    [host.data.roomTypes?.roomTypes, propertyId]
  );

  const propertyRooms = useMemo(
    () => host.data.rooms?.rooms.filter(r => r.propertyId === propertyId),
    [host.data.rooms?.rooms, propertyId]
  );

  useEffect(() => {
    if (!isEditMode || !id) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 20000);

    void (async () => {
      try {
        const token = await tokenStore.get();
        const value = await hostRequest<HostRoomType>(
          `/host/room-types/${id}`,
          token || '',
          controller.signal
        );
        if (Number.isSafeInteger(propertyId) && value.propertyId !== propertyId) {
          throw new Error('Loại phòng không thuộc nhà trọ đã chọn.');
        }
        if (active && !controller.signal.aborted) {
          const initialDraft = createRoomTypeEditorDraft(value);
          setOriginal(value);
          setDraft(initialDraft);
          setBaseline(initialDraft);
          setLoadError(null);
        }
      } catch (e) {
        if (active) {
          setLoadError(
            controller.signal.aborted
              ? 'Tải dữ liệu quá lâu. Vui lòng thử lại.'
              : e instanceof Error
              ? e.message
              : 'Chưa tải được thông tin loại phòng.'
          );
        }
      } finally {
        clearTimeout(timer);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [attempt, id, isEditMode, propertyId]);

  const canEdit = Boolean(
    host.allowed &&
      property &&
      ('status' in property
        ? property.status === 'ACTIVE'
        : ['ACTIVE', 'VISIBLE'].includes(property.displayStatus))
  );

  const dirty = useMemo(() => isRoomTypeDraftDirty(draft, baseline), [draft, baseline]);

  const liveErrors = useMemo(
    () =>
      validateRoomTypeEditorDraft(draft, {
        siblingRoomTypes,
        currentRoomTypeId: id,
      }),
    [draft, id, siblingRoomTypes]
  );

  const isValid = Object.keys(liveErrors).length === 0;
  const photoSummary = useMemo(() => activeRoomTypePhotos(draft), [draft]);

  const visibleErrors = useMemo(() => {
    if (showAllErrors) return liveErrors;
    const filtered: Partial<Record<RoomTypeEditorErrorKey, string>> = {};
    for (const [k, msg] of Object.entries(liveErrors) as [RoomTypeEditorErrorKey, string][]) {
      if (touched[k] || k === 'photos') {
        filtered[k] = msg;
      }
    }
    return filtered;
  }, [liveErrors, showAllErrors, touched]);

  const tabErrorCounts = useMemo(
    () => sectionErrorCounts(showAllErrors ? liveErrors : visibleErrors),
    [liveErrors, showAllErrors, visibleErrors]
  );

  const allTabErrorCounts = useMemo(() => sectionErrorCounts(liveErrors), [liveErrors]);

  const inventory = useMemo(
    () => (original ? roomTypeInventory(original, propertyRooms) : null),
    [original, propertyRooms]
  );

  // Guard back navigation when there are unsaved changes
  usePreventRemove((dirty && !saved && !deletedSuccess) || busy || deleteBusy, ({ repeat }) => {
    if (!busy && !deleteBusy) {
      setDiscardAction(() => repeat);
    }
  });

  useEffect(() => {
    if (saved) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({
          pathname: '/host/room-types',
          params: Number.isSafeInteger(propertyId)
            ? { propertyId: String(propertyId) }
            : undefined,
        });
      }
    }
  }, [propertyId, saved]);

  const markTouched = (key: RoomTypeEditorErrorKey) => {
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const updateField = <K extends keyof RoomTypeEditorDraft>(
    key: K,
    value: RoomTypeEditorDraft[K]
  ) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setSubmitError(null);
    if (key in liveErrors || touched[key as RoomTypeEditorErrorKey]) {
      markTouched(key as RoomTypeEditorErrorKey);
    }
  };

  const navigateWithUnsavedGuard = (action: () => void) => {
    if (dirty && !saved) {
      setDiscardAction(() => action);
      return;
    }
    action();
  };

  const handleBackPress = () => {
    if (busy || deleteBusy) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      navigateWithUnsavedGuard(() => {
        router.replace({
          pathname: '/host/room-types',
          params: Number.isSafeInteger(propertyId)
            ? { propertyId: String(propertyId) }
            : undefined,
        });
      });
    }
  };

  const handleSwitchTab = (next: EditorTab) => {
    if (next === activeTab) return;
    triggerHaptic('selection');
    setActiveTab(next);
    scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  };

  const handleJumpToFirstError = () => {
    setShowAllErrors(true);
    if (allTabErrorCounts.infoErrors > 0) {
      setActiveTab('INFO_PHOTOS');
    } else if (allTabErrorCounts.amenitiesFeesErrors > 0) {
      setActiveTab('AMENITIES_FEES');
    }
    scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  };

  const handleSave = async () => {
    if (saveLock.current || !property || !canEdit || loading || (isEditMode && !original)) {
      return;
    }
    setShowAllErrors(true);
    const errors = validateRoomTypeEditorDraft(draft, {
      siblingRoomTypes,
      currentRoomTypeId: id,
    });
    if (Object.keys(errors).length > 0) {
      triggerHaptic('medium');
      const counts = sectionErrorCounts(errors);
      if (counts.infoErrors > 0 && activeTab !== 'INFO_PHOTOS') {
        setActiveTab('INFO_PHOTOS');
      } else if (counts.infoErrors === 0 && counts.amenitiesFeesErrors > 0 && activeTab !== 'AMENITIES_FEES') {
        setActiveTab('AMENITIES_FEES');
      }
      scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
      return;
    }

    if (isEditMode && !dirty) return;

    saveLock.current = true;
    setBusy(true);
    setSubmitError(null);

    const resolvedPropertyId = original?.propertyId ?? propertyId;
    const payload = buildRoomTypeUpdatePayload(resolvedPropertyId, draft);
    const readyNewPhotos = draft.newPhotos.filter(p => p.status === 'ready');

    try {
      await host.store.mutate(
        isEditMode && id ? `/host/room-types/${id}` : '/host/room-types',
        payload,
        isEditMode ? 'PUT' : 'POST',
        undefined,
        async (token, signal) => {
          if (isEditMode && id && original) {
            // Concurrency check against latest server state before replacing
            const latest = await hostRequest<HostRoomType>(
              `/host/room-types/${id}`,
              token,
              signal
            );
            const latestDraft = createRoomTypeEditorDraft(latest);
            if (
              latest.propertyId !== resolvedPropertyId ||
              isRoomTypeDraftDirty(latestDraft, baseline)
            ) {
              if (mounted.current) {
                setOriginal(latest);
                setDraft(latestDraft);
                setBaseline(latestDraft);
                setTouched({});
                setShowAllErrors(false);
              }
              throw new HostError(
                'Loại phòng vừa được thay đổi ở nơi khác. Đã tải lại dữ liệu mới nhất — vui lòng kiểm tra trước khi lưu lại.',
                409
              );
            }
            return updateHostType(id, payload, token, signal, readyNewPhotos);
          }
          return createHostType(payload, token, signal, readyNewPhotos);
        }
      );

      if (mounted.current) {
        triggerHaptic('success');
        setSaved(true);
      }
    } catch (e) {
      if (mounted.current) {
        triggerHaptic('medium');
        setSubmitError(e instanceof Error ? e.message : 'Chưa thể lưu thay đổi loại phòng.');
      }
    } finally {
      saveLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!id || !original || deleteLock.current) return;
    deleteLock.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await host.store.mutate(
        `/host/room-types/${id}`,
        undefined,
        'DELETE',
        undefined,
        (token, signal) => deleteHostRoomType(id, token, signal)
      );
      if (mounted.current) {
        triggerHaptic('success');
        setDeletedSuccess(true);
        setDeleteOpen(false);
        router.replace({
          pathname: '/host/room-types',
          params: {
            propertyId: String(original.propertyId),
            notice: `Đã xóa loại phòng "${original.roomType}".`,
          },
        });
      }
    } catch (e) {
      if (mounted.current) {
        triggerHaptic('medium');
        setDeleteError(
          e instanceof Error ? e.message : 'Không thể xóa loại phòng. Vui lòng thử lại.'
        );
      }
    } finally {
      deleteLock.current = false;
      if (mounted.current) setDeleteBusy(false);
    }
  };

  const depositHint = useMemo(
    () => formatDepositHint(draft.deposit, draft.price),
    [draft.deposit, draft.price]
  );

  const canSubmit =
    canEdit &&
    !loading &&
    !busy &&
    !deleteBusy &&
    (!isEditMode || dirty) &&
    isValid &&
    !photoSummary.hasPendingUploads &&
    !photoSummary.hasErrorPhotos;

  const totalErrorsCount = Object.keys(liveErrors).length;
  const totalAmenityCatalog = Object.keys(ROOM_AMENITY_LABELS).length;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Custom Mobile Header (Back · Title · Property Name · Overflow Menu) */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          disabled={busy || deleteBusy}
          style={[s.headerIconBtn, (busy || deleteBusy) && { opacity: 0.45 }]}
          onPress={handleBackPress}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {isEditMode ? 'Chỉnh sửa loại phòng' : 'Thêm loại phòng'}
          </Text>
          {property?.name ? (
            <Text style={s.headerSub} numberOfLines={1}>
              {property.name}
            </Text>
          ) : null}
        </View>

        {isEditMode && original ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Tùy chọn loại phòng"
            disabled={busy || deleteBusy}
            style={[s.headerIconBtn, (busy || deleteBusy) && { opacity: 0.45 }]}
            onPress={() => setMenuOpen(true)}
          >
            <Feather name="more-horizontal" size={20} color={c.forestInk} />
          </AnimatedPressable>
        ) : (
          <View style={s.headerSpacer} />
        )}
      </View>

      {!host.allowed ? (
        <View style={s.stateCard}>
          <Feather name="lock" size={26} color={c.textSecondary} />
          <Text style={s.stateTitle}>Bạn không có quyền truy cập</Text>
          <Text style={s.stateSub}>Khu vực này chỉ dành cho tài khoản chủ trọ.</Text>
        </View>
      ) : loading ? (
        <View
          style={s.skeletonWrap}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang tải thông tin loại phòng"
        >
          <View style={[s.skeleton, { height: 44, borderRadius: authRadius.lg }]} />
          <View style={[s.skeleton, { height: 220, borderRadius: 18 }]} />
          <View style={[s.skeleton, { height: 180, borderRadius: 18 }]} />
        </View>
      ) : !property || (isEditMode && !original) ? (
        <View style={s.stateCard} accessibilityRole="alert">
          <Feather name="alert-circle" size={26} color={c.error} />
          <Text style={s.stateTitle}>Chưa tải được loại phòng</Text>
          <Text style={s.stateSub}>
            {loadError || 'Không tìm thấy nhà trọ hoặc loại phòng trong tài khoản này.'}
          </Text>
          <PrimaryButton
            title="Thử lại"
            onPress={() => {
              setLoading(isEditMode);
              setLoadError(null);
              setAttempt(v => v + 1);
              void host.store.refresh();
            }}
          />
        </View>
      ) : (
        <>
          {/* 2-Group Segmented Control (Preserves all form state across switches!) */}
          <View style={s.segmentWrap}>
            <View style={s.segmentTrack} accessibilityRole="tablist">
              <AnimatedPressable
                scaleTo={0.99}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'INFO_PHOTOS' }}
                style={[s.segmentTab, activeTab === 'INFO_PHOTOS' && s.segmentTabActive]}
                onPress={() => handleSwitchTab('INFO_PHOTOS')}
              >
                <Text
                  style={[
                    s.segmentLabel,
                    activeTab === 'INFO_PHOTOS' && s.segmentLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  Thông tin & Hình ảnh
                </Text>
                {tabErrorCounts.infoErrors > 0 && <View style={s.errorDot} />}
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.99}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'AMENITIES_FEES' }}
                style={[s.segmentTab, activeTab === 'AMENITIES_FEES' && s.segmentTabActive]}
                onPress={() => handleSwitchTab('AMENITIES_FEES')}
              >
                <Text
                  style={[
                    s.segmentLabel,
                    activeTab === 'AMENITIES_FEES' && s.segmentLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  Tiện nghi & Chi phí
                </Text>
                {tabErrorCounts.amenitiesFeesErrors > 0 && <View style={s.errorDot} />}
              </AnimatedPressable>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!canEdit && (
                <View style={s.readonlyBanner}>
                  <Feather name="info" size={16} color="#9A5B0A" style={{ marginTop: 1 }} />
                  <Text style={s.readonlyBannerText}>
                    Nhà trọ hiện chưa ở trạng thái Đang hoạt động nên không thể lưu chỉnh sửa loại
                    phòng.
                  </Text>
                </View>
              )}

              <InlineError message={submitError} />

              {/* GROUP 1: Thông tin & Hình ảnh */}
              {activeTab === 'INFO_PHOTOS' && (
                <Animated.View
                  entering={reducedMotion ? undefined : FadeIn.duration(160)}
                  style={{ gap: 14 }}
                >
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Thông tin cơ bản & Giá thuê</Text>

                    {/* Tên loại phòng */}
                    <View style={s.field}>
                      <Text style={s.label}>
                        Tên loại phòng <Text style={s.required}>*</Text>
                      </Text>
                      <TextInput
                        value={draft.roomType}
                        onChangeText={v => updateField('roomType', v)}
                        onBlur={() => markTouched('roomType')}
                        maxLength={ROOM_TYPE_MAX_NAME_LENGTH}
                        editable={!busy && canEdit}
                        placeholder="VD: Phòng khép kín có ban công"
                        placeholderTextColor={c.placeholder}
                        accessibilityLabel="Tên loại phòng"
                        style={[s.input, Boolean(visibleErrors.roomType) && s.inputInvalid]}
                      />
                      <View style={s.metaRow}>
                        <Text style={s.helperText}>Tên dễ nhận biết cho người thuê (3–100 ký tự)</Text>
                        <Text style={s.counterText}>
                          {draft.roomType.trim().length}/{ROOM_TYPE_MAX_NAME_LENGTH}
                        </Text>
                      </View>
                      {visibleErrors.roomType ? (
                        <FieldError message={visibleErrors.roomType} />
                      ) : null}
                    </View>

                    {/* Diện tích + Sức chứa */}
                    <View style={s.twoColRow}>
                      <View style={[s.field, { flex: 1 }]}>
                        <Text style={s.label}>
                          Diện tích <Text style={s.required}>*</Text>
                        </Text>
                        <View
                          style={[
                            s.unitInputWrap,
                            Boolean(visibleErrors.areaSqm) && s.inputInvalid,
                          ]}
                        >
                          <TextInput
                            value={draft.areaSqm}
                            onChangeText={v => updateField('areaSqm', sanitizeAreaInput(v))}
                            onBlur={() => markTouched('areaSqm')}
                            keyboardType="decimal-pad"
                            maxLength={8}
                            editable={!busy && canEdit}
                            placeholder="25"
                            placeholderTextColor={c.placeholder}
                            accessibilityLabel="Diện tích mét vuông"
                            style={s.unitInput}
                          />
                          <Text style={s.unitSuffix}>m²</Text>
                        </View>
                        {visibleErrors.areaSqm ? (
                          <FieldError message={visibleErrors.areaSqm} />
                        ) : null}
                      </View>

                      <View style={[s.field, { flex: 1 }]}>
                        <Text style={s.label}>
                          Sức chứa tối đa <Text style={s.required}>*</Text>
                        </Text>
                        <View
                          style={[
                            s.unitInputWrap,
                            Boolean(visibleErrors.capacity) && s.inputInvalid,
                          ]}
                        >
                          <TextInput
                            value={draft.capacity}
                            onChangeText={v => updateField('capacity', sanitizeCapacityInput(v))}
                            onBlur={() => markTouched('capacity')}
                            keyboardType="number-pad"
                            maxLength={2}
                            editable={!busy && canEdit}
                            placeholder="2"
                            placeholderTextColor={c.placeholder}
                            accessibilityLabel="Sức chứa tối đa"
                            style={s.unitInput}
                          />
                          <Text style={s.unitSuffix}>người</Text>
                        </View>
                        {visibleErrors.capacity ? (
                          <FieldError message={visibleErrors.capacity} />
                        ) : null}
                      </View>
                    </View>

                    {/* Giá thuê niêm yết */}
                    <View style={s.field}>
                      <Text style={s.label}>
                        Giá thuê niêm yết <Text style={s.required}>*</Text>
                      </Text>
                      <View
                        style={[
                          s.unitInputWrap,
                          Boolean(visibleErrors.price) && s.inputInvalid,
                        ]}
                      >
                        <TextInput
                          value={formatVndIntegerInput(draft.price)}
                          onChangeText={v => updateField('price', parseVndDigitsInput(v))}
                          onBlur={() => markTouched('price')}
                          keyboardType="number-pad"
                          maxLength={14}
                          editable={!busy && canEdit}
                          placeholder="VD: 3.500.000"
                          placeholderTextColor={c.placeholder}
                          accessibilityLabel="Giá thuê niêm yết đồng mỗi tháng"
                          style={[s.unitInput, s.moneyInput]}
                        />
                        <Text style={s.unitSuffix}>đ/tháng</Text>
                      </View>
                      {visibleErrors.price ? (
                        <FieldError message={visibleErrors.price} />
                      ) : null}
                    </View>

                    {/* Tiền đặt cọc */}
                    <View style={s.field}>
                      <Text style={s.label}>Tiền đặt cọc</Text>
                      <View
                        style={[
                          s.unitInputWrap,
                          Boolean(visibleErrors.deposit) && s.inputInvalid,
                        ]}
                      >
                        <TextInput
                          value={formatVndIntegerInput(draft.deposit)}
                          onChangeText={v => updateField('deposit', parseVndDigitsInput(v))}
                          onBlur={() => markTouched('deposit')}
                          keyboardType="number-pad"
                          maxLength={14}
                          editable={!busy && canEdit}
                          placeholder="Theo giá thuê (1 tháng)"
                          placeholderTextColor={c.placeholder}
                          accessibilityLabel="Tiền đặt cọc đồng"
                          style={[s.unitInput, s.moneyInput]}
                        />
                        <Text style={s.unitSuffix}>đ</Text>
                      </View>
                      <Text
                        style={[
                          s.helperText,
                          depositHint.tone === 'free' && { color: c.primaryDark, fontWeight: '600' },
                          depositHint.tone === 'active' && { color: c.forestInk, fontWeight: '600' },
                          depositHint.tone === 'error' && { color: c.error },
                        ]}
                      >
                        {depositHint.text}
                      </Text>
                      {visibleErrors.deposit ? (
                        <FieldError message={visibleErrors.deposit} />
                      ) : null}
                    </View>

                    {/* Mô tả loại phòng */}
                    <View style={s.field}>
                      <Text style={s.label}>Mô tả loại phòng</Text>
                      <TextInput
                        value={draft.description}
                        onChangeText={v => updateField('description', v)}
                        onBlur={() => markTouched('description')}
                        multiline
                        numberOfLines={4}
                        maxLength={ROOM_TYPE_MAX_DESCRIPTION_LENGTH}
                        editable={!busy && canEdit}
                        textAlignVertical="top"
                        placeholder="Mô tả không gian, nội thất, hướng phòng hoặc điểm nổi bật..."
                        placeholderTextColor={c.placeholder}
                        accessibilityLabel="Mô tả loại phòng"
                        style={[
                          s.textarea,
                          Boolean(visibleErrors.description) && s.inputInvalid,
                        ]}
                      />
                      <View style={s.metaRow}>
                        <Text style={s.helperText}>Hiển thị trên trang chi tiết phòng</Text>
                        <Text style={s.counterText}>
                          {draft.description.length}/{ROOM_TYPE_MAX_DESCRIPTION_LENGTH}
                        </Text>
                      </View>
                      {visibleErrors.description ? (
                        <FieldError message={visibleErrors.description} />
                      ) : null}
                    </View>

                    {/* Inheritance Protection Notice */}
                    <View style={s.inheritanceNote}>
                      <Feather name="shield" size={14} color={c.primary} style={{ marginTop: 2 }} />
                      <Text style={s.inheritanceNoteText}>
                        Cập nhật chỉ áp dụng cho cấu hình loại phòng. Giá riêng từng phòng, hợp
                        đồng đã ký và phiếu thu đã phát hành không bị ghi đè.
                      </Text>
                    </View>
                  </View>

                  {/* Photo Gallery Section */}
                  <RoomTypePhotoEditor
                    roomTypeId={id}
                    draft={draft}
                    imageToken={host.imageToken}
                    disabled={busy || !canEdit}
                    error={visibleErrors.photos}
                    onChangeImages={updater => {
                      setDraft(prev => {
                        const next = updater({
                          existingImages: prev.existingImages,
                          newPhotos: prev.newPhotos,
                        });
                        return {
                          ...prev,
                          existingImages: next.existingImages,
                          newPhotos: next.newPhotos,
                        };
                      });
                      setSubmitError(null);
                    }}
                  />
                </Animated.View>
              )}

              {/* GROUP 2: Tiện nghi & Chi phí */}
              {activeTab === 'AMENITIES_FEES' && (
                <Animated.View
                  entering={reducedMotion ? undefined : FadeIn.duration(160)}
                  style={{ gap: 14 }}
                >
                  {/* Tiện nghi trong phòng */}
                  <View style={s.card}>
                    <View style={s.cardHeaderRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.cardTitle}>Tiện nghi trong phòng</Text>
                        <Text style={s.helperText}>
                          Chọn đầy đủ trang bị thực tế thuộc loại phòng này
                        </Text>
                      </View>
                      <View style={s.pillCounter}>
                        <Text style={s.pillCounterText}>
                          {draft.amenities.length}/{totalAmenityCatalog}
                        </Text>
                      </View>
                    </View>

                    {draft.amenities.length > 0 ? (
                      <View style={s.amenityChipsWrap}>
                        {draft.amenities.map(key => (
                          <View key={key} style={s.amenityChip}>
                            <Feather name="check" size={12} color={c.primary} />
                            <Text style={s.amenityChipText}>{roomAmenityLabel(key)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={s.emptyAmenitiesBox}>
                        <Feather name="check-square" size={18} color={c.textMuted} />
                        <Text style={s.emptyAmenitiesText}>
                          Chưa chọn tiện nghi nào cho loại phòng này.
                        </Text>
                      </View>
                    )}

                    {visibleErrors.amenities ? (
                      <FieldError message={visibleErrors.amenities} />
                    ) : null}

                    <AnimatedPressable
                      scaleTo={0.98}
                      disabled={busy || !canEdit}
                      accessibilityRole="button"
                      accessibilityLabel="Chỉnh sửa tiện nghi"
                      style={[s.editAmenitiesBtn, (busy || !canEdit) && { opacity: 0.5 }]}
                      onPress={() => setAmenitySheetOpen(true)}
                    >
                      <Feather name="sliders" size={15} color={c.primary} />
                      <Text style={s.editAmenitiesBtnText}>Chỉnh sửa tiện nghi</Text>
                    </AnimatedPressable>
                  </View>

                  {/* Chi phí dịch vụ */}
                  <View style={s.card}>
                    <View style={s.cardHeaderRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.cardTitle}>Chi phí dịch vụ</Text>
                        <Text style={s.helperText}>
                          Để trống: chưa thiết lập · Nhập 0: không thu phí
                        </Text>
                      </View>
                      <View style={s.optionalBadge}>
                        <Text style={s.optionalBadgeText}>Tùy chọn</Text>
                      </View>
                    </View>

                    <View style={{ gap: 14 }}>
                      {ROOM_TYPE_SERVICE_FEES.map(fee => {
                        const rawVal = draft[fee.key];
                        const hint = formatServiceFeeHint(rawVal, fee.unit);
                        const fieldErr = visibleErrors[fee.key];
                        return (
                          <View key={fee.key} style={s.field}>
                            <View style={s.feeLabelRow}>
                              <Text style={s.label}>{fee.label}</Text>
                              <Text
                                style={[
                                  s.feeSemanticText,
                                  hint.tone === 'free' && { color: c.primaryDark },
                                  hint.tone === 'active' && { color: c.forestInk },
                                  hint.tone === 'error' && { color: c.error },
                                ]}
                              >
                                {hint.text}
                              </Text>
                            </View>
                            <View
                              style={[
                                s.unitInputWrap,
                                Boolean(fieldErr) && s.inputInvalid,
                              ]}
                            >
                              <TextInput
                                value={formatVndIntegerInput(rawVal)}
                                onChangeText={v => updateField(fee.key, parseVndDigitsInput(v))}
                                onBlur={() => markTouched(fee.key)}
                                keyboardType="number-pad"
                                maxLength={14}
                                editable={!busy && canEdit}
                                placeholder={fee.placeholder}
                                placeholderTextColor={c.placeholder}
                                accessibilityLabel={`${fee.label} ${fee.unit}`}
                                style={[s.unitInput, s.moneyInput]}
                              />
                              <View style={s.feeUnitBadge}>
                                <Text style={s.feeUnitText}>{fee.unit}</Text>
                              </View>
                            </View>
                            {fieldErr ? <FieldError message={fieldErr} /> : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              )}
            </ScrollView>

            {/* Sticky Bottom Action Bar (NEVER puts Delete beside Save!) */}
            <View style={s.bottomBar}>
              {dirty && !isValid && totalErrorsCount > 0 ? (
                <AnimatedPressable
                  scaleTo={0.99}
                  style={s.validationPrompt}
                  accessibilityRole="button"
                  onPress={handleJumpToFirstError}
                >
                  <Feather name="alert-circle" size={14} color={c.error} />
                  <Text style={s.validationPromptText} numberOfLines={1}>
                    Còn {totalErrorsCount} mục chưa hợp lệ — chạm để kiểm tra
                  </Text>
                  <Feather name="arrow-right" size={14} color={c.error} />
                </AnimatedPressable>
              ) : null}

              <AnimatedPressable
                scaleTo={0.985}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel={isEditMode ? 'Lưu thay đổi' : 'Tạo loại phòng'}
                accessibilityState={{ disabled: !canSubmit, busy }}
                style={[s.saveBtn, !canSubmit && s.saveBtnDisabled]}
                onPress={() => {
                  void handleSave();
                }}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="check" size={17} color="#FFFFFF" />
                )}
                <Text style={s.saveBtnText}>
                  {busy
                    ? 'Đang lưu thay đổi…'
                    : isEditMode
                    ? 'Lưu thay đổi'
                    : 'Tạo loại phòng'}
                </Text>
              </AnimatedPressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      {/* Grouped Amenities Picker Sheet */}
      <RoomTypeAmenitiesSheet
        visible={amenitySheetOpen}
        selected={draft.amenities}
        onClose={() => setAmenitySheetOpen(false)}
        onApply={next => {
          updateField('amenities', next);
        }}
      />

      {/* Header Secondary Menu Sheet */}
      {isEditMode && original && (
        <RoomTypeActionSheet
          target={menuOpen ? original : null}
          propertyName={property?.name}
          inventory={inventory}
          canEdit={false}
          canDelete={host.allowed}
          showEdit={false}
          showViewDetail
          onClose={() => setMenuOpen(false)}
          onViewDetail={() => {
            navigateWithUnsavedGuard(() => {
              router.replace({
                pathname: '/host/room-type-detail',
                params: {
                  propertyId: String(original.propertyId),
                  id: String(original.roomTypeId),
                },
              });
            });
          }}
          onManageRooms={() => {
            navigateWithUnsavedGuard(() => {
              router.push({
                pathname: '/host/rooms',
                params: {
                  propertyId: String(original.propertyId),
                  roomTypeId: String(original.roomTypeId),
                },
              });
            });
          }}
          onDelete={() => {
            setDeleteError(null);
            setDeleteOpen(true);
          }}
        />
      )}

      {/* Safe Delete Sheet */}
      {isEditMode && original && (
        <RoomTypeDeleteSheet
          target={deleteOpen ? original : null}
          propertyName={property?.name}
          inventory={inventory}
          canManage={host.allowed}
          busy={deleteBusy}
          error={deleteError}
          onClose={() => {
            if (!deleteBusy) {
              setDeleteOpen(false);
              setDeleteError(null);
            }
          }}
          onInspectRooms={() => {
            setDeleteOpen(false);
            setDeleteError(null);
            navigateWithUnsavedGuard(() => {
              router.push({
                pathname: '/host/rooms',
                params: {
                  propertyId: String(original.propertyId),
                  roomTypeId: String(original.roomTypeId),
                },
              });
            });
          }}
          onConfirmDelete={() => {
            void handleConfirmDelete();
          }}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      {discardAction && (
        <ConfirmDialog
          title="Bạn có thay đổi chưa lưu"
          description="Các thay đổi của loại phòng này chưa được lưu. Bạn muốn tiếp tục chỉnh sửa hay bỏ thay đổi?"
          cancelLabel="Tiếp tục chỉnh sửa"
          confirmLabel="Bỏ thay đổi"
          onCancel={() => setDiscardAction(null)}
          onConfirm={() => {
            const leave = discardAction;
            setDiscardAction(null);
            leave();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <View style={s.fieldErrRow} accessibilityRole="alert">
      <Feather name="alert-circle" size={12} color={c.error} style={{ marginTop: 2 }} />
      <Text style={s.fieldErrText}>{message}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: c.textSecondary,
  },
  headerSpacer: {
    width: 42,
  },
  segmentWrap: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: c.background,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#E9F0ED',
    borderRadius: authRadius.lg,
    padding: 4,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: authRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  segmentTabActive: {
    backgroundColor: c.surface,
    shadowColor: '#142D29',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  segmentLabelActive: {
    color: c.primary,
    fontWeight: '700',
  },
  errorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.error,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
  },
  readonlyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF6E7',
    borderWidth: 1,
    borderColor: '#F5DCB0',
    borderRadius: authRadius.md,
    padding: 12,
  },
  readonlyBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8A4F07',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.forestInk,
  },
  required: {
    color: c.error,
  },
  input: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: c.forestInk,
  },
  textarea: {
    minHeight: 104,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
    color: c.forestInk,
  },
  inputInvalid: {
    borderColor: c.error,
    borderWidth: 1.5,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unitInputWrap: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    gap: 8,
  },
  unitInput: {
    flex: 1,
    fontSize: 15,
    color: c.forestInk,
    paddingVertical: 10,
    fontVariant: ['tabular-nums'],
  },
  moneyInput: {
    fontWeight: '700',
  },
  unitSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
  },
  feeUnitBadge: {
    backgroundColor: '#E9F0ED',
    borderRadius: authRadius.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  feeUnitText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    fontVariant: ['tabular-nums'],
  },
  fieldErrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  fieldErrText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.error,
  },
  inheritanceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 11,
  },
  inheritanceNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.primaryDark,
  },
  pillCounter: {
    backgroundColor: c.softMint,
    borderRadius: authRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  amenityChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: authRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amenityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.primaryDark,
  },
  emptyAmenitiesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
  },
  emptyAmenitiesText: {
    flex: 1,
    fontSize: 13,
    color: c.textSecondary,
  },
  editAmenitiesBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editAmenitiesBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  optionalBadge: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.round,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  feeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feeSemanticText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    fontVariant: ['tabular-nums'],
  },
  bottomBar: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: 8,
  },
  validationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: c.errorBackground,
    borderRadius: authRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  validationPromptText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: c.error,
  },
  saveBtn: {
    minHeight: 50,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stateCard: {
    margin: authSpacing.xl,
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
  },
  skeletonWrap: {
    padding: authSpacing.lg,
    gap: 14,
  },
  skeleton: {
    backgroundColor: '#E7EFEA',
  },
});
