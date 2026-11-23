import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/reverification.css';

export default function ReverificationNotice({ required, reasons = [], status, note, registrationId, staff = false }) {
  if (!required) return null;
  const approved = staff && status === 'APPROVED';
  const needsAction = ['NEEDS_SUPPLEMENT', 'REJECTED'].includes(status);
  return <section className="reverification-notice" aria-label="Tái xác minh nhà trọ">
    <ShieldAlert size={21} aria-hidden="true"/>
    <div><strong>{approved ? 'Đã tái xác minh thông tin quan trọng' : 'Nhà trọ tạm ẩn — cần tái xác minh'}</strong>
      <p>{approved ? 'Phiên bản mới đã được duyệt. Việc hiển thị công khai tiếp tục tuân theo trạng thái hoạt động của nhà trọ.'
        : needsAction ? 'Hồ sơ chưa được duyệt. Nhà trọ tiếp tục tạm ẩn; chủ trọ cần chỉnh sửa hoặc bổ sung và gửi lại.'
        : 'Thay đổi thông tin quan trọng đang chờ staff xét duyệt. Nhà trọ không hiển thị trên trang tìm phòng và đường dẫn công khai.'}</p>
      {reasons.length > 0 && <p><b>Nội dung cần xác minh:</b> {reasons.join('; ')}.</p>}
      {note && needsAction && <p><b>Phản hồi của staff:</b> {note}</p>}
      {!staff && needsAction && registrationId && <Link to={`/host/property/edit?registrationId=${registrationId}`}>Chỉnh sửa / bổ sung hồ sơ tái xác minh</Link>}
    </div>
  </section>;
}
