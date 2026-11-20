import {useCallback} from 'react';
import {NavLink} from 'react-router-dom';
import {Bell} from 'lucide-react';
import {useViewingData} from './ViewingUI.jsx';
import {noticesApi} from '../services/notices.js';
export default function NotificationBell(){
 const load=useCallback(signal=>noticesApi.feed({},signal),[]);
 const {data}=useViewingData(load,'notification-badge');
 return <NavLink to="/notifications" className={({isActive})=>`btn-wishlist-top${isActive?' notification-bell-active':''}`} aria-label={`Thông báo${data?`, ${data.unreadCount} chưa đọc`:''}`}><Bell size={18} aria-hidden="true"/>{data?.unreadCount>0&&<span className="wishlist-count">{data.unreadCount}</span>}</NavLink>;
}
