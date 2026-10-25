import {AREAS,parsePropertyCoordinates} from './property-registration.js';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function parseLocationInput(raw) {
  const text=raw.trim();
  if(text.length<5||text.length>1500)throw new Error('Nhập địa chỉ hoặc liên kết từ 5 đến 1500 ký tự.');
  const links=text.match(/https?:\/\/[^\s<>]+/g);
  if(links?.length){
    const url=links.map(link=>new URL(link)).find(url=>['google.com','www.google.com','maps.google.com','maps.app.goo.gl','goo.gl'].includes(url.hostname));
    if(!url)throw new Error('Liên kết chưa được hỗ trợ. Vui lòng dán địa chỉ hoặc liên kết Google Maps.');
    if(['maps.app.goo.gl','goo.gl'].includes(url.hostname))throw new Error('Liên kết rút gọn chưa có địa chỉ. Hãy mở Google Maps rồi sao chép địa chỉ hoặc liên kết đầy đủ.');
    if(url.username||url.password||url.protocol!=='https:')throw new Error('Liên kết Google Maps không hợp lệ.');
    const point=decodeURIComponent(url.href).match(/!3d([+-]?[\d.]+)!4d([+-]?[\d.]+)/);
    const placeId=url.searchParams.get('query_place_id');if(placeId)return {placeId};
    const query=point?`${point[1]},${point[2]}`:url.searchParams.get('query')||url.searchParams.get('q');
    if(query)return parseLocationInput(query);
    const place=url.pathname.match(/\/place\/([^/]+)/);
    if(place)return {address:decodeURIComponent(place[1]).replace(/\+/g,' '),region:'vn'};
    throw new Error('Liên kết chỉ chứa khung nhìn bản đồ, chưa có vị trí cụ thể. Vui lòng dán địa chỉ hoặc liên kết của địa điểm.');
  }
  const coordinates=text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if(coordinates){const point=parsePropertyCoordinates(coordinates[1],coordinates[2]);if(!point)throw new Error('Tọa độ không hợp lệ.');return {location:{lat:point[0],lng:point[1]}};}
  const labelled=text.match(/(?:địa chỉ|dia chi|address)\s*[:\-]\s*([^\n]+)/i);
  return {address:(labelled?.[1]||text).replace(/\s+/g,' ').trim(),region:'vn'};
}
export function locationFromGoogle(result) {
  const position=result.geometry?.location;
  const lat=typeof position?.lat==='function'?position.lat():position?.lat;
  const lng=typeof position?.lng==='function'?position.lng():position?.lng;
  const point=parsePropertyCoordinates(lat,lng);
  if(!point||!result.formatted_address)throw new Error('Google chưa trả về địa chỉ và tọa độ hợp lệ.');
  const components=result.address_components||[];const address=result.formatted_address.trim();
  if(address.length>255)throw new Error('Địa chỉ tìm được dài quá 255 ký tự. Hãy nhập địa chỉ ngắn gọn hơn.');
  const locationText=normalize([...components.map(item=>item.long_name),address].join(', '));
  const candidates=AREAS.filter(area=>locationText.includes(normalize(area)));
  return {addressDetail:address,commune:candidates.length===1?candidates[0]:'',latitude:point[0].toFixed(6),longitude:point[1].toFixed(6),approximate:Boolean(result.partial_match)||result.geometry?.location_type!=='ROOFTOP'};
}
