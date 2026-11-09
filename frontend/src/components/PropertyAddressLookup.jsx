import {useEffect,useRef,useState} from 'react';
import {parseLocationInput} from '../services/location-lookup.js';
import {lookupPropertyLocation} from '../services/property-location.js';
import {MotionButton} from './motion/MotionUI.jsx';
import {roomCoordinates} from '../services/map-location.js';

export default function PropertyAddressLookup({onApply,resolveDetails=false,coordinates,disabled=false,locationKey=''}) {
  const [query,setQuery]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const pending=useRef();const applyRef=useRef(onApply);applyRef.current=onApply;
  useEffect(()=>{pending.current?.abort();setBusy(false);},[locationKey,disabled]);
  useEffect(()=>()=>pending.current?.abort(),[]);
  async function apply(input) {
    pending.current?.abort();const controller=new AbortController();pending.current=controller;
    setError('');setMessage('');setBusy(true);
    try {
      let data;
      if(resolveDetails)data=await lookupPropertyLocation(input,controller.signal);
      else{const parsed=parseLocationInput(input);if(!parsed.location)throw new Error('Nội dung chưa chứa tọa độ cụ thể. Hãy nhập địa chỉ bên dưới rồi chọn vị trí trên bản đồ, hoặc dán cặp vĩ độ, kinh độ.');data={latitude:String(parsed.location.lat),longitude:String(parsed.location.lng)};}
      if(controller.signal.aborted)return;
      applyRef.current(data);
      setMessage(resolveDetails?['Đã đặt ghim và điền các gợi ý tìm được. Hãy kiểm tra số nhà, khu vực và địa điểm lân cận trước khi lưu.',...(data.warnings||[])].join(' '):'Đã đặt ghim theo tọa độ được dán. Hãy kiểm tra lại vị trí nhà trọ.');
    }catch(cause){if(!controller.signal.aborted)setError(cause.message);}
    finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
  }
  return <section className="registration-address-lookup"><label htmlFor="property-pasted-address">{resolveDetails?'Dán liên kết Google Maps hoặc tọa độ':'Dán tọa độ hoặc liên kết có tọa độ'}</label><div className="registration-lookup-input"><input type="text" id="property-pasted-address" autoComplete="off" maxLength={1500} disabled={disabled} value={query} placeholder={resolveDetails?'Dán link Google Maps, kể cả link rút gọn':'Dán tọa độ hoặc liên kết Google Maps đầy đủ'} onChange={event=>{pending.current?.abort();setBusy(false);setQuery(event.target.value);setError('');setMessage('');}}/><MotionButton className="p-button primary" type="button" disabled={disabled||busy||!query.trim()} onClick={()=>apply(query)}>{busy?'Đang lấy vị trí…':resolveDetails?'Đặt ghim & điền thông tin':'Đặt ghim'}</MotionButton></div>{resolveDetails&&<div className="registration-location-actions"><MotionButton className="p-button" type="button" disabled={disabled||busy||!roomCoordinates(coordinates)} onClick={()=>apply([coordinates.latitude,coordinates.longitude].join(','))}>Điền thông tin từ ghim hiện tại</MotionButton><small>Gợi ý từ OpenStreetMap · Chỉ các trường được phép chỉnh sửa mới được điền.</small></div>}{error&&<p className="registration-error" role="alert">{error}</p>}{message&&<p className="registration-notice" role="status">{message}</p>}</section>;
}
