import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { formatHostDate } from '@/services/host';
import {
  CHANGE_FIELD_LABELS,
  propertyChangeStatusMeta,
} from '@/services/property-change';

interface PropertyChangeStatusProps {
  registrationId: number;
  propertyName: string;
  status: string;
  submittedAt?: string | null;
  reasonNote?: string | null;
  requestedFields?: string[];
  fieldNotes?: Record<string, string>;
  reverificationRequired?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEditAgain: () => void;
  onBackToProperty: () => void;
}

const TONE_MAP = {
  pending: {
    icon: 'clock' as const,
    bg: '#E6F4F1',
    fg: '#06665C',
    border: '#CBE5DF',
  },
  warning: {
    icon: 'alert-triangle' as const,
    bg: '#FEF3C7',
    fg: '#92400E',
    border: '#FDE68A',
  },
  approved: {
    icon: 'check-circle' as const,
    bg: '#DCFCE7',
    fg: '#166534',
    border: '#BBF7D0',
  },
  rejected: {
    icon: 'x-circle' as const,
    bg: '#FEE2E2',
    fg: '#991B1B',
    border: '#FECACA',
  },
};

export function PropertyChangeStatusView({
  registrationId,
  propertyName,
  status,
  submittedAt,
  reasonNote,
  requestedFields = [],
  fieldNotes = {},
  reverificationRequired,
  refreshing,
  onRefresh,
  onEditAgain,
  onBackToProperty,
}: PropertyChangeStatusProps) {
  const meta = propertyChangeStatusMeta({ status, reverificationRequired });
  const tone = TONE_MAP[meta.tone];
  const normalized = (status || 'PENDING').toUpperCase();

  const steps = [
    {
      key: 'sent',
      title: 'Đã gửi đề nghị thay đổi',
      sub: 'Hồ sơ thay đổi đã được lưu và chuyển sang hàng đợi thẩm định.',
      done: true,
      active: false,
    },
    {
      key: 'review',
      title: 'Nhân viên NestHub thẩm định',
      sub:
        normalized === 'NEEDS_SUPPLEMENT'
          ? 'Cần bổ sung theo phản hồi bên dưới'
          : normalized === 'REJECTED'
            ? 'Yêu cầu chưa được phê duyệt'
            : normalized === 'APPROVED'
              ? 'Đã hoàn tất kiểm tra nội dung thay đổi'
              : 'Đang kiểm tra các mục thay đổi của nhà trọ',
      done: normalized === 'APPROVED',
      active: normalized === 'PENDING',
    },
    {
      key: 'apply',
      title: 'Áp dụng thông tin mới',
      sub:
        normalized === 'APPROVED'
          ? 'Dữ liệu mới đã được cập nhật cho nhà trọ'
          : 'Chỉ áp dụng sau khi yêu cầu được phê duyệt',
      done: normalized === 'APPROVED',
      active: false,
    },
  ];

  return (
    <View style={s.root}>
      {/* Hero Status Card */}
      <View style={[s.heroCard, { borderColor: tone.border }]}>
        <View style={s.heroHead}>
          <View style={[s.iconCircle, { backgroundColor: tone.bg }]}>
            <Feather name={tone.icon} size={24} color={tone.fg} />
          </View>
          <View style={[s.badge, { backgroundColor: tone.bg }]}>
            <Text style={[s.badgeText, { color: tone.fg }]}>{meta.badge}</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={s.heroTitle}>
          {meta.title}
        </Text>
        <Text style={s.heroDesc}>{meta.description}</Text>

        <View style={s.metaGrid}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Mã yêu cầu</Text>
            <Text style={s.metaValue}>#YC-{registrationId}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Ngày gửi</Text>
            <Text style={s.metaValue}>
              {submittedAt ? formatHostDate(submittedAt) : 'Vừa gửi'}
            </Text>
          </View>
          <View style={s.metaCellFull}>
            <Text style={s.metaLabel}>Nhà trọ liên quan</Text>
            <Text style={s.metaValue}>{propertyName}</Text>
          </View>
        </View>
      </View>

      {/* Staff Feedback if present */}
      {reasonNote || requestedFields.length > 0 ? (
        <View
          style={[
            s.card,
            normalized === 'REJECTED'
              ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
              : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
          ]}
        >
          <View style={s.rowGap}>
            <Feather
              name="message-square"
              size={16}
              color={normalized === 'REJECTED' ? '#991B1B' : '#92400E'}
            />
            <Text
              style={[
                s.cardTitle,
                { color: normalized === 'REJECTED' ? '#991B1B' : '#92400E' },
              ]}
            >
              Phản hồi từ nhân viên thẩm định
            </Text>
          </View>
          {reasonNote ? <Text style={s.feedbackText}>{reasonNote}</Text> : null}
          {requestedFields.length > 0 ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              {requestedFields.map(field => (
                <View key={field} style={s.fieldNoteRow}>
                  <View style={s.bullet} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldNoteName}>
                      {CHANGE_FIELD_LABELS[field] || field}
                    </Text>
                    {fieldNotes[field] ? (
                      <Text style={s.fieldNoteDetail}>{fieldNotes[field]}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Processing Timeline */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Tiến trình xử lý</Text>
        <View style={{ marginTop: 2 }}>
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            return (
              <View key={step.key} style={s.timelineRow}>
                <View style={s.timelineAxis}>
                  <View
                    style={[
                      s.dot,
                      step.done && { backgroundColor: c.primary, borderColor: c.primary },
                      step.active && { backgroundColor: '#E6F4F1', borderColor: c.primary },
                    ]}
                  >
                    <Feather
                      name={step.done ? 'check' : step.active ? 'clock' : 'circle'}
                      size={12}
                      color={step.done ? '#FFFFFF' : step.active ? c.primary : c.textMuted}
                    />
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        s.line,
                        step.done && { backgroundColor: c.primary },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16, gap: 2 }}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepSub}>{step.sub}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Actions */}
      <View style={{ gap: 10 }}>
        {meta.canEdit ? (
          <PrimaryButton
            title={normalized === 'REJECTED' ? 'Chỉnh sửa & gửi lại' : 'Bổ sung hồ sơ ngay'}
            onPress={onEditAgain}
            disabled={refreshing}
          />
        ) : null}

        <AnimatedPressable
          scaleTo={0.985}
          disabled={refreshing}
          style={[s.secondaryBtn, refreshing && { opacity: 0.6 }]}
          onPress={onRefresh}
        >
          <Feather name="refresh-cw" size={15} color={c.primary} />
          <Text style={s.secondaryBtnText}>
            {refreshing ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          scaleTo={0.985}
          style={s.ghostBtn}
          onPress={onBackToProperty}
        >
          <Text style={s.ghostBtnText}>Về chi tiết nhà trọ</Text>
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
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '700',
    color: c.forestInk,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    marginTop: 2,
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
    fontWeight: '600',
    color: c.forestInk,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  feedbackText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#78350F',
  },
  fieldNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
    marginTop: 7,
  },
  fieldNoteName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  fieldNoteDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineAxis: {
    width: 26,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 22,
    backgroundColor: c.border,
    marginVertical: 3,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  stepSub: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
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
