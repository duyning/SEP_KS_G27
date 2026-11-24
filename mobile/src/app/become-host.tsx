import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { OnboardingStage1Form } from '@/components/host/onboarding-stage1-form';
import { OnboardingStage2Form } from '@/components/host/onboarding-stage2-form';
import { OnboardingStatusView } from '@/components/host/onboarding-status-view';
import { OnboardingSupplementSheet } from '@/components/host/onboarding-supplement-sheet';
import { PhoneVerificationSheet } from '@/components/host/phone-verification-sheet';
import { ContentLoading, useLoading } from '@/components/loading';
import { useAuth } from '@/context/auth-context';
import { useHostMode } from '@/context/host-mode-context';
import { tokenStore } from '@/services/auth';
import {
  ONBOARDING_STAGES,
  emptyAccountDraft,
  parseOnboardingDraft,
  serializeOnboardingDraft,
  validateOnboardingStage1,
  type HostOnboardingCurrent,
  type OnboardingAccountDraft,
  type OnboardingIdentityAsset,
  type OnboardingIdentitySide,
  type OnboardingStage,
  type OnboardingStage1Errors,
} from '@/services/host-onboarding';
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  writeOnboardingDraft,
} from '@/services/host-onboarding-draft';
import {
  fetchOnboardingCurrent,
  prepareIdentityImage,
  submitCombinedOnboarding,
} from '@/services/host-onboarding-upload';
import {
  emptyFiles,
  registrationValues,
  validateRegistration,
  type RegistrationAsset,
  type RegistrationErrors,
  type RegistrationFiles,
  type RegistrationValues,
} from '@/services/property-registration';
import { checkRegistrationAsset } from '@/services/registration-upload';

export default function BecomeHostScreen() {
  const { user, loading: authLoading, retry: refreshAuth } = useAuth();
  const { setDiscovery } = useHostMode();
  const { withLoading } = useLoading();

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [current, setCurrent] = useState<HostOnboardingCurrent | null>(null);

  const [stage, setStage] = useState<OnboardingStage>(1);
  const [subStep, setSubStep] = useState(0);

  const [accountDraft, setAccountDraft] = useState<OnboardingAccountDraft>(emptyAccountDraft);
  const [frontIdentity, setFrontIdentity] = useState<OnboardingIdentityAsset | null>(null);
  const [backIdentity, setBackIdentity] = useState<OnboardingIdentityAsset | null>(null);
  const [pickingSide, setPickingSide] = useState<OnboardingIdentitySide | null>(null);
  const [stage1Errors, setStage1Errors] = useState<OnboardingStage1Errors>({});

  const [propertyValues, setPropertyValues] = useState<RegistrationValues>(() =>
    registrationValues(user || undefined)
  );
  const [propertyFiles, setPropertyFiles] = useState<RegistrationFiles>(emptyFiles);
  const [stage2Errors, setStage2Errors] = useState<RegistrationErrors>({});

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [phoneSheetVisible, setPhoneSheetVisible] = useState(false);
  const [supplementVisible, setSupplementVisible] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const submitLock = useRef(false);
  const draftRestoredUserRef = useRef<number | null>(null);
  const latestUserRef = useRef(user);
  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  const userId = user?.userId ?? null;
  const userRole = user?.role ?? null;

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    if (!userId || (userRole !== 'USER' && userRole !== 'ROOM_HOST')) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function bootstrap() {
      try {
        const authToken = await tokenStore.get();
        if (!authToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        const data = await fetchOnboardingCurrent(authToken, controller.signal);
        if (ignore) return;
        setToken(authToken);
        setCurrent(data);
        setLoadError(null);

        if (data.registration) {
          setStage(3);
          return;
        }

        // Only restore saved draft once per user session so OTP verification or status refresh never wipes unsaved edits.
        if (draftRestoredUserRef.current === userId) {
          return;
        }
        draftRestoredUserRef.current = userId;

        const activeUser = latestUserRef.current;
        const baseProperty = registrationValues(activeUser || undefined);
        const savedRaw = await readOnboardingDraft(userId!);
        if (ignore) return;

        if (savedRaw) {
          try {
            const restored = parseOnboardingDraft(savedRaw, baseProperty);
            setAccountDraft({
              ...restored.account,
              introduction: restored.account.introduction || data.account?.introduction || '',
            });
            setPropertyValues(restored.property);
            setStage(restored.stage);
            setSubStep(restored.propertyStep);
            if (restored.needsMediaReattach) {
              setInfoNotice(
                'Đã khôi phục thông tin bản nháp. Vì lý do bảo mật, vui lòng chọn lại ảnh CCCD, ảnh nhà trọ hoặc chứng từ chưa gửi.'
              );
            } else {
              setInfoNotice('Đã khôi phục bản nháp đăng ký chủ trọ gần nhất.');
            }
            return;
          } catch {
            await clearOnboardingDraft(userId!).catch(() => undefined);
          }
        }

        setAccountDraft(prev => ({
          ...prev,
          introduction: data.account?.introduction || prev.introduction,
          agreementAccepted: Boolean(data.account?.agreementAccepted || prev.agreementAccepted),
        }));
        setPropertyValues(prev => ({
          ...baseProperty,
          ...prev,
          managerName: prev.managerName || activeUser?.fullName || '',
          contactPhone: prev.contactPhone || activeUser?.phoneNumber || '',
        }));
      } catch (cause) {
        if (!ignore && !controller.signal.aborted) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'Chưa thể tải trạng thái hồ sơ đối tác. Vui lòng thử lại.'
          );
        }
      } finally {
        if (!ignore) {
          setInitialLoading(false);
          setRefreshingStatus(false);
        }
      }
    }

    void bootstrap();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [userId, userRole, reloadTick]);

  if (!authLoading && !user) {
    return <Redirect href="/login?redirect=%2Fbecome-host" />;
  }

  const handleGoBack = () => {
    if (stage === 2 && subStep > 0) {
      setSubStep(prev => prev - 1);
      setStage2Errors({});
      setGlobalError(null);
      scrollToTop();
      return;
    }
    if (stage === 2 && subStep === 0) {
      setStage(1);
      setStage2Errors({});
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
    if (!user || busy || stage === 3) return;
    try {
      const serialized = serializeOnboardingDraft({
        stage: stage === 2 ? 2 : 1,
        propertyStep: subStep,
        account: accountDraft,
        property: propertyValues,
        hadLocalMedia: {
          identityFront: Boolean(frontIdentity),
          identityBack: Boolean(backIdentity),
          photos: propertyFiles.photos.length > 0,
          ownership: Boolean(propertyFiles.ownership),
          fireSafety: Boolean(propertyFiles.fireSafety),
        },
      });
      await writeOnboardingDraft(user.userId, serialized);
      setInfoNotice(
        'Đã lưu bản nháp thông tin văn bản. Ảnh CCCD và tệp đính kèm không lưu cục bộ để bảo mật.'
      );
      setGlobalError(null);
    } catch {
      setGlobalError('Chưa thể lưu bản nháp trên thiết bị. Vui lòng thử lại.');
    }
  };

  const handlePickIdentity = async (
    side: OnboardingIdentitySide,
    source: 'camera' | 'library'
  ) => {
    if (pickingSide || busy) return;
    setPickingSide(side);
    setGlobalError(null);
    setStage1Errors(prev => ({
      ...prev,
      [side === 'front' ? 'identityFront' : 'identityBack']: undefined,
    }));

    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          throw new Error('Cần cấp quyền máy ảnh để chụp ảnh CCCD.');
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          throw new Error('Cần cấp quyền thư viện ảnh để chọn ảnh CCCD.');
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        base64: true,
        quality: 0.85,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets?.length) return;
      const picked = result.assets[0];
      const prepared = await prepareIdentityImage({
        uri: picked.uri,
        fileName: picked.fileName,
        base64: picked.base64,
      });

      if (side === 'front') setFrontIdentity(prepared);
      else setBackIdentity(prepared);
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : 'Không thể xử lý ảnh CCCD. Vui lòng thử ảnh khác.';
      setStage1Errors(prev => ({
        ...prev,
        [side === 'front' ? 'identityFront' : 'identityBack']: msg,
      }));
    } finally {
      setPickingSide(null);
    }
  };

  const handlePickPropertyPhotos = async (source: 'camera' | 'library') => {
    if (busy) return;
    const remaining = 10 - propertyFiles.photos.length;
    if (remaining <= 0) {
      setStage2Errors(prev => ({ ...prev, photos: 'Tối đa 10 ảnh nhà trọ.' }));
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
      setPropertyFiles(prev => ({
        ...prev,
        photos: [...prev.photos, ...checked].slice(0, 10),
      }));
      setStage2Errors(prev => ({ ...prev, photos: undefined }));
    } catch (cause) {
      setStage2Errors(prev => ({
        ...prev,
        photos: cause instanceof Error ? cause.message : 'Không thể chọn ảnh nhà trọ.',
      }));
    }
  };

  const handlePickPropertyDoc = async (
    key: 'ownership' | 'fireSafety',
    source: 'file' | 'camera' | 'library'
  ) => {
    if (busy) return;
    setGlobalError(null);
    try {
      let rawAsset: RegistrationAsset | null = null;
      if (source === 'file') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.length) return;
        const item = result.assets[0];
        rawAsset = {
          uri: item.uri,
          fileName: item.name,
          mimeType: item.mimeType,
          fileSize: item.size,
        };
      } else {
        if (source === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) throw new Error('Cần cấp quyền máy ảnh để chụp chứng từ.');
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) throw new Error('Cần cấp quyền thư viện ảnh để chọn chứng từ.');
        }
        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
        if (result.canceled || !result.assets?.length) return;
        const item = result.assets[0];
        rawAsset = {
          uri: item.uri,
          fileName: item.fileName,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
        };
      }

      if (!rawAsset) return;
      const checked = await checkRegistrationAsset(rawAsset, true);
      setPropertyFiles(prev => ({ ...prev, [key]: checked }));
      setStage2Errors(prev => ({ ...prev, [key]: undefined }));
    } catch (cause) {
      setStage2Errors(prev => ({
        ...prev,
        [key]: cause instanceof Error ? cause.message : 'Không thể chọn tệp xác minh.',
      }));
    }
  };

  const handleContinueStage1 = () => {
    if (!user || busy) return;
    const errors = validateOnboardingStage1({
      user,
      account: current?.account || null,
      draft: accountDraft,
      front: frontIdentity,
      back: backIdentity,
    });
    setStage1Errors(errors);
    if (Object.keys(errors).length > 0) {
      setGlobalError('Vui lòng hoàn thành các mục bắt buộc ở Giai đoạn 1 trước khi tiếp tục.');
      return;
    }

    setGlobalError(null);
    setInfoNotice(null);
    setPropertyValues(prev => ({
      ...prev,
      managerName: prev.managerName || user.fullName || '',
      contactPhone: prev.contactPhone || user.phoneNumber || '',
    }));
    setStage(2);
    scrollToTop();
  };

  const handleContinueStage2 = () => {
    if (busy) return;
    const errors = validateRegistration(propertyValues, propertyFiles, subStep, true);
    setStage2Errors(errors);
    if (Object.keys(errors).length > 0) {
      setGlobalError('Vui lòng kiểm tra và điền đầy đủ thông tin ở mục này.');
      return;
    }
    setGlobalError(null);
    setSubStep(prev => Math.min(5, prev + 1));
    scrollToTop();
  };

  const handleFinalSubmit = async () => {
    if (!user || submitLock.current || busy) return;

    // 1. Re-validate Stage 1 completely
    const s1Errors = validateOnboardingStage1({
      user,
      account: current?.account || null,
      draft: accountDraft,
      front: frontIdentity,
      back: backIdentity,
    });
    if (Object.keys(s1Errors).length > 0) {
      setStage1Errors(s1Errors);
      setStage(1);
      setGlobalError(
        'Vui lòng kiểm tra lại Giai đoạn 1 (tài khoản, OTP hoặc ảnh CCCD 2 mặt) trước khi gửi hồ sơ.'
      );
      scrollToTop();
      return;
    }

    // 2. Re-validate all 6 property sub-steps with reuseIdentity = true
    for (let stepIdx = 0; stepIdx <= 5; stepIdx++) {
      const stepErrors = validateRegistration(propertyValues, propertyFiles, stepIdx, true);
      if (Object.keys(stepErrors).length > 0) {
        setStage2Errors(stepErrors);
        setSubStep(stepIdx);
        setGlobalError(
          stepIdx === 5
            ? 'Vui lòng đánh dấu xác nhận cam kết trước khi gửi hồ sơ.'
            : `Vui lòng hoàn thiện Mục ${stepIdx + 1}/6 trước khi gửi hồ sơ.`
        );
        scrollToTop();
        return;
      }
    }

    submitLock.current = true;
    setBusy(true);
    setGlobalError(null);
    setInfoNotice(null);

    try {
      const submittedRegistration = await withLoading(
        async () => {
          const authToken = await tokenStore.get();
          if (!authToken) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          }
          return submitCombinedOnboarding(
            {
              introduction: accountDraft.introduction.trim(),
              agreementAccepted: true,
              version: current?.account?.version ?? null,
              identityImage: frontIdentity ? frontIdentity.dataUri : null,
              identityBackImage: backIdentity ? backIdentity.dataUri : null,
            },
            {
              ...propertyValues,
              termsAccepted: true,
            },
            propertyFiles,
            authToken
          );
        },
        { message: 'Đang gửi hồ sơ đăng ký chủ trọ & nhà trọ...', mode: 'overlay' }
      );

      await clearOnboardingDraft(user.userId).catch(() => undefined);
      setFrontIdentity(null);
      setBackIdentity(null);
      setCurrent(prev => ({
        account: prev?.account || null,
        registration: submittedRegistration,
      }));
      setStage(3);
      scrollToTop();
    } catch (cause) {
      setGlobalError(
        cause instanceof Error
          ? cause.message
          : 'Chưa thể gửi hồ sơ xét duyệt. Vui lòng kiểm tra kết nối và thử lại.'
      );
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (refreshingStatus) return;
    setRefreshingStatus(true);
    setGlobalError(null);
    try {
      await refreshAuth();
    } catch {
      /* Auth retry failure is handled when reloading onboarding state. */
    }
    setReloadTick(prev => prev + 1);
  };

  const handleOpenHostPortal = () => {
    setDiscovery(false);
    router.replace('/home');
  };

  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const isAlreadyHostWithoutDossier = user?.role === 'ROOM_HOST' && !initialLoading && !current?.registration;

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* Unified Header */}
      <View style={s.header}>
        <AnimatedPressable
          accessibilityLabel="Quay lại"
          style={s.backBtn}
          onPress={handleGoBack}
        >
          <Feather name="arrow-left" size={21} color={c.forestInk} />
        </AnimatedPressable>

        <Text style={s.headerTitle} numberOfLines={1}>
          Đăng ký chủ trọ & nhà trọ
        </Text>

        {!isStaffOrAdmin && !isAlreadyHostWithoutDossier && !initialLoading && stage !== 3 ? (
          <AnimatedPressable
            scaleTo={0.97}
            disabled={busy}
            accessibilityLabel="Lưu bản nháp"
            style={s.draftBtn}
            onPress={() => {
              void handleSaveDraft();
            }}
          >
            <Text style={s.draftBtnText}>Lưu nháp</Text>
          </AnimatedPressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* Compact 3-Stage Progress Bar */}
      {!isStaffOrAdmin && !isAlreadyHostWithoutDossier && !initialLoading && !loadError ? (
        <View style={s.stageBar}>
          {ONBOARDING_STAGES.map((label, idx) => {
            const num = (idx + 1) as OnboardingStage;
            const active = stage === num;
            const done = stage > num;
            const canTap = num === 1 && stage === 2 && !busy;
            return (
              <AnimatedPressable
                key={label}
                disabled={!canTap}
                onPress={() => {
                  if (canTap) {
                    setStage(1);
                    scrollToTop();
                  }
                }}
                style={s.stageItem}
              >
                <View
                  style={[
                    s.stageDot,
                    done && s.stageDotDone,
                    active && s.stageDotActive,
                  ]}
                >
                  {done ? (
                    <Feather name="check" size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        s.stageDotText,
                        (active || done) && { color: '#FFFFFF' },
                      ]}
                    >
                      {num}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    s.stageLabel,
                    active && s.stageLabelActive,
                    done && { color: c.primary },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ) : null}

      {/* Main Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {(!user && authLoading) || (initialLoading && !isStaffOrAdmin) ? (
          <ContentLoading message="Đang tải hồ sơ đăng ký chủ trọ..." />
        ) : isStaffOrAdmin ? (
          <View style={s.centerCardWrap}>
            <View style={s.noticeCard}>
              <Feather name="shield" size={28} color={c.primary} />
              <Text style={s.noticeTitle}>Tài khoản quản trị / nhân viên</Text>
              <Text style={s.noticeDesc}>
                Tài khoản Staff hoặc Admin không sử dụng luồng đăng ký trở thành đối tác chủ nhà
                trọ.
              </Text>
              <PrimaryButton title="Về trang chủ" onPress={() => router.replace('/home')} />
            </View>
          </View>
        ) : isAlreadyHostWithoutDossier ? (
          <View style={s.centerCardWrap}>
            <View style={s.noticeCard}>
              <Feather name="check-circle" size={30} color={c.primary} />
              <Text style={s.noticeTitle}>Bạn đã là đối tác chủ nhà trọ</Text>
              <Text style={s.noticeDesc}>
                Tài khoản của bạn đã có quyền Chủ nhà trọ trên NestHub. Bạn có thể vào không gian
                quản lý để thêm nhà trọ, thiết lập phòng hoặc quản lý hợp đồng.
              </Text>
              <PrimaryButton title="Vào quản lý nhà trọ" onPress={handleOpenHostPortal} />
            </View>
          </View>
        ) : loadError ? (
          <View style={s.centerCardWrap}>
            <View style={s.noticeCard}>
              <InlineError message={loadError} />
              <PrimaryButton
                title="Thử tải lại"
                onPress={() => {
                  setInitialLoading(true);
                  setLoadError(null);
                  setReloadTick(prev => prev + 1);
                }}
              />
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={s.scrollBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {infoNotice ? (
                <View style={s.infoBanner}>
                  <Feather name="info" size={16} color={c.primary} />
                  <Text style={s.infoBannerText}>{infoNotice}</Text>
                </View>
              ) : null}

              <InlineError message={globalError} />

              {stage === 1 && user ? (
                <OnboardingStage1Form
                  user={user}
                  token={token}
                  account={current?.account || null}
                  draft={accountDraft}
                  front={frontIdentity}
                  back={backIdentity}
                  pickingSide={pickingSide}
                  errors={stage1Errors}
                  onUpdateDraft={patch => {
                    setAccountDraft(prev => ({ ...prev, ...patch }));
                    setStage1Errors(prev => ({
                      ...prev,
                      agreementAccepted:
                        patch.agreementAccepted !== undefined ? undefined : prev.agreementAccepted,
                      introduction:
                        patch.introduction !== undefined ? undefined : prev.introduction,
                    }));
                    setGlobalError(null);
                  }}
                  onOpenPhoneVerify={() => setPhoneSheetVisible(true)}
                  onPickIdentity={(side, source) => {
                    void handlePickIdentity(side, source);
                  }}
                  onRemoveIdentity={side => {
                    if (side === 'front') setFrontIdentity(null);
                    else setBackIdentity(null);
                  }}
                />
              ) : null}

              {stage === 2 && user ? (
                <OnboardingStage2Form
                  user={user}
                  subStep={subStep}
                  values={propertyValues}
                  files={propertyFiles}
                  errors={stage2Errors}
                  busy={busy}
                  onUpdateValue={(key, val) => {
                    setPropertyValues(prev => ({ ...prev, [key]: val }));
                    setStage2Errors(prev => ({ ...prev, [key]: undefined }));
                    setGlobalError(null);
                  }}
                  onPatchValues={patch => {
                    setPropertyValues(prev => ({ ...prev, ...patch }));
                    setStage2Errors(prev => ({
                      ...prev,
                      latitude: undefined,
                      longitude: undefined,
                      addressDetail: undefined,
                      commune: undefined,
                    }));
                    setGlobalError(null);
                  }}
                  onPickPhotos={source => {
                    void handlePickPropertyPhotos(source);
                  }}
                  onMakeCover={index => {
                    if (index <= 0) return;
                    setPropertyFiles(prev => {
                      const next = [...prev.photos];
                      const [picked] = next.splice(index, 1);
                      next.unshift(picked);
                      return { ...prev, photos: next };
                    });
                  }}
                  onRemovePhoto={index => {
                    setPropertyFiles(prev => ({
                      ...prev,
                      photos: prev.photos.filter((_, idx) => idx !== index),
                    }));
                  }}
                  onPickDocument={(key, source) => {
                    void handlePickPropertyDoc(key, source);
                  }}
                  onRemoveDocument={key => {
                    setPropertyFiles(prev => ({ ...prev, [key]: null }));
                  }}
                  onJumpToStage1={() => {
                    setStage(1);
                    scrollToTop();
                  }}
                  onJumpToSubStep={target => {
                    setSubStep(target);
                    setStage2Errors({});
                    scrollToTop();
                  }}
                />
              ) : null}

              {stage === 3 && current?.registration ? (
                <OnboardingStatusView
                  registration={current.registration}
                  account={current.account}
                  userRole={user?.role}
                  refreshing={refreshingStatus}
                  onRefresh={() => {
                    void handleRefreshStatus();
                  }}
                  onSupplement={() => setSupplementVisible(true)}
                  onOpenHostPortal={handleOpenHostPortal}
                  onGoHome={() => router.replace('/home')}
                />
              ) : null}
            </ScrollView>

            {/* Sticky Bottom Footer for Stages 1 & 2 */}
            {stage === 1 ? (
              <View style={s.footer}>
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={s.footerSecondaryBtn}
                  onPress={() => {
                    void handleSaveDraft();
                  }}
                >
                  <Text style={s.footerSecondaryText}>Lưu nháp</Text>
                </AnimatedPressable>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title="Tiếp tục"
                    disabled={busy || Boolean(pickingSide)}
                    onPress={handleContinueStage1}
                  />
                </View>
              </View>
            ) : null}

            {stage === 2 ? (
              <View style={s.footer}>
                <AnimatedPressable
                  scaleTo={0.98}
                  disabled={busy}
                  style={s.footerSecondaryBtn}
                  onPress={handleGoBack}
                >
                  <Text style={s.footerSecondaryText}>Quay lại</Text>
                </AnimatedPressable>
                <View style={{ flex: 1 }}>
                  {subStep < 5 ? (
                    <PrimaryButton
                      title="Tiếp tục"
                      disabled={busy}
                      onPress={handleContinueStage2}
                    />
                  ) : (
                    <PrimaryButton
                      title="Gửi hồ sơ xét duyệt"
                      loading={busy}
                      disabled={busy}
                      onPress={() => {
                        void handleFinalSubmit();
                      }}
                    />
                  )}
                </View>
              </View>
            ) : null}
          </>
        )}
      </KeyboardAvoidingView>

      {/* Unified Phone & OTP Verification Bottom Sheet */}
      <PhoneVerificationSheet
        visible={phoneSheetVisible}
        initialPhone={user?.phoneNumber || ''}
        confirmLabel="Xác minh và lưu"
        onClose={() => setPhoneSheetVisible(false)}
        onVerified={verifiedPhone => {
          setPhoneSheetVisible(false);
          setStage1Errors(prev => ({ ...prev, phoneNumber: undefined, phoneVerified: undefined }));
          setPropertyValues(prev => ({
            ...prev,
            contactPhone: prev.contactPhone || verifiedPhone,
          }));
          setInfoNotice(`Đã xác minh thành công số điện thoại ${verifiedPhone}.`);
        }}
      />

      {/* Targeted Supplement Sheet for Stage 3 */}
      {current?.registration ? (
        <OnboardingSupplementSheet
          visible={supplementVisible}
          registrationId={current.registration.registrationId}
          onClose={() => setSupplementVisible(false)}
          onResubmitted={updated => {
            setSupplementVisible(false);
            setCurrent(prev => ({
              account: prev?.account || null,
              registration: updated,
            }));
            setInfoNotice('Đã gửi hồ sơ bổ sung thành công. Nhân viên sẽ thẩm định lại.');
            scrollToTop();
          }}
        />
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16.5,
    fontWeight: '700',
    color: c.forestInk,
    marginHorizontal: 6,
  },
  draftBtn: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    alignItems: 'center',
  },
  draftBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  stageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 6,
  },
  stageItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDotActive: {
    backgroundColor: c.primary,
  },
  stageDotDone: {
    backgroundColor: '#06665C',
  },
  stageDotText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  stageLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textMuted,
    flexShrink: 1,
  },
  stageLabelActive: {
    color: c.forestInk,
    fontWeight: '700',
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
    gap: 9,
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
  footerSecondaryBtn: {
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
  centerCardWrap: {
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
    fontSize: 18,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  noticeDesc: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
