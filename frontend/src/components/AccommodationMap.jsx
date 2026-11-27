import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEARCH_CAMPUSES, availabilityWarning, formatDistance, searchCampusForOrigin, withSearchOrigin } from '../services/search-origin.js';
import '../styles/location-search.css';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { MapPin, ArrowUpRight, Building2, Check, GraduationCap, Expand, Minimize, Focus, Map as MapIcon, Satellite, Plus, Minus, Tags } from 'lucide-react';
import NearbyMapPlaces from './NearbyMapPlaces.jsx';
import GoogleMapCanvas, { googleMapsEnabled } from './GoogleMapCanvas.jsx';
import { Effects } from '@animate-ui/react/primitives/effects/effect';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import { MotionButton, AnimatePresence } from './motion/MotionUI.jsx';
import { motion, useIsPresent } from 'motion/react';
import { AREA_CENTERS } from '../services/property-registration.js';
import { roomCoordinates, directionsUrl, accommodationDetailUrl } from '../services/map-location.js';
import 'leaflet/dist/leaflet.css';
import '../styles/accommodation-map.css';

const icon = L.divIcon({className:'nh-map-marker',html:'<span class="nh-map-pin"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></svg></span>',iconSize:[38,46],iconAnchor:[19,44],popupAnchor:[0,-42]});
export const propertyMarkerIcon=icon;
const streetUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const streetAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  + (import.meta.env.VITE_MAP_TILE_ATTRIBUTION ? ` | ${import.meta.env.VITE_MAP_TILE_ATTRIBUTION}` : '');
// A configured, licensed imagery provider is required; a public URL alone does not grant usage rights.
const satelliteUrl = import.meta.env.VITE_MAP_SATELLITE_URL;
const satelliteAttribution = import.meta.env.VITE_MAP_SATELLITE_ATTRIBUTION;
const satelliteAvailable = Boolean(satelliteUrl && satelliteAttribution);
const labelsUrl = import.meta.env.VITE_MAP_LABELS_URL;
const labelsAttribution = import.meta.env.VITE_MAP_LABELS_ATTRIBUTION || '';

function focusPoints(map, points) {
  if (points.length === 1) map.setView(points[0], 16, { animate: false });
  else if (points.length > 1) map.fitBounds(points, { paddingTopLeft: [32, 145], paddingBottomRight: [85, 45], maxZoom: 16, animate: false });
  else map.setView(AREA_CENTERS['Tân Xã'], 14, { animate: false });
}
function priceIcon(rooms, selected=false) {
  const price = Math.min(...rooms.map(room => room.price));
  const text = new Intl.NumberFormat('vi-VN', {maximumFractionDigits:1}).format(price / 1000000);
  return L.divIcon({className:`nh-map-price-marker${selected?' is-selected':''}`,html:`<span>${rooms.length>1?'Từ ':''}${text} tr<span class="nh-map-price-unit">/tháng</span></span>`,iconSize:[108,38],iconAnchor:[54,42],popupAnchor:[0,-40]});
}

function landmarkIcon(label, selected) {
  const content = document.createElement('span');
  content.className = `nh-map-landmark-label${selected ? ' is-selected' : ''}`;
  content.textContent = label;
  return L.divIcon({
    className: 'nh-map-landmark-marker', html: content, iconSize: [54, 30], iconAnchor: [27, 34], popupAnchor: [0, -31],
  });
}

const radiusStyle = { color: '#6d348c', fillColor: '#a777c7', fillOpacity: 0.13, weight: 2, opacity: 0.75 };

function Viewport({ points }) {
  const map = useMap();
  const key = JSON.stringify(points);
  const latestPoints=useRef(points);latestPoints.current=points;
  useEffect(() => {
    focusPoints(map, points);
  }, [map, key]); // Key tracks values, avoiding viewport resets on unrelated renders.
  useEffect(() => {
    const observer = new ResizeObserver(() => { map.invalidateSize({ pan: false }); focusPoints(map, latestPoints.current); });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function LocationMarker({ point, onSelect, title = 'Vị trí nhà trọ', hint = 'Kéo ghim để điều chỉnh vị trí nhà trọ.' }) {
  useMapEvents({ click(event) {
    const value = event.latlng.wrap();
    onSelect(value.lat, value.lng);
  } });
  return point && <Marker position={point} icon={icon} draggable title={title} alt={title}
    eventHandlers={{ dragend(event) { const value = event.target.getLatLng().wrap(); onSelect(value.lat, value.lng); } }}>
    <Popup>{hint}</Popup>
  </Marker>;
}

function MapExpandIcon({expanded}) {
  const {transition,scale,blur}=useMotionTokens();const reduce=useShouldReduceMotion();
  return <span className="nh-map-tool-icon"><AnimatePresence initial={false} mode="popLayout"><motion.span key={expanded?'collapse':'expand'} initial={{opacity:0,scale:reduce?1:scale.icon,filter:blur.icon}} animate={{opacity:1,scale:1,filter:'blur(0px)',transition:transition.swap}} exit={{opacity:0,scale:reduce?1:scale.icon,filter:blur.icon,transition:transition.swap}}>{expanded?<Minimize size={20}/>:<Expand size={20}/>}</motion.span></AnimatePresence></span>;
}

function MapTools({points,expanded,onExpand}) {
  const map=useMap(),reduce=useShouldReduceMotion();
  return <div className="nh-map-actions" ref={element=>{if(element)L.DomEvent.disableClickPropagation(element);}}>
    <MotionButton type="button" title="Xem vị trí các ghim" aria-label="Xem vị trí các ghim" onClick={()=>focusPoints(map,points)}><Focus size={20}/></MotionButton>
    <MotionButton type="button" title={expanded?'Thu gọn bản đồ':'Mở rộng bản đồ'} aria-label={expanded?'Thu gọn bản đồ':'Mở rộng bản đồ'} onClick={onExpand}><MapExpandIcon expanded={expanded}/></MotionButton>
    <div className="nh-map-zoom"><MotionButton type="button" aria-label="Phóng to bản đồ" onClick={()=>map.zoomIn(1,{animate:!reduce})}><Plus size={22}/></MotionButton><MotionButton type="button" aria-label="Thu nhỏ bản đồ" onClick={()=>map.zoomOut(1,{animate:!reduce})}><Minus size={22}/></MotionButton></div>
  </div>;
}

export function MapCanvas(props) {
  if(googleMapsEnabled && !props.osmOnly)return <GoogleMapCanvas {...props} fallback={<LeafletMapCanvas {...props}/>}/>;
  return <LeafletMapCanvas {...props}/>;
}

function LeafletMapCanvas({ points, children, label = 'Bản đồ vị trí nhà trọ', nearbyPoint, radiusArea, legend }) {
  const [state,setState]=useState('loading');
  const [view,setView]=useState(satelliteAvailable&&import.meta.env.VITE_MAP_DEFAULT_VIEW!=='street'?'satellite':'street');
  const [showLabels,setShowLabels]=useState(true),[expanded,setExpanded]=useState(false),[revision,setRevision]=useState(0);
  const timer=useRef();const failures=useRef(false);const shell=useRef();const expandButton=useRef();
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{
    if(!expanded)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const close=event=>{
      if(event.key==='Escape'){setExpanded(false);expandButton.current?.focus();}
      if(event.key==='Tab'){
        const controls=[...shell.current.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(element=>element.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',close);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',close);};
  },[expanded]);
  function loading(){clearTimeout(timer.current);failures.current=false;setState('loading');timer.current=setTimeout(()=>setState('error'),15000);}
  const events={loading,load:()=>{clearTimeout(timer.current);setState(failures.current?'error':'ready');},tileerror:()=>{failures.current=true;clearTimeout(timer.current);setState('error');}};
  const url=view==='satellite'?satelliteUrl:streetUrl;
  return <div ref={shell} className={`accommodation-map${expanded?' accommodation-map-expanded':''}`} role="region" aria-label={label}>
    <div className="nh-map-stage">
      <MapContainer center={AREA_CENTERS['Tân Xã']} zoom={14} minZoom={3} maxZoom={19} scrollWheelZoom={false} zoomControl={false}>
        <TileLayer key={`${view}-${revision}`} url={url} attribution={view==='satellite'?satelliteAttribution:streetAttribution} maxZoom={19} keepBuffer={1} eventHandlers={events}/>
        {view==='satellite'&&showLabels&&labelsUrl&&<TileLayer key={`labels-${revision}`} url={labelsUrl} attribution={labelsAttribution} maxZoom={19} keepBuffer={1} zIndex={2}/>}
        <Viewport points={points}/>
        {radiusArea&&<Circle center={radiusArea.center} radius={radiusArea.meters} pathOptions={radiusStyle} interactive={false}/>}
        {children}<NearbyMapPlaces point={nearbyPoint===undefined?points[0]:nearbyPoint}/>
        <MapTools points={points} expanded={expanded} onExpand={()=>{expandButton.current=document.activeElement;setExpanded(value=>!value);}}/>
      </MapContainer>
      <div className={`nh-map-layers${!satelliteAvailable?' nh-map-layers-street':''}`} aria-label="Lớp nền bản đồ">
        <MotionButton type="button" aria-pressed={view==='street'} className={view==='street'?'active':''} onClick={()=>{if(view!=='street'){setView('street');setState('loading');}}}><MapIcon size={17}/>Bản đồ</MotionButton>
        {satelliteAvailable&&<MotionButton type="button" aria-pressed={view==='satellite'} className={view==='satellite'?'active':''} disabled={!satelliteAvailable} title={satelliteAvailable?'Xem ảnh vệ tinh':'Ảnh vệ tinh chưa khả dụng'} onClick={()=>{if(view!=='satellite'){setView('satellite');setState('loading');}}}><Satellite size={17}/>Vệ tinh</MotionButton>}
        {view==='satellite'&&labelsUrl&&<MotionButton type="button" aria-pressed={showLabels} title="Tên đường và địa điểm" onClick={()=>setShowLabels(value=>!value)}><Tags size={17}/><span>Nhãn</span></MotionButton>}
      </div>
      <div className="nh-map-hint">{legend ?? <><span className="nh-map-legend-pin"/>Vị trí nhà trọ <span>· Chạm ghim để xem thông tin</span></>}</div>
      {state==='loading'&&<div className="nh-map-loading" role="status">Đang tải bản đồ…</div>}
    </div>
    {state==='error'&&<div className="accommodation-map-status" role="status"><span>Chưa tải được đầy đủ nền bản đồ.</span><div><MotionButton type="button" onClick={()=>{loading();setRevision(value=>value+1);}}>Thử lại</MotionButton>{view==='satellite'&&<MotionButton type="button" onClick={()=>{setView('street');setState('loading');}}>Dùng bản đồ đường phố</MotionButton>}</div></div>}
  </div>;
}

export function RoomLocationMap({ room }) {
  const point = roomCoordinates(room);
  if (!point) return <p className="accommodation-map-empty">Nhà trọ chưa cập nhật vị trí ghim trên bản đồ.</p>;
  return <><MapCanvas points={[point]} markers={[{id:"property",point,title:room.propertyName,popup:<div>{room.address}</div>}]}><Marker position={point} icon={icon} title={room.propertyName}><Popup>{room.address}</Popup></Marker></MapCanvas>
    <a className="accommodation-map-directions" href={directionsUrl(...point)} target="_blank" rel="noopener noreferrer">Chỉ đường</a></>;
}

function SelectedRoomFocus({room,request}) {
  const map=useMap();
  useEffect(()=>{
    if(!request||!room)return;
    // Card selection positions the map immediately; Leaflet owns marker popup panning.
    map.closePopup();
    map.setView(roomCoordinates(room),Math.max(map.getZoom(),15),{animate:false});
  },[map,request]);
  return null;
}

function RoomMapPhoto({room}) {
  const [failed,setFailed]=useState(false);
  if(!room.imageUrl||failed)return <span className="nh-room-photo-placeholder"><Building2 size={25}/></span>;
  return <img src={room.imageUrl} alt="" loading="lazy" onError={()=>setFailed(true)}/>;
}

function SelectedRoomSummary({room,origin}) {
  const {spring,transition,shift,blur}=useMotionTokens();
  const reduce=useShouldReduceMotion(),present=useIsPresent();
  return <motion.div className="nh-map-selection" inert={!present||undefined} aria-hidden={!present||undefined} initial={{opacity:0,y:reduce?0:shift.step,filter:blur.surface}} animate={{opacity:1,y:0,filter:'blur(0px)',transition:spring.pop}} exit={{opacity:0,y:reduce?0:shift.handoff,filter:blur.surface,transition:transition.dismiss}}><span className="nh-map-selection-icon"><MapPin size={20}/></span><div><small>ĐANG XEM VỊ TRÍ</small><strong>{room.propertyName} – {room.roomTypeName}</strong></div><Link to={withSearchOrigin(accommodationDetailUrl(room),origin)}>Chi tiết phòng<ArrowUpRight size={17}/></Link></motion.div>;
}

const money = new Intl.NumberFormat('vi-VN');
const mapPrice = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

function RoomMapPopup({ group, origin, distanceLabel }) {
  return <div className="accommodation-map-popup">
    {group.map(room => <article key={room.roomTypeId}>
      {room.imageUrl&&<img src={room.imageUrl} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/>}
      <strong>{room.propertyName} – {room.roomTypeName}</strong>
      <p>{money.format(room.price)} đ/tháng</p>
      <p>{room.address}</p>
      {origin&&<p>{distanceLabel}: {formatDistance(room.distanceKm)}</p>}
      {room.availabilityStale===true&&<p className="accommodation-freshness">{availabilityWarning}</p>}
      <Link to={withSearchOrigin(accommodationDetailUrl(room),origin)}>Xem chi tiết phòng</Link>
    </article>)}
  </div>;
}

export default function RoomsMap({ rooms, origin, radiusKm, loading, error, retry, onCampusSelect, onOpenFilters }) {
  const [selectedId,setSelectedId]=useState(null);
  const [focusRequest,setFocusRequest]=useState(0);
  const {spring,shift,stagger,scale,blur}=useMotionTokens();
  const located=rooms.filter(roomCoordinates);
  const selected=located.find(room=>room.roomTypeId===selectedId);
  const groups=new Map();
  for(const room of located){const key=roomCoordinates(room).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(room);}
  const activeCampus = searchCampusForOrigin(origin);
  const originPoint = origin && [origin.originLat, origin.originLng];
  const radiusArea = originPoint && radiusKm ? { center: originPoint, meters: radiusKm * 1000 } : null;
  const distanceLabel = activeCampus ? `Cách ${activeCampus.name}` : 'Khoảng cách';
  const landmarks = SEARCH_CAMPUSES.map(school => {
    const active = school.id === activeCampus?.id;
    return {
      id: school.id, point: [school.origin.originLat, school.origin.originLng],
      title: school.name, landmarkLabel: school.mapLabel, active,
      popup: <div className="nh-map-landmark-popup">
        <strong>{school.name}</strong>
        <p>{school.site}</p>
        {active ? <span>Đang dùng làm mốc tìm phòng</span>
          : <button type="button" onClick={()=>onCampusSelect(school)}>Tìm phòng quanh trường này</button>}
      </div>,
    };
  });
  if(originPoint && !activeCampus)landmarks.push({
    id: 'search-origin', point: originPoint, title: 'Ghim đã chọn', landmarkLabel: 'Mốc tìm', active: true,
  });
  const roomMarkers = [...groups.entries()].map(([id, group]) => ({
    id, group, point: roomCoordinates(group[0]), title: group[0].propertyName,
    price: mapPrice.format(Math.min(...group.map(room=>room.price))/1000000)+' tr/tháng',
    popup: <RoomMapPopup group={group} origin={origin} distanceLabel={distanceLabel}/>,
  }));
  const markers = [...landmarks, ...roomMarkers];
  const bounds = radiusArea && L.latLng(radiusArea.center).toBounds(radiusArea.meters * 2);
  const points = bounds
    ? [bounds.getSouthWest(), bounds.getNorthEast()].map(({ lat, lng }) => [lat, lng])
    : markers.map(marker => marker.point);
  const selectRoomMarker = id => {
    const room = groups.get(id)?.[0];
    if(room)setSelectedId(room.roomTypeId);
  };
  const legend = <><span className="nh-map-campus-legend"><GraduationCap size={15} aria-hidden="true"/>Trường</span><span className="nh-map-room-legend"><span className="nh-map-legend-pin"/>Nhà trọ</span></>;
  return <section className="nh-map-explorer" aria-label="Khám phá phòng trên bản đồ">
    <header className="nh-map-explorer-heading">
      <div><h3>{activeCampus ? `Phòng trọ quanh ${activeCampus.name}` : 'Bản đồ nhà trọ Hòa Lạc'}</h3>
        <p>{radiusKm ? `Bán kính ${formatDistance(radiusKm)} theo đường thẳng` : 'Chọn ghim trường để tìm phòng gần trường.'}</p></div>
      {!loading&&!error&&located.length>0&&<span className="nh-map-total"><Building2 size={17}/>{new Set(located.map(room=>room.propertyId)).size} nhà trọ <span>· {located.length} loại phòng trên trang</span></span>}
    </header>
    <div className="nh-map-workspace">
      <aside className="nh-map-room-panel" aria-label="Phòng có vị trí trên trang này"><div className="nh-map-panel-heading"><strong>Phòng trên bản đồ</strong><span>Chọn thẻ để định vị</span></div>
        {!located.length && <div className="nh-map-panel-status" role={error ? 'alert' : 'status'}>
          <strong>{loading ? 'Đang tìm phòng trọ…' : error ? 'Không thể tải danh sách nhà trọ' : rooms.length ? 'Phòng chưa có vị trí trên bản đồ' : 'Không tìm thấy phòng trọ phù hợp'}</strong>
          {!loading&&<p>{error || (rooms.length ? 'Bạn vẫn có thể xem các phòng này ở chế độ danh sách.' : 'Thử nới bán kính hoặc bỏ bớt tiêu chí lọc.')}</p>}
          {error&&<button type="button" className="p-button" onClick={retry}>Thử tải phòng lại</button>}
          {!loading&&!error&&!rooms.length&&<button type="button" className="p-button" onClick={onOpenFilters}>Chỉnh bộ lọc</button>}
        </div>}
        {located.length>0&&<div className="nh-map-room-list"><Effects asChild fade slide={{offset:shift.step}} zoom={{initialScale:scale.menu}} blur={{initialBlur:parseFloat(blur.surface.replace('blur(',''))}} holdDelay={stagger.stack*1000} transition={spring.entrance}>
          {located.map(room=><article key={room.roomTypeId} className={`nh-map-room-card${selectedId===room.roomTypeId?' selected':''}`}>
            <MotionButton type="button" className="nh-map-room-choice" tapScale={scale.choice} aria-pressed={selectedId===room.roomTypeId} aria-label={`Xem vị trí ${room.propertyName} – ${room.roomTypeName}`} onClick={()=>{setSelectedId(room.roomTypeId);setFocusRequest(value=>value+1);}}>
              <span className="nh-map-room-photo"><RoomMapPhoto room={room}/>{selectedId===room.roomTypeId&&<span className="nh-map-chosen"><Check size={13}/></span>}</span>
              <span className="nh-map-room-copy"><span className="nh-map-card-title">{room.propertyName}</span><span className="nh-map-card-type">{room.roomTypeName}</span><span className="nh-map-card-address"><MapPin size={12}/>{room.address||'Chưa cập nhật địa chỉ'}</span>{origin&&<span>{distanceLabel}: {formatDistance(room.distanceKm)}</span>}{room.availabilityStale===true&&<span className="accommodation-freshness">{availabilityWarning}</span>}<span className="nh-map-card-price">{money.format(room.price)} đ <small>/tháng</small></span></span>
            </MotionButton>
          </article>)}
        </Effects></div>}
        {rooms.length>0&&<footer className="nh-map-panel-footer"><span className="nh-map-legend-pin"/>{located.length}/{rooms.length} loại phòng có tọa độ trên trang này</footer>}
      </aside>
      <div className="nh-map-explorer-canvas"><MapCanvas points={points} nearbyPoint={roomCoordinates(selected??located[0])}
        label="Bản đồ trường học và nhà trọ Hòa Lạc" markers={markers} radiusArea={radiusArea} legend={legend}
        selectedKey={selected?roomCoordinates(selected).join(','):null} onMarkerSelect={selectRoomMarker} focusRequest={focusRequest} focusPoint={selected?roomCoordinates(selected):null}>
        <SelectedRoomFocus room={selected} request={focusRequest}/>
        {landmarks.map(({ id, point, title, landmarkLabel, active, popup })=><Marker key={id} position={point}
          icon={landmarkIcon(landmarkLabel,active)} title={title} alt={title} zIndexOffset={active?700:500}>
          {popup&&<Popup maxWidth={265} autoPanPaddingTopLeft={[12,112]}>{popup}</Popup>}
        </Marker>)}
        {roomMarkers.map(({ id, point, title, group, popup })=><Marker key={id} position={point} icon={priceIcon(group,group.some(room=>room.roomTypeId===selectedId))} title={title} eventHandlers={{click:()=>selectRoomMarker(id)}}>
          <Popup maxHeight={190} autoPanPaddingTopLeft={[12,112]}>{popup}</Popup>
        </Marker>)}
      </MapCanvas></div>
    </div>
    <div className="nh-map-selection-slot" aria-live="polite"><AnimatePresence initial={false} mode="wait">{selected&&<SelectedRoomSummary key={selected.roomTypeId} room={selected} origin={origin}/>}</AnimatePresence></div>
  </section>;
}
