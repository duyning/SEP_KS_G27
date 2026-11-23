import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  IdCard,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload
} from 'lucide-react';
import { Modal } from '../PortalUI.jsx';
import { MotionButton } from '../motion/MotionUI.jsx';
import HostIdentityImage from '../HostIdentityImage.jsx';
import { DOCUMENTS, REQUIRED_DOCUMENTS } from '../../services/property-registration.js';

const DOC_DESCRIPTIONS = {
  ownership:
    'Bản chụp hoặc scan rõ nét Giấy phép kinh doanh hộ kinh doanh / cơ sở lưu trú. Nếu quản lý thay chủ cơ sở, đính kèm văn bản ủy quyền trong cùng tệp.',
  idCard:
    'Tự động tái sử dụng ảnh CCCD từ hồ sơ chủ trọ đã duyệt. Chỉ cần tải lại nếu bạn muốn cập nhật bản mới.',
  fireSafety:
    'Bản chụp hoặc scan rõ nét Chứng nhận / Biên bản kiểm tra an toàn phòng cháy chữa cháy (PCCC) của cơ sở.'
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function DocumentPreviewModal({ file, label, onClose }) {
  const [url, setUrl] = useState('');
  const isPdf = file?.type === 'application/pdf';

  useEffect(() => {
    if (!(file instanceof Blob)) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <Modal title={`Xem trước: ${label}`} className="prw-doc-preview-modal" onClose={onClose}>
      <div className="prw-doc-preview-body">
        {!url ? (
          <p>Không thể xem trước tệp này trực tiếp.</p>
        ) : isPdf ? (
          <iframe title={label} src={url} className="prw-pdf-frame" />
        ) : (
          <img src={url} alt={label} className="prw-doc-img-preview" />
        )}
      </div>
    </Modal>
  );
}

export default function PropertyVerificationStep({
  documents,
  errors,
  disabled,
  onboarding,
  identityApplicationId,
  hasIdentityBackImage,
  identityPreview,
  onAddDocument,
  onRemoveDocument
}) {
  const [previewDoc, setPreviewDoc] = useState(null);
  const inputRefs = useRef({});
  const visibleDocs = DOCUMENTS.filter(([key]) => !onboarding || key !== 'idCard');

  return (
    <div className="prw-step-body">
      {/* Security Commitment Banner */}
      <div className="prw-privacy-banner" role="note">
        <span className="prw-privacy-icon" aria-hidden="true">
          <LockKeyhole size={18} />
        </span>
        <div>
          <strong>Cam kết bảo mật hồ sơ xác minh</strong>
          <p>
            Các tài liệu dưới đây không hiển thị công khai trên trang tìm phòng, không lưu vào bộ nhớ cục bộ của trình duyệt và chỉ nhân viên có thẩm quyền mới được phép truy cập khi thẩm định.
          </p>
        </div>
      </div>

      {/* Document Cards */}
      <div className="prw-doc-list">
        {visibleDocs.map(([key, label]) => {
          const required = REQUIRED_DOCUMENTS.includes(key);
          const file = documents[key];
          const isSavedIdentity = Boolean(file?.savedIdentity);
          const canPreviewBlob = file instanceof Blob;
          const hasError = Boolean(errors[key]);

          return (
            <section
              key={key}
              className={`prw-doc-card${file ? ' is-attached' : ''}${hasError ? ' has-error' : ''}`}
            >
              <div className="prw-doc-card-head">
                <div className="prw-doc-title-row">
                  <span className="prw-doc-icon" aria-hidden="true">
                    {key === 'idCard' ? <IdCard size={18} /> : <FileText size={18} />}
                  </span>
                  <div>
                    <label htmlFor={key} className="prw-doc-title">
                      {label}
                    </label>
                    <p id={`${key}-hint`} className="prw-doc-desc">
                      {DOC_DESCRIPTIONS[key]} Hỗ trợ PDF, JPG, PNG, WEBP · Tối đa 10 MB.
                    </p>
                  </div>
                </div>

                <div className="prw-doc-badges">
                  <span className={`prw-doc-badge ${required ? 'is-required' : 'is-optional'}`}>
                    {required ? 'Bắt buộc' : 'Tùy chọn'}
                  </span>
                  {file && (
                    <span className="prw-doc-badge is-success">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      <span>Đã đính kèm</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="prw-doc-slot">
                <div className="prw-doc-file-info">
                  <FileText size={17} aria-hidden="true" />
                  <div>
                    <strong>{file?.name || 'Chưa tải lên tệp tài liệu'}</strong>
                    {file?.size ? <small>{formatBytes(file.size)}</small> : null}
                    {isSavedIdentity && (
                      <small className="is-reused">
                        <Check size={12} aria-hidden="true" /> Tái sử dụng tự động từ hồ sơ chủ trọ
                      </small>
                    )}
                  </div>
                </div>

                <div className="prw-doc-actions">
                  {canPreviewBlob && (
                    <MotionButton
                      type="button"
                      className="prw-btn prw-btn-sm prw-btn-secondary"
                      disabled={disabled}
                      onClick={() => setPreviewDoc({ file, label })}
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>Xem trước</span>
                    </MotionButton>
                  )}

                  <MotionButton
                    type="button"
                    className={`prw-btn prw-btn-sm ${file ? 'prw-btn-secondary' : 'prw-btn-soft'}`}
                    disabled={disabled}
                    onClick={() => inputRefs.current[key]?.click()}
                  >
                    {file ? <RefreshCw size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                    <span>{file ? 'Thay tệp' : 'Chọn tệp (PDF/JPG)'}</span>
                  </MotionButton>

                  {file && !isSavedIdentity && (
                    <MotionButton
                      type="button"
                      className="prw-btn prw-btn-sm prw-btn-danger"
                      disabled={disabled}
                      aria-label={`Xóa ${label}`}
                      onClick={() => onRemoveDocument(key)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>Xóa</span>
                    </MotionButton>
                  )}
                </div>

                <input
                  ref={(el) => {
                    inputRefs.current[key] = el;
                  }}
                  id={key}
                  type="file"
                  className="prw-sr-file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={disabled}
                  aria-required={required && !isSavedIdentity}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? `${key}-hint ${key}-error` : `${key}-hint`}
                  onChange={(event) => onAddDocument(key, event)}
                />
              </div>

              {key === 'idCard' && isSavedIdentity && identityApplicationId && (
                <details className="prw-collapsible prw-saved-id-details">
                  <summary>
                    <Eye size={14} aria-hidden="true" />
                    <span>Xem lại CCCD đã lưu trong hồ sơ chủ trọ</span>
                  </summary>
                  <div className="prw-collapsible-body">
                    <HostIdentityImage id={identityApplicationId} present backPresent={hasIdentityBackImage} />
                  </div>
                </details>
              )}

              {hasError && (
                <p id={`${key}-error`} className="prw-field-error" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{errors[key]}</span>
                </p>
              )}
            </section>
          );
        })}

        {/* Reused CCCD from Onboarding Step 1 (no re-upload required!) */}
        {onboarding && (
          <section className="prw-doc-card is-attached is-reused-card">
            <div className="prw-doc-card-head">
              <div className="prw-doc-title-row">
                <span className="prw-doc-icon success" aria-hidden="true">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h4 className="prw-doc-title">Căn cước công dân (CCCD) chủ trọ</h4>
                  <p className="prw-doc-desc">
                    Đã tự động tái sử dụng ảnh mặt trước và mặt sau CCCD bạn cung cấp ở giai đoạn Tài khoản &amp; CCCD. Không cần tải lên lại.
                  </p>
                </div>
              </div>
              <span className="prw-doc-badge is-success">
                <CheckCircle2 size={12} aria-hidden="true" />
                <span>Đã đồng bộ</span>
              </span>
            </div>

            {identityPreview && (
              <details className="prw-collapsible prw-saved-id-details">
                <summary>
                  <Eye size={14} aria-hidden="true" />
                  <span>Xem trước ảnh CCCD hai mặt đang đính kèm</span>
                </summary>
                <div className="prw-collapsible-body">{identityPreview}</div>
              </details>
            )}
          </section>
        )}
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          file={previewDoc.file}
          label={previewDoc.label}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
