import UIButton from './common/Button.jsx';
import {useEffect,useRef,useState} from 'react';
import {Check,MapPin,RefreshCw} from 'lucide-react';
import {GOOGLE_MAPS_KEY,GOOGLE_MAPS_MAP_ID,loadGoogleMaps} from '../services/google-maps.js';
import {AREA_CENTERS,parsePropertyCoordinates} from '../services/property-registration.js';
import OpenStreetPropertyMap from './OpenStreetPropertyMap.jsx';

function GooglePropertyMap({commune,latitude,longitude,address,error,onSelect}) {
  const container=useRef();const instance=useRef();const marker=useRef();const select=useRef(onSelect);select.current=onSelect;
  const [state,setState]=useState({loading:true,error:''});const [revision,setRevision]=useState(0);
  const initial=useRef({commune,latitude,longitude});
  useEffect(()=>{
    let active=true;let resize;const listeners=[];const element=container.current;
    const authError=()=>{if(active)setState({loading:false,error:'Google Maps chưa được cấp quyền. Vui lòng kiểm tra API key và giới hạn website.'});};
    window.addEventListener('hlrcs:google-maps-auth-error',authError);
    setState({loading:true,error:''});
    loadGoogleMaps().then(async maps=>{
      const [{Map},{AdvancedMarkerElement}]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
      if(!active)return;
      const value=initial.current;const center=parsePropertyCoordinates(value.latitude,value.longitude)||AREA_CENTERS[value.commune]||AREA_CENTERS['Tân Xã'];
      const map=new Map(element,{center:{lat:center[0],lng:center[1]},zoom:15,mapId:GOOGLE_MAPS_MAP_ID,streetViewControl:false,mapTypeControl:false,gestureHandling:'cooperative'});
      const pin=new AdvancedMarkerElement({map,position:parsePropertyCoordinates(value.latitude,value.longitude)?{lat:center[0],lng:center[1]}:undefined,gmpDraggable:true,title:'Vị trí nhà trọ'});
      instance.current=map;marker.current=pin;
      listeners.push(map.addListener('click',event=>{if(event.latLng)select.current(event.latLng.lat(),event.latLng.lng());}));
      const drag=()=>{const point=pin.position;if(point)select.current(typeof point.lat==='function'?point.lat():point.lat,typeof point.lng==='function'?point.lng():point.lng);};
      pin.addEventListener('gmp-dragend',drag);listeners.push({remove:()=>pin.removeEventListener('gmp-dragend',drag)});
      resize=new ResizeObserver(()=>maps.event.trigger(map,'resize'));resize.observe(element);setState({loading:false,error:''});
    }).catch(cause=>{if(active)setState({loading:false,error:cause.message});});
    return()=>{active=false;window.removeEventListener('hlrcs:google-maps-auth-error',authError);resize?.disconnect();listeners.forEach(listener=>listener.remove());if(marker.current)marker.current.map=null;instance.current=null;marker.current=null;element?.replaceChildren();};
  },[revision]);
  useEffect(()=>{
    if(!instance.current||!marker.current)return;
    const point=parsePropertyCoordinates(latitude,longitude);marker.current.position=point?{lat:point[0],lng:point[1]}:undefined;
    const center=point||AREA_CENTERS[commune];if(center)instance.current.panTo({lat:center[0],lng:center[1]});
  },[latitude,longitude,commune,state.loading]);
  const pinned=parsePropertyCoordinates(latitude,longitude);
  return <div className={`registration-map-shell ${error?'invalid':''}`}><header><strong><MapPin size={16}/>Google Maps</strong></header><div ref={container} id="property-location-map" className="registration-location-map" role="region" aria-label="Google Maps chọn vị trí nhà trọ"/>{state.loading&&<p className="registration-map-hint" role="status">Đang tải Google Maps...</p>}{state.error&&<div className="registration-map-error" role="alert">{state.error}<UIButton type="button" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Thử lại bản đồ</UIButton></div>}<footer><span><MapPin size={14}/>{address||'Chưa nhập địa chỉ'}</span><span className={pinned?'pinned':''}>{pinned?<><Check size={14}/>Đã ghim tọa độ</>:'Chưa chọn vị trí'}</span></footer>{pinned&&<p className="registration-map-hint">{pinned[0].toFixed(6)}, {pinned[1].toFixed(6)}</p>}</div>;
}
export default function PropertyLocationMap(props) {
  if(!GOOGLE_MAPS_KEY)return <><p className="registration-notice" role="status">Google Maps chưa được cấu hình. Bản đồ OpenStreetMap vẫn khả dụng.</p><OpenStreetPropertyMap {...props}/></>;
  return <GooglePropertyMap {...props}/>;
}
