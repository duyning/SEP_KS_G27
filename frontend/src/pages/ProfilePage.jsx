import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Heart,
  Home,
  KeyRound,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  User,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/auth.js';
import { roleLabels } from '../routing/screens.js';
import { useToast } from '../components/PortalUI.jsx';
import Modal from '../components/common/Modal.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import DemoNoticeBanner from '../components/common/DemoNoticeBanner.jsx';
import { MOCK_ROOMS } from '../fixtures/mockRooms.js';

const tabs = [
  ['info', 'Thông tin cá nhân', UserRound],
  ['favorites', 'Nhà trọ đã lưu', Heart],
  ['appointments', 'Lịch xem phòng', CalendarDays],
  ['reports', 'Báo cáo của tôi', Flag],
  ['security', 'Bảo mật & Mật khẩu', KeyRound],
];

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const selected = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'info';

  const [values, setValues] = useState({ fullName: user?.fullName || '', phoneNumber: user?.phoneNumber || '' });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();
  const notify = useToast();

  async function handleLogout() {
    if (leaving) return;
    setLeaving(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notify('Máy chủ không phản hồi khi đăng xuất.', 'error');
      navigate('/login', { replace: true });
    } finally {
      setLeaving(false);
    }
  }

  const update = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setAlert('');
  };

  const updatePassword = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setAlert('');
  };

  function showErrors(next) {
    setErrors(next);
    if (Object.keys(next).length) document.getElementById(Object.keys(next)[0])?.focus();
    return Object.keys(next).length > 0;
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (busy) return;
    const next = {};
    if (!values.fullName.trim()) next.fullName = 'Vui lòng nhập họ và tên.';
    if (values.phoneNumber.trim() && !/^(0\d{9}|\+84\d{9})$/.test(values.phoneNumber.trim())) {
      next.phoneNumber = 'Số điện thoại không hợp lệ.';
    }
    if (user?.phoneNumber && !values.phoneNumber.trim()) {
      next.phoneNumber = 'Máy chủ chưa hỗ trợ xóa số điện thoại. Vui lòng nhập số điện thoại.';
    }
    if (showErrors(next)) return;
    setBusy(true);
    setAlert('');
    try {
      const data = await updateProfile({ fullName: values.fullName.trim(), phoneNumber: values.phoneNumber.trim() || null });
      setValues({ fullName: data.fullName, phoneNumber: data.phoneNumber || '' });
      notify?.('Đã cập nhật thông tin cá nhân.');
    } catch (err) {
      setAlert(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  function validatePassword(e) {
    e.preventDefault();
    if (busy) return;
    const next = {};
    if (!passwords.oldPassword) next.oldPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (passwords.newPassword.length < 6) next.newPassword = 'Mật khẩu mới cần ít nhất 6 ký tự.';
    if (passwords.newPassword === passwords.oldPassword) next.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    if (passwords.newPassword !== passwords.confirmPassword) next.confirmPassword = 'Mật khẩu xác nhận chưa khớp.';
    if (!showErrors(next)) setConfirming(true);
  }

  async function changePassword() {
    if (busy) return;
    setBusy(true);
    setAlert('');
    try {
      await authApi.changePassword({ oldPassword: passwords.oldPassword, newPassword: passwords.newPassword });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
      notify?.('Đã đổi mật khẩu thành công.');
    } catch (err) {
      setAlert(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const savedListings = MOCK_ROOMS.slice(0, 3);
  const sampleAppointments = [
    {
      id: 'BK-8921',
      roomTitle: 'Nhà trọ Minh Quân - Studio khép kín ban công',
      roomNumber: 'P.102',
      date: '2026-10-25',
      time: '15:30',
      hostName: 'Trần Gia Huy',
      hostPhone: '0987 654 321',
      status: 'PENDING',
      statusLabel: 'Chờ xác nhận',
    },
    {
      id: 'BK-8919',
      roomTitle: 'Căn hộ mini Sunrise - Full nội thất',
      roomNumber: 'P.301',
      date: '2026-10-20',
      time: '10:00',
      hostName: 'Lê Văn C',
      hostPhone: '0933 445 566',
      status: 'CONFIRMED',
      statusLabel: 'Đã xác nhận',
    },
  ];

  const sampleReports = [
    {
      id: 'RP-001',
      target: 'Phòng trọ giá ảo Tân Xã',
      reason: 'Giá đăng 1.2tr nhưng khi gọi hỏi thực tế là 2.5tr',
      date: '2026-10-18',
      status: 'RESOLVED',
      statusLabel: 'Đã xử lý (Gỡ tin)',
    },
  ];

  const initials = (user?.fullName || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="profile-container-wrap" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Profile Header Banner */}
      <section className="profile-header-banner" style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.2)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                  {user?.fullName || 'Người dùng HL_RCS'}
                </h1>
                <StatusBadge status="ACTIVE" label={roleLabels[user?.role] || user?.role} tone="emerald" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '13px', color: '#64748b' }}>
                <span>{user?.email}</span>
                <span>•</span>
                <span>Thành viên HL_RCS</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 18px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0d9488' }}>{savedListings.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Nhà trọ đã lưu</div>
            </div>
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 18px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{sampleAppointments.length}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Lịch xem phòng</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Nav Tabs + Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: '24px' }}>
        {/* Sidebar Nav */}
        <aside style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '12px',
          border: '1px solid #e2e8f0',
          height: 'fit-content',
        }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tabs.map(([key, label, Icon]) => {
              const active = selected === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => {
                      setParams({ tab: key });
                      setErrors({});
                      setAlert('');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: active ? '#f0fdfa' : 'transparent',
                      color: active ? '#0d9488' : '#475569',
                      fontWeight: active ? 700 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={18} style={{ color: active ? '#0d9488' : '#94a3b8' }} />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
            <li style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />
            <li>
              <button
                type="button"
                id="btnSidebarLogout"
                className="profile-nav-btn btn-logout"
                onClick={handleLogout}
                disabled={leaving}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: '#e11d48',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <LogOut size={18} style={{ color: '#e11d48' }} />
                <span>{leaving ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}</span>
              </button>
            </li>
          </ul>
        </aside>

        {/* Content Panel */}
        <main style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
        }}>
          {alert && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {alert}
            </div>
          )}

          {/* TAB 1: INFO */}
          {selected === 'info' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                Thông tin cá nhân
              </h2>
              <form noValidate onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="fullName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Họ và tên
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={values.fullName}
                    onChange={update}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: errors.fullName ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {errors.fullName && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Email (Định danh đăng nhập)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Số điện thoại liên hệ
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={values.phoneNumber}
                    onChange={update}
                    placeholder="VD: 0912345678"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: errors.phoneNumber ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {errors.phoneNumber && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.phoneNumber}</p>}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#0d9488',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
                    <span>Lưu thay đổi</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: FAVORITES */}
          {selected === 'favorites' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Nhà trọ đã lưu ({savedListings.length})
                </h2>
                <Link to="/search" style={{ fontSize: '13px', color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
                  Tìm thêm phòng trọ →
                </Link>
              </div>
              <DemoNoticeBanner message="Dữ liệu danh sách đã lưu hiển thị từ fixture mẫu do backend chưa có API Wishlist." />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {savedListings.map((item) => (
                  <div key={item.id} style={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <img src={item.image} alt={item.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                    <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{item.title}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} />
                          <span>{item.locationShort}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0d9488' }}>{item.priceDisplay}/tháng</span>
                        <Link to={`/properties/detail?id=${item.id}`} style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                          Chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: APPOINTMENTS */}
          {selected === 'appointments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Lịch xem phòng của bạn ({sampleAppointments.length})
                </h2>
                <Link to="/bookings" style={{ fontSize: '13px', color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
                  Quản lý đầy đủ lịch hẹn →
                </Link>
              </div>
              <DemoNoticeBanner message="Dữ liệu lịch hẹn hiển thị từ fixture mẫu do backend chưa có API Viewing Request." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sampleAppointments.map((app) => (
                  <div key={app.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{app.roomTitle} ({app.roomNumber})</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} />
                        <span>Hẹn lúc: <strong>{app.time}</strong> ngày <strong>{app.date}</strong></span>
                        <span>•</span>
                        <span>Chủ trọ: {app.hostName} ({app.hostPhone})</span>
                      </div>
                    </div>
                    <StatusBadge status={app.status} label={app.statusLabel} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS */}
          {selected === 'reports' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                Báo cáo đã gửi ({sampleReports.length})
              </h2>
              <DemoNoticeBanner message="Dữ liệu báo cáo hiển thị từ fixture mẫu do backend chưa có API Report." />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sampleReports.map((rep) => (
                  <div key={rep.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{rep.target}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        Lý do: <em>{rep.reason}</em> — Ngày gửi: {rep.date}
                      </div>
                    </div>
                    <StatusBadge status={rep.status} label={rep.statusLabel} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {selected === 'security' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                Đổi mật khẩu tài khoản
              </h2>
              <form noValidate onSubmit={validatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '440px' }}>
                <div>
                  <label htmlFor="oldPassword" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="oldPassword"
                    name="oldPassword"
                    type="password"
                    value={passwords.oldPassword}
                    onChange={updatePassword}
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: errors.oldPassword ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  {errors.oldPassword && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.oldPassword}</p>}
                </div>

                <div>
                  <label htmlFor="newPassword" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mật khẩu mới
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwords.newPassword}
                    onChange={updatePassword}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: errors.newPassword ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  {errors.newPassword && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.newPassword}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={updatePassword}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  {errors.confirmPassword && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.confirmPassword}</p>}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#0d9488',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>Đổi mật khẩu</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {confirming && (
        <Modal title="Xác nhận đổi mật khẩu" onClose={() => setConfirming(false)}>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
            Bạn có chắc chắn muốn thay đổi mật khẩu đăng nhập? Sau khi đổi thành công, bạn sẽ sử dụng mật khẩu mới này cho các lần đăng nhập tiếp theo.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="p-button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              className="p-button primary"
              onClick={changePassword}
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy && <LoaderCircle size={16} className="spin" />}
              <span>Xác nhận</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
