import { Check, Clock3, DoorOpen, Layers, Pencil, Ruler, Users, Wallet } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { MotionButton } from './motion/MotionUI.jsx';
import { ROOM_AMENITIES, money } from '../services/room-types.js';
import { roomStatusLabels } from '../services/rooms.js';
import '../styles/room-modals.css';

const confirmedDate = value => {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa xác nhận';
};

export default function RoomDetailModal({ room, onClose, onEdit }) {
  return <Modal className="hr-detail rm-dialog" title={`Phòng ${room.roomNumber}`} onClose={onClose}>
    <div className="rm-scroll">
      <section className="rm-room-context"><div><span className="rm-kicker"><Layers size={14} />Loại phòng liên kết</span><h3>{room.roomType}</h3><span className="rm-floor">{room.floor || 'Chưa cập nhật tầng'}</span></div>
        <span className={`rm-status ${room.status === 'VACANT' ? 'vacant' : 'occupied'}`}>{roomStatusLabels[room.status] || 'Chưa xác nhận'}</span>
      </section>
      <dl className="rm-stats">{[[Wallet, 'Giá áp dụng', money(room.price), room.price == null ? null : '/ tháng'], [Ruler, 'Diện tích', room.areaSqm == null ? 'Chưa cập nhật' : `${room.areaSqm} m²`], [Users, 'Sức chứa', room.capacity == null ? 'Chưa cập nhật' : `${room.capacity} người`]].map(([Icon,label,value,unit]) => <div key={label}><dt><Icon size={15}/>{label}</dt><dd>{value}{unit && <small>{unit}</small>}</dd></div>)}</dl>
      <div className="rm-detail-grid">
        <section className="rm-section"><header><h3>Thông tin giá thuê</h3></header><dl className="rm-facts"><div><dt>Tiền đặt cọc</dt><dd>{money(room.deposit)}</dd></div><div><dt>Cách tính giá</dt><dd>{room.customPrice == null ? 'Theo loại phòng' : 'Giá riêng cho phòng'}</dd></div></dl></section>
        <section className={`rm-section rm-confirmation ${room.confirmedAt ? '' : 'unconfirmed'}`}><header><h3>{room.confirmedAt ? <Check size={16}/> : <Clock3 size={16}/>}Xác nhận tình trạng</h3></header><strong>{confirmedDate(room.confirmedAt)}</strong><p>{room.confirmedAt ? 'Thời điểm chủ trọ xác nhận tình trạng phòng gần nhất.' : 'Chủ trọ chưa xác nhận tình trạng thực tế của phòng này.'}</p></section>
      </div>
      <section className="rm-section"><header><h3>Tiện nghi trong phòng</h3><span>{room.amenities.length} tiện nghi</span></header>{room.amenities.length ? <ul className="rm-amenities">{room.amenities.map(key => <li key={key}><Check size={15}/>{ROOM_AMENITIES.find(([value]) => value === key)?.[1] || key}</li>)}</ul> : <p className="rm-muted">Chưa cập nhật tiện nghi từ loại phòng.</p>}</section>
    </div>
    <footer className="hr-modal-footer rm-footer"><MotionButton type="button" className="p-button" onClick={onClose}>Đóng</MotionButton><MotionButton type="button" className="p-button primary" onClick={() => onEdit(room)}><Pencil size={15}/>Chỉnh sửa thông tin</MotionButton></footer>
  </Modal>;
}
