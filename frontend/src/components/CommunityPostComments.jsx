import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Reply, CornerDownRight } from 'lucide-react';
import { communityApi } from '../services/community.js';

function useCommentPage(postId, parentId, page, revision, enabled, onCount) {
  const [state, setState] = useState({ loading: true, result: null, error: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ loading: true, result: null, error: '' });
    const task = parentId == null ? communityApi.comments(postId, page, controller.signal)
      : communityApi.replies(postId, parentId, page, controller.signal);
    task.then(result => {
      if (controller.signal.aborted) return;
      onCount(result.commentCount);
      setState({ loading: false, result, error: '' });
    }).catch(error => { if (!controller.signal.aborted) setState({ loading: false, result: null, error: error.message }); });
    return () => controller.abort();
  }, [postId, parentId, page, revision, enabled, onCount]);
  return [state, setState];
}

export default function CommunityPostComments({ postId, panelId, user, onCount }) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useCommentPage(postId, null, page, revision, true, onCount);
  const updateRoot = updated => setState(current => ({ ...current,
    result: { ...current.result, content: current.result.content.map(item => item.id === updated.id ? updated : item) } }));
  const create = async (content, signal) => {
    await communityApi.addComment(postId, content, signal);
    if (signal.aborted) return;
    setPage(Math.floor((state.result?.totalElements || 0) / 20));
    setRevision(value => value + 1);
  };
  return <section id={panelId} className="community-comments" aria-label="Bình luận bài viết">
    <h3>Bình luận</h3>
    <LoadFeedback state={state} onRetry={() => setRevision(value => value + 1)} />
    {state.result && <>
      {!state.result.content.length && <p>Chưa có bình luận nào.</p>}
      <ul className="community-comments-list">{state.result.content.map(comment => <CommentThread key={comment.id}
        postId={postId} comment={comment} user={user} onCount={onCount} onRootUpdate={updateRoot} />)}</ul>
      <Pagination result={state.result} page={page} onPage={setPage} label="Trang bình luận" />
    </>}
    {user ? <CommentForm key={user.userId} label="Viết bình luận" submitLabel="Gửi bình luận" disabled={state.loading || !state.result}
      onSubmit={create} /> : <p><Link to="/login">Đăng nhập</Link> để viết bình luận.</p>}
  </section>;
}

function CommentThread({ postId, comment, user, onCount, onRootUpdate }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [replyCount, setReplyCount] = useState(comment.replyCount);
  const [state, setState] = useCommentPage(postId, comment.id, page, revision, open, onCount);
  useEffect(() => setReplyCount(comment.replyCount), [comment.replyCount]);
  useEffect(() => { if (state.result) setReplyCount(state.result.totalElements); }, [state.result]);
  const chooseReply = value => { setTarget(value); setOpen(true); };
  const sendReply = async (content, signal) => {
    await communityApi.reply(postId, target.id, content, signal);
    if (signal.aborted) return;
    setTarget(null);
    setPage(Math.floor(replyCount / 20));
    setRevision(value => value + 1);
  };
  const updateReply = updated => setState(current => ({ ...current,
    result: { ...current.result, content: current.result.content.map(item => item.id === updated.id ? updated : item) } }));
  return <li className={`community-comment-thread${replyCount > 0 || open ? ' has-branches' : ''}`}>
    <CommentBody comment={comment} postId={postId} user={user} onUpdate={onRootUpdate} onReply={() => chooseReply(comment)} />
    {replyCount > 0 && <button type="button" className="community-replies-toggle" aria-expanded={open} onClick={() => {
      if (open && target) setTarget(null);
      setOpen(value => !value);
    }}><CornerDownRight size={16} aria-hidden="true" />{open ? 'Ẩn' : 'Xem'} {replyCount} phản hồi</button>}
    {open && <div className={`community-comment-replies${target && user ? ' has-composer' : ''}`}>
      <LoadFeedback state={state} onRetry={() => setRevision(value => value + 1)} />
      {state.result && <>
        <ul className="community-comments-list">{state.result.content.map(reply => <li key={reply.id} className="community-reply-branch">
          <CommentBody comment={reply} postId={postId} user={user} onUpdate={updateReply} onReply={() => chooseReply(reply)} />
        </li>)}</ul>
        <Pagination result={state.result} page={page} onPage={setPage} label="Trang phản hồi" />
      </>}
      {target && user && <div className="community-reply-composer-branch">
        <CommentAvatar name={user.fullName} />
        <CommentForm key={target.id} label={`Trả lời ${target.authorName}`} submitLabel="Gửi phản hồi"
          autoFocus onCancel={() => setTarget(null)} onSubmit={sendReply} />
      </div>}
    </div>}
  </li>;
}

function CommentBody({ comment, postId, user, onUpdate, onReply }) {
  const [editing, setEditing] = useState(false);
  const owner = user?.userId === comment.authorId;
  useEffect(() => { if (!owner) setEditing(false); }, [owner]);
  const save = async (content, signal) => {
    const updated = await communityApi.updateComment(postId, comment.id, content, signal);
    if (signal.aborted) return;
    onUpdate(updated); setEditing(false);
  };
  return <div className="community-comment-body">
    <CommentAvatar name={comment.authorName} />
    <div className="community-comment-content">
    <div className="community-comment-bubble">
    <div className="community-comment-heading"><strong>{comment.authorName}</strong>
      <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
      {comment.updatedAt && <span className="community-comment-edited" title={`Chỉnh sửa lúc ${new Date(comment.updatedAt).toLocaleString('vi-VN')}`}>Đã chỉnh sửa</span>}
    </div>
    {editing ? <CommentForm label="Chỉnh sửa bình luận" initialContent={comment.content} submitLabel="Lưu thay đổi"
      autoFocus onCancel={() => setEditing(false)} onSubmit={save} /> : <>
      <p>{comment.replyToAuthorName && <span className="community-reply-mention">{comment.replyToAuthorName} </span>}{comment.content}</p>
    </>}
    </div>
      {!editing && user && <div className="community-comment-actions">
        <button type="button" onClick={onReply}><Reply size={14} aria-hidden="true" /> Trả lời</button>
        {owner && <button type="button" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" /> Chỉnh sửa</button>}
      </div>}
    </div>
  </div>;
}

function CommentAvatar({ name = '' }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || '?';
  return <span className="community-comment-avatar" aria-hidden="true">{initials}</span>;
}

function CommentForm({ label, initialContent = '', submitLabel, disabled = false, autoFocus = false, onCancel, onSubmit }) {
  const id = useId();
  const input = useRef(null);
  const submission = useRef(null);
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (autoFocus) input.current?.focus(); return () => submission.current?.abort(); }, [autoFocus]);
  const submit = async event => {
    event.preventDefault();
    if (submission.current) return;
    const value = content.trim();
    if (!value || value.length > 2000) { setError('Nội dung cần từ 1 đến 2.000 ký tự.'); return; }
    const controller = new AbortController(); submission.current = controller;
    setBusy(true); setError('');
    try {
      await onSubmit(value, controller.signal);
      if (!controller.signal.aborted) setContent('');
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    finally { if (!controller.signal.aborted) { submission.current = null; setBusy(false); } }
  };
  return <form onSubmit={submit} className="community-comment-form">
    <label htmlFor={id}>{label}</label>
    <textarea id={id} ref={input} rows={3} maxLength={2000} value={content} disabled={disabled || busy}
      onChange={event => { setContent(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    {error && <p id={`${id}-error`} role="alert">{error}</p>}
    <div><span>{content.length}/2.000</span><div className="community-comment-form-buttons">
      {onCancel && <button type="button" className="p-button" disabled={busy} onClick={onCancel}>Hủy</button>}
      <button type="submit" className="p-button primary" disabled={disabled || busy || !content.trim() || Boolean(onCancel && content.trim() === initialContent.trim())}>
        {busy ? 'Đang gửi...' : submitLabel}
      </button>
    </div></div>
  </form>;
}

function LoadFeedback({ state, onRetry }) {
  return <>{state.loading && <p role="status">Đang tải bình luận...</p>}
    {state.error && <p role="alert">{state.error} <button type="button" className="p-button" onClick={onRetry}>Thử lại</button></p>}</>;
}

function Pagination({ result, page, onPage, label }) {
  if (result.totalPages < 2) return null;
  return <nav className="community-comments-pagination" aria-label={label}>
    <button type="button" className="p-button" disabled={page === 0} onClick={() => onPage(page - 1)}>Trang trước</button>
    <span>{page + 1}/{result.totalPages}</span>
    <button type="button" className="p-button" disabled={page + 1 >= result.totalPages} onClick={() => onPage(page + 1)}>Trang sau</button>
  </nav>;
}
