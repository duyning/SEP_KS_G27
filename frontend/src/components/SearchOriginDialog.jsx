import { useState } from 'react';
import { MapCanvas, LocationMarker } from './AccommodationMap.jsx';
import { Modal } from './PortalUI.jsx';
import { FPT_ORIGIN, MAX_RADIUS_KM, parseSearchOrigin } from '../services/search-origin.js';

export default function SearchOriginDialog({ origin, radiusKm, onApply, onClose }) {
  const [selectedOrigin, setSelectedOrigin] = useState(origin);
  const [radius, setRadius] = useState(String(radiusKm ?? ''));
  const [error, setError] = useState('');
  const point = selectedOrigin ? [selectedOrigin.originLat, selectedOrigin.originLng] : null;

  function select(lat, lng) {
    setSelectedOrigin(parseSearchOrigin(lat.toFixed(7), lng.toFixed(7)));
    setError('');
  }

  function submit(event) {
    event.preventDefault();
    if (!selectedOrigin) {
      setError('Chọn một vị trí trên bản đồ.');
      return;
    }
    const km = radius.trim() ? Number(radius) : null;
    if (km !== null && (!Number.isFinite(km) || km <= 0 || km > MAX_RADIUS_KM)) {
      setError('Bán kính phải lớn hơn 0 và tối đa 50 km.');
      return;
    }
    onApply(selectedOrigin, km);
  }

  return <Modal title="Tìm quanh địa điểm" onClose={onClose} className="search-location-dialog">
    <form className="location-search-form" onSubmit={submit}>
      <div className="location-search-body">
        <p>Nhấn bản đồ hoặc kéo ghim để chọn địa điểm.</p>
        <MapCanvas label="Bản đồ chọn địa điểm tính khoảng cách" onSelect={select} nearbyPoint={null}
          legend="Ghim địa điểm tìm phòng"
          points={[point || [FPT_ORIGIN.originLat, FPT_ORIGIN.originLng]]}
          markers={point ? [{ id: 'search-origin', point, title: 'Địa điểm tính khoảng cách' }] : []}>
          <LocationMarker point={point} onSelect={select} title="Địa điểm tính khoảng cách" hint="Kéo ghim để đổi địa điểm tính khoảng cách." />
        </MapCanvas>
        <label>Bán kính (km)<input type="number" step="any" max={MAX_RADIUS_KM} placeholder="Không giới hạn"
          value={radius} onChange={event => setRadius(event.target.value)} /></label>
        {error && <p className="portal-form-alert" role="alert">{error}</p>}
      </div>
      <div className="location-search-actions">
        <button type="button" className="p-button" onClick={onClose}>Hủy</button>
        <button type="submit" className="p-button primary">Áp dụng địa điểm</button>
      </div>
    </form>
  </Modal>;
}
