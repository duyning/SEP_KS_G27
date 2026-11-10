import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import { Button as MotionButton } from '@animate-ui/react/primitives/buttons/button';
import {
  applicantCapacities,
  rentalExperiences,
  applicationFieldLabel
} from '../services/host-applications.js';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  FilePenLine,
  FileText,
  Info,
  RotateCcw,
  ShieldCheck,
  X,
  XCircle
} from 'lucide-react';

function HorizontalStepper({ state, progressOpen, onToggleProgress, stepClass }) {
  const steps = [
    { id: 1, label: 'Điền thông tin', sub: 'Đăng ký nguyện vọng' },
    { id: 2, label: 'Gửi hồ sơ', sub: 'Ghi nhận yêu cầu' },
    { id: 3, label: 'Staff thẩm định', sub: 'Đối soát thông tin' },
    { id: 4, label: 'Cấp quyền Chủ trọ', sub: 'Bắt đầu đăng tin' }
  ];

  const currentCount = ['approved', 'already_host'].includes(state)
    ? 4
    : ['pending', 'needs_changes', 'rejected'].includes(state)
      ? 3
      : 1;

  return (
    <div className="bh-stepper-card" id="bhStepperCard">
      <div className="bh-stepper-header">
        <div className="bh-stepper-title-wrap">
          <span className="bh-stepper-title">Tiến trình xét duyệt</span>
          <span className="bm-progress-count">{currentCount}/4</span>
        </div>
        <MotionButton
          type="button"
          id="becomeHostProgressToggle"
          className="bm-progress-toggle"
          aria-expanded={progressOpen}
          aria-controls="becomeHostProgressHelp"
          onClick={onToggleProgress}
        >
          <span>Lưu ý tiếp theo</span>
          <ChevronDown size={16} className={progressOpen ? 'is-open' : ''} />
        </MotionButton>
      </div>

      <div className="bh-stepper-horizontal">
        {steps.map((step, idx) => {
          const sClass = stepClass(step.id);
          const isDone = sClass === 'completed';
          const isActive = sClass === 'active';
          const isWarning = sClass === 'warning';
          const isRejected = sClass === 'rejected';

          return (
            <div key={step.id} className={`bh-hstep-item ${sClass}`} data-step={step.id}>
              {idx > 0 && (
                <div
                  className={`bh-hstep-line ${
                    isDone || isActive || isWarning || isRejected ? 'is-active' : ''
                  }`}
                />
              )}
              <div className="bh-hstep-node-wrap">
                <div className={`bh-hstep-node ${sClass}`}>
                  {isDone ? (
                    <Check size={14} strokeWidth={2.8} />
                  ) : isWarning ? (
                    '!'
                  ) : isRejected ? (
                    '✕'
                  ) : (
                    step.id
                  )}
                </div>
                <div className="bh-hstep-text">
                  <span className="bh-hstep-label">{step.label}</span>
                  <span className="bh-hstep-sub">{step.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressNoticeBanner({ progressOpen }) {
  return (
    <div
      className={`bh-process-banner ${progressOpen ? 'bm-progress-open' : ''}`}
      id="becomeHostProgressHelp"
    >
      <div className="bh-process-banner-icon" aria-hidden="true">
        <Info size={16} />
      </div>
      <div className="bh-process-banner-text">
        <p>
          <strong>Sau khi được phê duyệt:</strong> Bạn có thể đăng nhà trọ, tạo loại phòng và quản lý phòng tại Host
          Portal. Hồ sơ giấy tờ nhà trọ sẽ được gửi xác minh riêng trước khi hiển thị công khai.
        </p>
      </div>
    </div>
  );
}

function SubmittedInfoAccordion({ application, formatDate, onCopy }) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const reduce = useShouldReduceMotion();
  const { transition } = useMotionTokens();

  const handleCopy = async (key, val, label) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      onCopy?.(`Đã sao chép ${label}`);
      setTimeout(() => setCopiedKey((k) => (k === key ? '' : k)), 1800);
    } catch {
      onCopy?.(`Không thể sao chép ${label}`);
    }
  };

  return (
    <div className="bh-accordion-card">
      <button
        type="button"
        className="bh-accordion-toggle"
        aria-expanded={open}
        aria-controls="bhSubmittedAccordionBody"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="bh-accordion-toggle-left">
          <span className="bh-accordion-icon" aria-hidden="true">
            <FileText size={17} />
          </span>
          <div>
            <div className="bh-accordion-title-row">
              <h3 className="bh-accordion-title">Thông tin hồ sơ đã gửi</h3>
              {application?.id && (
                <span className="bh-accordion-id-tag">HREG-{application.id}</span>
              )}
            </div>
            <p className="bh-accordion-meta">
              Thời gian gửi: <strong id="pendingSubmittedDate">{formatDate(application?.submittedAt)}</strong>
            </p>
          </div>
        </div>
        <div className="bh-accordion-toggle-right">
          <span className="bh-accordion-toggle-text">
            {open ? 'Thu gọn' : 'Xem chi tiết'}
          </span>
          <ChevronDown size={18} className={`bh-accordion-chevron ${open ? 'is-open' : ''}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="bhSubmittedAccordionBody"
            className="bh-accordion-body"
            initial={{ height: reduce ? 'auto' : 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: transition.disclosure }}
            exit={{ height: reduce ? 'auto' : 0, opacity: 0, transition: transition.dismiss }}
          >
            <div className="bh-accordion-inner">
              <div className="bh-info-grid">
                <div className="bh-info-item">
                  <span className="bh-info-label">Tư cách cho thuê</span>
                  <span className="bh-info-val">
                    {applicationFieldLabel(applicantCapacities, application?.applicantCapacity)}
                  </span>
                </div>
                <div className="bh-info-item">
                  <span className="bh-info-label">Kinh nghiệm quản lý</span>
                  <span className="bh-info-val">
                    {applicationFieldLabel(rentalExperiences, application?.rentalExperience)}
                  </span>
                </div>
                <div className="bh-info-item">
                  <span className="bh-info-label">Họ và tên đăng ký</span>
                  <span className="bh-info-val" id="pendingUserName">
                    {application?.userName || '—'}
                  </span>
                </div>
                <div className="bh-info-item">
                  <span className="bh-info-label">Số điện thoại liên hệ</span>
                  <div className="bh-info-val-row">
                    <span className="bh-info-val" id="pendingUserPhone">
                      {application?.userPhone || '—'}
                    </span>
                    {application?.userPhone && (
                      <button
                        type="button"
                        className={`bh-copy-btn ${copiedKey === 'phone' ? 'is-copied' : ''}`}
                        title="Sao chép số điện thoại"
                        aria-label="Sao chép số điện thoại"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy('phone', application.userPhone, 'số điện thoại');
                        }}
                      >
                        {copiedKey === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bh-info-item">
                  <span className="bh-info-label">Email tài khoản</span>
                  <div className="bh-info-val-row">
                    <span className="bh-info-val" id="pendingUserEmail">
                      {application?.userEmail || '—'}
                    </span>
                    {application?.userEmail && (
                      <button
                        type="button"
                        className={`bh-copy-btn ${copiedKey === 'email' ? 'is-copied' : ''}`}
                        title="Sao chép email"
                        aria-label="Sao chép email"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy('email', application.userEmail, 'email');
                        }}
                      >
                        {copiedKey === 'email' ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bh-info-item">
                  <span className="bh-info-label">Khu vực hoạt động</span>
                  <span className="bh-info-val" id="pendingTargetCommune">
                    {application?.targetCommune || '—'}
                  </span>
                </div>
                <div className="bh-info-item bh-info-full">
                  <span className="bh-info-label">Quy mô phòng dự kiến</span>
                  <span className="bh-info-val" id="pendingExpectedScale">
                    {application?.expectedScale || '—'}
                  </span>
                </div>
              </div>

              <div className="bh-intro-block">
                <span className="bh-info-label">Lời giới thiệu &amp; Kinh nghiệm</span>
                <div className="bh-intro-text" id="pendingIntroduction">
                  {application?.introduction || '—'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BecomeHostPrototype({
  user,
  roleLabel,
  application,
  values,
  errors,
  state,
  alert,
  busy,
  mobileOpen,
  announcementOpen,
  progressOpen,
  setProgressOpen,
  account,
  missingContact,
  formatDate,
  stepClass,
  stepLabel,
  onClick,
  onSubmit,
  onChange,
  notify
}) {
  const onToggleProgress = () => {
    if (setProgressOpen) setProgressOpen((v) => !v);
  };

  const isApplicationState = ['pending', 'needs_changes', 'rejected', 'approved', 'already_host'].includes(state);

  return (
    <div
      className="prototype-home prototype-become-host become-host-mobile"
      onClick={onClick}
      onSubmit={onSubmit}
      onChange={onChange}
    >
      <header className="navbar-wrapper">
        <div className={`top-announcement ${announcementOpen ? 'bm-info-open' : ''}`}>
          <MotionButton
            type="button"
            id="becomeHostInfoToggle"
            className="bm-info-toggle"
            aria-expanded={announcementOpen}
            aria-controls="becomeHostInformation"
          >
            <span>Hòa Lạc Campus · Thông tin &amp; hỗ trợ</span>
            <ChevronDown size={14} />
          </MotionButton>
          <div className="container top-announcement-inner" id="becomeHostInformation">
            <div className="announcement-left">
              <span className="badge-tag">Hòa Lạc Campus</span>
              <span className="announcement-text">
                Hệ thống phòng trọ đã xác thực 100% quanh ĐH FPT &amp; Khu Công nghệ cao Hòa Lạc
              </span>
            </div>
            <div className="announcement-right">
              <a href="tel:0912345678" className="contact-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Hotline hỗ trợ: 0912 345 678</span>
              </a>
              <span className="sep">•</span>
              <span className="status-live">
                <span className="live-dot" />
                Cập nhật phòng trống hôm nay
              </span>
            </div>
          </div>
        </div>

        <nav className="main-navbar">
          <div className="container navbar-container">
            <Link className="nav-brand" aria-label="Trang chủ HL_RCS" to="/">
              <div className="brand-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="brand-title-wrap">
                <span className="brand-name">HL_RCS</span>
                <span className="brand-sub">Rental Connection System</span>
              </div>
            </Link>

            <ul id="navMenu" className={`nav-menu ${mobileOpen ? 'show' : ''}`}>
              <li>
                <Link className="nav-item" to="/search">
                  Tìm phòng
                </Link>
              </li>
              <li>
                <Link className="nav-item" to="/map">
                  Bản đồ
                </Link>
              </li>
              <li>
                <Link className="nav-item" to="/favorites">
                  Đã lưu (<span className="menu-fav-count">0</span>)
                </Link>
              </li>
              <li>
                <Link className="nav-item" to="/bookings">
                  Lịch xem phòng
                </Link>
              </li>
              <li>
                <Link className="nav-item" to="/services">
                  Dịch vụ
                </Link>
              </li>
              <li>
                <Link className="nav-item" to="/community">
                  Cộng đồng
                </Link>
              </li>
              <li>
                <Link className="nav-item" to="/profile">
                  Hồ sơ cá nhân
                </Link>
              </li>
              <li className="bm-menu-account">{account}</li>
            </ul>

            <div className="nav-actions">{account}</div>

            <MotionButton
              className="mobile-toggle"
              id="mobileMenuBtn"
              type="button"
              aria-label={mobileOpen ? 'Đóng thực đơn' : 'Mở thực đơn'}
              aria-controls="navMenu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X size={24} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </MotionButton>
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="bm-menu-backdrop bm-menu-dismiss"
          aria-label="Đóng thực đơn và quay lại đăng ký"
        />
      )}

      <section className="bh-page-intro container" aria-labelledby="become-host-title">
        <div>
          <span className="bh-page-eyebrow">DÀNH CHO CHỦ NHÀ</span>
          <h1 id="become-host-title">Đăng ký làm chủ trọ</h1>
          <p>Hoàn thiện hồ sơ để sử dụng không gian quản lý nhà trọ trên HL_RCS.</p>
        </div>
      </section>

      <div className="bh-application-workspace container bh-workspace-centered">
        {/* Horizontal Stepper & Next Step Banner shared across view */}
        <HorizontalStepper
          state={state}
          progressOpen={progressOpen}
          onToggleProgress={onToggleProgress}
          stepClass={stepClass}
        />

        <ProgressNoticeBanner progressOpen={progressOpen} />

        <main className="bh-main-content" id="bhMainContent">
          <div className="bh-container-narrow">
            {/* Loading State */}
            <div id="stateLoading" style={{ display: state === 'loading' ? 'block' : 'none' }}>
              <div className="bh-skeleton-card">
                <div className="bh-sk-line bh-sk-title" />
                <div className="bh-sk-line bh-sk-sub" />
                <div className="bh-sk-line bh-sk-box" />
                <div className="bh-sk-line bh-sk-input" />
                <div className="bh-sk-line bh-sk-input" />
                <div className="bh-sk-line bh-sk-textarea" />
                <div className="bh-sk-line bh-sk-actions" />
              </div>
            </div>

            {/* Auth Guard State */}
            <div id="stateAuthGuard" style={{ display: state === 'not_logged_in' ? 'block' : 'none' }}>
              <div className="bh-auth-guard">
                <div className="bh-guard-icon-wrap">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h2 className="bh-state-title">Yêu cầu đăng nhập tài khoản</h2>
                <p className="bh-state-desc">
                  Bạn cần đăng nhập tài khoản người dùng trên hệ thống HL-RCS trước khi gửi hồ sơ đăng ký làm chủ trọ để
                  chúng tôi có thể liên kết quyền hạn với tài khoản của bạn.
                </p>
                <div className="bh-state-actions">
                  <Link className="bh-btn-primary" to="/login?redirect=become-host.html">
                    Đăng nhập tài khoản ngay
                  </Link>
                  <Link className="bh-btn-secondary" to="/register">
                    Đăng ký tài khoản mới
                  </Link>
                  <Link className="bh-btn-secondary" to="/">
                    Về trang chủ
                  </Link>
                </div>
                <div className="bh-guard-demo-box">
                  <span>Trải nghiệm nhanh cho đánh giá / thẩm định: </span>
                  <MotionButton type="button" id="btnGuardDemoLogin" className="bh-guard-demo-btn">
                    Đăng nhập tự động với tài khoản Sinh viên FPT (Nguyễn Minh Anh)
                  </MotionButton>
                </div>
              </div>
            </div>

            {/* Unregistered Form State */}
            <div id="stateUnregistered" style={{ display: state === 'unregistered' ? 'block' : 'none' }}>
              <div className="bh-form-card">
                <div className="bh-form-header">
                  <h2 className="bh-form-title">Đơn xin cấp quyền Chủ trọ</h2>
                  <p className="bh-form-desc" id="bhFormSectionNotice">
                    Vui lòng kiểm tra thông tin liên hệ và cung cấp lời giới thiệu để gửi yêu cầu trở thành chủ trọ.
                  </p>
                </div>

                <div
                  className="bh-missing-contact-warning"
                  id="bhMissingContactWarning"
                  style={{ display: missingContact ? 'flex' : 'none' }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <strong>Lưu ý về thông tin liên hệ: </strong>
                    <span id="bhMissingContactDesc">
                      Tài khoản của bạn chưa có đủ Họ tên hoặc Số điện thoại. Ban Quản Trị cần thông tin liên hệ chính
                      chủ để xác thực trước khi duyệt hồ sơ.
                    </span>
                    <div style={{ marginTop: '6px' }}>
                      <Link to="/profile">Cập nhật thông tin trong Hồ sơ cá nhân →</Link>
                    </div>
                  </div>
                </div>

                {application?.status === 'NEEDS_CHANGES' && (
                  <aside className="bh-review-note">
                    <strong>Yêu cầu bổ sung từ Staff</strong>
                    <p>{application.reviewerNote}</p>
                  </aside>
                )}

                <form id="becomeHostForm" noValidate>
                  <div className="bh-form-section">
                    <div className="bh-section-title-wrap">
                      <span className="bh-section-num">1</span>
                      <h3 className="bh-section-title">Thông tin tài khoản</h3>
                    </div>

                    <div className="bh-account-summary-box">
                      <div className="bh-account-grid">
                        <div className="bh-acc-field">
                          <span className="bh-acc-label">Họ và tên</span>
                          <span
                            className="bh-acc-val"
                            id="accFullName"
                            data-requested={
                              application?.status === 'NEEDS_CHANGES' &&
                              application?.requestedFields?.includes('accFullName') === true
                            }
                          >
                            {user.fullName || '—'}
                          </span>
                        </div>
                        <div className="bh-acc-field">
                          <span className="bh-acc-label">Số điện thoại liên hệ</span>
                          <span
                            className="bh-acc-val"
                            id="accPhone"
                            data-requested={
                              application?.status === 'NEEDS_CHANGES' &&
                              application?.requestedFields?.includes('accPhone') === true
                            }
                          >
                            {user.phoneNumber || '—'}
                          </span>
                        </div>
                        <div className="bh-acc-field">
                          <span className="bh-acc-label">Email tài khoản</span>
                          <span className="bh-acc-val" id="accEmail">
                            {user.email || '—'}
                          </span>
                        </div>
                        <div className="bh-acc-field">
                          <span className="bh-acc-label">Vai trò hiện tại</span>
                          <span className="bh-acc-val role" id="accRole">
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bh-account-tip">
                      <span>
                        Thông tin liên hệ được lấy từ tài khoản của bạn. Cập nhật tại{' '}
                        <Link to="/profile">Hồ sơ cá nhân</Link>.
                      </span>
                    </div>
                  </div>

                  <div className="bh-form-section">
                    <div className="bh-section-title-wrap">
                      <span className="bh-section-num">2</span>
                      <h3 className="bh-section-title">Kế hoạch cho thuê</h3>
                    </div>

                    <div className="bh-form-row">
                      <div className="bh-form-group">
                        <label htmlFor="applicantCapacity" className="bh-form-label">
                          <span>
                            Tư cách cho thuê <span className="bh-req-star">*</span>
                          </span>
                        </label>
                        <select
                          id="applicantCapacity"
                          name="applicantCapacity"
                          className="bh-form-select"
                          value={values.applicantCapacity}
                          required
                          disabled={busy}
                          aria-invalid={!!errors.applicantCapacity}
                          aria-describedby="capacityHint errCapacity"
                          data-requested={application?.requestedFields?.includes('applicantCapacity') === true}
                        >
                          <option value="">Chọn tư cách cho thuê</option>
                          {applicantCapacities.map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <span id="capacityHint" className="bh-field-hint">
                          Nếu được ủy quyền hoặc cho thuê lại, bạn cần có quyền cho thuê hợp lệ và cung cấp giấy tờ khi
                          đăng ký nhà trọ.
                        </span>
                        <span
                          id="errCapacity"
                          className={`bh-field-error ${errors.applicantCapacity ? 'show' : ''}`}
                          role="alert"
                        >
                          {errors.applicantCapacity || ''}
                        </span>
                      </div>

                      <div className="bh-form-group">
                        <label htmlFor="rentalExperience" className="bh-form-label">
                          <span>
                            Kinh nghiệm quản lý cho thuê <span className="bh-req-star">*</span>
                          </span>
                        </label>
                        <select
                          id="rentalExperience"
                          name="rentalExperience"
                          className="bh-form-select"
                          value={values.rentalExperience}
                          required
                          disabled={busy}
                          aria-invalid={!!errors.rentalExperience}
                          aria-describedby="experienceHint errExperience"
                          data-requested={application?.requestedFields?.includes('rentalExperience') === true}
                        >
                          <option value="">Chọn kinh nghiệm quản lý</option>
                          {rentalExperiences.map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <span id="experienceHint" className="bh-field-hint">
                          Bạn có thể đăng ký ngay cả khi chưa từng quản lý nhà trọ.
                        </span>
                        <span
                          id="errExperience"
                          className={`bh-field-error ${errors.rentalExperience ? 'show' : ''}`}
                          role="alert"
                        >
                          {errors.rentalExperience || ''}
                        </span>
                      </div>
                    </div>

                    <div className="bh-form-row">
                      <div className="bh-form-group">
                        <label htmlFor="targetCommune" className="bh-form-label">
                          <span>
                            Khu vực hoạt động chính <span className="bh-req-star">*</span>
                          </span>
                        </label>
                        <select
                          id="targetCommune"
                          data-requested={
                            application?.status === 'NEEDS_CHANGES' &&
                            application?.requestedFields?.includes('targetCommune') === true
                          }
                          className="bh-form-select"
                          required
                          name="targetCommune"
                          value={values.targetCommune}
                          disabled={busy}
                          aria-invalid={!!errors.targetCommune}
                          aria-describedby="errCommune"
                        >
                          <option value="">-- Chọn xã / khu vực hoạt động --</option>
                          <option value="Tân Xã">Xã Tân Xã (Gần ĐH FPT, Hồ Tân Xã)</option>
                          <option value="Thạch Hòa">Xã Thạch Hòa (Cổng số 1, Ký túc xá CNC)</option>
                          <option value="Bình Yên">Xã Bình Yên (Khu trung tâm Thạch Thất)</option>
                          <option value="Hạ Bằng">Xã Hạ Bằng (Khu Công nghệ cao Hòa Lạc)</option>
                          <option value="Đồng Trúc">Xã Đồng Trúc (Đường Đại lộ Thăng Long)</option>
                          <option value="Tiến Xuân">Xã Tiến Xuân (Khu vực ĐHQG Hà Nội)</option>
                          <option value="Khác">Khu vực khác lân cận Khu CNC Hòa Lạc</option>
                        </select>
                        <span className="bh-field-hint">Địa bàn xã bạn dự kiến quản lý hoặc cho thuê phòng trọ.</span>
                        <span
                          id="errCommune"
                          className={`bh-field-error ${errors.targetCommune ? 'show' : ''}`}
                          role="alert"
                        >
                          {errors.targetCommune || ''}
                        </span>
                      </div>

                      <div className="bh-form-group">
                        <label htmlFor="expectedScale" className="bh-form-label">
                          <span>
                            Quy mô phòng dự kiến <span className="bh-req-star">*</span>
                          </span>
                        </label>
                        <select
                          id="expectedScale"
                          data-requested={
                            application?.status === 'NEEDS_CHANGES' &&
                            application?.requestedFields?.includes('expectedScale') === true
                          }
                          className="bh-form-select"
                          required
                          name="expectedScale"
                          value={values.expectedScale}
                          disabled={busy}
                          aria-invalid={!!errors.expectedScale}
                          aria-describedby="errScale"
                        >
                          <option value="">-- Chọn quy mô số phòng --</option>
                          <option value="Dưới 5 phòng">Dưới 5 phòng (Nhà riêng cho thuê / Dãy phòng nhỏ)</option>
                          <option value="5 - 15 phòng">5 - 15 phòng (Nhà trọ quy mô vừa phải)</option>
                          <option value="16 - 30 phòng">16 - 30 phòng (Tòa nhà trọ trung cấp)</option>
                          <option value="31 - 50 phòng">31 - 50 phòng (Chung cư mini sinh viên)</option>
                          <option value="Trên 50 phòng">Trên 50 phòng (Hệ thống chuỗi căn hộ)</option>
                        </select>
                        <span className="bh-field-hint">Ước tính tổng số phòng bạn đang vận hành hoặc sắp cho thuê.</span>
                        <span id="errScale" className={`bh-field-error ${errors.expectedScale ? 'show' : ''}`} role="alert">
                          {errors.expectedScale || ''}
                        </span>
                      </div>
                    </div>

                    <div className="bh-form-group">
                      <label htmlFor="introduction" className="bh-form-label">
                        <span>
                          Giới thiệu bản thân &amp; cơ sở cho thuê <span className="bh-req-star">*</span>
                        </span>
                        <span className="bh-char-counter" id="introCharCounter">
                          {values.introduction.length + ' / 1000 ký tự'}
                        </span>
                      </label>
                      <textarea
                        id="introduction"
                        data-requested={
                          application?.status === 'NEEDS_CHANGES' &&
                          application?.requestedFields?.includes('introduction') === true
                        }
                        className="bh-form-textarea"
                        rows="4"
                        maxLength="1000"
                        placeholder="Giới thiệu kinh nghiệm quản lý, khu vực nhà trọ và kế hoạch cho thuê của bạn..."
                        required
                        name="introduction"
                        value={values.introduction}
                        disabled={busy}
                        aria-invalid={!!errors.introduction}
                        aria-describedby="errIntro"
                      />
                      <span className="bh-field-hint">
                        Từ 20 đến 1000 ký tự. Staff sẽ sử dụng thông tin này để thẩm định yêu cầu của bạn.
                      </span>
                      <span id="errIntro" className={`bh-field-error ${errors.introduction ? 'show' : ''}`} role="alert">
                        {errors.introduction || ''}
                      </span>
                    </div>
                  </div>

                  <div className="bh-agreement-card">
                    <label className="bh-checkbox-label">
                      <input
                        type="checkbox"
                        id="agreementCheck"
                        required
                        name="agreementAccepted"
                        checked={values.agreementAccepted}
                        disabled={busy}
                        aria-invalid={!!errors.agreementAccepted}
                        aria-describedby="errAgreement"
                      />
                      <span>
                        Tôi cam kết thông tin cung cấp là chính xác, đồng ý tuân thủ{' '}
                        <strong>Quy chế hoạt động đối tác HL-RCS</strong>, bảo đảm cung cấp giá điện nước minh bạch và
                        tạo môi trường lưu trú an toàn, văn minh cho sinh viên.
                      </span>
                    </label>
                    <span
                      id="errAgreement"
                      style={{ marginLeft: '27px', marginTop: '6px' }}
                      className={`bh-field-error ${errors.agreementAccepted ? 'show' : ''}`}
                      role="alert"
                    >
                      {errors.agreementAccepted || ''}
                    </span>
                  </div>

                  <div
                    id="formGeneralError"
                    className="bh-feedback-banner rejected"
                    style={{ display: alert ? 'flex' : 'none' }}
                  >
                    <span className="bh-fb-icon">⚠️</span>
                    <div>
                      <div className="bh-fb-title">Không thể gửi hồ sơ</div>
                      <div className="bh-fb-desc" id="formGeneralErrorText">
                        {alert}
                      </div>
                    </div>
                  </div>

                  <div className="bh-form-actions">
                    <MotionButton
                      type="button"
                      id="btnCancelForm"
                      className="bh-btn-cancel"
                      disabled={busy || false}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Hủy bỏ</span>
                    </MotionButton>
                    <MotionButton
                      type="submit"
                      id="btnSubmitForm"
                      className="bh-btn-submit"
                      disabled={busy || missingContact}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      <span id="btnSubmitFormText">{busy ? 'Đang gửi hồ sơ...' : 'Gửi đăng ký xét duyệt'}</span>
                    </MotionButton>
                  </div>
                </form>
              </div>
            </div>

            {/* Pending State */}
            <div id="statePending" style={{ display: state === 'pending' ? 'block' : 'none' }}>
              <div className="bh-status-card pending">
                <div className="bh-status-card-header">
                  <div className="bh-status-identity">
                    <div className="bh-status-icon-wrap pending" aria-hidden="true">
                      <Clock3 size={20} />
                    </div>
                    <div>
                      <div className="bh-status-title-row">
                        <h2 className="bh-status-title">Hồ sơ đang chờ xét duyệt</h2>
                        <span className="bh-status-badge pending">
                          <span className="dot" />
                          Chờ xét duyệt
                        </span>
                      </div>
                      <p className="bh-status-meta">
                        Đã gửi thành công · <time>{formatDate(application?.submittedAt)}</time>
                      </p>
                    </div>
                  </div>
                  <div className="bh-status-actions">
                    <Link className="bh-btn-secondary compact" to="/profile">
                      Hồ sơ cá nhân
                    </Link>
                    <Link className="bh-btn-secondary compact" to="/">
                      Trang chủ
                    </Link>
                  </div>
                </div>
                <p className="bh-status-desc">
                  Hồ sơ đã được tiếp nhận và đang được nhân viên thẩm định đối soát thông tin tài khoản. Kết quả xét duyệt
                  sẽ được cập nhật trực tiếp tại đây.
                </p>
              </div>
            </div>

            {/* Needs Changes State */}
            <div id="stateNeedsChanges" style={{ display: state === 'needs_changes' ? 'block' : 'none' }}>
              <div className="bh-status-card warning">
                <div className="bh-status-card-header">
                  <div className="bh-status-identity">
                    <div className="bh-status-icon-wrap warning" aria-hidden="true">
                      <FilePenLine size={20} />
                    </div>
                    <div>
                      <div className="bh-status-title-row">
                        <h2 className="bh-status-title">Yêu cầu bổ sung thông tin hồ sơ</h2>
                        <span className="bh-status-badge warning">
                          <span className="dot" />
                          Cần bổ sung
                        </span>
                      </div>
                      <p className="bh-status-meta">
                        Ban Quản Trị yêu cầu bổ sung · <time id="ncTime">{formatDate(application?.reviewedAt)}</time>
                      </p>
                    </div>
                  </div>
                  <div className="bh-status-actions">
                    <MotionButton
                      type="button"
                      id="btnStartSupplement"
                      className="bh-btn-primary compact"
                      disabled={!application?.allowResubmit || busy}
                    >
                      <FilePenLine size={15} />
                      <span>Bổ sung hồ sơ</span>
                    </MotionButton>
                    <Link className="bh-btn-secondary compact" to="/profile">
                      Để sau
                    </Link>
                  </div>
                </div>

                <div className="bh-feedback-box warning">
                  <div className="bh-feedback-title">Hướng dẫn từ Staff kiểm duyệt:</div>
                  <div className="bh-feedback-desc" id="ncNote">
                    {application?.reviewerNote || '—'}
                  </div>
                  <div className="bh-feedback-meta">
                    <span>
                      Người xét duyệt: <strong id="ncReviewer">{application?.reviewedBy || 'Ban Quản Trị HL_RCS'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rejected State */}
            <div id="stateRejected" style={{ display: state === 'rejected' ? 'block' : 'none' }}>
              <div className="bh-status-card rejected">
                <div className="bh-status-card-header">
                  <div className="bh-status-identity">
                    <div className="bh-status-icon-wrap rejected" aria-hidden="true">
                      <XCircle size={20} />
                    </div>
                    <div>
                      <div className="bh-status-title-row">
                        <h2 className="bh-status-title">Hồ sơ chưa được phê duyệt</h2>
                        <span className="bh-status-badge rejected">
                          <span className="dot" />
                          Chưa được duyệt
                        </span>
                      </div>
                      <p className="bh-status-meta">
                        Đã thẩm định · <time id="rejTime">{formatDate(application?.reviewedAt)}</time>
                      </p>
                    </div>
                  </div>
                  <div className="bh-status-actions">
                    {application?.allowResubmit && (
                      <MotionButton
                        type="button"
                        id="btnResubmitAfterReject"
                        className="bh-btn-primary compact"
                        disabled={busy}
                      >
                        <RotateCcw size={15} />
                        <span>Gửi lại hồ sơ</span>
                      </MotionButton>
                    )}
                    <Link className="bh-btn-secondary compact" to="/profile">
                      Hồ sơ cá nhân
                    </Link>
                  </div>
                </div>

                <div className="bh-feedback-box rejected">
                  <div className="bh-feedback-title">Lý do từ Ban Quản Trị:</div>
                  <div className="bh-feedback-desc" id="rejReason">
                    {application?.reviewerNote || '—'}
                  </div>
                  <div className="bh-feedback-meta">
                    <span>
                      Người thẩm định: <strong id="rejReviewer">{application?.reviewedBy || 'Ban Quản Trị HL_RCS'}</strong>
                    </span>
                  </div>
                </div>

                <div
                  id="rejResubmitNotice"
                  className="bh-resubmit-alert"
                  style={{ display: !application?.allowResubmit ? 'block' : 'none' }}
                >
                  Tài khoản hiện bị tạm khóa gửi lại hồ sơ do vi phạm quy chế hoặc gửi nhiều lần không hợp lệ. Vui lòng
                  liên hệ Hotline: <strong>0912 345 678</strong> để được hỗ trợ.
                </div>
              </div>
            </div>

            {/* Approved State */}
            <div id="stateApproved" style={{ display: state === 'approved' ? 'block' : 'none' }}>
              <div className="bh-status-card approved">
                <div className="bh-status-card-header">
                  <div className="bh-status-identity">
                    <div className="bh-status-icon-wrap approved" aria-hidden="true">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <div className="bh-status-title-row">
                        <h2 className="bh-status-title">Chúc mừng! Bạn đã chính thức là Chủ trọ</h2>
                        <span className="bh-status-badge approved">
                          <span className="dot" />
                          Đã phê duyệt
                        </span>
                      </div>
                      <p className="bh-status-meta">
                        Phê duyệt vào lúc <strong id="appReviewedTime">{formatDate(application?.reviewedAt)}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="bh-status-actions">
                    <Link className="bh-btn-primary compact" to="/host">
                      <Building2 size={16} />
                      <span>Vào Host Portal →</span>
                    </Link>
                    <Link className="bh-btn-secondary compact" to="/profile">
                      Hồ sơ cá nhân
                    </Link>
                  </div>
                </div>
                <p className="bh-status-desc">
                  Tài khoản của bạn hiện có toàn quyền sử dụng Host Portal để đăng tải nhà trọ, thiết lập loại phòng và
                  tiếp nhận sinh viên.
                </p>
              </div>
            </div>

            {/* Already Host State */}
            <div id="stateAlreadyHost" style={{ display: state === 'already_host' ? 'block' : 'none' }}>
              <div className="bh-status-card approved">
                <div className="bh-status-card-header">
                  <div className="bh-status-identity">
                    <div className="bh-status-icon-wrap already" aria-hidden="true">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="bh-status-title-row">
                        <h2 className="bh-status-title">Tài khoản đã có quyền Chủ trọ</h2>
                        <span className="bh-status-badge approved">
                          <span className="dot" />
                          Tài khoản Chủ trọ
                        </span>
                      </div>
                      <p className="bh-status-desc" style={{ margin: '4px 0 0' }}>
                        Tài khoản hiện tại của bạn đã được kích hoạt vai trò Chủ trọ (Host). Bạn không cần thực hiện thêm
                        bước đăng ký này nữa.
                      </p>
                    </div>
                  </div>
                  <div className="bh-status-actions">
                    <Link className="bh-btn-primary compact" to="/host">
                      <span>Vào Host Portal →</span>
                    </Link>
                    <Link className="bh-btn-secondary compact" to="/profile">
                      Hồ sơ cá nhân
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Error State */}
            <div id="stateError" style={{ display: state === 'error' ? 'block' : 'none' }}>
              <div className="bh-status-card error">
                <div className="bh-status-card-header">
                  <div className="bh-status-identity">
                    <div className="bh-status-icon-wrap rejected" aria-hidden="true">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h2 className="bh-status-title">Không thể tải hồ sơ</h2>
                      <p className="bh-status-desc" id="errorMessageText">
                        {alert}
                      </p>
                    </div>
                  </div>
                  <div className="bh-status-actions">
                    <MotionButton type="button" id="btnRetryError" className="bh-btn-primary compact">
                      Thử lại ngay
                    </MotionButton>
                    <Link className="bh-btn-secondary compact" to="/">
                      Về trang chủ
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Submitted Info Accordion for application review states */}
            {isApplicationState && application && (
              <SubmittedInfoAccordion
                application={application}
                formatDate={formatDate}
                onCopy={(msg) => notify?.(msg)}
              />
            )}
          </div>
        </main>
      </div>

      <footer className="footer-wrapper">
        <div className="container footer-grid">
          <div className="footer-col col-brand">
            <Link className="nav-brand" style={{ marginBottom: '16px' }} to="/">
              <div className="brand-logo-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="brand-title-wrap">
                <span className="brand-name" style={{ color: '#ffffff' }}>
                  HL_RCS
                </span>
                <span className="brand-sub" style={{ color: 'var(--slate-400)' }}>
                  Rental Connection System
                </span>
              </div>
            </Link>
            <p className="footer-desc">
              Nền tảng kết nối phòng trọ sinh viên minh bạch, bảo vệ quyền lợi người thuê và hỗ trợ chủ nhà số hóa vận
              hành nhà trọ tại Đô thị vệ tinh Hòa Lạc.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-btn" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="social-btn" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#0f172a" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Khu vực phòng trọ</h4>
            <ul className="footer-links">
              <li>
                <Link to="/search?location=tan-xa">Phòng trọ Tân Xã (Gần ĐH FPT)</Link>
              </li>
              <li>
                <Link to="/search?location=thach-hoa">Phòng trọ Thạch Hòa</Link>
              </li>
              <li>
                <Link to="/search?location=binh-yen">Căn hộ mini Bình Yên</Link>
              </li>
              <li>
                <Link to="/search?location=cnc">Phòng gần Khu Công nghệ cao</Link>
              </li>
              <li>
                <Link to="/search?price=under-15">Phòng trọ giá rẻ sinh viên &lt; 2tr</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Tiện ích hệ thống</h4>
            <ul className="footer-links">
              <li>
                <Link to="/profile">Hồ sơ cá nhân</Link>
              </li>
              <li>
                <Link to="/favorites">Nhà trọ đã lưu</Link>
              </li>
              <li>
                <Link to="/search">Tìm kiếm phòng trọ</Link>
              </li>
              <li>
                <Link to="/become-host">Đăng ký làm chủ trọ</Link>
              </li>
              <li>
                <a href="/#features">Quy trình xác minh chính chủ</a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Trụ sở hỗ trợ sinh viên</h4>
            <p className="footer-contact-item">📍 Văn phòng: Đường D1, Khu CNC Hòa Lạc, Thạch Thất, Hà Nội</p>
            <p className="footer-contact-item">
              📞 Hotline: <strong>0912 345 678</strong> (8:00 - 21:00)
            </p>
            <p className="footer-contact-item">✉️ Email: support@hlrcs.vn</p>
            <div className="verified-badge-footer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Bảo vệ quyền lợi người thuê phòng trọ</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <p>© 2026 HL_RCS (Rental Connection System). Bản quyền thuộc về Dự án công nghệ HL_RCS.</p>
            <div className="bottom-links">
              <a href="#">Điều khoản sử dụng</a>
              <span className="dot">•</span>
              <a href="#">Chính sách bảo mật</a>
              <span className="dot">•</span>
              <a href="#">Quy chế hoạt động</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
