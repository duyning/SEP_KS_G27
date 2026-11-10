import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applicationLabels,
  applicationBadgeTones,
  formatApplicationDate,
  formatRelativeTime,
  isLongPendingApplication,
  formatProcessedBreakdown,
  isKpiStatusActive,
  staffHostApi
} from '../src/services/staff-host-applications.js';
import {
  applicantCapacities,
  rentalExperiences,
  applicationFieldLabel,
  hostApplicationFieldLabels
} from '../src/services/host-applications.js';

function createStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

test('formatProcessedBreakdown formats approved and rejected counts from backend stats', () => {
  assert.equal(formatProcessedBreakdown({ approved: 2, rejected: 0 }), '2 đã phê duyệt · 0 từ chối');
  assert.equal(formatProcessedBreakdown({ approved: 14, rejected: 3 }), '14 đã phê duyệt · 3 từ chối');
  assert.equal(formatProcessedBreakdown({}), '0 đã phê duyệt · 0 từ chối');
});

test('isKpiStatusActive matches ALL, PENDING_REVIEW, NEEDS_CHANGES, and PROCESSED states', () => {
  assert.equal(isKpiStatusActive('ALL', 'ALL'), true);
  assert.equal(isKpiStatusActive('PENDING_REVIEW', 'PENDING_REVIEW'), true);
  assert.equal(isKpiStatusActive('NEEDS_CHANGES', 'NEEDS_CHANGES'), true);
  assert.equal(isKpiStatusActive('PROCESSED', 'PROCESSED'), true);
  assert.equal(isKpiStatusActive('APPROVED', 'PROCESSED'), true);
  assert.equal(isKpiStatusActive('REJECTED', 'PROCESSED'), true);
  assert.equal(isKpiStatusActive('PENDING_REVIEW', 'PROCESSED'), false);
});

test('isLongPendingApplication flags PENDING_REVIEW records waiting >= 48 hours', () => {
  const now = new Date('2026-10-28T12:00:00Z').getTime();
  assert.equal(isLongPendingApplication('2026-10-26T11:59:00Z', 'PENDING_REVIEW', now), true);
  assert.equal(isLongPendingApplication('2026-10-27T15:00:00Z', 'PENDING_REVIEW', now), false);
  assert.equal(isLongPendingApplication('2026-10-20T10:00:00Z', 'APPROVED', now), false);
  assert.equal(isLongPendingApplication('2026-10-20T10:00:00Z', 'NEEDS_CHANGES', now), false);
});

test('formatRelativeTime and formatApplicationDate format timestamps accurately', () => {
  const now = new Date('2026-10-28T12:00:00Z').getTime();
  assert.equal(formatRelativeTime('2026-10-28T11:59:40Z', now), 'Vừa gửi');
  assert.equal(formatRelativeTime('2026-10-28T11:30:00Z', now), '30 phút trước');
  assert.equal(formatRelativeTime('2026-10-28T06:00:00Z', now), '6 giờ trước');
  assert.equal(formatRelativeTime('2026-10-25T12:00:00Z', now), '3 ngày trước');
  assert.equal(formatApplicationDate(null), 'Chưa cập nhật');
  assert.ok(formatApplicationDate('2026-10-26T10:00:00').includes('2026'));
});

test('status labels, badge tones, and registration field labels cover all backend enums', () => {
  assert.equal(applicationLabels.PENDING_REVIEW, 'Chờ xét duyệt');
  assert.equal(applicationLabels.NEEDS_CHANGES, 'Cần bổ sung');
  assert.equal(applicationLabels.APPROVED, 'Đã phê duyệt');
  assert.equal(applicationLabels.REJECTED, 'Đã từ chối');

  assert.equal(applicationBadgeTones.PENDING_REVIEW, 'pending');
  assert.equal(applicationBadgeTones.NEEDS_CHANGES, 'warning needs-changes');
  assert.equal(applicationBadgeTones.APPROVED, 'approved');
  assert.equal(applicationBadgeTones.REJECTED, 'rejected');

  assert.equal(applicationFieldLabel(applicantCapacities, 'OWNER'), 'Chủ sở hữu');
  assert.equal(applicationFieldLabel(rentalExperiences, 'TWO_YEARS_OR_MORE'), 'Từ 2 năm trở lên');
  assert.equal(hostApplicationFieldLabels.targetCommune, 'Khu vực hoạt động chính');
});

test('staffHostApi.list, detail, and review communicate with /api/host-applications', async () => {
  globalThis.window = { dispatchEvent() {} };
  globalThis.localStorage = createStorage();
  globalThis.sessionStorage = createStorage();
  globalThis.sessionStorage.setItem('hlrcs_access_token', 'staff-jwt-token');

  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.startsWith('/api/host-applications?')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            content: [{ id: 1, userName: 'Nguyễn Văn A', status: 'PENDING_REVIEW' }],
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 8,
            stats: { total: 4, pending: 1, needsChanges: 1, approved: 2, rejected: 0 }
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url === '/api/host-applications/1/review') {
      const payload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 1,
            status: payload.decision,
            reviewerNote: payload.note,
            reviewedBy: 'Staff Kiểm Duyệt',
            version: payload.version + 1
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: { application: { id: 1, status: 'PENDING_REVIEW', version: 0 }, history: [] }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const listResult = await staffHostApi.list({
    page: 0,
    size: 8,
    status: 'PENDING_REVIEW',
    search: 'HREG-1',
    sort: 'NEWEST'
  });
  assert.equal(listResult.stats.approved, 2);
  assert.equal(listResult.content.length, 1);
  assert.ok(calls[0].url.includes('status=PENDING_REVIEW'));
  assert.ok(calls[0].url.includes('search=HREG-1'));

  const detailResult = await staffHostApi.detail(1);
  assert.equal(detailResult.application.id, 1);

  const reviewResult = await staffHostApi.review(1, {
    decision: 'APPROVED',
    note: 'Hồ sơ hợp lệ',
    allowResubmit: true,
    version: 0,
    requestedFields: []
  });
  assert.equal(reviewResult.status, 'APPROVED');
  assert.equal(reviewResult.version, 1);
});


test('Staff Host Registration components and styles satisfy SaaS Admin Dashboard & safety contracts', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.resolve(import.meta.dirname, '..');

  const listTemplate = await fs.readFile(path.join(root, 'src/pages/staff/StaffHostListTemplate.jsx'), 'utf8');
  const listPage = await fs.readFile(path.join(root, 'src/pages/staff/StaffHostRegistrationsPage.jsx'), 'utf8');
  const detailTemplate = await fs.readFile(path.join(root, 'src/pages/staff/StaffHostDetailTemplate.jsx'), 'utf8');
  const detailPage = await fs.readFile(path.join(root, 'src/pages/staff/StaffHostRegistrationDetailPage.jsx'), 'utf8');
  const modalTemplate = await fs.readFile(path.join(root, 'src/pages/staff/StaffHostModalTemplate.jsx'), 'utf8');
  const workspaceCss = await fs.readFile(path.join(root, 'src/styles/staff-host-workspace.css'), 'utf8');
  const modalCss = await fs.readFile(path.join(root, 'src/styles/staff-host-decision-modal.css'), 'utf8');

  // KPI & List contracts
  assert.match(listTemplate, /formatProcessedBreakdown\(stats\)/);
  assert.match(listTemplate, /cardKpiProcessed/);
  assert.match(listPage, /setSearchInput/);
  assert.match(listPage, /Chờ (&gt;|>) 48h/);
  assert.match(listPage, /Xử lý: \{item\.reviewedBy\}/);
  assert.doesNotMatch(listPage, /btnQuickApprove/);

  // Detail & Modal contracts
  assert.match(detailTemplate, /id="detailApplicantName"/);
  assert.match(detailTemplate, /id="detailApplicantPhone"/);
  assert.match(detailTemplate, /id="detailApplicantEmail"/);
  assert.match(detailTemplate, /id="overviewReviewedBy"/);
  assert.match(modalTemplate, /Xác nhận phê duyệt đăng ký chủ trọ/);
  assert.match(modalTemplate, /Yêu cầu bổ sung thông tin/);
  assert.match(modalTemplate, /Xác nhận từ chối hồ sơ/);
  assert.match(modalTemplate, /Thao tác này sẽ cập nhật trạng thái xét duyệt theo quy trình của hệ thống/);
  assert.match(detailPage, /pendingRequest\.current/);
  assert.match(detailPage, /err\.status === 409/);

  // CSS tokens, KPI subtitle visibility, 70/30 layout, and motion discipline
  assert.doesNotMatch(workspaceCss, /\.sha-metric small\s*\{\s*display:\s*none\s*\}/);
  assert.doesNotMatch(workspaceCss, /transition:\s*all/);
  assert.doesNotMatch(modalCss, /transition:\s*all/);
  assert.match(workspaceCss, /grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(300px,\s*3fr\)/);
  assert.match(workspaceCss, /prefers-reduced-motion:\s*reduce/);
});
