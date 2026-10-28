import { useEffect, useRef, useState } from 'react';
import CommunityImageViewer, { useCommunityImage } from './CommunityImageViewer.jsx';

export function LocalPostImage({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return <img src={url || undefined} alt={`Xem trước ${file.name}`} />;
}

export default function CommunityPostImage({ defer = false, ...props }) {
  const target = useRef(null);
  const [ready, setReady] = useState(!defer);
  useEffect(() => {
    if (ready) return;
    if (typeof IntersectionObserver === 'undefined') { setReady(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setReady(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    if (target.current) observer.observe(target.current);
    return () => observer.disconnect();
  }, [ready]);
  if (!defer) return <LoadedPostImage {...props} />;
  return <div ref={target} style={{ width: '100%', height: '100%' }}>
    {ready ? <LoadedPostImage {...props} /> : <span className="community-feed-image-placeholder" aria-hidden="true">Ảnh đính kèm</span>}
  </div>;
}

function LoadedPostImage({ postId, image, images = [image], remainingCount = 0, fit = 'cover', natural = false }) {
  const photo = useCommunityImage(postId, image.id);
  const [open, setOpen] = useState(false);
  const initialIndex = Math.max(0, images.findIndex(item => item.id === image.id));
  return <>
    <button type="button" aria-label={`Xem ảnh ${image.fileName || 'đính kèm'}${remainingCount ? ` và ${remainingCount} ảnh khác` : ''}`} onClick={() => setOpen(true)}
      style={{ position: 'relative', display: 'block', width: '100%', height: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'zoom-in' }}>
      {photo.url ? <img src={photo.url} alt={image.fileName || 'Ảnh đính kèm bài viết'} decoding="async"
        style={{ display: 'block', width: natural ? 'auto' : '100%', maxWidth: '100%', height: '100%', objectFit: natural ? 'contain' : fit, borderRadius: natural ? 8 : undefined }} onError={photo.fail} />
        : <span role="status" style={{ display: 'grid', placeItems: 'center', height: '100%', background: '#f1f5f9', fontSize: 12 }}>{photo.loading ? 'Đang tải ảnh...' : 'Không tải được ảnh'}</span>}
      {remainingCount > 0 && <span className="community-gallery-more" aria-hidden="true">+{remainingCount}</span>}
    </button>
    {open && <CommunityImageViewer postId={postId} images={images} initialIndex={initialIndex} initialUrl={photo.url} onClose={() => setOpen(false)} />}
  </>;
}
