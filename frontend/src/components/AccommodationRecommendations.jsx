import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { accommodationApi } from '../services/accommodations.js';
import { accommodationDetailUrl } from '../services/map-location.js';
import AvailabilityNotice from './AvailabilityNotice.jsx';
import { withSearchOrigin } from '../services/search-origin.js';
import { searchAmenities, searchLocations, searchTypes } from '../services/search-prototype.js';
import { detailMoney } from '../services/detail-prototype.js';
import { ROOM_AMENITIES } from '../services/room-types.js';
import { Modal } from './PortalUI.jsx';

const scoreFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

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
    const context = question ? [clarification, question, answer.trim()].filter(Boolean).join('\n') : clarification;
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
          placeholder="Ví dụ: studio ở Tân Xã cho 2 người, tối đa 2,5 triệu/tháng, có điều hòa và ban công"
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
      {!busy && result?.status === 'EMPTY' && <p role="status">Chưa có loại phòng công khai còn trống khớp tiêu chí nào. Hãy thử sửa mô tả.</p>}
      {!busy && result?.status === 'RESULTS' && <ul className="accommodation-ai-results" aria-label="Phòng được gợi ý">
        {result.items.map(item => <li key={item.roomTypeId}>
          <div className="accommodation-ai-heading">
            <Link to={withSearchOrigin(accommodationDetailUrl(item), origin)}>{item.propertyName} — {item.roomTypeName}</Link>
            <span className="accommodation-ai-score">{scoreFormat.format(item.match.score)}/10 phù hợp</span>
          </div>
          <p>{detailMoney(item.price)}/tháng · Còn {item.availableRooms} phòng</p>
          <p>{item.address || 'Chưa cập nhật địa chỉ'}</p>
          <p><strong>Khớp {item.match.matchedCriteria.length}/{item.match.matchedCriteria.length + item.match.unmatchedCriteria.length} tiêu chí:</strong>{' '}
            {item.match.matchedCriteria.map(key => criterionLabel(key, result.criteria)).join(' · ')}</p>
          {item.match.unmatchedCriteria.length > 0 && <p className="accommodation-ai-unmatched"><strong>Chưa khớp:</strong>{' '}
            {item.match.unmatchedCriteria.map(key => criterionLabel(key, result.criteria)).join(' · ')}</p>}
          {item.availabilityStale === true && <AvailabilityNotice value={item} />}
        </li>)}
      </ul>}
    </>}
  </Modal>;
}

function criterionLabel(key, criteria) {
  switch (key) {
    case 'location': return searchLocations.find(([id]) => id === criteria.location)?.[1] || criteria.location;
    case 'budget': {
      if (criteria.minBudget == null) return `Tối đa ${detailMoney(criteria.maxBudget)}/tháng`;
      if (criteria.maxBudget == null) return `Từ ${detailMoney(criteria.minBudget)}/tháng`;
      return `${detailMoney(criteria.minBudget)} – ${detailMoney(criteria.maxBudget)}/tháng`;
    }
    case 'roomType': return searchTypes.find(([id]) => id === criteria.roomType)?.[1] || criteria.roomType;
    case 'capacity': return `Ở được ít nhất ${criteria.minCapacity} người`;
    case 'area': return `Diện tích từ ${scoreFormat.format(criteria.minAreaSqm)} m²`;
    default: return searchAmenities.find(([id]) => id === key)?.[1] || ROOM_AMENITIES.find(([id]) => id === key)?.[1] || key;
  }
}
