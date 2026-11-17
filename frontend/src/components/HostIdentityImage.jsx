import {useEffect,useState} from 'react';
import {hostApplicationApi} from '../services/host-applications.js';
export default function HostIdentityImage({id,present,backPresent=false,side}){
 if(side)return <IdentitySide id={id} present={present} side={side}/>;
 return <div className="host-identity-pair"><section><strong>Mặt trước CCCD</strong><IdentitySide id={id} present={present} side="front"/></section>{backPresent&&<section><strong>Mặt sau CCCD</strong><IdentitySide id={id} present side="back"/></section>}</div>;
}
function IdentitySide({id,present,side}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!present)return;const controller=new AbortController();let objectUrl='';setError('');setUrl('');
  hostApplicationApi.identityImage(id,controller.signal,side).then(blob=>{if(!controller.signal.aborted){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[id,present,side,revision]);
 if(!present)return <p>Hồ sơ này chưa có ảnh định danh</p>;
 if(error)return <div role="alert"><p>{error}</p><button type="button" onClick={()=>setRevision(value=>value+1)}>Tải lại ảnh</button></div>;
 return url?<img className="host-identity-image" src={url} alt={`Ảnh ${side==='back'?'mặt sau':'mặt trước'} CCCD trong hồ sơ`}/>:<p role="status">Đang tải ảnh định danh…</p>;
}
