/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function loadTsModule<T>(relativePath: string): T {
  const url = new URL(relativePath, import.meta.url);
  const code = ts.transpileModule(readFileSync(url, 'utf8'), {
    fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, { module: mod, exports: mod.exports });
  return mod.exports as T;
}

const api = loadTsModule<typeof import('../src/services/phone-verification')>(
  '../src/services/phone-verification.ts'
);

test('normalizeVietnamPhone and isValidVietnamMobile match backend rules', () => {
  assert.equal(api.normalizeVietnamPhone(' +84 912.345-678 '), '0912345678');
  assert.equal(api.normalizeVietnamPhone('038 123 4567'), '0381234567');
  assert.equal(api.isValidVietnamMobile('0912345678'), true);
  assert.equal(api.isValidVietnamMobile('+84912345678'), true);
  assert.equal(api.isValidVietnamMobile('0212345678'), false);
  assert.equal(api.isValidVietnamMobile('091234567'), false);
  assert.equal(api.isValidVietnamMobile('09123456789'), false);
  assert.equal(api.isValidVietnamMobile(''), false);
});

test('maskVietnamPhone and formatVietnamPhoneDisplay present readable phone numbers safely', () => {
  assert.equal(api.maskVietnamPhone('0912345678'), '0912 *** 678');
  assert.equal(api.maskVietnamPhone('+84912345678'), '0912 *** 678');
  assert.equal(api.formatVietnamPhoneDisplay('0912345678'), '0912 345 678');
});

test('sanitizeOtpInput preserves leading zeros as string and cleans pasted text', () => {
  assert.equal(api.sanitizeOtpInput('004192'), '004192');
  assert.equal(api.sanitizeOtpInput('048 291'), '048291');
  assert.equal(api.sanitizeOtpInput('Ma OTP cua ban la 012345.'), '012345');
  assert.equal(api.sanitizeOtpInput('0123456789'), '012345');
  assert.equal(api.sanitizeOtpInput('abc'), '');
});

test('computeOtpTimings derives resend countdown and expiry strictly from backend timestamps', () => {
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  const active = api.computeOtpTimings(
    {
      phoneNumber: '0912345678',
      resendAt: '2026-11-22T15:00:45.000Z',
      expiresAt: '2026-11-22T15:05:00.000Z',
    },
    now
  );
  assert.equal(active.resendSecondsLeft, 45);
  assert.equal(active.canResend, false);
  assert.equal(active.isExpired, false);
  assert.equal(active.resendCountdownLabel, '00:45');

  const readyToResend = api.computeOtpTimings(
    {
      phoneNumber: '0912345678',
      resendAt: '2026-11-22T14:59:59.000Z',
      expiresAt: '2026-11-22T15:04:00.000Z',
    },
    now
  );
  assert.equal(readyToResend.canResend, true);
  assert.equal(readyToResend.isExpired, false);
  assert.equal(readyToResend.resendCountdownLabel, '00:00');

  const expired = api.computeOtpTimings(
    {
      phoneNumber: '0912345678',
      resendAt: '2026-11-22T14:56:00.000Z',
      expiresAt: '2026-11-22T14:59:59.000Z',
    },
    now
  );
  assert.equal(expired.isExpired, true);
  assert.equal(expired.canResend, true);
});

test('extractRateLimitSeconds parses backend wait durations without fabricating defaults', () => {
  assert.equal(api.extractRateLimitSeconds('Vui lòng chờ 60 giây giữa hai lần gửi OTP.'), 60);
  assert.equal(api.extractRateLimitSeconds('Thử lại sau 45 giây.'), 45);
  assert.equal(api.extractRateLimitSeconds('Số điện thoại này đã được sử dụng.'), null);
  assert.equal(api.extractRateLimitSeconds(null), null);
});
