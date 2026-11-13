import UIField from '../../components/common/Field.jsx';
import UIButton from '../../components/common/Button.jsx';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LifeBuoy,
  Plus,
  RotateCcw,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Send,
  Building2,
  FileText,
  User,
  List,
  LayoutGrid
} from 'lucide-react';
import { MOCK_HOST_SUPPORT, MOCK_HOST_PROPERTY } from '../../fixtures/mockHostData.js';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useToast } from '../../components/PortalUI.jsx';

const SUPPORT_CATEGORIES = [
  { value: 'PROPERTY_LISTING', label: 'Nhà trọ & thông tin đăng' },
  { value: 'VERIFICATION', label: 'Xác minh / xét duyệt nhà trọ' },
  { value: 'ROOMS_AVAILABILITY', label: 'Phòng & biểu phí dịch vụ' },
  { value: 'ACCOUNT', label: 'Tài khoản & phân quyền' },
  { value: 'OTHER', label: 'Vấn đề kỹ thuật khác' }
];

export default function HostSupportPage() {
  const notify = useToast();
  const [requests, setRequests] = useState(MOCK_HOST_SUPPORT);
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NEWEST');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // New Request Form State
  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formReply, setFormReply] = useState('');

  // KPIs
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS' || r.status === 'WAITING_FOR_HOST').length;
  const resolvedCount = requests.filter(r => r.status === 'RESOLVED').length;

  const filteredRequests = useMemo(() => {
    return requests
      .filter(item => {
        if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchTitle = item.subject?.toLowerCase().includes(q) || item.title?.toLowerCase().includes(q);
          const matchCode = item.ticketCode?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q) || item.id?.toLowerCase().includes(q);
          const matchContent = item.content?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchCode && !matchContent) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt);
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [requests, statusFilter, categoryFilter, search, sortOrder]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formSubject.trim() || !formCategory || !formContent.trim()) {
      notify('Vui lòng điền đầy đủ các thông tin bắt buộc (*)', 'error');
      return;
    }

    const catObj = SUPPORT_CATEGORIES.find(c => c.value === formCategory);
    const newReq = {
      id: `REQ-${Date.now()}`,
      ticketCode: `SP-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: formSubject,
      category: formCategory,
      categoryLabel: catObj ? catObj.label : formCategory,
      content: formContent,
      status: 'PENDING',
      statusLabel: 'Chờ tiếp nhận',
      createdAt: new Date().toISOString(),
      replies: [
        {
          id: 1,
          author: MOCK_HOST_PROPERTY.hostName,
          role: 'HOST',
          time: new Date().toLocaleString('vi-VN'),
          text: formContent
        }
      ]
    };

    setRequests([newReq, ...requests]);
    setIsCreateOpen(false);
    setFormSubject('');
    setFormCategory('');
    setFormContent('');
    notify('Đã gửi yêu cầu hỗ trợ tới nhân viên HL_RCS!', 'success');
  };

  const handleSendReply = () => {
    if (!formReply.trim()) return;
    const updated = {
      ...selectedRequest,
      replies: [
        ...(selectedRequest.replies || []),
        {
          id: Date.now(),
          author: MOCK_HOST_PROPERTY.hostName,
          role: 'HOST',
          time: new Date().toLocaleString('vi-VN'),
          text: formReply
        }
      ]
    };
    setSelectedRequest(updated);
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setFormReply('');
    notify('Đã gửi phản hồi thành công!', 'success');
  };

  return (
    <div className="portal-page-container sp-main-area">
      <DemoNoticeBanner
        message="Module Yêu cầu nhân viên hỗ trợ kết nối trực tiếp với đội ngũ vận hành HL_RCS. Phản hồi và tạo phiếu hoạt động ngay trên giao diện thử nghiệm."
      />

      {/* Header */}
      <div className="sp-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 var(--space-1) 0' }}>Yêu cầu hỗ trợ</h1>
          <p style={{ margin: 0, color: 'var(--ui-muted)', fontSize: '14px' }}>Gửi và theo dõi các yêu cầu hỗ trợ kỹ thuật, kiểm định và vận hành từ HL_RCS.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <UIButton
            type="button"
            className="p-button"
            onClick={() => {
              setRequests(MOCK_HOST_SUPPORT);
              notify('Đã làm mới danh sách yêu cầu hỗ trợ', 'info');
            }}
          >
            <RotateCcw size={16} /> Làm mới
          </UIButton>
          <UIButton
            type="button"
            className="p-button primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} /> Gửi yêu cầu hỗ trợ
          </UIButton>
        </div>
      </div>

      {/* Info Notice Banner */}
      <section className="support-info-banner" style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px' }}>ℹ️</span>
        <div style={{ fontSize: '13px', color: '#134e4a', lineHeight: '1.5' }}>
          Đội ngũ vận hành HL_RCS tiếp nhận xử lý các vấn đề về hiển thị nhà trọ, kiểm định phòng thực tế, cập nhật biểu phí và hỗ trợ kỹ thuật trong giờ hành chính (8h00 - 18h00 từ Thứ 2 đến Thứ 7).
        </div>
      </section>

      {/* KPIs */}
      <section className="kpi-metric-grid" style={{ display: 'grid', '--grid-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <article
          className="kpi-metric-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => setStatusFilter('ALL')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Tất cả yêu cầu</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{totalCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Tổng số phiếu đã gửi</div>
        </article>

        <article
          className="kpi-metric-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'PENDING' ? '2px solid #f59e0b' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => setStatusFilter('PENDING')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Chờ tiếp nhận</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginBottom: '6px' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Chờ nhân viên phân công</div>
        </article>

        <article
          className="kpi-metric-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'IN_PROGRESS' ? '2px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => setStatusFilter('IN_PROGRESS')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Đang xử lý</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginBottom: '6px' }}>{inProgressCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>nhân viên đang hỗ trợ</div>
        </article>

        <article
          className="kpi-metric-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'RESOLVED' ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => setStatusFilter('RESOLVED')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Đã hoàn tất</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginBottom: '6px' }}>{resolvedCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Đã phản hồi & giải quyết</div>
        </article>
      </section>

      {/* Toolbar & Filters */}
      <section className="sp-toolbar-box" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: 'var(--space-4)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flex: 1, minWidth: '240px', gap: 'var(--space-2)', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ui-muted)' }} />
              <input
                type="text"
                placeholder="Tìm theo mã (#SP...), tiêu đề, nội dung..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px var(--space-3) 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              aria-label="Lọc loại vấn đề"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả loại vấn đề</option>
              {SUPPORT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ tiếp nhận</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã hoàn tất</option>
            </select>

            <select
              aria-label="Sắp xếp"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="OLDEST">Cũ nhất</option>
            </select>

            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <UIButton
                type="button"
                onClick={() => setViewMode('table')}
                style={{ padding: 'var(--space-2) var(--space-3)', border: 'none', background: viewMode === 'table' ? '#0f766e' : '#fff', color: viewMode === 'table' ? '#fff' : '#64748b', cursor: 'pointer' }}
                title="Xem dạng bảng"
              >
                <List size={16} />
              </UIButton>
              <UIButton
                type="button"
                onClick={() => setViewMode('cards')}
                style={{ padding: 'var(--space-2) var(--space-3)', border: 'none', borderLeft: '1px solid #cbd5e1', background: viewMode === 'cards' ? '#0f766e' : '#fff', color: viewMode === 'cards' ? '#fff' : '#64748b', cursor: 'pointer' }}
                title="Xem dạng thẻ"
              >
                <LayoutGrid size={16} />
              </UIButton>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <UIButton
            type="button"
            className={`p-button ${statusFilter === 'ALL' ? 'primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả ({totalCount})
          </UIButton>
          <UIButton
            type="button"
            className={`p-button ${statusFilter === 'PENDING' ? 'primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('PENDING')}
          >
            Chờ tiếp nhận ({pendingCount})
          </UIButton>
          <UIButton
            type="button"
            className={`p-button ${statusFilter === 'IN_PROGRESS' ? 'primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            Đang xử lý ({inProgressCount})
          </UIButton>
          <UIButton
            type="button"
            className={`p-button ${statusFilter === 'RESOLVED' ? 'primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '13px' }}
            onClick={() => setStatusFilter('RESOLVED')}
          >
            Đã hoàn tất ({resolvedCount})
          </UIButton>
        </div>
      </section>

      {/* Main Content List */}
      {filteredRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '36px', marginBottom: 'var(--space-3)' }}>💬</div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>Chưa có yêu cầu hỗ trợ nào</h3>
          <p style={{ fontSize: '14px', color: 'var(--ui-muted)', margin: '0 0 var(--space-4) 0' }}>Nếu gặp vấn đề khi quản lý nhà trọ, bạn có thể tạo phiếu yêu cầu mới.</p>
          <UIButton
            type="button"
            className="p-button primary"
            onClick={() => setIsCreateOpen(true)}
          >
            + Gửi yêu cầu hỗ trợ ngay
          </UIButton>
        </div>
      ) : viewMode === 'table' ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: '700', color: '#475569', fontSize: '12px' }}>MÃ PHIẾU</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: '700', color: '#475569', fontSize: '12px' }}>TIÊU ĐỀ & NỘI DUNG</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: '700', color: '#475569', fontSize: '12px' }}>LOẠI VẤN ĐỀ</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: '700', color: '#475569', fontSize: '12px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: '700', color: '#475569', fontSize: '12px' }}>GỬI LÚC</th>
                  <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: '700', color: '#475569', fontSize: '12px', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: index < filteredRequests.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px var(--space-4)', fontWeight: '700', color: '#0f766e' }}>
                      {item.ticketCode || item.code}
                    </td>
                    <td style={{ padding: '14px var(--space-4)', maxWidth: '380px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{item.subject || item.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--ui-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.content || item.description}
                      </div>
                      {item.assignedStaff && (
                        <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '2px' }}>
                          Phụ trách: {item.assignedStaff}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px var(--space-4)' }}>
                      <span style={{ fontSize: '12px', padding: '3px var(--space-2)', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                        {item.categoryLabel}
                      </span>
                    </td>
                    <td style={{ padding: '14px var(--space-4)' }}>
                      <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
                    </td>
                    <td style={{ padding: '14px var(--space-4)', fontSize: '12px', color: 'var(--ui-muted)' }}>
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '14px var(--space-4)', textAlign: 'right' }}>
                      <UIButton
                        type="button"
                        className="p-button"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => setSelectedRequest(item)}
                      >
                        <Eye size={14} /> Chi tiết
                      </UIButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', '--grid-columns': 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredRequests.map(item => (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f766e' }}>{item.ticketCode || item.code}</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: '2px 0 0 0', color: '#0f172a' }}>{item.subject || item.title}</h3>
                </div>
                <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#475569', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.content || item.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--ui-muted)', marginTop: 'auto', paddingTop: 'var(--space-2)', borderTop: '1px solid #f1f5f9' }}>
                <span>{item.categoryLabel}</span>
                <UIButton
                  type="button"
                  className="p-button"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  onClick={() => setSelectedRequest(item)}
                >
                  <Eye size={14} /> Chi tiết
                </UIButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CREATE SUPPORT REQUEST */}
      {isCreateOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Gửi yêu cầu hỗ trợ mới"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', padding: '10px var(--space-3)', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
              🔒 Vui lòng không chia sẻ mật khẩu, mã OTP hoặc thông tin ngân hàng trong nội dung yêu cầu.
            </div>

            <div>
              <UIField htmlFor="req-title" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: 'var(--space-1)' }}>
                Tiêu đề yêu cầu <span style={{ color: '#ef4444' }}>*</span>
              </UIField>
              <input
                id="req-title"
                type="text"
                placeholder="Ví dụ: Cần cập nhật lại giá điện sinh hoạt"
                maxLength={120}
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                style={{ width: '100%', padding: '9px var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>

            <div>
              <UIField htmlFor="req-cat" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: 'var(--space-1)' }}>
                Loại vấn đề <span style={{ color: '#ef4444' }}>*</span>
              </UIField>
              <select
                id="req-cat"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                style={{ width: '100%', padding: '9px var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
                required
              >
                <option value="">-- Chọn loại vấn đề --</option>
                {SUPPORT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <UIField htmlFor="req-desc" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: 'var(--space-1)' }}>
                Mô tả chi tiết <span style={{ color: '#ef4444' }}>*</span>
              </UIField>
              <textarea
                id="req-desc"
                rows={4}
                placeholder="Mô tả cụ thể nội dung cần hỗ trợ để nhân viên có thể xử lý nhanh nhất..."
                maxLength={1000}
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                style={{ width: '100%', padding: '9px var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: '10px' }}>
              <UIButton type="button" className="p-button" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </UIButton>
              <UIButton type="submit" className="p-button primary">
                Gửi yêu cầu
              </UIButton>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: REQUEST DETAILS & THREAD */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title={`Phiếu yêu cầu #${selectedRequest.ticketCode || selectedRequest.code}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 'var(--space-3) var(--space-4)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Trạng thái:</span>
                <div style={{ marginTop: 'var(--space-1)' }}>
                  <StatusBadge status={selectedRequest.status}>{selectedRequest.statusLabel}</StatusBadge>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>Loại vấn đề:</span>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{selectedRequest.categoryLabel}</div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
                {selectedRequest.subject || selectedRequest.title}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.5', background: '#f8fafc', padding: 'var(--space-3)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {selectedRequest.content || selectedRequest.description}
              </p>
            </div>

            {/* Conversation Messages */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px' }}>
                Trao đổi & Phản hồi
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                {(selectedRequest.replies && selectedRequest.replies.length > 0) ? (
                  selectedRequest.replies.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: msg.role === 'HOST' ? '#f0fdfa' : '#f1f5f9',
                        border: msg.role === 'HOST' ? '1px solid #ccfbf1' : '1px solid #e2e8f0',
                        alignSelf: msg.role === 'HOST' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: '11px', color: 'var(--ui-muted)', marginBottom: 'var(--space-1)' }}>
                        <strong>{msg.author}</strong>
                        <span>{msg.time}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#1e293b' }}>{msg.text}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: 'var(--ui-muted)' }}>
                    Chưa có phản hồi nào. Nhân viên sẽ sớm tiếp nhận yêu cầu của bạn.
                  </div>
                )}
              </div>
            </div>

            {/* Reply Input */}
            {selectedRequest.status !== 'RESOLVED' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder="Gửi phản hồi bổ sung cho nhân viên..."
                  value={formReply}
                  onChange={e => setFormReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
                  style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <UIButton
                  type="button"
                  className="p-button primary"
                  onClick={handleSendReply}
                >
                  <Send size={15} /> Gửi
                </UIButton>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              <UIButton type="button" className="p-button" onClick={() => setSelectedRequest(null)}>
                Đóng
              </UIButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
