import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FileText, History, LoaderCircle, LogOut, UserPlus, Users } from 'lucide-react';
import { MotionButton } from './motion/MotionUI.jsx';
import RoomContractsPanel from './RoomContractsPanel.jsx';
import { roomTenanciesApi } from '../services/room-tenancies.js';
import { roomUtilitiesPath } from '../services/room-utilities.js';
import { roomBillingPath } from '../services/room-billing.js';
import { leaseDateLabel } from '../services/rooms.js';
import { money } from '../services/room-types.js';
import '../styles/room-tenancy.css';

const amount = value => value == null ? 'Chưa cập nhật' : money(value);
const nameInitials = name => name.trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toLocaleUpperCase('vi');
const signatureLabel = lease => lease.landlordSigned && lease.tenantSigned ? 'Hai bên đã ký'
  : lease.landlordSigned ? 'Chủ trọ đã ký' : lease.tenantSigned ? 'Người thuê đã ký' : 'Chờ ký';

function LeaseFacts({ lease }) {
  return <dl className="ht-lease-facts">
    {[
      ['Bắt đầu thuê', leaseDateLabel(lease.startDate)],
      [lease.closedDate ? 'Ngày trả phòng' : 'Dự kiến kết thúc', leaseDateLabel(lease.closedDate || lease.endDate)],
      ['Tiền thuê / tháng', amount(lease.monthlyRent)],
      ['Tiền cọc', amount(lease.deposit)],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
}

function OccupantList({ people, onLeave }) {
  return <ul className="ht-lease-people">
    {people.map(person => <li key={person.id ?? person.name}>
      <div className="ht-lease-avatar" aria-hidden="true">{nameInitials(person.name)}</div>
      <div className="ht-lease-person">
        <div><strong>{person.name}</strong><span className="ht-lease-tag">{person.primaryTenant ? 'Người thuê chính' : 'Người ở cùng'}</span></div>
        <small>{person.phone && <a href={`tel:${person.phone.replace(/[^+\d]/g, '')}`}>{person.phone}</a>}
          <span>Vào ở {leaseDateLabel(person.joinedOn)}</span>
          {person.leftOn && <span>Rời phòng {leaseDateLabel(person.leftOn)}</span>}
        </small>
      </div>
      {onLeave && !person.primaryTenant && !person.leftOn && (
        <button type="button" className="hm-btn" data-lease-action={`leave-${person.id}`} onClick={event => onLeave(person, event.currentTarget)}>Ghi nhận rời phòng</button>
      )}
    </li>)}
  </ul>;
}

function TenancyHistory({ profile, room }) {
  if (!profile.history.length) return <section className="ht-lease-card ht-lease-empty">
    <h3><History aria-hidden="true" size={18} /> Chưa có đợt thuê đã kết thúc</h3>
    <p>Hồ sơ đã kết thúc sẽ xuất hiện tại đây.</p>
  </section>;
  return <section className="ht-lease-card ht-lease-history">
    <h3><History aria-hidden="true" size={18} /> Đợt thuê đã kết thúc</h3>
    {profile.history.map(lease => <details key={lease.key}>
      <summary><strong>{lease.occupants.find(person => person.primaryTenant)?.name || 'Người thuê'}</strong>
        <span>{leaseDateLabel(lease.startDate)} – {leaseDateLabel(lease.closedDate)}</span>
      </summary>
      <LeaseFacts lease={lease} />
      <OccupantList people={lease.occupants} />
      <div className="ht-lease-actions">
        <Link className="hm-btn" to={roomUtilitiesPath(room.propertyId, room.roomId, lease.closedDate.slice(0, 7))}>Điện nước bàn giao</Link>
        <Link className="hm-btn" to={roomBillingPath(room.propertyId, room.roomId, lease.closedDate.slice(0, 7))}>Phiếu thu &amp; công nợ</Link>
        {lease.contractId && <RoomContractsPanel room={room} contractId={lease.contractId} label="Xem hợp đồng" />}
      </div>
    </details>)}
  </section>;
}

function TenancyForm({ action, room, profile, busy, error, onCancel, onSubmit }) {
  const lease = profile.current;
  const starting = action.kind === 'start';
  const adding = action.kind === 'add';
  const leaving = action.kind === 'leave';
  const closing = action.kind === 'close';
  const occupied = room.status === 'OCCUPIED';
  const title = starting ? occupied ? 'Bổ sung hồ sơ đợt thuê' : 'Tạo đợt thuê'
    : adding ? 'Thêm người ở cùng' : leaving ? 'Ghi nhận rời phòng' : 'Xác nhận trả phòng';
  const submitLabel = starting ? 'Lưu hồ sơ thuê' : adding ? 'Lưu người ở cùng' : leaving ? 'Xác nhận rời phòng' : 'Xác nhận kết thúc';
  const dateHint = closing || leaving ? 'Ngày thực tế' : 'Ngày vào ở';
  const defaultJoined = profile.today < lease?.startDate ? lease.startDate : profile.today > lease?.endDate ? lease.endDate : profile.today;
  const minimum = closing ? lease.startDate <= profile.today ? lease.startDate : profile.today : action.person?.joinedOn;
  const firstInput = useRef(null);
  useEffect(() => { firstInput.current?.focus(); }, []);
  function submit(event) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if ('phone' in fields) fields.phone = fields.phone.trim() || null;
    if ('name' in fields) fields.name = fields.name.trim();
    onSubmit(fields);
  }
  return <form className="ht-lease-card ht-lease-form" onSubmit={submit} aria-label={title} aria-busy={busy}>
    <h3>{title}</h3>
    {starting && occupied && room.leaseStartDate && room.leaseEndDate && <p>Ngày thuê được điền sẵn từ thông tin phòng.</p>}
    {closing && <p>Hồ sơ được lưu trong lịch sử. Phòng chuyển sang <strong>Còn trống</strong>. Bạn có thể chốt chỉ số bàn giao ở bước tiếp theo.</p>}
    {leaving && <p>Lưu ngày rời phòng của <strong>{action.person.name}</strong> trong hồ sơ đợt thuê.</p>}
    <fieldset disabled={busy} className="ht-lease-fields">
      {(starting || adding) && <>
        <label>{starting ? 'Họ và tên người thuê chính' : 'Họ và tên người ở cùng'}
          <input ref={firstInput} name="name" autoComplete="off" required minLength={2} maxLength={150} />
        </label>
        <label>{adding ? 'Số điện thoại (tùy chọn)' : 'Số điện thoại'}
          <input type="tel" name="phone" autoComplete="off" required={starting} minLength={8} maxLength={20} />
        </label>
      </>}
      {starting && <>
        <label>Ngày bắt đầu<input type="date" name="startDate" defaultValue={room.leaseStartDate || profile.today} min="0001-01-01" max="9999-12-31" required /></label>
        <label>Dự kiến kết thúc<input type="date" name="endDate" defaultValue={room.leaseEndDate || ''} min="0001-01-01" max="9999-12-31" required /></label>
      </>}
      {adding && <label>{dateHint}<input type="date" name="joinedOn" defaultValue={defaultJoined} min={lease.startDate} max={lease.endDate} required /></label>}
      {(closing || leaving) && <label>{dateHint}<input ref={firstInput} type="date" name="date" defaultValue={profile.today} min={minimum} max={profile.today} required /></label>}
    </fieldset>
    {error && <p className="ht-lease-error" role="alert">{error}</p>}
    <div className="ht-lease-actions">
      <MotionButton type="button" className="hm-btn" onClick={onCancel} disabled={busy}>Hủy</MotionButton>
      <MotionButton type="submit" className={`hm-btn ${closing ? 'hm-btn-danger-outline' : 'hm-btn-primary'}`} disabled={busy}>
        {busy && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
        {busy ? 'Đang lưu…' : submitLabel}
      </MotionButton>
    </div>
  </form>;
}

export default function RoomTenancyPanel({ room, canManage, section, onSectionChange, onRoomSaved, onCreateContract }) {
  const [profile, setProfile] = useState(null);
  const [action, setAction] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const [handoverDate, setHandoverDate] = useState('');
  const pending = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const { roomId } = room;

  useEffect(() => {
    const controller = new AbortController();
    roomTenanciesApi.load(roomId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setProfile(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [roomId, retry]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (section === 'history') setAction(null);
  }, [section]);

  function reload() {
    setError('');
    setRetry(n => n + 1);
  }

  function open(kind, source, person) {
    trigger.current = source;
    setNotice('');
    setError('');
    setAction({ kind, person });
  }

  function cancel() {
    setError('');
    setAction(null);
    requestAnimationFrame(() => panel.current?.querySelector(`[data-lease-action="${trigger.current?.dataset.leaseAction || ''}"]`)?.focus());
  }

  async function save(payload) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    const key = profile.current?.key;
    try {
      const operations = {
        start: () => roomTenanciesApi.start(roomId, payload, controller.signal),
        add: () => roomTenanciesApi.add(roomId, key, payload, controller.signal),
        leave: () => roomTenanciesApi.leave(roomId, key, action.person.id, payload.date, controller.signal),
        close: () => roomTenanciesApi.close(roomId, key, payload.date, controller.signal),
      };
      const data = await operations[action.kind]();
      if (controller.signal.aborted) return;
      setProfile(data.profile || data);
      setNotice({
        start: 'Đã lưu hồ sơ đợt thuê.',
        add: 'Đã thêm người ở cùng.',
        leave: 'Đã lưu ngày rời phòng.',
        close: 'Đã kết thúc đợt thuê. Phòng hiện còn trống.',
      }[action.kind]);
      if (data.room) onRoomSaved?.(data.room);
      if (action.kind === 'close') {
        setHandoverDate(payload.date);
        onSectionChange('history');
      }
      setAction(null);
      requestAnimationFrame(() => panel.current?.focus());
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Chưa lưu được hồ sơ. Vui lòng thử lại.');
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const current = profile?.current;
  const activePeople = current?.occupants.filter(person => !person.leftOn);
  const formerPeople = current?.occupants.filter(person => person.leftOn);
  return <div className="ht-lease-panel" ref={panel} tabIndex={-1} aria-label="Hồ sơ thuê phòng">
    {notice && <p className="ht-lease-notice" role="status">{notice}</p>}
    {handoverDate && section === 'history' && <div className="ht-lease-actions">
      <Link className="hm-btn hm-btn-primary" to={roomUtilitiesPath(room.propertyId, room.roomId, handoverDate.slice(0, 7))}>Chốt điện nước bàn giao</Link>
    </div>}
    {!profile ? error ? <section className="ht-lease-card ht-lease-empty">
      <p className="ht-lease-error" role="alert">{error}</p><button type="button" className="hm-btn" onClick={reload}>Thử lại</button>
    </section> : <p className="ht-lease-loading" role="status"><LoaderCircle size={16} className="spin" aria-hidden="true" /> Đang tải hồ sơ đợt thuê…</p>
      : action && section !== 'history' ? <TenancyForm action={action} room={room} profile={profile} busy={busy} error={error} onSubmit={save} onCancel={cancel} />
        : section === 'history' ? <TenancyHistory profile={profile} room={room} />
          : current ? <>
            <section className="ht-lease-card ht-lease-current">
              <header className="ht-lease-line"><h3><CalendarDays size={18} aria-hidden="true" /> Kỳ thuê hiện tại</h3>
              </header>
              <LeaseFacts lease={current} />
              <div className="ht-lease-line">
                <Link className="hm-btn" to={roomUtilitiesPath(room.propertyId, room.roomId)}>Ghi điện nước</Link>
                <Link className="hm-btn" to={roomBillingPath(room.propertyId, room.roomId)}>Phiếu thu &amp; công nợ</Link>
              </div>
            </section>
            <section className="ht-lease-card">
              <header className="ht-lease-line">
                <h3><Users size={18} aria-hidden="true" /> Người đang ở ({activePeople.length})</h3>
                {canManage && <MotionButton type="button" className="hm-btn hm-btn-primary" data-lease-action="add" onClick={event => open('add', event.currentTarget)}>
                  <UserPlus size={16} aria-hidden="true" /> Thêm người ở cùng
                </MotionButton>}
              </header>
              <OccupantList people={activePeople} onLeave={canManage ? (person, source) => open('leave', source, person) : undefined} />
              {formerPeople.length > 0 && <details className="ht-lease-former"><summary>Đã rời phòng ({formerPeople.length})</summary><OccupantList people={formerPeople} /></details>}
            </section>
            <section className="ht-lease-card ht-lease-line">
              <div>
                <h3><FileText size={18} aria-hidden="true" /> Hợp đồng thuê phòng</h3>
                <span className="ht-lease-tag" data-pending={!current.contractId || !current.landlordSigned || !current.tenantSigned}>
                  {current.contractId ? signatureLabel(current) : 'Chưa có hợp đồng'}
                </span>
              </div>
              {current.contractId ? <RoomContractsPanel room={room} contractId={current.contractId} label="Xem hợp đồng" onReaderClosed={reload} /> :
                canManage && onCreateContract && <MotionButton type="button" className="hm-btn" onClick={() => onCreateContract(current)}>
                  Tạo hợp đồng
                </MotionButton>}
            </section>
            {canManage && <div className="ht-lease-actions">
              <MotionButton type="button" className="hm-btn" data-lease-action="close" onClick={event => open('close', event.currentTarget)}>
                <LogOut size={16} aria-hidden="true" /> Kết thúc đợt thuê
              </MotionButton>
            </div>}
          </> : <section className="ht-lease-card ht-lease-empty">
            <h3>{room.status === 'OCCUPIED' ? 'Phòng chưa có hồ sơ đợt thuê' : 'Chưa có đợt thuê hiện tại'}</h3>
            <p>{room.status === 'OCCUPIED' ? 'Bổ sung người thuê chính và kiểm tra ngày thuê của phòng.' : 'Tạo hồ sơ khi có người nhận phòng để theo dõi đợt thuê.'}</p>
            {canManage && <MotionButton type="button" className="hm-btn hm-btn-primary" data-lease-action="start" onClick={event => open('start', event.currentTarget)}>
              {room.status === 'OCCUPIED' ? 'Bổ sung hồ sơ' : 'Tạo đợt thuê'}
            </MotionButton>}
          </section>}
    {profile && !action && error && <p role="alert" className="ht-lease-error">{error} <button type="button" className="hm-btn" onClick={reload}>Thử lại</button></p>}
  </div>;
}
