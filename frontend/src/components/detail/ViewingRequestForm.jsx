import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Modal } from '../PortalUI.jsx';
import { detailPhone } from '../../services/accommodation-detail.js';
import { formatViewingDate, viewingApi, viewingIsFuture, viewingLink, viewingStatuses, VIEWING_MAX_DAYS, viewingDateRange } from '../../services/viewings.js';
import '../../styles/viewing-flow.css';

export default function ViewingRequestForm({ item, user, pending, onClose, onSaved, onViewSaved }) {
  const formId = useId();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const range = viewingDateRange();
  const title = pending ? 'Cập nhật lịch xem phòng' : 'Gửi lịch xem phòng';

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    const fields = new FormData(event.currentTarget);
    const scheduledDate = fields.get('date') + 'T' + fields.get('time');
    const name = fields.get('name').trim();
    const contactPhone = detailPhone(fields.get('phone'));
    if (!name || !contactPhone || !viewingIsFuture(scheduledDate) || fields.get('date') > viewingDateRange().max) {
      setError('Nhập tên, số điện thoại di động Việt Nam và chọn giờ trong 30 ngày tới.');
      return;
    }

    inFlight.current = true;
    setBusy(true);
    try {
      const payload = {
        propertyId: item.propertyId, roomTypeId: item.roomTypeId, scheduledDate,
        contactName: name, contactPhone, note: fields.get('note').trim(),
      };
      const saved = await (pending ? viewingApi.update(pending.bookingId, payload) : viewingApi.create(payload));
      setResult(saved);
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <Modal title={title} className="detail-prototype-modal viewing-dialog"
    onClose={() => { if (!inFlight.current) onClose(); }}>
    <div className="viewing-form">
      <p><strong>{item.propertyName} · {item.roomTypeName}</strong>{item.address && <><br />{item.address}</>}</p>
      {result ? <>
        <p role="status"><strong>{pending ? 'Đã cập nhật lịch' : viewingStatuses[result.status]}</strong> · {formatViewingDate(result.scheduledDate)}</p>
        {onViewSaved
          ? <button type="button" className="p-button primary" onClick={onViewSaved}>Xem yêu cầu #{result.bookingId}</button>
          : <Link className="p-button primary" to={viewingLink(result.bookingId)}>Xem yêu cầu #{result.bookingId}</Link>}
      </> : <form onSubmit={submit}>
        <p id={formId}>Chọn giờ Việt Nam (UTC+7), tối đa {VIEWING_MAX_DAYS} ngày tới. Lịch cần chủ trọ xác nhận và không giữ chỗ.</p>
        <fieldset disabled={busy} aria-describedby={formId}>
          <div className="viewing-fields">
            <label>Ngày xem<input type="date" required min={range.min} max={range.max} name="date" defaultValue={pending?.scheduledDate?.slice(0, 10)} /></label>
            <label>Giờ xem<input type="time" required name="time" defaultValue={pending?.scheduledDate?.slice(11, 16)} /></label>
            <label>Tên liên hệ<input autoComplete="name" required maxLength={120} name="name" defaultValue={pending?.renterName ?? user.fullName ?? ''} /></label>
            <label>Số điện thoại<input type="tel" autoComplete="tel" required maxLength={40} name="phone" defaultValue={pending?.renterPhone ?? user.phoneNumber ?? ''} /></label>
          </div>
          <label>Ghi chú (không bắt buộc)<textarea rows={3} maxLength={1000} name="note" defaultValue={pending?.note ?? ''} /></label>
        </fieldset>
        {error && <p className="viewing-error" role="alert">{error}</p>}
        <div className="viewing-actions">
          <button type="button" className="p-button" disabled={busy} onClick={onClose}>Đóng</button>
          <button type="submit" className="p-button primary" disabled={busy}><CalendarDays size={16} />{busy ? 'Đang lưu…' : pending ? 'Lưu cập nhật' : 'Gửi yêu cầu'}</button>
        </div>
      </form>}
    </div>
  </Modal>;
}
