import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/auth-context';
import { BrandIcon } from '@/components/brand/brand-logo';
import { BRAND } from '@/config/brand';
import { validateLogin } from '@/services/auth';
import { resolveSafeRedirect } from '@/services/host-onboarding';
import { AuthInput } from './auth-input';
import { InlineError } from './inline-error';
import { PasswordInput } from './password-input';
import { PrimaryButton } from './primary-button';
import { GoogleSignInButton } from './google-sign-in-button';
import { authColors, authRadius, authSpacing } from './tokens';

type LoginFields = 'email' | 'password';
type LoginErrors = Partial<Record<LoginFields, string>>;

export function LoginView() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isCompact = height < 720;
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const postLoginTarget = resolveSafeRedirect(params.redirect) as '/home' | '/become-host';

  const { user, loading, signIn, signInWithGoogle, signInWithGoogleCode } = useAuth();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleProviderBusy, setGoogleProviderBusy] = useState(false);

  const pendingRef = useRef(false);
  const emailRef = useRef<TextInputInstance | null>(null);
  const passwordRef = useRef<TextInputInstance | null>(null);

  if (user) {
    return <Redirect href={postLoginTarget} />;
  }

  const handleUpdate = (field: LoginFields, text: string) => {
    setValues(prev => ({ ...prev, [field]: text }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setAlertMessage(null);
  };

  const handleSubmit = async () => {
    if (pendingRef.current || busy || loading || googleProviderBusy) return;

    const validationErrors = validateLogin(values);
    setErrors(validationErrors);
    setAlertMessage(null);

    if (validationErrors.email) {
      emailRef.current?.focus();
      AccessibilityInfo.announceForAccessibility(validationErrors.email);
      return;
    }
    if (validationErrors.password) {
      passwordRef.current?.focus();
      AccessibilityInfo.announceForAccessibility(validationErrors.password);
      return;
    }

    pendingRef.current = true;
    setBusy(true);
    Keyboard.dismiss();

    try {
      await signIn(values);
      router.replace(postLoginTarget);
    } catch (error) {
      const failure = error as { message?: string; fields?: LoginErrors };
      setErrors(failure.fields || {});
      setAlertMessage(failure.message || 'Chưa thể kết nối. Bạn vui lòng thử lại.');
      AccessibilityInfo.announceForAccessibility(
        failure.message || 'Đăng nhập không thành công.'
      );
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    if (pendingRef.current || loading) return;
    pendingRef.current = true;
    setBusy(true); setAlertMessage(null);
    try {
      await signInWithGoogle(idToken);
      router.replace(postLoginTarget);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng nhập Google không thành công.';
      setAlertMessage(message);
      AccessibilityInfo.announceForAccessibility(message);
    } finally { pendingRef.current = false; setBusy(false); }
  };

  const isActionDisabled = busy || loading || googleProviderBusy;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Photographic Hero Section */}
          {!isCompact && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.heroWrapper}>
              <Image
                source={require('@/assets/images/hero-apartment.jpg')}
                style={styles.heroImage}
                contentFit="cover"
                transition={300}
              />
              {/* Dark subtle overlay for contrast */}
              <View style={styles.heroGradientOverlay} />

              {/* Floating Minimal Brand Mark */}
              <View style={[styles.floatingBrand, { top: Math.max(insets.top, 16) + 8 }]}>
                <View style={styles.brandIconCircle}>
                  <BrandIcon size={16} variant="white" />
                </View>
                <Text style={styles.brandWordmark}>{BRAND.name}</Text>
                <View style={styles.brandDivider} />
                <Text style={styles.brandLocationText}>Hòa Lạc</Text>
              </View>
            </Animated.View>
          )}

          {/* Form Content Sheet */}
          <Animated.View
            entering={FadeInDown.duration(320).delay(100)}
            style={[
              styles.contentSheet,
              isCompact && { paddingTop: Math.max(insets.top, 20) + 12 },
            ]}
          >
            {/* Welcome Heading */}
            <View style={styles.headerGroup}>
              <Text accessibilityRole="header" style={styles.headingTitle}>
                Chào mừng trở lại
              </Text>
              <Text style={styles.headingDescription}>
                Đăng nhập để tìm nơi ở phù hợp với bạn.
              </Text>
            </View>

            {/* Input Form */}
            <View style={styles.formGroup}>
              <InlineError message={alertMessage} />

              <AuthInput
                ref={emailRef}
                testID="auth-email"
                label="Email"
                icon="mail"
                placeholder="Nhập email của bạn"
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
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <PasswordInput
                ref={passwordRef}
                testID="auth-password"
                label="Mật khẩu"
                icon="lock"
                placeholder="Nhập mật khẩu"
                value={values.password}
                onChangeText={text => handleUpdate('password', text)}
                error={errors.password}
                editable={!isActionDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />

              <PrimaryButton
                testID="auth-submit"
                title="Đăng nhập"
                onPress={handleSubmit}
                loading={busy || loading}
                disabled={isActionDisabled}
                style={styles.submitBtn}
              />
              <View style={styles.googleDivider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>hoặc</Text><View style={styles.dividerLine} /></View>
              <GoogleSignInButton disabled={isActionDisabled} onCredential={handleGoogleCredential} onBrowserCode={signInWithGoogleCode} onError={setAlertMessage} onBusyChange={setGoogleProviderBusy} />
            </View>

            {/* Switch to Register */}
            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>Chưa có tài khoản?</Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Đăng ký ngay"
                disabled={isActionDisabled}
                onPress={() => router.push('/register')}
                hitSlop={8}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>Đăng ký ngay</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  googleDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: authColors.border },
  dividerText: { fontSize: 12, color: authColors.textSecondary },
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: authColors.primaryDark,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 45, 41, 0.35)',
  },
  floatingBrand: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 45, 41, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: authRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWordmark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandLocationText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  contentSheet: {
    flex: 1,
    backgroundColor: authColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 22,
    paddingTop: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  headerGroup: {
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
