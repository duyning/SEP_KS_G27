import { MotionButton, AnimatePresence } from '../components/motion/MotionUI.jsx';
import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Heart,LogOut} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import {landingFor,roleLabels} from '../routing/screens.js';
import {Modal,useToast} from '../components/PortalUI.jsx';
import {hostApplicationApi,applicantCapacities,rentalExperiences} from '../services/host-applications.js';
import BecomeHostPrototype from './BecomeHostPrototype.jsx';
import '../styles/home-prototype.css';
import '../styles/home-prototype-integration.css';
import '../styles/become-host-prototype.css';
import '../styles/become-host-integration.css';
import '../styles/become-host-refinement.css';

const emptyForm={applicantCapacity:'',rentalExperience:'',targetCommune:'',expectedScale:'',introduction:'',agreementAccepted:false};
const ids={applicantCapacity:'applicantCapacity',rentalExperience:'rentalExperience',targetCommune:'targetCommune',expectedScale:'expectedScale',introduction:'introduction',agreementAccepted:'agreementCheck'};
const formatDate=value=>value?new Date(value).toLocaleString('vi-VN'):'—';
export default function BecomeHostPage(){
 const {user,logout,refreshUser}=useAuth(),navigate=useNavigate(),notify=useToast();
 const [application,setApplication]=useState(null),[values,setValues]=useState(emptyForm),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[alert,setAlert]=useState(''),[errors,setErrors]=useState({}),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[modal,setModal]=useState(null),[revision,setRevision]=useState(0),[mobileOpen,setMobileOpen]=useState(false);
 const refreshed=useRef(false),formDirty=Object.values(values).some(Boolean);
 const missingContact=!user?.fullName?.trim()||!/^(0|\+84)[35789]\d{8}$/.test(user?.phoneNumber||'');
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setLoadError('');
  hostApplicationApi.current(controller.signal).then(data=>{if(!controller.signal.aborted)setApplication(data);}).catch(error=>{if(!controller.signal.aborted)setLoadError(error.status===404?'Backend chưa có chức năng đăng ký làm chủ trọ. Vui lòng khởi động lại backend sau khi cập nhật code.':error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[revision,user?.userId]);
 useEffect(()=>{
  if(application?.status!=='PENDING_REVIEW')return;
  let stopped=false;const controller=new AbortController();
  const timer=setInterval(()=>{if(document.visibilityState!=='visible')return;hostApplicationApi.current(controller.signal).then(value=>{if(!stopped)setApplication(value);}).catch(()=>{});},30000);
  return()=>{stopped=true;controller.abort();clearInterval(timer);};
 },[application?.status]);
 useEffect(()=>{if(application?.status==='APPROVED'&&user?.role==='USER'&&!refreshed.current){refreshed.current=true;refreshUser().catch(()=>notify('Vui lòng đăng nhập lại để cập nhật quyền Chủ trọ.','error'));}},[application?.status,user?.role]);
 useEffect(()=>{const handler=event=>{if(editing||(!application&&formDirty)){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[editing,application,formDirty]);
 const state=loading?'loading':loadError?'error':application?.status==='APPROVED'?'approved':['ROOM_HOST','ADMIN'].includes(user?.role)?'already_host':user?.role!=='USER'?'error':editing?'unregistered':({PENDING_REVIEW:'pending',NEEDS_CHANGES:'needs_changes',REJECTED:'rejected'}[application?.status]||'unregistered');
 const roleLabel=roleLabels[user?.role]||'Thành viên';
 function stepClass(number){
  if(['approved','already_host'].includes(state))return 'completed';
  if(['pending','needs_changes','rejected'].includes(state))return number<3?'completed':number===3?state==='pending'?'active':state==='needs_changes'?'warning':'rejected':'';
  return number===1?'active':'';
 }
 const stepLabel=number=>({completed:'✓',warning:'!',rejected:'✕'}[stepClass(number)]||number);
 function validate(){
  const next={};if(!applicantCapacities.some(([key])=>key===values.applicantCapacity))next.applicantCapacity='Vui lòng chọn tư cách cho thuê của bạn.';if(!rentalExperiences.some(([key])=>key===values.rentalExperience))next.rentalExperience='Vui lòng chọn kinh nghiệm quản lý của bạn.';if(!values.targetCommune)next.targetCommune='Vui lòng chọn khu vực hoạt động chính của bạn.';
  if(!values.expectedScale)next.expectedScale='Vui lòng chọn quy mô số lượng phòng dự kiến.';
  if(values.introduction.trim().length<20||values.introduction.length>1000)next.introduction='Lời giới thiệu cần từ 20 đến 1000 ký tự.';
  if(!values.agreementAccepted)next.agreementAccepted='Bạn cần đồng ý với cam kết đối tác để gửi đơn đăng ký.';
  setErrors(next);if(Object.keys(next).length){document.getElementById(ids[Object.keys(next)[0]])?.focus();return false;}
  if(missingContact){setAlert('Vui lòng cập nhật họ tên và số điện thoại tại Hồ sơ cá nhân.');return false;}return true;
 }
 async function submit(){
  if(busy||!validate())return;setBusy(true);setAlert('');
  try{const result=await hostApplicationApi.submit({...values,introduction:values.introduction.trim(),version:application?.version??null});setApplication(result);setEditing(false);setValues(emptyForm);setModal(null);notify('Đã gửi đăng ký làm chủ trọ. Hồ sơ đang chờ xét duyệt.');document.getElementById('bhMainContent')?.scrollIntoView({behavior:'smooth'});}
  catch(error){setModal(null);setAlert(error.message);setErrors(error.fields||{});}finally{setBusy(false);}
 }
 function onChange(event){const {name,value,checked,type}=event.target;if(!Object.hasOwn(emptyForm,name))return;setValues(previous=>({...previous,[name]:type==='checkbox'?checked:value}));setErrors(previous=>({...previous,[name]:undefined}));setAlert('');}
 function onSubmit(event){if(event.target.id==='becomeHostForm'){event.preventDefault();if(!busy&&validate())setModal('submit');}}
 function onClick(event){
  if(event.target.closest('#mobileMenuBtn'))setMobileOpen(value=>!value);
  if(event.target.closest('.nav-menu a'))setMobileOpen(false);
  if(event.target.closest('#btnRetryError'))setRevision(value=>value+1);
  if(event.target.closest('#btnCancelForm')){if(formDirty)setModal('cancel');else navigate('/profile');}
  if(event.target.closest('#btnStartSupplement,#btnResubmitAfterReject')&&application?.allowResubmit){setValues({applicantCapacity:application.applicantCapacity||'',rentalExperience:application.rentalExperience||'',targetCommune:application.targetCommune,expectedScale:application.expectedScale,introduction:application.introduction,agreementAccepted:false});setEditing(true);setAlert('');setErrors({});}
 }
 async function signOut(){if(busy)return;try{await logout();}finally{navigate('/login',{replace:true});}}
 const account=<><Link to="/favorites" className="btn-wishlist-top" aria-label="Nhà trọ đã lưu"><Heart size={18}/><span className="wishlist-count">0</span></Link>{user.role!=='USER'&&<Link to={landingFor(user)} className="btn-primary-sm">Bảng điều khiển</Link>}<div className="user-nav-pill"><Link to="/profile" className="user-nav-profile-link"><div className="user-nav-avatar">{user.avatar?<img src={user.avatar} alt="Ảnh đại diện"/>:(user.fullName||'U').charAt(0)}</div><div className="user-nav-meta"><span className="user-nav-name">{user.fullName}</span><span className="user-nav-role">{roleLabel}</span></div></Link><MotionButton className="user-nav-logout" aria-label="Đăng xuất" onClick={signOut}><LogOut size={15}/></MotionButton></div></>;
 return <><BecomeHostPrototype {...{user,roleLabel,application,values,errors,state,busy,mobileOpen,account,missingContact,formatDate,stepClass,stepLabel,onClick,onSubmit,onChange}} alert={loadError||alert||(user.role==='STAFF'?'Tài khoản nhân viên không cần đăng ký quyền Chủ trọ.':'')}/><AnimatePresence>{modal&&<Modal className="bh-confirm-modal" title={modal==='submit'?'Xác nhận gửi hồ sơ đăng ký làm Chủ trọ?':'Hủy bỏ nội dung đang nhập?'} onClose={()=>{if(!busy)setModal(null);}}>{modal==='submit'?<><p>Hồ sơ xin cấp quyền sẽ được chuyển sang trạng thái <strong>“Đang chờ xét duyệt”</strong> để đội ngũ Staff HL-RCS thẩm định.</p><aside><strong>Lưu ý:</strong> Đơn đăng ký này là thủ tục xin cấp quyền sử dụng chức năng Chủ trọ. Sau khi được duyệt, bạn sẽ tạo hồ sơ cơ sở nhà trọ và danh sách phòng sau tại Host Portal.</aside><footer><MotionButton className="p-button" disabled={busy} onClick={()=>setModal(null)}>Xem lại hồ sơ</MotionButton><MotionButton className="p-button primary" disabled={busy} onClick={submit}>{busy?'Đang gửi...':'Đồng ý gửi hồ sơ'}</MotionButton></footer></>:<><p>Bạn đang có một số thông tin đã điền trong đơn đăng ký. Nếu rời khỏi trang lúc này, các nội dung chưa gửi sẽ bị hủy bỏ.</p><footer><MotionButton className="p-button" onClick={()=>setModal(null)}>Ở lại tiếp tục điền</MotionButton><MotionButton className="p-button danger" onClick={()=>{setValues(emptyForm);navigate('/profile');}}>Đồng ý rời đi</MotionButton></footer></>}</Modal>}</AnimatePresence></>;
}
