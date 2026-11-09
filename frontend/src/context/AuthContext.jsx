import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authApi, clearToken, getToken, saveToken } from '../services/auth.js';
import LogoutConfirmation from '../components/LogoutConfirmation.jsx';
import '../styles/logout-confirm.css';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [explicitLogout, setExplicitLogout] = useState(false);
  const [reload, setReload] = useState(0);
  const sessionVersion = useRef(0);
  const logoutTask = useRef(null), confirmLogout = useRef(null);
  const logoutTrigger = useRef(null);
  const [logoutOpen,setLogoutOpen] = useState(false), [logoutBusy,setLogoutBusy] = useState(false);
  const cancelLogout = () => {
    confirmLogout.current?.(false);confirmLogout.current = null;setLogoutOpen(false);setLogoutBusy(false);
    requestAnimationFrame(()=>{if(logoutTrigger.current?.isConnected)logoutTrigger.current.focus({preventScroll:true});});
  };
  useEffect(() => () => {confirmLogout.current?.(false);}, []);
  useEffect(() => {
    const expire = () => { cancelLogout();sessionVersion.current++; setUser(null); setSessionError(''); setLoading(false); };
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
  const acceptSession = (data, remember) => { cancelLogout();logoutTask.current = null;sessionVersion.current++; saveToken(data.accessToken, remember); setUser(data); setSessionError(''); setLoading(false); setExplicitLogout(false); };
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
  const logout = () => {
    if (logoutTask.current) return logoutTask.current;
    const execute = async () => {
      const version = sessionVersion.current;
      if (user) {
        logoutTrigger.current = document.activeElement;
        const menuTrigger = logoutTrigger.current?.closest('.host-user-menu-wrapper')?.querySelector('button[aria-haspopup]');
        if (menuTrigger) logoutTrigger.current = menuTrigger;
        const confirmed = await new Promise(resolve => {confirmLogout.current = resolve;setLogoutOpen(true);});
        if (!confirmed || version !== sessionVersion.current) return false;
      }
      sessionVersion.current++;
      const logoutVersion = sessionVersion.current;
      // Send the old token before clearing locally; late replies cannot clear a new login.
      const pending = authApi.logout();
      clearToken(); setUser(null); setSessionError(''); setLoading(false); setExplicitLogout(true);
      setLogoutOpen(false);setLogoutBusy(false);
      try { await pending; } catch { /* Local logout remains effective when the network is unavailable. */ }
      return logoutVersion === sessionVersion.current;
    };
    const task = execute().finally(() => {if (logoutTask.current === task) logoutTask.current = null;});
    logoutTask.current = task;
    return task;
  };
  return <AuthContext.Provider value={{ user, loading, sessionError, explicitLogout, login, loginWithGoogle, register, updateProfile, refreshUser, logout, retry: () => setReload(value => value + 1) }}>{children}
    {logoutOpen && <LogoutConfirmation busy={logoutBusy} onCancel={cancelLogout} onConfirm={()=>{setLogoutBusy(true);confirmLogout.current?.(true);confirmLogout.current=null;}}/>}
  </AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
