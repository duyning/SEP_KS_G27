import {useCallback} from 'react';
import {NavLink} from 'react-router-dom';
import {Bell} from 'lucide-react';
import {useViewingData} from './ViewingUI.jsx';
import {noticesApi} from '../services/notices.js';
export default function NotificationBell({to='/notifications',className='btn-wishlist-top'}){
 const load=useCallback(signal=>noticesApi.feed({},signal),[]);
 const {data}=useViewingData(load,'notification-badge');
 const label=`Thông báo${data?`, ${data.unreadCount} chưa đọc`:''}`;
 return <NavLink to={to} className={({isActive})=>`${className}${isActive?' notification-bell-active':''}`} aria-label={label} title={label}><Bell size={18} aria-hidden="true"/>{data?.unreadCount>0&&<span className="wishlist-count" aria-hidden="true">{data.unreadCount>99?'99+':data.unreadCount}</span>}</NavLink>;
}
