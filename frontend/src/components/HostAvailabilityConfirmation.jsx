import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { hostApi } from '../services/host.js';
import AvailabilityNotice from './AvailabilityNotice.jsx';
import { Modal } from './PortalUI.jsx';
import { Clock3, CircleCheck, RefreshCw, TriangleAlert, DoorOpen, ArrowUpRight, Info } from 'lucide-react';
import { AnimatePresence, MotionButton } from './motion/MotionUI.jsx';
import { availabilityPresentation } from '../services/availability.js';

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
  const { state } = availabilityPresentation(type);
  const Icon = state === 'CURRENT' ? CircleCheck : state === 'STALE' ? TriangleAlert : Clock3;
  return <div className="host-availability-confirmation" data-state={state}>
    <div className="host-availability-summary">
      <span className="host-availability-icon"><Icon size={19} aria-hidden="true"/></span>
      <div className="host-availability-copy"><span className="host-availability-label">Thông tin phòng trống</span>
        <strong>{state === 'CURRENT' ? 'Đã xác nhận' : state === 'STALE' ? 'Cần xác nhận lại' : 'Chưa được xác nhận'}</strong>
        {state === 'UNCONFIRMED' ? <p>Kiểm tra danh sách phòng và xác nhận để cập nhật thông tin cho người thuê.</p> : <AvailabilityNotice value={type}/>}
      </div>
    </div>
    <button type="button" className="hm-btn hm-btn-ghost host-availability-button" disabled={!type.totalRooms || busy}
      onClick={() => {setOpen(true); setError(''); setSuccess('');}}><RefreshCw size={15} aria-hidden="true"/>Xác nhận tình trạng phòng</button>
    {!type.totalRooms && <small>Cần có phòng thực tế trước khi xác nhận.</small>}
    <span role="status">{success}</span>
    <AnimatePresence>{open && <Modal className="availability-confirm-modal" title="Xác nhận tình trạng phòng" onClose={() => {if (!busy) setOpen(false);}}>
      <div className="acm-body">
        <div className="acm-context"><span className="acm-icon"><DoorOpen size={21} aria-hidden="true"/></span><div><span>Loại phòng</span><h3>{type.roomType}</h3></div></div>
        <dl className="acm-stats"><div><dt>Phòng còn trống</dt><dd>{type.vacantRooms}<span>phòng</span></dd></div><div><dt>Tổng số phòng</dt><dd>{type.totalRooms}<span>phòng</span></dd></div></dl>
        <div className="acm-note"><Info size={17} aria-hidden="true"/><p>Xác nhận sẽ cập nhật thời gian kiểm tra cho loại phòng và các phòng bên trong. Trạng thái từng phòng được giữ nguyên.</p></div>
        <Link className="acm-room-link" to={`/host/rooms?propertyId=${type.propertyId}&roomTypeId=${type.roomTypeId}`} onClick={event => {if (busy) event.preventDefault();}} aria-disabled={busy || undefined}>Kiểm tra danh sách phòng<ArrowUpRight size={16} aria-hidden="true"/></Link>
      {error && <p role="alert" className="availability-error">{error}</p>}
      </div>
      <div className="availability-actions acm-footer">
        <MotionButton type="button" className="hm-btn hm-btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Hủy</MotionButton>
        <MotionButton type="button" className="hm-btn hm-btn-primary" disabled={busy} aria-busy={busy} onClick={confirm}><CircleCheck size={17} aria-hidden="true"/>{busy ? 'Đang xác nhận…' : 'Thông tin hiện tại chính xác'}</MotionButton>
      </div>
    </Modal>}</AnimatePresence>
  </div>;
}
