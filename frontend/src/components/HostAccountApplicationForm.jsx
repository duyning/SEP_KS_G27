import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  IdCard,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound
} from 'lucide-react';
import { Fade } from '@animate-ui/react/primitives/effects/fade';
import { MotionButton } from './motion/MotionUI.jsx';
import { Modal } from './PortalUI.jsx';
import { ButtonLoading } from './loading/index.js';
import HostIdentityImage from './HostIdentityImage.jsx';
import HostCameraModal from './HostCameraModal.jsx';
import HostTermsModal from './HostTermsModal.jsx';
import { BRAND } from '../config/brand.js';
import '../styles/host-account-application.css';
import '../styles/host-registration-dialogs.css';

const CCCD_SIDES = [
  {
    side: 'front',
    label: 'Mặt trước CCCD',
    fieldKey: 'identityImage',
    buttonId: 'btnChooseIdentity',
    hint: 'Hiển thị rõ ảnh chân dung, số CCCD, họ tên và 4 góc thẻ.'
  },
  {
    side: 'back',
    label: 'Mặt sau CCCD',
    fieldKey: 'identityBackImage',
    buttonId: 'btnChooseIdentityBack',
    hint: 'Hiển thị rõ mã QR, ngày cấp, đặc điểm nhận dạng và 4 góc thẻ.'
  }
];

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function HostAccountApplicationForm({
  user,
  roleLabel,
  application,
  values,
  errors,
  busy,
  alert,
  missingContact,
  identityImage,
  identityBackImage,
  identityMeta = {},
  sideStatus = {},
  onIdentityFile,
  onRemoveIdentity,
  preview,
  onVerifyPhone,
  onAcceptTerms,
  submitLabel = 'Tiếp tục: Thông tin nhà trọ',
  title = 'Thông tin tài khoản & CCCD'
}) {
  const picker = useRef({});
  const cameraInput = useRef({});
  const [draggingSide, setDraggingSide] = useState('');
  const [cameraSide, setCameraSide] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [termsOpen, setTermsOpen] = useState(false);

  const imagesBySide = { front: identityImage, back: identityBackImage };
  const presentBySide = {
    front: Boolean(application?.hasIdentityImage),
    back: Boolean(application?.hasIdentityBackImage)
  };

  function openCamera(side, label) {
    const isCoarsePointer =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches;
    if (isCoarsePointer && cameraInput.current[side]) {
      cameraInput.current[side].click();
      return;
    }
    setCameraSide({ side, label });
  }

  function handleDrop(event, side) {
    event.preventDefault();
    setDraggingSide('');
    if (busy) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) onIdentityFile(file, side);
  }

  function sample(side) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(0, 0, 640, 400);
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 608, 368);
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('ẢNH MẪU XEM TRƯỚC — KHÔNG PHẢI CCCD THẬT', 28, 206);
    onIdentityFile(
      new File([dataBlob(canvas.toDataURL('image/png'))], `anh-mau-${side}.png`, { type: 'image/png' }),
      side
    );
  }

  const noteLength = values.introduction?.length || 0;

  return (
    <section className="haf-form bh-form-card" aria-labelledby="haf-step1-heading">
      <header className="haf-heading">
        <span className="haf-shield" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h2 id="haf-step1-heading">{title}</h2>
          <p>Kiểm tra thông tin tài khoản và cung cấp ảnh hai mặt CCCD rõ nét để nhân viên xác minh.</p>
        </div>
      </header>

      {preview && (
        <p className="haf-preview" role="note">
          <b>Bản xem trước giao diện</b> · Không gửi SMS hoặc hồ sơ thật lên máy chủ.
        </p>
      )}

      {application?.status === 'NEEDS_CHANGES' && (
        <aside className="haf-feedback" role="alert">
          <b>Yêu cầu bổ sung từ nhân viên thẩm định</b>
          <p>{application.reviewerNote}</p>
        </aside>
      )}

      <form id="becomeHostForm" noValidate>
        {/* 5.1 Account Information Card */}
        <section className="haf-section" aria-labelledby="haf-account-title">
          <div className="haf-section-head">
            <h3 id="haf-account-title">
              <UserRound size={17} aria-hidden="true" />
              <span>Thông tin tài khoản</span>
            </h3>
            <Link to="/profile" className="haf-profile-link">
              <PencilLine size={14} aria-hidden="true" />
              <span>Chỉnh sửa tại Hồ sơ cá nhân</span>
            </Link>
          </div>

          <div className="haf-account-card">
            <dl className="haf-account">
              <div>
                <dt>Họ và tên</dt>
                <dd id="accFullName">{user.fullName?.trim() || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Số điện thoại liên hệ</dt>
                <dd id="accPhone">
                  <span>{user.phoneNumber || 'Chưa cập nhật'}</span>
                  <span className={`haf-phone-status${user.phoneVerifiedAt ? ' verified' : ''}`}>
                    {user.phoneVerifiedAt ? (
                      <>
                        <Check size={12} aria-hidden="true" />
                        <span>Đã xác minh</span>
                      </>
                    ) : (
                      <span>Chưa xác minh</span>
                    )}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Email tài khoản</dt>
                <dd id="accEmail">{user.email}</dd>
              </div>
              <div>
                <dt>Vai trò hiện tại</dt>
                <dd id="accRole">{roleLabel}</dd>
              </div>
            </dl>

            {(!user.phoneVerifiedAt || !user.fullName?.trim()) && (
              <div className="haf-account-notices">
                {!user.phoneVerifiedAt && (
                  <div className="haf-contact-note">
                    <span>
                      {user.phoneNumber
                        ? 'Số điện thoại liên hệ chưa được xác minh. Xác minh ngay để tăng độ tin cậy hồ sơ.'
                        : 'Bổ sung và xác minh số điện thoại liên hệ trước khi tiếp tục đăng ký.'}
                    </span>
                    <MotionButton
                      type="button"
                      className="haf-button haf-button-verify"
                      disabled={busy}
                      onClick={onVerifyPhone}
                    >
                      Xác minh số điện thoại
                    </MotionButton>
                  </div>
                )}
                {!user.fullName?.trim() && (
                  <p className="haf-contact-note is-warning" role="alert">
                    <AlertCircle size={15} aria-hidden="true" />
                    <span>
                      Họ và tên đang trống. Vui lòng <Link to="/profile">cập nhật họ tên tại Hồ sơ cá nhân</Link> trước khi gửi hồ sơ.
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 5.2 & 5.3 Identity Documents (CCCD Front & Back) */}
        <section className="haf-section" aria-labelledby="haf-identity-title">
          <div className="haf-section-head">
            <h3 id="haf-identity-title">
              <IdCard size={17} aria-hidden="true" />
              <span>Giấy tờ định danh</span>
            </h3>
            <span className="haf-pill-limit">JPG / PNG · Tối đa 5 MB mỗi ảnh</span>
          </div>
          <p className="haf-upload-limit">
            Vui lòng cung cấp ảnh mặt trước và mặt sau CCCD rõ nét để xác minh thông tin.
          </p>

          <div className="haf-identity-sides">
            {CCCD_SIDES.map(({ side, label, fieldKey, buttonId, hint }) => {
              const image = imagesBySide[side];
              const present = presentBySide[side];
              const meta = identityMeta[side];
              const currentStatus = sideStatus[side] || (image || present ? 'success' : 'empty');
              const hasError = Boolean(errors[fieldKey]);
              const isUploading = currentStatus === 'uploading' || currentStatus === 'reading';
              const isReady = Boolean(image || present);

              return (
                <section
                  key={side}
                  className={`haf-identity-side${draggingSide === side ? ' is-dragging' : ''}${
                    hasError ? ' has-error' : ''
                  }${isReady && !hasError ? ' is-ready' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setDraggingSide(side);
                  }}
                  onDragLeave={() => setDraggingSide('')}
                  onDrop={(e) => handleDrop(e, side)}
                  data-upload-status={hasError ? 'error' : currentStatus}
                >
                  <div className="haf-card-top">
                    <span className="haf-card-icon" aria-hidden="true">
                      <IdCard size={18} />
                    </span>
                    <div className="haf-card-title-wrap">
                      <label htmlFor={fieldKey}>
                        {label} <span className="haf-req" aria-label="bắt buộc">*</span>
                      </label>
                      {isReady && !hasError && (
                        <span className="haf-status-pill is-success">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          <span>Tải thành công</span>
                        </span>
                      )}
                      {isUploading && (
                        <span className="haf-status-pill is-loading" role="status">
                          <LoaderCircle size={13} className="spin" aria-hidden="true" />
                          <span>Đang xử lý ảnh…</span>
                        </span>
                      )}
                      {hasError && (
                        <span className="haf-status-pill is-error">
                          <AlertCircle size={13} aria-hidden="true" />
                          <span>Ảnh không hợp lệ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview or Empty Dropzone */}
                  {image ? (
                    <Fade key={image.slice(-24)} className="haf-preview-stage">
                      <div className="haf-preview-frame">
                        <img
                          className="host-identity-image"
                          src={image}
                          alt={`Ảnh ${label.toLowerCase()} đã chọn`}
                        />
                      </div>
                      <div className="haf-file-meta">
                        <span className="haf-file-name" title={meta?.name || `${label}`}>
                          {meta?.name || 'Ảnh đã sẵn sàng'}
                        </span>
                        {meta?.size ? <small>{formatFileSize(meta.size)}</small> : null}
                      </div>
                      <div className="haf-preview-actions">
                        <MotionButton
                          type="button"
                          className="haf-button haf-btn-sm"
                          disabled={busy}
                          onClick={() => setLightbox({ src: image, label })}
                        >
                          <Eye size={14} aria-hidden="true" />
                          <span>Xem ảnh</span>
                        </MotionButton>
                        <MotionButton
                          type="button"
                          id={buttonId}
                          className="haf-button haf-btn-sm"
                          disabled={busy}
                          onClick={() => picker.current[side]?.click()}
                          aria-label={`Thay ảnh ${label.toLowerCase()}`}
                        >
                          <RefreshCw size={14} aria-hidden="true" />
                          <span>Thay ảnh</span>
                        </MotionButton>
                        <MotionButton
                          type="button"
                          className="haf-button haf-btn-sm is-danger"
                          disabled={busy}
                          onClick={() => onRemoveIdentity(side)}
                          aria-label={`Xóa ảnh ${label.toLowerCase()}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>Xóa</span>
                        </MotionButton>
                      </div>
                    </Fade>
                  ) : present ? (
                    <div className="haf-preview-stage">
                      <div className="haf-preview-frame">
                        <HostIdentityImage id={application.id} present side={side} />
                      </div>
                      <div className="haf-file-meta">
                        <span className="haf-file-name">Ảnh đã lưu trong hồ sơ</span>
                      </div>
                      <div className="haf-preview-actions">
                        <MotionButton
                          type="button"
                          className="haf-button haf-btn-sm"
                          disabled={busy}
                          onClick={() => openCamera(side, label)}
                          aria-label={`Chụp ảnh ${label.toLowerCase()}`}
                        >
                          <Camera size={14} aria-hidden="true" />
                          <span>Chụp lại</span>
                        </MotionButton>
                        <MotionButton
                          type="button"
                          id={buttonId}
                          className="haf-button haf-btn-sm"
                          disabled={busy}
                          onClick={() => picker.current[side]?.click()}
                          aria-label={`Thay ảnh ${label.toLowerCase()}`}
                        >
                          <RefreshCw size={14} aria-hidden="true" />
                          <span>Thay ảnh</span>
                        </MotionButton>
                      </div>
                    </div>
                  ) : (
                    <div className={`haf-dropzone${isUploading ? ' is-loading' : ''}`}>
                      <span className="haf-dropzone-icon" aria-hidden="true">
                        {isUploading ? <LoaderCircle size={22} className="spin" /> : <ImagePlus size={22} />}
                      </span>
                      <p className="haf-dropzone-title">Kéo thả ảnh vào đây hoặc chọn từ thiết bị</p>
                      <p className="haf-dropzone-hint">{hint}</p>
                      <div className="haf-upload-actions">
                        <MotionButton
                          type="button"
                          className="haf-button"
                          disabled={busy}
                          onClick={() => openCamera(side, label)}
                          aria-label={`Chụp ảnh ${label.toLowerCase()}`}
                        >
                          <Camera size={15} aria-hidden="true" />
                          <span>Chụp ảnh</span>
                        </MotionButton>
                        <MotionButton
                          type="button"
                          id={buttonId}
                          className="haf-button haf-button-soft"
                          disabled={busy}
                          onClick={() => picker.current[side]?.click()}
                          aria-label={`Chọn ảnh ${label.toLowerCase()}`}
                        >
                          <ImagePlus size={15} aria-hidden="true" />
                          <span>Chọn ảnh</span>
                        </MotionButton>
                      </div>
                      {preview && (
                        <MotionButton
                          type="button"
                          className="haf-sample-link"
                          disabled={busy}
                          onClick={() => sample(side)}
                        >
                          Dùng ảnh mẫu xem trước ({side === 'front' ? 'mặt trước' : 'mặt sau'})
                        </MotionButton>
                      )}
                    </div>
                  )}

                  <input
                    ref={(element) => {
                      picker.current[side] = element;
                    }}
                    id={fieldKey}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="haf-file"
                    disabled={busy}
                    aria-invalid={hasError}
                    onChange={(e) => {
                      onIdentityFile(e.target.files?.[0], side);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={(element) => {
                      cameraInput.current[side] = element;
                    }}
                    type="file"
                    accept="image/jpeg,image/png"
                    capture="environment"
                    className="haf-file"
                    disabled={busy}
                    aria-label={`Chụp ${label.toLowerCase()}`}
                    onChange={(e) => {
                      onIdentityFile(e.target.files?.[0], side);
                      e.target.value = '';
                    }}
                  />

                  {hasError && (
                    <p className="haf-error" role="alert">
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>{errors[fieldKey]}</span>
                    </p>
                  )}
                </section>
              );
            })}
          </div>

          <div className="haf-photo-guidelines">
            <span>
              <Check size={14} aria-hidden="true" /> Đủ bốn góc thẻ
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> Không bị lóa
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> Không bị mờ
            </span>
            <span>
              <Check size={14} aria-hidden="true" /> Không che thông tin
            </span>
          </div>
        </section>

        {/* 5.4 Optional Reviewer Notes */}
        <section className="haf-section">
          <div className="haf-note-header">
            <label className="haf-note-label" htmlFor="introduction">
              Ghi chú cho nhân viên xét duyệt <span className="haf-optional-badge">Tùy chọn</span>
            </label>
            <small
              id="haf-note-limit"
              className={`haf-char-counter${noteLength > 900 ? ' is-near' : ''}${noteLength > 1000 ? ' is-over' : ''}`}
            >
              {noteLength.toLocaleString('vi-VN')}/1.000 ký tự
            </small>
          </div>
          <textarea
            id="introduction"
            name="introduction"
            rows={3}
            maxLength={1000}
            value={values.introduction}
            disabled={busy}
            aria-invalid={Boolean(errors.introduction)}
            aria-describedby="haf-note-limit"
            placeholder="Thông tin cần giải thích thêm, nếu có..."
          />
          {errors.introduction && (
            <p className="haf-error" role="alert">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errors.introduction}</span>
            </p>
          )}
        </section>

        {/* 5.5 Terms Agreement */}
        <section className={`haf-agreement${errors.agreementAccepted ? ' has-error' : ''}`}>
          <label htmlFor="agreementCheck">
            <input
              id="agreementCheck"
              name="agreementAccepted"
              type="checkbox"
              checked={values.agreementAccepted}
              disabled={busy}
              aria-invalid={Boolean(errors.agreementAccepted)}
              aria-describedby={errors.agreementAccepted ? 'haf-agreement-error' : undefined}
            />
            <span>
              Tôi xác nhận thông tin là chính xác và đồng ý với{' '}
              <button
                type="button"
                className="haf-terms-link"
                onClick={(e) => {
                  e.preventDefault();
                  setTermsOpen(true);
                }}
              >
                Quy chế hoạt động đối tác {BRAND.name}
              </button>
              .
            </span>
          </label>
          {errors.agreementAccepted && (
            <p id="haf-agreement-error" className="haf-error" role="alert">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errors.agreementAccepted}</span>
            </p>
          )}
        </section>

        {alert && (
          <p role="alert" className="haf-alert-banner">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{alert}</span>
          </p>
        )}

        {/* 5.6 Form Footer */}
        <footer className="haf-footer">
          <p className="haf-footer-hint">
            Thông tin đã nhập sẽ được giữ nguyên khi bạn chuyển sang bước tiếp theo hoặc quay lại.
          </p>
          <MotionButton
            type="submit"
            id="btnSubmitForm"
            className="haf-button primary haf-submit-btn"
            disabled={busy}
            aria-busy={busy || undefined}
          >
            <ButtonLoading loading={busy} loadingText="Đang xử lý…">
              <span className="haf-submit-label">
                <span>{submitLabel}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </span>
            </ButtonLoading>
          </MotionButton>
        </footer>
      </form>

      {/* Camera capture modal (triggered only on user click) */}
      {cameraSide && (
        <HostCameraModal
          side={cameraSide.side}
          label={cameraSide.label}
          onCapture={(file) => onIdentityFile(file, cameraSide.side)}
          onFallbackPicker={() => picker.current[cameraSide.side]?.click()}
          onClose={() => setCameraSide(null)}
        />
      )}

      {/* Lightbox preview modal */}
      {lightbox && (
        <Modal
          title={lightbox.label}
          className="hob-lightbox-modal"
          onClose={() => setLightbox(null)}
        >
          <div className="hob-lightbox-body">
            <img src={lightbox.src} alt={lightbox.label} />
          </div>
        </Modal>
      )}

      {/* Terms & Conditions Modal */}
      {termsOpen && (
        <HostTermsModal
          onClose={() => setTermsOpen(false)}
          onAccept={onAcceptTerms}
        />
      )}
    </section>
  );
}

function dataBlob(url) {
  const bytes = atob(url.split(',')[1]);
  return new Uint8Array([...bytes].map((c) => c.charCodeAt(0)));
}
