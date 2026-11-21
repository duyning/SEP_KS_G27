import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { HostPage, ResourceState, h } from '@/components/host/host-ui';
import { Segments } from '@/components/host/management-ui';
import {
  DeleteRoomConfirmModal,
  RoomContractReaderModal,
  RoomDetailMenuSheet,
  RoomStatusUpdateSheet,
} from '@/components/host/room-detail-sheets';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import { AuthInput } from '@/components/auth/auth-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useHost } from '@/context/host-context';
import { useAuth } from '@/context/auth-context';
import { useReducedMotionPreference } from '@/constants/motion';
import { tokenStore } from '@/services/auth';
import { HostError, hostPrice, type HostRoom } from '@/services/host';
import { validateRoomDraft, type RoomDraft } from '@/services/host-edit';
import {
  formatFloorLabel,
  formatMoneyVnd,
  resolveRoomEffectivePrice,
  roomAmenityLabel,
} from '@/services/host-room-types';
import {
  deleteHostRoom,
  fetchRoomContracts,
  formatIsoDateVi,
  resolveRoomDeposit,
  roomConfirmationPresentation,
  roomPriceMechanism,
  roomRentalStatusMeta,
  selectDisplayContract,
  updateHostRoomStatuses,
  type RentalContractView,
} from '@/services/host-rooms';

export default function RoomRoute() {
  const { id, propertyId, mode } = useLocalSearchParams<{
    id?: string;
    propertyId?: string;
    mode?: string;
  }>();
  const { user } = useAuth();

  if (id && mode !== 'edit') {
    return (
      <RoomDetailView
        key={`detail:${user?.userId || 'guest'}:${id}`}
        roomId={/^\d+$/.test(id) ? Number(id) : null}
      />
    );
  }

  return <RoomEditorView id={id} propertyId={propertyId} />;
}

/* -------------------------------------------------------------------------- */
/* 1. Màn Chi tiết phòng (Single Vertical Scroll, Ivory & Brand Teal)         */
/* -------------------------------------------------------------------------- */

function RoomDetailView({ roomId }: { roomId: number | null }) {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();

  const room = useMemo(
    () => (roomId != null ? host.data.rooms?.rooms.find(r => r.roomId === roomId) : undefined),
    [host.data.rooms?.rooms, roomId]
  );

  const linkedRoomType = useMemo(() => {
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

  const canManage = Boolean(
    host.allowed &&
      room &&
      property &&
      ('status' in property
        ? property.status === 'ACTIVE'
        : ['ACTIVE', 'VISIBLE'].includes(property.displayStatus))
  );

  // Contracts state
  const [contracts, setContracts] = useState<RentalContractView[] | null>(null);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [contractReaderOpen, setContractReaderOpen] = useState(false);
  const contractFetchGen = useRef(0);

  // Collapsible amenities
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  // Header menu & delete flow
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteLock = useRef(false);

  // Status update bottom sheet
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const statusLock = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadContracts = useCallback(async () => {
    if (!host.allowed || roomId == null) return;
    const gen = ++contractFetchGen.current;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setContractsLoading(true);
    setContractsError(null);

    try {
      const token = await tokenStore.get();
      if (gen !== contractFetchGen.current) return;
      const list = await fetchRoomContracts(roomId, token || '', controller.signal);
      if (gen !== contractFetchGen.current || controller.signal.aborted) return;
      setContracts(list);
    } catch (err) {
      if (gen !== contractFetchGen.current) return;
      setContractsError(
        controller.signal.aborted
          ? 'Tải hợp đồng quá lâu. Vui lòng thử lại.'
          : err instanceof Error
          ? err.message
          : 'Chưa tải được hợp đồng thuê phòng.'
      );
    } finally {
      clearTimeout(timer);
      if (gen === contractFetchGen.current) {
        setContractsLoading(false);
      }
    }
  }, [host.allowed, roomId]);

  useFocusEffect(
    useCallback(() => {
      void loadContracts();
      return () => {
        contractFetchGen.current++;
      };
    }, [loadContracts])
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/host/rooms');
    }
  };

  const displayContract = useMemo(
    () => selectDisplayContract(contracts),
    [contracts]
  );

  const activeContract = useMemo(
    () => contracts?.find(item => item.status === 'ACTIVE') ?? null,
    [contracts]
  );

  const handleStatusSubmit = async (next: {
    status: 'VACANT' | 'OCCUPIED';
    leaseStartDate: string | null;
    leaseEndDate: string | null;
  }) => {
    if (!room || statusLock.current) return;
    statusLock.current = true;
    setStatusBusy(true);
    setStatusError(null);

    try {
      if (
        next.status === 'OCCUPIED' &&
        activeContract &&
        (!next.leaseStartDate || !next.leaseEndDate)
      ) {
        // Re-confirm legacy occupied room via PUT /host/rooms/{id}
        const body = {
          roomTypeId: room.roomTypeId,
          roomNumber: room.roomNumber,
          floor: room.floor,
          status: 'OCCUPIED',
          customPrice: room.customPrice,
          leaseStartDate: room.leaseStartDate || null,
          leaseEndDate: room.leaseEndDate || null,
        };
        await host.store.mutate(`/host/rooms/${room.roomId}`, body, 'PUT', room);
      } else {
        const payload = {
          propertyId: room.propertyId,
          roomIds: [room.roomId],
          status: next.status,
          leaseStartDate: next.status === 'OCCUPIED' ? next.leaseStartDate : null,
          leaseEndDate: next.status === 'OCCUPIED' ? next.leaseEndDate : null,
        };
        await host.store.mutate(
          '/host/rooms/status',
          payload,
          'PATCH',
          undefined,
          (token, signal) => updateHostRoomStatuses(payload, token, signal)
        );
      }

      if (!mountedRef.current) return;
      await loadContracts();
      if (!mountedRef.current) return;
      setStatusSheetOpen(false);
      setStatusNotice(
        next.status !== room.status
          ? `Đã chuyển phòng ${room.roomNumber} sang "${
              next.status === 'VACANT' ? 'Còn trống' : 'Đang thuê'
            }".`
          : `Đã xác nhận tình trạng phòng ${room.roomNumber}.`
      );
    } catch (err) {
      if (!mountedRef.current) return;
      setStatusError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật tình trạng phòng. Vui lòng thử lại.'
      );
    } finally {
      statusLock.current = false;
      if (mountedRef.current) setStatusBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!room || deleteLock.current) return;
    deleteLock.current = true;
    setDeleteBusy(true);
    setDeleteError(null);

    try {
      await host.store.mutate(
        `/host/rooms/${room.roomId}`,
        undefined,
        'DELETE',
        undefined,
        (token, signal) => deleteHostRoom(room.roomId, token, signal)
      );
      if (!mountedRef.current) return;
      setDeleteConfirmOpen(false);
      handleBack();
    } catch (err) {
      if (!mountedRef.current) return;
      setDeleteError(
        err instanceof Error ? err.message : 'Không thể xóa phòng. Vui lòng thử lại.'
      );
    } finally {
      deleteLock.current = false;
      if (mountedRef.current) setDeleteBusy(false);
    }
  };

  const isInitialLoading = !host.data.rooms && !host.errors.rooms;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* 1. Header gọn: Back | Chi tiết phòng | ⋯ */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại danh sách phòng"
          style={s.iconBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>

        <Text style={s.headerTitle} numberOfLines={1}>
          Chi tiết phòng
        </Text>

        {room && host.allowed ? (
          <AnimatedPressable
            accessibilityLabel={`Tùy chọn cho phòng ${room.roomNumber}`}
            style={s.iconBtn}
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
      ) : isInitialLoading ? (
        <View
          style={s.skeletonWrap}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang tải chi tiết phòng"
        >
          <View style={[s.skeleton, { height: 156, borderRadius: 18 }]} />
          <View style={[s.skeleton, { height: 128, borderRadius: 18 }]} />
          <View style={[s.skeleton, { height: 140, borderRadius: 18 }]} />
          <View style={[s.skeleton, { height: 64, borderRadius: 16 }]} />
        </View>
      ) : host.errors.rooms && !room ? (
        <View style={s.stateCard} accessibilityRole="alert">
          <Feather name="alert-circle" size={26} color={c.error} />
          <Text style={s.stateTitle}>Không thể tải thông tin phòng</Text>
          <Text style={s.stateSub}>{host.errors.rooms}</Text>
          <AnimatedPressable
            style={s.stateBtn}
            onPress={() => {
              void host.store.refresh();
            }}
          >
            <Feather name="refresh-cw" size={14} color="#FFFFFF" />
            <Text style={s.stateBtnText}>Thử lại</Text>
          </AnimatedPressable>
        </View>
      ) : !room ? (
        <View style={s.stateCard}>
          <Feather name="key" size={26} color={c.primary} />
          <Text style={s.stateTitle}>Không tìm thấy phòng</Text>
          <Text style={s.stateSub}>
            Phòng này không tồn tại hoặc đã bị xóa khỏi tài khoản của bạn.
          </Text>
          <AnimatedPressable style={s.stateBtn} onPress={handleBack}>
            <Text style={s.stateBtnText}>Quay lại danh sách</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <RoomDetailBody
          room={room}
          linkedRoomType={linkedRoomType}
          propertyName={property?.name}
          canManage={canManage}
          reducedMotion={reducedMotion}
          refreshing={host.loading}
          onRefresh={() => {
            void Promise.all([host.store.refresh(), loadContracts()]);
          }}
          contracts={contracts}
          contractsLoading={contractsLoading}
          contractsError={contractsError}
          displayContract={displayContract}
          activeContract={activeContract}
          onRetryContracts={() => {
            void loadContracts();
          }}
          onOpenContractReader={() =>
            router.push({
              pathname: '/host/contract',
              params: {
                roomId: String(room.roomId),
                ...(displayContract ? { contractId: String(displayContract.id) } : {}),
              },
            })
          }
          amenitiesOpen={amenitiesOpen}
          onToggleAmenities={() => setAmenitiesOpen(v => !v)}
          statusNotice={statusNotice}
          onDismissNotice={() => setStatusNotice(null)}
          onOpenStatusSheet={() => {
            setStatusError(null);
            setStatusSheetOpen(true);
          }}
          onOpenEdit={() =>
            router.push({
              pathname: '/host/room',
              params: {
                id: String(room.roomId),
                propertyId: String(room.propertyId),
                mode: 'edit',
              },
            })
          }
          menuOpen={menuOpen}
          onCloseMenu={() => setMenuOpen(false)}
          onOpenRoomType={() =>
            router.push({
              pathname: '/host/room-type-detail',
              params: {
                propertyId: String(room.propertyId),
                id: String(room.roomTypeId),
              },
            })
          }
          onRequestDelete={() => {
            setDeleteError(null);
            setDeleteConfirmOpen(true);
          }}
          deleteConfirmOpen={deleteConfirmOpen}
          deleteBusy={deleteBusy}
          deleteError={deleteError}
          onCancelDelete={() => setDeleteConfirmOpen(false)}
          onConfirmDelete={() => {
            void handleConfirmDelete();
          }}
          statusSheetOpen={statusSheetOpen}
          statusBusy={statusBusy}
          statusError={statusError}
          onCloseStatusSheet={() => {
            if (!statusBusy) {
              setStatusSheetOpen(false);
              setStatusError(null);
            }
          }}
          onSubmitStatus={next => {
            void handleStatusSubmit(next);
          }}
          contractReaderOpen={contractReaderOpen}
          onCloseContractReader={() => setContractReaderOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

function RoomDetailBody({
  room,
  linkedRoomType,
  propertyName,
  canManage,
  reducedMotion,
  refreshing,
  onRefresh,
  contracts,
  contractsLoading,
  contractsError,
  displayContract,
  activeContract,
  onRetryContracts,
  onOpenContractReader,
  amenitiesOpen,
  onToggleAmenities,
  statusNotice,
  onDismissNotice,
  onOpenStatusSheet,
  onOpenEdit,
  menuOpen,
  onCloseMenu,
  onOpenRoomType,
  onRequestDelete,
  deleteConfirmOpen,
  deleteBusy,
  deleteError,
  onCancelDelete,
  onConfirmDelete,
  statusSheetOpen,
  statusBusy,
  statusError,
  onCloseStatusSheet,
  onSubmitStatus,
  contractReaderOpen,
  onCloseContractReader,
}: {
  room: HostRoom;
  linkedRoomType?: {
    roomTypeId: number;
    price: number | null;
    areaSqm: number | null;
    capacity: number;
    deposit?: number | null;
    amenities?: string[];
  };
  propertyName?: string;
  canManage: boolean;
  reducedMotion: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  contracts: RentalContractView[] | null;
  contractsLoading: boolean;
  contractsError: string | null;
  displayContract: RentalContractView | null;
  activeContract: RentalContractView | null;
  onRetryContracts: () => void;
  onOpenContractReader: () => void;
  amenitiesOpen: boolean;
  onToggleAmenities: () => void;
  statusNotice: string | null;
  onDismissNotice: () => void;
  onOpenStatusSheet: () => void;
  onOpenEdit: () => void;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onOpenRoomType: () => void;
  onRequestDelete: () => void;
  deleteConfirmOpen: boolean;
  deleteBusy: boolean;
  deleteError: string | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  statusSheetOpen: boolean;
  statusBusy: boolean;
  statusError: string | null;
  onCloseStatusSheet: () => void;
  onSubmitStatus: (next: {
    status: 'VACANT' | 'OCCUPIED';
    leaseStartDate: string | null;
    leaseEndDate: string | null;
  }) => void;
  contractReaderOpen: boolean;
  onCloseContractReader: () => void;
}) {
  const rentalMeta = roomRentalStatusMeta(room.status);
  const effectivePrice = resolveRoomEffectivePrice(room, linkedRoomType?.price);
  const priceMech = roomPriceMechanism(room, linkedRoomType);
  const depositAmount = resolveRoomDeposit(room, linkedRoomType);
  const confirmation = roomConfirmationPresentation(room);

  const areaVal = room.areaSqm ?? linkedRoomType?.areaSqm ?? null;
  const capacityVal = room.capacity ?? linkedRoomType?.capacity ?? null;
  const inheritedAmenities = room.amenities ?? linkedRoomType?.amenities ?? [];
  const isPublic = room.publicVisible === true;

  const badgeTone =
    rentalMeta.tone === 'vacant'
      ? { bg: '#E8F5EE', fg: c.primary, border: '#CBE6D8', dot: c.primary }
      : rentalMeta.tone === 'occupied'
      ? { bg: '#EEF4FA', fg: '#1D5B8C', border: '#CFE0F0', dot: '#1D5B8C' }
      : { bg: '#FEF6E7', fg: '#9A5B0A', border: '#F7DFB3', dot: '#9A5B0A' };

  // Lease dates to display in Hợp đồng thuê phòng section:
  // Use selected contract dates if available; otherwise room's lease dates when OCCUPIED.
  const startDateDisplay =
    displayContract?.startDate || (room.status === 'OCCUPIED' ? room.leaseStartDate : null);
  const endDateDisplay =
    displayContract?.endDate || (room.status === 'OCCUPIED' ? room.leaseEndDate : null);
  const hasAnyLeaseDates = Boolean(startDateDisplay || endDateDisplay);

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
      >
        {statusNotice && (
          <View style={s.successBanner} accessibilityLiveRegion="polite">
            <Feather name="check-circle" size={16} color={c.primary} />
            <Text style={s.successBannerText}>{statusNotice}</Text>
            <AnimatedPressable
              accessibilityLabel="Đóng thông báo"
              style={s.bannerDismiss}
              onPress={onDismissNotice}
            >
              <Feather name="x" size={15} color={c.primaryDark} />
            </AnimatedPressable>
          </View>
        )}

        {/* 2. Tổng quan phòng (Mã phòng, trạng thái, tầng, loại phòng, giá nổi bật nhất, diện tích, sức chứa) */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(220)}
          style={s.overviewCard}
        >
          {propertyName ? (
            <View style={s.eyebrowRow}>
              <Feather name="home" size={12} color={c.textSecondary} />
              <Text style={s.eyebrowText} numberOfLines={1}>
                {propertyName}
              </Text>
            </View>
          ) : null}

          <View style={s.titleRow}>
            <Text style={s.roomTitle}>Phòng {room.roomNumber}</Text>
            <View style={s.pillsRow}>
              <View
                style={[
                  s.statusPill,
                  { backgroundColor: badgeTone.bg, borderColor: badgeTone.border },
                ]}
              >
                <View style={[s.statusDot, { backgroundColor: badgeTone.dot }]} />
                <Text style={[s.statusPillText, { color: badgeTone.fg }]}>
                  {rentalMeta.label}
                </Text>
              </View>

              <View style={[s.visPill, isPublic ? s.visPublic : s.visPrivate]}>
                <Feather
                  name={isPublic ? 'eye' : 'eye-off'}
                  size={11}
                  color={isPublic ? c.primary : c.textSecondary}
                />
                <Text
                  style={[
                    s.visPillText,
                    { color: isPublic ? c.primary : c.textSecondary },
                  ]}
                >
                  {isPublic ? 'Công khai' : 'Riêng tư'}
                </Text>
              </View>
            </View>
          </View>

          {/* Giá đang áp dụng/tháng — Con số nổi bật nhất */}
          <View style={s.priceBlock}>
            <Text style={s.priceCaption}>Giá đang áp dụng</Text>
            <Text style={s.priceHero}>{hostPrice(effectivePrice.amount)}</Text>
          </View>

          <View style={s.cardDivider} />

          {/* Tầng, Loại phòng, Diện tích, Sức chứa (Không lặp lại ở bảng khác) */}
          <View style={s.specsGrid}>
            <View style={s.specCell}>
              <Text style={s.specLabel}>Tầng / Khu vực</Text>
              <Text style={s.specValue}>{formatFloorLabel(room.floor)}</Text>
            </View>
            <View style={s.specCell}>
              <Text style={s.specLabel}>Loại phòng</Text>
              <Text style={s.specValue} numberOfLines={2}>
                {room.roomType || 'Chưa liên kết'}
              </Text>
            </View>
            <View style={s.specCell}>
              <Text style={s.specLabel}>Diện tích</Text>
              <Text style={s.specValue}>
                {areaVal != null ? `${areaVal} m²` : 'Chưa cập nhật'}
              </Text>
            </View>
            <View style={s.specCell}>
              <Text style={s.specLabel}>Sức chứa</Text>
              <Text style={s.specValue}>
                {capacityVal != null ? `Tối đa ${capacityVal} người` : 'Chưa cập nhật'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* 3. Hợp đồng thuê phòng */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(240).delay(40)}
          style={s.sectionCard}
        >
          <View style={s.sectionHeader}>
            <View style={s.sectionIconBox}>
              <Feather name="file-text" size={16} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={s.sectionTitle}>Hợp đồng thuê phòng</Text>
              {displayContract && (
                <Text style={s.sectionSub}>
                  {displayContract.status === 'ACTIVE'
                    ? 'Hợp đồng đang quản lý'
                    : 'Hợp đồng đã kết thúc'}
                  {displayContract.details.tenantName
                    ? ` · ${displayContract.details.tenantName}`
                    : ''}
                </Text>
              )}
            </View>
          </View>

          {contractsLoading && !contracts ? (
            <Text style={s.mutedText}>Đang tải thông tin hợp đồng…</Text>
          ) : contractsError && !contracts ? (
            <View style={s.inlineRetryBox}>
              <Text style={s.errorSmallText}>{contractsError}</Text>
              <AnimatedPressable style={s.retrySmallBtn} onPress={onRetryContracts}>
                <Feather name="refresh-cw" size={13} color={c.primary} />
                <Text style={s.retrySmallText}>Thử lại</Text>
              </AnimatedPressable>
            </View>
          ) : displayContract || hasAnyLeaseDates ? (
            <View style={{ gap: 12 }}>
              <View style={s.datesRow}>
                <View style={s.dateTile}>
                  <Text style={s.specLabel}>Ngày bắt đầu ở</Text>
                  <Text style={s.dateValue}>{formatIsoDateVi(startDateDisplay)}</Text>
                </View>
                <View style={s.dateTile}>
                  <Text style={s.specLabel}>Ngày kết thúc ở</Text>
                  <Text style={s.dateValue}>{formatIsoDateVi(endDateDisplay)}</Text>
                </View>
              </View>

              {displayContract ? (
                <AnimatedPressable
                  scaleTo={0.98}
                  accessibilityLabel="Xem hợp đồng thuê phòng"
                  style={s.viewContractBtn}
                  onPress={onOpenContractReader}
                >
                  <Feather name="file-text" size={15} color={c.primary} />
                  <Text style={s.viewContractBtnText}>
                    Xem hợp đồng
                    {contracts && contracts.length > 1 ? ` (${contracts.length} bản ghi)` : ''}
                  </Text>
                  <Feather name="arrow-right" size={15} color={c.primary} />
                </AnimatedPressable>
              ) : (
                <Text style={s.mutedText}>
                  Phòng chưa có văn bản hợp đồng lưu trên hệ thống cho kỳ thuê này.
                </Text>
              )}
            </View>
          ) : (
            <View style={s.emptyContractBox}>
              <Feather name="inbox" size={18} color={c.textMuted} />
              <Text style={s.mutedText}>
                Phòng chưa có hợp đồng thuê được lưu trên hệ thống.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* 4. Giá & thông tin xác nhận (Không lặp lại giá thuê/tháng, mã phòng, tên tầng) */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(240).delay(80)}
          style={s.sectionCard}
        >
          <View style={s.sectionHeader}>
            <View style={s.sectionIconBox}>
              <Feather name="shield" size={16} color={c.primary} />
            </View>
            <Text style={s.sectionTitle}>Giá & thông tin xác nhận</Text>
          </View>

          <View style={s.kvList}>
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>Tiền đặt cọc</Text>
              <Text
                style={[
                  s.kvValue,
                  depositAmount == null && { color: c.textMuted, fontWeight: '400' },
                ]}
              >
                {formatMoneyVnd(depositAmount)}
              </Text>
            </View>

            <View style={s.kvRow}>
              <Text style={s.kvLabel}>Cơ chế giá thuê</Text>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <View
                  style={[
                    s.mechPill,
                    priceMech.isCustom ? s.mechPillCustom : s.mechPillInherited,
                  ]}
                >
                  <Text
                    style={[
                      s.mechPillText,
                      { color: priceMech.isCustom ? c.primary : c.forestInk },
                    ]}
                  >
                    {priceMech.label}
                  </Text>
                </View>
                {priceMech.isCustom && priceMech.baseTypePrice != null && (
                  <Text style={s.basePriceHint}>
                    Niêm yết loại phòng: {formatMoneyVnd(priceMech.baseTypePrice)}
                  </Text>
                )}
              </View>
            </View>

            <View style={[s.kvRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={s.kvLabel}>Xác nhận gần nhất</Text>
              <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 12, gap: 2 }}>
                <Text
                  style={[
                    s.kvValue,
                    {
                      color:
                        confirmation.state === 'CURRENT' ? c.primary : '#9A5B0A',
                    },
                  ]}
                >
                  {confirmation.label}
                </Text>
                <Text style={s.confirmDetailText}>{confirmation.detail}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* 5. Tiện nghi (Mục thu gọn "Tiện nghi từ loại phòng" có số lượng ở tiêu đề) */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(240).delay(110)}
          style={s.accordionCard}
        >
          <AnimatedPressable
            scaleTo={0.99}
            accessibilityRole="button"
            accessibilityState={{ expanded: amenitiesOpen }}
            accessibilityLabel={`Tiện nghi từ loại phòng, ${inheritedAmenities.length} tiện nghi`}
            style={s.accordionHeader}
            onPress={onToggleAmenities}
          >
            <View style={s.sectionIconBox}>
              <Feather name="check-square" size={15} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.sectionTitle}>
                Tiện nghi từ loại phòng ({inheritedAmenities.length})
              </Text>
              {!amenitiesOpen && (
                <Text style={s.sectionSub}>
                  {inheritedAmenities.length > 0
                    ? 'Chạm để xem toàn bộ tiện nghi'
                    : 'Chưa cập nhật tiện nghi'}
                </Text>
              )}
            </View>
            <Feather
              name={amenitiesOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={c.textSecondary}
            />
          </AnimatedPressable>

          {amenitiesOpen && (
            <View style={s.accordionBody}>
              {inheritedAmenities.length > 0 ? (
                <View style={s.chipsWrap}>
                  {inheritedAmenities.map((key, idx) => (
                    <View key={`${key}:${idx}`} style={s.amenityChip}>
                      <Feather name="check" size={12} color={c.primary} />
                      <Text style={s.amenityChipText}>{roomAmenityLabel(key)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.mutedText}>
                  Loại phòng này chưa được cập nhật danh sách tiện nghi.
                </Text>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* 6. Thanh thao tác dưới (Cập nhật tình trạng là nút phụ, Chỉnh sửa thông tin là nút chính) */}
      {canManage && (
        <View style={s.bottomBar}>
          <AnimatedPressable
            scaleTo={0.98}
            accessibilityLabel="Cập nhật tình trạng phòng"
            style={s.bottomSecondaryBtn}
            onPress={onOpenStatusSheet}
          >
            <Feather name="refresh-cw" size={15} color={c.primary} />
            <Text style={s.bottomSecondaryText}>Cập nhật tình trạng</Text>
          </AnimatedPressable>

          <AnimatedPressable
            scaleTo={0.98}
            accessibilityLabel="Chỉnh sửa thông tin phòng"
            style={s.bottomPrimaryBtn}
            onPress={onOpenEdit}
          >
            <Feather name="edit-2" size={15} color="#FFFFFF" />
            <Text style={s.bottomPrimaryText}>Chỉnh sửa thông tin</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Header Menu (⋯) */}
      <RoomDetailMenuSheet
        visible={menuOpen}
        room={room}
        canManage={canManage}
        onClose={onCloseMenu}
        onOpenRoomType={onOpenRoomType}
        onRequestDelete={onRequestDelete}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteRoomConfirmModal
        visible={deleteConfirmOpen}
        room={room}
        busy={deleteBusy}
        error={deleteError}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />

      {/* Status Update Bottom Sheet */}
      <RoomStatusUpdateSheet
        visible={statusSheetOpen}
        room={room}
        activeContract={activeContract}
        busy={statusBusy}
        error={statusError}
        onClose={onCloseStatusSheet}
        onOpenContract={onOpenContractReader}
        onSubmit={onSubmitStatus}
      />

      {/* Contract Reader Modal */}
      <RoomContractReaderModal
        visible={contractReaderOpen}
        roomNumber={room.roomNumber}
        contracts={contracts || []}
        onClose={onCloseContractReader}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Màn Chỉnh sửa / Thêm phòng (Giữ nguyên nghiệp vụ giá kế thừa/ghi đè)     */
/* -------------------------------------------------------------------------- */

const draft = (r?: HostRoom): RoomDraft => ({
  roomNumber: r?.roomNumber || '',
  floor: r?.floor || '',
  roomTypeId: r ? String(r.roomTypeId) : '',
  status: r?.status || 'VACANT',
  customPrice: r?.customPrice == null ? '' : String(r.customPrice),
});

function RoomEditorView({ id, propertyId }: { id?: string; propertyId?: string }) {
  const host = useHost();
  const { user } = useAuth();
  const room = host.data.rooms?.rooms.find(r => String(r.roomId) === id);

  return (
    <HostPage title={id ? 'Chỉnh sửa phòng' : 'Thêm phòng'}>
      <ResourceState resource="rooms" />
      <ResourceState resource="roomTypes" />
      {id && !room ? (
        <Text style={h.secondary}>
          {host.data.rooms ? 'Không tìm thấy phòng trong tài khoản này.' : 'Đang tải phòng…'}
        </Text>
      ) : (
        <RoomForm
          key={`${user?.userId}:${id || 'new'}:${propertyId}`}
          room={room}
          propertyId={room?.propertyId || Number(propertyId)}
        />
      )}
    </HostPage>
  );
}

function RoomForm({ room, propertyId }: { room?: HostRoom; propertyId: number }) {
  const host = useHost();
  const [form, setForm] = useState(() => draft(room));
  const [baseline, setBaseline] = useState(() => draft(room));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [discard, setDiscard] = useState<(() => void) | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const snapshot = useRef(room);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const property =
    host.data.roomTypes?.properties?.find(p => p.propertyId === propertyId) ||
    host.data.properties?.records.find(p => p.propertyId === propertyId);
  const types = host.data.roomTypes?.roomTypes.filter(t => t.propertyId === propertyId) || [];

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  usePreventRemove((dirty && !saved) || busy, ({ repeat }) => {
    if (!busy) setDiscard(() => repeat);
  });

  useEffect(() => {
    if (saved) {
      if (router.canGoBack()) router.back();
      else router.replace('/host/rooms');
    }
  }, [saved]);

  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const body = {
      roomTypeId: Number(form.roomTypeId),
      roomNumber: form.roomNumber.trim().toUpperCase(),
      floor: form.floor.trim(),
      status: form.status,
      customPrice: form.customPrice.trim() ? Number(form.customPrice) : null,
      ...(form.status === 'OCCUPIED' && room
        ? {
            leaseStartDate: room.leaseStartDate || null,
            leaseEndDate: room.leaseEndDate || null,
          }
        : {}),
    };
    try {
      await host.store.mutate(
        room ? `/host/rooms/${room.roomId}` : '/host/rooms',
        body,
        room ? 'PUT' : 'POST',
        snapshot.current
      );
      if (mounted.current) setSaved(true);
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : 'Chưa thể lưu phòng.');
        if (e instanceof HostError && e.status === 409 && room) {
          const latest = host.store
            .getSnapshot()
            .data.rooms?.rooms.find(r => r.roomId === room.roomId);
          if (latest) {
            snapshot.current = latest;
            setForm(draft(latest));
            setBaseline(draft(latest));
          }
        }
      }
    } finally {
      lock.current = false;
      if (mounted.current) {
        setBusy(false);
        setConfirm(false);
      }
    }
  };

  if (!property) return <Text style={h.secondary}>Chưa tải được nhà trọ trong tài khoản này.</Text>;
  const canEdit =
    property &&
    ('status' in property
      ? property.status === 'ACTIVE'
      : ['ACTIVE', 'VISIBLE'].includes(property.displayStatus));

  return (
    <>
      <View style={h.card}>
        <Text style={h.small}>Nhà trọ đang thao tác</Text>
        <Text style={h.itemTitle}>{property.name}</Text>
      </View>
      <InlineError message={error} />
      <AuthInput
        label="Mã phòng"
        accessibilityLabel="Mã phòng"
        value={form.roomNumber}
        maxLength={30}
        editable={!busy && canEdit}
        error={errors.roomNumber}
        onChangeText={value => setForm(v => ({ ...v, roomNumber: value }))}
      />
      <AuthInput
        label="Tầng / khu vực"
        accessibilityLabel="Tầng / khu vực"
        value={form.floor}
        maxLength={50}
        editable={!busy && canEdit}
        error={errors.floor}
        onChangeText={value => setForm(v => ({ ...v, floor: value }))}
      />
      <View style={{ gap: 8 }}>
        <Text style={h.itemTitle}>Loại phòng</Text>
        {types.map(t => (
          <AnimatedPressable
            key={t.roomTypeId}
            disabled={busy || !canEdit}
            accessibilityRole="radio"
            accessibilityState={{ checked: Number(form.roomTypeId) === t.roomTypeId }}
            aria-checked={Number(form.roomTypeId) === t.roomTypeId}
            accessibilityLabel={t.roomType}
            style={h.action}
            onPress={() => setForm(v => ({ ...v, roomTypeId: String(t.roomTypeId) }))}
          >
            <Text style={h.itemTitle}>
              {Number(form.roomTypeId) === t.roomTypeId ? '✓ ' : ''}
              {t.roomType}
            </Text>
          </AnimatedPressable>
        ))}
        {!types.length && (
          <Text style={h.secondary}>Nhà trọ chưa có loại phòng. Hãy thêm loại phòng trước.</Text>
        )}
        <InlineError message={errors.roomTypeId} />
      </View>
      <AuthInput
        label="Giá riêng (₫/tháng)"
        optionalLabel="Không bắt buộc"
        accessibilityLabel="Giá riêng (₫/tháng)"
        hint="Để trống để dùng giá niêm yết của loại phòng."
        value={form.customPrice}
        keyboardType="number-pad"
        editable={!busy && canEdit}
        error={errors.customPrice}
        onChangeText={value => setForm(v => ({ ...v, customPrice: value }))}
      />
      {!room && (
        <View style={{ gap: 8 }}>
          <Text style={h.itemTitle}>Tình trạng thực tế</Text>
          <Segments
            value={form.status}
            items={[
              ['VACANT', 'Trống'],
              ['OCCUPIED', 'Đã thuê'],
            ]}
            onChange={value => {
              if (!busy && canEdit) setForm(v => ({ ...v, status: value }));
            }}
          />
          <InlineError message={errors.status} />
        </View>
      )}
      {!canEdit && (
        <Text style={h.secondary}>
          Nhà trọ cần đang hoạt động và được phê duyệt để cập nhật phòng.
        </Text>
      )}
      <PrimaryButton
        title="Lưu phòng"
        disabled={busy || host.busy || host.loading || !canEdit || !types.length}
        loading={busy}
        onPress={() => {
          const next = validateRoomDraft(form, types.map(t => t.roomTypeId));
          setErrors(next);
          if (!Object.keys(next).length) setConfirm(true);
        }}
      />
      {confirm && (
        <ConfirmDialog
          title="Lưu thông tin phòng?"
          description={`${property.name} · ${form.roomNumber.trim()} · ${
            form.status === 'VACANT' ? 'Trống' : 'Đã thuê'
          }`}
          confirmLabel="Xác nhận lưu phòng"
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void save();
          }}
        />
      )}
      {discard && (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Thông tin phòng chưa được lưu."
          confirmLabel="Bỏ thay đổi"
          onCancel={() => setDiscard(null)}
          onConfirm={() => {
            const leave = discard;
            setDiscard(null);
            leave();
          }}
        />
      )}
    </>
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
  iconBtn: {
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
  scrollContent: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.md,
    paddingBottom: 28,
    gap: 14,
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
  overviewCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 12,
    shadowColor: c.forestInk,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eyebrowText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: c.textSecondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.4,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  visPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  visPublic: {
    backgroundColor: '#E8F5EE',
  },
  visPrivate: {
    backgroundColor: '#EEF2F0',
  },
  visPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  priceBlock: {
    backgroundColor: '#F4FBF8',
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: '#D4E8E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  priceCaption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priceHero: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specCell: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    gap: 2,
  },
  specLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: c.textSecondary,
  },
  specValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  sectionCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTile: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 11,
    gap: 3,
  },
  dateValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  viewContractBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: '#EFF7F4',
    borderWidth: 1,
    borderColor: '#D4E8E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  viewContractBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  emptyContractBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    padding: 12,
  },
  mutedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  inlineRetryBox: {
    gap: 6,
  },
  errorSmallText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.error,
  },
  retrySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
  },
  retrySmallText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  kvList: {
    gap: 2,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  kvLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    fontWeight: '500',
  },
  kvValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  mechPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: authRadius.round,
  },
  mechPillCustom: {
    backgroundColor: c.primaryLight,
  },
  mechPillInherited: {
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  mechPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  basePriceHint: {
    fontSize: 11,
    lineHeight: 15,
    color: c.textSecondary,
  },
  confirmDetailText: {
    fontSize: 11,
    lineHeight: 16,
    color: c.textSecondary,
    textAlign: 'right',
  },
  accordionCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
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
  accordionBody: {
    paddingHorizontal: authSpacing.lg,
    paddingBottom: authSpacing.lg,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  chipsWrap: {
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
    paddingHorizontal: 10,
    borderRadius: authRadius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bottomSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  bottomPrimaryBtn: {
    flex: 1.2,
    minHeight: 48,
    paddingHorizontal: 12,
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
  skeletonWrap: {
    padding: authSpacing.xl,
    gap: 14,
  },
  skeleton: {
    backgroundColor: c.border,
    borderRadius: 10,
  },
});
