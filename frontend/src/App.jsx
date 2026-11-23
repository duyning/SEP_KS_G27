
import { Suspense, lazy } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import PortalLayout from './layouts/PortalLayout.jsx';
import { ToastProvider } from './components/PortalUI.jsx';
import {
  DEFAULT_GLOBAL_LOADING_MESSAGE,
  DEFAULT_PAGE_LOADING_MESSAGE,
  DEFAULT_SESSION_LOADING_MESSAGE,
  GlobalLoading,
  GlobalLoadingOverlay,
  PageLoading,
  resolveRouteLoadingTier
} from './components/loading/index.js';
import { canAccess, landingFor, screens } from './routing/screens.js';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const BecomeHostPage = lazy(() => import('./pages/HostOnboardingPage.jsx'));
const ContractSigningPage = lazy(() => import('./pages/ContractSigningPage.jsx'));
const PortalScreens = lazy(() => import('./pages/PortalScreens.jsx'));

function ScreenRoute({ screen }) {
  const { user, explicitLogout } = useAuth();
  const location = useLocation();
  if (!canAccess(screen.portal, user)) {
    if (!user) return <Navigate to="/login" replace state={explicitLogout ? null : { from: `${location.pathname}${location.search}${location.hash}` }} />;
    return <Navigate to={landingFor(user)} replace />;
  }
  if (screen.kind === 'redirect') return <Navigate to={`${screen.to}${location.search}${location.hash}`} replace />;
  if (screen.kind === 'auth') {
    return (
      <Suspense fallback={<GlobalLoading message={DEFAULT_GLOBAL_LOADING_MESSAGE} />}>
        <AuthPage registerMode={screen.path === '/register'} />
      </Suspense>
    );
  }

  const routeFallback = resolveRouteLoadingTier(screen) === 'global'
    ? <GlobalLoading message={DEFAULT_GLOBAL_LOADING_MESSAGE} />
    : <PageLoading message={DEFAULT_PAGE_LOADING_MESSAGE} />;

  const content = screen.kind === 'contractSigning'
    ? <ContractSigningPage />
    : screen.kind === 'profile'
      ? <ProfilePage />
      : screen.kind === 'becomeHost'
        ? <BecomeHostPage />
        : <PortalScreens screen={screen} />;

  return (
    <PortalLayout screen={screen}>
      <Suspense fallback={routeFallback}>
        {content}
      </Suspense>
    </PortalLayout>
  );
}

function LegacyRedirect({ screen }) {
  const location = useLocation();
  const oldView = ({ '#content-moderation': 'content-moderation', '#feedback-verification': 'feedback-verification', '#moderation-history': 'history' })[location.hash];
  const query = new URLSearchParams(location.search);
  if (screen.portal === 'staff' && screen.path === '/staff' && oldView) query.set('view', oldView);
  return <Navigate to={`${screen.path}${query.size ? `?${query}` : ''}${oldView ? '' : location.hash}`} replace />;
}

export default function App() {
  const { user, loading, sessionError, retry, logout } = useAuth();

  if (loading) {
    return <GlobalLoading message={DEFAULT_SESSION_LOADING_MESSAGE} />;
  }

  if (sessionError) {
    return (
      <GlobalLoading
        error={sessionError}
        onRetry={retry}
        onSecondaryAction={() => logout().catch(() => {})}
        secondaryLabel="Về đăng nhập"
      />
    );
  }

  return (
    <ToastProvider key={`${user?.userId || 'guest'}:${user?.role || 'public'}`}>
      <Suspense fallback={<GlobalLoading message={DEFAULT_GLOBAL_LOADING_MESSAGE} />}>
        <Routes>
          {screens.map(screen => (
            <Route key={screen.path} path={screen.path} element={<ScreenRoute screen={screen} />} />
          ))}
          {screens.filter(screen => screen.source).map(screen => (
            <Route key={screen.source} path={`/${screen.source}`} element={<LegacyRedirect screen={screen} />} />
          ))}
          <Route path="/account" element={<Navigate to="/profile" replace />} />
          <Route
            path="*"
            element={
              <div className="session-screen">
                <h1>Không tìm thấy trang</h1>
                <Link className="p-button primary" to="/">Về trang chủ</Link>
              </div>
            }
          />
        </Routes>
      </Suspense>
      <GlobalLoadingOverlay />
    </ToastProvider>
  );
}
