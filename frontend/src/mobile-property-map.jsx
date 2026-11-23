import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapCanvas, LocationMarker } from './components/AccommodationMap.jsx';
import { AppMotionProvider } from './components/motion/MotionUI.jsx';
import { AREA_CENTERS, parsePropertyCoordinates } from './services/property-registration.js';
import './styles/mobile-property-map.css';

function sendToApp(message) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

function PropertyMap() {
  const [initialPoint] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return parsePropertyCoordinates(params.get('lat'), params.get('lng'));
  });
  const [point, setPoint] = useState(initialPoint);

  useEffect(() => sendToApp({ type: 'property-map-ready' }), []);

  function select(latitude, longitude) {
    const selected = parsePropertyCoordinates(latitude, longitude);
    if (!selected) return;
    setPoint(selected);
    sendToApp({ type: 'property-pin', latitude, longitude });
  }

  return (
    <MapCanvas
      points={[initialPoint || AREA_CENTERS['Tân Xã']]}
      markers={point ? [{ id: 'property', point, title: 'Vị trí nhà trọ' }] : []}
      onSelect={select}
      nearbyPoint={null}
      label="Bản đồ chọn vị trí nhà trọ"
    >
      <LocationMarker point={point} onSelect={select} />
    </MapCanvas>
  );
}

createRoot(document.getElementById('root'), {
  onUncaughtError: () => sendToApp({ type: 'property-map-error' }),
}).render(
  <AppMotionProvider>
    <PropertyMap />
  </AppMotionProvider>,
);
