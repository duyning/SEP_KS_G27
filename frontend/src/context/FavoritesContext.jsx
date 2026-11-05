import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useAuth} from './AuthContext.jsx';
import {favoritesApi} from '../services/favorites.js';

const FavoritesContext = createContext(null);
export function FavoritesProvider({children}) {
  const {user} = useAuth();
  // Account changes discard all prior account state and abort its outstanding requests.
  return <FavoritesSession key={user ? `${user.userId}:${user.role}` : 'guest'} user={user}>{children}</FavoritesSession>;
}
function FavoritesSession({user, children}) {
  const navigate = useNavigate(), location = useLocation();
  const eligible = !!user && ['USER','ROOM_HOST'].includes(user.role);
  const store = useRef({items:new Map(), known:new Set(), pending:new Set(), total:null});
  const requests = useRef(new Set()), version = useRef(0), mounted = useRef(true);
  const [snapshot, setSnapshot] = useState({...store.current});
  const [revision, setRevision] = useState(0), [actionError, setActionError] = useState('');
  const publish = () => { if (mounted.current) setSnapshot({...store.current}); };
  useEffect(() => { mounted.current = true; return () => {mounted.current = false;requests.current.forEach(c => c.abort());}; }, []);
  const load = useCallback(async (ids, signal) => {
    if (!eligible) return;
    const before = version.current;
    const batches = ids.length ? Array.from({length:Math.ceil(ids.length/50)}, (_, i) => ids.slice(i*50,i*50+50)) : [[]];
    const results = await Promise.all(batches.map(batch => favoritesApi.state(batch, signal)));
    if (signal?.aborted || !mounted.current || before !== version.current) return;
    ids.forEach(id => {store.current.items.delete(id);store.current.known.add(id);});
    results.forEach(result => result.items.forEach(item => store.current.items.set(item.roomTypeId, item.favoriteId)));
    store.current.total = results[0].total;
    publish();
  }, [eligible]);
  useEffect(() => { const c = new AbortController();load([],c.signal).catch(()=>{});return()=>c.abort(); }, [load,revision]);
  const mutate = async (roomTypeId, favoriteId) => {
    if (!user) { navigate('/login', {state:{from:`${location.pathname}${location.search}${location.hash}`}}); return false; }
    if (!eligible) {setActionError('Chỉ người thuê và chủ trọ được sử dụng danh sách yêu thích.');return false;}
    if (store.current.pending.has(roomTypeId)) return false;
    store.current.pending.add(roomTypeId);setActionError('');publish();
    const c = new AbortController();requests.current.add(c);
    // Invalidate earlier status reads before this mutation starts and again when it settles.
    version.current++;
    try {
      if (!favoriteId && !store.current.known.has(roomTypeId)) {
        const result = await favoritesApi.state([roomTypeId], c.signal);
        favoriteId = result.items[0]?.favoriteId;
      } else if (!favoriteId) favoriteId = store.current.items.get(roomTypeId);
      if (favoriteId) {
        await favoritesApi.remove(favoriteId, c.signal);
        if (!mounted.current) return false;
        store.current.items.delete(roomTypeId);
        if (store.current.total != null) store.current.total = Math.max(0,store.current.total-1);
      } else {
        const item = await favoritesApi.save(roomTypeId, c.signal);
        if (!mounted.current) return false;
        if (!store.current.items.has(roomTypeId) && store.current.total != null) store.current.total++;
        store.current.items.set(roomTypeId,item.favoriteId);
      }
      store.current.known.add(roomTypeId);
      return true;
    } catch (error) {
      if (!c.signal.aborted && mounted.current) setActionError(error.message);
      return false;
    } finally {
      requests.current.delete(c);version.current++;
      store.current.pending.delete(roomTypeId);
      if (mounted.current) {publish();setRevision(value=>value+1);}
    }
  };
  return <FavoritesContext.Provider value={{...snapshot, eligible, user, load, revision, actionError, toggle:mutate,
    remove:(favoriteId,roomTypeId)=>mutate(roomTypeId,favoriteId), clearError:()=>setActionError('')}}>{children}</FavoritesContext.Provider>;
}
export const useFavorites = () => useContext(FavoritesContext);
export function useFavoriteActions(ids = []) {
  const favorites = useFavorites();
  const key = [...new Set(ids.filter(id=>Number.isSafeInteger(id)&&id>0))].sort((a,b)=>a-b).join(',');
  const [error,setError] = useState(''), [reload,setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController();setError('');
    favorites.load(key ? key.split(',').map(Number) : [],c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);});
    return()=>c.abort();
  }, [favorites.load,favorites.revision,key,reload]);
  return {...favorites, error:error||favorites.actionError,
    isSaved:id=>favorites.items.has(id),
    busy:id=>favorites.pending.has(id)||(favorites.eligible&&!favorites.known.has(id)&&!error),
    retry:()=>{favorites.clearError();setReload(value=>value+1);}};
}
