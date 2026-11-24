import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ContractDocumentViewer } from '@/components/host/contract-document-viewer';
import {
  ContractInviteSheet,
  ContractMenuSheet,
  ContractOwnerSignSheet,
  ContractTocSheet,
} from '@/components/host/contract-sheets';
import { SignatureStrokesView } from '@/components/host/signature-pad';
import { useReducedMotionPreference } from '@/constants/motion';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError } from '@/services/host';
import {
  cleanupTemporaryContractExports,
  exportContractDocument,
} from '@/services/rental-contract-export';
import {
  buildSigningUrl,
  contractManagementMeta,
  contractTitle,
  createContractSigningLink,
  evaluateSignatureProgress,
  fetchRoomContractsFull,
  formatContractIsoDate,
  formatContractMoneyVnd,
  formatSigningTimestamp,
  isInvitationExpired,
  signContractAsOwner,
  type ActiveSigningInvitation,
  type ContractTocItem,
  type RentalContractRecord,
} from '@/services/rental-contracts';

type ContractTab = 'overview' | 'content' | 'signing';

const TAB_ITEMS: readonly { key: ContractTab; label: string }[] = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'content', label: 'Nội dung' },
  { key: 'signing', label: 'Ký kết' },
];

export default function RoomContractDetailScreen() {
  const params = useLocalSearchParams<{ roomId?: string; contractId?: string }>();
  const { user } = useAuth();
  const roomId = params.roomId && /^\d+$/.test(params.roomId) ? Number(params.roomId) : null;
  const initialContractId =
    params.contractId && /^\d+$/.test(params.contractId) ? Number(params.contractId) : null;

  return (
    <RoomContractDetailContent
      key={`${user?.userId || 'guest'}:${roomId || 'none'}:${initialContractId || 'auto'}`}
      roomId={roomId}
      initialContractId={initialContractId}
    />
  );
}

function RoomContractDetailContent({
  roomId,
  initialContractId,
}: {
  roomId: number | null;
  initialContractId: number | null;
}) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();

  const [tab, setTab] = useState<ContractTab>('overview');
  const [contracts, setContracts] = useState<RentalContractRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialContractId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Secondary sheets & feedback
  const [menuOpen, setMenuOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItems, setTocItems] = useState<ContractTocItem[]>([]);
  const [jumpAnchor, setJumpAnchor] = useState<string | null>(null);
  const [jumpNonce, setJumpNonce] = useState(0);

  // Invitation state (in-memory only for active session; never persisted or logged)
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [invitationByContractId, setInvitationByContractId] = useState<
    Record<number, ActiveSigningInvitation>
  >({});
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Owner sign sheet state
  const [ownerSignOpen, setOwnerSignOpen] = useState(false);
  const [ownerSignBusy, setOwnerSignBusy] = useState(false);
  const [ownerSignError, setOwnerSignError] = useState<string | null>(null);

  // PDF Export state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);

  const inviteLockRef = useRef(false);
  const ownerSignLockRef = useRef(false);
  const exportLockRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        setReloadTick(n => n + 1);
      }
    });
    return () => {
      mountedRef.current = false;
      sub.remove();
      void cleanupTemporaryContractExports();
    };
  }, []);

  useEffect(() => {
    if (!host.allowed || roomId == null) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    void (async () => {
      try {
        const token = await tokenStore.get();
        if (!active) return;
        if (!token) throw new HostError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);

        const list = await fetchRoomContractsFull(roomId, token, controller.signal);
        if (!active) return;

        setContracts(list);
        setLoadError(null);
        setSelectedId(prev => {
          if (prev != null && list.some(item => item.id === prev)) return prev;
          const activeItem = list.find(item => item.status === 'ACTIVE');
          return activeItem?.id ?? list[0]?.id ?? null;
        });
      } catch (err) {
        if (!active) return;
        setLoadError(
          controller.signal.aborted
            ? 'Tải hợp đồng quá lâu. Vui lòng thử lại.'
            : err instanceof Error
            ? err.message
            : 'Chưa thể tải thông tin hợp đồng.'
        );
      } finally {
        clearTimeout(timer);
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [host.allowed, roomId, reloadTick]);

  useFocusEffect(
    useCallback(() => {
      setReloadTick(n => n + 1);
    }, [])
  );

  const loadContracts = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    setReloadTick(n => n + 1);
  }, []);

  const effectiveLoadError = !host.allowed
    ? 'Bạn không có quyền truy cập hợp đồng thuê phòng.'
    : roomId == null
    ? 'Không xác định được mã phòng cho hợp đồng này.'
    : loadError;

  const effectiveLoading = Boolean(host.allowed && roomId != null && loading);

  const contract = useMemo(() => {
    if (!contracts || contracts.length === 0) return null;
    if (selectedId != null) {
      const found = contracts.find(item => item.id === selectedId);
      if (found) return found;
    }
    return contracts.find(item => item.status === 'ACTIVE') ?? contracts[0];
  }, [contracts, selectedId]);

  const activeInvitation = contract ? invitationByContractId[contract.id] ?? null : null;
  const inviteExpired = isInvitationExpired(activeInvitation);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (roomId != null) {
      router.replace({ pathname: '/host/room', params: { id: String(roomId) } });
    } else {
      router.replace('/host/rooms');
    }
  };

  /* ---- Create Tenant Signing Invitation Link ---- */
  const handleCreateSigningInvite = async () => {
    if (inviteLockRef.current || !contract || roomId == null) return;
    inviteLockRef.current = true;
    setInviteBusy(true);
    setInviteError(null);
    setActionError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);

      // 1. Re-verify latest contract state from backend before creating signing link
      const latestList = await fetchRoomContractsFull(roomId, token, controller.signal);
      if (!mountedRef.current) return;
      setContracts(latestList);

      const latest = latestList.find(item => item.id === contract.id);
      if (!latest) {
        throw new HostError('Không tìm thấy hợp đồng này trên hệ thống.', 404);
      }
      const latestSig = evaluateSignatureProgress(latest);
      if (!latestSig.canInviteTenant) {
        throw new HostError(
          latestSig.inviteDisabledReason || 'Hợp đồng hiện không cho phép tạo lời mời ký.',
          409
        );
      }

      // 2. Call backend signing-link endpoint (server generates cryptographic token)
      const linkResult = await createContractSigningLink(latest.id, token, controller.signal);
      if (!mountedRef.current) return;

      const nextInvite: ActiveSigningInvitation = {
        url: buildSigningUrl(linkResult.token),
        expiresAt: linkResult.expiresAt,
      };
      setInvitationByContractId(prev => ({ ...prev, [latest.id]: nextInvite }));
      setFeedbackBanner(
        `Đã tạo liên kết mời ký (hiệu lực đến ${formatSigningTimestamp(linkResult.expiresAt)}).`
      );
    } catch (err) {
      if (!mountedRef.current) return;
      setInviteError(
        controller.signal.aborted
          ? 'Yêu cầu tạo lời mời quá thời gian chờ. Vui lòng kiểm tra lại.'
          : err instanceof Error
          ? err.message
          : 'Không thể tạo liên kết mời ký. Vui lòng thử lại.'
      );
    } finally {
      clearTimeout(timer);
      inviteLockRef.current = false;
      if (mountedRef.current) setInviteBusy(false);
    }
  };

  /* ---- Owner Typed Signing (POST /{id}/signature) ---- */
  const handleConfirmOwnerSign = async () => {
    if (ownerSignLockRef.current || !contract || !contract.documentHash) return;
    ownerSignLockRef.current = true;
    setOwnerSignBusy(true);
    setOwnerSignError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);

      const updated = await signContractAsOwner(
        contract.id,
        {
          documentHash: contract.documentHash,
          method: 'TYPED',
          confirmed: true,
          strokes: [],
        },
        token,
        controller.signal
      );
      if (!mountedRef.current) return;

      setContracts(prev =>
        prev ? prev.map(item => (item.id === updated.id ? updated : item)) : [updated]
      );
      setOwnerSignOpen(false);
      setFeedbackBanner('Đã ghi nhận chữ ký bên cho thuê trên hệ thống.');
    } catch (err) {
      if (!mountedRef.current) return;
      setOwnerSignError(
        controller.signal.aborted
          ? 'Quá thời gian lưu chữ ký. Vui lòng tải lại trạng thái hợp đồng trước khi thử lại.'
          : err instanceof Error
          ? err.message
          : 'Chưa lưu được chữ ký. Vui lòng thử lại.'
      );
    } finally {
      clearTimeout(timer);
      ownerSignLockRef.current = false;
      if (mountedRef.current) setOwnerSignBusy(false);
    }
  };

  /* ---- Authenticated PDF / Document Export ---- */
  const handleExportPdf = async () => {
    if (exportLockRef.current || !contract || roomId == null) return;
    exportLockRef.current = true;
    setExportingPdf(true);
    setActionError(null);
    setFeedbackBanner(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);

      const { exportedContract, note } = await exportContractDocument({
        roomId,
        contractId: contract.id,
        token,
        signal: controller.signal,
      });
      if (!mountedRef.current) return;

      setContracts(prev =>
        prev
          ? prev.map(item => (item.id === exportedContract.id ? exportedContract : item))
          : [exportedContract]
      );
      setFeedbackBanner(note);
    } catch (err) {
      if (!mountedRef.current) return;
      setActionError(
        controller.signal.aborted
          ? 'Quá thời gian chuẩn bị tài liệu. Vui lòng thử lại.'
          : err instanceof Error
          ? err.message
          : 'Chưa thể xuất bản PDF hợp đồng. Vui lòng thử lại.'
      );
    } finally {
      clearTimeout(timer);
      exportLockRef.current = false;
      if (mountedRef.current) setExportingPdf(false);
    }
  };

  const mgmtMeta = contract ? contractManagementMeta(contract.status) : null;
  const sigProgress = contract ? evaluateSignatureProgress(contract) : null;
  const leaseRangeLabel = contract
    ? [formatContractIsoDate(contract.startDate), formatContractIsoDate(contract.endDate)]
        .filter(Boolean)
        .join(' – ') || 'Chưa rõ thời hạn'
    : '';

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Unified Header (No Web Modal Close X) */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại chi tiết phòng"
          style={s.iconHeaderBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Hợp đồng thuê phòng
          </Text>
          {contract ? (
            <Text style={s.headerSub} numberOfLines={1}>
              Phòng {contract.roomNumber || '—'}
              {contract.propertyName ? ` · ${contract.propertyName}` : ''}
            </Text>
          ) : null}
        </View>

        {contract && (
          <AnimatedPressable
            accessibilityLabel="Mở tùy chọn hợp đồng"
            style={s.iconHeaderBtn}
            onPress={() => setMenuOpen(true)}
          >
            <Feather name="more-horizontal" size={20} color={c.forestInk} />
          </AnimatedPressable>
        )}
      </View>

      {/* Loading / Error / Empty States */}
      {effectiveLoading && !contract ? (
        <View style={s.centerState} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={s.centerStateText}>Đang tải hợp đồng thuê phòng…</Text>
        </View>
      ) : effectiveLoadError && !contract ? (
        <View style={s.centerState}>
          <Feather name="alert-circle" size={28} color={c.error} />
          <Text style={s.centerStateTitle}>Không thể mở hợp đồng</Text>
          <Text style={s.centerStateText}>{effectiveLoadError}</Text>
          <AnimatedPressable
            scaleTo={0.97}
            style={s.retryBtn}
            onPress={() => {
              void loadContracts(false);
            }}
          >
            <Feather name="refresh-cw" size={14} color={c.primaryDark} />
            <Text style={s.retryBtnText}>Thử lại</Text>
          </AnimatedPressable>
        </View>
      ) : !contract || !mgmtMeta || !sigProgress ? (
        <View style={s.centerState}>
          <Feather name="file-text" size={28} color={c.textMuted} />
          <Text style={s.centerStateTitle}>Phòng chưa có hợp đồng</Text>
          <Text style={s.centerStateText}>
            Chưa có bản ghi hợp đồng nào được lưu trên hệ thống cho phòng này.
          </Text>
          {roomId != null && (
            <PrimaryButton
              title="Lập hợp đồng thuê phòng"
              icon="file-plus"
              onPress={() =>
                router.replace({
                  pathname: '/host/contract-create',
                  params: { roomId: String(roomId) },
                })
              }
            />
          )}
          <AnimatedPressable scaleTo={0.97} style={s.retryBtn} onPress={handleBack}>
            <Text style={s.retryBtnText}>Quay lại chi tiết phòng</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <>
          {/* Compact Contract Summary Card (shown above tabs on Overview/Signing; condensed on Content) */}
          {tab !== 'content' && (
            <View style={s.summaryWrap}>
              <View style={s.summaryCard}>
                <View style={s.summaryTopRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.summaryTitle} numberOfLines={1}>
                      {contractTitle(contract)}
                    </Text>
                    <Text style={s.summaryMeta} numberOfLines={1}>
                      Phòng {contract.roomNumber || '—'} · {leaseRangeLabel}
                    </Text>
                  </View>
                </View>

                {/* Two Distinct Status Pills: Management Status vs Signature Progress */}
                <View style={s.summaryBadgesRow}>
                  <View
                    style={[
                      s.statusBadge,
                      mgmtMeta.isActive ? s.statusBadgeActive : s.statusBadgeClosed,
                    ]}
                  >
                    <View
                      style={[
                        s.statusDot,
                        { backgroundColor: mgmtMeta.isActive ? c.primary : c.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        s.statusBadgeText,
                        mgmtMeta.isActive
                          ? { color: c.primaryDark }
                          : { color: c.textSecondary },
                      ]}
                    >
                      {mgmtMeta.label}
                    </Text>
                  </View>

                  <View
                    style={[
                      s.statusBadge,
                      sigProgress.signedCount === 2
                        ? s.sigBadgeFull
                        : sigProgress.signedCount === 1
                        ? s.sigBadgePartial
                        : s.sigBadgeNone,
                    ]}
                  >
                    <Feather
                      name={sigProgress.signedCount === 2 ? 'check-circle' : 'edit-3'}
                      size={12}
                      color={
                        sigProgress.signedCount === 2
                          ? c.primaryDark
                          : sigProgress.signedCount === 1
                          ? '#9A6315'
                          : c.textSecondary
                      }
                    />
                    <Text
                      style={[
                        s.statusBadgeText,
                        sigProgress.signedCount === 2
                          ? { color: c.primaryDark }
                          : sigProgress.signedCount === 1
                          ? { color: '#9A6315' }
                          : { color: c.textSecondary },
                      ]}
                    >
                      {sigProgress.summaryLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 3-Tab Segmented Control: Tổng quan | Nội dung | Ký kết */}
          <View style={s.segmentOuter}>
            <View style={s.segmentTrack} accessibilityRole="tablist">
              {TAB_ITEMS.map(item => {
                const active = tab === item.key;
                return (
                  <AnimatedPressable
                    key={item.key}
                    scaleTo={0.98}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[s.segmentBtn, active && s.segmentBtnActive]}
                    onPress={() => setTab(item.key)}
                  >
                    <Text style={[s.segmentText, active && s.segmentTextActive]}>
                      {item.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Transient Feedback / Action Error */}
          {(feedbackBanner || actionError) && (
            <View style={{ paddingHorizontal: authSpacing.lg, paddingBottom: 8 }}>
              {feedbackBanner && (
                <View style={s.feedbackBanner} accessibilityLiveRegion="polite">
                  <Feather name="check-circle" size={15} color={c.primary} />
                  <Text style={s.feedbackText}>{feedbackBanner}</Text>
                  <AnimatedPressable onPress={() => setFeedbackBanner(null)}>
                    <Feather name="x" size={14} color={c.primaryDark} />
                  </AnimatedPressable>
                </View>
              )}
              {actionError && <InlineError message={actionError} />}
            </View>
          )}

          {/* ============================================================== */}
          {/* TAB 1: TỔNG QUAN                                               */}
          {/* ============================================================== */}
          {tab === 'overview' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    void loadContracts(true);
                  }}
                  tintColor={c.primary}
                  colors={[c.primary]}
                />
              }
            >
              <Animated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                style={{ gap: 14 }}
              >
                {/* Tình trạng ký hợp đồng */}
                <View style={s.card}>
                  <View style={s.cardTitleRow}>
                    <Text style={s.cardTitle}>Tình trạng ký hợp đồng</Text>
                    <AnimatedPressable onPress={() => setTab('signing')}>
                      <Text style={s.cardActionLink}>Chi tiết ký →</Text>
                    </AnimatedPressable>
                  </View>

                  <Text style={s.sigProgressSub}>{sigProgress.detailLabel}</Text>

                  {/* Progress Bar */}
                  <View style={s.progressTrack}>
                    <View
                      style={[
                        s.progressFill,
                        { width: `${(sigProgress.signedCount / 2) * 100}%` },
                      ]}
                    />
                  </View>

                  <View style={s.partyStatusList}>
                    <PartyMiniRow
                      role="Bên cho thuê"
                      name={contract.details.landlordName}
                      signed={sigProgress.ownerSigned}
                    />
                    <PartyMiniRow
                      role="Bên thuê"
                      name={contract.details.tenantName}
                      signed={sigProgress.tenantSigned}
                      last
                    />
                  </View>
                </View>

                {/* Thông tin thuê (Strictly from confirmed contract record — never latest room type price) */}
                <View style={s.card}>
                  <Text style={s.cardTitle}>Thông tin thuê theo hợp đồng</Text>
                  <View style={s.kvList}>
                    <OverviewRow label="Mã phòng" value={contract.roomNumber || 'Chưa rõ'} />
                    <OverviewRow
                      label="Nhà trọ"
                      value={contract.propertyName || 'Chưa rõ'}
                    />
                    <OverviewRow
                      label="Người thuê chính"
                      value={contract.details.tenantName || 'Chưa rõ'}
                    />
                    <OverviewRow
                      label="Giá thuê"
                      value={
                        formatContractMoneyVnd(contract.details.rent)
                          ? `${formatContractMoneyVnd(contract.details.rent)}/tháng`
                          : 'Chưa ghi nhận'
                      }
                      highlight
                    />
                    <OverviewRow
                      label="Tiền đặt cọc"
                      value={formatContractMoneyVnd(contract.details.deposit) || 'Chưa ghi nhận'}
                    />
                    <OverviewRow
                      label="Ngày bắt đầu"
                      value={formatContractIsoDate(contract.startDate) || 'Chưa rõ'}
                    />
                    <OverviewRow
                      label="Ngày kết thúc"
                      value={formatContractIsoDate(contract.endDate) || 'Chưa rõ'}
                      last
                    />
                  </View>
                </View>

                {/* Next-step Actions */}
                <View style={{ gap: 10 }}>
                  {sigProgress.canInviteTenant && (
                    <PrimaryButton
                      title="Mời bên thuê ký"
                      icon="send"
                      onPress={() => {
                        setInviteError(null);
                        setInviteSheetOpen(true);
                      }}
                    />
                  )}
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.outlineActionBtn}
                    onPress={() => setTab('content')}
                  >
                    <Feather name="file-text" size={16} color={c.primary} />
                    <Text style={s.outlineActionText}>Xem nội dung hợp đồng đầy đủ</Text>
                  </AnimatedPressable>
                </View>
              </Animated.View>
            </ScrollView>
          )}

          {/* ============================================================== */}
          {/* TAB 2: NỘI DUNG HỢP ĐỒNG (Exact Official Verbatim Document)    */}
          {/* ============================================================== */}
          {tab === 'content' && (
            <View style={{ flex: 1 }}>
              <ContractDocumentViewer
                contract={contract}
                exportingPdf={exportingPdf}
                onOpenToc={items => {
                  setTocItems(items);
                  setTocOpen(true);
                }}
                onExportPdf={() => {
                  void handleExportPdf();
                }}
                jumpAnchor={jumpAnchor}
                jumpNonce={jumpNonce}
              />
            </View>
          )}

          {/* ============================================================== */}
          {/* TAB 3: KÝ KẾT                                                  */}
          {/* ============================================================== */}
          {tab === 'signing' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    void loadContracts(true);
                  }}
                  tintColor={c.primary}
                  colors={[c.primary]}
                />
              }
            >
              <Animated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                style={{ gap: 14 }}
              >
                {/* Closed/Inactive Contract Notice */}
                {!mgmtMeta.isActive && (
                  <View style={s.closedNoticeBox}>
                    <Feather name="lock" size={16} color={c.textSecondary} style={{ marginTop: 1 }} />
                    <Text style={s.closedNoticeText}>
                      Hợp đồng đang ở trạng thái <Text style={{ fontWeight: '700' }}>Đã kết thúc</Text>. Các thao tác ký mới và gửi lời mời ký đã được khóa theo quy trình hệ thống.
                    </Text>
                  </View>
                )}

                {/* Bên cho thuê */}
                <View style={s.card}>
                  <View style={s.partyHeaderRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.partyRoleLabel}>Bên cho thuê (Bên A)</Text>
                      <Text style={s.partyFullName}>
                        {contract.details.landlordName || 'Chưa cập nhật'}
                      </Text>
                    </View>
                    <SignStatusPill signed={sigProgress.ownerSigned} />
                  </View>

                  {contract.ownerSignature ? (
                    <View style={{ gap: 8 }}>
                      {contract.ownerSignature.method === 'DRAWN' &&
                      contract.ownerSignature.strokes?.length ? (
                        <SignatureStrokesView
                          strokes={contract.ownerSignature.strokes}
                          height={76}
                        />
                      ) : null}
                      <View style={s.signedMetaBox}>
                        <Feather name="clock" size={14} color={c.primary} />
                        <Text style={s.signedMetaText}>
                          Đã ký lúc {formatSigningTimestamp(contract.ownerSignature.signedAt)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={s.unsignedMetaText}>
                      Chưa ghi nhận chữ ký bên cho thuê trên hệ thống.
                    </Text>
                  )}

                  {sigProgress.canOwnerSign && roomId != null && (
                    <PrimaryButton
                      title="Ký hợp đồng (Họ tên / Vẽ chữ ký)"
                      icon="pen-tool"
                      onPress={() =>
                        router.push({
                          pathname: '/host/contract-sign',
                          params: {
                            roomId: String(roomId),
                            contractId: String(contract.id),
                          },
                        })
                      }
                    />
                  )}
                </View>

                {/* Bên thuê */}
                <View style={s.card}>
                  <View style={s.partyHeaderRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.partyRoleLabel}>Bên thuê (Bên B)</Text>
                      <Text style={s.partyFullName}>
                        {contract.details.tenantName || 'Chưa cập nhật'}
                      </Text>
                    </View>
                    <SignStatusPill signed={sigProgress.tenantSigned} />
                  </View>

                  {contract.tenantSignature ? (
                    <View style={{ gap: 8 }}>
                      {contract.tenantSignature.method === 'DRAWN' &&
                      contract.tenantSignature.strokes?.length ? (
                        <SignatureStrokesView
                          strokes={contract.tenantSignature.strokes}
                          height={76}
                        />
                      ) : null}
                      <View style={s.signedMetaBox}>
                        <Feather name="clock" size={14} color={c.primary} />
                        <Text style={s.signedMetaText}>
                          Đã ký lúc {formatSigningTimestamp(contract.tenantSignature.signedAt)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={s.unsignedMetaText}>
                        {sigProgress.inviteDisabledReason ||
                          'Bên thuê chưa ký trên hệ thống. Tạo liên kết mời ký để gửi cho người thuê xác nhận.'}
                      </Text>

                      {/* Active or Expired Invitation Status from Current Session */}
                      {activeInvitation && (
                        <View
                          style={[
                            s.inviteStatusCard,
                            inviteExpired && s.inviteStatusCardExpired,
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Feather
                              name={inviteExpired ? 'alert-circle' : 'link'}
                              size={14}
                              color={inviteExpired ? '#9A6315' : c.primaryDark}
                            />
                            <Text
                              style={[
                                s.inviteStatusTitle,
                                inviteExpired && { color: '#9A6315' },
                              ]}
                            >
                              {inviteExpired
                                ? 'Liên kết mời ký đã hết hạn'
                                : 'Liên kết mời ký đang có hiệu lực'}
                            </Text>
                          </View>
                          <Text style={s.inviteStatusSub}>
                            {inviteExpired
                              ? `Hết hạn lúc ${formatSigningTimestamp(activeInvitation.expiresAt)}. Hãy tạo lại lời mời mới nếu cần.`
                              : `Hạn ký đến ${formatSigningTimestamp(activeInvitation.expiresAt)}. Mở liên kết chưa tự động hoàn thành chữ ký.`}
                          </Text>
                        </View>
                      )}

                      {sigProgress.canInviteTenant && (
                        <PrimaryButton
                          title={
                            inviteExpired
                              ? 'Tạo lại lời mời ký'
                              : activeInvitation
                              ? 'Xem / Chia sẻ liên kết mời ký'
                              : 'Mời bên thuê ký'
                          }
                          icon="send"
                          onPress={() => {
                            setInviteError(null);
                            setInviteSheetOpen(true);
                          }}
                        />
                      )}
                    </>
                  )}
                </View>

                {/* Honest Audit Note */}
                <View style={s.auditNoteBox}>
                  <Feather name="info" size={14} color={c.textSecondary} style={{ marginTop: 1 }} />
                  <Text style={s.auditNoteText}>
                    Trạng thái quản lý ({mgmtMeta.label}) và trạng thái ký kết ({sigProgress.summaryLabel}) được theo dõi độc lập theo dữ liệu thực tế từ hệ thống NestHub.
                  </Text>
                </View>
              </Animated.View>
            </ScrollView>
          )}

          {/* Sheets */}
          <ContractInviteSheet
            visible={inviteSheetOpen}
            contract={contract}
            invitation={activeInvitation}
            busy={inviteBusy}
            error={inviteError}
            onClose={() => {
              if (!inviteBusy) {
                setInviteSheetOpen(false);
                setInviteError(null);
              }
            }}
            onCreateInvite={() => {
              void handleCreateSigningInvite();
            }}
          />

          <ContractOwnerSignSheet
            visible={ownerSignOpen}
            contract={contract}
            busy={ownerSignBusy}
            error={ownerSignError}
            onClose={() => {
              if (!ownerSignBusy) {
                setOwnerSignOpen(false);
                setOwnerSignError(null);
              }
            }}
            onConfirmSign={() => {
              void handleConfirmOwnerSign();
            }}
          />

          <ContractTocSheet
            visible={tocOpen}
            items={tocItems}
            onClose={() => setTocOpen(false)}
            onSelect={anchorId => {
              setJumpAnchor(anchorId);
              setJumpNonce(n => n + 1);
            }}
          />

          <ContractMenuSheet
            visible={menuOpen}
            contracts={contracts || []}
            selectedId={contract.id}
            exportingPdf={exportingPdf}
            onClose={() => setMenuOpen(false)}
            onExportPdf={() => {
              void handleExportPdf();
            }}
            onRefresh={() => {
              void loadContracts(true);
            }}
            onSelectContract={nextId => {
              setSelectedId(nextId);
              setFeedbackBanner(null);
              setActionError(null);
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function PartyMiniRow({
  role,
  name,
  signed,
  last,
}: {
  role: string;
  name?: string;
  signed: boolean;
  last?: boolean;
}) {
  return (
    <View style={[s.partyMiniRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={s.partyMiniRole}>{role}</Text>
        <Text style={s.partyMiniName} numberOfLines={1}>
          {name || 'Chưa cập nhật'}
        </Text>
      </View>
      <SignStatusPill signed={signed} />
    </View>
  );
}

function SignStatusPill({ signed }: { signed: boolean }) {
  return (
    <View style={[s.signPill, signed ? s.signPillDone : s.signPillPending]}>
      <Feather
        name={signed ? 'check-circle' : 'clock'}
        size={12}
        color={signed ? c.primaryDark : '#9A6315'}
      />
      <Text style={[s.signPillText, signed ? { color: c.primaryDark } : { color: '#9A6315' }]}>
        {signed ? 'Đã ký' : 'Chưa ký'}
      </Text>
    </View>
  );
}

function OverviewRow({
  label,
  value,
  highlight,
  last,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[s.kvRow, last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={[s.kvValue, highlight && { color: c.primary, fontSize: 15 }]}>{value}</Text>
    </View>
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
  },
  iconHeaderBtn: {
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
  headerSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.primary,
    marginTop: 1,
  },
  summaryWrap: {
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 10,
  },
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 10,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: c.forestInk,
  },
  summaryMeta: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 2,
  },
  summaryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: c.softMint,
    borderColor: '#C5E3DB',
  },
  statusBadgeClosed: {
    backgroundColor: c.background,
    borderColor: c.border,
  },
  sigBadgeFull: {
    backgroundColor: c.softMint,
    borderColor: '#C5E3DB',
  },
  sigBadgePartial: {
    backgroundColor: '#FFF7E8',
    borderColor: '#F1D4A7',
  },
  sigBadgeNone: {
    backgroundColor: c.background,
    borderColor: c.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentOuter: {
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 10,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#EBF1EE',
    borderRadius: authRadius.md,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
  feedbackBanner: {
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
  feedbackText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.primaryDark,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 4,
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  cardActionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  sigProgressSub: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: -4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E6EEEB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: c.primary,
  },
  partyStatusList: {
    gap: 10,
    paddingTop: 4,
  },
  partyMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F1',
  },
  partyMiniRole: {
    fontSize: 12,
    color: c.textSecondary,
  },
  partyMiniName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  signPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  signPillDone: {
    backgroundColor: c.softMint,
  },
  signPillPending: {
    backgroundColor: '#FFF7E8',
  },
  signPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  kvList: {
    gap: 10,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F1',
  },
  kvLabel: {
    fontSize: 13.5,
    color: c.textSecondary,
  },
  kvValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  outlineActionBtn: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  outlineActionText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.primary,
  },
  closedNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  partyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  partyRoleLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  partyFullName: {
    fontSize: 16,
    fontWeight: '800',
    color: c.forestInk,
  },
  signedMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
  },
  signedMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primaryDark,
  },
  unsignedMetaText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  inviteStatusCard: {
    padding: 12,
    borderRadius: authRadius.md,
    backgroundColor: '#F3FAF7',
    borderWidth: 1,
    borderColor: '#C5E3DB',
    gap: 4,
  },
  inviteStatusCardExpired: {
    backgroundColor: '#FFF7E8',
    borderColor: '#F1D4A7',
  },
  inviteStatusTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  inviteStatusSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  auditNoteBox: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  auditNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  centerStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  centerStateText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
    marginTop: 6,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primaryDark,
  },
});
