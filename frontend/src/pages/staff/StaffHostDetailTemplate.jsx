import { useState } from 'react';
import { motion } from 'motion/react';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { Link } from 'react-router-dom';
import {
  applicantCapacities,
  rentalExperiences,
  applicationFieldLabel,
  hostApplicationFieldLabels
} from '../../services/host-applications.js';
import {
  ArrowLeft,
  ChevronDown,
  Check,
  FilePenLine,
  History,
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  X
} from 'lucide-react';

export default function StaffHostDetailTemplate(props) {
  const a = props.application;
  const [expanded, setExpanded] = useState(false);
  const [guidance, setGuidance] = useState(false);
  const reduce = useShouldReduceMotion();
  const { transition } = useMotionTokens();
  const requestedFields = Array.isArray(a.requestedFields) ? a.requestedFields : [];

  return (
    <div className="sha-page sha-detail" onClick={props.onClick}>
      <div className="sha-record-toolbar">
        <Link className="sha-back" to={props.backHref || '/staff/host-registrations'}>
          <ArrowLeft size={15} />
          Danh sách đăng ký
        </Link>
        <div className="sha-record-meta">
          {props.statusBadge}
        </div>
      </div>

      <div className="sha-detail-layout">
        <div className="sha-detail-main">
          <section className="sha-panel sha-detail-panel sha-profile-panel">
            <header>
              <h3>
                <UserRound size={18} />
                Người đăng ký &amp; Thông tin liên hệ
              </h3>
              <span className={`sha-role ${a.status === 'APPROVED' ? 'is-host' : ''}`}>
                {a.status === 'APPROVED' ? 'Tài khoản Chủ trọ' : 'Tài khoản Người dùng'}
              </span>
            </header>

            <div className="sha-applicant">
              <span className="sha-avatar" aria-hidden="true">
                {(a.userName || 'U').charAt(0).toUpperCase()}
              </span>
              <div className="sha-applicant-body">
                <strong id="detailApplicantName">{a.userName || 'Chưa cập nhật họ tên'}</strong>
              </div>
            </div>

            <dl className="sha-contact">
              <div>
                <dt>
                  <Phone size={13} />
                  Số điện thoại
                </dt>
                <dd className="sha-contact-dd">
                  <span id="detailApplicantPhone">{a.userPhone || 'Chưa cung cấp'}</span>
                  {a.userPhone && props.renderCopyButton?.('detail-phone', a.userPhone, 'số điện thoại')}
                </dd>
              </div>
              <div>
                <dt>
                  <Mail size={13} />
                  Email
                </dt>
                <dd className="sha-contact-dd">
                  <span id="detailApplicantEmail" title={a.userEmail || ''}>
                    {a.userEmail || 'Chưa cung cấp'}
                  </span>
                  {a.userEmail && props.renderCopyButton?.('detail-email', a.userEmail, 'email')}
                </dd>
              </div>
            </dl>
          </section>

          <section className="sha-panel sha-detail-panel">
            <header>
              <h3>
                <ShieldCheck size={18} />
                Thông tin đăng ký
              </h3>
            </header>

            <dl className="sha-scope">
              <div>
                <dt>Tư cách cho thuê</dt>
                <dd>{applicationFieldLabel(applicantCapacities, a.applicantCapacity)}</dd>
              </div>
              <div>
                <dt>Kinh nghiệm quản lý</dt>
                <dd>{applicationFieldLabel(rentalExperiences, a.rentalExperience)}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={13} />
                  Khu vực dự kiến
                </dt>
                <dd id="detailTargetCommune">{a.targetCommune || 'Chưa cung cấp'}</dd>
              </div>
              <div>
                <dt>
                  <Users size={13} />
                  Quy mô dự kiến
                </dt>
                <dd id="detailExpectedScale">{a.expectedScale || 'Chưa cung cấp'}</dd>
              </div>
            </dl>

            <div className="sha-intro-block">
              <h4 className="sha-field-title">Giới thiệu &amp; Kế hoạch vận hành</h4>
              <p
                className={`sha-introduction ${!expanded && a.introduction?.length > 300 ? 'is-collapsed' : ''}`}
                id="detailIntroduction"
              >
                {a.introduction || 'Chưa có nội dung giới thiệu.'}
              </p>
              {a.introduction?.length > 300 && (
                <MotionButton
                  type="button"
                  className="sha-expand"
                  aria-expanded={expanded}
                  aria-controls="detailIntroduction"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? 'Thu gọn' : 'Xem đầy đủ'}
                </MotionButton>
              )}
            </div>

            {a.status === 'NEEDS_CHANGES' && requestedFields.length > 0 && (
              <div className="sha-requested-fields">
                <strong>Mục đang yêu cầu bổ sung ({requestedFields.length}):</strong>
                <div className="sha-requested-tags">
                  {requestedFields.map((fieldKey) => (
                    <span className="sha-requested-tag" key={fieldKey}>
                      {hostApplicationFieldLabels[fieldKey] || fieldKey}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="sha-note">
              <Info size={16} />
              <p>
                Phê duyệt hồ sơ sẽ cấp quyền Chủ trọ cho tài khoản. Nhà trọ cụ thể cần được đăng ký và xác minh riêng
                trước khi hiển thị công khai.
              </p>
            </div>
          </section>

          <section className="sha-panel sha-detail-panel">
            <header>
              <h3>
                <History size={18} />
                Lịch sử xét duyệt
              </h3>
            </header>
            <div className="sha-history" id="detailTimelineContainer">
              {props.history}
            </div>
          </section>
        </div>

        <aside className={`sha-detail-aside ${a.status !== 'PENDING_REVIEW' ? 'is-terminal' : ''}`}>
          <section className="sha-panel sha-detail-panel sha-decision">
            <header>
              <h3>Quyết định xét duyệt</h3>
            </header>

            <dl className="sha-summary">
              <div>
                <dt>Trạng thái</dt>
                <dd>{props.statusBadge}</dd>
              </div>
              <div>
                <dt>Ngày gửi</dt>
                <dd id="overviewSubmittedAt">{props.date(a.submittedAt)}</dd>
              </div>
              <div>
                <dt>Cập nhật</dt>
                <dd id="overviewUpdatedAt">{props.date(a.updatedAt)}</dd>
              </div>
              <div>
                <dt>Người xử lý</dt>
                <dd id="overviewReviewedBy">{a.reviewedBy || 'Chưa xử lý'}</dd>
              </div>
              {a.reviewedAt && (
                <div>
                  <dt>Thời gian xử lý</dt>
                  <dd id="overviewReviewedAt">{props.date(a.reviewedAt)}</dd>
                </div>
              )}
            </dl>

            {a.status === 'PENDING_REVIEW' ? (
              <div id="decisionActionGroup" className="sha-decisions">
                <MotionButton type="button" id="btnTriggerApprove" className="sha-button primary">
                  <Check size={16} />
                  Phê duyệt đăng ký
                </MotionButton>
                <MotionButton type="button" id="btnTriggerRequestChanges" className="sha-button warning">
                  <FilePenLine size={16} />
                  Yêu cầu bổ sung thông tin
                </MotionButton>
                <MotionButton type="button" id="btnTriggerReject" className="sha-button danger">
                  <X size={16} />
                  Từ chối hồ sơ
                </MotionButton>
                <p>Quyết định chỉ được lưu sau khi xác nhận trong hộp thoại.</p>
              </div>
            ) : (
              <div id="decisionTerminalGroup">{props.terminal}</div>
            )}
          </section>

          <section className="sha-panel sha-guidance">
            <MotionButton
              type="button"
              className="sha-guidance-toggle"
              aria-expanded={guidance}
              aria-controls="sha-review-guidance"
              onClick={() => setGuidance((value) => !value)}
            >
              <Info size={16} />
              Lưu ý khi xét duyệt
              <ChevronDown size={16} className={guidance ? 'is-open' : ''} />
            </MotionButton>
            <AnimatePresence initial={false}>
              {guidance && (
                <motion.div
                  id="sha-review-guidance"
                  initial={{ height: reduce ? 'auto' : 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: transition.disclosure }}
                  exit={{ height: reduce ? 'auto' : 0, opacity: 0, transition: transition.dismiss }}
                >
                  <ul>
                    <li>Đối chiếu thông tin liên hệ và khu vực dự kiến hoạt động.</li>
                    <li>Đọc kỹ quy mô, kế hoạch và nội dung giới thiệu.</li>
                    <li>Khi yêu cầu bổ sung, chọn đúng trường và hướng dẫn cụ thể.</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </aside>
      </div>
    </div>
  );
}
