import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LifeBuoy,
  Building2,
  User,
  Phone,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { MOCK_STAFF_ASSISTANCE } from '../../fixtures/mockStaffData.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function StaffAssistanceRequestDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notify = useToast();
  const requestId = params.get('id') || 'REQ-2026-001';

  const [requests, setRequests] = useState(MOCK_STAFF_ASSISTANCE);
  const currentReq = requests.find(r => r.id === requestId) || requests[0];

  const [replyText, setReplyText] = useState('');
  const [actionModal, setActionModal] = useState(null); // 'IN_PROGRESS' | 'WAITING_FOR_HOST' | 'RESOLVED'
  const [actionNote, setActionNote] = useState('');

  if (!currentReq) {
    return (
      <div className="portal-page-container staff-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2>Không tìm thấy yêu cầu hỗ trợ</h2>
        <Link to="/staff/assistance" className="p-button primary">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    const newMsg = {
      id: `M-${Date.now()}`,
      senderRole: 'STAFF',
      senderName: `${user?.fullName || 'Nguyễn Văn An'} (Staff)`,
      text: replyText,
      timestamp: new Date().toISOString()
    };
    const updated = {
      ...currentReq,
      status: currentReq.status === 'PENDING' ? 'IN_PROGRESS' : currentReq.status,
      statusLabel: currentReq.status === 'PENDING' ? 'Đang xử lý' : currentReq.statusLabel,
      messages: [...(currentReq.messages || []), newMsg],
      updatedAt: new Date().toISOString()
    };
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setReplyText('');
    notify('Đã gửi phản hồi nghiệp vụ tới Chủ trọ!', 'success');
  };

  const handleExecuteAction = () => {
    const statusMap = {
      IN_PROGRESS: { status: 'IN_PROGRESS', label: 'Đang xử lý', action: 'TIẾP NHẬN' },
      WAITING_FOR_HOST: { status: 'WAITING_FOR_HOST', label: 'Chờ Host bổ sung', action: 'YÊU CẦU BỔ SUNG' },
      RESOLVED: { status: 'RESOLVED', label: 'Đã giải quyết', action: 'HOÀN TẤT' }
    };
    const target = statusMap[actionModal];
    if (!target) return;

    const newHistory = {
      timestamp: new Date().toISOString(),
      actor: `${user?.fullName || 'Nguyễn Văn An'} (Staff)`,
      action: target.action,
      note: actionNote || `Chuyển trạng thái sang ${target.label}`
    };

    const updated = {
      ...currentReq,
      status: target.status,
      statusLabel: target.label,
      updatedAt: new Date().toISOString(),
      history: [...(currentReq.history || []), newHistory]
    };

    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setActionModal(null);
    setActionNote('');
    notify(`Đã cập nhật trạng thái yêu cầu sang: ${target.label}`, 'success');
  };

  return (
    <div className="portal-page-container staff-content">
      <DemoNoticeBanner
        message="Chi tiết yêu cầu hỗ trợ đối tác. Nhân viên vận hành trao đổi trực tiếp và cập nhật tiến độ giải quyết."
      />

      {/* Back Link & Header */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/staff/assistance"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0d9488', fontWeight: '600', textDecoration: 'none', marginBottom: '8px' }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách yêu cầu
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: '#f0fdfa', color: '#0d9488', marginRight: '8px' }}>
              {currentReq.categoryLabel}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Mã: {currentReq.code}</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
              {currentReq.title}
            </h1>
          </div>
          <StatusBadge status={currentReq.status}>{currentReq.statusLabel}</StatusBadge>
        </div>
      </div>

      {/* Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Column (68%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section 1: Nội dung yêu cầu */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              1. Nội dung yêu cầu từ Chủ trọ
            </h2>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
              {currentReq.description}
            </div>
          </section>

          {/* Section 2: Thông tin liên quan */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              2. Thông tin đối tác & Cơ sở liên quan
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Chủ trọ gửi yêu cầu:</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>{currentReq.hostName}</div>
                <div style={{ fontSize: '12px', color: '#0d9488' }}>{currentReq.hostPhone}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Nhà trọ liên quan:</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>{currentReq.propertyTitle}</div>
              </div>
            </div>
          </section>

          {/* Section 3: Trao đổi & Phản hồi */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              3. Trao đổi & Phản hồi nghiệp vụ
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {(currentReq.messages || []).map(msg => (
                <div
                  key={msg.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: msg.senderRole === 'STAFF' ? '#f0fdfa' : '#f8fafc',
                    border: msg.senderRole === 'STAFF' ? '1px solid #ccfbf1' : '1px solid #e2e8f0',
                    alignSelf: msg.senderRole === 'STAFF' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>{msg.senderName}</strong>
                    <span>{new Date(msg.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.5' }}>{msg.text}</div>
                </div>
              ))}
            </div>

            {currentReq.status !== 'RESOLVED' && (
              <div>
                <label htmlFor="staff-response-input" style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Gửi phản hồi cho Chủ trọ:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    id="staff-response-input"
                    rows={3}
                    placeholder="Nhập hướng dẫn xử lý, yêu cầu thông tin hoặc kết quả kiểm tra..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="p-button primary"
                    onClick={handleSendReply}
                  >
                    <Send size={15} /> Gửi phản hồi
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 4: History Timeline */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
              4. Nhật ký xử lý & Lịch sử
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentReq.history || []).map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488', marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{h.actor}</strong>: {h.action} — {h.note}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(h.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (32%) - Decision Aside */}
        <div style={{ position: 'sticky', top: '90px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px 0' }}>
              Điều phối & Trạng thái
            </h3>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Trạng thái hiện tại:</span>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status={currentReq.status}>{currentReq.statusLabel}</StatusBadge>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nhân viên phụ trách:</span>
                <strong>{currentReq.assignedStaff || 'Chưa phân công'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ngày tạo:</span>
                <span>{new Date(currentReq.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Cập nhật lần cuối:</span>
                <span>{new Date(currentReq.updatedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {currentReq.status !== 'RESOLVED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentReq.status === 'PENDING' && (
                  <button
                    type="button"
                    className="p-button primary"
                    style={{ background: '#2563eb', borderColor: '#2563eb', padding: '10px' }}
                    onClick={() => { setActionModal('IN_PROGRESS'); setActionNote(''); }}
                  >
                    Tiếp nhận xử lý yêu cầu
                  </button>
                )}
                <button
                  type="button"
                  className="p-button"
                  style={{ color: '#d97706', borderColor: '#fde68a', padding: '10px' }}
                  onClick={() => { setActionModal('WAITING_FOR_HOST'); setActionNote(''); }}
                >
                  Yêu cầu Host bổ sung thông tin
                </button>
                <button
                  type="button"
                  className="p-button primary"
                  style={{ background: '#10b981', borderColor: '#10b981', padding: '10px' }}
                  onClick={() => { setActionModal('RESOLVED'); setActionNote(''); }}
                >
                  Hoàn tất / Giải quyết yêu cầu
                </button>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', textAlign: 'center', color: '#166534' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>✅</div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>Yêu cầu đã được giải quyết</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>
                  Phiếu hỗ trợ đã đóng theo đúng quy trình nghiệp vụ.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ACTION CONFIRMATION */}
      {actionModal && (
        <Modal
          isOpen={true}
          onClose={() => setActionModal(null)}
          title={
            actionModal === 'IN_PROGRESS' ? 'Tiếp nhận xử lý yêu cầu' :
            actionModal === 'WAITING_FOR_HOST' ? 'Yêu cầu Host bổ sung thông tin' :
            'Hoàn tất giải quyết yêu cầu hỗ trợ'
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
              {actionModal === 'IN_PROGRESS' && 'Xác nhận tiếp nhận phụ trách phiếu hỗ trợ này và bắt đầu xử lý.'}
              {actionModal === 'WAITING_FOR_HOST' && 'Gửi thông báo yêu cầu Chủ trọ cung cấp thêm thông tin chứng minh hoặc hồ sơ.'}
              {actionModal === 'RESOLVED' && 'Xác nhận đã xử lý xong và hoàn tất giải quyết phiếu hỗ trợ.'}
            </p>
            <div>
              <label htmlFor="action-note-input" style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Ghi chú nghiệp vụ (tùy chọn):
              </label>
              <textarea
                id="action-note-input"
                rows={3}
                placeholder="Nhập ghi chú vào nhật ký..."
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="p-button" onClick={() => setActionModal(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="p-button primary"
                onClick={handleExecuteAction}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
