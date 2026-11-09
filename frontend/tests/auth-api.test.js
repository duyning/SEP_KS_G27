import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { authApi, clearToken, getToken, saveToken } from '../src/services/auth.js';

const original = { fetch: globalThis.fetch, window: globalThis.window, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
globalThis.window = new EventTarget();
after(() => Object.assign(globalThis, original));
const respond = (status, data) => { globalThis.fetch = async () => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); };

test('remember me selects exactly one token store', () => {
  saveToken('session-token', false);
  assert.equal(getToken(), 'session-token');
  assert.equal(localStorage.getItem('hlrcs_access_token'), null);
  saveToken('remembered-token', true);
  assert.equal(sessionStorage.getItem('hlrcs_access_token'), null);
  assert.equal(getToken(), 'remembered-token');
  clearToken(); assert.equal(getToken(), null);
});
test('profile and password use existing DTOs and PUT endpoints', async () => {
  saveToken('test-token', false);
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ success: true, data: { fullName: 'Test profile' } })); };
  const profile = await authApi.updateProfile({ fullName: 'Test profile', phoneNumber: '0912345678' });
  await authApi.changePassword({ oldPassword: 'old-test', newPassword: 'new-test' });
  assert.equal(profile.fullName, 'Test profile');
  assert.equal(calls[0].url, '/api/auth/profile');
  assert.equal(calls[0].options.method, 'PUT');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(calls[0].options.body), { fullName: 'Test profile', phoneNumber: '0912345678' });
  assert.equal(calls[1].url, '/api/auth/change-password');
  assert.equal(calls[1].options.method, 'PUT');
});
test('401 expires current session; 403 does not claim logout', async () => {
  let expired = 0;
  const listener = () => expired++;
  window.addEventListener('hlrcs:session-expired', listener);
  saveToken('test-token', false);
  respond(401, { success: false, message: 'Expired' });
  await assert.rejects(authApi.me(), error => error.status === 401);
  assert.equal(getToken(), null); assert.equal(expired, 1);
  saveToken('test-token', false);
  respond(403, { success: false, message: 'Forbidden' });
  await assert.rejects(authApi.me(), error => error.status === 403);
  assert.equal(getToken(), 'test-token');
  window.removeEventListener('hlrcs:session-expired', listener);
});
test('validation, server and network failures are not fake success', async () => {
  respond(400, { success: false, message: 'Invalid', data: { fullName: 'Required' } });
  await assert.rejects(authApi.updateProfile({ fullName: '' }), error => error.status === 400 && error.fields.fullName === 'Required');
  globalThis.fetch = async () => new Response('Not JSON', { status: 500 });
  await assert.rejects(authApi.me(), error => error.status === 500);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(authApi.me(), error => error.status === 0);
});
test('a late 401 from a previous token cannot clear a newer session', async () => {
  saveToken('previous-session', false);
  let complete;
  globalThis.fetch = () => new Promise(resolve => { complete = resolve; });
  const previousRequest = authApi.me();
  saveToken('new-session', false);
  complete(new Response(JSON.stringify({ success: false }), { status: 401 }));
  await assert.rejects(previousRequest, error => error.status === 401);
  assert.equal(getToken(), 'new-session');
});

test('Google login posts only the credential and a failed attempt preserves the existing session', async () => {
  saveToken('existing-session', false);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/google');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { idToken: 'google-credential' });
    return new Response(JSON.stringify({ success: false, message: 'Invalid credential' }), { status: 401 });
  };
  await assert.rejects(authApi.googleLogin('google-credential'), error => error.status === 401);
  assert.equal(getToken(), 'existing-session');
});
