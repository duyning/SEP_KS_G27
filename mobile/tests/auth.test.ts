/// <reference types="node" />
// Run: node --experimental-strip-types --test tests/auth.test.ts
// Transpile only the service and substitute native bindings; no device or new test dependencies required.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import type { AuthApi, AuthUser, TokenStore } from '../src/services/auth';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/services/auth.ts', import.meta.url), 'utf8');
function load(platform = 'web', secureStore: Record<string, unknown> = {}) {
  const module = { exports: {} };
  const env: Record<string, string> = { EXPO_PUBLIC_API_URL: 'https://api.example.test' };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports,
    require: (name: string) => name === 'react-native' ? { Platform: { OS: platform } } : secureStore,
    process: { env }, URL, AbortController, setTimeout, clearTimeout, fetch,
  });
  return { service: module.exports as typeof import('../src/services/auth'), env };
}
const user: AuthUser = { userId: 1, fullName: 'Nguyễn An', email: 'an@example.test', role: 'USER', status: 'ACTIVE' };
const login = { email: 'an@example.test', password: 'secret1' };
test('phone OTP endpoints require a verified server result and preserve Google account metadata', async()=>{
 const {service}=load();const calls:{url:string;body:unknown}[]=[];
 const api=service.createAuthApi(async(url,options={})=>{
  calls.push({url:String(url),body:options.body?JSON.parse(String(options.body)):null});
  const data=String(url).endsWith('/send-otp')?{phoneNumber:'0934567812',expiresAt:new Date(Date.now()+300000).toISOString(),resendAt:new Date(Date.now()+60000).toISOString()}:String(url).endsWith('/verify-otp')?{verified:true}:{...user,googleAccount:true,phoneVerifiedAt:'2026-11-13T10:00:00Z'};
  assert.equal((options.headers as Record<string,string>).Authorization,'Bearer account-token');
  return new Response(JSON.stringify({success:true,data}));
 });
 assert.equal((await api.sendPhoneOtp('0934567812','account-token')).phoneNumber,'0934567812');
 await api.verifyPhoneOtp('0934567812','123456','account-token');
 assert.equal((await api.me('account-token')).googleAccount,true);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1].body)),{phoneNumber:'0934567812',code:'123456'});
 const bad=service.createAuthApi(async()=>new Response(JSON.stringify({success:true,data:{verified:false}})));
 await assert.rejects(bad.verifyPhoneOtp('0934567812','000000','account-token'),{code:'response'});
});
const register = { ...login, fullName: 'Nguyễn An', confirmPassword: 'secret1' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function fixture() {
  const { service } = load();
  let token: string | null = null;
  const store: TokenStore = { get: async () => token, set: async value => { token = value; }, clear: async () => { token = null; } };
  const api: AuthApi = {
    sendPhoneOtp: async phone => ({phoneNumber:phone,expiresAt:new Date(Date.now()+300000).toISOString(),resendAt:new Date(Date.now()+60000).toISOString()}), verifyPhoneOtp: async () => {},
    login: async () => ({ user, accessToken: 'fresh-token' }),
    googleLogin: async () => ({ user, accessToken: 'google-session-token' }),
    startGoogleBrowser: async () => ({ id: 'A'.repeat(43), proof: 'B'.repeat(43) }),
    redeemGoogleBrowser: async () => ({ user, accessToken: 'google-browser-session-token' }),
    register: async () => ({ user, accessToken: 'fresh-token' }),
    me: async () => user, logout: async () => {},
    updateProfile: async values => ({ ...user, ...values }), changePassword: async () => {},
  };
  const session = new service.AuthSession(api, store);
  return { service, store, api, session, token: () => token };
}
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }); }

test('browser Google exchange requires HTTPS, sends a one-time proof and saves only the server session', async () => {
  const { service, env } = load();
  env.EXPO_PUBLIC_API_URL = 'http://192.168.1.4:8081';
  const attempt = { id: 'A'.repeat(43), proof: 'B'.repeat(43) };
  const calls: { url: string; body: unknown }[] = [];
  const api = service.createAuthApi(async (url, options) => {
    calls.push({ url: String(url), body: options?.body ? JSON.parse(String(options.body)) : null });
    const data = String(url).endsWith('/start') ? attempt : { ...user, accessToken: 'browser-jwt' };
    return response({ success: true, data });
  });
  await assert.rejects(api.startGoogleBrowser(), { code: 'config' });
  assert.equal(calls.length, 0);
  env.EXPO_PUBLIC_GOOGLE_BROWSER_ORIGIN = 'https://login.example.test';
  const started = await api.startGoogleBrowser();
  await assert.rejects(api.redeemGoogleBrowser(started, '1234'), { code: 'validation' });
  const { session, token, api: fixtureApi } = fixture();
  fixtureApi.redeemGoogleBrowser = api.redeemGoogleBrowser;
  session.start();
  await tick();
  await session.signInWithGoogleCode(started, '01234567');
  assert.deepEqual(calls, [
    { url: 'https://login.example.test/api/auth/google/mobile/start', body: null },
    { url: 'https://login.example.test/api/auth/google/mobile/redeem', body: { ...attempt, code: '01234567' } },
  ]);
  assert.equal(token(), 'browser-jwt');
  assert.equal(session.getSnapshot().user?.userId, user.userId);
});

test('validates exact field keys, six-character passwords and optional Vietnamese mobile number', () => {
  const { service } = load();
  assert.deepEqual(Object.keys(service.validateLogin({ email: '', password: '' })), ['email', 'password']);
  assert.equal(Object.keys(service.validateRegister(register)).length, 0);
  for (const phoneNumber of ['0912345678', '+84912345678', '']) {
    assert.equal(service.validateRegister({ ...register, phoneNumber }).phoneNumber, undefined);
  }
  const errors = service.validateRegister({ ...register, fullName: '', phoneNumber: '123', confirmPassword: 'wrong', password: '12345' });
  assert.deepEqual(Object.keys(errors).sort(), ['confirmPassword', 'fullName', 'password', 'phoneNumber']);
});

test('requires explicit API configuration and rejects malformed configuration before fetch', async () => {
  const { service, env } = load();
  let calls = 0;
  const api = service.createAuthApi(async () => { calls++; throw new Error(); });
  for (const base of ['', 'not-a-url', 'ftp://example.test', 'https://user:password@example.test']) {
    env.EXPO_PUBLIC_API_URL = base;
    await assert.rejects(api.login(login), { code: 'config' });
  }
  assert.equal(calls, 0);
});

test('sends exact endpoint bodies, hardcodes USER, preserves password and omits cookies', async () => {
  const { service } = load();
  const calls: { url: string; options: RequestInit }[] = [];
  const api = service.createAuthApi(async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response({ success: true, data: { ...user, accessToken: 'token' } });
  });
  await api.login({ ...login, email: ' an@example.test ', password: ' secret ' });
  await api.register({ ...register, phoneNumber: '', role: 'ADMIN' } as typeof register);
  assert.equal(calls[0].url, 'https://api.example.test/api/auth/login');
  assert.deepEqual(JSON.parse(String(calls[0].options.body)), { email: login.email, password: ' secret ' });
  assert.deepEqual(JSON.parse(String(calls[1].options.body)), { ...login, fullName: user.fullName, role: 'USER' });
  assert.equal(calls[1].options.credentials, 'omit');
  assert.equal(calls[1].options.method, 'POST');
});

test('rejects invalid envelopes, missing token, malformed user and failed envelopes on HTTP 200', async () => {
  const { service } = load();
  for (const data of [null, {}, { success: true }, { success: true, data: user },
    { success: true, data: { ...user, userId: '1', accessToken: 'token' } },
    { success: true, data: { ...user, accessToken: ' ' } }, { success: false, data: user }]) {
    await assert.rejects(service.createAuthApi(async () => response(data)).login(login));
  }
  await assert.rejects(service.createAuthApi(async () => new Response('not json')).login(login), { code: 'response' });
});

test('maps server validation fields, excludes unknown fields and retains Vietnamese error', async () => {
  const { service } = load();
  const api = service.createAuthApi(async () => response({ success: false, message: 'Dữ liệu không hợp lệ', data: { email: 'Email đã tồn tại', role: 'ignored' } }, 400));
  await assert.rejects(api.register(register), (error: unknown) => {
    assert.ok(error instanceof service.AuthError);
    assert.equal(error.status, 400);
    assert.equal(error.message, 'Dữ liệu không hợp lệ');
    assert.deepEqual(Object.keys(error.fields), ['email']);
    assert.equal(error.fields.email, 'Email đã tồn tại');
    return true;
  });
});

test('distinguishes network, timeout and caller cancellation', async () => {
  const { service } = load();
  await assert.rejects(service.createAuthApi(async () => { throw new TypeError('offline'); }).login(login), { code: 'network' });
  const waiting: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  await assert.rejects(service.createAuthApi(waiting, 5).login(login), { code: 'timeout' });
  const controller = new AbortController();
  const pending = service.createAuthApi(waiting).login(login, controller.signal);
  controller.abort();
  await assert.rejects(pending, { code: 'cancelled' });
});

test('/me uses bearer without requiring another token; logout requires real success', async () => {
  const { service } = load();
  const calls: { url: string; options: RequestInit }[] = [];
  const api = service.createAuthApi(async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response({ success: true, data: String(url).endsWith('/me') ? { ...user, accessToken: 'must-not-leak' } : null });
  });
  const profile = await api.me('token');
  assert.equal(profile.userId, user.userId);
  assert.equal('accessToken' in profile, false);
  await api.logout('token');
  assert.equal((calls[0].options.headers as Record<string, string>).Authorization, 'Bearer token');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[1].options.method, 'POST');
  await assert.rejects(service.createAuthApi(async () => response({ success: true, data: {} })).logout('token'), { code: 'response' });
});

test('web storage is ephemeral and native storage never silently falls back', async () => {
  const web = load().service.tokenStore;
  await web.set('token');
  assert.equal(await web.get(), 'token');
  assert.equal(await load().service.tokenStore.get(), null);
  await web.clear();
  assert.equal(await web.get(), null);
  const native = load('ios', { getItemAsync: async () => { throw new Error('keychain locked'); } }).service.tokenStore;
  await assert.rejects(native.get());
});

test('restores only after /me confirms token and retains retryable network failure', async () => {
  const f = fixture();
  await f.store.set('saved-token');
  const gate = deferred<AuthUser>();
  f.api.me = async token => { assert.equal(token, 'saved-token'); return gate.promise; };
  f.session.start();
  await tick();
  assert.equal(f.session.getSnapshot().user, null);
  assert.equal(f.session.getSnapshot().loading, true);
  gate.reject(new f.service.AuthError('Không có mạng', 'network'));
  await tick();
  assert.equal(f.session.getSnapshot().sessionError?.code, 'network');
  assert.equal(f.token(), 'saved-token');
  f.api.me = async () => user;
  await f.session.retry();
  assert.equal(f.session.getSnapshot().user, user);
  assert.equal(f.session.getSnapshot().loading, false);
});

test('unauthorized restore deletes saved session; storage deletion errors are visible', async () => {
  const f = fixture();
  await f.store.set('expired');
  f.api.me = async () => { throw new f.service.AuthError('Hết hạn', 'api', 401); };
  f.session.start();
  await tick();
  assert.equal(f.token(), null);
  assert.equal(f.session.getSnapshot().sessionError?.status, 401);
  await f.store.set('expired');
  f.store.clear = async () => { throw new Error('locked'); };
  await f.session.retry();
  assert.equal(f.session.getSnapshot().sessionError?.code, 'storage');
});

test('old restore and unmounted requests cannot overwrite a new login', async () => {
  const f = fixture();
  await f.store.set('old');
  const gate = deferred<AuthUser>();
  let signal: AbortSignal | undefined;
  f.api.me = async (_token, value) => { signal = value; return gate.promise; };
  f.session.start();
  await tick();
  await f.session.signIn(login);
  assert.equal(signal?.aborted, true);
  gate.resolve({ ...user, fullName: 'Old user' });
  await tick();
  assert.equal(f.session.getSnapshot().user?.fullName, user.fullName);
  assert.equal(f.token(), 'fresh-token');
  f.api.me = async () => gate.promise;
  f.session.stop();
  const snapshot = f.session.getSnapshot();
  await f.session.retry();
  assert.equal(f.session.getSnapshot(), snapshot);
});

test('duplicate auth submissions are blocked synchronously and failures release the guard', async () => {
  const f = fixture();
  f.session.start();
  await tick();
  const gate = deferred<{ user: AuthUser; accessToken: string }>();
  let count = 0;
  f.api.login = async () => { count++; return gate.promise; };
  const first = f.session.signIn(login);
  await assert.rejects(f.session.signUp(register), { code: 'busy' });
  gate.reject(new f.service.AuthError('Sai mật khẩu', 'api', 401));
  await assert.rejects(first);
  assert.equal(count, 1);
  f.api.login = async () => ({ user, accessToken: 'retry-token' });
  await f.session.signIn(login);
  assert.equal(f.token(), 'retry-token');
});

test('persistence failure cannot publish authenticated user and partial writes are cleaned up', async () => {
  const f = fixture();
  f.session.start();
  await tick();
  const save = f.store.set;
  f.store.set = async token => { await save(token); throw new Error('disk full'); };
  await assert.rejects(f.session.signIn(login), { code: 'storage' });
  assert.equal(f.session.getSnapshot().user, null);
  assert.equal(f.token(), null);
  assert.equal(f.session.getSnapshot().sessionError?.code, 'storage');
});

test('unmount during token write cancels authentication and cleans up before completing', async () => {
  const f = fixture();
  f.session.start();
  await tick();
  const gate = deferred<void>();
  const save = f.store.set;
  f.store.set = async token => { await gate.promise; await save(token); };
  const pending = f.session.signIn(login);
  await tick();
  f.session.stop();
  gate.resolve();
  await assert.rejects(pending, { code: 'cancelled' });
  assert.equal(f.token(), null);
  assert.equal(f.session.getSnapshot().user, null);
});

test('logout clears local session even if backend fails, but rejects to expose failure', async () => {
  const f = fixture();
  f.session.start();
  await tick();
  await f.session.signIn(login);
  f.api.logout = async () => { throw new f.service.AuthError('Không có mạng', 'network'); };
  await assert.rejects(f.session.signOut(), { code: 'network' });
  assert.equal(f.token(), null);
  assert.equal(f.session.getSnapshot().user, null);
  assert.equal(f.session.getSnapshot().sessionError?.code, 'network');
});

test('logout persistence failure rejects and never reports a completed local logout', async () => {
  const f = fixture();
  f.session.start();
  await tick();
  await f.session.signIn(login);
  f.store.clear = async () => { throw new Error('keychain locked'); };
  await assert.rejects(f.session.signOut(), { code: 'storage' });
  assert.equal(f.session.getSnapshot().user, user);
  assert.equal(f.token(), 'fresh-token');
  assert.equal(f.session.getSnapshot().loading, false);
});

test('effect cleanup and restart ignore a late result from the first restore', async () => {
  const f = fixture();
  await f.store.set('saved');
  const first = deferred<AuthUser>();
  let calls = 0;
  f.api.me = async () => ++calls === 1 ? first.promise : user;
  f.session.start();
  await tick();
  f.session.stop();
  f.session.start();
  await tick();
  first.resolve({ ...user, fullName: 'Stale result' });
  await tick();
  assert.equal(f.session.getSnapshot().user, user);
  assert.equal(f.session.getSnapshot().loading, false);
});

test('native storage awaits SecureStore and uses a device-only keychain accessibility', async () => {
  const calls: unknown[][] = [];
  const { tokenStore: native } = load('ios', {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
    getItemAsync: async (...args: unknown[]) => { calls.push(args); return 'native-token'; },
    setItemAsync: async (...args: unknown[]) => { calls.push(args); },
    deleteItemAsync: async (...args: unknown[]) => { calls.push(args); },
  }).service;
  assert.equal(await native.get(), 'native-token');
  await native.set('new-token');
  await native.clear();
  assert.equal(calls[0][0], 'hlrcs.mobile.access-token');
  assert.equal(calls[1][1], 'new-token');
  assert.equal((calls[1][2] as { keychainAccessible: number }).keychainAccessible, 7);
  assert.equal(calls[2][0], calls[0][0]);
});

test('Google login sends only idToken and accepts only the server session', async () => {
  const { service } = load();
  const api = service.createAuthApi(async (url, init) => {
    assert.equal(url, 'https://api.example.test/api/auth/google');
    assert.equal(init?.method, 'POST'); assert.equal(init?.credentials, 'omit');
    assert.deepEqual(JSON.parse(String(init?.body)), { idToken: 'google-id-token' });
    return response({ success: true, data: { ...user, accessToken: 'hlrcs-jwt', authProvider: 'GOOGLE' } });
  });
  const session = await api.googleLogin('google-id-token');
  assert.equal(session.accessToken, 'hlrcs-jwt'); assert.equal(session.user.role, 'USER');
  assert.equal('authProvider' in session.user, false);
  let calls = 0;
  const invalid = service.createAuthApi(async () => { calls++; throw new Error(); });
  for (const token of ['', ' ', 'has whitespace', 'x'.repeat(8193)]) await assert.rejects(invalid.googleLogin(token), { code: 'validation' });
  assert.equal(calls, 0);
});

test('Google backend rejection cannot create a local authenticated session', async () => {
  const f = fixture(); f.session.start(); await tick();
  f.api.googleLogin = async () => { throw new f.service.AuthError('Email đã thuộc tài khoản khác.', 'api', 409); };
  await assert.rejects(f.session.signInWithGoogle('google-id-token'), { status: 409 });
  assert.equal(f.session.getSnapshot().user, null); assert.equal(f.token(), null);
  f.session.stop();
});

test('Google session persists HL-RCS JWT and shares duplicate-submission protection', async () => {
  const f = fixture(); f.session.start(); await tick();
  const pending = deferred<{ user: AuthUser; accessToken: string }>();
  f.api.googleLogin = async () => pending.promise;
  const google = f.session.signInWithGoogle('google-id-token');
  await assert.rejects(f.session.signIn(login), { code: 'busy' });
  pending.resolve({ user, accessToken: 'hlrcs-google-jwt' }); await google;
  assert.equal(f.token(), 'hlrcs-google-jwt'); assert.equal(f.session.getSnapshot().user?.userId, user.userId);
  f.session.stop();
});

test('Google endpoint preserves backend errors and rejects malformed successful payloads', async () => {
  const { service } = load();
  const rejected = service.createAuthApi(async () => response({ success: false, message: 'Google ID token đã hết hạn.' }, 401));
  await assert.rejects(rejected.googleLogin('expired-token'), { code: 'api', status: 401, message: 'Google ID token đã hết hạn.' });
  const incomplete = service.createAuthApi(async () => response({ success: true, data: { ...user } }));
  await assert.rejects(incomplete.googleLogin('google-token'), { code: 'response' });
});

test('profile update uses authenticated PUT and only fields supported by the backend', async () => {
  const { service } = load();
  const api = service.createAuthApi(async (url, init) => {
    assert.equal(url, 'https://api.example.test/api/auth/profile'); assert.equal(init?.method, 'PUT');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer jwt');
    assert.deepEqual(JSON.parse(String(init?.body)), { fullName: 'Nguyễn An', phoneNumber: '0912345678', organization: 'FPT', preferredArea: 'Tân Xã' });
    return response({ success: true, data: { ...user, organization: 'FPT', preferredArea: 'Tân Xã', avatar: 'https://example.test/avatar.jpg' } });
  });
  const profile = await api.updateProfile({ fullName: ' Nguyễn An ', phoneNumber: '0912345678', organization: ' FPT ', preferredArea: ' Tân Xã ' }, 'jwt');
  assert.equal(profile.avatar, 'https://example.test/avatar.jpg'); assert.equal(profile.organization, 'FPT');
});
test('profile validation matches backend name phone length and avatar constraints', () => {
  const { service } = load();
  assert.equal(Object.keys(service.validateProfile({ fullName: 'Nguyễn An', phoneNumber: '+84912345678', avatar: '' })).length, 0);
  const errors = service.validateProfile({ fullName: 'x'.repeat(101), phoneNumber: 'invalid', organization: 'x'.repeat(256), avatar: 'https://untrusted-input.test/image.jpg' });
  assert.ok(errors.fullName); assert.ok(errors.phoneNumber); assert.ok(errors.organization); assert.ok(errors.avatar);
});
test('profile save immediately synchronizes the shared session without replacing JWT', async () => {
  const f = fixture(); f.session.start(); await tick(); await f.session.signIn(login);
  f.api.updateProfile = async values => ({ ...user, fullName: values.fullName, avatar: 'data:image/png;base64,test' });
  await f.session.updateProfile({ fullName: 'Tên đã đổi' });
  assert.equal(f.session.getSnapshot().user?.fullName, 'Tên đã đổi'); assert.equal(f.token(), 'fresh-token'); f.session.stop();
});
test('profile updates cannot publish another account or a response after unmount', async () => {
  const f = fixture(); f.session.start(); await tick(); await f.session.signIn(login);
  f.api.updateProfile = async () => ({ ...user, userId: 999 });
  await assert.rejects(f.session.updateProfile({ fullName: 'Tên mới' }), { code: 'response' });
  assert.equal(f.session.getSnapshot().user?.userId, user.userId);
  const pending = deferred<AuthUser>(); f.api.updateProfile = async () => pending.promise;
  const update = f.session.updateProfile({ fullName: 'Late' }); await tick(); f.session.stop(); pending.resolve({ ...user, fullName: 'Late' }); await update;
  assert.notEqual(f.session.getSnapshot().user?.fullName, 'Late');
});
test('guest profile mutations do not call the backend', async () => {
  const f = fixture(); f.session.start(); await tick();
  let calls = 0; f.api.updateProfile = async () => { calls++; return user; };
  await assert.rejects(f.session.updateProfile({ fullName: 'Tên' }), { status: 401 }); assert.equal(calls, 0); f.session.stop();
});
test('password update sends exact old/new fields and retains whitespace and existing session policy', async () => {
  const { service } = load();
  const values = { oldPassword: ' old password ', newPassword: ' new password ', confirmNewPassword: ' new password ' };
  const api = service.createAuthApi(async (url, init) => {
    assert.equal(url, 'https://api.example.test/api/auth/change-password'); assert.equal(init?.method, 'PUT');
    assert.deepEqual(JSON.parse(String(init?.body)), { oldPassword: values.oldPassword, newPassword: values.newPassword });
    return response({ success: true, data: null });
  });
  await api.changePassword(values, 'jwt');
  assert.ok(service.validatePasswordChange({ oldPassword: '123456', newPassword: '123456', confirmNewPassword: 'x' }).newPassword);
  assert.ok(service.validatePasswordChange({ oldPassword: '123456', newPassword: 'abcdef', confirmNewPassword: 'x' }).confirmNewPassword);
});
test('expired authentication on a profile write clears private account state and token', async () => {
  const f = fixture(); f.session.start(); await tick(); await f.session.signIn(login);
  f.api.updateProfile = async () => { throw new f.service.AuthError('Hết phiên', 'api', 401); };
  await assert.rejects(f.session.updateProfile({ fullName: 'Tên mới' }), { status: 401 });
  assert.equal(f.session.getSnapshot().user, null); assert.equal(f.token(), null); f.session.stop();
});
