import { googleMapsEnabled } from './GoogleMapCanvas.jsx';
import { Check, MapPin } from 'lucide-react';
import { AREA_CENTERS, parsePropertyCoordinates } from '../services/property-registration.js';
import { MapCanvas, LocationMarker } from './AccommodationMap.jsx';

export default function OpenStreetPropertyMap({ commune, latitude, longitude, address, error, onSelect, hideCoordinates=false }) {
  const point = parsePropertyCoordinates(latitude, longitude);
  return <div className={`registration-map-shell ${error ? 'invalid' : ''}`}>
    <header><strong><MapPin size={16}/>{googleMapsEnabled?"Bản đồ vị trí nhà trọ":"OpenStreetMap"}</strong></header>
    <MapCanvas onSelect={onSelect} markers={point?[{id:"property",point,title:"Vị trí nhà trọ"}]:[]} nearbyPoint={point} points={[point || AREA_CENTERS[commune] || AREA_CENTERS['Tân Xã']]} label="Bản đồ chọn vị trí nhà trọ">
      <LocationMarker point={point} onSelect={onSelect}/>
    </MapCanvas>
    <footer><span><MapPin size={14}/>{address || 'Chưa nhập địa chỉ nhà trọ'}</span><span className={point ? 'pinned' : ''}>{point ? <><Check size={14}/>Đã ghim tọa độ</> : 'Chưa chọn vị trí'}</span></footer>
    <p className="registration-map-hint">{point ? hideCoordinates?'Đã ghim vị trí nhà trọ.':`Tọa độ: ${point[0].toFixed(6)}, ${point[1].toFixed(6)}.` : 'Chưa có vị trí ghim.'} Nhấn vào bản đồ hoặc kéo ghim để chọn vị trí thực tế. {!hideCoordinates&&'Bạn cũng có thể nhập tọa độ thủ công.'}</p>
    {error && <p className="registration-map-error" role="alert">{error}</p>}
  </div>;
}
