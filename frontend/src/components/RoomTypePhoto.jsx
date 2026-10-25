import { useEffect, useState } from 'react';
import { ImageOff, LoaderCircle } from 'lucide-react';
import { hostApi } from '../services/host.js';

export default function RoomTypePhoto({ typeId, image, className='rt-thumbnail' }) {
  const [state,setState]=useState({url:'',loading:true});
  useEffect(()=>{
    const controller=new AbortController();let url;
    setState({url:'',loading:true});
    hostApi.roomTypeImage(typeId,image.imageId,controller.signal).then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setState({url,loading:false});}}).catch(()=>{if(!controller.signal.aborted)setState({url:'',loading:false});});
    return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
  },[typeId,image.imageId]);
  return state.url?<img className={className} src={state.url} alt={image.fileName||'Ảnh loại phòng'} onError={()=>setState({url:'',loading:false})}/>:<span className={`${className} rt-no-image`} aria-label={state.loading?'Đang tải ảnh':'Không tải được ảnh'}>{state.loading?<LoaderCircle size={20} className="spin"/>:<ImageOff size={20}/>}</span>;
}
