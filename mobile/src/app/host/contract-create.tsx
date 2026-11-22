import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ContractDocumentViewer } from '@/components/host/contract-document-viewer';
import { ContractScanSheet } from '@/components/host/contract-scan-sheet';
import { ContractTocSheet } from '@/components/host/contract-sheets';
import {
  ContractStepLease,
  ContractStepParties,
  ContractStepReview,
  ContractStepSource,
} from '@/components/host/contract-wizard-steps';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import {
  createRoomContractApi,
  fetchContractTemplates,
  occupyRoomAndCreateContractApi,
} from '@/services/contract-scan-upload';
import {
  CONTRACT_WIZARD_STEPS,
  buildContractCreatePayload,
  buildContractPreviewRecord,
  createContractWizardDraft,
  firstContractErrorStep,
  parseContractWizardDraft,
  serializeContractWizardDraft,
  validateContractWizardDraft,
  validateContractWizardStep,
  type ContractTemplateCatalog,
  type ContractTemplateId,
  type ContractTemplateItem,
  type ContractWizardDraft,
  type ContractWizardStep,
} from '@/services/contract-wizard';
import {
  clearContractWizardDraft,
  readContractWizardDraft,
  writeContractWizardDraft,
} from '@/services/contract-wizard-draft';
import {
  fetchRoomContractsFull,
  type ContractTocItem,
} from '@/services/rental-contracts';
import {
  fetchRoomTenancyProfile,
  type RoomTenancyProfile,
} from '@/services/room-tenancy';

export default function ContractCreateRoute() {
  const params = useLocalSearchParams<{ roomId?: string; propertyId?: string }>();
  const { user } = useAuth();
  const roomId = params.roomId && /^\d+$/.test(params.roomId) ? Number(params.roomId) : null;

  return (
    <ContractCreateContent
      key={`${user?.userId || 'guest'}:${roomId || 'none'}`}
      roomId={roomId}
    />
  );
}

function ContractCreateContent({ roomId }: { roomId: number | null }) {
  const { user } = useAuth();
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();

  const room = useMemo(
    () => (roomId != null ? host.data.rooms?.rooms.find(r => r.roomId === roomId) : undefined),
    [host.data.rooms?.rooms, roomId]
  );

  const roomType = useMemo(() => {
    if (!room) return undefined;
    return host.data.roomTypes?.roomTypes.find(t => t.roomTypeId === room.roomTypeId);
  }, [host.data.roomTypes?.roomTypes, room]);

  const property = useMemo(() => {
    if (!room) return undefined;
    return (
      host.data.roomTypes?.properties?.find(p => p.propertyId === room.propertyId) ||
      host.data.properties?.records.find(p => p.propertyId === room.propertyId)
    );
  }, [host.data.properties?.records, host.data.roomTypes?.properties, room]);

  const [step, setStep] = useState<ContractWizardStep>(1);
  const [catalog, setCatalog] = useState<ContractTemplateCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);

  const [tenancyProfile, setTenancyProfile] = useState<RoomTenancyProfile | null>(null);
  const [draft, setDraft] = useState<ContractWizardDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedContractId, setSavedContractId] = useState<number | null>(null);

  // Modals & sheets
  const [scanOpen, setScanOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItems, setTocItems] = useState<ContractTocItem[]>([]);
  const [jumpAnchor, setJumpAnchor] = useState<string | null>(null);
  const [jumpNonce, setJumpNonce] = useState(0);
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<ContractTemplateItem | null>(null);

  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const initializedRef = useRef(false);
  const submitLock = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load templates catalog + room tenancy profile
  useEffect(() => {
    if (!host.allowed || roomId == null) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    void (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const token = await tokenStore.get();
        if (!active || !token) return;
        const [loadedCatalog, loadedTenancy] = await Promise.all([
          fetchContractTemplates(token, controller.signal),
          fetchRoomTenancyProfile(roomId, token, controller.signal).catch(() => null),
        ]);
        if (!active) return;
        setCatalog(loadedCatalog);
        if (loadedTenancy) setTenancyProfile(loadedTenancy);
      } catch (err) {
        if (!active) return;
        setCatalogError(
          controller.signal.aborted
            ? 'Tải mẫu hợp đồng quá lâu. Vui lòng thử lại.'
            : err instanceof Error
            ? err.message
            : 'Không tải được danh mục mẫu hợp đồng.'
        );
      } finally {
        clearTimeout(timer);
        if (active) setCatalogLoading(false);
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [catalogAttempt, host.allowed, roomId]);

  // Initialize wizard draft once room + catalog are ready (restoring local draft if present)
  useEffect(() => {
    if (initializedRef.current || !room || !catalog) return;
    initializedRef.current = true;
    let active = true;

    const baseDraft = createContractWizardDraft({
      room,
      roomType,
      user,
      currentTenancy: tenancyProfile?.current ?? null,
      defaultTemplate: catalog.templates[0] ?? null,
      today: tenancyProfile?.today,
    });

    void (async () => {
      if (user?.userId) {
        const raw = await readContractWizardDraft(user.userId, room.roomId);
        if (!active) return;
        const restored = parseContractWizardDraft(raw, room.roomId, baseDraft);
        if (restored) {
          setDraft(restored.draft);
          setStep(restored.step);
          setNotice('Đã khôi phục bản nháp hợp đồng đã lưu trên thiết bị (chưa phát hành).');
          return;
        }
      }
      if (active) setDraft(baseDraft);
    })();

    return () => {
      active = false;
    };
  }, [catalog, room, roomType, tenancyProfile, user]);

  // Guard exit when there are unsaved changes
  usePreventRemove((dirty && savedContractId == null) || busy, ({ repeat }) => {
    if (!busy) setDiscardAction(() => repeat);
  });

  useEffect(() => {
    if (savedContractId != null && roomId != null) {
      router.replace({
        pathname: '/host/contract',
        params: {
          roomId: String(roomId),
          contractId: String(savedContractId),
        },
      });
    }
  }, [roomId, savedContractId]);

  const updateDraftField = <K extends keyof ContractWizardDraft>(
    key: K,
    value: ContractWizardDraft[K]
  ) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
        ...(key === 'reviewed' ? {} : { reviewed: false }),
      };
    });
    setDirty(true);
    setSubmitError(null);
    setErrors(prev => {
      if (!prev[key as string] && !prev.reviewed) return prev;
      const next = { ...prev };
      delete next[key as string];
      if (key !== 'reviewed') delete next.reviewed;
      return next;
    });
  };

  const applyTemplateNow = (template: ContractTemplateItem) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        template: template.id as ContractTemplateId,
        sourceMode: 'template',
        terms: template.terms,
        sourceName: '',
        fullScannedTranscript: '',
        scanFullDocument: false,
        blankValues: {},
        reviewed: false,
      };
    });
    setDirty(true);
    setPendingTemplate(null);
    setErrors(prev => {
      const next = { ...prev };
      delete next.source;
      delete next.terms;
      delete next.reviewed;
      return next;
    });
  };

  const handleRequestSelectTemplate = (template: ContractTemplateItem) => {
    if (!draft) return;
    if (draft.sourceMode === 'template' && draft.template === template.id) return;
    const baseCurrent = catalog?.templates.find(t => t.id === draft.template);
    const hasCustomTerms =
      draft.template === 'OWNER_SCAN' ||
      (Boolean(draft.terms.trim()) && (!baseCurrent || draft.terms.trim() !== baseCurrent.terms.trim()));
    if (hasCustomTerms) {
      setPendingTemplate(template);
      return;
    }
    applyTemplateNow(template);
  };

  const handleApplyScan = (scan: {
    terms: string;
    fullScannedTranscript: string;
    sourceName: string;
    scanFullDocument: boolean;
  }) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        template: 'OWNER_SCAN',
        sourceMode: 'scan',
        terms: scan.terms,
        fullScannedTranscript: scan.fullScannedTranscript,
        sourceName: scan.sourceName,
        scanFullDocument: scan.scanFullDocument,
        blankValues: {},
        reviewed: false,
      };
    });
    setDirty(true);
    setErrors(prev => {
      const next = { ...prev };
      delete next.source;
      delete next.terms;
      return next;
    });
    setNotice('Đã áp dụng mẫu quét đã đối chiếu. Bấm Tiếp tục để nhập thông tin hai bên.');
  };

  const handleSaveLocalDraft = async () => {
    if (!draft || !user?.userId || !room) return;
    try {
      const serialized = serializeContractWizardDraft(step, draft);
      await writeContractWizardDraft(user.userId, room.roomId, serialized);
      setDirty(false);
      triggerHaptic('success');
      setNotice('Đã lưu bản nháp trên thiết bị (chưa phát hành lên hệ thống).');
    } catch {
      triggerHaptic('medium');
      setSubmitError('Không thể lưu bản nháp cục bộ. Vui lòng thử lại.');
    }
  };

  const handleGoStep = (targetStep: ContractWizardStep) => {
    if (!draft || busy || targetStep === step) return;
    if (targetStep > step) {
      const stepErrs = validateContractWizardStep(step, draft, {
        currentTenancy: tenancyProfile?.current ?? null,
        history: tenancyProfile?.history,
      });
      if (Object.keys(stepErrs).length > 0) {
        setErrors(stepErrs);
        triggerHaptic('medium');
        scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
        return;
      }
    }
    triggerHaptic('selection');
    setStep(targetStep);
    scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  };

  const handleNextOrSubmit = async () => {
    if (!draft || !room || busy) return;
    if (step < 4) {
      handleGoStep((step + 1) as ContractWizardStep);
      return;
    }

    if (submitLock.current) return;
    const allErrors = validateContractWizardDraft(draft, {
      currentTenancy: tenancyProfile?.current ?? null,
      history: tenancyProfile?.history,
    });
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      triggerHaptic('medium');
      const errStep = firstContractErrorStep(allErrors);
      if (errStep && errStep !== step) setStep(errStep);
      scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
      return;
    }

    submitLock.current = true;
    setBusy(true);
    setSubmitError(null);
    const payload = buildContractCreatePayload(draft);

    try {
      let createdId: number | null = null;
      const needsStatusOccupy =
        room.status !== 'OCCUPIED' ||
        !room.leaseStartDate ||
        !room.leaseEndDate ||
        room.leaseStartDate !== draft.leaseStartDate ||
        room.leaseEndDate !== draft.leaseEndDate;

      await host.store.mutate(
        needsStatusOccupy ? '/host/rooms/status' : `/host/rental-contracts/rooms/${room.roomId}`,
        payload,
        needsStatusOccupy ? 'PATCH' : 'POST',
        undefined,
        async (token, signal) => {
          if (needsStatusOccupy) {
            await occupyRoomAndCreateContractApi(
              {
                propertyId: room.propertyId,
                roomId: room.roomId,
                leaseStartDate: draft.leaseStartDate,
                leaseEndDate: draft.leaseEndDate,
                contract: payload,
              },
              token,
              signal
            );
            const list = await fetchRoomContractsFull(room.roomId, token, signal);
            createdId = list.find(c => c.status === 'ACTIVE')?.id ?? list[0]?.id ?? null;
          } else {
            const created = await createRoomContractApi(room.roomId, payload, token, signal);
            createdId = created.id;
          }
        }
      );

      if (user?.userId) {
        await clearContractWizardDraft(user.userId, room.roomId);
      }
      if (!mountedRef.current) return;
      triggerHaptic('success');
      if (createdId != null) {
        setSavedContractId(createdId);
      } else {
        router.replace({
          pathname: '/host/room',
          params: {
            id: String(room.roomId),
            tab: 'tenancy',
            notice: 'Đã lưu hợp đồng thuê phòng ở trạng thái Chưa ký.',
          },
        });
      }
    } catch (err) {
      if (mountedRef.current) {
        triggerHaptic('medium');
        setSubmitError(
          err instanceof Error ? err.message : 'Chưa thể lưu hợp đồng. Vui lòng thử lại.'
        );
      }
    } finally {
      submitLock.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const previewRecord = useMemo(() => {
    if (!draft || !room) return null;
    return buildContractPreviewRecord(draft, {
      roomNumber: room.roomNumber,
      propertyName: property?.name,
      propertyAddress: property?.address,
    });
  }, [draft, property?.address, property?.name, room]);

  const handleBackHeader = () => {
    if (busy) return;
    if (router.canGoBack()) router.back();
    else if (roomId != null) router.replace({ pathname: '/host/room', params: { id: String(roomId) } });
    else router.replace('/host/rooms');
  };

  const activeContractExists = Boolean(tenancyProfile?.current?.contractId);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header: Back · Lập hợp đồng thuê phòng · Phòng X · Tên nhà trọ */}
      <View style={s.header}>
        <AnimatedPressable
          disabled={busy}
          accessibilityLabel="Quay lại"
          style={s.backBtn}
          onPress={handleBackHeader}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Lập hợp đồng thuê phòng
          </Text>
          {room ? (
            <Text style={s.headerSub} numberOfLines={1}>
              Phòng {room.roomNumber}
              {property?.name ? ` · ${property.name}` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {!host.allowed ? (
        <View style={s.stateCard}>
          <Feather name="lock" size={24} color={c.textSecondary} />
          <Text style={s.stateTitle}>Bạn không có quyền truy cập</Text>
          <Text style={s.stateSub}>Chỉ tài khoản chủ trọ mới được lập hợp đồng thuê phòng.</Text>
        </View>
      ) : !room ? (
        <View style={s.stateCard}>
          <Feather name="key" size={24} color={c.primary} />
          <Text style={s.stateTitle}>Không tìm thấy phòng</Text>
          <Text style={s.stateSub}>Vui lòng mở lại từ danh sách hoặc chi tiết phòng.</Text>
        </View>
      ) : activeContractExists ? (
        <View style={s.stateCard}>
          <Feather name="file-text" size={26} color={c.primary} />
          <Text style={s.stateTitle}>Phòng {room.roomNumber} đã có hợp đồng đang quản lý</Text>
          <Text style={s.stateSub}>
            Mỗi đợt thuê chỉ có một hợp đồng đang hiệu lực. Bạn có thể xem chi tiết hoặc theo dõi ký
            kết hợp đồng hiện tại.
          </Text>
          <AnimatedPressable
            scaleTo={0.98}
            style={s.primaryStateBtn}
            onPress={() =>
              router.replace({
                pathname: '/host/contract',
                params: {
                  roomId: String(room.roomId),
                  contractId: String(tenancyProfile!.current!.contractId),
                },
              })
            }
          >
            <Text style={s.primaryStateBtnText}>Xem hợp đồng hiện tại</Text>
          </AnimatedPressable>
        </View>
      ) : !draft ? (
        <View style={s.centerLoading} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={s.stateSub}>Đang chuẩn bị dữ liệu hợp đồng…</Text>
        </View>
      ) : (
        <>
          {/* Compact 4-Step Stepper */}
          <View style={s.stepperWrap}>
            {CONTRACT_WIZARD_STEPS.map(item => {
              const active = item.id === step;
              const done = item.id < step;
              return (
                <AnimatedPressable
                  key={item.id}
                  scaleTo={0.98}
                  disabled={busy}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[s.stepPill, active && s.stepPillActive]}
                  onPress={() => handleGoStep(item.id)}
                >
                  <View
                    style={[
                      s.stepNumCircle,
                      active && s.stepNumActive,
                      done && s.stepNumDone,
                    ]}
                  >
                    {done ? (
                      <Feather name="check" size={11} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          s.stepNumText,
                          (active || done) && { color: '#FFFFFF' },
                        ]}
                      >
                        {item.id}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      s.stepShortText,
                      active && { color: c.primaryDark, fontWeight: '800' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.shortLabel}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={s.scrollBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {notice && (
                <View style={s.noticeBanner} accessibilityLiveRegion="polite">
                  <Feather name="info" size={15} color={c.primaryDark} />
                  <Text style={s.noticeText}>{notice}</Text>
                  <AnimatedPressable onPress={() => setNotice(null)}>
                    <Feather name="x" size={15} color={c.primaryDark} />
                  </AnimatedPressable>
                </View>
              )}

              <InlineError message={submitError} />

              <Animated.View
                key={`step-${step}`}
                entering={reducedMotion ? undefined : FadeIn.duration(150)}
              >
                {step === 1 && (
                  <ContractStepSource
                    draft={draft}
                    catalog={catalog}
                    catalogLoading={catalogLoading}
                    catalogError={catalogError}
                    errors={errors}
                    onRetryCatalog={() => setCatalogAttempt(n => n + 1)}
                    onSelectTemplate={handleRequestSelectTemplate}
                    onOpenScan={() => setScanOpen(true)}
                  />
                )}
                {step === 2 && (
                  <ContractStepParties
                    draft={draft}
                    currentTenancy={tenancyProfile?.current ?? null}
                    errors={errors}
                    onUpdate={updateDraftField}
                  />
                )}
                {step === 3 && (
                  <ContractStepLease
                    room={room}
                    propertyName={property?.name}
                    propertyAddress={property?.address}
                    draft={draft}
                    errors={errors}
                    onUpdate={updateDraftField}
                  />
                )}
                {step === 4 && (
                  <ContractStepReview
                    roomNumber={room.roomNumber}
                    draft={draft}
                    errors={errors}
                    onUpdate={updateDraftField}
                    onOpenFullPreview={() => setPreviewOpen(true)}
                  />
                )}
              </Animated.View>
            </ScrollView>

            {/* Keyboard-Safe Sticky Footer: Quay lại · Lưu nháp · Tiếp tục / Lưu hợp đồng */}
            <View style={s.footer}>
              {step > 1 ? (
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={s.footerIconBtn}
                  accessibilityLabel="Quay lại bước trước"
                  onPress={() => handleGoStep((step - 1) as ContractWizardStep)}
                >
                  <Feather name="arrow-left" size={18} color={c.forestInk} />
                </AnimatedPressable>
              ) : null}

              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={s.footerDraftBtn}
                accessibilityLabel="Lưu bản nháp trên thiết bị"
                onPress={() => {
                  void handleSaveLocalDraft();
                }}
              >
                <Feather name="save" size={14} color={c.primary} />
                <Text style={s.footerDraftText}>Lưu nháp</Text>
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                accessibilityState={{ busy, disabled: busy }}
                style={[s.footerPrimaryBtn, busy && { opacity: 0.7 }]}
                onPress={() => {
                  void handleNextOrSubmit();
                }}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name={step === 4 ? 'check' : 'arrow-right'} size={16} color="#FFFFFF" />
                )}
                <Text style={s.footerPrimaryText}>
                  {busy ? 'Đang lưu…' : step === 4 ? 'Lưu hợp đồng' : 'Tiếp tục'}
                </Text>
              </AnimatedPressable>
            </View>
          </KeyboardAvoidingView>

          {/* Custom Scan Modal */}
          <ContractScanSheet
            visible={scanOpen}
            roomId={room.roomId}
            roomNumber={room.roomNumber}
            scanAvailable={Boolean(catalog?.scanAvailable)}
            onClose={() => setScanOpen(false)}
            onApply={handleApplyScan}
          />

          {/* Full-Screen Contract Preview Modal (Reuses ContractDocumentViewer!) */}
          {previewOpen && previewRecord && (
            <Modal
              animationType={reducedMotion ? 'none' : 'slide'}
              presentationStyle="fullScreen"
              onRequestClose={() => setPreviewOpen(false)}
            >
              <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
                <View style={s.header}>
                  <AnimatedPressable
                    accessibilityLabel="Quay lại bước duyệt hợp đồng"
                    style={s.backBtn}
                    onPress={() => setPreviewOpen(false)}
                  >
                    <Feather name="arrow-left" size={20} color={c.forestInk} />
                  </AnimatedPressable>
                  <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Xem trước hợp đồng</Text>
                    <Text style={s.headerSub}>Bản xem trước · Chưa lưu lên hệ thống</Text>
                  </View>
                  <View style={s.previewBadge}>
                    <Text style={s.previewBadgeText}>Xem trước</Text>
                  </View>
                </View>

                <View style={{ flex: 1, paddingTop: 6 }}>
                  <ContractDocumentViewer
                    contract={previewRecord}
                    exportingPdf={false}
                    onOpenToc={items => {
                      setTocItems(items);
                      setTocOpen(true);
                    }}
                    onExportPdf={() => {
                      setNotice('Hãy lưu hợp đồng trước khi tải bản PDF chính thức.');
                      setPreviewOpen(false);
                    }}
                    jumpAnchor={jumpAnchor}
                    jumpNonce={jumpNonce}
                  />
                </View>

                <ContractTocSheet
                  visible={tocOpen}
                  items={tocItems}
                  onClose={() => setTocOpen(false)}
                  onSelect={anchorId => {
                    setJumpAnchor(anchorId);
                    setJumpNonce(n => n + 1);
                  }}
                />
              </SafeAreaView>
            </Modal>
          )}
        </>
      )}

      {/* Confirm Overwrite Custom Terms when Switching Template */}
      {pendingTemplate && (
        <ConfirmDialog
          title="Đổi mẫu hợp đồng?"
          description={`Chuyển sang "${pendingTemplate.name}" sẽ thay thế nội dung điều khoản hiện tại bằng mẫu mới.`}
          cancelLabel="Giữ mẫu hiện tại"
          confirmLabel="Xác nhận đổi mẫu"
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => applyTemplateNow(pendingTemplate)}
        />
      )}

      {/* Unsaved Changes Exit Guard */}
      {discardAction && (
        <ConfirmDialog
          title="Bạn có thay đổi chưa lưu"
          description="Nội dung hợp đồng đang soạn chưa được lưu. Bạn có thể bấm Lưu nháp trên thanh công cụ trước khi thoát."
          cancelLabel="Tiếp tục soạn"
          confirmLabel="Thoát không lưu"
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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: c.forestInk },
  headerSub: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
  previewBadge: {
    backgroundColor: '#FEF6E7',
    borderWidth: 1,
    borderColor: '#F5DCB0',
    borderRadius: authRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewBadgeText: { fontSize: 11, fontWeight: '700', color: '#9A5B0A' },
  stepperWrap: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  stepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  stepPillActive: {
    backgroundColor: '#EFF7F4',
    borderColor: c.primary,
  },
  stepNumCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCE5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumActive: { backgroundColor: c.primary },
  stepNumDone: { backgroundColor: c.primaryDark },
  stepNumText: { fontSize: 10.5, fontWeight: '800', color: c.forestInk },
  stepShortText: { fontSize: 11.5, fontWeight: '600', color: c.textSecondary, flexShrink: 1 },
  scrollBody: {
    padding: authSpacing.lg,
    gap: 12,
    paddingBottom: 28,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '600', color: c.primaryDark },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  footerIconBtn: {
    width: 46,
    height: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDraftBtn: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerDraftText: { fontSize: 13, fontWeight: '700', color: c.primary },
  footerPrimaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  footerPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
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
  stateTitle: { fontSize: 16, fontWeight: '700', color: c.forestInk, textAlign: 'center' },
  stateSub: { fontSize: 13, lineHeight: 19, color: c.textSecondary, textAlign: 'center' },
  primaryStateBtn: {
    marginTop: 6,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryStateBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
});
