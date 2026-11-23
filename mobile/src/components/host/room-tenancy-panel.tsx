import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import type { HostRoom } from '@/services/host';
import { formatMoneyVnd } from '@/services/host-room-types';
import { formatContractIsoDate } from '@/services/rental-contracts';
import {
  occupantInitials,
  splitTenancyOccupants,
  tenancyContractStatusMeta,
  type RoomOccupant,
  type RoomTenancyProfile,
} from '@/services/room-tenancy';

/* -------------------------------------------------------------------------- */
/* Current Tenancy Tab ("Hồ sơ đợt thuê")                                      */
/* -------------------------------------------------------------------------- */

export function RoomCurrentTenancyPanel({
  room,
  profile,
  loading,
  error,
  canManage,
  onRetry,
  onOpenUtilities,
  onOpenBilling,
  onOpenStartTenancy,
  onOpenAddOccupant,
  onOpenLeaveOccupant,
  onOpenContract,
  onOpenSigning,
  onOpenCreateContract,
  onOpenCloseTenancy,
}: {
  room: HostRoom;
  profile: RoomTenancyProfile | null;
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onRetry: () => void;
  onOpenUtilities: (month?: string) => void;
  onOpenBilling: (month?: string) => void;
  onOpenStartTenancy: () => void;
  onOpenAddOccupant: () => void;
  onOpenLeaveOccupant: (person: RoomOccupant) => void;
  onOpenContract: (contractId: number) => void;
  onOpenSigning: (contractId: number) => void;
  onOpenCreateContract: () => void;
  onOpenCloseTenancy: () => void;
}) {
  const reducedMotion = useReducedMotionPreference();
  const [formerOpen, setFormerOpen] = useState(false);

  if (loading && !profile) {
    return (
      <View style={s.centerCard} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={s.mutedText}>Đang tải hồ sơ đợt thuê…</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={s.centerCard} accessibilityRole="alert">
        <Feather name="alert-circle" size={24} color={c.error} />
        <Text style={s.emptyTitle}>Chưa tải được hồ sơ đợt thuê</Text>
        <Text style={s.emptySub}>{error}</Text>
        <AnimatedPressable style={s.retryBtn} onPress={onRetry}>
          <Feather name="refresh-cw" size={14} color={c.primary} />
          <Text style={s.retryText}>Thử lại</Text>
        </AnimatedPressable>
      </View>
    );
  }

  const current = profile?.current ?? null;

  if (!current) {
    const isOccupied = room.status === 'OCCUPIED';
    return (
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(180)}
        style={s.emptyCard}
      >
        <View style={s.emptyIconCircle}>
          <Feather name="calendar" size={22} color={c.primary} />
        </View>
        <Text style={s.emptyTitle}>
          {isOccupied ? 'Phòng chưa có hồ sơ đợt thuê' : 'Chưa có đợt thuê hiện tại'}
        </Text>
        <Text style={s.emptySub}>
          {isOccupied
            ? 'Bổ sung thông tin người thuê chính hoặc lập hợp đồng thuê phòng để bắt đầu theo dõi kỳ thuê.'
            : 'Tạo hồ sơ đợt thuê hoặc lập hợp đồng thuê phòng khi có người nhận phòng.'}
        </Text>
        {canManage && (
          <View style={s.emptyActions}>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.primaryActionBtn}
              onPress={onOpenCreateContract}
            >
              <Feather name="file-plus" size={15} color="#FFFFFF" />
              <Text style={s.primaryActionText}>Lập hợp đồng thuê phòng</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              style={s.secondaryActionBtn}
              onPress={onOpenStartTenancy}
            >
              <Feather name="user-plus" size={15} color={c.primary} />
              <Text style={s.secondaryActionText}>
                {isOccupied ? 'Bổ sung hồ sơ đợt thuê' : 'Tạo hồ sơ thuê nhanh'}
              </Text>
            </AnimatedPressable>
          </View>
        )}
      </Animated.View>
    );
  }

  const { active, former } = splitTenancyOccupants(current);
  const contractMeta = tenancyContractStatusMeta(current);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(180)}
      style={{ gap: 14 }}
    >
      {/* 1. Summary Card: Kỳ thuê hiện tại */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.iconBox}>
            <Feather name="calendar" size={16} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Kỳ thuê hiện tại</Text>
            <Text style={s.cardSub}>Phòng {room.roomNumber}</Text>
          </View>
          <View style={s.activePill}>
            <View style={s.activeDot} />
            <Text style={s.activePillText}>Đang thuê</Text>
          </View>
        </View>

        <View style={s.factsGrid}>
          <View style={s.factCell}>
            <Text style={s.factLabel}>Ngày bắt đầu</Text>
            <Text style={s.factValue}>
              {formatContractIsoDate(current.startDate) || 'Chưa rõ'}
            </Text>
          </View>
          <View style={s.factCell}>
            <Text style={s.factLabel}>Dự kiến kết thúc</Text>
            <Text style={s.factValue}>
              {formatContractIsoDate(current.endDate) || 'Chưa rõ'}
            </Text>
          </View>
          <View style={s.factCell}>
            <Text style={s.factLabel}>Giá thuê / tháng</Text>
            <Text style={[s.factValue, { color: c.primary }]}>
              {current.monthlyRent != null
                ? `${formatMoneyVnd(current.monthlyRent)}/tháng`
                : 'Chưa cập nhật'}
            </Text>
          </View>
          <View style={s.factCell}>
            <Text style={s.factLabel}>Tiền đặt cọc</Text>
            <Text style={s.factValue}>{formatMoneyVnd(current.deposit)}</Text>
          </View>
        </View>

        <View style={s.quickActionsRow}>
          <AnimatedPressable
            scaleTo={0.98}
            style={s.quickLinkBtn}
            onPress={() => onOpenUtilities()}
          >
            <Feather name="zap" size={14} color={c.primary} />
            <Text style={s.quickLinkText}>Ghi điện nước</Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.98}
            style={s.quickLinkBtn}
            onPress={() => onOpenBilling()}
          >
            <Feather name="credit-card" size={14} color={c.primary} />
            <Text style={s.quickLinkText}>Phiếu thu & Công nợ</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* 2. Compact Card: Người đang ở */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.iconBox}>
            <Feather name="users" size={16} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Người đang ở ({active.length})</Text>
            <Text style={s.cardSub}>Danh sách nhân khẩu thuộc đợt thuê hiện tại</Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {active.map(person => (
            <OccupantRow
              key={person.id ?? `${person.name}-${person.joinedOn}`}
              person={person}
              onLeave={
                canManage && !person.primaryTenant && !person.leftOn && person.id != null
                  ? () => onOpenLeaveOccupant(person)
                  : undefined
              }
            />
          ))}
        </View>

        {former.length > 0 && (
          <View style={s.formerWrap}>
            <AnimatedPressable
              style={s.formerToggle}
              onPress={() => setFormerOpen(v => !v)}
            >
              <Text style={s.formerToggleText}>Đã rời phòng ({former.length})</Text>
              <Feather
                name={formerOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.textSecondary}
              />
            </AnimatedPressable>
            {formerOpen && (
              <View style={{ gap: 8, paddingTop: 6 }}>
                {former.map(person => (
                  <OccupantRow
                    key={person.id ?? `former-${person.name}-${person.joinedOn}`}
                    person={person}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {canManage && (
          <AnimatedPressable
            scaleTo={0.98}
            style={s.addOccupantBtn}
            accessibilityLabel="Thêm người ở cùng"
            onPress={onOpenAddOccupant}
          >
            <Feather name="user-plus" size={15} color={c.primary} />
            <Text style={s.addOccupantBtnText}>Thêm người ở cùng</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* 3. Dedicated Card: Hợp đồng thuê phòng */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.iconBox}>
            <Feather name="file-text" size={16} color={c.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Hợp đồng thuê phòng</Text>
            <Text style={s.cardSub}>
              {current.contractId ? `Mã hợp đồng #HD-${current.contractId}` : 'Chưa phát hành hợp đồng'}
            </Text>
          </View>
          <View
            style={[
              s.contractBadge,
              contractMeta.tone === 'success'
                ? s.badgeSuccess
                : contractMeta.tone === 'warning'
                ? s.badgeWarn
                : s.badgeNeutral,
            ]}
          >
            <Text
              style={[
                s.contractBadgeText,
                contractMeta.tone === 'success'
                  ? { color: c.primaryDark }
                  : contractMeta.tone === 'warning'
                  ? { color: '#9A5B0A' }
                  : { color: c.textSecondary },
              ]}
            >
              {contractMeta.label}
            </Text>
          </View>
        </View>

        {current.contractId ? (
          <>
            <View style={s.sigMiniRow}>
              <View style={s.sigMiniCell}>
                <Feather
                  name={current.landlordSigned ? 'check-circle' : 'clock'}
                  size={14}
                  color={current.landlordSigned ? c.primary : '#9A5B0A'}
                />
                <Text style={s.sigMiniText}>
                  Bên cho thuê:{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {current.landlordSigned ? 'Đã ký' : 'Chưa ký'}
                  </Text>
                </Text>
              </View>
              <View style={s.sigMiniCell}>
                <Feather
                  name={current.tenantSigned ? 'check-circle' : 'clock'}
                  size={14}
                  color={current.tenantSigned ? c.primary : '#9A5B0A'}
                />
                <Text style={s.sigMiniText}>
                  Bên thuê:{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {current.tenantSigned ? 'Đã ký' : 'Chưa ký'}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={s.contractActionsRow}>
              <AnimatedPressable
                scaleTo={0.98}
                style={s.secondaryActionBtnFlex}
                onPress={() => onOpenContract(current.contractId!)}
              >
                <Feather name="eye" size={15} color={c.primary} />
                <Text style={s.secondaryActionText}>Xem hợp đồng</Text>
              </AnimatedPressable>
              {(!current.landlordSigned || !current.tenantSigned) && (
                <AnimatedPressable
                  scaleTo={0.98}
                  style={s.primaryActionBtnFlex}
                  onPress={() => onOpenSigning(current.contractId!)}
                >
                  <Feather name="pen-tool" size={15} color="#FFFFFF" />
                  <Text style={s.primaryActionText}>
                    {!current.landlordSigned ? 'Ký & Theo dõi' : 'Theo dõi ký kết'}
                  </Text>
                </AnimatedPressable>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={s.mutedText}>
              Đợt thuê hiện tại chưa có hợp đồng trên hệ thống. Bạn có thể lập hợp đồng theo quy
              trình 4 bước ngay bây giờ.
            </Text>
            {canManage && (
              <AnimatedPressable
                scaleTo={0.98}
                style={s.primaryActionBtn}
                onPress={onOpenCreateContract}
              >
                <Feather name="file-plus" size={15} color="#FFFFFF" />
                <Text style={s.primaryActionText}>Lập hợp đồng thuê phòng</Text>
              </AnimatedPressable>
            )}
          </>
        )}
      </View>

      {/* 4. Separated Management Zone: Kết thúc đợt thuê (far from contract button!) */}
      {canManage && (
        <View style={s.dangerZoneCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.dangerZoneTitle}>Kết thúc đợt thuê</Text>
            <Text style={s.dangerZoneSub}>
              Đóng kỳ thuê hiện tại, lưu hợp đồng vào lịch sử và đưa phòng về trạng thái Còn trống
              sau khi đối soát công nợ.
            </Text>
          </View>
          <AnimatedPressable
            scaleTo={0.98}
            accessibilityLabel="Kết thúc đợt thuê"
            style={s.endTenancyBtn}
            onPress={onOpenCloseTenancy}
          >
            <Feather name="log-out" size={15} color={c.error} />
            <Text style={s.endTenancyBtnText}>Kết thúc đợt thuê</Text>
          </AnimatedPressable>
        </View>
      )}
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Tenancy History Tab ("Lịch sử đợt thuê")                                    */
/* -------------------------------------------------------------------------- */

export function RoomTenancyHistoryPanel({
  profile,
  loading,
  error,
  handoverMonth,
  onRetry,
  onOpenUtilities,
  onOpenBilling,
  onOpenContract,
}: {
  profile: RoomTenancyProfile | null;
  loading: boolean;
  error: string | null;
  handoverMonth?: string | null;
  onRetry: () => void;
  onOpenUtilities: (month?: string) => void;
  onOpenBilling: (month?: string) => void;
  onOpenContract: (contractId: number) => void;
}) {
  const reducedMotion = useReducedMotionPreference();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (loading && !profile) {
    return (
      <View style={s.centerCard} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={s.mutedText}>Đang tải lịch sử đợt thuê…</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={s.centerCard} accessibilityRole="alert">
        <Feather name="alert-circle" size={24} color={c.error} />
        <Text style={s.emptyTitle}>Chưa tải được lịch sử đợt thuê</Text>
        <Text style={s.emptySub}>{error}</Text>
        <AnimatedPressable style={s.retryBtn} onPress={onRetry}>
          <Feather name="refresh-cw" size={14} color={c.primary} />
          <Text style={s.retryText}>Thử lại</Text>
        </AnimatedPressable>
      </View>
    );
  }

  const history = profile?.history || [];

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(180)}
      style={{ gap: 12 }}
    >
      {handoverMonth ? (
        <View style={s.handoverBanner}>
          <Feather name="zap" size={16} color={c.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.handoverTitle}>Hoàn tất kết thúc đợt thuê</Text>
            <Text style={s.handoverSub}>
              Chốt chỉ số điện nước bàn giao cho tháng {handoverMonth} nếu cần.
            </Text>
          </View>
          <AnimatedPressable
            scaleTo={0.97}
            style={s.handoverBtn}
            onPress={() => onOpenUtilities(handoverMonth)}
          >
            <Text style={s.handoverBtnText}>Chốt điện nước</Text>
          </AnimatedPressable>
        </View>
      ) : null}

      {history.length === 0 ? (
        <View style={s.emptyCard}>
          <View style={s.emptyIconCircle}>
            <Feather name="clock" size={22} color={c.primary} />
          </View>
          <Text style={s.emptyTitle}>Chưa có đợt thuê đã kết thúc</Text>
          <Text style={s.emptySub}>
            Các đợt thuê và hợp đồng đã kết thúc của phòng này sẽ được lưu trữ chỉ xem tại đây.
          </Text>
        </View>
      ) : (
        history.map(lease => {
          const { primary } = splitTenancyOccupants(lease);
          const expanded = expandedKey === lease.key;
          const closedMonth = lease.closedDate?.slice(0, 7);

          return (
            <View key={lease.key} style={s.historyCard}>
              <AnimatedPressable
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                style={s.historyHead}
                onPress={() => setExpandedKey(expanded ? null : lease.key)}
              >
                <View style={s.timelineDot} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.historyTenant} numberOfLines={1}>
                      {primary?.name || 'Người thuê'}
                    </Text>
                    <View style={s.closedPill}>
                      <Text style={s.closedPillText}>Đã kết thúc</Text>
                    </View>
                  </View>
                  <Text style={s.historyDates}>
                    {formatContractIsoDate(lease.startDate) || '—'} →{' '}
                    {formatContractIsoDate(lease.closedDate || lease.endDate) || '—'}
                  </Text>
                </View>
                <Feather
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={c.textSecondary}
                />
              </AnimatedPressable>

              {expanded && (
                <View style={s.historyBody}>
                  <View style={s.factsGrid}>
                    <View style={s.factCell}>
                      <Text style={s.factLabel}>Giá thuê áp dụng</Text>
                      <Text style={s.factValue}>
                        {lease.monthlyRent != null
                          ? `${formatMoneyVnd(lease.monthlyRent)}/tháng`
                          : 'Chưa rõ'}
                      </Text>
                    </View>
                    <View style={s.factCell}>
                      <Text style={s.factLabel}>Tiền đặt cọc</Text>
                      <Text style={s.factValue}>{formatMoneyVnd(lease.deposit)}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={s.subLabel}>
                      Người từng ở ({lease.occupants.length}) · Chỉ xem
                    </Text>
                    {lease.occupants.map(person => (
                      <OccupantRow
                        key={person.id ?? `${lease.key}-${person.name}`}
                        person={person}
                      />
                    ))}
                  </View>

                  <View style={s.historyLinksRow}>
                    {lease.contractId && (
                      <AnimatedPressable
                        scaleTo={0.97}
                        style={s.historyLinkBtn}
                        onPress={() => onOpenContract(lease.contractId!)}
                      >
                        <Feather name="file-text" size={13} color={c.primary} />
                        <Text style={s.historyLinkText}>Xem hợp đồng</Text>
                      </AnimatedPressable>
                    )}
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.historyLinkBtn}
                      onPress={() => onOpenUtilities(closedMonth)}
                    >
                      <Feather name="zap" size={13} color={c.primary} />
                      <Text style={s.historyLinkText}>Điện nước bàn giao</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.historyLinkBtn}
                      onPress={() => onOpenBilling(closedMonth)}
                    >
                      <Feather name="credit-card" size={13} color={c.primary} />
                      <Text style={s.historyLinkText}>Phiếu thu & Công nợ</Text>
                    </AnimatedPressable>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Occupant Compact Row                                                        */
/* -------------------------------------------------------------------------- */

function OccupantRow({
  person,
  onLeave,
}: {
  person: RoomOccupant;
  onLeave?: () => void;
}) {
  return (
    <View style={s.personRow}>
      <View style={[s.avatar, person.primaryTenant && s.avatarPrimary]}>
        <Text style={[s.avatarText, person.primaryTenant && { color: '#FFFFFF' }]}>
          {occupantInitials(person.name)}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <View style={s.personTopRow}>
          <Text style={s.personName} numberOfLines={1}>
            {person.name}
          </Text>
          <View style={[s.roleTag, person.primaryTenant && s.roleTagPrimary]}>
            <Text style={[s.roleTagText, person.primaryTenant && { color: c.primaryDark }]}>
              {person.primaryTenant ? 'Người thuê chính' : 'Người ở cùng'}
            </Text>
          </View>
        </View>

        <View style={s.personMetaRow}>
          {person.phone ? (
            <AnimatedPressable
              onPress={() => {
                void Linking.openURL(`tel:${person.phone!.replace(/[^+\d]/g, '')}`);
              }}
            >
              <Text style={s.phoneLink}>{person.phone}</Text>
            </AnimatedPressable>
          ) : null}
          <Text style={s.personDateText}>
            Vào ở {formatContractIsoDate(person.joinedOn) || '—'}
            {person.leftOn ? ` · Rời ${formatContractIsoDate(person.leftOn)}` : ''}
          </Text>
        </View>
      </View>

      {onLeave && (
        <AnimatedPressable
          scaleTo={0.96}
          accessibilityLabel={`Ghi nhận rời phòng cho ${person.name}`}
          style={s.leaveBtn}
          onPress={onLeave}
        >
          <Text style={s.leaveBtnText}>Rời phòng</Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  centerCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
  },
  emptyActions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryDark,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textSecondary,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: authRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.primary,
  },
  activePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  factCell: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
    gap: 3,
  },
  factLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  factValue: {
    fontSize: 14,
    fontWeight: '800',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickLinkBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryDark,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPrimary: {
    backgroundColor: c.primary,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.primaryDark,
  },
  personTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  personName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  roleTag: {
    backgroundColor: '#EEF2F0',
    borderRadius: authRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleTagPrimary: {
    backgroundColor: c.softMint,
  },
  roleTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  personMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  phoneLink: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  personDateText: {
    fontSize: 11.5,
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  leaveBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  leaveBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  formerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 10,
  },
  formerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  formerToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  addOccupantBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addOccupantBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  contractBadge: {
    borderRadius: authRadius.round,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: '#E8F5EE',
    borderColor: '#CBE6D8',
  },
  badgeWarn: {
    backgroundColor: '#FEF6E7',
    borderColor: '#F5DCB0',
  },
  badgeNeutral: {
    backgroundColor: '#F1F5F3',
    borderColor: '#DCE5E1',
  },
  contractBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sigMiniRow: {
    gap: 8,
    backgroundColor: c.background,
    borderRadius: authRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  sigMiniCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sigMiniText: {
    fontSize: 13,
    color: c.forestInk,
  },
  contractActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  primaryActionBtnFlex: {
    flex: 1,
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  secondaryActionBtnFlex: {
    flex: 1,
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  mutedText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  dangerZoneCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3C7C5',
    padding: 16,
    gap: 12,
    marginTop: 6,
  },
  dangerZoneTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.error,
  },
  dangerZoneSub: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  endTenancyBtn: {
    minHeight: 44,
    borderRadius: authRadius.md,
    backgroundColor: c.errorBackground,
    borderWidth: 1,
    borderColor: '#F5C2C0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  endTenancyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.error,
  },
  handoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#CBE6D8',
    borderRadius: authRadius.lg,
    padding: 12,
  },
  handoverTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryDark,
  },
  handoverSub: {
    fontSize: 12,
    color: c.textSecondary,
  },
  handoverBtn: {
    backgroundColor: c.primary,
    borderRadius: authRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  handoverBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.textMuted,
  },
  historyTenant: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  closedPill: {
    backgroundColor: '#F1F5F3',
    borderRadius: authRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  historyDates: {
    fontSize: 12.5,
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  historyBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    gap: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  historyLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyLinkBtn: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: authRadius.round,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: '#CBE6D8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryDark,
  },
});
