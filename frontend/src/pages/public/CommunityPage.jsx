import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, ImagePlus, Video, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { communityApi, editPostPrice, formatPostPrice, hasPostDraftChanges, parsePostPrice, postPayload, validatePost } from '../../services/community.js';
import { PostFieldError, useCommunityLoad } from '../../components/CommunityUI.jsx';
import CommunityPostImage, { LocalPostImage } from '../../components/CommunityPostImage.jsx';
import { POST_IMAGE_ACCEPT, validatePostImages } from '../../services/community-images.js';
import { POST_VIDEO_ACCEPT, validatePostVideos } from '../../services/community-videos.js';
import CommunityPostVideo, { LocalPostVideo } from '../../components/CommunityPostVideo.jsx';
import CommunityPrototype from '../../components/CommunityPrototype.jsx';
import { communityZones } from '../../services/community-prototype.js';
import DetailPrototypeShell from '../../components/detail/DetailPrototypeShell.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/PortalUI.jsx';
import '../../styles/community-post-form.css';
import '../../styles/community-feed.css';
import '../../styles/home-prototype.css';
import '../../styles/home-prototype-integration.css';
import '../../styles/community-prototype.css';
import '../../styles/community-prototype-integration.css';

export default function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mine = Boolean(user) && params.get('view') === 'mine';
  const state = useCommunityLoad(mine ? 'mine' : 'published');

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
  const [postZone, setPostZone] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const changeZone = event => {
    const zone = event.target.value;
    setPostZone(zone);
    setPostLocation(zone === 'khac' ? customLocation : communityZones.find(([key]) => key === zone)?.[1] || '');
    setErrors(current => ({ ...current, location: undefined }));
  };
  const [authorName, setAuthorName] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [zaloUrl, setZaloUrl] = useState('');
  const revisionChanged = editingId == null || hasPostDraftChanges({
    type: postType, title: postTitle, content: postContent, price: postPrice, location: postLocation,
    authorName, authorPhone, facebookUrl, zaloUrl, photos, videos, retainedImageIds: retainedImages.map(image => image.id), retainedVideoIds: retainedVideos.map(video => video.id),
  }, initialDraft.current, true);

  const openForm = (post = null) => {
    if (!user) { navigate('/login', { state: { from: '/community' } }); return; }
    const initial = {
      type: post?.type || 'ROOM_TRANSFER', title: post?.title || '', content: post?.content || '',
      price: formatPostPrice(post?.price), location: post?.location || '',
      authorName: post?.authorName || user.fullName || '', authorPhone: post?.authorPhone || user.phoneNumber || '',
      facebookUrl: post?.facebookUrl || '', zaloUrl: post?.zaloUrl || '',
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
    const knownZone = communityZones.find(([key, label]) => key !== 'all' && key !== 'khac' && label === initial.location);
    setPostZone(knownZone ? knownZone[0] : initial.location ? 'khac' : '');
    setCustomLocation(knownZone ? '' : initial.location);
    setAuthorName(initial.authorName);
    setAuthorPhone(initial.authorPhone);
    setFacebookUrl(initial.facebookUrl);
    setZaloUrl(initial.zaloUrl);
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
    const values = { type: postType, title: postTitle, content: postContent, price: postPrice, location: postLocation, authorName, authorPhone, facebookUrl, zaloUrl, photos, videos, retainedImageIds: retainedImages.map(image => image.id), retainedVideoIds: retainedVideos.map(video => video.id) };
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
    const values = { type: postType, title: postTitle, content: postContent, price: postPrice, location: postLocation, authorName, authorPhone, facebookUrl, zaloUrl, retainedImageIds: retainedImages.map(image => image.id), retainedVideoIds: retainedVideos.map(video => video.id) };
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
      state.reload();
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

  useEffect(() => {
    if (!isCreateModalOpen) return;
    const dialog = document.querySelector('.community-post-modal .modal-container');
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.querySelector('#postType')?.focus();
    const closeOtherRules = event => {
      dialog.querySelectorAll('details[open]').forEach(details => {
        if (!details.contains(event.target)) details.open = false;
      });
    };
    const keyboard = event => {
      if (event.key === 'Escape') {
        dialog.querySelectorAll('details[open]').forEach(details => { details.open = false; });
      }
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]')]
        .filter(element => element.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1);
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener('click', closeOtherRules);
    dialog.addEventListener('keydown', keyboard);
    return () => {
      dialog.removeEventListener('click', closeOtherRules);
      dialog.removeEventListener('keydown', keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!isCreateModalOpen || !Object.keys(errors).length) return;
    const fields = { type: '#postType', title: '#postTitle', content: '#postContent', price: '#postPrice', location: '#postLocation',
      authorName: '#authorName', authorPhone: '#authorPhone', facebookUrl: '#facebookUrl', zaloUrl: '#zaloUrl', images: '.community-post-form-images > button', videos: '.community-post-form-videos > button' };
    document.querySelector(fields[Object.keys(errors)[0]])?.focus();
  }, [errors, isCreateModalOpen]);

  return (
    <DetailPrototypeShell className="prototype-community">
      <CommunityPrototype state={state} mine={mine} user={user} params={params} setParams={setParams}
        onCreate={() => openForm()} onEdit={openForm} deleting={deleting}
        onDelete={post => { setPostToDelete(post); setDeleteError(''); }} />

      <AnimatePresence>{postToDelete && (
        <Modal
          title="Xóa bài viết?"
          onClose={() => { if (!deleting) setPostToDelete(null); }}
          closeOnBackdrop={!deleting}
          closeOnEscape={!deleting}
        >
          <p>Bạn có chắc muốn xóa bài viết <strong style={{ overflowWrap: 'anywhere' }}>{postToDelete.title}</strong>? Bài viết sẽ bị xóa vĩnh viễn.</p>
          {deleteError && <p role="alert" style={{ color: '#b91c1c' }}>{deleteError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <MotionButton type="button" className="p-button" disabled={deleting} onClick={() => setPostToDelete(null)}>Hủy</MotionButton>
            <MotionButton type="button" className="p-button" disabled={deleting} onClick={handleDeletePost}
              style={{ background: '#b91c1c', color: '#fff', borderColor: '#b91c1c' }}>
              {deleting ? 'Đang xóa...' : 'Xóa bài viết'}
            </MotionButton>
          </div>
        </Modal>
      )}</AnimatePresence>

      {/* Create Post Modal */}
      <AnimatePresence>{isCreateModalOpen && (
        <Modal
          title={editingId ? 'Chỉnh sửa bài viết' : 'Đăng bài viết mới'}
          onClose={requestCloseForm}
          closeOnBackdrop={false}
          closeOnEscape={false}
          maxWidth="1160px"
          className="community-post-modal"
          footer={<div className="community-post-form-actions">
            <span className="community-post-form-policy"><ShieldCheck size={16} aria-hidden="true" /> Bài viết sẽ được kiểm duyệt trước khi công khai.</span>
            <MotionButton type="button" className="p-button" disabled={busy || checkingMedia} onClick={requestCloseForm}>Hủy</MotionButton>
            <MotionButton type="submit" form="community-post-form" className="p-button primary" disabled={busy || checkingMedia || !revisionChanged || postTitle.trim().length < 10 || postContent.trim().length < 10}>{busy ? 'Đang gửi...' : checkingMedia ? 'Đang kiểm tra tệp...' : editingId ? 'Gửi lại để kiểm duyệt' : 'Gửi bài kiểm duyệt'}</MotionButton>
          </div>}
        >
          <form id="community-post-form" noValidate onSubmit={handleCreatePost}>
          <fieldset disabled={busy || checkingMedia} className="community-post-form-grid">
            <p className="community-post-form-hint">Điền thông tin bài viết và cách liên hệ. Các mục có dấu <strong>*</strong> là bắt buộc.</p>
            {editingId && <div className="community-revision-note" style={{ gridColumn: '1 / -1' }}>
              <strong>Yêu cầu từ nhân viên</strong>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{revisionNote}</p>
              <small>Hãy chỉnh sửa nội dung hoặc tệp đính kèm, sau đó chọn “Gửi lại để kiểm duyệt”.</small>
            </div>}
            {submitError && <p className="community-post-form-error" role="alert">{submitError}</p>}
            <div className="community-post-form-layout">
              <section className="community-post-form-section community-post-form-main" aria-labelledby="post-content-heading">
                <h4 id="post-content-heading">Nội dung bài viết</h4>
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
                Tiêu đề bài viết * <span aria-hidden="true">{postTitle.length}/100</span>
              </label>
              <input
                id="postTitle"
                type="text"
                required
                minLength={10}
                maxLength={100}
                aria-invalid={Boolean(errors.title)}
                aria-describedby="post-title-help title-error"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết (10–100 ký tự)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <PostFieldError name="title" errors={errors} />
              <small id="post-title-help" className="community-input-help-hidden">Tiêu đề cần từ 10–100 ký tự (không tính khoảng trắng ở đầu và cuối).</small>
            </div>
            <div className="community-post-form-content">
              <label htmlFor="postContent" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Nội dung chi tiết * <span aria-hidden="true">{postContent.length}/2.500</span>
              </label>
              <textarea
                id="postContent"
                rows={3}
                required
                minLength={10}
                maxLength={2500}
                aria-invalid={Boolean(errors.content)}
                aria-describedby="post-content-help content-error"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Mô tả phòng, vị trí, giờ giấc hoặc đồ dùng sang nhượng… (10–2.500 ký tự)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <PostFieldError name="content" errors={errors} />
              <small id="post-content-help" className="community-input-help-hidden">Mô tả cần từ 10–2.500 ký tự (không tính khoảng trắng ở đầu và cuối).</small>
            </div>
              </section>
              <div className="community-post-form-sidebar">
                <section className="community-post-form-section community-post-form-details" aria-labelledby="post-contact-heading">
                  <h4 id="post-contact-heading">Giá & thông tin liên hệ</h4>
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
                  placeholder={postType === 'SECOND_HAND' ? 'VD: 200.000 · Trống = thỏa thuận, 0 = miễn phí' : 'VD: 2.200.000 · Để trống nếu thỏa thuận'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                {priceImeActive && postPrice.trim() && !Number.isNaN(parsePostPrice(postPrice)) && <output htmlFor="postPrice" aria-live="polite" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0d9488', marginTop: 4 }}>Số tiền: {new Intl.NumberFormat('vi-VN').format(parsePostPrice(postPrice))} đ</output>}
                <small id="price-help" className="community-input-help-hidden">Để trống nếu thỏa thuận.{postType === 'SECOND_HAND' ? ' Có thể để 0 đồng.' : ''}</small>
                <PostFieldError name="price" errors={errors} />
              </div>
              <div>
                <label htmlFor="postZone" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Khu vực *
                </label>
                <select id="postZone" required value={postZone} onChange={changeZone}
                  aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? 'location-error' : undefined}
                  className="community-post-location-control">
                  <option value="" disabled>Chọn khu vực</option>
                  {communityZones.filter(([key]) => key !== 'all').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                {postZone === 'khac' && <>
                <label htmlFor="postLocation" className="community-post-custom-location-label">Nhập khu vực / địa chỉ *</label>
                <input
                  id="postLocation"
                  type="text"
                  required
                  maxLength={255}
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby="location-error"
                  value={postLocation}
                  onChange={(e) => { setPostLocation(e.target.value); setCustomLocation(e.target.value); }}
                  placeholder="VD: Thôn 3, xã Hạ Bằng"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                </>}
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
                  maxLength={50}
                  aria-invalid={Boolean(errors.authorName)}
                  aria-describedby="authorName-help authorName-error"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Tên liên hệ (2–50 ký tự)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <PostFieldError name="authorName" errors={errors} />
                <small id="authorName-help" className="community-input-help-hidden">Tên liên hệ cần từ 2–50 ký tự.</small>
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
            <div className="community-post-form-row">
              <div>
                <label htmlFor="facebookUrl">Facebook <span>Không bắt buộc</span></label>
                <input id="facebookUrl" type="url" maxLength={500} value={facebookUrl}
                  className="community-post-location-control" aria-invalid={Boolean(errors.facebookUrl)}
                  aria-describedby="facebookUrl-help facebookUrl-error" onChange={event => setFacebookUrl(event.target.value)}
                  placeholder="https://facebook.com/user" />
                <small id="facebookUrl-help" className="community-input-help-hidden">Link HTTPS facebook.com hoặc fb.com; tối đa 500 ký tự.</small>
                <PostFieldError name="facebookUrl" errors={errors} />
              </div>
              <div>
                <label htmlFor="zaloUrl">Zalo <span>Không bắt buộc</span></label>
                <input id="zaloUrl" type="url" maxLength={500} value={zaloUrl}
                  className="community-post-location-control" aria-invalid={Boolean(errors.zaloUrl)}
                  aria-describedby="zaloUrl-help zaloUrl-error" onChange={event => setZaloUrl(event.target.value)}
                  placeholder="https://zalo.me/0912345678" />
                <small id="zaloUrl-help" className="community-input-help-hidden">Link HTTPS zalo.me; tối đa 500 ký tự.</small>
                <PostFieldError name="zaloUrl" errors={errors} />
              </div>
            </div>
                </section>
                <section className="community-post-form-section community-post-form-attachments" aria-labelledby="post-media-heading">
                  <h4 id="post-media-heading">Ảnh & video <span>Không bắt buộc</span></h4>
                  <div className="community-post-form-media-grid">
            <div className="community-post-form-images">
              <label htmlFor="postImages" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hình ảnh <span>{retainedImages.length + photos.length}/6</span></label>
              <input ref={imagePicker} id="postImages" type="file" multiple accept={POST_IMAGE_ACCEPT} onChange={addPhotos} style={{ display: 'none' }} />
              <MotionButton type="button" className="p-button" onClick={() => imagePicker.current?.click()}
                aria-invalid={Boolean(errors.images)} aria-describedby="post-images-help images-error"><ImagePlus size={19} aria-hidden="true" /> Chọn ảnh</MotionButton>
              <small id="post-images-help">JPG/PNG · Tối đa 6 ảnh · 5 MB/ảnh</small>
              <details className="community-post-file-rules"><summary>Định dạng & giới hạn</summary><div>Chấp nhận JPG/JPEG và PNG, tối đa 20 megapixel và 10.000 px mỗi chiều.<br />Từ chối WEBP, GIF, HEIC/HEIF, SVG, BMP, PDF, tệp rỗng/hỏng hoặc đổi đuôi giả.</div></details>
              {checkingImages && <p role="status">Đang kiểm tra ảnh...</p>}
              <PostFieldError name="images" errors={errors} />
              <div className="community-image-previews">
                {retainedImages.map(image => <figure key={image.id}>
                  <div><CommunityPostImage postId={editingId} image={image} images={retainedImages} /></div>
                  <figcaption title={image.fileName}>{image.fileName}</figcaption>
                  <MotionButton type="button" className="p-button" aria-label={`Bỏ ảnh ${image.fileName}`} onClick={() => { setRetainedImages(items => items.filter(item => item.id !== image.id)); setErrors(previous => ({ ...previous, images: undefined })); }}>Bỏ ảnh</MotionButton>
                </figure>)}
                {photos.map((file, index) => <figure key={`${file.name}-${file.size}-${file.lastModified}`}>
                  <div><LocalPostImage file={file} /></div>
                  <figcaption title={file.name}>{file.name}</figcaption>
                  <MotionButton type="button" className="p-button" aria-label={`Bỏ ảnh ${file.name}`} onClick={() => { setPhotos(items => items.filter((_, position) => position !== index)); setErrors(previous => ({ ...previous, images: undefined })); }}>Bỏ ảnh</MotionButton>
                </figure>)}
              </div>
            </div>
            <div className="community-post-form-videos">
              <label htmlFor="postVideos" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Video <span>{retainedVideos.length + videos.length}/1</span></label>
              <input ref={videoPicker} id="postVideos" type="file" accept={POST_VIDEO_ACCEPT} onChange={addVideos} style={{ display: 'none' }} />
              <MotionButton type="button" className="p-button" onClick={() => videoPicker.current?.click()} aria-invalid={Boolean(errors.videos)} aria-describedby="post-videos-help videos-error"><Video size={19} aria-hidden="true" /> Chọn video</MotionButton>
              <small id="post-videos-help">MP4 · Tối đa 1 video · 50 MB · 3 phút</small>
              <details className="community-post-file-rules"><summary>Định dạng & giới hạn</summary><div>MP4 với video H.264/AVC, âm thanh AAC (nếu có), dài hơn 0 giây, tối đa Full HD 1920×1080 hoặc 1080×1920.<br />Từ chối MOV, AVI, MKV, WEBM, HEVC/H.265, tệp rỗng/hỏng hoặc đổi đuôi giả.</div></details>
              {checkingVideos && <p role="status">Đang kiểm tra video...</p>}
              <PostFieldError name="videos" errors={errors} />
              {retainedVideos.map(video => <figure className="community-video-preview" key={video.id}>
                <CommunityPostVideo postId={editingId} video={video} />
                <figcaption>{video.fileName}</figcaption>
                <MotionButton type="button" className="p-button" aria-label={`Bỏ video ${video.fileName}`} onClick={() => { setRetainedVideos([]); setErrors(previous => ({ ...previous, videos: undefined })); }}>Bỏ video</MotionButton>
              </figure>)}
              {videos.map(file => <figure className="community-video-preview" key={`${file.name}-${file.lastModified}`}>
                <LocalPostVideo file={file} />
                <figcaption>{file.name}</figcaption>
                <MotionButton type="button" className="p-button" aria-label={`Bỏ video ${file.name}`} onClick={() => { setVideos([]); setErrors(previous => ({ ...previous, videos: undefined })); }}>Bỏ video</MotionButton>
              </figure>)}
            </div>
                  </div>
                </section>
              </div>
            </div>
          </fieldset>
          </form>
        </Modal>
      )}</AnimatePresence>
    </DetailPrototypeShell>
  );
}
