import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, usePreventRemove } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useHost } from '@/context/host-context';
import { Action, h } from '@/components/host/host-ui';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { AuthInput } from '@/components/auth/auth-input';
import { InlineError } from '@/components/auth/inline-error';
import { PrimaryButton } from '@/components/auth/primary-button';
import { authColors as c, authRadius, authSpacing } from '@/components/auth/tokens';
import { ConfirmDialog } from '@/components/profile/profile-ui';
import {
  DescriptionAssistResult,
  DescriptionAssistTrigger,
  LocationSheet,
  RegistrationSheet,
  useDescriptionAssist,
} from '@/components/host/registration-assist';
import {
  MultiSelectChecklistSheet,
  PhotoThumbnailTile,
  SelectRow,
  SingleSelectSheet,
} from '@/components/host/registration-pickers';
import { usePropertyRegistration } from '@/components/host/use-property-registration';
import {
  AMENITIES,
  DOCUMENTS,
  FIELD_STEPS,
  PROPERTY_AREAS,
  PROPERTY_TYPES,
  RULES,
  STEPS,
  quietHours,
  registrationPoint,
  ruleLabel,
  validateRegistration,
  type RegistrationField,
  type RegistrationValues,
} from '@/services/property-registration';

const GUIDES = [
  'Viết tên và mô tả đúng thực tế. Dùng số điện thoại của người trực tiếp đón khách xem phòng.',
  'Nhập địa chỉ chi tiết và chọn khu vực Hòa Lạc. Ghim bản đồ là tùy chọn và không bắt buộc.',
  'Chỉ chọn tiện ích và quy định đang áp dụng. Nhập giờ trật tự theo định dạng 24 giờ (HH:mm).',
  'Chụp mặt tiền, lối vào và khu vực chung trong ánh sáng tốt. Ảnh đầu tiên là ảnh bìa.',
  'Chuẩn bị giấy phép kinh doanh, căn cước chủ trọ và chứng nhận PCCC (tối đa 10 MB/tệp). Giấy tờ được bảo mật nội bộ.',
  'Kiểm tra lại toàn bộ 5 mục tóm tắt và tích xác nhận cam kết trước khi gửi xét duyệt.',
];

type TextField = {
  [K in keyof RegistrationValues]-?: NonNullable<RegistrationValues[K]> extends string ? K : never;
}[keyof RegistrationValues];

export default function RegistrationScreen() {
  const { user, loading } = useAuth();
  if (!user || user.role !== 'ROOM_HOST') {
    return (
      <SafeAreaView style={h.screen}>
        <View style={h.body}>
          <Text style={h.heading}>
            {loading ? 'Đang xác nhận phiên…' : 'Tính năng dành cho tài khoản chủ trọ'}
          </Text>
          <Action label="Quay lại" icon="arrow-left" onPress={() => router.dismissTo('/home')} />
        </View>
      </SafeAreaView>
    );
  }
  return <RegistrationForm key={user.userId} user={user} />;
}

function RegistrationForm({
  user,
}: {
  user: { userId: number; fullName?: string; phoneNumber?: string };
}) {
  const host = useHost();
  const form = usePropertyRegistration(user);
  const { values, files, step, errors, fileErrors, missing } = form;
  const aiAssist = useDescriptionAssist(values);

  const [modal, setModal] = useState<
    'guide' | 'location' | 'submit' | 'propertyType' | 'commune' | 'amenities' | 'rules' | null
  >(null);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [allowLeave, setAllowLeave] = useState(false);
  const [zaloOpen, setZaloOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<Partial<Record<RegistrationField, number>>>({});
  const firstError = FIELD_STEPS[step].find(key => errors[key]);
  const blocked = form.restoring || form.busy || Boolean(form.picking) || form.saving;
  const canBackStep = !form.receipt && (step > 0 || form.editing);
  const backStep = form.back;

  usePreventRemove(
    form.busy || Boolean(form.picking) || form.saving || (form.dirty && !form.receipt && !allowLeave),
    ({ repeat }) => {
      if (!blocked) {
        setLeave(() => () => {
          setAllowLeave(true);
          repeat();
        });
      }
    }
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (blocked) return true;
        if (!canBackStep) return false;
        Keyboard.dismiss();
        backStep();
        return true;
      });
      return () => subscription.remove();
    }, [backStep, blocked, canBackStep])
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      scroll.current?.scrollTo({
        y: firstError ? Math.max(0, (offsets.current[firstError] || 0) - 16) : 0,
        animated: false,
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [step, firstError]);

  const navigateBack = () => {
    Keyboard.dismiss();
    if (canBackStep) form.back();
    else router.dismissTo('/home');
  };

  function at(key: RegistrationField, content: ReactNode) {
    return (
      <View
        onLayout={event => {
          offsets.current[key] = event.nativeEvent.layout.y;
        }}
      >
        {content}
      </View>
    );
  }

  const input = (
    key: TextField,
    label: string,
    max: number,
    options: {
      multiline?: boolean;
      phone?: boolean;
      optional?: boolean;
      placeholder?: string;
      hintRight?: ReactNode;
      minHeight?: number;
    } = {}
  ) => {
    const value = values[key] || '';
    return at(
      key,
      <AuthInput
        label={label}
        optionalLabel={options.optional ? 'Tùy chọn' : undefined}
        placeholder={options.placeholder}
        value={value}
        maxLength={max}
        onChangeText={text => form.update(key, text)}
        error={errors[key]}
        hint={`${value.length}/${max} ký tự`}
        hintRight={options.hintRight}
        multiline={options.multiline}
        style={options.minHeight ? { minHeight: options.minHeight } : undefined}
        keyboardType={options.phone ? 'phone-pad' : 'default'}
      />
    );
  };

  const toggleItem = (key: 'amenities' | 'selectedRules', value: string) => {
    const items = values[key];
    form.update(
      key,
      items.includes(value) ? items.filter(item => item !== value) : [...items, value]
    );
  };

  const quiet = values.selectedRules.find(item => /^quietHours(?::|$)/.test(item));
  const point = registrationPoint(values.latitude, values.longitude);
  const hasCustomType = !PROPERTY_TYPES.includes(values.propertyType);
  const showZaloField = zaloOpen || values.zaloPhone.trim().length > 0 || Boolean(errors.zaloPhone);
  const showNearbyField =
    nearbyOpen || values.nearby.trim().length > 0 || Boolean(errors.nearby);

  // Step 3 summaries
  const amenitiesSummary = useMemo(() => {
    if (!values.amenities.length) return 'Chưa chọn tiện ích nào';
    return AMENITIES.filter(([id]) => values.amenities.includes(id))
      .map(([, label]) => label)
      .join(', ');
  }, [values.amenities]);

  const rulesSummary = useMemo(() => {
    if (!values.selectedRules.length) return 'Chưa chọn quy định nào';
    return values.selectedRules.map(ruleLabel).join(', ');
  }, [values.selectedRules]);

  // Step 6 completeness audit (steps 0..4)
  const incompleteSteps = useMemo(() => {
    const issues: { stepIndex: number; title: string; detail: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const stepErrs = validateRegistration(values, files, i, form.canReuse);
      const messages = Object.values(stepErrs).filter(Boolean) as string[];
      if (messages.length > 0) {
        issues.push({ stepIndex: i, title: STEPS[i], detail: messages[0] });
      }
    }
    return issues;
  }, [values, files, form.canReuse]);

  const readyDocsCount = DOCUMENTS.filter(
    ([key]) => Boolean(files[key]) || (key === 'idCard' && form.canReuse)
  ).length;

  const missingDocLabels = DOCUMENTS.filter(
    ([key]) => !files[key] && !(key === 'idCard' && form.canReuse)
  ).map(([, label]) => label);

  const canSubmitFinal =
    step === 5 &&
    !blocked &&
    form.eligibility?.canRegister === true &&
    incompleteSteps.length === 0 &&
    values.termsAccepted;

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom', 'left', 'right']}>
      {/* Unified Compact Header */}
      <View style={s.header}>
        <View style={s.headerTopRow}>
          <AnimatedPressable
            accessibilityLabel="Quay lại"
            style={s.iconBtn}
            onPress={navigateBack}
            disabled={blocked}
          >
            <Feather name="arrow-left" color={c.forestInk} size={20} />
          </AnimatedPressable>

          <Text style={s.headerTitle} numberOfLines={1}>
            Đăng ký nhà trọ
          </Text>

          {!form.receipt ? (
            <AnimatedPressable
              accessibilityLabel={`Hướng dẫn bước ${step + 1}: ${STEPS[step]}`}
              style={s.iconBtn}
              onPress={() => setModal('guide')}
              disabled={blocked}
            >
              <Feather name="help-circle" color={c.primary} size={20} />
            </AnimatedPressable>
          ) : (
            <View style={{ width: 44, height: 44 }} />
          )}
        </View>

        {/* Compact Progress Strip right underneath header (no huge gap) */}
        {!form.receipt && (
          <View style={s.progressBlock}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressStepPill}>Bước {step + 1}/6</Text>
              <Text style={s.progressStepName} numberOfLines={1}>
                {STEPS[step]}
              </Text>
              {form.editing && <Text style={s.editingBadge}>Đang sửa</Text>}
            </View>
            <View
              style={s.track}
              accessibilityRole="progressbar"
              accessibilityLabel={`Tiến trình đăng ký, bước ${step + 1} trên 6`}
              accessibilityValue={{ min: 0, max: 6, now: step + 1 }}
            >
              <View style={[s.fill, { width: `${((step + 1) / 6) * 100}%` }]} />
            </View>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
      >
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {form.restoring ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={c.primary} accessibilityLabel="Đang tải bản nháp" />
              <Text style={s.mutedText}>Đang tải bản nháp hồ sơ…</Text>
            </View>
          ) : form.receipt ? (
            <View style={s.receiptCard}>
              <View style={s.receiptIconCircle}>
                <Feather name="check-circle" size={30} color={c.primary} />
              </View>
              <Text style={s.receiptTitle}>Đã gửi · Chờ xét duyệt</Text>
              <Text style={s.receiptDesc}>
                Hồ sơ đăng ký nhà trọ của bạn đã được hệ thống tiếp nhận và đang chờ xét duyệt.
              </Text>
              <PrimaryButton
                title="Về Nhà trọ của tôi"
                onPress={() => router.dismissTo('/home')}
              />
            </View>
          ) : (
            <>
              <Text style={s.stepHeading}>{STEPS[step]}</Text>

              {/* Show restore/error draft banner only when relevant (never spamming temp file warning on every step) */}
              {!!form.draftMessage && (
                <View style={s.infoNotice} accessibilityLiveRegion="polite">
                  <Feather name="info" size={15} color={c.primary} style={{ marginTop: 1 }} />
                  <Text style={s.infoNoticeText}>{form.draftMessage}</Text>
                  <AnimatedPressable
                    accessibilityLabel="Đóng thông báo bản nháp"
                    style={s.dismissIcon}
                    onPress={form.dismissDraftMessage}
                  >
                    <Feather name="x" size={14} color={c.primaryDark} />
                  </AnimatedPressable>
                </View>
              )}

              <InlineError
                message={
                  form.message ||
                  form.eligibilityError ||
                  (form.eligibility?.canRegister === false ? form.eligibility.reason : '')
                }
              />
              {!!form.eligibilityError && (
                <Action
                  label="Thử lại kiểm tra quyền"
                  icon="refresh-cw"
                  onPress={form.retryEligibility}
                />
              )}

              {/* ============================================================ */}
              {/* STEP 1: THÔNG TIN CƠ BẢN                                      */}
              {/* ============================================================ */}
              {step === 0 && (
                <View style={s.stepStack}>
                  {/* Group 1: Thông tin nhà trọ */}
                  <View style={s.cardGroup}>
                    <Text style={s.groupHeading}>Thông tin nhà trọ</Text>

                    {input('name', 'Tên nhà trọ', 100, {
                      placeholder: 'Ví dụ: Nhà trọ Xanh Hòa Lạc',
                    })}

                    {at(
                      'propertyType',
                      <View style={{ gap: 10 }}>
                        <SelectRow
                          label="Loại hình nhà trọ"
                          value={hasCustomType ? 'Khác' : values.propertyType}
                          placeholder="Chọn loại hình nhà trọ"
                          error={!hasCustomType ? errors.propertyType : undefined}
                          onPress={() => {
                            Keyboard.dismiss();
                            setModal('propertyType');
                          }}
                        />
                        {hasCustomType && (
                          <AuthInput
                            label="Tên loại hình khác"
                            placeholder="Nhập loại hình nhà trọ"
                            maxLength={100}
                            value={values.propertyType}
                            onChangeText={value => form.update('propertyType', value)}
                            error={errors.propertyType}
                          />
                        )}
                      </View>
                    )}

                    {input('description', 'Mô tả nhà trọ', 2000, {
                      multiline: true,
                      placeholder:
                        'Mô tả không gian, giao thông, an ninh và điểm nổi bật của nhà trọ…',
                      hintRight: (
                        <DescriptionAssistTrigger
                          busy={aiAssist.busy}
                          onPress={() => {
                            Keyboard.dismiss();
                            void aiAssist.generate();
                          }}
                        />
                      ),
                    })}

                    <DescriptionAssistResult
                      error={aiAssist.error}
                      suggestion={aiAssist.suggestion}
                      onApply={text => form.update('description', text)}
                      onDismiss={aiAssist.dismiss}
                    />
                  </View>

                  {/* Group 2: Liên hệ xem phòng */}
                  <View style={s.cardGroup}>
                    <Text style={s.groupHeading}>Liên hệ xem phòng</Text>

                    {input('managerName', 'Người đón khách', 100, {
                      placeholder: 'Họ tên chủ trọ hoặc quản lý',
                    })}

                    {input('contactPhone', 'Hotline liên hệ', 20, {
                      phone: true,
                      placeholder: '09xx xxx xxx',
                    })}

                    {showZaloField ? (
                      input('zaloPhone', 'Zalo liên hệ', 20, {
                        phone: true,
                        optional: true,
                        placeholder: 'Số Zalo nếu khác hotline',
                      })
                    ) : (
                      <AnimatedPressable
                        scaleTo={0.99}
                        style={s.optionalTrigger}
                        accessibilityLabel="Thêm số Zalo liên hệ"
                        onPress={() => setZaloOpen(true)}
                      >
                        <Feather name="plus-circle" size={16} color={c.primary} />
                        <Text style={s.optionalTriggerText}>
                          Thêm số Zalo liên hệ (Tùy chọn)
                        </Text>
                      </AnimatedPressable>
                    )}
                  </View>
                </View>
              )}

              {/* ============================================================ */}
              {/* STEP 2: VỊ TRÍ                                                */}
              {/* ============================================================ */}
              {step === 1 && (
                <View style={s.stepStack}>
                  <View style={s.cardGroup}>
                    <Text style={s.groupHeading}>Địa chỉ nhà trọ</Text>

                    {input('addressDetail', 'Địa chỉ chi tiết', 255, {
                      multiline: true,
                      minHeight: 68,
                      placeholder: 'Số nhà, ngõ, thôn/xóm…',
                    })}

                    {at(
                      'commune',
                      <SelectRow
                        label="Khu vực Hòa Lạc"
                        value={values.commune}
                        placeholder="Chọn xã / khu vực"
                        error={errors.commune}
                        onPress={() => {
                          Keyboard.dismiss();
                          setModal('commune');
                        }}
                      />
                    )}

                    {showNearbyField ? (
                      input('nearby', 'Địa điểm gần nhà trọ', 255, {
                        optional: true,
                        placeholder: 'Ví dụ: Cách ĐH FPT 800m, gần chợ Tân Xã…',
                      })
                    ) : (
                      <AnimatedPressable
                        scaleTo={0.99}
                        style={s.optionalTrigger}
                        accessibilityLabel="Thêm địa điểm gần nhà trọ"
                        onPress={() => setNearbyOpen(true)}
                      >
                        <Feather name="plus-circle" size={16} color={c.primary} />
                        <Text style={s.optionalTriggerText}>
                          Thêm địa điểm gần nhà trọ (Tùy chọn)
                        </Text>
                      </AnimatedPressable>
                    )}
                  </View>

                  {/* Map Pin Row */}
                  {at(
                    'latitude',
                    <View style={s.cardGroup}>
                      <AnimatedPressable
                        scaleTo={0.99}
                        style={s.mapPinRow}
                        accessibilityLabel={
                          point
                            ? `Đã ghim trên bản đồ: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`
                            : 'Ghim trên bản đồ, chưa ghim'
                        }
                        onPress={() => {
                          Keyboard.dismiss();
                          setModal('location');
                        }}
                      >
                        <View
                          style={[
                            s.rowIconBox,
                            point ? s.rowIconPinned : undefined,
                          ]}
                        >
                          <Feather
                            name={point ? 'check-circle' : 'map-pin'}
                            size={18}
                            color={c.primary}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.rowPrimaryText}>Ghim trên bản đồ</Text>
                            <View
                              style={[
                                s.miniPill,
                                point ? s.miniPillOk : s.miniPillNeutral,
                              ]}
                            >
                              <Text
                                style={[
                                  s.miniPillText,
                                  { color: point ? c.primary : c.textSecondary },
                                ]}
                              >
                                {point ? 'Đã ghim' : 'Chưa ghim'}
                              </Text>
                            </View>
                          </View>
                          <Text style={s.rowSecondaryText}>
                            {point
                              ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
                              : 'Tùy chọn · Có thể tiếp tục bằng địa chỉ nhập tay'}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={c.textMuted} />
                      </AnimatedPressable>

                      {!!(values.latitude || values.longitude) && (
                        <AnimatedPressable
                          style={s.unpinBtn}
                          accessibilityLabel="Bỏ ghim vị trí"
                          onPress={() => {
                            form.update('latitude', '');
                            form.update('longitude', '');
                          }}
                        >
                          <Feather name="x" size={14} color={c.textSecondary} />
                          <Text style={s.unpinText}>Bỏ ghim vị trí</Text>
                        </AnimatedPressable>
                      )}
                      <InlineError message={errors.latitude} />
                    </View>
                  )}
                </View>
              )}

              {/* ============================================================ */}
              {/* STEP 3: TIỆN ÍCH & QUY ĐỊNH                                   */}
              {/* ============================================================ */}
              {step === 2 && (
                <View style={s.stepStack}>
                  <View style={[s.cardGroup, { padding: 0, gap: 0, overflow: 'hidden' }]}>
                    {/* Row 1: Tiện ích chung */}
                    {at(
                      'amenities',
                      <View>
                        <AnimatedPressable
                          scaleTo={0.99}
                          style={s.summaryPickerRow}
                          accessibilityLabel={`Tiện ích chung, đã chọn ${values.amenities.length} mục`}
                          onPress={() => {
                            Keyboard.dismiss();
                            setModal('amenities');
                          }}
                        >
                          <View style={s.rowIconBox}>
                            <Feather name="check-square" size={17} color={c.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <View style={s.summaryPickerHead}>
                              <Text style={s.rowPrimaryText}>Tiện ích chung</Text>
                              <View style={s.countChip}>
                                <Text style={s.countChipText}>
                                  {values.amenities.length}/{AMENITIES.length}
                                </Text>
                              </View>
                            </View>
                            <Text style={s.rowSecondaryText} numberOfLines={2}>
                              {amenitiesSummary}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={c.textMuted} />
                        </AnimatedPressable>
                        {errors.amenities ? (
                          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                            <InlineError message={errors.amenities} />
                          </View>
                        ) : null}
                      </View>
                    )}

                    <View style={s.rowHairline} />

                    {/* Row 2: Quy định nhà trọ */}
                    {at(
                      'selectedRules',
                      <View>
                        <AnimatedPressable
                          scaleTo={0.99}
                          style={s.summaryPickerRow}
                          accessibilityLabel={`Quy định nhà trọ, đã chọn ${values.selectedRules.length} mục`}
                          onPress={() => {
                            Keyboard.dismiss();
                            setModal('rules');
                          }}
                        >
                          <View style={s.rowIconBox}>
                            <Feather name="shield" size={17} color={c.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <View style={s.summaryPickerHead}>
                              <Text style={s.rowPrimaryText}>Quy định nhà trọ</Text>
                              <View style={s.countChip}>
                                <Text style={s.countChipText}>
                                  {values.selectedRules.length}/{RULES.length}
                                </Text>
                              </View>
                            </View>
                            <Text style={s.rowSecondaryText} numberOfLines={2}>
                              {rulesSummary}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={c.textMuted} />
                        </AnimatedPressable>
                        {!quiet && errors.selectedRules ? (
                          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                            <InlineError message={errors.selectedRules} />
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {/* Conditional Quiet Hours Input — ONLY visible when Giờ trật tự is enabled */}
                  {!!quiet && (
                    <View style={s.cardGroup}>
                      <AuthInput
                        label="Giờ bắt đầu giữ trật tự (HH:mm)"
                        value={
                          quiet.match(quietHours)?.[1] ??
                          (quiet === 'quietHours' ? '23:00' : quiet.slice(11))
                        }
                        onChangeText={value =>
                          form.update(
                            'selectedRules',
                            values.selectedRules.map(item =>
                              item === quiet ? `quietHours:${value}` : item
                            )
                          )
                        }
                        maxLength={5}
                        placeholder="23:00"
                        hint="Định dạng 24 giờ, ví dụ: 22:30 hoặc 23:00"
                        error={errors.selectedRules}
                      />
                    </View>
                  )}

                  {/* Other Rules */}
                  <View style={s.cardGroup}>
                    {input('rules', 'Quy định khác', 2000, {
                      multiline: true,
                      optional: true,
                      placeholder: 'Nhập thêm quy định riêng của nhà trọ nếu có…',
                    })}
                  </View>
                </View>
              )}

              {/* ============================================================ */}
              {/* STEP 4: HÌNH ẢNH                                              */}
              {/* ============================================================ */}
              {step === 3 &&
                at(
                  'photos',
                  <View style={s.stepStack}>
                    <View style={s.photoMetaRow}>
                      <Text style={s.photoMetaText}>
                        {files.photos.length}/10 ảnh · Tối đa 5 MB/ảnh
                      </Text>
                      <AnimatedPressable
                        style={s.tipLinkBtn}
                        onPress={() => setTipsOpen(v => !v)}
                      >
                        <Feather name="info" size={13} color={c.primary} />
                        <Text style={s.tipLinkText}>
                          {tipsOpen ? 'Ẩn gợi ý' : 'Gợi ý chụp'}
                        </Text>
                      </AnimatedPressable>
                    </View>

                    {tipsOpen && (
                      <View style={s.infoNotice}>
                        <Feather name="camera" size={15} color={c.primary} style={{ marginTop: 1 }} />
                        <Text style={s.infoNoticeText}>
                          Chụp mặt tiền, lối vào và khu vực chung trong ánh sáng rõ. Tránh để giấy
                          tờ cá nhân lọt vào khung hình.
                        </Text>
                      </View>
                    )}

                    {/* Only warn "Cần chọn lại" if draft photos actually could not be restored */}
                    {missing.includes('photos') && files.photos.length === 0 && (
                      <View style={s.warningNotice}>
                        <Feather
                          name="alert-triangle"
                          size={15}
                          color="#9A5B0A"
                          style={{ marginTop: 1 }}
                        />
                        <Text style={s.warningNoticeText}>
                          Cần chọn lại ảnh nhà trọ từ bản nháp trước khi tiếp tục.
                        </Text>
                      </View>
                    )}

                    {form.picking === 'photos' && (
                      <View style={s.infoNotice} accessibilityLiveRegion="polite">
                        <ActivityIndicator size="small" color={c.primary} />
                        <Text style={s.infoNoticeText}>Đang đọc ảnh đã chọn…</Text>
                      </View>
                    )}

                    <InlineError message={fileErrors.photos || errors.photos} />
                    {!!fileErrors.photos && (
                      <Action
                        label="Thử lại chọn ảnh"
                        icon="refresh-cw"
                        disabled={blocked || files.photos.length >= 10}
                        onPress={() => void form.pickPhotos(false)}
                      />
                    )}

                    {files.photos.length === 0 ? (
                      /* Empty Upload Zone */
                      <View style={s.emptyPhotoZone}>
                        <View style={s.emptyPhotoIcon}>
                          <Feather name="image" size={28} color={c.primary} />
                        </View>
                        <Text style={s.emptyPhotoTitle}>Thêm ảnh thực tế nhà trọ</Text>
                        <Text style={s.emptyPhotoDesc}>
                          Chọn tối thiểu 1 ảnh (JPG, PNG, WebP). Ảnh đầu tiên sẽ làm ảnh bìa.
                        </Text>
                        <View style={s.emptyPhotoActions}>
                          <AnimatedPressable
                            scaleTo={0.97}
                            accessibilityLabel="Chụp ảnh"
                            disabled={blocked}
                            style={s.photoActionSecondary}
                            onPress={() => void form.pickPhotos(true)}
                          >
                            <Feather name="camera" size={16} color={c.primary} />
                            <Text style={s.photoActionSecondaryText}>Chụp ảnh</Text>
                          </AnimatedPressable>
                          <AnimatedPressable
                            scaleTo={0.97}
                            accessibilityLabel="Chọn ảnh từ thư viện"
                            disabled={blocked}
                            style={s.photoActionPrimary}
                            onPress={() => void form.pickPhotos(false)}
                          >
                            <Feather name="image" size={16} color="#FFFFFF" />
                            <Text style={s.photoActionPrimaryText}>Chọn ảnh</Text>
                          </AnimatedPressable>
                        </View>
                      </View>
                    ) : (
                      /* Thumbnail Grid + Compact Add Bar */
                      <>
                        <View style={s.photoGrid}>
                          {files.photos.map((asset, index) => (
                            <PhotoThumbnailTile
                              key={asset.uri}
                              asset={asset}
                              index={index}
                              disabled={blocked}
                              onMakeCover={() => form.makeCover(asset)}
                              onRemove={() => form.removePhoto(asset)}
                            />
                          ))}
                        </View>

                        {files.photos.length < 10 && (
                          <View style={s.compactAddPhotoRow}>
                            <AnimatedPressable
                              scaleTo={0.97}
                              accessibilityLabel="Chụp thêm ảnh"
                              disabled={blocked}
                              style={s.photoActionSecondary}
                              onPress={() => void form.pickPhotos(true)}
                            >
                              <Feather name="camera" size={15} color={c.primary} />
                              <Text style={s.photoActionSecondaryText}>Chụp thêm</Text>
                            </AnimatedPressable>
                            <AnimatedPressable
                              scaleTo={0.97}
                              accessibilityLabel="Chọn thêm ảnh"
                              disabled={blocked}
                              style={s.photoActionSecondary}
                              onPress={() => void form.pickPhotos(false)}
                            >
                              <Feather name="plus" size={15} color={c.primary} />
                              <Text style={s.photoActionSecondaryText}>Chọn thêm ảnh</Text>
                            </AnimatedPressable>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                )}

              {/* ============================================================ */}
              {/* STEP 5: HỒ SƠ XÁC MINH                                        */}
              {/* ============================================================ */}
              {step === 4 && (
                <View style={s.stepStack}>
                  <Text style={s.docFormatHint}>
                    Hỗ trợ PDF, JPG, PNG hoặc WebP · Tối đa 10 MB/tệp.
                  </Text>

                  {/* Unified Document List Card */}
                  <View style={[s.cardGroup, { padding: 0, gap: 0, overflow: 'hidden' }]}>
                    {DOCUMENTS.map(([key, label], index) => {
                      const file = files[key];
                      const isPicking = form.picking === key;
                      const hasError = Boolean(fileErrors[key] || errors[key]);
                      const needsReselect = !file && missing.includes(key) && !(key === 'idCard' && form.canReuse);
                      const isReused = key === 'idCard' && form.canReuse && !file;

                      const statusMeta = isPicking || form.busy
                        ? { label: 'Đang tải…', bg: '#EFF7F4', fg: c.primary }
                        : file
                        ? { label: 'Đã chọn', bg: '#E8F5EE', fg: c.primary }
                        : isReused
                        ? { label: 'Dùng lại căn cước', bg: '#E8F5EE', fg: c.primary }
                        : needsReselect || hasError
                        ? { label: 'Cần chọn lại', bg: '#FEF6E7', fg: '#9A5B0A' }
                        : { label: 'Chưa có', bg: '#F1F5F3', fg: c.textSecondary };

                      const shortActionLabel = fileErrors[key]
                        ? 'Thử lại'
                        : file
                        ? 'Thay tệp'
                        : 'Chọn tệp';

                      return (
                        <View
                          key={key}
                          onLayout={event => {
                            offsets.current[key] = event.nativeEvent.layout.y;
                          }}
                          style={[
                            s.docRow,
                            index < DOCUMENTS.length - 1 && s.docRowBorder,
                          ]}
                        >
                          <View style={s.docRowTop}>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={s.docName}>{label}</Text>
                              <View style={s.docStatusLine}>
                                <View style={[s.miniPill, { backgroundColor: statusMeta.bg }]}>
                                  <Text style={[s.miniPillText, { color: statusMeta.fg }]}>
                                    {statusMeta.label}
                                  </Text>
                                </View>
                                {file?.fileName ? (
                                  <Text style={s.docFileName} numberOfLines={1}>
                                    {file.fileName}
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            <View style={s.docActionGroup}>
                              <AnimatedPressable
                                scaleTo={0.97}
                                disabled={blocked}
                                accessibilityLabel={`${shortActionLabel} cho ${label}`}
                                style={[
                                  s.docActionBtn,
                                  !file && !isReused && s.docActionBtnPrimary,
                                ]}
                                onPress={() => void form.pickDocument(key)}
                              >
                                <Text
                                  style={[
                                    s.docActionBtnText,
                                    !file && !isReused && { color: c.primary },
                                  ]}
                                >
                                  {shortActionLabel}
                                </Text>
                              </AnimatedPressable>

                              {file && (
                                <AnimatedPressable
                                  accessibilityLabel={`Bỏ tệp ${label}`}
                                  disabled={blocked}
                                  style={s.docRemoveBtn}
                                  onPress={() => form.removeDocument(key)}
                                >
                                  <Feather name="x" size={16} color={c.textSecondary} />
                                </AnimatedPressable>
                              )}
                            </View>
                          </View>

                          {key === 'idCard' &&
                            !!form.eligibility?.identityApplicationId &&
                            !file && (
                              <AnimatedPressable
                                scaleTo={0.99}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: form.reuse }}
                                style={s.reuseRow}
                                onPress={form.toggleReuse}
                              >
                                <Feather
                                  name={form.reuse ? 'check-square' : 'square'}
                                  size={18}
                                  color={form.reuse ? c.primary : c.textMuted}
                                />
                                <Text style={s.reuseText}>
                                  Dùng lại căn cước đã nộp từ hồ sơ chủ trọ
                                </Text>
                              </AnimatedPressable>
                            )}

                          {(fileErrors[key] || errors[key]) && (
                            <InlineError message={fileErrors[key] || errors[key]} />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={s.privacyNote}>
                    <Feather name="lock" size={14} color={c.primary} style={{ marginTop: 1 }} />
                    <Text style={s.privacyNoteText}>
                      Tài liệu xác minh được lưu trữ bảo mật riêng cho mục đích xét duyệt nội bộ và
                      không hiển thị công khai tới người thuê.
                    </Text>
                  </View>
                </View>
              )}

              {/* ============================================================ */}
              {/* STEP 6: KIỂM TRA & GỬI                                        */}
              {/* ============================================================ */}
              {step === 5 && (
                <View style={s.stepStack}>
                  {/* Missing items callout if anything is incomplete */}
                  {incompleteSteps.length > 0 && (
                    <View style={s.warningCard} accessibilityRole="alert">
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="alert-circle" size={16} color="#9A5B0A" />
                        <Text style={s.warningCardTitle}>
                          Còn {incompleteSteps.length} mục cần bổ sung trước khi gửi
                        </Text>
                      </View>
                      {incompleteSteps.map(item => (
                        <AnimatedPressable
                          key={item.stepIndex}
                          style={s.missingItemRow}
                          onPress={() => form.edit(item.stepIndex)}
                        >
                          <Text style={s.missingItemText} numberOfLines={2}>
                            • <Text style={{ fontWeight: '700' }}>{item.title}:</Text> {item.detail}
                          </Text>
                          <Text style={s.editLink}>Sửa</Text>
                        </AnimatedPressable>
                      ))}
                    </View>
                  )}

                  {/* 5 Compact Summary Rows (real data, small cover thumbnail, no huge expanded photo) */}
                  <View style={[s.cardGroup, { padding: 0, gap: 0, overflow: 'hidden' }]}>
                    {/* Row 1: Thông tin cơ bản */}
                    <ReviewSummaryRow
                      title="Thông tin cơ bản"
                      primary={values.name.trim() || 'Chưa nhập tên nhà trọ'}
                      secondary={[values.propertyType, values.managerName, values.contactPhone]
                        .filter(Boolean)
                        .join(' · ')}
                      onEdit={() => form.edit(0)}
                    />
                    <View style={s.rowHairline} />

                    {/* Row 2: Vị trí */}
                    <ReviewSummaryRow
                      title="Vị trí"
                      primary={
                        [values.addressDetail, values.commune].filter(Boolean).join(', ') ||
                        'Chưa nhập địa chỉ'
                      }
                      secondary={
                        point
                          ? `Đã ghim bản đồ (${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)})`
                          : 'Địa chỉ nhập tay (chưa ghim bản đồ)'
                      }
                      onEdit={() => form.edit(1)}
                    />
                    <View style={s.rowHairline} />

                    {/* Row 3: Tiện ích & Quy định */}
                    <ReviewSummaryRow
                      title="Tiện ích & Quy định"
                      primary={`${values.amenities.length} tiện ích · ${values.selectedRules.length} quy định`}
                      secondary={
                        values.amenities.length || values.selectedRules.length
                          ? [
                              values.amenities.length ? amenitiesSummary : null,
                              values.selectedRules.length ? rulesSummary : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : 'Chưa chọn tiện ích hoặc quy định'
                      }
                      onEdit={() => form.edit(2)}
                    />
                    <View style={s.rowHairline} />

                    {/* Row 4: Hình ảnh (small 48x48 cover thumbnail) */}
                    <ReviewSummaryRow
                      title="Hình ảnh"
                      primary={
                        files.photos.length > 0
                          ? `${files.photos.length} ảnh nhà trọ`
                          : missing.includes('photos')
                          ? 'Cần chọn lại ảnh từ bản nháp'
                          : 'Chưa chọn ảnh'
                      }
                      secondary={
                        files.photos.length > 0
                          ? 'Ảnh đầu tiên sẽ hiển thị làm ảnh bìa'
                          : 'Yêu cầu tối thiểu 1 ảnh'
                      }
                      leftMedia={
                        files.photos[0] ? (
                          <Image
                            accessibilityLabel="Ảnh bìa thu nhỏ"
                            source={{ uri: files.photos[0].uri }}
                            style={s.miniCoverThumb}
                            contentFit="cover"
                            cachePolicy="none"
                          />
                        ) : (
                          <View style={[s.miniCoverThumb, s.miniCoverEmpty]}>
                            <Feather name="image" size={18} color={c.textMuted} />
                          </View>
                        )
                      }
                      onEdit={() => form.edit(3)}
                    />
                    <View style={s.rowHairline} />

                    {/* Row 5: Hồ sơ xác minh */}
                    <ReviewSummaryRow
                      title="Hồ sơ xác minh"
                      primary={`${readyDocsCount}/${DOCUMENTS.length} giấy tờ sẵn sàng`}
                      secondary={
                        missingDocLabels.length > 0
                          ? `Cần bổ sung: ${missingDocLabels.join(', ')}`
                          : form.canReuse && !files.idCard
                          ? 'Đủ giấy phép, PCCC và dùng lại căn cước chủ trọ'
                          : 'Đủ giấy phép kinh doanh, căn cước và PCCC'
                      }
                      onEdit={() => form.edit(4)}
                    />
                  </View>

                  {/* Terms Consent Checkbox */}
                  {at(
                    'termsAccepted',
                    <View style={{ gap: 6 }}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: values.termsAccepted }}
                        accessibilityLabel="Tôi cam kết thông tin và tài liệu cung cấp là chính xác"
                        style={[
                          s.consentCard,
                          values.termsAccepted && s.consentCardChecked,
                        ]}
                        onPress={() => form.update('termsAccepted', !values.termsAccepted)}
                      >
                        <Feather
                          name={values.termsAccepted ? 'check-square' : 'square'}
                          size={22}
                          color={values.termsAccepted ? c.primary : c.textMuted}
                        />
                        <Text style={s.consentText}>
                          Tôi cam kết các thông tin và giấy tờ cung cấp là đúng thực tế và chịu
                          trách nhiệm trước hệ thống.
                        </Text>
                      </Pressable>
                      <InlineError message={errors.termsAccepted} />
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Sticky Footer Outside ScrollView */}
        {!form.restoring && !form.receipt && (
          <View style={s.footer}>
            <AnimatedPressable
              scaleTo={0.98}
              accessibilityLabel="Lưu nháp hồ sơ"
              disabled={blocked}
              style={[s.saveDraftBtn, form.draftSaved && s.saveDraftBtnSaved]}
              onPress={() => {
                Keyboard.dismiss();
                void form.saveDraft(step, false);
              }}
            >
              {form.draftSaved && <Feather name="check" size={14} color={c.primary} />}
              <Text style={s.saveDraftText}>
                {form.saving ? 'Đang lưu…' : form.draftSaved ? 'Đã lưu nháp' : 'Lưu nháp'}
              </Text>
            </AnimatedPressable>

            <PrimaryButton
              title={
                step === 5
                  ? 'Gửi xét duyệt'
                  : form.editing
                  ? 'Về bước kiểm tra'
                  : 'Tiếp tục'
              }
              style={s.nextBtn}
              loading={form.busy}
              disabled={step === 5 ? !canSubmitFinal : blocked}
              onPress={async () => {
                Keyboard.dismiss();
                if (await form.advance()) setModal('submit');
              }}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Guide Modal */}
      {modal === 'guide' && (
        <RegistrationSheet title={`Hướng dẫn · Bước ${step + 1}/6`} onClose={() => setModal(null)}>
          <View style={s.cardGroup}>
            <Text style={s.groupHeading}>{STEPS[step]}</Text>
            <Text style={s.guideText}>{GUIDES[step]}</Text>
          </View>
        </RegistrationSheet>
      )}

      {/* Property Type Picker Bottom Sheet */}
      <SingleSelectSheet
        visible={modal === 'propertyType'}
        title="Chọn loại hình nhà trọ"
        options={[
          ...PROPERTY_TYPES.map(type => ({ key: type, label: type })),
          { key: '__CUSTOM__', label: 'Khác (tự nhập)' },
        ]}
        selectedValue={hasCustomType ? '__CUSTOM__' : values.propertyType}
        onClose={() => setModal(null)}
        onSelect={selectedKey => {
          form.update('propertyType', selectedKey === '__CUSTOM__' ? '' : selectedKey);
        }}
      />

      {/* Area Picker Bottom Sheet */}
      <SingleSelectSheet
        visible={modal === 'commune'}
        title="Chọn khu vực Hòa Lạc"
        options={PROPERTY_AREAS.map(area => ({ key: area, label: area }))}
        selectedValue={values.commune}
        onClose={() => setModal(null)}
        onSelect={area => form.update('commune', area)}
      />

      {/* Amenities Checklist Bottom Sheet */}
      <MultiSelectChecklistSheet
        visible={modal === 'amenities'}
        title="Chọn tiện ích chung"
        items={AMENITIES}
        selectedCount={values.amenities.length}
        isSelected={key => values.amenities.includes(key)}
        onToggle={key => toggleItem('amenities', key)}
        onClose={() => setModal(null)}
      />

      {/* Rules Checklist Bottom Sheet */}
      <MultiSelectChecklistSheet
        visible={modal === 'rules'}
        title="Chọn quy định nhà trọ"
        items={RULES}
        selectedCount={values.selectedRules.length}
        isSelected={key =>
          key === 'quietHours' ? Boolean(quiet) : values.selectedRules.includes(key)
        }
        onToggle={key => {
          if (key === 'quietHours') {
            form.update(
              'selectedRules',
              quiet
                ? values.selectedRules.filter(item => item !== quiet)
                : [...values.selectedRules, 'quietHours:23:00']
            );
          } else {
            toggleItem('selectedRules', key);
          }
        }}
        onClose={() => setModal(null)}
      />

      {/* Location Map Picker Sheet */}
      {modal === 'location' && (
        <LocationSheet
          values={values}
          onClose={() => setModal(null)}
          onApply={(nextPoint, suggested) => {
            form.update('latitude', nextPoint.latitude.toFixed(7));
            form.update('longitude', nextPoint.longitude.toFixed(7));
            if (suggested?.addressDetail) {
              form.update('addressDetail', suggested.addressDetail.slice(0, 255));
            }
            if (suggested?.commune && PROPERTY_AREAS.includes(suggested.commune)) {
              form.update('commune', suggested.commune);
            }
            if (suggested?.nearby) {
              form.update('nearby', suggested.nearby.slice(0, 255));
            }
            setModal(null);
          }}
        />
      )}

      {/* Confirm Submit Dialog */}
      {modal === 'submit' && (
        <ConfirmDialog
          title="Gửi hồ sơ xét duyệt?"
          description={`${values.name} · ${values.addressDetail}, ${values.commune}`}
          confirmLabel="Xác nhận gửi"
          busy={form.busy}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            const id = await form.submit();
            setModal(null);
            if (id) void host.store.refresh();
          }}
        />
      )}

      {/* Confirm Leave Dialog */}
      {leave && (
        <ConfirmDialog
          title="Rời hồ sơ đăng ký?"
          description="Các thay đổi chưa lưu nháp sẽ không được giữ."
          confirmLabel="Rời hồ sơ"
          cancelLabel="Tiếp tục nhập"
          onCancel={() => setLeave(null)}
          onConfirm={() => {
            setLeave(null);
            leave();
          }}
        />
      )}
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 6 Compact Review Row                                                   */
/* -------------------------------------------------------------------------- */

function ReviewSummaryRow({
  title,
  primary,
  secondary,
  leftMedia,
  onEdit,
}: {
  title: string;
  primary: string;
  secondary?: string;
  leftMedia?: ReactNode;
  onEdit: () => void;
}) {
  return (
    <View style={s.reviewRow}>
      {leftMedia}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.reviewRowLabel}>{title}</Text>
        <Text style={s.reviewRowPrimary} numberOfLines={2}>
          {primary}
        </Text>
        {secondary ? (
          <Text style={s.reviewRowSecondary} numberOfLines={2}>
            {secondary}
          </Text>
        ) : null}
      </View>
      <AnimatedPressable
        accessibilityLabel={`Sửa ${title}`}
        style={s.reviewEditBtn}
        onPress={onEdit}
      >
        <Text style={s.editLink}>Sửa</Text>
      </AnimatedPressable>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: authSpacing.xs,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: c.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: authRadius.round,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: c.forestInk,
  },
  progressBlock: {
    gap: 6,
    paddingHorizontal: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressStepPill: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  progressStepName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: c.textSecondary,
  },
  editingBadge: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#9A5B0A',
    backgroundColor: '#FEF6E7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: authRadius.round,
  },
  track: {
    height: 5,
    borderRadius: 99,
    backgroundColor: c.softMint,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 99,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  stepHeading: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    color: c.forestInk,
    letterSpacing: -0.3,
  },
  stepStack: {
    gap: 16,
  },
  cardGroup: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 14,
  },
  groupHeading: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  optionalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingVertical: 6,
  },
  optionalTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconPinned: {
    backgroundColor: '#E8F5EE',
  },
  rowPrimaryText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  rowSecondaryText: {
    fontSize: 12,
    lineHeight: 18,
    color: c.textSecondary,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: authRadius.round,
  },
  miniPillOk: {
    backgroundColor: '#E8F5EE',
  },
  miniPillNeutral: {
    backgroundColor: '#F1F5F3',
  },
  miniPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  unpinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 4,
  },
  unpinText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  summaryPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 68,
  },
  summaryPickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countChip: {
    backgroundColor: '#EFF7F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: authRadius.round,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  rowHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  photoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  photoMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.forestInk,
    fontVariant: ['tabular-nums'],
  },
  tipLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 4,
  },
  tipLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
  },
  emptyPhotoZone: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C5DDD4',
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyPhotoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyPhotoTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: c.forestInk,
  },
  emptyPhotoDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyPhotoActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  compactAddPhotoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  photoActionSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  photoActionPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: authRadius.md,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  photoActionPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  docFormatHint: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  docRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  docRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  docRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  docStatusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  docFileName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  docActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docActionBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: authRadius.md,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docActionBtnPrimary: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
  },
  docActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.forestInk,
  },
  docRemoveBtn: {
    width: 36,
    height: 40,
    borderRadius: authRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    paddingTop: 2,
  },
  reuseText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.forestInk,
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    padding: 12,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.primaryDark,
  },
  warningCard: {
    backgroundColor: '#FEF9EE',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F6DFB0',
    padding: 14,
    gap: 8,
  },
  warningCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A5B0A',
  },
  missingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
  },
  missingItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.forestInk,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reviewRowLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reviewRowPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: c.forestInk,
  },
  reviewRowSecondary: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textSecondary,
  },
  reviewEditBtn: {
    minWidth: 44,
    minHeight: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  editLink: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  miniCoverThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EEF4F1',
  },
  miniCoverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
  },
  consentCardChecked: {
    backgroundColor: '#F4FBF8',
    borderColor: '#CBE6D8',
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: c.forestInk,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF7F4',
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: c.primaryDark,
  },
  warningNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF9EE',
    borderWidth: 1,
    borderColor: '#F6DFB0',
    borderRadius: authRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#9A5B0A',
  },
  dismissIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  saveDraftBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: authRadius.lg,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  saveDraftBtnSaved: {
    backgroundColor: '#EFF7F4',
    borderColor: '#CBE6D8',
  },
  saveDraftText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  nextBtn: {
    flex: 1,
    minHeight: 48,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  mutedText: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
  },
  receiptCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  receiptIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
    color: c.forestInk,
    textAlign: 'center',
  },
  receiptDesc: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 22,
    color: c.forestInk,
  },
});
