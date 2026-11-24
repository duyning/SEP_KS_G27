import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Clock3,
  FileCheck2,
  Hash,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { MotionButton } from './motion/MotionUI.jsx';

const STATUS_META = {
  PENDING: {
    label: 'Chờ thẩm định',
    title: 'Hồ sơ đang chờ nhân viên thẩm định',
    description:
      'Hồ sơ đăng ký chủ trọ và nhà trọ đầu tiên đã được tiếp nhận. Đội ngũ nhân viên sẽ kiểm tra CCCD và thông tin nhà trọ của bạn.',
    nextStep:
      'Bạn không cần thao tác thêm lúc này. Kết quả thẩm định sẽ hiển thị trực tiếp tại đây và gửi qua thông báo tài khoản.',
    Icon: Clock3
  },
  NEEDS_SUPPLEMENT: {
    label: 'Yêu cầu bổ sung thông tin',
    title: 'Hồ sơ cần bổ sung thông tin',
    description:
      'Nhân viên thẩm định đã gửi ghi chú yêu cầu bổ sung. Vui lòng cập nhật các mục liên quan và gửi lại hồ sơ để tiếp tục xét duyệt.',
    nextStep:
      'Đọc kỹ phản hồi bên dưới, bấm “Bổ sung & gửi lại hồ sơ” và gửi lại để nhân viên kiểm tra tiếp.',
    Icon: AlertCircle
  },
  REJECTED: {
    label: 'Bị từ chối',
    title: 'Hồ sơ chưa được phê duyệt',
    description:
      'Hồ sơ hiện chưa đáp ứng tiêu chuẩn xét duyệt đối tác. Vui lòng xem lý do chi tiết bên dưới để chỉnh sửa và nộp lại.',
    nextStep:
      'Kiểm tra phản hồi xét duyệt, khắc phục thông tin hoặc giấy tờ chưa đạt rồi gửi lại hồ sơ.',
    Icon: XCircle
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    title: 'Hồ sơ đã được phê duyệt',
    description:
      'Chúc mừng! Quyền Chủ trọ và hồ sơ nhà trọ đầu tiên của bạn đã được nhân viên phê duyệt chính thức.',
    nextStep:
      'Bấm “Cập nhật trạng thái” để đồng bộ quyền Chủ trọ và mở Host Portal quản lý nhà trọ của bạn.',
    Icon: FileCheck2
  }
};

export default function HostOnboardingStatus({
  registration,
  refreshing,
  editing,
  error,
  onRefresh,
  onEdit
}) {
  const state = STATUS_META[registration.status] || STATUS_META.PENDING;
  const Icon = state.Icon;
  const pending = registration.status === 'PENDING';
  const approved = registration.status === 'APPROVED';
  const needsAction = ['NEEDS_SUPPLEMENT', 'REJECTED'].includes(registration.status);

  const date = registration.createdAt ? new Date(registration.createdAt) : null;
  const submitted =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
      : '—';

  const code = `HS-${String(registration.registrationId).padStart(5, '0')}`;

  return (
    <section
      className={`onboarding-review tone-${registration.status.toLowerCase()}`}
      aria-labelledby="onboarding-review-title"
      aria-busy={refreshing || editing}
    >
      <header className="onboarding-review-heading">
        <span className="onboarding-review-icon" aria-hidden="true">
          <Icon size={24} />
        </span>
        <div>
          <span className="onboarding-review-badge" role="status">
            {state.label}
          </span>
          <h2 id="onboarding-review-title">{state.title}</h2>
          <p>{state.description}</p>
        </div>
      </header>

      <div className="onboarding-review-meta-grid">
        <div className="onboarding-review-meta-item">
          <Hash size={17} aria-hidden="true" />
          <div>
            <span>Mã hồ sơ</span>
            <strong>{code}</strong>
          </div>
        </div>
        <div className="onboarding-review-meta-item">
          <Building2 size={17} aria-hidden="true" />
          <div>
            <span>Nhà trọ đăng ký</span>
            <strong>{registration.name}</strong>
          </div>
        </div>
        <div className="onboarding-review-meta-item">
          <CalendarClock size={17} aria-hidden="true" />
          <div>
            <span>Ngày gửi hồ sơ</span>
            <time dateTime={registration.createdAt || undefined}>{submitted}</time>
          </div>
        </div>
      </div>

      <ol className="onboarding-review-progress" aria-label="Tiến trình xét duyệt">
        <li className="done">
          <span>
            <Check size={15} aria-hidden="true" />
          </span>
          <div>
            <strong>Đã nộp hồ sơ</strong>
            <small>Hệ thống đã tiếp nhận</small>
          </div>
        </li>
        <li
          className={approved ? 'done' : pending ? 'current' : 'attention'}
          aria-current={pending || needsAction ? 'step' : undefined}
        >
          <span>
            {approved ? (
              <Check size={15} aria-hidden="true" />
            ) : needsAction ? (
              <AlertCircle size={15} aria-hidden="true" />
            ) : (
              <Clock3 size={15} aria-hidden="true" />
            )}
          </span>
          <div>
            <strong>Nhân viên thẩm định</strong>
            <small>
              {approved
                ? 'Đã hoàn tất kiểm tra'
                : needsAction
                  ? 'Cần bổ sung theo phản hồi'
                  : 'Đang chờ nhân viên kiểm tra'}
            </small>
          </div>
        </li>
        <li className={approved ? 'done' : ''} aria-current={approved ? 'step' : undefined}>
          <span>
            {approved ? <Check size={15} aria-hidden="true" /> : <FileCheck2 size={15} aria-hidden="true" />}
          </span>
          <div>
            <strong>Kết quả &amp; cấp quyền</strong>
            <small>{approved ? 'Đã cấp quyền Chủ trọ' : 'Kích hoạt khi được phê duyệt'}</small>
          </div>
        </li>
      </ol>

      {registration.reasonNote && (
        <div className="onboarding-review-note" role="region" aria-label="Phản hồi từ nhân viên xét duyệt">
          <strong>Ghi chú phản hồi từ nhân viên thẩm định</strong>
          <p>{registration.reasonNote}</p>
        </div>
      )}

      <div className="onboarding-review-next">
        <strong>Hướng dẫn bước tiếp theo</strong>
        <p>{state.nextStep}</p>
      </div>

      <footer className="onboarding-review-footer">
        <p>
          {pending
            ? 'Quyền Chủ trọ và nhà trọ đầu tiên được xét duyệt cùng nhau. Nhà trọ chưa hiển thị công khai trong thời gian chờ duyệt.'
            : 'Mọi thay đổi trạng thái hồ sơ được đồng bộ trực tiếp từ hệ thống thẩm định.'}
        </p>
        <div className="onboarding-review-actions">
          {needsAction && (
            <MotionButton
              type="button"
              className="hob-btn hob-btn-primary"
              disabled={refreshing || editing}
              onClick={onEdit}
            >
              {editing ? 'Đang mở hồ sơ…' : 'Bổ sung & gửi lại hồ sơ'}
            </MotionButton>
          )}
          {approved && (
            <Link className="hob-btn hob-btn-primary" to="/host">
              <span>Vào Host Portal</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <MotionButton
            type="button"
            className="hob-btn hob-btn-secondary onboarding-review-refresh"
            disabled={refreshing || editing}
            onClick={onRefresh}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} aria-hidden="true" />
            <span>{refreshing ? 'Đang cập nhật…' : 'Cập nhật trạng thái'}</span>
          </MotionButton>
        </div>
      </footer>

      {error && (
        <p className="onboarding-review-error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </section>
  );
}
