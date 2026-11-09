import {useId} from 'react';
import {LogOut,X} from 'lucide-react';
import {MotionButton,MotionDialog} from './motion/MotionUI.jsx';

export default function LogoutConfirmation({busy,onCancel,onConfirm}) {
  const title=useId(),description=useId();
  const close=()=>{if(!busy)onCancel();};
  const containFocus=event=>{
    if(event.key!=='Tab')return;
    const controls=[...event.currentTarget.querySelectorAll('button:not(:disabled)')];
    if(!controls.length){event.preventDefault();return;}
    const first=controls[0],last=controls.at(-1),focused=document.activeElement;
    if(event.shiftKey&&focused===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&focused===last){event.preventDefault();first.focus();}
  };
  return <MotionDialog className="portal-modal logout-confirm" aria-labelledby={title} aria-describedby={description} aria-busy={busy}
    onKeyDown={containFocus} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
    <header><h2 id={title}>Xác nhận đăng xuất</h2><MotionButton type="button" className="p-icon" aria-label="Đóng" disabled={busy} onClick={close}><X size={20}/></MotionButton></header>
    <div className="logout-confirm-icon"><LogOut size={24} aria-hidden="true"/></div>
    <p id={description}>Bạn có chắc muốn đăng xuất khỏi tài khoản?</p>
    <div className="logout-confirm-actions">
      <MotionButton type="button" className="p-button" autoFocus disabled={busy} onClick={close}>Hủy</MotionButton>
      <MotionButton type="button" className="p-button primary" disabled={busy} onClick={onConfirm}>{busy?'Đang đăng xuất...':'Đăng xuất'}</MotionButton>
    </div>
  </MotionDialog>;
}
