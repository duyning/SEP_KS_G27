import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Check,MapPin,RefreshCw} from 'lucide-react';
import {GOOGLE_MAPS_KEY,GOOGLE_MAPS_MAP_ID,loadGoogleMaps} from '../services/google-maps.js';
import {AREA_CENTERS,parsePropertyCoordinates} from '../services/property-registration.js';
import OpenStreetPropertyMap from './OpenStreetPropertyMap.jsx';

function GooglePropertyMap({commune,latitude,longitude,address,error,onSelect}) {
  const container=useRef();const instance=useRef();const marker=useRef();const select=useRef(onSelect);select.current=onSelect;
  const [state,setState]=useState({loading:true,error:''});const [revision,setRevision]=useState(0);
  const initial=useRef({commune,latitude,longitude});
  initial.current={commune,latitude,longitude};
  useLayoutEffect(()=>{
    let active=true,failed=false;let resize,map,pin;const listeners=[];const element=container.current;
    // Some SDK cleanup operations throw after auth failure or DOM detachment.
    // Release each resource independently; a map error must never unmount the form.
    const release=()=>{
      resize?.disconnect();resize=undefined;
      if(instance.current===map)instance.current=null;
      if(marker.current===pin)marker.current=null;
      for(const listener of listeners.splice(0)){try{listener.remove();}catch{/* SDK may already have disposed this listener. */}}
      if(pin){const old=pin;pin=undefined;try{old.map=null;}catch{/* A rejected map may have no internal root. */}}
      if(map){const old=map;map=undefined;try{old.unbindAll?.();}catch{/* The SDK may be only partially initialized. */}}
      element?.replaceChildren();
    };
    const fail=message=>{if(!active||failed)return;failed=true;release();setState({loading:false,error:message});};
    const authError=()=>fail('Bản đồ hiện không khả dụng. Bạn vẫn có thể nhập địa chỉ và tiếp tục đăng ký mà không cần ghim vị trí.');
    window.addEventListener('hlrcs:google-maps-auth-error',authError);
    setState({loading:true,error:''});
    loadGoogleMaps().then(async maps=>{
      const [{Map},{AdvancedMarkerElement}]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
      if(!active||failed)return;
      const value=initial.current;const center=parsePropertyCoordinates(value.latitude,value.longitude)||AREA_CENTERS[value.commune]||AREA_CENTERS['Tân Xã'];
      map=new Map(element,{center:{lat:center[0],lng:center[1]},zoom:15,mapId:GOOGLE_MAPS_MAP_ID,streetViewControl:false,mapTypeControl:false,gestureHandling:'cooperative'});
      if(!active||failed){release();return;}
      pin=new AdvancedMarkerElement({map,position:parsePropertyCoordinates(value.latitude,value.longitude)?{lat:center[0],lng:center[1]}:undefined,gmpDraggable:true,title:'Vị trí nhà trọ'});
      if(!active||failed){release();return;}
      instance.current=map;marker.current=pin;
      listeners.push(map.addListener('click',event=>{if(active&&!failed&&event.latLng)select.current(event.latLng.lat(),event.latLng.lng());}));
      const localPin=pin;
      const drag=()=>{if(!active||failed)return;const point=localPin.position;if(point)select.current(typeof point.lat==='function'?point.lat():point.lat,typeof point.lng==='function'?point.lng():point.lng);};
      localPin.addEventListener('gmp-dragend',drag);listeners.push({remove:()=>localPin.removeEventListener('gmp-dragend',drag)});
      resize=new ResizeObserver(()=>{if(!active||failed||!element?.isConnected)return;try{maps.event.trigger(map,'resize');}catch{authError();}});resize.observe(element);setState({loading:false,error:''});
    }).catch(()=>fail('Không tải được bản đồ. Bạn có thể bỏ qua vị trí ghim và tiếp tục nhập hồ sơ.'));
    // Layout cleanup runs while the SDK's host element is still attached.
    return()=>{active=false;window.removeEventListener('hlrcs:google-maps-auth-error',authError);release();};
  },[revision]);
  useEffect(()=>{
    if(!instance.current||!marker.current)return;
    try{
      const point=parsePropertyCoordinates(latitude,longitude);marker.current.position=point?{lat:point[0],lng:point[1]}:undefined;
      const center=point||AREA_CENTERS[commune];if(center)instance.current.panTo({lat:center[0],lng:center[1]});
    }catch{
      window.dispatchEvent(new Event('hlrcs:google-maps-auth-error'));
    }
  },[latitude,longitude,commune,state.loading]);
  const pinned=parsePropertyCoordinates(latitude,longitude);
  return <div className={`registration-map-shell ${error?'invalid':''}`}><header><strong><MapPin size={16}/>Google Maps</strong></header><div ref={container} id="property-location-map" className="registration-location-map" role="region" aria-label="Google Maps chọn vị trí nhà trọ"/>{state.loading&&<p className="registration-map-hint" role="status">Đang tải Google Maps...</p>}{state.error&&<div className="registration-map-error" role="alert">{state.error}<button type="button" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={14}/>Thử lại bản đồ</button></div>}<footer><span><MapPin size={14}/>{address||'Chưa nhập địa chỉ'}</span><span className={pinned?'pinned':''}>{pinned?<><Check size={14}/>Đã ghim tọa độ</>:'Chưa chọn vị trí'}</span></footer>{pinned&&<p className="registration-map-hint">{pinned[0].toFixed(6)}, {pinned[1].toFixed(6)}</p>}</div>;
}
export default function PropertyLocationMap(props) {
  if(!GOOGLE_MAPS_KEY)return <><p className="registration-notice" role="status">Google Maps chưa được cấu hình. Bản đồ OpenStreetMap vẫn khả dụng.</p><OpenStreetPropertyMap {...props}/></>;
  return <GooglePropertyMap {...props}/>;
}
