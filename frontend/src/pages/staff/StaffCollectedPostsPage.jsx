import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { Modal } from '../../components/PortalUI.jsx';
import { collectedPostsApi } from '../../services/collected-posts.js';
import { CollectedFeed, CollectedPostCard, useCollectedFeed } from '../../components/CollectedPostsFeed.jsx';

export default function StaffCollectedPostsPage() {
  const [url, setUrl] = useState('');
  const [published, setPublished] = useState(false);
  const [selected, setSelected] = useState([]);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const action = useRef(null);
  const feed = useCollectedFeed({ staff: true, published, revision });
  const waiting = ['opening', 'waiting'].includes(session?.status);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    if (!waiting) return;
    const controller = new AbortController();
    let timer;
    const poll = async () => {
      try {
        const status = await collectedPostsApi.auth('status', controller.signal);
        if (controller.signal.aborted) return;
        setSession(status);
        if (['opening', 'waiting'].includes(status.status)) timer = setTimeout(poll, 2000);
      } catch (err) { if (!controller.signal.aborted) { setError(err.message); setSession(null); } }
    };
    timer = setTimeout(poll, 1000);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [waiting]);

  function refresh() { setSelected([]); setRevision(v => v + 1); }
  async function run(name, operation) {
    if (action.current) return;
    const controller = new AbortController(); action.current = controller;
    setBusy(name); setError(''); setMessage('');
    try { await operation(controller.signal); }
    catch (err) { if (!controller.signal.aborted) setError(err.message); }
    finally { if (!controller.signal.aborted) setBusy(''); action.current = null; }
  }
  function scrape(event) {
    event.preventDefault();
    run('scrape', async signal => {
      const result = await collectedPostsApi.scrape(url.trim(), signal);
      if (signal.aborted) return;
      setMessage(`Đã lưu ${result.imported} bài chờ đăng; bỏ qua ${result.skipped} bài trùng hoặc không hợp lệ. ${result.warnings.join(' ')}`);
      setPublished(false); refresh();
    });
  }
  function changeVisibility(ids = [...selected]) {
    run('publish', async signal => {
      const count = await collectedPostsApi.publish(ids, !published, signal);
      if (signal.aborted) return;
      setMessage(published ? `Đã gỡ công khai ${count} bài.` : `Đã công khai ${count} bài trên trang Bài đăng tổng hợp.`);
      refresh();
    });
  }
  function auth(actionName) {
    run('auth', async signal => { const status = await collectedPostsApi.auth(actionName, signal); if (!signal.aborted) setSession(status); });
  }
  function removePost() {
    run('delete', async signal => {
      await collectedPostsApi.remove(deleting.id, signal);
      if (signal.aborted) return;
      setDeleting(null); setMessage('Đã xóa bài khỏi danh sách và trang công khai.'); refresh();
    });
  }
  return <main className="collected-page collected-management">
    <div className="collected-heading"><div><span className="collected-eyebrow">THU THẬP · CHỌN LỌC · CÔNG KHAI</span><h1>Quản lý bài tổng hợp</h1><p>Thu thập bài trong 24 giờ gần nhất. Xem trước và chọn nội dung trước khi đăng.</p></div><Link className="collected-button" to="/collected-posts">Xem trang công khai <ExternalLink size={16} /></Link></div>
    <section className="collected-source-panel" aria-labelledby="source-title">
      <h2 id="source-title">Nguồn bài viết</h2>
      <form onSubmit={scrape}>
        <label htmlFor="collected-group">Đường dẫn nhóm Facebook</label>
        <div className="collected-input-row">
          <input id="collected-group" type="url" required maxLength={512} pattern="https://(www\.|m\.)?facebook\.com/groups/[A-Za-z0-9._\-]+/?(\?[^#]*)?" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.facebook.com/groups/ten-nhom" aria-describedby="collected-session-help" disabled={!!busy} />
          <button className="collected-button primary" disabled={!!busy || waiting} type="submit"><Download size={17} />{busy === 'scrape' ? 'Đang thu thập…' : 'Thu thập bài viết'}</button>
          <button type="button" className="collected-button" disabled={!!busy} onClick={() => auth(waiting ? 'cancel' : 'login')}>{waiting ? 'Hủy đăng nhập' : 'Đăng nhập Facebook'}</button>
        </div>
      </form>
      <p id="collected-session-help" className="collected-session-help">Phiên Facebook được lưu và cửa sổ đăng nhập được mở trên máy chạy Python.</p>
      {session && <p className="collected-session-status" role="status">{session.message}{session.status === 'authenticated' && ' Bạn có thể thu thập bài viết.'}</p>}
    </section>
    {error && <div className="collected-feedback error" role="alert">{error}</div>}
    {message && <div className="collected-feedback success" role="status">{message}</div>}
    {busy === 'scrape' && <p role="status">Đang đọc bài viết từ Facebook, có thể mất tối đa 3 phút. Bài đã lưu vẫn được giữ khi tải lại trang.</p>}
    <div className="collected-toolbar">
      <div className="collected-tabs" role="group" aria-label="Trạng thái bài viết">{[false, true].map(value => <button type="button" key={String(value)} aria-pressed={published === value} disabled={!!busy} onClick={() => { setPublished(value); setSelected([]); }}>{value ? 'Đã công khai' : 'Chờ đăng'}</button>)}</div>
      {!!feed.posts.length && <div className="collected-selection"><label><input type="checkbox" disabled={!!busy} checked={feed.posts.slice(0, 100).every(p => selected.includes(p.id))} onChange={e => setSelected(e.target.checked ? feed.posts.slice(0, 100).map(p => p.id) : [])} />Chọn bài đã tải (tối đa 100)</label><button className={`collected-button ${published ? '' : 'primary'}`} type="button" disabled={!!busy || !selected.length} onClick={() => changeVisibility()}><Check size={16} />{busy === 'publish' ? 'Đang lưu…' : `${published ? 'Gỡ công khai' : 'Đăng công khai'} (${selected.length})`}</button></div>}
      <button type="button" className="collected-button" disabled={!!busy || feed.loading} onClick={refresh}><RefreshCw size={16} />Làm mới</button>
    </div>
    <CollectedFeed feed={feed} renderPost={post => <CollectedPostCard key={post.id} post={post}><label className="collected-select-post"><input type="checkbox" aria-label={`Chọn bài của ${post.author}`} disabled={!!busy || (!selected.includes(post.id) && selected.length >= 100)} checked={selected.includes(post.id)} onChange={e => setSelected(old => e.target.checked ? [...old, post.id] : old.filter(id => id !== post.id))} />Chọn</label><button className="collected-button" type="button" disabled={!!busy} onClick={() => changeVisibility([post.id])}>{published ? 'Gỡ công khai' : 'Đăng bài'}</button><button className="collected-button danger" type="button" disabled={!!busy} onClick={() => setDeleting(post)}><Trash2 size={16} />Xóa</button></CollectedPostCard>} />
    {deleting && <Modal className="collected-dialog collected-delete-dialog" title="Xóa bài viết?" onClose={() => { if (busy !== 'delete') setDeleting(null); }}><div className="collected-dialog-body"><p>Xóa bài của <strong>{deleting.author}</strong> khỏi danh sách{deleting.published ? ' và trang công khai' : ''}? Bài đã xóa sẽ không tự xuất hiện lại khi thu thập.</p>{error && <p role="alert">{error}</p>}<div className="collected-actions"><button type="button" className="collected-button" disabled={!!busy} onClick={() => setDeleting(null)}>Giữ lại</button><button type="button" className="collected-button danger" disabled={!!busy} onClick={removePost}>{busy === 'delete' ? 'Đang xóa…' : 'Xóa bài viết'}</button></div></div></Modal>}
  </main>;
}
