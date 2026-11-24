import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { MotionTokens, triggerHaptic, useReducedMotionPreference } from '@/constants/motion';
import { useAuth } from '@/context/auth-context';
import { tokenStore, type PhoneChallenge } from '@/services/auth';
import { confirmPhoneVerification } from '@/services/host-onboarding-upload';
import {
  computeOtpTimings,
  extractRateLimitSeconds,
  formatCountdownMMSS,
  isValidVietnamMobile,
  maskVietnamPhone,
  normalizeVietnamPhone,
  sanitizeOtpInput,
  type PhoneVerificationStep,
} from '@/services/phone-verification';

export interface PhoneVerificationSheetProps {
  visible: boolean;
  initialPhone?: string;
  /** Label for the final confirmation CTA. Defaults to "Xác minh và lưu" because the API verifies OTP and persists the verified phone to profile. */
  confirmLabel?: string;
  onClose: () => void;
  onVerified: (phoneNumber: string) => void;
}

const OTP_LENGTH = 6;
const OTP_INDICES = [0, 1, 2, 3, 4, 5] as const;

export function PhoneVerificationSheet(props: PhoneVerificationSheetProps) {
  if (!props.visible) return null;
  return <PhoneVerificationSheetContent {...props} />;
}

function PhoneVerificationSheetContent({
  initialPhone,
  confirmLabel = 'Xác minh và lưu',
  onClose,
  onVerified,
}: PhoneVerificationSheetProps) {
  const { sendPhoneOtp, verifyPhoneOtp, retry } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotionPreference();

  const [step, setStep] = useState<PhoneVerificationStep>('PHONE_ENTRY');
  const [phoneInput, setPhoneInput] = useState(() => normalizeVietnamPhone(initialPhone) || '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [rateLimitUntilMs, setRateLimitUntilMs] = useState<number | null>(null);

  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [verifiedOnServer, setVerifiedOnServer] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const phoneInputRef = useRef<TextInputInstance | null>(null);
  const otpInputRef = useRef<TextInputInstance | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reanimated shared values (sheet entrance, error shake, success pop)
  const sheetTranslateY = useSharedValue(reducedMotion ? 0 : 40);
  const backdropOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const errorShakeX = useSharedValue(0);
  const successScale = useSharedValue(reducedMotion ? 1 : 0.7);
  const [shakeTick, setShakeTick] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    if (reducedMotion) {
      backdropOpacity.set(1);
      sheetTranslateY.set(0);
    } else {
      backdropOpacity.set(withTiming(1, MotionTokens.timing.fade));
      sheetTranslateY.set(withSpring(0, MotionTokens.spring.sheet));
    }
    return () => {
      mountedRef.current = false;
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [backdropOpacity, reducedMotion, sheetTranslateY]);

  useEffect(() => {
    if (shakeTick === 0 || reducedMotion) return;
    errorShakeX.set(
      withSequence(
        withTiming(-7, { duration: 45 }),
        withTiming(7, { duration: 45 }),
        withTiming(-5, { duration: 45 }),
        withTiming(5, { duration: 45 }),
        withTiming(0, { duration: 45 })
      )
    );
  }, [shakeTick, reducedMotion, errorShakeX]);

  useEffect(() => {
    if (!completedSuccess) return;
    successScale.set(reducedMotion ? 1 : withSpring(1, MotionTokens.spring.checkPop));
  }, [completedSuccess, reducedMotion, successScale]);

  // Track real keyboard height accurately on both iOS and Android
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      const height = event.endCoordinates?.height ?? 0;
      setKeyboardHeight(height > 0 ? height : 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 1-second ticker strictly when a countdown or expiry is active
  useEffect(() => {
    if (!challenge && !rateLimitUntilMs) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [challenge, rateLimitUntilMs]);

  // Focus OTP input gently when entering OTP_VERIFICATION
  useEffect(() => {
    if (step !== 'OTP_VERIFICATION' || completedSuccess) return;
    const focusTimer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, reducedMotion ? 40 : 180);
    return () => clearTimeout(focusTimer);
  }, [step, completedSuccess, reducedMotion]);

  const triggerErrorShake = () => {
    void triggerHaptic('medium');
    if (!reducedMotion) setShakeTick(prev => prev + 1);
  };

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const otpShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShakeX.value }],
  }));

  const successIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const isBusy = sending || resending || verifying || completedSuccess;
  const normalizedPhone = normalizeVietnamPhone(phoneInput);
  const phoneIsValid = isValidVietnamMobile(phoneInput);
  const rateLimitSecondsLeft = rateLimitUntilMs
    ? Math.max(0, Math.ceil((rateLimitUntilMs - nowMs) / 1000))
    : 0;
  const isRateLimited = rateLimitSecondsLeft > 0;

  const inlinePhoneValidation =
    phoneError ||
    (phoneTouched && phoneInput.trim().length > 0 && !phoneIsValid
      ? 'Số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.'
      : null);

  const timings = computeOtpTimings(challenge, nowMs);

  const handleSafeClose = () => {
    if (isBusy) return;
    Keyboard.dismiss();
    onClose();
  };

  const handleBackdropPress = () => {
    if (isBusy) return;
    // Do not accidentally close sheet while user has keyboard open typing phone or OTP
    if (keyboardHeight > 0) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  const handleRequestClose = () => {
    if (isBusy) return;
    if (step === 'OTP_VERIFICATION' && !verifiedOnServer) {
      handleChangePhone();
      return;
    }
    handleSafeClose();
  };

  const handleChangePhone = () => {
    if (isBusy) return;
    setStep('PHONE_ENTRY');
    setOtpCode('');
    setOtpError(null);
    setOtpNotice(null);
    setVerifiedOnServer(false);
    setPhoneError(null);
  };

  const handleSendOtp = async () => {
    if (lockRef.current || isBusy || isRateLimited) return;
    setPhoneTouched(true);

    if (!phoneIsValid) {
      setPhoneError('Nhập số điện thoại di động Việt Nam hợp lệ (ví dụ: 0912345678).');
      triggerErrorShake();
      return;
    }

    lockRef.current = true;
    setSending(true);
    setPhoneError(null);

    try {
      const nextChallenge = await sendPhoneOtp(normalizedPhone);
      if (!mountedRef.current) return;
      setChallenge(nextChallenge);
      setPhoneInput(normalizeVietnamPhone(nextChallenge.phoneNumber) || normalizedPhone);
      setOtpCode('');
      setOtpError(null);
      setOtpNotice(null);
      setVerifiedOnServer(false);
      setRateLimitUntilMs(null);
      setNowMs(Date.now());
      setStep('OTP_VERIFICATION');
      void triggerHaptic('light');
    } catch (cause) {
      if (!mountedRef.current) return;
      const message =
        cause instanceof Error ? cause.message : 'Chưa thể gửi mã xác minh. Vui lòng thử lại.';
      setPhoneError(message);
      const waitSec = extractRateLimitSeconds(message);
      if (waitSec) {
        setRateLimitUntilMs(Date.now() + waitSec * 1000);
        setNowMs(Date.now());
      }
      triggerErrorShake();
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  };

  const handleResendOtp = async () => {
    if (lockRef.current || isBusy || !challenge || !timings.canResend) return;

    lockRef.current = true;
    setResending(true);
    setOtpError(null);
    setOtpNotice(null);

    try {
      const nextChallenge = await sendPhoneOtp(challenge.phoneNumber);
      if (!mountedRef.current) return;
      setChallenge(nextChallenge);
      setOtpCode('');
      setVerifiedOnServer(false);
      setNowMs(Date.now());
      setOtpNotice('Đã gửi lại mã xác minh mới.');
      void triggerHaptic('light');
      otpInputRef.current?.focus();
    } catch (cause) {
      if (!mountedRef.current) return;
      const message =
        cause instanceof Error ? cause.message : 'Chưa thể gửi lại mã. Vui lòng thử lại.';
      setOtpError(message);
      const waitSec = extractRateLimitSeconds(message);
      if (waitSec && challenge) {
        setChallenge({
          ...challenge,
          resendAt: new Date(Date.now() + waitSec * 1000).toISOString(),
        });
        setNowMs(Date.now());
      }
      triggerErrorShake();
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setResending(false);
    }
  };

  const handleVerifyAndSave = async () => {
    if (lockRef.current || isBusy || !challenge) return;

    if (!verifiedOnServer) {
      if (otpCode.length !== OTP_LENGTH) {
        setOtpError('Vui lòng nhập đủ 6 chữ số xác minh.');
        triggerErrorShake();
        return;
      }
      if (timings.isExpired) {
        setOtpError('Mã xác minh đã hết hạn. Vui lòng nhấn "Gửi lại mã".');
        triggerErrorShake();
        return;
      }
    }

    lockRef.current = true;
    setVerifying(true);
    setOtpError(null);
    setOtpNotice(null);
    Keyboard.dismiss();

    try {
      if (!verifiedOnServer) {
        await verifyPhoneOtp(challenge.phoneNumber, otpCode);
        if (!mountedRef.current) return;
        setVerifiedOnServer(true);
      }

      const token = await tokenStore.get();
      if (!token) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      await confirmPhoneVerification(challenge.phoneNumber, token);
      await retry();
      if (!mountedRef.current) return;

      setCompletedSuccess(true);
      void triggerHaptic('success');

      const verifiedPhone = challenge.phoneNumber;
      successTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onVerified(verifiedPhone);
        }
      }, reducedMotion ? 120 : 520);
    } catch (cause) {
      if (!mountedRef.current) return;
      const message =
        cause instanceof Error ? cause.message : 'Chưa thể xác minh số điện thoại. Vui lòng thử lại.';
      if (message.includes('xác minh OTP') || message.includes('hết hạn')) {
        setVerifiedOnServer(false);
      }
      setOtpError(message);
      triggerErrorShake();
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setVerifying(false);
    }
  };

  // Compute safe adaptive sheet height bounded above keyboard + top safe area
  const bottomInset = keyboardHeight > 0 ? keyboardHeight + 6 : Math.max(insets.bottom, 16);
  const sheetMaxHeight = Math.max(260, windowHeight - bottomInset - insets.top - 16);

  const canSubmitPhone = phoneIsValid && !isBusy && !isRateLimited;
  const canSubmitOtp =
    !isBusy &&
    (verifiedOnServer || (otpCode.length === OTP_LENGTH && !timings.isExpired));

  const primaryOtpCtaLabel = verifying
    ? 'Đang xác minh…'
    : verifiedOnServer
      ? 'Lưu số điện thoại'
      : confirmLabel;

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      <View style={s.modalRoot}>
        {/* Backdrop blocks all touches to underlying registration wizard */}
        <Animated.View style={[s.backdrop, backdropAnimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Đóng hộp thoại xác minh"
            onPress={handleBackdropPress}
          />
        </Animated.View>

        {/* Bottom-docked adaptive sheet */}
        <View
          style={[s.sheetDock, { paddingBottom: bottomInset }]}
          pointerEvents="box-none"
        >
          <Animated.View
            accessibilityViewIsModal
            style={[s.sheet, { maxHeight: sheetMaxHeight }, sheetAnimStyle]}
          >
            <View style={s.handle} />

            {/* Compact Header */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <View style={s.headerIconBadge}>
                  <Feather
                    name={
                      completedSuccess
                        ? 'check'
                        : step === 'PHONE_ENTRY'
                          ? 'smartphone'
                          : 'shield'
                    }
                    size={16}
                    color={c.primary}
                  />
                </View>
                <Text accessibilityRole="header" style={s.headerTitle} numberOfLines={1}>
                  {completedSuccess
                    ? 'Xác minh hoàn tất'
                    : step === 'PHONE_ENTRY'
                      ? 'Xác minh số điện thoại'
                      : 'Nhập mã xác minh'}
                </Text>
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                disabled={isBusy}
                hitSlop={6}
                style={[s.closeBtn, isBusy && { opacity: 0.45 }]}
                onPress={handleSafeClose}
              >
                <Feather name="x" size={19} color={c.forestInk} />
              </AnimatedPressable>
            </View>

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
            >
              {completedSuccess ? (
                <View style={s.successState}>
                  <Animated.View style={[s.successCircle, successIconStyle]}>
                    <Feather name="check" size={26} color="#FFFFFF" />
                  </Animated.View>
                  <Text style={s.successTitle}>Đã xác minh số điện thoại</Text>
                  <Text style={s.successSub}>
                    {challenge ? maskVietnamPhone(challenge.phoneNumber) : ''} đã được lưu vào tài
                    khoản của bạn.
                  </Text>
                </View>
              ) : step === 'PHONE_ENTRY' ? (
                <Animated.View
                  key="step-phone"
                  entering={reducedMotion ? undefined : FadeIn.duration(180)}
                  exiting={reducedMotion ? undefined : FadeOut.duration(110)}
                  style={s.stepContainer}
                >
                  <Text style={s.subtitle}>
                    Nhập số điện thoại để nhận mã xác minh tài khoản.
                  </Text>

                  <View style={s.fieldBlock}>
                    <Text style={s.fieldLabel}>Số điện thoại di động</Text>

                    <Animated.View style={otpShakeStyle}>
                      <View
                        style={[
                          s.phoneInputBox,
                          Boolean(inlinePhoneValidation) && s.inputBoxError,
                        ]}
                      >
                        <View style={s.countryTag}>
                          <Text style={s.countryTagText}>VN +84</Text>
                        </View>
                        <View style={s.phoneDivider} />
                        <TextInput
                          ref={phoneInputRef}
                          style={s.phoneInput}
                          value={phoneInput}
                          onChangeText={value => {
                            setPhoneInput(value.replace(/[^\d+\s.-]/g, '').slice(0, 16));
                            setPhoneError(null);
                          }}
                          onBlur={() => setPhoneTouched(true)}
                          placeholder="Nhập số điện thoại"
                          placeholderTextColor={c.textMuted}
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          textContentType="telephoneNumber"
                          returnKeyType="done"
                          editable={!isBusy}
                          onSubmitEditing={() => {
                            if (canSubmitPhone) void handleSendOtp();
                          }}
                          accessibilityLabel="Số điện thoại di động"
                        />
                        {phoneInput.length > 0 && !isBusy ? (
                          <Pressable
                            accessibilityLabel="Xóa số điện thoại"
                            hitSlop={8}
                            style={s.clearInputBtn}
                            onPress={() => {
                              setPhoneInput('');
                              setPhoneError(null);
                              phoneInputRef.current?.focus();
                            }}
                          >
                            <Feather name="x-circle" size={16} color={c.textMuted} />
                          </Pressable>
                        ) : null}
                      </View>
                    </Animated.View>

                    {inlinePhoneValidation ? (
                      <View style={s.errorRow} accessibilityRole="alert">
                        <Feather name="alert-circle" size={14} color={c.error} />
                        <Text style={s.errorText}>{inlinePhoneValidation}</Text>
                      </View>
                    ) : null}

                    {isRateLimited ? (
                      <Text style={s.rateLimitText}>
                        Có thể gửi lại mã sau {formatCountdownMMSS(rateLimitSecondsLeft)}.
                      </Text>
                    ) : null}
                  </View>

                  <AnimatedPressable
                    scaleTo={0.985}
                    accessibilityRole="button"
                    accessibilityLabel={sending ? 'Đang gửi mã' : 'Gửi mã xác minh'}
                    accessibilityState={{ disabled: !canSubmitPhone, busy: sending }}
                    disabled={!canSubmitPhone}
                    style={[s.primaryBtn, !canSubmitPhone && s.primaryBtnDisabled]}
                    onPress={() => {
                      void handleSendOtp();
                    }}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : null}
                    <Text style={s.primaryBtnText}>
                      {sending
                        ? 'Đang gửi mã…'
                        : isRateLimited
                          ? `Thử lại sau ${formatCountdownMMSS(rateLimitSecondsLeft)}`
                          : 'Gửi mã xác minh'}
                    </Text>
                  </AnimatedPressable>
                </Animated.View>
              ) : (
                <Animated.View
                  key="step-otp"
                  entering={reducedMotion ? undefined : FadeIn.duration(180)}
                  exiting={reducedMotion ? undefined : FadeOut.duration(110)}
                  style={s.stepContainer}
                >
                  <Text style={s.subtitle}>
                    Nhập mã 6 chữ số được gửi đến số điện thoại của bạn.
                  </Text>

                  {/* Masked Phone Identity + Change Number */}
                  <View style={s.phonePillRow}>
                    <View style={s.phonePillLeft}>
                      <Feather name="phone" size={14} color={c.primary} />
                      <Text style={s.phonePillText}>
                        {challenge ? maskVietnamPhone(challenge.phoneNumber) : ''}
                      </Text>
                    </View>
                    <AnimatedPressable
                      scaleTo={0.97}
                      accessibilityRole="button"
                      accessibilityLabel="Đổi số điện thoại"
                      disabled={isBusy}
                      hitSlop={6}
                      style={[s.changePhoneBtn, isBusy && { opacity: 0.45 }]}
                      onPress={handleChangePhone}
                    >
                      <Text style={s.changePhoneText}>Đổi số</Text>
                    </AnimatedPressable>
                  </View>

                  {/* Unified Single TextInput + 6 Visual OTP Boxes */}
                  <Animated.View style={[s.otpGroup, otpShakeStyle]}>
                    <Pressable
                      accessible={false}
                      style={s.otpBoxesRow}
                      onPress={() => otpInputRef.current?.focus()}
                    >
                      {OTP_INDICES.map(index => {
                        const char = otpCode[index] || '';
                        const isActiveSlot =
                          otpFocused &&
                          !verifiedOnServer &&
                          (index === otpCode.length ||
                            (otpCode.length === OTP_LENGTH && index === OTP_LENGTH - 1));
                        const hasError = Boolean(otpError);

                        return (
                          <View
                            key={index}
                            style={[
                              s.otpCell,
                              Boolean(char) && s.otpCellFilled,
                              isActiveSlot && s.otpCellActive,
                              hasError && s.otpCellError,
                            ]}
                          >
                            {char ? <Text style={s.otpCellText}>{char}</Text> : null}
                            {isActiveSlot && !char ? <View style={s.otpCaret} /> : null}
                          </View>
                        );
                      })}

                      {/* Single underlying TextInput handling typing, backspace, paste & OS OTP autofill */}
                      <TextInput
                        ref={otpInputRef}
                        style={s.hiddenOtpInput}
                        value={otpCode}
                        onChangeText={raw => {
                          const sanitized = sanitizeOtpInput(raw, OTP_LENGTH);
                          setOtpCode(sanitized);
                          setOtpError(null);
                        }}
                        onFocus={() => setOtpFocused(true)}
                        onBlur={() => setOtpFocused(false)}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                        maxLength={OTP_LENGTH}
                        caretHidden
                        editable={!isBusy && !verifiedOnServer}
                        accessibilityLabel="Nhập mã xác minh 6 chữ số"
                      />
                    </Pressable>

                    {otpError ? (
                      <View style={s.errorRow} accessibilityRole="alert">
                        <Feather name="alert-circle" size={14} color={c.error} />
                        <Text style={s.errorText}>{otpError}</Text>
                      </View>
                    ) : timings.isExpired && !verifiedOnServer ? (
                      <View style={s.errorRow} accessibilityRole="alert">
                        <Feather name="clock" size={14} color={c.error} />
                        <Text style={s.errorText}>
                          Mã xác minh đã hết hạn. Vui lòng chọn Gửi lại mã.
                        </Text>
                      </View>
                    ) : otpNotice ? (
                      <View style={s.noticeRow} accessibilityRole="status">
                        <Feather name="check-circle" size={14} color={c.primary} />
                        <Text style={s.noticeText}>{otpNotice}</Text>
                      </View>
                    ) : verifiedOnServer ? (
                      <View style={s.noticeRow} accessibilityRole="status">
                        <Feather name="check-circle" size={14} color={c.primary} />
                        <Text style={s.noticeText}>
                          Mã OTP đã hợp lệ. Nhấn nút bên dưới để hoàn tất lưu số điện thoại.
                        </Text>
                      </View>
                    ) : null}
                  </Animated.View>

                  {/* Resend Countdown / Action Row (Strictly driven by backend timestamps) */}
                  {!verifiedOnServer ? (
                    <View style={s.resendRow}>
                      <Text style={s.resendPrompt}>Chưa nhận được mã?</Text>
                      {resending ? (
                        <View style={s.resendingRow}>
                          <ActivityIndicator size="small" color={c.primary} />
                          <Text style={s.resendWaitText}>Đang gửi lại…</Text>
                        </View>
                      ) : timings.canResend ? (
                        <AnimatedPressable
                          scaleTo={0.97}
                          accessibilityRole="button"
                          accessibilityLabel="Gửi lại mã xác minh"
                          disabled={isBusy}
                          hitSlop={8}
                          style={s.resendBtn}
                          onPress={() => {
                            void handleResendOtp();
                          }}
                        >
                          <Text style={s.resendActionText}>Gửi lại mã</Text>
                        </AnimatedPressable>
                      ) : (
                        <Text style={s.resendWaitText}>
                          Gửi lại sau {timings.resendCountdownLabel}
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Primary Verify & Save CTA */}
                  <AnimatedPressable
                    scaleTo={0.985}
                    accessibilityRole="button"
                    accessibilityLabel={primaryOtpCtaLabel}
                    accessibilityState={{ disabled: !canSubmitOtp, busy: verifying }}
                    disabled={!canSubmitOtp}
                    style={[s.primaryBtn, !canSubmitOtp && s.primaryBtnDisabled]}
                    onPress={() => {
                      void handleVerifyAndSave();
                    }}
                  >
                    {verifying ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                    <Text style={s.primaryBtnText}>{primaryOtpCtaLabel}</Text>
                  </AnimatedPressable>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 45, 41, 0.48)',
  },
  sheetDock: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 10,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: c.forestInk,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 4,
  },
  stepContainer: {
    gap: 14,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  fieldBlock: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.forestInk,
  },
  phoneInputBox: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  inputBoxError: {
    borderColor: c.error,
    backgroundColor: '#FFF8F8',
  },
  countryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: c.softMint,
  },
  countryTagText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  phoneDivider: {
    width: 1,
    height: 22,
    backgroundColor: c.border,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '600',
    color: c.forestInk,
    letterSpacing: 0.4,
  },
  clearInputBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.error,
    fontWeight: '500',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: c.primary,
    fontWeight: '500',
  },
  rateLimitText: {
    fontSize: 12.5,
    color: c.textSecondary,
  },
  phonePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  phonePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phonePillText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: c.forestInk,
    letterSpacing: 0.3,
  },
  changePhoneBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primary,
  },
  otpGroup: {
    gap: 8,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    position: 'relative',
  },
  otpCell: {
    flex: 1,
    height: 52,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: c.forestInk,
    backgroundColor: c.surface,
  },
  otpCellActive: {
    borderColor: c.primary,
    borderWidth: 2,
    backgroundColor: '#F1FAF8',
  },
  otpCellError: {
    borderColor: c.error,
    backgroundColor: '#FFF8F8',
  },
  otpCellText: {
    fontSize: 21,
    fontWeight: '700',
    color: c.forestInk,
  },
  otpCaret: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: c.primary,
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.015,
    fontSize: 20,
    color: 'transparent',
    zIndex: 2,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    gap: 8,
  },
  resendPrompt: {
    fontSize: 13.5,
    color: c.textSecondary,
  },
  resendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendWaitText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  resendBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  resendActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: c.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  primaryBtnDisabled: {
    opacity: 0.48,
  },
  primaryBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  successCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.forestInk,
  },
  successSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
