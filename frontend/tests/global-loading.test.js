import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_GLOBAL_LOADING_MESSAGE,
  DEFAULT_PAGE_LOADING_MESSAGE,
  DEFAULT_SESSION_LOADING_MESSAGE,
  isStandaloneRoute,
  normalizeLoadingMessage,
  resolveRouteLoadingTier
} from '../src/components/loading/loading-policy.js';
import { LoadingManager, LOADING_MESSAGES } from '../src/components/loading/loading-manager.js';
import { screens } from '../src/routing/screens.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('loading policy distinguishes standalone full-viewport routes from portal-shell routes', () => {
  const byPath = (path) => screens.find((item) => item.path === path);

  assert.equal(isStandaloneRoute(byPath('/login')), true);
  assert.equal(isStandaloneRoute(byPath('/register')), true);
  assert.equal(isStandaloneRoute(byPath('/')), true);
  assert.equal(isStandaloneRoute(byPath('/search')), true);
  assert.equal(isStandaloneRoute(byPath('/profile')), true);
  assert.equal(resolveRouteLoadingTier(byPath('/login')), 'global');
  assert.equal(resolveRouteLoadingTier(byPath('/')), 'global');

  assert.equal(isStandaloneRoute(byPath('/host')), false);
  assert.equal(isStandaloneRoute(byPath('/host/rooms')), false);
  assert.equal(isStandaloneRoute(byPath('/staff')), false);
  assert.equal(isStandaloneRoute(byPath('/staff/verifications')), false);
  assert.equal(isStandaloneRoute(byPath('/admin')), false);
  assert.equal(isStandaloneRoute(byPath('/bookings')), false);
  assert.equal(isStandaloneRoute(byPath('/notifications')), false);
  assert.equal(resolveRouteLoadingTier(byPath('/host')), 'page');
  assert.equal(resolveRouteLoadingTier(byPath('/staff')), 'page');
  assert.equal(resolveRouteLoadingTier(byPath('/admin')), 'page');
});

test('normalizeLoadingMessage returns neutral Vietnamese fallbacks', () => {
  assert.equal(normalizeLoadingMessage(''), DEFAULT_GLOBAL_LOADING_MESSAGE);
  assert.equal(normalizeLoadingMessage('   '), DEFAULT_GLOBAL_LOADING_MESSAGE);
  assert.equal(normalizeLoadingMessage(null, DEFAULT_PAGE_LOADING_MESSAGE), DEFAULT_PAGE_LOADING_MESSAGE);
  assert.equal(normalizeLoadingMessage('  Đang kết nối...  '), 'Đang kết nối...');
  assert.equal(DEFAULT_GLOBAL_LOADING_MESSAGE, 'Đang tải dữ liệu...');
  assert.equal(DEFAULT_SESSION_LOADING_MESSAGE, 'Đang kiểm tra phiên đăng nhập...');
});

test('GlobalLoading and index.html bootstrap are role-agnostic, accessible, and use unified NestHub palette', () => {
  const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const globalLoadingSrc = fs.readFileSync(new URL('../src/components/loading/GlobalLoading.jsx', import.meta.url), 'utf8');
  const loadingCss = fs.readFileSync(new URL('../src/styles/loading.css', import.meta.url), 'utf8');

  // Role-agnostic: no role names in bootstrap or GlobalLoading
  const roleLeakPattern = /\b(ADMIN|STAFF|ROOM_HOST|HOST PORTAL|ADMIN PORTAL|STAFF PORTAL)\b|Quản trị viên|Chủ trọ|Nhân viên/i;
  assert.doesNotMatch(indexHtml, roleLeakPattern);
  assert.doesNotMatch(globalLoadingSrc, roleLeakPattern);

  // Zero artificial timers inside GlobalLoading render component
  assert.doesNotMatch(globalLoadingSrc, /setTimeout|setInterval/);

  // Unified NestHub brand palette (#0D9488 teal + #F8FAFC background) and reduced motion
  assert.match(indexHtml, /#0d9488/i);
  assert.match(indexHtml, /#f8fafc/i);
  assert.match(indexHtml, /prefers-reduced-motion:\s*reduce/i);
  assert.match(indexHtml, /role="status"/);
  assert.match(indexHtml, /aria-live="polite"/);
  assert.match(indexHtml, /aria-busy="true"/);

  assert.match(loadingCss, /#0d9488/i);
  assert.match(loadingCss, /#f8fafc/i);
  assert.match(loadingCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);

  // Accessibility & error recovery in GlobalLoading
  assert.match(globalLoadingSrc, /role="status"/);
  assert.match(globalLoadingSrc, /role="alert"/);
  assert.match(globalLoadingSrc, /aria-live="polite"/);
  assert.match(globalLoadingSrc, /aria-busy="true"/);
});

test('LoadingManager handles concurrent tasks, anti-flicker delay, min-visible duration, and error cleanup', async () => {
  const manager = new LoadingManager({ showDelayMs: 30, minVisibleMs: 60 });

  // Fast task completes before showDelayMs -> never flashes
  const fast = manager.start({ message: 'Nhanh' });
  await sleep(10);
  manager.stop(fast);
  assert.equal(manager.getSnapshot().visible, false);

  // Slow concurrent tasks keep overlay alive until ALL complete
  const slowA = manager.start({ message: LOADING_MESSAGES.loadingData });
  const slowB = manager.start({ message: LOADING_MESSAGES.switchWorkspace });
  await sleep(40);
  assert.equal(manager.getSnapshot().visible, true);
  assert.equal(manager.getSnapshot().activeCount, 2);
  assert.equal(manager.getSnapshot().message, LOADING_MESSAGES.switchWorkspace);

  manager.stop(slowB);
  assert.equal(manager.getSnapshot().visible, true);
  assert.equal(manager.getSnapshot().activeCount, 1);
  assert.equal(manager.getSnapshot().message, LOADING_MESSAGES.loadingData);

  manager.stop(slowA);
  // Holds for remaining minVisibleMs
  assert.equal(manager.getSnapshot().visible, true);
  await sleep(80);
  assert.equal(manager.getSnapshot().visible, false);

  // Rejecting async task always cleans up
  await assert.rejects(
    manager.withLoading(async () => {
      throw new Error('boom');
    }, { immediate: true })
  );
  await sleep(80);
  assert.equal(manager.getSnapshot().visible, false);
  manager.dispose();
});

test('App.jsx, main.jsx and PortalScreens.jsx wire LoadingProvider, GlobalLoading, GlobalLoadingOverlay, and PageLoading cleanly', () => {
  const appSrc = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const portalScreensSrc = fs.readFileSync(new URL('../src/pages/PortalScreens.jsx', import.meta.url), 'utf8');
  const mainSrc = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

  assert.match(mainSrc, /import '\.\/styles\/loading\.css'/);
  assert.match(mainSrc, /LoadingProvider/);
  assert.match(appSrc, /<GlobalLoading\s+message=\{DEFAULT_SESSION_LOADING_MESSAGE\}/);
  assert.match(appSrc, /<GlobalLoading[\s\S]*error=\{sessionError\}/);
  assert.match(appSrc, /<GlobalLoadingOverlay\s*\/>/);
  assert.match(appSrc, /<Suspense\s+fallback=\{/);
  assert.match(appSrc, /<PageLoading\s+message=\{DEFAULT_PAGE_LOADING_MESSAGE\}/);
  assert.match(portalScreensSrc, /const HomePage = lazy\(/);
  assert.match(portalScreensSrc, /const HostDashboardPage = lazy\(/);
  assert.match(portalScreensSrc, /const StaffDashboardPage = lazy\(/);
  assert.match(portalScreensSrc, /const AdminDashboardPage = lazy\(/);
});
