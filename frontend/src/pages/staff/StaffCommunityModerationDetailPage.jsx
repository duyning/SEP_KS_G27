import { MotionButton, AnimatePresence } from '../../components/motion/MotionUI.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useCommunityLoad } from '../../components/CommunityUI.jsx';
import { communityApi } from '../../services/community.js';
import CommunityPostImage from '../../components/CommunityPostImage.jsx';
import CommunityPostVideo from '../../components/CommunityPostVideo.jsx';
import CommunityPostDescription from '../../components/CommunityPostDescription.jsx';
import CommunityPostContactLinks from '../../components/CommunityPostContactLinks.jsx';
import { useToast } from '../../components/PortalUI.jsx';
import '../../styles/staff-community-detail.css';

export default function StaffCommunityModerationDetailPage() {
  const [params] = useSearchParams();
  const notify = useToast();
  const postId = params.get('id');
  const state = useCommunityLoad('detail', postId);
  const currentPost = state.data?.post;
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const activeReview = useRef(null);
  useEffect(() => {
    setReviewError('');
    setBusy(false);
    setIsApproveOpen(false);
    setIsChangesOpen(false);
    setIsRejectOpen(false);
    return () => { activeReview.current?.abort(); activeReview.current = null; };
  }, [postId]);

  // Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isChangesOpen, setIsChangesOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');

  if (state.loading) return <p role="status">Đang tải chi tiết bài viết...</p>;
  if (state.error || !currentPost) {
    return (
      <div className="portal-page-container staff-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 role="alert">{state.error || 'Không tìm thấy bài viết cộng đồng'}</h2>
        <MotionButton className="p-button" onClick={state.reload}>Thử lại</MotionButton>
        <Link to="/staff/community" className="p-button primary">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const isTerminal = currentPost.status !== 'PENDING';
  const review = async decision => {
    if (activeReview.current) return;
    const note = decisionNote.trim();
    if (note.length > 2000 || (decision !== 'APPROVE' && note.length < 10)) {
      setReviewError('Lý do / hướng dẫn chỉnh sửa cần từ 10 đến 2000 ký tự.');
      return;
    }
    const controller = new AbortController();
    activeReview.current = controller;
    setBusy(true);
    setReviewError('');
    try {
      const data = await communityApi.review(postId, decision, note, controller.signal);
      if (controller.signal.aborted) return;
      state.replace(data);
      setIsApproveOpen(false);
      setIsChangesOpen(false);
      setIsRejectOpen(false);
      setDecisionNote('');
      window.dispatchEvent(new Event('hlrcs:staff-updated'));
      notify?.(decision === 'APPROVE' ? 'Đã duyệt bài viết. Bài viết hiện được hiển thị công khai.' : decision === 'REQUEST_CHANGES' ? 'Đã lưu yêu cầu chỉnh sửa. Tác giả xem phản hồi tại Bài viết của tôi.' : 'Đã từ chối bài viết và lưu lý do.', 'success');
    } catch (error) {
      if (!controller.signal.aborted) setReviewError(error.fields?.note || error.message);
    } finally {
      if (activeReview.current === controller) { activeReview.current = null; setBusy(false); }
    }
  };
  const handleApprove = () => review('APPROVE');
  const handleRequestChanges = () => review('REQUEST_CHANGES');
  const handleReject = () => review('REJECT');

  return (
    <div className="portal-page-container staff-content staff-community-detail">
      <nav className="staff-community-detail-nav" aria-label="Điều hướng chi tiết bài viết">
        <Link to="/staff/community"><ArrowLeft size={16} /> Quay lại danh sách kiểm duyệt</Link>
        <span>Mã bài #{currentPost.id}</span>
      </nav>
      {state.refreshing&&<p className="staff-community-detail-refresh" role="status">Đang cập nhật bài viết; nội dung hiện tại vẫn được giữ.</p>}
      {state.refreshError&&<div className="staff-community-detail-refresh staff-community-detail-refresh--error" role="alert"><span>Không thể cập nhật bài viết: {state.refreshError}</span><MotionButton type="button" className="p-button" onClick={state.reload}>Thử lại</MotionButton></div>}

      <div className="staff-community-detail-layout">
      <article className="staff-community-post">
        <header className="staff-community-post-header">
          <div className="staff-community-post-author">
            <div className="staff-community-post-avatar" aria-hidden="true">{currentPost.authorName.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong title={currentPost.authorName}>{currentPost.authorName}</strong>
              <time dateTime={currentPost.createdAt}>
                <span>{new Date(currentPost.createdAt).toLocaleTimeString('vi-VN')}</span>
                <span aria-hidden="true">•</span>
                <span>{new Date(currentPost.createdAt).toLocaleDateString('vi-VN')}</span>
              </time>
            </div>
          </div>
          <div className="staff-community-post-badges">
            <span className="staff-community-post-category" data-category={currentPost.type}>{currentPost.typeLabel}</span>
            <StatusBadge status={currentPost.status} label={currentPost.statusLabel} />
          </div>
        </header>

        <h1>{currentPost.title}</h1>
        <CommunityPostDescription key={currentPost.id} content={currentPost.content} className="staff-community-post-content" />
        {currentPost.priceDisplay && <div className="staff-community-post-price">Chi phí: <strong>{currentPost.priceDisplay}</strong></div>}
        <div className="staff-community-post-contact">
          {currentPost.location && <div>Địa chỉ: <strong>{currentPost.location}</strong></div>}
          {currentPost.authorPhone && <div>Số điện thoại: <strong>{currentPost.authorPhone}</strong></div>}
        </div>

        <CommunityPostContactLinks post={currentPost} />
        {currentPost.images?.length > 0 && <div className="staff-community-post-images" aria-label="Hình ảnh bài viết">
          {currentPost.images.map(image => <div className="staff-community-post-thumbnail" key={image.id}>
            <CommunityPostImage postId={currentPost.id} image={image} images={currentPost.images} />
          </div>)}
        </div>}
        {currentPost.videos?.map(video => <div className="staff-community-post-video" key={video.id}>
          <CommunityPostVideo postId={currentPost.id} video={video} />
        </div>)}
      </article>

      <aside className="staff-community-detail-sidebar" aria-label="Kiểm duyệt và lịch sử bài viết">
      <section className="staff-community-moderation" aria-labelledby="staff-community-moderation-title">
        <div className="staff-community-section-heading">
          <div>
            <h2 id="staff-community-moderation-title">Kiểm duyệt bài viết</h2>
            <p>Tài khoản đăng: <strong>{state.data.accountName}</strong></p>
          </div>
          <StatusBadge status={currentPost.status} label={currentPost.statusLabel} />
        </div>

        {currentPost.decisionNote && <div className="staff-community-decision-note" data-status={currentPost.status}>
          <strong>{currentPost.status === 'NEED_CHANGES' ? 'Nội dung yêu cầu chỉnh sửa' : 'Ghi chú xử lý'}</strong>
          <p>{currentPost.decisionNote}</p>
        </div>}

        {!isTerminal ? <>
          <p className="staff-community-moderation-hint">Xem nội dung và tệp đính kèm trước khi đưa ra quyết định.</p>
          <div className="staff-community-moderation-actions">
            <MotionButton type="button" className="p-button primary" disabled={busy}
              onClick={() => { setDecisionNote(''); setReviewError(''); setIsApproveOpen(true); }}>
              <CheckCircle2 size={16} /> Duyệt bài viết
            </MotionButton>
            <MotionButton type="button" className="p-button staff-community-request-changes" disabled={busy}
              onClick={() => { setDecisionNote(''); setReviewError(''); setIsChangesOpen(true); }}>
              <AlertCircle size={16} /> Yêu cầu chỉnh sửa
            </MotionButton>
            <MotionButton type="button" className="p-button staff-community-reject" disabled={busy}
              onClick={() => { setDecisionNote(''); setReviewError(''); setIsRejectOpen(true); }}>
              <XCircle size={16} /> Từ chối bài viết
            </MotionButton>
          </div>
        </> : <div className="staff-community-review-result">
          <p>{currentPost.status === 'NEED_CHANGES' ? 'Đang chờ tác giả chỉnh sửa và gửi lại để kiểm duyệt.'
            : currentPost.status === 'APPROVED' ? 'Bài viết đã được duyệt và hiển thị công khai.' : 'Bài viết đã bị từ chối.'}</p>
          {currentPost.reviewedBy && <small>Xử lý bởi: <strong>{currentPost.reviewedBy}</strong>
            {currentPost.reviewedAt && <time dateTime={currentPost.reviewedAt}>
              <span>{new Date(currentPost.reviewedAt).toLocaleTimeString('vi-VN')}</span>
              <span aria-hidden="true">•</span>
              <span>{new Date(currentPost.reviewedAt).toLocaleDateString('vi-VN')}</span>
            </time>}
          </small>}
        </div>}
      </section>

      <details className="staff-community-history">
        <summary>Lịch sử kiểm duyệt <span>{state.data.history.length} lần xử lý</span></summary>
        <div className="staff-community-history-list">
          {!state.data.history.length && <p>Chưa có quyết định kiểm duyệt.</p>}
          {[...state.data.history].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).map(item => <div className="staff-community-history-item" key={item.id}>
            <div className="staff-community-section-heading">
              <strong>{item.staffName}</strong>
              <StatusBadge status={item.action} label={({ APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', NEED_CHANGES: 'Yêu cầu chỉnh sửa' })[item.action] || item.action} />
            </div>
            <p>{item.note}</p>
            <time dateTime={item.createdAt}>
              <span>{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</span>
              <span aria-hidden="true">•</span>
              <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
            </time>
          </div>)}
        </div>
      </details>
      </aside>
      </div>

      {/* MODAL: APPROVE */}
      <AnimatePresence>{isApproveOpen && (
        <Modal
          isOpen={true}
          onClose={() => { if (!busy) setIsApproveOpen(false); }}
          title="Xác nhận Duyệt bài viết"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reviewError && <p role="alert" style={{ color: '#b91c1c' }}>{reviewError}</p>}
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              Bạn có chắc chắn muốn phê duyệt bài viết <strong>"{currentPost.title}"</strong> để xuất hiện công khai trên trang Cộng đồng?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <MotionButton disabled={busy} type="button" className="p-button" onClick={() => setIsApproveOpen(false)}>
                Hủy
              </MotionButton>
              <MotionButton
                type="button"
                className="p-button primary"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleApprove}
                disabled={busy}
              >
                {busy ? 'Đang lưu...' : 'Đồng ý duyệt'}
              </MotionButton>
            </div>
          </div>
        </Modal>
      )}</AnimatePresence>

      {/* MODAL: REQUEST CHANGES */}
      <AnimatePresence>{isChangesOpen && (
        <Modal
          isOpen={true}
          onClose={() => { if (!busy) setIsChangesOpen(false); }}
          title="Yêu cầu chỉnh sửa bài viết"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              Nhập nội dung hướng dẫn tác giả chỉnh sửa (ví dụ: bổ sung giá cụ thể, thay đổi hình ảnh rõ nét...):
            </p>
            <textarea
              rows={4}
              aria-label="Hướng dẫn chỉnh sửa (10–2000 ký tự)"
              maxLength={2000}
              disabled={busy}
              placeholder="Nhập yêu cầu chỉnh sửa..."
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            {reviewError && <p role="alert" style={{ color: '#b91c1c' }}>{reviewError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <MotionButton disabled={busy} type="button" className="p-button" onClick={() => setIsChangesOpen(false)}>
                Hủy
              </MotionButton>
              <MotionButton
                type="button"
                className="p-button primary"
                style={{ background: '#ea580c', borderColor: '#ea580c' }}
                onClick={handleRequestChanges}
                disabled={busy}
              >
                {busy ? 'Đang lưu...' : 'Gửi yêu cầu chỉnh sửa'}
              </MotionButton>
            </div>
          </div>
        </Modal>
      )}</AnimatePresence>

      {/* MODAL: REJECT */}
      <AnimatePresence>{isRejectOpen && (
        <Modal
          isOpen={true}
          onClose={() => { if (!busy) setIsRejectOpen(false); }}
          title="Từ chối đăng bài viết"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              Nhập lý do từ chối bài viết này (vi phạm quy chuẩn, nội dung lừa đảo hoặc không phù hợp...):
            </p>
            <textarea
              rows={4}
              aria-label="Lý do từ chối (10–2000 ký tự)"
              maxLength={2000}
              disabled={busy}
              placeholder="Nhập lý do từ chối..."
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            {reviewError && <p role="alert" style={{ color: '#b91c1c' }}>{reviewError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <MotionButton disabled={busy} type="button" className="p-button" onClick={() => setIsRejectOpen(false)}>
                Hủy
              </MotionButton>
              <MotionButton
                type="button"
                className="p-button primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleReject}
                disabled={busy}
              >
                {busy ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </MotionButton>
            </div>
          </div>
        </Modal>
      )}</AnimatePresence>

    </div>
  );
}
