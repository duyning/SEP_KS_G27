import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { passwordErrors, passwordRecoveryApi, recoveryIdentifier, recoveryContacts } from '../src/services/password-recovery.js';

const originalFetch = globalThis.fetch;
const originalSession = globalThis.sessionStorage, originalLocal = globalThis.localStorage;
beforeEach(() => { globalThis.sessionStorage = { getItem: () => null }; globalThis.localStorage = { getItem: () => null }; });
afterEach(() => { globalThis.fetch = originalFetch; globalThis.sessionStorage = originalSession; globalThis.localStorage = originalLocal; });
test('password policy keeps confirmation, current password and bcrypt byte boundaries consistent', () => {
  assert.deepEqual(passwordErrors('NewPass123', 'NewPass123', 'OldPass123'), {});
  assert.ok(passwordErrors('short', 'short').newPassword);
  assert.ok(passwordErrors('a'.repeat(73), 'a'.repeat(73)).newPassword);
  assert.ok(passwordErrors('ậ'.repeat(25), 'ậ'.repeat(25)).newPassword);
  assert.deepEqual(passwordErrors('a'.repeat(72), 'a'.repeat(72)), {});
  assert.ok(passwordErrors('OldPass123', 'OldPass123', 'OldPass123').newPassword);
  assert.ok(passwordErrors('NewPass123', 'Different123').confirmPassword);
});
test('recovery destination normalization matches registered email and Vietnamese phone variants', () => {
  assert.equal(recoveryIdentifier(' USER@Example.TEST '), 'user@example.test');
  assert.equal(recoveryIdentifier('+84 (912) 345-678'), '0912345678');
  assert.equal(recoveryIdentifier('0912.345.678'), '0912345678');
});
test('recovery channels include original phone registrations but exclude unverified added phone numbers', () => {
  assert.deepEqual(recoveryContacts({ email: 'member@example.test', phoneNumber: '0912345678' }), ['member@example.test']);
  assert.deepEqual(recoveryContacts({ email: '0912345678@hlrcs.user', phoneNumber: '0912345678' }), ['0912345678']);
  assert.deepEqual(recoveryContacts({ email: '+84912345678@hlrcs.user', phoneNumber: '+84912345678' }), ['+84912345678']);
  assert.deepEqual(recoveryContacts({ email: '0912345678@hlrcs.user', phoneNumber: '0987654321' }), []);
});
test('public and profile recovery use separate endpoints and only confirm with the explicit proof', async () => {
  const requests = [];
  globalThis.sessionStorage.getItem = () => 'private-session';
  globalThis.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body), headers: options.headers });
    const data = url.endsWith('send-otp') ? { channel: 'EMAIL', resendAt: '2026-11-27T03:01:00Z', expiresAt: '2026-11-27T03:05:00Z' }
      : url.endsWith('verify-otp') ? { verificationToken: 'proof-only', expiresAt: '2026-11-27T03:10:00Z' } : null;
    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  for (const profile of [false, true]) {
    const api = passwordRecoveryApi(profile); await api.send('user@example.test');
    const proof = await api.verify('user@example.test', '012345');
    await api.confirm('user@example.test', proof.verificationToken, 'NewPass123');
  }
  assert.equal(requests[0].url, '/api/auth/password-reset/send-otp');
  assert.equal(requests[3].url, '/api/auth/profile/password-reset/send-otp');
  assert.equal(requests[0].headers.Authorization, undefined);
  assert.equal(requests[3].headers.Authorization, 'Bearer private-session');
  assert.deepEqual(requests[2].body, { identifier: 'user@example.test', verificationToken: 'proof-only', newPassword: 'NewPass123' });
});
test('unusable send or verification envelopes fail without pretending an OTP was verified', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  await assert.rejects(passwordRecoveryApi().send('user@example.test'), error => error.status === 502);
  await assert.rejects(passwordRecoveryApi().verify('user@example.test', '123456'), error => error.status === 502);
});
