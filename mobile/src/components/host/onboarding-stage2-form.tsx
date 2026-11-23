import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  DescriptionAssistResult,
  DescriptionAssistTrigger,
  LocationSheet,
  useDescriptionAssist,
} from '@/components/host/registration-assist';
import {
  MultiSelectChecklistSheet,
  PhotoThumbnailTile,
  SelectRow,
  SingleSelectSheet,
} from '@/components/host/registration-pickers';
import type { AuthUser } from '@/services/auth';
import {
  AMENITIES,
  PROPERTY_AREAS,
  PROPERTY_TYPES,
  RULES,
  STEPS,
  quietHours,
  ruleLabel,
  timePattern,
  type RegistrationErrors,
  type RegistrationFiles,
  type RegistrationValues,
} from '@/services/property-registration';

interface OnboardingStage2FormProps {
  user: AuthUser;
  subStep: number;
  values: RegistrationValues;
  files: RegistrationFiles;
  errors: RegistrationErrors;
  busy: boolean;
  onUpdateValue: <K extends keyof RegistrationValues>(key: K, val: RegistrationValues[K]) => void;
  onPatchValues: (patch: Partial<RegistrationValues>) => void;
  onPickPhotos: (source: 'camera' | 'library') => void;
  onMakeCover: (index: number) => void;
  onRemovePhoto: (index: number) => void;
  onPickDocument: (key: 'ownership' | 'fireSafety', source: 'file' | 'camera' | 'library') => void;
  onRemoveDocument: (key: 'ownership' | 'fireSafety') => void;
  onJumpToStage1: () => void;
  onJumpToSubStep: (step: number) => void;
}

export function OnboardingStage2Form({
  user,
  subStep,
  values,
  files,
  errors,
  busy,
  onUpdateValue,
  onPatchValues,
  onPickPhotos,
  onMakeCover,
  onRemovePhoto,
  onPickDocument,
  onRemoveDocument,
  onJumpToStage1,
  onJumpToSubStep,
}: OnboardingStage2FormProps) {
  const [sheet, setSheet] = useState<'type' | 'area' | 'amenities' | 'rules' | 'map' | null>(null);
  const aiAssist = useDescriptionAssist(values);

  const quietRule = values.selectedRules.find(item => quietHours.test(item));
  const quietTime = quietRule?.match(quietHours)?.[1] || '23:00';

  const setQuietTime = (timeText: string) => {
    const cleaned = timeText.replace(/[^0-9:]/g, '').slice(0, 5);
    const next = values.selectedRules.filter(item => !quietHours.test(item));
    next.push(cleaned ? `quietHours:${cleaned}` : 'quietHours');
    onUpdateValue('selectedRules', next);
  };

  const toggleAmenity = (key: string) => {
    const exists = values.amenities.includes(key);
    onUpdateValue(
      'amenities',
      exists ? values.amenities.filter(item => item !== key) : [...values.amenities, key]
    );
  };

  const toggleRule = (key: string) => {
    if (key === 'quietHours') {
      const exists = values.selectedRules.some(item => quietHours.test(item));
      onUpdateValue(
        'selectedRules',
        exists
          ? values.selectedRules.filter(item => !quietHours.test(item))
          : [...values.selectedRules, 'quietHours:23:00']
      );
      return;
    }
    const exists = values.selectedRules.includes(key);
    onUpdateValue(
      'selectedRules',
      exists
        ? values.selectedRules.filter(item => item !== key)
        : [...values.selectedRules, key]
    );
  };

  const amenityLabels = AMENITIES.filter(([key]) => values.amenities.includes(key)).map(
    ([, label]) => label
  );
  const selectedRuleLabels = values.selectedRules.map(ruleLabel);

  const renderDocSlot = (
    key: 'ownership' | 'fireSafety',
    title: string,
    hint: string
  ) => {
    const asset = files[key];
    const errorText = errors[key];
    return (
      <View style={[s.docSlot, Boolean(errorText) && s.docSlotError]}>
        <View style={s.rowBetween}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.docTitle}>{title}</Text>
            <Text style={s.docHint}>{hint}</Text>
          </View>
          {asset ? (
            <View style={s.readyBadge}>
              <Feather name="check" size={12} color="#065F46" />
              <Text style={s.readyBadgeText}>Đã chọn</Text>
            </View>
          ) : (
            <Text style={s.reqTag}>Bắt buộc</Text>
          )}
        </View>

        {asset ? (
          <View style={s.docFileBox}>
            <Feather
              name={asset.mimeType === 'application/pdf' ? 'file-text' : 'image'}
              size={18}
              color={c.primary}
            />
            <Text style={s.docFileName} numberOfLines={1}>
              {asset.fileName || 'Tệp xác minh'}
            </Text>
            <AnimatedPressable
              accessibilityLabel={`Xóa ${title}`}
              disabled={busy}
              onPress={() => onRemoveDocument(key)}
            >
              <Feather name="x-circle" size={18} color={c.textMuted} />
            </AnimatedPressable>
          </View>
        ) : null}

        <View style={s.docActionRow}>
          <AnimatedPressable
            scaleTo={0.98}
            disabled={busy}
            style={s.docBtn}
            onPress={() => onPickDocument(key, 'file')}
          >
            <Feather name="file-plus" size={14} color={c.primary} />
            <Text style={s.docBtnText}>Chọn PDF/Tệp</Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.98}
            disabled={busy}
            style={s.docBtn}
            onPress={() => onPickDocument(key, 'camera')}
          >
            <Feather name="camera" size={14} color={c.primary} />
            <Text style={s.docBtnText}>Chụp ảnh</Text>
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={0.98}
            disabled={busy}
            style={s.docBtn}
            onPress={() => onPickDocument(key, 'library')}
          >
            <Feather name="image" size={14} color={c.primary} />
            <Text style={s.docBtnText}>Thư viện</Text>
          </AnimatedPressable>
        </View>

        {errorText ? <InlineError message={errorText} /> : null}
      </View>
    );
  };

  return (
    <View style={s.root}>
      {/* Compact Sub-step Progress Block */}
      <View style={s.subHeader}>
        <View style={s.rowBetween}>
          <Text style={s.subEyebrow}>
            GIAI ĐOẠN 2/3 · MỤC {subStep + 1}/6
          </Text>
          <AnimatedPressable
            scaleTo={0.97}
            accessibilityLabel="Quay lại Giai đoạn 1 Tài khoản và CCCD"
            onPress={onJumpToStage1}
          >
            <Text style={s.backStageLink}>Sửa tài khoản & CCCD</Text>
          </AnimatedPressable>
        </View>

        <Text accessibilityRole="header" style={s.stepTitle}>
          {STEPS[subStep]}
        </Text>

        <View style={s.subBarTrack}>
          <View style={[s.subBarFill, { width: `${((subStep + 1) / 6) * 100}%` }]} />
        </View>
      </View>

      {/* SUB-STEP 1: BASIC INFO */}
      {subStep === 0 ? (
        <View style={s.card}>
          <AuthInput
            label="Tên nhà trọ *"
            placeholder="Ví dụ: Nhà trọ Xanh Hòa Lạc"
            value={values.name}
            onChangeText={t => onUpdateValue('name', t)}
            error={errors.name}
            editable={!busy}
            maxLength={100}
          />

          <SelectRow
            label="Loại hình nhà trọ *"
            value={values.propertyType}
            placeholder="Chọn loại hình nhà trọ"
            error={errors.propertyType}
            onPress={() => setSheet('type')}
          />

          <View style={{ gap: 6 }}>
            <View style={s.rowBetween}>
              <Text style={s.fieldLabel}>Mô tả nhà trọ *</Text>
              <View style={s.aiMetaRow}>
                <Text style={s.charCount}>{values.description.length}/2000</Text>
                <DescriptionAssistTrigger
                  busy={aiAssist.busy}
                  onPress={() => {
                    void aiAssist.generate();
                  }}
                />
              </View>
            </View>
            <TextInput
              style={[s.textArea, Boolean(errors.description) && s.inputInvalid]}
              multiline
              textAlignVertical="top"
              placeholder="Mô tả không gian, vị trí thuận tiện gần trường/công ty, ưu điểm nổi bật (tối thiểu 30 ký tự)..."
              placeholderTextColor={c.textMuted}
              value={values.description}
              onChangeText={t => onUpdateValue('description', t)}
              editable={!busy}
              maxLength={2000}
            />
            <InlineError message={errors.description} />
            <DescriptionAssistResult
              error={aiAssist.error}
              suggestion={aiAssist.suggestion}
              onApply={text => onUpdateValue('description', text)}
              onDismiss={aiAssist.dismiss}
            />
          </View>

          <View style={s.divider} />

          <AuthInput
            label="Người đón khách / quản lý *"
            placeholder="Họ và tên người phụ trách"
            value={values.managerName}
            onChangeText={t => onUpdateValue('managerName', t)}
            error={errors.managerName}
            editable={!busy}
            maxLength={100}
          />

          <AuthInput
            label="Số hotline liên hệ *"
            placeholder="Ví dụ: 0912345678"
            value={values.contactPhone}
            onChangeText={t => onUpdateValue('contactPhone', t)}
            error={errors.contactPhone}
            keyboardType="phone-pad"
            editable={!busy}
            maxLength={20}
          />

          <AuthInput
            label="Số Zalo (tùy chọn)"
            placeholder="Để trống nếu dùng cùng số hotline"
            value={values.zaloPhone}
            onChangeText={t => onUpdateValue('zaloPhone', t)}
            error={errors.zaloPhone}
            keyboardType="phone-pad"
            editable={!busy}
            maxLength={20}
          />
        </View>
      ) : null}

      {/* SUB-STEP 2: LOCATION */}
      {subStep === 1 ? (
        <View style={s.card}>
          <AuthInput
            label="Địa chỉ chi tiết *"
            placeholder="Số nhà, ngõ, thôn/xóm (tối thiểu 10 ký tự)"
            value={values.addressDetail}
            onChangeText={t => onUpdateValue('addressDetail', t)}
            error={errors.addressDetail}
            editable={!busy}
            maxLength={255}
          />

          <SelectRow
            label="Khu vực Hòa Lạc *"
            value={values.commune}
            placeholder="Chọn xã / khu vực"
            error={errors.commune}
            onPress={() => setSheet('area')}
          />

          <AuthInput
            label="Địa điểm gần nhà trọ (tùy chọn)"
            placeholder="Ví dụ: Cách ĐH FPT 800m, gần chợ Tân Xã"
            value={values.nearby}
            onChangeText={t => onUpdateValue('nearby', t)}
            error={errors.nearby}
            editable={!busy}
            maxLength={255}
          />

          <View style={s.mapCard}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.mapTitle}>Ghim vị trí trên bản đồ</Text>
              <Text style={s.mapSub}>
                {values.latitude && values.longitude
                  ? `Tọa độ đã chọn: ${Number(values.latitude).toFixed(5)}, ${Number(values.longitude).toFixed(5)}`
                  : 'Tùy chọn — giúp người thuê tìm đường chính xác hơn. Bạn vẫn có thể tiếp tục bằng địa chỉ thủ công.'}
              </Text>
            </View>
            <View style={s.mapActionRow}>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={s.mapPrimaryBtn}
                onPress={() => setSheet('map')}
              >
                <Feather name="map-pin" size={15} color="#FFFFFF" />
                <Text style={s.mapPrimaryText}>
                  {values.latitude && values.longitude ? 'Chọn lại ghim' : 'Mở bản đồ'}
                </Text>
              </AnimatedPressable>
              {values.latitude || values.longitude ? (
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={s.mapClearBtn}
                  onPress={() => onPatchValues({ latitude: '', longitude: '' })}
                >
                  <Text style={s.mapClearText}>Bỏ ghim</Text>
                </AnimatedPressable>
              ) : null}
            </View>
            <InlineError message={errors.latitude || errors.longitude} />
          </View>
        </View>
      ) : null}

      {/* SUB-STEP 3: AMENITIES & RULES */}
      {subStep === 2 ? (
        <View style={s.card}>
          <SelectRow
            label="Tiện ích tòa nhà"
            value={
              values.amenities.length
                ? `Đã chọn ${values.amenities.length} tiện ích`
                : ''
            }
            placeholder="Chạm để chọn tiện ích có sẵn"
            error={errors.amenities}
            onPress={() => setSheet('amenities')}
          />

          {amenityLabels.length > 0 ? (
            <Text style={s.compactSelection} numberOfLines={3}>
              {amenityLabels.join(' · ')}
            </Text>
          ) : null}

          <View style={s.divider} />

          <SelectRow
            label="Quy định chung của nhà trọ"
            value={
              values.selectedRules.length
                ? `Đã chọn ${values.selectedRules.length} quy định`
                : ''
            }
            placeholder="Chạm để chọn quy định áp dụng"
            error={errors.selectedRules}
            onPress={() => setSheet('rules')}
          />

          {selectedRuleLabels.length > 0 ? (
            <Text style={s.compactSelection} numberOfLines={3}>
              {selectedRuleLabels.join(' · ')}
            </Text>
          ) : null}

          {quietRule ? (
            <View style={s.quietBox}>
              <Text style={s.fieldLabel}>Giờ bắt đầu giữ trật tự (HH:mm)</Text>
              <TextInput
                style={[
                  s.quietInput,
                  Boolean(quietTime && !timePattern.test(quietTime)) && s.inputInvalid,
                ]}
                value={quietTime}
                onChangeText={setQuietTime}
                placeholder="23:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                editable={!busy}
              />
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={s.fieldLabel}>Quy định bổ sung khác (tùy chọn)</Text>
            <TextInput
              style={s.textArea}
              multiline
              textAlignVertical="top"
              placeholder="Ví dụ: Quy định gửi xe, khách đến chơi, đóng tiền đúng hạn..."
              placeholderTextColor={c.textMuted}
              value={values.rules}
              onChangeText={t => onUpdateValue('rules', t)}
              editable={!busy}
              maxLength={2000}
            />
            <InlineError message={errors.rules} />
          </View>
        </View>
      ) : null}

      {/* SUB-STEP 4: PROPERTY PHOTOS */}
      {subStep === 3 ? (
        <View style={s.card}>
          <View style={{ gap: 3 }}>
            <Text style={s.cardTitle}>Hình ảnh nhà trọ ({files.photos.length}/10)</Text>
            <Text style={s.cardHint}>
              Chọn 1–10 ảnh thực tế mặt tiền, hành lang, chỗ để xe hoặc khu vực chung (JPG, PNG,
              WebP ≤ 5 MB). Ảnh đầu tiên sẽ là ảnh bìa.
            </Text>
          </View>

          <View style={s.photoBtnRow}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy || files.photos.length >= 10}
              style={[s.photoBtn, files.photos.length >= 10 && { opacity: 0.5 }]}
              onPress={() => onPickPhotos('camera')}
            >
              <Feather name="camera" size={16} color={c.primary} />
              <Text style={s.photoBtnText}>Chụp ảnh</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={busy || files.photos.length >= 10}
              style={[s.photoBtn, files.photos.length >= 10 && { opacity: 0.5 }]}
              onPress={() => onPickPhotos('library')}
            >
              <Feather name="image" size={16} color={c.primary} />
              <Text style={s.photoBtnText}>Chọn thư viện</Text>
            </AnimatedPressable>
          </View>

          <InlineError message={errors.photos} />

          {files.photos.length > 0 ? (
            <View style={s.photoGrid}>
              {files.photos.map((asset, index) => (
                <PhotoThumbnailTile
                  key={`${asset.uri}-${index}`}
                  asset={asset}
                  index={index}
                  disabled={busy}
                  onMakeCover={() => onMakeCover(index)}
                  onRemove={() => onRemovePhoto(index)}
                />
              ))}
            </View>
          ) : (
            <View style={s.emptyPhotoBox}>
              <Feather name="image" size={28} color={c.textMuted} />
              <Text style={s.emptyPhotoText}>Chưa có ảnh nhà trọ nào được chọn</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* SUB-STEP 5: PROPERTY VERIFICATION DOCS (REUSES CCCD FROM STAGE 1) */}
      {subStep === 4 ? (
        <View style={s.card}>
          <View style={s.cccdReuseCard}>
            <View style={s.cccdReuseIcon}>
              <Feather name="check-circle" size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.cccdReuseTitle}>CCCD 2 mặt đã sẵn sàng từ Giai đoạn 1</Text>
              <Text style={s.cccdReuseSub}>
                Hệ thống tự động dùng ảnh CCCD 2 mặt bạn đã tải lên ở bước Tài khoản & CCCD — không
                cần tải lại tại đây.
              </Text>
            </View>
          </View>

          {renderDocSlot(
            'ownership',
            'Giấy phép kinh doanh / Giấy tờ sở hữu',
            'Tệp PDF, JPG, PNG hoặc WebP tối đa 10 MB'
          )}

          {renderDocSlot(
            'fireSafety',
            'Chứng nhận an toàn PCCC',
            'Tệp PDF, JPG, PNG hoặc WebP tối đa 10 MB'
          )}
        </View>
      ) : null}

      {/* SUB-STEP 6: REVIEW & SUBMIT (NEVER RENDERS CCCD IMAGES HERE) */}
      {subStep === 5 ? (
        <View style={{ gap: 12 }}>
          <View style={s.summaryBanner}>
            <Feather name="send" size={17} color={c.primary} />
            <Text style={s.summaryBannerText}>
              Kiểm tra lại thông tin trước khi gửi một hồ sơ kết hợp duy nhất tới nhân viên thẩm
              định HL_RCS.
            </Text>
          </View>

          {/* 1. Account & CCCD Summary (No CCCD image rendered for privacy!) */}
          <View style={s.summaryCard}>
            <View style={s.rowBetween}>
              <Text style={s.summaryTitle}>1. Tài khoản & CCCD</Text>
              <AnimatedPressable onPress={onJumpToStage1}>
                <Text style={s.editBtn}>Sửa</Text>
              </AnimatedPressable>
            </View>
            <Text style={s.summaryLine}>Chủ tài khoản: {user.fullName}</Text>
            <Text style={s.summaryLine}>
              Số điện thoại: {user.phoneNumber} · Đã xác minh OTP
            </Text>
            <View style={s.privateCccdRow}>
              <Feather name="lock" size={13} color={c.primary} />
              <Text style={s.privateCccdText}>
                CCCD 2 mặt đã đính kèm bảo mật (ẩn ảnh tại trang tóm tắt)
              </Text>
            </View>
          </View>

          {/* 2. Basic Property Info */}
          <View style={s.summaryCard}>
            <View style={s.rowBetween}>
              <Text style={s.summaryTitle}>2. Thông tin cơ bản</Text>
              <AnimatedPressable onPress={() => onJumpToSubStep(0)}>
                <Text style={s.editBtn}>Sửa</Text>
              </AnimatedPressable>
            </View>
            <Text style={s.summaryLine}>Tên nhà trọ: {values.name}</Text>
            <Text style={s.summaryLine}>Loại hình: {values.propertyType}</Text>
            <Text style={s.summaryLine}>
              Liên hệ: {values.managerName} · {values.contactPhone}
            </Text>
          </View>

          {/* 3. Location */}
          <View style={s.summaryCard}>
            <View style={s.rowBetween}>
              <Text style={s.summaryTitle}>3. Vị trí nhà trọ</Text>
              <AnimatedPressable onPress={() => onJumpToSubStep(1)}>
                <Text style={s.editBtn}>Sửa</Text>
              </AnimatedPressable>
            </View>
            <Text style={s.summaryLine}>Khu vực: {values.commune}</Text>
            <Text style={s.summaryLine}>Địa chỉ: {values.addressDetail}</Text>
            {values.latitude && values.longitude ? (
              <Text style={s.summarySub}>
                Đã ghim bản đồ ({Number(values.latitude).toFixed(4)},{' '}
                {Number(values.longitude).toFixed(4)})
              </Text>
            ) : null}
          </View>

          {/* 4. Amenities & Rules */}
          <View style={s.summaryCard}>
            <View style={s.rowBetween}>
              <Text style={s.summaryTitle}>4. Tiện ích & Quy định</Text>
              <AnimatedPressable onPress={() => onJumpToSubStep(2)}>
                <Text style={s.editBtn}>Sửa</Text>
              </AnimatedPressable>
            </View>
            <Text style={s.summaryLine}>
              Tiện ích: {values.amenities.length ? `${values.amenities.length} mục đã chọn` : 'Chưa chọn'}
            </Text>
            <Text style={s.summaryLine}>
              Quy định: {values.selectedRules.length ? `${values.selectedRules.length} mục đã chọn` : 'Chưa chọn'}
            </Text>
          </View>

          {/* 5. Photos & Verification Docs */}
          <View style={s.summaryCard}>
            <View style={s.rowBetween}>
              <Text style={s.summaryTitle}>5. Hình ảnh & Chứng từ nhà trọ</Text>
              <AnimatedPressable onPress={() => onJumpToSubStep(3)}>
                <Text style={s.editBtn}>Sửa ảnh</Text>
              </AnimatedPressable>
            </View>
            <View style={s.photoSummaryRow}>
              {files.photos[0] ? (
                <Image
                  source={{ uri: files.photos[0].uri }}
                  style={s.coverThumb}
                  contentFit="cover"
                />
              ) : null}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.summaryLine}>
                  Ảnh nhà trọ: {files.photos.length} ảnh (có ảnh bìa)
                </Text>
                <Text style={s.summarySub} numberOfLines={1}>
                  Giấy phép KD: {files.ownership?.fileName || 'Đã đính kèm'}
                </Text>
                <Text style={s.summarySub} numberOfLines={1}>
                  Chứng nhận PCCC: {files.fireSafety?.fileName || 'Đã đính kèm'}
                </Text>
              </View>
              <AnimatedPressable onPress={() => onJumpToSubStep(4)}>
                <Text style={s.editBtn}>Sửa giấy tờ</Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Final Submission Confirmation Checkbox */}
          <View style={s.card}>
            <AnimatedPressable
              scaleTo={0.99}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: values.termsAccepted }}
              accessibilityLabel="Xác nhận gửi hồ sơ đăng ký chủ trọ và nhà trọ đầu tiên"
              style={s.checkboxRow}
              onPress={() => onUpdateValue('termsAccepted', !values.termsAccepted)}
            >
              <Feather
                name={values.termsAccepted ? 'check-square' : 'square'}
                size={20}
                color={values.termsAccepted ? c.primary : c.textMuted}
              />
              <Text style={s.checkboxLabel}>
                Tôi xác nhận toàn bộ thông tin tài khoản, CCCD và nhà trọ đầu tiên là chính xác và
                sẵn sàng gửi nhân viên HL_RCS thẩm định.
              </Text>
            </AnimatedPressable>
            <InlineError message={errors.termsAccepted} />
          </View>
        </View>
      ) : null}

      {/* Shared Picker Sheets */}
      <SingleSelectSheet
        visible={sheet === 'type'}
        title="Chọn loại hình nhà trọ"
        options={PROPERTY_TYPES.map(item => ({ key: item, label: item }))}
        selectedValue={values.propertyType}
        onClose={() => setSheet(null)}
        onSelect={val => onUpdateValue('propertyType', val)}
      />

      <SingleSelectSheet
        visible={sheet === 'area'}
        title="Chọn khu vực Hòa Lạc"
        options={PROPERTY_AREAS.map(item => ({ key: item, label: item }))}
        selectedValue={values.commune}
        onClose={() => setSheet(null)}
        onSelect={val => onUpdateValue('commune', val)}
      />

      <MultiSelectChecklistSheet
        visible={sheet === 'amenities'}
        title="Chọn tiện ích nhà trọ"
        items={AMENITIES}
        selectedCount={values.amenities.length}
        isSelected={key => values.amenities.includes(key)}
        onToggle={toggleAmenity}
        onClose={() => setSheet(null)}
      />

      <MultiSelectChecklistSheet
        visible={sheet === 'rules'}
        title="Chọn quy định nhà trọ"
        items={RULES}
        selectedCount={values.selectedRules.length}
        isSelected={key =>
          key === 'quietHours'
            ? values.selectedRules.some(item => quietHours.test(item))
            : values.selectedRules.includes(key)
        }
        onToggle={toggleRule}
        onClose={() => setSheet(null)}
      />

      {sheet === 'map' ? (
        <LocationSheet
          values={values}
          lookupPath="/host-onboarding/location/resolve-mobile"
          onClose={() => setSheet(null)}
          onApply={location => {
            onPatchValues(location);
            setSheet(null);
          }}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 14,
  },
  subHeader: {
    gap: 6,
    paddingHorizontal: 2,
  },
  subEyebrow: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: c.primary,
  },
  backStageLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  stepTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: c.forestInk,
  },
  subBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: c.border,
    overflow: 'hidden',
    marginTop: 2,
  },
  subBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: c.primary,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 14,
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  aiMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  charCount: {
    fontSize: 12,
    color: c.textMuted,
  },
  textArea: {
    minHeight: 116,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    color: c.forestInk,
  },
  inputInvalid: {
    borderColor: c.error,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  mapCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 14,
    gap: 10,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  mapSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  mapActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mapPrimaryBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  mapPrimaryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapClearBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapClearText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  compactSelection: {
    fontSize: 13,
    lineHeight: 19,
    color: c.primary,
    backgroundColor: c.softMint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quietBox: {
    gap: 6,
  },
  quietInput: {
    height: 44,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    paddingHorizontal: 12,
    fontSize: 15,
    color: c.forestInk,
    width: 120,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.softMint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  photoBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyPhotoBox: {
    height: 124,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyPhotoText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  cccdReuseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 13,
    backgroundColor: c.softMint,
  },
  cccdReuseIcon: {
    marginTop: 1,
  },
  cccdReuseTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  cccdReuseSub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  docSlot: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 12,
    gap: 10,
  },
  docSlotError: {
    borderColor: c.error,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  docHint: {
    fontSize: 12,
    color: c.textSecondary,
  },
  reqTag: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textMuted,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: '#DCFCE7',
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  docFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  docFileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  docActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  docBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: c.softMint,
  },
  summaryBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: c.forestInk,
  },
  summaryCard: {
    backgroundColor: c.surface,
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  editBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  summaryLine: {
    fontSize: 13.5,
    lineHeight: 19,
    color: c.forestInk,
  },
  summarySub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  privateCccdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: c.softMint,
  },
  privateCccdText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: c.primary,
  },
  photoSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  coverThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: c.background,
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
});
