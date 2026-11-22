import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { LocationSheet, RegistrationSheet } from '@/components/host/registration-assist';
import {
  MultiSelectChecklistSheet,
  PhotoThumbnailTile,
  SelectRow,
  SingleSelectSheet,
} from '@/components/host/registration-pickers';
import { tokenStore } from '@/services/auth';
import {
  fieldLabelVi,
  type OnboardingEditSnapshot,
  type OnboardingRegistrationView,
} from '@/services/host-onboarding';
import {
  fetchOnboardingEditSnapshot,
  onboardingPhotoSource,
  resubmitOnboardingSupplement,
  type SupplementFiles,
} from '@/services/host-onboarding-upload';
import {
  AMENITIES,
  PROPERTY_AREAS,
  PROPERTY_TYPES,
  RULES,
  quietHours,
  type RegistrationAsset,
  type RegistrationValues,
} from '@/services/property-registration';
import { checkRegistrationAsset } from '@/services/registration-upload';

interface OnboardingSupplementSheetProps {
  visible: boolean;
  registrationId: number;
  onClose: () => void;
  onResubmitted: (updated: OnboardingRegistrationView) => void;
}

export function OnboardingSupplementSheet(props: OnboardingSupplementSheetProps) {
  if (!props.visible) return null;
  return <OnboardingSupplementSheetContent {...props} />;
}

function OnboardingSupplementSheetContent({
  registrationId,
  onClose,
  onResubmitted,
}: OnboardingSupplementSheetProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<OnboardingEditSnapshot | null>(null);
  const [token, setToken] = useState('');

  const [values, setValues] = useState<RegistrationValues | null>(null);
  const [retainedPhotoIds, setRetainedPhotoIds] = useState<number[]>([]);
  const [newPhotos, setNewPhotos] = useState<RegistrationAsset[]>([]);
  const [docs, setDocs] = useState<Omit<SupplementFiles, 'photos'>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [picker, setPicker] = useState<'type' | 'area' | 'amenities' | 'rules' | 'map' | null>(
    null
  );
  const submitLock = useRef(false);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      try {
        const authToken = await tokenStore.get();
        if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn.');
        const data = await fetchOnboardingEditSnapshot(registrationId, authToken, controller.signal);
        if (ignore) return;
        setToken(authToken);
        setSnapshot(data);
        setValues({
          ...data.details,
          latitude: data.details.latitude != null ? String(data.details.latitude) : '',
          longitude: data.details.longitude != null ? String(data.details.longitude) : '',
          amenities: Array.isArray(data.details.amenities) ? data.details.amenities : [],
          selectedRules: Array.isArray(data.details.selectedRules) ? data.details.selectedRules : [],
          termsAccepted: true,
        });
        setRetainedPhotoIds(data.photos.map(item => item.documentId));
        setLoadError(null);
      } catch (cause) {
        if (!ignore && !controller.signal.aborted) {
          setLoadError(
            cause instanceof Error ? cause.message : 'Chưa tải được hồ sơ để bổ sung.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [registrationId]);

  const editable = new Set(snapshot?.editableFields || []);
  const canEdit = (field: string) =>
    !snapshot || snapshot.legacyScope || editable.size === 0 || editable.has(field);

  const updateField = <K extends keyof RegistrationValues>(key: K, val: RegistrationValues[K]) => {
    setValues(prev => (prev ? { ...prev, [key]: val } : prev));
    setSubmitError(null);
  };

  const pickSupplementPhotos = async () => {
    const remaining = 10 - (retainedPhotoIds.length + newPhotos.length);
    if (remaining <= 0) {
      setSubmitError('Tối đa 10 ảnh nhà trọ.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85,
      });
      if (result.canceled) return;
      const checked: RegistrationAsset[] = [];
      for (const item of result.assets.slice(0, remaining)) {
        checked.push(
          await checkRegistrationAsset(
            { uri: item.uri, fileName: item.fileName, mimeType: item.mimeType, fileSize: item.fileSize },
            false
          )
        );
      }
      setNewPhotos(prev => [...prev, ...checked].slice(0, 10 - retainedPhotoIds.length));
      setSubmitError(null);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Không thể chọn ảnh.');
    }
  };

  const pickSupplementDoc = async (key: 'ownership' | 'fireSafety' | 'idCard' | 'idCardBack') => {
    try {
      const isIdentity = key === 'idCard' || key === 'idCardBack';
      if (isIdentity) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        const checked = await checkRegistrationAsset(
          { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, fileSize: asset.fileSize },
          false
        );
        if (checked.mimeType !== 'image/jpeg' && checked.mimeType !== 'image/png') {
          throw new Error('Ảnh CCCD chỉ hỗ trợ định dạng JPG hoặc PNG.');
        }
        setDocs(prev => ({ ...prev, [key]: checked }));
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        const checked = await checkRegistrationAsset(
          { uri: asset.uri, fileName: asset.name, mimeType: asset.mimeType, fileSize: asset.size },
          true
        );
        setDocs(prev => ({ ...prev, [key]: checked }));
      }
      setSubmitError(null);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Không thể chọn tệp đính kèm.');
    }
  };

  const handleSubmit = async () => {
    if (submitLock.current || !snapshot || !values) return;
    const totalPhotos = retainedPhotoIds.length + newPhotos.length;
    if (canEdit('photos') && totalPhotos < 1) {
      setSubmitError('Cần giữ hoặc tải lên ít nhất 1 ảnh nhà trọ.');
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const authToken = await tokenStore.get();
      if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      const updated = await resubmitOnboardingSupplement(
        registrationId,
        {
          details: { ...values, termsAccepted: true },
          versionToken: snapshot.versionToken,
          retainedPhotoIds,
        },
        {
          photos: newPhotos,
          ...docs,
        },
        authToken
      );
      onResubmitted(updated);
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : 'Chưa thể gửi hồ sơ bổ sung. Vui lòng thử lại.'
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const docLabels: readonly (readonly ['ownership' | 'fireSafety' | 'idCard' | 'idCardBack', string])[] = [
    ['idCard', 'CCCD mặt trước (JPG/PNG)'],
    ['idCardBack', 'CCCD mặt sau (JPG/PNG)'],
    ['ownership', 'Giấy phép kinh doanh (PDF/Ảnh)'],
    ['fireSafety', 'Chứng nhận an toàn PCCC (PDF/Ảnh)'],
  ];

  const showBasic =
    canEdit('name') ||
    canEdit('propertyType') ||
    canEdit('description') ||
    canEdit('managerName') ||
    canEdit('contactPhone') ||
    canEdit('zaloPhone');
  const showLocation =
    canEdit('addressDetail') ||
    canEdit('commune') ||
    canEdit('nearby') ||
    canEdit('latitude') ||
    canEdit('longitude') ||
    canEdit('location');
  const showAmenitiesRules = canEdit('amenities') || canEdit('rules') || canEdit('selectedRules');
  const editableDocs = docLabels.filter(([key]) => canEdit(key));

  return (
    <RegistrationSheet
      title="Bổ sung hồ sơ thẩm định"
      onClose={() => !submitting && onClose()}
      footer={
        snapshot && values ? (
          <PrimaryButton
            title="Gửi bổ sung xét duyệt"
            loading={submitting}
            disabled={submitting}
            onPress={() => {
              void handleSubmit();
            }}
          />
        ) : undefined
      }
    >
      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={s.loadingText}>Đang tải chi tiết hồ sơ cần bổ sung...</Text>
        </View>
      ) : loadError || !snapshot || !values ? (
        <View style={s.centerBox}>
          <InlineError message={loadError || 'Không tìm thấy dữ liệu hồ sơ.'} />
          <PrimaryButton title="Đóng" onPress={onClose} />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {snapshot.reasonNote ? (
            <View style={s.reasonBox}>
              <Text style={s.reasonTitle}>Yêu cầu từ nhân viên thẩm định</Text>
              <Text style={s.reasonBody}>{snapshot.reasonNote}</Text>
              {snapshot.requestedFields.length > 0 ? (
                <Text style={s.reasonFields}>
                  Mục cần sửa: {snapshot.requestedFields.map(fieldLabelVi).join(', ')}
                </Text>
              ) : null}
            </View>
          ) : null}

          <InlineError message={submitError} />

          {showBasic ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Thông tin cơ bản</Text>
              {canEdit('name') ? (
                <AuthInput
                  label="Tên nhà trọ"
                  value={values.name}
                  onChangeText={t => updateField('name', t)}
                  editable={!submitting}
                />
              ) : null}
              {canEdit('propertyType') ? (
                <SelectRow
                  label="Loại hình"
                  value={values.propertyType}
                  placeholder="Chọn loại hình"
                  onPress={() => setPicker('type')}
                />
              ) : null}
              {canEdit('description') ? (
                <View style={{ gap: 6 }}>
                  <Text style={s.fieldLabel}>Mô tả nhà trọ</Text>
                  <TextInput
                    style={s.textArea}
                    multiline
                    textAlignVertical="top"
                    value={values.description}
                    onChangeText={t => updateField('description', t)}
                    editable={!submitting}
                    maxLength={2000}
                  />
                </View>
              ) : null}
              {canEdit('managerName') ? (
                <AuthInput
                  label="Người đón khách"
                  value={values.managerName}
                  onChangeText={t => updateField('managerName', t)}
                  editable={!submitting}
                />
              ) : null}
              {canEdit('contactPhone') ? (
                <AuthInput
                  label="Số hotline"
                  value={values.contactPhone}
                  onChangeText={t => updateField('contactPhone', t)}
                  keyboardType="phone-pad"
                  editable={!submitting}
                />
              ) : null}
              {canEdit('zaloPhone') ? (
                <AuthInput
                  label="Số Zalo (tùy chọn)"
                  value={values.zaloPhone}
                  onChangeText={t => updateField('zaloPhone', t)}
                  keyboardType="phone-pad"
                  editable={!submitting}
                />
              ) : null}
            </View>
          ) : null}

          {showLocation ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Vị trí nhà trọ</Text>
              {canEdit('addressDetail') ? (
                <AuthInput
                  label="Địa chỉ chi tiết"
                  value={values.addressDetail}
                  onChangeText={t => updateField('addressDetail', t)}
                  editable={!submitting}
                />
              ) : null}
              {canEdit('commune') ? (
                <SelectRow
                  label="Khu vực Hòa Lạc"
                  value={values.commune}
                  placeholder="Chọn khu vực"
                  onPress={() => setPicker('area')}
                />
              ) : null}
              {canEdit('nearby') ? (
                <AuthInput
                  label="Địa điểm lân cận"
                  value={values.nearby}
                  onChangeText={t => updateField('nearby', t)}
                  editable={!submitting}
                />
              ) : null}
              <AnimatedPressable
                scaleTo={0.98}
                style={s.outlineBtn}
                onPress={() => setPicker('map')}
              >
                <Feather name="map-pin" size={16} color={c.primary} />
                <Text style={s.outlineBtnText}>
                  {values.latitude && values.longitude
                    ? `Đã ghim tọa độ (${Number(values.latitude).toFixed(4)}, ${Number(values.longitude).toFixed(4)})`
                    : 'Cập nhật ghim vị trí bản đồ'}
                </Text>
              </AnimatedPressable>
            </View>
          ) : null}

          {showAmenitiesRules ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Tiện ích & Quy định</Text>
              {canEdit('amenities') ? (
                <SelectRow
                  label="Tiện ích"
                  value={
                    values.amenities.length
                      ? `Đã chọn ${values.amenities.length} tiện ích`
                      : ''
                  }
                  placeholder="Chọn tiện ích nhà trọ"
                  onPress={() => setPicker('amenities')}
                />
              ) : null}
              {canEdit('rules') || canEdit('selectedRules') ? (
                <>
                  <SelectRow
                    label="Quy định nhà trọ"
                    value={
                      values.selectedRules.length
                        ? `Đã chọn ${values.selectedRules.length} quy định`
                        : ''
                    }
                    placeholder="Chọn quy định"
                    onPress={() => setPicker('rules')}
                  />
                  <TextInput
                    style={s.textArea}
                    multiline
                    textAlignVertical="top"
                    placeholder="Quy định bổ sung khác (tùy chọn)"
                    value={values.rules}
                    onChangeText={t => updateField('rules', t)}
                    editable={!submitting}
                    maxLength={2000}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          {canEdit('photos') ? (
            <View style={s.section}>
              <View style={s.rowBetween}>
                <Text style={s.sectionTitle}>
                  Hình ảnh nhà trọ ({retainedPhotoIds.length + newPhotos.length}/10)
                </Text>
                <AnimatedPressable
                  scaleTo={0.97}
                  style={s.smallAction}
                  onPress={() => {
                    void pickSupplementPhotos();
                  }}
                >
                  <Feather name="plus" size={14} color={c.primary} />
                  <Text style={s.smallActionText}>Thêm ảnh</Text>
                </AnimatedPressable>
              </View>

              <View style={s.photoGrid}>
                {snapshot.photos
                  .filter(item => retainedPhotoIds.includes(item.documentId))
                  .map(item => (
                    <View key={`srv-${item.documentId}`} style={s.serverPhotoBox}>
                      <Image
                        source={onboardingPhotoSource(item.documentId, token)}
                        style={s.serverPhotoImg}
                        contentFit="cover"
                      />
                      <AnimatedPressable
                        accessibilityLabel="Xóa ảnh đã tải"
                        style={s.removeBadge}
                        onPress={() =>
                          setRetainedPhotoIds(prev => prev.filter(id => id !== item.documentId))
                        }
                      >
                        <Feather name="x" size={13} color="#FFFFFF" />
                      </AnimatedPressable>
                    </View>
                  ))}
                {newPhotos.map((asset, idx) => (
                  <PhotoThumbnailTile
                    key={`new-${asset.uri}-${idx}`}
                    asset={asset}
                    index={retainedPhotoIds.length + idx}
                    disabled={submitting}
                    onMakeCover={() => undefined}
                    onRemove={() => setNewPhotos(prev => prev.filter((_, i) => i !== idx))}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {editableDocs.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Chứng từ & giấy tờ cần cập nhật</Text>
              {editableDocs.map(([key, label]) => {
                const picked = docs[key];
                const note = snapshot.fieldNotes?.[key];
                return (
                  <View key={key} style={s.docCard}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.docLabel}>{label}</Text>
                      {note ? <Text style={s.docNote}>{note}</Text> : null}
                      <Text style={s.docStatus}>
                        {picked
                          ? `Đã chọn tệp mới: ${picked.fileName || 'Tệp đính kèm'}`
                          : 'Giữ tệp hiện có hoặc chọn tệp thay thế'}
                      </Text>
                    </View>
                    <AnimatedPressable
                      scaleTo={0.97}
                      style={s.smallAction}
                      onPress={() => {
                        void pickSupplementDoc(key);
                      }}
                    >
                      <Feather name="upload" size={14} color={c.primary} />
                      <Text style={s.smallActionText}>{picked ? 'Đổi tệp' : 'Tải lên'}</Text>
                    </AnimatedPressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          <SingleSelectSheet
            visible={picker === 'type'}
            title="Chọn loại hình nhà trọ"
            options={PROPERTY_TYPES.map(item => ({ key: item, label: item }))}
            selectedValue={values.propertyType}
            onClose={() => setPicker(null)}
            onSelect={val => updateField('propertyType', val)}
          />
          <SingleSelectSheet
            visible={picker === 'area'}
            title="Chọn khu vực Hòa Lạc"
            options={PROPERTY_AREAS.map(item => ({ key: item, label: item }))}
            selectedValue={values.commune}
            onClose={() => setPicker(null)}
            onSelect={val => updateField('commune', val)}
          />
          <MultiSelectChecklistSheet
            visible={picker === 'amenities'}
            title="Chọn tiện ích"
            items={AMENITIES}
            selectedCount={values.amenities.length}
            isSelected={key => values.amenities.includes(key)}
            onToggle={key =>
              updateField(
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
            title="Chọn quy định"
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
                updateField(
                  'selectedRules',
                  exists
                    ? values.selectedRules.filter(item => !quietHours.test(item))
                    : [...values.selectedRules, 'quietHours:23:00']
                );
              } else {
                updateField(
                  'selectedRules',
                  values.selectedRules.includes(key)
                    ? values.selectedRules.filter(item => item !== key)
                    : [...values.selectedRules, key]
                );
              }
            }}
            onClose={() => setPicker(null)}
          />
          {picker === 'map' ? (
            <LocationSheet
              values={values}
              lookupPath="/host-onboarding/location/resolve-mobile"
              onClose={() => setPicker(null)}
              onApply={location => {
                setValues(prev => (prev ? { ...prev, ...location } : prev));
                setPicker(null);
              }}
            />
          ) : null}
        </View>
      )}
    </RegistrationSheet>
  );
}

const s = StyleSheet.create({
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  reasonBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  reasonBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#78350F',
  },
  reasonFields: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#92400E',
  },
  section: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.forestInk,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.forestInk,
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: c.forestInk,
  },
  outlineBtn: {
    minHeight: 46,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.primary,
    backgroundColor: c.softMint,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
  },
  smallActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serverPhotoBox: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: c.background,
  },
  serverPhotoImg: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 45, 41, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.forestInk,
  },
  docNote: {
    fontSize: 12.5,
    color: '#B45309',
  },
  docStatus: {
    fontSize: 12,
    color: c.textSecondary,
  },
});
