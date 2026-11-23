import type { HostAttachment, HostProperty } from './host';
import {
  AMENITIES,
  PROPERTY_AREAS,
  RULES,
  quietHours,
  registrationAssetError,
  ruleLabel,
  validateRegistration,
  type RegistrationAsset,
  type RegistrationErrors,
  type RegistrationFiles,
  type RegistrationValues,
} from './property-registration';

export type PropertyChangeSectionId =
  | 'basic'
  | 'location'
  | 'amenities'
  | 'photos'
  | 'documents';

export type PropertyChangeSectionStatus =
  | 'unchanged'
  | 'changed'
  | 'incomplete'
  | 'needs_supplement';

export type ChangeDocumentKey = 'ownership' | 'idCard' | 'fireSafety';

export const CHANGE_DOCUMENTS: readonly (readonly [ChangeDocumentKey, string, string])[] = [
  ['ownership', 'OWNERSHIP', 'Giấy phép kinh doanh / Quyền quản lý'],
  ['idCard', 'ID_CARD', 'Căn cước / CCCD chủ trọ'],
  ['fireSafety', 'FIRE_SAFETY', 'Chứng nhận an toàn PCCC'],
] as const;

export const CHANGE_SECTION_META: Record<
  PropertyChangeSectionId,
  { title: string; icon: 'file-text' | 'map-pin' | 'sliders' | 'image' | 'shield' }
> = {
  basic: { title: 'Thông tin cơ bản', icon: 'file-text' },
  location: { title: 'Vị trí nhà trọ', icon: 'map-pin' },
  amenities: { title: 'Tiện ích & Quy định', icon: 'sliders' },
  photos: { title: 'Hình ảnh nhà trọ', icon: 'image' },
  documents: { title: 'Hồ sơ xác minh', icon: 'shield' },
};

export const CHANGE_FIELD_LABELS: Record<string, string> = {
  name: 'Tên nhà trọ',
  propertyType: 'Loại hình nhà trọ',
  description: 'Mô tả nhà trọ',
  managerName: 'Người quản lý / đón khách',
  contactPhone: 'Hotline liên hệ',
  zaloPhone: 'Zalo liên hệ',
  addressDetail: 'Địa chỉ chi tiết',
  commune: 'Khu vực',
  nearby: 'Địa điểm gần nhà trọ',
  latitude: 'Vĩ độ bản đồ',
  longitude: 'Kinh độ bản đồ',
  location: 'Ghim vị trí bản đồ',
  coordinates: 'Tọa độ bản đồ',
  address: 'Địa chỉ chi tiết',
  contact: 'Thông tin liên hệ',
  amenities: 'Tiện ích chung',
  selectedRules: 'Quy định nhà trọ',
  rules: 'Nội quy bổ sung',
  photos: 'Hình ảnh nhà trọ',
  OWNERSHIP: 'Giấy phép kinh doanh',
  ID_CARD: 'CCCD chủ trọ',
  ID_CARD_BACK: 'CCCD chủ trọ (mặt sau)',
  FIRE_SAFETY: 'Chứng nhận PCCC',
  ownership: 'Giấy phép kinh doanh',
  idCard: 'CCCD chủ trọ',
  fireSafety: 'Chứng nhận PCCC',
};

export interface PropertyEditAttachment {
  documentId: number;
  type?: string;
  documentType?: string;
  fileName?: string;
  verificationStatus?: string | null;
}

export interface PropertyEditSnapshot {
  registrationId: number;
  propertyId: number | null;
  mode: 'CHANGE_REQUEST' | 'RESUBMIT' | string;
  status: string;
  reasonNote: string | null;
  requestedFields: string[];
  fieldNotes: Record<string, string>;
  editableFields: string[];
  legacyScope: boolean;
  details: RegistrationValues;
  photos: PropertyEditAttachment[];
  documents: PropertyEditAttachment[];
  versionToken: string;
  reverificationRequired: boolean;
  reverificationReasons: string[];
}

export interface PropertyChangeReplacementDocs {
  ownership?: RegistrationAsset | null;
  idCard?: RegistrationAsset | null;
  fireSafety?: RegistrationAsset | null;
}

export interface PropertyChangeEntryState {
  visible: boolean;
  mode: 'create' | 'draft' | 'status' | 'supplement' | 'resubmit_initial';
  registrationId: number | null;
  propertyId: number | null;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  tone: 'default' | 'pending' | 'warning' | 'error';
}

export interface FieldDiffItem {
  key: string;
  section: PropertyChangeSectionId;
  label: string;
  currentValue: string;
  proposedValue: string;
}

export interface DocumentDiffItem {
  key: ChangeDocumentKey;
  type: string;
  label: string;
  previousFileName: string;
  newFileName: string;
}

export interface PropertyChangeDiff {
  fieldDiffs: FieldDiffItem[];
  locationChanged: boolean;
  previousCoords: string | null;
  proposedCoords: string | null;
  addedAmenities: string[];
  removedAmenities: string[];
  addedRules: string[];
  removedRules: string[];
  customRulesChanged: boolean;
  photosChanged: boolean;
  keptPhotoCount: number;
  addedPhotoCount: number;
  removedPhotoCount: number;
  totalPhotoCount: number;
  replacedDocuments: DocumentDiffItem[];
  changedSections: PropertyChangeSectionId[];
  reverificationReasons: string[];
  hasAnyChange: boolean;
}

export interface SectionOverviewCard {
  id: PropertyChangeSectionId;
  title: string;
  icon: 'file-text' | 'map-pin' | 'sliders' | 'image' | 'shield';
  summary: string;
  status: PropertyChangeSectionStatus;
  statusLabel: string;
  editable: boolean;
  changeCount: number;
  errorCount: number;
  supplementNote?: string;
}

export interface PropertyChangeDraftRecord {
  version: 1;
  savedAt: string;
  versionToken: string;
  fields: Omit<RegistrationValues, 'termsAccepted'>;
  retainedPhotoIds: number[];
  changeReason: string;
  hadLocalFiles: {
    photos: boolean;
    ownership: boolean;
    idCard: boolean;
    fireSafety: boolean;
  };
}

export function attachmentType(item: PropertyEditAttachment | HostAttachment): string {
  return ('documentType' in item && item.documentType) || item.type || '';
}

export function resolvePropertyChangeEntry(
  record: HostProperty,
  hasLocalDraft: boolean
): PropertyChangeEntryState {
  const cr = record.changeRequest;
  const isInitialPending = !record.propertyId && record.displayStatus === 'PENDING';
  const isInitialNeedsFix =
    !record.propertyId && ['NEEDS_SUPPLEMENT', 'REJECTED'].includes(record.displayStatus);

  if (cr) {
    const crStatus = (cr.status || '').toUpperCase();
    if (crStatus === 'PENDING') {
      return {
        visible: true,
        mode: 'status',
        registrationId: cr.registrationId,
        propertyId: record.propertyId,
        badge: 'Đang chờ xét duyệt',
        title: 'Đề nghị thay đổi đang xử lý',
        subtitle:
          'Thông tin nhà trọ công khai vẫn giữ nguyên cho đến khi nhân viên NestHub phê duyệt.',
        ctaLabel: 'Theo dõi yêu cầu',
        tone: 'pending',
      };
    }
    if (crStatus === 'NEEDS_SUPPLEMENT' || crStatus === 'REJECTED') {
      return {
        visible: true,
        mode: 'supplement',
        registrationId: cr.registrationId,
        propertyId: record.propertyId,
        badge: crStatus === 'REJECTED' ? 'Đã từ chối' : 'Cần bổ sung',
        title:
          crStatus === 'REJECTED'
            ? 'Đề nghị thay đổi chưa được duyệt'
            : 'Đề nghị thay đổi cần bổ sung',
        subtitle:
          cr.reasonNote?.trim() ||
          'Xem phản hồi từ nhân viên thẩm định và cập nhật mục còn thiếu.',
        ctaLabel: crStatus === 'REJECTED' ? 'Xem & gửi lại' : 'Bổ sung hồ sơ',
        tone: crStatus === 'REJECTED' ? 'error' : 'warning',
      };
    }
  }

  if (isInitialPending && record.registrationId) {
    return {
      visible: true,
      mode: 'status',
      registrationId: record.registrationId,
      propertyId: null,
      badge: 'Đang xét duyệt',
      title: 'Hồ sơ nhà trọ đang chờ duyệt',
      subtitle: 'Nhân viên NestHub đang thẩm định hồ sơ đăng ký nhà trọ này.',
      ctaLabel: 'Theo dõi hồ sơ',
      tone: 'pending',
    };
  }

  if (isInitialNeedsFix && record.registrationId) {
    return {
      visible: true,
      mode: 'resubmit_initial',
      registrationId: record.registrationId,
      propertyId: null,
      badge: record.displayStatus === 'REJECTED' ? 'Đã từ chối' : 'Cần bổ sung',
      title: 'Hồ sơ nhà trọ cần cập nhật',
      subtitle:
        record.reasonNote?.trim() ||
        'Cập nhật thông tin theo yêu cầu của nhân viên và gửi lại xét duyệt.',
      ctaLabel: 'Chỉnh sửa & gửi lại',
      tone: record.displayStatus === 'REJECTED' ? 'error' : 'warning',
    };
  }

  if (record.propertyId && record.registrationId) {
    if (record.reverificationRequired) {
      return {
        visible: true,
        mode: 'status',
        registrationId: record.registrationId,
        propertyId: record.propertyId,
        badge: 'Chờ tái xác minh',
        title: 'Nhà trọ đang chờ tái xác minh',
        subtitle:
          'Vui lòng theo dõi trạng thái hồ sơ tái xác minh trước khi tạo yêu cầu mới.',
        ctaLabel: 'Xem trạng thái',
        tone: 'warning',
      };
    }

    if (hasLocalDraft) {
      return {
        visible: true,
        mode: 'draft',
        registrationId: record.registrationId,
        propertyId: record.propertyId,
        badge: 'Bản nháp',
        title: 'Tiếp tục đề nghị thay đổi thông tin',
        subtitle:
          'Bạn có bản nháp thay đổi chưa gửi. Dữ liệu đang công khai chưa bị ảnh hưởng.',
        ctaLabel: 'Tiếp tục bản nháp',
        tone: 'default',
      };
    }

    return {
      visible: true,
      mode: 'create',
      registrationId: record.registrationId,
      propertyId: record.propertyId,
      badge: 'Cập nhật qua xét duyệt',
      title: 'Đề nghị thay đổi thông tin',
      subtitle:
        'Sửa thông tin, vị trí, tiện ích, hình ảnh hoặc giấy tờ và gửi nhân viên xét duyệt.',
      ctaLabel: 'Đề nghị thay đổi thông tin',
      tone: 'default',
    };
  }

  return {
    visible: false,
    mode: 'create',
    registrationId: null,
    propertyId: record.propertyId,
    badge: '',
    title: '',
    subtitle: '',
    ctaLabel: '',
    tone: 'default',
  };
}

export function snapshotToFormValues(snapshot: PropertyEditSnapshot): RegistrationValues {
  const d = snapshot.details || ({} as RegistrationValues);
  return {
    name: typeof d.name === 'string' ? d.name : '',
    propertyType: typeof d.propertyType === 'string' ? d.propertyType : '',
    description: typeof d.description === 'string' ? d.description : '',
    managerName: typeof d.managerName === 'string' ? d.managerName : '',
    contactPhone: typeof d.contactPhone === 'string' ? d.contactPhone : '',
    zaloPhone: typeof d.zaloPhone === 'string' ? d.zaloPhone : '',
    commune: typeof d.commune === 'string' ? d.commune : '',
    addressDetail: typeof d.addressDetail === 'string' ? d.addressDetail : '',
    nearby: typeof d.nearby === 'string' ? d.nearby : '',
    latitude: d.latitude != null ? String(d.latitude) : '',
    longitude: d.longitude != null ? String(d.longitude) : '',
    // Keep all stored IDs untouched so we never delete saved amenities/rules if catalog differs.
    amenities: Array.isArray(d.amenities) ? [...d.amenities] : [],
    selectedRules: Array.isArray(d.selectedRules) ? [...d.selectedRules] : [],
    rules: typeof d.rules === 'string' ? d.rules : '',
    termsAccepted: false,
  };
}

function normStr(val?: string | null): string {
  return (val ?? '').trim();
}

function formatCoordPair(lat?: string | null, lng?: string | null): string | null {
  const a = normStr(lat);
  const b = normStr(lng);
  if (!a || !b) return null;
  const nLat = Number(a);
  const nLng = Number(b);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return `${a}, ${b}`;
  return `${nLat.toFixed(5)}, ${nLng.toFixed(5)}`;
}

export function amenityLabelVi(key: string): string {
  return AMENITIES.find(([id]) => id === key)?.[1] || key;
}

export function computePropertyChangeDiff(input: {
  baseline: RegistrationValues;
  draft: RegistrationValues;
  originalPhotos: readonly PropertyEditAttachment[];
  retainedPhotoIds: readonly number[];
  newPhotos: readonly RegistrationAsset[];
  existingDocuments: readonly PropertyEditAttachment[];
  replacementDocuments: PropertyChangeReplacementDocs;
}): PropertyChangeDiff {
  const {
    baseline,
    draft,
    originalPhotos,
    retainedPhotoIds,
    newPhotos,
    existingDocuments,
    replacementDocuments,
  } = input;

  const fieldDiffs: FieldDiffItem[] = [];
  const textChecks: readonly (readonly [keyof RegistrationValues, PropertyChangeSectionId])[] = [
    ['name', 'basic'],
    ['propertyType', 'basic'],
    ['description', 'basic'],
    ['managerName', 'basic'],
    ['contactPhone', 'basic'],
    ['zaloPhone', 'basic'],
    ['addressDetail', 'location'],
    ['commune', 'location'],
    ['nearby', 'location'],
  ];

  for (const [key, section] of textChecks) {
    const prev = normStr(String(baseline[key] ?? ''));
    const next = normStr(String(draft[key] ?? ''));
    if (prev !== next) {
      fieldDiffs.push({
        key,
        section,
        label: CHANGE_FIELD_LABELS[key] || key,
        currentValue: prev || 'Chưa cập nhật',
        proposedValue: next || 'Để trống',
      });
    }
  }

  const previousCoords = formatCoordPair(baseline.latitude, baseline.longitude);
  const proposedCoords = formatCoordPair(draft.latitude, draft.longitude);
  const locationChanged =
    normStr(baseline.latitude) !== normStr(draft.latitude) ||
    normStr(baseline.longitude) !== normStr(draft.longitude);

  const prevAmenitySet = new Set(baseline.amenities);
  const nextAmenitySet = new Set(draft.amenities);
  const addedAmenities = draft.amenities.filter(id => !prevAmenitySet.has(id));
  const removedAmenities = baseline.amenities.filter(id => !nextAmenitySet.has(id));

  const prevRuleSet = new Set(baseline.selectedRules);
  const nextRuleSet = new Set(draft.selectedRules);
  const addedRules = draft.selectedRules.filter(id => !prevRuleSet.has(id));
  const removedRules = baseline.selectedRules.filter(id => !nextRuleSet.has(id));
  const customRulesChanged = normStr(baseline.rules) !== normStr(draft.rules);

  const keptPhotoCount = originalPhotos.filter(photo =>
    retainedPhotoIds.includes(photo.documentId)
  ).length;
  const removedPhotoCount = Math.max(0, originalPhotos.length - keptPhotoCount);
  const addedPhotoCount = newPhotos.length;
  const totalPhotoCount = keptPhotoCount + addedPhotoCount;
  const photosChanged = removedPhotoCount > 0 || addedPhotoCount > 0;

  const replacedDocuments: DocumentDiffItem[] = [];
  for (const [key, type, label] of CHANGE_DOCUMENTS) {
    const replacement = replacementDocuments[key];
    if (replacement) {
      const existing = existingDocuments.find(doc => attachmentType(doc) === type);
      replacedDocuments.push({
        key,
        type,
        label,
        previousFileName: existing?.fileName || 'Chưa đính kèm',
        newFileName: replacement.fileName || 'Tệp mới đã chọn',
      });
    }
  }

  const changedSections: PropertyChangeSectionId[] = [];
  if (fieldDiffs.some(item => item.section === 'basic')) changedSections.push('basic');
  if (fieldDiffs.some(item => item.section === 'location') || locationChanged) {
    changedSections.push('location');
  }
  if (
    addedAmenities.length > 0 ||
    removedAmenities.length > 0 ||
    addedRules.length > 0 ||
    removedRules.length > 0 ||
    customRulesChanged
  ) {
    changedSections.push('amenities');
  }
  if (photosChanged) changedSections.push('photos');
  if (replacedDocuments.length > 0) changedSections.push('documents');

  // Reverification triggers matching backend PropertyReverification.changes
  const reverificationReasons: string[] = [];
  if (
    normStr(baseline.addressDetail) !== normStr(draft.addressDetail) ||
    normStr(baseline.commune) !== normStr(draft.commune)
  ) {
    reverificationReasons.push('Thay đổi địa chỉ hoặc khu vực nhà trọ');
  }
  if (locationChanged) {
    reverificationReasons.push('Thay đổi vị trí ghim trên bản đồ');
  }
  if (normStr(baseline.managerName) !== normStr(draft.managerName)) {
    reverificationReasons.push('Thay đổi người quản lý / đón khách');
  }
  if (replacedDocuments.some(d => d.type === 'OWNERSHIP')) {
    reverificationReasons.push('Thay đổi giấy phép kinh doanh / quyền quản lý');
  }
  if (replacedDocuments.some(d => d.type === 'ID_CARD')) {
    reverificationReasons.push('Thay đổi giấy tờ định danh chủ trọ (CCCD)');
  }

  return {
    fieldDiffs,
    locationChanged,
    previousCoords,
    proposedCoords,
    addedAmenities,
    removedAmenities,
    addedRules,
    removedRules,
    customRulesChanged,
    photosChanged,
    keptPhotoCount,
    addedPhotoCount,
    removedPhotoCount,
    totalPhotoCount,
    replacedDocuments,
    changedSections,
    reverificationReasons,
    hasAnyChange: changedSections.length > 0,
  };
}

const SECTION_FIELDS: Record<PropertyChangeSectionId, readonly string[]> = {
  basic: ['name', 'propertyType', 'description', 'managerName', 'contactPhone', 'zaloPhone', 'contact'],
  location: ['addressDetail', 'address', 'commune', 'nearby', 'latitude', 'longitude', 'location', 'coordinates'],
  amenities: ['amenities', 'selectedRules', 'rules'],
  photos: ['photos'],
  documents: ['OWNERSHIP', 'ID_CARD', 'ID_CARD_BACK', 'FIRE_SAFETY', 'ownership', 'idCard', 'fireSafety'],
};

export function isSectionEditable(
  snapshot: PropertyEditSnapshot,
  section: PropertyChangeSectionId
): boolean {
  if (snapshot.legacyScope || snapshot.editableFields.length === 0) return true;
  const allowed = new Set(snapshot.editableFields);
  return SECTION_FIELDS[section].some(field => allowed.has(field));
}

export function isFieldEditable(snapshot: PropertyEditSnapshot, field: string): boolean {
  if (snapshot.legacyScope || snapshot.editableFields.length === 0) return true;
  return snapshot.editableFields.includes(field);
}

export function sectionSupplementNote(
  snapshot: PropertyEditSnapshot,
  section: PropertyChangeSectionId
): string | undefined {
  if (snapshot.status !== 'NEEDS_SUPPLEMENT') return undefined;
  const notes: string[] = [];
  for (const field of SECTION_FIELDS[section]) {
    if (snapshot.fieldNotes?.[field]) {
      notes.push(snapshot.fieldNotes[field]);
    }
  }
  if (notes.length > 0) return notes[0];
  const requestedSet = new Set(snapshot.requestedFields || []);
  if (SECTION_FIELDS[section].some(field => requestedSet.has(field))) {
    return 'Nhân viên yêu cầu kiểm tra và bổ sung mục này.';
  }
  return undefined;
}

export function validatePropertyChangeSection(input: {
  section: PropertyChangeSectionId;
  draft: RegistrationValues;
  retainedPhotoIds: readonly number[];
  newPhotos: readonly RegistrationAsset[];
  existingDocuments: readonly PropertyEditAttachment[];
  replacementDocuments: PropertyChangeReplacementDocs;
}): RegistrationErrors {
  const { section, draft, retainedPhotoIds, newPhotos, existingDocuments, replacementDocuments } =
    input;
  const dummyFiles: RegistrationFiles = {
    photos: [],
    ownership: null,
    idCard: null,
    fireSafety: null,
  };

  if (section === 'basic') return validateRegistration(draft, dummyFiles, 0, true);
  if (section === 'location') return validateRegistration(draft, dummyFiles, 1, true);
  if (section === 'amenities') return validateRegistration(draft, dummyFiles, 2, true);

  if (section === 'photos') {
    const errors: RegistrationErrors = {};
    const total = retainedPhotoIds.length + newPhotos.length;
    if (total < 1 || total > 10) {
      errors.photos = 'Cần từ 1 đến 10 ảnh nhà trọ.';
      return errors;
    }
    for (const photo of newPhotos) {
      const err = registrationAssetError(photo, false);
      if (err) {
        errors.photos = err;
        break;
      }
    }
    return errors;
  }

  // documents
  const errors: RegistrationErrors = {};
  for (const [key, type, label] of CHANGE_DOCUMENTS) {
    const replacement = replacementDocuments[key];
    if (replacement) {
      const err = registrationAssetError(replacement, true);
      if (err) errors[key] = err;
    } else if (
      (type === 'OWNERSHIP' || type === 'ID_CARD') &&
      !existingDocuments.some(doc => attachmentType(doc) === type)
    ) {
      errors[key] = `Cần đính kèm ${label.toLocaleLowerCase('vi')}.`;
    }
  }
  return errors;
}

export function validatePropertyChangeSubmission(input: {
  snapshot: PropertyEditSnapshot;
  baseline: RegistrationValues;
  draft: RegistrationValues;
  originalPhotos: readonly PropertyEditAttachment[];
  retainedPhotoIds: readonly number[];
  newPhotos: readonly RegistrationAsset[];
  existingDocuments: readonly PropertyEditAttachment[];
  replacementDocuments: PropertyChangeReplacementDocs;
}): {
  valid: boolean;
  noChangeError: string | null;
  errors: RegistrationErrors;
  firstErrorSection: PropertyChangeSectionId | null;
} {
  const diff = computePropertyChangeDiff(input);
  const errors: RegistrationErrors = {};
  let firstErrorSection: PropertyChangeSectionId | null = null;

  const sections: readonly PropertyChangeSectionId[] = [
    'basic',
    'location',
    'amenities',
    'photos',
    'documents',
  ];

  for (const section of sections) {
    const sectionErr = validatePropertyChangeSection({
      section,
      draft: input.draft,
      retainedPhotoIds: input.retainedPhotoIds,
      newPhotos: input.newPhotos,
      existingDocuments: input.existingDocuments,
      replacementDocuments: input.replacementDocuments,
    });
    if (Object.keys(sectionErr).length > 0) {
      Object.assign(errors, sectionErr);
      if (!firstErrorSection) firstErrorSection = section;
    }
  }

  if (!input.draft.termsAccepted) {
    errors.termsAccepted = 'Vui lòng xác nhận các thông tin đề nghị thay đổi là chính xác.';
  }

  const noChangeError = !diff.hasAnyChange
    ? 'Bạn chưa thay đổi thông tin, hình ảnh hoặc tài liệu nào để gửi xét duyệt.'
    : null;

  return {
    valid: !noChangeError && Object.keys(errors).length === 0,
    noChangeError,
    errors,
    firstErrorSection,
  };
}

export function evaluateChangeSections(input: {
  snapshot: PropertyEditSnapshot;
  baseline: RegistrationValues;
  draft: RegistrationValues;
  originalPhotos: readonly PropertyEditAttachment[];
  retainedPhotoIds: readonly number[];
  newPhotos: readonly RegistrationAsset[];
  existingDocuments: readonly PropertyEditAttachment[];
  replacementDocuments: PropertyChangeReplacementDocs;
}): SectionOverviewCard[] {
  const diff = computePropertyChangeDiff(input);
  const sections: readonly PropertyChangeSectionId[] = [
    'basic',
    'location',
    'amenities',
    'photos',
    'documents',
  ];

  return sections.map(id => {
    const editable = isSectionEditable(input.snapshot, id);
    const supplementNote = sectionSupplementNote(input.snapshot, id);
    const errors = validatePropertyChangeSection({
      section: id,
      draft: input.draft,
      retainedPhotoIds: input.retainedPhotoIds,
      newPhotos: input.newPhotos,
      existingDocuments: input.existingDocuments,
      replacementDocuments: input.replacementDocuments,
    });
    const errorCount = Object.keys(errors).length;
    const isChanged = diff.changedSections.includes(id);

    let changeCount = 0;
    let summary = '';
    if (id === 'basic') {
      changeCount = diff.fieldDiffs.filter(item => item.section === 'basic').length;
      summary = `${input.draft.name || 'Chưa có tên'} · ${input.draft.contactPhone || 'Chưa có hotline'}`;
    } else if (id === 'location') {
      changeCount =
        diff.fieldDiffs.filter(item => item.section === 'location').length +
        (diff.locationChanged ? 1 : 0);
      summary = [input.draft.commune, input.draft.addressDetail].filter(Boolean).join(' · ') || 'Chưa có địa chỉ';
    } else if (id === 'amenities') {
      changeCount =
        diff.addedAmenities.length +
        diff.removedAmenities.length +
        diff.addedRules.length +
        diff.removedRules.length +
        (diff.customRulesChanged ? 1 : 0);
      summary = `${input.draft.amenities.length} tiện ích · ${input.draft.selectedRules.length} quy định`;
    } else if (id === 'photos') {
      changeCount = diff.addedPhotoCount + diff.removedPhotoCount;
      summary = `${diff.totalPhotoCount}/10 ảnh${diff.addedPhotoCount ? ` (+${diff.addedPhotoCount})` : ''}${diff.removedPhotoCount ? ` (-${diff.removedPhotoCount})` : ''}`;
    } else {
      changeCount = diff.replacedDocuments.length;
      summary =
        diff.replacedDocuments.length > 0
          ? `Đề nghị thay ${diff.replacedDocuments.length} tài liệu`
          : `${input.existingDocuments.length} tài liệu đang lưu bảo mật`;
    }

    let status: PropertyChangeSectionStatus = 'unchanged';
    let statusLabel = 'Chưa thay đổi';
    if (errorCount > 0) {
      status = 'incomplete';
      statusLabel = 'Thiếu thông tin';
    } else if (supplementNote && !isChanged) {
      status = 'needs_supplement';
      statusLabel = 'Cần bổ sung';
    } else if (isChanged) {
      status = 'changed';
      statusLabel = 'Có thay đổi';
    }

    return {
      id,
      title: CHANGE_SECTION_META[id].title,
      icon: CHANGE_SECTION_META[id].icon,
      summary,
      status,
      statusLabel,
      editable,
      changeCount,
      errorCount,
      supplementNote,
    };
  });
}

export function serializePropertyChangeDraft(input: {
  versionToken: string;
  draft: RegistrationValues;
  retainedPhotoIds: readonly number[];
  changeReason: string;
  newPhotos: readonly RegistrationAsset[];
  replacementDocuments: PropertyChangeReplacementDocs;
}): string {
  const { termsAccepted: _ignoreTerms, ...fields } = input.draft;
  void _ignoreTerms;
  const record: PropertyChangeDraftRecord = {
    version: 1,
    savedAt: new Date().toISOString(),
    versionToken: input.versionToken,
    fields: {
      ...fields,
      amenities: [...fields.amenities],
      selectedRules: [...fields.selectedRules],
    },
    retainedPhotoIds: [...input.retainedPhotoIds],
    changeReason: input.changeReason.slice(0, 1000),
    // Store booleans only — NEVER persist temporary local file URIs or private document paths.
    hadLocalFiles: {
      photos: input.newPhotos.length > 0,
      ownership: Boolean(input.replacementDocuments.ownership),
      idCard: Boolean(input.replacementDocuments.idCard),
      fireSafety: Boolean(input.replacementDocuments.fireSafety),
    },
  };
  return JSON.stringify(record);
}

export function parsePropertyChangeDraft(
  raw: string,
  snapshot: PropertyEditSnapshot
): {
  values: RegistrationValues;
  retainedPhotoIds: number[];
  changeReason: string;
  versionMismatch: boolean;
  needsFileReattach: boolean;
  savedAt: string | null;
} {
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (data?.version !== 1 || typeof data.fields !== 'object' || !data.fields) {
    throw new Error('Bản nháp đề nghị thay đổi không hợp lệ.');
  }

  const base = snapshotToFormValues(snapshot);
  const versionMismatch =
    typeof data.versionToken === 'string' && data.versionToken !== snapshot.versionToken;

  const rawFields = data.fields as Record<string, unknown>;
  const values: RegistrationValues = { ...base };
  const stringKeys: (keyof RegistrationValues)[] = [
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
  for (const key of stringKeys) {
    if (isFieldEditable(snapshot, key) && typeof rawFields[key] === 'string') {
      Object.assign(values, { [key]: (rawFields[key] as string).slice(0, 2000) });
    }
  }
  if (values.commune && !PROPERTY_AREAS.includes(values.commune) && base.commune) {
    values.commune = base.commune;
  }

  if (isFieldEditable(snapshot, 'amenities') && Array.isArray(rawFields.amenities)) {
    values.amenities = rawFields.amenities.filter((x): x is string => typeof x === 'string');
  }
  if (isFieldEditable(snapshot, 'selectedRules') && Array.isArray(rawFields.selectedRules)) {
    values.selectedRules = rawFields.selectedRules.filter(
      (x): x is string =>
        typeof x === 'string' && (quietHours.test(x) || RULES.some(([id]) => id === x))
    );
  }
  values.termsAccepted = false;

  const validOriginalIds = new Set(snapshot.photos.map(item => item.documentId));
  const rawRetained = Array.isArray(data.retainedPhotoIds)
    ? data.retainedPhotoIds.filter(
        (id): id is number => typeof id === 'number' && validOriginalIds.has(id)
      )
    : snapshot.photos.map(item => item.documentId);

  const retainedPhotoIds = isFieldEditable(snapshot, 'photos')
    ? rawRetained
    : snapshot.photos.map(item => item.documentId);

  const rawHad =
    typeof data.hadLocalFiles === 'object' && data.hadLocalFiles
      ? (data.hadLocalFiles as Record<string, unknown>)
      : {};
  const needsFileReattach =
    rawHad.photos === true ||
    rawHad.ownership === true ||
    rawHad.idCard === true ||
    rawHad.fireSafety === true;

  return {
    values,
    retainedPhotoIds,
    changeReason: typeof data.changeReason === 'string' ? data.changeReason.slice(0, 1000) : '',
    versionMismatch,
    needsFileReattach,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : null,
  };
}

export function propertyChangeRuleLabel(key: string): string {
  return ruleLabel(key);
}

export function propertyChangeStatusMeta(input: {
  status: string;
  reverificationRequired?: boolean;
}) {
  const status = (input.status || 'PENDING').toUpperCase();
  if (status === 'APPROVED') {
    return {
      tone: 'approved' as const,
      badge: 'Đã phê duyệt',
      title: 'Đề nghị thay đổi đã được phê duyệt',
      description: 'Thông tin nhà trọ mới đã được áp dụng lên hệ thống NestHub.',
      canEdit: false,
    };
  }
  if (status === 'NEEDS_SUPPLEMENT') {
    return {
      tone: 'warning' as const,
      badge: 'Cần bổ sung',
      title: 'Nhân viên yêu cầu bổ sung thông tin',
      description:
        'Kiểm tra ghi chú bên dưới và cập nhật đúng các mục được yêu cầu để gửi lại.',
      canEdit: true,
    };
  }
  if (status === 'REJECTED') {
    return {
      tone: 'rejected' as const,
      badge: 'Đã từ chối',
      title: 'Đề nghị thay đổi chưa được duyệt',
      description:
        'Xem lý do từ chối từ nhân viên bên dưới. Bạn có thể chỉnh sửa và gửi lại hồ sơ.',
      canEdit: true,
    };
  }
  return {
    tone: 'pending' as const,
    badge: input.reverificationRequired ? 'Chờ tái xác minh' : 'Chờ xét duyệt',
    title: input.reverificationRequired
      ? 'Đang chờ tái xác minh thông tin quan trọng'
      : 'Đã gửi yêu cầu xét duyệt',
    description: input.reverificationRequired
      ? 'Vì có thay đổi thông tin quan trọng, nhà trọ tạm ẩn cho đến khi nhân viên NestHub hoàn tất tái xác minh.'
      : 'Thông tin nhà trọ hiện tại vẫn giữ nguyên công khai cho đến khi yêu cầu này được phê duyệt.',
    canEdit: false,
  };
}
