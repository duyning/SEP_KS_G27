import {useEffect,useRef,useState} from 'react';
import {Image as ImageIcon,Play,RefreshCw} from 'lucide-react';
import {messagingApi} from '../../services/messaging.js';
import {Modal} from '../PortalUI.jsx';

export function LocalMessageFile({file}){
 const [url,setUrl]=useState('');
 useEffect(()=>{const url=URL.createObjectURL(file);setUrl(url);return()=>URL.revokeObjectURL(url);},[file]);
 return file.type==='video/mp4'?<video src={url} muted preload="metadata" aria-label={file.name}/>:<img src={url} alt={file.name}/>;
}
export default function MessageAttachment({conversationId,file,onResize}){
 const root=useRef(null),[enabled,setEnabled]=useState(false),[state,setState]=useState({}),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false);
 const video=file.type==='VIDEO';
 useEffect(()=>{
  if(video)return;
  if(!window.IntersectionObserver){setEnabled(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setEnabled(true);observer.disconnect();}});
  observer.observe(root.current);return()=>observer.disconnect();
 },[video]);
 useEffect(()=>{
  if(!enabled)return;const c=new AbortController();let url;
  setState({loading:true});
  messagingApi.attachment(conversationId,file.id,c.signal).then(blob=>{if(!c.signal.aborted){url=URL.createObjectURL(blob);setState({url});}}).catch(error=>{if(!c.signal.aborted)setState({error:error.message});});
  return()=>{c.abort();if(url)URL.revokeObjectURL(url);};
 },[enabled,conversationId,file.id,retry]);
 return <div className={`msg-attachment${video?' is-video':''}`} ref={root}>
  {!state.url&&<button type="button" aria-label={`${state.error?'Tải lại':video?'Xem video':'Tải ảnh'}: ${file.fileName}`} onClick={()=>{setEnabled(true);setRetry(v=>v+1);}} disabled={state.loading}>
   {state.error?<RefreshCw size={20}/>:video?<Play size={24}/>:<ImageIcon size={24}/>}<span>{state.loading?'Đang tải…':state.error?'Không tải được tệp. Thử lại':video?'Xem video':file.fileName}</span>
  </button>}
  {state.url&&(video?<video src={state.url} controls playsInline preload="metadata" onLoadedMetadata={onResize} aria-label={file.fileName}/>:<button type="button" className="msg-image-open" aria-label={`Xem ảnh: ${file.fileName}`} onClick={()=>setExpanded(true)}><img src={state.url} alt={file.fileName} onLoad={onResize}/></button>)}
  {expanded&&state.url&&<Modal title="Ảnh trong hội thoại" onClose={()=>setExpanded(false)} className="msg-photo-modal"><img src={state.url} alt={file.fileName}/></Modal>}
 </div>;
}
