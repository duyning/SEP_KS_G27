import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { BillingPaymentSheet } from '@/components/host/billing-sheets';
import { ContentLoading } from '@/components/loading';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError } from '@/services/host';
import {
  BILL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  billPaidPercent,
  formatBillCode,
  formatBillMoney,
  formatBillingMonthShort,
  formatIsoDateShort,
  vndValue,
  type BillingDetail,
  type BillingPaymentPayload,
  type BillStatus,
} from '@/services/room-billing';
import {
  fetchBillingDetail,
  issueBillingBill,
  recordBillingPayment,
} from '@/services/room-billing-api';
import { todayIsoVietnam } from '@/services/host-rooms';

function statusPillColors(status: BillStatus) {
  switch (status) {
    case 'PAID':
      return { bg: '#DCFCE7', fg: '#166534' };
    case 'PARTIAL':
      return { bg: '#FEF3C7', fg: '#92400E' };
    case 'DRAFT':
      return { bg: '#F1F5F3', fg: c.textSecondary };
    default:
      return { bg: '#E6F4F1', fg: '#06665C' };
  }
}

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const billId = id && /^\d+$/.test(id) ? Number(id) : null;
  const host = useHost();

  const [detail, setDetail] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [issueConfirmOpen, setIssueConfirmOpen] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const actionLockRef = useRef(false);

  useEffect(() => {
    if (!host.allowed || !billId) return;
    let ignore = false;
    const controller = new AbortController();

    async function fetchDetail() {
      try {
        const token = await tokenStore.get();
        if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const data = await fetchBillingDetail(billId!, token, controller.signal);
        if (!ignore && !controller.signal.aborted) {
          setDetail(data);
          setError(null);
        }
      } catch (cause) {
        if (!ignore && !controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'Chưa thể tải chi tiết phiếu thu.'
          );
        }
      } finally {
        if (!ignore && !controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void fetchDetail();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [host.allowed, billId, reloadTick]);

  const handleRecordPayment = async (payload: BillingPaymentPayload) => {
    if (actionLockRef.current || !billId) return;
    actionLockRef.current = true;
    setPayBusy(true);
    setPayError(null);
    const controller = new AbortController();
    try {
      const token = await tokenStore.get();
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
      const updated = await recordBillingPayment(billId, payload, token, controller.signal);
      setDetail(updated);
      setPaySheetOpen(false);
      setNotice(`Đã ghi nhận thanh toán ${formatBillMoney(payload.amount)}.`);
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : 'Chưa thể ghi nhận thanh toán. Vui lòng thử lại.';
      setPayError(msg);
      if (cause instanceof HostError && cause.status === 409) {
        setReloadTick(prev => prev + 1);
      }
    } finally {
      actionLockRef.current = false;
      setPayBusy(false);
    }
  };

  const handleConfirmIssue = async () => {
    if (actionLockRef.current || !detail?.bill) return;
    actionLockRef.current = true;
    setIssueBusy(true);
    setError(null);
    const controller = new AbortController();
    try {
      const token = await tokenStore.get();
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
      await issueBillingBill(detail.bill.id, detail.bill.revision, token, controller.signal);
      setIssueConfirmOpen(false);
      setNotice(`Đã phát hành phiếu ${formatBillCode(detail.bill.id)}.`);
      setReloadTick(prev => prev + 1);
    } catch (cause) {
      setIssueConfirmOpen(false);
      setError(cause instanceof Error ? cause.message : 'Chưa thể phát hành phiếu thu.');
    } finally {
      actionLockRef.current = false;
      setIssueBusy(false);
    }
  };

  const bill = detail?.bill || null;
  const payments = detail?.payments || [];
  const isDraft = bill?.status === 'DRAFT';
  const outstanding = bill ? vndValue(bill.outstanding) : 0n;
  const paidPct = bill ? billPaidPercent(bill) : 0;
  const pillColor = bill ? statusPillColors(bill.status) : statusPillColors('UNPAID');

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại danh sách phiếu thu"
          style={s.iconBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/host/billing');
          }}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Chi tiết phiếu thu</Text>
          <Text style={s.headerSub}>{bill ? formatBillCode(bill.id) : `#${id || '—'}`}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!host.allowed ? (
        <View style={s.centerWrap}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>Bạn không có quyền xem phiếu thu này.</Text>
          </View>
        </View>
      ) : loading && !detail ? (
        <ContentLoading message="Đang tải chi tiết phiếu thu..." />
      ) : !bill ? (
        <View style={s.centerWrap}>
          <View style={s.card}>
            <InlineError message={error || 'Không tìm thấy phiếu thu.'} />
            <PrimaryButton title="Thử tải lại" onPress={() => setReloadTick(prev => prev + 1)} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  setReloadTick(prev => prev + 1);
                }}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {notice ? (
              <View style={s.noticeBox}>
                <Feather name="check-circle" size={15} color={c.primary} />
                <Text style={s.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <InlineError message={error} />

            {/* Main Identity & Dual Status Card */}
            <View style={s.card}>
              <View style={s.topRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.kicker}>
                    {bill.kind === 'UTILITIES' ? 'PHIẾU ĐIỆN NƯỚC BỔ SUNG' : 'PHIẾU THU CHÍNH'} ·
                    KỲ {formatBillingMonthShort(bill.month)}
                  </Text>
                  <Text style={s.roomHeading}>
                    Phòng {bill.roomNumber} — {formatBillCode(bill.id)}
                  </Text>
                </View>
              </View>

              <View style={s.badgesRow}>
                <View style={[s.badge, { backgroundColor: pillColor.bg }]}>
                  <Text style={[s.badgeText, { color: pillColor.fg }]}>
                    {BILL_STATUS_LABELS[bill.status] || bill.status}
                  </Text>
                </View>
                {bill.overdue ? (
                  <View style={[s.badge, { backgroundColor: '#FEE2E2' }]}>
                    <Feather name="alert-circle" size={11} color="#991B1B" />
                    <Text style={[s.badgeText, { color: '#991B1B' }]}>Quá hạn</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Text style={s.metaLbl}>Người thuê</Text>
                  <Text style={s.metaVal}>{bill.tenantName || 'Chưa cập nhật'}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLbl}>Hạn thanh toán</Text>
                  <Text style={[s.metaVal, bill.overdue && { color: c.error }]}>
                    {formatIsoDateShort(bill.dueDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Financial Progress Card */}
            {!isDraft ? (
              <View style={s.progressCard}>
                <View style={s.kvRow}>
                  <Text style={s.progressLbl}>Còn phải thu</Text>
                  <Text style={s.progressPct}>{paidPct}% đã thu</Text>
                </View>
                <Text style={s.outstandingHero}>{formatBillMoney(bill.outstanding)}</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${paidPct}%` }]} />
                </View>
                <View style={s.kvRow}>
                  <Text style={s.progressSub}>
                    Đã thu: <Text style={s.progressSubBold}>{formatBillMoney(bill.paidAmount)}</Text>
                  </Text>
                  <Text style={s.progressSub}>
                    Tổng: <Text style={s.progressSubBold}>{formatBillMoney(bill.totalAmount)}</Text>
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Line Items Breakdown (strictly from issued/saved backend values) */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Chi tiết khoản thu</Text>

              {vndValue(bill.rentAmount) > 0n ? (
                <View style={s.lineItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lineItemLbl}>Tiền phòng</Text>
                    {bill.rentFrom && bill.rentThrough ? (
                      <Text style={s.lineItemSub}>
                        {formatIsoDateShort(bill.rentFrom)} – {formatIsoDateShort(bill.rentThrough)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={s.lineItemVal}>{formatBillMoney(bill.rentAmount)}</Text>
                </View>
              ) : null}

              {bill.includesUtilities ? (
                <>
                  <View style={s.lineItemRow}>
                    <Text style={s.lineItemLbl}>Tiền điện</Text>
                    <Text style={s.lineItemVal}>{formatBillMoney(bill.electricityAmount)}</Text>
                  </View>
                  <View style={s.lineItemRow}>
                    <Text style={s.lineItemLbl}>Tiền nước</Text>
                    <Text style={s.lineItemVal}>{formatBillMoney(bill.waterAmount)}</Text>
                  </View>
                </>
              ) : null}

              {(bill.charges || []).map((charge, idx) => (
                <View key={`${charge.label}-${idx}`} style={s.lineItemRow}>
                  <Text style={s.lineItemLbl}>{charge.label}</Text>
                  <Text style={s.lineItemVal}>{formatBillMoney(charge.amount)}</Text>
                </View>
              ))}

              <View style={s.divider} />

              <View style={s.lineItemRow}>
                <Text style={s.totalLbl}>Tổng phải thu</Text>
                <Text style={s.totalVal}>{formatBillMoney(bill.totalAmount)}</Text>
              </View>
              {!isDraft ? (
                <>
                  <View style={s.lineItemRow}>
                    <Text style={s.lineItemSub}>Đã thanh toán</Text>
                    <Text style={[s.lineItemVal, { color: '#15803D' }]}>
                      {formatBillMoney(bill.paidAmount)}
                    </Text>
                  </View>
                  <View style={s.lineItemRow}>
                    <Text style={s.totalLbl}>Còn phải thu</Text>
                    <Text style={[s.totalVal, { color: outstanding > 0n ? c.primary : '#15803D' }]}>
                      {formatBillMoney(bill.outstanding)}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Chronological Payment History */}
            {!isDraft ? (
              <View style={s.card}>
                <Text style={s.sectionTitle}>Lịch sử thanh toán ({payments.length})</Text>
                {payments.length === 0 ? (
                  <Text style={s.emptyHistory}>Chưa có giao dịch thanh toán nào được ghi nhận.</Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {payments.map(p => (
                      <View key={p.id} style={s.paymentRow}>
                        <View style={s.paymentIcon}>
                          <Feather name="check" size={14} color={c.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={s.kvRow}>
                            <Text style={s.paymentAmount}>+{formatBillMoney(p.amount)}</Text>
                            <Text style={s.paymentDate}>{formatIsoDateShort(p.paidOn)}</Text>
                          </View>
                          <Text style={s.paymentMethod}>
                            {PAYMENT_METHOD_LABELS[p.method] || p.method}
                            {p.method === 'TRANSFER' ? ' · Chủ trọ tự ghi nhận' : ''}
                          </Text>
                          {p.note ? <Text style={s.paymentNote}>{p.note}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* Sticky Action Footer */}
          {isDraft ? (
            <View style={s.footer}>
              <PrimaryButton
                title="Phát hành phiếu"
                loading={issueBusy}
                disabled={issueBusy}
                onPress={() => setIssueConfirmOpen(true)}
              />
            </View>
          ) : outstanding > 0n ? (
            <View style={s.footer}>
              <PrimaryButton
                title="Ghi nhận thanh toán"
                onPress={() => {
                  setPayError(null);
                  setPaySheetOpen(true);
                }}
              />
            </View>
          ) : null}
        </>
      )}

      <BillingPaymentSheet
        visible={paySheetOpen}
        bill={bill}
        todayIso={todayIsoVietnam()}
        busy={payBusy}
        error={payError}
        onClose={() => setPaySheetOpen(false)}
        onSubmit={payload => {
          void handleRecordPayment(payload);
        }}
      />

      {issueConfirmOpen && bill ? (
        <ConfirmDialog
          title={`Phát hành phiếu ${formatBillCode(bill.id)}?`}
          description={`Tổng phải thu ${formatBillMoney(bill.totalAmount)}. Sau khi phát hành, phiếu sẽ tính vào công nợ và không thể sửa bản nháp.`}
          confirmLabel="Xác nhận phát hành"
          cancelLabel="Quay lại"
          busy={issueBusy}
          onCancel={() => setIssueConfirmOpen(false)}
          onConfirm={() => {
            void handleConfirmIssue();
          }}
        />
      ) : null}
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
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  headerSub: {
    fontSize: 12,
    color: c.textSecondary,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.softMint,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: 0.4,
  },
  roomHeading: {
    fontSize: 19,
    fontWeight: '700',
    color: c.forestInk,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: authRadius.round,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaLbl: {
    fontSize: 12,
    color: c.textMuted,
  },
  metaVal: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
  progressCard: {
    backgroundColor: c.primaryDark,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressLbl: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  progressPct: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DDECE6',
  },
  outstandingHero: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#7EE2CE',
  },
  progressSub: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.82)',
  },
  progressSubBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineItemLbl: {
    fontSize: 14,
    color: c.forestInk,
  },
  lineItemSub: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  lineItemVal: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginVertical: 2,
  },
  totalLbl: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  totalVal: {
    fontSize: 16.5,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  emptyHistory: {
    fontSize: 13.5,
    color: c.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  paymentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  paymentAmount: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#15803D',
    fontVariant: ['tabular-nums'],
  },
  paymentDate: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  paymentMethod: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  paymentNote: {
    fontSize: 12.5,
    color: c.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});
