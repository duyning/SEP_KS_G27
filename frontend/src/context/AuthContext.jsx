import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authApi, clearToken, getToken, saveToken } from '../services/auth.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [reload, setReload] = useState(0);
  const sessionVersion = useRef(0);
  useEffect(() => {
    const expire = () => { sessionVersion.current++; setUser(null); setSessionError(''); };
    window.addEventListener('hlrcs:session-expired', expire);
    return () => window.removeEventListener('hlrcs:session-expired', expire);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSessionError('');
    if (!getToken()) { setLoading(false); return () => controller.abort(); }
    authApi.me(controller.signal).then(setUser).catch(error => {
      if (controller.signal.aborted) return;
      if ([401, 403].includes(error.status)) { clearToken(); setUser(null); }
      else setSessionError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const acceptSession = (data, remember) => { sessionVersion.current++; saveToken(data.accessToken, remember); setUser(data); setSessionError(''); };
  const login = async (values, remember) => { const data = await authApi.login(values); acceptSession(data, remember); };
  const loginWithGoogle = async (idToken, remember) => { const data = await authApi.googleLogin(idToken); acceptSession(data, remember); };
  const register = async values => { const data = await authApi.register(values); acceptSession(data, false); };
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
    try { await authApi.logout(); } finally { sessionVersion.current++; clearToken(); setUser(null); setSessionError(''); }
  };
  return <AuthContext.Provider value={{ user, loading, sessionError, login, loginWithGoogle, register, updateProfile, refreshUser, logout, retry: () => setReload(value => value + 1) }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
