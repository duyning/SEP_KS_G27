import { useEffect, useRef, useState } from 'react';
import AvailabilityNotice from './AvailabilityNotice.jsx';
import { roomAvailability } from '../services/availability.js';
import {
  Check,
  CheckCircle2,
  Layers,
  LoaderCircle,
  Pencil,
  Ruler,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import HostDrawer from './HostDrawer.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import { hostApi } from '../services/host.js';
import { ROOM_AMENITIES, money } from '../services/room-types.js';
import { editRoom, roomPayload } from '../services/rooms.js';
import { formatFloorHeading, getRoomVisualState } from '../services/host-management.js';

export default function RoomDetailModal({
  room,
  canManage = true,
  onClose,
  onEdit,
  onDelete,
  onQuickSaved,
}) {
  const [quickBusy, setQuickBusy] = useState('');
  const [quickError, setQuickError] = useState('');
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    setQuickError('');
    setQuickBusy('');
  }, [room?.roomId, room?.status, room?.confirmedAt]);

  if (!room) return null;

  const visual = getRoomVisualState(room);
  const confirmation = roomAvailability(room);
  const confirmedCurrent = confirmation.availabilityConfirmationStatus === 'CURRENT';
  const floorLabel = formatFloorHeading(room.floor);

  const quickUpdateStatus = async (nextStatus, actionKey) => {
    if (!canManage || requestRef.current || !onQuickSaved) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setQuickBusy(actionKey);
    setQuickError('');
    try {
      const draft = editRoom(room);
      const payload = roomPayload({ ...draft, status: nextStatus });
      const updated = await hostApi.saveRoom(room.roomId, payload, controller.signal);
      if (!controller.signal.aborted) {
        onQuickSaved(updated, nextStatus !== room.status
          ? `Đã chuyển phòng ${updated.roomNumber} sang "${nextStatus === 'VACANT' ? 'Còn trống' : 'Đang thuê'}".`
          : `Đã xác nhận tình trạng phòng ${updated.roomNumber}.`);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setQuickError(cause.message || 'Không thể cập nhật nhanh tình trạng phòng.');
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setQuickBusy('');
    }
  };

  return (
    <HostDrawer
      size="md"
      kicker={`${floorLabel} · ${room.roomType || 'Loại phòng'}`}
      title={`Phòng ${room.roomNumber}`}
      badge={
        <span className={`hm-room-pill is-${visual.tone}`}>
          <span className="hm-status-dot" aria-hidden="true" />
          {visual.fullLabel}
        </span>
      }
      subtitle={`Giá áp dụng: ${money(room.price)} / tháng${room.customPrice != null ? ' (Giá riêng)' : ''}`}
      onClose={onClose}
      footer={
        <div className="hm-drawer-footer-bar">
          <div className="hm-drawer-footer-left">
            <MotionButton type="button" className="hm-btn" onClick={onClose}>
              Đóng
            </MotionButton>
            {onDelete && (
              <MotionButton
                type="button"
                className="hm-btn hm-btn-danger-outline"
                disabled={!canManage || room.status === 'OCCUPIED' || Boolean(quickBusy)}
                title={
                  room.status === 'OCCUPIED'
                    ? 'Phòng đang thuê. Hãy chuyển sang Còn trống trước khi xóa.'
                    : 'Xóa phòng này'
                }
                onClick={() => onDelete(room)}
              >
                <Trash2 size={15} />
                <span>Xóa phòng</span>
              </MotionButton>
            )}
          </div>
          {onEdit && (
            <MotionButton
              type="button"
              className="hm-btn hm-btn-primary"
              disabled={!canManage || Boolean(quickBusy)}
              onClick={() => onEdit(room)}
            >
              <Pencil size={15} />
              <span>Chỉnh sửa thông tin</span>
            </MotionButton>
          )}
        </div>
      }
    >
      <div className="hm-drawer-sections">
        <dl className="hm-drawer-stat-grid is-three">
          <div className="hm-drawer-stat">
            <dt>
              <Wallet size={14} aria-hidden="true" />
              <span>Giá thuê</span>
            </dt>
            <dd>{money(room.price)}</dd>
          </div>
          <div className="hm-drawer-stat">
            <dt>
              <Ruler size={14} aria-hidden="true" />
              <span>Diện tích</span>
            </dt>
            <dd>{room.areaSqm == null ? 'Chưa rõ' : `${room.areaSqm} m²`}</dd>
          </div>
          <div className="hm-drawer-stat">
            <dt>
              <Users size={14} aria-hidden="true" />
              <span>Sức chứa</span>
            </dt>
            <dd>{room.capacity == null ? 'Chưa rõ' : `${room.capacity} người`}</dd>
          </div>
        </dl>

        {canManage && onQuickSaved && (
          <section className="hm-drawer-section hm-quick-status-box" aria-label="Cập nhật nhanh tình trạng">
            <header className="hm-drawer-section-head">
              <h3>Cập nhật nhanh tình trạng</h3>
              {!room.confirmedAt && <span className="hm-badge tone-warning">Chưa xác nhận</span>}
              {confirmation.availabilityConfirmationStatus === 'STALE' && <span className="hm-badge tone-warning">Quá 7 ngày chưa xác nhận</span>}
            </header>
            <div className="hm-quick-status-grid">
              {[
                ['VACANT', 'Còn trống', 'Sẵn sàng đón khách thuê'],
                ['OCCUPIED', 'Đang thuê', 'Đang có khách lưu trú'],
              ].map(([value, label, hint]) => {
                const isCurrent = room.status === value;
                const actionKey = `status-${value}`;
                return (
                  <MotionButton
                    key={value}
                    type="button"
                    aria-pressed={isCurrent}
                    disabled={Boolean(quickBusy) || (isCurrent && confirmedCurrent)}
                    className={`hm-quick-choice is-${value.toLowerCase()} ${isCurrent ? 'is-selected' : ''}`}
                    onClick={() => quickUpdateStatus(value, actionKey)}
                  >
                    <div className="hm-quick-choice-top">
                      <span className="hm-status-dot" aria-hidden="true" />
                      <strong>{label}</strong>
                      {quickBusy === actionKey ? (
                        <LoaderCircle size={14} className="spin" />
                      ) : isCurrent && room.confirmedAt ? (
                        <CheckCircle2 size={14} />
                      ) : null}
                    </div>
                    <small>{isCurrent && !confirmedCurrent ? 'Nhấn để xác nhận lại trạng thái này' : hint}</small>
                  </MotionButton>
                );
              })}
            </div>
            {quickError && (
              <p className="hm-inline-error" role="alert">
                {quickError}
              </p>
            )}
          </section>
        )}

        <section className="hm-drawer-section">
          <header className="hm-drawer-section-head">
            <h3>Thông tin phòng & giá áp dụng</h3>
          </header>
          <dl className="hm-kv-list">
            <div className="hm-kv-row">
              <dt>Số phòng</dt>
              <dd>
                <strong>{room.roomNumber}</strong>
              </dd>
            </div>
            <div className="hm-kv-row">
              <dt>Tầng / Khu vực</dt>
              <dd>{floorLabel}</dd>
            </div>
            <div className="hm-kv-row">
              <dt>Loại phòng</dt>
              <dd className="hm-inline-icon-text">
                <Layers size={14} aria-hidden="true" />
                <span>{room.roomType || 'Chưa liên kết'}</span>
              </dd>
            </div>
            <div className="hm-kv-row">
              <dt>Tiền đặt cọc</dt>
              <dd>{money(room.deposit)}</dd>
            </div>
            <div className="hm-kv-row">
              <dt>Cơ chế giá thuê</dt>
              <dd>
                {room.customPrice == null ? (
                  <span>Theo niêm yết loại phòng</span>
                ) : (
                  <span className="hm-badge tone-info">Giá riêng cho phòng</span>
                )}
              </dd>
            </div>
            <div className="hm-kv-row">
              <dt>Xác nhận gần nhất</dt>
              <dd>
                <AvailabilityNotice value={confirmation}/>
              </dd>
            </div>
          </dl>
        </section>

        <section className="hm-drawer-section">
          <header className="hm-drawer-section-head">
            <h3>Tiện nghi kế thừa từ loại phòng</h3>
            <span className="hm-section-meta">{(room.amenities || []).length} tiện nghi</span>
          </header>
          {room.amenities?.length ? (
            <ul className="hm-chip-list">
              {room.amenities.map(key => (
                <li key={key} className="hm-chip">
                  <Check size={13} aria-hidden="true" />
                  <span>{ROOM_AMENITIES.find(([val]) => val === key)?.[1] || key}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hm-muted">Chưa cập nhật tiện nghi cho loại phòng này.</p>
          )}
        </section>
      </div>
    </HostDrawer>
  );
}
