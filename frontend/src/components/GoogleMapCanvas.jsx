import { Component, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Focus, Map, Satellite } from 'lucide-react';
import { MotionButton } from './motion/MotionUI.jsx';
import GoogleRoomMap from './GoogleRoomMap.jsx';
import { loadGoogleMaps, GOOGLE_MAPS_KEY, GOOGLE_MAPS_MAP_ID } from '../services/google-maps.js';
import { MAP_PROVIDER } from '../services/map-provider.js';

export const googleMapsEnabled = MAP_PROVIDER === 'google';

function MapFallback({children}){
  return <><p className="accommodation-map-status" role="status">Google Maps chưa khả dụng. Đang dùng OpenStreetMap; thông tin bạn nhập được giữ nguyên.</p>{children}</>;
}
// SDK failures must remain local to the map, including errors raised in React effects.
class MapErrorBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<MapFallback>{this.props.fallback}</MapFallback>:this.props.children;}
}
export default function GoogleMapCanvas(props){
  return <MapErrorBoundary fallback={props.fallback}>
    {props.browse || props.onSelect
      ? <GoogleRoomMap {...props} fallback={<MapFallback>{props.fallback}</MapFallback>}/>
      : <GoogleMapRuntime {...props}/>}
  </MapErrorBoundary>;
}
// Google's cleanup can also throw after authorization failure. Attempt every release.
const release=action=>{try{action();}catch{/* A rejected SDK must not break unmount/fallback. */}};
const disposeMarker=item=>{item.listeners.forEach(listener=>release(()=>listener.remove()));release(()=>{item.marker.map=null;});};

// React owns the surrounding UI; Google alone owns the canvas and marker transforms.
function GoogleMapRuntime({ points=[], markers=[], onSelect, onMarkerSelect, selectedKey, focusRequest, focusPoint, label, fallback }) {
  const host=useRef(), runtime=useRef(), latest=useRef();
  latest.current={points,markers,onSelect,onMarkerSelect,selectedKey,focusPoint};
  const [ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[view,setView]=useState('roadmap'),[popup,setPopup]=useState(null);
  const markFailed=()=>{setFailed(true);setReady(false);setPopup(null);};
  const attempt=action=>{try{action();}catch{markFailed();}};
  const fit=()=>{
    const r=runtime.current;if(!r)return;
    const values=latest.current.points;
    attempt(()=>{
    if(values.length===1){r.map.setCenter({lat:values[0][0],lng:values[0][1]});r.map.setZoom(16);}
    else if(values.length){const bounds=new r.maps.LatLngBounds();values.forEach(p=>bounds.extend({lat:p[0],lng:p[1]}));r.map.fitBounds(bounds,80);}
    });
  };
  useEffect(()=>{
    if(failed)return;
    let active=true, observer, resize, timer, idle, click, auth;
    const fail=()=>{if(active)markFailed();};
    auth=fail;window.addEventListener('hlrcs:google-maps-auth-error',auth);
    (async()=>{
      try{
        const maps=await loadGoogleMaps();
        const [{Map:GoogleMap,InfoWindow},{AdvancedMarkerElement}]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
        if(!active)return;
        if(!host.current||!points.length){fail();return;}
        const map=new GoogleMap(host.current,{center:{lat:points[0][0],lng:points[0][1]},zoom:16,mapId:GOOGLE_MAPS_MAP_ID,mapTypeId:'roadmap',mapTypeControl:false,streetViewControl:false,fullscreenControl:true,zoomControl:true,gestureHandling:'cooperative',clickableIcons:true});
        runtime.current={map,maps,AdvancedMarkerElement,InfoWindow,items:new globalThis.Map()};
        fit();
        click=map.addListener('click',e=>attempt(()=>{if(e.latLng&&!e.placeId)latest.current.onSelect?.(e.latLng.lat(),e.latLng.lng());}));
        idle=map.addListener('tilesloaded',()=>{if(active){clearTimeout(timer);setLoaded(true);}});
        observer=new MutationObserver(()=>{if(host.current?.querySelector('.gm-err-container'))fail();});
        observer.observe(host.current,{childList:true,subtree:true});
        resize=new ResizeObserver(()=>{if(active)attempt(()=>maps.event.trigger(map,'resize'));});resize.observe(host.current);
        timer=setTimeout(fail,20000);
        setReady(true);
      }catch{fail();}
    })();
    return()=>{
      active=false;clearTimeout(timer);window.removeEventListener('hlrcs:google-maps-auth-error',auth);
      observer?.disconnect();resize?.disconnect();release(()=>idle?.remove());release(()=>click?.remove());
      const r=runtime.current;runtime.current=null;
      if(r){r.items.forEach(disposeMarker);release(()=>r.info?.close());release(()=>r.maps.event.clearInstanceListeners(r.map));}
    };
  },[failed]);
  const pointsKey=JSON.stringify(points);
  useEffect(()=>{if(ready)fit();},[ready,pointsKey]);
  useEffect(()=>{
    const r=runtime.current;if(!r||!ready||failed)return;
    attempt(()=>{
    const keys=new Set(markers.map(m=>m.id));
    r.items.forEach((item,key)=>{if(!keys.has(key)){disposeMarker(item);r.items.delete(key);}});
    for(const data of markers){
      let item=r.items.get(data.id);
      if(!item){
        const content=document.createElement('div');
        const marker=new r.AdvancedMarkerElement({map:r.map,position:{lat:data.point[0],lng:data.point[1]},title:data.title||'Vị trí nhà trọ',content,gmpClickable:true,gmpDraggable:Boolean(onSelect)});
        item={marker,content,listeners:[]};r.items.set(data.id,item);
        const click=()=>attempt(()=>{
          const current=latest.current.markers.find(m=>m.id===data.id);if(!current)return;
          latest.current.onMarkerSelect?.(current.id);
          if(current.popup){r.info?.close();const node=document.createElement('div');r.info=new r.InfoWindow({content:node,maxWidth:290});setPopup({node,content:current.popup});r.info.open({map:r.map,anchor:marker});}
        });
        const drag=()=>attempt(()=>{
          const position=marker.position;if(!position)return;
          const lat=typeof position.lat==='function'?position.lat():position.lat,lng=typeof position.lng==='function'?position.lng():position.lng;
          if(Number.isFinite(lat)&&Number.isFinite(lng))latest.current.onSelect?.(lat,lng);
        });
        marker.addEventListener('gmp-click',click);item.listeners.push({remove:()=>marker.removeEventListener('gmp-click',click)});
        marker.addEventListener('gmp-dragend',drag);item.listeners.push({remove:()=>marker.removeEventListener('gmp-dragend',drag)});
      }
      item.marker.position={lat:data.point[0],lng:data.point[1]};
      item.content.className=`nh-google-pin${data.price?' nh-google-price':''}${data.id===selectedKey?' is-selected':''}`;
      if(data.price)item.content.textContent=data.price;
      else item.content.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></svg>';
    }
    });
  },[ready,failed,markers,selectedKey,onSelect]);
  useEffect(()=>{const r=runtime.current,p=latest.current.focusPoint;if(r&&ready&&!failed&&focusRequest&&p)attempt(()=>{r.info?.close();r.map.setCenter({lat:p[0],lng:p[1]});r.map.setZoom(Math.max(15,r.map.getZoom()));});},[focusRequest,ready,failed]);
  if(failed)return <MapFallback>{fallback}</MapFallback>;
  return <div className="accommodation-map nh-google-map" role="region" aria-label={label||'Bản đồ Google Maps'}>
    <div className="nh-map-stage"><div ref={host} className="nh-google-canvas"/>
      <div className="nh-map-layers" aria-label="Lớp nền bản đồ">
        <MotionButton type="button" aria-pressed={view==='roadmap'} className={view==='roadmap'?'active':''} onClick={()=>attempt(()=>{runtime.current?.map.setMapTypeId('roadmap');setView('roadmap');})}><Map size={17}/>Bản đồ</MotionButton>
        <MotionButton type="button" aria-pressed={view==='hybrid'} className={view==='hybrid'?'active':''} onClick={()=>attempt(()=>{runtime.current?.map.setMapTypeId('hybrid');setView('hybrid');})}><Satellite size={17}/>Vệ tinh</MotionButton>
        <MotionButton type="button" aria-label="Xem vị trí các ghim" onClick={fit}><Focus size={17}/></MotionButton>
      </div>
      <div className="nh-map-hint">{onSelect?'Nhấn bản đồ hoặc kéo ghim để chọn vị trí':'Chạm ghim để xem phòng'} · Địa điểm xung quanh hiển thị theo mức thu phóng</div>
      {!loaded&&<div className="nh-map-loading" role="status">Đang kết nối Google Maps…</div>}
    </div>{popup&&createPortal(popup.content,popup.node)}
  </div>;
}
