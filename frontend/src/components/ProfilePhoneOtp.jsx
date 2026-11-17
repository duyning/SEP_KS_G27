import {useEffect,useRef,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {authApi,getToken} from '../services/auth.js';
import {Modal} from './PortalUI.jsx';
import {MotionButton} from './motion/MotionUI.jsx';
import '../styles/profile-phone-otp.css';

const digits=value=>value.replace(/\D/g,'').slice(0,6);
const clock=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
const displayPhone=phone=>/^0\d{9}$/.test(phone)?`${phone.slice(0,3)} ${phone.slice(3,6)} ${phone.slice(6)}`:phone;
export default function ProfilePhoneOtp({challenge,onClose,onVerified,preview=false,embedded=false,onBusyChange}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [timing,setTiming]=useState(challenge),[now,setNow]=useState(()=>Date.now()),[verified,setVerified]=useState(false);
 const [focused,setFocused]=useState(false),[caret,setCaret]=useState(0);
 const [fieldInvalid,setFieldInvalid]=useState(false);
 const lock=useRef(false),input=useRef(null),session=useRef(getToken());
 useEffect(()=>{onBusyChange?.(Boolean(busy));},[busy,onBusyChange]);
 const [previewDurations]=useState(()=>({ttl:Math.max(0,Date.parse(challenge.expiresAt)-Date.now()),retry:Math.max(0,Date.parse(challenge.resendAt)-Date.now())}));
 useEffect(()=>{
  if(window.matchMedia('(hover: hover) and (pointer: fine)').matches)input.current?.focus();
  const dialog=input.current?.closest('dialog');
  const containTab=event=>{
   if(event.key!=='Tab')return;
   const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]'));
   if(!controls.length)return;
   const index=controls.indexOf(document.activeElement),next=(index+(event.shiftKey?-1:1)+controls.length)%controls.length;
   event.preventDefault();controls[next].focus();
  };
  dialog?.addEventListener('keydown',containTab);
  const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(timer);dialog?.removeEventListener('keydown',containTab);};
 },[]);
 const remaining=Math.max(0,Math.ceil((Date.parse(timing.expiresAt)-now)/1000));
 const retry=Math.max(0,Math.ceil((Date.parse(timing.resendAt)-now)/1000));
 const expired=remaining===0;
 function edit(value,position){const next=digits(value);setCode(next);setCaret(Math.min(position,next.length));setError('');setFieldInvalid(false);setNotice('');}
 function selectPosition(position){const index=Math.min(position,code.length);input.current?.focus();input.current?.setSelectionRange(index,index);setCaret(index);}
 function paste(event){
  event.preventDefault();const text=digits(event.clipboardData.getData('text'));if(!text)return;
  const start=input.current.selectionStart??code.length,end=input.current.selectionEnd??start;
  const next=text.length===6?text:digits(code.slice(0,start)+text+code.slice(end));
  const position=text.length===6?6:Math.min(start+text.length,6);edit(next,position);
  requestAnimationFrame(()=>input.current?.setSelectionRange(position,position));
 }
 async function resend(){
  if(lock.current||retry>0)return;
  if(preview){const time=Date.now();setTiming({...challenge,resendAt:new Date(time+previewDurations.retry).toISOString(),expiresAt:new Date(time+previewDurations.ttl).toISOString()});setNow(time);edit('',0);setNotice('Xem trước thao tác gửi lại — không gửi SMS.');return;}
  lock.current=true;setBusy('resend');setError('');setFieldInvalid(false);setNotice('');
  try{setTiming(await authApi.sendPhoneOtp(challenge.phoneNumber));setNow(Date.now());setCode('');setCaret(0);setVerified(false);setNotice('Đã gửi mã mới.');}
  catch(e){setError(e.message||'Chưa thể gửi lại mã. Vui lòng thử lại.');}
  finally{lock.current=false;setBusy('');}
 }
 async function submit(event){
  event.preventDefault();if(lock.current||(!verified&&(code.length!==6||expired)))return;
  if(preview){setError('');setNotice('Xem trước thao tác xác nhận — không kiểm tra OTP và không lưu tài khoản.');return;}
  lock.current=true;setBusy(verified?'save':'verify');setError('');setFieldInvalid(false);setNotice('');let approved=verified;
  try{
   if(!approved){await authApi.verifyPhoneOtp(challenge.phoneNumber,code);approved=true;setVerified(true);}
   if(session.current!==getToken())throw Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại thông tin tài khoản.');
   setBusy('save');await onVerified();
  }catch(e){
   const message=e.message||'Không thể kết nối máy chủ. Vui lòng thử lại.';
   if(message.includes('xác minh OTP')){setVerified(false);setError(message);}
   else if(approved)setError(`Đã xác minh số điện thoại nhưng chưa lưu được hồ sơ. ${message}`);
   else if(expired||/Mã OTP đã hết hạn|Mã đã hết hạn/.test(message)){setFieldInvalid(true);setTiming(previous=>({...previous,expiresAt:new Date().toISOString()}));setNow(Date.now());setError('Mã đã hết hạn. Vui lòng yêu cầu mã mới.');}
   else if(/Mã OTP không đúng/.test(message)){setFieldInvalid(true);setError('Mã xác minh không đúng. Vui lòng kiểm tra và nhập lại.');}
   else setError(message);
  }finally{lock.current=false;setBusy('');}
 }
 const title=<span className="ppo-heading"><span className="ppo-icon"><ShieldCheck size={20} aria-hidden="true"/></span><span>Xác minh số điện thoại</span></span>;
 const content=<>
  <form onSubmit={submit}>
   <p className="ppo-intro">Nhập mã 6 chữ số gửi đến <strong>{displayPhone(challenge.phoneNumber)}</strong>.</p>
   {preview&&<p className="ppo-preview" role="note">Chế độ xem trước · Không gửi SMS, không lưu tài khoản.</p>}
   <div className="ppo-field">
    <label htmlFor="profilePhoneOtp">Mã xác minh</label>
    <div className={`ppo-code${focused?' is-focused':''}${fieldInvalid?' has-error':''}${verified?' is-verified':''}`}>
     <div className="ppo-cells" aria-hidden="true">{Array.from({length:6},(_,index)=><span key={index} className={`ppo-cell${focused&&!busy&&!verified&&Math.min(caret,5)===index?' is-active':''}${code[index]?' is-filled':''}`}>{code[index]||''}</span>)}</div>
     <input ref={input} id="profilePhoneOtp" type="text" value={code} onChange={event=>{const pos=(event.target.value.slice(0,event.target.selectionStart??6).match(/\d/g)||[]).length;edit(event.target.value,pos);}}
      onPaste={paste} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onSelect={event=>setCaret(event.target.selectionStart??0)}
      onPointerDown={event=>{if(busy||verified)return;event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();selectPosition(Math.max(0,Math.min(5,Math.floor((event.clientX-rect.left)/(rect.width/6)))));}}
      inputMode="numeric" autoComplete="one-time-code" spellCheck={false} disabled={!!busy||verified} aria-invalid={fieldInvalid} aria-describedby={`phone-otp-status${error?' phone-otp-error':''}`}/>
    </div>
    <p id="phone-otp-status" className="ppo-hint">{verified?'Đã xác minh số điện thoại. Bạn có thể thử lưu lại.':expired?'Mã đã hết hạn. Vui lòng yêu cầu mã mới.':`Mã còn hiệu lực ${clock(remaining)}. Đừng chia sẻ mã này.`}</p>
    {error&&<p id="phone-otp-error" role="alert" className="ppo-error">{error}</p>}
    <p role="status" className="ppo-status">{notice}</p>
   </div>
   {!verified&&<div className="ppo-resend-row"><span>Chưa nhận được mã?</span><MotionButton type="button" className="ppo-resend" disabled={!!busy||retry>0} onClick={resend}>{busy==='resend'?'Đang gửi lại…':retry>0?`Gửi lại sau ${clock(retry)}`:'Gửi lại mã'}</MotionButton></div>}
   <div className="ppo-actions"><MotionButton type="button" className="p-button" disabled={!!busy} onClick={onClose}>Hủy</MotionButton><MotionButton type="submit" className="p-button primary" disabled={!!busy||(!verified&&(code.length!==6||expired))} aria-busy={!!busy}>{busy==='verify'?'Đang xác minh…':busy==='save'?'Đang lưu…':verified?'Lưu thông tin':'Xác minh và lưu'}</MotionButton></div>
  </form>
 </>;
 return embedded?content:<Modal title={title} className="profile-phone-otp" onClose={()=>{if(!busy)onClose();}}>{content}</Modal>;
}
