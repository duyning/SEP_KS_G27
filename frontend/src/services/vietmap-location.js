import {request,ApiError} from './auth.js';
import {roomCoordinates} from './map-location.js';
const call=(path,body,signal)=>request(path,{basePath:'/api/property-location',method:body?'POST':'GET',body,signal});
function location(data){if(!roomCoordinates(data)||!Array.isArray(data?.warnings)||!Array.isArray(data?.places))throw new ApiError('Dữ liệu vị trí chưa hợp lệ. Hãy chọn lại địa chỉ.',502);return data;}
export const vietmapLocation={
 async status(signal){const data=await call('/status',undefined,signal);if(typeof data?.enabled!=='boolean')throw new ApiError('Chưa đọc được cấu hình vị trí.',502);return data;},
 async autocomplete(text,point,signal){const data=await call('/autocomplete',{text,...(point?{latitude:point[0],longitude:point[1]}:{})},signal);if(!Array.isArray(data)||!data.every(item=>typeof item.refId==='string'&&typeof item.display==='string'))throw new ApiError('Chưa đọc được địa chỉ gợi ý.',502);return data;},
 async place(refId,signal){return location(await call('/place',{refId},signal));},
 async reverse(point,signal){return location(await call('/reverse',{latitude:point[0],longitude:point[1]},signal));},
};
