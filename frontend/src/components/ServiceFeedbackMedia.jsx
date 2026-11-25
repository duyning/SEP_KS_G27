import { useEffect, useState } from 'react';
import UIButton from './common/Button.jsx';
import UIField from './common/Field.jsx';
import { serviceFeedbackApi as api, feedbackImageError } from '../services/service-feedback.js';

export function FeedbackUpload({ images, onChange, disabled }) {
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);
  return <div>
    <UIField label="Ảnh đính kèm (không bắt buộc)" helper="Tối đa 5 ảnh JPG, PNG, WEBP; 5 MB/ảnh." error={error}>
      <input className="svc-feedback-file-input" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e => {
        const next = [...images, ...Array.from(e.target.files || [])]; e.target.value = '';
        const message = feedbackImageError(next); setError(message); if (!message) onChange(next);
      }} />
    </UIField>
    <div className="svc-feedback-images">{previews.map((url, i) => <div key={url}><img src={url} alt={`Ảnh đính kèm ${i + 1}`} /><UIButton type="button" disabled={disabled} onClick={() => { onChange(images.filter((_, index) => index !== i)); setError(''); }} aria-label={`Xóa ảnh ${i + 1}`}>Xóa ảnh {i + 1}</UIButton></div>)}</div>
  </div>;
}
function PrivateImage({ url, index }) {
  const [src, setSrc] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let objectUrl;
    setSrc(''); setError('');
    api.image(url, controller.signal).then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  return error ? <p role="alert">{error}</p> : src ? <a href={src} target="_blank" rel="noreferrer" aria-label={`Mở ảnh minh chứng ${index + 1}`}><img src={src} alt={`Ảnh minh chứng ${index + 1}`} /></a> : <span>Đang tải ảnh…</span>;
}
export function FeedbackImages({ urls, privateImages = false }) {
  return <div className="svc-feedback-images">{urls.map((url, i) => privateImages ? <PrivateImage key={url} url={url} index={i} /> : <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Mở ảnh đánh giá ${i + 1}`}><img loading="lazy" src={url} alt={`Ảnh đánh giá ${i + 1}`} /></a>)}</div>;
}
