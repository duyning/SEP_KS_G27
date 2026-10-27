import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { communityApi, editPostPrice, formatPostPrice, hasPostDraftChanges, parsePostPrice, postPayload, validatePost } from '../../services/community.js';
import { PostFieldError, useCommunityLoad } from '../../components/CommunityUI.jsx';
import CommunityPostImage, { LocalPostImage } from '../../components/CommunityPostImage.jsx';
import { POST_IMAGE_ACCEPT, validatePostImages } from '../../services/community-images.js';
import { POST_VIDEO_ACCEPT, validatePostVideos } from '../../services/community-videos.js';
import CommunityPostVideo, { LocalPostVideo } from '../../components/CommunityPostVideo.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useToast } from '../../components/PortalUI.jsx';
import '../../styles/community-post-form.css';

export default function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mine = Boolean(user) && params.get('view') === 'mine';
  const state = useCommunityLoad(mine ? 'mine' : 'published');
  const selectedCategory = params.get('category') || 'ALL';

  const posts = state.data || [];
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const submission = useRef(null);
  const initialDraft = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [retainedImages, setRetainedImages] = useState([]);
  const [checkingImages, setCheckingImages] = useState(false);
  const imageSelection = useRef(0);
  const imagePicker = useRef(null);
  const [videos, setVideos] = useState([]);
  const [retainedVideos, setRetainedVideos] = useState([]);
  const [checkingVideos, setCheckingVideos] = useState(false);
  const videoSelection = useRef(0);
  const videoPicker = useRef(null);
  const checkingMedia = checkingImages || checkingVideos;
  useEffect(() => () => { imageSelection.current++; videoSelection.current++; }, []);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deletion = useRef(null);
  useEffect(() => {
    setPostToDelete(null);
    setDeleteError('');
    setDeleting(false);
    return () => { deletion.current?.abort(); deletion.current = null; };
  }, [user?.userId, mine]);
  useEffect(() => {
    setIsCreateModalOpen(false);
    setBusy(false);
    imageSelection.current++;
    setCheckingImages(false);
    setPhotos([]);
    setRetainedImages([]);
    videoSelection.current++;
    setCheckingVideos(false);
    setVideos([]);
    setRetainedVideos([]);
    return () => { submission.current?.abort(); submission.current = null; };
  }, [user?.userId]);

  // New Post Form State
  const [postType, setPostType] = useState('ROOM_TRANSFER');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [priceImeActive, setPriceImeActive] = useState(false);
  const priceIme = useRef(false);
  const priceComposing = useRef(false);
  const beginPriceComposition = () => {
    priceIme.current = true;
    setPriceImeActive(true);
  };
  const focusPrice = event => {
    priceIme.current = false;
    priceComposing.current = false;
    setPriceImeActive(false);
    const input = event.currentTarget;
    // Start with a plain numeric buffer before an IME can begin composing.
    if (!Number.isNaN(parsePostPrice(input.value))) {
      const position = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
      const raw = input.value.replaceAll('.', '');
      input.value = raw;
      input.setSelectionRange(position, position);
      setPostPrice(raw);
    }
  };
  const finishPriceEdit = input => {
    // Windows Telex can deliver a final input after compositionend/blur.
    // Leave its buffer alone until that event sequence has finished.
    setTimeout(() => {
      if (!input.isConnected || document.activeElement === input || priceComposing.current) return;
      priceIme.current = false;
      setPriceImeActive(false);
      const formatted = formatPostPrice(input.value.trim());
      input.value = formatted;
      setPostPrice(formatted);
    }, 0);
  };
  const blurPrice = event => finishPriceEdit(event.currentTarget);
  const startPriceComposition = () => {
    priceComposing.current = true;
    beginPriceComposition();
  };
  const endPriceComposition = event => {
    priceComposing.current = false;
    // Handle browsers that finish the IME session after the blur event.
    if (document.activeElement !== event.currentTarget) finishPriceEdit(event.currentTarget);
  };
  const changePrice = event => {
    const input = event.currentTarget;
    const native = event.nativeEvent;
    if (priceIme.current || native.isComposing || /Composition|Replacement/.test(native.inputType || '')) {
      beginPriceComposition();
      setPostPrice(input.value);
      return;
    }
    const next = editPostPrice(postPrice, input.value, input.selectionStart ?? input.value.length);
    // Update text and selection together, including edits whose formatted value is unchanged.
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    setPostPrice(next.value);
  };
  const skipPriceSeparator = event => {
    const input = event.currentTarget;
    if (event.nativeEvent.isComposing || event.keyCode === 229 || event.nativeEvent.keyCode === 229) beginPriceComposition();
    if (priceIme.current) return;
    if (Number.isNaN(parsePostPrice(input.value))) return;
    const position = input.selectionStart;
    if (position !== input.selectionEnd) return;
    if (event.key === 'Backspace' && input.value[position - 1] === '.') input.setSelectionRange(position - 1, position - 1);
    if (event.key === 'Delete' && input.value[position] === '.') input.setSelectionRange(position + 1, position + 1);
  };
  const [postLocation, setPostLocation] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const revisionChanged = editingId == null || hasPostDraftChanges({
    type: postType, title: postTitle, content: postContent, price: postPrice, location: postLocation,
    authorName, authorPhone, photos, videos, retainedImageIds: retainedImages.map(image => image.id), retainedVideoIds: retainedVideos.map(video => video.id),
  }, initialDraft.current, true);

  const filteredPosts = selectedCategory === 'ALL'
    ? posts
    : posts.filter((p) => p.type === selectedCategory);

  const openForm = (post = null) => {
    if (!user) { navigate('/login', { state: { from: '/community' } }); return; }
    const initial = {
      type: post?.type || 'ROOM_TRANSFER', title: post?.title || '', content: post?.content || '',
      price: formatPostPrice(post?.price), location: post?.location || '',
      authorName: post?.authorName || user.fullName || '', authorPhone: post?.authorPhone || user.phoneNumber || '',
      retainedImageIds: (post?.images || []).map(image => image.id),
      retainedVideoIds: (post?.videos || []).map(video => video.id),
    };
    initialDraft.current = initial;
    setEditingId(post?.id ?? null);
    setRevisionNote(post?.decisionNote || '');
    setPostType(initial.type);
    setPostTitle(initial.title);
    setPostContent(initial.content);
    priceIme.current = false;
    priceComposing.current = false;
    setPriceImeActive(false);
    setPostPrice(initial.price);
    setPostLocation(initial.location);
    setAuthorName(initial.authorName);
    setAuthorPhone(initial.authorPhone);
    imageSelection.current++;
    setCheckingImages(false);
    setPhotos([]);
    setRetainedImages(post?.images || []);
    videoSelection.current++;
    setCheckingVideos(false);
    setVideos([]);
    setRetainedVideos(post?.videos || []);
    setErrors({});
    setSubmitError('');
    setIsCreateModalOpen(true);
  };
  const requestCloseForm = () => {
    if (busy || checkingMedia) return;
    const values = { type: postType, title: postTitle, content: postContent, price: postPrice, location: postLocation, authorName, authorPhone, photos, videos, retainedImageIds: retainedImages.map(image => image.id), retainedVideoIds: retainedVideos.map(video => video.id) };
    if (hasPostDraftChanges(values, initialDraft.current, editingId != null)
      && !window.confirm('Bạn đã nhập dữ liệu vào bài viết. Nếu thoát, nội dung vừa nhập sẽ bị mất. Bạn có đồng ý thoát không?')) return;
    setIsCreateModalOpen(false);
    setPhotos([]);
    setVideos([]);
  };
  const addPhotos = async event => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (!incoming.length) return;
    const selection = ++imageSelection.current;
    const combined = [...photos];
    for (const file of incoming) if (!combined.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) combined.push(file);
    setCheckingImages(true);
    setErrors(previous => ({ ...previous, images: undefined }));
    try {
      const failure = await validatePostImages(combined, retainedImages.length);
      if (selection !== imageSelection.current) return;
      if (failure) { setErrors(previous => ({ ...previous, images: failure })); return; }
      setPhotos(combined);
    } finally { if (selection === imageSelection.current) setCheckingImages(false); }
  };
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (submission.current || checkingMedia) return;
    if (!revisionChanged) { setSubmitError('Bạn cần chỉnh sửa nội dung hoặc tệp đính kèm theo yêu cầu của nhân viên trước khi gửi lại.'); return; }
    const values = { type: postType, title: postTitle, content: postContent, price: postPrice, location: postLocation, authorName, authorPhone, retainedImageIds: retainedImages.map(image => image.id), retainedVideoIds: retainedVideos.map(video => video.id) };
    const validation = validatePost(values);
    setErrors(validation);
    setSubmitError('');
    if (Object.keys(validation).length) return;
    const controller = new AbortController();
    submission.current = controller;
    setBusy(true);
    try {
      const imageFailure = await validatePostImages(photos, retainedImages.length);
      if (controller.signal.aborted) return;
      if (imageFailure) { setErrors(previous => ({ ...previous, images: imageFailure })); return; }
      const videoFailure = await validatePostVideos(videos, retainedVideos.length);
      if (controller.signal.aborted) return;
      if (videoFailure) { setErrors(previous => ({ ...previous, videos: videoFailure })); return; }
      await communityApi.submit(postPayload(values), controller.signal, editingId, photos, videos);
      if (controller.signal.aborted) return;
      setIsCreateModalOpen(false);
      setPhotos([]);
      setVideos([]);
      if (mine) state.reload();
      notify?.(editingId ? 'Đã gửi lại bài viết sau chỉnh sửa. Bài đang chờ nhân viên kiểm duyệt lại.' : 'Bài viết đã được gửi, đang chờ nhân viên kiểm duyệt. Bạn có thể theo dõi tại Bài viết của tôi.', 'success');
    } catch (error) {
      if (!controller.signal.aborted) { setSubmitError(error.message); setErrors(error.fields || {}); }
    } finally {
      if (submission.current === controller) { submission.current = null; setBusy(false); }
    }
  };
  const addVideos = async event => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (!incoming.length) return;
    const selection = ++videoSelection.current;
    const combined = [...videos, ...incoming];
    setCheckingVideos(true);
    setErrors(previous => ({ ...previous, videos: undefined }));
    try {
      const failure = await validatePostVideos(combined, retainedVideos.length);
      if (selection !== videoSelection.current) return;
      if (failure) { setErrors(previous => ({ ...previous, videos: failure })); return; }
      setVideos(combined);
    } finally { if (selection === videoSelection.current) setCheckingVideos(false); }
  };
  const handleDeletePost = async () => {
    if (!postToDelete || deletion.current) return;
    const controller = new AbortController();
    deletion.current = controller;
    setDeleting(true);
    setDeleteError('');
    try {
      await communityApi.remove(postToDelete.id, controller.signal);
      if (controller.signal.aborted) return;
      setPostToDelete(null);
      state.reload();
      notify?.('Đã xóa bài viết.', 'success');
    } catch (error) {
      if (!controller.signal.aborted) setDeleteError(error.message);
    } finally {
      if (deletion.current === controller) { deletion.current = null; setDeleting(false); }
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Heading Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Cộng đồng Cư dân & Sinh viên Hòa Lạc
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Kết nối nhượng phòng, tìm bạn ở ghép và chia sẻ đồ dùng sinh viên quanh ĐH FPT & Khu CNC.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openForm()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: '#0d9488',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.2)',
          }}
        >
          <Plus size={18} />
          <span>Đăng bài viết mới</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`p-button ${!mine ? 'primary' : ''}`} onClick={() => setParams({})}>Bài viết công khai</button>
        {user && <button className={`p-button ${mine ? 'primary' : ''}`} onClick={() => setParams({ view: 'mine' })}>Bài viết của tôi</button>}
        <button className="p-button" onClick={state.reload} disabled={state.loading}>Làm mới</button>
      </div>
      <p style={{ color: '#64748b', fontSize: 13 }}>{mine ? 'Chỉ bạn nhìn thấy các bài đang chờ duyệt, cần chỉnh sửa hoặc bị từ chối của mình.' : 'Chỉ những bài đã được nhân viên phê duyệt mới hiển thị công khai.'}</p>
      {state.loading && <p role="status">Đang tải bài viết...</p>}
      {state.error && <p role="alert" style={{ color: '#b91c1c' }}>{state.error} <button className="p-button" onClick={state.reload}>Thử lại</button></p>}

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          ['ALL', 'Tất cả bài viết'],
          ['ROOM_TRANSFER', 'Nhượng phòng'],
          ['ROOMMATE', 'Tìm người ở ghép'],
          ['SECOND_HAND', 'Đồ cũ sinh viên'],
        ].map(([key, label]) => {
          const active = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setParams({ ...(mine ? { view: 'mine' } : {}), ...(key === 'ALL' ? {} : { category: key }) })}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: active ? '1px solid #0d9488' : '1px solid #e2e8f0',
                backgroundColor: active ? '#0d9488' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: active ? 700 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Posts Feed */}
      {!state.loading && !state.error && !filteredPosts.length && <p>{mine ? 'Bạn chưa có bài viết nào trong chuyên mục này.' : 'Chưa có bài viết được duyệt trong chuyên mục này.'}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            id={`post-${post.id}`}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
            }}
          >
            {/* Post Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                }}>
                  {post.authorName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>{post.authorName}</div>
                  <time dateTime={post.createdAt} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                    <span>{new Date(post.createdAt).toLocaleTimeString('vi-VN')}</span>
                    <span aria-hidden="true">•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                  </time>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: post.type === 'ROOM_TRANSFER' ? '#f0fdfa' : post.type === 'ROOMMATE' ? '#eff6ff' : '#fffbeb',
                  color: post.type === 'ROOM_TRANSFER' ? '#0d9488' : post.type === 'ROOMMATE' ? '#1e40af' : '#b45309',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {post.typeLabel}
                </span>
                <StatusBadge status={post.status} label={post.statusLabel} />
              </div>
            </div>

            {/* Post Content */}
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              {post.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: '0 0 14px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {post.content}
            </p>

            {/* Price Chip & Images */}
            {post.priceDisplay && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Chi phí: </span>
                <strong style={{ fontSize: '16px', color: '#0d9488' }}>{post.priceDisplay}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gap: '6px', marginBottom: '16px', fontSize: '13px', color: '#64748b', overflowWrap: 'anywhere' }}>
              {post.location && <div>Địa chỉ: <strong style={{ color: '#334155' }}>{post.location}</strong></div>}
              {post.authorPhone && <div>Số điện thoại: <strong style={{ color: '#334155' }}>{post.authorPhone}</strong></div>}
            </div>

            {post.images?.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', overflowX: 'auto' }}>
                {post.images.map(img => (
                  <div key={img.id} style={{ width: 180, height: 130, flexShrink: 0, borderRadius: 10, overflow: 'hidden' }}>
                    <CommunityPostImage postId={post.id} image={img} images={post.images} />
                  </div>
                ))}
              </div>
            )}

            {/* Post Footer Actions */}
            {post.videos?.map(video => <div key={video.id} style={{ marginBottom: 16 }}><CommunityPostVideo postId={post.id} video={video} /></div>)}
            {mine && post.status === 'NEED_CHANGES' && <section className="community-revision-note" aria-label="Yêu cầu chỉnh sửa từ nhân viên">
              <strong>Nhân viên yêu cầu chỉnh sửa</strong>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{post.decisionNote || 'Vui lòng kiểm tra và cập nhật lại nội dung bài viết.'}</p>
              {post.reviewedBy && <small>{post.reviewedBy}{post.reviewedAt ? ` • ${new Date(post.reviewedAt).toLocaleString('vi-VN')}` : ''}</small>}
              <p>Sửa bài theo yêu cầu rồi gửi lại. Bài chỉ công khai sau khi được nhân viên duyệt lại.</p>
              <button type="button" className="p-button primary" onClick={() => openForm(post)}>Chỉnh sửa và gửi duyệt lại</button>
            </section>}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              fontSize: '13px',
              color: '#64748b',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {mine && <button
                type="button"
                className="p-button"
                disabled={deleting}
                onClick={() => { setPostToDelete(post); setDeleteError(''); }}
                style={{ color: '#b91c1c', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={16} aria-hidden="true" /> Xóa bài viết
              </button>}
              {post.status === 'APPROVED' && <button
                type="button"
                onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/community#post-${post.id}`); notify?.('Đã sao chép liên kết bài viết', 'success'); } catch { notify?.('Không thể sao chép liên kết. Vui lòng thử lại.', 'error'); } }}
                style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 600, cursor: 'pointer' }}
              >
                Chia sẻ bài viết
              </button>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {postToDelete && (
        <Modal
          title="Xóa bài viết?"
          onClose={() => { if (!deleting) setPostToDelete(null); }}
          closeOnBackdrop={!deleting}
          closeOnEscape={!deleting}
        >
          <p>Bạn có chắc muốn xóa bài viết <strong style={{ overflowWrap: 'anywhere' }}>{postToDelete.title}</strong>? Bài viết sẽ bị xóa vĩnh viễn.</p>
          {deleteError && <p role="alert" style={{ color: '#b91c1c' }}>{deleteError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="p-button" disabled={deleting} onClick={() => setPostToDelete(null)}>Hủy</button>
            <button type="button" className="p-button" disabled={deleting} onClick={handleDeletePost}
              style={{ background: '#b91c1c', color: '#fff', borderColor: '#b91c1c' }}>
              {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
            </button>
          </div>
        </Modal>
      )}

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <Modal
          title={editingId ? 'Chỉnh sửa và gửi duyệt lại' : 'Đăng bài viết mới vào Cộng đồng'}
          onClose={requestCloseForm}
          closeOnBackdrop={false}
          closeOnEscape={false}
          maxWidth="860px"
          className="community-post-modal"
          footer={<div className="community-post-form-actions">
            <button type="button" className="p-button" disabled={busy || checkingMedia} onClick={requestCloseForm}>Hủy</button>
            <button type="submit" form="community-post-form" className="p-button primary" disabled={busy || checkingMedia || !revisionChanged}>{busy ? 'Đang gửi...' : checkingMedia ? 'Đang kiểm tra tệp...' : editingId ? 'Gửi lại để kiểm duyệt' : 'Gửi bài kiểm duyệt'}</button>
          </div>}
        >
          <form id="community-post-form" noValidate onSubmit={handleCreatePost}>
          <fieldset disabled={busy || checkingMedia} className="community-post-form-grid">
            <p className="community-post-form-hint">Tiêu đề 10–200 ký tự; nội dung 30–5000 ký tự. Bài chỉ công khai sau khi được duyệt.</p>
            {editingId && <div className="community-revision-note" style={{ gridColumn: '1 / -1' }}>
              <strong>Yêu cầu từ nhân viên</strong>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{revisionNote}</p>
              <small>Hãy chỉnh sửa nội dung hoặc tệp đính kèm, sau đó chọn “Gửi lại để kiểm duyệt”.</small>
            </div>}
            {submitError && <p className="community-post-form-error" role="alert">{submitError}</p>}
            <div className="community-post-form-category">
              <label htmlFor="postType" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Chuyên mục bài viết *
              </label>
              <select
                id="postType"
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="ROOM_TRANSFER">Nhượng phòng trọ</option>
                <option value="ROOMMATE">Tìm người ở ghép</option>
                <option value="SECOND_HAND">Đồ cũ sinh viên</option>
              </select>
              <PostFieldError name="type" errors={errors} />
            </div>

            <div className="community-post-form-title">
              <label htmlFor="postTitle" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Tiêu đề bài viết *
              </label>
              <input
                id="postTitle"
                type="text"
                required
                maxLength={200}
                aria-invalid={Boolean(errors.title)}
                aria-describedby="title-error"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="VD: Nhượng gấp phòng khép kín Tân Xã gần ĐH FPT..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <PostFieldError name="title" errors={errors} />
            </div>

            <div className="community-post-form-content">
              <label htmlFor="postContent" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Nội dung chi tiết *
              </label>
              <textarea
                id="postContent"
                rows={3}
                required
                maxLength={5000}
                aria-invalid={Boolean(errors.content)}
                aria-describedby="content-error"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Mô tả cụ thể về phòng, vị trí, giờ giấc, đồ dùng sang nhượng..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <PostFieldError name="content" errors={errors} />
            </div>

            <div className="community-post-form-images">
              <label htmlFor="postImages" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hình ảnh đính kèm (không bắt buộc) — {retainedImages.length + photos.length}/6 ảnh</label>
              <input ref={imagePicker} id="postImages" type="file" multiple accept={POST_IMAGE_ACCEPT} onChange={addPhotos} style={{ display: 'none' }} />
              <button type="button" className="p-button" onClick={() => imagePicker.current?.click()}
                aria-invalid={Boolean(errors.images)} aria-describedby="post-images-help images-error">Chọn ảnh JPG/PNG</button>
              <small id="post-images-help">Chấp nhận: JPG/JPEG (.jpg, .jpeg), PNG (.png). Tối đa 6 ảnh, 5 MB/ảnh; tối đa 20 megapixel và 10.000 px mỗi chiều.<br />Từ chối: WEBP, GIF, HEIC/HEIF, SVG, BMP, PDF, tệp rỗng/hỏng hoặc đổi đuôi giả. Video chọn ở mục bên dưới.</small>
              {checkingImages && <p role="status">Đang kiểm tra ảnh...</p>}
              <PostFieldError name="images" errors={errors} />
              <div className="community-image-previews">
                {retainedImages.map(image => <figure key={image.id}>
                  <div><CommunityPostImage postId={editingId} image={image} images={retainedImages} /></div>
                  <figcaption title={image.fileName}>{image.fileName}</figcaption>
                  <button type="button" className="p-button" aria-label={`Bỏ ảnh ${image.fileName}`} onClick={() => { setRetainedImages(items => items.filter(item => item.id !== image.id)); setErrors(previous => ({ ...previous, images: undefined })); }}>Bỏ ảnh</button>
                </figure>)}
                {photos.map((file, index) => <figure key={`${file.name}-${file.size}-${file.lastModified}`}>
                  <div><LocalPostImage file={file} /></div>
                  <figcaption title={file.name}>{file.name}</figcaption>
                  <button type="button" className="p-button" aria-label={`Bỏ ảnh ${file.name}`} onClick={() => { setPhotos(items => items.filter((_, position) => position !== index)); setErrors(previous => ({ ...previous, images: undefined })); }}>Bỏ ảnh</button>
                </figure>)}
              </div>
            </div>

            <div className="community-post-form-videos">
              <label htmlFor="postVideos" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Video đính kèm (không bắt buộc) — {retainedVideos.length + videos.length}/1 video</label>
              <input ref={videoPicker} id="postVideos" type="file" accept={POST_VIDEO_ACCEPT} onChange={addVideos} style={{ display: 'none' }} />
              <button type="button" className="p-button" onClick={() => videoPicker.current?.click()} aria-invalid={Boolean(errors.videos)} aria-describedby="post-videos-help videos-error">Chọn video MP4</button>
              <small id="post-videos-help">Chấp nhận: MP4 (.mp4), video H.264/AVC và âm thanh AAC (nếu có). Tối đa 1 video, 50 MB, dài hơn 0 giây và không quá 3 phút, Full HD (1920×1080 hoặc 1080×1920).<br />Từ chối: MOV, AVI, MKV, WEBM, HEVC/H.265, tệp rỗng/hỏng hoặc đổi đuôi giả.</small>
              {checkingVideos && <p role="status">Đang kiểm tra video...</p>}
              <PostFieldError name="videos" errors={errors} />
              {retainedVideos.map(video => <figure className="community-video-preview" key={video.id}>
                <CommunityPostVideo postId={editingId} video={video} />
                <figcaption>{video.fileName}</figcaption>
                <button type="button" className="p-button" aria-label={`Bỏ video ${video.fileName}`} onClick={() => { setRetainedVideos([]); setErrors(previous => ({ ...previous, videos: undefined })); }}>Bỏ video</button>
              </figure>)}
              {videos.map(file => <figure className="community-video-preview" key={`${file.name}-${file.lastModified}`}>
                <LocalPostVideo file={file} />
                <figcaption>{file.name}</figcaption>
                <button type="button" className="p-button" aria-label={`Bỏ video ${file.name}`} onClick={() => { setVideos([]); setErrors(previous => ({ ...previous, videos: undefined })); }}>Bỏ video</button>
              </figure>)}
            </div>

            <div className="community-post-form-row">
              <div>
                <label htmlFor="postPrice" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  {postType === 'SECOND_HAND' ? 'Giá bán (đ)' : postType === 'ROOMMATE' ? 'Chi phí (đ/người/tháng)' : 'Giá thuê (đ/tháng)'}
                </label>
                <input
                  id="postPrice"
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby="price-help price-error"
                  value={postPrice}
                  onChange={changePrice}
                  onKeyDown={skipPriceSeparator}
                  onFocus={focusPrice}
                  onBlur={blurPrice}
                  onCompositionStart={startPriceComposition}
                  onCompositionEnd={endPriceComposition}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="VD: 2.200.000"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                {priceImeActive && postPrice.trim() && !Number.isNaN(parsePostPrice(postPrice)) && <output htmlFor="postPrice" aria-live="polite" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0d9488', marginTop: 4 }}>Số tiền: {new Intl.NumberFormat('vi-VN').format(parsePostPrice(postPrice))} đ</output>}
                <small id="price-help" style={{ color: '#64748b' }}>Số nguyên đồng; để trống nếu thỏa thuận. Đồ cũ có thể để 0 đồng.</small>
                <PostFieldError name="price" errors={errors} />
              </div>
              <div>
                <label htmlFor="postLocation" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Khu vực *
                </label>
                <input
                  id="postLocation"
                  type="text"
                  required
                  maxLength={255}
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby="location-error"
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  placeholder="VD: Thôn 2, Tân Xã"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <PostFieldError name="location" errors={errors} />
              </div>
            </div>

            <div className="community-post-form-row">
              <div>
                <label htmlFor="authorName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Tên liên hệ *
                </label>
                <input
                  id="authorName"
                  type="text"
                  required
                  maxLength={100}
                  aria-invalid={Boolean(errors.authorName)}
                  aria-describedby="authorName-error"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <PostFieldError name="authorName" errors={errors} />
              </div>
              <div>
                <label htmlFor="authorPhone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Số điện thoại *
                </label>
                <input
                  id="authorPhone"
                  type="tel"
                  required
                  maxLength={30}
                  aria-invalid={Boolean(errors.authorPhone)}
                  aria-describedby="authorPhone-error"
                  value={authorPhone}
                  onChange={(e) => setAuthorPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <PostFieldError name="authorPhone" errors={errors} />
              </div>
            </div>

          </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
}
