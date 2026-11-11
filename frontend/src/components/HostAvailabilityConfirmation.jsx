import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { hostApi } from '../services/host.js';
import AvailabilityNotice from './AvailabilityNotice.jsx';
import { Modal } from './PortalUI.jsx';

export default function HostAvailabilityConfirmation({ type, onConfirmed }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lock = useRef(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  async function confirm() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const controller = new AbortController(); request.current = controller;
    try {
      const saved = await hostApi.confirmAvailability(type.roomTypeId, controller.signal);
      if (!controller.signal.aborted) {
        onConfirmed(saved); setOpen(false);
        setSuccess('Đã xác nhận tình trạng phòng.');
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Không thể xác nhận. Vui lòng thử lại.');
    } finally {
      lock.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <div className="host-availability-confirmation">
    <AvailabilityNotice value={type}/>
    <button type="button" className="hm-btn hm-btn-ghost" disabled={!type.totalRooms || busy}
      onClick={() => {setOpen(true); setError(''); setSuccess('');}}>Xác nhận tình trạng phòng</button>
    {!type.totalRooms && <small>Cần có phòng thực tế trước khi xác nhận.</small>}
    <span role="status">{success}</span>
    {open && <Modal title={`Xác nhận tình trạng — ${type.roomType}`} onClose={() => {if (!busy) setOpen(false);}}>
      <p>Hãy kiểm tra danh sách phòng trước khi xác nhận: <strong>{type.vacantRooms} phòng trống / {type.totalRooms} phòng</strong>.</p>
      <p>Thao tác này cập nhật mốc xác nhận của loại phòng và tất cả phòng thuộc loại này, giữ nguyên trạng thái từng phòng. Nếu số lượng chưa đúng, hãy cập nhật danh sách phòng trước.</p>
      <Link to={`/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`}>Kiểm tra danh sách phòng</Link>
      {error && <p role="alert" className="availability-error">{error}</p>}
      <div className="availability-actions">
        <button type="button" className="hm-btn hm-btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Hủy</button>
        <button type="button" className="hm-btn hm-btn-primary" disabled={busy} aria-busy={busy} onClick={confirm}>{busy ? 'Đang xác nhận…' : 'Thông tin hiện tại chính xác'}</button>
      </div>
    </Modal>}
  </div>;
}
