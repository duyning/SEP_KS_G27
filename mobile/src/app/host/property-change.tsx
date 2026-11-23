import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  PropertyChangeAmenitiesEditor,
  PropertyChangeBasicEditor,
  PropertyChangeDocumentsEditor,
  PropertyChangeLocationEditor,
  PropertyChangePhotosEditor,
} from '@/components/host/property-change-editors';
import { PropertyChangeOverview } from '@/components/host/property-change-overview';
import { PropertyChangeReview } from '@/components/host/property-change-review';
import { PropertyChangeStatusView } from '@/components/host/property-change-status';
import { ContentLoading, useLoading } from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { tokenStore } from '@/services/auth';
import {
  computePropertyChangeDiff,
  evaluateChangeSections,
  parsePropertyChangeDraft,
  serializePropertyChangeDraft,
  snapshotToFormValues,
  validatePropertyChangeSection,
  validatePropertyChangeSubmission,
  type ChangeDocumentKey,
  type PropertyChangeReplacementDocs,
  type PropertyChangeSectionId,
  type PropertyEditSnapshot,
} from '@/services/property-change';
import {
  clearPropertyChangeDraft,
  readPropertyChangeDraft,
  writePropertyChangeDraft,
} from '@/services/property-change-draft';
import {
  PropertyChangeApiError,
  fetchPropertyEditSnapshot,
  submitPropertyChangeRequest,
  type PropertyChangeSubmitResult,
} from '@/services/property-change-upload';
import {
  emptyFiles,
  registrationValues,
  type RegistrationAsset,
  type RegistrationErrors,
  type RegistrationValues,
} from '@/services/property-registration';
import { checkRegistrationAsset } from '@/services/registration-upload';

type ChangeView =
  | 'overview'
  | PropertyChangeSectionId
  | 'review'
  | 'status';

export default function PropertyChangeScreen() {
  const params = useLocalSearchParams<{
    registrationId?: string;
    propertyId?: string;
    mode?: string;
  }>();
  const registrationIdNum = Number(params.registrationId || 0);
  const propertyIdNum = params.propertyId ? Number(params.propertyId) : null;
  const initialStatusOnly = params.mode === 'status';

  const { user } = useAuth();
  const host = useHost();
  const { withLoading } = useLoading();

  const matchedRecord = useMemo(
    () =>
      host.data.properties?.records.find(item =>
        propertyIdNum
          ? item.propertyId === propertyIdNum
          : item.registrationId === registrationIdNum ||
            item.changeRequest?.registrationId === registrationIdNum
      ) || null,
    [host.data.properties, propertyIdNum, registrationIdNum]
  );

  const [view, setView] = useState<ChangeView>(initialStatusOnly ? 'status' : 'overview');
  const [loading, setLoading] = useState(!initialStatusOnly);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [snapshot, setSnapshot] = useState<PropertyEditSnapshot | null>(null);

  // Separate baseline (Current Property Data) vs working draft (Change Request Draft)
  const [baseline, setBaseline] = useState<RegistrationValues>(() => registrationValues());
  const [draft, setDraft] = useState<RegistrationValues>(() => registrationValues());
  const [retainedPhotoIds, setRetainedPhotoIds] = useState<number[]>([]);
  const [newPhotos, setNewPhotos] = useState<RegistrationAsset[]>([]);
  const [replacementDocs, setReplacementDocs] = useState<PropertyChangeReplacementDocs>({});
  const [changeReason, setChangeReason] = useState('');

  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<PropertyChangeSubmitResult | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const submitLock = useRef(false);
  const userId = user?.userId ?? null;

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Load edit snapshot when not in read-only status mode
  useEffect(() => {
    if (!host.allowed || !registrationIdNum || view === 'status') {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function loadSnapshot() {
      setLoading(true);
      setLoadError(null);
      setConflictBanner(null);
      try {
        const authToken = await tokenStore.get();
        if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const data = await fetchPropertyEditSnapshot(registrationIdNum, authToken, controller.signal);
        if (ignore) return;

        const baseValues = snapshotToFormValues(data);
        setToken(authToken);
        setSnapshot(data);
        setBaseline(baseValues);

        // Try restoring local draft if present
        let restoredFromDraft = false;
        if (userId) {
          const rawDraft = await readPropertyChangeDraft(userId, data.registrationId);
          if (ignore) return;
          if (rawDraft) {
            try {
              const parsed = parsePropertyChangeDraft(rawDraft, data);
              setDraft(parsed.values);
              setRetainedPhotoIds(parsed.retainedPhotoIds);
              setChangeReason(parsed.changeReason);
              setHasSavedDraft(true);
              restoredFromDraft = true;
              if (parsed.versionMismatch) {
                setConflictBanner(
                  'Thông tin nhà trọ trên máy chủ đã thay đổi sau khi bạn lưu bản nháp. Hệ thống đã giữ các mục bạn sửa để bạn kiểm tra lại trước khi gửi.'
                );
              } else if (parsed.needsFileReattach) {
                setInfoNotice(
                  'Đã khôi phục bản nháp. Vui lòng chọn lại ảnh mới hoặc tài liệu thay thế vì tệp tạm không được lưu cục bộ.'
                );
              } else {
                setInfoNotice('Đã khôi phục bản nháp đề nghị thay đổi gần nhất.');
              }
            } catch {
              await clearPropertyChangeDraft(userId, data.registrationId).catch(() => undefined);
            }
          }
        }

        if (!restoredFromDraft) {
          setDraft(baseValues);
          setRetainedPhotoIds(data.photos.map(photo => photo.documentId));
          setChangeReason('');
          setHasSavedDraft(false);
        }
        setNewPhotos([]);
        setReplacementDocs({});
        setErrors({});
        setGlobalError(null);
      } catch (cause) {
        if (!ignore && !controller.signal.aborted) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'Chưa thể tải hồ sơ chỉnh sửa nhà trọ. Vui lòng thử lại.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadSnapshot();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [host.allowed, registrationIdNum, userId, reloadTick, view]);

  // Android hardware back navigates sub-views back to overview before leaving screen
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (guideVisible) {
        setGuideVisible(false);
        return true;
      }
      if (view !== 'overview' && view !== 'status') {
        setView('overview');
        scrollToTop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [view, guideVisible]);

  const diff = useMemo(
    () =>
      computePropertyChangeDiff({
        baseline,
        draft,
        originalPhotos: snapshot?.photos || [],
        retainedPhotoIds,
        newPhotos,
        existingDocuments: snapshot?.documents || [],
        replacementDocuments: replacementDocs,
      }),
    [baseline, draft, snapshot, retainedPhotoIds, newPhotos, replacementDocs]
  );

  const sections = useMemo(
    () =>
      snapshot
        ? evaluateChangeSections({
            snapshot,
            baseline,
            draft,
            originalPhotos: snapshot.photos,
            retainedPhotoIds,
            newPhotos,
            existingDocuments: snapshot.documents,
            replacementDocuments: replacementDocs,
          })
        : [],
    [snapshot, baseline, draft, retainedPhotoIds, newPhotos, replacementDocs]
  );

  const handleBack = () => {
    if (view !== 'overview' && view !== 'status') {
      setView('overview');
      setGlobalError(null);
      scrollToTop();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  const handleSaveDraft = async () => {
    if (!userId || !snapshot || busy) return;
    try {
      const serialized = serializePropertyChangeDraft({
        versionToken: snapshot.versionToken,
        draft,
        retainedPhotoIds,
        changeReason,
        newPhotos,
        replacementDocuments: replacementDocs,
      });
      await writePropertyChangeDraft(userId, snapshot.registrationId, serialized);
      setHasSavedDraft(true);
      setInfoNotice(
        'Đã lưu bản nháp trên thiết bị. Ảnh mới và tài liệu thay thế cần chọn lại nếu đóng ứng dụng.'
      );
      setGlobalError(null);
    } catch {
      setGlobalError('Chưa thể lưu bản nháp trên thiết bị. Vui lòng thử lại.');
    }
  };

  const handlePickPhotos = async (source: 'camera' | 'library') => {
    if (busy) return;
    const remaining = 10 - (retainedPhotoIds.length + newPhotos.length);
    if (remaining <= 0) {
      setErrors(prev => ({ ...prev, photos: 'Mỗi nhà trọ tối đa 10 ảnh.' }));
      return;
    }
    setGlobalError(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) throw new Error('Cần cấp quyền máy ảnh để chụp ảnh nhà trọ.');
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) throw new Error('Cần cấp quyền thư viện ảnh để chọn ảnh nhà trọ.');
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsMultipleSelection: true,
              selectionLimit: remaining,
              quality: 0.85,
            });
      if (result.canceled || !result.assets?.length) return;

      const checked: RegistrationAsset[] = [];
      for (const item of result.assets.slice(0, remaining)) {
        checked.push(
          await checkRegistrationAsset(
            {
              uri: item.uri,
              fileName: item.fileName,
              mimeType: item.mimeType,
              fileSize: item.fileSize,
            },
            false
          )
        );
      }
      setNewPhotos(prev => [...prev, ...checked].slice(0, Math.max(0, 10 - retainedPhotoIds.length)));
      setErrors(prev => ({ ...prev, photos: undefined }));
    } catch (cause) {
      setErrors(prev => ({
        ...prev,
        photos: cause instanceof Error ? cause.message : 'Không thể chọn ảnh nhà trọ.',
      }));
    }
  };

  const handlePickDocument = async (
    key: ChangeDocumentKey,
    source: 'file' | 'camera' | 'library'
  ) => {
    if (busy) return;
    setGlobalError(null);
    try {
      let raw: RegistrationAsset | null = null;
      if (source === 'file') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.length) return;
        const item = result.assets[0];
        raw = { uri: item.uri, fileName: item.name, mimeType: item.mimeType, fileSize: item.size };
      } else {
        if (source === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) throw new Error('Cần cấp quyền máy ảnh để chụp tài liệu.');
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) throw new Error('Cần cấp quyền thư viện ảnh để chọn tài liệu.');
        }
        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
        if (result.canceled || !result.assets?.length) return;
        const item = result.assets[0];
        raw = {
          uri: item.uri,
          fileName: item.fileName,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
        };
      }

      if (!raw) return;
      const checked = await checkRegistrationAsset(raw, true);
      setReplacementDocs(prev => ({ ...prev, [key]: checked }));
      setErrors(prev => ({ ...prev, [key]: undefined }));
    } catch (cause) {
      setErrors(prev => ({
        ...prev,
        [key]: cause instanceof Error ? cause.message : 'Không thể chọn tài liệu xác minh.',
      }));
    }
  };

  const handleUndoSection = (section: PropertyChangeSectionId) => {
    if (section === 'basic') {
      setDraft(prev => ({
        ...prev,
        name: baseline.name,
        propertyType: baseline.propertyType,
        description: baseline.description,
        managerName: baseline.managerName,
        contactPhone: baseline.contactPhone,
        zaloPhone: baseline.zaloPhone,
      }));
    } else if (section === 'location') {
      setDraft(prev => ({
        ...prev,
        addressDetail: baseline.addressDetail,
        commune: baseline.commune,
        nearby: baseline.nearby,
        latitude: baseline.latitude,
        longitude: baseline.longitude,
      }));
    } else if (section === 'amenities') {
      setDraft(prev => ({
        ...prev,
        amenities: [...baseline.amenities],
        selectedRules: [...baseline.selectedRules],
        rules: baseline.rules,
      }));
    } else if (section === 'photos' && snapshot) {
      setRetainedPhotoIds(snapshot.photos.map(item => item.documentId));
      setNewPhotos([]);
    } else if (section === 'documents') {
      setReplacementDocs({});
    }
    setErrors({});
    setGlobalError(null);
  };

  const handleOpenReview = () => {
    if (!snapshot) return;
    if (!diff.hasAnyChange) {
      setGlobalError('Bạn chưa thay đổi mục nào. Hãy chỉnh sửa ít nhất một mục trước khi kiểm tra.');
      return;
    }
    setGlobalError(null);
    setView('review');
    scrollToTop();
  };

  const handleSubmitRequest = async () => {
    if (!snapshot || submitLock.current || busy) return;

    const check = validatePropertyChangeSubmission({
      snapshot,
      baseline,
      draft,
      originalPhotos: snapshot.photos,
      retainedPhotoIds,
      newPhotos,
      existingDocuments: snapshot.documents,
      replacementDocuments: replacementDocs,
    });

    setErrors(check.errors);
    if (!check.valid) {
      if (check.noChangeError) {
        setGlobalError(check.noChangeError);
      } else if (check.firstErrorSection) {
        setGlobalError('Một số thông tin chưa hợp lệ. Đang chuyển về mục cần sửa.');
        setView(check.firstErrorSection);
        scrollToTop();
      } else {
        setGlobalError(
          check.errors.termsAccepted || 'Vui lòng kiểm tra lại thông tin trước khi gửi.'
        );
      }
      return;
    }

    submitLock.current = true;
    setBusy(true);
    setGlobalError(null);
    setConflictBanner(null);

    try {
      const result = await withLoading(
        async () => {
          const authToken = await tokenStore.get();
          if (!authToken) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          }
          return submitPropertyChangeRequest(
            snapshot.registrationId,
            {
              details: { ...draft, termsAccepted: true },
              versionToken: snapshot.versionToken,
              retainedPhotoIds,
            },
            {
              photos: newPhotos,
              documents: replacementDocs,
            },
            authToken
          );
        },
        { message: 'Đang gửi đề nghị thay đổi thông tin...', mode: 'overlay' }
      );

      if (userId) {
        await clearPropertyChangeDraft(userId, snapshot.registrationId).catch(() => undefined);
      }
      setSubmittedResult(result);
      setHasSavedDraft(false);
      setView('status');
      scrollToTop();
      void host.store.refresh();
    } catch (cause) {
      if (cause instanceof PropertyChangeApiError && cause.isConflict) {
        setConflictBanner(
          cause.message ||
            'Nhà trọ đã được cập nhật từ lúc bạn mở màn này. Hãy tải lại dữ liệu mới nhất để đối chiếu (thay đổi của bạn chưa bị mất).'
        );
      } else {
        setGlobalError(
          cause instanceof Error
            ? cause.message
            : 'Chưa thể gửi đề nghị thay đổi. Vui lòng kiểm tra kết nối và thử lại.'
        );
      }
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (refreshingStatus) return;
    setRefreshingStatus(true);
    try {
      await host.store.refresh();
    } finally {
      setRefreshingStatus(false);
    }
  };

  const propertyTitle =
    snapshot?.details?.name || matchedRecord?.name || 'Nhà trọ của bạn';

  const headerTitle =
    view === 'overview'
      ? 'Đề nghị thay đổi'
      : view === 'review'
        ? 'Kiểm tra & Gửi'
        : view === 'status'
          ? 'Theo dõi yêu cầu'
          : view === 'basic'
            ? 'Thông tin cơ bản'
            : view === 'location'
              ? 'Vị trí nhà trọ'
              : view === 'amenities'
                ? 'Tiện ích & Quy định'
                : view === 'photos'
                  ? 'Hình ảnh nhà trọ'
                  : 'Hồ sơ xác minh';

  // Status payload resolved from submittedResult or live HostProperty record
  const activeStatusId =
    submittedResult?.registrationId ||
    matchedRecord?.changeRequest?.registrationId ||
    matchedRecord?.registrationId ||
    registrationIdNum;
  const activeStatusCode =
    submittedResult?.status ||
    matchedRecord?.changeRequest?.status ||
    matchedRecord?.displayStatus ||
    'PENDING';
  const activeStatusNote =
    submittedResult?.reasonNote ??
    matchedRecord?.changeRequest?.reasonNote ??
    matchedRecord?.reasonNote ??
    null;
  const activeRequestedFields =
    matchedRecord?.changeRequest?.requestedFields || matchedRecord?.requestedFields || [];
  const activeFieldNotes =
    matchedRecord?.changeRequest?.fieldNotes || matchedRecord?.fieldNotes || {};

  const currentSectionErrors = useMemo(() => {
    if (
      !snapshot ||
      view === 'overview' ||
      view === 'review' ||
      view === 'status'
    ) {
      return errors;
    }
    return {
      ...errors,
      ...validatePropertyChangeSection({
        section: view,
        draft,
        retainedPhotoIds,
        newPhotos,
        existingDocuments: snapshot.documents,
        replacementDocuments: replacementDocs,
      }),
    };
  }, [snapshot, view, errors, draft, retainedPhotoIds, newPhotos, replacementDocs]);

  // Silence unused emptyFiles lint if not needed
  void emptyFiles;

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* Unified Mobile Header */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          style={s.iconBtn}
          onPress={handleBack}
        >
          <Feather name="arrow-left" size={20} color={c.forestInk} />
        </AnimatedPressable>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {propertyTitle}
          </Text>
        </View>

        <AnimatedPressable
          accessibilityLabel="Hướng dẫn đề nghị thay đổi thông tin"
          style={s.iconBtn}
          onPress={() => setGuideVisible(true)}
        >
          <Feather name="help-circle" size={19} color={c.primary} />
        </AnimatedPressable>
      </View>

      {!host.allowed ? (
        <View style={s.centerWrap}>
          <View style={s.noticeCard}>
            <Feather name="lock" size={28} color={c.textSecondary} />
            <Text style={s.noticeTitle}>Bạn không có quyền truy cập</Text>
            <Text style={s.noticeDesc}>
              Chỉ chủ nhà trọ sở hữu hồ sơ này mới có quyền tạo hoặc xem đề nghị thay đổi thông tin.
            </Text>
            <PrimaryButton title="Quay lại" onPress={() => router.back()} />
          </View>
        </View>
      ) : loading ? (
        <ContentLoading message="Đang tải dữ liệu đề nghị thay đổi..." />
      ) : loadError && view !== 'status' ? (
        <View style={s.centerWrap}>
          <View style={s.noticeCard}>
            <InlineError message={loadError} />
            <PrimaryButton
              title="Thử tải lại"
              onPress={() => setReloadTick(prev => prev + 1)}
            />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {conflictBanner ? (
              <View style={s.conflictCard} accessibilityRole="alert">
                <View style={s.rowGap}>
                  <Feather name="alert-triangle" size={16} color="#92400E" />
                  <Text style={s.conflictTitle}>Cần kiểm tra phiên bản mới nhất</Text>
                </View>
                <Text style={s.conflictText}>{conflictBanner}</Text>
                <AnimatedPressable
                  scaleTo={0.98}
                  style={s.conflictBtn}
                  onPress={() => {
                    void handleSaveDraft().then(() => setReloadTick(prev => prev + 1));
                  }}
                >
                  <Feather name="refresh-cw" size={14} color={c.primary} />
                  <Text style={s.conflictBtnText}>Lưu nháp & tải lại dữ liệu mới nhất</Text>
                </AnimatedPressable>
              </View>
            ) : null}

            {infoNotice ? (
              <View style={s.infoBanner}>
                <Feather name="info" size={15} color={c.primary} />
                <Text style={s.infoBannerText}>{infoNotice}</Text>
              </View>
            ) : null}

            <InlineError message={globalError} />

            {view === 'overview' && snapshot ? (
              <PropertyChangeOverview
                snapshot={snapshot}
                sections={sections}
                hasLocalDraft={hasSavedDraft}
                onSelectSection={sectionId => {
                  setGlobalError(null);
                  setView(sectionId);
                  scrollToTop();
                }}
              />
            ) : null}

            {view === 'basic' && snapshot ? (
              <PropertyChangeBasicEditor
                snapshot={snapshot}
                values={draft}
                errors={currentSectionErrors}
                hasChanges={diff.changedSections.includes('basic')}
                busy={busy}
                onUpdate={(key, val) => {
                  setDraft(prev => ({ ...prev, [key]: val }));
                  setErrors(prev => ({ ...prev, [key]: undefined }));
                  setGlobalError(null);
                }}
                onUndo={() => handleUndoSection('basic')}
              />
            ) : null}

            {view === 'location' && snapshot ? (
              <PropertyChangeLocationEditor
                snapshot={snapshot}
                baseline={baseline}
                values={draft}
                errors={currentSectionErrors}
                hasChanges={diff.changedSections.includes('location')}
                busy={busy}
                onUpdate={(key, val) => {
                  setDraft(prev => ({ ...prev, [key]: val }));
                  setErrors(prev => ({ ...prev, [key]: undefined }));
                  setGlobalError(null);
                }}
                onPatch={patch => {
                  setDraft(prev => ({ ...prev, ...patch }));
                  setErrors(prev => ({
                    ...prev,
                    latitude: undefined,
                    longitude: undefined,
                    addressDetail: undefined,
                    commune: undefined,
                  }));
                  setGlobalError(null);
                }}
                onUndo={() => handleUndoSection('location')}
              />
            ) : null}

            {view === 'amenities' && snapshot ? (
              <PropertyChangeAmenitiesEditor
                snapshot={snapshot}
                values={draft}
                errors={currentSectionErrors}
                hasChanges={diff.changedSections.includes('amenities')}
                busy={busy}
                onUpdate={(key, val) => {
                  setDraft(prev => ({ ...prev, [key]: val }));
                  setErrors(prev => ({ ...prev, [key]: undefined }));
                  setGlobalError(null);
                }}
                onUndo={() => handleUndoSection('amenities')}
              />
            ) : null}

            {view === 'photos' && snapshot ? (
              <PropertyChangePhotosEditor
                snapshot={snapshot}
                token={token}
                originalPhotos={snapshot.photos}
                retainedPhotoIds={retainedPhotoIds}
                newPhotos={newPhotos}
                error={currentSectionErrors.photos}
                hasChanges={diff.changedSections.includes('photos')}
                busy={busy}
                onPickPhotos={source => {
                  void handlePickPhotos(source);
                }}
                onToggleRetain={docId => {
                  setRetainedPhotoIds(prev =>
                    prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
                  );
                  setErrors(prev => ({ ...prev, photos: undefined }));
                }}
                onRemoveNewPhoto={idx => {
                  setNewPhotos(prev => prev.filter((_, i) => i !== idx));
                  setErrors(prev => ({ ...prev, photos: undefined }));
                }}
                onPromoteNewPhoto={idx => {
                  if (idx <= 0) return;
                  setNewPhotos(prev => {
                    const next = [...prev];
                    const [picked] = next.splice(idx, 1);
                    next.unshift(picked);
                    return next;
                  });
                }}
                onUndo={() => handleUndoSection('photos')}
              />
            ) : null}

            {view === 'documents' && snapshot ? (
              <PropertyChangeDocumentsEditor
                snapshot={snapshot}
                existingDocuments={snapshot.documents}
                replacements={replacementDocs}
                errors={currentSectionErrors}
                hasChanges={diff.changedSections.includes('documents')}
                busy={busy}
                onPickDocument={(key, source) => {
                  void handlePickDocument(key, source);
                }}
                onClearReplacement={key => {
                  setReplacementDocs(prev => ({ ...prev, [key]: null }));
                  setErrors(prev => ({ ...prev, [key]: undefined }));
                }}
                onUndo={() => handleUndoSection('documents')}
              />
            ) : null}

            {view === 'review' && snapshot ? (
              <PropertyChangeReview
                diff={diff}
                baseline={baseline}
                draft={draft}
                originalPhotos={snapshot.photos}
                retainedPhotoIds={retainedPhotoIds}
                newPhotos={newPhotos}
                token={token}
                changeReason={changeReason}
                onChangeReason={setChangeReason}
                termsAccepted={draft.termsAccepted}
                onToggleTerms={() => {
                  setDraft(prev => ({ ...prev, termsAccepted: !prev.termsAccepted }));
                  setErrors(prev => ({ ...prev, termsAccepted: undefined }));
                  setGlobalError(null);
                }}
                termsError={errors.termsAccepted}
                onEditSection={sectionId => {
                  setView(sectionId);
                  scrollToTop();
                }}
              />
            ) : null}

            {view === 'status' ? (
              <PropertyChangeStatusView
                registrationId={activeStatusId}
                propertyName={propertyTitle}
                status={activeStatusCode}
                submittedAt={submittedResult?.submittedAt || submittedResult?.createdAt || null}
                reasonNote={activeStatusNote}
                requestedFields={activeRequestedFields}
                fieldNotes={activeFieldNotes}
                reverificationRequired={
                  matchedRecord?.reverificationRequired || diff.reverificationReasons.length > 0
                }
                refreshing={refreshingStatus}
                onRefresh={() => {
                  void handleRefreshStatus();
                }}
                onEditAgain={() => {
                  setView('overview');
                  setReloadTick(prev => prev + 1);
                  scrollToTop();
                }}
                onBackToProperty={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/home');
                }}
              />
            ) : null}
          </ScrollView>

          {/* Safe-Area Sticky Footers */}
          {view === 'overview' && snapshot ? (
            <View style={s.footer}>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                accessibilityLabel="Lưu bản nháp"
                style={s.footerSecondary}
                onPress={() => {
                  void handleSaveDraft();
                }}
              >
                <Text style={s.footerSecondaryText}>Lưu nháp</Text>
              </AnimatedPressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={
                    diff.changedSections.length > 0
                      ? `Kiểm tra thay đổi (${diff.changedSections.length})`
                      : 'Kiểm tra thay đổi'
                  }
                  disabled={busy}
                  onPress={handleOpenReview}
                />
              </View>
            </View>
          ) : null}

          {view !== 'overview' && view !== 'review' && view !== 'status' ? (
            <View style={s.footer}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Xong — Về tổng quan"
                  disabled={busy}
                  onPress={() => {
                    setView('overview');
                    setGlobalError(null);
                    scrollToTop();
                  }}
                />
              </View>
            </View>
          ) : null}

          {view === 'review' && snapshot ? (
            <View style={s.footer}>
              <AnimatedPressable
                scaleTo={0.98}
                disabled={busy}
                style={s.footerSecondary}
                onPress={() => {
                  setView('overview');
                  scrollToTop();
                }}
              >
                <Text style={s.footerSecondaryText}>Quay lại</Text>
              </AnimatedPressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Gửi yêu cầu xét duyệt"
                  loading={busy}
                  disabled={busy || !diff.hasAnyChange}
                  onPress={() => {
                    void handleSubmitRequest();
                  }}
                />
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}

      {/* Compact Guide Modal */}
      {guideVisible ? (
        <Modal transparent animationType="fade" onRequestClose={() => setGuideVisible(false)}>
          <View style={s.guideBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setGuideVisible(false)} />
            <View style={s.guideCard}>
              <View style={s.guideHead}>
                <Text style={s.guideTitle}>Hướng dẫn đề nghị thay đổi</Text>
                <AnimatedPressable
                  accessibilityLabel="Đóng hướng dẫn"
                  onPress={() => setGuideVisible(false)}
                >
                  <Feather name="x" size={20} color={c.forestInk} />
                </AnimatedPressable>
              </View>
              <Text style={s.guideItem}>
                1. Chỉ cần mở và chỉnh sửa những mục bạn muốn thay đổi — không phải điền lại toàn
                bộ hồ sơ.
              </Text>
              <Text style={s.guideItem}>
                2. Thông tin nhà trọ đang công khai sẽ giữ nguyên cho đến khi nhân viên NestHub phê
                duyệt.
              </Text>
              <Text style={s.guideItem}>
                3. Nếu thay đổi địa chỉ, tọa độ bản đồ, người quản lý, giấy phép kinh doanh hoặc
                CCCD, nhà trọ sẽ tạm ẩn để tái xác minh.
              </Text>
              <PrimaryButton title="Đã hiểu" onPress={() => setGuideVisible(false)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.background,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  headerSub: {
    fontSize: 12,
    color: c.textSecondary,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: c.softMint,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: c.forestInk,
  },
  conflictCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 13,
    gap: 8,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  conflictText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#78350F',
  },
  conflictBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primary,
  },
  conflictBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  footerSecondary: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: authRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSecondaryText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  noticeCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    gap: 12,
  },
  noticeTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  noticeDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
  guideBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 45, 41, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  guideCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  guideHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: c.forestInk,
  },
  guideItem: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
  },
});
