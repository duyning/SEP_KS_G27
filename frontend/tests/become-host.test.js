import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { transformWithEsbuild } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');

// Helper to compile and import a JSX component in Node test runner
async function loadComponent(filePath) {
  const fullPath = path.join(root, filePath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const compiled = (
    await transformWithEsbuild(source, path.basename(filePath), {
      format: 'cjs',
      jsx: 'automatic'
    })
  ).code;
  const mod = { exports: {} };
  const fileRequire = createRequire(fullPath);
  new Function('require', 'module', 'exports', compiled)(fileRequire, mod, mod.exports);
  return mod.exports.default;
}

const BecomeHostPrototype = await loadComponent('src/pages/BecomeHostPrototype.jsx');

const mockUser = {
  userId: 101,
  fullName: 'Nguyễn Văn Chủ Nhà',
  phoneNumber: '0987654321',
  email: 'host@example.test',
  role: 'USER'
};

const mockApplication = {
  id: 42,
  userId: 101,
  userName: 'Nguyễn Văn Chủ Nhà',
  userPhone: '0987654321',
  userEmail: 'host@example.test',
  applicantCapacity: 'OWNER',
  rentalExperience: 'TWO_YEARS_OR_MORE',
  targetCommune: 'Tân Xã',
  expectedScale: '5 - 15 phòng',
  introduction: 'Tôi có 10 phòng trọ tại Tân Xã, mong muốn tham gia hệ thống HL-RCS để quản lý chuyên nghiệp.',
  status: 'PENDING_REVIEW',
  submittedAt: '2026-11-10T09:30:00Z',
  reviewedAt: null,
  reviewedBy: null,
  reviewerNote: null,
  allowResubmit: true,
  version: 0
};

function renderPrototype(props = {}) {
  const defaultProps = {
    user: mockUser,
    roleLabel: 'Người dùng',
    application: mockApplication,
    values: {
      applicantCapacity: '',
      rentalExperience: '',
      targetCommune: '',
      expectedScale: '',
      introduction: '',
      agreementAccepted: false
    },
    errors: {},
    state: 'pending',
    alert: '',
    busy: false,
    mobileOpen: false,
    announcementOpen: false,
    progressOpen: false,
    account: createElement('div', { id: 'mockAccount' }, 'Account'),
    missingContact: false,
    formatDate: (val) => (val ? '10/11/2026 · 09:30' : '—'),
    stepClass: (num) => (num < 3 ? 'completed' : num === 3 ? 'active' : ''),
    stepLabel: (num) => (num < 3 ? '✓' : num),
    onClick: () => {},
    onSubmit: () => {},
    onChange: () => {}
  };

  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(BecomeHostPrototype, { ...defaultProps, ...props })
    )
  );
}

test('PENDING_REVIEW state renders compact status card, horizontal stepper, banner, and accordion', () => {
  const html = renderPrototype({ state: 'pending' });

  // 1. Compact Status Summary Card
  assert.match(html, /bh-status-card pending/);
  assert.match(html, /Hồ sơ đang chờ xét duyệt/);
  assert.match(html, /Chờ xét duyệt/);
  assert.match(html, /10\/11\/2026 · 09:30/);
  assert.match(html, /Hồ sơ đã được tiếp nhận và đang được nhân viên thẩm định/);

  // 2. Immediate action links near status card
  assert.match(html, /href="\/profile"/);
  assert.match(html, /href="\/"/);

  // 3. Horizontal Stepper
  assert.match(html, /bh-stepper-card/);
  assert.match(html, /id="bhStepperCard"/);
  assert.match(html, /Tiến trình xét duyệt/);
  assert.match(html, /Điền thông tin/);
  assert.match(html, /Gửi hồ sơ/);
  assert.match(html, /Staff thẩm định/);
  assert.match(html, /Cấp quyền Chủ trọ/);

  // 4. Compact Information Banner
  assert.match(html, /id="becomeHostProgressHelp"/);
  assert.match(html, /Sau khi được phê duyệt:/);

  // 5. Collapsible Accordion (default collapsed: title and toggle present)
  assert.match(html, /Thông tin hồ sơ đã gửi/);
  assert.match(html, /HREG-42/);
  assert.match(html, /Xem chi tiết/);
  assert.match(html, /pendingSubmittedDate/);
});

test('NEEDS_CHANGES state renders warning status, reviewer note, and action to supplement', () => {
  const needsChangesApp = {
    ...mockApplication,
    status: 'NEEDS_CHANGES',
    reviewerNote: 'Vui lòng làm rõ khu vực phòng trọ.',
    reviewedBy: 'Staff Nguyễn Kiểm Duyệt',
    reviewedAt: '2026-11-10T11:00:00Z'
  };

  const html = renderPrototype({
    state: 'needs_changes',
    application: needsChangesApp,
    stepClass: (num) => (num < 3 ? 'completed' : num === 3 ? 'warning' : ''),
    stepLabel: (num) => (num < 3 ? '✓' : num === 3 ? '!' : num)
  });

  assert.match(html, /bh-status-card warning/);
  assert.match(html, /Yêu cầu bổ sung thông tin hồ sơ/);
  assert.match(html, /Cần bổ sung/);
  assert.match(html, /id="btnStartSupplement"/);
  assert.match(html, /Bổ sung hồ sơ/);
  assert.match(html, /id="ncNote"/);
  assert.match(html, /Vui lòng làm rõ khu vực phòng trọ/);
  assert.match(html, /Staff Nguyễn Kiểm Duyệt/);
});

test('APPROVED state renders celebration card and direct link to Host Portal', () => {
  const approvedApp = {
    ...mockApplication,
    status: 'APPROVED',
    reviewedAt: '2026-11-10T14:00:00Z'
  };

  const html = renderPrototype({
    state: 'approved',
    application: approvedApp,
    stepClass: () => 'completed',
    stepLabel: () => '✓'
  });

  assert.match(html, /bh-status-card approved/);
  assert.match(html, /Chúc mừng! Bạn đã chính thức là Chủ trọ/);
  assert.match(html, /Đã phê duyệt/);
  assert.match(html, /href="\/host"/);
  assert.match(html, /Vào Host Portal →/);
});

test('REJECTED state renders rejection reason and conditional resubmission button', () => {
  const rejectedApp = {
    ...mockApplication,
    status: 'REJECTED',
    reviewerNote: 'Thông tin chưa đáp ứng tiêu chuẩn đối tác.',
    reviewedBy: 'Staff Admin',
    reviewedAt: '2026-11-10T15:00:00Z',
    allowResubmit: true
  };

  const html = renderPrototype({
    state: 'rejected',
    application: rejectedApp,
    stepClass: (num) => (num < 3 ? 'completed' : num === 3 ? 'rejected' : ''),
    stepLabel: (num) => (num < 3 ? '✓' : num === 3 ? '✕' : num)
  });

  assert.match(html, /bh-status-card rejected/);
  assert.match(html, /Hồ sơ chưa được phê duyệt/);
  assert.match(html, /id="rejReason"/);
  assert.match(html, /Thông tin chưa đáp ứng tiêu chuẩn đối tác/);
  assert.match(html, /id="btnResubmitAfterReject"/);
});

test('UNREGISTERED state renders horizontal stepper and registration form', () => {
  const html = renderPrototype({
    state: 'unregistered',
    application: null,
    stepClass: (num) => (num === 1 ? 'active' : ''),
    stepLabel: (num) => num
  });

  assert.match(html, /id="becomeHostForm"/);
  assert.match(html, /id="applicantCapacity"/);
  assert.match(html, /id="rentalExperience"/);
  assert.match(html, /id="targetCommune"/);
  assert.match(html, /id="expectedScale"/);
  assert.match(html, /id="introduction"/);
  assert.match(html, /id="agreementCheck"/);
  assert.match(html, /id="btnSubmitForm"/);
  assert.match(html, /id="btnCancelForm"/);
});

test('CSS rules and design tokens satisfy SaaS minimal and accessibility guidelines', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/become-host-refinement.css'), 'utf8');

  // Colors & tokens
  assert.match(css, /--bh-action:\s*#0f766e/);
  assert.match(css, /--bh-card-radius:\s*12px/);

  // Stepper & layout
  assert.match(css, /\.bh-stepper-horizontal/);
  assert.match(css, /\.bh-hstep-node/);
  assert.match(css, /\.bh-hstep-line/);
  assert.match(css, /\.bh-workspace-centered/);

  // Accordion & Status Card
  assert.match(css, /\.bh-status-card/);
  assert.match(css, /\.bh-accordion-card/);
  assert.match(css, /\.bh-copy-btn/);

  // Motion safety: prefers-reduced-motion is respected
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
