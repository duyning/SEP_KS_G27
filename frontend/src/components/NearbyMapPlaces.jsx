import L from 'leaflet';
import {useEffect,useRef,useState} from 'react';
import {Marker,Popup} from 'react-leaflet';
import {MapPin,X} from 'lucide-react';
import {MotionButton} from './motion/MotionUI.jsx';
import {nearbyPlaces} from '../services/property-location.js';
import {directionsUrl} from '../services/map-location.js';

const stopMapEvents=element=>{if(element){L.DomEvent.disableClickPropagation(element);L.DomEvent.disableScrollPropagation(element);}};
const labels={fast_food:'Ăn nhanh',library:'Thư viện',driver_training:'Đào tạo lái xe',school:'Trường học',university:'Đại học',college:'Cao đẳng',pharmacy:'Nhà thuốc',hospital:'Bệnh viện',clinic:'Phòng khám',marketplace:'Chợ',restaurant:'Ăn uống',cafe:'Cà phê',supermarket:'Siêu thị',convenience:'Cửa hàng',bus_stop:'Điểm xe buýt',bank:'Ngân hàng',atm:'ATM'};
const symbols={
 education:{color:'#2563eb',paths:'<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 11v6c4 3 8 3 12 0v-6M22 9v8"/>'},
 health:{color:'#db2777',paths:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>'},
 food:{color:'#ea580c',paths:'<path d="M4 3v6c0 4 6 4 6 0V3M7 3v18M18 3c-4 3-4 9 0 10h2V3h-2ZM20 13v8"/>'},
 cafe:{color:'#b45309',paths:'<path d="M3 7h13v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V7ZM16 8h2a3 3 0 0 1 0 6h-2M6 2v2M10 2v2M14 2v2"/>'},
 shop:{color:'#7c3aed',paths:'<path d="M4 7h16l1 14H3L4 7ZM8 7V5a4 4 0 0 1 8 0v2"/>'},
 transport:{color:'#0891b2',paths:'<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 11h16M7 19v3M17 19v3M8 15h1M15 15h1"/>'},
 bank:{color:'#475569',paths:'<path d="m3 8 9-5 9 5H3ZM3 21h18M6 10v8M12 10v8M18 10v8"/>'},
 place:{color:'#0f766e',paths:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2"/>'}
};
const categoryGroup=type=>['school','university','college','library','driver_training'].includes(type)?'education':['pharmacy','hospital','clinic'].includes(type)?'health':['restaurant','fast_food','food_court'].includes(type)?'food':type==='cafe'?'cafe':['marketplace','supermarket','convenience','mall','bakery'].includes(type)?'shop':type==='bus_stop'?'transport':['bank','atm'].includes(type)?'bank':'place';
const poiIcons=new Map();
function placeIcon(category){const group=categoryGroup(category);if(!poiIcons.has(group)){const symbol=symbols[group];poiIcons.set(group,L.divIcon({className:'nh-poi-marker',html:`<span data-category="${group}" style="color:${symbol.color}"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbol.paths}</svg></span>`,iconSize:[29,29],iconAnchor:[14,14],popupAnchor:[0,-15]}));}return poiIcons.get(group);}
export default function NearbyMapPlaces({point}){
  const key=point?.join(',')||'';
  const [visible,setVisible]=useState(false),[state,setState]=useState({key:'',data:null,loading:false,error:''});
  const request=useRef();
  useEffect(()=>{request.current?.abort();setVisible(false);setState({key,data:null,loading:false,error:''});const timer=point?setTimeout(()=>void load(false),650):null;return()=>{clearTimeout(timer);request.current?.abort();};},[key]);
  async function load(open=true){
    if(!point)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    if(open)setVisible(true);setState({key,data:null,loading:true,error:''});
    try{const data=await nearbyPlaces(point[0],point[1],controller.signal);if(!controller.signal.aborted)setState({key,data,loading:false,error:''});}
    catch(error){if(!controller.signal.aborted)setState({key,data:null,loading:false,error:error.message});}
  }
  const data=state.key===key?state.data:null;
  return <>
    <div className="nh-nearby-control" ref={stopMapEvents}><MotionButton type="button" className={visible?'active':''} disabled={!point} aria-expanded={visible} aria-label="Tiện ích quanh ghim nhà trọ" onClick={event=>{event.stopPropagation();if(visible)setVisible(false);else if(data)setVisible(true);else void load();}}><MapPin size={16}/>Tiện ích</MotionButton></div>
    {!visible&&state.loading&&<span className="nh-nearby-auto-status" role="status">Đang tải địa điểm quanh ghim…</span>}
    {!visible&&state.error&&<span className="nh-nearby-auto-status" role="status">Chưa tải được địa điểm · mở Tiện ích để thử lại</span>}
    {visible&&<div className="nh-nearby-panel" ref={stopMapEvents} onClick={event=>event.stopPropagation()} onDoubleClick={event=>event.stopPropagation()} onPointerDown={event=>event.stopPropagation()} onWheel={event=>event.stopPropagation()}>
      <header><strong>Quanh ghim · bán kính 1,5 km</strong><MotionButton type="button" aria-label="Đóng tiện ích lân cận" onClick={()=>setVisible(false)}><X size={16}/></MotionButton></header>
      {state.loading?<p role="status">Đang tìm địa điểm trên OSM…</p>:state.error?<div role="alert"><p>{state.error}</p><MotionButton type="button" onClick={()=>load(true)}>Thử lại tiện ích</MotionButton></div>:data?.places.length?<ul>{data.places.map(place=><li key={place.id}><strong>{place.name}</strong><span>{labels[place.category]||'Địa điểm'} · {place.distanceMeters} m</span><a href={directionsUrl(place.latitude,place.longitude)} target="_blank" rel="noopener noreferrer">Chỉ đường</a></li>)}</ul>:<p>OSM chưa có địa điểm phù hợp trong khu vực này.</p>}
      <footer>© OpenStreetMap contributors · Khoảng cách đường chim bay, không phải quãng đường di chuyển.</footer>
    </div>}
    {data?.places.map(place=><Marker key={place.id} position={[place.latitude,place.longitude]} icon={placeIcon(place.category)} title={place.name} alt={`${labels[place.category]||'Địa điểm'}: ${place.name}`}><Popup><strong>{place.name}</strong><p>{labels[place.category]||'Địa điểm'} · khoảng {place.distanceMeters} m đường chim bay</p><a href={directionsUrl(place.latitude,place.longitude)} target="_blank" rel="noopener noreferrer">Chỉ đường</a></Popup></Marker>)}
  </>;
}
