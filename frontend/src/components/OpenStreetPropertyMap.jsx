import { useState } from 'react';
import { MAP_PROVIDER } from '../services/map-provider.js';
import { AlertCircle, Check, Crosshair, LoaderCircle, MapPin, RefreshCw } from 'lucide-react';
import { AREA_CENTERS, parsePropertyCoordinates } from '../services/property-registration.js';
import { MapCanvas, LocationMarker } from './AccommodationMap.jsx';

export default function OpenStreetPropertyMap({
  commune,
  latitude,
  longitude,
  address,
  error,
  onSelect,
  hideCoordinates = false
}) {
  const point = parsePropertyCoordinates(latitude, longitude);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [mapKey, setMapKey] = useState(0);

  function locateCurrentPosition() {
    if (locating) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Trình duyệt hiện tại không hỗ trợ định vị GPS. Bạn hãy chọn trực tiếp trên bản đồ.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords?.latitude;
        const lng = pos.coords?.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          onSelect(lat, lng);
        } else {
          setGeoError('Không đọc được tọa độ hợp lệ từ thiết bị.');
        }
      },
      (err) => {
        setLocating(false);
        if (err?.code === 1) {
          setGeoError('Bạn chưa cấp quyền vị trí. Hãy nhấn trực tiếp lên bản đồ hoặc nhập địa chỉ.');
        } else {
          setGeoError('Không thể xác định vị trí hiện tại. Vui lòng thử lại hoặc đặt ghim thủ công.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  return (
    <div className={`registration-map-shell ${error ? 'invalid' : ''}`}>
      <header className="prw-map-toolbar">
        <strong>
          <MapPin size={16} aria-hidden="true" />
          <span>{MAP_PROVIDER === 'osm' ? 'Bản đồ tương tác OpenStreetMap' : 'Bản đồ vị trí nhà trọ'}</span>
        </strong>
        <div className="prw-map-toolbar-actions">
          <button
            type="button"
            className="prw-map-tool-btn"
            disabled={locating}
            onClick={locateCurrentPosition}
          >
            {locating ? (
              <LoaderCircle size={14} className="spin" aria-hidden="true" />
            ) : (
              <Crosshair size={14} aria-hidden="true" />
            )}
            <span>{locating ? 'Đang định vị…' : 'Vị trí hiện tại'}</span>
          </button>
          <button
            type="button"
            className="prw-map-tool-btn subtle"
            title="Tải lại khung bản đồ"
            onClick={() => {
              setGeoError('');
              setMapKey((k) => k + 1);
            }}
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      <MapCanvas
        key={mapKey}
        onSelect={onSelect}
        markers={point ? [{ id: 'property', point, title: 'Vị trí nhà trọ' }] : []}
        nearbyPoint={point}
        points={[point || AREA_CENTERS[commune] || AREA_CENTERS['Tân Xã']]}
        label="Bản đồ chọn vị trí nhà trọ"
      >
        <LocationMarker point={point} onSelect={onSelect} />
      </MapCanvas>

      <footer>
        <span>
          <MapPin size={14} aria-hidden="true" />
          {address || 'Chưa nhập địa chỉ nhà trọ'}
        </span>
        <span className={point ? 'pinned' : ''}>
          {point ? (
            <>
              <Check size={14} aria-hidden="true" />
              Đã ghim vị trí
            </>
          ) : (
            'Chưa chọn vị trí'
          )}
        </span>
      </footer>

      <p className="registration-map-hint">
        {point
          ? hideCoordinates
            ? 'Đã ghim vị trí nhà trọ.'
            : `Tọa độ đã lưu: ${point[0].toFixed(6)}, ${point[1].toFixed(6)}.`
          : 'Chưa có vị trí ghim.'}{' '}
        Nhấn vào bản đồ hoặc kéo ghim để đặt đúng cổng nhà trọ.{' '}
        {!hideCoordinates && 'Bạn cũng có thể nhập tọa độ thủ công bên dưới.'}
      </p>

      {geoError && (
        <p className="registration-map-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {geoError}
        </p>
      )}
      {error && (
        <p className="registration-map-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
