import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AuthPage implements 3D book-flip architecture with Login and Register faces', () => {
  const content = fs.readFileSync(new URL('../src/pages/AuthPage.jsx', import.meta.url), 'utf8');

  // Viewport & 3D Flip box
  assert.match(content, /className="flip-viewport"/);
  assert.match(content, /auth-flip-box/);
  assert.match(content, /is-flipped/);

  // Both faces
  assert.match(content, /flip-login-face/);
  assert.match(content, /flip-register-face/);

  // Triggers for book flip
  assert.match(content, /goToRegister/);
  assert.match(content, /goToLogin/);

  // Exact headings & content
  assert.match(content, /Tìm trọ an tâm, quản lý dễ dàng/);
  assert.match(content, /Tìm trọ chuẩn xác/);
  assert.match(content, /Đăng ký người thuê/);
  assert.match(content, /Hợp tác chủ trọ/);
});

test('auth.css contains 3D page flip transforms and preserve-3d properties', () => {
  const css = fs.readFileSync(new URL('../src/styles/auth.css', import.meta.url), 'utf8');

  assert.match(css, /perspective:\s*2200px/);
  assert.match(css, /transform-style:\s*preserve-3d/);
  assert.match(css, /rotateY\(-180deg\)/);
  assert.match(css, /backface-visibility:\s*hidden/);
  assert.match(css, /\.login-showcase-bg/);
  assert.match(css, /\.register-showcase-bg/);
});
