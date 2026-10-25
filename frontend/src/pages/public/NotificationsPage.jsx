import { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
} from 'lucide-react';
import DemoNoticeBanner from '../../components/common/DemoNoticeBanner.jsx';
import { useToast } from '../../components/PortalUI.jsx';

export default function NotificationsPage() {
  const notify = useToast();
  const [filter, setFilter] = useState('ALL');

  const [notifications, setNotifications] = useState([
    {
      id: 'NOTIF-01',
      title: 'Chủ trọ đã xác nhận lịch xem phòng!',
      message: 'Bác Trần Gia Huy (Nhà trọ Minh Quân) đã xác nhận cuộc hẹn xem phòng P.102 vào lúc 15:30 ngày 25/10/2026.',
      time: '2 giờ trước',
      read: false,
      type: 'BOOKING',
    },
    {
      id: 'NOTIF-02',
      title: 'Bài viết cộng đồng đã được phê duyệt',
      message: 'Bài viết "Nhượng phòng khép kín gần ĐH FPT" của bạn đã được Staff duyệt và xuất hiện công khai trên bảng tin.',
      time: '1 ngày trước',
      read: true,
      type: 'COMMUNITY',
    },
    {
      id: 'NOTIF-03',
      title: 'Cập nhật chính sách an toàn PCCC Hòa Lạc',
      message: 'HL_RCS vừa triển khai chiến dịch rà soát trang thiết bị PCCC cho 100% nhà trọ đối tác quanh khuôn viên ĐH FPT.',
      time: '3 ngày trước',
      read: true,
      type: 'SYSTEM',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    notify?.('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
  };

  const filteredNotifs = filter === 'ALL'
    ? notifications
    : notifications.filter((n) => !n.read);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            Thông báo của bạn
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Bạn có <strong>{unreadCount}</strong> thông báo chưa đọc
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0d9488',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <DemoNoticeBanner message="Dữ liệu thông báo hiển thị từ prototype fixture do backend chưa cung cấp API Notification." />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['ALL', 'UNREAD'].map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: active ? '1px solid #0d9488' : '1px solid #e2e8f0',
                backgroundColor: active ? '#0d9488' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: active ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {key === 'ALL' ? 'Tất cả' : `Chưa đọc (${unreadCount})`}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredNotifs.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px 20px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}>
            <Bell size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              Không có thông báo mới
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Bạn đã xem hết các thông báo từ hệ thống.
            </p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              style={{
                background: n.read ? '#ffffff' : '#f0fdfa',
                borderRadius: '14px',
                padding: '18px 20px',
                border: n.read ? '1px solid #e2e8f0' : '1px solid #99f6e4',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: n.read ? '#f1f5f9' : '#ccfbf1',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bell size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {n.time}
                  </span>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
