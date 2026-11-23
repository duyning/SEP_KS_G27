// Explicit provider selection must never accidentally call another paid provider.
export function selectMapProvider(env = {}) {
  const requested = (env.VITE_MAP_PROVIDER || 'auto').trim().toLowerCase();
  const vietmap = Boolean(env.VITE_VIETMAP_API_KEY?.trim());
  const google = Boolean(env.VITE_GOOGLE_MAPS_API_KEY?.trim());
  if (requested === 'osm') return 'osm';
  if (requested === 'vietmap') return vietmap ? 'vietmap' : 'osm';
  if (requested === 'google') return google ? 'google' : 'osm';
  if (requested !== 'auto') return 'osm';
  return vietmap ? 'vietmap' : google ? 'google' : 'osm';
}

export function vietmapStyleUrl(key, view = 'street') {
  if (!key?.trim()) throw new Error('Chưa cấu hình VietMap API key.');
  const style = view === 'satellite' ? 'hm' : 'tm';
  return `https://maps.vietmap.vn/maps/styles/${style}/style.json?apikey=${encodeURIComponent(key.trim())}`;
}

export function vietmapSatelliteUrl(key) {
  if (!key?.trim()) throw new Error('Chưa cấu hình VietMap API key.');
  return `https://maps.vietmap.vn/maps/tiles/st/{z}/{x}/{y}.png?apikey=${encodeURIComponent(key.trim())}`;
}

export const MAP_PROVIDER = selectMapProvider(import.meta.env);
export const VIETMAP_KEY = (import.meta.env?.VITE_VIETMAP_API_KEY || '').trim();
