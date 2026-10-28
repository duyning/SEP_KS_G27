import { MotionButton } from '../../components/motion/MotionUI.jsx';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { useCommunityLoad } from '../../components/CommunityUI.jsx';

export default function StaffCommunityModerationPage() {
  const state = useCommunityLoad('moderation');
  const posts = state.data || [];
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalCount = posts.length;
  const pendingCount = posts.filter(p => p.status === 'PENDING').length;
  const needChangesCount = posts.filter(p => p.status === 'NEED_CHANGES').length;
  const processedCount = posts.filter(p => p.status === 'APPROVED' || p.status === 'REJECTED').length;

  const catPendingTransfer = posts.filter(p => p.type === 'ROOM_TRANSFER' && p.status === 'PENDING').length;
  const catPendingRoommate = posts.filter(p => p.type === 'ROOMMATE' && p.status === 'PENDING').length;
  const catPendingSecondhand = posts.filter(p => p.type === 'SECOND_HAND' && p.status === 'PENDING').length;

  const filteredPosts = useMemo(() => {
    return posts
      .filter(item => {
        if (categoryFilter !== 'ALL' && item.type !== categoryFilter) return false;
        if (statusFilter === 'PROCESSED' && !['APPROVED', 'REJECTED'].includes(item.status)) return false;
        if (!['ALL', 'PROCESSED'].includes(statusFilter) && item.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchAuthor = item.authorName?.toLowerCase().includes(q);
          const matchLoc = item.location?.toLowerCase().includes(q);
          if (!matchTitle && !matchAuthor && !matchLoc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [posts, categoryFilter, statusFilter, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (state.loading) return <p role="status">Đang tải danh sách bài viết...</p>;
  if (state.error) return <div role="alert"><p>{state.error}</p><button className="p-button" onClick={state.reload}>Thử lại</button></div>;

  return (
    <div className="portal-page-container staff-content">
      <p style={{ color: '#64748b', fontSize: 13 }}>Chỉ các bài viết đã duyệt mới xuất hiện công khai. Mỗi quyết định được lưu vào lịch sử kiểm duyệt.</p>

      {/* Header */}
      <section className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Kiểm duyệt cộng đồng</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Kiểm duyệt 3 loại bài: Nhượng phòng, Tìm người ở ghép, Đồ cũ sinh viên trước khi xuất hiện công khai.
          </p>
        </div>
        <MotionButton
          type="button"
          className="p-button"
          onClick={state.reload}
        >
          <RotateCcw size={15} /> Làm mới
        </MotionButton>
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
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Tổng bài viết</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{totalCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Toàn bộ bài viết</span>
        </article>

        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'PENDING' ? '2px solid #f59e0b' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('PENDING'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Chờ kiểm duyệt</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginBottom: '4px' }}>{pendingCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Cần xem xét ngay</span>
        </article>

        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'NEED_CHANGES' ? '2px solid #f97316' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('NEED_CHANGES'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Cần chỉnh sửa</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ea580c', marginBottom: '4px' }}>{needChangesCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Chờ tác giả sửa</span>
        </article>

        <article
          className="kpi-card"
          tabIndex={0}
          role="button"
          style={{ background: '#fff', border: statusFilter === 'PROCESSED' ? '2px solid #10b981' : '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('PROCESSED'); setPage(1); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Đã xử lý</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginBottom: '4px' }}>{processedCount}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Duyệt & từ chối</span>
        </article>
      </section>

      {/* Category Breakdown Summary Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', alignItems: 'center', fontSize: '13px' }}>
        <span style={{ color: '#64748b', fontWeight: '600' }}>Chờ duyệt theo loại:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f0fdfa', color: '#0d9488', fontWeight: '600' }}>Nhượng phòng</span>
          <strong>{catPendingTransfer}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#faf5ff', color: '#9333ea', fontWeight: '600' }}>Tìm người ở ghép</span>
          <strong>{catPendingRoommate}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fff7ed', color: '#ea580c', fontWeight: '600' }}>Đồ cũ sinh viên</span>
          <strong>{catPendingSecondhand}</strong>
        </div>
      </div>

      {/* Table Section */}
      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        {/* Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, tác giả, vị trí..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              aria-label="Lọc loại bài"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả loại bài</option>
              <option value="ROOM_TRANSFER">Nhượng phòng</option>
              <option value="ROOMMATE">Tìm người ở ghép</option>
              <option value="SECOND_HAND">Đồ cũ sinh viên</option>
            </select>

            <select
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ kiểm duyệt</option>
              <option value="NEED_CHANGES">Cần chỉnh sửa</option>
              <option value="PROCESSED">Đã xử lý (duyệt / từ chối)</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>

            <select
              aria-label="Sắp xếp"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>

            <MotionButton
              type="button"
              className="p-button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
                setSortOrder('newest');
                setPage(1);
              }}
            >
              <RotateCcw size={14} /> Đặt lại
            </MotionButton>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
          Hiển thị: <strong>{filteredPosts.length}</strong> bài viết
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '36%' }}>BÀI VIẾT</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '14%' }}>LOẠI</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '18%' }}>TÁC GIẢ</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '14%' }}>NGÀY GỬI</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '10%' }}>TRẠNG THÁI</th>
                <th style={{ padding: '12px 14px', color: '#475569', fontSize: '12px', fontWeight: '700', width: '8%', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Không có bài viết cộng đồng nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: index < paginatedItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px' }}>
                        <span>📍 {item.location}</span>
                        {item.priceDisplay && <span>• 💰 {item.priceDisplay}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: item.type === 'ROOM_TRANSFER' ? '#f0fdfa' : item.type === 'ROOMMATE' ? '#faf5ff' : '#fff7ed', color: item.type === 'ROOM_TRANSFER' ? '#0d9488' : item.type === 'ROOMMATE' ? '#9333ea' : '#ea580c', fontWeight: '600' }}>
                        {item.typeLabel}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.authorName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{item.authorPhone}</div>
                    </td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#475569' }}>
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <StatusBadge status={item.status} label={item.statusLabel} />
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <Link
                        to={`/staff/community/detail?id=${item.id}`}
                        className="p-button primary"
                        style={{ padding: '6px 10px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> Thẩm định
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
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredPosts.length}
            pageSize={pageSize}
          />
        </div>
      </section>
    </div>
  );
}
