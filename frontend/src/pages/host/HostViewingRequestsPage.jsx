import { MotionButton } from '../../components/motion/MotionUI.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useViewingUpdates } from '../../hooks/useViewingUpdates.js';
import { hostApi } from '../../services/host.js';
import HostSetupRequired from '../../components/HostSetupRequired.jsx';

import { Modal, StateView, useToast } from '../../components/PortalUI.jsx';
import { useViewingData, ViewingDetails, ViewingStatus } from '../../components/ViewingUI.jsx';
import { viewingApi, canReviewViewing, viewingStatuses, viewingDateRange } from '../../services/viewings.js';


import '../../styles/host-viewings-page.css';


export function ViewingsNoProperty() {
 return <HostSetupRequired kind="viewings"/>;
}

function ViewingDecision({ item, availableRooms, onDecision, onRefresh, onBusy }) {
  const inFlight = useRef(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const withinReviewWindow = canReviewViewing(item.scheduledDate);
  const canApprove = withinReviewWindow && availableRooms > 0;

  async function decide(status) {
    if (inFlight.current) return;
    setError(null);
    if (status === 'REJECTED' && !reason.trim()) {
      setError({ message: 'Vui lòng nhập lý do từ chối.' });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    onBusy(true);
    try {
      onDecision(await viewingApi.decide(item.bookingId, { status, expectedScheduledDate: item.scheduledDate, ...(status === 'REJECTED' ? { reason: reason.trim() } : {}) }));
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusy(false);
    }
  }

  return <form className="viewing-decision" onSubmit={event => { event.preventDefault(); void decide('REJECTED'); }}>
    {!withinReviewWindow && <p>Lịch đã quá hạn phản hồi và sẽ được hệ thống hủy.</p>}
    {rejecting && <label>Lý do từ chối<textarea autoFocus required rows={3} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>}
    {error && <p role="alert" className="viewing-error">{error.message}</p>}
    <div className="viewing-actions">
      {rejecting ? <>
        <button type="button" className="p-button" disabled={busy} onClick={() => { setRejecting(false); setError(null); }}>Quay lại</button>
        <button type="submit" className="p-button primary" disabled={busy || !withinReviewWindow}>{busy ? 'Đang lưu…' : 'Gửi từ chối'}</button>
      </> : <>
        <button type="button" className="p-button primary" disabled={busy || !canApprove} onClick={() => decide('APPROVED')}>{busy ? 'Đang lưu…' : 'Xác nhận lịch'}</button>
        <button type="button" className="p-button" disabled={busy || !withinReviewWindow} onClick={() => setRejecting(true)}>Từ chối</button>
      </>}
      {error?.status === 409 && <button type="button" className="p-button" onClick={onRefresh}>Tải lại kết quả</button>}
    </div>
  </form>;
}

function HostViewingDetail({ item, canDecide, onDecision, onRefresh, onBusy }) {
  const load = useCallback(signal => viewingApi.availability(item.bookingId, signal), [item.bookingId]);
  const { data: availableRooms, error, reload } = useViewingData(load, item.bookingId);
  return <>
    <ViewingDetails item={item} />
    <div className="host-viewings-availability">
      {error ? <><p role="alert">{error}</p><button type="button" className="p-button" onClick={reload}>Kiểm tra lại phòng trống</button></>
        : <p role="status">{availableRooms === undefined ? 'Đang kiểm tra phòng trống…' : availableRooms > 0
          ? `Còn ${availableRooms} phòng trống thuộc loại này.` : 'Loại phòng này hiện đã hết phòng trống.'}</p>}
    </div>
    {item.status === 'PENDING' && canDecide && <ViewingDecision item={item} availableRooms={availableRooms}
      onDecision={onDecision} onRefresh={onRefresh} onBusy={onBusy} />}
  </>;
}

const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const colors = ['#0f766e', '#2563eb', '#be185d', '#a16207', '#7c3aed', '#c2410c'];
const dateKey = date => date.toISOString().slice(0, 10);
const displayDate = key => key.split('-').reverse().join('/');

function ViewingCalendar({ day, today, month, requests, properties, propertyColors, onDay, onMonth }) {
  const first = new Date(month + '-01T00:00:00Z');
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const byDay = new Map();
  for (const item of requests) {
    const key = item.scheduledDate.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(item);
  }

  return <section className="host-calendar-panel" aria-label="Lịch xem phòng">
    <div className="host-calendar-heading">
      <h2><CalendarDays size={20} aria-hidden="true" />Lịch xem phòng</h2>
      <div className="host-calendar-month">
        <button type="button" className="p-button" aria-label="Tháng trước" onClick={() => onMonth(-1)}><ChevronLeft size={17} /></button>
        <strong aria-live="polite">Tháng {monthIndex + 1}/{year}</strong>
        <button type="button" className="p-button" aria-label="Tháng sau" onClick={() => onMonth(1)}><ChevronRight size={17} /></button>
        <button type="button" className="p-button" onClick={() => onDay(today)}>Hôm nay</button>
      </div>
    </div>
    <ul className="host-calendar-legend" aria-label="Màu theo nhà trọ">{properties.map(property =>
      <li key={property.propertyId}><span className="host-calendar-dot" style={{ backgroundColor: propertyColors.get(property.propertyId) }} />{property.name}</li>
    )}</ul>
    <div className="host-calendar-grid">
      {weekdays.map((label, index) => <span key={label} className="host-calendar-weekday"><span>{label}</span><abbr title={label}>{index === 6 ? 'CN' : 'T' + (index + 2)}</abbr></span>)}
      {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
        const date = new Date(Date.UTC(year, monthIndex, index - offset + 1));
        const key = dateKey(date);
        const items = byDay.get(key) || [];
        const propertyIds = [...new Set(items.map(item => item.propertyId))];
        return <button type="button" key={key} className={key.startsWith(month) ? '' : 'outside'}
          aria-pressed={key === day} aria-current={key === today ? 'date' : undefined}
          aria-label={`Ngày ${displayDate(key)}, ${items.length} yêu cầu`} onClick={() => onDay(key)}>
          <span>{date.getUTCDate()}</span>
          <span className="host-calendar-markers" aria-hidden="true">{propertyIds.slice(0, 3).map(id =>
            <i key={id} className="host-calendar-dot" style={{ backgroundColor: propertyColors.get(id) }} />)}
            {propertyIds.length > 3 && <small>+{propertyIds.length - 3}</small>}</span>
        </button>;
      })}
    </div>
  </section>;
}

function ViewingSchedule({ data, property, selected, canDecide, onRefresh, onDecision }) {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const today = viewingDateRange().min;
  const requestedDay = selected?.scheduledDate.slice(0, 10) || params.get('date');
  const day = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(requestedDay || '') ? requestedDay : today;
  const month = day.slice(0, 7);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('tab') === 'processed' ? 'processed' : '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [checked, setChecked] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [batchError, setBatchError] = useState('');
  const propertyColors = new Map(data.properties.map((item, index) => [item.propertyId, colors[index % colors.length]]));
  const requests = data.viewings.filter(item => !property || item.propertyId === property.propertyId);
  const daily = requests.filter(item => item.scheduledDate.slice(0, 10) === day);
  const validWindow = Boolean(from && to && from < to);
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = daily.filter(item => {
    const time = item.scheduledDate.slice(11, 16);
    return (!from || time >= from) && (!to || time <= to)
      && (!status || (status === 'processed' ? item.status !== 'PENDING' : item.status === status))
      && [item.renterName, item.renterPhone, item.roomType].some(value => (value || '').toLocaleLowerCase('vi').includes(query));
  }).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.bookingId - b.bookingId);
  const eligible = filtered.filter(item => item.status === 'PENDING' && canReviewViewing(item.scheduledDate));
  const chosen = eligible.filter(item => checked.includes(item.bookingId));

  function changeParams(updates) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    setParams(next);
  }

  function chooseDay(key) {
    setChecked([]);
    setBatchError('');
    changeParams({ date: key, id: null });
  }

  function moveMonth(delta) {
    const first = new Date(month + '-01T00:00:00Z');
    first.setUTCMonth(first.getUTCMonth() + delta);
    chooseDay(dateKey(first));
  }

  function changeFilter(setValue, value) {
    setValue(value);
    setChecked([]);
    setBatchError('');
  }

  async function approve() {
    if (busy || !validWindow || !chosen.length) return;
    setBusy(true);
    setBatchError('');
    try {
      const updated = await viewingApi.approveBatch({
        from: day + 'T' + from, to: day + 'T' + to,
        items: chosen.map(item => ({ bookingId: item.bookingId, expectedScheduledDate: item.scheduledDate })),
      });
      updated.forEach(onDecision);
      setChecked([]);
      setConfirm(false);
      setStatus('APPROVED');
      notify?.(`Đã xác nhận ${updated.length} yêu cầu xem phòng.`);
    } catch (error) {
      setBatchError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="host-calendar-layout">
    <ViewingCalendar {...{ day, today, month, requests, propertyColors }}
      properties={property ? [property] : data.properties} onDay={chooseDay} onMonth={moveMonth} />
    <section className="host-calendar-panel" aria-label="Yêu cầu theo ngày">
      <div className="host-calendar-heading">
        <h2><CalendarDays size={20} aria-hidden="true" />Yêu cầu xem phòng</h2>
        <span className="host-calendar-date">Ngày {displayDate(day)} · {daily.length} yêu cầu</span>
        <button type="button" className="p-button" onClick={onRefresh}><RefreshCw size={15} />Làm mới</button>
      </div>
      <div className="host-calendar-filters">
        <label className="host-calendar-search">Tìm khách hoặc loại phòng
          <span><Search size={16} aria-hidden="true" /><input type="search" placeholder="Tên, số điện thoại, loại phòng…" value={search} onChange={e => changeFilter(setSearch, e.target.value)} /></span>
        </label>
        <label>Nhà trọ<select value={property?.propertyId ?? ''} onChange={e => {
          setChecked([]);
          changeParams({ propertyId: e.target.value, id: null, date: day });
        }}><option value="">Tất cả nhà trọ</option>{data.properties.map(item => <option key={item.propertyId} value={item.propertyId}>{item.name}</option>)}</select></label>
        <label>Trạng thái<select value={status} onChange={e => changeFilter(setStatus, e.target.value)}>
          <option value="">Tất cả trạng thái</option><option value="processed">Đã xử lý</option>
          {Object.entries(viewingStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>
      <div className="host-calendar-batch">
        <label>Từ giờ {canDecide && '(giờ rảnh)'}<input type="time" value={from} onChange={e => changeFilter(setFrom, e.target.value)} /></label>
        <label>Đến giờ<input type="time" value={to} onChange={e => changeFilter(setTo, e.target.value)} /></label>
        {canDecide && <>
          <button type="button" className="p-button" disabled={!validWindow || !eligible.length}
            onClick={() => setChecked(eligible.slice(0, 50).map(item => item.bookingId))}>Chọn lịch phù hợp</button>
          <button type="button" className="p-button primary" disabled={!validWindow || !chosen.length}
            onClick={() => { setBatchError(''); setConfirm(true); }}>Xác nhận đã chọn ({chosen.length})</button>
        </>}
      </div>
      {from && to && !validWindow && <p role="alert">Giờ kết thúc phải sau giờ bắt đầu.</p>}
      {canDecide && validWindow && eligible.length > 50 && <p>Mỗi lượt có thể xác nhận tối đa 50 yêu cầu.</p>}
      {filtered.length ? <div className="host-viewings-table-scroll" tabIndex={0} role="region" aria-label="Bảng yêu cầu xem phòng">
        <table className="host-viewings-table"><thead><tr>{canDecide && validWindow && <th scope="col">Chọn</th>}
          <th scope="col">Thời gian</th><th scope="col">Người liên hệ</th><th scope="col">Nhà trọ</th>
          <th scope="col">Loại phòng</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th>
        </tr></thead><tbody>{filtered.map(item => <tr key={item.bookingId}>
          {canDecide && validWindow && <td>{eligible.includes(item) && <input type="checkbox"
            aria-label={`Chọn lịch ${item.bookingId} của ${item.renterName || 'khách'}`}
            checked={checked.includes(item.bookingId)} disabled={checked.length >= 50 && !checked.includes(item.bookingId)}
            onChange={e => setChecked(e.target.checked ? [...checked, item.bookingId] : checked.filter(id => id !== item.bookingId))} />}</td>}
          <td>{item.scheduledDate.slice(11, 16)}</td>
          <td><strong>{item.renterName || 'Chưa có tên'}</strong><small>{item.renterPhone}</small></td>
          <td><span className="host-calendar-dot" style={{ backgroundColor: propertyColors.get(item.propertyId) }} /> {item.propertyName}</td>
          <td>{item.roomType}</td><td><ViewingStatus status={item.status} /></td>
          <td><button type="button" className="p-button" onClick={() => changeParams({ id: item.bookingId, date: day })}><Eye size={15} />Chi tiết</button></td>
        </tr>)}</tbody></table>
      </div> : <p className="host-viewings-empty" role="status">Không có yêu cầu phù hợp trong ngày này.</p>}
    </section>
    {selected && <Modal className="viewing-dialog" title={`Yêu cầu xem phòng #${selected.bookingId}`}
      onClose={() => { if (!busy) changeParams({ id: null, date: day }); }}>
      <HostViewingDetail key={selected.bookingId} item={selected} canDecide={canDecide} onRefresh={onRefresh}
        onBusy={setBusy} onDecision={item => { onDecision(item); setStatus(item.status); changeParams({ id: null, date: day }); }} />
    </Modal>}
    {confirm && <Modal className="viewing-dialog" title="Xác nhận các lịch đã chọn" onClose={() => { if (!busy) setConfirm(false); }}>
      <div className="viewing-details">
        <p>{chosen.length} yêu cầu ngày {displayDate(day)}, từ {from} đến {to}.</p>
        <ul className="host-calendar-review-list">
          {chosen.map(item => <li key={item.bookingId}>
            {item.scheduledDate.slice(11, 16)} · {item.renterName || 'Chưa có tên'} · {item.propertyName}
          </li>)}
        </ul>
        <p>Máy chủ sẽ kiểm tra lại thời hạn, giờ hẹn và phòng trống trước khi xác nhận cả nhóm.</p>
        {batchError && <p role="alert" className="viewing-error">{batchError}</p>}
        <div className="viewing-actions">
          <button type="button" className="p-button" disabled={busy} onClick={() => setConfirm(false)}>Quay lại</button>
          {batchError && <button type="button" className="p-button" disabled={busy} onClick={onRefresh}>Tải lại lịch</button>}
          <button type="button" className="p-button primary" disabled={busy || !chosen.length} onClick={approve}>{busy ? 'Đang xác nhận…' : 'Xác nhận lịch'}</button>
        </div>
      </div>
    </Modal>}
  </div>;
}

export function ViewingsContent({ data, propertyId, bookingId, onRefresh, onDecision, canDecide }) {
  const requested = bookingId ? data.viewings.find(item => String(item.bookingId) === bookingId) : null;
  const targetId = propertyId;
  const property = data.properties.find(item => String(item.propertyId) === String(targetId));
  if ((targetId != null && !property) || (bookingId && (!requested || (property && requested.propertyId !== property.propertyId)))) return <StateView kind="error"
    message="Không tìm thấy nhà trọ hoặc yêu cầu xem phòng trong danh sách bạn quản lý.">
    <Link className="p-button" to="/host/viewings">Danh sách nhà trọ</Link>
  </StateView>;
  if (!data.properties.length) {
    if (data.pendingRegistrationCount > 0) return <section className="host-viewings-state"><div className="host-viewings-state-icon"><CalendarDays size={30} /></div><h2>Hồ sơ nhà trọ đang chờ xét duyệt</h2><p>Bạn có {data.pendingRegistrationCount} hồ sơ đang chờ xử lý. Yêu cầu xem phòng sẽ khả dụng khi nhà trọ được tạo trong hệ thống.</p><Link className="host-viewings-register" to="/host/property">Xem nhà trọ của tôi</Link></section>;
    return <ViewingsNoProperty />;
  }
  return <ViewingSchedule {...{ data, property, canDecide, onRefresh, onDecision }} selected={requested} />;
}

export default function HostViewingRequestsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId');
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(value => value + 1);
  useViewingUpdates(user?.userId, refresh);
  useEffect(() => {
    const controller = new AbortController();
    hostApi.viewings(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState(current => ({ ...current, loading: false, error: error.message }));
    });
    return () => controller.abort();
  }, [user?.userId, revision]);
  const applyDecision = item => setState(current => current.data ? ({
    ...current,
    data: { ...current.data, viewings: current.data.viewings.map(value => value.bookingId === item.bookingId ? item : value) },
  }) : current);
  return <div className="host-viewings-page">
    {state.error && <StateView kind="error" message={state.error}><MotionButton className="p-button primary" onClick={refresh}>Thử lại</MotionButton></StateView>}
    {state.loading && <StateView kind="loading" />}
    {state.data && <ViewingsContent data={state.data} propertyId={propertyId} bookingId={params.get('id')}
      onRefresh={refresh} onDecision={applyDecision} canDecide={user?.role === 'ROOM_HOST'} />}
  </div>;
}
