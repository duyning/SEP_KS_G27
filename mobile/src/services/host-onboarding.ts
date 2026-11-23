import {
  AMENITIES,
  PROPERTY_AREAS,
  RULES,
  type RegistrationValues,
} from './property-registration';

export const ONBOARDING_STAGES = [
  'Tài khoản & CCCD',
  'Thông tin nhà trọ',
  'Staff thẩm định',
] as const;

export const IDENTITY_ALLOWED_TYPES = ['image/jpeg', 'image/png'] as const;
export const IDENTITY_MAX_BYTES = 5 * 1024 * 1024;
export const INTRODUCTION_MAX_LENGTH = 1000;

export const ONBOARDING_FIELD_LABELS: Record<string, string> = {
  name: 'Tên nhà trọ',
  propertyType: 'Loại hình nhà trọ',
  description: 'Mô tả nhà trọ',
  managerName: 'Người đón khách',
  contactPhone: 'Số hotline',
  zaloPhone: 'Số Zalo',
  commune: 'Khu vực Hòa Lạc',
  addressDetail: 'Địa chỉ chi tiết',
  nearby: 'Địa điểm lân cận',
  latitude: 'Vĩ độ bản đồ',
  longitude: 'Kinh độ bản đồ',
  location: 'Vị trí bản đồ',
  amenities: 'Tiện ích',
  selectedRules: 'Quy định nhà trọ',
  rules: 'Quy định khác',
  photos: 'Hình ảnh nhà trọ',
  ownership: 'Giấy phép kinh doanh',
  idCard: 'CCCD mặt trước',
  idCardBack: 'CCCD mặt sau',
  fireSafety: 'Chứng nhận an toàn PCCC',
};

export interface HostApplicationView {
  applicationId: number;
  status: string;
  introduction?: string | null;
  agreementAccepted?: boolean;
  hasIdentityImage?: boolean;
  hasIdentityBackImage?: boolean;
  reviewNote?: string | null;
  version?: number | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OnboardingRegistrationView {
  registrationId: number;
  propertyId?: number | null;
  propertyName?: string | null;
  commune?: string | null;
  status: string;
  reasonNote?: string | null;
  requestedFields?: string[] | null;
  fieldNotes?: Record<string, string> | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  hostOnboarding?: boolean;
}

export interface HostOnboardingCurrent {
  account: HostApplicationView | null;
  registration: OnboardingRegistrationView | null;
}

export interface OnboardingAttachment {
  documentId: number;
  documentType: string;
  fileName: string;
  verificationStatus?: string | null;
}

export interface OnboardingEditSnapshot {
  registrationId: number;
  propertyId: number | null;
  mode: string;
  status: string;
  reasonNote: string | null;
  requestedFields: string[];
  fieldNotes: Record<string, string>;
  editableFields: string[];
  legacyScope: boolean;
  details: RegistrationValues;
  photos: OnboardingAttachment[];
  documents: OnboardingAttachment[];
  versionToken: string;
  reverificationRequired: boolean;
  reverificationReasons: string[];
}

export type OnboardingIdentitySide = 'front' | 'back';

export interface OnboardingIdentityAsset {
  uri: string;
  fileName?: string | null;
  mimeType: 'image/jpeg' | 'image/png';
  fileSize: number;
  dataUri: string;
}

export interface OnboardingAccountDraft {
  introduction: string;
  agreementAccepted: boolean;
}

export type OnboardingStage = 1 | 2 | 3;

export type OnboardingStage1Field =
  | 'fullName'
  | 'phoneNumber'
  | 'phoneVerified'
  | 'agreementAccepted'
  | 'identityFront'
  | 'identityBack'
  | 'introduction';

export type OnboardingStage1Errors = Partial<Record<OnboardingStage1Field, string>>;

export interface OnboardingHadLocalMedia {
  identityFront: boolean;
  identityBack: boolean;
  photos: boolean;
  ownership: boolean;
  fireSafety: boolean;
}

export interface OnboardingPersistedDraft {
  version: 1;
  savedAt: string;
  stage: 1 | 2;
  propertyStep: number;
  account: OnboardingAccountDraft;
  property: RegistrationValues;
  hadLocalMedia: OnboardingHadLocalMedia;
}

export interface OnboardingBannerPresentation {
  visible: boolean;
  state:
    | 'hidden'
    | 'guest'
    | 'eligible'
    | 'draft'
    | 'pending'
    | 'needs_supplement'
    | 'approved'
    | 'host';
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  action:
    | 'none'
    | 'login_redirect'
    | 'onboarding_start'
    | 'onboarding_draft'
    | 'onboarding_status'
    | 'onboarding_supplement'
    | 'switch_host';
  href: string | null;
}

export type TimelineStepState = 'done' | 'active' | 'warning' | 'error' | 'upcoming';

export interface OnboardingTimelineItem {
  key: string;
  title: string;
  subtitle: string;
  state: TimelineStepState;
}

export interface OnboardingStatusPresentation {
  tone: 'pending' | 'warning' | 'approved' | 'rejected';
  badge: string;
  title: string;
  description: string;
  dossierCode: string;
  roleStatusLabel: string;
  propertyStatusLabel: string;
  canSupplement: boolean;
  canOpenHostPortal: boolean;
  timeline: OnboardingTimelineItem[];
}

export const emptyAccountDraft: OnboardingAccountDraft = {
  introduction: '',
  agreementAccepted: false,
};

export function isValidVietnamPhone(value?: string | null): boolean {
  if (!value) return false;
  const cleaned = value.trim().replace(/[\s.-]/g, '');
  return /^(?:0|\+84)[35789]\d{8}$/.test(cleaned);
}

export function identityAssetError(asset: {
  mimeType?: string | null;
  fileSize?: number;
}): string | null {
  if (!asset.mimeType || !(IDENTITY_ALLOWED_TYPES as readonly string[]).includes(asset.mimeType)) {
    return 'Chỉ hỗ trợ ảnh CCCD định dạng JPG hoặc PNG.';
  }
  if (asset.fileSize != null && (asset.fileSize <= 0 || asset.fileSize > IDENTITY_MAX_BYTES)) {
    return 'Ảnh CCCD phải có dữ liệu và không vượt quá 5 MB.';
  }
  return null;
}

export function validateOnboardingStage1(input: {
  user: {
    fullName?: string | null;
    phoneNumber?: string | null;
    phoneVerifiedAt?: string | null;
  } | null;
  account: HostApplicationView | null;
  draft: OnboardingAccountDraft;
  front: OnboardingIdentityAsset | null;
  back: OnboardingIdentityAsset | null;
}): OnboardingStage1Errors {
  const errors: OnboardingStage1Errors = {};
  const fullName = input.user?.fullName?.trim() || '';
  const phoneNumber = input.user?.phoneNumber?.trim() || '';

  if (!fullName) {
    errors.fullName = 'Cập nhật họ và tên trong hồ sơ trước khi tiếp tục.';
  }
  if (!isValidVietnamPhone(phoneNumber)) {
    errors.phoneNumber = 'Tài khoản cần có số điện thoại di động Việt Nam hợp lệ.';
  }
  if (!input.user?.phoneVerifiedAt) {
    errors.phoneVerified = 'Vui lòng xác minh số điện thoại bằng mã OTP trước khi tiếp tục.';
  }
  if (!input.draft.agreementAccepted) {
    errors.agreementAccepted = 'Vui lòng đồng ý điều khoản đối tác HL_RCS.';
  }

  const hasFront = Boolean(input.front) || Boolean(input.account?.hasIdentityImage);
  if (!hasFront) {
    errors.identityFront = 'Vui lòng tải ảnh CCCD mặt trước (JPG/PNG ≤ 5 MB).';
  } else if (input.front) {
    const frontErr = identityAssetError(input.front);
    if (frontErr) errors.identityFront = frontErr;
  }

  const hasBack = Boolean(input.back) || Boolean(input.account?.hasIdentityBackImage);
  if (!hasBack) {
    errors.identityBack = 'Vui lòng tải ảnh CCCD mặt sau (JPG/PNG ≤ 5 MB).';
  } else if (input.back) {
    const backErr = identityAssetError(input.back);
    if (backErr) errors.identityBack = backErr;
  }

  if (input.draft.introduction.length > INTRODUCTION_MAX_LENGTH) {
    errors.introduction = `Ghi chú cho nhân viên tối đa ${INTRODUCTION_MAX_LENGTH} ký tự.`;
  }

  return errors;
}

export function resolveOnboardingBannerState(input: {
  user: { role: string } | null;
  current: HostOnboardingCurrent | null;
  hasLocalDraft: boolean;
}): OnboardingBannerPresentation {
  const role = input.user?.role;

  if (role === 'STAFF' || role === 'ADMIN') {
    return {
      visible: false,
      state: 'hidden',
      badge: '',
      title: '',
      description: '',
      ctaLabel: '',
      action: 'none',
      href: null,
    };
  }

  if (role === 'ROOM_HOST') {
    return {
      visible: true,
      state: 'host',
      badge: 'Đối tác chủ nhà trọ',
      title: 'Bạn đang là đối tác HL_RCS',
      description:
        'Chuyển sang không gian chủ trọ để quản lý nhà trọ, phòng thuê và lịch xem phòng.',
      ctaLabel: 'Vào quản lý nhà trọ',
      action: 'switch_host',
      href: '/home',
    };
  }

  if (!input.user) {
    return {
      visible: true,
      state: 'guest',
      badge: 'Dành cho chủ nhà trọ',
      title: 'Bạn có nhà trọ cho thuê?',
      description:
        'Trở thành đối tác HL_RCS để quản lý nhà trọ, phòng thuê và lịch xem phòng thuận tiện hơn.',
      ctaLabel: 'Đăng ký làm chủ trọ',
      action: 'login_redirect',
      href: '/login?redirect=%2Fbecome-host',
    };
  }

  const regStatus = input.current?.registration?.status?.toUpperCase() || '';

  if (regStatus === 'PENDING') {
    return {
      visible: true,
      state: 'pending',
      badge: 'Hồ sơ đang thẩm định',
      title: 'Hồ sơ đối tác đang chờ duyệt',
      description:
        'Nhân viên HL_RCS đang thẩm định tài khoản CCCD và thông tin nhà trọ đầu tiên của bạn.',
      ctaLabel: 'Theo dõi hồ sơ',
      action: 'onboarding_status',
      href: '/become-host',
    };
  }

  if (regStatus === 'NEEDS_SUPPLEMENT' || regStatus === 'REJECTED') {
    return {
      visible: true,
      state: 'needs_supplement',
      badge: regStatus === 'REJECTED' ? 'Hồ sơ cần cập nhật' : 'Cần bổ sung hồ sơ',
      title: 'Hồ sơ đối tác cần bổ sung',
      description:
        'Xem ghi chú thẩm định từ nhân viên và bổ sung thông tin còn thiếu ngay trong hồ sơ hiện có.',
      ctaLabel: 'Bổ sung hồ sơ',
      action: 'onboarding_supplement',
      href: '/become-host',
    };
  }

  if (regStatus === 'APPROVED') {
    return {
      visible: true,
      state: 'approved',
      badge: 'Hồ sơ đã phê duyệt',
      title: 'Hồ sơ đối tác đã được duyệt',
      description:
        'Tài khoản và nhà trọ đầu tiên đã hoàn tất thẩm định. Mở để làm mới quyền chủ trọ.',
      ctaLabel: 'Xem trạng thái hồ sơ',
      action: 'onboarding_status',
      href: '/become-host',
    };
  }

  if (input.hasLocalDraft) {
    return {
      visible: true,
      state: 'draft',
      badge: 'Bản nháp đã lưu',
      title: 'Tiếp tục đăng ký làm chủ trọ',
      description:
        'Bản nháp hồ sơ đối tác và nhà trọ đầu tiên của bạn đã sẵn sàng để hoàn tất và gửi duyệt.',
      ctaLabel: 'Tiếp tục bản nháp',
      action: 'onboarding_draft',
      href: '/become-host',
    };
  }

  return {
    visible: true,
    state: 'eligible',
    badge: 'Dành cho chủ nhà trọ',
    title: 'Bạn có nhà trọ cho thuê?',
    description:
      'Trở thành đối tác HL_RCS để quản lý nhà trọ, phòng thuê và lịch xem phòng thuận tiện hơn.',
    ctaLabel: 'Đăng ký làm chủ trọ',
    action: 'onboarding_start',
    href: '/become-host',
  };
}

export function serializeOnboardingDraft(input: {
  stage: 1 | 2;
  propertyStep: number;
  account: OnboardingAccountDraft;
  property: RegistrationValues;
  hadLocalMedia: OnboardingHadLocalMedia;
}): string {
  const payload: OnboardingPersistedDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    stage: input.stage === 2 ? 2 : 1,
    propertyStep: Math.max(0, Math.min(5, Math.trunc(input.propertyStep))),
    account: {
      introduction: input.account.introduction.slice(0, INTRODUCTION_MAX_LENGTH),
      agreementAccepted: Boolean(input.account.agreementAccepted),
    },
    property: {
      name: input.property.name.slice(0, 255),
      propertyType: input.property.propertyType.slice(0, 120),
      description: input.property.description.slice(0, 2000),
      managerName: input.property.managerName.slice(0, 120),
      contactPhone: input.property.contactPhone.slice(0, 30),
      zaloPhone: input.property.zaloPhone.slice(0, 30),
      commune: input.property.commune.slice(0, 120),
      addressDetail: input.property.addressDetail.slice(0, 255),
      nearby: input.property.nearby.slice(0, 255),
      latitude: (input.property.latitude || '').slice(0, 40),
      longitude: (input.property.longitude || '').slice(0, 40),
      amenities: [...input.property.amenities],
      selectedRules: [...input.property.selectedRules],
      rules: input.property.rules.slice(0, 2000),
      // Always require explicit confirmation before submitting after restore.
      termsAccepted: false,
    },
    // Store booleans only — NEVER persist CCCD base64, local identity paths, or sensitive binary files.
    hadLocalMedia: {
      identityFront: Boolean(input.hadLocalMedia.identityFront),
      identityBack: Boolean(input.hadLocalMedia.identityBack),
      photos: Boolean(input.hadLocalMedia.photos),
      ownership: Boolean(input.hadLocalMedia.ownership),
      fireSafety: Boolean(input.hadLocalMedia.fireSafety),
    },
  };
  return JSON.stringify(payload);
}

export function parseOnboardingDraft(
  raw: string,
  defaults: RegistrationValues
): {
  stage: 1 | 2;
  propertyStep: number;
  account: OnboardingAccountDraft;
  property: RegistrationValues;
  hadLocalMedia: OnboardingHadLocalMedia;
  needsMediaReattach: boolean;
  savedAt: string | null;
} {
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (data?.version !== 1 || typeof data.property !== 'object' || !data.property) {
    throw new Error('Bản nháp đăng ký chủ trọ không hợp lệ.');
  }

  const rawAccount =
    typeof data.account === 'object' && data.account
      ? (data.account as Record<string, unknown>)
      : {};
  const account: OnboardingAccountDraft = {
    introduction:
      typeof rawAccount.introduction === 'string'
        ? rawAccount.introduction.slice(0, INTRODUCTION_MAX_LENGTH)
        : '',
    agreementAccepted: rawAccount.agreementAccepted === true,
  };

  const rawProperty = data.property as Record<string, unknown>;
  const property: RegistrationValues = { ...defaults };
  const stringFields: (keyof RegistrationValues)[] = [
    'name',
    'propertyType',
    'description',
    'managerName',
    'contactPhone',
    'zaloPhone',
    'commune',
    'addressDetail',
    'nearby',
    'latitude',
    'longitude',
    'rules',
  ];
  for (const field of stringFields) {
    if (typeof rawProperty[field] === 'string') {
      Object.assign(property, { [field]: (rawProperty[field] as string).slice(0, 2000) });
    }
  }
  if (property.commune && !PROPERTY_AREAS.includes(property.commune)) {
    property.commune = '';
  }
  const rawAmenities = Array.isArray(rawProperty.amenities) ? rawProperty.amenities : [];
  property.amenities = AMENITIES.filter(([key]) => rawAmenities.includes(key)).map(([key]) => key);

  const rawRules = Array.isArray(rawProperty.selectedRules) ? rawProperty.selectedRules : [];
  property.selectedRules = RULES.filter(
    ([key]) => key !== 'quietHours' && rawRules.includes(key)
  ).map(([key]) => key);
  const quiet = rawRules.find(
    (key: unknown) => typeof key === 'string' && /^quietHours(?::.{0,5})?$/.test(key)
  );
  if (typeof quiet === 'string') property.selectedRules.push(quiet);
  property.termsAccepted = false;

  const rawMedia =
    typeof data.hadLocalMedia === 'object' && data.hadLocalMedia
      ? (data.hadLocalMedia as Record<string, unknown>)
      : {};
  const hadLocalMedia: OnboardingHadLocalMedia = {
    identityFront: rawMedia.identityFront === true,
    identityBack: rawMedia.identityBack === true,
    photos: rawMedia.photos === true,
    ownership: rawMedia.ownership === true,
    fireSafety: rawMedia.fireSafety === true,
  };

  const needsMediaReattach = Object.values(hadLocalMedia).some(Boolean);
  const stage: 1 | 2 = data.stage === 2 ? 2 : 1;
  const propertyStep =
    typeof data.propertyStep === 'number' && Number.isInteger(data.propertyStep)
      ? Math.max(0, Math.min(5, data.propertyStep))
      : 0;

  return {
    stage,
    propertyStep,
    account,
    property,
    hadLocalMedia,
    needsMediaReattach,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : null,
  };
}

export function onboardingStatusMeta(
  registration: OnboardingRegistrationView,
  userRole?: string
): OnboardingStatusPresentation {
  const status = (registration.status || 'PENDING').toUpperCase();
  const dossierCode = `#HS-${registration.registrationId}`;

  if (status === 'APPROVED') {
    const isHostNow = userRole === 'ROOM_HOST';
    return {
      tone: 'approved',
      badge: 'Đã phê duyệt',
      title: 'Hồ sơ đối tác đã được phê duyệt',
      description: isHostNow
        ? 'Tài khoản của bạn đã nâng cấp thành Chủ nhà trọ và nhà trọ đầu tiên đã được kích hoạt.'
        : 'Hồ sơ đã được nhân viên phê duyệt. Chạm "Cập nhật trạng thái" để kích hoạt vai trò Chủ nhà trọ.',
      dossierCode,
      roleStatusLabel: isHostNow ? 'Đã nâng cấp Chủ nhà trọ' : 'Chờ đồng bộ phiên đăng nhập',
      propertyStatusLabel: 'Nhà trọ đã xác minh',
      canSupplement: false,
      canOpenHostPortal: isHostNow,
      timeline: [
        {
          key: 'account',
          title: 'Tiếp nhận tài khoản & CCCD',
          subtitle: 'Thông tin cá nhân và ảnh CCCD 2 mặt đã xác thực',
          state: 'done',
        },
        {
          key: 'property',
          title: 'Tiếp nhận nhà trọ đầu tiên',
          subtitle: registration.propertyName || 'Hồ sơ nhà trọ đã tiếp nhận',
          state: 'done',
        },
        {
          key: 'review',
          title: 'Staff thẩm định',
          subtitle: 'Nhân viên HL_RCS đã phê duyệt hồ sơ kết hợp',
          state: 'done',
        },
        {
          key: 'complete',
          title: 'Hoàn tất đối tác',
          subtitle: 'Sẵn sàng thiết lập phòng và nhận lịch xem phòng',
          state: 'done',
        },
      ],
    };
  }

  if (status === 'NEEDS_SUPPLEMENT') {
    return {
      tone: 'warning',
      badge: 'Cần bổ sung',
      title: 'Hồ sơ cần bổ sung thông tin',
      description:
        'Nhân viên thẩm định yêu cầu cập nhật một số mục. Bạn có thể bổ sung trực tiếp mà không cần đăng ký lại từ đầu.',
      dossierCode,
      roleStatusLabel: 'Chưa nâng cấp (đang giữ vai trò Người thuê)',
      propertyStatusLabel: 'Chờ bổ sung hồ sơ xác minh',
      canSupplement: true,
      canOpenHostPortal: false,
      timeline: [
        {
          key: 'account',
          title: 'Tiếp nhận tài khoản & CCCD',
          subtitle: 'Đã lưu hồ sơ tài khoản và giấy tờ định danh',
          state: 'done',
        },
        {
          key: 'property',
          title: 'Tiếp nhận nhà trọ đầu tiên',
          subtitle: registration.propertyName || 'Đã tiếp nhận thông tin nhà trọ',
          state: 'done',
        },
        {
          key: 'review',
          title: 'Staff thẩm định',
          subtitle: 'Cần bổ sung theo phản hồi bên dưới',
          state: 'warning',
        },
        {
          key: 'complete',
          title: 'Hoàn tất đối tác',
          subtitle: 'Kích hoạt sau khi nhân viên duyệt hồ sơ bổ sung',
          state: 'upcoming',
        },
      ],
    };
  }

  if (status === 'REJECTED') {
    return {
      tone: 'rejected',
      badge: 'Bị từ chối',
      title: 'Hồ sơ chưa đạt thẩm định',
      description:
        'Xem lý do từ chối từ nhân viên bên dưới. Bạn có thể chỉnh sửa và gửi lại hồ sơ kết hợp.',
      dossierCode,
      roleStatusLabel: 'Chưa nâng cấp (đang giữ vai trò Người thuê)',
      propertyStatusLabel: 'Chưa được phê duyệt',
      canSupplement: true,
      canOpenHostPortal: false,
      timeline: [
        {
          key: 'account',
          title: 'Tiếp nhận tài khoản & CCCD',
          subtitle: 'Đã tiếp nhận thông tin tài khoản',
          state: 'done',
        },
        {
          key: 'property',
          title: 'Tiếp nhận nhà trọ đầu tiên',
          subtitle: registration.propertyName || 'Đã tiếp nhận thông tin nhà trọ',
          state: 'done',
        },
        {
          key: 'review',
          title: 'Staff thẩm định',
          subtitle: 'Hồ sơ chưa đạt yêu cầu — cần chỉnh sửa và gửi lại',
          state: 'error',
        },
        {
          key: 'complete',
          title: 'Hoàn tất đối tác',
          subtitle: 'Chưa kích hoạt',
          state: 'upcoming',
        },
      ],
    };
  }

  return {
    tone: 'pending',
    badge: 'Đang thẩm định',
    title: 'Hồ sơ đã gửi thành công',
    description:
      'Hồ sơ tài khoản & nhà trọ đầu tiên đang chờ nhân viên HL_RCS thẩm định. Vai trò chủ trọ và tin đăng chỉ kích hoạt sau khi được duyệt.',
    dossierCode,
    roleStatusLabel: 'Chờ phê duyệt (vẫn là Người thuê)',
    propertyStatusLabel: 'Đang chờ thẩm định (chưa công khai)',
    canSupplement: false,
    canOpenHostPortal: false,
    timeline: [
      {
        key: 'account',
        title: 'Tiếp nhận tài khoản & CCCD',
        subtitle: 'Đã tiếp nhận thông tin tài khoản và ảnh CCCD 2 mặt',
        state: 'done',
      },
      {
        key: 'property',
        title: 'Tiếp nhận nhà trọ đầu tiên',
        subtitle: registration.propertyName || 'Đã tiếp nhận thông tin và chứng từ nhà trọ',
        state: 'done',
      },
      {
        key: 'review',
        title: 'Staff thẩm định',
        subtitle: 'Nhân viên HL_RCS đang kiểm tra và đối chiếu hồ sơ',
        state: 'active',
      },
      {
        key: 'complete',
        title: 'Hoàn tất đối tác',
        subtitle: 'Tự động nâng cấp vai trò chủ trọ khi được duyệt',
        state: 'upcoming',
      },
    ],
  };
}

const SAFE_REDIRECT_ROUTES = new Set([
  '/become-host',
  '/home',
  '/explore',
  '/favorites',
  '/account',
  '/messages',
]);

export function resolveSafeRedirect(raw?: string | string[] | null): string {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate || typeof candidate !== 'string') return '/home';
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return '/home';
  }
  return SAFE_REDIRECT_ROUTES.has(trimmed) ? trimmed : '/home';
}

export function formatOnboardingDate(iso?: string | null): string {
  if (!iso) return 'Chưa cập nhật';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fieldLabelVi(field: string): string {
  return ONBOARDING_FIELD_LABELS[field] || field;
}
