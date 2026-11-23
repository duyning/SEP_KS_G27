import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { roleLabels } from '@/components/profile/profile-ui';
import type { AuthUser } from '@/services/auth';
import {
  INTRODUCTION_MAX_LENGTH,
  type HostApplicationView,
  type OnboardingAccountDraft,
  type OnboardingIdentityAsset,
  type OnboardingIdentitySide,
  type OnboardingStage1Errors,
} from '@/services/host-onboarding';
import { identityPreviewSource } from '@/services/host-onboarding-upload';

interface OnboardingStage1FormProps {
  user: AuthUser;
  token: string;
  account: HostApplicationView | null;
  draft: OnboardingAccountDraft;
  front: OnboardingIdentityAsset | null;
  back: OnboardingIdentityAsset | null;
  pickingSide: OnboardingIdentitySide | null;
  errors: OnboardingStage1Errors;
  onUpdateDraft: (patch: Partial<OnboardingAccountDraft>) => void;
  onOpenPhoneVerify: () => void;
  onPickIdentity: (side: OnboardingIdentitySide, source: 'camera' | 'library') => void;
  onRemoveIdentity: (side: OnboardingIdentitySide) => void;
}

export function OnboardingStage1Form({
  user,
  token,
  account,
  draft,
  front,
  back,
  pickingSide,
  errors,
  onUpdateDraft,
  onOpenPhoneVerify,
  onPickIdentity,
  onRemoveIdentity,
}: OnboardingStage1FormProps) {
  const isPhoneVerified = Boolean(user.phoneVerifiedAt);
  const canPreviewServerFront = Boolean(!front && account?.hasIdentityImage && account?.applicationId && token);
  const canPreviewServerBack = Boolean(!back && account?.hasIdentityBackImage && account?.applicationId && token);

  const renderIdentitySlot = (
    side: OnboardingIdentitySide,
    title: string,
    localAsset: OnboardingIdentityAsset | null,
    hasServerImage: boolean,
    canPreviewServer: boolean,
    errorText?: string
  ) => {
    const isBusy = pickingSide === side;
    const hasImage = Boolean(localAsset || hasServerImage);

    return (
      <View style={[s.idSlot, Boolean(errorText) && s.idSlotError]}>
        <View style={s.idSlotHead}>
          <View style={s.rowGap}>
            <Feather name="credit-card" size={16} color={c.primary} />
            <Text style={s.idSlotTitle}>{title}</Text>
          </View>
          {hasImage ? (
            <View style={s.readyPill}>
              <Feather name="check" size={11} color="#065F46" />
              <Text style={s.readyPillText}>
                {localAsset ? 'Ảnh mới' : 'Đã có trên hệ thống'}
              </Text>
            </View>
          ) : (
            <Text style={s.requiredTag}>Bắt buộc</Text>
          )}
        </View>

        {isBusy ? (
          <View style={s.idPreviewEmpty}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={s.idPlaceholderText}>Đang kiểm tra định dạng & dung lượng ảnh...</Text>
          </View>
        ) : localAsset ? (
          <View style={s.idPreviewWrap}>
            <Image source={{ uri: localAsset.uri }} style={s.idPreviewImg} contentFit="cover" />
            <AnimatedPressable
              accessibilityLabel={`Xóa ảnh ${title}`}
              style={s.removeImgBtn}
              onPress={() => onRemoveIdentity(side)}
            >
              <Feather name="trash-2" size={14} color="#FFFFFF" />
              <Text style={s.removeImgText}>Xóa</Text>
            </AnimatedPressable>
          </View>
        ) : canPreviewServer && account ? (
          <View style={s.idPreviewWrap}>
            <Image
              source={identityPreviewSource(account.applicationId, side, token)}
              style={s.idPreviewImg}
              contentFit="cover"
            />
            <View style={s.serverBadge}>
              <Feather name="lock" size={11} color="#FFFFFF" />
              <Text style={s.serverBadgeText}>Đã lưu bảo mật</Text>
            </View>
          </View>
        ) : (
          <View style={s.idPreviewEmpty}>
            <Feather name="camera" size={24} color={c.textMuted} />
            <Text style={s.idPlaceholderText}>
              Chụp rõ 4 góc, không bị chói sáng (JPG/PNG ≤ 5 MB)
            </Text>
          </View>
        )}

        <View style={s.idActionRow}>
          <AnimatedPressable
            scaleTo={0.98}
            disabled={Boolean(pickingSide)}
            accessibilityLabel={`Chụp ảnh ${title}`}
            style={s.idActionBtn}
            onPress={() => onPickIdentity(side, 'camera')}
          >
            <Feather name="camera" size={15} color={c.primary} />
            <Text style={s.idActionText}>{hasImage ? 'Chụp lại' : 'Chụp ảnh'}</Text>
          </AnimatedPressable>

          <AnimatedPressable
            scaleTo={0.98}
            disabled={Boolean(pickingSide)}
            accessibilityLabel={`Chọn từ thư viện ${title}`}
            style={s.idActionBtn}
            onPress={() => onPickIdentity(side, 'library')}
          >
            <Feather name="image" size={15} color={c.primary} />
            <Text style={s.idActionText}>{hasImage ? 'Đổi ảnh' : 'Thư viện'}</Text>
          </AnimatedPressable>
        </View>

        {errorText ? <InlineError message={errorText} /> : null}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <View style={s.introHeader}>
        <Text style={s.stepEyebrow}>GIAI ĐOẠN 1/3 · XÁC MINH TÀI KHOẢN</Text>
        <Text accessibilityRole="header" style={s.stepTitle}>
          Tài khoản & Căn cước công dân
        </Text>
        <Text style={s.stepSubtitle}>
          Xác nhận thông tin chủ tài khoản, số điện thoại OTP và ảnh CCCD 2 mặt. Đây là bước đầu
          tiên trong cùng một hồ sơ đối tác.
        </Text>
      </View>

      {/* Account Info Card */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <Text style={s.cardTitle}>Thông tin tài khoản hiện tại</Text>
          <AnimatedPressable
            scaleTo={0.97}
            accessibilityLabel="Cập nhật hồ sơ cá nhân"
            onPress={() => router.push('/account/edit')}
          >
            <Text style={s.editLink}>Sửa hồ sơ</Text>
          </AnimatedPressable>
        </View>

        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Họ và tên</Text>
          <Text style={s.infoValue}>{user.fullName || 'Chưa cập nhật'}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Email</Text>
          <Text style={s.infoValue} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <View style={s.divider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Vai trò hiện tại</Text>
          <Text style={s.infoValue}>{roleLabels[user.role] || user.role}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.phoneRow}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.infoLabel}>Số điện thoại liên hệ</Text>
            <Text style={s.infoValue}>{user.phoneNumber || 'Chưa có số điện thoại'}</Text>
          </View>
          <View
            style={[
              s.verifyPill,
              isPhoneVerified ? s.verifyPillOk : s.verifyPillWarn,
            ]}
          >
            <Feather
              name={isPhoneVerified ? 'check-circle' : 'alert-circle'}
              size={12}
              color={isPhoneVerified ? '#065F46' : '#92400E'}
            />
            <Text
              style={[
                s.verifyPillText,
                { color: isPhoneVerified ? '#065F46' : '#92400E' },
              ]}
            >
              {isPhoneVerified ? 'Đã xác minh OTP' : 'Chưa xác minh'}
            </Text>
          </View>
        </View>

        {!isPhoneVerified ? (
          <AnimatedPressable
            scaleTo={0.98}
            accessibilityLabel="Xác minh số điện thoại qua OTP"
            style={s.verifyBtn}
            onPress={onOpenPhoneVerify}
          >
            <Feather name="smartphone" size={16} color="#FFFFFF" />
            <Text style={s.verifyBtnText}>Xác minh số điện thoại ngay</Text>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            scaleTo={0.98}
            accessibilityLabel="Đổi và xác minh lại số điện thoại"
            style={s.reverifyLink}
            onPress={onOpenPhoneVerify}
          >
            <Feather name="refresh-cw" size={13} color={c.primary} />
            <Text style={s.reverifyText}>Đổi / xác minh số khác</Text>
          </AnimatedPressable>
        )}

        <InlineError message={errors.fullName || errors.phoneNumber || errors.phoneVerified} />
      </View>

      {/* CCCD Front & Back Upload */}
      <View style={s.card}>
        <View style={{ gap: 2 }}>
          <Text style={s.cardTitle}>Ảnh CCCD / Căn cước 2 mặt</Text>
          <Text style={s.cardHint}>
            Tải ảnh hai mặt để thẩm định hồ sơ chủ trọ. Dùng JPG hoặc PNG, tối đa 5 MB mỗi ảnh.
          </Text>
        </View>

        {renderIdentitySlot(
          'front',
          'CCCD Mặt trước',
          front,
          Boolean(account?.hasIdentityImage),
          canPreviewServerFront,
          errors.identityFront
        )}

        {renderIdentitySlot(
          'back',
          'CCCD Mặt sau',
          back,
          Boolean(account?.hasIdentityBackImage),
          canPreviewServerBack,
          errors.identityBack
        )}
      </View>

      {/* Reviewer Note & Partner Agreement */}
      <View style={s.card}>
        <View style={s.noteHead}>
          <Text style={s.cardTitle}>Ghi chú cho nhân viên xét duyệt</Text>
          <Text style={s.charCount}>
            {draft.introduction.length}/{INTRODUCTION_MAX_LENGTH}
          </Text>
        </View>
        <TextInput
          style={s.textArea}
          multiline
          textAlignVertical="top"
          placeholder="Tùy chọn: Giới thiệu ngắn về nhà trọ, thời gian thuận tiện liên hệ thẩm định..."
          placeholderTextColor={c.textMuted}
          value={draft.introduction}
          onChangeText={value => onUpdateDraft({ introduction: value })}
          maxLength={INTRODUCTION_MAX_LENGTH}
        />
        <InlineError message={errors.introduction} />

        <View style={s.divider} />

        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.agreementAccepted }}
          accessibilityLabel="Đồng ý điều khoản đối tác NestHub"
          style={s.checkboxRow}
          onPress={() => onUpdateDraft({ agreementAccepted: !draft.agreementAccepted })}
        >
          <Feather
            name={draft.agreementAccepted ? 'check-square' : 'square'}
            size={20}
            color={draft.agreementAccepted ? c.primary : c.textMuted}
          />
          <Text style={s.checkboxLabel}>
            Tôi cam kết thông tin cung cấp là trung thực và đồng ý tuân thủ quy định dành cho đối
            tác chủ nhà trọ trên NestHub.
          </Text>
        </AnimatedPressable>
        <InlineError message={errors.agreementAccepted} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 14,
  },
  introHeader: {
    gap: 4,
    paddingHorizontal: 2,
  },
  stepEyebrow: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: c.primary,
  },
  stepTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '700',
    color: c.forestInk,
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  editLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
    flexShrink: 1,
    textAlign: 'right',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  verifyPillOk: {
    backgroundColor: '#DCFCE7',
  },
  verifyPillWarn: {
    backgroundColor: '#FEF3C7',
  },
  verifyPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  verifyBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reverifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 2,
  },
  reverifyText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primary,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    color: c.forestInk,
  },
  idSlot: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 12,
    gap: 10,
  },
  idSlotError: {
    borderColor: c.error,
  },
  idSlotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  idSlotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  requiredTag: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textMuted,
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: '#DCFCE7',
  },
  readyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  idPreviewEmpty: {
    height: 136,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  idPlaceholderText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
    textAlign: 'center',
  },
  idPreviewWrap: {
    height: 164,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F1F1C',
  },
  idPreviewImg: {
    width: '100%',
    height: '100%',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.round,
    backgroundColor: 'rgba(20, 45, 41, 0.82)',
  },
  removeImgText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  serverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: authRadius.round,
    backgroundColor: 'rgba(8, 127, 114, 0.9)',
  },
  serverBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  idActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  idActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  idActionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  noteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 12,
    color: c.textMuted,
  },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: c.forestInk,
  },
});
