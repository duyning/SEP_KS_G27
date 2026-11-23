export const VERIFICATION_STATUS_TABS = [
  {
    value: 'ALL',
    label: 'Tất cả hồ sơ',
    shortLabel: 'Tất cả',
    tone: 'slate',
    description: 'Toàn bộ hồ sơ xác minh nhà trọ trong phạm vi phụ trách và giám sát.',
    emptyTitle: 'Chưa có hồ sơ xác minh nhà trọ',
    emptyHint: 'Khi chủ trọ gửi đăng ký nhà trọ mới hoặc đề nghị cập nhật thông tin, hồ sơ sẽ xuất hiện tại đây.',
  },
  {
    value: 'PENDING',
    label: 'Chờ xác minh',
    shortLabel: 'Chờ xác minh',
    tone: 'amber',
    description: 'Hồ sơ mới nộp hoặc vừa được chủ trọ bổ sung gửi lại, cần kiểm tra pháp lý & hình ảnh.',
    emptyTitle: 'Không còn hồ sơ chờ xác minh',
    emptyHint: 'Hàng đợi thẩm định hiện đã được xử lý hết. Bạn có thể kiểm tra mục Cần bổ sung hoặc Đã phê duyệt.',
  },
  {
    value: 'NEEDS_SUPPLEMENT',
    label: 'Cần bổ sung',
    shortLabel: 'Cần bổ sung',
    tone: 'orange',
    description: 'Đã gửi ghi chú chỉnh sửa chi tiết cho chủ trọ; đang chờ chủ trọ cập nhật và gửi lại.',
    emptyTitle: 'Không có hồ sơ đang chờ bổ sung',
    emptyHint: 'Hiện không có hồ sơ nào đang đợi chủ trọ phản hồi hoặc bổ sung tài liệu.',
  },
  {
    value: 'APPROVED',
    label: 'Đã phê duyệt',
    shortLabel: 'Đã phê duyệt',
    tone: 'emerald',
    description: 'Hồ sơ đạt chuẩn xác minh và nhà trọ đã được kích hoạt hiển thị công khai trên hệ thống.',
    emptyTitle: 'Chưa có hồ sơ được phê duyệt',
    emptyHint: 'Các hồ sơ hoàn tất thẩm định và được phê duyệt sẽ lưu trữ tại đây để tra cứu đối chiếu.',
  },
  {
    value: 'REJECTED',
    label: 'Đã từ chối',
    shortLabel: 'Đã từ chối',
    tone: 'rose',
    description: 'Hồ sơ không đáp ứng tiêu chuẩn pháp lý hoặc thông tin thực tế và đã lưu biên bản từ chối.',
    emptyTitle: 'Không có hồ sơ bị từ chối',
    emptyHint: 'Các hồ sơ bị từ chối cùng lý do chi tiết sẽ được lưu trữ tại đây.',
  },
];

export const SUBMISSION_KIND_FILTERS = [
  { value: 'ALL', label: 'Tất cả phân loại' },
  { value: 'ACTIONABLE', label: 'Có thể xử lý ngay' },
  { value: 'NEW_PROPERTY', label: 'Đăng ký mới' },
  { value: 'UPDATE_PROPOSAL', label: 'Đề nghị cập nhật' },
  { value: 'RESUBMITTED', label: 'Đã bổ sung gửi lại' },
];

export const VERIFICATION_SORT_OPTIONS = [
  { value: 'PRIORITY', label: 'Ưu tiên xử lý (SLA)' },
  { value: 'NEWEST', label: 'Mới gửi gần đây' },
  { value: 'FIFO', label: 'Chờ lâu nhất trước' },
  { value: 'UPDATED', label: 'Cập nhật xét duyệt gần nhất' },
];

function foldVietnamese(text) {
  return String(text || '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function toTimestamp(value) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeNotePreview(note, maxLength = 120) {
  if (!note || typeof note !== 'string') return '';
  const cleaned = note
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function classifyVerificationRecord(item) {
  if (!item) {
    return {
      submissionKind: 'NEW_PROPERTY',
      submissionLabel: 'Đăng ký mới',
      submissionTone: 'slate',
      isUpdateProposal: false,
      isResubmitted: false,
      docsUploaded: 0,
      requiredDocsUploaded: 0,
      docsComplete: false,
      allDocsUploaded: false,
      readyForApproval: false,
      canAct: false,
      reasonPreview: '',
    };
  }
  const isUpdateProposal = item.targetPropertyId != null;
  const createdMs = toTimestamp(item.createdAt);
  const submittedMs = toTimestamp(item.submittedAt);
  const isResubmitted = !isUpdateProposal && Boolean(item.submittedAt) && (submittedMs > createdMs + 1000 || item.status === 'PENDING');
  const submissionKind = isUpdateProposal ? 'UPDATE_PROPOSAL' : isResubmitted ? 'RESUBMITTED' : 'NEW_PROPERTY';
  const submissionLabel = isUpdateProposal
    ? `Cập nhật NT-${item.targetPropertyId}`
    : isResubmitted
      ? 'Đã bổ sung · Gửi lại'
      : 'Đăng ký mới';
  const submissionTone = isUpdateProposal ? 'indigo' : isResubmitted ? 'teal' : 'slate';

  const docsUploaded = Number.isInteger(item.documentCount) ? item.documentCount : 0;
  const requiredDocsUploaded = Number.isInteger(item.requiredDocumentCount) ? item.requiredDocumentCount : (docsUploaded >= 2 ? 2 : docsUploaded);
  const docsComplete = requiredDocsUploaded >= 2;
  const allDocsUploaded = docsUploaded >= 3;
  const readyForApproval = typeof item.readyForApproval === 'boolean'
    ? item.readyForApproval
    : docsComplete && Boolean(item.coverId);
  const canAct = item.canReview === true && ['PENDING', 'NEEDS_SUPPLEMENT'].includes(item.status);

  return {
    submissionKind,
    submissionLabel,
    submissionTone,
    isUpdateProposal,
    isResubmitted,
    docsUploaded,
    requiredDocsUploaded,
    docsComplete,
    allDocsUploaded,
    readyForApproval,
    canAct,
    reasonPreview: summarizeNotePreview(item.reasonNote),
  };
}

export function computeVerificationMetrics(items = []) {
  const list = Array.isArray(items) ? items : [];
  const counts = {
    ALL: list.length,
    PENDING: 0,
    NEEDS_SUPPLEMENT: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  const kinds = {
    ALL: list.length,
    ACTIONABLE: 0,
    NEW_PROPERTY: 0,
    UPDATE_PROPOSAL: 0,
    RESUBMITTED: 0,
  };
  let readyPendingCount = 0;

  for (const item of list) {
    if (Object.hasOwn(counts, item.status)) counts[item.status] += 1;
    const meta = classifyVerificationRecord(item);
    if (item.status === 'PENDING' && item.canReview === true) {
      kinds.ACTIONABLE += 1;
      if (meta.readyForApproval) readyPendingCount += 1;
    }
    if (meta.isUpdateProposal) kinds.UPDATE_PROPOSAL += 1;
    else kinds.NEW_PROPERTY += 1;
    if (meta.isResubmitted) kinds.RESUBMITTED += 1;
  }

  return { counts, kinds, readyPendingCount };
}

export function matchesVerificationKind(item, kind = 'ALL') {
  if (!kind || kind === 'ALL') return true;
  const meta = classifyVerificationRecord(item);
  if (kind === 'ACTIONABLE') return item.status === 'PENDING' && item.canReview === true;
  if (kind === 'UPDATE_PROPOSAL') return meta.isUpdateProposal;
  if (kind === 'NEW_PROPERTY') return !meta.isUpdateProposal;
  if (kind === 'RESUBMITTED') return meta.isResubmitted;
  return true;
}

const STATUS_PRIORITY_RANK = {
  PENDING: 0,
  NEEDS_SUPPLEMENT: 1,
  APPROVED: 2,
  REJECTED: 3,
};

export function filterAndSortVerifications(items = [], { status = 'ALL', kind = 'ALL', search = '', sort = 'PRIORITY' } = {}) {
  const list = Array.isArray(items) ? items : [];
  const rawQuery = String(search || '').trim();
  const normalizedQuery = foldVietnamese(rawQuery);

  return list
    .filter(item => {
      if (status && status !== 'ALL' && item.status !== status) return false;
      if (!matchesVerificationKind(item, kind)) return false;
      if (!normalizedQuery) return true;
      const candidates = [
        item.name,
        `HS-${item.registrationId}`,
        String(item.registrationId || ''),
        item.targetPropertyId != null ? `NT-${item.targetPropertyId}` : '',
        item.address,
        item.ownerName,
        item.managerName,
        item.ownerEmail,
        item.ownerPhone,
        item.contactPhone,
        item.propertyType,
        item.assignedStaffName,
        item.reviewerName,
      ];
      return candidates.some(value => foldVietnamese(value).includes(normalizedQuery));
    })
    .sort((a, b) => {
      const aSubmitted = toTimestamp(a.submittedAt || a.createdAt);
      const bSubmitted = toTimestamp(b.submittedAt || b.createdAt);
      const aCreated = toTimestamp(a.createdAt);
      const bCreated = toTimestamp(b.createdAt);
      const aUpdated = toTimestamp(a.reviewedAt || a.submittedAt || a.createdAt);
      const bUpdated = toTimestamp(b.reviewedAt || b.submittedAt || b.createdAt);

      if (sort === 'FIFO') {
        return aSubmitted - bSubmitted || (a.registrationId || 0) - (b.registrationId || 0);
      }
      if (sort === 'UPDATED') {
        return bUpdated - aUpdated || (b.registrationId || 0) - (a.registrationId || 0);
      }
      if (sort === 'NEWEST') {
        return bSubmitted - aSubmitted || (b.registrationId || 0) - (a.registrationId || 0);
      }
      // PRIORITY: actionable PENDING first (oldest waiting first for SLA fairness), then NEEDS_SUPPLEMENT, then finalized records newest-reviewed first.
      const aRank = STATUS_PRIORITY_RANK[a.status] ?? 9;
      const bRank = STATUS_PRIORITY_RANK[b.status] ?? 9;
      if (aRank !== bRank) return aRank - bRank;
      if (a.status === 'PENDING') {
        const aCan = a.canReview === true ? 0 : 1;
        const bCan = b.canReview === true ? 0 : 1;
        if (aCan !== bCan) return aCan - bCan;
        return aSubmitted - bSubmitted || (a.registrationId || 0) - (b.registrationId || 0);
      }
      return bUpdated - aUpdated || (b.registrationId || 0) - (a.registrationId || 0);
    });
}

export function getVerificationRowActions(item) {
  if (!item) return { primary: null, secondary: [], statusHint: '' };
  const detailUrl = `/staff/verifications/detail?id=${item.registrationId}`;
  const hasVersion = Number.isSafeInteger(item.assignmentVersion) && item.assignmentVersion >= 0;
  const meta = classifyVerificationRecord(item);

  if (item.status === 'PENDING') {
    if (item.canReview === true) {
      const secondary = [
        {
          id: 'supplement',
          kind: 'link',
          label: 'Yêu cầu bổ sung',
          to: `${detailUrl}&decision=REQUEST_SUPPLEMENT`,
          tone: 'amber',
          title: 'Mở hồ sơ và chọn các mục cần chủ trọ bổ sung',
        },
      ];
      if (meta.readyForApproval && hasVersion && !item.reverificationRequired) {
        secondary.unshift({
          id: 'quick-approve',
          kind: 'quick_decision',
          decision: 'APPROVE',
          label: 'Duyệt nhanh',
          tone: 'emerald',
          title: 'Đủ điều kiện tài liệu cơ bản — mở xác nhận phê duyệt',
        });
      }
      if (hasVersion) {
        secondary.push({
          id: 'quick-reject',
          kind: 'quick_decision',
          decision: 'REJECT',
          label: 'Từ chối',
          tone: 'rose',
          title: 'Từ chối hồ sơ với lý do cụ thể',
        });
      }
      return {
        primary: {
          id: 'inspect-review',
          kind: 'link',
          label: 'Thẩm định ngay',
          to: detailUrl,
          tone: 'primary',
        },
        secondary,
        statusHint: item.reverificationRequired ? 'Cần đối chiếu thay đổi quan trọng · Nhà trọ tạm ẩn' : meta.readyForApproval ? 'Đủ hồ sơ bắt buộc · Sẵn sàng duyệt' : 'Cần kiểm tra kỹ tài liệu đính kèm',
      };
    }
    return {
      primary: {
        id: 'supervise-pending',
        kind: 'link',
        label: 'Xem giám sát',
        to: detailUrl,
        tone: 'neutral',
      },
      secondary: [],
      statusHint: item.assignedStaffName ? `Phụ trách: ${item.assignedStaffName}` : 'Chế độ giám sát (Chỉ xem)',
    };
  }

  if (item.status === 'NEEDS_SUPPLEMENT') {
    if (item.canReview === true) {
      const secondary = [];
      if (hasVersion) {
        secondary.push({
          id: 'reject-supplement',
          kind: 'quick_decision',
          decision: 'REJECT',
          label: 'Từ chối hồ sơ',
          tone: 'rose',
          title: 'Đóng và từ chối nếu hồ sơ không đủ điều kiện bổ sung',
        });
      }
      return {
        primary: {
          id: 'track-supplement',
          kind: 'link',
          label: 'Theo dõi bổ sung',
          to: detailUrl,
          tone: 'amber-outline',
        },
        secondary,
        statusHint: 'Đang chờ chủ trọ cập nhật và gửi lại',
      };
    }
    return {
      primary: {
        id: 'supervise-supplement',
        kind: 'link',
        label: 'Xem yêu cầu bổ sung',
        to: detailUrl,
        tone: 'neutral',
      },
      secondary: [],
      statusHint: 'Đang chờ chủ trọ phản hồi',
    };
  }

  if (item.status === 'APPROVED') {
    const propertyId = item.publishedPropertyId ?? null;
    const secondary = propertyId
      ? [
          {
            id: 'view-public',
            kind: 'link',
            label: 'Xem tin đăng',
            to: `/properties/detail?propertyId=${propertyId}`,
            tone: 'ghost-teal',
            external: true,
            title: 'Mở trang chi tiết nhà trọ công khai dành cho người thuê',
          },
        ]
      : [];
    return {
      primary: {
        id: 'view-approved',
        kind: 'link',
        label: 'Xem hồ sơ đã duyệt',
        to: detailUrl,
        tone: 'emerald-outline',
      },
      secondary,
      statusHint: propertyId ? `Đang hiển thị · Mã #NT-${propertyId}` : 'Đã hoàn tất phê duyệt',
    };
  }

  // REJECTED
  return {
    primary: {
      id: 'view-rejected',
      kind: 'link',
      label: 'Xem lý do từ chối',
      to: detailUrl,
      tone: 'rose-outline',
    },
    secondary: [],
    statusHint: 'Hồ sơ đã đóng · Lưu biên bản',
  };
}

export function buildVerificationChecklist(detail) {
  const photos = Array.isArray(detail?.photos) ? detail.photos : [];
  const documents = Array.isArray(detail?.documents) ? detail.documents : [];
  const submission = detail?.submission || null;

  const hasCoverPhoto = photos.some(file => file.type === 'PHOTO_0');
  const hasOwnership = documents.some(file => file.type === 'OWNERSHIP');
  const hasIdCard = documents.some(file => file.type === 'ID_CARD');
  const hasFireSafety = documents.some(file => file.type === 'FIRE_SAFETY');
  const hasTerms = Boolean(submission?.termsAccepted);

  const items = [
    {
      key: 'coverPhoto',
      label: 'Ảnh đại diện & khuôn viên',
      detail: photos.length ? `${photos.length} ảnh đã tải` : 'Chưa có ảnh',
      passed: hasCoverPhoto,
      required: true,
    },
    {
      key: 'ownership',
      label: 'Giấy phép kinh doanh',
      detail: hasOwnership ? 'Đã đính kèm' : 'Thiếu tài liệu bắt buộc',
      passed: hasOwnership,
      required: true,
    },
    {
      key: 'idCard',
      label: 'CCCD / CMND chủ trọ',
      detail: hasIdCard ? 'Đã đính kèm' : 'Thiếu tài liệu bắt buộc',
      passed: hasIdCard,
      required: true,
    },
    {
      key: 'fireSafety',
      label: 'Chứng nhận an toàn PCCC',
      detail: hasFireSafety ? 'Đã đính kèm' : 'Chưa đính kèm (kiểm tra thực tế)',
      passed: hasFireSafety,
      required: false,
    },
    {
      key: 'terms',
      label: 'Cam kết thông tin chủ trọ',
      detail: hasTerms ? 'Đã xác nhận' : 'Chưa xác nhận cam kết',
      passed: hasTerms,
      required: true,
    },
  ];

  const mandatoryReady = items.filter(item => item.required).every(item => item.passed);
  return { items, mandatoryReady };
}

export function getVerificationDetailActions(detail) {
  const summary = detail?.summary;
  if (!summary) {
    return {
      mode: 'UNKNOWN',
      tone: 'slate',
      headline: 'Đang kiểm tra trạng thái',
      description: '',
      checklist: [],
      mandatoryReady: false,
      decisions: [],
      jumpLinks: [],
      publicPropertyUrl: null,
    };
  }

  const { items: checklist, mandatoryReady } = buildVerificationChecklist(detail);
  const canReview = detail.canReview === true;
  const publicPropertyId = summary.publishedPropertyId ?? null;
  const publicPropertyUrl = publicPropertyId ? `/properties/detail?propertyId=${publicPropertyId}` : null;

  if (summary.status === 'PENDING' && canReview) {
    return {
      mode: 'ACTIVE_REVIEW',
      tone: 'amber',
      headline: summary.submittedAt ? 'Hồ sơ bổ sung chờ thẩm định lại' : 'Sẵn sàng thẩm định hồ sơ',
      description: mandatoryReady
        ? 'Hồ sơ đã có đủ các mục bắt buộc. Hãy đối chiếu nội dung thực tế trước khi ra quyết định.'
        : 'Hồ sơ đang thiếu một hoặc nhiều mục bắt buộc. Bạn nên gửi Yêu cầu bổ sung để chủ trọ hoàn thiện.',
      checklist,
      mandatoryReady,
      decisions: [
        {
          decision: 'APPROVE',
          label: 'Phê duyệt & Xuất bản',
          variant: 'primary',
          disabled: !mandatoryReady,
          disabledReason: !mandatoryReady ? 'Cần đủ Ảnh đại diện, Giấy phép kinh doanh, CCCD/CMND và Cam kết thông tin trước khi phê duyệt.' : '',
        },
        {
          decision: 'REQUEST_SUPPLEMENT',
          label: 'Yêu cầu bổ sung từng mục',
          variant: 'amber',
          disabled: false,
          recommended: !mandatoryReady,
        },
        {
          decision: 'REJECT',
          label: 'Từ chối hồ sơ',
          variant: 'danger',
          disabled: false,
        },
      ],
      jumpLinks: [
        { label: 'Kiểm tra 3 tài liệu pháp lý', target: 'svd-section-documents' },
        { label: 'Xem lịch sử luân chuyển', target: 'svd-section-history' },
      ],
      publicPropertyUrl: null,
    };
  }

  if (summary.status === 'NEEDS_SUPPLEMENT' && canReview) {
    const decisions = [];
    if (mandatoryReady) {
      decisions.push({
        decision: 'APPROVE',
        label: 'Phê duyệt hồ sơ hiện tại',
        variant: 'primary',
        disabled: false,
      });
    }
    decisions.push({
      decision: 'REJECT',
      label: 'Từ chối & Đóng hồ sơ',
      variant: 'danger',
      disabled: false,
    });
    return {
      mode: 'WAITING_SUPPLEMENT',
      tone: 'orange',
      headline: 'Đang chờ chủ trọ bổ sung',
      description: 'Yêu cầu chỉnh sửa từng mục đã được gửi tới chủ trọ. Hồ sơ sẽ tự động chuyển về Chờ xác minh ngay khi chủ trọ cập nhật và gửi lại.',
      checklist,
      mandatoryReady,
      decisions,
      jumpLinks: [
        ...(detail.reasonNote ? [{ label: 'Xem nội dung đã yêu cầu bổ sung', target: 'svd-feedback-banner' }] : []),
        { label: 'Xem nhật ký thẩm định', target: 'svd-section-history' },
      ],
      publicPropertyUrl: null,
    };
  }

  if (summary.status === 'APPROVED') {
    return {
      mode: 'FINAL_APPROVED',
      tone: 'emerald',
      headline: 'Hồ sơ đã phê duyệt thành công',
      description: 'Hồ sơ này đã hoàn tất quy trình thẩm định và được lưu trữ làm căn cứ pháp lý cho tin đăng nhà trọ đang hoạt động.',
      checklist,
      mandatoryReady,
      decisions: [],
      jumpLinks: [
        { label: 'Đối chiếu tài liệu pháp lý lưu trữ', target: 'svd-section-documents' },
        { label: 'Xem biên bản & nhật ký duyệt', target: 'svd-section-history' },
      ],
      publicPropertyUrl,
    };
  }

  if (summary.status === 'REJECTED') {
    return {
      mode: 'FINAL_REJECTED',
      tone: 'rose',
      headline: 'Hồ sơ đã từ chối xét duyệt',
      description: 'Hồ sơ đã đóng với quyết định từ chối. Chủ trọ đã nhận được thông báo kèm lý do chi tiết.',
      checklist,
      mandatoryReady,
      decisions: [],
      jumpLinks: [
        ...(detail.reasonNote ? [{ label: 'Xem lý do từ chối đã gửi', target: 'svd-feedback-banner' }] : []),
        { label: 'Kiểm tra lại tài liệu đã nộp', target: 'svd-section-documents' },
        { label: 'Xem nhật ký xử lý', target: 'svd-section-history' },
      ],
      publicPropertyUrl: null,
    };
  }

  // Read-only supervision (e.g., ADMIN or non-assigned Staff)
  return {
    mode: 'READ_ONLY_SUPERVISION',
    tone: 'slate',
    headline: 'Chế độ giám sát nội bộ (Chỉ xem)',
    description: detail.assignedStaffName
      ? `Hồ sơ hiện do ${detail.assignedStaffName} phụ trách xử lý. Tài khoản của bạn đang ở chế độ giám sát và tra cứu.`
      : 'Tài khoản hiện tại chỉ có quyền giám sát tiến độ và kiểm tra chứng từ, không thực hiện thao tác xét duyệt trực tiếp.',
    checklist,
    mandatoryReady,
    decisions: [],
    jumpLinks: [
      { label: 'Kiểm tra chứng từ pháp lý', target: 'svd-section-documents' },
      { label: 'Xem lịch sử luân chuyển', target: 'svd-section-history' },
    ],
    publicPropertyUrl,
  };
}
