import { useEffect, useId, useRef, useState } from 'react';
import { Copy, Link as LinkIcon, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from './PortalUI.jsx';
import Comments from './CommunityPostComments.jsx';
import { isOwnCommunityPost } from '../services/community.js';

export default function CommunityPostFooter({ post, deleting, onDelete }) {
  const { user } = useAuth();
  const notify = useToast();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [count, setCount] = useState(post.commentCount);
  const menuRef = useRef(null);
  const trigger = useRef(null);
  const panelId = useId();
  const menuId = useId();
  const approved = post.status === 'APPROVED';
  const owner = isOwnCommunityPost(post, user);
  useEffect(() => setCount(post.commentCount), [post.commentCount]);
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector('.community-post-options-panel button:not(:disabled)')?.focus();
    const outside = event => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  const copy = async (value, message) => {
    setMenuOpen(false);
    trigger.current?.focus();
    try { await navigator.clipboard.writeText(value); notify?.(message, 'success'); }
    catch { notify?.('Không thể sao chép. Vui lòng thử lại.', 'error'); }
  };
  return <>
    <footer className="community-feed-card-footer">
      <button type="button" className="community-comment-toggle" aria-expanded={expanded} aria-controls={panelId}
        disabled={!approved} title={!approved ? 'Bình luận khả dụng sau khi bài được duyệt' : undefined}
        onClick={() => setExpanded(value => !value)}>
        <MessageCircle size={20} aria-hidden="true" /><span>{count} bình luận</span>
      </button>
      <div className="community-post-footer-actions">
        <div className="community-post-options" ref={menuRef}>
          <button type="button" ref={trigger} className="community-post-options-trigger" aria-label={`Tùy chọn bài viết ${post.title}`}
            aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(value => !value)}><MoreHorizontal size={22} aria-hidden="true" /></button>
          {menuOpen && <div className="community-post-options-panel" id={menuId}>
            <button type="button" disabled={!post.authorPhone} onClick={() => copy(post.authorPhone, 'Đã sao chép số điện thoại')}>
              <Copy size={17} aria-hidden="true" /> Sao chép số điện thoại
            </button>
            <button type="button" disabled={!approved} onClick={() => copy(`${window.location.origin}/community#post-${post.id}`, 'Đã sao chép liên kết bài viết')}>
              <LinkIcon size={17} aria-hidden="true" /> Sao chép liên kết bài viết
            </button>
            {owner && <button type="button" className="community-post-delete-option" disabled={deleting} onClick={() => {
              setMenuOpen(false);
              trigger.current?.focus();
              onDelete();
            }}><Trash2 size={17} aria-hidden="true" /> Xóa bài viết</button>}
          </div>}
        </div>
      </div>
    </footer>
    {expanded && approved && <Comments postId={post.id} panelId={panelId} user={user} onCount={setCount} />}
  </>;
}
