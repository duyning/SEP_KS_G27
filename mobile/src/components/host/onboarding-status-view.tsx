import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  fieldLabelVi,
  formatOnboardingDate,
  onboardingStatusMeta,
  type HostApplicationView,
  type OnboardingRegistrationView,
  type TimelineStepState,
} from '@/services/host-onboarding';

interface OnboardingStatusViewProps {
  registration: OnboardingRegistrationView;
  account: HostApplicationView | null;
  userRole?: string;
  refreshing: boolean;
  onRefresh: () => void;
  onSupplement: () => void;
  onOpenHostPortal: () => void;
  onGoHome: () => void;
}

const TONE_STYLE = {
  pending: {
    icon: 'clock' as const,
    iconBg: '#E6F4F1',
    iconColor: '#087F72',
    badgeBg: '#E6F4F1',
    badgeText: '#06665C',
    border: '#CBE5DF',
  },
  warning: {
    icon: 'alert-triangle' as const,
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    border: '#FDE68A',
  },
  approved: {
    icon: 'check-circle' as const,
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
    border: '#BBF7D0',
  },
  rejected: {
    icon: 'x-circle' as const,
    iconBg: '#FEE2E2',
    iconColor: '#B91C1C',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
    border: '#FECACA',
  },
};

function stepNodeColor(state: TimelineStepState) {
  switch (state) {
    case 'done':
      return { bg: c.primary, border: c.primary, icon: 'check' as const, iconColor: '#FFFFFF' };
    case 'active':
      return { bg: '#E6F4F1', border: c.primary, icon: 'clock' as const, iconColor: c.primary };
    case 'warning':
      return { bg: '#FEF3C7', border: '#D97706', icon: 'alert-circle' as const, iconColor: '#B45309' };
    case 'error':
      return { bg: '#FEE2E2', border: '#DC2626', icon: 'x' as const, iconColor: '#B91C1C' };
    default:
      return { bg: c.background, border: c.border, icon: 'circle' as const, iconColor: c.textMuted };
  }
}

export function OnboardingStatusView({
  registration,
  account,
  userRole,
  refreshing,
  onRefresh,
  onSupplement,
  onOpenHostPortal,
  onGoHome,
}: OnboardingStatusViewProps) {
  const meta = onboardingStatusMeta(registration, userRole);
  const tone = TONE_STYLE[meta.tone];
  const submittedLabel = formatOnboardingDate(registration.submittedAt || registration.createdAt);
  const requestedFields = registration.requestedFields || [];
  const fieldNotes = registration.fieldNotes || {};
  const reviewNote = registration.reasonNote?.trim() || account?.reviewNote?.trim() || '';
  const hasFeedback = Boolean(reviewNote || requestedFields.length || Object.keys(fieldNotes).length);

  return (
    <View style={s.root}>
      {/* Hero Status Card */}
      <View style={[s.heroCard, { borderColor: tone.border }]}>
        <View style={s.heroTopRow}>
          <View style={[s.heroIconWrap, { backgroundColor: tone.iconBg }]}>
            <Feather name={tone.icon} size={26} color={tone.iconColor} />
          </View>
          <View style={[s.statusBadge, { backgroundColor: tone.badgeBg }]}>
            <Text style={[s.statusBadgeText, { color: tone.badgeText }]}>{meta.badge}</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={s.heroTitle}>
          {meta.title}
        </Text>
        <Text style={s.heroDesc}>{meta.description}</Text>

        <View style={s.metaGrid}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Mã hồ sơ</Text>
            <Text style={s.metaValue}>{meta.dossierCode}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Ngày gửi</Text>
            <Text style={s.metaValue}>{submittedLabel}</Text>
          </View>
          <View style={s.metaCellFull}>
            <Text style={s.metaLabel}>Nhà trọ đăng ký kèm hồ sơ</Text>
            <Text style={s.metaValue} numberOfLines={2}>
              {registration.propertyName || 'Nhà trọ đầu tiên'}
              {registration.commune ? ` · ${registration.commune}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Dual Status Separation Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Trạng thái kích hoạt riêng biệt</Text>
        <View style={s.dualRow}>
          <View style={s.dualIcon}>
            <Feather name="user-check" size={16} color={c.primary} />
          </View>
          <View style={s.dualBody}>
            <Text style={s.dualLabel}>Vai trò chủ nhà trọ</Text>
            <Text style={s.dualValue}>{meta.roleStatusLabel}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.dualRow}>
          <View style={s.dualIcon}>
            <Feather name="home" size={16} color={c.primary} />
          </View>
          <View style={s.dualBody}>
            <Text style={s.dualLabel}>Xác minh nhà trọ đầu tiên</Text>
            <Text style={s.dualValue}>{meta.propertyStatusLabel}</Text>
          </View>
        </View>
      </View>

      {/* Staff Feedback Card when NEEDS_SUPPLEMENT or REJECTED */}
      {hasFeedback ? (
        <View style={[s.card, s.feedbackCard]}>
          <View style={s.feedbackHead}>
            <Feather name="message-square" size={16} color="#92400E" />
            <Text style={s.feedbackTitle}>Phản hồi từ nhân viên thẩm định</Text>
          </View>
          {reviewNote ? <Text style={s.feedbackNote}>{reviewNote}</Text> : null}

          {requestedFields.length > 0 ? (
            <View style={s.fieldList}>
              <Text style={s.fieldListLabel}>Các mục cần kiểm tra / bổ sung:</Text>
              {requestedFields.map(field => (
                <View key={field} style={s.fieldItem}>
                  <View style={s.fieldBullet} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.fieldName}>{fieldLabelVi(field)}</Text>
                    {fieldNotes[field] ? (
                      <Text style={s.fieldSpecificNote}>{fieldNotes[field]}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 4-Step Progress Tracker */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Tiến trình thẩm định hồ sơ</Text>
        <View style={s.timeline}>
          {meta.timeline.map((step, index) => {
            const node = stepNodeColor(step.state);
            const isLast = index === meta.timeline.length - 1;
            return (
              <View key={step.key} style={s.timelineRow}>
                <View style={s.timelineAxis}>
                  <View
                    style={[
                      s.timelineNode,
                      { backgroundColor: node.bg, borderColor: node.border },
                    ]}
                  >
                    <Feather name={node.icon} size={13} color={node.iconColor} />
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        s.timelineLine,
                        step.state === 'done' && { backgroundColor: c.primary },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={[s.timelineContent, !isLast && { paddingBottom: 18 }]}>
                  <Text style={s.timelineTitle}>{step.title}</Text>
                  <Text style={s.timelineSubtitle}>{step.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        {meta.canSupplement ? (
          <PrimaryButton
            title="Bổ sung & gửi lại hồ sơ"
            onPress={onSupplement}
            disabled={refreshing}
          />
        ) : null}

        {meta.canOpenHostPortal ? (
          <PrimaryButton title="Vào quản lý nhà trọ" onPress={onOpenHostPortal} />
        ) : null}

        <AnimatedPressable
          scaleTo={0.98}
          disabled={refreshing}
          accessibilityLabel="Cập nhật trạng thái hồ sơ"
          style={[s.secondaryBtn, refreshing && { opacity: 0.65 }]}
          onPress={onRefresh}
        >
          <Feather name="refresh-cw" size={16} color={c.primary} />
          <Text style={s.secondaryBtnText}>
            {refreshing ? 'Đang kiểm tra trạng thái...' : 'Cập nhật trạng thái'}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          scaleTo={0.98}
          accessibilityLabel="Về trang chủ"
          style={s.ghostBtn}
          onPress={onGoHome}
        >
          <Text style={s.ghostBtnText}>Về trang chủ</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    color: c.forestInk,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  metaCell: {
    width: '47%',
    gap: 2,
  },
  metaCellFull: {
    width: '100%',
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    color: c.textMuted,
  },
  metaValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: c.forestInk,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  dualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dualIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualBody: {
    flex: 1,
    gap: 2,
  },
  dualLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  dualValue: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  feedbackCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  feedbackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  feedbackNote: {
    fontSize: 14,
    lineHeight: 21,
    color: '#78350F',
  },
  fieldList: {
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  fieldListLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  fieldBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginTop: 7,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
  fieldSpecificNote: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
  },
  timeline: {
    marginTop: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineAxis: {
    alignItems: 'center',
    width: 26,
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: c.border,
    marginVertical: 3,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  timelineSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: authRadius.md,
    borderWidth: 1.5,
    borderColor: c.primary,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.primary,
  },
  ghostBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
  },
});
