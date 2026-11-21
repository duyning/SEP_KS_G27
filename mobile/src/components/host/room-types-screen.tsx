import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useHost } from '@/context/host-context';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { useReducedMotionPreference } from '@/constants/motion';
import { getApiBase, resolveImageUrl } from '@/services/accommodations';
import { hostPrice, type HostRoom, type HostRoomType } from '@/services/host';
import {
  availabilityPresentation,
  canConfirmRoomTypeAvailability,
  confirmRoomTypeAvailability,
  filterAndSortHostRoomTypes,
  propertyRoomTypesOverview,
  roomTypeInventory,
  roomTypeOperationalStatus,
  type RoomTypeFilterKey,
  type RoomTypeSortKey,
} from '@/services/host-room-types';
import { h } from './host-ui';
import { useManagedProperty } from './management-ui';
import {
  AvailabilityConfirmSheet,
  CompactPropertyPicker,
  RoomTypeFilterSheet,
} from './room-types-sheets';

export function RoomTypesScreen({
  scopedPropertyId,
  onBack,
}: {
  scopedPropertyId?: string;
  onBack?(): void;
} = {}) {
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const initialPropertyId = scopedPropertyId || params.propertyId;
  return (
    <RoomTypesContent
      key={initialPropertyId || 'all'}
      initialPropertyId={initialPropertyId}
      onBack={onBack}
    />
  );
}

function RoomTypesContent({
  initialPropertyId,
  onBack,
}: {
  initialPropertyId?: string;
  onBack?(): void;
}) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const { properties, property, select } = useManagedProperty(initialPropertyId);
  const propertyId = property?.propertyId;

  useFocusEffect(
    useCallback(() => {
      void host.store.refresh();
    }, [host.store])
  );

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoomTypeFilterKey>('ALL');
  const [sort, setSort] = useState<RoomTypeSortKey>('NEWEST');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Availability confirmation sheet state + property-switch guard
  const [confirmTarget, setConfirmTarget] = useState<HostRoomType | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmBanner, setConfirmBanner] = useState<string | null>(null);
  const confirmLock = useRef(false);
  const activePropertyRef = useRef<number | undefined>(propertyId);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activePropertyRef.current = propertyId;
  }, [propertyId]);

  const handleSelectProperty = (nextPropertyId: number) => {
    if (nextPropertyId === propertyId) return;
    activePropertyRef.current = nextPropertyId;
    select(nextPropertyId);
    setConfirmTarget(null);
    setConfirmError(null);
    setConfirmBanner(null);
    setConfirmBusy(false);
    confirmLock.current = false;
  };

  const hasTypesData = Boolean(host.data.roomTypes);
  const hasRoomsData = Boolean(host.data.rooms);

  // Authoritative property-level lists (NEVER filtered)
  const propertyTypes = useMemo(() => {
    if (!hasTypesData || propertyId == null) return undefined;
    return (host.data.roomTypes?.roomTypes || []).filter(item => item.propertyId === propertyId);
  }, [hasTypesData, host.data.roomTypes?.roomTypes, propertyId]);

  const propertyRooms = useMemo(() => {
    if (!hasRoomsData || propertyId == null) return undefined;
    return (host.data.rooms?.rooms || []).filter(room => room.propertyId === propertyId);
  }, [hasRoomsData, host.data.rooms?.rooms, propertyId]);

  const overview = useMemo(
    () => propertyRoomTypesOverview(propertyTypes, propertyRooms),
    [propertyTypes, propertyRooms]
  );

  const displayedRows = useMemo(
    () =>
      filterAndSortHostRoomTypes(propertyTypes || [], propertyRooms, {
        search,
        filter,
        sort,
      }),
    [propertyTypes, propertyRooms, search, filter, sort]
  );

  const activeFilterCount = (filter !== 'ALL' ? 1 : 0) + (sort !== 'NEWEST' ? 1 : 0);
  const hasQueryOrFilter = search.trim().length > 0 || activeFilterCount > 0;

  const resetAllFilters = () => {
    setSearch('');
    setFilter('ALL');
    setSort('NEWEST');
  };

  const openCreateFlow = () => {
    if (host.allowed && propertyId != null) {
      router.push({ pathname: '/host/room-type', params: { propertyId: String(propertyId) } });
    }
  };

  const openDetail = (item: HostRoomType) => {
    router.push({
      pathname: '/host/room-type-detail',
      params: { propertyId: String(item.propertyId), id: String(item.roomTypeId) },
    });
  };

  const openRoomsForType = (item: HostRoomType) => {
    router.push({
      pathname: '/host/rooms',
      params: { propertyId: String(item.propertyId), roomTypeId: String(item.roomTypeId) },
    });
  };

  const handleOpenConfirm = (item: HostRoomType) => {
    setConfirmTarget(item);
    setConfirmError(null);
    setConfirmBanner(null);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmTarget || confirmLock.current) return;
    const targetType = confirmTarget;
    const requestedPropertyId = propertyId;

    confirmLock.current = true;
    setConfirmBusy(true);
    setConfirmError(null);

    try {
      await host.store.mutate(
        `/host/room-types/${targetType.roomTypeId}/availability-confirmation`,
        undefined,
        'POST',
        undefined,
        (token, signal) => confirmRoomTypeAvailability(targetType.roomTypeId, token, signal)
      );

      // Ignore result if user switched property or unmounted while request was in flight
      if (!mountedRef.current || activePropertyRef.current !== requestedPropertyId) {
        return;
      }

      setConfirmTarget(null);
      setConfirmBanner(`Đã xác nhận tình trạng phòng cho "${targetType.roomType}".`);
    } catch (err) {
      if (!mountedRef.current || activePropertyRef.current !== requestedPropertyId) {
        return;
      }
      setConfirmError(
        err instanceof Error ? err.message : 'Không thể xác nhận tình trạng phòng. Vui lòng thử lại.'
      );
    } finally {
      confirmLock.current = false;
      if (mountedRef.current && activePropertyRef.current === requestedPropertyId) {
        setConfirmBusy(false);
      }
    }
  };

  const confirmInventory = useMemo(
    () => (confirmTarget ? roomTypeInventory(confirmTarget, propertyRooms) : null),
    [confirmTarget, propertyRooms]
  );

  const canCreate = host.allowed && property?.status === 'ACTIVE' && propertyId != null;
  const loadError = host.errors.roomTypes;
  const isInitialLoading = !hasTypesData && !loadError;

  const listHeader = (
    <View style={s.intro}>
      {/* Compact Property Picker */}
      {properties.length > 0 && (
        <CompactPropertyPicker
          properties={properties}
          property={property}
          onSelect={handleSelectProperty}
        />
      )}

      {/* Compact 4-Stat Overview Strip (Selected Property Totals Only) */}
      {propertyId != null && (
        <View
          style={s.overviewStrip}
          accessibilityLabel={`Tổng quan ${property?.name || 'nhà trọ'}: ${overview.roomTypeCount ?? 'chưa rõ'} loại phòng, ${overview.totalRooms ?? 'chưa rõ'} tổng phòng, ${overview.vacantRooms ?? 'chưa rõ'} còn trống, ${overview.occupiedRooms ?? 'chưa rõ'} đang thuê`}
        >
          <OverviewCell label="Loại phòng" value={overview.roomTypeCount} />
          <View style={s.overviewDivider} />
          <OverviewCell label="Tổng phòng" value={overview.totalRooms} />
          <View style={s.overviewDivider} />
          <OverviewCell label="Còn trống" value={overview.vacantRooms} highlight />
          <View style={s.overviewDivider} />
          <OverviewCell label="Đang thuê" value={overview.occupiedRooms} />
        </View>
      )}

      {/* Error Notice (preserving cached data if present) */}
      {loadError && (
        <View style={s.noticeCard} accessibilityRole="alert">
          <Feather name="alert-circle" size={18} color={c.error} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.noticeText}>
              {loadError} {hasTypesData ? 'Đang hiển thị dữ liệu đã tải gần nhất.' : ''}
            </Text>
            <AnimatedPressable
              accessibilityLabel="Thử lại tải danh sách loại phòng"
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

      {/* Confirmation Success Feedback Banner */}
      {confirmBanner && (
        <View style={s.successBanner} accessibilityLiveRegion="polite">
          <Feather name="check-circle" size={16} color={c.primary} />
          <Text style={s.successBannerText}>{confirmBanner}</Text>
          <AnimatedPressable
            accessibilityLabel="Đóng thông báo"
            style={s.bannerDismiss}
            onPress={() => setConfirmBanner(null)}
          >
            <Feather name="x" size={15} color={c.primaryDark} />
          </AnimatedPressable>
        </View>
      )}

      {/* Search + Filter Single Row Toolbar */}
      {propertyTypes && propertyTypes.length > 0 && (
        <View style={s.toolbarSection}>
          <View style={s.toolbarRow}>
            <View style={s.searchBox}>
              <Feather name="search" size={17} color={c.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm loại phòng…"
                placeholderTextColor={c.placeholder}
                accessibilityLabel="Tìm loại phòng"
                returnKeyType="search"
                style={s.searchInput}
              />
              {search.length > 0 && (
                <AnimatedPressable
                  accessibilityLabel="Xóa từ khóa tìm kiếm"
                  style={s.clearBtn}
                  onPress={() => setSearch('')}
                >
                  <Feather name="x" size={15} color={c.textSecondary} />
                </AnimatedPressable>
              )}
            </View>

            <AnimatedPressable
              scaleTo={0.97}
              accessibilityLabel={`Bộ lọc và sắp xếp${
                activeFilterCount > 0 ? `, đang áp dụng ${activeFilterCount} tiêu chí` : ''
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
                Bộ lọc
              </Text>
              {activeFilterCount > 0 && (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </AnimatedPressable>
          </View>

          {/* Result Count Line */}
          <View style={s.resultMetaRow}>
            <Text style={s.resultMetaText}>
              {hasQueryOrFilter
                ? `Hiển thị ${displayedRows.length} / ${propertyTypes.length} loại phòng`
                : `${propertyTypes.length} loại phòng`}
            </Text>
            {hasQueryOrFilter && (
              <AnimatedPressable
                accessibilityLabel="Đặt lại tìm kiếm và bộ lọc"
                style={s.resetLink}
                onPress={resetAllFilters}
              >
                <Text style={s.resetLinkText}>Đặt lại</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={h.screen}
      edges={onBack ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
    >
      {/* Compact Header (No Back button on tab root) */}
      <View style={s.header}>
        {onBack && (
          <AnimatedPressable
            accessibilityLabel="Quay lại"
            style={s.backBtn}
            onPress={onBack}
          >
            <Feather name="arrow-left" size={20} color={c.forestInk} />
          </AnimatedPressable>
        )}
        <Text style={s.headerTitle} numberOfLines={1}>
          Loại phòng & Giá
        </Text>
        {canCreate && (
          <AnimatedPressable
            scaleTo={0.97}
            accessibilityLabel="Thêm loại phòng mới"
            style={s.addBtn}
            onPress={openCreateFlow}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={s.addBtnText}>Thêm loại</Text>
          </AnimatedPressable>
        )}
      </View>

      {host.allowed ? (
        <FlatList
          data={displayedRows}
          keyExtractor={r => String(r.roomTypeId)}
          contentInsetAdjustmentBehavior={onBack ? 'never' : 'automatic'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshing={host.loading}
          onRefresh={() => {
            void host.store.refresh();
          }}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item, index }) => (
            <RoomTypeCard
              item={item}
              index={index}
              propertyRooms={propertyRooms}
              imageToken={host.imageToken}
              reducedMotion={reducedMotion}
              onPressDetail={() => openDetail(item)}
              onPressConfirm={() => handleOpenConfirm(item)}
            />
          )}
          ListEmptyComponent={
            isInitialLoading ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Đang tải danh sách loại phòng"
                style={{ gap: 12 }}
              >
                {[0, 1, 2].map(n => (
                  <View key={n} style={s.skeletonCard}>
                    <View style={[s.skeleton, { width: 72, height: 72, borderRadius: 12 }]} />
                    <View style={{ flex: 1, gap: 10 }}>
                      <View style={[s.skeleton, { height: 16, width: '72%' }]} />
                      <View style={[s.skeleton, { height: 18, width: '50%' }]} />
                      <View style={[s.skeleton, { height: 13, width: '85%' }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : !property ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="home" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Chưa có nhà trọ để quản lý</Text>
                <Text style={s.emptyDesc}>
                  Bạn cần có nhà trọ đã được duyệt để thiết lập loại phòng và bảng giá thuê.
                </Text>
              </View>
            ) : propertyTypes && propertyTypes.length > 0 && displayedRows.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="search" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Không tìm thấy loại phòng phù hợp</Text>
                <Text style={s.emptyDesc}>
                  Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh tiêu chí trong bộ lọc.
                </Text>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.emptySecondaryBtn}
                  onPress={resetAllFilters}
                  accessibilityLabel="Đặt lại bộ lọc"
                >
                  <Text style={s.emptySecondaryBtnText}>Đặt lại bộ lọc</Text>
                </AnimatedPressable>
              </View>
            ) : hasTypesData && !loadError ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="layers" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Nhà trọ này chưa có loại phòng</Text>
                <Text style={s.emptyDesc}>
                  Tạo loại phòng với giá thuê, diện tích và sức chứa để bắt đầu quản lý phòng trống.
                </Text>
                {canCreate && (
                  <AnimatedPressable
                    scaleTo={0.97}
                    style={s.emptyPrimaryBtn}
                    onPress={openCreateFlow}
                    accessibilityLabel="Thêm loại phòng đầu tiên"
                  >
                    <Feather name="plus" size={16} color="#FFFFFF" />
                    <Text style={s.emptyPrimaryBtnText}>Thêm loại phòng</Text>
                  </AnimatedPressable>
                )}
              </View>
            ) : undefined
          }
        />
      ) : (
        <View style={s.emptyCard}>
          <View style={s.emptyIconCircle}>
            <Feather name="lock" size={24} color={c.textSecondary} />
          </View>
          <Text style={s.emptyTitle}>Bạn không có quyền truy cập</Text>
          <Text style={s.emptyDesc}>Khu vực này chỉ dành cho tài khoản chủ trọ.</Text>
        </View>
      )}

      {/* Filter & Sort Bottom Sheet */}
      <RoomTypeFilterSheet
        visible={filterSheetOpen}
        filter={filter}
        sort={sort}
        onClose={() => setFilterSheetOpen(false)}
        onApply={({ filter: nextFilter, sort: nextSort }) => {
          setFilter(nextFilter);
          setSort(nextSort);
        }}
      />

      {/* Availability Confirmation Bottom Sheet */}
      <AvailabilityConfirmSheet
        target={confirmTarget}
        propertyName={property?.name}
        inventory={confirmInventory}
        busy={confirmBusy}
        error={confirmError}
        onClose={() => {
          if (!confirmBusy) {
            setConfirmTarget(null);
            setConfirmError(null);
          }
        }}
        onInspectRooms={() => {
          if (!confirmTarget || confirmBusy) return;
          const target = confirmTarget;
          setConfirmTarget(null);
          setConfirmError(null);
          openRoomsForType(target);
        }}
        onConfirm={() => {
          void handleConfirmSubmit();
        }}
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview Strip Cell                                                         */
/* -------------------------------------------------------------------------- */

function OverviewCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <View style={s.overviewCell}>
      <Text style={[s.overviewValue, highlight && { color: c.primary }]}>
        {value != null ? value : '—'}
      </Text>
      <Text style={s.overviewLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Single-Column Room Type Card                                                */
/* -------------------------------------------------------------------------- */

function RoomTypeCard({
  item,
  index,
  propertyRooms,
  imageToken,
  reducedMotion,
  onPressDetail,
  onPressConfirm,
}: {
  item: HostRoomType;
  index: number;
  propertyRooms?: HostRoom[];
  imageToken: string | null;
  reducedMotion: boolean;
  onPressDetail: () => void;
  onPressConfirm: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const inventory = useMemo(
    () => roomTypeInventory(item, propertyRooms),
    [item, propertyRooms]
  );
  const opStatus = roomTypeOperationalStatus(inventory);
  const canConfirm = canConfirmRoomTypeAvailability(inventory);
  const availability = useMemo(() => availabilityPresentation(item), [item]);

  const firstImage = item.images?.[0];
  const privateImageUri =
    firstImage && imageToken
      ? `${getApiBase()}/api/host/room-types/${item.roomTypeId}/images/${firstImage.imageId}`
      : null;
  const fallbackPublicUri = !privateImageUri ? resolveImageUrl(item.imageUrl) : null;

  const specsText = [
    item.areaSqm != null ? `${item.areaSqm} m²` : null,
    item.capacity != null ? `Tối đa ${item.capacity} người` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const opTone =
    opStatus.key === 'ACTIVE'
      ? { bg: '#E8F5EE', fg: c.primary, border: '#CBE6D8' }
      : opStatus.key === 'FULL'
      ? { bg: '#EEF4FA', fg: '#1D5B8C', border: '#CFE0F0' }
      : { bg: '#F1F5F3', fg: c.textSecondary, border: '#DCE5E1' };

  const availTone =
    availability.state === 'CURRENT'
      ? { bg: '#E8F5EE', fg: c.primary, border: '#CBE6D8', icon: 'check-circle' as const }
      : availability.state === 'STALE'
      ? { bg: '#FEF6E7', fg: '#9A5B0A', border: '#F7DFB3', icon: 'alert-triangle' as const }
      : { bg: '#FEF6E7', fg: '#9A5B0A', border: '#F7DFB3', icon: 'clock' as const };

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.duration(220).delay(Math.min(index * 40, 200))
      }
      style={s.card}
    >
      {/* Main Info Row — Tappable to open Detail */}
      <AnimatedPressable
        scaleTo={0.99}
        accessibilityLabel={`Xem chi tiết loại phòng ${item.roomType}, giá ${hostPrice(item.price)}`}
        style={s.cardHeroRow}
        onPress={onPressDetail}
      >
        {/* Left Thumbnail */}
        <View style={s.thumbBox}>
          {privateImageUri && !imgFailed ? (
            <Image
              source={{
                uri: privateImageUri,
                headers: { Authorization: `Bearer ${imageToken}` },
              }}
              style={s.thumbImg}
              contentFit="cover"
              cachePolicy="none"
              onError={() => setImgFailed(true)}
            />
          ) : fallbackPublicUri && !imgFailed ? (
            <Image
              source={{ uri: fallbackPublicUri }}
              style={s.thumbImg}
              contentFit="cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Feather name="image" size={22} color={c.textMuted} />
          )}
        </View>

        {/* Right Text Block — Long title wraps cleanly, price never pushed off screen */}
        <View style={s.cardHeroCopy}>
          <Text style={s.cardTitle} numberOfLines={3}>
            {item.roomType}
          </Text>
          <Text style={s.cardPrice}>{hostPrice(item.price)}</Text>
          {specsText ? <Text style={s.cardSpecs}>{specsText}</Text> : null}
        </View>

        <Feather name="chevron-right" size={18} color={c.textMuted} style={{ marginTop: 2 }} />
      </AnimatedPressable>

      {/* Inventory Line */}
      <View style={s.inventoryRow}>
        {inventory.total === 0 ? (
          <Text style={s.inventoryMuted}>Chưa có phòng thực tế</Text>
        ) : (
          <Text style={s.inventoryText}>
            <Text style={s.inventoryStrong}>
              {inventory.total != null ? `${inventory.total} phòng` : '— phòng'}
            </Text>
            {' · '}
            <Text style={s.inventoryVacant}>
              {inventory.vacant != null ? `${inventory.vacant} trống` : '— trống'}
            </Text>
            {' · '}
            <Text style={s.inventoryMuted}>
              {inventory.occupied != null ? `${inventory.occupied} đang thuê` : '— đang thuê'}
            </Text>
            {inventory.other != null && inventory.other > 0 ? (
              <Text style={s.inventoryMuted}>{` · ${inventory.other} khác`}</Text>
            ) : null}
          </Text>
        )}
      </View>

      {/* Two Distinct Status Labels (NEVER merged) */}
      <View style={s.badgesRow}>
        <View
          style={[
            s.statusPill,
            { backgroundColor: opTone.bg, borderColor: opTone.border },
          ]}
        >
          <Text style={[s.statusPillText, { color: opTone.fg }]}>{opStatus.label}</Text>
        </View>

        {canConfirm && (
          <View
            style={[
              s.statusPill,
              { backgroundColor: availTone.bg, borderColor: availTone.border },
            ]}
          >
            <Feather name={availTone.icon} size={11} color={availTone.fg} />
            <Text style={[s.statusPillText, { color: availTone.fg }]}>{availability.label}</Text>
          </View>
        )}
      </View>

      {/* Bottom Action Row (Only when rooms exist) */}
      {canConfirm && (
        <>
          <View style={s.cardDivider} />
          <View style={s.cardActionRow}>
            <Text style={s.availabilityTimeText} numberOfLines={2}>
              {availability.detail}
            </Text>
            <AnimatedPressable
              scaleTo={0.97}
              accessibilityLabel={`Xác nhận tình trạng phòng cho ${item.roomType}`}
              style={[
                s.confirmBtn,
                availability.state !== 'CURRENT' && s.confirmBtnHighlighted,
              ]}
              onPress={onPressConfirm}
            >
              <Feather
                name={availability.state === 'CURRENT' ? 'refresh-cw' : 'check-circle'}
                size={14}
                color={c.primary}
              />
              <Text style={s.confirmBtnText}>Xác nhận tình trạng</Text>
            </AnimatedPressable>
          </View>
        </>
      )}
    </Animated.View>
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
    gap: 10,
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.4,
  },
  addBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
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
  listContent: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.xs,
    paddingBottom: 36,
  },
  intro: {
    gap: 12,
    paddingBottom: 12,
  },
  overviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 11,
    paddingHorizontal: 6,
  },
  overviewCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
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
    textAlign: 'center',
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
  toolbarSection: {
    gap: 8,
  },
  toolbarRow: {
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
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  resultMetaText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.textSecondary,
  },
  resetLink: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  resetLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 10,
    shadowColor: c.forestInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#EEF4F1',
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  cardHeroCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  cardPrice: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  cardSpecs: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  inventoryRow: {
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inventoryText: {
    fontSize: 13,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  },
  inventoryStrong: {
    fontWeight: '700',
    color: c.forestInk,
  },
  inventoryVacant: {
    fontWeight: '800',
    color: c.primary,
  },
  inventoryMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityTimeText: {
    flex: 1,
    minWidth: 120,
    fontSize: 11,
    lineHeight: 16,
    color: c.textSecondary,
  },
  confirmBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmBtnHighlighted: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  confirmBtnText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: c.primary,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: authSpacing.lg,
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
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
