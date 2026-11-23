import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { ContractInviteSheet } from '@/components/host/contract-sheets';
import { SignaturePad, SignatureStrokesView } from '@/components/host/signature-pad';
import { triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError } from '@/services/host';
import { validateSignatureSubmission } from '@/services/contract-wizard';
import {
  buildSigningUrl,
  contractManagementMeta,
  createContractSigningLink,
  evaluateSignatureProgress,
  fetchRoomContractsFull,
  formatSigningTimestamp,
  isInvitationExpired,
  signContractAsOwner,
  type ActiveSigningInvitation,
  type RentalContractRecord,
  type SignaturePoint,
} from '@/services/rental-contracts';

export default function ContractSignRoute() {
  const params = useLocalSearchParams<{ roomId?: string; contractId?: string }>();
  const { user } = useAuth();
  const roomId = params.roomId && /^\d+$/.test(params.roomId) ? Number(params.roomId) : null;
  const contractId =
    params.contractId && /^\d+$/.test(params.contractId) ? Number(params.contractId) : null;

  return (
    <ContractSignContent
      key={`${user?.userId || 'guest'}:${roomId || 'none'}:${contractId || 'auto'}`}
      roomId={roomId}
      contractId={contractId}
    />
  );
}

function ContractSignContent({
  roomId,
  contractId,
}: {
  roomId: number | null;
  contractId: number | null;
}) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();

  const [contract, setContract] = useState<RentalContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Signing method state (TYPED vs DRAWN)
  const [method, setMethod] = useState<'TYPED' | 'DRAWN'>('TYPED');
  const [strokes, setStrokes] = useState<SignaturePoint[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [signBusy, setSignBusy] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Tenant invitation sheet state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitation, setInvitation] = useState<ActiveSigningInvitation | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);
  const signLock = useRef(false);
  const inviteLock = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
        if (!active || !token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
        const list = await fetchRoomContractsFull(roomId, token, controller.signal);
        if (!active) return;
        const found =
          (contractId != null ? list.find(item => item.id === contractId) : null) ??
          list.find(item => item.status === 'ACTIVE') ??
          list[0] ??
          null;
        setContract(found);
        setLoadError(found ? null : 'Không tìm thấy hợp đồng trên hệ thống.');
      } catch (err) {
        if (!active) return;
        setLoadError(
          controller.signal.aborted
            ? 'Tải hợp đồng quá lâu. Vui lòng thử lại.'
            : err instanceof Error
            ? err.message
            : 'Chưa thể tải hợp đồng.'
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
  }, [contractId, host.allowed, reloadTick, roomId]);

  const reload = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    setReloadTick(n => n + 1);
  }, []);

  const sigProgress = useMemo(
    () => (contract ? evaluateSignatureProgress(contract) : null),
    [contract]
  );
  const mgmtMeta = useMemo(
    () => (contract ? contractManagementMeta(contract.status) : null),
    [contract]
  );

  const handleConfirmOwnerSign = async () => {
    if (!contract || !sigProgress?.canOwnerSign || signLock.current) return;
    const validationErr = validateSignatureSubmission({
      method,
      confirmed,
      documentHash: contract.documentHash,
      strokes: method === 'DRAWN' ? strokes : [],
    });
    if (validationErr) {
      setSignError(validationErr);
      triggerHaptic('medium');
      return;
    }

    signLock.current = true;
    setSignBusy(true);
    setSignError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
      const updated = await signContractAsOwner(
        contract.id,
        {
          documentHash: contract.documentHash!,
          method,
          confirmed: true,
          strokes: method === 'DRAWN' ? strokes : [],
        },
        token,
        controller.signal
      );
      if (!mountedRef.current) return;
      setContract(updated);
      setStrokes([]);
      setConfirmed(false);
      triggerHaptic('success');
      setFeedback('Đã ghi nhận chữ ký bên cho thuê trên hệ thống.');
      void host.store.refresh();
    } catch (err) {
      if (mountedRef.current) {
        triggerHaptic('medium');
        setSignError(
          controller.signal.aborted
            ? 'Quá thời gian lưu chữ ký. Vui lòng tải lại trạng thái hợp đồng trước khi thử lại.'
            : err instanceof Error
            ? err.message
            : 'Chưa thể lưu chữ ký. Vui lòng thử lại.'
        );
      }
    } finally {
      clearTimeout(timer);
      signLock.current = false;
      if (mountedRef.current) setSignBusy(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!contract || roomId == null || inviteLock.current) return;
    inviteLock.current = true;
    setInviteBusy(true);
    setInviteError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);

    try {
      const token = await tokenStore.get();
      if (!token) throw new HostError('Phiên đăng nhập đã hết hạn.', 401);
      const latestList = await fetchRoomContractsFull(roomId, token, controller.signal);
      if (!mountedRef.current) return;
      const latest = latestList.find(c => c.id === contract.id);
      if (!latest) throw new HostError('Không tìm thấy hợp đồng này trên hệ thống.', 404);
      setContract(latest);
      const latestSig = evaluateSignatureProgress(latest);
      if (!latestSig.canInviteTenant) {
        throw new HostError(
          latestSig.inviteDisabledReason || 'Hợp đồng hiện không cho phép mời ký.',
          409
        );
      }
      const res = await createContractSigningLink(latest.id, token, controller.signal);
      if (!mountedRef.current) return;
      setInvitation({ url: buildSigningUrl(res.token), expiresAt: res.expiresAt });
      triggerHaptic('success');
      setFeedback(
        `Đã tạo liên kết mời ký (hiệu lực đến ${formatSigningTimestamp(res.expiresAt)}).`
      );
    } catch (err) {
      if (mountedRef.current) {
        triggerHaptic('medium');
        setInviteError(
          err instanceof Error ? err.message : 'Không thể tạo liên kết mời ký.'
        );
      }
    } finally {
      clearTimeout(timer);
      inviteLock.current = false;
      if (mountedRef.current) setInviteBusy(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else if (roomId != null) {
      router.replace({
        pathname: '/host/contract',
        params: {
          roomId: String(roomId),
          ...(contract ? { contractId: String(contract.id) } : {}),
        },
      });
    } else {
      router.replace('/host/rooms');
    }
  };

  const landlordName = contract?.details.landlordName?.trim() || 'Bên cho thuê';
  const inviteExpired = isInvitationExpired(invitation);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <AnimatedPressable accessibilityLabel="Quay lại" style={s.backBtn} onPress={handleBack}>
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Ký hợp đồng thuê phòng
          </Text>
          {contract ? (
            <Text style={s.headerSub} numberOfLines={1}>
              Phòng {contract.roomNumber || '—'}
              {contract.propertyName ? ` · ${contract.propertyName}` : ''}
              {mgmtMeta ? ` · ${mgmtMeta.label}` : ''}
            </Text>
          ) : null}
        </View>
        {contract && roomId != null && (
          <AnimatedPressable
            accessibilityLabel="Xem toàn văn hợp đồng"
            style={s.backBtn}
            onPress={() =>
              router.push({
                pathname: '/host/contract',
                params: { roomId: String(roomId), contractId: String(contract.id) },
              })
            }
          >
            <Feather name="file-text" size={18} color={c.primary} />
          </AnimatedPressable>
        )}
      </View>

      {!host.allowed ? (
        <View style={s.centerCard}>
          <Feather name="lock" size={24} color={c.textSecondary} />
          <Text style={s.centerTitle}>Không có quyền ký hợp đồng</Text>
          <Text style={s.centerSub}>Tài khoản hiện tại không phải chủ trọ sở hữu phòng này.</Text>
        </View>
      ) : loading && !contract ? (
        <View style={s.centerCard} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={s.centerSub}>Đang tải thông tin ký hợp đồng…</Text>
        </View>
      ) : loadError && !contract ? (
        <View style={s.centerCard}>
          <Feather name="alert-circle" size={24} color={c.error} />
          <Text style={s.centerTitle}>Không thể mở màn ký hợp đồng</Text>
          <Text style={s.centerSub}>{loadError}</Text>
          <AnimatedPressable style={s.retryBtn} onPress={() => reload(false)}>
            <Text style={s.retryText}>Thử lại</Text>
          </AnimatedPressable>
        </View>
      ) : contract && sigProgress && mgmtMeta ? (
        <ScrollView
          style={{ flex: 1 }}
          scrollEnabled={!isDrawing}
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => reload(true)}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
        >
          {feedback && (
            <View style={s.feedbackBanner} accessibilityLiveRegion="polite">
              <Feather name="check-circle" size={16} color={c.primary} />
              <Text style={s.feedbackText}>{feedback}</Text>
              <AnimatedPressable onPress={() => setFeedback(null)}>
                <Feather name="x" size={15} color={c.primaryDark} />
              </AnimatedPressable>
            </View>
          )}

          {/* 1. Tình trạng chữ ký hai bên */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(180)}
            style={s.card}
          >
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Tình trạng chữ ký</Text>
              <View
                style={[
                  s.countPill,
                  sigProgress.signedCount === 2 ? s.pillOk : s.pillWarn,
                ]}
              >
                <Text
                  style={[
                    s.countPillText,
                    sigProgress.signedCount === 2 ? { color: c.primaryDark } : { color: '#9A5B0A' },
                  ]}
                >
                  {sigProgress.summaryLabel}
                </Text>
              </View>
            </View>

            {/* Bên cho thuê */}
            <View style={s.partyBox}>
              <View style={s.partyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.partyRole}>Bên cho thuê (Bên A)</Text>
                  <Text style={s.partyName}>{landlordName}</Text>
                </View>
                <View style={[s.statusPill, sigProgress.ownerSigned ? s.pillOk : s.pillPending]}>
                  <Text
                    style={[
                      s.statusPillText,
                      sigProgress.ownerSigned ? { color: c.primaryDark } : { color: c.textSecondary },
                    ]}
                  >
                    {sigProgress.ownerSigned ? 'Đã ký' : 'Chưa ký'}
                  </Text>
                </View>
              </View>
              {contract.ownerSignature ? (
                <View style={{ gap: 6 }}>
                  {contract.ownerSignature.method === 'DRAWN' &&
                  contract.ownerSignature.strokes?.length ? (
                    <SignatureStrokesView strokes={contract.ownerSignature.strokes} height={76} />
                  ) : null}
                  <Text style={s.signedTime}>
                    Đã ký ({contract.ownerSignature.method === 'DRAWN' ? 'Vẽ chữ ký' : 'Họ tên'}) lúc{' '}
                    {formatSigningTimestamp(contract.ownerSignature.signedAt)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bên thuê */}
            <View style={s.partyBox}>
              <View style={s.partyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.partyRole}>Bên thuê (Bên B)</Text>
                  <Text style={s.partyName}>{contract.details.tenantName || 'Chưa cập nhật'}</Text>
                </View>
                <View style={[s.statusPill, sigProgress.tenantSigned ? s.pillOk : s.pillPending]}>
                  <Text
                    style={[
                      s.statusPillText,
                      sigProgress.tenantSigned ? { color: c.primaryDark } : { color: c.textSecondary },
                    ]}
                  >
                    {sigProgress.tenantSigned ? 'Đã ký' : 'Chưa ký'}
                  </Text>
                </View>
              </View>

              {contract.tenantSignature ? (
                <View style={{ gap: 6 }}>
                  {contract.tenantSignature.method === 'DRAWN' &&
                  contract.tenantSignature.strokes?.length ? (
                    <SignatureStrokesView strokes={contract.tenantSignature.strokes} height={76} />
                  ) : null}
                  <Text style={s.signedTime}>
                    Đã ký ({contract.tenantSignature.method === 'DRAWN' ? 'Vẽ chữ ký' : 'Họ tên'}) lúc{' '}
                    {formatSigningTimestamp(contract.tenantSignature.signedAt)}
                  </Text>
                </View>
              ) : sigProgress.canInviteTenant ? (
                <View style={{ gap: 8 }}>
                  {invitation && (
                    <Text style={[s.signedTime, inviteExpired && { color: '#9A5B0A' }]}>
                      {inviteExpired
                        ? 'Liên kết mời ký trước đó đã hết hạn — có thể tạo lại.'
                        : `Liên kết mời ký có hiệu lực đến ${formatSigningTimestamp(invitation.expiresAt)}.`}
                    </Text>
                  )}
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.inviteBtn}
                    onPress={() => {
                      setInviteError(null);
                      setInviteOpen(true);
                    }}
                  >
                    <Feather name="send" size={14} color={c.primary} />
                    <Text style={s.inviteBtnText}>
                      {invitation && !inviteExpired ? 'Xem / Chia sẻ liên kết mời ký' : 'Tạo liên kết mời ký'}
                    </Text>
                  </AnimatedPressable>
                </View>
              ) : (
                <Text style={s.signedTime}>
                  {sigProgress.inviteDisabledReason || 'Chưa ghi nhận chữ ký bên thuê.'}
                </Text>
              )}
            </View>
          </Animated.View>

          {/* 2. Khu vực ký của Bên cho thuê (chỉ hiện khi hợp đồng ACTIVE và chủ trọ chưa ký) */}
          {sigProgress.canOwnerSign ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>Ký xác nhận (Bên cho thuê)</Text>
              <Text style={s.cardSub}>
                Chữ ký được gắn với tài khoản chủ trọ đang đăng nhập, họ tên{' '}
                <Text style={{ fontWeight: '700', color: c.forestInk }}>{landlordName}</Text> và mã
                kiểm chứng phiên bản hợp đồng hiện tại.
              </Text>

              {/* Segmented selector: Ký bằng họ tên | Vẽ chữ ký */}
              <View style={s.methodTrack} accessibilityRole="tablist">
                {(
                  [
                    { key: 'TYPED' as const, label: 'Ký bằng họ tên', icon: 'type' as const },
                    { key: 'DRAWN' as const, label: 'Vẽ chữ ký', icon: 'pen-tool' as const },
                  ] as const
                ).map(opt => {
                  const active = method === opt.key;
                  return (
                    <AnimatedPressable
                      key={opt.key}
                      scaleTo={0.98}
                      disabled={signBusy}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      style={[s.methodTab, active && s.methodTabActive]}
                      onPress={() => {
                        triggerHaptic('selection');
                        setMethod(opt.key);
                        setSignError(null);
                      }}
                    >
                      <Feather
                        name={opt.icon}
                        size={14}
                        color={active ? c.primary : c.textSecondary}
                      />
                      <Text style={[s.methodTabText, active && { color: c.primary, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {method === 'TYPED' ? (
                <View style={s.typedPreviewCard}>
                  <Text style={s.typedCaption}>Xem trước chữ ký bằng họ tên</Text>
                  <Text style={s.typedSignature}>{landlordName}</Text>
                  <Text style={s.typedMeta}>Danh tính xác thực theo tài khoản chủ trọ NestHub</Text>
                </View>
              ) : (
                <SignaturePad
                  strokes={strokes}
                  disabled={signBusy}
                  onChangeStrokes={next => {
                    setStrokes(next);
                    setSignError(null);
                  }}
                  onDrawingChange={setIsDrawing}
                />
              )}

              {/* Legal transparency note */}
              <View style={s.infoNotice}>
                <Feather name="shield" size={14} color={c.primary} style={{ marginTop: 2 }} />
                <Text style={s.infoNoticeText}>
                  Chữ ký này là xác nhận điện tử trên hệ thống NestHub (kèm dấu thời gian và mã băm
                  SHA-256 của bản hợp đồng), không phải chữ ký số công cộng có chứng thư số. Sau khi
                  ký, nội dung hợp đồng không bị chỉnh sửa âm thầm.
                </Text>
              </View>

              <AnimatedPressable
                scaleTo={0.99}
                disabled={signBusy}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmed }}
                style={s.checkRow}
                onPress={() => {
                  triggerHaptic('selection');
                  setConfirmed(v => !v);
                  setSignError(null);
                }}
              >
                <View style={[s.checkbox, confirmed && s.checkboxActive]}>
                  {confirmed && <Feather name="check" size={13} color="#FFFFFF" />}
                </View>
                <Text style={s.checkText}>
                  Tôi đã đọc nội dung và đồng ý ký hợp đồng này.
                </Text>
              </AnimatedPressable>

              <InlineError message={signError} />

              <PrimaryButton
                title={signBusy ? 'Đang lưu chữ ký…' : 'Xác nhận ký'}
                icon="check-circle"
                loading={signBusy}
                disabled={
                  signBusy ||
                  !confirmed ||
                  (method === 'DRAWN' && strokes.length === 0)
                }
                onPress={() => {
                  void handleConfirmOwnerSign();
                }}
              />
            </View>
          ) : (
            <View style={s.lockedCard}>
              <Feather
                name={sigProgress.ownerSigned ? 'check-circle' : 'lock'}
                size={18}
                color={sigProgress.ownerSigned ? c.primary : c.textSecondary}
              />
              <Text style={s.lockedText}>
                {sigProgress.ownerSignDisabledReason ||
                  'Hợp đồng đã ghi nhận chữ ký bên cho thuê và được bảo toàn nguyên bản.'}
              </Text>
            </View>
          )}

          {/* Invite Tenant Confirmation Sheet */}
          <ContractInviteSheet
            visible={inviteOpen}
            contract={contract}
            invitation={invitation}
            busy={inviteBusy}
            error={inviteError}
            onClose={() => {
              if (!inviteBusy) {
                setInviteOpen(false);
                setInviteError(null);
              }
            }}
            onCreateInvite={() => {
              void handleCreateInvite();
            }}
          />
        </ScrollView>
      ) : null}
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
  body: { padding: authSpacing.lg, gap: 14, paddingBottom: 32 },
  centerCard: {
    margin: authSpacing.xl,
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  centerTitle: { fontSize: 16, fontWeight: '700', color: c.forestInk, textAlign: 'center' },
  centerSub: { fontSize: 13, lineHeight: 19, color: c.textSecondary, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    justifyContent: 'center',
  },
  retryText: { fontSize: 13, fontWeight: '700', color: c.primaryDark },
  feedbackBanner: {
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
  feedbackText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.primaryDark },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.forestInk },
  cardSub: { fontSize: 12.5, lineHeight: 18, color: c.textSecondary },
  countPill: { borderRadius: authRadius.round, paddingHorizontal: 10, paddingVertical: 4 },
  countPillText: { fontSize: 11.5, fontWeight: '700' },
  pillOk: { backgroundColor: '#E8F5EE' },
  pillWarn: { backgroundColor: '#FEF6E7' },
  pillPending: { backgroundColor: '#F1F5F3' },
  partyBox: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    gap: 8,
  },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partyRole: { fontSize: 11.5, fontWeight: '700', color: c.textSecondary },
  partyName: { fontSize: 15, fontWeight: '700', color: c.forestInk },
  statusPill: { borderRadius: authRadius.round, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11.5, fontWeight: '700' },
  signedTime: { fontSize: 12, lineHeight: 17, color: c.textSecondary },
  inviteBtn: {
    minHeight: 42,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  inviteBtnText: { fontSize: 13, fontWeight: '700', color: c.primary },
  methodTrack: {
    flexDirection: 'row',
    backgroundColor: '#E9F0ED',
    borderRadius: authRadius.md,
    padding: 4,
    gap: 4,
  },
  methodTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: authRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  methodTabActive: { backgroundColor: c.surface },
  methodTabText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  typedPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  typedCaption: { fontSize: 11.5, fontWeight: '600', color: c.textSecondary },
  typedSignature: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: c.primaryDark,
    textAlign: 'center',
  },
  typedMeta: { fontSize: 11, color: c.textMuted },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 11,
  },
  infoNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: c.primaryDark },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
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
  checkboxActive: { backgroundColor: c.primary, borderColor: c.primary },
  checkText: { flex: 1, fontSize: 13.5, lineHeight: 20, fontWeight: '600', color: c.forestInk },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  lockedText: { flex: 1, fontSize: 13, lineHeight: 19, color: c.textSecondary },
});
