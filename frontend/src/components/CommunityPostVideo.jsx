import { useEffect, useState } from 'react';
import { communityApi } from '../services/community.js';

export function LocalPostVideo({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return <video src={url || undefined} controls playsInline preload="metadata" aria-label={`Xem trước ${file.name}`} />;
}

export default function CommunityPostVideo({ postId, video }) {
  const [state, setState] = useState({ url: '', loading: true });
  useEffect(() => {
    const controller = new AbortController();
    let url;
    setState({ url: '', loading: true });
    communityApi.video(postId, video.id, controller.signal).then(blob => {
      if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setState({ url, loading: false }); }
    }).catch(() => { if (!controller.signal.aborted) setState({ url: '', loading: false }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [postId, video.id]);
  if (!state.url) return <p role="status">{state.loading ? 'Đang tải video...' : 'Không tải được video. Vui lòng tải lại trang.'}</p>;
  return <video src={state.url} controls playsInline preload="metadata" aria-label={video.fileName || 'Video bài viết'}
    style={{ width: '100%', maxHeight: 360, borderRadius: 10, background: '#0f172a' }} onError={() => setState({ url: '', loading: false })} />;
}
