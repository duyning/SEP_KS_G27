import { useEffect, useId, useState } from 'react';
import UIButton from './common/Button.jsx';
import { feedbackImageError } from '../services/service-feedback.js';

// Rating-only presentation; use the same image validation as the existing uploader.
export default function ServiceRatingUpload({ images, onChange, disabled }) {
  const id = useId();
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file)); setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);
  function add(files) {
    if (disabled) return;
    const next = [...images, ...Array.from(files || [])];
    const message = feedbackImageError(next); setError(message); if (!message) onChange(next);
  }
  return <div className="svc-ratings-upload">
    <div className="svc-ratings-upload-heading"><label htmlFor={id}>Ảnh đính kèm <span>(không bắt buộc)</span></label><span>{images.length}/5 ảnh</span></div>
    <label htmlFor={id} className={`svc-ratings-dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`} onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}>
      <input id={id} className="svc-ratings-visually-hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} onChange={e => { add(e.target.files); e.target.value = ''; }} />
      <span className="svc-ratings-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m-4 4 4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg></span>
      <span><strong>Chọn ảnh</strong> hoặc kéo thả vào đây</span><small id={`${id}-hint`}>Tối đa 5 ảnh JPG, PNG, WEBP; 5 MB/ảnh.</small>
    </label>
    {error && <p id={`${id}-error`} role="alert" className="svc-ratings-upload-error">{error}</p>}
    {!!previews.length && <div className="svc-ratings-upload-previews">{previews.map((url, i) => <div className="svc-ratings-upload-preview" key={url}>
      <img src={url} alt={`Ảnh đính kèm ${i + 1}`} /><UIButton type="button" className="svc-ratings-remove-image" disabled={disabled} onClick={() => { onChange(images.filter((_, index) => index !== i)); setError(''); }} aria-label={`Xóa ảnh ${i + 1}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></UIButton><span title={images[i]?.name}>{images[i]?.name}</span>
    </div>)}</div>}
  </div>;
}
