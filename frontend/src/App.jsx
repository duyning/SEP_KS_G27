import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoaderCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PortalScreens from './pages/PortalScreens.jsx';
import PortalLayout from './layouts/PortalLayout.jsx';
import { ToastProvider } from './components/PortalUI.jsx';
import { canAccess, landingFor, screens } from './routing/screens.js';

function ScreenRoute({ screen }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!canAccess(screen.portal, user)) {
    if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
    return <div className="session-screen"><ShieldAlert size={34} /><h1>Không có quyền truy cập</h1><p>Tài khoản hiện tại không có quyền truy cập khu vực này.</p><Link className="p-button primary" to={landingFor(user)}>Về khu vực của tôi</Link><Link to="/">Trang chủ</Link></div>;
  }
  if (screen.kind === 'redirect') return <Navigate to={`${screen.to}${location.search}${location.hash}`} replace />;
  if (screen.kind === 'auth') return <AuthPage registerMode={screen.path === '/register'} />;
  return <PortalLayout screen={screen}>{screen.kind === 'profile' ? <ProfilePage /> : <PortalScreens screen={screen} />}</PortalLayout>;
}
function LegacyRedirect({ screen }) {
  const location = useLocation();
  const oldView = ({ '#content-moderation': 'content-moderation', '#feedback-verification': 'feedback-verification', '#moderation-history': 'history' })[location.hash];
  const query = new URLSearchParams(location.search);
  if (screen.portal === 'staff' && screen.path === '/staff' && oldView) query.set('view', oldView);
  return <Navigate to={`${screen.path}${query.size ? `?${query}` : ''}${oldView ? '' : location.hash}`} replace />;
}

export default function App() {
  const { loading, sessionError, retry, logout } = useAuth();
  if (loading) return <div className="session-screen" role="status"><LoaderCircle className="spin" /> Đang kiểm tra phiên đăng nhập...</div>;
  if (sessionError) return <div className="session-screen"><p role="alert">{sessionError}</p><button className="submit-button" onClick={retry}>Thử lại</button><button className="text-button" onClick={() => logout().catch(() => {})}>Về đăng nhập</button></div>;
  return <ToastProvider><Routes>{screens.map(screen => <Route key={screen.path} path={screen.path} element={<ScreenRoute screen={screen} />} />)}{screens.map(screen => <Route key={screen.source} path={`/${screen.source}`} element={<LegacyRedirect screen={screen} />} />)}<Route path="/account" element={<Navigate to="/profile" replace />} /><Route path="*" element={<div className="session-screen"><h1>Không tìm thấy trang</h1><Link className="p-button primary" to="/">Về trang chủ</Link></div>} /></Routes></ToastProvider>;
}
