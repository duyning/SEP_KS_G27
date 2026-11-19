import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { accommodationApi } from '../services/accommodations.js';
import { accommodationDetailUrl } from '../services/map-location.js';
import AvailabilityNotice from './AvailabilityNotice.jsx';
import { withSearchOrigin } from '../services/search-origin.js';
import { searchAmenities, searchLocations } from '../services/search-prototype.js';
import { detailMoney } from '../services/detail-prototype.js';
import { ROOM_AMENITIES } from '../services/room-types.js';
import { Modal } from './PortalUI.jsx';

export default function AccommodationRecommendations({ origin, onClose }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [description, setDescription] = useState('');
  const [answer, setAnswer] = useState('');
  const [clarification, setClarification] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const question = result?.status === 'CLARIFY' ? result.question : '';

  async function submit(event) {
    event.preventDefault();
    if (active.current || !description.trim() || (question && !answer.trim())) return;
    const context = question ? [clarification, question, answer.trim()].filter(Boolean).join('\n') : '';
    if (context.length > 1200) {
      setError('Hãy gộp các tiêu chí vào mô tả rồi tìm lại.');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    try {
      const response = await accommodationApi.recommend(description.trim(), context, controller.signal);
      if (controller.signal.aborted) return;
      setResult(response);
      setClarification(context);
      setAnswer('');
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message);
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return <Modal title="Tìm phòng bằng AI" maxWidth="760px" onClose={onClose}>
    {loading ? <p role="status">Đang kiểm tra đăng nhập…</p> : !user ? <p>
      <Link className="p-button primary" to="/login" state={{ from: location.pathname + location.search }}>Đăng nhập để tìm phòng bằng AI</Link>
    </p> : <>
      <form className="location-search-form" onSubmit={submit}>
        <label htmlFor="ai-room-description">Nhu cầu thuê phòng</label>
        <textarea id="ai-room-description" required rows={3} maxLength={1200} disabled={busy}
          placeholder="Ví dụ: phòng ở Tân Xã, tối đa 2,5 triệu/tháng, có điều hòa"
          value={description} onChange={event => {
            setDescription(event.target.value);
            setResult(null);
            setClarification('');
            setAnswer('');
            setError('');
          }} />
        {question && <label>{question}<textarea required rows={2} maxLength={400} disabled={busy} value={answer}
          onChange={event => setAnswer(event.target.value)} /></label>}
        {error && <p role="alert" className="portal-form-alert">{error}</p>}
        <div className="location-search-actions"><button type="submit" className="p-button primary" disabled={busy}>
          {busy ? 'Đang tìm phòng…' : error ? 'Thử lại' : question ? 'Gửi bổ sung' : 'Tìm phòng'}
        </button></div>
      </form>
      {busy && <p role="status">Đang đối chiếu nhu cầu với phòng công khai còn trống.</p>}
      {!busy && result?.criteria && <p>{criteriaLabel(result.criteria)}</p>}
      {!busy && result?.status === 'EMPTY' && <p role="status">Chưa có loại phòng công khai còn trống phù hợp với tiêu chí này.</p>}
      {!busy && result?.status === 'RESULTS' && <ul className="accommodation-ai-results" aria-label="Phòng được gợi ý">
        {result.items.map(item => <li key={item.roomTypeId}>
          <Link to={withSearchOrigin(accommodationDetailUrl(item), origin)}>{item.propertyName} — {item.roomTypeName}</Link>
          <p>{detailMoney(item.price)}/tháng · Còn {item.availableRooms} phòng</p>
          <p>{item.address || 'Chưa cập nhật địa chỉ'}</p>
          {item.amenities?.length > 0 && <p>{item.amenities.map(key => ROOM_AMENITIES.find(([id]) => id === key)?.[1]
            || searchAmenities.find(([id]) => id === key)?.[1] || key).join(' · ')}</p>}
          {item.availabilityStale === true && <AvailabilityNotice value={item} />}
        </li>)}
      </ul>}
    </>}
  </Modal>;
}

function criteriaLabel(criteria) {
  const location = searchLocations.find(([id]) => id === criteria.location)?.[1] || 'Tất cả khu vực';
  const range = [criteria.minBudget != null && `Từ ${detailMoney(criteria.minBudget)}`,
    criteria.maxBudget != null && `Tối đa ${detailMoney(criteria.maxBudget)}`].filter(Boolean).join(' · ');
  return [location, range || 'Mọi mức giá', ...criteria.amenities.map(key => searchAmenities.find(([id]) => id === key)?.[1] || key)].join(' · ');
}
