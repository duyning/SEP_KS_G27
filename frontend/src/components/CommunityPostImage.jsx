import { useEffect, useState } from 'react';
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

export default function CommunityPostImage({ postId, image, images = [image] }) {
  const photo = useCommunityImage(postId, image.id);
  const [open, setOpen] = useState(false);
  const initialIndex = Math.max(0, images.findIndex(item => item.id === image.id));
  return <>
    <button type="button" aria-label={`Xem ảnh ${image.fileName || 'đính kèm'}`} onClick={() => setOpen(true)}
      style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'zoom-in' }}>
      {photo.url ? <img src={photo.url} alt={image.fileName || 'Ảnh đính kèm bài viết'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={photo.fail} />
        : <span role="status" style={{ display: 'grid', placeItems: 'center', height: '100%', background: '#f1f5f9', fontSize: 12 }}>{photo.loading ? 'Đang tải ảnh...' : 'Không tải được ảnh'}</span>}
    </button>
    {open && <CommunityImageViewer postId={postId} images={images} initialIndex={initialIndex} initialUrl={photo.url} onClose={() => setOpen(false)} />}
  </>;
}
