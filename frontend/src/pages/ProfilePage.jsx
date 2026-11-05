import { MotionButton, AnimatePresence } from '../components/motion/MotionUI.jsx';
import {useEffect, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {Heart, LogOut} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import {authApi} from '../services/auth.js';
import {landingFor, roleLabels} from '../routing/screens.js';
import {Modal, useToast} from '../components/PortalUI.jsx';
import ProfilePrototype from './ProfilePrototype.jsx';
import '../styles/home-prototype.css';
import '../styles/home-prototype-integration.css';
import '../styles/profile-prototype.css';
import '../styles/profile-prototype-integration.css';

const profileValues=user=>({fullName:user?.fullName||'',phoneNumber:user?.phoneNumber||'',organization:user?.organization||'',preferredArea:user?.preferredArea||''});
const ids={fullName:'editFullName',phoneNumber:'editPhone',organization:'editOrganization',preferredArea:'editAddress',oldPassword:'currentPassword',newPassword:'newPassword',confirmPassword:'confirmNewPassword'};
const emptyPasswords={oldPassword:'',newPassword:'',confirmPassword:''};
const tabs=['info','favorites','appointments','reports','security'];
export default function ProfilePage() {
 const {user,updateProfile,logout}=useAuth();
 const notify=useToast(), navigate=useNavigate();
 const [params,setParams]=useSearchParams();
 const tab=tabs.includes(params.get('tab'))?params.get('tab'):'info';
 const [values,setValues]=useState(()=>profileValues(user)),[passwords,setPasswords]=useState(emptyPasswords),[eyes,setEyes]=useState({}),[editing,setEditing]=useState(false),[errors,setErrors]=useState({}),[alert,setAlert]=useState(''),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState(false),[mobileOpen,setMobileOpen]=useState(false);
 useEffect(()=>{if(!editing)setValues(profileValues(user));},[user,editing]);
 const roleLabel=roleLabels[user?.role]||'Thành viên';
 const isOperator=['STAFF','ADMIN'].includes(user?.role), isHost=user?.role==='ROOM_HOST';
 const perks={title:isOperator?'Đặc quyền Chuyên viên vận hành Staff Portal':isHost?'Đặc quyền Chủ trọ đối tác HL_RCS':'Quyền lợi thành viên Sinh viên FPT & Người thuê',description:isOperator?'Tài khoản của bạn được cấp quyền thẩm định hồ sơ nhà trọ, kiểm duyệt tin đăng vi phạm, xác minh đánh giá và điều phối hỗ trợ đối tác.':isHost?'Tài khoản của bạn được cấp quyền đăng tải nhà trọ, kiểm soát số lượng phòng trống và nhận liên hệ trực tiếp từ sinh viên.':'Bạn được quyền lưu trữ và so sánh không giới hạn các phòng trọ, xem thông tin điện nước minh bạch và đặt lịch xem phòng miễn phí.'};
 function showErrors(next){setErrors(next);const key=Object.keys(next)[0];if(key){requestAnimationFrame(()=>document.getElementById(ids[key])?.focus());return true;}return false;}
 function fail(error){setAlert(error.message||'Không thể lưu thay đổi. Vui lòng thử lại.');setErrors(error.fields||{});}
 async function saveProfile(){
  if(busy)return;
  const payload={...values,fullName:values.fullName.trim(),phoneNumber:values.phoneNumber.trim().replace(/[\s.-]/g,'')};
  const next={};
  if(!payload.fullName)next.fullName='Vui lòng nhập họ và tên.';
  else if(payload.fullName.length>100)next.fullName='Họ và tên tối đa 100 ký tự.';
  if(!/^(0|\+84)[35789]\d{8}$/.test(payload.phoneNumber))next.phoneNumber='Số điện thoại Việt Nam không hợp lệ.';
  if(showErrors(next))return;
  setBusy(true);setAlert('');
  try{await updateProfile(payload);setEditing(false);notify('Đã cập nhật thông tin cá nhân.');}catch(error){fail(error);}finally{setBusy(false);}
 }
 async function uploadAvatar(file){
  if(!file||busy)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('Vui lòng chọn ảnh JPG, PNG hoặc WebP.','error');return;}
  if(file.size>2621440){notify('Kích thước ảnh tối đa 2.5 MB.','error');return;}
  setBusy(true);setAlert('');
  try{
   const avatar=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Không thể đọc ảnh. Vui lòng chọn lại.'));reader.readAsDataURL(file);});
   await updateProfile({...profileValues(user),avatar});notify('Cập nhật ảnh đại diện thành công!');
  }catch(error){fail(error);}finally{setBusy(false);}
 }
 function validatePassword(){
  if(busy)return;
  const next={};
  if(!passwords.oldPassword)next.oldPassword='Vui lòng nhập mật khẩu hiện tại.';
  if(passwords.newPassword.length<6)next.newPassword='Mật khẩu mới cần ít nhất 6 ký tự.';
  else if(passwords.newPassword===passwords.oldPassword)next.newPassword='Mật khẩu mới phải khác mật khẩu hiện tại.';
  if(!passwords.confirmPassword||passwords.confirmPassword!==passwords.newPassword)next.confirmPassword='Mật khẩu xác nhận chưa khớp.';
  if(!showErrors(next))setConfirming(true);
 }
 async function changePassword(){
  if(busy)return;setBusy(true);setAlert('');
  try{await authApi.changePassword({oldPassword:passwords.oldPassword,newPassword:passwords.newPassword});setPasswords(emptyPasswords);setEyes({});setErrors({});notify('Đã đổi mật khẩu thành công.');}catch(error){fail(error);}finally{setBusy(false);setConfirming(false);}
 }
 async function signOut(){if(busy)return;setBusy(true);try{if(await logout()===false)return;navigate('/login',{replace:true});}catch{notify('Phiên đăng nhập trên máy đã được kết thúc.','error');navigate('/login',{replace:true});}finally{setBusy(false);}}
 function selectTab(key){if(busy)return;setParams(key==='info'?{}:{tab:key});setErrors({});setAlert('');}
 function onClick(event){
  const target=event.target;
  const tabButton=target.closest('[data-tab]');if(tabButton)selectTab(tabButton.dataset.tab);
  if(target.closest('#headerApptBox'))selectTab('appointments');
  if(target.closest('#btnStartEditProfile')){setValues(profileValues(user));setEditing(true);setErrors({});setAlert('');}
  if(target.closest('#btnCancelEditProfile')&&!busy){setEditing(false);setValues(profileValues(user));setErrors({});setAlert('');}
  if(target.closest('#btnTriggerAvatarUpload'))document.getElementById('avatarFileInput')?.click();
  if(target.closest('#btnSidebarLogout'))signOut();
  if(target.closest('#mobileMenuBtn'))setMobileOpen(value=>!value);
  if(target.closest('.nav-menu a'))setMobileOpen(false);
  const eye=target.closest('.btn-toggle-eye');if(eye){const key={currentPassword:'oldPassword',newPassword:'newPassword',confirmNewPassword:'confirmPassword'}[eye.dataset.target];setEyes(previous=>({...previous,[key]:!previous[key]}));}
 }
 function onChange(event){
  if(event.target.id==='avatarFileInput'){uploadAvatar(event.target.files?.[0]);event.target.value='';return;}
  const {name,value}=event.target;if(!name)return;
  if(Object.hasOwn(emptyPasswords,name))setPasswords(previous=>({...previous,[name]:value}));else setValues(previous=>({...previous,[name]:value}));
  setErrors(previous=>({...previous,[name]:undefined}));setAlert('');
 }
 function onSubmit(event){event.preventDefault();if(event.target.id==='profileEditForm')saveProfile();else if(event.target.id==='changePasswordForm')validatePassword();}
 const account=<><Link to="/favorites" className="btn-wishlist-top" aria-label="Danh sách phòng yêu thích"><Heart size={18}/><span className="wishlist-count">0</span></Link>{user?.role!=='USER'&&<Link to={landingFor(user)} className="btn-primary-sm">Bảng điều khiển</Link>}<div className="user-nav-pill"><Link to="/profile" className="user-nav-profile-link"><div className="user-nav-avatar">{user?.avatar?<img src={user.avatar} alt="Ảnh đại diện"/>:(user?.fullName||'U').charAt(0)}</div><div className="user-nav-meta"><span className="user-nav-name">{user?.fullName}</span><span className="user-nav-role">{roleLabel}</span></div></Link><MotionButton className="user-nav-logout" onClick={signOut} disabled={busy} aria-label="Đăng xuất"><LogOut size={15}/></MotionButton></div></>;
 return <><ProfilePrototype {...{user,roleLabel,perks,values,passwords,eyes,editing,tab,errors,busy,mobileOpen,account,onClick,onSubmit,onChange,alert}}/><AnimatePresence>{confirming&&<Modal title="Xác nhận đổi mật khẩu" onClose={()=>{if(!busy)setConfirming(false);}}><p>Bạn muốn cập nhật mật khẩu đăng nhập mới?</p><div className="p-actions"><MotionButton className="p-button" disabled={busy} onClick={()=>setConfirming(false)}>Hủy bỏ</MotionButton><MotionButton className="p-button primary" disabled={busy} onClick={changePassword}>{busy?'Đang cập nhật...':'Xác nhận đổi mật khẩu'}</MotionButton></div></Modal>}</AnimatePresence></>;
}
