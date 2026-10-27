import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Phone,
  User,
  Tag,
  DollarSign,
  Clock
} from 'lucide-react';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useCommunityLoad } from '../../components/CommunityUI.jsx';
import { communityApi } from '../../services/community.js';
import { useToast } from '../../components/PortalUI.jsx';

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
        <button className="p-button" onClick={state.reload}>Thử lại</button>
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
    <div className="portal-page-container staff-content">
      <p style={{ color: '#64748b', fontSize: 13 }}>Thẩm định bài viết trước khi công khai. Quyết định và lý do được lưu vào lịch sử kiểm duyệt.</p>

      {/* Back Link & Header */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/staff/community"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0d9488', fontWeight: '600', textDecoration: 'none', marginBottom: '8px' }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách kiểm duyệt
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#f0fdfa', color: '#0d9488', marginRight: '8px' }}>
              {currentPost.typeLabel}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mã bài: {currentPost.id}</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
              {currentPost.title}
            </h1>
          </div>
          <StatusBadge status={currentPost.status} label={currentPost.statusLabel} />
        </div>
      </div>

      {/* Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Column (68%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Post Content Section */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              Nội dung bài viết
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '13px' }}>
              {currentPost.priceDisplay && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={15} style={{ color: '#0d9488' }} />
                  <span>Mức giá: <strong>{currentPost.priceDisplay}</strong></span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} style={{ color: '#0d9488' }} />
                <span>Khu vực: <strong>{currentPost.location}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} style={{ color: '#64748b' }} />
                <span>Ngày gửi: {new Date(currentPost.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line', margin: '0 0 16px 0' }}>
              {currentPost.content}
            </p>

            {/* Images */}
            {currentPost.images && currentPost.images.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Hình ảnh đính kèm ({currentPost.images.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                  {currentPost.images.map((img, i) => (
                    <div key={i} style={{ height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={img} alt="Post Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Author Info Section */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              Thông tin người đăng bài
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Họ và tên:</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>{currentPost.authorName}</div>
                <small>Tài khoản đăng: {state.data.accountName}</small>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Số điện thoại liên hệ:</span>
                <div style={{ fontWeight: '700', color: '#0d9488' }}>{currentPost.authorPhone}</div>
              </div>
            </div>
          </section>
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22 }}>
            <h2 style={{ fontSize: 16 }}>Lịch sử kiểm duyệt</h2>
            {!state.data.history.length && <p>Chưa có quyết định kiểm duyệt.</p>}
            {state.data.history.map(item => <div key={item.id} style={{ borderTop: '1px solid #e2e8f0', padding: '10px 0' }}>
              <strong>{item.staffName}: {({ APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', NEED_CHANGES: 'Yêu cầu chỉnh sửa' })[item.action] || item.action}</strong>
              <p style={{ whiteSpace: 'pre-wrap' }}>{item.note}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small>
            </div>)}
          </section>
        </div>

        {/* Right Column (32%) - Decision Aside */}
        <div style={{ position: 'sticky', top: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
              Quyết định kiểm duyệt
            </h3>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Trạng thái hiện tại:</span>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={currentPost.status} label={currentPost.statusLabel} />
              </div>
            </div>

            {currentPost.decisionNote && (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
                <strong>Ghi chú xử lý:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{currentPost.decisionNote}</p>
              </div>
            )}

            {!isTerminal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="p-button primary"
                  style={{ background: '#10b981', borderColor: '#10b981', padding: '10px' }}
                  onClick={() => { setDecisionNote(''); setReviewError(''); setIsApproveOpen(true); }}
                >
                  <CheckCircle2 size={16} /> Duyệt bài viết (Công khai)
                </button>
                <button
                  type="button"
                  className="p-button"
                  style={{ color: '#ea580c', borderColor: '#fdba74', padding: '10px' }}
                  onClick={() => { setDecisionNote(''); setReviewError(''); setIsChangesOpen(true); }}
                >
                  <AlertCircle size={16} /> Yêu cầu chỉnh sửa
                </button>
                <button
                  type="button"
                  className="p-button"
                  style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '10px' }}
                  onClick={() => { setDecisionNote(''); setReviewError(''); setIsRejectOpen(true); }}
                >
                  <XCircle size={16} /> Từ chối bài viết
                </button>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', textAlign: 'center', color: '#166534' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>✓</div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>{currentPost.status === 'NEED_CHANGES' ? 'Đang chờ tác giả chỉnh sửa và gửi lại' : 'Bài viết đã được kiểm duyệt'}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>
                  Xử lý bởi: <strong>{currentPost.reviewedBy || 'Staff'}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: APPROVE */}
      {isApproveOpen && (
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
              <button disabled={busy} type="button" className="p-button" onClick={() => setIsApproveOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="p-button primary"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleApprove}
                disabled={busy}
              >
                {busy ? 'Đang lưu...' : 'Đồng ý duyệt'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: REQUEST CHANGES */}
      {isChangesOpen && (
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
              <button disabled={busy} type="button" className="p-button" onClick={() => setIsChangesOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="p-button primary"
                style={{ background: '#ea580c', borderColor: '#ea580c' }}
                onClick={handleRequestChanges}
                disabled={busy}
              >
                {busy ? 'Đang lưu...' : 'Gửi yêu cầu chỉnh sửa'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: REJECT */}
      {isRejectOpen && (
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
              <button disabled={busy} type="button" className="p-button" onClick={() => setIsRejectOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="p-button primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleReject}
                disabled={busy}
              >
                {busy ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
