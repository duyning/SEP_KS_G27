const statusText = document.getElementById('status');
const googleButton = document.getElementById('google-button');
const confirmation = document.getElementById('confirmation');
const codeInput = document.getElementById('confirmation-code');
const id = window.location.hash.slice(1);
history.replaceState(null, '', window.location.pathname);

async function request(action, data) {
  const response = await fetch(`/api/auth/google/mobile/browser/${action}`, {
    method: 'POST',
    credentials: 'omit',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true) {
    throw new Error(result?.message || 'Chưa thể xác nhận đăng nhập. Hãy quay lại HL_RCS và thử lại.');
  }
  return result.data;
}

async function complete({ credential }) {
  if (!credential || googleButton.hidden) return;
  googleButton.hidden = true;
  statusText.textContent = 'Đang xác minh tài khoản…';
  try {
    const { code } = await request('complete', { idToken: credential });
    statusText.textContent = 'Quay lại HL_RCS và nhập mã này để hoàn tất đăng nhập.';
    codeInput.value = code;
    confirmation.hidden = false;
  } catch (error) {
    statusText.textContent = error.message;
    googleButton.hidden = false;
  }
}

async function initialize() {
  if (window.location.protocol !== 'https:' || !/^[A-Za-z0-9_-]{43}$/.test(id)) {
    throw new Error('Hãy mở trang đăng nhập từ ứng dụng HL_RCS.');
  }
  if (!window.google?.accounts?.id) {
    throw new Error('Không tải được Google. Quay lại HL_RCS và thử lại.');
  }
  const { clientId } = await request('options');
  window.google.accounts.id.initialize({ client_id: clientId, nonce: id, callback: complete, auto_select: false });
  window.google.accounts.id.renderButton(googleButton, { size: 'large', text: 'continue_with', locale: 'vi' });
  statusText.textContent = 'Chọn tài khoản Google bạn muốn dùng.';
}

initialize().catch(error => { statusText.textContent = error.message; });
