import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { MotionButton } from '../motion/MotionUI.jsx';
import { useToast } from '../PortalUI.jsx';
import { hostApi } from '../../services/host.js';
import { applyLocationSuggestion } from '../../services/property-location.js';
import {
  DEFAULT_QUIET_HOURS_TIME,
  STEPS,
  createPropertyForm,
  getQuietHoursTime,
  propertyDraft,
  propertyDraftStep,
  restorePropertyDraft,
  validatePropertyStep,
  validateRegistrationFile
} from '../../services/property-registration.js';
import { BRAND } from '../../config/brand.js';
import RegistrationProgress from './RegistrationProgress.jsx';
import RegistrationHelpPanel from './RegistrationHelpPanel.jsx';
import WizardNavigation from './WizardNavigation.jsx';
import PropertyBasicInfoStep from './PropertyBasicInfoStep.jsx';
import PropertyLocationStep from './PropertyLocationStep.jsx';
import PropertyAmenitiesStep from './PropertyAmenitiesStep.jsx';
import PropertyImagesStep from './PropertyImagesStep.jsx';
import PropertyVerificationStep from './PropertyVerificationStep.jsx';
import PropertyReviewStep from './PropertyReviewStep.jsx';
import '../../styles/property-registration-wizard.css';

const HINT_FIELDS = new Set([
  'name',
  'propertyType',
  'description',
  'managerName',
  'contactPhone',
  'zaloPhone',
  'addressDetail',
  'commune',
  'nearby'
]);

const STEP_HEADERS = [
  {
    title: 'Thông tin cơ bản',
    description: 'Giới thiệu nhà trọ và thông tin liên hệ với khách thuê.'
  },
  {
    title: 'Vị trí nhà trọ',
    description: 'Nhập địa chỉ tại Hòa Lạc và đánh dấu vị trí thực tế trên bản đồ.'
  },
  {
    title: 'Tiện ích & quy định',
    description: 'Khai báo các tiện ích chung và nội quy sinh hoạt của toàn nhà trọ.'
  },
  {
    title: 'Hình ảnh nhà trọ',
    description: 'Tải lên hình ảnh thực tế, rõ nét về mặt tiền, khuôn viên và không gian phòng.'
  },
  {
    title: 'Hồ sơ xác minh',
    description: 'Đính kèm các giấy tờ pháp lý để đội ngũ nhân viên thẩm định hồ sơ.'
  },
  {
    title: 'Kiểm tra & gửi hồ sơ',
    description: 'Rà soát toàn bộ thông tin, hình ảnh và tài liệu trước khi gửi xét duyệt.'
  }
];

export default function RegistrationWizard({
  user,
  accessBlocked = false,
  identityApplicationId,
  hasIdentityBackImage,
  onboarding = false,
  identityPreview,
  submitRegistration,
  onSubmitted,
  onBack,
  lookup
}) {
  const notify = useToast();
  const [pending, setPending] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submission = useRef();
  const hydrated = useRef(false);
  const formRef = useRef();

  const [data, setData] = useState(() => createPropertyForm(user));
  const [quietTimeDraft, setQuietTimeDraft] = useState(DEFAULT_QUIET_HOURS_TIME);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [manualCoordinatesOpen, setManualCoordinatesOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [draftState, setDraftState] = useState('idle'); // idle | saving | saved | error
  const [draftMessage, setDraftMessage] = useState('');

  const draftKey = user?.userId == null ? null : `hlrcs:property-draft:${user.userId}`;

  useEffect(() => () => submission.current?.abort(), []);

  // Reuse verified / Step-1 CCCD automatically without forcing re-upload
  useEffect(() => {
    if (!identityApplicationId && !onboarding) return;
    setData((previous) =>
      previous.documents.idCard
        ? previous
        : {
            ...previous,
            documents: {
              ...previous.documents,
              idCard: {
                name: onboarding
                  ? 'CCCD hai mặt từ bước Tài khoản & CCCD'
                  : 'CCCD đã nộp khi đăng ký chủ trọ',
                savedIdentity: true
              }
            }
          }
    );
    setErrors((previous) => ({ ...previous, idCard: undefined }));
  }, [identityApplicationId, onboarding]);

  // Restore saved text draft safely on mount (never restores sensitive files)
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey) || sessionStorage.getItem(draftKey);
      if (raw) {
        const restored = restorePropertyDraft(raw, user);
        const resume = propertyDraftStep(raw, restored);
        setData((previous) => ({ ...restored, documents: previous.documents }));
        setQuietTimeDraft(getQuietHoursTime(restored.selectedRules));
        setStep(resume);
        setFurthestStep(resume);
        setDraftState('saved');
        setDraftMessage('Đã khôi phục bản nháp đã lưu trên thiết bị này.');
        setNotice('Thông tin văn bản đã được khôi phục. Vui lòng chọn lại ảnh và giấy tờ nếu cần.');
      }
    } catch {
      setDraftState('error');
      setDraftMessage('Không thể đọc bản nháp cũ. Bạn có thể nhập hồ sơ mới bình thường.');
    } finally {
      hydrated.current = true;
    }
  }, [draftKey]);

  // Debounced autosave of non-sensitive text fields (never stores photos or CCCD)
  useEffect(() => {
    if (!draftKey || !hydrated.current || pending) return undefined;
    const hasAnyInput = Boolean(
      data.name.trim() ||
        data.description.trim() ||
        data.addressDetail.trim() ||
        data.commune ||
        data.amenities.length ||
        data.selectedRules.length ||
        data.rules.trim()
    );
    if (!hasAnyInput) return undefined;

    const timer = setTimeout(() => {
      try {
        const snapshot = propertyDraft(data, step);
        localStorage.setItem(draftKey, JSON.stringify(snapshot));
        sessionStorage.removeItem(draftKey);
        setDraftState('saved');
        setDraftMessage(
          `Đã tự động lưu bản nháp lúc ${new Date(snapshot.savedAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })}.`
        );
      } catch {
        setDraftState('error');
        setDraftMessage('Chưa thể tự động lưu bản nháp vào trình duyệt.');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    draftKey,
    pending,
    step,
    data.name,
    data.propertyType,
    data.description,
    data.managerName,
    data.contactPhone,
    data.zaloPhone,
    data.commune,
    data.addressDetail,
    data.nearby,
    data.latitude,
    data.longitude,
    data.amenities,
    data.selectedRules,
    data.rules
  ]);

  const update = (name, value) => {
    setData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
      ...(['latitude', 'longitude'].includes(name) ? { location: undefined } : {})
    }));
    setStepErrors((previous) => ({ ...previous, [step]: false }));
    setNotice('');
    setSubmitError('');
  };

  const selectLocation = (latitude, longitude, commune) => {
    setData((previous) => ({
      ...previous,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      ...(commune ? { commune } : {})
    }));
    setErrors((previous) => ({
      ...previous,
      location: undefined,
      latitude: undefined,
      longitude: undefined,
      ...(commune ? { commune: undefined } : {})
    }));
    setStepErrors((previous) => ({ ...previous, 1: false }));
    setNotice('');
  };

  const applyLookup = (location) => {
    setData((previous) =>
      applyLocationSuggestion(previous, location, [
        'latitude',
        'longitude',
        'addressDetail',
        'commune',
        'nearby'
      ])
    );
    setErrors((previous) => ({
      ...previous,
      latitude: undefined,
      longitude: undefined,
      location: undefined,
      ...(location.commune ? { commune: undefined } : {}),
      ...(location.addressDetail ? { addressDetail: undefined } : {}),
      ...(location.nearby ? { nearby: undefined } : {})
    }));
    setNotice('');
  };

  const inputProps = (name) => ({
    id: name,
    name,
    value: data[name],
    onChange: (event) => update(name, event.target.value),
    onBlur: () =>
      setErrors((previous) => ({
        ...previous,
        [name]: validatePropertyStep(data, step)[name]
      })),
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby':
      [HINT_FIELDS.has(name) && `${name}-hint`, errors[name] && `${name}-error`]
        .filter(Boolean)
        .join(' ') || undefined
  });

  const showErrors = (found, targetStep = step) => {
    setErrors(found);
    setStepErrors((previous) => ({ ...previous, [targetStep]: Object.keys(found).length > 0 }));
    if (found.latitude || found.longitude) setManualCoordinatesOpen(true);
    requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
  };

  const move = (target) => {
    setStep(target);
    setFurthestStep((previous) => Math.max(previous, target));
    setErrors({});
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persistDraft = (resumeStep, manual = false) => {
    try {
      if (!draftKey) throw new Error('Missing account');
      setDraftState('saving');
      const snapshot = propertyDraft(data, resumeStep);
      localStorage.setItem(draftKey, JSON.stringify(snapshot));
      sessionStorage.removeItem(draftKey);
      setDraftState('saved');
      const timeText = new Date(snapshot.savedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      setDraftMessage(`Đã ${manual ? 'lưu' : 'tự động lưu'} bản nháp lúc ${timeText}.`);
      if (manual) {
        setNotice('Đã lưu bản nháp thành công trên thiết bị này. Ảnh và giấy tờ cần chọn lại nếu tải lại trang.');
        notify?.('Đã lưu bản nháp hồ sơ nhà trọ.', 'success');
      }
    } catch {
      setDraftState('error');
      setDraftMessage('Chưa lưu được bản nháp. Vui lòng kiểm tra quyền lưu trữ của trình duyệt.');
    }
  };

  const navigateStep = (target) => {
    if (target > step) {
      for (let index = 0; index < target; index += 1) {
        const found = validatePropertyStep(data, index);
        if (Object.keys(found).length) {
          move(index);
          showErrors(found, index);
          return;
        }
      }
    }
    persistDraft(target);
    setReturnToReview(false);
    move(target);
  };

  const editStep = (target) => {
    move(target);
    setReturnToReview(true);
  };

  const handleBack = () => {
    if (step === 0) {
      if (onBack) onBack();
      return;
    }
    setReturnToReview(false);
    move(step - 1);
  };

  const next = () => {
    const found = validatePropertyStep(data, step);
    if (Object.keys(found).length) return showErrors(found, step);
    setStepErrors((previous) => ({ ...previous, [step]: false }));
    persistDraft(returnToReview ? 5 : step + 1);

    if (returnToReview) {
      for (let index = 0; index < 5; index += 1) {
        const invalid = validatePropertyStep(data, index);
        if (Object.keys(invalid).length) {
          move(index);
          showErrors(invalid, index);
          return;
        }
      }
      move(5);
      setReturnToReview(false);
    } else {
      move(step + 1);
    }
  };

  // Photo handlers
  const addPhotos = (selected) => {
    const files = Array.from(selected || []);
    if (!files.length) return;
    const invalid = files.map((file) => validateRegistrationFile(file)).find(Boolean);
    if (invalid) return showErrors({ photos: invalid }, 3);
    const unique = [...data.photos];
    for (const file of files) {
      if (
        !unique.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        )
      ) {
        unique.push(file);
      }
    }
    if (unique.length > 10) return showErrors({ photos: 'Chỉ được chọn tối đa 10 ảnh.' }, 3);
    update('photos', unique);
  };

  const replacePhoto = (index, file) => {
    const invalid = validateRegistrationFile(file);
    if (invalid) return showErrors({ photos: invalid }, 3);
    const nextPhotos = data.photos.map((item, idx) => (idx === index ? file : item));
    update('photos', nextPhotos);
  };

  const removePhoto = (index) => {
    update(
      'photos',
      data.photos.filter((_, position) => position !== index)
    );
  };

  const setCoverPhoto = (index) => {
    const chosen = data.photos[index];
    if (!chosen) return;
    update('photos', [chosen, ...data.photos.filter((_, position) => position !== index)]);
  };

  const reorderPhoto = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= data.photos.length) return;
    const nextPhotos = [...data.photos];
    const [moved] = nextPhotos.splice(fromIndex, 1);
    nextPhotos.splice(toIndex, 0, moved);
    update('photos', nextPhotos);
  };

  // Document handlers
  const addDocument = (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const error = validateRegistrationFile(file, true);
    if (error) return showErrors({ [key]: error }, 4);
    update('documents', { ...data.documents, [key]: file });
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const removeDocument = (key) => {
    update('documents', {
      ...data.documents,
      [key]:
        key === 'idCard' && identityApplicationId
          ? { name: 'CCCD đã nộp khi đăng ký chủ trọ', savedIdentity: true }
          : undefined
    });
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submission.current || accessBlocked) return;
    if (step < 5) return next();

    for (let index = 0; index < STEPS.length; index += 1) {
      const found = validatePropertyStep(data, index);
      if (Object.keys(found).length) {
        setStep(index);
        showErrors(found, index);
        return;
      }
    }

    const controller = new AbortController();
    submission.current = controller;
    setSubmitting(true);
    setSubmitError('');

    const onLocalSuccess = (record) => {
      setPending(record);
      setData((previous) => ({ ...previous, photos: [], documents: {} }));
      try {
        if (draftKey) {
          localStorage.removeItem(draftKey);
          sessionStorage.removeItem(draftKey);
        }
      } catch {
        /* Server record already persisted */
      }
      notify?.('Đã gửi hồ sơ đăng ký nhà trọ. Hồ sơ đang chờ thẩm định.', 'success');
    };

    try {
      const record = await (submitRegistration || hostApi.submitRegistration)(data, controller.signal);
      if (!controller.signal.aborted) {
        if (onSubmitted) {
          try {
            if (draftKey) {
              localStorage.removeItem(draftKey);
              sessionStorage.removeItem(draftKey);
            }
          } catch {
            /* Ignore */
          }
          onSubmitted(record);
        } else {
          onLocalSuccess(record);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setSubmitError(error.message || 'Không thể gửi hồ sơ lúc này. Vui lòng thử lại.');
    } finally {
      submission.current = undefined;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  };

  // Standalone /host/property/new post-submission confirmation view
  if (pending) {
    const needsSupplement = pending.status === 'NEEDS_SUPPLEMENT';
    return (
      <section className="prw-pending-card" role="status">
        <span className="prw-pending-icon" aria-hidden="true">
          <Clock3 size={30} />
        </span>
        <span className="prw-pending-badge">
          {needsSupplement ? 'Cần bổ sung' : 'Chờ thẩm định'}
        </span>
        <h2>
          {needsSupplement
            ? 'Hồ sơ đăng ký nhà trọ cần bổ sung'
            : 'Hồ sơ đăng ký nhà trọ đang chờ thẩm định'}
        </h2>
        <p>
          Hệ thống {BRAND.name} đã tiếp nhận hồ sơ <strong>{pending.name}</strong>.
          {needsSupplement
            ? ' Vui lòng xem ghi chú yêu cầu bổ sung bên dưới.'
            : ' Nhân viên sẽ kiểm tra và gửi kết quả trực tiếp tới tài khoản của bạn.'}
        </p>
        {pending.reasonNote && <div className="prw-pending-note">{pending.reasonNote}</div>}

        <dl className="prw-pending-meta">
          <div>
            <dt>Mã hồ sơ</dt>
            <dd>HS-{String(pending.registrationId).padStart(5, '0')}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>{needsSupplement ? 'Cần bổ sung' : 'Chờ thẩm định'}</dd>
          </div>
        </dl>

        <p className="prw-pending-footnote">
          Nhà trọ chưa được hiển thị công khai khi chưa được phê duyệt.
        </p>

        <div className="prw-pending-actions">
          <Link className="prw-btn prw-btn-primary" to="/host/property">
            <span>Nhà trọ của tôi</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <MotionButton
            type="button"
            className="prw-btn prw-btn-secondary"
            onClick={() => {
              setPending(null);
              setData(createPropertyForm(user));
              setQuietTimeDraft(DEFAULT_QUIET_HOURS_TIME);
              setStep(0);
              setFurthestStep(0);
              setReturnToReview(false);
              setErrors({});
              setStepErrors({});
              setSubmitError('');
              setDraftState('idle');
              setDraftMessage('');
              setNotice('');
            }}
          >
            Đăng ký nhà trọ khác
          </MotionButton>
        </div>
      </section>
    );
  }

  const headerInfo = STEP_HEADERS[step] || STEP_HEADERS[0];
  const reviewReadyToSubmit =
    data.termsAccepted &&
    [0, 1, 2, 3, 4].every((idx) => Object.keys(validatePropertyStep(data, idx)).length === 0);

  return (
    <div className="property-registration prw-root">
      {/* 6-Step Horizontal Progress Stepper */}
      <RegistrationProgress
        step={step}
        furthestStep={furthestStep}
        stepErrors={stepErrors}
        disabled={submitting}
        onSelectStep={navigateStep}
      />

      {/* 2-Column SaaS Layout (70-75% Main Form / 25-30% Context Help Panel) */}
      <div className="prw-layout">
        <form
          ref={formRef}
          className="prw-form"
          onSubmit={submit}
          noValidate
          aria-busy={submitting}
        >
          <fieldset className="prw-fieldset-lock" disabled={submitting || accessBlocked}>
            <section className="prw-main-card">
              <header className="prw-main-header">
                <span className="prw-step-pill">
                  Bước {step + 1} / {STEPS.length}
                </span>
                <h3>{headerInfo.title}</h3>
                <p>{headerInfo.description}</p>
              </header>

              {notice && (
                <div className="prw-inline-notice" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{notice}</span>
                </div>
              )}

              {step === 0 && (
                <PropertyBasicInfoStep
                  data={data}
                  errors={errors}
                  submitting={submitting}
                  inputProps={inputProps}
                  onUpdate={update}
                />
              )}

              {step === 1 && (
                <PropertyLocationStep
                  data={data}
                  errors={errors}
                  submitting={submitting}
                  lookup={lookup}
                  manualCoordinatesOpen={manualCoordinatesOpen}
                  onToggleManualCoordinates={setManualCoordinatesOpen}
                  inputProps={inputProps}
                  onApplyLookup={applyLookup}
                  onSelectLocation={selectLocation}
                />
              )}

              {step === 2 && (
                <PropertyAmenitiesStep
                  data={data}
                  errors={errors}
                  quietTimeDraft={quietTimeDraft}
                  onQuietTimeChange={setQuietTimeDraft}
                  inputProps={inputProps}
                  onUpdate={update}
                />
              )}

              {step === 3 && (
                <PropertyImagesStep
                  photos={data.photos}
                  error={errors.photos}
                  disabled={submitting}
                  onAddPhotos={addPhotos}
                  onReplacePhoto={replacePhoto}
                  onRemovePhoto={removePhoto}
                  onSetCover={setCoverPhoto}
                  onReorderPhoto={reorderPhoto}
                />
              )}

              {step === 4 && (
                <PropertyVerificationStep
                  documents={data.documents}
                  errors={errors}
                  disabled={submitting}
                  onboarding={onboarding}
                  identityApplicationId={identityApplicationId}
                  hasIdentityBackImage={hasIdentityBackImage}
                  identityPreview={identityPreview}
                  onAddDocument={addDocument}
                  onRemoveDocument={removeDocument}
                />
              )}

              {step === 5 && (
                <PropertyReviewStep
                  data={data}
                  errors={errors}
                  disabled={submitting}
                  onEditStep={editStep}
                  onUpdate={update}
                />
              )}

              {submitError && (
                <div className="prw-submit-error" role="alert">
                  <AlertCircle size={17} aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              <WizardNavigation
                step={step}
                totalSteps={STEPS.length}
                returnToReview={returnToReview}
                submitting={submitting}
                accessBlocked={accessBlocked}
                canSubmit={reviewReadyToSubmit}
                hasOnboardingBack={Boolean(onBack)}
                draftState={draftState}
                draftMessage={draftMessage}
                onBack={handleBack}
                onSaveDraft={() => persistDraft(step, true)}
              />
            </section>
          </fieldset>
        </form>

        <RegistrationHelpPanel
          step={step}
          completedSteps={furthestStep}
          totalSteps={STEPS.length}
        />
      </div>
    </div>
  );
}
