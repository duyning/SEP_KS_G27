import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { useManagedProperty } from '@/components/host/management-ui';
import { CompactPropertyPicker } from '@/components/host/room-types-sheets';
import {
  UtilityDatePickerSheet,
  UtilityFilterSheet,
  UtilityFinalizeConfirmSheet,
  UtilityMenuSheet,
  UtilityMonthPickerSheet,
  type UtilityFilterValue,
} from '@/components/host/utilities-sheets';
import { UtilityRoomCard } from '@/components/host/utility-room-card';
import { ContentLoading } from '@/components/loading';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError } from '@/services/host';
import {
  buildUtilityDraft,
  extractUtilityFloors,
  filterUtilityRows,
  findCarriedHandover,
  findNextPendingUtilityRow,
  formatUtilityMonth,
  hasRealUtilityEdit,
  parseUtilityDrafts,
  partitionUtilitySaveBatch,
  serializeUtilityDrafts,
  shiftUtilityMonth,
  summarizeUtilityStats,
  utilityCurrentMonth,
  utilityEntryPayload,
  utilityRowKey,
  validateUtilityRow,
  type UtilityBatchItem,
  type UtilityDraftPatch,
  type UtilityLedger,
  type UtilityRow,
  type UtilityStatusFilter,
} from '@/services/room-utilities';
import { fetchUtilityLedger, saveUtilityReadings } from '@/services/room-utilities-api';
import {
  clearUtilityDrafts,
  readUtilityDrafts,
  writeUtilityDrafts,
} from '@/services/room-utilities-draft';

export default function HostUtilitiesScreen() {
  const params = useLocalSearchParams<{
    propertyId?: string;
    roomId?: string;
    month?: string;
  }>();
  const initialRoomId = params.roomId && /^\d+$/.test(params.roomId) ? Number(params.roomId) : null;
  const initialMonth =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : utilityCurrentMonth();

  const { user } = useAuth();
  const host = useHost();
  const { properties, property, select } = useManagedProperty(params.propertyId);
  const propertyId = property?.propertyId ?? null;
  const userId = user?.userId ?? null;

  const [month, setMonth] = useState(initialMonth);
  const [ledger, setLedger] = useState<UtilityLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [edits, setEdits] = useState<Record<string, UtilityDraftPatch>>({});
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(() => new Set());
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [justFinalizedKey, setJustFinalizedKey] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<UtilityFilterValue>({
    status: 'ALL',
    floor: 'ALL',
    roomId: initialRoomId,
  });

  // Modals & sheets
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [datePickerRowKey, setDatePickerRowKey] = useState<string | null>(null);
  const [confirmItems, setConfirmItems] = useState<UtilityBatchItem[]>([]);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [unlockPromptKey, setUnlockPromptKey] = useState<string | null>(null);
  const [unsavedAction, setUnsavedAction] = useState<(() => void) | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const fetchGenRef = useRef(0);
  const saveLockRef = useRef(false);
  const listRef = useRef<FlatList<UtilityRow> | null>(null);

  // Fetch utility ledger with stale-request protection
  useEffect(() => {
    if (!host.allowed || !propertyId) {
      return;
    }

    const gen = ++fetchGenRef.current;
    const controller = new AbortController();

    async function loadLedger() {
      if (!refreshing) setLoading(true);
      setLoadError(null);
      setConflictError(null);

      try {
        const token = await tokenStore.get();
        if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const data = await fetchUtilityLedger(propertyId!, month, token, controller.signal);
        if (gen !== fetchGenRef.current || controller.signal.aborted) return;

        setLedger(data);
        setUnlockedKeys(new Set());
        setJustFinalizedKey(null);

        // Restore local unfinished drafts for this (userId, propertyId, month)
        let restored: Record<string, UtilityDraftPatch> = {};
        if (userId) {
          const raw = await readUtilityDrafts(userId, propertyId!, month);
          if (gen !== fetchGenRef.current || controller.signal.aborted) return;
          if (raw) {
            try {
              const parsed = parseUtilityDrafts(raw);
              // Keep only edits for rows that exist and aren't already finalized identically
              const rowMap = new Map(data.rows.map(r => [utilityRowKey(r), r]));
              for (const [key, patch] of Object.entries(parsed)) {
                const targetRow = rowMap.get(key);
                if (targetRow && !targetRow.saved && hasRealUtilityEdit(targetRow, patch)) {
                  restored[key] = patch;
                }
              }
            } catch {
              await clearUtilityDrafts(userId, propertyId!, month).catch(() => undefined);
            }
          }
        }
        setEdits(restored);

        // Auto-expand navigated target room if present
        if (initialRoomId) {
          const target = data.rows.find(r => r.roomId === initialRoomId);
          setExpandedKey(target ? utilityRowKey(target) : null);
        } else {
          setExpandedKey(null);
        }
      } catch (cause) {
        if (gen !== fetchGenRef.current || controller.signal.aborted) return;
        setLoadError(
          cause instanceof Error
            ? cause.message
            : 'Chưa thể tải bảng ghi điện nước. Vui lòng thử lại.'
        );
      } finally {
        if (gen === fetchGenRef.current && !controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadLedger();
    return () => {
      controller.abort();
    };
  }, [host.allowed, propertyId, month, userId, reloadTick, initialRoomId, refreshing]);

  const allRows = useMemo(() => ledger?.rows || [], [ledger]);
  const stats = useMemo(() => summarizeUtilityStats(allRows, edits), [allRows, edits]);
  const batch = useMemo(() => partitionUtilitySaveBatch(allRows, edits), [allRows, edits]);
  const floors = useMemo(() => extractUtilityFloors(allRows), [allRows]);
  const filteredRows = useMemo(
    () =>
      filterUtilityRows(allRows, edits, {
        search,
        status: filters.status,
        floor: filters.floor,
        roomId: filters.roomId,
      }),
    [allRows, edits, search, filters]
  );

  const hasUnsavedChanges = stats.unsaved > 0;
  const isPreviewMonth = Boolean(ledger && ledger.month > ledger.currentMonth);
  const canEditPeriod = Boolean(ledger?.editable);

  const guardUnsaved = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        setUnsavedAction(() => action);
      } else {
        action();
      }
    },
    [hasUnsavedChanges]
  );

  const handleBack = () => {
    guardUnsaved(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/home');
    });
  };

  const handleSwitchProperty = (nextPropertyId: number) => {
    if (nextPropertyId === propertyId) return;
    guardUnsaved(() => {
      setFilters({ status: 'ALL', floor: 'ALL', roomId: null });
      setSearch('');
      setNotice(null);
      select(nextPropertyId);
    });
  };

  const handleSwitchMonth = (nextMonth: string) => {
    if (nextMonth === month) return;
    guardUnsaved(() => {
      setNotice(null);
      setMonth(nextMonth);
    });
  };

  const handleChangeField = useCallback((rowKey: string, patch: UtilityDraftPatch) => {
    setEdits(prev => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), ...patch },
    }));
    setJustFinalizedKey(null);
    setConflictError(null);
  }, []);

  const handleSaveLocalDraft = async (rowNumber?: string) => {
    if (!userId || !propertyId) return;
    try {
      await writeUtilityDrafts(userId, propertyId, month, serializeUtilityDrafts(edits));
      setNotice(
        rowNumber
          ? `Đã lưu bản nháp cục bộ phòng ${rowNumber} (chưa chốt kỳ).`
          : 'Đã lưu bản nháp cục bộ kỳ ghi này.'
      );
    } catch {
      setNotice('Chưa thể lưu bản nháp cục bộ trên thiết bị.');
    }
  };

  const handleRequestFinalizeSingle = (row: UtilityRow) => {
    const key = utilityRowKey(row);
    const { priorRow, linkedDraft, carriedDate } = findCarriedHandover(row, allRows, edits);
    const draft = buildUtilityDraft(row, edits[key], linkedDraft);
    const validation = validateUtilityRow(row, draft);
    if (!validation.valid) return;

    const item: UtilityBatchItem = {
      key,
      row,
      draft,
      carried: carriedDate,
      validation,
      blockedByPrior: false,
      valid: true,
    };

    // If handover row in same room also has valid unsaved edit, include it so backend continuity passes
    const itemsToFinalize: UtilityBatchItem[] = [];
    if (priorRow && linkedDraft) {
      const priorKey = utilityRowKey(priorRow);
      const priorDraft = buildUtilityDraft(priorRow, edits[priorKey]);
      const priorVal = validateUtilityRow(priorRow, priorDraft);
      if (priorVal.valid) {
        itemsToFinalize.push({
          key: priorKey,
          row: priorRow,
          draft: priorDraft,
          carried: null,
          validation: priorVal,
          blockedByPrior: false,
          valid: true,
        });
      }
    }
    itemsToFinalize.push(item);

    setConfirmError(null);
    setConfirmItems(itemsToFinalize);
  };

  const handleConfirmFinalize = async () => {
    if (saveLockRef.current || !propertyId || confirmItems.length === 0) return;

    saveLockRef.current = true;
    setConfirmBusy(true);
    setConfirmError(null);
    setConflictError(null);

    const controller = new AbortController();
    try {
      const token = await tokenStore.get();
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

      const payload = {
        propertyId,
        month,
        entries: confirmItems.map(item => utilityEntryPayload(item.row, item.draft)),
      };

      const freshLedger = await saveUtilityReadings(payload, token, controller.signal);
      const savedKeys = new Set(confirmItems.map(item => item.key));

      setLedger(freshLedger);
      setEdits(prev => {
        const next = { ...prev };
        for (const k of savedKeys) delete next[k];
        if (userId) {
          if (Object.keys(next).length > 0) {
            void writeUtilityDrafts(userId, propertyId, month, serializeUtilityDrafts(next));
          } else {
            void clearUtilityDrafts(userId, propertyId, month);
          }
        }
        return next;
      });
      setUnlockedKeys(prev => {
        const next = new Set(prev);
        for (const k of savedKeys) next.delete(k);
        return next;
      });

      const lastKey = confirmItems[confirmItems.length - 1].key;
      setJustFinalizedKey(lastKey);
      setConfirmItems([]);
      setNotice(
        confirmItems.length === 1
          ? `Đã chốt kỳ thành công phòng ${confirmItems[0].row.roomNumber}.`
          : `Đã chốt kỳ thành công ${confirmItems.length} phòng.`
      );
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : 'Chưa thể chốt kỳ điện nước. Vui lòng thử lại.';
      setConfirmError(msg);
      if (cause instanceof HostError && cause.status === 409) {
        setConflictError(
          `${msg} Nhấn "Tải lại kỳ ghi" để đồng bộ số liệu mới nhất trước khi gửi lại.`
        );
      }
    } finally {
      saveLockRef.current = false;
      setConfirmBusy(false);
    }
  };

  const handleGoNextRoom = (currentKey: string) => {
    const nextRow = findNextPendingUtilityRow(filteredRows, currentKey, edits);
    if (!nextRow) {
      setNotice('Đã hoàn tất ghi điện nước cho các phòng trong danh sách.');
      setExpandedKey(null);
      return;
    }
    const nextKey = utilityRowKey(nextRow);
    setExpandedKey(nextKey);
    setJustFinalizedKey(null);
    const idx = filteredRows.findIndex(r => utilityRowKey(r) === nextKey);
    if (idx >= 0) {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.1 });
    }
  };

  const activeFilterCount =
    (filters.status !== 'ALL' ? 1 : 0) +
    (filters.floor !== 'ALL' ? 1 : 0) +
    (filters.roomId != null ? 1 : 0);

  const datePickerRow = datePickerRowKey
    ? allRows.find(r => utilityRowKey(r) === datePickerRowKey) || null
    : null;
  const datePickerDraft = datePickerRow
    ? buildUtilityDraft(datePickerRow, edits[datePickerRowKey!])
    : null;

  const toggleStatusStat = (target: UtilityStatusFilter) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status === target ? 'ALL' : target,
    }));
  };

  const listHeader = (
    <View style={s.listHeaderWrap}>
      {/* Compact Property & Period Selector */}
      <View style={s.periodBlock}>
        <CompactPropertyPicker
          properties={properties}
          property={property}
          onSelect={handleSwitchProperty}
        />

        <View style={s.monthBar}>
          <AnimatedPressable
            accessibilityLabel="Tháng trước"
            style={s.monthArrowBtn}
            onPress={() => handleSwitchMonth(shiftUtilityMonth(month, -1))}
          >
            <Feather name="chevron-left" size={18} color={c.forestInk} />
          </AnimatedPressable>

          <AnimatedPressable
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`Đang chọn ${formatUtilityMonth(month)}. Chạm để đổi tháng`}
            style={s.monthCenterBtn}
            onPress={() => setMonthPickerOpen(true)}
          >
            <Feather name="calendar" size={15} color={c.primary} />
            <Text style={s.monthCenterText}>{formatUtilityMonth(month)}</Text>
            <Feather name="chevron-down" size={15} color={c.textSecondary} />
          </AnimatedPressable>

          <AnimatedPressable
            accessibilityLabel="Tháng sau"
            style={s.monthArrowBtn}
            onPress={() => handleSwitchMonth(shiftUtilityMonth(month, 1))}
          >
            <Feather name="chevron-right" size={18} color={c.forestInk} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Preview / Inactive Period Notice */}
      {isPreviewMonth ? (
        <View style={s.infoBanner}>
          <Feather name="eye" size={15} color={c.primary} />
          <Text style={s.infoBannerText}>
            Tháng tương lai ở chế độ xem trước mốc đầu kỳ. Chuyển về tháng hiện tại hoặc quá khứ để
            ghi và chốt kỳ.
          </Text>
        </View>
      ) : ledger && !ledger.editable ? (
        <View style={s.warnBanner}>
          <Feather name="lock" size={15} color="#92400E" />
          <Text style={s.warnBannerText}>
            Nhà trọ chưa ở trạng thái hoạt động nên hiện chỉ có thể xem chỉ số điện nước.
          </Text>
        </View>
      ) : null}

      {/* Compact 4-Stat Overview Strip (strictly from FULL ledger.rows) */}
      <View style={s.statsStrip}>
        {(
          [
            ['ALL', 'Cần ghi', stats.total, c.forestInk],
            ['FINALIZED', 'Đã chốt', stats.completed, '#15803D'],
            ['UNRECORDED', 'Chưa ghi', stats.unrecorded, c.primary],
            ['UNSAVED', 'Chưa lưu', stats.unsaved, '#B45309'],
          ] as const
        ).map(([key, label, value, color]) => {
          const active = filters.status === key && key !== 'ALL';
          return (
            <AnimatedPressable
              key={key}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${value} phòng`}
              accessibilityState={{ selected: active }}
              style={[s.statTile, active && s.statTileActive]}
              onPress={() =>
                key === 'ALL'
                  ? setFilters(prev => ({ ...prev, status: 'ALL' }))
                  : toggleStatusStat(key)
              }
            >
              <Text style={[s.statVal, { color }]}>{value}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Search & Filter Row */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color={c.textMuted} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm mã phòng, tên người thuê..."
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <AnimatedPressable accessibilityLabel="Xóa từ khóa tìm kiếm" onPress={() => setSearch('')}>
              <Feather name="x-circle" size={16} color={c.textMuted} />
            </AnimatedPressable>
          ) : null}
        </View>

        <AnimatedPressable
          scaleTo={0.97}
          accessibilityLabel="Mở bộ lọc phòng điện nước"
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={() => setFilterSheetOpen(true)}
        >
          <Feather
            name="sliders"
            size={16}
            color={activeFilterCount > 0 ? '#FFFFFF' : c.forestInk}
          />
          {activeFilterCount > 0 ? (
            <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
          ) : null}
        </AnimatedPressable>
      </View>

      {activeFilterCount > 0 || search.trim().length > 0 ? (
        <View style={s.filterSummaryRow}>
          <Text style={s.filterSummaryText}>
            Hiển thị {filteredRows.length}/{allRows.length} phòng
          </Text>
          <AnimatedPressable
            onPress={() => {
              setSearch('');
              setFilters({ status: 'ALL', floor: 'ALL', roomId: null });
            }}
          >
            <Text style={s.resetFilterText}>Đặt lại bộ lọc</Text>
          </AnimatedPressable>
        </View>
      ) : null}

      {notice ? (
        <View style={s.infoBanner}>
          <Feather name="check-circle" size={15} color={c.primary} />
          <Text style={s.infoBannerText}>{notice}</Text>
        </View>
      ) : null}

      {conflictError ? (
        <View style={s.conflictBox}>
          <InlineError message={conflictError} />
          <AnimatedPressable
            scaleTo={0.98}
            style={s.conflictReloadBtn}
            onPress={() => setReloadTick(prev => prev + 1)}
          >
            <Feather name="refresh-cw" size={14} color={c.primary} />
            <Text style={s.conflictReloadText}>Tải lại kỳ ghi</Text>
          </AnimatedPressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Compact Header */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          style={s.iconBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Ghi điện nước
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {formatUtilityMonth(month)}
            {property?.name ? ` · ${property.name}` : ''}
          </Text>
        </View>

        <AnimatedPressable
          accessibilityLabel="Mở tùy chọn ghi điện nước"
          style={s.iconBtn}
          onPress={() => setMenuOpen(true)}
        >
          <Feather name="more-horizontal" size={20} color={c.forestInk} />
        </AnimatedPressable>
      </View>

      {!host.allowed ? (
        <View style={s.centerCardWrap}>
          <View style={s.emptyCard}>
            <Feather name="lock" size={28} color={c.textSecondary} />
            <Text style={s.emptyTitle}>Bạn không có quyền truy cập</Text>
            <Text style={s.emptyDesc}>
              Chỉ tài khoản Chủ nhà trọ mới có quyền ghi và chốt chỉ số điện nước.
            </Text>
            <PrimaryButton title="Quay lại" onPress={() => router.back()} />
          </View>
        </View>
      ) : !propertyId ? (
        <View style={s.centerCardWrap}>
          <View style={s.emptyCard}>
            <Feather name="home" size={28} color={c.primary} />
            <Text style={s.emptyTitle}>Chưa có nhà trọ để ghi điện nước</Text>
            <Text style={s.emptyDesc}>
              Hãy đăng ký hoặc kích hoạt nhà trọ trước khi ghi chỉ số điện nước hàng tháng.
            </Text>
            <PrimaryButton title="Về danh sách nhà trọ" onPress={() => router.replace('/home')} />
          </View>
        </View>
      ) : loading && !ledger ? (
        <ContentLoading message="Đang tải bảng ghi điện nước..." />
      ) : loadError && !ledger ? (
        <View style={s.centerCardWrap}>
          <View style={s.emptyCard}>
            <InlineError message={loadError} />
            <PrimaryButton title="Thử tải lại" onPress={() => setReloadTick(prev => prev + 1)} />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            ref={listRef}
            data={filteredRows}
            keyExtractor={item => utilityRowKey(item)}
            ListHeaderComponent={listHeader}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            onScrollToIndexFailed={() => undefined}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  guardUnsaved(() => {
                    setRefreshing(true);
                    setReloadTick(prev => prev + 1);
                  });
                }}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
            ListEmptyComponent={
              <View style={s.emptyCard}>
                <Feather name="zap" size={26} color={c.primary} />
                <Text style={s.emptyTitle}>
                  {allRows.length === 0
                    ? 'Không có phòng cần ghi trong kỳ này'
                    : 'Không tìm thấy phòng phù hợp'}
                </Text>
                <Text style={s.emptyDesc}>
                  {allRows.length === 0
                    ? 'Chỉ những phòng có đợt thuê hoạt động trong tháng mới xuất hiện trong bảng ghi điện nước.'
                    : 'Thử xóa từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái/tầng.'}
                </Text>
                {allRows.length > 0 ? (
                  <PrimaryButton
                    title="Đặt lại bộ lọc"
                    onPress={() => {
                      setSearch('');
                      setFilters({ status: 'ALL', floor: 'ALL', roomId: null });
                    }}
                  />
                ) : null}
              </View>
            }
            renderItem={({ item }) => {
              const key = utilityRowKey(item);
              const { linkedDraft, carriedDate } = findCarriedHandover(item, allRows, edits);
              const draft = buildUtilityDraft(item, edits[key], linkedDraft);
              const validation = validateUtilityRow(item, draft);
              const edited = hasRealUtilityEdit(item, edits[key], linkedDraft);
              const isExpanded = expandedKey === key;
              const isUnlocked = unlockedKeys.has(key);
              const nextRoom = findNextPendingUtilityRow(filteredRows, key, edits);

              return (
                <UtilityRoomCard
                  row={item}
                  draft={draft}
                  validation={validation}
                  edited={edited}
                  expanded={isExpanded}
                  editable={canEditPeriod}
                  preview={isPreviewMonth}
                  unlockedFinalized={isUnlocked}
                  carriedDate={carriedDate}
                  justFinalized={justFinalizedKey === key}
                  hasNextRoom={Boolean(nextRoom)}
                  onToggleExpand={() =>
                    setExpandedKey(prev => (prev === key ? null : key))
                  }
                  onChangeField={patch => handleChangeField(key, patch)}
                  onOpenDatePicker={() => setDatePickerRowKey(key)}
                  onSaveLocalDraft={() => {
                    void handleSaveLocalDraft(item.roomNumber);
                  }}
                  onRequestFinalize={() => handleRequestFinalizeSingle(item)}
                  onUnlockFinalized={() => setUnlockPromptKey(key)}
                  onDiscardRowEdit={() => {
                    setEdits(prev => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    setUnlockedKeys(prev => {
                      const next = new Set(prev);
                      next.delete(key);
                      return next;
                    });
                  }}
                  onGoNextRoom={() => handleGoNextRoom(key)}
                />
              );
            }}
          />

          {/* Compact Sticky Batch Bar only when multiple valid unsaved drafts exist */}
          {canEditPeriod && batch.validItems.length >= 2 ? (
            <View style={s.batchFooter}>
              <View style={{ flex: 1 }}>
                <Text style={s.batchTitle}>
                  {batch.validItems.length} phòng sẵn sàng chốt kỳ
                </Text>
                <Text style={s.batchSub}>
                  {batch.invalidItems.length > 0
                    ? `${batch.invalidItems.length} phòng chưa hợp lệ sẽ giữ lại`
                    : 'Nhấn để xem tóm tắt và xác nhận chốt kỳ'}
                </Text>
              </View>
              <AnimatedPressable
                scaleTo={0.97}
                style={s.batchBtn}
                onPress={() => {
                  setConfirmError(null);
                  setConfirmItems(batch.validItems);
                }}
              >
                <Text style={s.batchBtnText}>Chốt ({batch.validItems.length})</Text>
              </AnimatedPressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}

      {/* Sheets & Dialogs */}
      <UtilityMonthPickerSheet
        visible={monthPickerOpen}
        selectedMonth={month}
        currentMonth={ledger?.currentMonth}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={handleSwitchMonth}
      />

      <UtilityFilterSheet
        visible={filterSheetOpen}
        value={filters}
        floors={floors}
        rows={allRows}
        onClose={() => setFilterSheetOpen(false)}
        onApply={setFilters}
      />

      {datePickerRow && datePickerDraft ? (
        <UtilityDatePickerSheet
          visible={Boolean(datePickerRow)}
          roomNumber={datePickerRow.roomNumber}
          selectedDate={datePickerDraft.readOn}
          minDate={datePickerRow.periodStart}
          maxDate={datePickerRow.latestReadOn}
          onClose={() => setDatePickerRowKey(null)}
          onSelect={isoDate => {
            if (datePickerRowKey) handleChangeField(datePickerRowKey, { readOn: isoDate });
          }}
        />
      ) : null}

      <UtilityFinalizeConfirmSheet
        visible={confirmItems.length > 0}
        month={month}
        items={confirmItems}
        busy={confirmBusy}
        error={confirmError}
        onClose={() => setConfirmItems([])}
        onConfirm={() => {
          void handleConfirmFinalize();
        }}
      />

      <UtilityMenuSheet
        visible={menuOpen}
        validUnsavedCount={batch.validItems.length}
        hasAnyDrafts={hasUnsavedChanges}
        editable={canEditPeriod}
        onClose={() => setMenuOpen(false)}
        onBatchFinalize={() => {
          setConfirmError(null);
          setConfirmItems(batch.validItems);
        }}
        onClearDrafts={() => {
          setEdits({});
          setUnlockedKeys(new Set());
          if (userId && propertyId) {
            void clearUtilityDrafts(userId, propertyId, month);
          }
          setNotice('Đã hoàn tác toàn bộ thay đổi chưa chốt trong kỳ này.');
        }}
      />

      {unlockPromptKey ? (
        <ConfirmDialog
          title="Điều chỉnh chỉ số đã chốt?"
          description="Bản ghi này đã chốt kỳ. Việc điều chỉnh sẽ kiểm tra tính liên tục với các kỳ liền kề và yêu cầu xác nhận chốt lại."
          confirmLabel="Mở điều chỉnh"
          cancelLabel="Giữ nguyên"
          onCancel={() => setUnlockPromptKey(null)}
          onConfirm={() => {
            const key = unlockPromptKey;
            setUnlockPromptKey(null);
            setUnlockedKeys(prev => new Set(prev).add(key));
          }}
        />
      ) : null}

      {unsavedAction ? (
        <ConfirmDialog
          title="Có chỉ số chưa chốt kỳ"
          description={`Bạn đang có ${stats.unsaved} phòng có thay đổi chưa chốt lên hệ thống. Bạn muốn rời khỏi mà không lưu hay ở lại?`}
          confirmLabel="Rời khỏi"
          cancelLabel="Ở lại"
          onCancel={() => setUnsavedAction(null)}
          onConfirm={() => {
            const action = unsavedAction;
            setUnsavedAction(null);
            action();
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
    gap: 1,
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
  listHeaderWrap: {
    gap: 10,
    marginBottom: 12,
  },
  periodBlock: {
    gap: 8,
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
  statsStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statTileActive: {
    borderColor: c.primary,
    backgroundColor: c.softMint,
  },
  statVal: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
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
  filterBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  filterSummaryText: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  resetFilterText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: c.softMint,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.forestInk,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#92400E',
  },
  conflictBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  conflictReloadBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primary,
  },
  conflictReloadText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  centerCardWrap: {
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
  batchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  batchSub: {
    fontSize: 12,
    color: c.textSecondary,
  },
  batchBtn: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
