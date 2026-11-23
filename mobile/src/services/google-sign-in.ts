import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { openURL } from 'expo-linking';
import { AuthError, authApi, googleBrowserOrigin, type GoogleBrowserAttempt } from './auth';

export function googleSignInAvailability(): { available: boolean; mode?: 'browser' | 'native'; reason?: string } {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return googleBrowserOrigin()
      ? { available: true, mode: 'browser' }
      : { available: false, reason: 'Đăng nhập Google trên Expo Go cần địa chỉ HTTPS đã đăng ký của HL_RCS.' };
  }
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) {
    return { available: false, reason: 'Đăng nhập Google chưa được cấu hình.' };
  }
  if (Platform.OS === 'ios' && !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()) {
    return { available: false, reason: 'Cần cấu hình Google Client ID cho iOS và tạo lại development build.' };
  }
  if (Platform.OS === 'android' && !Constants.expoConfig?.android?.package) {
    return { available: false, reason: 'Cần khai báo Android package và đăng ký SHA-1 trong Google Cloud trước khi tạo development build.' };
  }
  return { available: true, mode: 'native' };
}

export async function startGoogleBrowser(signal: AbortSignal): Promise<GoogleBrowserAttempt> {
  const origin = googleBrowserOrigin();
  if (!origin) throw new AuthError('Chưa cấu hình địa chỉ HTTPS đăng nhập Google.', 'config');
  const attempt = await authApi.startGoogleBrowser(signal);
  if (signal.aborted) throw new AuthError('Đã hủy đăng nhập Google.', 'cancelled');
  // Only the public attempt ID goes to the browser. The redemption proof stays in the app.
  await openURL(`${origin}/api/auth/google/mobile/browser#${attempt.id}`);
  return attempt;
}

export async function requestGoogleIdToken(): Promise<string | null> {
  const availability = googleSignInAvailability();
  if (availability.mode !== 'native') {
    throw new AuthError(availability.reason ?? 'Hãy đăng nhập Google bằng trình duyệt trên Expo Go.', 'config');
  }
  // Import only after the Expo Go guard: loading the native SDK eagerly would
  // otherwise crash Expo Go, including ordinary email/password login.
  let sdk: typeof import('@react-native-google-signin/google-signin');
  try { sdk = await import('@react-native-google-signin/google-signin'); }
  catch { throw new AuthError('Bản ứng dụng chưa có Google Sign-In. Vui lòng tạo lại development build.', 'config'); }
  try {
    sdk.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!.trim(),
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
      offlineAccess: false,
    });
    if (Platform.OS === 'android') await sdk.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await sdk.GoogleSignin.signIn();
    if (!sdk.isSuccessResponse(response)) return null;
    const token = response.data.idToken;
    if (!token) throw new AuthError('Google chưa trả về ID token. Kiểm tra Web Client ID của máy chủ.', 'config');
    return token;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (sdk.isErrorWithCode(error)) {
      if (error.code === sdk.statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === sdk.statusCodes.IN_PROGRESS) throw new AuthError('Đăng nhập Google đang được xử lý.', 'busy');
      if (error.code === sdk.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new AuthError('Thiết bị cần Google Play Services để đăng nhập Google.', 'config');
      if (error.code === 'DEVELOPER_ERROR' || error.code === '10') throw new AuthError('Cấu hình Google Android chưa khớp package, SHA-1 hoặc Web Client ID.', 'config');
    }
    throw new AuthError('Không thể đăng nhập Google. Vui lòng kiểm tra kết nối và cấu hình ứng dụng.', 'network');
  } finally {
    // Persist only the HL-RCS session. Do not silently reuse a cached Google
    // account after the user signs out of HL-RCS.
    await sdk.GoogleSignin.signOut().catch(() => undefined);
  }
}
