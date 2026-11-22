import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  BillingDraftSheet,
  BillingFilterSheet,
  BillingScheduleSheet,
  type BillingFilterValue,
} from '@/components/host/billing-sheets';
import { Segments, useManagedProperty } from '@/components/host/management-ui';
import { CompactPropertyPicker } from '@/components/host/room-types-sheets';
import { UtilityMonthPickerSheet } from '@/components/host/utilities-sheets';
import { ContentLoading } from '@/components/loading';
import { useReducedMotionPreference } from '@/constants/motion';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import {
  BILL_STATUS_LABELS,
  billTotals,
  candidateNeedsBilling,
  candidateNeedsSupplementalUtilities,
  candidateUtilitiesTotal,
  describeCycle,
  filterBills,
  filterCandidates,
  formatBillCode,
  formatBillMoney,
  formatBillingMonthShort,
  formatIsoDateShort,
  vndValue,
  type BillKind,
  type BillStatus,
  type BillingBill,
  type BillingCandidate,
  type BillingDraftPayload,
  type BillingLedger,
  type BillingSchedulePayload,
} from '@/services/room-billing';
import {
  fetchBillingLedger,
  issueBillingBill,
  saveBillingDraft,
  saveBillingSchedule,
} from '@/services/room-billing-api';
import { exportBillsCsvReport } from '@/services/room-billing-export';
import {
  formatUtilityMonth,
  shiftUtilityMonth,
  utilityCurrentMonth,
} from '@/services/room-utilities';

function statusBadgeStyle(status: BillStatus) {
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

export default function HostBillingScreen() {
  const params = useLocalSearchParams<{
    propertyId?: string;
    roomId?: string;
    month?: string;
    tab?: string;
  }>();
  const initialRoomId = params.roomId && /^\d+$/.test(params.roomId) ? Number(params.roomId) : null;
  const initialMonth =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : utilityCurrentMonth();

  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const { properties, property, select } = useManagedProperty(params.propertyId);
  const propertyId = property?.propertyId ?? null;

  const [month, setMonth] = useState(initialMonth);
  const [tab, setTab] = useState<'bills' | 'candidates'>(
    params.tab === 'candidates' ? 'candidates' : 'bills'
  );
  const [ledger, setLedger] = useState<BillingLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<BillingFilterValue>({
    status: 'ALL',
    roomId: initialRoomId,
  });

  // Sheets
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [draftModal, setDraftModal] = useState<{
    candidate: BillingCandidate;
    kind: BillKind;
    bill: BillingBill | null;
  } | null>(null);
  const [scheduleCandidate, setScheduleCandidate] = useState<BillingCandidate | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const fetchGenRef = useRef(0);
  const actionLockRef = useRef(false);

  const loadLedger = useCallback(
    async (isRefresh = false) => {
      if (!host.allowed || !propertyId) return;
      const gen = ++fetchGenRef.current;
      const controller = new AbortController();
      if (isRefresh) setRefreshing(true);
      else if (!ledger) setLoading(true);
      setLoadError(null);

      try {
        const token = await tokenStore.get();
        if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const data = await fetchBillingLedger(propertyId, month, token, controller.signal);
        if (gen === fetchGenRef.current && !controller.signal.aborted) {
          setLedger(data);
        }
      } catch (cause) {
        if (gen === fetchGenRef.current && !controller.signal.aborted) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'Không thể tải dữ liệu phiếu thu và công nợ.'
          );
        }
      } finally {
        if (gen === fetchGenRef.current && !controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [host.allowed, propertyId, month, ledger]
  );

  useFocusEffect(
    useCallback(() => {
      void loadLedger(false);
    }, [loadLedger])
  );

  const bills = useMemo(() => ledger?.bills || [], [ledger]);
  const earlierDebt = useMemo(() => ledger?.earlierDebt || [], [ledger]);
  const candidates = useMemo(() => ledger?.candidates || [], [ledger]);

  const roomOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of [...candidates, ...bills, ...earlierDebt]) {
      map.set(item.roomId, item.roomNumber);
    }
    return Array.from(map.entries()).map(([roomId, roomNumber]) => ({ roomId, roomNumber }));
  }, [candidates, bills, earlierDebt]);

  const filteredBills = useMemo(
    () =>
      filterBills(bills, earlierDebt, {
        status: filters.status,
        roomId: filters.roomId,
        query: search,
      }),
    [bills, earlierDebt, filters, search]
  );

  const filteredCandidates = useMemo(
    () => filterCandidates(candidates, { roomId: filters.roomId, query: search }),
    [candidates, filters.roomId, search]
  );

  const pendingCandidateCount = useMemo(
    () => candidates.filter(candidateNeedsBilling).length,
    [candidates]
  );

  // Totals computed from complete filtered bill set (excludes DRAFT)
  const totals = useMemo(() => billTotals(filteredBills), [filteredBills]);

  const handleSaveDraft = async (payload: BillingDraftPayload) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setSheetBusy(true);
    setSheetError(null);
    const controller = new AbortController();
    try {
      const token = await tokenStore.get();
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
      const saved = await saveBillingDraft(payload, token, controller.signal);
      setDraftModal(null);
      setNotice(`Đã lưu bản nháp phiếu ${formatBillCode(saved.id)}.`);
      void loadLedger(true);
    } catch (cause) {
      setSheetError(cause instanceof Error ? cause.message : 'Chưa thể lưu bản nháp phiếu.');
    } finally {
      actionLockRef.current = false;
      setSheetBusy(false);
    }
  };

  const handleSaveAndIssue = async (payload: BillingDraftPayload) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setSheetBusy(true);
    setSheetError(null);
    const controller = new AbortController();
    try {
      const token = await tokenStore.get();
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
      const saved = await saveBillingDraft(payload, token, controller.signal);
      const issued = await issueBillingBill(saved.id, saved.revision, token, controller.signal);
      setDraftModal(null);
      setNotice(`Đã phát hành phiếu ${formatBillCode(issued.id)} (chưa thanh toán).`);
      setTab('bills');
      void loadLedger(true);
    } catch (cause) {
      setSheetError(cause instanceof Error ? cause.message : 'Chưa thể phát hành phiếu thu.');
    } finally {
      actionLockRef.current = false;
      setSheetBusy(false);
    }
  };

  const handleSaveSchedule = async (payload: BillingSchedulePayload) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setSheetBusy(true);
    setSheetError(null);
    const controller = new AbortController();
    try {
      const token = await tokenStore.get();
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
      const nextLedger = await saveBillingSchedule(payload, token, controller.signal);
      setLedger(nextLedger);
      setScheduleCandidate(null);
      setNotice('Đã lưu chu kỳ thu tiền phòng.');
    } catch (cause) {
      setSheetError(cause instanceof Error ? cause.message : 'Chưa thể lưu chu kỳ thu tiền.');
    } finally {
      actionLockRef.current = false;
      setSheetBusy(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportBillsCsvReport(filteredBills, {
        propertyName: property?.name || '',
        month,
      });
      setNotice('Đã chuẩn bị tệp báo cáo phiếu thu CSV.');
    } catch {
      setNotice('Chưa thể xuất báo cáo CSV lúc này.');
    }
  };

  const activeFilterCount = (filters.status !== 'ALL' ? 1 : 0) + (filters.roomId != null ? 1 : 0);

  const listHeader = (
    <View style={s.headerSections}>
      {/* Property & Month Picker */}
      <View style={{ gap: 8 }}>
        <CompactPropertyPicker
          properties={properties}
          property={property}
          onSelect={nextId => {
            if (nextId !== propertyId) {
              setLedger(null);
              setFilters({ status: 'ALL', roomId: null });
              setSearch('');
              select(nextId);
            }
          }}
        />

        <View style={s.monthBar}>
          <AnimatedPressable
            accessibilityLabel="Kỳ trước"
            style={s.monthArrowBtn}
            onPress={() => {
              setLedger(null);
              setMonth(prev => shiftUtilityMonth(prev, -1));
            }}
          >
            <Feather name="chevron-left" size={18} color={c.forestInk} />
          </AnimatedPressable>

          <AnimatedPressable
            scaleTo={0.98}
            style={s.monthCenterBtn}
            onPress={() => setMonthPickerOpen(true)}
          >
            <Feather name="calendar" size={15} color={c.primary} />
            <Text style={s.monthCenterText}>Kỳ {formatBillingMonthShort(month)}</Text>
            <Feather name="chevron-down" size={15} color={c.textSecondary} />
          </AnimatedPressable>

          <AnimatedPressable
            accessibilityLabel="Kỳ sau"
            style={s.monthArrowBtn}
            onPress={() => {
              setLedger(null);
              setMonth(prev => shiftUtilityMonth(prev, 1));
            }}
          >
            <Feather name="chevron-right" size={18} color={c.forestInk} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Financial Overview Hero Card */}
      <View style={s.financeCard}>
        <View style={s.rowBetween}>
          <Text style={s.financeEyebrow}>CÒN PHẢI THU</Text>
          {totals.overdueCount > 0 ? (
            <View style={s.overdueChip}>
              <Feather name="alert-circle" size={11} color="#FEF2F2" />
              <Text style={s.overdueChipText}>{totals.overdueCount} quá hạn</Text>
            </View>
          ) : (
            <Text style={s.financePctText}>{totals.paidPercent}% đã thu</Text>
          )}
        </View>

        <Text style={s.financeHeroAmount}>{formatBillMoney(totals.outstanding)}</Text>

        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${totals.paidPercent}%` }]} />
        </View>

        <View style={s.financeGrid}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.financeSubLbl}>Tổng phải thu</Text>
            <Text style={s.financeSubVal}>{formatBillMoney(totals.total)}</Text>
          </View>
          <View style={s.financeSep} />
          <View style={{ flex: 1, gap: 2, alignItems: 'flex-end' }}>
            <Text style={s.financeSubLbl}>Đã thu</Text>
            <Text style={[s.financeSubVal, { color: '#7EE2CE' }]}>
              {formatBillMoney(totals.paid)}
            </Text>
          </View>
        </View>
      </View>

      {/* 2 Main Tabs (Segmented Control) */}
      <Segments
        items={[
          ['bills', `Phiếu thu (${bills.length})`],
          ['candidates', `Cần lập phiếu (${pendingCandidateCount})`],
        ]}
        value={tab}
        onChange={next => setTab(next as 'bills' | 'candidates')}
      />

      {/* Search & Filter Row */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color={c.textMuted} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm mã phiếu, phòng, người thuê..."
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <AnimatedPressable onPress={() => setSearch('')}>
              <Feather name="x-circle" size={16} color={c.textMuted} />
            </AnimatedPressable>
          ) : null}
        </View>

        <AnimatedPressable
          scaleTo={0.97}
          accessibilityLabel="Mở bộ lọc phiếu thu"
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={() => setFilterSheetOpen(true)}
        >
          <Feather
            name="sliders"
            size={16}
            color={activeFilterCount > 0 ? '#FFFFFF' : c.forestInk}
          />
          {activeFilterCount > 0 ? (
            <Text style={s.filterBadge}>{activeFilterCount}</Text>
          ) : null}
        </AnimatedPressable>
      </View>

      {notice ? (
        <View style={s.noticeBanner}>
          <Feather name="check-circle" size={15} color={c.primary} />
          <Text style={s.noticeText}>{notice}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderBillCard = ({ item }: { item: BillingBill }) => {
    const pill = statusBadgeStyle(item.status);
    const isDraft = item.status === 'DRAFT';

    return (
      <AnimatedPressable
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={`Phiếu ${formatBillCode(item.id)}, phòng ${item.roomNumber}`}
        style={[s.billCard, item.overdue && s.billCardOverdue]}
        onPress={() =>
          router.push({
            pathname: '/host/bill-detail',
            params: { id: String(item.id) },
          })
        }
      >
        <View style={s.rowBetween}>
          <Text style={s.cardRoomTitle} numberOfLines={1}>
            Phòng {item.roomNumber} — Phiếu {formatBillCode(item.id)}
          </Text>
          <Feather name="chevron-right" size={18} color={c.textMuted} />
        </View>

        <View style={s.badgesRow}>
          <View style={[s.badge, { backgroundColor: pill.bg }]}>
            <Text style={[s.badgeText, { color: pill.fg }]}>
              {BILL_STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
          {item.overdue ? (
            <View style={[s.badge, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="alert-circle" size={11} color="#991B1B" />
              <Text style={[s.badgeText, { color: '#991B1B' }]}>Quá hạn</Text>
            </View>
          ) : null}
          {item.kind === 'UTILITIES' ? (
            <View style={[s.badge, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[s.badgeText, { color: '#0369A1' }]}>Điện nước bổ sung</Text>
            </View>
          ) : null}
        </View>

        <View style={s.metaLine}>
          <Text style={s.metaText}>
            {item.tenantName || 'Chưa có tên'} · Kỳ {formatBillingMonthShort(item.month)} · Hạn{' '}
            <Text style={item.overdue ? { color: c.error, fontWeight: '700' } : undefined}>
              {formatIsoDateShort(item.dueDate)}
            </Text>
          </Text>
        </View>

        <View style={s.moneyGrid}>
          <View style={s.moneyCell}>
            <Text style={s.moneyLbl}>Tổng thu</Text>
            <Text style={s.moneyVal}>{formatBillMoney(item.totalAmount)}</Text>
          </View>
          <View style={s.moneyCell}>
            <Text style={s.moneyLbl}>Đã thu</Text>
            <Text style={[s.moneyVal, { color: '#15803D' }]}>
              {isDraft ? '0đ' : formatBillMoney(item.paidAmount)}
            </Text>
          </View>
          <View style={[s.moneyCell, { alignItems: 'flex-end' }]}>
            <Text style={s.moneyLbl}>Còn thiếu</Text>
            <Text
              style={[
                s.moneyVal,
                { color: !isDraft && vndValue(item.outstanding) > 0n ? c.primary : c.forestInk },
              ]}
            >
              {isDraft ? 'Bản nháp' : formatBillMoney(item.outstanding)}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  const renderCandidateCard = ({ item }: { item: BillingCandidate }) => {
    const utilSum = candidateUtilitiesTotal(item);
    const canCreateSupplemental = candidateNeedsSupplementalUtilities(item);
    const mainBill = item.mainBillId ? bills.find(b => b.id === item.mainBillId) || null : null;
    const utilBill = item.utilityBillId
      ? bills.find(b => b.id === item.utilityBillId) || null
      : null;

    return (
      <View style={s.billCard}>
        <View style={s.rowBetween}>
          <Text style={s.cardRoomTitle}>
            Phòng {item.roomNumber}
            {item.floor ? ` · ${item.floor}` : ''}
          </Text>
          <View style={[s.badge, { backgroundColor: c.softMint }]}>
            <Text style={[s.badgeText, { color: c.primary }]}>
              {describeCycle(item.schedule?.cycleMonths)}
            </Text>
          </View>
        </View>

        <Text style={s.metaText}>
          Người thuê: <Text style={{ fontWeight: '600', color: c.forestInk }}>{item.tenantName || '—'}</Text> ·
          Bắt đầu {formatIsoDateShort(item.startDate)}
        </Text>

        {item.issue ? (
          <Text style={{ fontSize: 12.5, color: c.error, fontWeight: '600' }}>{item.issue}</Text>
        ) : (
          <View style={s.candMetrics}>
            <Text style={s.candMetricLine}>
              Tiền phòng kỳ này:{' '}
              <Text style={s.candMetricBold}>
                {item.rent ? formatBillMoney(item.rent.amount) : 'Không đến kỳ thu'}
              </Text>
            </Text>
            <Text style={s.candMetricLine}>
              Điện nước:{' '}
              <Text style={[s.candMetricBold, item.utilities && { color: c.primary }]}>
                {item.utilities
                  ? `Đã chốt ${formatBillMoney(utilSum)}${item.utilitiesAlreadyBilled ? ' (Đã lên phiếu)' : ''}`
                  : 'Chưa chốt chỉ số'}
              </Text>
            </Text>
          </View>
        )}

        {/* Only valid contextual actions */}
        {!item.issue ? (
          <View style={s.candActions}>
            {!item.scheduleLocked ? (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.candGhostBtn}
                onPress={() => {
                  setSheetError(null);
                  setScheduleCandidate(item);
                }}
              >
                <Feather name="calendar" size={13} color={c.forestInk} />
                <Text style={s.candGhostText}>Chu kỳ thu</Text>
              </AnimatedPressable>
            ) : null}

            {item.mainBillId && mainBill ? (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.candGhostBtn}
                onPress={() => {
                  if (mainBill.status === 'DRAFT') {
                    setSheetError(null);
                    setDraftModal({ candidate: item, kind: 'MAIN', bill: mainBill });
                  } else {
                    router.push({
                      pathname: '/host/bill-detail',
                      params: { id: String(mainBill.id) },
                    });
                  }
                }}
              >
                <Text style={s.candGhostText}>
                  {mainBill.status === 'DRAFT' ? 'Sửa nháp chính' : 'Xem phiếu chính'}
                </Text>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.candPrimaryBtn}
                onPress={() => {
                  setSheetError(null);
                  setDraftModal({ candidate: item, kind: 'MAIN', bill: null });
                }}
              >
                <Text style={s.candPrimaryText}>Lập phiếu chính</Text>
              </AnimatedPressable>
            )}

            {canCreateSupplemental ? (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.candPrimaryBtn}
                onPress={() => {
                  setSheetError(null);
                  setDraftModal({ candidate: item, kind: 'UTILITIES', bill: null });
                }}
              >
                <Text style={s.candPrimaryText}>Lập phiếu điện nước</Text>
              </AnimatedPressable>
            ) : utilBill ? (
              <AnimatedPressable
                scaleTo={0.97}
                style={s.candGhostBtn}
                onPress={() =>
                  router.push({
                    pathname: '/host/bill-detail',
                    params: { id: String(utilBill.id) },
                  })
                }
              >
                <Text style={s.candGhostText}>Xem phiếu ĐN</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          style={s.iconBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/home');
          }}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Phiếu thu & Công nợ
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {formatUtilityMonth(month)}
            {property?.name ? ` · ${property.name}` : ''}
          </Text>
        </View>

        <AnimatedPressable
          accessibilityLabel="Mở menu thao tác phiếu thu"
          style={s.iconBtn}
          onPress={() => setMenuOpen(true)}
        >
          <Feather name="more-horizontal" size={20} color={c.forestInk} />
        </AnimatedPressable>
      </View>

      {!host.allowed ? (
        <View style={s.centerWrap}>
          <View style={s.emptyCard}>
            <Feather name="lock" size={28} color={c.textSecondary} />
            <Text style={s.emptyTitle}>Bạn không có quyền truy cập</Text>
            <PrimaryButton title="Quay lại" onPress={() => router.back()} />
          </View>
        </View>
      ) : !propertyId ? (
        <View style={s.centerWrap}>
          <View style={s.emptyCard}>
            <Feather name="home" size={28} color={c.primary} />
            <Text style={s.emptyTitle}>Chưa có nhà trọ để quản lý công nợ</Text>
            <PrimaryButton title="Về danh sách nhà trọ" onPress={() => router.replace('/home')} />
          </View>
        </View>
      ) : loading && !ledger ? (
        <ContentLoading message="Đang tải phiếu thu & công nợ..." />
      ) : loadError && !ledger ? (
        <View style={s.centerWrap}>
          <View style={s.emptyCard}>
            <InlineError message={loadError} />
            <PrimaryButton title="Thử tải lại" onPress={() => void loadLedger(false)} />
          </View>
        </View>
      ) : tab === 'bills' ? (
        <FlatList
          data={filteredBills}
          keyExtractor={item => `bill-${item.id}`}
          ListHeaderComponent={listHeader}
          renderItem={renderBillCard}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadLedger(true)}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Feather name="file-text" size={26} color={c.primary} />
              <Text style={s.emptyTitle}>Chưa có phiếu thu phù hợp</Text>
              <Text style={s.emptyDesc}>
                Chuyển sang tab &quot;Cần lập phiếu&quot; để tạo phiếu mới hoặc đặt lại bộ lọc.
              </Text>
              {activeFilterCount > 0 || search ? (
                <PrimaryButton
                  title="Đặt lại bộ lọc"
                  onPress={() => {
                    setSearch('');
                    setFilters({ status: 'ALL', roomId: null });
                  }}
                />
              ) : null}
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredCandidates}
          keyExtractor={item => `cand-${item.tenancyKey}`}
          ListHeaderComponent={listHeader}
          renderItem={renderCandidateCard}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadLedger(true)}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Feather name="check-circle" size={26} color={c.primary} />
              <Text style={s.emptyTitle}>Không có đợt thuê nào cần lập phiếu</Text>
              <Text style={s.emptyDesc}>
                Các phòng có đợt thuê đang hoạt động trong kỳ sẽ xuất hiện tại đây.
              </Text>
            </View>
          }
        />
      )}

      {/* Sheets */}
      <UtilityMonthPickerSheet
        visible={monthPickerOpen}
        selectedMonth={month}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={next => {
          if (next !== month) {
            setLedger(null);
            setMonth(next);
          }
        }}
      />

      <BillingFilterSheet
        visible={filterSheetOpen}
        value={filters}
        rooms={roomOptions}
        earlierCount={earlierDebt.length}
        onClose={() => setFilterSheetOpen(false)}
        onApply={setFilters}
      />

      {propertyId ? (
        <>
          <BillingDraftSheet
            visible={Boolean(draftModal)}
            propertyId={propertyId}
            propertyName={property?.name || ''}
            month={month}
            candidate={draftModal?.candidate || null}
            kind={draftModal?.kind || 'MAIN'}
            bill={draftModal?.bill || null}
            busy={sheetBusy}
            error={sheetError}
            onClose={() => setDraftModal(null)}
            onSaveDraft={payload => {
              void handleSaveDraft(payload);
            }}
            onSaveAndIssue={payload => {
              void handleSaveAndIssue(payload);
            }}
          />

          <BillingScheduleSheet
            visible={Boolean(scheduleCandidate)}
            propertyId={propertyId}
            month={month}
            candidate={scheduleCandidate}
            busy={sheetBusy}
            error={sheetError}
            onClose={() => setScheduleCandidate(null)}
            onSave={payload => {
              void handleSaveSchedule(payload);
            }}
          />
        </>
      ) : null}

      {/* Overflow Menu Sheet (Export CSV, Utilities, Earlier Debt) */}
      {menuOpen ? (
        <Modal
          transparent
          animationType={reducedMotion ? 'none' : 'fade'}
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={s.menuBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            <SafeAreaView edges={['bottom', 'left', 'right']} style={s.menuSheet}>
              <View style={s.handle} />
              <Text style={s.menuHeading}>Thao tác quản lý thu tiền</Text>

              <AnimatedPressable
                scaleTo={0.98}
                style={s.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  void handleExportCsv();
                }}
              >
                <Feather name="download" size={17} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.menuItemTitle}>Xuất báo cáo phiếu thu (CSV)</Text>
                  <Text style={s.menuItemSub}>
                    Xuất {filteredBills.length} phiếu trong phạm vi đang xem
                  </Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.98}
                style={s.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setTab('bills');
                  setFilters(prev => ({ ...prev, status: 'EARLIER' }));
                }}
              >
                <Feather name="clock" size={17} color="#B45309" />
                <View style={{ flex: 1 }}>
                  <Text style={s.menuItemTitle}>
                    Xem công nợ kỳ trước ({earlierDebt.length})
                  </Text>
                  <Text style={s.menuItemSub}>Các phiếu còn thiếu từ các tháng trước</Text>
                </View>
              </AnimatedPressable>

              <AnimatedPressable
                scaleTo={0.98}
                style={s.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  if (propertyId) {
                    router.push({
                      pathname: '/host/utilities',
                      params: { propertyId: String(propertyId), month },
                    });
                  }
                }}
              >
                <Feather name="zap" size={17} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.menuItemTitle}>Mở màn Ghi điện nước</Text>
                  <Text style={s.menuItemSub}>Chốt chỉ số điện nước cho kỳ {formatBillingMonthShort(month)}</Text>
                </View>
              </AnimatedPressable>
            </SafeAreaView>
          </View>
        </Modal>
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
    gap: 8,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  headerSections: {
    gap: 11,
    marginBottom: 12,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenterBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  monthCenterText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  financeCard: {
    backgroundColor: c.primaryDark,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  financeEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.78)',
  },
  financePctText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDECE6',
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
  },
  overdueChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  financeHeroAmount: {
    fontSize: 27,
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
  financeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
  },
  financeSep: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 12,
  },
  financeSubLbl: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.75)',
  },
  financeSubVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.forestInk,
  },
  filterBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  filterBtnActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: c.softMint,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  billCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 8,
  },
  billCardOverdue: {
    borderColor: '#FCA5A5',
  },
  cardRoomTitle: {
    flex: 1,
    fontSize: 15.5,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  moneyGrid: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  moneyCell: {
    flex: 1,
    gap: 2,
  },
  moneyLbl: {
    fontSize: 11.5,
    color: c.textMuted,
  },
  moneyVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  candMetrics: {
    gap: 4,
    paddingTop: 4,
  },
  candMetricLine: {
    fontSize: 13,
    color: c.textSecondary,
  },
  candMetricBold: {
    fontWeight: '700',
    color: c.forestInk,
  },
  candActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
  },
  candGhostBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  candGhostText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  candPrimaryBtn: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  menuHeading: {
    fontSize: 16.5,
    fontWeight: '700',
    color: c.forestInk,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  menuItemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  menuItemSub: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
});
