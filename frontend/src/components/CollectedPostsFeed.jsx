import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Newspaper } from 'lucide-react';
import { Modal } from './PortalUI.jsx';
import { collectedPostsApi } from '../services/collected-posts.js';
import '../styles/collected-posts.css';

export function useCollectedFeed({ staff = false, published = false, revision = 0 } = {}) {
  const [state, setState] = useState({ posts: [], loading: true, error: '', more: false });
  const next = useRef(() => {});
  const loadMore = useCallback(() => next.current(), []);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false, done = false, before = null;
    setState({ posts: [], loading: true, error: '', more: false });
    next.current = async () => {
      if (busy || done || controller.signal.aborted) return;
      busy = true;
      setState(old => ({ ...old, loading: true, error: '' }));
      try {
        const data = await collectedPostsApi.feed({ staff, published, before, signal: controller.signal });
        if (controller.signal.aborted) return;
        before = data.nextCursor;
        done = before === null;
        setState(old => ({ posts: [...new Map([...old.posts, ...data.posts].map(p => [p.id, p])).values()], loading: false, error: '', more: !done }));
      } catch (error) {
        if (!controller.signal.aborted) setState(old => ({ ...old, loading: false, error: error.message }));
      } finally { busy = false; }
    };
    next.current();
    return () => controller.abort();
  }, [staff, published, revision]);
  return { ...state, loadMore };
}

function PostImage({ src, author, index }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="collected-image-fallback" role="img" aria-label={`Ảnh ${index + 1} không khả dụng`}>Ảnh từ nguồn hiện không tải được</div>
    : <div className="collected-photo">
      <img className="collected-photo-backdrop" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      <img className="collected-photo-original" src={src} alt={`Ảnh ${index + 1} trong bài của ${author}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </div>;
}

export function CollectedPostCard({ post, children }) {
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const caption = useRef(null);
  useEffect(() => {
    const element = caption.current;
    let active = true;
    const check = () => { if (active) setOverflow(element.scrollHeight > element.clientHeight + 1); };
    check();
    document.fonts?.ready.then(check);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    observer?.observe(element);
    return () => { active = false; observer?.disconnect(); };
  }, [post.caption, post.images.length]);
  return <><article className={`collected-card${children ? ' has-actions' : ''}${post.images.length ? '' : ' collected-text-only'}`}>
    <header className="collected-post-header"><span className="collected-avatar" aria-hidden="true">{post.author.slice(0, 1).toUpperCase()}</span><div><h2>{post.author}</h2><time dateTime={post.sourcePublishedAt}>{new Date(post.sourcePublishedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></div><span className="collected-source">Facebook</span></header>
    {children && <div className="collected-card-actions">{children}</div>}
    <p ref={caption} className="collected-caption collected-caption-preview">{post.caption || 'Bài đăng chỉ có hình ảnh.'}</p>
    <div className="collected-read-more">{overflow && <button className="collected-text-button" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>Xem thêm nội dung</button>}</div>
    <CollectedGallery images={post.images} author={post.author} />
    <footer><span>Nội dung tổng hợp từ nhóm Facebook</span><a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">Xem bài gốc <ExternalLink size={15} aria-hidden="true" /></a></footer>
  </article>{open && <Modal className="collected-dialog" title={`Bài viết của ${post.author}`} onClose={() => setOpen(false)}>
    <div className="collected-dialog-body"><p className="collected-caption">{post.caption}</p><CollectedGallery images={post.images} author={post.author} /><a className="collected-button" href={post.sourceUrl} target="_blank" rel="noopener noreferrer">Xem bài gốc <ExternalLink size={16} /></a></div>
  </Modal>}</>;
}

function CollectedGallery({ images, author }) {
  const [index, setIndex] = useState(0);
  const active = Math.min(index, Math.max(0, images.length - 1));
  if (!images.length) return null;
  return <div className="collected-gallery" role="group" aria-label={`Bộ ảnh của ${author}`}>
    <PostImage key={images[active]} src={images[active]} author={author} index={active} />
    {images.length > 1 && <><button className="collected-gallery-prev" type="button" aria-label="Ảnh trước" onClick={() => setIndex((active - 1 + images.length) % images.length)}><ChevronLeft size={20} /></button><button className="collected-gallery-next" type="button" aria-label="Ảnh tiếp theo" onClick={() => setIndex((active + 1) % images.length)}><ChevronRight size={20} /></button><span className="collected-gallery-count" aria-live="polite">{active + 1} / {images.length}</span></>}
  </div>;
}

export function CollectedFeed({ feed, renderPost }) {
  const sentinel = useRef(null);
  const { loading, error, more, loadMore, posts } = feed;
  useEffect(() => {
    if (!more || loading || error || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) loadMore(); }, { rootMargin: '400px' });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, error, more, loadMore]);
  return <>
    <div className="collected-list" aria-busy={loading}>{posts.map(post => renderPost ? renderPost(post) : <CollectedPostCard key={post.id} post={post} />)}</div>
    {error && <div className="collected-feedback" role="alert"><p>{error}</p><button type="button" className="collected-button" onClick={loadMore}>Thử lại</button></div>}
    {loading && <p className="collected-feedback" role="status">Đang tải bài viết…</p>}
    {!loading && !error && !posts.length && <div className="collected-empty"><Newspaper size={40} aria-hidden="true" /><h2>Chưa có bài viết</h2><p>Các bài được chọn và công khai sẽ xuất hiện tại đây.</p></div>}
    <div ref={sentinel} className="collected-sentinel">{more && !loading && !error && <button type="button" className="collected-button" onClick={loadMore}>Tải thêm bài viết</button>}</div>
    {!more && !!posts.length && !loading && !error && <p className="collected-feedback">Bạn đã xem hết các bài hiện có.</p>}
  </>;
}
