import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  Info,
  MapPin,
  Pencil,
  Sparkles,
  Star
} from 'lucide-react';
import { MotionButton } from '../motion/MotionUI.jsx';
import HostTermsModal from '../HostTermsModal.jsx';
import { BRAND } from '../../config/brand.js';
import {
  AMENITIES,
  DOCUMENTS,
  REQUIRED_DOCUMENTS,
  STEPS,
  formatRuleLabel,
  validatePropertyStep
} from '../../services/property-registration.js';

function MiniThumb({ file, cover }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <figure className="prw-review-thumb">
      <img src={url || undefined} alt={file.name} />
      {cover && (
        <span className="prw-review-cover-tag">
          <Star size={10} fill="currentColor" aria-hidden="true" /> Đại diện
        </span>
      )}
    </figure>
  );
}

function AccordionCard({ title, Icon, badge, hasIssue = false, defaultOpen = true, onEdit, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`prw-review-card${hasIssue ? ' has-issue' : ''}`}>
      <header className="prw-review-card-head">
        <button
          type="button"
          className="prw-review-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="prw-review-card-icon" aria-hidden="true">
            <Icon size={17} />
          </span>
          <span className="prw-review-card-title">
            <strong>{title}</strong>
            {badge && <small>{badge}</small>}
          </span>
          <ChevronDown
            size={17}
            className={`prw-review-chevron${open ? ' is-open' : ''}`}
            aria-hidden="true"
          />
        </button>

        <MotionButton
          type="button"
          className="prw-edit-btn"
          aria-label={`Chỉnh sửa ${title}`}
          onClick={onEdit}
        >
          <Pencil size={13} aria-hidden="true" />
          <span>Chỉnh sửa</span>
        </MotionButton>
      </header>

      {open && <div className="prw-review-card-body">{children}</div>}
    </section>
  );
}

export default function PropertyReviewStep({
  data,
  errors,
  disabled,
  onEditStep,
  onUpdate
}) {
  const [termsOpen, setTermsOpen] = useState(false);

  // Inspect readiness across Steps 0..4
  const stepIssues = [0, 1, 2, 3, 4]
    .map((idx) => ({
      index: idx,
      label: STEPS[idx],
      issues: Object.values(validatePropertyStep(data, idx))
    }))
    .filter((entry) => entry.issues.length > 0);

  const attachedRequiredDocs = REQUIRED_DOCUMENTS.filter((key) => Boolean(data.documents[key])).length;
  const allReady = stepIssues.length === 0;

  return (
    <div className="prw-step-body">
      {/* Top Completion Readiness Summary */}
      <div className={`prw-readiness-banner ${allReady ? 'is-ready' : 'has-issues'}`} role="status">
        <span className="prw-readiness-icon" aria-hidden="true">
          {allReady ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
        </span>
        <div className="prw-readiness-copy">
          <strong>
            {allReady
              ? 'Hồ sơ nhà trọ đã sẵn sàng gửi xét duyệt'
              : `Còn ${stepIssues.length} mục cần kiểm tra trước khi gửi`}
          </strong>
          <p>
            {allReady
              ? 'Hãy rà soát lại thông tin tóm tắt bên dưới và xác nhận cam kết để hoàn tất.'
              : 'Vui lòng bổ sung các thông tin còn thiếu bằng nút “Sửa ngay” bên cạnh từng mục.'}
          </p>
          {!allReady && (
            <ul className="prw-issue-list">
              {stepIssues.map((entry) => (
                <li key={entry.index}>
                  <span>
                    <strong>Bước {entry.index + 1} ({entry.label}):</strong> {entry.issues[0]}
                  </span>
                  <button type="button" onClick={() => onEditStep(entry.index)}>
                    Sửa ngay
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="prw-readiness-stats">
          <span>{data.photos.length} ảnh</span>
          <span>
            {attachedRequiredDocs}/{REQUIRED_DOCUMENTS.length} giấy tờ
          </span>
        </div>
      </div>

      {/* 5 Collapsible Summary Cards */}
      <div className="prw-review-stack">
        <AccordionCard
          title="1. Thông tin cơ bản"
          Icon={Building2}
          badge={data.name || 'Chưa nhập tên nhà trọ'}
          hasIssue={stepIssues.some((s) => s.index === 0)}
          onEdit={() => onEditStep(0)}
        >
          <dl className="prw-summary-dl">
            <div>
              <dt>Tên nhà trọ</dt>
              <dd>{data.name || 'Chưa cung cấp'}</dd>
            </div>
            <div>
              <dt>Loại hình</dt>
              <dd>{data.propertyType || 'Chưa cung cấp'}</dd>
            </div>
            <div>
              <dt>Người liên hệ &amp; Hotline</dt>
              <dd>
                {data.managerName || '—'} · {data.contactPhone || '—'}
              </dd>
            </div>
            <div>
              <dt>Zalo tư vấn</dt>
              <dd>{data.zaloPhone || 'Dùng chung Hotline'}</dd>
            </div>
            <div className="is-full">
              <dt>Mô tả nhà trọ</dt>
              <dd className="prw-summary-desc">{data.description || 'Chưa cung cấp'}</dd>
            </div>
          </dl>
        </AccordionCard>

        <AccordionCard
          title="2. Vị trí & Bản đồ"
          Icon={MapPin}
          badge={data.commune || 'Chưa chọn khu vực'}
          hasIssue={stepIssues.some((s) => s.index === 1)}
          onEdit={() => onEditStep(1)}
        >
          <dl className="prw-summary-dl">
            <div>
              <dt>Khu vực</dt>
              <dd>{data.commune ? `${data.commune}, Hòa Lạc, Hà Nội` : 'Chưa chọn'}</dd>
            </div>
            <div>
              <dt>Vị trí bản đồ</dt>
              <dd>
                {data.latitude && data.longitude
                  ? `Đã ghim (${data.latitude}, ${data.longitude})`
                  : 'Chưa ghim tọa độ'}
              </dd>
            </div>
            <div className="is-full">
              <dt>Địa chỉ chi tiết</dt>
              <dd>{data.addressDetail || 'Chưa cung cấp'}</dd>
            </div>
            {data.nearby && (
              <div className="is-full">
                <dt>Địa điểm lân cận</dt>
                <dd>{data.nearby}</dd>
              </div>
            )}
          </dl>
        </AccordionCard>

        <AccordionCard
          title="3. Tiện ích & Quy định"
          Icon={Sparkles}
          badge={`${data.amenities.length} tiện ích · ${data.selectedRules.length} quy định`}
          hasIssue={stepIssues.some((s) => s.index === 2)}
          defaultOpen={false}
          onEdit={() => onEditStep(2)}
        >
          <div className="prw-summary-tags-block">
            <span className="prw-summary-sub">Tiện ích chung:</span>
            <div className="prw-tag-list">
              {AMENITIES.filter(([key]) => data.amenities.includes(key)).map(([key, label]) => (
                <span key={key} className="prw-tag">
                  <Check size={12} aria-hidden="true" />
                  {label}
                </span>
              ))}
              {!data.amenities.length && <span className="prw-tag-empty">Chưa chọn tiện ích nào.</span>}
            </div>
          </div>

          <div className="prw-summary-tags-block">
            <span className="prw-summary-sub">Quy định chung:</span>
            <div className="prw-tag-list">
              {data.selectedRules.map((key) => (
                <span key={key} className="prw-tag is-rule">
                  <Check size={12} aria-hidden="true" />
                  {formatRuleLabel(key)}
                </span>
              ))}
              {!data.selectedRules.length && <span className="prw-tag-empty">Chưa chọn quy định nào.</span>}
            </div>
          </div>

          {data.rules && (
            <p className="prw-summary-extra-rule">
              <strong>Quy định bổ sung:</strong> {data.rules}
            </p>
          )}
        </AccordionCard>

        <AccordionCard
          title="4. Hình ảnh nhà trọ"
          Icon={Camera}
          badge={`${data.photos.length} ảnh đã tải`}
          hasIssue={stepIssues.some((s) => s.index === 3)}
          onEdit={() => onEditStep(3)}
        >
          {data.photos.length > 0 ? (
            <div className="prw-review-thumbs">
              {data.photos.map((file, idx) => (
                <MiniThumb
                  key={`${file.name}-${file.lastModified}-${file.size}-${idx}`}
                  file={file}
                  cover={idx === 0}
                />
              ))}
            </div>
          ) : (
            <p className="prw-tag-empty">Chưa có ảnh nhà trọ nào được tải lên.</p>
          )}
        </AccordionCard>

        <AccordionCard
          title="5. Hồ sơ xác minh"
          Icon={FileCheck2}
          badge={`${attachedRequiredDocs}/${REQUIRED_DOCUMENTS.length} giấy tờ bắt buộc`}
          hasIssue={stepIssues.some((s) => s.index === 4)}
          onEdit={() => onEditStep(4)}
        >
          <ul className="prw-review-docs">
            {DOCUMENTS.map(([key, label]) => {
              const doc = data.documents[key];
              const ok = Boolean(doc);
              return (
                <li key={key} className={ok ? 'is-ok' : 'is-missing'}>
                  <span aria-hidden="true">
                    {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {doc?.name ||
                        (REQUIRED_DOCUMENTS.includes(key)
                          ? 'Chưa đính kèm tài liệu bắt buộc.'
                          : 'Chưa đính kèm (tùy chọn).')}
                    </small>
                  </div>
                </li>
              );
            })}
          </ul>
        </AccordionCard>
      </div>

      {/* Terms Confirmation */}
      <section className={`prw-consent-card${errors.termsAccepted ? ' has-error' : ''}`}>
        <label htmlFor="termsAccepted">
          <input
            id="termsAccepted"
            type="checkbox"
            checked={data.termsAccepted}
            disabled={disabled}
            aria-invalid={Boolean(errors.termsAccepted)}
            aria-describedby={errors.termsAccepted ? 'termsAccepted-error' : undefined}
            onChange={(event) => onUpdate('termsAccepted', event.target.checked)}
          />
          <span>
            Tôi xác nhận thông tin đã cung cấp là chính xác và đồng ý với{' '}
            <button
              type="button"
              className="prw-terms-link"
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
        {errors.termsAccepted && (
          <p id="termsAccepted-error" className="prw-field-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{errors.termsAccepted}</span>
          </p>
        )}
      </section>

      <div className="prw-post-submit-info">
        <Info size={17} aria-hidden="true" />
        <p>
          Sau khi gửi, hồ sơ sẽ chuyển sang trạng thái <strong>Chờ thẩm định</strong>. Nhà trọ và quyền Chủ trọ chỉ được kích hoạt sau khi nhân viên {BRAND.name} phê duyệt.
        </p>
      </div>

      {termsOpen && (
        <HostTermsModal
          onClose={() => setTermsOpen(false)}
          onAccept={() => onUpdate('termsAccepted', true)}
        />
      )}
    </div>
  );
}
