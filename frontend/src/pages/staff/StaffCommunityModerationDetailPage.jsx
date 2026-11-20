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
import StaffCommunityReasonDialog from '../../components/StaffCommunityReasonDialog.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useCommunityLoad } from '../../components/CommunityUI.jsx';
import { communityApi } from '../../services/community.js';
import CommunityPostImage from '../../components/CommunityPostImage.jsx';
import CommunityPostVideo from '../../components/CommunityPostVideo.jsx';
import CommunityPostDescription from '../../components/CommunityPostDescription.jsx';
import CommunityPostContactLinks from '../../components/CommunityPostContactLinks.jsx';
import { useToast } from '../../components/PortalUI.jsx';
import '../../styles/staff-community-detail.css';

const scanMessages = {
  QUEUED: 'Đang chờ AI kiểm tra.',
  PAUSED: 'Đang tạm dừng kiểm tra AI. Bạn có thể duyệt thủ công.',
  RUNNING: 'AI đang kiểm tra. Bạn vẫn có thể duyệt ngay.',
  CLEAR: 'AI chưa phát hiện vấn đề.',
  FLAGGED: 'AI đánh dấu nội dung cần xem lại.',
  OFF_TOPIC: 'AI phát hiện ảnh có thể không liên quan.',
  FAILED: 'AI chưa kiểm tra xong. Vui lòng xem xét thủ công.',
  SKIPPED: 'Đã bỏ qua kiểm tra AI cho lần gửi này.',
};
const findingLabels = {
  SEXUAL: 'Nghi có nội dung 18+',
  FLAGGED: 'Nghi vi phạm quy định cộng đồng',
  OFF_TOPIC: 'Ảnh không liên quan đến bài',
  UNSURE: 'AI không đủ thông tin để kết luận',
};

export default function StaffCommunityModerationDetailPage() {
  const [params] = useSearchParams();
  const notify = useToast();
  const postId = params.get('id');
  const state = useCommunityLoad('detail', postId);
  const currentPost = state.data?.post;
  const scan = state.data?.scan;
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const activeReview = useRef(null);
  const reviewRevision = useRef(0);
  useEffect(() => {
    setReviewError('');
    setBusy(false);
    setIsApproveOpen(false);
    setNoteDecision(null);
    return () => { activeReview.current?.abort(); activeReview.current = null; };
  }, [postId]);

  // Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [noteDecision, setNoteDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const dialogOpen = isApproveOpen || Boolean(noteDecision);
  const scanPending = scan?.state === 'QUEUED' || scan?.state === 'RUNNING';
  const reloadRef = useRef(state.reload);
  reloadRef.current = state.reload;
  useEffect(() => {
    if (!scanPending || dialogOpen || busy) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') reloadRef.current();
    }, 4500);
    return () => window.clearInterval(timer);
  }, [postId, scanPending, dialogOpen, busy]);

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
  const openReview = decision => {
    reviewRevision.current = state.data.revision;
    setDecisionNote('');
    setReviewError('');
    if (decision === 'APPROVE') setIsApproveOpen(true);
    else setNoteDecision(decision);
  };
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
      const data = await communityApi.review(postId, decision, note, controller.signal, reviewRevision.current);
      if (controller.signal.aborted) return;
      state.replace(data);
      setIsApproveOpen(false);
      setNoteDecision(null);
      setDecisionNote('');
      window.dispatchEvent(new Event('hlrcs:staff-updated'));
      notify?.(decision === 'APPROVE' ? 'Đã duyệt bài viết. Bài viết hiện được hiển thị công khai.' : decision === 'REQUEST_CHANGES' ? 'Đã lưu yêu cầu chỉnh sửa. Tác giả xem phản hồi tại Bài viết của tôi.' : 'Đã từ chối bài viết và lưu lý do.', 'success');
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error.status === 409) {
          setIsApproveOpen(false);
          setNoteDecision(null);
          state.reload();
          notify?.(error.message, 'error');
        } else setReviewError(error.fields?.note || error.message);
      }
    } finally {
      if (activeReview.current === controller) { activeReview.current = null; setBusy(false); }
    }
  };
  const handleApprove = () => review('APPROVE');

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
        <CommunityPostDescription key={currentPost.id} content={currentPost.content} contentFormat={currentPost.contentFormat} className="staff-community-post-content" />
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

        {scan && <div className="staff-community-decision-note staff-community-scan" data-state={scan.state} role="status">
          <strong>Kiểm tra tự động</strong>
          <p>{scanMessages[scan.state]}</p>
          {scan.state === 'FLAGGED' && currentPost.status === 'APPROVED' &&
            <p>Bài đang công khai. Vui lòng xem lại nội dung được đánh dấu.</p>}
          {scan.findings?.length > 0 && <ul>
            {scan.findings.map(finding => <li key={finding.mediaId ?? 'text'}>
              <strong>{finding.fileName || (finding.mediaId == null ? 'Tiêu đề và mô tả' : `Tệp #${finding.mediaId}`)}</strong>
              {' · '}{findingLabels[finding.code]}
              {finding.timestampSeconds != null && ` · khoảng ${Math.floor(finding.timestampSeconds / 60)}:${String(finding.timestampSeconds % 60).padStart(2, '0')}`}
            </li>)}
          </ul>}
        </div>}

        {currentPost.decisionNote && <div className="staff-community-decision-note" data-status={currentPost.status}>
          <strong>{currentPost.status === 'NEED_CHANGES' ? 'Nội dung yêu cầu chỉnh sửa' : 'Ghi chú xử lý'}</strong>
          <p>{currentPost.decisionNote}</p>
        </div>}

        {!isTerminal ? <>
          <p className="staff-community-moderation-hint">Xem nội dung và tệp đính kèm trước khi đưa ra quyết định.</p>
          <div className="staff-community-moderation-actions">
            <MotionButton type="button" className="p-button primary" disabled={busy}
              onClick={() => openReview('APPROVE')}>
              <CheckCircle2 size={16} /> Duyệt bài viết
            </MotionButton>
            <MotionButton type="button" className="p-button staff-community-request-changes" disabled={busy}
              onClick={() => openReview('REQUEST_CHANGES')}>
              <AlertCircle size={16} /> Yêu cầu chỉnh sửa
            </MotionButton>
            <MotionButton type="button" className="p-button staff-community-reject" disabled={busy}
              onClick={() => openReview('REJECT')}>
              <XCircle size={16} /> Từ chối bài viết
            </MotionButton>
          </div>
        </> : <div className="staff-community-review-result">
          <p>{currentPost.status === 'NEED_CHANGES' ? 'Đang chờ tác giả chỉnh sửa và gửi lại để kiểm duyệt.'
            : currentPost.status === 'APPROVED' ? 'Bài viết đã được duyệt và hiển thị công khai.'
              : currentPost.status === 'HIDDEN' ? 'Bài viết đã bị quản trị viên ẩn sau khi xử lý báo cáo.' : 'Bài viết đã bị từ chối.'}</p>
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
              <StatusBadge status={item.action} label={({ APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', NEED_CHANGES: 'Yêu cầu chỉnh sửa', HIDDEN: 'Ẩn bài viết' })[item.action] || item.action} />
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

      {noteDecision && (
        <StaffCommunityReasonDialog
          key={noteDecision}
          decision={noteDecision}
          post={currentPost}
          note={decisionNote}
          error={reviewError}
          busy={busy}
          onNoteChange={note => {
            setDecisionNote(note);
            setReviewError('');
          }}
          onClose={() => { if (!busy) setNoteDecision(null); }}
          onSubmit={() => review(noteDecision)}
        />
      )}
    </div>
  );
}
