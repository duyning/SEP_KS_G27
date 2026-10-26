import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../context/AuthContext.jsx';
import StaffHostShellTemplate from './StaffHostShellTemplate.jsx';
import '../../styles/staff-host-prototype.css';
import '../../styles/staff-host-integration.css';
export const applicationLabels={PENDING_REVIEW:'Chờ xét duyệt',NEEDS_CHANGES:'Cần bổ sung',APPROVED:'Đã phê duyệt',REJECTED:'Đã từ chối'};
export const date=value=>{const time=new Date(value);return !value||Number.isNaN(time.getTime())?'—':time.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})+' · '+time.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});};
export function HostApplicationStatus({status}){return <span className={`shr-status-badge ${{PENDING_REVIEW:'pending',NEEDS_CHANGES:'warning',APPROVED:'approved',REJECTED:'rejected'}[status]||''}`}><span className="dot"/>{applicationLabels[status]||status}</span>;}
export default function StaffHostShell({children,pending=0}){
 const {user,logout}=useAuth(),navigate=useNavigate();
 const [mobileOpen,setMobileOpen]=useState(false),[userMenu,setUserMenu]=useState(false);
 useEffect(()=>{const close=event=>{if(event.key==='Escape'){setMobileOpen(false);setUserMenu(false);}};const outside=event=>{if(!event.target.closest('#staffUserMenuWrapper'))setUserMenu(false);};document.addEventListener('keydown',close);document.addEventListener('click',outside);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('click',outside);};},[]);
 const signOut=async()=>{try{await logout();}finally{navigate('/login',{replace:true});}};
 const onShellClick=event=>{const target=event.target;if(target.closest('#btnToggleSidebarMobile'))setMobileOpen(value=>!value);if(target.closest('#sidebarBackdrop,.staff-sidebar a'))setMobileOpen(false);if(target.closest('#btnStaffUserDropdown'))setUserMenu(value=>!value);if(target.closest('#btnSidebarLogout,#btnPopoverLogout'))signOut();};
 return <StaffHostShellTemplate {...{user,pending,mobileOpen,userMenu,onShellClick}}>{children}</StaffHostShellTemplate>;
}
