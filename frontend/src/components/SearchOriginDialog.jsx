import { useState } from 'react';
import { MapCanvas, LocationMarker } from './AccommodationMap.jsx';
import { Modal } from './PortalUI.jsx';
import { FPT_ORIGIN, MAX_RADIUS_KM, parseSearchOrigin } from '../services/search-origin.js';

export default function SearchOriginDialog({ origin, radiusKm, onApply, onClose }) {
  const [latitude, setLatitude] = useState(String(origin?.originLat ?? ''));
  const [longitude, setLongitude] = useState(String(origin?.originLng ?? ''));
  const [radius, setRadius] = useState(String(radiusKm ?? ''));
  const [error, setError] = useState('');
  const parsed = parseSearchOrigin(latitude, longitude);
  const point = parsed ? [parsed.originLat, parsed.originLng] : null;

  function select(lat, lng) {
    setLatitude(String(Number(lat.toFixed(7))));
    setLongitude(String(Number(lng.toFixed(7))));
    setError('');
  }

  function submit(event) {
    event.preventDefault();
    if (!parsed) {
      setError('Nhập đủ vĩ độ từ -90 đến 90 và kinh độ từ -180 đến 180.');
      return;
    }
    const km = radius.trim() ? Number(radius) : null;
    if (km !== null && (!Number.isFinite(km) || km <= 0 || km > MAX_RADIUS_KM)) {
      setError('Bán kính phải lớn hơn 0 và tối đa 50 km.');
      return;
    }
    onApply(parsed, km);
  }

  return <Modal title="Chọn địa điểm tính khoảng cách" maxWidth="720px" onClose={onClose}>
    <form className="location-search-form" onSubmit={submit}>
      <p>Chọn địa điểm bạn quan tâm trên bản đồ để xem mỗi phòng cách đó bao nhiêu km. Bạn có thể kéo ghim hoặc nhập tọa độ; thêm bán kính nếu muốn giới hạn khu vực tìm kiếm.</p>
      <MapCanvas label="Bản đồ chọn địa điểm tính khoảng cách" onSelect={select} nearbyPoint={null}
        points={[point || [FPT_ORIGIN.originLat, FPT_ORIGIN.originLng]]}
        markers={point ? [{ id: 'search-origin', point, title: 'Địa điểm tính khoảng cách' }] : []}>
        <LocationMarker point={point} onSelect={select} title="Địa điểm tính khoảng cách" hint="Kéo ghim để đổi địa điểm tính khoảng cách." />
      </MapCanvas>
      <div className="location-search-fields">
        <label>Vĩ độ<input inputMode="decimal" required value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
        <label>Kinh độ<input inputMode="decimal" required value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
        <label>Bán kính (km)<input type="number" step="any" max={MAX_RADIUS_KM} placeholder="Không giới hạn"
          value={radius} onChange={event => setRadius(event.target.value)} /></label>
      </div>
      {error && <p className="portal-form-alert" role="alert">{error}</p>}
      <div className="location-search-actions">
        <button type="button" className="p-button" onClick={onClose}>Hủy</button>
        <button type="submit" className="p-button primary">Áp dụng địa điểm</button>
      </div>
    </form>
  </Modal>;
}
