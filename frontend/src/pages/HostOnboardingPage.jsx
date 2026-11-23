import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock3,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { roleLabels } from '../routing/screens.js';
import { onboardingApi } from '../services/host-onboarding.js';
import { BRAND } from '../config/brand.js';
import HostAccountApplicationForm from '../components/HostAccountApplicationForm.jsx';
import HostIdentityImage from '../components/HostIdentityImage.jsx';
import HostPhoneVerificationModal from '../components/HostPhoneVerificationModal.jsx';
import HostOnboardingSidebar from '../components/HostOnboardingSidebar.jsx';
import { MotionButton } from '../components/motion/MotionUI.jsx';
import { StateView } from '../components/PortalUI.jsx';
import DetailPrototypeShell from '../components/detail/DetailPrototypeShell.jsx';
import HostOnboardingStatus from '../components/HostOnboardingStatus.jsx';
import PublicFooter from '../components/layout/PublicFooter.jsx';
import { RegistrationForm } from './host/HostPropertyCreatePage.jsx';
import { Editor } from './host/HostPropertyEditForm.jsx';
import '../styles/home-prototype.css';
import '../styles/home-prototype-integration.css';
import '../styles/host-onboarding.css';

const WIZARD_STEPS = [
  {
    key: 'account',
    title: 'Tài khoản & CCCD',
    description: 'Kiểm tra thông tin tài khoản và giấy tờ xác minh'
  },
  {
    key: 'property',
    title: 'Thông tin nhà trọ',
    description: 'Khai báo thông tin nhà trọ đầu tiên'
  },
  {
    key: 'review',
    title: 'Nhân viên thẩm định',
    description: 'Theo dõi kết quả xét duyệt sau khi nộp hồ sơ'
  }
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;

/**
 * Inspects file magic bytes to verify genuine JPEG/PNG content rather than trusting extension alone.
 */
async function hasValidImageSignature(file) {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isJpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng =
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;
  return isJpeg || isPng;
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh. Vui lòng thử chọn lại.'));
    reader.readAsDataURL(file);
  });
}

function verifyDecodableImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error('Tệp ảnh không hợp lệ hoặc bị hỏng.'));
        return;
      }
      if (img.naturalWidth * img.naturalHeight > MAX_IMAGE_PIXELS) {
        reject(new Error('Độ phân giải ảnh vượt quá 20 megapixel. Vui lòng chọn ảnh nhẹ hơn.'));
        return;
      }
      resolve();
    };
    img.onerror = () => reject(new Error('Tệp ảnh bị hỏng hoặc không đúng định dạng JPG/PNG.'));
    img.src = dataUrl;
  });
}

export default function HostOnboardingPage() {
  const { user, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const preview = import.meta.env.DEV && params.get('formPreview') === '1';

  const draftNoteKey = user?.userId ? `nesthub:onboarding-note:${user.userId}` : null;

  const [state, setState] = useState({ loading: true, account: null, registration: null, error: '' });
  const [revision, setRevision] = useState(0);
  const [stage, setStage] = useState(0);
  const [started, setStarted] = useState(false);
  const [values, setValues] = useState(() => {
    let savedIntro = '';
    try {
      if (draftNoteKey) savedIntro = sessionStorage.getItem(draftNoteKey) || '';
    } catch {
      savedIntro = '';
    }
    return { introduction: savedIntro, agreementAccepted: false };
  });

  // CCCD images stay strictly in memory (never written to localStorage).
  const [images, setImages] = useState({ front: '', back: '' });
  const [identityMeta, setIdentityMeta] = useState({ front: null, back: null });
  const [sideStatus, setSideStatus] = useState({ front: 'empty', back: 'empty' });
  const [errors, setErrors] = useState({});
  const [stepAlert, setStepAlert] = useState('');
  const [reading, setReading] = useState(0);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [editor, setEditor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const mounted = useRef(true);
  const reads = useRef({ front: 0, back: 0 });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Persist non-sensitive optional note in sessionStorage only (never CCCD images).
  useEffect(() => {
    if (!draftNoteKey) return;
    try {
      if (values.introduction) sessionStorage.setItem(draftNoteKey, values.introduction);
      else sessionStorage.removeItem(draftNoteKey);
    } catch {
      /* Ignore restricted storage */
    }
  }, [draftNoteKey, values.introduction]);

  useEffect(() => {
    if (preview) {
      setState({ loading: false, account: null, registration: null, error: '' });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    onboardingApi
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ loading: false, ...data, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState((prev) => ({ ...prev, loading: false, error: error.message }));
      });
    return () => controller.abort();
  }, [user.userId, revision, preview]);

  const account = state.account;
  const registration = state.registration;
  const missingContact =
    !user.fullName?.trim() || !/^(0|\+84)[35789]\d{8}$/.test(user.phoneNumber || '');

  async function choose(file, side = 'front') {
    if (!file) return;
    const key = side === 'back' ? 'identityBackImage' : 'identityImage';
    const sequence = ++reads.current[side];

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setSideStatus((p) => ({ ...p, [side]: 'invalid' }));
      setErrors((p) => ({ ...p, [key]: 'Định dạng không hợp lệ. Chỉ chấp nhận ảnh JPG hoặc PNG.' }));
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setSideStatus((p) => ({ ...p, [side]: 'invalid' }));
      setErrors((p) => ({ ...p, [key]: 'Dung lượng ảnh không hợp lệ. Vui lòng chọn ảnh tối đa 5 MB.' }));
      return;
    }

    setReading((n) => n + 1);
    setSideStatus((p) => ({ ...p, [side]: 'uploading' }));
    setErrors((p) => ({ ...p, [key]: undefined }));
    setStepAlert('');

    try {
      const validSignature = await hasValidImageSignature(file);
      if (!validSignature) {
        throw new Error('Nội dung tệp không phải ảnh JPG/PNG hợp lệ. Vui lòng chọn ảnh khác.');
      }
      const dataUrl = await readDataUrl(file);
      await verifyDecodableImage(dataUrl);

      if (mounted.current && reads.current[side] === sequence) {
        setImages((p) => ({ ...p, [side]: dataUrl }));
        setIdentityMeta((p) => ({ ...p, [side]: { name: file.name, size: file.size } }));
        setSideStatus((p) => ({ ...p, [side]: 'success' }));
        setErrors((p) => ({ ...p, [key]: undefined }));
      }
    } catch (err) {
      if (mounted.current && reads.current[side] === sequence) {
        setSideStatus((p) => ({ ...p, [side]: 'failed' }));
        setErrors((p) => ({ ...p, [key]: err.message || 'Không đọc được ảnh. Vui lòng chọn lại.' }));
      }
    } finally {
      if (mounted.current) setReading((n) => Math.max(0, n - 1));
    }
  }

  function removeIdentity(side) {
    reads.current[side] += 1;
    setImages((p) => ({ ...p, [side]: '' }));
    setIdentityMeta((p) => ({ ...p, [side]: null }));
    setSideStatus((p) => ({ ...p, [side]: 'empty' }));
    setErrors((p) => ({ ...p, [side === 'back' ? 'identityBackImage' : 'identityImage']: undefined }));
  }

  function validateStep1() {
    const nextErrors = {};
    const frontReady = Boolean(images.front || account?.hasIdentityImage);
    const backReady = Boolean(images.back || account?.hasIdentityBackImage);

    if (!frontReady) nextErrors.identityImage = 'Vui lòng cung cấp ảnh mặt trước CCCD.';
    if (!backReady) nextErrors.identityBackImage = 'Vui lòng cung cấp ảnh mặt sau CCCD.';
    if ((values.introduction || '').length > 1000) {
      nextErrors.introduction = 'Ghi chú không được vượt quá 1.000 ký tự.';
    }
    if (!values.agreementAccepted) {
      nextErrors.agreementAccepted = `Vui lòng đồng ý với Quy chế hoạt động đối tác ${BRAND.name} để tiếp tục.`;
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));

    if (Object.keys(nextErrors).length > 0) {
      setStepAlert('Vui lòng hoàn thiện các thông tin bắt buộc được đánh dấu bên dưới trước khi tiếp tục.');
      const firstKey = Object.keys(nextErrors)[0];
      const focusId =
        firstKey === 'identityImage'
          ? 'btnChooseIdentity'
          : firstKey === 'identityBackImage'
            ? 'btnChooseIdentityBack'
            : firstKey === 'agreementAccepted'
              ? 'agreementCheck'
              : firstKey;
      requestAnimationFrame(() => document.getElementById(focusId)?.focus());
      return false;
    }

    if (missingContact) {
      setStepAlert('Vui lòng cập nhật đầy đủ họ tên và số điện thoại hợp lệ trước khi tiếp tục.');
      return false;
    }

    setStepAlert('');
    return true;
  }

  function next(event) {
    event.preventDefault();
    if (reading > 0) return;
    if (!validateStep1()) return;
    setStarted(true);
    setStage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(data, signal) {
    if (preview) throw new Error('Bản xem trước không gửi hồ sơ thật.');
    return onboardingApi.submit(
      {
        ...values,
        identityImage: images.front || null,
        identityBackImage: images.back || null,
        version: account?.version ?? null
      },
      data,
      signal
    );
  }

  function received(record) {
    setImages({ front: '', back: '' });
    setIdentityMeta({ front: null, back: null });
    setSideStatus({ front: 'empty', back: 'empty' });
    setEditor(null);
    setEditing(false);
    try {
      if (draftNoteKey) sessionStorage.removeItem(draftNoteKey);
    } catch {
      /* Ignore */
    }
    setState((p) => ({ ...p, registration: record }));
    setRevision((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setErrors({});
    try {
      await refreshUser();
      const data = await onboardingApi.current();
      setState({ loading: false, ...data, error: '' });
    } catch (error) {
      setErrors({ load: error.message });
    } finally {
      setRefreshing(false);
    }
  }

  async function edit() {
    setEditing(true);
    setErrors({});
    try {
      setEditor(await onboardingApi.propertyEdit(registration.registrationId));
    } catch (error) {
      setErrors({ load: error.message });
    } finally {
      setEditing(false);
    }
  }

  const identityPreview = (
    <div className="host-identity-pair">
      {['front', 'back'].map((side) => (
        <section key={side}>
          <strong>{side === 'front' ? 'Mặt trước CCCD' : 'Mặt sau CCCD'}</strong>
          {images[side] ? (
            <img
              className="host-identity-image"
              src={images[side]}
              alt={side === 'front' ? 'Mặt trước CCCD đã chọn' : 'Mặt sau CCCD đã chọn'}
            />
          ) : (
            account && <HostIdentityImage id={account.id} present side={side} />
          )}
        </section>
      ))}
    </div>
  );

  const host = user.role === 'ROOM_HOST';
  const activeWizardStage = registration ? 2 : stage;
  const hasStep1Error = Boolean(
    errors.identityImage ||
      errors.identityBackImage ||
      errors.introduction ||
      errors.agreementAccepted ||
      stepAlert
  );

  function getStepStatus(index) {
    if (registration) {
      if (index < 2) return 'completed';
      if (registration.status === 'APPROVED') return 'completed';
      if (registration.status === 'PENDING') return 'reviewing';
      return 'error';
    }
    if (index < stage) return 'completed';
    if (index === stage) {
      if (index === 0 && hasStep1Error) return 'error';
      return 'current';
    }
    return 'upcoming';
  }

  function handleStepperClick(index) {
    if (registration) return;
    if (index === 0 && stage === 1) {
      setStage(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (index === 1 && stage === 0) {
      if (validateStep1()) {
        setStarted(true);
        setStage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  const showStepper = !state.loading && !state.error && ['USER'].includes(user.role) && !host && !editor;
  const showSidebarLayout = !state.loading && !state.error && !host && !editor && (!registration ? stage === 0 : true);

  return (
    <DetailPrototypeShell className="prototype-become-host host-onboarding" footer={<PublicFooter />}>
      <main className="onboarding-main">
        {/* Compact Hero Header */}
        <header className="hob-hero">
          <div className="hob-hero-copy">
            <span className="hob-hero-badge">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Đối tác {BRAND.name}</span>
            </span>
            <h1>Đăng ký chủ trọ &amp; nhà trọ</h1>
            <p>
              Hoàn thiện thông tin tài khoản và nhà trọ đầu tiên trong một hồ sơ. Nhân viên sẽ thẩm định và phê duyệt sau khi bạn gửi đăng ký.
            </p>
          </div>
          {showStepper && (
            <div className="hob-hero-meta" aria-label={`Đang ở bước ${activeWizardStage + 1} trên 3`}>
              <span className="hob-hero-step-pill">
                <Clock3 size={14} aria-hidden="true" />
                <span>Bước {activeWizardStage + 1} / 3</span>
              </span>
            </div>
          )}
        </header>

        {preview && (
          <p className="registration-info" role="note">
            Bản xem trước giao diện · Không gửi SMS hoặc hồ sơ thật.
          </p>
        )}

        {/* Horizontal 3-Step Registration Stepper */}
        {showStepper && (
          <nav aria-label="Tiến trình đăng ký chủ trọ">
            <ol className="onboarding-steps">
              {WIZARD_STEPS.map((item, index) => {
                const status = getStepStatus(index);
                const clickable = !registration && ((index === 0 && stage === 1) || (index === 1 && stage === 0));
                const isCurrent = status === 'current' || status === 'reviewing' || (index === activeWizardStage && status === 'error');

                return (
                  <li
                    key={item.key}
                    className={`hob-step is-${status}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <button
                      type="button"
                      className="hob-step-trigger"
                      disabled={!clickable}
                      onClick={() => handleStepperClick(index)}
                    >
                      <span className="hob-step-indicator" aria-hidden="true">
                        {status === 'completed' ? (
                          <Check size={16} strokeWidth={2.6} />
                        ) : status === 'error' ? (
                          <AlertCircle size={16} />
                        ) : status === 'reviewing' ? (
                          <Clock3 size={16} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="hob-step-meta">
                        <span className="hob-step-eyebrow">Bước {index + 1}</span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Main Content States */}
        {state.loading ? (
          <StateView kind="loading" />
        ) : state.error ? (
          <StateView kind="error" message={state.error}>
            <MotionButton className="p-button" onClick={() => setRevision((n) => n + 1)}>
              Thử lại
            </MotionButton>
          </StateView>
        ) : !['USER', 'ROOM_HOST'].includes(user.role) ? (
          <section className="onboarding-status">
            <ShieldCheck size={32} aria-hidden="true" />
            <h2>Tài khoản nội bộ hệ thống</h2>
            <p>Tài khoản này không cần thực hiện quy trình đăng ký quyền Chủ trọ.</p>
            <Link className="hob-btn hob-btn-primary" to="/">
              Về trang chủ
            </Link>
          </section>
        ) : host ? (
          <section className="onboarding-status">
            <span className="hob-status-circle" aria-hidden="true">
              <Check size={26} />
            </span>
            <h2>Bạn đã có quyền Chủ trọ trên {BRAND.name}</h2>
            <p>Bạn có thể quản lý nhà trọ hiện tại hoặc đăng ký thêm cơ sở nhà trọ mới trực tiếp trong Host Portal.</p>
            <div className="hob-status-actions">
              <Link className="hob-btn hob-btn-primary" to="/host/property/new">
                <span>Đăng ký nhà trọ mới</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="hob-btn hob-btn-secondary" to="/host/property">
                Nhà trọ của tôi
              </Link>
            </div>
          </section>
        ) : editor ? (
          <div className="hob-editor-wrap">
            <MotionButton type="button" className="hob-btn hob-btn-secondary" onClick={() => setEditor(null)}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Quay lại trạng thái hồ sơ</span>
            </MotionButton>
            <Editor snapshot={editor} api={onboardingApi} onboarding onDone={received} />
          </div>
        ) : (
          <div className={`hob-layout${showSidebarLayout ? ' has-sidebar' : ' is-full'}`}>
            <div className="hob-main-col">
              {registration ? (
                <HostOnboardingStatus
                  registration={registration}
                  refreshing={refreshing}
                  editing={editing}
                  error={errors.load}
                  onRefresh={refresh}
                  onEdit={edit}
                />
              ) : (
                <>
                  <div
                    hidden={stage !== 0}
                    onSubmit={next}
                    onChange={(event) => {
                      if (event.target.name === 'introduction') {
                        const val = event.target.value;
                        setValues((p) => ({ ...p, introduction: val }));
                        setErrors((p) => ({
                          ...p,
                          introduction: val.length > 1000 ? 'Ghi chú không được vượt quá 1.000 ký tự.' : undefined
                        }));
                      }
                      if (event.target.name === 'agreementAccepted') {
                        const checked = event.target.checked;
                        setValues((p) => ({ ...p, agreementAccepted: checked }));
                        if (checked) {
                          setErrors((p) => ({ ...p, agreementAccepted: undefined }));
                          setStepAlert('');
                        }
                      }
                    }}
                  >
                    <HostAccountApplicationForm
                      user={user}
                      application={account}
                      values={values}
                      errors={errors}
                      alert={stepAlert}
                      missingContact={missingContact}
                      roleLabel={roleLabels[user.role]}
                      busy={reading > 0}
                      identityImage={images.front}
                      identityBackImage={images.back}
                      identityMeta={identityMeta}
                      sideStatus={sideStatus}
                      preview={preview}
                      onIdentityFile={choose}
                      onRemoveIdentity={removeIdentity}
                      onVerifyPhone={() => setPhoneOpen(true)}
                      onAcceptTerms={() => {
                        setValues((p) => ({ ...p, agreementAccepted: true }));
                        setErrors((p) => ({ ...p, agreementAccepted: undefined }));
                        setStepAlert('');
                      }}
                      title="Thông tin tài khoản & CCCD"
                      submitLabel="Tiếp tục: Thông tin nhà trọ"
                    />
                  </div>

                  {started && (
                    <div className="host-portal hob-step2-wrap" hidden={stage !== 1}>
                      <RegistrationForm
                        user={user}
                        onboarding
                        identityPreview={identityPreview}
                        lookup={onboardingApi.lookup}
                        submitRegistration={submit}
                        onSubmitted={received}
                        onBack={() => {
                          setStage(0);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {showSidebarLayout && <HostOnboardingSidebar currentStage={activeWizardStage} />}
          </div>
        )}
      </main>

      {phoneOpen && (
        <HostPhoneVerificationModal
          user={user}
          preview={preview}
          onClose={() => setPhoneOpen(false)}
          onVerified={async () => {
            if (!preview) await refreshUser();
            setPhoneOpen(false);
          }}
        />
      )}
    </DetailPrototypeShell>
  );
}
