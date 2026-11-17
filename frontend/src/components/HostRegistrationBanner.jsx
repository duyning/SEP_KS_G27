import {Link} from 'react-router-dom';
import {useLayoutEffect,useRef,useState} from 'react';
import {ArrowUpRight,Phone} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
import '../styles/host-registration-banner.css';

function ContinuousMessage({message}){
 const viewport=useRef(),firstCopy=useRef();
 const [layout,setLayout]=useState({copies:1,duration:20});
 useLayoutEffect(()=>{
  let active=true;
  const measure=()=>{
   if(!active)return;
   const width=firstCopy.current?.getBoundingClientRect().width,available=viewport.current?.getBoundingClientRect().width;
   if(!width||!available)return;
   const copies=Math.max(1,Math.ceil(available/width)),duration=width*copies/42;
   setLayout(previous=>previous.copies===copies&&Math.abs(previous.duration-duration)<0.01?previous:{copies,duration});
  };
  measure();const observer=new ResizeObserver(measure);
  observer.observe(viewport.current);observer.observe(firstCopy.current);
  document.fonts?.ready.then(measure);
  return()=>{active=false;observer.disconnect();};
 },[message]);
 return <div ref={viewport} className="host-entry-viewport"><div className="host-entry-track" style={{'--host-entry-duration':`${layout.duration}s`}}>{[0,1].map(group=><div className="host-entry-group" key={group} aria-hidden={group===1?true:undefined}>{Array.from({length:layout.copies},(_,index)=><span className="host-entry-copy" key={index} ref={group===0&&index===0?firstCopy:undefined} aria-hidden={group===0&&index>0?true:undefined}>{message}<span className="host-entry-separator" aria-hidden="true">•</span></span>)}</div>)}</div></div>;
}

export default function HostRegistrationBanner(){
 const {user}=useAuth();
 const eligible=!user||user.role==='USER';
 const message='Bạn có nhà trọ tại Hòa Lạc? Trở thành đối tác HL_RCS và quản lý nhà trọ ngay trên hệ thống.';
 return <aside className="host-entry-banner" aria-label={eligible?'Đăng ký trở thành chủ trọ':'Thông tin Hòa Lạc'}>
  <div className="host-entry-inner">
   <span className="host-entry-badge">Hòa Lạc Campus</span>
   {eligible?<ContinuousMessage message={message}/>:<div className="host-entry-viewport"><span>Kết nối cộng đồng thuê trọ tại Hòa Lạc</span></div>}
   {eligible?<Link className="host-entry-link" to={user?'/become-host':'/login'} state={user?undefined:{from:'/become-host'}}>Đăng ký làm chủ trọ<ArrowUpRight size={16} aria-hidden="true"/></Link>:<a className="host-entry-contact" href="tel:0912345678"><Phone size={14} aria-hidden="true"/>0912 345 678</a>}
  </div>
 </aside>;
}
