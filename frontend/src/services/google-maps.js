export const GOOGLE_MAPS_KEY = (import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
export const GOOGLE_MAPS_MAP_ID = (import.meta.env?.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID').trim();
let loading;
let authorizationFailed=false;
export function loadGoogleMaps() {
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('Chưa cấu hình Google Maps API key.'));
  // Google leaves its namespace behind after rejecting a key. It is not a
  // usable SDK instance; reusing it on the next form step can throw internally.
  if (authorizationFailed) return Promise.reject(new Error('Bản đồ chưa khả dụng trong phiên này. Bạn có thể tiếp tục mà không ghim vị trí.'));
  if (globalThis.google?.maps?.importLibrary) return Promise.resolve(globalThis.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve,reject) => {
    const script=document.createElement('script');const callback='__hlrcsGoogleMapsReady';let timer;
    const cleanup=()=>{clearTimeout(timer);delete globalThis[callback];};
    const fail=()=>{cleanup();script.remove();loading=undefined;reject(new Error('Không tải được Google Maps. Vui lòng kiểm tra API key và kết nối mạng.'));};
    globalThis.gm_authFailure=()=>{authorizationFailed=true;globalThis.dispatchEvent(new Event('hlrcs:google-maps-auth-error'));fail();};
    globalThis[callback]=()=>{cleanup();resolve(globalThis.google.maps);};
    const params=new URLSearchParams({key:GOOGLE_MAPS_KEY,loading:'async',callback,language:'vi',region:'VN',v:'weekly'});
    script.src=`https://maps.googleapis.com/maps/api/js?${params}`;script.async=true;script.onerror=fail;
    timer=setTimeout(fail,20000);document.head.append(script);
  });
  return loading;
}
export async function geocodeLocation(request) {
  const maps=await loadGoogleMaps();const {Geocoder}=await maps.importLibrary('geocoding');
  try {
    const response=await new Geocoder().geocode(request);
    if(!response.results?.length)throw new Error('Không tìm thấy vị trí. Vui lòng nhập địa chỉ đầy đủ hơn.');
    return response.results;
  } catch(error) {
    if(error.code==='ZERO_RESULTS')throw new Error('Không tìm thấy vị trí. Vui lòng nhập địa chỉ đầy đủ hơn.');
    if(['REQUEST_DENIED','OVER_QUERY_LIMIT'].includes(error.code))throw new Error('Google chưa cho phép tìm địa chỉ hoặc đã đạt giới hạn sử dụng. Vui lòng kiểm tra cấu hình API.');
    throw error;
  }
}
