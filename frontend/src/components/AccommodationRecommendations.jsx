import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Check, CircleAlert, House, LoaderCircle, LogIn, MapPin, Search, SearchX, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { accommodationApi } from '../services/accommodations.js';
import { accommodationDetailUrl } from '../services/map-location.js';
import AvailabilityNotice from './AvailabilityNotice.jsx';
import { DetailImage } from './detail/DetailPrototypeParts.jsx';
import { withSearchOrigin } from '../services/search-origin.js';
import { searchAmenities, searchLocations, searchTypes } from '../services/search-prototype.js';
import { detailMoney } from '../services/detail-prototype.js';
import { ROOM_AMENITIES } from '../services/room-types.js';
import { Modal } from './PortalUI.jsx';
import troMayAvatar from '../assets/tro-may.webp';
import '../styles/accommodation-recommendations.css';

const scoreFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const descriptionLimit = 1200;
const exampleDescription = 'Phòng dưới 2,5 triệu/tháng, có điều hòa và bình nóng lạnh.';

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
  const descriptionInput = useRef(null);
  const answerInput = useRef(null);
  const resultsHeading = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const question = result?.status === 'CLARIFY' ? result.question : '';
  const canSearch = !!user && !loading;
  useEffect(() => {
    if (canSearch) descriptionInput.current?.focus({ preventScroll: true });
  }, [canSearch]);
  useEffect(() => {
    if (!busy && !error && result) {
      const next = result.status === 'CLARIFY' ? answerInput.current : resultsHeading.current;
      next?.focus({ preventScroll: true });
      next?.scrollIntoView({ block: 'nearest' });
    }
  }, [result, busy, error]);

  function changeDescription(value) {
    setDescription(value);
    setResult(null);
    setClarification('');
    setAnswer('');
    setError('');
  }

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

  const title = <>
    <span className="accommodation-ai-mark"><img src={troMayAvatar} alt="" width="48" height="48" /></span>
    <span>Trọ Mây<span className="accommodation-ai-subtitle">Trợ lý tìm phòng AI</span></span>
  </>;

  return <Modal title={title} className="accommodation-ai-dialog" onClose={onClose}>
    <div className="accommodation-ai-body">
      {loading ? <div className="accommodation-ai-state" role="status">
        <LoaderCircle size={22} className="spin" aria-hidden="true" /> Đang kiểm tra đăng nhập…
      </div> : !user ? <div className="accommodation-ai-signin">
        <p>Đăng nhập để tìm phòng theo mô tả và xem điểm phù hợp.</p>
        <Link className="accommodation-ai-action" to="/login" state={{ from: location.pathname + location.search }}>
          <LogIn size={18} aria-hidden="true" /> Đăng nhập
        </Link>
      </div> : <>
        <form className="accommodation-ai-form" onSubmit={submit}>
          <div className="accommodation-ai-input-heading">
            <label htmlFor="ai-room-description">Nhu cầu thuê phòng</label>
            <span aria-hidden="true">{description.length.toLocaleString('vi-VN')} / {descriptionLimit.toLocaleString('vi-VN')}</span>
          </div>
          <textarea id="ai-room-description" ref={descriptionInput} required rows={4} maxLength={descriptionLimit} disabled={busy}
            placeholder="Bạn muốn ở khu vực nào, giá khoảng bao nhiêu và cần tiện nghi gì?"
            value={description} onChange={event => changeDescription(event.target.value)} />
          {!result && <div className="accommodation-ai-examples" role="group" aria-labelledby="ai-room-example-label">
            <span id="ai-room-example-label">Nhu cầu mẫu</span>
            <button type="button" disabled={busy} onClick={() => {
              changeDescription(exampleDescription);
              descriptionInput.current?.focus();
            }}><span>{exampleDescription}</span><ArrowDownLeft size={13} aria-hidden="true" /></button>
          </div>}
          {question && <div className="accommodation-ai-clarification">
            <label htmlFor="ai-room-answer"><Sparkles size={17} aria-hidden="true" />{question}</label>
            <textarea id="ai-room-answer" ref={answerInput} required rows={2} maxLength={400} disabled={busy} value={answer}
              placeholder="Nhập thêm nhu cầu của bạn" onChange={event => setAnswer(event.target.value)} />
          </div>}
          {error && <p role="alert" className="accommodation-ai-error"><CircleAlert size={18} aria-hidden="true" />{error}</p>}
          <div className="accommodation-ai-actions">
            <button type="submit" className="accommodation-ai-action" disabled={busy || !description.trim() || Boolean(question && !answer.trim())}>
              {busy ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
              {busy ? 'Đang tìm phòng…' : error ? 'Thử lại' : question ? 'Gửi bổ sung' : 'Tìm phòng'}
            </button>
          </div>
        </form>
        {busy && <div className="accommodation-ai-state" role="status">
          <Sparkles size={22} aria-hidden="true" />
          <p>Đang đối chiếu mô tả của bạn với các phòng còn trống.</p>
        </div>}
        {!busy && result?.status === 'EMPTY' && <div className="accommodation-ai-state accommodation-ai-empty">
          <SearchX size={24} aria-hidden="true" />
          <div><h3 ref={resultsHeading} tabIndex={-1}>Chưa có loại phòng công khai còn trống khớp tiêu chí</h3>
            <p>Thử điều chỉnh các tiêu chí trong mô tả.</p></div>
        </div>}
        {!busy && result?.status === 'RESULTS' && <section className="accommodation-ai-matches" aria-label="Phòng được gợi ý">
          <h3 ref={resultsHeading} tabIndex={-1}>{result.items.length} gợi ý cho bạn</h3>
          <ul className="accommodation-ai-results">
            {result.items.map(item => <RecommendationCard key={item.roomTypeId} item={item} criteria={result.criteria} origin={origin} />)}
          </ul>
        </section>}
      </>}
    </div>
  </Modal>;
}

function RecommendationCard({ item, criteria, origin }) {
  const { score, matchedCriteria, unmatchedCriteria } = item.match;
  const detailUrl = withSearchOrigin(accommodationDetailUrl(item), origin);
  return <li className="accommodation-ai-card">
    <div className="accommodation-ai-card-main">
      <div className="accommodation-ai-photo" aria-hidden="true">
        {item.imageUrl ? <DetailImage src={item.imageUrl} alt="" loading="lazy" /> : <House size={27} />}
      </div>
      <div className="accommodation-ai-room">
        <h4><Link to={detailUrl}>{item.propertyName} — {item.roomTypeName}<ArrowUpRight size={15} aria-hidden="true" /></Link></h4>
        <p><MapPin size={14} aria-hidden="true" />{item.address || 'Chưa cập nhật địa chỉ'}</p>
        <p><span><strong>{detailMoney(item.price)}</strong>/tháng</span><span>Còn {item.availableRooms} phòng</span></p>
      </div>
      <div className="accommodation-ai-score">
        <span><strong>{scoreFormat.format(score)}</strong>/10 phù hợp</span>
        <span className="accommodation-ai-score-track" aria-hidden="true"><span style={{ width: `${score * 10}%` }} /></span>
      </div>
    </div>
    <div className="accommodation-ai-criteria">
      <div>
        <h5>Khớp {matchedCriteria.length}/{matchedCriteria.length + unmatchedCriteria.length} tiêu chí</h5>
        <ul aria-label="Tiêu chí khớp">{matchedCriteria.map(key => <li key={key}><Check size={13} aria-hidden="true" />{criterionLabel(key, criteria)}</li>)}</ul>
      </div>
      {unmatchedCriteria.length > 0 && <div className="accommodation-ai-unmatched">
        <h5>Chưa khớp</h5>
        <ul aria-label="Tiêu chí chưa khớp">{unmatchedCriteria.map(key => <li key={key}>{criterionLabel(key, criteria)}</li>)}</ul>
      </div>}
    </div>
    {item.availabilityStale && <AvailabilityNotice value={item} />}
  </li>;
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
