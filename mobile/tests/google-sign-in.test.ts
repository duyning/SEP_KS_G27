/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/services/google-sign-in.ts', import.meta.url), 'utf8');
class AuthError extends Error { code: string; constructor(message: string, code: string) { super(message); this.code = code; } }
function load(environment = 'bare', platform = 'android', response: unknown = { type: 'success', data: { idToken: 'google-id-token' } }) {
  const module = { exports: {} }; let nativeLoads = 0; let configuration: Record<string, unknown> | undefined; let signouts = 0;
  const env: Record<string, string> = { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com' };
  const sdk = {
    GoogleSignin: { configure: (options: Record<string, unknown>) => { configuration = options; }, hasPlayServices: async () => true, signIn: async () => response, signOut: async () => { signouts++; } },
    isSuccessResponse: (data: { type: string }) => data.type === 'success', isErrorWithCode: () => false, statusCodes: {},
  };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, process: { env },
    require: (name: string) => {
      if (name === 'expo-constants') return { __esModule: true, default: { executionEnvironment: environment, expoConfig: { android: { package: 'com.hlrcs.test' } } }, ExecutionEnvironment: { StoreClient: 'storeClient' } };
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === './auth') return { AuthError };
      nativeLoads++; return sdk;
    },
  });
  return { api: module.exports as typeof import('../src/services/google-sign-in'), env, nativeLoads: () => nativeLoads, configuration: () => configuration, signouts: () => signouts };
}
test('Expo Go never imports native Google SDK and returns a clear configuration limitation', async () => {
  const f = load('storeClient');
  assert.equal(f.api.googleSignInAvailability().available, false);
  await assert.rejects(f.api.requestGoogleIdToken(), { code: 'config' });
  assert.equal(f.nativeLoads(), 0);
});
test('iOS requires its actual client ID before loading native code', async () => {
  const f = load('bare', 'ios');
  await assert.rejects(f.api.requestGoogleIdToken(), { code: 'config' }); assert.equal(f.nativeLoads(), 0);
});
test('native sign in requests server audience and returns ID token, not provider profile', async () => {
  const f = load(); assert.equal(await f.api.requestGoogleIdToken(), 'google-id-token');
  assert.equal(f.configuration()?.webClientId, f.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  assert.equal(f.configuration()?.offlineAccess, false); assert.equal(f.signouts(), 1);
});
test('cancelled Google chooser does not return a credential', async () => {
  const f = load('bare', 'android', { type: 'cancelled', data: null });
  assert.equal(await f.api.requestGoogleIdToken(), null); assert.equal(f.signouts(), 1);
});
