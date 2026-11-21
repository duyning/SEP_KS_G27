import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PixelRatio,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { useReducedMotionPreference } from '@/constants/motion';
import type { HostRoom } from '@/services/host';
import { formatMoneyVnd, resolveRoomEffectivePrice } from '@/services/host-room-types';
import {
  canToggleRoomStatus,
  extractDistinctFloors,
  filterHostRooms,
  formatFloorKey,
  groupRoomsByFloor,
  propertyRoomsOverview,
  publishHostRooms,
  roomRentalStatusMeta,
  updateHostRoomStatuses,
  type BulkRoomStatusPayload,
  type FloorRoomGroup,
  type RoomStatusFilter,
  type RoomViewMode,
} from '@/services/host-rooms';
import { h } from './host-ui';
import { useManagedProperty } from './management-ui';
import { CompactPropertyPicker } from './room-types-sheets';
import {
  BulkRoomStatusSheet,
  RoomPublicationSheet,
  RoomsFilterSheet,
  RoomsMenuSheet,
  type RoomsFilterValue,
} from './rooms-sheets';

const MAX_BULK_SELECTION = 200;

export function RoomsScreen({
  scopedPropertyId,
  onBack,
}: {
  scopedPropertyId?: string;
  onBack?(): void;
} = {}) {
  const routeParams = useLocalSearchParams<{
    propertyId?: string;
    roomTypeId?: string;
    status?: string;
  }>();
  const params = {
    ...routeParams,
    ...(scopedPropertyId ? { propertyId: scopedPropertyId } : {}),
  };
  return (
    <RoomsContent
      key={`${params.propertyId || ''}:${params.roomTypeId || ''}:${params.status || ''}`}
      params={params}
      onBack={onBack}
    />
  );
}

function RoomsContent({
  params,
  onBack,
}: {
  params: { propertyId?: string; roomTypeId?: string; status?: string };
  onBack?(): void;
}) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const gridColumns = width >= 410 && fontScale < 1.15 ? 3 : 2;

  const { properties, property, select } = useManagedProperty(params.propertyId);
  const propertyId = property?.propertyId;

  useFocusEffect(
    useCallback(() => {
      void host.store.refresh();
    }, [host.store])
  );

  const initialStatus: RoomStatusFilter =
    params.status === 'VACANT' || params.status === 'OCCUPIED' || params.status === 'MAINTENANCE'
      ? params.status
      : 'ALL';

  const [viewMode, setViewMode] = useState<RoomViewMode>('floors');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RoomsFilterValue>({
    floor: 'ALL',
    typeId: params.roomTypeId || 'ALL',
    status: initialStatus,
    visibility: 'ALL',
  });
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(() => new Set());

  // Sheets & Menus
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Multi-select mode (OFF by default — no checkboxes until user enables it)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  // Bulk status sheet
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Publication sheet (completely separate from rental status)
  const [pubSheetOpen, setPubSheetOpen] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  // Feedback banner
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const activePropertyRef = useRef<number | undefined>(propertyId);
  const mountedRef = useRef(true);
  const bulkLock = useRef(false);
  const pubLock = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activePropertyRef.current = propertyId;
  }, [propertyId]);

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkSheetOpen(false);
    setBulkError(null);
  };

  const handleSelectProperty = (nextId: number) => {
    if (nextId === propertyId) return;
    activePropertyRef.current = nextId;
    select(nextId);
    setSearch('');
    setFilters({ floor: 'ALL', typeId: 'ALL', status: 'ALL', visibility: 'ALL' });
    setCollapsedFloors(new Set());
    exitSelectionMode();
    setPubSheetOpen(false);
    setPubError(null);
    setSuccessBanner(null);
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (selectedIds.size > 0) clearSelection();
  };

  const handleApplyFilters = (next: RoomsFilterValue) => {
    setFilters(next);
    if (selectedIds.size > 0) clearSelection();
  };

  const resetAllFilters = () => {
    setSearch('');
    setFilters({ floor: 'ALL', typeId: 'ALL', status: 'ALL', visibility: 'ALL' });
    if (selectedIds.size > 0) clearSelection();
  };

  const hasRoomsData = Boolean(host.data.rooms);
  const allStoreRooms = host.data.rooms?.rooms;
  const allStoreRoomTypes = host.data.roomTypes?.roomTypes;

  // Authoritative lists for the selected property
  const propertyRooms = useMemo(() => {
    if (!hasRoomsData || propertyId == null) return undefined;
    return (allStoreRooms || []).filter(r => r.propertyId === propertyId);
  }, [allStoreRooms, hasRoomsData, propertyId]);

  const propertyRoomTypes = useMemo(() => {
    if (propertyId == null) return [];
    return (allStoreRoomTypes || []).filter(t => t.propertyId === propertyId);
  }, [allStoreRoomTypes, propertyId]);

  // Overview strip uses selected property totals ONLY (never filtered rows)
  const overview = useMemo(() => propertyRoomsOverview(propertyRooms), [propertyRooms]);

  const floors = useMemo(
    () => extractDistinctFloors(propertyRooms || []),
    [propertyRooms]
  );

  const hasMaintenance = useMemo(
    () => (propertyRooms || []).some(r => r.status === 'MAINTENANCE'),
    [propertyRooms]
  );

  // Guard stale typeId/floor if property switched externally
  const effectiveTypeId =
    filters.typeId !== 'ALL' &&
    propertyRoomTypes.length > 0 &&
    !propertyRoomTypes.some(t => String(t.roomTypeId) === filters.typeId)
      ? 'ALL'
      : filters.typeId;

  const effectiveFloor =
    filters.floor !== 'ALL' && floors.length > 0 && !floors.includes(filters.floor)
      ? 'ALL'
      : filters.floor;

  const displayedRooms = useMemo(
    () =>
      filterHostRooms(propertyRooms || [], {
        search,
        typeId: effectiveTypeId,
        floor: effectiveFloor,
        status: filters.status,
        visibility: filters.visibility,
      }),
    [effectiveFloor, effectiveTypeId, filters.status, filters.visibility, propertyRooms, search]
  );

  const floorGroups = useMemo(() => groupRoomsByFloor(displayedRooms), [displayedRooms]);

  const selectableDisplayedRooms = useMemo(
    () => displayedRooms.filter(canToggleRoomStatus),
    [displayedRooms]
  );

  const selectedRooms = useMemo(
    () => (propertyRooms || []).filter(r => selectedIds.has(r.roomId)),
    [propertyRooms, selectedIds]
  );

  const activeFilterCount =
    (effectiveTypeId !== 'ALL' ? 1 : 0) +
    (effectiveFloor !== 'ALL' ? 1 : 0) +
    (filters.status !== 'ALL' ? 1 : 0) +
    (filters.visibility !== 'ALL' ? 1 : 0);
  const hasAnyFilter = search.trim().length > 0 || activeFilterCount > 0;

  const activeTypeName =
    effectiveTypeId !== 'ALL'
      ? propertyRoomTypes.find(t => String(t.roomTypeId) === effectiveTypeId)?.roomType
      : null;

  const canManage = Boolean(host.allowed && property?.status === 'ACTIVE' && propertyId != null);
  const canAddRoom = canManage && propertyRoomTypes.length > 0;
  const loadError = host.errors.rooms;
  const isInitialLoading = !hasRoomsData && !loadError;

  const toggleFloorCollapsed = (floorKey: string) => {
    setCollapsedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorKey)) next.delete(floorKey);
      else next.add(floorKey);
      return next;
    });
  };

  const toggleRoomSelection = (room: HostRoom) => {
    if (!canToggleRoomStatus(room)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(room.roomId)) {
        next.delete(room.roomId);
      } else if (next.size < MAX_BULK_SELECTION) {
        next.add(room.roomId);
      }
      return next;
    });
  };

  const handlePressRoom = (room: HostRoom) => {
    if (selectionMode) {
      toggleRoomSelection(room);
      return;
    }
    router.push({ pathname: '/host/room', params: { id: String(room.roomId) } });
  };

  const allFilteredSelected =
    selectableDisplayedRooms.length > 0 &&
    selectableDisplayedRooms
      .slice(0, MAX_BULK_SELECTION)
      .every(r => selectedIds.has(r.roomId));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      clearSelection();
    } else {
      setSelectedIds(
        new Set(selectableDisplayedRooms.slice(0, MAX_BULK_SELECTION).map(r => r.roomId))
      );
    }
  };

  const handleSubmitBulkStatus = async (payload: BulkRoomStatusPayload) => {
    if (bulkLock.current) return;
    const requestedPropertyId = propertyId;
    bulkLock.current = true;
    setBulkBusy(true);
    setBulkError(null);

    try {
      await host.store.mutate(
        '/host/rooms/status',
        payload,
        'PATCH',
        undefined,
        (token, signal) => updateHostRoomStatuses(payload, token, signal)
      );
      if (!mountedRef.current || activePropertyRef.current !== requestedPropertyId) return;
      setBulkSheetOpen(false);
      exitSelectionMode();
      setSuccessBanner(
        `Đã cập nhật ${payload.roomIds.length} phòng sang trạng thái ${
          payload.status === 'VACANT' ? 'Còn trống' : 'Đang thuê'
        }.`
      );
    } catch (err) {
      if (!mountedRef.current || activePropertyRef.current !== requestedPropertyId) return;
      setBulkError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái phòng. Vui lòng thử lại.'
      );
    } finally {
      bulkLock.current = false;
      if (mountedRef.current && activePropertyRef.current === requestedPropertyId) {
        setBulkBusy(false);
      }
    }
  };

  const handleSavePublication = async (publicRoomIds: number[]) => {
    if (pubLock.current || propertyId == null) return;
    const requestedPropertyId = propertyId;
    pubLock.current = true;
    setPubBusy(true);
    setPubError(null);

    try {
      await host.store.mutate(
        '/host/rooms/publication',
        { propertyId, roomIds: publicRoomIds },
        'PUT',
        undefined,
        (token, signal) =>
          publishHostRooms({ propertyId, roomIds: publicRoomIds }, token, signal)
      );
      if (!mountedRef.current || activePropertyRef.current !== requestedPropertyId) return;
      setPubSheetOpen(false);
      setSuccessBanner(
        publicRoomIds.length > 0
          ? `Đã lưu ${publicRoomIds.length} phòng ở chế độ Công khai.`
          : 'Đã chuyển tất cả phòng sang chế độ Riêng tư.'
      );
    } catch (err) {
      if (!mountedRef.current || activePropertyRef.current !== requestedPropertyId) return;
      setPubError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật chế độ hiển thị phòng. Vui lòng thử lại.'
      );
    } finally {
      pubLock.current = false;
      if (mountedRef.current && activePropertyRef.current === requestedPropertyId) {
        setPubBusy(false);
      }
    }
  };

  return (
    <SafeAreaView
      style={h.screen}
      edges={onBack ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
    >
      {/* 1. Header: Danh sách phòng | + Thêm phòng | ⋯ */}
      <View style={s.header}>
        {onBack && (
          <AnimatedPressable accessibilityLabel="Quay lại" style={s.backBtn} onPress={onBack}>
            <Feather name="arrow-left" size={20} color={c.forestInk} />
          </AnimatedPressable>
        )}
        <Text style={s.headerTitle} numberOfLines={1}>
          Danh sách phòng
        </Text>
        <View style={s.headerActions}>
          {canManage && propertyId != null && (
            <AnimatedPressable
              scaleTo={0.97}
              accessibilityLabel="Thiết lập phòng và loại phòng mới"
              style={s.addBtn}
              onPress={() =>
                router.push({
                  pathname: '/host/room-setup',
                  params: { propertyId: String(propertyId) },
                })
              }
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={s.addBtnText}>Thêm phòng</Text>
            </AnimatedPressable>
          )}
          {host.allowed && propertyId != null && (
            <AnimatedPressable
              scaleTo={0.96}
              accessibilityLabel="Mở tùy chọn quản lý phòng"
              style={s.moreBtn}
              onPress={() => setMenuOpen(true)}
            >
              <Feather name="more-horizontal" size={20} color={c.forestInk} />
            </AnimatedPressable>
          )}
        </View>
      </View>

      {host.allowed ? (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              s.scrollContent,
              selectionMode && { paddingBottom: 112 },
            ]}
            contentInsetAdjustmentBehavior={onBack ? 'never' : 'automatic'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={host.loading}
                onRefresh={() => {
                  void host.store.refresh();
                }}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {/* Compact Property Selector Row */}
            {properties.length > 0 && (
              <CompactPropertyPicker
                properties={properties}
                property={property}
                onSelect={handleSelectProperty}
              />
            )}

            {/* Low 3-Stat Overview Strip (Selected Property Totals Only) */}
            {propertyId != null && (
              <View
                style={s.overviewStrip}
                accessibilityLabel={`Tổng quan phòng: ${overview.totalRooms ?? 'chưa rõ'} tổng phòng, ${overview.vacantRooms ?? 'chưa rõ'} còn trống, ${overview.occupiedRooms ?? 'chưa rõ'} đang thuê`}
              >
                <View style={s.overviewCell}>
                  <Text style={s.overviewValue}>
                    {overview.totalRooms != null ? overview.totalRooms : '—'}
                  </Text>
                  <Text style={s.overviewLabel}>Tổng phòng</Text>
                </View>
                <View style={s.overviewDivider} />
                <View style={s.overviewCell}>
                  <Text style={[s.overviewValue, { color: c.primary }]}>
                    {overview.vacantRooms != null ? overview.vacantRooms : '—'}
                  </Text>
                  <Text style={s.overviewLabel}>Còn trống</Text>
                </View>
                <View style={s.overviewDivider} />
                <View style={s.overviewCell}>
                  <Text style={s.overviewValue}>
                    {overview.occupiedRooms != null ? overview.occupiedRooms : '—'}
                  </Text>
                  <Text style={s.overviewLabel}>Đang thuê</Text>
                </View>
              </View>
            )}

            {/* Error Notice */}
            {loadError && (
              <View style={s.noticeCard} accessibilityRole="alert">
                <Feather name="alert-circle" size={18} color={c.error} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.noticeText}>
                    {loadError} {hasRoomsData ? 'Đang hiển thị dữ liệu đã tải gần nhất.' : ''}
                  </Text>
                  <AnimatedPressable
                    accessibilityLabel="Thử lại tải danh sách phòng"
                    style={s.retryBtn}
                    onPress={() => {
                      void host.store.refresh();
                    }}
                  >
                    <Feather name="refresh-cw" size={13} color={c.primary} />
                    <Text style={s.retryText}>Thử lại</Text>
                  </AnimatedPressable>
                </View>
              </View>
            )}

            {/* Success Banner */}
            {successBanner && (
              <View style={s.successBanner} accessibilityLiveRegion="polite">
                <Feather name="check-circle" size={16} color={c.primary} />
                <Text style={s.successBannerText}>{successBanner}</Text>
                <AnimatedPressable
                  accessibilityLabel="Đóng thông báo"
                  style={s.bannerDismiss}
                  onPress={() => setSuccessBanner(null)}
                >
                  <Feather name="x" size={15} color={c.primaryDark} />
                </AnimatedPressable>
              </View>
            )}

            {/* Search + Filter Row */}
            {propertyRooms && propertyRooms.length > 0 && (
              <View style={s.controlsBlock}>
                <View style={s.searchRow}>
                  <View style={s.searchBox}>
                    <Feather name="search" size={17} color={c.textSecondary} />
                    <TextInput
                      value={search}
                      onChangeText={handleSearchChange}
                      placeholder="Tìm mã phòng hoặc loại phòng…"
                      placeholderTextColor={c.placeholder}
                      accessibilityLabel="Tìm mã phòng hoặc loại phòng"
                      returnKeyType="search"
                      style={s.searchInput}
                    />
                    {search.length > 0 && (
                      <AnimatedPressable
                        accessibilityLabel="Xóa từ khóa"
                        style={s.clearBtn}
                        onPress={() => handleSearchChange('')}
                      >
                        <Feather name="x" size={15} color={c.textSecondary} />
                      </AnimatedPressable>
                    )}
                  </View>

                  <AnimatedPressable
                    scaleTo={0.97}
                    accessibilityLabel={`Lọc phòng${
                      activeFilterCount > 0 ? `, đang áp dụng ${activeFilterCount} bộ lọc` : ''
                    }`}
                    style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
                    onPress={() => setFilterSheetOpen(true)}
                  >
                    <Feather
                      name="sliders"
                      size={16}
                      color={activeFilterCount > 0 ? c.primary : c.forestInk}
                    />
                    <Text style={[s.filterBtnText, activeFilterCount > 0 && { color: c.primary }]}>
                      Lọc
                    </Text>
                    {activeFilterCount > 0 && (
                      <View style={s.filterBadge}>
                        <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                      </View>
                    )}
                  </AnimatedPressable>
                </View>

                {/* Active Filter Context Chips (e.g. from Chi tiết loại phòng → Quản lý phòng) */}
                {activeTypeName && (
                  <View style={s.activeChipRow}>
                    <View style={s.activeFilterChip}>
                      <Text style={s.activeFilterChipText} numberOfLines={1}>
                        Loại phòng: {activeTypeName}
                      </Text>
                      <AnimatedPressable
                        accessibilityLabel="Bỏ lọc loại phòng"
                        onPress={() =>
                          handleApplyFilters({ ...filters, typeId: 'ALL' })
                        }
                        style={s.chipCloseHit}
                      >
                        <Feather name="x" size={13} color={c.primary} />
                      </AnimatedPressable>
                    </View>
                  </View>
                )}

                {/* Result Count + View Mode Toggle (Theo tầng / Danh sách) */}
                <View style={s.viewMetaRow}>
                  <View style={s.resultLeft}>
                    <Text style={s.resultCountText}>
                      {hasAnyFilter
                        ? `Khớp ${displayedRooms.length}/${propertyRooms.length} phòng`
                        : `${propertyRooms.length} phòng`}
                    </Text>
                    {hasAnyFilter && (
                      <AnimatedPressable
                        accessibilityLabel="Đặt lại bộ lọc"
                        style={s.inlineLinkBtn}
                        onPress={resetAllFilters}
                      >
                        <Text style={s.inlineLinkText}>Đặt lại</Text>
                      </AnimatedPressable>
                    )}
                  </View>

                  <View style={s.viewToggle}>
                    <AnimatedPressable
                      scaleTo={0.98}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: viewMode === 'floors' }}
                      accessibilityLabel="Xem theo tầng"
                      style={[s.viewToggleBtn, viewMode === 'floors' && s.viewToggleBtnActive]}
                      onPress={() => setViewMode('floors')}
                    >
                      <Feather
                        name="grid"
                        size={13}
                        color={viewMode === 'floors' ? c.primary : c.textSecondary}
                      />
                      <Text
                        style={[
                          s.viewToggleText,
                          viewMode === 'floors' && s.viewToggleTextActive,
                        ]}
                      >
                        Theo tầng
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      scaleTo={0.98}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: viewMode === 'list' }}
                      accessibilityLabel="Xem dạng danh sách"
                      style={[s.viewToggleBtn, viewMode === 'list' && s.viewToggleBtnActive]}
                      onPress={() => setViewMode('list')}
                    >
                      <Feather
                        name="list"
                        size={13}
                        color={viewMode === 'list' ? c.primary : c.textSecondary}
                      />
                      <Text
                        style={[
                          s.viewToggleText,
                          viewMode === 'list' && s.viewToggleTextActive,
                        ]}
                      >
                        Danh sách
                      </Text>
                    </AnimatedPressable>
                  </View>
                </View>

                {/* Multi-select Entry / Scope Row */}
                {canManage && displayedRooms.length > 0 && (
                  <View style={s.selectionScopeRow}>
                    {selectionMode ? (
                      <>
                        <AnimatedPressable
                          scaleTo={0.98}
                          style={s.scopeSelectAllBtn}
                          accessibilityLabel={
                            allFilteredSelected
                              ? 'Bỏ chọn tất cả kết quả lọc'
                              : `Chọn tất cả ${selectableDisplayedRooms.length} kết quả lọc`
                          }
                          onPress={toggleSelectAllFiltered}
                        >
                          <Feather
                            name={allFilteredSelected ? 'check-square' : 'square'}
                            size={15}
                            color={c.primary}
                          />
                          <Text style={s.scopeSelectAllText}>
                            {allFilteredSelected
                              ? 'Bỏ chọn tất cả'
                              : `Chọn tất cả kết quả lọc (${Math.min(
                                  selectableDisplayedRooms.length,
                                  MAX_BULK_SELECTION
                                )})`}
                          </Text>
                        </AnimatedPressable>
                        <AnimatedPressable
                          style={s.inlineLinkBtn}
                          onPress={exitSelectionMode}
                          accessibilityLabel="Thoát chọn nhiều"
                        >
                          <Text style={s.exitSelectText}>Xong</Text>
                        </AnimatedPressable>
                      </>
                    ) : (
                      <AnimatedPressable
                        scaleTo={0.98}
                        style={s.enterSelectBtn}
                        accessibilityLabel="Bật chế độ chọn nhiều phòng"
                        onPress={() => {
                          setSelectionMode(true);
                          setSuccessBanner(null);
                        }}
                      >
                        <Feather name="check-square" size={14} color={c.primary} />
                        <Text style={s.enterSelectText}>Chọn nhiều</Text>
                      </AnimatedPressable>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Main Content Area */}
            {isInitialLoading ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Đang tải danh sách phòng"
                style={{ gap: 12 }}
              >
                {[0, 1].map(n => (
                  <View key={n} style={s.skeletonGroup}>
                    <View style={[s.skeleton, { height: 20, width: '45%' }]} />
                    <View style={s.skeletonTileRow}>
                      <View style={[s.skeleton, s.skeletonTile]} />
                      <View style={[s.skeleton, s.skeletonTile]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : !property ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="home" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Chưa có nhà trọ để quản lý phòng</Text>
                <Text style={s.emptyDesc}>
                  Bạn cần có nhà trọ đã được duyệt để bắt đầu quản lý danh sách phòng.
                </Text>
              </View>
            ) : propertyRooms && propertyRooms.length > 0 && displayedRooms.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="search" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Không tìm thấy phòng phù hợp</Text>
                <Text style={s.emptyDesc}>
                  Thử đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc tầng, loại phòng, tình trạng.
                </Text>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.emptySecondaryBtn}
                  onPress={resetAllFilters}
                >
                  <Text style={s.emptySecondaryBtnText}>Đặt lại bộ lọc</Text>
                </AnimatedPressable>
              </View>
            ) : hasRoomsData && !loadError && (!propertyRooms || propertyRooms.length === 0) ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="key" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Nhà trọ này chưa có phòng</Text>
                <Text style={s.emptyDesc}>
                  {propertyRoomTypes.length > 0
                    ? 'Thêm phòng đầu tiên hoặc thiết lập nhanh nhiều tầng để quản lý tình trạng trống.'
                    : 'Dùng thiết lập phòng nhiều tầng để tạo loại phòng và sinh danh sách phòng theo từng tầng.'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 }}>
                  {canManage && propertyId != null && (
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.emptyPrimaryBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/host/room-setup',
                          params: { propertyId: String(propertyId) },
                        })
                      }
                    >
                      <Feather name="layers" size={16} color="#FFFFFF" />
                      <Text style={s.emptyPrimaryBtnText}>Thiết lập nhiều tầng</Text>
                    </AnimatedPressable>
                  )}
                  {canAddRoom && (
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.emptySecondaryBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/host/room',
                          params: { propertyId: String(propertyId) },
                        })
                      }
                    >
                      <Text style={s.emptySecondaryBtnText}>+ Thêm 1 phòng</Text>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            ) : viewMode === 'floors' ? (
              <View style={{ gap: 12 }}>
                {floorGroups.map((group, idx) => (
                  <FloorGroupCard
                    key={group.key}
                    group={group}
                    index={idx}
                    expanded={!collapsedFloors.has(group.key)}
                    columns={gridColumns}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    reducedMotion={reducedMotion}
                    onToggleExpand={() => toggleFloorCollapsed(group.key)}
                    onPressRoom={handlePressRoom}
                  />
                ))}
              </View>
            ) : (
              <View style={s.listContainer}>
                {displayedRooms.map((room, idx) => (
                  <RoomListRow
                    key={room.roomId}
                    room={room}
                    last={idx === displayedRooms.length - 1}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(room.roomId)}
                    onPress={() => handlePressRoom(room)}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {/* Sticky Bulk Selection Action Bar */}
          {selectionMode && (
            <SafeAreaView edges={['bottom']} style={s.selectionBarSafe}>
              <View style={s.selectionBar}>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={s.selectionCountText}>Đã chọn {selectedIds.size} phòng</Text>
                  <Text style={s.selectionHintText}>
                    {selectedIds.size > 0
                      ? 'Sẵn sàng đổi trạng thái thuê'
                      : 'Chạm vào phòng để chọn'}
                  </Text>
                </View>

                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.selectionCancelBtn}
                  accessibilityLabel="Hủy chọn nhiều"
                  onPress={exitSelectionMode}
                >
                  <Text style={s.selectionCancelText}>Hủy</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  scaleTo={0.97}
                  disabled={selectedIds.size === 0}
                  style={[
                    s.selectionActionBtn,
                    selectedIds.size === 0 && { opacity: 0.45 },
                  ]}
                  accessibilityLabel={`Đổi trạng thái ${selectedIds.size} phòng đã chọn`}
                  onPress={() => {
                    setBulkError(null);
                    setBulkSheetOpen(true);
                  }}
                >
                  <Text style={s.selectionActionText}>Đổi trạng thái</Text>
                </AnimatedPressable>
              </View>
            </SafeAreaView>
          )}
        </>
      ) : (
        <View style={s.emptyCard}>
          <View style={s.emptyIconCircle}>
            <Feather name="lock" size={24} color={c.textSecondary} />
          </View>
          <Text style={s.emptyTitle}>Bạn không có quyền truy cập</Text>
          <Text style={s.emptyDesc}>Khu vực này chỉ dành cho tài khoản chủ trọ.</Text>
        </View>
      )}

      {/* Filter Bottom Sheet */}
      <RoomsFilterSheet
        visible={filterSheetOpen}
        value={{
          floor: effectiveFloor,
          typeId: effectiveTypeId,
          status: filters.status,
          visibility: filters.visibility,
        }}
        floors={floors}
        roomTypes={propertyRoomTypes}
        hasMaintenance={hasMaintenance}
        onClose={() => setFilterSheetOpen(false)}
        onApply={handleApplyFilters}
      />

      {/* Overflow Menu Sheet (⋯) */}
      <RoomsMenuSheet
        visible={menuOpen}
        canManage={canManage}
        hasRooms={Boolean(propertyRooms && propertyRooms.length > 0)}
        selectionMode={selectionMode}
        onClose={() => setMenuOpen(false)}
        onOpenMultiFloorSetup={() => {
          if (propertyId != null) {
            router.push({
              pathname: '/host/room-setup',
              params: { propertyId: String(propertyId) },
            });
          }
        }}
        onOpenPublication={() => {
          setPubError(null);
          setPubSheetOpen(true);
        }}
        onToggleSelectionMode={() => {
          if (selectionMode) exitSelectionMode();
          else setSelectionMode(true);
        }}
      />

      {/* Bulk Status Update Sheet */}
      <BulkRoomStatusSheet
        visible={bulkSheetOpen}
        propertyId={propertyId ?? null}
        rooms={selectedRooms}
        busy={bulkBusy}
        error={bulkError}
        onClose={() => {
          if (!bulkBusy) {
            setBulkSheetOpen(false);
            setBulkError(null);
          }
        }}
        onSubmit={payload => {
          void handleSubmitBulkStatus(payload);
        }}
      />

      {/* Room Publication Sheet (Separate from rental status) */}
      <RoomPublicationSheet
        visible={pubSheetOpen}
        property={property}
        rooms={propertyRooms || []}
        busy={pubBusy}
        error={pubError}
        onClose={() => {
          if (!pubBusy) {
            setPubSheetOpen(false);
            setPubError(null);
          }
        }}
        onSave={roomIds => {
          void handleSavePublication(roomIds);
        }}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Floor Accordion Group + Responsive 2–3 Column Room Tiles                    */
/* -------------------------------------------------------------------------- */

function FloorGroupCard({
  group,
  index,
  expanded,
  columns,
  selectionMode,
  selectedIds,
  reducedMotion,
  onToggleExpand,
  onPressRoom,
}: {
  group: FloorRoomGroup;
  index: number;
  expanded: boolean;
  columns: number;
  selectionMode: boolean;
  selectedIds: Set<number>;
  reducedMotion: boolean;
  onToggleExpand: () => void;
  onPressRoom: (room: HostRoom) => void;
}) {
  const tileBasis = columns === 3 ? '31.2%' : '48%';

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.duration(220).delay(Math.min(index * 35, 180))
      }
      style={s.floorCard}
    >
      <AnimatedPressable
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${group.floor}, ${group.total} phòng, ${group.vacant} phòng trống`}
        style={s.floorHeader}
        onPress={onToggleExpand}
      >
        <View style={s.floorHeaderLeft}>
          <Feather
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={c.forestInk}
          />
          <Text style={s.floorTitle} numberOfLines={1}>
            {group.floor}
          </Text>
          <View style={s.floorCountPill}>
            <Text style={s.floorCountText}>{group.total} phòng</Text>
          </View>
        </View>

        <Text style={s.floorVacantText}>{group.vacant} trống</Text>
      </AnimatedPressable>

      {expanded && (
        <View style={s.tileGrid}>
          {group.rooms.map(room => {
            const meta = roomRentalStatusMeta(room.status);
            const selected = selectedIds.has(room.roomId);
            const selectable = canToggleRoomStatus(room);
            const isPublic = room.publicVisible === true;

            const toneStyle =
              meta.tone === 'vacant'
                ? { bg: '#F4FBF8', border: '#CBE6D8', dot: c.primary, text: c.primaryDark }
                : meta.tone === 'occupied'
                ? { bg: '#F5F8FC', border: '#D4E1EE', dot: '#1D5B8C', text: '#1D5B8C' }
                : { bg: '#FEF9EE', border: '#F6DFB0', dot: '#9A5B0A', text: '#9A5B0A' };

            return (
              <AnimatedPressable
                key={room.roomId}
                scaleTo={0.97}
                disabled={selectionMode && !selectable}
                accessibilityRole={selectionMode ? 'checkbox' : 'button'}
                accessibilityState={selectionMode ? { checked: selected } : undefined}
                accessibilityLabel={`Phòng ${room.roomNumber}, ${meta.label}, ${
                  isPublic ? 'Công khai' : 'Riêng tư'
                }`}
                style={[
                  s.roomTile,
                  {
                    flexBasis: tileBasis,
                    backgroundColor: toneStyle.bg,
                    borderColor: selected ? c.primary : toneStyle.border,
                  },
                  selected && s.roomTileSelected,
                  selectionMode && !selectable && { opacity: 0.45 },
                ]}
                onPress={() => onPressRoom(room)}
              >
                <View style={s.tileTopRow}>
                  <Text style={s.tileRoomNumber} numberOfLines={1}>
                    {room.roomNumber}
                  </Text>
                  {selectionMode && selectable && (
                    <Feather
                      name={selected ? 'check-square' : 'square'}
                      size={16}
                      color={selected ? c.primary : c.textMuted}
                    />
                  )}
                </View>

                <View style={s.tileStatusRow}>
                  <View style={[s.statusDot, { backgroundColor: toneStyle.dot }]} />
                  <Text
                    style={[s.tileStatusText, { color: toneStyle.text }]}
                    numberOfLines={1}
                  >
                    {meta.label}
                  </Text>
                </View>

                <View style={s.tileVisRow}>
                  <Feather
                    name={isPublic ? 'eye' : 'eye-off'}
                    size={11}
                    color={isPublic ? c.primary : c.textSecondary}
                  />
                  <Text
                    style={[
                      s.tileVisText,
                      { color: isPublic ? c.primary : c.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {isPublic ? 'Công khai' : 'Riêng tư'}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Vertical List View Row                                                      */
/* -------------------------------------------------------------------------- */

function RoomListRow({
  room,
  last,
  selectionMode,
  selected,
  onPress,
}: {
  room: HostRoom;
  last: boolean;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const meta = roomRentalStatusMeta(room.status);
  const selectable = canToggleRoomStatus(room);
  const isPublic = room.publicVisible === true;
  const effective = resolveRoomEffectivePrice(room);

  const badgeTone =
    meta.tone === 'vacant'
      ? { bg: '#E8F5EE', fg: c.primary, dot: c.primary }
      : meta.tone === 'occupied'
      ? { bg: '#EEF4FA', fg: '#1D5B8C', dot: '#1D5B8C' }
      : { bg: '#FEF6E7', fg: '#9A5B0A', dot: '#9A5B0A' };

  return (
    <AnimatedPressable
      scaleTo={0.99}
      disabled={selectionMode && !selectable}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={selectionMode ? { checked: selected } : undefined}
      accessibilityLabel={`Phòng ${room.roomNumber}, ${formatFloorKey(room.floor)}, ${room.roomType}, ${meta.label}, ${isPublic ? 'Công khai' : 'Riêng tư'}`}
      style={[
        s.listRow,
        !last && s.listRowBorder,
        selected && s.listRowSelected,
        selectionMode && !selectable && { opacity: 0.45 },
      ]}
      onPress={onPress}
    >
      {selectionMode && (
        <Feather
          name={selected ? 'check-square' : 'square'}
          size={18}
          color={selected ? c.primary : c.textMuted}
        />
      )}

      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.listTopLine}>
          <Text style={s.listRoomNumber}>{room.roomNumber}</Text>
          <Text style={s.listFloorText}>· {formatFloorKey(room.floor)}</Text>
        </View>

        <Text style={s.listTypeName} numberOfLines={1}>
          {room.roomType}
        </Text>

        <View style={s.listBadgesRow}>
          <View style={[s.listPill, { backgroundColor: badgeTone.bg }]}>
            <View style={[s.statusDot, { backgroundColor: badgeTone.dot }]} />
            <Text style={[s.listPillText, { color: badgeTone.fg }]}>{meta.label}</Text>
          </View>

          <View style={[s.listPill, isPublic ? s.visPublicPill : s.visPrivatePill]}>
            <Feather
              name={isPublic ? 'eye' : 'eye-off'}
              size={10}
              color={isPublic ? c.primary : c.textSecondary}
            />
            <Text
              style={[
                s.listPillText,
                { color: isPublic ? c.primary : c.textSecondary },
              ]}
            >
              {isPublic ? 'Công khai' : 'Riêng tư'}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.listRightCol}>
        <Text style={s.listPrice}>
          {effective.amount != null ? formatMoneyVnd(effective.amount) : 'Chưa có giá'}
        </Text>
        {!selectionMode && <Feather name="chevron-right" size={16} color={c.textMuted} />}
      </View>
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  header: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.md,
    paddingBottom: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: c.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  addBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreBtn: {
    width: 42,
    height: 42,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.xs,
    paddingBottom: 36,
    gap: 12,
  },
  overviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  overviewCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  overviewValue: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  overviewLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.textSecondary,
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: c.border,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.errorBorder,
    padding: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  successBanner: {
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
  successBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: c.primaryDark,
  },
  bannerDismiss: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsBlock: {
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.forestInk,
    paddingVertical: 10,
  },
  clearBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: authRadius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: authRadius.round,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
    maxWidth: 220,
  },
  chipCloseHit: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCountText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  inlineLinkBtn: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#EAEFED',
    borderRadius: authRadius.md,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    minHeight: 34,
  },
  viewToggleBtnActive: {
    backgroundColor: c.surface,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  viewToggleTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  selectionScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  enterSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: authRadius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  enterSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  scopeSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
  },
  scopeSelectAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  exitSelectText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  floorCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 52,
    gap: 8,
  },
  floorHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floorTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  floorCountPill: {
    backgroundColor: c.background,
    borderRadius: authRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: c.border,
  },
  floorCountText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  floorVacantText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  roomTile: {
    flexGrow: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    gap: 6,
    minHeight: 88,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roomTileSelected: {
    borderWidth: 2,
  },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  tileRoomNumber: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: c.forestInk,
  },
  tileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tileStatusText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  tileVisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileVisText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 74,
  },
  listRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  listRowSelected: {
    backgroundColor: '#F3FAF7',
  },
  listTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flexWrap: 'wrap',
  },
  listRoomNumber: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: c.forestInk,
  },
  listFloorText: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
    fontWeight: '500',
  },
  listTypeName: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  listBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  listPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  listPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  visPublicPill: {
    backgroundColor: '#E8F5EE',
  },
  visPrivatePill: {
    backgroundColor: '#EEF2F0',
  },
  listRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  listPrice: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  selectionBarSafe: {
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: authSpacing.xl,
    paddingVertical: 12,
  },
  selectionCountText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  selectionHintText: {
    fontSize: 11,
    lineHeight: 15,
    color: c.textSecondary,
  },
  selectionCancelBtn: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
  },
  selectionActionBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skeletonGroup: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 12,
  },
  skeletonTileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonTile: {
    flex: 1,
    height: 84,
    borderRadius: 14,
  },
  skeleton: {
    backgroundColor: c.border,
    borderRadius: 8,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.xxl,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.xxl,
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyPrimaryBtn: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySecondaryBtn: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: authRadius.round,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
});
