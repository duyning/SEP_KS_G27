import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { AuthError } from './auth';

export function googleSignInAvailability(): { available: boolean; reason?: string } {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return { available: false, reason: 'Đăng nhập Google cần bản development build. Trên Expo Go, bạn vẫn có thể đăng nhập bằng email.' };
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
  return { available: true };
}

export async function requestGoogleIdToken(): Promise<string | null> {
  const availability = googleSignInAvailability();
  if (!availability.available) throw new AuthError(availability.reason!, 'config');
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
