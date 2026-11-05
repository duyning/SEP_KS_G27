import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authApi, clearToken, getToken, saveToken } from '../services/auth.js';
import LogoutConfirmation from '../components/LogoutConfirmation.jsx';
import '../styles/logout-confirm.css';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [reload, setReload] = useState(0);
  const sessionVersion = useRef(0);
  const logoutTask = useRef(null), confirmLogout = useRef(null);
  const logoutTrigger = useRef(null);
  const [logoutOpen,setLogoutOpen] = useState(false), [logoutBusy,setLogoutBusy] = useState(false);
  const cancelLogout = () => {
    confirmLogout.current?.(false);confirmLogout.current = null;setLogoutOpen(false);
    requestAnimationFrame(()=>{if(logoutTrigger.current?.isConnected)logoutTrigger.current.focus({preventScroll:true});});
  };
  useEffect(() => () => {confirmLogout.current?.(false);}, []);
  useEffect(() => {
    const expire = () => { cancelLogout();sessionVersion.current++; setUser(null); setSessionError(''); };
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
  const acceptSession = (data, remember) => { cancelLogout();sessionVersion.current++; saveToken(data.accessToken, remember); setUser(data); setSessionError(''); };
  const login = async (values, remember) => { const data = await authApi.login(values); acceptSession(data, remember); };
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
  const logout = () => {
    if (logoutTask.current) return logoutTask.current;
    const execute = async () => {
      if (user) {
        logoutTrigger.current = document.activeElement;
        const menuTrigger = logoutTrigger.current?.closest('.host-user-menu-wrapper')?.querySelector('button[aria-haspopup]');
        if (menuTrigger) logoutTrigger.current = menuTrigger;
        const confirmed = await new Promise(resolve => {confirmLogout.current = resolve;setLogoutOpen(true);});
        if (!confirmed) return false;
      }
      setLogoutBusy(true);sessionVersion.current++;
      try { await authApi.logout(); return true; }
      finally {
        sessionVersion.current++;clearToken();setUser(null);setSessionError('');
        setLogoutOpen(false);setLogoutBusy(false);
      }
    };
    logoutTask.current = execute().finally(() => {logoutTask.current = null;});
    return logoutTask.current;
  };
  return <AuthContext.Provider value={{ user, loading, sessionError, login, register, updateProfile, refreshUser, logout, retry: () => setReload(value => value + 1) }}>{children}
    {logoutOpen && <LogoutConfirmation busy={logoutBusy} onCancel={cancelLogout} onConfirm={()=>{confirmLogout.current?.(true);confirmLogout.current=null;}}/>}
  </AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
