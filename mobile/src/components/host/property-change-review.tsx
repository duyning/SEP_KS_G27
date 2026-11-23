import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  amenityLabelVi,
  propertyChangeRuleLabel,
  type PropertyChangeDiff,
  type PropertyChangeSectionId,
  type PropertyEditAttachment,
} from '@/services/property-change';
import { hostPropertyPhotoSource } from '@/services/property-change-upload';
import type { RegistrationAsset, RegistrationValues } from '@/services/property-registration';

interface PropertyChangeReviewProps {
  diff: PropertyChangeDiff;
  baseline: RegistrationValues;
  draft: RegistrationValues;
  originalPhotos: readonly PropertyEditAttachment[];
  retainedPhotoIds: readonly number[];
  newPhotos: readonly RegistrationAsset[];
  token: string;
  changeReason: string;
  onChangeReason: (text: string) => void;
  termsAccepted: boolean;
  onToggleTerms: () => void;
  termsError?: string;
  onEditSection: (section: PropertyChangeSectionId) => void;
}

export function PropertyChangeReview({
  diff,
  baseline,
  draft,
  originalPhotos,
  retainedPhotoIds,
  newPhotos,
  token,
  changeReason,
  onChangeReason,
  termsAccepted,
  onToggleTerms,
  termsError,
  onEditSection,
}: PropertyChangeReviewProps) {
  const firstRetained = originalPhotos.find(photo => retainedPhotoIds.includes(photo.documentId));
  const expectedCoverSource = firstRetained
    ? hostPropertyPhotoSource(firstRetained.documentId, token)
    : newPhotos[0]
      ? { uri: newPhotos[0].uri }
      : null;

  const basicDiffs = diff.fieldDiffs.filter(item => item.section === 'basic');
  const locationDiffs = diff.fieldDiffs.filter(item => item.section === 'location');
  const hasAmenitiesOrRulesDiff =
    diff.addedAmenities.length > 0 ||
    diff.removedAmenities.length > 0 ||
    diff.addedRules.length > 0 ||
    diff.removedRules.length > 0 ||
    diff.customRulesChanged;

  if (!diff.hasAnyChange) {
    return (
      <View style={s.emptyCard}>
        <View style={s.emptyIconBox}>
          <Feather name="sliders" size={24} color={c.primary} />
        </View>
        <Text style={s.emptyTitle}>Chưa có thay đổi nào</Text>
        <Text style={s.emptyDesc}>
          Hãy quay lại màn Tổng quan và chỉnh sửa ít nhất một mục (thông tin, vị trí, tiện ích,
          hình ảnh hoặc tài liệu) trước khi gửi xét duyệt.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Reverification Warning when critical fields change */}
      {diff.reverificationReasons.length > 0 ? (
        <View style={s.warnCard} accessibilityRole="alert">
          <View style={s.rowGap}>
            <Feather name="alert-triangle" size={17} color="#B45309" />
            <Text style={s.warnTitle}>Lưu ý tái xác minh thông tin quan trọng</Text>
          </View>
          <Text style={s.warnBody}>
            Yêu cầu có thay đổi thông tin quan trọng nên nhà trọ sẽ tạm ẩn cho đến khi nhân viên
            NestHub phê duyệt:
          </Text>
          {diff.reverificationReasons.map(reason => (
            <Text key={reason} style={s.warnBullet}>
              • {reason}
            </Text>
          ))}
        </View>
      ) : (
        <View style={s.safeBanner}>
          <Feather name="shield" size={16} color={c.primary} />
          <Text style={s.safeBannerText}>
            Thông tin nhà trọ đang công khai vẫn hiển thị bình thường trong khi chờ nhân viên xét
            duyệt.
          </Text>
        </View>
      )}

      {/* 1. Basic Info Diffs */}
      {basicDiffs.length > 0 ? (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Thông tin cơ bản ({basicDiffs.length})</Text>
            <AnimatedPressable onPress={() => onEditSection('basic')}>
              <Text style={s.editLink}>Sửa</Text>
            </AnimatedPressable>
          </View>
          {basicDiffs.map((item, idx) => (
            <View key={item.key} style={[s.diffItem, idx > 0 && s.diffDivider]}>
              <Text style={s.diffLabel}>{item.label}</Text>
              <View style={s.compareBox}>
                <Text style={s.currentTag}>Hiện tại</Text>
                <Text style={s.currentVal} numberOfLines={3}>
                  {item.currentValue}
                </Text>
              </View>
              <View style={[s.compareBox, s.proposedBox]}>
                <Text style={s.proposedTag}>Đề nghị</Text>
                <Text style={s.proposedVal} numberOfLines={4}>
                  {item.proposedValue}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* 2. Location Diffs */}
      {locationDiffs.length > 0 || diff.locationChanged ? (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Vị trí nhà trọ</Text>
            <AnimatedPressable onPress={() => onEditSection('location')}>
              <Text style={s.editLink}>Sửa</Text>
            </AnimatedPressable>
          </View>
          {locationDiffs.map((item, idx) => (
            <View key={item.key} style={[s.diffItem, idx > 0 && s.diffDivider]}>
              <Text style={s.diffLabel}>{item.label}</Text>
              <View style={s.compareBox}>
                <Text style={s.currentTag}>Hiện tại</Text>
                <Text style={s.currentVal}>{item.currentValue}</Text>
              </View>
              <View style={[s.compareBox, s.proposedBox]}>
                <Text style={s.proposedTag}>Đề nghị</Text>
                <Text style={s.proposedVal}>{item.proposedValue}</Text>
              </View>
            </View>
          ))}
          {diff.locationChanged ? (
            <View style={[s.diffItem, locationDiffs.length > 0 && s.diffDivider]}>
              <Text style={s.diffLabel}>Ghim tọa độ bản đồ</Text>
              <View style={s.compareBox}>
                <Text style={s.currentTag}>Hiện tại</Text>
                <Text style={s.currentVal}>{diff.previousCoords || 'Chưa ghim bản đồ'}</Text>
              </View>
              <View style={[s.compareBox, s.proposedBox]}>
                <Text style={s.proposedTag}>Đề nghị</Text>
                <Text style={s.proposedVal}>{diff.proposedCoords || 'Đã bỏ ghim bản đồ'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 3. Amenities & Rules Diffs */}
      {hasAmenitiesOrRulesDiff ? (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Tiện ích & Quy định</Text>
            <AnimatedPressable onPress={() => onEditSection('amenities')}>
              <Text style={s.editLink}>Sửa</Text>
            </AnimatedPressable>
          </View>

          {diff.addedAmenities.length > 0 ? (
            <View style={s.chipGroup}>
              <Text style={s.chipHeadingAdd}>+ Thêm tiện ích ({diff.addedAmenities.length})</Text>
              <View style={s.chipWrap}>
                {diff.addedAmenities.map(id => (
                  <View key={`add-am-${id}`} style={[s.chip, s.chipAdd]}>
                    <Text style={s.chipAddText}>{amenityLabelVi(id)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {diff.removedAmenities.length > 0 ? (
            <View style={s.chipGroup}>
              <Text style={s.chipHeadingRem}>− Bỏ tiện ích ({diff.removedAmenities.length})</Text>
              <View style={s.chipWrap}>
                {diff.removedAmenities.map(id => (
                  <View key={`rem-am-${id}`} style={[s.chip, s.chipRem]}>
                    <Text style={s.chipRemText}>{amenityLabelVi(id)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {diff.addedRules.length > 0 ? (
            <View style={s.chipGroup}>
              <Text style={s.chipHeadingAdd}>+ Thêm quy định ({diff.addedRules.length})</Text>
              <View style={s.chipWrap}>
                {diff.addedRules.map(id => (
                  <View key={`add-r-${id}`} style={[s.chip, s.chipAdd]}>
                    <Text style={s.chipAddText}>{propertyChangeRuleLabel(id)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {diff.removedRules.length > 0 ? (
            <View style={s.chipGroup}>
              <Text style={s.chipHeadingRem}>− Bỏ quy định ({diff.removedRules.length})</Text>
              <View style={s.chipWrap}>
                {diff.removedRules.map(id => (
                  <View key={`rem-r-${id}`} style={[s.chip, s.chipRem]}>
                    <Text style={s.chipRemText}>{propertyChangeRuleLabel(id)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {diff.customRulesChanged ? (
            <View style={[s.diffItem, s.diffDivider]}>
              <Text style={s.diffLabel}>Nội quy bổ sung</Text>
              <View style={s.compareBox}>
                <Text style={s.currentTag}>Hiện tại</Text>
                <Text style={s.currentVal}>{baseline.rules.trim() || 'Không có'}</Text>
              </View>
              <View style={[s.compareBox, s.proposedBox]}>
                <Text style={s.proposedTag}>Đề nghị</Text>
                <Text style={s.proposedVal}>{draft.rules.trim() || 'Đã xóa nội quy bổ sung'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 4. Photos Diff */}
      {diff.photosChanged ? (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Hình ảnh nhà trọ</Text>
            <AnimatedPressable onPress={() => onEditSection('photos')}>
              <Text style={s.editLink}>Sửa</Text>
            </AnimatedPressable>
          </View>

          <View style={s.photoCompareRow}>
            {expectedCoverSource ? (
              <View style={s.coverPreviewWrap}>
                <Image source={expectedCoverSource} style={s.coverPreviewImg} contentFit="cover" />
                <View style={s.coverTag}>
                  <Text style={s.coverTagText}>Ảnh bìa dự kiến</Text>
                </View>
              </View>
            ) : null}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.photoStat}>Ảnh giữ lại: {diff.keptPhotoCount}</Text>
              <Text style={[s.photoStat, diff.addedPhotoCount > 0 && { color: c.primary }]}>
                Ảnh đề nghị thêm: +{diff.addedPhotoCount}
              </Text>
              <Text style={[s.photoStat, diff.removedPhotoCount > 0 && { color: c.error }]}>
                Ảnh đề nghị xóa: −{diff.removedPhotoCount}
              </Text>
              <Text style={s.photoStatMuted}>Tổng ảnh sau duyệt: {diff.totalPhotoCount}/10</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* 5. Documents Diff (NO CCCD preview rendered here!) */}
      {diff.replacedDocuments.length > 0 ? (
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Hồ sơ xác minh ({diff.replacedDocuments.length})</Text>
            <AnimatedPressable onPress={() => onEditSection('documents')}>
              <Text style={s.editLink}>Sửa</Text>
            </AnimatedPressable>
          </View>
          {diff.replacedDocuments.map((doc, idx) => (
            <View key={doc.key} style={[s.diffItem, idx > 0 && s.diffDivider]}>
              <View style={s.rowGap}>
                <Feather name="lock" size={14} color={c.primary} />
                <Text style={s.diffLabel}>{doc.label}</Text>
              </View>
              <Text style={s.docMeta}>Tệp mới sẵn sàng tải lên: {doc.newFileName}</Text>
              <Text style={s.docPrivacyHint}>
                Tài liệu riêng tư được ẩn ảnh xem trước tại trang tổng hợp.
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Reason Textarea */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>Lý do đề nghị thay đổi thông tin</Text>
          <Text style={s.optionalTag}>Tùy chọn</Text>
        </View>
        <TextInput
          style={s.reasonInput}
          multiline
          textAlignVertical="top"
          placeholder="Ghi chú ngắn lý do cập nhật (ví dụ: Đổi số hotline quản lý, cập nhật ảnh mặt tiền mới)..."
          placeholderTextColor={c.textMuted}
          value={changeReason}
          onChangeText={onChangeReason}
          maxLength={1000}
        />
      </View>

      {/* Final Confirmation Checkbox */}
      <View style={s.card}>
        <AnimatedPressable
          scaleTo={0.99}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          accessibilityLabel="Tôi xác nhận các thông tin đề nghị thay đổi là chính xác"
          style={s.checkboxRow}
          onPress={onToggleTerms}
        >
          <Feather
            name={termsAccepted ? 'check-square' : 'square'}
            size={20}
            color={termsAccepted ? c.primary : c.textMuted}
          />
          <Text style={s.checkboxLabel}>
            Tôi xác nhận các thông tin đề nghị thay đổi là chính xác.
          </Text>
        </AnimatedPressable>
        <InlineError message={termsError} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.forestInk,
  },
  emptyDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  safeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: 14,
    backgroundColor: c.softMint,
  },
  safeBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  warnCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 15,
    padding: 14,
    gap: 6,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  warnTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#92400E',
  },
  warnBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#78350F',
  },
  warnBullet: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#92400E',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  editLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  optionalTag: {
    fontSize: 12,
    color: c.textMuted,
  },
  diffItem: {
    gap: 6,
  },
  diffDivider: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  diffLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  compareBox: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: c.background,
    gap: 2,
  },
  proposedBox: {
    backgroundColor: '#EDF8F5',
    borderWidth: 1,
    borderColor: '#C5E6DF',
  },
  currentTag: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
  },
  currentVal: {
    fontSize: 13.5,
    lineHeight: 19,
    color: c.textSecondary,
  },
  proposedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
    textTransform: 'uppercase',
  },
  proposedVal: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: c.forestInk,
  },
  chipGroup: {
    gap: 6,
  },
  chipHeadingAdd: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#06665C',
  },
  chipHeadingRem: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  chipAdd: {
    backgroundColor: '#E6F4F1',
  },
  chipAddText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#06665C',
  },
  chipRem: {
    backgroundColor: '#FEE2E2',
  },
  chipRemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#991B1B',
  },
  photoCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coverPreviewWrap: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: c.background,
  },
  coverPreviewImg: {
    width: '100%',
    height: '100%',
  },
  coverTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 3,
    backgroundColor: 'rgba(8, 127, 114, 0.88)',
    alignItems: 'center',
  },
  coverTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoStat: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  photoStatMuted: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  docMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primary,
  },
  docPrivacyHint: {
    fontSize: 12,
    color: c.textSecondary,
  },
  reasonInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: c.forestInk,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: c.forestInk,
  },
});
