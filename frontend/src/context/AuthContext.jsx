import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authApi, clearToken, getToken, saveToken } from '../services/auth.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [explicitLogout, setExplicitLogout] = useState(false);
  const [reload, setReload] = useState(0);
  const sessionVersion = useRef(0);
  useEffect(() => {
    const expire = () => { sessionVersion.current++; setUser(null); setSessionError(''); setLoading(false); };
    window.addEventListener('hlrcs:session-expired', expire);
    return () => window.removeEventListener('hlrcs:session-expired', expire);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const version = sessionVersion.current;
    const token = getToken();
    setLoading(true);
    setSessionError('');
    if (!token) { setUser(null); setLoading(false); return () => controller.abort(); }
    const current = () => !controller.signal.aborted && version === sessionVersion.current && token === getToken();
    authApi.me(controller.signal).then(data => {if(current())setUser(data);}).catch(error => {
      if (!current()) return;
      if ([401, 403].includes(error.status)) { clearToken(); setUser(null); setLoading(false); }
      else setSessionError(error.message);
    }).finally(() => { if (current()) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const acceptSession = (data, remember) => { sessionVersion.current++; saveToken(data.accessToken, remember); setUser(data); setSessionError(''); setLoading(false); setExplicitLogout(false); };
  const login = async (values, remember) => { const version=++sessionVersion.current; const data = await authApi.login(values); if(version===sessionVersion.current)acceptSession(data, remember); };
  const loginWithGoogle = async (idToken, remember) => { const version=++sessionVersion.current; const data=await authApi.googleLogin(idToken); if(version===sessionVersion.current)acceptSession(data, remember); };
  const register = async values => { const version=++sessionVersion.current; const data = await authApi.register(values); if(version===sessionVersion.current)acceptSession(data, false); };
  const updateProfile = async values => {
    const version = sessionVersion.current;
    const data = await authApi.updateProfile(values);
    if (version === sessionVersion.current && getToken()) setUser(data);
    return data;
  };
  const refreshUser = async () => {
    const version = sessionVersion.current;
    const data = await authApi.me();
    if (version === sessionVersion.current && getToken()) setUser(data);
    return data;
  };
  const logout = async () => {
    sessionVersion.current++;
    // Capture/send the old token first, then clear locally immediately. A late reply must never clear a new login.
    const pending = authApi.logout();
    clearToken(); setUser(null); setSessionError(''); setLoading(false); setExplicitLogout(true);
    try { await pending; } catch { /* Local logout remains effective when the network is unavailable. */ }
  };
  return <AuthContext.Provider value={{ user, loading, sessionError, explicitLogout, login, loginWithGoogle, register, updateProfile, refreshUser, logout, retry: () => setReload(value => value + 1) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
