import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import {MapPin} from 'lucide-react';
import {verificationLocation} from '../services/verification-detail.js';
import 'leaflet/dist/leaflet.css';

function ReadOnlyMap({coordinates}){
 const container=useRef();const [failed,setFailed]=useState(false);
 const [latitude,longitude]=coordinates;
 useEffect(()=>{
  setFailed(false);const map=L.map(container.current,{scrollWheelZoom:false,minZoom:3,maxZoom:19}).setView([latitude,longitude],16);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(map);
  const pin=L.circleMarker([latitude,longitude],{radius:9,color:'#fff',weight:3,fillColor:'#0d9488',fillOpacity:1}).addTo(map);
  pin.bindTooltip('Vị trí chủ trọ đã gửi');
  tiles.on('tileerror',()=>setFailed(true));tiles.on('tileload',()=>setFailed(false));
  const resize=new ResizeObserver(()=>map.invalidateSize({pan:false}));resize.observe(container.current);
  return()=>{resize.disconnect();tiles.off();map.remove();};
 },[latitude,longitude]);
 return <><div ref={container} className="svd-map" role="region" aria-label="Bản đồ vị trí nhà trọ chỉ xem"/>{failed&&<p className="svd-map-note">Chưa tải được nền bản đồ. Tọa độ ghim vẫn là tọa độ chủ trọ đã gửi; bạn có thể mở Google Maps để đối chiếu.</p>}</>;
}
export default function VerificationLocationMap({summary,submission}){
 const {coordinates,address,mapsUrl}=verificationLocation(summary,submission);
 return <section className="svd-location"><header><MapPin size={18}/><div><h4>Vị trí nhà trọ &amp; Bản đồ định vị</h4><p>Đối chiếu vị trí chủ trọ đã ghim · Chế độ chỉ xem</p></div></header>
  <div className="svd-location-actions"><span className={`svd-coordinate-status ${coordinates?'present':''}`}>{coordinates?'Đã có tọa độ định vị':'Chưa có tọa độ định vị'}</span>{mapsUrl&&<a className="svd-small-button" href={mapsUrl} target="_blank" rel="noopener noreferrer">Mở trên Google Maps ↗</a>}</div>
  <dl className="svd-address"><div><dt>Địa chỉ đầy đủ:</dt><dd>{address||'Chưa cung cấp địa chỉ'}</dd></div>{submission?.nearby&&<div><dt>Địa điểm lân cận:</dt><dd>{submission.nearby}</dd></div>}</dl>
  {coordinates?<ReadOnlyMap coordinates={coordinates}/>:<div className="svd-map-empty"><MapPin size={30}/><strong>Chưa có dữ liệu tọa độ định vị từ chủ trọ</strong><p>Hồ sơ chưa có tọa độ hợp lệ. Staff có thể yêu cầu bổ sung vị trí để đối chiếu chính xác.</p></div>}
  {coordinates&&<p className="svd-map-note">Tọa độ: {coordinates[0]}, {coordinates[1]} · Staff không chỉnh sửa vị trí trong hồ sơ.</p>}
 </section>;
}
