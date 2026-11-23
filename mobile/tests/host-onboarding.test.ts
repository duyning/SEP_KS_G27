/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');

function loadTsModule<T>(relativePath: string, customRequire?: (id: string) => unknown): T {
  const url = new URL(relativePath, import.meta.url);
  const code = ts.transpileModule(readFileSync(url, 'utf8'), {
    fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: customRequire,
  });
  return mod.exports as T;
}

const propReg = loadTsModule<typeof import('../src/services/property-registration')>(
  '../src/services/property-registration.ts'
);

const onboarding = loadTsModule<typeof import('../src/services/host-onboarding')>(
  '../src/services/host-onboarding.ts',
  id => {
    if (id === './property-registration') return propReg;
    throw new Error(`Unexpected require: ${id}`);
  }
);

const verifiedUser = {
  fullName: 'Nguyen Van Test',
  phoneNumber: '0912345678',
  phoneVerifiedAt: '2026-11-22T10:00:00Z',
};

const syntheticFront = {
  uri: 'file:///fixture-front.jpg',
  fileName: 'front.jpg',
  mimeType: 'image/jpeg' as const,
  fileSize: 24_000,
  dataUri: 'data:image/jpeg;base64,/9j/SYNTHETIC_FIXTURE_ONLY',
};

const syntheticBack = {
  uri: 'file:///fixture-back.png',
  fileName: 'back.png',
  mimeType: 'image/png' as const,
  fileSize: 28_000,
  dataUri: 'data:image/png;base64,iVBORw0KGgoSYNTHETIC_FIXTURE_ONLY',
};

test('banner state hides for STAFF and ADMIN roles', () => {
  assert.equal(
    onboarding.resolveOnboardingBannerState({
      user: { role: 'STAFF' },
      current: null,
      hasLocalDraft: false,
    }).visible,
    false
  );
  assert.equal(
    onboarding.resolveOnboardingBannerState({
      user: { role: 'ADMIN' },
      current: null,
      hasLocalDraft: true,
    }).visible,
    false
  );
});

test('banner state adapts CTA and navigation for guest, eligible, draft, pending, supplement, approved, and host', () => {
  const guest = onboarding.resolveOnboardingBannerState({
    user: null,
    current: null,
    hasLocalDraft: false,
  });
  assert.equal(guest.visible, true);
  assert.equal(guest.action, 'login_redirect');
  assert.equal(guest.href, '/login?redirect=%2Fbecome-host');

  const eligible = onboarding.resolveOnboardingBannerState({
    user: { role: 'USER' },
    current: { account: null, registration: null },
    hasLocalDraft: false,
  });
  assert.equal(eligible.state, 'eligible');
  assert.equal(eligible.ctaLabel, 'Đăng ký làm chủ trọ');
  assert.equal(eligible.href, '/become-host');

  const draft = onboarding.resolveOnboardingBannerState({
    user: { role: 'USER' },
    current: { account: null, registration: null },
    hasLocalDraft: true,
  });
  assert.equal(draft.state, 'draft');
  assert.equal(draft.ctaLabel, 'Tiếp tục bản nháp');

  const pending = onboarding.resolveOnboardingBannerState({
    user: { role: 'USER' },
    current: {
      account: null,
      registration: { registrationId: 42, status: 'PENDING' },
    },
    hasLocalDraft: true,
  });
  assert.equal(pending.state, 'pending');
  assert.equal(pending.ctaLabel, 'Theo dõi hồ sơ');

  const supplement = onboarding.resolveOnboardingBannerState({
    user: { role: 'USER' },
    current: {
      account: null,
      registration: { registrationId: 42, status: 'NEEDS_SUPPLEMENT' },
    },
    hasLocalDraft: false,
  });
  assert.equal(supplement.state, 'needs_supplement');
  assert.equal(supplement.ctaLabel, 'Bổ sung hồ sơ');

  const host = onboarding.resolveOnboardingBannerState({
    user: { role: 'ROOM_HOST' },
    current: null,
    hasLocalDraft: false,
  });
  assert.equal(host.state, 'host');
  assert.equal(host.action, 'switch_host');
});

test('Stage 1 requires a verified phone, the partner agreement, and both CCCD sides', () => {
  const missingAll = onboarding.validateOnboardingStage1({
    user: { fullName: '', phoneNumber: '123', phoneVerifiedAt: null },
    account: null,
    draft: { introduction: '', agreementAccepted: false },
    front: null,
    back: null,
  });
  assert.ok(missingAll.fullName);
  assert.ok(missingAll.phoneNumber);
  assert.ok(missingAll.phoneVerified);
  assert.ok(missingAll.agreementAccepted);
  assert.ok(missingAll.identityFront);
  assert.ok(missingAll.identityBack);

  const missingAgreement = onboarding.validateOnboardingStage1({
    user: verifiedUser,
    account: null,
    draft: { introduction: 'Xin chào', agreementAccepted: false },
    front: syntheticFront,
    back: syntheticBack,
  });
  assert.deepEqual(Object.keys(missingAgreement), ['agreementAccepted']);

  // Complete Stage 1 passes
  const valid = onboarding.validateOnboardingStage1({
    user: verifiedUser,
    account: null,
    draft: { introduction: 'Chủ trọ mới tại Hòa Lạc', agreementAccepted: true },
    front: syntheticFront,
    back: syntheticBack,
  });
  assert.equal(Object.keys(valid).length, 0);
});

test('Stage 1 accepts server-stored CCCD without forcing re-upload and rejects invalid MIME/size', () => {
  const reused = onboarding.validateOnboardingStage1({
    user: verifiedUser,
    account: {
      applicationId: 10,
      status: 'DRAFT',
      hasIdentityImage: true,
      hasIdentityBackImage: true,
    },
    draft: { introduction: '', agreementAccepted: true },
    front: null,
    back: null,
  });
  assert.equal(Object.keys(reused).length, 0);

  assert.ok(onboarding.identityAssetError({ mimeType: 'image/webp', fileSize: 1000 }));
  assert.ok(onboarding.identityAssetError({ mimeType: 'application/pdf', fileSize: 1000 }));
  assert.ok(onboarding.identityAssetError({ mimeType: 'image/jpeg', fileSize: 6 * 1024 * 1024 }));
  assert.equal(onboarding.identityAssetError({ mimeType: 'image/png', fileSize: 500_000 }), null);
});

test('Stage 2 validation reuses CCCD from Stage 1 and does not require duplicate idCard upload', () => {
  const propValues = {
    ...propReg.registrationValues(verifiedUser),
    name: 'Nhà trọ Xanh Hòa Lạc',
    description: 'Nhà trọ sạch đẹp thoáng mát gần Đại học FPT Hòa Lạc.',
    commune: 'Tân Xã',
    addressDetail: 'Ngõ 12, thôn 3, xã Tân Xã',
    termsAccepted: true,
  };
  const asset = { uri: 'file:///fixture-doc.pdf', mimeType: 'application/pdf', fileSize: 1024 };
  const photo = { uri: 'file:///fixture-room.jpg', mimeType: 'image/jpeg', fileSize: 2048 };
  const files = {
    photos: [photo],
    ownership: asset,
    idCard: null,
    fireSafety: asset,
  };

  for (let step = 0; step <= 5; step++) {
    const stepErrors = propReg.validateRegistration(propValues, files, step, true);
    assert.equal(Object.keys(stepErrors).length, 0, `Expected step ${step} to pass`);
  }
});

test('draft serialization never stores raw CCCD data or file URIs and flags needsMediaReattach on restore', () => {
  const propValues = {
    ...propReg.registrationValues(verifiedUser),
    name: 'Trọ Hòa Lạc Test',
    commune: 'Thạch Hòa',
    termsAccepted: true,
  };
  const serialized = onboarding.serializeOnboardingDraft({
    stage: 2,
    propertyStep: 3,
    account: {
      introduction: 'Ghi chú kiểm thử',
      agreementAccepted: true,
    },
    property: propValues,
    hadLocalMedia: {
      identityFront: true,
      identityBack: true,
      photos: true,
      ownership: false,
      fireSafety: false,
    },
  });

  assert.equal(serialized.includes('data:image'), false);
  assert.equal(serialized.includes('SYNTHETIC_FIXTURE'), false);
  assert.equal(serialized.includes('file:///'), false);

  const restored = onboarding.parseOnboardingDraft(serialized, propReg.registrationValues());
  assert.equal(restored.stage, 2);
  assert.equal(restored.propertyStep, 3);
  assert.equal(restored.account.introduction, 'Ghi chú kiểm thử');
  const previousDraft = JSON.parse(serialized);
  previousDraft.account.privacyConsent = true;
  const restoredPreviousDraft = onboarding.parseOnboardingDraft(JSON.stringify(previousDraft), propReg.registrationValues());
  assert.equal(restoredPreviousDraft.account.agreementAccepted, true);
  assert.equal('privacyConsent' in restoredPreviousDraft.account, false);
  assert.equal(restored.property.name, 'Trọ Hòa Lạc Test');
  assert.equal(restored.property.termsAccepted, false);
  assert.equal(restored.needsMediaReattach, true);
});

test('Stage 3 status metadata maps PENDING, NEEDS_SUPPLEMENT, REJECTED, and APPROVED accurately', () => {
  const pending = onboarding.onboardingStatusMeta({ registrationId: 77, status: 'PENDING' }, 'USER');
  assert.equal(pending.dossierCode, '#HS-77');
  assert.equal(pending.canSupplement, false);
  assert.equal(pending.canOpenHostPortal, false);
  assert.equal(pending.timeline.length, 4);

  const supplement = onboarding.onboardingStatusMeta(
    { registrationId: 77, status: 'NEEDS_SUPPLEMENT' },
    'USER'
  );
  assert.equal(supplement.tone, 'warning');
  assert.equal(supplement.canSupplement, true);

  const approved = onboarding.onboardingStatusMeta(
    { registrationId: 77, status: 'APPROVED' },
    'ROOM_HOST'
  );
  assert.equal(approved.tone, 'approved');
  assert.equal(approved.canOpenHostPortal, true);
});

test('resolveSafeRedirect allows only known internal routes and blocks open redirects', () => {
  assert.equal(onboarding.resolveSafeRedirect('/become-host'), '/become-host');
  assert.equal(onboarding.resolveSafeRedirect('https://evil.example.com'), '/home');
  assert.equal(onboarding.resolveSafeRedirect('//evil.example.com'), '/home');
  assert.equal(onboarding.resolveSafeRedirect('/unknown-path'), '/home');
  assert.equal(onboarding.resolveSafeRedirect(undefined), '/home');
});
