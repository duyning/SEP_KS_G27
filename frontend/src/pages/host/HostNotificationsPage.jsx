import UIButton from '../../components/common/Button.jsx';
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CalendarDays,
  ShieldCheck,
  LifeBuoy,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import { useToast } from '../../components/PortalUI.jsx';

const MOCK_HOST_NOTIFICATIONS = [
  {
    id: 'HN-1',
    type: 'VIEWING_REQUEST',
    title: 'Yêu cầu xem phòng mới từ Nguyễn Văn Tuấn',
    message: 'Khách hẹn xem phòng P.102 vào ngày 25/10/2026 lúc 15:30. Hãy phản hồi sớm để khách thuê kịp sắp xếp.',
    time: '15 phút trước',
    read: false,
    link: '/host/viewings'
  },
  {
    id: 'HN-2',
    type: 'PROPERTY',
    title: 'Hồ sơ xác minh cơ sở Minh Quân đã được phê duyệt',
    message: 'Chúc mừng bạn! Nhà trọ Minh Quân đã được cấp huy hiệu Xác minh xanh trên hệ thống HL_RCS.',
    time: '2 giờ trước',
    read: false,
    link: '/host/property'
  },
  {
    id: 'HN-3',
    type: 'SUPPORT',
    title: 'nhân viên đã phản hồi yêu cầu hỗ trợ #SP-7701',
    message: 'Chuyên viên Nguyễn Văn An đã ghi nhận biên bản PCCC bổ sung của bạn và đang hoàn thiện thẩm định.',
    time: '1 ngày trước',
    read: true,
    link: '/host/support'
  },
  {
    id: 'HN-4',
    type: 'ROOM',
    title: 'Nhắc nhở: Cập nhật tình trạng phòng trống',
    message: 'Đã 5 ngày kể từ lần cuối bạn xác nhận phòng trống. Vui lòng kiểm tra lại để tin đăng giữ thứ hạng tìm kiếm cao.',
    time: '3 ngày trước',
    read: true,
    link: '/host/rooms'
  }
];

export default function HostNotificationsPage() {
  const notify = useToast();
  const [notifications, setNotifications] = useState(MOCK_HOST_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.read).length;
  const viewingCount = notifications.filter(n => n.type === 'VIEWING_REQUEST').length;
  const supportCount = notifications.filter(n => n.type === 'SUPPORT').length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      if (activeTab === 'UNREAD' && item.read) return false;
      if (filterType !== 'ALL' && item.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, activeTab, filterType, search]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    notify('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
  };

  const markItemAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'VIEWING_REQUEST':
        return <CalendarDays size={18} style={{ color: '#0f766e' }} />;
      case 'PROPERTY':
        return <ShieldCheck size={18} style={{ color: '#10b981' }} />;
      case 'SUPPORT':
        return <LifeBuoy size={18} style={{ color: '#3b82f6' }} />;
      case 'ROOM':
        return <Building2 size={18} style={{ color: '#f59e0b' }} />;
      default:
        return <Bell size={18} style={{ color: 'var(--ui-muted)' }} />;
    }
  };

  return (
    <div className="portal-page-container hn-main-area">
      <DemoNoticeBanner
        message="Trung tâm thông báo Chủ trọ cập nhật liên tục mọi sự kiện từ khách thuê và nhân viên HL_RCS."
      />

      {/* Header */}
      <div className="hn-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 var(--space-1) 0' }}>Trung tâm thông báo</h1>
          <p style={{ margin: 0, color: 'var(--ui-muted)', fontSize: '14px' }}>Theo dõi các cập nhật về lịch hẹn xem phòng, kết quả kiểm định nhà trọ, phản hồi từ nhân viên và tình trạng phòng trống.</p>
        </div>
        {unreadCount > 0 && (
          <UIButton
            type="button"
            className="p-button"
            onClick={markAllAsRead}
          >
            <CheckCheck size={16} /> Đánh dấu tất cả đã đọc
          </UIButton>
        )}
      </div>

      {/* KPI Cards */}
      <section className="hn-kpi-grid" style={{ display: 'grid', '--grid-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Tổng thông báo</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>{totalCount}</div>
        </article>

        <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Chưa đọc</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706' }}>{unreadCount}</div>
        </article>

        <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Lịch xem phòng</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f766e' }}>{viewingCount}</div>
        </article>

        <article style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ui-muted)' }}>Hỗ trợ nhân viên</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LifeBuoy size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb' }}>{supportCount}</div>
        </article>
      </section>

      {/* Main Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <UIButton
              type="button"
              className={`p-button ${activeTab === 'ALL' ? 'primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: '13px' }}
              onClick={() => setActiveTab('ALL')}
            >
              Tất cả ({totalCount})
            </UIButton>
            <UIButton
              type="button"
              className={`p-button ${activeTab === 'UNREAD' ? 'primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: '13px' }}
              onClick={() => setActiveTab('UNREAD')}
            >
              Chưa đọc ({unreadCount})
            </UIButton>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ui-muted)' }} />
              <input
                type="text"
                placeholder="Tìm thông báo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px var(--space-8)', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <select
              aria-label="Lọc phân loại"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="ALL">Tất cả phân loại</option>
              <option value="VIEWING_REQUEST">Lịch xem phòng</option>
              <option value="PROPERTY">Nhà trọ & Kiểm định</option>
              <option value="SUPPORT">nhân viên hỗ trợ</option>
              <option value="ROOM">Nhắc cập nhật phòng</option>
            </select>
          </div>
        </div>

        {/* Feed List */}
        <div>
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎉</div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>Không có thông báo nào</h3>
              <p style={{ fontSize: '13px', color: 'var(--ui-muted)', margin: 0 }}>Tất cả thông báo đã được xem hoặc không có thông báo phù hợp bộ lọc.</p>
            </div>
          ) : (
            filteredNotifications.map((item, index) => (
              <div
                key={item.id}
                onClick={() => markItemAsRead(item.id)}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: 'var(--space-4) 20px',
                  borderBottom: index < filteredNotifications.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: item.read ? '#fff' : '#f0fdfa',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getIcon(item.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: item.read ? '600' : '700', color: '#0f172a', margin: 0 }}>
                      {item.title}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--ui-muted)' }}>{item.time}</span>
                  </div>
                  <p style={{ margin: '0 0 var(--space-2) 0', fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                    {item.message}
                  </p>
                  {item.link && (
                    <Link
                      to={item.link}
                      style={{ fontSize: '12px', fontWeight: '600', color: '#0f766e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
                    >
                      Xem chi tiết <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
