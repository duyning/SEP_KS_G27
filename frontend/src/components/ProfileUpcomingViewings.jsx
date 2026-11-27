import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, RefreshCw } from 'lucide-react';
import { ViewingStatus } from './ViewingUI.jsx';
import { formatViewingSlot, viewingLink } from '../services/viewings.js';
import '../styles/profile-appointments.css';

export default function ProfileUpcomingViewings({ items, error, reload }) {
  if (error) return <div className="profile-appointments-state" role="alert"><p>{error}</p><button type="button" className="btn-secondary" onClick={reload}><RefreshCw size={16} aria-hidden="true" />Thử lại</button></div>;
  if (items === undefined) return <p className="profile-appointments-state" role="status">Đang tải lịch hẹn sắp tới…</p>;
  if (!items.length) return <div className="profile-appointments-state profile-appointments-empty" role="status">
    <CalendarDays size={40} strokeWidth={1.6} aria-hidden="true" />
    <h3>Bạn chưa có lịch hẹn xem phòng sắp tới</h3>
    <p>Các lịch đã hủy, bị từ chối hoặc đã qua giờ hẹn được lưu tại trang Lịch xem phòng.</p>
    <Link className="btn-primary-action" to="/search">Tìm phòng và đặt lịch</Link>
  </div>;
  return <div className="appointment-list-wrap" id="profileApptList">{items.map(item =>
    <article className="appointment-item-card" key={item.bookingId}>
      <div className="appointment-main-info">
        <div className="profile-appointment-title"><h3 className="appointment-room-title">{item.propertyName}</h3><span className="profile-appointment-type">{item.roomType}</span></div>
        <p className="appointment-meta-row"><CalendarDays size={16} aria-hidden="true" /><time dateTime={item.scheduledDate}>{formatViewingSlot(item.scheduledDate)}</time></p>
        <ViewingStatus status={item.status} />
      </div>
      <Link className="btn-secondary" to={viewingLink(item.bookingId)} aria-label={`Xem lịch #${item.bookingId} tại ${item.propertyName}`}>Xem chi tiết<ChevronRight size={16} aria-hidden="true" /></Link>
    </article>
  )}</div>;
}
