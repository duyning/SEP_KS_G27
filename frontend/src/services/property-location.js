import { request, ApiError } from './auth.js';
import { roomCoordinates } from './map-location.js';

export async function lookupPropertyLocation(input, signal) {
  const data=await request('/location/resolve',{basePath:'/api/host/property-registrations',method:'POST',body:{input},signal});
  if(!roomCoordinates(data)||!Array.isArray(data.places)||!Array.isArray(data.warnings))throw new ApiError('Dữ liệu gợi ý vị trí không hợp lệ.',502);
  return data;
}
const nearbyCache=new Map();
let nearbyQueue=Promise.resolve(),lastNearby=0;
export function nearbyPlaces(latitude,longitude,signal){
  const key=[Number(latitude).toFixed(5),Number(longitude).toFixed(5)].join(',');
  let entry=nearbyCache.get(key);
  if(!entry||entry.expires<Date.now()){
    const query=new URLSearchParams({latitude,longitude});
    const promise=nearbyQueue.catch(()=>{}).then(async()=>{
      const wait=Math.max(0,1600-(Date.now()-lastNearby));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
      lastNearby=Date.now();
      const data=await request(`/location/nearby?${query}`,{basePath:'/api/properties',authenticated:false});
      if(!Array.isArray(data?.places)||!data.places.every(place=>roomCoordinates(place)&&typeof place.name==='string'&&Number.isFinite(place.distanceMeters)))throw new ApiError('Dữ liệu địa điểm lân cận không hợp lệ.',502);
      return data;
    });
    entry={promise,expires:Date.now()+600000};if(nearbyCache.size>=64)nearbyCache.delete(nearbyCache.keys().next().value);nearbyCache.set(key,entry);
    promise.catch(()=>{if(nearbyCache.get(key)===entry)nearbyCache.delete(key);});nearbyQueue=promise.then(()=>{},()=>{});
  }
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(new DOMException('Aborted','AbortError'));
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    entry.promise.then(data=>{signal?.removeEventListener('abort',abort);if(!signal?.aborted)resolve(data);},error=>{signal?.removeEventListener('abort',abort);reject(error);});
  });
}

// Apply only supplied suggestions and editable fields; never clear an unrelated form field.
export function applyLocationSuggestion(form,data,editableFields){
  const allowed=new Set(editableFields);
  const next={...form};
  if(allowed.has('latitude')&&allowed.has('longitude')&&roomCoordinates(data)){
    next.latitude=String(data.latitude);next.longitude=String(data.longitude);
  }
  for(const field of ['addressDetail','commune','nearby'])if(allowed.has(field)&&typeof data[field]==='string'&&data[field].trim())next[field]=data[field];
  return next;
}
