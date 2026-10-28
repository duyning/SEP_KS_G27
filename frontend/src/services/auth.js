const TOKEN_KEY = 'hlrcs_access_token';
export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
export function saveToken(token, remember) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  constructor(message, status, fields) { super(message); this.status = status; this.fields = fields || {}; }
}
export async function request(path, { method = 'GET', body, signal, basePath = '/api/auth', responseType = 'json', authenticated = true } = {}) {
  const token = authenticated ? getToken() : null;
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  let response;
  try {
    response = await fetch(`${basePath}${path}`, {
      method, signal, credentials: 'omit',
      headers: { ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Không thể kết nối máy chủ. Vui lòng thử lại sau.', 0);
  }
  if (response.ok && responseType === 'blob') return response.blob();
  const result = await response.json().catch(() => null);
  if (response.status === 401 && token && getToken() === token && !['/login', '/register'].includes(path)) {
    clearToken();
    window.dispatchEvent(new Event('hlrcs:session-expired'));
  }
  if (!response.ok || !result?.success) {
    throw new ApiError(result?.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại.', response.status,
      result?.data && typeof result.data === 'object' ? result.data : {});
  }
  return result.data;
}
export const authApi = {
  login: data => request('/login', { method: 'POST', body: data }),
  register: data => request('/register', { method: 'POST', body: data }),
  me: signal => request('/me', { signal }),
  logout: () => request('/logout', { method: 'POST' }),
  updateProfile: data => request('/profile', { method: 'PUT', body: data }),
  changePassword: data => request('/change-password', { method: 'PUT', body: data }),
};
