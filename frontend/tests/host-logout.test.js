import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('PortalLayout contains all host logout mechanisms matching prototype', () => {
  const content = fs.readFileSync(new URL('../src/layouts/PortalLayout.jsx', import.meta.url), 'utf8');

  // Direct topbar logout button
  assert.match(content, /id="btnHostLogout"/);
  assert.match(content, /className="btn-topbar-logout"/);
  assert.match(content, /Đăng xuất/);

  // Topbar user dropdown menu & popover
  assert.match(content, /id="btnHostUserDropdown"/);
  assert.match(content, /className="host-user-menu-wrapper"/);
  assert.match(content, /id="hostUserPopover"/);
  assert.match(content, /id="btnPopoverLogout"/);
  assert.match(content, /className="btn-popover-logout"/);

  // Sidebar logout button
  assert.match(content, /id="btnSidebarLogout"/);
  assert.match(content, /btn-logout-sidebar/);
});

test('ProfilePage contains host / user account logout button', () => {
  const content = fs.readFileSync(new URL('../src/pages/ProfilePage.jsx', import.meta.url), 'utf8');
  assert.match(content, /id="btnSidebarLogout"/);
  assert.match(content, /btn-logout/);
  assert.match(content, /Đăng xuất tài khoản/);
});

test('portal.css defines styling for all logout and user popover elements', () => {
  const css = fs.readFileSync(new URL('../src/styles/portal.css', import.meta.url), 'utf8');
  assert.match(css, /\.btn-topbar-logout/);
  assert.match(css, /\.host-user-menu-wrapper/);
  assert.match(css, /\.host-user-popover/);
  assert.match(css, /\.btn-popover-logout/);
  assert.match(css, /\.btn-logout-sidebar/);
  assert.match(css, /\.topbar-status-chip/);
});
