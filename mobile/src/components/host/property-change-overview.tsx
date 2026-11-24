import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import {
  CHANGE_FIELD_LABELS,
  type PropertyChangeSectionId,
  type PropertyChangeSectionStatus,
  type PropertyEditSnapshot,
  type SectionOverviewCard,
} from '@/services/property-change';

interface PropertyChangeOverviewProps {
  snapshot: PropertyEditSnapshot;
  sections: SectionOverviewCard[];
  hasLocalDraft: boolean;
  onSelectSection: (section: PropertyChangeSectionId) => void;
}

function statusPillStyle(status: PropertyChangeSectionStatus) {
  switch (status) {
    case 'changed':
      return { bg: '#E6F4F1', fg: '#06665C', icon: 'edit-2' as const };
    case 'incomplete':
      return { bg: '#FEE2E2', fg: '#991B1B', icon: 'alert-circle' as const };
    case 'needs_supplement':
      return { bg: '#FEF3C7', fg: '#92400E', icon: 'alert-triangle' as const };
    default:
      return { bg: '#F1F5F3', fg: c.textSecondary, icon: 'minus' as const };
  }
}

export function PropertyChangeOverview({
  snapshot,
  sections,
  hasLocalDraft,
  onSelectSection,
}: PropertyChangeOverviewProps) {
  const reducedMotion = useReducedMotionPreference();
  const changedCount = sections.filter(item => item.status === 'changed').length;
  const unchangedCount = sections.filter(item => item.status === 'unchanged').length;
  const supplementOrErrorCount = sections.filter(
    item => item.status === 'needs_supplement' || item.status === 'incomplete'
  ).length;

  const isSupplementMode = snapshot.status === 'NEEDS_SUPPLEMENT';
  const isRejectedMode = snapshot.status === 'REJECTED';
  const showStaffFeedback = Boolean(
    (isSupplementMode || isRejectedMode) &&
      (snapshot.reasonNote || snapshot.requestedFields.length > 0)
  );

  return (
    <View style={s.root}>
      {/* Compact Status Summary Card */}
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(220)}
        style={[
          s.statusCard,
          isSupplementMode && s.statusCardWarn,
          isRejectedMode && s.statusCardErr,
        ]}
      >
        <View style={s.statusTopRow}>
          <View style={s.rowGap}>
            <Feather
              name={
                isRejectedMode
                  ? 'x-circle'
                  : isSupplementMode
                    ? 'alert-triangle'
                    : 'file-text'
              }
              size={16}
              color={
                isRejectedMode ? '#B91C1C' : isSupplementMode ? '#B45309' : c.primary
              }
            />
            <Text style={s.statusTitle}>Yêu cầu thay đổi thông tin</Text>
          </View>
          <View
            style={[
              s.modeBadge,
              isSupplementMode && { backgroundColor: '#FEF3C7' },
              isRejectedMode && { backgroundColor: '#FEE2E2' },
            ]}
          >
            <Text
              style={[
                s.modeBadgeText,
                isSupplementMode && { color: '#92400E' },
                isRejectedMode && { color: '#991B1B' },
              ]}
            >
              {isSupplementMode
                ? 'Cần bổ sung'
                : isRejectedMode
                  ? 'Cần cập nhật lại'
                  : hasLocalDraft
                    ? 'Bản nháp đã lưu'
                    : 'Bản nháp'}
            </Text>
          </View>
        </View>

        <Text style={s.statusDesc}>
          {showStaffFeedback && snapshot.reasonNote
            ? snapshot.reasonNote
            : 'Thông tin nhà trọ đang hiển thị sẽ không thay đổi cho đến khi yêu cầu được duyệt.'}
        </Text>

        {isSupplementMode && snapshot.requestedFields.length > 0 ? (
          <Text style={s.requestedLine}>
            Mục Staff yêu cầu:{' '}
            {snapshot.requestedFields
              .map(field => CHANGE_FIELD_LABELS[field] || field)
              .join(' · ')}
          </Text>
        ) : null}
      </Animated.View>

      {/* Change Summary Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statNumber, changedCount > 0 && { color: c.primary }]}>
            {changedCount}
          </Text>
          <Text style={s.statLabel}>Có thay đổi</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={s.statNumber}>{unchangedCount}</Text>
          <Text style={s.statLabel}>Giữ nguyên</Text>
        </View>
        {supplementOrErrorCount > 0 ? (
          <>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={[s.statNumber, { color: '#B45309' }]}>
                {supplementOrErrorCount}
              </Text>
              <Text style={s.statLabel}>Cần kiểm tra</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* 5 Compact Editable Section Cards */}
      <View style={s.sectionList}>
        <Text style={s.listHeading}>Chọn mục cần chỉnh sửa</Text>

        {sections.map((section, idx) => {
          const pill = statusPillStyle(section.status);
          return (
            <Animated.View
              key={section.id}
              entering={reducedMotion ? undefined : FadeInDown.duration(220).delay(idx * 35)}
            >
              <AnimatedPressable
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel={`${section.title}, trạng thái ${section.statusLabel}`}
                style={[
                  s.sectionCard,
                  section.status === 'changed' && s.sectionCardChanged,
                  section.status === 'incomplete' && s.sectionCardError,
                  section.status === 'needs_supplement' && s.sectionCardWarn,
                  !section.editable && s.sectionCardLocked,
                ]}
                onPress={() => onSelectSection(section.id)}
              >
                <View style={s.sectionIconBox}>
                  <Feather
                    name={section.icon}
                    size={18}
                    color={section.editable ? c.primary : c.textMuted}
                  />
                </View>

                <View style={s.sectionBody}>
                  <View style={s.sectionTitleRow}>
                    <Text style={s.sectionTitle} numberOfLines={1}>
                      {section.title}
                    </Text>
                    {!section.editable ? (
                      <Feather name="lock" size={13} color={c.textMuted} />
                    ) : null}
                  </View>

                  <Text style={s.sectionSummary} numberOfLines={1}>
                    {section.summary}
                  </Text>

                  {section.supplementNote ? (
                    <Text style={s.supplementHint} numberOfLines={2}>
                      Ghi chú Staff: {section.supplementNote}
                    </Text>
                  ) : null}

                  <View style={s.pillRow}>
                    <View style={[s.pill, { backgroundColor: pill.bg }]}>
                      <Feather name={pill.icon} size={11} color={pill.fg} />
                      <Text style={[s.pillText, { color: pill.fg }]}>
                        {section.status === 'changed' && section.changeCount > 0
                          ? `${section.statusLabel} (${section.changeCount})`
                          : section.statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                <Feather name="chevron-right" size={19} color={c.textMuted} />
              </AnimatedPressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 14,
  },
  statusCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  statusCardWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusCardErr: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  modeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  modeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.primary,
  },
  statusDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
  },
  requestedLine: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: '#92400E',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 19,
    fontWeight: '700',
    color: c.forestInk,
  },
  statLabel: {
    fontSize: 12,
    color: c.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: c.border,
  },
  sectionList: {
    gap: 10,
  },
  listHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
    letterSpacing: 0.3,
    paddingHorizontal: 2,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionCardChanged: {
    borderColor: '#99D5C9',
    backgroundColor: '#FAFDFC',
  },
  sectionCardWarn: {
    borderColor: '#FCD34D',
  },
  sectionCardError: {
    borderColor: '#FCA5A5',
  },
  sectionCardLocked: {
    opacity: 0.72,
  },
  sectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
    flexShrink: 1,
  },
  sectionSummary: {
    fontSize: 13,
    color: c.textSecondary,
  },
  supplementHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#92400E',
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
