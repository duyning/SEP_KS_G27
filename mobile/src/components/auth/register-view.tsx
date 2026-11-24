import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInputInstance,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/auth-context';
import { BrandLogo } from '@/components/brand/brand-logo';
import { authApi, validateRegister } from '@/services/auth';
import { AuthInput } from './auth-input';
import { InlineError } from './inline-error';
import { PasswordInput } from './password-input';
import { PrimaryButton } from './primary-button';
import { authColors, authSpacing } from './tokens';

type RegisterFields = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'otp';
type RegisterErrors = Partial<Record<RegisterFields, string>>;
const fieldOrder: RegisterFields[] = ['fullName', 'email', 'password', 'confirmPassword', 'otp'];

export function RegisterView() {
  const insets = useSafeAreaInsets();
  const { user, loading, signUp } = useAuth();

  const [values, setValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const pendingRef = useRef(false);
  const fields = useRef<Partial<Record<RegisterFields, TextInputInstance | null>>>({});

  if (user) {
    return <Redirect href="/home" />;
  }

  const handleUpdate = (field: Exclude<RegisterFields, 'otp'>, text: string) => {
    if (field === 'email') {
      setOtpSent(false);
      setOtp('');
    }
    setValues(prev => ({ ...prev, [field]: text }));
    setErrors(prev => ({
      ...prev,
      [field]: undefined,
      ...(field === 'password' ? { confirmPassword: undefined } : {}),
      ...(field === 'email' ? { otp: undefined } : {}),
    }));
    setAlertMessage(null);
  };

  const handleSubmit = async (resend = false) => {
    if (pendingRef.current || busy || loading) return;

    const validationErrors: RegisterErrors = validateRegister(values);
    if (otpSent && !resend && !/^[0-9]{6}$/.test(otp)) {
      validationErrors.otp = 'Nhập mã xác minh gồm 6 chữ số.';
    }
    setErrors(validationErrors);
    setAlertMessage(null);

    const firstInvalid = fieldOrder.find(name => validationErrors[name]);
    if (firstInvalid) {
      fields.current[firstInvalid]?.focus();
      AccessibilityInfo.announceForAccessibility(
        validationErrors[firstInvalid] || 'Vui lòng kiểm tra lại thông tin.'
      );
      return;
    }

    pendingRef.current = true;
    setBusy(true);
    Keyboard.dismiss();

    try {
      if (!otpSent || resend) {
        await authApi.sendRegistrationOtp(values.email);
        setOtpSent(true);
        setOtp('');
        AccessibilityInfo.announceForAccessibility('Mã xác minh đã được gửi qua email.');
        return;
      }
      const verificationToken = await authApi.verifyRegistrationOtp(values.email, otp);
      await signUp({ ...values, verificationToken });
      router.replace('/home');
    } catch (error) {
      const failure = error as { message?: string; fields?: RegisterErrors };
      setErrors(failure.fields || {});
      setAlertMessage(failure.message || 'Chưa thể kết nối. Bạn vui lòng thử lại.');
      AccessibilityInfo.announceForAccessibility(
        failure.message || 'Đăng ký không thành công.'
      );
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  const isActionDisabled = busy || loading;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16) + 8,
              paddingBottom: Math.max(insets.bottom, 20) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.contentWrapper}>
            {/* Minimal Navigation Header */}
            <View style={styles.navHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={8}
                disabled={isActionDisabled}
                onPress={handleBack}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={22} color={authColors.forestInk} />
              </Pressable>

              <BrandLogo size="sm" tone="light" />
              <View style={styles.navSpacer} />
            </View>

            {/* Welcome Heading */}
            <Animated.View
              entering={FadeInDown.duration(280).delay(60)}
              style={styles.welcomeGroup}
            >
              <Text accessibilityRole="header" style={styles.headingTitle}>
                Tạo tài khoản
              </Text>
              <Text style={styles.headingDescription}>
                Bắt đầu hành trình tìm nơi ở của riêng bạn.
              </Text>
            </Animated.View>

            {/* Registration Form */}
            <Animated.View
              entering={FadeInDown.duration(320).delay(100)}
              style={styles.formGroup}
            >
              <InlineError message={alertMessage} />

              <AuthInput
                ref={node => { fields.current.fullName = node; }}
                testID="auth-fullName"
                label="Họ và tên"
                placeholder="Nhập họ và tên của bạn"
                value={values.fullName}
                onChangeText={text => handleUpdate('fullName', text)}
                error={errors.fullName}
                editable={!isActionDisabled}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={100}
                returnKeyType="next"
                onSubmitEditing={() => fields.current.email?.focus()}
              />

              <AuthInput
                ref={node => { fields.current.email = node; }}
                testID="auth-email"
                label="Email"
                placeholder="ban@example.com"
                value={values.email}
                onChangeText={text => handleUpdate('email', text)}
                error={errors.email}
                editable={!isActionDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                maxLength={255}
                returnKeyType="next"
                onSubmitEditing={() => fields.current.password?.focus()}
              />

              <PasswordInput
                ref={node => { fields.current.password = node; }}
                testID="auth-password"
                label="Mật khẩu"
                placeholder="Tạo mật khẩu"
                hint="Tối thiểu 6 ký tự"
                value={values.password}
                onChangeText={text => handleUpdate('password', text)}
                error={errors.password}
                editable={!isActionDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => fields.current.confirmPassword?.focus()}
              />

              <PasswordInput
                ref={node => { fields.current.confirmPassword = node; }}
                testID="auth-confirmPassword"
                label="Nhập lại mật khẩu"
                placeholder="Nhập lại mật khẩu vừa tạo"
                value={values.confirmPassword}
                onChangeText={text => handleUpdate('confirmPassword', text)}
                error={errors.confirmPassword}
                editable={!isActionDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => otpSent ? fields.current.otp?.focus() : void handleSubmit()}
              />

              {otpSent && (
                <>
                  <AuthInput
                    ref={node => { fields.current.otp = node; }}
                    testID="auth-registration-otp"
                    label="Mã xác minh"
                    hint="Kiểm tra hộp thư đến để lấy mã 6 chữ số."
                    value={otp}
                    onChangeText={text => {
                      setOtp(text.replace(/[^0-9]/g, ''));
                      setErrors(previous => ({ ...previous, otp: undefined }));
                    }}
                    error={errors.otp}
                    editable={!isActionDisabled}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    onSubmitEditing={() => void handleSubmit()}
                  />
                  <Pressable accessibilityRole="button" onPress={() => void handleSubmit(true)} disabled={isActionDisabled}>
                    <Text style={styles.resendCode}>Gửi lại mã</Text>
                  </Pressable>
                </>
              )}

              <PrimaryButton
                testID="auth-submit"
                title={otpSent ? 'Xác minh và tạo tài khoản' : 'Gửi mã xác minh'}
                onPress={() => void handleSubmit()}
                loading={busy || loading}
                disabled={isActionDisabled}
                style={styles.submitBtn}
              />
            </Animated.View>

            {/* Footer Navigation */}
            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>Đã có tài khoản?</Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Đăng nhập"
                disabled={isActionDisabled}
                onPress={handleBack}
                hitSlop={8}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>Đăng nhập</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: authSpacing.md,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerWordmark: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: authColors.forestInk,
  },
  navSpacer: {
    minWidth: 44,
  },
  welcomeGroup: {
    gap: 4,
    marginBottom: authSpacing.xl,
  },
  headingTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: authColors.forestInk,
  },
  headingDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: authColors.textSecondary,
  },
  formGroup: {
    gap: authSpacing.lg,
  },
  resendCode: {
    color: authColors.primary,
    fontWeight: '600',
    minHeight: 44,
    textAlignVertical: 'center',
    lineHeight: 44,
  },
  submitBtn: {
    marginTop: authSpacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: authSpacing.xxl,
    minHeight: 44,
  },
  switchPrompt: {
    fontSize: 14,
    color: authColors.textSecondary,
  },
  switchLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  switchLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: authColors.primary,
  },
});
