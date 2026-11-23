import { useCallback, useMemo, useState, type ComponentProps } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useHost } from '@/context/host-context';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import { getApiBase } from '@/services/accommodations';
import { vacancyOverview, type HostProperty } from '@/services/host';
import { propertyAddress } from '@/services/host-property';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface StatusMeta {
  label: string;
  icon: FeatherName;
  bg: string;
  fg: string;
  border: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  VISIBLE: {
    label: 'Đang hiển thị',
    icon: 'check-circle',
    bg: '#E8F5EE',
    fg: '#086B62',
    border: '#CBE6D8',
  },
  APPROVED: {
    label: 'Đã duyệt · Chưa hiển thị',
    icon: 'check',
    bg: '#E8F5EE',
    fg: '#086B62',
    border: '#CBE6D8',
  },
  PENDING: {
    label: 'Chờ xét duyệt',
    icon: 'clock',
    bg: '#FEF6E7',
    fg: '#9A5B0A',
    border: '#F7DFB3',
  },
  NEEDS_SUPPLEMENT: {
    label: 'Cần bổ sung',
    icon: 'alert-circle',
    bg: '#FEF6E7',
    fg: '#9A5B0A',
    border: '#F7DFB3',
  },
  REJECTED: {
    label: 'Chưa được duyệt',
    icon: 'x-circle',
    bg: '#FDF2F2',
    fg: '#C93636',
    border: '#F8B4B4',
  },
  INACTIVE: {
    label: 'Tạm ẩn',
    icon: 'eye-off',
    bg: '#F1F5F3',
    fg: '#657570',
    border: '#DCE5E1',
  },
};

function getStatusMeta(record: HostProperty): StatusMeta {
  if (record.reverificationRequired) {
    return {
      label: 'Cần tái xác minh',
      icon: 'alert-triangle',
      bg: '#FEF6E7',
      fg: '#9A5B0A',
      border: '#F7DFB3',
    };
  }
  return (
    STATUS_META[record.displayStatus] || {
      label: record.displayStatus,
      icon: 'info',
      bg: '#F1F5F3',
      fg: '#657570',
      border: '#DCE5E1',
    }
  );
}

const foldSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');

export function MyPropertiesScreen() {
  const host = useHost();
  const reducedMotion = useReducedMotionPreference();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useFocusEffect(
    useCallback(() => {
      void host.store.refresh();
    }, [host.store])
  );

  const totals = vacancyOverview(host.data.dashboard, host.data.rooms?.rooms);
  const records = host.data.properties?.records;
  const error = host.errors.properties;

  const statusChips = useMemo(() => {
    if (!records?.length) return [];
    const counts = new Map<string, number>();
    for (const item of records) {
      counts.set(item.displayStatus, (counts.get(item.displayStatus) || 0) + 1);
    }
    const chips: { key: string; label: string; count: number }[] = [
      { key: 'ALL', label: 'Tất cả', count: records.length },
    ];
    for (const [key, meta] of Object.entries(STATUS_META)) {
      const count = counts.get(key) || 0;
      if (count > 0 || selectedStatus === key) {
        chips.push({ key, label: meta.label, count });
      }
    }
    return chips;
  }, [records, selectedStatus]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    const keyword = foldSearch(searchQuery.trim());
    return records.filter(item => {
      if (selectedStatus !== 'ALL' && item.displayStatus !== selectedStatus) {
        return false;
      }
      if (!keyword) return true;
      const haystack = foldSearch(
        [item.name, item.address, item.addressDetail, item.commune, item.managerName]
          .filter(Boolean)
          .join(' ')
      );
      return haystack.includes(keyword);
    });
  }, [records, searchQuery, selectedStatus]);

  const hasActiveFilter = searchQuery.trim().length > 0 || selectedStatus !== 'ALL';
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
  };

  const occupiedCount = totals ? Math.max(0, totals.total - totals.vacant) : null;

  const listHeader = (
    <View style={s.intro}>
      {/* Portfolio Hero Summary Card */}
      {totals ? (
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(260)}
          style={s.heroCard}
          accessibilityLabel={`${totals.vacant} phòng trống trên tổng số ${totals.total} phòng`}
        >
          <View style={s.heroGlowLarge} />
          <View style={s.heroGlowSmall} />

          <View style={s.heroTopRow}>
            <View style={{ gap: 2 }}>
              <Text style={s.heroEyebrow}>TỔNG QUAN PHÒNG TRỌ</Text>
              <View style={s.heroMainNumberRow}>
                <Text style={s.heroBigNumber}>{totals.vacant}</Text>
                <Text style={s.heroBigUnit}>phòng trống</Text>
              </View>
            </View>
            <View style={s.heroIconBadge}>
              <Feather name="home" size={20} color="#FFFFFF" />
            </View>
          </View>

          <View style={s.heroDivider} />

          <View style={s.heroMetricsRow}>
            <View style={s.heroMetricItem}>
              <Text style={s.heroMetricValue}>{records ? records.length : '—'}</Text>
              <Text style={s.heroMetricLabel}>Nhà trọ</Text>
            </View>
            <View style={s.heroMetricSep} />
            <View style={s.heroMetricItem}>
              <Text style={s.heroMetricValue}>{totals.total}</Text>
              <Text style={s.heroMetricLabel}>Tổng phòng</Text>
            </View>
            <View style={s.heroMetricSep} />
            <View style={s.heroMetricItem}>
              <Text style={s.heroMetricValue}>{occupiedCount ?? '—'}</Text>
              <Text style={s.heroMetricLabel}>Đang thuê</Text>
            </View>
          </View>
        </Animated.View>
      ) : !host.errors.dashboard && !host.errors.rooms ? (
        <View
          style={[s.skeleton, s.summarySkeleton]}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang tải tình trạng phòng"
        />
      ) : (
        <View style={s.noticeCard}>
          <Feather name="alert-circle" size={18} color="#9A5B0A" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.noticeText}>Chưa tải được tổng số phòng.</Text>
            <RetryButton
              onPress={() => {
                void host.store.refresh();
              }}
            />
          </View>
        </View>
      )}

      {(host.errors.dashboard || host.errors.rooms) && totals && (
        <Text style={s.staleHint}>
          Tình trạng phòng đang hiển thị theo lần tải thành công gần nhất.
        </Text>
      )}

      {records && records.some(item => item.propertyId != null) && (
        <View style={s.opsShortcutRow}>
          <AnimatedPressable
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel="Mở màn Ghi điện nước hàng tháng"
            style={s.opsShortcutBtn}
            onPress={() => {
              const firstOwned = records.find(item => item.propertyId != null);
              router.push({
                pathname: '/host/utilities',
                ...(firstOwned?.propertyId
                  ? { params: { propertyId: String(firstOwned.propertyId) } }
                  : {}),
              });
            }}
          >
            <View style={s.utilityShortcutIcon}>
              <Feather name="zap" size={16} color={c.primary} />
            </View>
            <Text style={s.utilityShortcutTitle} numberOfLines={1}>
              Ghi điện nước
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel="Mở màn Phiếu thu và Công nợ"
            style={s.opsShortcutBtn}
            onPress={() => {
              const firstOwned = records.find(item => item.propertyId != null);
              router.push({
                pathname: '/host/billing',
                ...(firstOwned?.propertyId
                  ? { params: { propertyId: String(firstOwned.propertyId) } }
                  : {}),
              });
            }}
          >
            <View style={s.utilityShortcutIcon}>
              <Feather name="file-text" size={16} color={c.primary} />
            </View>
            <Text style={s.utilityShortcutTitle} numberOfLines={1}>
              Phiếu thu & Công nợ
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {error && (
        <View style={s.noticeCard}>
          <Feather name="wifi-off" size={18} color={c.error} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.noticeText}>
              Không thể tải danh sách nhà trọ. {records ? 'Đang giữ dữ liệu đã tải.' : ''}
            </Text>
            <RetryButton
              onPress={() => {
                void host.store.refresh();
              }}
            />
          </View>
        </View>
      )}

      {/* Search & Status Filters */}
      {records && records.length > 0 && (
        <View style={s.filterSection}>
          <View style={s.searchBox}>
            <Feather name="search" size={17} color={c.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm tên nhà trọ, địa chỉ, quản lý..."
              placeholderTextColor={c.placeholder}
              accessibilityLabel="Tìm kiếm nhà trọ"
              returnKeyType="search"
              style={s.searchInput}
            />
            {searchQuery.length > 0 && (
              <AnimatedPressable
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Xóa từ khóa tìm kiếm"
                style={s.clearBtn}
              >
                <Feather name="x" size={15} color={c.textSecondary} />
              </AnimatedPressable>
            )}
          </View>

          {statusChips.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}
            >
              {statusChips.map(chip => {
                const active = selectedStatus === chip.key;
                return (
                  <AnimatedPressable
                    key={chip.key}
                    scaleTo={0.97}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`Lọc ${chip.label}, ${chip.count} nhà trọ`}
                    onPress={() => setSelectedStatus(chip.key)}
                    style={[s.chip, active && s.chipActive]}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {chip.label} ({chip.count})
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          )}

          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>
              {hasActiveFilter
                ? `Kết quả phù hợp (${filteredRecords.length})`
                : `Nhà trọ đang quản lý (${records.length})`}
            </Text>
            {hasActiveFilter && (
              <AnimatedPressable
                onPress={resetFilters}
                accessibilityLabel="Đặt lại bộ lọc"
                style={s.resetLinkBtn}
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
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={s.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title}>Nhà trọ của tôi</Text>
          {records && records.length > 0 && (
            <Text style={s.subtitle}>Quản lý hồ sơ và thông tin cơ sở lưu trú</Text>
          )}
        </View>
        <AnimatedPressable
          scaleTo={0.97}
          accessibilityLabel="Đăng ký nhà trọ mới"
          style={s.registerBtn}
          onPress={() => router.push('/host/property-registration')}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={s.registerBtnText}>Đăng ký</Text>
        </AnimatedPressable>
      </View>

      {host.allowed ? (
        <FlatList
          data={filteredRecords}
          keyExtractor={p => `${p.propertyId}:${p.registrationId}`}
          ListHeaderComponent={listHeader}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshing={host.loading}
          onRefresh={() => {
            void host.store.refresh();
          }}
          renderItem={({ item, index }) => (
            <PropertyItemCard item={item} index={index} reducedMotion={reducedMotion} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            !records && !error ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Đang tải danh sách nhà trọ"
                style={{ gap: 12 }}
              >
                {[0, 1].map(n => (
                  <View key={n} style={s.loadingCard}>
                    <View style={[s.skeleton, { width: 76, height: 76, borderRadius: 14 }]} />
                    <View style={{ flex: 1, gap: 10 }}>
                      <View style={[s.skeleton, { height: 18, width: '75%' }]} />
                      <View style={[s.skeleton, { height: 13, width: '92%' }]} />
                      <View style={[s.skeleton, { height: 22, width: '48%', borderRadius: 99 }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : records && records.length > 0 && filteredRecords.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="search" size={24} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Không tìm thấy nhà trọ phù hợp</Text>
                <Text style={s.emptyDesc}>
                  Thử điều chỉnh từ khóa tìm kiếm hoặc chọn trạng thái khác.
                </Text>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.emptySecondaryBtn}
                  onPress={resetFilters}
                  accessibilityLabel="Đặt lại bộ lọc"
                >
                  <Text style={s.emptySecondaryBtnText}>Đặt lại bộ lọc</Text>
                </AnimatedPressable>
              </View>
            ) : records?.length === 0 && !error ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconCircle}>
                  <Feather name="home" size={26} color={c.primary} />
                </View>
                <Text style={s.emptyTitle}>Bạn chưa có nhà trọ nào</Text>
                <Text style={s.emptyDesc}>
                  Đăng ký nhà trọ để bắt đầu quản lý thông tin, loại phòng và tình trạng phòng trống.
                </Text>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.emptyPrimaryBtn}
                  onPress={() => router.push('/host/property-registration')}
                  accessibilityLabel="Đăng ký nhà trọ ngay"
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={s.emptyPrimaryBtnText}>Đăng ký nhà trọ</Text>
                </AnimatedPressable>
              </View>
            ) : undefined
          }
        />
      ) : (
        <View style={s.emptyCard}>
          <View style={s.emptyIconCircle}>
            <Feather name="lock" size={24} color={c.textSecondary} />
          </View>
          <Text style={s.emptyTitle}>Bạn không có quyền quản lý nhà trọ</Text>
          <Text style={s.emptyDesc}>
            Khu vực này chỉ dành cho tài khoản chủ trọ đã được kích hoạt.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function RetryButton({ onPress }: { onPress(): void }) {
  return (
    <AnimatedPressable accessibilityLabel="Thử lại" style={s.retryBtn} onPress={onPress}>
      <Feather name="refresh-cw" size={13} color={c.primary} />
      <Text style={s.retryBtnText}>Thử lại</Text>
    </AnimatedPressable>
  );
}

function PropertyItemCard({
  item,
  index,
  reducedMotion,
}: {
  item: HostProperty;
  index: number;
  reducedMotion: boolean;
}) {
  const { imageToken } = useHost();
  const [failed, setFailed] = useState<number | null>(null);
  const photo = item.photos?.[0]?.documentId;
  const known =
    Number.isSafeInteger(item.vacantRooms) &&
    Number.isSafeInteger(item.totalRooms) &&
    item.vacantRooms! >= 0 &&
    item.totalRooms! >= item.vacantRooms!;
  const statusMeta = getStatusMeta(item);
  const formattedAddress = propertyAddress(item);

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.duration(240).delay(Math.min(index * 45, 220))
      }
    >
      <AnimatedPressable
        scaleTo={0.985}
        accessibilityLabel={`Xem chi tiết nhà trọ ${item.name}${
          known ? `, ${item.vacantRooms} phòng trống trên ${item.totalRooms} phòng` : ''
        }`}
        style={s.card}
        onPress={() =>
          router.push({
            pathname: '/host/property',
            params: {
              id: item.propertyId != null ? String(item.propertyId) : '',
              registrationId: item.registrationId != null ? String(item.registrationId) : '',
            },
          })
        }
      >
        {/* Top Content: Thumbnail + Identity */}
        <View style={s.cardTop}>
          <View style={s.thumbBox}>
            {photo && imageToken && failed !== photo ? (
              <Image
                source={{
                  uri: `${getApiBase()}/api/host/property/photos/${photo}`,
                  headers: { Authorization: `Bearer ${imageToken}` },
                }}
                style={s.thumbImage}
                contentFit="cover"
                cachePolicy="none"
                onError={() => setFailed(photo)}
              />
            ) : (
              <Feather name="home" size={24} color={c.primary} />
            )}
          </View>

          <View style={s.cardInfo}>
            <View style={s.statusRow}>
              <View
                style={[
                  s.statusPill,
                  { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                ]}
              >
                <Feather name={statusMeta.icon} size={11} color={statusMeta.fg} />
                <Text style={[s.statusPillText, { color: statusMeta.fg }]} numberOfLines={1}>
                  {statusMeta.label}
                </Text>
              </View>
              {item.verified && (
                <View style={s.verifiedChip}>
                  <Feather name="shield" size={11} color={c.primary} />
                </View>
              )}
            </View>

            <Text style={s.cardName} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={s.addressRow}>
              <Feather name="map-pin" size={12} color={c.textSecondary} style={{ marginTop: 2 }} />
              <Text style={s.cardAddress} numberOfLines={2}>
                {formattedAddress}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.cardDivider} />

        {/* Bottom Stats + View Detail Affordance */}
        <View style={s.cardFooter}>
          <View style={s.cardMetrics}>
            {known ? (
              <View style={s.metricChip}>
                <Text style={s.metricHighlight}>{item.vacantRooms}</Text>
                <Text style={s.metricMuted}>/{item.totalRooms} phòng trống</Text>
              </View>
            ) : (
              <View style={s.metricChip}>
                <Text style={s.metricMuted}>
                  {item.propertyId != null ? 'Chưa có phòng' : 'Hồ sơ đăng ký'}
                </Text>
              </View>
            )}

            {item.propertyId != null && Number.isSafeInteger(item.roomTypeCount) && (
              <View style={s.metricDot} />
            )}
            {item.propertyId != null && Number.isSafeInteger(item.roomTypeCount) && (
              <Text style={s.metricMuted}>{item.roomTypeCount} loại phòng</Text>
            )}
          </View>

          <View style={s.detailCta}>
            <Text style={s.detailCtaText}>Xem chi tiết</Text>
            <Feather name="chevron-right" size={15} color={c.primary} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.md,
    paddingBottom: authSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.md,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  registerBtn: {
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
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  registerBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: authSpacing.xl,
    paddingTop: authSpacing.xs,
    paddingBottom: 32,
  },
  intro: {
    gap: 14,
    paddingBottom: 14,
  },
  heroCard: {
    backgroundColor: c.primary,
    borderRadius: authRadius.xxl,
    padding: authSpacing.xl,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: c.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  heroGlowLarge: {
    position: 'absolute',
    right: -28,
    top: -32,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    left: -20,
    bottom: -36,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    fontWeight: '700',
    color: c.softMint,
  },
  heroMainNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  heroBigNumber: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  heroBigUnit: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: c.softMint,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginVertical: 14,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMetricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroMetricValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  heroMetricLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: c.softMint,
    fontWeight: '500',
  },
  heroMetricSep: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: authRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  staleHint: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingVertical: 6,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  filterSection: {
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
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
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipTextActive: {
    color: c.primary,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  resetLinkBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  resetLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primary,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.lg,
    gap: 12,
    shadowColor: c.forestInk,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbBox: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  verifiedChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardAddress: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardMetrics: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricHighlight: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  metricMuted: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
    fontWeight: '500',
  },
  metricDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: c.textMuted,
  },
  detailCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 6,
  },
  detailCtaText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: c.primary,
  },
  skeleton: {
    backgroundColor: c.border,
    borderRadius: 10,
  },
  summarySkeleton: {
    height: 154,
    borderRadius: authRadius.xxl,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: authSpacing.lg,
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: authRadius.xxl,
    borderWidth: 1,
    borderColor: c.border,
    padding: authSpacing.xxl,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    lineHeight: 24,
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
  opsShortcutRow: {
    flexDirection: 'row',
    gap: 10,
  },
  opsShortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: c.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#C5E3DC',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  utilityShortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityShortcutTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
});
