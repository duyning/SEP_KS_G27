import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: 'USER' | 'ROOM_HOST' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  phoneNumber?: string;
  googleAccount?: boolean;
  phoneVerifiedAt?: string;
  organization?: string;
  preferredArea?: string;
  avatar?: string;
}
export interface LoginValues { email: string; password: string }
export interface RegisterValues extends LoginValues {
  fullName: string;
  phoneNumber?: string;
  confirmPassword: string;
}
export type AuthField = 'email' | 'password' | 'fullName' | 'phoneNumber' | 'confirmPassword' | 'organization' | 'preferredArea' | 'avatar' | 'oldPassword' | 'newPassword' | 'confirmNewPassword';
export type AuthFieldErrors = Partial<Record<AuthField, string>>;
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'config' | 'network' | 'timeout' | 'cancelled' | 'response' | 'api' | 'validation' | 'storage' | 'busy',
    public readonly status = 0,
    public readonly fields: AuthFieldErrors = {},
  ) { super(message); this.name = 'AuthError'; }
}

export function validateLogin(values: LoginValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!values.email.trim()) errors.email = 'Email không được để trống';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Email không hợp lệ';
  if (!values.password.trim()) errors.password = 'Mật khẩu không được để trống';
  else if (values.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
  return errors;
}
export function validateRegister(values: RegisterValues): AuthFieldErrors {
  const errors = validateLogin(values);
  if (!values.fullName.trim()) errors.fullName = 'Họ và tên không được để trống';
  if (values.phoneNumber?.trim() && !/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(values.phoneNumber.trim())) {
    errors.phoneNumber = 'Số điện thoại Việt Nam không hợp lệ';
  }
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  return errors;
}

export interface ProfileValues { fullName: string; phoneNumber?: string; organization?: string; preferredArea?: string; avatar?: string }
export interface PasswordValues { oldPassword: string; newPassword: string; confirmNewPassword: string }
export function validateProfile(values: ProfileValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!values.fullName.trim()) errors.fullName = 'Họ và tên không được để trống';
  else if (values.fullName.trim().length > 100) errors.fullName = 'Họ và tên tối đa 100 ký tự';
  if (values.phoneNumber && !/^(?:0|\+84)[35789]\d{8}$/.test(values.phoneNumber.trim())) errors.phoneNumber = 'Số điện thoại Việt Nam không hợp lệ';
  if ((values.organization?.trim().length || 0) > 255) errors.organization = 'Tối đa 255 ký tự';
  if ((values.preferredArea?.trim().length || 0) > 255) errors.preferredArea = 'Tối đa 255 ký tự';
  if (values.avatar && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(values.avatar) || values.avatar.length > 3495300)) errors.avatar = 'Chọn ảnh JPG, PNG hoặc WebP tối đa 2,5 MB';
  return errors;
}
export function validatePasswordChange(values: PasswordValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!values.oldPassword.trim()) errors.oldPassword = 'Nhập mật khẩu hiện tại';
  if (!values.newPassword.trim() || values.newPassword.length < 6) errors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
  else if (values.newPassword === values.oldPassword) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (values.newPassword !== values.confirmNewPassword) errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp';
  return errors;
}

const TOKEN_KEY = 'hlrcs.mobile.access-token';
let webToken: string | null = null;
export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}
// Web sessions deliberately expire when the JS runtime closes. Never use browser storage.
export const tokenStore: TokenStore = {
  async get() { return Platform.OS === 'web' ? webToken : SecureStore.getItemAsync(TOKEN_KEY); },
  async set(token) {
    if (Platform.OS === 'web') webToken = token;
    else await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async clear() {
    if (Platform.OS === 'web') webToken = null;
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function invalidResponse(): AuthError { return new AuthError('Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.', 'response'); }
function parseUser(value: unknown): AuthUser {
  if (!record(value) || !Number.isSafeInteger(value.userId) || (value.userId as number) <= 0 ||
      typeof value.fullName !== 'string' || !value.fullName.trim() ||
      typeof value.email !== 'string' || !value.email.trim() ||
      !['USER', 'ROOM_HOST', 'STAFF', 'ADMIN'].includes(value.role as string) ||
      !['ACTIVE', 'INACTIVE'].includes(value.status as string) ||
      ['phoneNumber', 'organization', 'preferredArea', 'avatar'].some(key => value[key] != null && typeof value[key] !== 'string')) throw invalidResponse();
  // Pick public profile fields explicitly; access tokens never enter user state.
  return {
    userId: value.userId as number, fullName: value.fullName, email: value.email,
    role: value.role as AuthUser['role'], status: value.status as AuthUser['status'],
    ...(typeof value.phoneNumber === 'string' ? { phoneNumber: value.phoneNumber } : {}),
    ...(typeof value.googleAccount === 'boolean' ? { googleAccount: value.googleAccount } : {}),
    ...(typeof value.phoneVerifiedAt === 'string' ? { phoneVerifiedAt: value.phoneVerifiedAt } : {}),
    ...(typeof value.organization === 'string' ? { organization: value.organization } : {}),
    ...(typeof value.preferredArea === 'string' ? { preferredArea: value.preferredArea } : {}),
    ...(typeof value.avatar === 'string' ? { avatar: value.avatar } : {}),
  };
}
function apiBase(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) throw new AuthError('Chưa cấu hình EXPO_PUBLIC_API_URL. Vui lòng liên hệ người quản trị ứng dụng.', 'config');
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
  } catch { throw new AuthError('EXPO_PUBLIC_API_URL không hợp lệ. Cần địa chỉ máy chủ HTTP hoặc HTTPS.', 'config'); }
  return value.replace(/\/+$/, '');
}

const fields: AuthField[] = ['email', 'password', 'fullName', 'phoneNumber', 'confirmPassword', 'organization', 'preferredArea', 'avatar', 'oldPassword', 'newPassword', 'confirmNewPassword'];
export interface AuthSessionResponse { user: AuthUser; accessToken: string }
export interface GoogleBrowserAttempt { id: string; proof: string }
export interface PhoneChallenge { phoneNumber: string; expiresAt: string; resendAt: string }

export function googleBrowserOrigin(): string | null {
  const base = (process.env.EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN?.trim() ||
    process.env.EXPO_PUBLIC_API_URL?.trim())?.replace(/\/$/, '');
  // The browser exchange must use an explicit HTTPS origin with no path or credentials.
  return base && /^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(base) ? base : null;
}

const googleAttemptToken = /^[A-Za-z0-9_-]{43}$/;
function googleBrowserBase(): string {
  const base = googleBrowserOrigin();
  if (!base) throw new AuthError('Đăng nhập Google trên Expo Go cần địa chỉ HTTPS của HL_RCS.', 'config');
  return base;
}

export interface AuthApi {
  sendPhoneOtp(phone: string, token: string, signal?: AbortSignal): Promise<PhoneChallenge>;
  verifyPhoneOtp(phone: string, code: string, token: string, signal?: AbortSignal): Promise<void>;
  login(values: LoginValues, signal?: AbortSignal): Promise<AuthSessionResponse>;
  googleLogin(idToken: string, signal?: AbortSignal): Promise<AuthSessionResponse>;
  startGoogleBrowser(signal?: AbortSignal): Promise<GoogleBrowserAttempt>;
  redeemGoogleBrowser(attempt: GoogleBrowserAttempt, code: string, signal?: AbortSignal): Promise<AuthSessionResponse>;
  register(values: RegisterValues, signal?: AbortSignal): Promise<AuthSessionResponse>;
  me(token: string, signal?: AbortSignal): Promise<AuthUser>;
  updateProfile(values: ProfileValues, token: string, signal?: AbortSignal): Promise<AuthUser>;
  changePassword(values: PasswordValues, token: string, signal?: AbortSignal): Promise<void>;
  logout(token: string, signal?: AbortSignal): Promise<void>;
}

export function createAuthApi(fetcher: typeof fetch = (...args) => fetch(...args), timeoutMs = 15000): AuthApi {
  async function request(path: string, method: string, body?: unknown, token?: string, signal?: AbortSignal, origin?: string): Promise<unknown> {
    const base = origin ?? apiBase();
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      if (controller.signal.aborted) throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
      const response = await fetcher(`${base}/api/auth${path}`, {
        method, signal: controller.signal, credentials: 'omit',
        ...(origin ? { redirect: 'error' as const } : {}),
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) throw new Error();
      if (!response.ok || (record(result) && result.success === false)) {
        const fieldErrors: AuthFieldErrors = {};
        if (record(result) && record(result.data)) {
          for (const key of fields) {
            const message = result.data[key];
            if (typeof message === 'string') fieldErrors[key] = message;
          }
        }
        const fallback = response.status === 401 ? 'Email hoặc mật khẩu không đúng, hoặc phiên đăng nhập đã hết hạn.' :
          response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
        throw new AuthError(record(result) && typeof result.message === 'string' && result.message.trim() ? result.message : fallback, 'api', response.status, fieldErrors);
      }
      if (!record(result) || result.success !== true || !Object.prototype.hasOwnProperty.call(result, 'data')) throw invalidResponse();
      return result.data;
    } catch (error) {
      if (timedOut) throw new AuthError('Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 'timeout');
      if (signal?.aborted) throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
      if (error instanceof AuthError) throw error;
      throw new AuthError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.', 'network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  function parseSession(data: unknown): AuthSessionResponse {
    const user = parseUser(data);
    if (!record(data) || typeof data.accessToken !== 'string' || !data.accessToken.trim() || /\s/.test(data.accessToken)) throw invalidResponse();
    return { user, accessToken: data.accessToken };
  }
  function validate(errors: AuthFieldErrors) {
    if (Object.keys(errors).length) throw new AuthError('Vui lòng kiểm tra thông tin đã nhập.', 'validation', 0, errors);
  }
  return {
    async sendPhoneOtp(phone, token, signal) {
      const data=await request('/profile/phone/send-otp','POST',{phoneNumber:phone},token,signal);
      if(!record(data)||typeof data.phoneNumber!=='string'||typeof data.expiresAt!=='string'||typeof data.resendAt!=='string'||!Number.isFinite(Date.parse(data.expiresAt))||!Number.isFinite(Date.parse(data.resendAt)))throw invalidResponse();
      return {phoneNumber:data.phoneNumber,expiresAt:data.expiresAt,resendAt:data.resendAt};
    },
    async verifyPhoneOtp(phone, code, token, signal) {
      const data=await request('/profile/phone/verify-otp','POST',{phoneNumber:phone,code},token,signal);
      if(!record(data)||data.verified!==true)throw invalidResponse();
    },
    async updateProfile(values, token, signal) {
      validate(validateProfile(values));
      return parseUser(await request('/profile', 'PUT', {
        fullName: values.fullName.trim(),
        ...(values.phoneNumber != null ? { phoneNumber: values.phoneNumber.trim() } : {}),
        ...(values.organization != null ? { organization: values.organization.trim() } : {}),
        ...(values.preferredArea != null ? { preferredArea: values.preferredArea.trim() } : {}),
        ...(values.avatar != null ? { avatar: values.avatar } : {}),
      }, token, signal));
    },
    async changePassword(values, token, signal) {
      validate(validatePasswordChange(values));
      const data = await request('/change-password', 'PUT', { oldPassword: values.oldPassword, newPassword: values.newPassword }, token, signal);
      if (data !== null) throw invalidResponse();
    },
    async googleLogin(idToken, signal) {
      if (typeof idToken !== 'string' || !idToken.trim() || idToken.length > 8192 || /\s/.test(idToken)) {
        throw new AuthError('Google không trả về thông tin xác thực hợp lệ. Vui lòng thử lại.', 'validation');
      }
      return parseSession(await request('/google', 'POST', { idToken }, undefined, signal));
    },
    async startGoogleBrowser(signal) {
      const data = await request('/google/mobile/start', 'POST', undefined, undefined, signal, googleBrowserBase());
      if (!record(data) || typeof data.id !== 'string' || typeof data.proof !== 'string' ||
        !googleAttemptToken.test(data.id) || !googleAttemptToken.test(data.proof)) throw invalidResponse();
      return { id: data.id, proof: data.proof };
    },
    async redeemGoogleBrowser(attempt, code, signal) {
      if (!/^[0-9]{8}$/.test(code)) throw new AuthError('Nhập đủ 8 chữ số của mã xác nhận.', 'validation');
      return parseSession(await request('/google/mobile/redeem', 'POST',
        { id: attempt.id, proof: attempt.proof, code }, undefined, signal, googleBrowserBase()));
    },
    async login(values, signal) {
      validate(validateLogin(values));
      return parseSession(await request('/login', 'POST', { email: values.email.trim(), password: values.password }, undefined, signal));
    },
    async register(values, signal) {
      validate(validateRegister(values));
      return parseSession(await request('/register', 'POST', {
        fullName: values.fullName.trim(), email: values.email.trim(), password: values.password,
        ...(values.phoneNumber?.trim() ? { phoneNumber: values.phoneNumber.trim() } : {}), role: 'USER',
      }, undefined, signal));
    },
    async me(token, signal) { return parseUser(await request('/me', 'GET', undefined, token, signal)); },
    async logout(token, signal) {
      const data = await request('/logout', 'POST', undefined, token, signal);
      if (data !== null) throw invalidResponse();
    },
  };
}
export const authApi = createAuthApi();

export interface AuthSnapshot { user: AuthUser | null; loading: boolean; sessionError: AuthError | null }
function asAuthError(error: unknown): AuthError {
  return error instanceof AuthError ? error : new AuthError('Không thể lưu hoặc đọc phiên đăng nhập an toàn. Vui lòng thử lại.', 'storage');
}

// Independent of React so lifecycle, concurrency and storage failures can be tested directly.
export class AuthSession {
  private state: AuthSnapshot = { user: null, loading: true, sessionError: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  private active = false;
  private submitting = false;
  private controller?: AbortController;
  private storageQueue: Promise<unknown> = Promise.resolve();
  constructor(private api: AuthApi = authApi, private store: TokenStore = tokenStore) {}
  getSnapshot = (): AuthSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(next: Partial<AuthSnapshot>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach(listener => listener());
  }
  private storage<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.storageQueue.then(operation);
    this.storageQueue = next.catch(() => undefined);
    return next;
  }
  private begin() {
    this.controller?.abort();
    this.controller = new AbortController();
    return { id: ++this.generation, signal: this.controller.signal };
  }
  private current(id: number) { return this.active && id === this.generation; }
  start = (): void => { this.active = true; void this.retry(); };
  stop = (): void => { this.active = false; ++this.generation; this.controller?.abort(); };
  retry = async (): Promise<void> => {
    if (!this.active || this.submitting) return;
    const { id, signal } = this.begin();
    this.update({ loading: true, sessionError: null });
    try {
      const token = await this.storage(() => this.store.get());
      if (!this.current(id)) return;
      const user = token ? await this.api.me(token, signal) : null;
      if (this.current(id)) this.update({ user });
    } catch (error) {
      if (!this.current(id)) return;
      const failure = asAuthError(error);
      // Connectivity failures retain the token for an explicit retry, never a cached user.
      if (failure.status === 401 || failure.status === 403) {
        try { await this.storage(() => this.store.clear()); }
        catch (storageError) {
          if (this.current(id)) this.update({ user: null, sessionError: asAuthError(storageError) });
          return;
        }
      }
      if (this.current(id)) this.update({ user: null, sessionError: failure });
    } finally { if (this.current(id)) this.update({ loading: false }); }
  };
  private async submit(action: (signal: AbortSignal, id: number) => Promise<void>): Promise<void> {
    if (this.submitting) throw new AuthError('Yêu cầu đang được xử lý. Vui lòng chờ.', 'busy');
    if (!this.active) throw new AuthError('Phiên làm việc đã đóng. Vui lòng thử lại.', 'cancelled');
    this.submitting = true; // Set before the first await, including before React can rerender.
    const { id, signal } = this.begin();
    this.update({ loading: true, sessionError: null });
    try { await action(signal, id); }
    catch (error) {
      const failure = asAuthError(error);
      if (failure.status === 401 && this.current(id) && this.state.user) {
        await this.storage(() => this.store.clear());
        if (this.current(id)) this.update({ user: null });
      }
      if (this.current(id)) this.update({ sessionError: failure });
      throw failure;
    } finally {
      this.submitting = false;
      if (this.current(id)) this.update({ loading: false });
    }
  }
  private authenticate(action: (signal: AbortSignal) => Promise<AuthSessionResponse>) {
    return this.submit(async (signal, id) => {
      const session = await action(signal);
      if (!this.current(id)) throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
      await this.storage(async () => {
        if (!this.current(id)) throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
        try { await this.store.set(session.accessToken); }
        catch {
          // A native write can fail after partially writing; cleanup must also be awaited.
          try { await this.store.clear(); }
          catch { throw new AuthError('Không thể lưu và xóa phiên đăng nhập an toàn. Vui lòng thử lại.', 'storage'); }
          throw new AuthError('Không thể lưu phiên đăng nhập an toàn. Vui lòng thử lại.', 'storage');
        }
        if (!this.current(id)) {
          await this.store.clear();
          throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
        }
      });
      if (this.current(id)) this.update({ user: session.user });
    });
  }
  signIn = (values: LoginValues): Promise<void> => this.authenticate(signal => this.api.login(values, signal));
  signInWithGoogle = (idToken: string): Promise<void> => this.authenticate(signal => this.api.googleLogin(idToken, signal));
  signInWithGoogleCode = (attempt: GoogleBrowserAttempt, code: string): Promise<void> =>
    this.authenticate(signal => this.api.redeemGoogleBrowser(attempt, code, signal));
  signUp = (values: RegisterValues): Promise<void> => this.authenticate(signal => this.api.register(values, signal));
  sendPhoneOtp = async (phone: string): Promise<PhoneChallenge> => {
    let result: PhoneChallenge | undefined;
    await this.submit(async (signal,id)=>{
      const token=await this.storage(()=>this.store.get());
      if(!token||!this.state.user)throw new AuthError('Vui lòng đăng nhập để xác minh số điện thoại.','api',401);
      if(!this.current(id))throw new AuthError('Phiên đã thay đổi.','cancelled');
      result=await this.api.sendPhoneOtp(phone,token,signal);
      if(!this.current(id))throw new AuthError('Phiên đã thay đổi.','cancelled');
    });
    if(!result)throw invalidResponse();return result;
  };
  verifyPhoneOtp = (phone: string,code: string): Promise<void> => this.submit(async(signal,id)=>{
    const token=await this.storage(()=>this.store.get());
    if(!token||!this.state.user)throw new AuthError('Vui lòng đăng nhập để xác minh số điện thoại.','api',401);
    if(!this.current(id))throw new AuthError('Phiên đã thay đổi.','cancelled');
    await this.api.verifyPhoneOtp(phone,code,token,signal);
    if(!this.current(id))throw new AuthError('Phiên đã thay đổi.','cancelled');
  });
  updateProfile = (values: ProfileValues): Promise<void> => this.submit(async (signal, id) => {
    const expectedUser = this.state.user?.userId;
    const token = await this.storage(() => this.store.get());
    if (!token || !expectedUser) throw new AuthError('Vui lòng đăng nhập để cập nhật hồ sơ.', 'api', 401);
    if (!this.current(id)) throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
    const user = await this.api.updateProfile(values, token, signal);
    if (user.userId !== expectedUser) throw invalidResponse();
    if (this.current(id)) this.update({ user });
  });
  changePassword = (values: PasswordValues): Promise<void> => this.submit(async (signal, id) => {
    const token = await this.storage(() => this.store.get());
    if (!token || !this.state.user) throw new AuthError('Vui lòng đăng nhập để đổi mật khẩu.', 'api', 401);
    if (!this.current(id)) throw new AuthError('Yêu cầu đã bị hủy.', 'cancelled');
    await this.api.changePassword(values, token, signal);
  });
  signOut = (): Promise<void> => this.submit(async (signal, id) => {
    const token = await this.storage(() => this.store.get());
    let remoteError: unknown;
    if (token) {
      try { await this.api.logout(token, signal); } catch (error) { remoteError = error; }
    }
    await this.storage(() => this.store.clear());
    if (this.current(id)) this.update({ user: null });
    if (remoteError) throw remoteError;
  });
}
