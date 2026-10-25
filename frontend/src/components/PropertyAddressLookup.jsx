import {useEffect,useRef,useState} from 'react';
import {LoaderCircle,MapPin,Search} from 'lucide-react';
import {GOOGLE_MAPS_KEY,geocodeLocation} from '../services/google-maps.js';
import {locationFromGoogle,parseLocationInput} from '../services/location-lookup.js';

export default function PropertyAddressLookup({onApply,locationKey}) {
  const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [results,setResults]=useState([]);const [message,setMessage]=useState('');
  const version=useRef(0);
  useEffect(()=>()=>{version.current++;},[]);
  useEffect(()=>{version.current++;setBusy(false);setResults([]);},[locationKey]);
  const apply=result=>{
    try{const location=locationFromGoogle(result);onApply(location);setResults([]);setMessage([location.approximate?'Google trả về vị trí gần đúng. Hãy kiểm tra và kéo ghim đúng cửa nhà trọ.':'Đã điền địa chỉ và đặt ghim. Hãy kiểm tra lại vị trí nhà trọ.',!location.commune?'Chưa xác định được khu vực trong danh sách. Vui lòng chọn khu vực phù hợp.':''].filter(Boolean).join(' '));}
    catch(cause){setError(cause.message);}
  };
  const search=async text=>{
    const request=++version.current;setError('');setResults([]);setMessage('');
    if(!GOOGLE_MAPS_KEY){setError('Chưa cấu hình Google Maps để tìm địa chỉ tự động. Bạn vẫn có thể nhập địa chỉ và ghim trên bản đồ bên dưới.');return;}
    setBusy(true);
    try{const query=parseLocationInput(text);const response=await geocodeLocation(query);if(version.current!==request)return;const data=query.location?response.map(result=>({...result,geometry:{...result.geometry,location:query.location}})):response;if(data.length===1)apply(data[0]);else setResults(data.slice(0,5));}
    catch(cause){if(version.current===request)setError(cause.message);}
    finally{if(version.current===request)setBusy(false);}
  };
  const change=value=>{version.current++;setBusy(false);setQuery(value);setResults([]);setError('');setMessage('');};
  return <section className="registration-address-lookup"><label htmlFor="property-pasted-address">Địa chỉ / Liên kết Google Maps</label><div className="registration-lookup-input"><textarea id="property-pasted-address" rows={2} maxLength={1500} value={query} placeholder="Dán địa chỉ từ Zalo hoặc liên kết Google Maps..." onChange={event=>change(event.target.value)} onPaste={event=>{const text=event.clipboardData.getData('text');if(text){event.preventDefault();change(text);if(GOOGLE_MAPS_KEY)void search(text);}}}/><button className="p-button primary" type="button" disabled={busy||!query.trim()} onClick={()=>search(query)}>{busy?<LoaderCircle className="spin" size={16}/>:<Search size={16}/>}Tìm vị trí</button></div>{results.length>0&&<ul className="registration-address-results" aria-label="Địa chỉ tìm thấy">{results.map((result,index)=><li key={result.place_id||index}><button type="button" onClick={()=>apply(result)}><MapPin size={16}/>{result.formatted_address}</button></li>)}</ul>}{busy&&<p role="status">Đang tìm địa chỉ...</p>}{error&&<p className="registration-error" role="alert">{error}</p>}{message&&<p className="registration-notice" role="status">{message}</p>}</section>;
}
