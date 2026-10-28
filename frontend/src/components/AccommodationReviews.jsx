import { Star } from 'lucide-react';
import { detailDate, ratingPercent } from '../services/accommodation-detail.js';

export default function AccommodationReviews({ reviews }) {
  const { averageRating, totalReviews, ratingCounts, latest } = reviews;
  return <section className="rd-section rd-reviews" id="room-reviews">
    <h2 className="rd-section-title"><Star size={22} />Đánh giá từ người dùng</h2>
    <div className="rd-rating-summary">
      <div className="rd-rating-score"><strong>{averageRating == null ? '—' : averageRating.toFixed(1)}</strong><span className="rd-stars" aria-label={averageRating == null ? 'Chưa có đánh giá' : `${averageRating} trên 5 sao`}>{[1,2,3,4,5].map(star => <Star key={star} size={18} fill={averageRating != null && star <= Math.round(averageRating) ? 'currentColor' : 'none'} />)}</span><p>{totalReviews > 0 ? `Dựa trên ${totalReviews} lượt đánh giá` : 'Chưa có đánh giá cho nhà trọ này'}</p></div>
      <div className="rd-rating-bars">{[5,4,3,2,1].map(star => { const count = ratingCounts[star - 1] || 0; const percent = ratingPercent(count, totalReviews); return <div className="rd-rating-row" key={star}><span>{star} sao</span><div className="rd-rating-track" role="meter" aria-label={`${star} sao`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div><b>{percent}%</b></div>; })}</div>
    </div>
    {latest.length > 0 ? <div className="rd-review-list">{latest.map(review => <article className="rd-review-card" key={review.reviewId}><header><div className="rd-review-author"><span className="rd-person-avatar">{(review.authorName || 'N').trim().charAt(0).toUpperCase()}</span><div><h3>{review.authorName || 'Người dùng'}</h3><small>Đánh giá trên HL_RCS</small></div></div><div className="rd-review-meta"><span className="rd-stars" aria-label={`${review.rating} trên 5 sao`}>{[1,2,3,4,5].map(star => <Star size={13} key={star} fill={star <= review.rating ? 'currentColor' : 'none'} />)}</span><time>{detailDate(review.createdAt)}</time></div></header><p>{review.content || 'Người dùng chưa để lại nội dung nhận xét.'}</p></article>)}</div>
      : <p className="rd-review-empty">Các nhận xét được gửi cho nhà trọ sẽ hiển thị tại đây.</p>}
  </section>;
}
