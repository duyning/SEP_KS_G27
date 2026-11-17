import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/reverification.css';

export default function ReverificationNotice({ required, reasons = [], status, note, registrationId, staff = false, compact = false }) {
  if (!required) return null;
  const approved = staff && status === 'APPROVED';
  const needsAction = ['NEEDS_SUPPLEMENT', 'REJECTED'].includes(status);
  return <section className={`reverification-notice${compact ? ' is-compact' : ''}`} aria-label="Tái xác minh nhà trọ">
    <span className="reverification-icon"><ShieldAlert size={19} aria-hidden="true"/></span>
    <div className="reverification-content"><strong className="reverification-title">{approved ? 'Đã tái xác minh thông tin quan trọng' : compact ? 'Tạm ẩn chờ tái xác minh' : 'Nhà trọ tạm ẩn — cần tái xác minh'}</strong>
      {!compact && registrationId && <span className="reverification-meta">Đề nghị #{registrationId} · {status === 'NEEDS_SUPPLEMENT' ? 'Cần bổ sung' : status === 'REJECTED' ? 'Đã từ chối' : 'Chờ xét duyệt'}</span>}
      <p>{approved ? 'Phiên bản mới đã được duyệt. Việc hiển thị công khai tiếp tục tuân theo trạng thái hoạt động của nhà trọ.'
        : needsAction ? 'Hồ sơ chưa được duyệt. Nhà trọ tiếp tục tạm ẩn; chủ trọ cần chỉnh sửa hoặc bổ sung và gửi lại.'
        : compact ? 'Nhà trọ sẽ hiển thị lại sau khi hồ sơ được duyệt.' : 'Nhà trọ tạm ngừng hiển thị công khai trong thời gian staff xét duyệt thay đổi.'}</p>
      {reasons.length > 0 && <dl className="reverification-reasons"><dt>{compact ? 'Cần xác minh' : 'Nội dung cần xác minh'}</dt><dd>{reasons.join('; ')}</dd></dl>}
      {note && needsAction && <div className="reverification-feedback"><b>Phản hồi của staff</b><p>{note}</p></div>}
      {!staff && needsAction && registrationId && <Link to={`/host/property/edit?registrationId=${registrationId}`}>Chỉnh sửa / bổ sung hồ sơ tái xác minh</Link>}
    </div>
  </section>;
}
