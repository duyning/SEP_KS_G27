import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { communityApi } from '../services/community.js';
import '../styles/community-image-viewer.css';

export function useCommunityImage(postId, imageId, initialUrl = '') {
  const [state, setState] = useState({ key: '', url: '', loading: true });
  const [revision, setRevision] = useState(0);
  const key = `${postId}:${imageId}:${initialUrl}:${revision}`;
  useEffect(() => {
    if (initialUrl && revision === 0) { setState({ key, url: initialUrl, loading: false }); return; }
    const controller = new AbortController();
    let url;
    setState({ key, url: '', loading: true });
    communityApi.image(postId, imageId, controller.signal).then(blob => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setState({ key, url, loading: false }); }
    }).catch(() => { if (!controller.signal.aborted) setState({ key, url: '', loading: false }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [postId, imageId, initialUrl, revision, key]);
  return { ...(state.key === key ? state : { url: '', loading: true }), fail: () => setState({ key, url: '', loading: false }), retry: () => setRevision(value => value + 1) };
}

export default function CommunityImageViewer({ postId, images, initialIndex, initialUrl, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const image = images[index];
  const photo = useCommunityImage(postId, image.id, index === initialIndex ? initialUrl : '');
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const titleId = useId();
  const move = direction => setIndex(current => (current + direction + images.length) % images.length);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (images.length > 1 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        setIndex(current => (current + (event.key === 'ArrowLeft' ? -1 : 1) + images.length) % images.length);
      }
      if (event.key === 'Tab') {
        const buttons = [...dialog.current.querySelectorAll('button:not([disabled])')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [images.length, onClose]);

  return createPortal(
    <div ref={dialog} className="community-image-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <header className="community-image-viewer-toolbar">
        <h2 id={titleId}>Xem ảnh bài viết</h2>
        <span role="status" aria-live="polite">Ảnh {index + 1}/{images.length}</span>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Đóng xem ảnh" title="Đóng (Esc)"><X size={24} /></button>
      </header>
      <div className="community-image-viewer-stage" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        {photo.url ? <img key={image.id} src={photo.url} alt={image.fileName || `Ảnh ${index + 1} của bài viết`} onError={photo.fail} />
          : <div className="community-image-viewer-message">
            <p role={photo.loading ? 'status' : 'alert'}>{photo.loading ? 'Đang tải ảnh...' : 'Không tải được ảnh. Vui lòng thử lại.'}</p>
            {!photo.loading && <button type="button" onClick={photo.retry}>Thử tải lại ảnh</button>}
          </div>}
        {images.length > 1 && <>
          <button type="button" className="community-image-viewer-prev" aria-label="Ảnh trước" title="Ảnh trước (←)" onClick={() => move(-1)}><ChevronLeft size={28} /></button>
          <button type="button" className="community-image-viewer-next" aria-label="Ảnh tiếp theo" title="Ảnh tiếp theo (→)" onClick={() => move(1)}><ChevronRight size={28} /></button>
        </>}
      </div>
      <footer className="community-image-viewer-caption">
        <p>{image.fileName || `Ảnh ${index + 1}`}</p>
        <small>{images.length > 1 ? 'Dùng ← / → để chuyển ảnh · ' : ''}Nhấn Esc hoặc nút × để đóng</small>
      </footer>
    </div>, document.body,
  );
}
