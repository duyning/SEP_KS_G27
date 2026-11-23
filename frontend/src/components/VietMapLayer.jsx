import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { VIETMAP_KEY, vietmapStyleUrl } from '../services/map-provider.js';

let sdk;
function loadSdk() {
  // Load the official binding on demand; OSM/Google do not download this SDK.
  sdk ??= Promise.all([
    import('@vietmap/vietmap-gl-leaflet'),
    import('@vietmap/vietmap-gl-js/dist/vietmap-gl.css'),
  ]).catch(error => { sdk = undefined; throw error; });
  return sdk;
}

export default function VietMapLayer({ view, revision, onLoading, onReady, onFailure }) {
  const map = useMap(), callbacks = useRef();
  callbacks.current = { onLoading, onReady, onFailure };
  useEffect(() => {
    let active = true, layer, gl, timer, loaded = false;
    const credit = '&copy; <a href="https://vietmap.vn/" target="_blank" rel="noopener noreferrer">VIETMAP</a>';
    const fail = () => { if (active) { clearTimeout(timer); callbacks.current.onFailure(); } };
    const ready = () => { if (active) { loaded = true; clearTimeout(timer); callbacks.current.onReady(); } };
    const error = event => {
      // Never forward SDK error messages/URLs containing the browser key to UI/logs.
      const status = event.error?.status;
      if (!loaded || [401,403,423,429].includes(status) || /\/tiles\//.test(event.error?.message || '')) fail();
    };
    callbacks.current.onLoading();
    timer = setTimeout(fail, 20000);
    (async () => {
      try {
        await loadSdk();
        if (!active) return;
        layer = L.vietmapGL({ style: vietmapStyleUrl(VIETMAP_KEY, view), interactive: false });
        const remove = layer.onRemove;
        // A WebGL constructor can fail before the SDK map exists. Leaflet must
        // still finish detaching that partially initialized layer on fallback.
        layer.onRemove = function (leafletMap) {
          try { remove.call(this, leafletMap); }
          catch { this.getContainer()?.remove(); }
        };
        layer.addTo(map);
        map.attributionControl.addAttribution(credit);
        gl = layer.getVietmapMap();
        gl.on('load', ready);
        gl.on('error', error);
        gl.on('webglcontextlost', fail);
      } catch { fail(); }
    })();
    return () => {
      active = false; clearTimeout(timer);
      gl?.off('load', ready); gl?.off('error', error); gl?.off('webglcontextlost', fail);
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      map.attributionControl.removeAttribution(credit);
    };
  }, [map, view, revision]);
  return null;
}
