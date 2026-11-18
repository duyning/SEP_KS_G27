import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import UIButton from './common/Button.jsx';
import UIField from './common/Field.jsx';
import { FeedbackImages } from './ServiceFeedbackMedia.jsx';
import ServiceRatingUpload from './ServiceRatingUpload.jsx';
import { serviceFeedbackApi as api } from '../services/service-feedback.js';
import '../styles/service-feedback.css';
import '../styles/service-ratings.css';

const starPath = 'm12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3Z';
function StarIcon({ filled = true }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={starPath} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}
function Stars({ value, badge = true }) {
  return <span className="svc-ratings-stars" aria-label={`${value} trên 5 sao`}>
    {[1, 2, 3, 4, 5].map(n => <span className="svc-ratings-star" key={n}><StarIcon filled={false} /><span className="svc-ratings-star-fill" style={{ width: `${Math.max(0, Math.min(1, value - n + 1)) * 100}%` }}><StarIcon /></span></span>)}
    {badge && <strong className="svc-ratings-score-badge">{value}/5</strong>}
  </span>;
}
function RatingOverview({ data }) {
  if (!data.total) return <div className="svc-ratings-empty"><span className="svc-ratings-empty-icon"><StarIcon filled={false} /></span><div><strong>Chưa có đánh giá</strong><p>Chia sẻ trải nghiệm đầu tiên của bạn về dịch vụ này.</p></div></div>;
  return <div className="svc-ratings-overview">
    <div className="svc-ratings-average"><div><strong>{data.average.toFixed(1)}</strong><span>/5</span></div><Stars value={data.average} badge={false} /><p>Dựa trên <strong>{data.total}</strong> đánh giá</p></div>
    <div className="svc-ratings-distribution" aria-label="Phân bố đánh giá">{[5, 4, 3, 2, 1, 0].map(value => <div className="svc-ratings-distribution-row" key={value}>
      <span className="svc-ratings-distribution-label">{value}<StarIcon /></span><div className="svc-ratings-progress" role="progressbar" aria-label={`${value} sao`} aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={data.counts[value]} aria-valuetext={`${data.counts[value]} trên ${data.total} đánh giá`}><span style={{ width: `${data.counts[value] / data.total * 100}%` }} /></div><span className="svc-ratings-distribution-count">{data.counts[value]}</span>
    </div>)}</div>
  </div>;
}
function RatingPicker({ score, onChange, disabled }) {
  const [hover, setHover] = useState(null);
  const shown = hover ?? (score === '' ? null : Number(score));
  const labels = ['0 sao', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];
  return <fieldset className="svc-ratings-picker" disabled={disabled}><legend>Số sao (0–5)</legend>
    <div className="svc-ratings-picker-controls" onMouseLeave={() => setHover(null)}>
      <div className="svc-ratings-picker-stars">{[1, 2, 3, 4, 5].map(value => <label key={value} className={`svc-ratings-pick-star${shown !== null && value <= shown ? ' is-filled' : ''}`} onMouseEnter={() => { if (!disabled) setHover(value); }}>
        <input className="svc-ratings-visually-hidden" type="radio" name="rating-score" required value={value} checked={score === String(value)} onChange={e => onChange(e.target.value)} onFocus={() => setHover(value)} onBlur={() => setHover(null)} aria-label={`${value} sao — ${labels[value]}`} />
        <StarIcon filled={shown !== null && value <= shown} />
      </label>)}</div>
      <label className={`svc-ratings-zero${score === '0' ? ' is-selected' : ''}`} onMouseEnter={() => { if (!disabled) setHover(0); }}><input className="svc-ratings-visually-hidden" type="radio" name="rating-score" required value="0" checked={score === '0'} onChange={e => onChange(e.target.value)} onFocus={() => setHover(0)} onBlur={() => setHover(null)} />0 sao</label>
    </div>
    <div className="svc-ratings-picker-caption" aria-live="polite"><span>{shown === null ? 'Chọn mức đánh giá của bạn' : labels[shown]}</span>{shown !== null && <strong>{shown}/5</strong>}</div>
  </fieldset>;
}
function RatingCard({ row, isOwner, onChanged }) {
  const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function send(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api.reply(row.ratingId, reply.trim()); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <article className="svc-rating-card"><div className="svc-ratings-card-heading"><span className="svc-ratings-avatar" aria-hidden="true">{(row.authorName || 'Người dùng').trim().slice(0, 1).toUpperCase()}</span><strong>{row.authorName}</strong><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleDateString('vi-VN')}</time></div>
    <Stars value={row.stars} /><p className="svc-feedback-content">{row.content}</p><FeedbackImages urls={row.imageUrls} />
    {row.reply ? <div className="svc-rating-reply"><strong>Phản hồi của nhà cung cấp</strong><p className="svc-feedback-content">{row.reply}</p><small>{new Date(row.repliedAt).toLocaleString('vi-VN')}</small></div> : isOwner && <form className="svc-feedback-form" onSubmit={send}>
      <UIField label="Phản hồi đánh giá"><textarea required maxLength={3000} value={reply} disabled={busy} onChange={e => setReply(e.target.value)} rows={3} /></UIField>
      {error && <p role="alert" className="service-error">{error}</p>}<UIButton variant="primary" className="svc-ratings-submit" disabled={busy || !reply.trim()}>{busy ? 'Đang gửi…' : 'Gửi phản hồi'}</UIButton>
    </form>}
  </article>;
}
export default function ServiceRatings({ service }) {
  const { user } = useAuth(); const isOwner = user?.userId === service.providerId;
  const [stars, setStars] = useState(''); const [page, setPage] = useState(0); const [reload, setReload] = useState(0);
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [score, setScore] = useState(''); const [content, setContent] = useState(''); const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false); const [submitError, setSubmitError] = useState(''); const [success, setSuccess] = useState('');
  useEffect(() => {
    const c = new AbortController(); setLoading(true); setError(''); setData(null);
    api.ratings(service.serviceId, stars, page, c.signal).then(result => { if (!c.signal.aborted) setData(result); })
      .catch(err => { if (!c.signal.aborted) setError(err.message); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [service.serviceId, user?.userId, stars, page, reload]);
  async function submit(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setSubmitError('');
    try { await api.rate(service.serviceId, Number(score), content.trim(), images); setContent(''); setImages([]); setSuccess('Đã gửi đánh giá của bạn.'); setPage(0); setStars(''); setReload(n => n + 1); }
    catch (err) { setSubmitError(err.message); if (err.status === 409) setReload(n => n + 1); } finally { setBusy(false); }
  }
  return <section className="svc-feedback svc-ratings" aria-label="Đánh giá dịch vụ"><div className="svc-feedback-heading"><h2>Đánh giá dịch vụ</h2></div>
    {data && <RatingOverview data={data} />}
    <div className="svc-rating-filters" role="group" aria-label="Lọc đánh giá theo số sao">{['', 5, 4, 3, 2, 1, 0].map(value => <UIButton key={value} type="button" className={data && (value === '' ? data.total : data.counts[value]) === 0 ? 'is-empty' : ''} aria-label={`${value === '' ? 'Tất cả' : `${value} sao`}${data ? ` (${value === '' ? data.total : data.counts[value]})` : ''}`} aria-pressed={String(stars) === String(value)} onClick={() => { setStars(value); setPage(0); }}>{value !== '' && <span className="svc-ratings-chip-star" aria-hidden="true">★</span>}<span>{value === '' ? 'Tất cả' : `${value} sao`}</span>{data && <span className="svc-ratings-chip-count">({value === '' ? data.total : data.counts[value]})</span>}</UIButton>)}</div>
    {success && <p role="status" className="svc-feedback-success">{success}</p>}
    {error && <p role="alert" className="service-error">{error} <UIButton onClick={() => setReload(n => n + 1)}>Thử lại</UIButton></p>}
    {loading ? <p role="status">Đang tải đánh giá…</p> : data && <>
      {!data.items.length && data.total > 0 && <p className="svc-ratings-filter-empty">Chưa có đánh giá{stars !== '' ? ` ${stars} sao` : ''} cho dịch vụ này.</p>}
      {data.items.map(row => <RatingCard key={row.ratingId} row={row} isOwner={isOwner} onChanged={() => setReload(n => n + 1)} />)}
      {data.totalPages > 1 && <div className="svc-feedback-heading"><UIButton disabled={!page} onClick={() => setPage(p => p - 1)}>Trang trước</UIButton><span>Trang {page + 1}/{data.totalPages}</span><UIButton disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Trang sau</UIButton></div>}
      {!user ? <p><Link to="/login" state={{ from: `/services/detail?id=${service.serviceId}` }}>Đăng nhập</Link> để đánh giá dịch vụ.</p> : isOwner ? <p>Bạn có thể phản hồi các đánh giá của khách hàng ở trên.</p> : data.mine ? <p className="svc-feedback-success">Bạn đã đánh giá dịch vụ này {data.mine.stars}/5 sao. Mỗi người chỉ được gửi một đánh giá.</p> : <form className="svc-feedback-form" onSubmit={submit}><h3>Chia sẻ trải nghiệm của bạn</h3><p>Mỗi tài khoản được đánh giá một lần cho dịch vụ này.</p>
        <RatingPicker score={score} onChange={setScore} disabled={busy} />
        <UIField label="Nội dung đánh giá"><textarea required maxLength={3000} rows={4} value={content} disabled={busy} onChange={e => setContent(e.target.value)} placeholder="Chia sẻ trải nghiệm thực tế khi sử dụng dịch vụ…" /></UIField>
        <ServiceRatingUpload images={images} onChange={setImages} disabled={busy} />
        {submitError && <p role="alert" className="service-error">{submitError}</p>}<UIButton variant="primary" className="svc-ratings-submit" disabled={busy || score === '' || !content.trim()}>{busy ? 'Đang gửi…' : 'Gửi đánh giá'}</UIButton>
      </form>}
    </>}
  </section>;
}
