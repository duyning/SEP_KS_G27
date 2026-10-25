import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  LifeBuoy,
  Clock,
  MessageSquare,
  CheckCircle2,
  Eye,
  User
} from 'lucide-react';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { MOCK_STAFF_ASSISTANCE } from '../../fixtures/mockStaffData.js';
import { useToast } from '../../components/PortalUI.jsx';

export default function StaffAssistanceRequestsPage() {
  const notify = useToast();
  const [requests, setRequests] = useState(MOCK_STAFF_ASSISTANCE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalAssigned = requests.length;
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
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchCode = item.code?.toLowerCase().includes(q) || item.id?.toLowerCase().includes(q);
          const matchHost = item.hostName?.toLowerCase().includes(q);
          const matchProp = item.propertyTitle?.toLowerCase().includes(q);
          if (!matchTitle && !matchCode && !matchHost && !matchProp) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortOrder === 'OLDEST') return new Date(a.createdAt) - new Date(b.createdAt);
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
  }, [requests, statusFilter, categoryFilter, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedItems = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="portal-page-container staff-content">
      <DemoNoticeBanner
        message="Xem và xử lý các yêu cầu hỗ trợ được phân công cho bạn từ các Chủ trọ đối tác."
      />

      {/* Header */}
      <section className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Yêu cầu hỗ trợ từ đối tác</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Xem, tiếp nhận và giải quyết các yêu cầu hỗ trợ được phân công cho bạn từ các Chủ trọ đối tác.
          </p>
        </div>
        <button
          type="button"
          className="p-button"
          onClick={() => {
            setRequests(MOCK_STAFF_ASSISTANCE);
            notify('Đã làm mới danh sách yêu cầu hỗ trợ', 'info');
          }}
        >
          <RotateCcw size={15} /> Làm mới
        </button>
      </section>

      {/* KPI Cards */}
      <section className="staff-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'ALL' ? '2px solid #0d9488' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('ALL'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Được giao cho tôi</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{totalAssigned}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Tổng phụ trách</span>
        </article>

        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'PENDING' ? '2px solid #f59e0b' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('PENDING'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Chờ xử lý</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginBottom: '4px' }}>{pendingCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Chưa tiếp nhận</span>
        </article>

        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'IN_PROGRESS' ? '2px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('IN_PROGRESS'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Đang xử lý</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginBottom: '4px' }}>{inProgressCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Đang trao đổi</span>
        </article>

        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'RESOLVED' ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('RESOLVED'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Đã giải quyết</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginBottom: '4px' }}>{resolvedCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Đã hoàn tất</span>
        </article>
      </section>

      {/* Table Section */}
      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo mã (#SP...), tiêu đề, chủ trọ..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý (Pending)</option>
              <option value="IN_PROGRESS">Đang xử lý (In Progress)</option>
              <option value="WAITING_FOR_HOST">Chờ Host bổ sung (Waiting)</option>
              <option value="RESOLVED">Đã giải quyết (Resolved)</option>
            </select>

            <select
              aria-label="Lọc loại vấn đề"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả loại vấn đề</option>
              <option value="PROPERTY_LISTING">Nhà trọ & thông tin đăng</option>
              <option value="VERIFICATION">Xác minh / xét duyệt nhà trọ</option>
              <option value="ROOMS_AVAILABILITY">Phòng & tình trạng phòng</option>
              <option value="ACCOUNT">Tài khoản & phân quyền</option>
              <option value="OTHER">Vấn đề khác</option>
            </select>

            <select
              aria-label="Sắp xếp"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="NEWEST">Mới nhất trước</option>
              <option value="OLDEST">Cũ nhất trước</option>
              <option value="UPDATED">Cập nhật gần nhất</option>
            </select>

            <button
              type="button"
              className="p-button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                setSortOrder('NEWEST');
                setPage(1);
              }}
            >
              <RotateCcw size={14} /> Đặt lại
            </button>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
          Hiển thị: <strong>{filteredRequests.length}</strong> yêu cầu
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '38%' }}>MÃ YÊU CẦU & NỘI DUNG</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '20%' }}>CHỦ TRỌ / NHÀ TRỌ</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '14%' }}>VẤN ĐỀ</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '12%' }}>NGÀY GỬI</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '10%' }}>TRẠNG THÁI</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '6%', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Không tìm thấy yêu cầu hỗ trợ nào.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: index < paginatedItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                        {item.description}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', marginTop: '4px', display: 'inline-block' }}>
                        {item.code}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.hostName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{item.propertyTitle}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                        {item.categoryLabel}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#475569' }}>
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <Link
                        to={`/staff/assistance/detail?id=${item.id}`}
                        className="p-button primary"
                        style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> Xử lý
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ marginTop: '16px' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredRequests.length}
            pageSize={pageSize}
          />
        </div>
      </section>
    </div>
  );
}
