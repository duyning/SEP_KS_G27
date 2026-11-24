import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import GoogleMapReact from 'google-map-react';
import { Expand, Focus, Map as MapIcon, Minimize, Satellite, X } from 'lucide-react';
import { MotionButton } from './motion/MotionUI.jsx';
import { GOOGLE_MAPS_MAP_ID, loadGoogleMaps } from '../services/google-maps.js';

const mapOptions = {
  clickableIcons: true,
  fullscreenControl: false,
  gestureHandling: 'cooperative',
  mapTypeControl: false,
  maxZoom: 19,
  streetViewControl: false,
  styles: [],
  zoomControl: true,
};
const markerLayerStyle = { pointerEvents: 'none' };
const latLng = ([lat, lng]) => ({ lat, lng });
const pickerOptions = { ...mapOptions, styles: undefined, mapId: GOOGLE_MAPS_MAP_ID };

async function loadMapSdk(pickingLocation) {
  const maps = await loadGoogleMaps();
  const [, , markers] = await Promise.all([
    maps.importLibrary('core'),
    maps.importLibrary('maps'),
    pickingLocation ? maps.importLibrary('marker') : null,
  ]);
  return { maps, AdvancedMarkerElement: markers?.AdvancedMarkerElement };
}

function useGoogleLocationPicker({ api, ready, AdvancedMarkerElement, position, onSelect, onError }) {
  const marker = useRef(null);
  const current = useRef(null);
  current.current = { onSelect, position };
  const picking = typeof onSelect === 'function';
  const [latitude, longitude] = position ?? [];
  const hasPosition = latitude != null && longitude != null;

  function select(point) {
    if (!point) return;
    const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
    const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) current.current.onSelect?.(lat, lng);
  }

  useEffect(() => {
    if (!ready || !picking) return;
    try {
      const listener = api.map.addListener('click', event => {
        if (!event.placeId) select(event.latLng);
      });
      return () => {
        try { listener.remove(); } catch { /* Google may already have cleared it. */ }
      };
    } catch {
      onError();
    }
  }, [api, onError, picking, ready]);

  useEffect(() => {
    if (!ready || !picking || !hasPosition) return;
    let pin;
    const onDragEnd = () => select(pin.position);
    try {
      pin = new AdvancedMarkerElement({
        map: api.map,
        position: latLng(current.current.position),
        title: 'Vị trí nhà trọ',
        gmpDraggable: true,
      });
      pin.addEventListener('gmp-dragend', onDragEnd);
      marker.current = pin;
    } catch {
      onError();
    }
    return () => {
      marker.current = null;
      if (!pin) return;
      try { pin.removeEventListener('gmp-dragend', onDragEnd); } catch { /* Map may have been released. */ }
      try { pin.map = null; } catch { /* Map may have been released. */ }
    };
  }, [AdvancedMarkerElement, api, hasPosition, onError, picking, ready]);

  useEffect(() => {
    if (!ready || !hasPosition || !marker.current) return;
    try {
      marker.current.position = { lat: latitude, lng: longitude };
    } catch {
      onError();
    }
  }, [hasPosition, latitude, longitude, onError, ready]);
}

function PricePin({ marker, selected, onChoose }) {
  return (
    <button
      type="button"
      className={`nh-google-pin nh-google-price nh-google-react-pin${selected ? ' is-selected' : ''}`}
      aria-label={`Xem ${marker.title}, ${marker.price}`}
      aria-pressed={Boolean(selected)}
      onClick={event => {
        event.stopPropagation();
        onChoose(marker, event.currentTarget);
      }}
    >
      {marker.price}
    </button>
  );
}

// google-map-react 2.2.5 disposes its overlay during StrictMode's development
// remount without resetting its initialization flag. Keep that widget in its own root.
function GoogleMapHost({ children, onError }) {
  const host = useRef(null);
  const widget = useRef(null);

  useEffect(() => {
    const mount = document.createElement('div');
    mount.className = 'nh-google-react-mount';
    host.current.append(mount);
    const root = createRoot(mount, { onUncaughtError: onError });
    widget.current = root;
    return () => {
      widget.current = null;
      mount.remove();
      queueMicrotask(() => root.unmount());
    };
  }, [onError]);

  useEffect(() => { widget.current?.render(children); }, [children]);
  return <div ref={host} className="nh-google-react-mount" />;
}

export default function GoogleRoomMap({
  points,
  markers,
  selectedKey,
  onMarkerSelect,
  onSelect,
  focusPoint,
  focusRequest,
  label,
  fallback,
}) {
  const host = useRef(null);
  const stage = useRef(null);
  const popupRef = useRef(null);
  const trigger = useRef(null);
  const [initialCenter] = useState(() => latLng(points[0]));
  const [sdk, setSdk] = useState(null);
  const [api, setApi] = useState(null);
  const [tilesReady, setTilesReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const markFailed = useCallback(() => setFailed(true), []);
  const [view, setView] = useState('roadmap');
  const [popupKey, setPopupKey] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const pickingLocation = typeof onSelect === 'function';
  const ready = Boolean(api && tilesReady && !failed);
  const popup = markers.find(marker => marker.id === popupKey);
  const pointsKey = JSON.stringify(points);

  useGoogleLocationPicker({
    api,
    ready,
    AdvancedMarkerElement: sdk?.AdvancedMarkerElement,
    position: pickingLocation ? markers[0]?.point : null,
    onSelect,
    onError: markFailed,
  });

  useEffect(() => {
    let active = true;
    loadMapSdk(pickingLocation).then(value => {
      if (active) setSdk(value);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [pickingLocation]);

  useEffect(() => {
    if (failed) return;
    const fail = () => setFailed(true);
    const canvas = host.current;
    const observer = new MutationObserver(() => {
      if (canvas.querySelector('.gm-err-container')) fail();
    });
    observer.observe(canvas, { childList: true, subtree: true });
    window.addEventListener('hlrcs:google-maps-auth-error', fail);
    return () => {
      observer.disconnect();
      window.removeEventListener('hlrcs:google-maps-auth-error', fail);
    };
  }, [failed]);

  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timeout);
  }, [ready, failed]);

  function fit() {
    if (!api || !points.length) return;
    try {
      const { map, maps } = api;
      if (points.length === 1) {
        map.setCenter(latLng(points[0]));
        map.setZoom(16);
        return;
      }
      const bounds = new maps.LatLngBounds();
      for (const point of points) bounds.extend(latLng(point));
      map.fitBounds(bounds, { top: 88, right: 60, bottom: 64, left: 60 });
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => { fit(); }, [api, pointsKey]);

  useEffect(() => {
    if (!api || !focusRequest || !focusPoint) return;
    setPopupKey(null);
    try {
      api.map.setCenter(latLng(focusPoint));
      api.map.setZoom(Math.max(15, api.map.getZoom() ?? 15));
    } catch {
      setFailed(true);
    }
  }, [api, focusRequest]);

  useEffect(() => {
    if (popup) popupRef.current?.focus({ preventScroll: true });
  }, [popup?.id]);

  useEffect(() => {
    const update = () => setFullScreen(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  async function toggleFullScreen() {
    try {
      if (fullScreen) await document.exitFullscreen();
      else await stage.current.requestFullscreen();
    } catch {
      // The browser may decline fullscreen while the map stays usable.
    }
  }

  function changeLayer(layer) {
    if (!api) return;
    try {
      api.map.setMapTypeId(layer);
      setView(layer);
    } catch {
      setFailed(true);
    }
  }

  function chooseMarker(marker, element) {
    trigger.current = element;
    onMarkerSelect?.(marker.id);
    setPopupKey(marker.id);
  }

  function closePopup() {
    setPopupKey(null);
    trigger.current?.focus({ preventScroll: true });
  }

  if (failed) return fallback;
  return (
    <div className="accommodation-map nh-google-map" role="region" aria-label={label || 'Bản đồ nhà trọ Google Maps'}>
      <div className="nh-map-stage" ref={stage}>
        <div className="nh-google-canvas" ref={host}>
          {sdk && <GoogleMapHost onError={markFailed}><GoogleMapReact
            googleMapLoader={() => Promise.resolve(sdk.maps)}
            defaultCenter={initialCenter}
            defaultZoom={16}
            options={pickingLocation ? pickerOptions : mapOptions}
            overlayViewDivStyle={markerLayerStyle}
            yesIWantToUseGoogleMapApiInternals
            onGoogleApiLoaded={({ map, maps }) => {
              if (map && maps) setApi({ map, maps });
              else markFailed();
            }}
            onTilesLoaded={() => setTilesReady(true)}
          >
            {ready && !pickingLocation && markers.map(marker => (
              <PricePin
                key={marker.id}
                lat={marker.point[0]}
                lng={marker.point[1]}
                marker={marker}
                selected={marker.id === selectedKey}
                onChoose={chooseMarker}
              />
            ))}
          </GoogleMapReact></GoogleMapHost>}
        </div>
        <div className="nh-map-layers" aria-label="Lớp nền bản đồ">
          <MotionButton type="button" disabled={!ready} aria-pressed={view === 'roadmap'} className={view === 'roadmap' ? 'active' : ''} onClick={() => changeLayer('roadmap')}>
            <MapIcon size={17} aria-hidden="true" /> Bản đồ
          </MotionButton>
          <MotionButton type="button" disabled={!ready} aria-pressed={view === 'hybrid'} className={view === 'hybrid' ? 'active' : ''} onClick={() => changeLayer('hybrid')}>
            <Satellite size={17} aria-hidden="true" /> Vệ tinh
          </MotionButton>
          <MotionButton type="button" disabled={!ready} aria-label="Xem vị trí các ghim" onClick={fit}>
            <Focus size={17} aria-hidden="true" />
          </MotionButton>
          {document.fullscreenEnabled && (
            <MotionButton type="button" disabled={!ready} aria-label={fullScreen ? 'Thu gọn bản đồ' : 'Mở rộng bản đồ'} onClick={toggleFullScreen}>
              {fullScreen ? <Minimize size={17} aria-hidden="true" /> : <Expand size={17} aria-hidden="true" />}
            </MotionButton>
          )}
        </div>
        {popup ? (
          <section
            className="nh-google-room-popup"
            ref={popupRef}
            aria-label={`Phòng tại ${popup.title}`}
            tabIndex={-1}
            onKeyDown={event => {
              if (event.key === 'Escape') closePopup();
            }}
          >
            <header>
              <strong>{popup.title}</strong>
              <MotionButton type="button" aria-label="Đóng thông tin nhà trọ" onClick={closePopup}>
                <X size={17} aria-hidden="true" />
              </MotionButton>
            </header>
            {popup.popup}
          </section>
        ) : <div className="nh-map-hint">
          {pickingLocation ? 'Nhấn bản đồ hoặc kéo ghim để chọn vị trí' : 'Chọn ghim giá để xem nhà trọ'}
        </div>}
        {!ready && <div className="nh-map-loading" role="status">Đang kết nối Google Maps…</div>}
      </div>
    </div>
  );
}
