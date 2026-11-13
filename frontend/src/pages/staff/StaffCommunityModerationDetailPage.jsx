import UIButton from '../../components/common/Button.jsx';
import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
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
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { MOCK_COMMUNITY_POSTS } from '../../fixtures/mockCommunityData.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function StaffCommunityModerationDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useToast();
  const postId = params.get('id') || 'POST-2026-001';

  const [posts, setPosts] = useState(MOCK_COMMUNITY_POSTS);
  const currentPost = posts.find(p => p.id === postId) || posts[0];

  // Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isChangesOpen, setIsChangesOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');

  if (!currentPost) {
    return (
      <div className="portal-page-container staff-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Không tìm thấy bài viết cộng đồng</h2>
        <Link to="/staff/community" className="p-button primary">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const isTerminal = currentPost.status === 'APPROVED' || currentPost.status === 'REJECTED';

  const updatePostStatus = (newStatus, statusLabel, note) => {
    const updated = {
      ...currentPost,
      status: newStatus,
      statusLabel,
      decisionNote: note,
      reviewedBy: user?.fullName || 'Nguyễn Văn An (nhân viên)',
      reviewedAt: new Date().toISOString()
    };
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setDecisionNote('');
  };

  const handleApprove = () => {
    updatePostStatus('APPROVED', 'Đã duyệt', 'Nội dung phù hợp quy chuẩn cộng đồng.');
    setIsApproveOpen(false);
    notify(`Đã phê duyệt bài viết "${currentPost.title}"! Bài viết hiện đã công khai.`, 'success');
  };

  const handleRequestChanges = () => {
    if (!decisionNote.trim()) {
      notify('Vui lòng nhập hướng dẫn chỉnh sửa cho người đăng', 'error');
      return;
    }
    updatePostStatus('NEED_CHANGES', 'Cần chỉnh sửa', decisionNote);
    setIsChangesOpen(false);
    notify('Đã gửi yêu cầu chỉnh sửa tới tác giả bài viết', 'info');
  };

  const handleReject = () => {
    if (!decisionNote.trim()) {
      notify('Vui lòng nhập lý do từ chối bài viết', 'error');
      return;
    }
    updatePostStatus('REJECTED', 'Từ chối', decisionNote);
    setIsRejectOpen(false);
    notify('Đã từ chối đăng bài viết này', 'info');
  };

  return (
    <div className="portal-page-container staff-content">
      <DemoNoticeBanner
        message="Thẩm định chi tiết bài viết cộng đồng. Quyết định duyệt sẽ đưa bài viết hiển thị công khai trên trang Cộng đồng của người thuê."
      />

      {/* Back Link & Header */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link
          to="/staff/community"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0f766e', fontWeight: '600', textDecoration: 'none', marginBottom: 'var(--space-2)' }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách kiểm duyệt
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px var(--space-2)', borderRadius: '4px', background: '#f0fdfa', color: '#0f766e', marginRight: 'var(--space-2)' }}>
              {currentPost.typeLabel}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Mã bài: {currentPost.id}</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 'var(--space-1) 0 0 0' }}>
              {currentPost.title}
            </h1>
          </div>
          <StatusBadge status={currentPost.status}>{currentPost.statusLabel}</StatusBadge>
        </div>
      </div>

      {/* Split Grid */}
      <div style={{ display: 'grid', '--grid-columns': '2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Column (68%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Post Content Section */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              Nội dung bài viết
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', background: '#f8fafc', padding: 'var(--space-3) var(--space-4)', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: 'var(--space-4)', fontSize: '13px' }}>
              {currentPost.priceDisplay && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={15} style={{ color: '#0f766e' }} />
                  <span>Mức giá: <strong>{currentPost.priceDisplay}</strong></span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} style={{ color: '#0f766e' }} />
                <span>Khu vực: <strong>{currentPost.location}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} style={{ color: 'var(--ui-muted)' }} />
                <span>Ngày gửi: {new Date(currentPost.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line', margin: '0 0 var(--space-4) 0' }}>
              {currentPost.content}
            </p>

            {/* Images */}
            {currentPost.images && currentPost.images.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: 'var(--space-2)' }}>
                  Hình ảnh đính kèm ({currentPost.images.length})
                </h4>
                <div style={{ display: 'grid', '--grid-columns': 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
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
            <div style={{ display: 'grid', '--grid-columns': '1fr 1fr', gap: 'var(--space-3)', fontSize: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Họ và tên:</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>{currentPost.authorName}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Số điện thoại liên hệ:</span>
                <div style={{ fontWeight: '700', color: '#0f766e' }}>{currentPost.authorPhone}</div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (32%) - Decision Aside */}
        <div style={{ position: 'sticky', top: '90px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
              Quyết định kiểm duyệt
            </h3>

            <div style={{ background: '#f8fafc', padding: 'var(--space-3)', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Trạng thái hiện tại:</span>
              <div style={{ marginTop: 'var(--space-1)' }}>
                <StatusBadge status={currentPost.status}>{currentPost.statusLabel}</StatusBadge>
              </div>
            </div>

            {currentPost.decisionNote && (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px var(--space-3)', marginBottom: 'var(--space-4)', fontSize: '13px', color: '#92400e' }}>
                <strong>Ghi chú xử lý:</strong>
                <p style={{ margin: 'var(--space-1) 0 0 0' }}>{currentPost.decisionNote}</p>
              </div>
            )}

            {!isTerminal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <UIButton
                  type="button"
                  className="p-button primary"
                  style={{ background: '#10b981', borderColor: '#10b981', padding: '10px' }}
                  onClick={() => setIsApproveOpen(true)}
                >
                  <CheckCircle2 size={16} /> Duyệt bài viết (Công khai)
                </UIButton>
                <UIButton
                  type="button"
                  className="p-button"
                  style={{ color: '#ea580c', borderColor: '#fdba74', padding: '10px' }}
                  onClick={() => setIsChangesOpen(true)}
                >
                  <AlertCircle size={16} /> Yêu cầu chỉnh sửa
                </UIButton>
                <UIButton
                  type="button"
                  className="p-button"
                  style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '10px' }}
                  onClick={() => setIsRejectOpen(true)}
                >
                  <XCircle size={16} /> Từ chối bài viết
                </UIButton>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', textAlign: 'center', color: '#166534' }}>
                <div style={{ fontSize: '24px', marginBottom: 'var(--space-1)' }}>✓</div>
                <h4 style={{ margin: '0 0 var(--space-1) 0', fontSize: '14px', fontWeight: '700' }}>Bài viết đã được kiểm duyệt</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>
                  Xử lý bởi: <strong>{currentPost.reviewedBy || 'nhân viên'}</strong>
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
          onClose={() => setIsApproveOpen(false)}
          title="Xác nhận Duyệt bài viết"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              Bạn có chắc chắn muốn phê duyệt bài viết <strong>"{currentPost.title}"</strong> để xuất hiện công khai trên trang Cộng đồng?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: '10px' }}>
              <UIButton type="button" className="p-button" onClick={() => setIsApproveOpen(false)}>
                Hủy
              </UIButton>
              <UIButton
                type="button"
                className="p-button primary"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleApprove}
              >
                Đồng ý duyệt
              </UIButton>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: REQUEST CHANGES */}
      {isChangesOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsChangesOpen(false)}
          title="Yêu cầu chỉnh sửa bài viết"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              Nhập nội dung hướng dẫn tác giả chỉnh sửa (ví dụ: bổ sung giá cụ thể, thay đổi hình ảnh rõ nét...):
            </p>
            <textarea
              rows={4}
              placeholder="Nhập yêu cầu chỉnh sửa..."
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              style={{ width: '100%', padding: '9px var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <UIButton type="button" className="p-button" onClick={() => setIsChangesOpen(false)}>
                Hủy
              </UIButton>
              <UIButton
                type="button"
                className="p-button primary"
                style={{ background: '#ea580c', borderColor: '#ea580c' }}
                onClick={handleRequestChanges}
              >
                Gửi yêu cầu chỉnh sửa
              </UIButton>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: REJECT */}
      {isRejectOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRejectOpen(false)}
          title="Từ chối đăng bài viết"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              Nhập lý do từ chối bài viết này (vi phạm quy chuẩn, nội dung lừa đảo hoặc không phù hợp...):
            </p>
            <textarea
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              style={{ width: '100%', padding: '9px var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <UIButton type="button" className="p-button" onClick={() => setIsRejectOpen(false)}>
                Hủy
              </UIButton>
              <UIButton
                type="button"
                className="p-button primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleReject}
              >
                Xác nhận từ chối
              </UIButton>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
