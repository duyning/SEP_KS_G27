import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import type { HostRoomType } from '@/services/host';
import { ROOM_AMENITY_LABELS, roomAmenityLabel } from '@/services/host-room-types';
import { checkRegistrationAsset } from '@/services/registration-upload';
import {
  EMPTY_ROOM_TYPE_FORM,
  ROOM_AMENITY_GROUPS,
  SETUP_LIMITS,
  formatOptionalFeePreview,
  sanitizeDecimalInput,
  sanitizeDigitsInput,
  totalDraftPhotoStats,
  validateSetupRoomTypeDraft,
  type DraftNewRoomType,
  type RoomTypeFormDraft,
  type RoomTypeRequestPayload,
  type SetupPhotoAsset,
} from '@/services/room-setup';
import { MultiSelectChecklistSheet, PhotoThumbnailTile } from './registration-pickers';

const AMENITY_ITEMS: readonly (readonly [string, string])[] = Object.entries(ROOM_AMENITY_LABELS);

export function RoomSetupTypeModal({
  visible,
  propertyId,
  propertyName,
  savedTypes,
  draftTypes,
  editing,
  onClose,
  onSaveDraft,
}: {
  visible: boolean;
  propertyId: number;
  propertyName: string;
  savedTypes: HostRoomType[];
  draftTypes: DraftNewRoomType[];
  editing: DraftNewRoomType | null;
  onClose: () => void;
  onSaveDraft: (form: RoomTypeFormDraft, payload: RoomTypeRequestPayload, editingLocalId?: number) => void;
}) {
  const reduced = useReducedMotionPreference();
  if (!visible) return null;
  return (
    <Modal
      visible
      animationType={reduced ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <RoomSetupTypeModalContent
        key={editing ? `edit-${editing.localId}` : 'create-new'}
        propertyId={propertyId}
        propertyName={propertyName}
        savedTypes={savedTypes}
        draftTypes={draftTypes}
        editing={editing}
        onClose={onClose}
        onSaveDraft={onSaveDraft}
      />
    </Modal>
  );
}

function RoomSetupTypeModalContent({
  propertyId,
  propertyName,
  savedTypes,
  draftTypes,
  editing,
  onClose,
  onSaveDraft,
}: {
  propertyId: number;
  propertyName: string;
  savedTypes: HostRoomType[];
  draftTypes: DraftNewRoomType[];
  editing: DraftNewRoomType | null;
  onClose: () => void;
  onSaveDraft: (form: RoomTypeFormDraft, payload: RoomTypeRequestPayload, editingLocalId?: number) => void;
}) {
  const [form, setForm] = useState<RoomTypeFormDraft>(() =>
    editing
      ? {
          ...editing.form,
          amenities: [...editing.form.amenities],
          photos: [...editing.form.photos],
        }
      : { ...EMPTY_ROOM_TYPE_FORM, amenities: [], photos: [] }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [amenitySheetOpen, setAmenitySheetOpen] = useState(false);

  // Collapsible optional sections
  const [feesOpen, setFeesOpen] = useState(() =>
    Boolean(
      editing &&
        (editing.form.deposit ||
          editing.form.electricityPrice ||
          editing.form.waterPrice ||
          editing.form.internetPrice ||
          editing.form.servicePrice)
    )
  );
  const [descOpen, setDescOpen] = useState(() => Boolean(editing?.form.description));
  const [photosOpen, setPhotosOpen] = useState(() =>
    Boolean(editing && (editing.form.photos.length > 0 || editing.form.imageUrl))
  );
  const [amenitiesOpen, setAmenitiesOpen] = useState(() =>
    Boolean(editing && editing.form.amenities.length > 0)
  );

  const otherPhotoStats = totalDraftPhotoStats(draftTypes, editing?.localId);
  const currentPhotoBytes = form.photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);
  const remainingTypeSlots = SETUP_LIMITS.maxPhotosPerType - form.photos.length;
  const remainingTotalSlots =
    SETUP_LIMITS.maxTotalPhotos - otherPhotoStats.count - form.photos.length;
  const remainingSlots = Math.max(0, Math.min(remainingTypeSlots, remainingTotalSlots));

  const updateField = <K extends keyof RoomTypeFormDraft>(key: K, value: RoomTypeFormDraft[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const appendPickedAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length) return;
    setPhotoBusy(true);
    setPhotoMessage(null);
    const added: SetupPhotoAsset[] = [];
    let runningCount = otherPhotoStats.count + form.photos.length;
    let runningBytes = otherPhotoStats.bytes + currentPhotoBytes;
    const warnings: string[] = [];

    for (const raw of assets) {
      if (form.photos.length + added.length >= SETUP_LIMITS.maxPhotosPerType) {
        warnings.push(`Mỗi loại phòng chỉ hỗ trợ tối đa ${SETUP_LIMITS.maxPhotosPerType} ảnh.`);
        break;
      }
      if (runningCount >= SETUP_LIMITS.maxTotalPhotos) {
        warnings.push(`Tổng tối đa ${SETUP_LIMITS.maxTotalPhotos} ảnh cho toàn bộ loại mới.`);
        break;
      }
      try {
        const checked = await checkRegistrationAsset(
          {
            uri: raw.uri,
            fileName: raw.fileName || undefined,
            mimeType: raw.mimeType || undefined,
            fileSize: raw.fileSize || undefined,
            file: (raw as unknown as { file?: File }).file,
          },
          false
        );
        const size = checked.fileSize || 0;
        if (runningBytes + size > SETUP_LIMITS.maxTotalPhotoBytes) {
          warnings.push('Tổng dung lượng ảnh cho tất cả loại mới đã đạt giới hạn 80 MB.');
          break;
        }
        runningCount += 1;
        runningBytes += size;
        added.push({
          ...checked,
          id: `rt-photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
      } catch (err) {
        warnings.push(err instanceof Error ? err.message : 'Ảnh không hợp lệ.');
      }
    }

    if (added.length > 0) {
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...added] }));
      setPhotosOpen(true);
      setErrors(prev => {
        if (!prev.photos) return prev;
        const next = { ...prev };
        delete next.photos;
        return next;
      });
    }
    if (warnings.length > 0) {
      setPhotoMessage(warnings[0]);
    }
    setPhotoBusy(false);
  };

  const handlePickLibrary = async () => {
    if (photoBusy || remainingSlots <= 0) return;
    setPhotoMessage(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPhotoMessage('Cần quyền truy cập thư viện ảnh để chọn ảnh loại phòng.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.length) {
        await appendPickedAssets(res.assets);
      }
    } catch {
      setPhotoMessage('Không thể mở thư viện ảnh. Vui lòng thử lại.');
    }
  };

  const handleTakePhoto = async () => {
    if (photoBusy || remainingSlots <= 0) return;
    setPhotoMessage(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPhotoMessage('Cần quyền camera để chụp ảnh loại phòng.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.length) {
        await appendPickedAssets(res.assets);
      }
    } catch {
      setPhotoMessage('Không thể mở camera trên thiết bị này.');
    }
  };

  const removePhoto = (photoId: string) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter(p => p.id !== photoId) }));
    setPhotoMessage(null);
  };

  const makeCoverPhoto = (index: number) => {
    if (index <= 0) return;
    setForm(prev => {
      const next = [...prev.photos];
      const [chosen] = next.splice(index, 1);
      if (chosen) next.unshift(chosen);
      return { ...prev, photos: next };
    });
  };

  const handleSubmit = () => {
    const result = validateSetupRoomTypeDraft(
      form,
      propertyId,
      savedTypes,
      draftTypes,
      editing?.localId
    );
    if (!result.valid || !result.payload) {
      setErrors(result.errors);
      if (
        result.errors.deposit ||
        result.errors.electricityPrice ||
        result.errors.waterPrice ||
        result.errors.internetPrice ||
        result.errors.servicePrice
      ) {
        setFeesOpen(true);
      }
      if (result.errors.description) setDescOpen(true);
      if (result.errors.photos || result.errors.imageUrl) setPhotosOpen(true);
      return;
    }
    onSaveDraft(form, result.payload, editing?.localId);
  };

  const filledFeesCount = [
    form.deposit,
    form.electricityPrice,
    form.waterPrice,
    form.internetPrice,
    form.servicePrice,
  ].filter(v => v.trim().length > 0).length;

  const formattedRent =
    /^\d+$/.test(form.price.trim()) && Number(form.price.trim()) > 0
      ? `${new Intl.NumberFormat('vi-VN').format(Number(form.price.trim()))} đ/tháng`
      : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header */}
        <View style={s.header}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Đóng biểu mẫu thêm loại phòng"
            style={s.backBtn}
            onPress={onClose}
          >
            <Feather name="x" size={20} color={c.forestInk} />
          </AnimatedPressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {editing ? 'Sửa loại phòng nháp' : 'Thêm loại phòng mới'}
            </Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {propertyName} · Chỉ lưu vào bản nháp
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Draft Notice Pill */}
            <View style={s.draftHint}>
              <Feather name="layers" size={15} color={c.primary} />
              <Text style={s.draftHintText}>
                Loại phòng này được thêm vào bản nháp để gán cho các phòng ở bước sau và chỉ tạo thật khi bạn xác nhận ở cuối Bước 3.
              </Text>
            </View>

            {/* Primary Info Card */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Thông tin cơ bản</Text>

              <AuthInput
                label="Tên loại phòng *"
                value={form.roomType}
                onChangeText={v => updateField('roomType', v)}
                placeholder="VD: Studio ban công, Phòng gác lửng…"
                error={errors.roomType}
                maxLength={100}
              />

              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <AuthInput
                    label="Diện tích (m²) *"
                    value={form.areaSqm}
                    onChangeText={v => updateField('areaSqm', sanitizeDecimalInput(v))}
                    placeholder="VD: 25"
                    keyboardType="decimal-pad"
                    error={errors.areaSqm}
                    maxLength={8}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput
                    label="Sức chứa (người) *"
                    value={form.capacity}
                    onChangeText={v => updateField('capacity', sanitizeDigitsInput(v))}
                    placeholder="VD: 2"
                    keyboardType="number-pad"
                    error={errors.capacity}
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <AuthInput
                  label="Giá thuê niêm yết (đ/tháng) *"
                  value={form.price}
                  onChangeText={v => updateField('price', sanitizeDigitsInput(v))}
                  placeholder="VD: 3500000"
                  keyboardType="number-pad"
                  error={errors.price}
                  maxLength={9}
                />
                {formattedRent && (
                  <Text style={s.pricePreview}>Hiển thị: {formattedRent}</Text>
                )}
              </View>
            </View>

            {/* Collapsible 1: Deposit & Utility Fees */}
            <ExpandableSection
              icon="dollar-sign"
              title="Tiền cọc & Chi phí dịch vụ"
              subtitle={
                filledFeesCount > 0
                  ? `Đã nhập ${filledFeesCount}/5 khoản`
                  : 'Tùy chọn · Bỏ trống = chưa xác định'
              }
              expanded={feesOpen}
              hasError={Boolean(
                errors.deposit ||
                  errors.electricityPrice ||
                  errors.waterPrice ||
                  errors.internetPrice ||
                  errors.servicePrice
              )}
              onToggle={() => setFeesOpen(prev => !prev)}
            >
              <View style={s.feeRuleNote}>
                <Feather name="info" size={14} color={c.primary} style={{ marginTop: 1 }} />
                <Text style={s.feeRuleText}>
                  Để trống nếu chưa xác định. Nhập <Text style={{ fontWeight: '700' }}>0</Text> nếu miễn phí (hoặc không yêu cầu cọc).
                </Text>
              </View>

              <FeeInputRow
                label="Tiền đặt cọc"
                unit="đ"
                zeroLabel="Không yêu cầu cọc"
                value={form.deposit}
                placeholder="Bỏ trống nếu chưa xác định"
                error={errors.deposit}
                onChangeText={v => updateField('deposit', sanitizeDigitsInput(v))}
              />
              <FeeInputRow
                label="Giá điện"
                unit="đ/kWh"
                zeroLabel="Miễn phí"
                value={form.electricityPrice}
                placeholder="VD: 3800"
                error={errors.electricityPrice}
                onChangeText={v => updateField('electricityPrice', sanitizeDigitsInput(v))}
              />
              <FeeInputRow
                label="Giá nước"
                unit="đ/m³"
                zeroLabel="Miễn phí"
                value={form.waterPrice}
                placeholder="VD: 25000"
                error={errors.waterPrice}
                onChangeText={v => updateField('waterPrice', sanitizeDigitsInput(v))}
              />
              <FeeInputRow
                label="Internet / Wi-Fi"
                unit="đ/phòng"
                zeroLabel="Miễn phí"
                value={form.internetPrice}
                placeholder="VD: 100000"
                error={errors.internetPrice}
                onChangeText={v => updateField('internetPrice', sanitizeDigitsInput(v))}
              />
              <FeeInputRow
                label="Phí dịch vụ chung"
                unit="đ/người"
                zeroLabel="Miễn phí"
                value={form.servicePrice}
                placeholder="VD: 150000"
                error={errors.servicePrice}
                onChangeText={v => updateField('servicePrice', sanitizeDigitsInput(v))}
              />
            </ExpandableSection>

            {/* Collapsible 2: Description */}
            <ExpandableSection
              icon="file-text"
              title="Mô tả loại phòng"
              subtitle={
                form.description.trim()
                  ? `${form.description.trim().length}/2000 ký tự`
                  : 'Tùy chọn · Giới thiệu không gian, hướng cửa sổ…'
              }
              expanded={descOpen}
              hasError={Boolean(errors.description)}
              onToggle={() => setDescOpen(prev => !prev)}
            >
              <AuthInput
                label="Mô tả chi tiết"
                value={form.description}
                onChangeText={v => updateField('description', v)}
                placeholder="Mô tả ánh sáng, nội thất cơ bản, không gian bếp, ban công…"
                multiline
                maxLength={2000}
                error={errors.description}
              />
              <Text style={s.charCount}>{form.description.trim().length}/2000 ký tự</Text>
            </ExpandableSection>

            {/* Collapsible 3: Photos */}
            <ExpandableSection
              icon="image"
              title="Hình ảnh loại phòng"
              subtitle={
                form.photos.length > 0
                  ? `${form.photos.length}/${SETUP_LIMITS.maxPhotosPerType} ảnh · Tổng nháp ${otherPhotoStats.count + form.photos.length}/${SETUP_LIMITS.maxTotalPhotos}`
                  : 'Tùy chọn · Tối đa 10 ảnh/loại (≤ 5 MB/ảnh)'
              }
              expanded={photosOpen}
              hasError={Boolean(errors.photos || errors.imageUrl)}
              onToggle={() => setPhotosOpen(prev => !prev)}
            >
              <View style={s.photoActionsRow}>
                <AnimatedPressable
                  scaleTo={0.97}
                  disabled={photoBusy || remainingSlots <= 0}
                  style={[s.photoActionBtn, (photoBusy || remainingSlots <= 0) && { opacity: 0.45 }]}
                  accessibilityLabel="Chụp ảnh loại phòng"
                  onPress={handleTakePhoto}
                >
                  <Feather name="camera" size={16} color={c.primary} />
                  <Text style={s.photoActionText}>Chụp ảnh</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  scaleTo={0.97}
                  disabled={photoBusy || remainingSlots <= 0}
                  style={[s.photoActionBtn, (photoBusy || remainingSlots <= 0) && { opacity: 0.45 }]}
                  accessibilityLabel="Chọn ảnh từ thư viện"
                  onPress={handlePickLibrary}
                >
                  <Feather name="image" size={16} color={c.primary} />
                  <Text style={s.photoActionText}>Chọn từ thư viện</Text>
                </AnimatedPressable>
              </View>

              <Text style={s.photoLimitNote}>
                JPG/PNG/WebP tối đa 5 MB mỗi ảnh · Tối đa {SETUP_LIMITS.maxPhotosPerType} ảnh cho loại này (tổng tối đa {SETUP_LIMITS.maxTotalPhotos} ảnh / 80 MB cho tất cả loại mới).
              </Text>

              {(photoMessage || errors.photos) && (
                <InlineError message={photoMessage || errors.photos || ''} />
              )}

              {form.photos.length > 0 && (
                <View style={s.photoGrid}>
                  {form.photos.map((photo, index) => (
                    <PhotoThumbnailTile
                      key={photo.id}
                      asset={photo}
                      index={index}
                      disabled={photoBusy}
                      onMakeCover={() => makeCoverPhoto(index)}
                      onRemove={() => removePhoto(photo.id)}
                    />
                  ))}
                </View>
              )}

              <AuthInput
                label="Đường dẫn ảnh đại diện (URL tùy chọn)"
                value={form.imageUrl}
                onChangeText={v => updateField('imageUrl', v)}
                placeholder="https://..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={errors.imageUrl}
              />
            </ExpandableSection>

            {/* Collapsible 4: Grouped Amenities + "Xem tất cả" */}
            <ExpandableSection
              icon="check-square"
              title="Tiện nghi trong phòng"
              subtitle={
                form.amenities.length > 0
                  ? `Đã chọn ${form.amenities.length}/${AMENITY_ITEMS.length} tiện nghi`
                  : 'Tùy chọn · Chọn nhanh theo nhóm hoặc xem tất cả'
              }
              expanded={amenitiesOpen}
              onToggle={() => setAmenitiesOpen(prev => !prev)}
            >
              <View style={{ gap: 12 }}>
                {ROOM_AMENITY_GROUPS.map(group => {
                  const previewKeys = group.keys.slice(0, 4);
                  return (
                    <View key={group.id} style={{ gap: 7 }}>
                      <Text style={s.amenityGroupTitle}>{group.title}</Text>
                      <View style={s.amenityChipsWrap}>
                        {previewKeys.map(key => {
                          const active = form.amenities.includes(key);
                          return (
                            <AnimatedPressable
                              key={key}
                              scaleTo={0.97}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: active }}
                              style={[s.amenityQuickChip, active && s.amenityQuickChipActive]}
                              onPress={() => {
                                updateField(
                                  'amenities',
                                  active
                                    ? form.amenities.filter(item => item !== key)
                                    : [...form.amenities, key]
                                );
                              }}
                            >
                              {active && <Feather name="check" size={12} color={c.primaryDark} />}
                              <Text
                                style={[
                                  s.amenityQuickChipText,
                                  active && s.amenityQuickChipTextActive,
                                ]}
                              >
                                {roomAmenityLabel(key)}
                              </Text>
                            </AnimatedPressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>

              <AnimatedPressable
                scaleTo={0.98}
                style={s.amenityPickerBtn}
                accessibilityLabel={`Xem tất cả ${AMENITY_ITEMS.length} tiện nghi phòng`}
                onPress={() => setAmenitySheetOpen(true)}
              >
                <Feather name="sliders" size={16} color={c.primary} />
                <Text style={s.amenityPickerText}>
                  Xem tất cả ({AMENITY_ITEMS.length} tiện nghi)
                  {form.amenities.length > 0 ? ` · Đã chọn ${form.amenities.length}` : ''}
                </Text>
                <Feather name="chevron-right" size={16} color={c.textMuted} />
              </AnimatedPressable>
            </ExpandableSection>
          </ScrollView>

          {/* Footer CTA */}
          <View style={s.footer}>
            <PrimaryButton
              title={editing ? 'Cập nhật trong bản nháp' : 'Thêm vào bản nháp'}
              onPress={handleSubmit}
            />
          </View>
        </KeyboardAvoidingView>

        <MultiSelectChecklistSheet
          visible={amenitySheetOpen}
          title="Tiện nghi trong phòng"
          items={AMENITY_ITEMS}
          isSelected={key => form.amenities.includes(key)}
          selectedCount={form.amenities.length}
          onToggle={key => {
            const exists = form.amenities.includes(key);
            updateField(
              'amenities',
              exists ? form.amenities.filter(item => item !== key) : [...form.amenities, key]
            );
            setAmenitiesOpen(true);
          }}
          onClose={() => setAmenitySheetOpen(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function ExpandableSection({
  icon,
  title,
  subtitle,
  expanded,
  hasError,
  onToggle,
  children,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  expanded: boolean;
  hasError?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.card, hasError && s.cardError]}>
      <AnimatedPressable
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={s.accordionHeader}
        onPress={onToggle}
      >
        <View style={s.accordionIconWrap}>
          <Feather name={icon} size={16} color={c.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={s.accordionTitle}>{title}</Text>
          <Text style={s.accordionSub} numberOfLines={1}>
            {subtitle}
          </Text>
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

function FeeInputRow({
  label,
  unit,
  zeroLabel,
  value,
  placeholder,
  error,
  onChangeText,
}: {
  label: string;
  unit: string;
  zeroLabel: string;
  value: string;
  placeholder: string;
  error?: string;
  onChangeText: (v: string) => void;
}) {
  const preview = formatOptionalFeePreview(value, unit, zeroLabel);
  const isZero = value.trim() === '0';
  const isEmpty = value.trim().length === 0;
  return (
    <View style={{ gap: 6 }}>
      <AuthInput
        label={`${label} (${unit})`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType="number-pad"
        maxLength={9}
        error={error}
      />
      <View style={s.feeStatusLine}>
        <View
          style={[
            s.feeStatePill,
            isZero && s.feeStateFree,
            !isEmpty && !isZero && s.feeStateValue,
          ]}
        >
          <Text
            style={[
              s.feeStateText,
              isZero && s.feeStateFreeText,
              !isEmpty && !isZero && s.feeStateValueText,
            ]}
          >
            {preview}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 12,
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.forestInk,
  },
  headerSub: {
    fontSize: 12.5,
    color: c.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  draftHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: c.softMint,
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  draftHintText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.primaryDark,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: authRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 14,
  },
  cardError: {
    borderColor: c.error,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  pricePreview: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primary,
    marginLeft: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
  },
  accordionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  accordionSub: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  accordionBody: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 14,
  },
  feeRuleNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: c.background,
    borderRadius: authRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  feeRuleText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  feeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feeLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  feeUnit: {
    fontWeight: '400',
    color: c.textSecondary,
  },
  feeStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: authRadius.round,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  feeStateFree: {
    backgroundColor: c.softMint,
    borderColor: '#C5E3DB',
  },
  feeStateValue: {
    backgroundColor: '#F0F7F5',
    borderColor: '#C5E3DB',
  },
  feeStateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  feeStateFreeText: {
    color: c.primaryDark,
  },
  feeStateValueText: {
    color: c.primary,
  },
  charCount: {
    fontSize: 12,
    color: c.textMuted,
    textAlign: 'right',
    marginTop: -6,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.softMint,
    paddingHorizontal: 12,
  },
  photoActionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primary,
  },
  photoLimitNote: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amenityPickerBtn: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  amenityPickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
  feeStatusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -2,
  },
  amenityGroupTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  amenityQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: authRadius.round,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  amenityQuickChipActive: {
    backgroundColor: c.softMint,
    borderColor: c.primary,
  },
  amenityQuickChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  amenityQuickChipTextActive: {
    color: c.primaryDark,
    fontWeight: '700',
  },
  amenityChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  amenityChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.primaryDark,
  },
  chipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});
