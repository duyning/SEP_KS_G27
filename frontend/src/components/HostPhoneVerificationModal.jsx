import {useRef,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {Modal} from './PortalUI.jsx';
import {MotionButton} from './motion/MotionUI.jsx';
import ProfilePhoneOtp from './ProfilePhoneOtp.jsx';
import {authApi,getToken} from '../services/auth.js';
import '../styles/profile-phone-otp.css';

export default function HostPhoneVerificationModal({user,onClose,onVerified,preview=false}){
 const [phone,setPhone]=useState(user.phoneNumber||''),[challenge,setChallenge]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[otpBusy,setOtpBusy]=useState(false);
 const lock=useRef(false),session=useRef(getToken()),saved=useRef(false);
 const close=()=>{if(!busy&&!otpBusy)onClose();};
 const send=async event=>{
  event.preventDefault();if(lock.current)return;
  const normalized=phone.trim().replace(/[\s.-]/g,'').replace(/^\+84/,'0');
  if(!/^0[35789]\d{8}$/.test(normalized)){setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');return;}
  lock.current=true;setBusy(true);setError('');
  try{
   const next=preview?{phoneNumber:normalized,expiresAt:new Date(Date.now()+300000).toISOString(),resendAt:new Date().toISOString()}:await authApi.sendPhoneOtp(normalized);
   if(session.current!==getToken())throw Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại xác minh.');
   setChallenge(next);
  }catch(cause){setError(cause.message);}finally{lock.current=false;setBusy(false);}
 };
 const title=<span className="ppo-heading"><span className="ppo-icon"><ShieldCheck size={20} aria-hidden="true"/></span><span>Xác minh số điện thoại</span></span>;
 return <Modal title={title} className="profile-phone-otp" onClose={close}>
  {challenge?<ProfilePhoneOtp embedded challenge={challenge} preview={preview} onBusyChange={setOtpBusy} onClose={close} onVerified={async()=>{if(!saved.current){await authApi.confirmPhone(challenge.phoneNumber);saved.current=true;}await onVerified();}}/>:
   <form onSubmit={send} noValidate><p className="ppo-intro">Nhập số điện thoại liên hệ của bạn. Mã xác minh sẽ được gửi qua SMS ngay tại đây.</p>{preview&&<p className="ppo-preview">Bản xem trước · Không gửi SMS thật.</p>}<div className="ppo-field"><label htmlFor="host-verification-phone">Số điện thoại</label><input id="host-verification-phone" className="hvp-phone-input" type="tel" autoComplete="tel" autoFocus value={phone} disabled={busy} onChange={event=>{setPhone(event.target.value);setError('');}} aria-invalid={Boolean(error)} aria-describedby={error?'host-phone-error':undefined}/>{error&&<p id="host-phone-error" className="ppo-error" role="alert">{error}</p>}</div><div className="ppo-actions"><MotionButton type="button" className="p-button" disabled={busy} onClick={close}>Hủy</MotionButton><MotionButton type="submit" className="p-button primary" disabled={busy}>{busy?'Đang gửi mã…':'Gửi mã OTP'}</MotionButton></div></form>}
 </Modal>;
}
