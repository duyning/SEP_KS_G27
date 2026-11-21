import { useCallback, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import { HostError, hostPrice, hostRequest, type HostRoom, type HostRoomType } from '@/services/host';
import {
  availabilityPresentation,
  canConfirmRoomTypeAvailability,
  confirmRoomTypeAvailability,
  formatFeeWithUnit,
  formatFloorLabel,
  formatMoneyVnd,
  resolveRoomEffectivePrice,
  roomAmenityLabel,
  roomTypeInventory,
} from '@/services/host-room-types';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { RoomTypeImageGallery } from '@/components/host/room-type-gallery';
import { AvailabilityConfirmSheet } from '@/components/host/room-types-sheets';
import { statusLabel } from '@/components/host/host-ui';
import { useReducedMotionPreference } from '@/constants/motion';

type FeatherName = ComponentProps<typeof Feather>['name'];

export default function RoomTypeDetailScreen() {
  const { id, propertyId } = useLocalSearchParams<{ id?: string; propertyId?: string }>();
  const { user } = useAuth();
  const numericId = id && /^\d+$/.test(id) ? Number(id) : null;
  const numericPropertyId = propertyId && /^\d+$/.test(propertyId) ? Number(propertyId) : null;

  return (
    <RoomTypeDetailContent
      key={`${user?.userId || 'guest'}:${numericPropertyId ?? 'p'}:${numericId ?? 'rt'}`}
      roomTypeId={numericId}
      propertyId={numericPropertyId}
    />
  );
}

function RoomTypeDetailContent({
  roomTypeId,
  propertyId,
}: {
  roomTypeId: number | null;
  propertyId: number | null;
}) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();

  const cachedType = useMemo(() => {
    if (roomTypeId == null) return undefined;
    return host.data.roomTypes?.roomTypes.find(
      item =>
        item.roomTypeId === roomTypeId &&
        (propertyId == null || item.propertyId === propertyId)
    );
  }, [host.data.roomTypes?.roomTypes, propertyId, roomTypeId]);

  const [detail, setDetail] = useState<HostRoomType | null>(null);
  const [loading, setLoading] = useState(Boolean(roomTypeId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Collapsible sections state
  const [feesOpen, setFeesOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  // Availability confirmation sheet state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);
  const confirmLock = useRef(false);
  const fetchGeneration = useRef(0);

  const loadDetail = useCallback(
    async (isPullRefresh = false) => {
      if (!host.allowed || roomTypeId == null) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const gen = ++fetchGeneration.current;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setNotFound(false);

      try {
        const token = await tokenStore.get();
        if (gen !== fetchGeneration.current) return;
        const value = await hostRequest<HostRoomType>(
          `/host/room-types/${roomTypeId}`,
          token || '',
          controller.signal
        );
        if (gen !== fetchGeneration.current || controller.signal.aborted) return;
        if (propertyId != null && value.propertyId !== propertyId) {
          setNotFound(true);
          setDetail(null);
          return;
        }
        setDetail(value);
      } catch (err) {
        if (gen !== fetchGeneration.current) return;
        if (err instanceof HostError && err.status === 404) {
          setNotFound(true);
          setDetail(null);
        } else {
          setError(
            controller.signal.aborted
              ? 'Tải dữ liệu quá lâu. Vui lòng thử lại.'
              : err instanceof Error
              ? err.message
              : 'Không thể tải chi tiết loại phòng.'
          );
        }
      } finally {
        clearTimeout(timeout);
        if (gen === fetchGeneration.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [host.allowed, propertyId, roomTypeId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail(false);
      return () => {
        fetchGeneration.current++;
      };
    }, [loadDetail])
  );

  const activeType = detail || cachedType || null;
  const resolvedPropertyId = activeType?.propertyId ?? propertyId;

  const property = useMemo(() => {
    if (resolvedPropertyId == null) return undefined;
    return (
      host.data.roomTypes?.properties?.find(p => p.propertyId === resolvedPropertyId) ||
      host.data.properties?.records.find(p => p.propertyId === resolvedPropertyId)
    );
  }, [host.data.properties?.records, host.data.roomTypes?.properties, resolvedPropertyId]);

  const canEdit = Boolean(
    host.allowed &&
      activeType &&
      property &&
      ('status' in property
        ? property.status === 'ACTIVE'
        : ['ACTIVE', 'VISIBLE'].includes(property.displayStatus))
  );

  // Authoritative rooms for this room type (prefer full detail.rooms, fallback to store rooms)
  const storeRooms = host.data.rooms?.rooms;
  const detailRooms = detail?.rooms;
  const roomsForType = useMemo<HostRoom[] | undefined>(() => {
    if (Array.isArray(detailRooms)) return detailRooms;
    if (roomTypeId == null || !storeRooms) return undefined;
    return storeRooms.filter(
      r =>
        r.roomTypeId === roomTypeId &&
        (resolvedPropertyId == null || r.propertyId === resolvedPropertyId)
    );
  }, [detailRooms, storeRooms, resolvedPropertyId, roomTypeId]);

  const inventory = useMemo(
    () => (activeType ? roomTypeInventory(activeType, roomsForType) : null),
    [activeType, roomsForType]
  );

  const availability = useMemo(
    () => (activeType ? availabilityPresentation(activeType) : null),
    [activeType]
  );

  const canConfirm = inventory ? canConfirmRoomTypeAvailability(inventory) : false;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/host/room-types');
    }
  };

  // Shared navigation helper used by BOTH "Xem tất cả N phòng" and "Quản lý phòng"
  const openManagedRooms = () => {
    if (resolvedPropertyId == null || roomTypeId == null) return;
    router.push({
      pathname: '/host/rooms',
      params: {
        propertyId: String(resolvedPropertyId),
        roomTypeId: String(roomTypeId),
      },
    });
  };

  const openEditScreen = () => {
    if (!canEdit || resolvedPropertyId == null || roomTypeId == null) return;
    router.push({
      pathname: '/host/room-type',
      params: {
        propertyId: String(resolvedPropertyId),
        id: String(roomTypeId),
      },
    });
  };

  const handleConfirmAvailability = async () => {
    if (!activeType || roomTypeId == null || confirmLock.current) return;
    confirmLock.current = true;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      let confirmed: HostRoomType | null = null;
      await host.store.mutate(
        `/host/room-types/${roomTypeId}/availability-confirmation`,
        undefined,
        'POST',
        undefined,
        async (token, signal) => {
          confirmed = await confirmRoomTypeAvailability(roomTypeId, token, signal);
          return confirmed;
        }
      );
      if (confirmed) {
        setDetail(prev => (prev ? { ...prev, ...confirmed } : confirmed!));
      }
      setConfirmOpen(false);
      setConfirmNotice('Đã xác nhận tình trạng phòng trống.');
    } catch (err) {
      setConfirmError(
        err instanceof Error
          ? err.message
          : 'Không thể xác nhận tình trạng phòng. Vui lòng thử lại.'
      );
    } finally {
      confirmLock.current = false;
      setConfirmBusy(false);
    }
  };

  const previewRooms = roomsForType ? roomsForType.slice(0, 3) : [];
  const totalRoomsCount = inventory?.total ?? roomsForType?.length ?? null;

  const vacancyBadge = useMemo(() => {
    if (!inventory || inventory.total == null || inventory.vacant == null) {
      return { label: 'Chưa rõ số phòng', bg: '#F1F5F3', fg: c.textSecondary, border: '#DCE5E1' };
    }
    if (inventory.total === 0) {
      return { label: 'Chưa có phòng', bg: '#F1F5F3', fg: c.textSecondary, border: '#DCE5E1' };
    }
    if (inventory.vacant > 0) {
      return {
        label: `${inventory.vacant}/${inventory.total} phòng trống`,
        bg: '#E8F5EE',
        fg: c.primary,
        border: '#CBE6D8',
      };
    }
    return {
      label: `Đã lấp đầy (${inventory.total} phòng)`,
      bg: '#EEF4FA',
      fg: '#1D5B8C',
      border: '#CFE0F0',
    };
  }, [inventory]);

  const specsLine = activeType
    ? [
        activeType.areaSqm != null ? `${activeType.areaSqm} m²` : 'Chưa rõ diện tích',
        activeType.capacity != null ? `Tối đa ${activeType.capacity} người` : 'Chưa rõ sức chứa',
      ].join(' · ')
    : '';

  const depositSummary = activeType
    ? activeType.deposit != null
      ? `Đặt cọc: ${formatMoneyVnd(activeType.deposit)}`
      : 'Đặt cọc: Chưa cấu hình'
    : 'Chưa cấu hình';

  const amenitiesList = detail?.amenities ?? activeType?.amenities ?? [];
  const descriptionText = detail?.description ?? activeType?.description ?? '';

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* 1. Header with Back button + Title */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại danh sách loại phòng"
          style={s.backBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>
        <Text style={s.headerTitle} numberOfLines={1}>
          Chi tiết loại phòng
        </Text>
        <View style={s.headerSpacer} />
      </View>

      {!host.allowed ? (
        <View style={s.stateCard}>
          <Feather name="lock" size={26} color={c.textSecondary} />
          <Text style={s.stateTitle}>Bạn không có quyền truy cập</Text>
          <Text style={s.stateSub}>Khu vực này chỉ dành cho tài khoản chủ trọ.</Text>
        </View>
      ) : roomTypeId == null || notFound ? (
        <View style={s.stateCard}>
          <Feather name="layers" size={26} color={c.primary} />
          <Text style={s.stateTitle}>Không tìm thấy loại phòng</Text>
          <Text style={s.stateSub}>
            Loại phòng này không tồn tại hoặc không thuộc tài khoản của bạn.
          </Text>
          <AnimatedPressable style={s.stateBtn} onPress={handleBack}>
            <Text style={s.stateBtnText}>Quay lại danh sách</Text>
          </AnimatedPressable>
        </View>
      ) : loading && !activeType ? (
        <View
          style={s.skeletonContainer}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang tải chi tiết loại phòng"
        >
          <View style={[s.skeleton, { height: 236, borderRadius: authRadius.xxl }]} />
          <View style={[s.skeleton, { height: 26, width: '74%' }]} />
          <View style={[s.skeleton, { height: 24, width: '48%' }]} />
          <View style={[s.skeleton, { height: 64, borderRadius: 16 }]} />
          <View style={[s.skeleton, { height: 64, borderRadius: 16 }]} />
          <View style={[s.skeleton, { height: 140, borderRadius: 18 }]} />
        </View>
      ) : error && !activeType ? (
        <View style={s.stateCard} accessibilityRole="alert">
          <Feather name="alert-circle" size={26} color={c.error} />
          <Text style={s.stateTitle}>Không thể tải chi tiết loại phòng</Text>
          <Text style={s.stateSub}>{error}</Text>
          <AnimatedPressable
            style={s.stateBtn}
            onPress={() => {
              void loadDetail(false);
            }}
          >
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
            <Text style={s.stateBtnText}>Thử lại</Text>
          </AnimatedPressable>
        </View>
      ) : activeType ? (
        <>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void Promise.all([loadDetail(true), host.store.refresh()]);
                }}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          >
            {/* Non-blocking error notice if refresh failed while cached data is visible */}
            {error && (
              <View style={s.inlineErrorBanner} accessibilityRole="alert">
                <Feather name="alert-circle" size={16} color={c.error} />
                <Text style={s.inlineErrorText}>{error}</Text>
                <AnimatedPressable
                  onPress={() => {
                    void loadDetail(false);
                  }}
                  style={s.inlineRetryBtn}
                >
                  <Text style={s.inlineRetryText}>Thử lại</Text>
                </AnimatedPressable>
              </View>
            )}

            {/* 2. Thư viện ảnh */}
            <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(220)}>
              <RoomTypeImageGallery
                roomTypeId={activeType.roomTypeId}
                images={activeType.images}
                imageUrl={activeType.imageUrl}
                imageToken={host.imageToken}
              />
            </Animated.View>

            {/* 3. Thông tin chính */}
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(240).delay(40)}
              style={s.primaryInfoCard}
            >
              {property?.name ? (
                <View style={s.propertyEyebrowRow}>
                  <Feather name="home" size={12} color={c.textSecondary} />
                  <Text style={s.propertyEyebrow} numberOfLines={1}>
                    {property.name}
                  </Text>
                </View>
              ) : null}

              <Text style={s.typeName}>{activeType.roomType}</Text>

              <Text style={s.typePrice}>{hostPrice(activeType.price)}</Text>

              <Text style={s.typeSpecs}>{specsLine}</Text>

              {/* Vacancy badge (separate from availability confirmation) */}
              <View style={s.badgesRow}>
                <View
                  style={[
                    s.badgePill,
                    { backgroundColor: vacancyBadge.bg, borderColor: vacancyBadge.border },
                  ]}
                >
                  <Feather name="key" size={12} color={vacancyBadge.fg} />
                  <Text style={[s.badgePillText, { color: vacancyBadge.fg }]}>
                    {vacancyBadge.label}
                  </Text>
                </View>
              </View>

              {/* Separate Availability Confirmation Status */}
              {canConfirm && availability && (
                <View style={s.availabilityBox}>
                  <View style={s.availabilityCopy}>
                    <View style={s.availabilityTitleRow}>
                      <Feather
                        name={
                          availability.state === 'CURRENT'
                            ? 'check-circle'
                            : availability.state === 'STALE'
                            ? 'alert-triangle'
                            : 'clock'
                        }
                        size={14}
                        color={availability.state === 'CURRENT' ? c.primary : '#9A5B0A'}
                      />
                      <Text
                        style={[
                          s.availabilityStatus,
                          {
                            color:
                              availability.state === 'CURRENT' ? c.primaryDark : '#9A5B0A',
                          },
                        ]}
                      >
                        {availability.label}
                      </Text>
                    </View>
                    <Text style={s.availabilityDetail}>{availability.detail}</Text>
                  </View>

                  <AnimatedPressable
                    scaleTo={0.97}
                    accessibilityLabel="Xác nhận tình trạng phòng trống"
                    style={s.confirmMiniBtn}
                    onPress={() => {
                      setConfirmError(null);
                      setConfirmOpen(true);
                    }}
                  >
                    <Text style={s.confirmMiniBtnText}>Xác nhận</Text>
                  </AnimatedPressable>
                </View>
              )}

              {confirmNotice && (
                <View style={s.confirmSuccessPill} accessibilityLiveRegion="polite">
                  <Feather name="check" size={13} color={c.primary} />
                  <Text style={s.confirmSuccessText}>{confirmNotice}</Text>
                </View>
              )}
            </Animated.View>

            {/* 4. Ba mục thu gọn (Tiền cọc & Chi phí dịch vụ, Tiện nghi, Mô tả) */}
            <View style={s.accordionsGroup}>
              {/* 4a. Tiền cọc & Chi phí dịch vụ */}
              <CollapsibleCard
                title="Tiền cọc & Chi phí dịch vụ"
                summary={depositSummary}
                icon="credit-card"
                expanded={feesOpen}
                onToggle={() => setFeesOpen(v => !v)}
              >
                <View style={s.feeList}>
                  <FeeRow
                    label="Tiền đặt cọc"
                    value={formatMoneyVnd(activeType.deposit)}
                    muted={activeType.deposit == null}
                    highlight
                  />
                  <FeeRow
                    label="Tiền điện"
                    value={
                      loading && !detail
                        ? 'Đang tải…'
                        : formatFeeWithUnit(detail?.electricityPrice ?? activeType.electricityPrice, 'kWh')
                    }
                    muted={(detail?.electricityPrice ?? activeType.electricityPrice) == null}
                  />
                  <FeeRow
                    label="Tiền nước"
                    value={
                      loading && !detail
                        ? 'Đang tải…'
                        : formatFeeWithUnit(detail?.waterPrice ?? activeType.waterPrice, 'm³')
                    }
                    muted={(detail?.waterPrice ?? activeType.waterPrice) == null}
                  />
                  <FeeRow
                    label="Internet / Wifi"
                    value={
                      loading && !detail
                        ? 'Đang tải…'
                        : formatFeeWithUnit(detail?.internetPrice ?? activeType.internetPrice, 'phòng')
                    }
                    muted={(detail?.internetPrice ?? activeType.internetPrice) == null}
                  />
                  <FeeRow
                    label="Dịch vụ chung"
                    value={
                      loading && !detail
                        ? 'Đang tải…'
                        : formatFeeWithUnit(detail?.servicePrice ?? activeType.servicePrice, 'người')
                    }
                    muted={(detail?.servicePrice ?? activeType.servicePrice) == null}
                    last
                  />
                </View>
              </CollapsibleCard>

              {/* 4b. Tiện nghi */}
              <CollapsibleCard
                title="Tiện nghi"
                summary={
                  amenitiesList.length > 0
                    ? `${amenitiesList.length} tiện nghi`
                    : 'Chưa cập nhật'
                }
                icon="check-square"
                expanded={amenitiesOpen}
                onToggle={() => setAmenitiesOpen(v => !v)}
              >
                {amenitiesList.length > 0 ? (
                  <View style={s.amenityChipsWrap}>
                    {amenitiesList.map((key, idx) => (
                      <View key={`${key}:${idx}`} style={s.amenityChip}>
                        <Feather name="check" size={12} color={c.primary} />
                        <Text style={s.amenityChipText}>{roomAmenityLabel(key)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.mutedBody}>Chưa cập nhật tiện nghi cho loại phòng này.</Text>
                )}
              </CollapsibleCard>

              {/* 4c. Mô tả loại phòng */}
              <CollapsibleCard
                title="Mô tả loại phòng"
                summary={
                  loading && !detail
                    ? 'Đang tải…'
                    : descriptionText.trim()
                    ? 'Xem mô tả chi tiết'
                    : 'Chưa có mô tả'
                }
                icon="align-left"
                expanded={descriptionOpen}
                onToggle={() => setDescriptionOpen(v => !v)}
              >
                {loading && !detail ? (
                  <Text style={s.mutedBody}>Đang tải mô tả…</Text>
                ) : descriptionText.trim() ? (
                  <Text selectable style={s.descriptionText}>
                    {descriptionText}
                  </Text>
                ) : (
                  <Text style={s.mutedBody}>Chưa có mô tả chi tiết cho loại phòng này.</Text>
                )}
              </CollapsibleCard>
            </View>

            {/* 5. Phòng thuộc loại này (Preview max 3 rows — NO nested vertical scroll) */}
            <View style={s.roomsSection}>
              <View style={s.roomsHeader}>
                <View style={s.roomsHeaderLeft}>
                  <View style={s.sectionIconBox}>
                    <Feather name="grid" size={15} color={c.primary} />
                  </View>
                  <Text style={s.sectionTitle}>Phòng thuộc loại này</Text>
                </View>
                <Text style={s.roomsCountMeta}>
                  {totalRoomsCount != null ? `${totalRoomsCount} phòng` : '—'}
                </Text>
              </View>

              {loading && !roomsForType ? (
                <Text style={s.mutedBody}>Đang tải danh sách phòng…</Text>
              ) : previewRooms.length > 0 ? (
                <View style={s.roomsList}>
                  {previewRooms.map((room, idx) => (
                    <RoomPreviewRow
                      key={room.roomId}
                      room={room}
                      defaultTypePrice={activeType.price}
                      last={idx === previewRooms.length - 1}
                    />
                  ))}
                </View>
              ) : (
                <View style={s.emptyRoomsBox}>
                  <Feather name="inbox" size={18} color={c.textMuted} />
                  <Text style={s.mutedBody}>
                    Chưa có phòng thực tế nào thuộc loại phòng này.
                  </Text>
                </View>
              )}

              {totalRoomsCount != null && totalRoomsCount > 0 && (
                <AnimatedPressable
                  scaleTo={0.98}
                  accessibilityLabel={`Xem tất cả ${totalRoomsCount} phòng`}
                  style={s.seeAllRoomsBtn}
                  onPress={openManagedRooms}
                >
                  <Text style={s.seeAllRoomsText}>
                    Xem tất cả {totalRoomsCount} phòng
                  </Text>
                  <Feather name="arrow-right" size={15} color={c.primary} />
                </AnimatedPressable>
              )}
            </View>
          </ScrollView>

          {/* 6. Thanh thao tác dưới (Above Safe Area, no bottom Close button) */}
          <View style={s.bottomBar}>
            <AnimatedPressable
              scaleTo={0.98}
              accessibilityLabel="Quản lý phòng thuộc loại này"
              style={s.bottomSecondaryBtn}
              onPress={openManagedRooms}
            >
              <Feather name="key" size={16} color={c.primary} />
              <Text style={s.bottomSecondaryText}>Quản lý phòng</Text>
            </AnimatedPressable>

            {canEdit && (
              <AnimatedPressable
                scaleTo={0.98}
                accessibilityLabel="Chỉnh sửa loại phòng"
                style={s.bottomPrimaryBtn}
                onPress={openEditScreen}
              >
                <Feather name="edit-2" size={15} color="#FFFFFF" />
                <Text style={s.bottomPrimaryText}>Chỉnh sửa loại phòng</Text>
              </AnimatedPressable>
            )}
          </View>

          {/* Availability Confirmation Sheet */}
          <AvailabilityConfirmSheet
            target={confirmOpen ? activeType : null}
            propertyName={property?.name}
            inventory={inventory}
            busy={confirmBusy}
            error={confirmError}
            onClose={() => {
              if (!confirmBusy) {
                setConfirmOpen(false);
                setConfirmError(null);
              }
            }}
            onInspectRooms={() => {
              if (confirmBusy) return;
              setConfirmOpen(false);
              setConfirmError(null);
              openManagedRooms();
            }}
            onConfirm={() => {
              void handleConfirmAvailability();
            }}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Collapsible Section Component                                               */
/* -------------------------------------------------------------------------- */

function CollapsibleCard({
  title,
  summary,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  icon: FeatherName;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={s.accordionCard}>
      <AnimatedPressable
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${summary}`}
        style={s.accordionHeader}
        onPress={onToggle}
      >
        <View style={s.sectionIconBox}>
          <Feather name={icon} size={15} color={c.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.accordionTitle}>{title}</Text>
          {!expanded && (
            <Text style={s.accordionSummary} numberOfLines={1}>
              {summary}
            </Text>
          )}
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={c.textSecondary}
        />
      </AnimatedPressable>

      {expanded && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Fee Key-Value Row                                                           */
/* -------------------------------------------------------------------------- */

function FeeRow({
  label,
  value,
  muted = false,
  highlight = false,
  last = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[s.feeRow, highlight && s.feeRowHighlight, last && { borderBottomWidth: 0 }]}>
      <Text style={s.feeLabel}>{label}</Text>
      <Text
        style={[
          s.feeValue,
          highlight && { color: c.primary, fontWeight: '700' },
          muted && { color: c.textMuted, fontWeight: '400' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Room Preview Row (Mã phòng, tầng, trạng thái, giá thuê phòng)               */
/* -------------------------------------------------------------------------- */

function RoomPreviewRow({
  room,
  defaultTypePrice,
  last,
}: {
  room: HostRoom;
  defaultTypePrice: number | null;
  last: boolean;
}) {
  const effective = resolveRoomEffectivePrice(room, defaultTypePrice);
  const isVacant = room.status === 'VACANT';
  const isOccupied = room.status === 'OCCUPIED';

  const statusTone = isVacant
    ? { bg: '#E8F5EE', fg: c.primary, dot: c.primary }
    : isOccupied
    ? { bg: '#EEF4FA', fg: '#1D5B8C', dot: '#1D5B8C' }
    : { bg: '#FEF6E7', fg: '#9A5B0A', dot: '#9A5B0A' };

  return (
    <AnimatedPressable
      scaleTo={0.99}
      accessibilityLabel={`Phòng ${room.roomNumber}, ${formatFloorLabel(room.floor)}, ${statusLabel[room.status] || room.status}, giá ${formatMoneyVnd(effective.amount, 'Chưa có giá')}`}
      style={[s.roomRow, !last && s.roomRowBorder]}
      onPress={() => router.push({ pathname: '/host/room', params: { id: String(room.roomId) } })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.roomTopLine}>
          <Text style={s.roomNumber}>{room.roomNumber}</Text>
          <Text style={s.roomFloor}>· {formatFloorLabel(room.floor)}</Text>
        </View>

        <View style={[s.roomStatusPill, { backgroundColor: statusTone.bg }]}>
          <View style={[s.roomStatusDot, { backgroundColor: statusTone.dot }]} />
          <Text style={[s.roomStatusText, { color: statusTone.fg }]}>
            {statusLabel[room.status] || room.status}
          </Text>
        </View>
      </View>

      <View style={s.roomPriceCol}>
        <Text style={s.roomPriceValue}>
          {effective.amount != null ? formatMoneyVnd(effective.amount) : 'Chưa có giá'}
        </Text>
        {effective.isCustom && <Text style={s.customPriceTag}>Giá riêng</Text>}
      </View>

      <Feather name="chevron-right" size={16} color={c.textMuted} />
    </AnimatedPressable>
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
    paddingHorizontal: authSpacing.lg,
    paddingVertical: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
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
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: c.forestInk,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.md,
    paddingBottom: 28,
    gap: 14,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.errorLight,
    borderWidth: 1,
    borderColor: c.errorBorder,
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.error,
  },
  inlineRetryBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  inlineRetryText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.error,
  },
  primaryInfoCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 8,
    shadowColor: c.forestInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  propertyEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  propertyEyebrow: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.textSecondary,
  },
  typeName: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.3,
  },
  typePrice: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  typeSpecs: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  availabilityBox: {
    marginTop: 6,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  availabilityCopy: {
    flex: 1,
    gap: 3,
  },
  availabilityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  availabilityStatus: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  availabilityDetail: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textSecondary,
  },
  confirmMiniBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  confirmSuccessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5EE',
    borderRadius: authRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmSuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.primaryDark,
  },
  accordionsGroup: {
    gap: 10,
  },
  accordionCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 14,
    minHeight: 60,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  accordionSummary: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  accordionBody: {
    paddingHorizontal: authSpacing.lg,
    paddingBottom: authSpacing.lg,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  feeList: {
    marginTop: 6,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  feeRowHighlight: {
    backgroundColor: '#F5FBF8',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: authRadius.sm,
  },
  feeLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    flexShrink: 1,
  },
  amenityChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#D4E8E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.round,
  },
  amenityChipText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.primaryDark,
  },
  descriptionText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: c.forestInk,
  },
  mutedBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
  },
  roomsSection: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 12,
  },
  roomsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  roomsCountMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  roomsList: {
    backgroundColor: c.background,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 64,
  },
  roomRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  roomTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    flexWrap: 'wrap',
  },
  roomNumber: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  roomFloor: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  roomStatusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  roomStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roomStatusText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  roomPriceCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  roomPriceValue: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  customPriceTag: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: c.primary,
  },
  emptyRoomsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    padding: 12,
  },
  seeAllRoomsBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#D4E8E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  seeAllRoomsText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: authSpacing.xl,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  bottomSecondaryBtn: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: authRadius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  bottomSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  bottomPrimaryBtn: {
    flex: 1.25,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: authRadius.lg,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  bottomPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stateCard: {
    margin: authSpacing.xl,
    padding: authSpacing.xxl,
    borderRadius: authRadius.xxl,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    gap: 10,
  },
  stateTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 13,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  stateBtn: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skeletonContainer: {
    padding: authSpacing.xl,
    gap: 14,
  },
  skeleton: {
    backgroundColor: c.border,
    borderRadius: 10,
  },
});
