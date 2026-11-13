import UIButton from './common/Button.jsx';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Check, MapPin, RefreshCw } from 'lucide-react';
import { AREA_CENTERS, parsePropertyCoordinates } from '../services/property-registration.js';
import 'leaflet/dist/leaflet.css';

const icon = L.icon({ iconUrl: markerIcon, iconRetinaUrl: markerIconRetina, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

export default function OpenStreetPropertyMap({ commune, latitude, longitude, address, error, onSelect }) {
  const container = useRef();
  const map = useRef();
  const marker = useRef();
  const tiles = useRef();
  const select = useRef(onSelect);
  select.current = onSelect;
  const [tileState, setTileState] = useState('loading');
  const coordinates = parsePropertyCoordinates(latitude, longitude);
  useEffect(() => {
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false, minZoom: 3, maxZoom: 19 }).setView(AREA_CENTERS[commune] || AREA_CENTERS['Tân Xã'], 14);
    L.control.zoom({ zoomInTitle: 'Phóng to', zoomOutTitle: 'Thu nhỏ' }).addTo(instance);
    map.current = instance;
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });
    let loaded = false;
    let timeout;
    layer.on('loading', () => {
      loaded = false;
      setTileState('loading');
      clearTimeout(timeout);
      timeout = setTimeout(() => { if (!loaded) setTileState('error'); }, 15000);
    });
    layer.on('tileload', () => { loaded = true; clearTimeout(timeout); setTileState('ready'); });
    layer.on('tileerror', () => { if (!loaded) setTileState('error'); });
    layer.addTo(instance);
    tiles.current = layer;
    instance.on('click', event => { const point = event.latlng.wrap(); select.current(point.lat, point.lng); });
    const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => { clearTimeout(timeout); resize.disconnect(); layer.off(); instance.remove(); map.current = null; marker.current = null; tiles.current = null; };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (!coordinates) {
      marker.current?.remove();
      marker.current = null;
      instance.setView(AREA_CENTERS[commune] || AREA_CENTERS['Tân Xã'], 14, { animate: false });
      return;
    }
    if (!marker.current) {
      const pin = L.marker(coordinates, { icon, draggable: true, title: 'Vị trí nhà trọ', alt: 'Ghim vị trí nhà trọ' }).addTo(instance);
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = 'Vị trí nhà trọ';
      const hint = document.createElement('div');
      hint.textContent = 'Kéo ghim để tinh chỉnh vị trí chính xác.';
      popup.append(title, hint);
      pin.bindPopup(popup);
      pin.on('dragend', () => { const point = pin.getLatLng().wrap(); select.current(point.lat, point.lng); });
      marker.current = pin;
    }
    marker.current.setLatLng(coordinates);
    instance.panTo(coordinates, { animate: false });
  }, [latitude, longitude, commune]);
  const quickPin = area => { const [lat, lng] = AREA_CENTERS[area]; onSelect(lat, lng, area); };
  return <div className={`registration-map-shell ${error ? 'invalid' : ''}`}>
    <header><strong><MapPin size={16} />Bản đồ tương tác Hòa Lạc</strong><div className="registration-quick-pins"><span>Ghim nhanh:</span>{Object.keys(AREA_CENTERS).map(area => <UIButton type="button" key={area} title={`Ghim tại trung tâm tham khảo ${area}; cần chỉnh lại vị trí thực tế`} onClick={() => quickPin(area)}>{area.startsWith('Khu ') ? 'Khu CNC' : area}</UIButton>)}</div></header>
    <div ref={container} id="property-location-map" className="registration-location-map" role="region" aria-label="Bản đồ chọn vị trí nhà trọ" aria-invalid={Boolean(error)} aria-describedby={error ? 'location-error' : 'location-hint'} tabIndex={0} />
    {tileState === 'error' && <div className="registration-map-error" role="status"><span>Không tải được nền bản đồ. Bạn có thể nhập tọa độ bên dưới.</span><UIButton type="button" onClick={() => { setTileState('loading'); tiles.current?.redraw(); }}><RefreshCw size={14} />Thử lại</UIButton></div>}
    <footer><span><MapPin size={14} />{address || 'Chưa nhập địa chỉ nhà trọ'}</span><span className={coordinates ? 'pinned' : ''}>{coordinates ? <><Check size={14} />Đã ghim tọa độ</> : 'Chưa chọn vị trí'}</span></footer>
    <p id="location-hint" className="registration-map-hint">{coordinates ? `Tọa độ: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}.` : 'Bấm trên bản đồ hoặc nhập tọa độ để đặt ghim.'} Ghim nhanh dùng vị trí trung tâm tham khảo; hãy chỉnh lại đúng nhà trọ.</p>
  </div>;
}
