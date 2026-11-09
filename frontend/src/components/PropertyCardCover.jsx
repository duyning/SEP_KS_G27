import { useEffect, useState } from 'react';
import { House, ShieldCheck } from 'lucide-react';
import { hostApi } from '../services/host.js';

export default function PropertyCardCover({property}){
 const id=property.photos[0]?.documentId;const [image,setImage]=useState('');
 useEffect(()=>{
  setImage('');if(!id)return;const controller=new AbortController();let url;
  hostApi.propertyPhoto(id,controller.signal).then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setImage(url);}}).catch(()=>{});
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[id]);
 return <div className="hp-card-cover">{image?<img src={image} alt={`Ảnh nhà trọ ${property.name}`} onError={()=>setImage('')}/>:<div className="hp-card-placeholder"><House size={30}/><span>{id?'Ảnh nhà trọ chưa tải được':'Chưa có ảnh nhà trọ'}</span></div>}{property.verified&&<span className="hp-verified"><ShieldCheck size={12}/>Đã xác minh</span>}</div>;
}
