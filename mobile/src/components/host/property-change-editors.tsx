import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
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
  SelectRow,
  SingleSelectSheet,
} from '@/components/host/registration-pickers';
import {
  CHANGE_DOCUMENTS,
  amenityLabelVi,
  attachmentType,
  isFieldEditable,
  propertyChangeRuleLabel,
  sectionSupplementNote,
  type ChangeDocumentKey,
  type PropertyChangeReplacementDocs,
  type PropertyChangeSectionId,
  type PropertyEditAttachment,
  type PropertyEditSnapshot,
} from '@/services/property-change';
import { hostPropertyPhotoSource } from '@/services/property-change-upload';
import {
  AMENITIES,
  PROPERTY_AREAS,
  PROPERTY_TYPES,
  RULES,
  quietHours,
  timePattern,
  type RegistrationAsset,
  type RegistrationErrors,
  type RegistrationLocationPatch,
  type RegistrationValues,
} from '@/services/property-registration';

interface SectionHeaderRowProps {
  title: string;
  subtitle: string;
  note?: string;
  canUndo: boolean;
  onUndo: () => void;
}

function SectionHeaderRow({ title, subtitle, note, canUndo, onUndo }: SectionHeaderRowProps) {
  return (
    <View style={s.sectionIntro}>
      <View style={s.rowBetween}>
        <Text accessibilityRole="header" style={s.editorTitle}>
          {title}
        </Text>
        {canUndo ? (
          <AnimatedPressable
            scaleTo={0.97}
            accessibilityLabel={`Hoàn tác thay đổi ${title}`}
            style={s.undoBtn}
            onPress={onUndo}
          >
            <Feather name="rotate-ccw" size={13} color={c.primary} />
            <Text style={s.undoText}>Hoàn tác</Text>
          </AnimatedPressable>
        ) : null}
      </View>
      <Text style={s.editorSubtitle}>{subtitle}</Text>
      {note ? (
        <View style={s.noteBanner}>
          <Feather name="alert-circle" size={15} color="#92400E" />
          <Text style={s.noteBannerText}>Ghi chú Staff: {note}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 5.1 Basic Info Editor                                                       */
/* -------------------------------------------------------------------------- */

export function PropertyChangeBasicEditor({
  snapshot,
  values,
  errors,
  hasChanges,
  busy,
  onUpdate,
  onUndo,
}: {
  snapshot: PropertyEditSnapshot;
  values: RegistrationValues;
  errors: RegistrationErrors;
  hasChanges: boolean;
  busy: boolean;
  onUpdate: <K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) => void;
  onUndo: () => void;
}) {
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const aiAssist = useDescriptionAssist(values);

  const allow = (field: string) => !busy && isFieldEditable(snapshot, field);

  return (
    <View style={s.root}>
      <SectionHeaderRow
        title="Thông tin cơ bản"
        subtitle="Thay đổi chỉ lưu trong bản nháp cho đến khi yêu cầu được phê duyệt."
        note={sectionSupplementNote(snapshot, 'basic')}
        canUndo={hasChanges && !busy}
        onUndo={onUndo}
      />

      <View style={s.card}>
        <AuthInput
          label={allow('name') ? 'Tên nhà trọ *' : 'Tên nhà trọ (Đã khóa)'}
          value={values.name}
          onChangeText={t => onUpdate('name', t)}
          error={errors.name}
          editable={allow('name')}
          maxLength={100}
        />

        <SelectRow
          label={allow('propertyType') ? 'Loại hình nhà trọ *' : 'Loại hình (Đã khóa)'}
          value={values.propertyType}
          placeholder="Chọn loại hình nhà trọ"
          error={errors.propertyType}
          onPress={() => {
            if (allow('propertyType')) setTypeSheetOpen(true);
          }}
        />

        <View style={{ gap: 6 }}>
          <View style={s.rowBetween}>
            <Text style={s.fieldLabel}>
              {allow('description') ? 'Mô tả nhà trọ *' : 'Mô tả nhà trọ (Đã khóa)'}
            </Text>
            <View style={s.aiMetaRow}>
              <Text style={s.charCount}>{values.description.length}/2000</Text>
              {allow('description') ? (
                <DescriptionAssistTrigger
                  busy={aiAssist.busy}
                  onPress={() => {
                    void aiAssist.generate();
                  }}
                />
              ) : null}
            </View>
          </View>
          <TextInput
            style={[
              s.textArea,
              !allow('description') && s.inputDisabled,
              Boolean(errors.description) && s.inputError,
            ]}
            multiline
            textAlignVertical="top"
            placeholder="Mô tả không gian, vị trí, điểm nổi bật (tối thiểu 30 ký tự)..."
            placeholderTextColor={c.textMuted}
            value={values.description}
            onChangeText={t => onUpdate('description', t)}
            editable={allow('description')}
            maxLength={2000}
          />
          <InlineError message={errors.description} />
          {allow('description') ? (
            <DescriptionAssistResult
              error={aiAssist.error}
              suggestion={aiAssist.suggestion}
              onApply={text => onUpdate('description', text)}
              onDismiss={aiAssist.dismiss}
            />
          ) : null}
        </View>

        <View style={s.divider} />

        <AuthInput
          label={allow('managerName') ? 'Người quản lý / đón khách *' : 'Người quản lý (Đã khóa)'}
          value={values.managerName}
          onChangeText={t => onUpdate('managerName', t)}
          error={errors.managerName}
          editable={allow('managerName')}
          maxLength={100}
        />

        <AuthInput
          label={allow('contactPhone') ? 'Hotline liên hệ *' : 'Hotline (Đã khóa)'}
          value={values.contactPhone}
          onChangeText={t => onUpdate('contactPhone', t)}
          error={errors.contactPhone}
          keyboardType="phone-pad"
          editable={allow('contactPhone')}
          maxLength={20}
        />

        <AuthInput
          label={allow('zaloPhone') ? 'Zalo liên hệ (tùy chọn)' : 'Zalo (Đã khóa)'}
          value={values.zaloPhone}
          onChangeText={t => onUpdate('zaloPhone', t)}
          error={errors.zaloPhone}
          keyboardType="phone-pad"
          editable={allow('zaloPhone')}
          maxLength={20}
        />
      </View>

      <SingleSelectSheet
        visible={typeSheetOpen}
        title="Chọn loại hình nhà trọ"
        options={PROPERTY_TYPES.map(item => ({ key: item, label: item }))}
        selectedValue={values.propertyType}
        onClose={() => setTypeSheetOpen(false)}
        onSelect={val => onUpdate('propertyType', val)}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 5.2 Location Editor                                                         */
/* -------------------------------------------------------------------------- */

export function PropertyChangeLocationEditor({
  snapshot,
  baseline,
  values,
  errors,
  hasChanges,
  busy,
  onUpdate,
  onPatch,
  onUndo,
}: {
  snapshot: PropertyEditSnapshot;
  baseline: RegistrationValues;
  values: RegistrationValues;
  errors: RegistrationErrors;
  hasChanges: boolean;
  busy: boolean;
  onUpdate: <K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) => void;
  onPatch: (patch: Partial<RegistrationValues>) => void;
  onUndo: () => void;
}) {
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] =
    useState<Pick<RegistrationLocationPatch, 'addressDetail' | 'commune' | 'nearby'> | null>(null);

  const allow = (field: string) => !busy && isFieldEditable(snapshot, field);
  const canMap = allow('latitude') && allow('longitude');
  const currentCoords =
    baseline.latitude && baseline.longitude
      ? `${Number(baseline.latitude).toFixed(5)}, ${Number(baseline.longitude).toFixed(5)}`
      : null;
  const proposedCoords =
    values.latitude && values.longitude
      ? `${Number(values.latitude).toFixed(5)}, ${Number(values.longitude).toFixed(5)}`
      : null;

  return (
    <View style={s.root}>
      <SectionHeaderRow
        title="Vị trí nhà trọ"
        subtitle="Không cần ghim lại bản đồ nếu bạn không thay đổi vị trí. Đổi địa chỉ hoặc ghim sẽ kích hoạt tái xác minh."
        note={sectionSupplementNote(snapshot, 'location')}
        canUndo={hasChanges && !busy}
        onUndo={onUndo}
      />

      <View style={s.card}>
        <AuthInput
          label={allow('addressDetail') ? 'Địa chỉ chi tiết *' : 'Địa chỉ chi tiết (Đã khóa)'}
          value={values.addressDetail}
          onChangeText={t => onUpdate('addressDetail', t)}
          error={errors.addressDetail}
          editable={allow('addressDetail')}
          maxLength={255}
        />

        <SelectRow
          label={allow('commune') ? 'Khu vực Hòa Lạc *' : 'Khu vực (Đã khóa)'}
          value={values.commune}
          placeholder="Chọn khu vực"
          error={errors.commune}
          onPress={() => {
            if (allow('commune')) setAreaSheetOpen(true);
          }}
        />

        <AuthInput
          label={allow('nearby') ? 'Địa điểm gần nhà trọ (tùy chọn)' : 'Địa điểm gần (Đã khóa)'}
          value={values.nearby}
          onChangeText={t => onUpdate('nearby', t)}
          error={errors.nearby}
          editable={allow('nearby')}
          maxLength={255}
        />

        <View style={s.mapCard}>
          <View style={{ gap: 4 }}>
            <Text style={s.mapTitle}>Ghim tọa độ bản đồ</Text>
            {currentCoords ? (
              <Text style={s.mapMeta}>Hiện tại: {currentCoords}</Text>
            ) : (
              <Text style={s.mapMeta}>Hiện tại: Chưa ghim tọa độ</Text>
            )}
            {proposedCoords && proposedCoords !== currentCoords ? (
              <Text style={[s.mapMeta, { color: c.primary, fontWeight: '700' }]}>
                Đề nghị mới: {proposedCoords}
              </Text>
            ) : null}
          </View>

          <View style={s.mapBtnRow}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={!canMap}
              style={[s.mapPrimaryBtn, !canMap && { opacity: 0.5 }]}
              onPress={() => setMapOpen(true)}
            >
              <Feather name="map-pin" size={15} color="#FFFFFF" />
              <Text style={s.mapPrimaryText}>Chọn vị trí trên bản đồ</Text>
            </AnimatedPressable>
            {canMap && (values.latitude || values.longitude) ? (
              <AnimatedPressable
                scaleTo={0.98}
                style={s.mapGhostBtn}
                onPress={() => onPatch({ latitude: '', longitude: '' })}
              >
                <Text style={s.mapGhostText}>Bỏ ghim</Text>
              </AnimatedPressable>
            ) : null}
          </View>

          <InlineError message={errors.latitude || errors.longitude} />
        </View>

        {pendingSuggestion ? (
          <View style={s.noteBanner}>
            <Feather name="map-pin" size={15} color={c.primary} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[s.noteBannerText, { color: c.forestInk }]}>
                Địa chỉ gợi ý từ ghim mới:{' '}
                {[pendingSuggestion.addressDetail, pendingSuggestion.commune]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
              <View style={s.mapBtnRow}>
                <AnimatedPressable
                  scaleTo={0.98}
                  style={s.mapPrimaryBtn}
                  onPress={() => {
                    const nextPatch: Partial<RegistrationValues> = {};
                    if (pendingSuggestion.addressDetail && allow('addressDetail')) {
                      nextPatch.addressDetail = pendingSuggestion.addressDetail;
                    }
                    if (
                      pendingSuggestion.commune &&
                      PROPERTY_AREAS.includes(pendingSuggestion.commune) &&
                      allow('commune')
                    ) {
                      nextPatch.commune = pendingSuggestion.commune;
                    }
                    if (pendingSuggestion.nearby && allow('nearby')) {
                      nextPatch.nearby = pendingSuggestion.nearby;
                    }
                    onPatch(nextPatch);
                    setPendingSuggestion(null);
                  }}
                >
                  <Text style={s.mapPrimaryText}>Áp dụng địa chỉ</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  scaleTo={0.98}
                  style={s.mapGhostBtn}
                  onPress={() => setPendingSuggestion(null)}
                >
                  <Text style={s.mapGhostText}>Giữ địa chỉ cũ</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <SingleSelectSheet
        visible={areaSheetOpen}
        title="Chọn khu vực Hòa Lạc"
        options={PROPERTY_AREAS.map(item => ({ key: item, label: item }))}
        selectedValue={values.commune}
        onClose={() => setAreaSheetOpen(false)}
        onSelect={val => onUpdate('commune', val)}
      />

      {mapOpen ? (
        <LocationSheet
          values={values}
          onClose={() => setMapOpen(false)}
          onApply={location => {
            // Update coordinates in draft; never silently overwrite user's typed address without confirmation
            onPatch({
              latitude: location.latitude,
              longitude: location.longitude,
            });
            const hasAddressDiff = Boolean(
              (location.addressDetail && location.addressDetail !== values.addressDetail) ||
                (location.commune && location.commune !== values.commune) ||
                (location.nearby && location.nearby !== values.nearby)
            );
            setPendingSuggestion(
              hasAddressDiff
                ? {
                    addressDetail: location.addressDetail,
                    commune: location.commune,
                    nearby: location.nearby,
                  }
                : null
            );
            setMapOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 5.3 Amenities & Rules Editor                                                */
/* -------------------------------------------------------------------------- */

export function PropertyChangeAmenitiesEditor({
  snapshot,
  values,
  errors,
  hasChanges,
  busy,
  onUpdate,
  onUndo,
}: {
  snapshot: PropertyEditSnapshot;
  values: RegistrationValues;
  errors: RegistrationErrors;
  hasChanges: boolean;
  busy: boolean;
  onUpdate: <K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) => void;
  onUndo: () => void;
}) {
  const [picker, setPicker] = useState<'amenities' | 'rules' | null>(null);
  const canAmenities = !busy && isFieldEditable(snapshot, 'amenities');
  const canRules = !busy && isFieldEditable(snapshot, 'selectedRules');
  const canCustomRules = !busy && isFieldEditable(snapshot, 'rules');

  const quietRule = values.selectedRules.find(item => quietHours.test(item));
  const quietTime = quietRule?.match(quietHours)?.[1] || '23:00';

  const setQuietTime = (text: string) => {
    const cleaned = text.replace(/[^0-9:]/g, '').slice(0, 5);
    const next = values.selectedRules.filter(item => !quietHours.test(item));
    next.push(cleaned ? `quietHours:${cleaned}` : 'quietHours');
    onUpdate('selectedRules', next);
  };

  return (
    <View style={s.root}>
      <SectionHeaderRow
        title="Tiện ích & Quy định"
        subtitle="Chọn tiện ích chung và nội quy nhà trọ. Mọi thay đổi chỉ áp dụng khi yêu cầu được duyệt."
        note={sectionSupplementNote(snapshot, 'amenities')}
        canUndo={hasChanges && !busy}
        onUndo={onUndo}
      />

      <View style={s.card}>
        <SelectRow
          label={canAmenities ? 'Tiện ích chung' : 'Tiện ích chung (Đã khóa)'}
          value={values.amenities.length ? `Đã chọn ${values.amenities.length} tiện ích` : ''}
          placeholder="Chạm để chọn tiện ích"
          error={errors.amenities}
          onPress={() => {
            if (canAmenities) setPicker('amenities');
          }}
        />

        {values.amenities.length > 0 ? (
          <View style={s.tagWrap}>
            {values.amenities.map(id => (
              <View key={id} style={s.tagChip}>
                <Text style={s.tagChipText}>{amenityLabelVi(id)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.divider} />

        <SelectRow
          label={canRules ? 'Quy định nhà trọ' : 'Quy định nhà trọ (Đã khóa)'}
          value={
            values.selectedRules.length ? `Đã chọn ${values.selectedRules.length} quy định` : ''
          }
          placeholder="Chạm để chọn quy định"
          error={errors.selectedRules}
          onPress={() => {
            if (canRules) setPicker('rules');
          }}
        />

        {values.selectedRules.length > 0 ? (
          <View style={s.tagWrap}>
            {values.selectedRules.map(id => (
              <View key={id} style={s.tagChip}>
                <Text style={s.tagChipText}>{propertyChangeRuleLabel(id)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {quietRule ? (
          <View style={{ gap: 6 }}>
            <Text style={s.fieldLabel}>Giờ bắt đầu giữ trật tự (HH:mm)</Text>
            <TextInput
              style={[
                s.quietInput,
                Boolean(quietTime && !timePattern.test(quietTime)) && s.inputError,
              ]}
              value={quietTime}
              onChangeText={setQuietTime}
              placeholder="23:00"
              maxLength={5}
              editable={canRules}
            />
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={s.fieldLabel}>
            {canCustomRules ? 'Nội quy bổ sung (tùy chọn)' : 'Nội quy bổ sung (Đã khóa)'}
          </Text>
          <TextInput
            style={[s.textArea, !canCustomRules && s.inputDisabled]}
            multiline
            textAlignVertical="top"
            placeholder="Nhập nội quy bổ sung nếu có..."
            placeholderTextColor={c.textMuted}
            value={values.rules}
            onChangeText={t => onUpdate('rules', t)}
            editable={canCustomRules}
            maxLength={2000}
          />
          <InlineError message={errors.rules} />
        </View>
      </View>

      <MultiSelectChecklistSheet
        visible={picker === 'amenities'}
        title="Chọn tiện ích chung"
        items={AMENITIES}
        selectedCount={values.amenities.length}
        isSelected={key => values.amenities.includes(key)}
        onToggle={key =>
          onUpdate(
            'amenities',
            values.amenities.includes(key)
              ? values.amenities.filter(item => item !== key)
              : [...values.amenities, key]
          )
        }
        onClose={() => setPicker(null)}
      />

      <MultiSelectChecklistSheet
        visible={picker === 'rules'}
        title="Chọn quy định nhà trọ"
        items={RULES}
        selectedCount={values.selectedRules.length}
        isSelected={key =>
          key === 'quietHours'
            ? values.selectedRules.some(item => quietHours.test(item))
            : values.selectedRules.includes(key)
        }
        onToggle={key => {
          if (key === 'quietHours') {
            const exists = values.selectedRules.some(item => quietHours.test(item));
            onUpdate(
              'selectedRules',
              exists
                ? values.selectedRules.filter(item => !quietHours.test(item))
                : [...values.selectedRules, 'quietHours:23:00']
            );
          } else {
            onUpdate(
              'selectedRules',
              values.selectedRules.includes(key)
                ? values.selectedRules.filter(item => item !== key)
                : [...values.selectedRules, key]
            );
          }
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 5.4 Photos Editor (2-column grid with public/added/removed/cover states)   */
/* -------------------------------------------------------------------------- */

export function PropertyChangePhotosEditor({
  snapshot,
  token,
  originalPhotos,
  retainedPhotoIds,
  newPhotos,
  error,
  hasChanges,
  busy,
  onPickPhotos,
  onToggleRetain,
  onRemoveNewPhoto,
  onPromoteNewPhoto,
  onUndo,
}: {
  snapshot: PropertyEditSnapshot;
  token: string;
  originalPhotos: readonly PropertyEditAttachment[];
  retainedPhotoIds: readonly number[];
  newPhotos: readonly RegistrationAsset[];
  error?: string;
  hasChanges: boolean;
  busy: boolean;
  onPickPhotos: (source: 'camera' | 'library') => void;
  onToggleRetain: (documentId: number) => void;
  onRemoveNewPhoto: (index: number) => void;
  onPromoteNewPhoto: (index: number) => void;
  onUndo: () => void;
}) {
  const [viewerSource, setViewerSource] = useState<
    { uri: string; headers?: Record<string, string> } | null
  >(null);
  const canEdit = !busy && isFieldEditable(snapshot, 'photos');
  const totalCount = retainedPhotoIds.length + newPhotos.length;
  const firstRetainedId = originalPhotos.find(p => retainedPhotoIds.includes(p.documentId))?.documentId;

  return (
    <View style={s.root}>
      <SectionHeaderRow
        title="Hình ảnh nhà trọ"
        subtitle="Đánh dấu xóa không xóa ảnh thật ngay trên máy chủ. Tổng cộng 1–10 ảnh (JPG, PNG, WebP ≤ 5 MB)."
        note={sectionSupplementNote(snapshot, 'photos')}
        canUndo={hasChanges && !busy}
        onUndo={onUndo}
      />

      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>Bộ ảnh ({totalCount}/10)</Text>
          <Text style={s.photoMeta}>
            Giữ {retainedPhotoIds.length} · Thêm {newPhotos.length}
          </Text>
        </View>

        {canEdit ? (
          <View style={s.photoBtnRow}>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={totalCount >= 10}
              style={[s.photoBtn, totalCount >= 10 && { opacity: 0.45 }]}
              onPress={() => onPickPhotos('camera')}
            >
              <Feather name="camera" size={15} color={c.primary} />
              <Text style={s.photoBtnText}>Chụp ảnh</Text>
            </AnimatedPressable>
            <AnimatedPressable
              scaleTo={0.98}
              disabled={totalCount >= 10}
              style={[s.photoBtn, totalCount >= 10 && { opacity: 0.45 }]}
              onPress={() => onPickPhotos('library')}
            >
              <Feather name="image" size={15} color={c.primary} />
              <Text style={s.photoBtnText}>Chọn thư viện</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        <InlineError message={error} />

        {/* 2-Column Photo Grid */}
        <View style={s.photoGrid2Col}>
          {originalPhotos.map(photo => {
            const isKept = retainedPhotoIds.includes(photo.documentId);
            const isExpectedCover = isKept && firstRetainedId === photo.documentId;
            const src = hostPropertyPhotoSource(photo.documentId, token);

            return (
              <View key={`orig-${photo.documentId}`} style={s.photoTile}>
                <Pressable
                  accessibilityLabel={`Xem ảnh ${photo.fileName || photo.documentId}`}
                  style={s.photoImgWrap}
                  onPress={() => setViewerSource(src)}
                >
                  <Image
                    source={src}
                    style={[s.photoImg, !isKept && { opacity: 0.38 }]}
                    contentFit="cover"
                  />
                  <View
                    style={[
                      s.photoBadge,
                      !isKept
                        ? { backgroundColor: 'rgba(185, 28, 28, 0.9)' }
                        : isExpectedCover
                          ? { backgroundColor: 'rgba(8, 127, 114, 0.92)' }
                          : { backgroundColor: 'rgba(20, 45, 41, 0.78)' },
                    ]}
                  >
                    <Text style={s.photoBadgeText}>
                      {!isKept
                        ? 'Đề nghị xóa'
                        : isExpectedCover
                          ? 'Ảnh đại diện dự kiến'
                          : 'Đang công khai'}
                    </Text>
                  </View>
                </Pressable>

                {canEdit ? (
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={[s.tileActionBtn, !isKept && s.tileUndoBtn]}
                    onPress={() => onToggleRetain(photo.documentId)}
                  >
                    <Feather
                      name={isKept ? 'trash-2' : 'rotate-ccw'}
                      size={13}
                      color={isKept ? c.error : c.primary}
                    />
                    <Text style={[s.tileActionText, { color: isKept ? c.error : c.primary }]}>
                      {isKept ? 'Đề nghị xóa' : 'Hoàn tác giữ lại'}
                    </Text>
                  </AnimatedPressable>
                ) : null}
              </View>
            );
          })}

          {newPhotos.map((asset, index) => {
            const isExpectedCover = !firstRetainedId && index === 0;
            return (
              <View key={`new-${asset.uri}-${index}`} style={s.photoTile}>
                <Pressable
                  accessibilityLabel={`Xem ảnh mới ${index + 1}`}
                  style={s.photoImgWrap}
                  onPress={() => setViewerSource({ uri: asset.uri })}
                >
                  <Image source={{ uri: asset.uri }} style={s.photoImg} contentFit="cover" />
                  <View style={[s.photoBadge, { backgroundColor: 'rgba(8, 127, 114, 0.92)' }]}>
                    <Text style={s.photoBadgeText}>
                      {isExpectedCover ? 'Ảnh đại diện dự kiến' : 'Đề nghị thêm'}
                    </Text>
                  </View>
                </Pressable>

                {canEdit ? (
                  <View style={s.newTileActions}>
                    {index > 0 ? (
                      <AnimatedPressable
                        scaleTo={0.97}
                        style={s.tileSmallBtn}
                        onPress={() => onPromoteNewPhoto(index)}
                      >
                        <Text style={s.tileSmallBtnText}>Lên đầu</Text>
                      </AnimatedPressable>
                    ) : null}
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={[s.tileSmallBtn, { borderColor: '#FECACA' }]}
                      onPress={() => onRemoveNewPhoto(index)}
                    >
                      <Text style={[s.tileSmallBtnText, { color: c.error }]}>Bỏ ảnh</Text>
                    </AnimatedPressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {/* Full-Screen Photo Lightbox Modal */}
      {viewerSource ? (
        <Modal transparent animationType="fade" onRequestClose={() => setViewerSource(null)}>
          <View style={s.lightbox}>
            <Pressable style={s.lightboxClose} onPress={() => setViewerSource(null)}>
              <Feather name="x" size={22} color="#FFFFFF" />
            </Pressable>
            <Image source={viewerSource} style={s.lightboxImg} contentFit="contain" />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 5.5 Verification Documents Editor                                           */
/* -------------------------------------------------------------------------- */

export function PropertyChangeDocumentsEditor({
  snapshot,
  existingDocuments,
  replacements,
  errors,
  hasChanges,
  busy,
  onPickDocument,
  onClearReplacement,
  onUndo,
}: {
  snapshot: PropertyEditSnapshot;
  existingDocuments: readonly PropertyEditAttachment[];
  replacements: PropertyChangeReplacementDocs;
  errors: RegistrationErrors;
  hasChanges: boolean;
  busy: boolean;
  onPickDocument: (key: ChangeDocumentKey, source: 'file' | 'camera' | 'library') => void;
  onClearReplacement: (key: ChangeDocumentKey) => void;
  onUndo: () => void;
}) {
  return (
    <View style={s.root}>
      <SectionHeaderRow
        title="Hồ sơ xác minh"
        subtitle="Không cần tải lại giấy tờ cũ nếu không thay đổi. Tài liệu được lưu riêng tư, không hiển thị công khai."
        note={sectionSupplementNote(snapshot, 'documents')}
        canUndo={hasChanges && !busy}
        onUndo={onUndo}
      />

      <View style={s.privacyNote}>
        <Feather name="lock" size={15} color={c.primary} />
        <Text style={s.privacyNoteText}>
          Chỉ chủ trọ và nhân viên thẩm định được cấp quyền mới có thể xử lý hồ sơ xác minh này.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {CHANGE_DOCUMENTS.map(([key, type, label]) => {
          const existing = existingDocuments.find(doc => attachmentType(doc) === type);
          const replacement = replacements[key];
          const canEdit = !busy && isFieldEditable(snapshot, type);
          const fieldNote = snapshot.status === 'NEEDS_SUPPLEMENT' ? snapshot.fieldNotes?.[type] : undefined;

          return (
            <View
              key={key}
              style={[s.docCard, Boolean(errors[key]) && { borderColor: c.error }]}
            >
              <View style={s.rowBetween}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.docTitle}>{label}</Text>
                  <Text style={s.docMeta}>
                    {replacement
                      ? `Tệp đề nghị thay: ${replacement.fileName || 'Tệp mới'}`
                      : existing?.fileName
                        ? `Đang lưu bảo mật: ${existing.fileName}`
                        : 'Chưa đính kèm tài liệu'}
                  </Text>
                </View>
                <View
                  style={[
                    s.docStatusPill,
                    replacement
                      ? { backgroundColor: '#E6F4F1' }
                      : existing
                        ? { backgroundColor: '#F1F5F3' }
                        : { backgroundColor: '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      s.docStatusText,
                      replacement
                        ? { color: '#06665C' }
                        : existing
                          ? { color: c.textSecondary }
                          : { color: '#92400E' },
                    ]}
                  >
                    {replacement ? 'Sẽ thay mới' : existing ? 'Giữ nguyên' : 'Chưa có'}
                  </Text>
                </View>
              </View>

              {fieldNote ? (
                <Text style={s.docFieldNote}>Ghi chú Staff: {fieldNote}</Text>
              ) : null}

              {canEdit ? (
                <View style={s.docBtnRow}>
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.docActionBtn}
                    onPress={() => onPickDocument(key, 'file')}
                  >
                    <Feather name="file-plus" size={14} color={c.primary} />
                    <Text style={s.docActionText}>Chọn PDF/Tệp</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.docActionBtn}
                    onPress={() => onPickDocument(key, 'camera')}
                  >
                    <Feather name="camera" size={14} color={c.primary} />
                    <Text style={s.docActionText}>Chụp ảnh</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    scaleTo={0.98}
                    style={s.docActionBtn}
                    onPress={() => onPickDocument(key, 'library')}
                  >
                    <Feather name="image" size={14} color={c.primary} />
                    <Text style={s.docActionText}>Thư viện</Text>
                  </AnimatedPressable>
                </View>
              ) : (
                <View style={s.lockedRow}>
                  <Feather name="lock" size={13} color={c.textMuted} />
                  <Text style={s.lockedText}>Tài liệu này không thuộc phạm vi cần sửa.</Text>
                </View>
              )}

              {replacement && canEdit ? (
                <AnimatedPressable
                  scaleTo={0.98}
                  style={s.keepOldBtn}
                  onPress={() => onClearReplacement(key)}
                >
                  <Feather name="rotate-ccw" size={13} color={c.textSecondary} />
                  <Text style={s.keepOldText}>Hoàn tác — giữ tài liệu hiện tại</Text>
                </AnimatedPressable>
              ) : null}

              <InlineError message={errors[key]} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

export type ActiveEditorSection = PropertyChangeSectionId;

const s = StyleSheet.create({
  root: {
    gap: 12,
  },
  sectionIntro: {
    gap: 5,
    paddingHorizontal: 2,
  },
  editorTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: c.forestInk,
  },
  editorSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: c.textSecondary,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  undoText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 10,
    borderRadius: 11,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  noteBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#92400E',
    fontWeight: '500',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: c.border,
    gap: 13,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
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
    minHeight: 110,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: c.forestInk,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputError: {
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
    padding: 13,
    gap: 10,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.forestInk,
  },
  mapMeta: {
    fontSize: 12.5,
    lineHeight: 18,
    color: c.textSecondary,
  },
  mapBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mapPrimaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
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
  mapGhostBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  tagChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.primary,
  },
  quietInput: {
    width: 120,
    height: 44,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.background,
    paddingHorizontal: 12,
    fontSize: 15,
    color: c.forestInk,
  },
  photoMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
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
  photoGrid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoTile: {
    width: '48%',
    gap: 6,
  },
  photoImgWrap: {
    width: '100%',
    aspectRatio: 1.15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: c.background,
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tileActionBtn: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tileUndoBtn: {
    borderColor: '#B5DFD6',
    backgroundColor: c.softMint,
  },
  tileActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  newTileActions: {
    flexDirection: 'row',
    gap: 6,
  },
  tileSmallBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  lightboxImg: {
    width: '100%',
    height: '78%',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 13,
    backgroundColor: c.softMint,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: c.forestInk,
  },
  docCard: {
    backgroundColor: c.surface,
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  docTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  docMeta: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  docStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: authRadius.round,
  },
  docStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  docFieldNote: {
    fontSize: 12.5,
    color: '#92400E',
    fontWeight: '500',
  },
  docBtnRow: {
    flexDirection: 'row',
    gap: 7,
  },
  docActionBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  docActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  keepOldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
  },
  keepOldText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedText: {
    fontSize: 12.5,
    color: c.textMuted,
  },
});
