import '../../styles/admin-dashboard.css';
import { MotionButton } from '../../components/motion/MotionUI.jsx';
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Shield,
  RotateCcw,
  Users,
  Building2,
  MessagesSquare,
  Headset,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  History,
  LayoutDashboard
} from 'lucide-react';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/PortalUI.jsx';
import { MOCK_STAFF_VERIFICATIONS, MOCK_STAFF_ASSISTANCE } from '../../fixtures/mockStaffData.js';
import { MOCK_COMMUNITY_POSTS } from '../../fixtures/mockCommunityData.js';

const DEFAULT_ACCOUNTS = [
  { id: 'ACC-1', name: 'Ban Quản Trị HL_RCS', email: 'admin@hlrcs.vn', phone: '0900000000', role: 'ADMIN', roleLabel: 'Quản trị viên' },
  { id: 'ACC-2', name: 'Nguyễn Văn An', email: 'staff@hlrcs.vn', phone: '0933445566', role: 'STAFF', roleLabel: 'Nhân viên vận hành' },
  { id: 'ACC-3', name: 'Lê Thị Thảo', email: 'staffb@hlrcs.vn', phone: '0944556677', role: 'STAFF', roleLabel: 'Hỗ trợ đối tác' },
  { id: 'ACC-4', name: 'Trần Gia Huy', email: 'host@hlrcs.vn', phone: '0987654321', role: 'ROOM_HOST', roleLabel: 'Chủ trọ' },
  { id: 'ACC-5', name: 'Hoàng Văn B', email: 'hostb@hlrcs.vn', phone: '0911223344', role: 'ROOM_HOST', roleLabel: 'Chủ trọ' },
  { id: 'ACC-6', name: 'Nguyễn Minh Anh', email: 'renter@hlrcs.vn', phone: '0912345678', role: 'USER', roleLabel: 'Người thuê' }
];

const DEFAULT_STAFFS = [
  { code: 'staff_01', name: 'Nguyễn Văn An', phone: '0933445566' },
  { code: 'staff_02', name: 'Lê Thị Thảo', phone: '0944556677' }
];

const DEFAULT_ACTIVITY = [
  { id: 'ACT-1', entityTitle: 'Phê duyệt xác minh cơ sở Minh Quân', actor: 'Nguyễn Văn An (Staff)', decision: 'APPROVED', time: '10 phút trước' },
  { id: 'ACT-2', entityTitle: 'Tiếp nhận xử lý yêu cầu #SP-7701', actor: 'Lê Thị Thảo (Staff)', decision: 'IN_PROGRESS', time: '1 giờ trước' },
  { id: 'ACT-3', entityTitle: 'Duyệt bài đăng nhượng phòng sinh viên FPT', actor: 'Nguyễn Văn An (Staff)', decision: 'APPROVED', time: '3 giờ trước' },
  { id: 'ACT-4', entityTitle: 'Cập nhật phân công nhân viên hỗ trợ đối tác', actor: 'Ban Quản Trị (Admin)', decision: 'ASSIGNED', time: 'Hôm qua' }
];

export default function AdminDashboardPage() {
  const [params, setParams] = useSearchParams();
  const notify = useToast();
  const { user } = useAuth();
  
  const currentView = params.get('view') || 'overview'; // 'overview' | 'accounts' | 'assignment' | 'activity'

  // State
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [supportRequests, setSupportRequests] = useState(MOCK_STAFF_ASSISTANCE);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITY);

  // Overview Queue
  const [queueSearch, setQueueSearch] = useState('');
  const [queueType, setQueueType] = useState('ALL');
  const [queuePage, setQueuePage] = useState(1);
  const queuePageSize = 5;

  // Accounts view filters
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRole, setAccountRole] = useState('ALL');

  // Assignment view filters
  const [assignmentFilter, setAssignmentFilter] = useState('OPEN');
  const [assignmentSelections, setAssignmentSelections] = useState({});

  // Activity view filters
  const [activitySearch, setActivitySearch] = useState('');
  const [activityRange, setActivityRange] = useState('ALL');

  // Overview Queue List Compilation
  const queueItems = useMemo(() => {
    const list = [
      ...MOCK_STAFF_VERIFICATIONS.filter(v => v.status === 'PENDING').map(v => ({
        id: v.id,
        title: v.propertyTitle,
        sender: v.hostName,
        type: 'PROPERTY',
        typeLabel: 'Xác minh nhà trọ',
        status: v.status,
        statusLabel: v.statusLabel,
        createdAt: v.submittedAt,
        url: `/staff/verifications/detail?id=${v.id}`
      })),
      ...MOCK_COMMUNITY_POSTS.filter(p => p.status === 'PENDING').map(p => ({
        id: p.id,
        title: p.title,
        sender: p.authorName,
        type: 'COMMUNITY',
        typeLabel: 'Cộng đồng',
        status: p.status,
        statusLabel: p.statusLabel,
        createdAt: p.createdAt,
        url: `/staff/community/detail?id=${p.id}`
      })),
      ...supportRequests.filter(s => s.status !== 'RESOLVED').map(s => ({
        id: s.id,
        title: s.title,
        sender: s.hostName,
        type: 'SUPPORT',
        typeLabel: 'Hỗ trợ đối tác',
        status: s.status,
        statusLabel: s.statusLabel,
        createdAt: s.createdAt,
        url: `/staff/assistance/detail?id=${s.id}`
      }))
    ];

    return list
      .filter(item => {
        if (queueType !== 'ALL' && item.type !== queueType) return false;
        if (queueSearch) {
          const q = queueSearch.toLowerCase();
          return item.title.toLowerCase().includes(q) || item.sender.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [supportRequests, queueType, queueSearch]);

  const totalQueuePages = Math.max(1, Math.ceil(queueItems.length / queuePageSize));
  const paginatedQueue = queueItems.slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize);

  // Accounts list
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      if (accountRole !== 'ALL' && acc.role !== accountRole) return false;
      if (accountSearch) {
        const q = accountSearch.toLowerCase();
        return acc.name.toLowerCase().includes(q) || acc.email.toLowerCase().includes(q) || acc.phone.includes(q);
      }
      return true;
    });
  }, [accounts, accountRole, accountSearch]);

  // Assignment List
  const filteredAssignment = useMemo(() => {
    return supportRequests.filter(req => {
      if (assignmentFilter === 'OPEN') return req.status !== 'RESOLVED';
      return true;
    });
  }, [supportRequests, assignmentFilter]);

  // Activity List
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (activitySearch) {
        const q = activitySearch.toLowerCase();
        return act.entityTitle.toLowerCase().includes(q) || act.actor.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, activitySearch]);

  const handleSaveAssignment = (reqId) => {
    const selectedStaffCode = assignmentSelections[reqId];
    const staff = DEFAULT_STAFFS.find(s => s.code === selectedStaffCode);
    if (!staff) {
      notify('Vui lòng chọn nhân viên phân công', 'error');
      return;
    }

    setSupportRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          assignedStaff: staff.name,
          assignedStaffId: staff.code,
          status: 'IN_PROGRESS',
          statusLabel: 'Đang xử lý',
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    }));

    setActivities(prev => [
      {
        id: `ACT-${Date.now()}`,
        entityTitle: `Phân công yêu cầu #${reqId} cho ${staff.name}`,
        actor: 'Ban Quản Trị (Admin)',
        decision: 'ASSIGNED',
        time: 'Vừa xong'
      },
      ...prev
    ]);

    notify(`Đã phân công thành công cho ${staff.name}!`, 'success');
  };

  const setView = (viewKey) => {
    if (viewKey === 'overview') {
      setParams({}, { replace: true });
    } else {
      setParams({ view: viewKey }, { replace: true });
    }
  };

  return (
    <div className="portal-page-container staff-content admin-content">
      <DemoNoticeBanner
        message="Bảng điều khiển quản trị viên HL_RCS. Theo dõi tổng quan khối lượng vận hành, điều phối phân công nhân viên và nhật ký hoạt động."
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            {currentView === 'overview' && 'Bảng điều khiển quản trị'}
            {currentView === 'accounts' && 'Tài khoản hệ thống'}
            {currentView === 'assignment' && 'Phân công nhân viên'}
            {currentView === 'activity' && 'Nhật ký hoạt động'}
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {currentView === 'overview' && 'Theo dõi hoạt động, kiểm duyệt và điều phối hỗ trợ trên HL_RCS.'}
            {currentView === 'accounts' && 'Quản lý tài khoản người thuê, chủ trọ, nhân viên vận hành và quản trị viên.'}
            {currentView === 'assignment' && 'Điều phối phân công phiếu hỗ trợ cho đội ngũ Chuyên viên vận hành.'}
            {currentView === 'activity' && 'Toàn bộ lịch sử thao tác kiểm định, quyết định và phân công trên hệ thống.'}
          </p>
        </div>
        <MotionButton
          type="button"
          className="p-button"
          onClick={() => {
            setSupportRequests(MOCK_STAFF_ASSISTANCE);
            notify('Đã làm mới dữ liệu quản trị', 'info');
          }}
        >
          <RotateCcw size={15} /> Làm mới
        </MotionButton>
      </div>

      {/* Navigation View Tabs */}
      <div className="admin-view-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
        {[
          ['overview', 'Tổng quan', LayoutDashboard],
          ['accounts', 'Tài khoản hệ thống', Users],
          ['assignment', 'Phân công nhân viên', UserCheck],
          ['activity', 'Nhật ký hoạt động', History]
        ].map(([key, label, Icon]) => (
          <MotionButton
            key={key}
            type="button"
            onClick={() => setView(key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: currentView === key ? '#0d9488' : '#f8fafc',
              color: currentView === key ? '#fff' : '#475569',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icon size={16} /> {label}
          </MotionButton>
        ))}
      </div>

      {/* VIEW 1: OVERVIEW */}
      {currentView === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPIs */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Tài khoản hệ thống</span>
                <Users size={18} style={{ color: '#2563eb' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{accounts.length}</div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>2 nhân viên vận hành</span>
            </article>

            <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Hồ sơ xác minh</span>
                <Building2 size={18} style={{ color: '#0d9488' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{MOCK_STAFF_VERIFICATIONS.length}</div>
              <span style={{ fontSize: '12px', color: '#0d9488' }}>
                {MOCK_STAFF_VERIFICATIONS.filter(v => v.status === 'PENDING').length} hồ sơ cần xử lý
              </span>
            </article>

            <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Bài viết cộng đồng</span>
                <MessagesSquare size={18} style={{ color: '#9333ea' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{MOCK_COMMUNITY_POSTS.length}</div>
              <span style={{ fontSize: '12px', color: '#9333ea' }}>
                {MOCK_COMMUNITY_POSTS.filter(p => p.status === 'PENDING').length} bài cần duyệt
              </span>
            </article>

            <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Yêu cầu hỗ trợ</span>
                <Headset size={18} style={{ color: '#d97706' }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{supportRequests.length}</div>
              <span style={{ fontSize: '12px', color: '#d97706' }}>
                {supportRequests.filter(s => s.status !== 'RESOLVED').length} yêu cầu đang mở
              </span>
            </article>
          </section>

          {/* Operational Split Grid */}
          <div className="admin-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            {/* Workload breakdown */}
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 14px 0' }}>
                Khối lượng vận hành đang mở
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Xác minh nhà trọ', count: MOCK_STAFF_VERIFICATIONS.filter(v => v.status === 'PENDING').length, color: '#0d9488', max: 5 },
                  { label: 'Kiểm duyệt cộng đồng', count: MOCK_COMMUNITY_POSTS.filter(p => p.status === 'PENDING').length, color: '#9333ea', max: 5 },
                  { label: 'Yêu cầu hỗ trợ đối tác', count: supportRequests.filter(s => s.status !== 'RESOLVED').length, color: '#d97706', max: 5 }
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: '#475569', fontWeight: '600' }}>{item.label}</span>
                      <strong style={{ color: '#0f172a' }}>{item.count}</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (item.count / item.max) * 100)}%`, height: '100%', background: item.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Staff Workload */}
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Phân bổ hỗ trợ nhân viên
                </h3>
                <MotionButton
                  type="button"
                  onClick={() => setView('assignment')}
                  style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Phân công →
                </MotionButton>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {DEFAULT_STAFFS.map(staff => {
                  const assignedCount = supportRequests.filter(s => s.assignedStaffId === staff.code).length;
                  const openCount = supportRequests.filter(s => s.assignedStaffId === staff.code && s.status !== 'RESOLVED').length;
                  return (
                    <div key={staff.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{staff.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{staff.code} • {openCount} đang xử lý / {assignedCount} được giao</div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488' }}>{openCount}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Queue Section */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px 0' }}>
                  Công việc cần xử lý ({queueItems.length})
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Ưu tiên hồ sơ gửi trước (FIFO)</span>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm nội dung, mã hoặc người gửi..."
                  value={queueSearch}
                  onChange={e => { setQueueSearch(e.target.value); setQueuePage(1); }}
                  style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <select
                aria-label="Loại công việc"
                value={queueType}
                onChange={e => { setQueueType(e.target.value); setQueuePage(1); }}
                style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="ALL">Tất cả nghiệp vụ</option>
                <option value="PROPERTY">Xác minh nhà trọ</option>
                <option value="COMMUNITY">Cộng đồng</option>
                <option value="SUPPORT">Yêu cầu hỗ trợ</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Nội dung / Người gửi</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Nghiệp vụ</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Trạng thái</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700' }}>Ngày gửi</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQueue.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{item.title}</strong>
                        <small style={{ color: '#64748b' }}>{item.sender} • {item.id}</small>
                      </td>
                      <td style={{ padding: '12px' }}>{item.typeLabel}</td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <Link to={item.url} style={{ color: '#0d9488', fontWeight: '600', textDecoration: 'none' }}>
                          Chi tiết →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '12px' }}>
              <Pagination
                currentPage={queuePage}
                totalPages={totalQueuePages}
                onPageChange={setQueuePage}
                totalItems={queueItems.length}
                pageSize={queuePageSize}
              />
            </div>
          </section>

          {/* Activity Section */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Hoạt động gần đây</h3>
              <MotionButton
                type="button"
                onClick={() => setView('activity')}
                style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
              >
                Xem toàn bộ nhật ký →
              </MotionButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activities.slice(0, 4).map(act => (
                <div key={act.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <CheckCircle2 size={16} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{act.entityTitle}</strong>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{act.actor} • <span style={{ color: '#94a3b8' }}>{act.time}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: ACCOUNTS */}
      {currentView === 'accounts' && (
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm tên, email hoặc số điện thoại..."
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                aria-label="Lọc vai trò"
                value={accountRole}
                onChange={e => setAccountRole(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="STAFF">Nhân viên (STAFF)</option>
                <option value="ROOM_HOST">Chủ trọ (HOST)</option>
                <option value="USER">Người thuê (USER)</option>
              </select>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{filteredAccounts.length} tài khoản</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>TÀI KHOẢN</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>EMAIL</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>SỐ ĐIỆN THOẠI</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700' }}>VAI TRÒ</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>{acc.name}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{acc.email}</td>
                    <td style={{ padding: '12px 14px', color: '#0d9488', fontWeight: '600' }}>{acc.phone}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: acc.role === 'ADMIN' ? '#fef2f2' : acc.role === 'STAFF' ? '#eff6ff' : acc.role === 'ROOM_HOST' ? '#f0fdfa' : '#f8fafc', color: acc.role === 'ADMIN' ? '#991b1b' : acc.role === 'STAFF' ? '#1e40af' : acc.role === 'ROOM_HOST' ? '#0d9488' : '#334155', fontWeight: '700' }}>
                        {acc.roleLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* VIEW 3: ASSIGNMENT */}
      {currentView === 'assignment' && (
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px 0' }}>Điều phối & Phân công hỗ trợ</h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Giao việc cho nhân viên vận hành hỗ trợ chủ trọ</span>
            </div>
            <select
              aria-label="Lọc trạng thái"
              value={assignmentFilter}
              onChange={e => setAssignmentFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="OPEN">Đang cần hỗ trợ (Chưa đóng)</option>
              <option value="ALL">Tất cả yêu cầu</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', width: '40%' }}>YÊU CẦU / CHỦ TRỌ</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', width: '15%' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', width: '25%' }}>NHÂN VIÊN PHỤ TRÁCH</th>
                  <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', width: '20%', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignment.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: '#0f172a' }}>{item.code} • {item.title}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{item.hostName} ({item.propertyTitle})</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        aria-label={`Phân công cho ${item.code}`}
                        value={assignmentSelections[item.id] || item.assignedStaffId || ''}
                        onChange={e => setAssignmentSelections(prev => ({ ...prev, [item.id]: e.target.value }))}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                      >
                        <option value="">-- Chưa phân công --</option>
                        {DEFAULT_STAFFS.map(s => (
                          <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <MotionButton
                        type="button"
                        className="p-button primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleSaveAssignment(item.id)}
                      >
                        Lưu phân công
                      </MotionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* VIEW 4: ACTIVITY */}
      {currentView === 'activity' && (
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm người xử lý hoặc nội dung..."
                value={activitySearch}
                onChange={e => setActivitySearch(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <select
              aria-label="Thời gian nhật ký"
              value={activityRange}
              onChange={e => setActivityRange(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Toàn bộ thời gian</option>
              <option value="7">7 ngày gần đây</option>
              <option value="30">30 ngày gần đây</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredActivities.map(act => (
              <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <CheckCircle2 size={18} style={{ color: '#0d9488', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{act.entityTitle}</strong>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{act.time}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    Thực hiện bởi: <strong>{act.actor}</strong> • Quyết định: <span style={{ fontWeight: '700', color: '#0d9488' }}>{act.decision}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
