export type PhoneVerificationStep = 'PHONE_ENTRY' | 'OTP_VERIFICATION';

export interface OtpChallengeTiming {
  phoneNumber: string;
  resendAt: string;
  expiresAt: string;
}

export interface ComputedOtpTimings {
  resendSecondsLeft: number;
  expiresSecondsLeft: number;
  canResend: boolean;
  isExpired: boolean;
  resendCountdownLabel: string;
}

const VN_MOBILE_PATTERN = /^0[35789]\d{8}$/;

/**
 * Normalize Vietnamese mobile phone numbers to 10-digit 0xxxxxxxxx format,
 * matching backend PhoneVerificationService.normalize.
 */
export function normalizeVietnamPhone(input?: string | null): string {
  if (!input) return '';
  const cleaned = input.trim().replace(/[\s.-]/g, '');
  if (cleaned.startsWith('+84')) {
    return `0${cleaned.slice(3)}`;
  }
  return cleaned;
}

/**
 * Validate Vietnamese mobile number according to backend rules: ^(0|\+84)[35789]\d{8}$
 */
export function isValidVietnamMobile(input?: string | null): boolean {
  const normalized = normalizeVietnamPhone(input);
  return VN_MOBILE_PATTERN.test(normalized);
}

/**
 * Format phone nicely for input display (e.g. 0912 345 678) without altering value semantics.
 */
export function formatVietnamPhoneDisplay(input?: string | null): string {
  const normalized = normalizeVietnamPhone(input);
  if (normalized.length !== 10) return input?.trim() || '';
  return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
}

/**
 * Mask middle digits for OTP header display (e.g. 0912 *** 678).
 */
export function maskVietnamPhone(input?: string | null): string {
  const normalized = normalizeVietnamPhone(input);
  if (normalized.length === 10) {
    return `${normalized.slice(0, 4)} *** ${normalized.slice(7)}`;
  }
  if (normalized.length >= 6) {
    return `${normalized.slice(0, 3)} *** ${normalized.slice(-3)}`;
  }
  return normalized || '';
}

/**
 * Keep strictly numeric characters as a string so leading zeros are never lost.
 * Supports pasting formatted codes (e.g. "048 291") or SMS snippets.
 */
export function sanitizeOtpInput(raw: string, maxLength = 6): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  return digits.slice(0, maxLength);
}

/**
 * Format seconds into MM:SS (e.g. 00:45, 01:00).
 */
export function formatCountdownMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Derive resend wait & OTP expiry strictly from backend timestamps (never hardcoded).
 */
export function computeOtpTimings(
  challenge: OtpChallengeTiming | null,
  nowMs: number = Date.now()
): ComputedOtpTimings {
  if (!challenge) {
    return {
      resendSecondsLeft: 0,
      expiresSecondsLeft: 0,
      canResend: false,
      isExpired: false,
      resendCountdownLabel: '00:00',
    };
  }
  const resendAtMs = Date.parse(challenge.resendAt);
  const expiresAtMs = Date.parse(challenge.expiresAt);

  const resendSecondsLeft = Number.isFinite(resendAtMs)
    ? Math.max(0, Math.ceil((resendAtMs - nowMs) / 1000))
    : 0;
  const expiresSecondsLeft = Number.isFinite(expiresAtMs)
    ? Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000))
    : 0;

  return {
    resendSecondsLeft,
    expiresSecondsLeft,
    canResend: resendSecondsLeft <= 0,
    isExpired: Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs,
    resendCountdownLabel: formatCountdownMMSS(resendSecondsLeft),
  };
}

/**
 * Extract wait seconds from a backend 429 rate-limit message if provided.
 */
export function extractRateLimitSeconds(message?: string | null): number | null {
  if (!message) return null;
  const match = message.match(/(\d+)\s*giây/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
