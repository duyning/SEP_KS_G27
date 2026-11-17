export const ROOM_LAYOUT_LIMIT=5000;
let generationSequence=0;
export const roomKey=value=>String(value||'').trim().toLocaleUpperCase('vi');
export function generateRoomLayout({from,to,count,start=1,prefix=''},existing=[]) {
 if([from,to,count,start].some(value=>value==null||String(value).trim()===''))throw Error('Nhập đủ tầng, số lượng và số thứ tự bắt đầu.');
 const values=[from,to,count,start].map(Number),[first,last,size,begin]=values;
 if(!values.every(Number.isSafeInteger)||first<0||last<first||last-first>199||size<1||size>500||begin<1||begin+size>10000||(last-first+1)*size>ROOM_LAYOUT_LIMIT)throw Error('Chọn tối đa 200 tầng, 500 phòng mỗi tầng và 5.000 phòng mỗi lần. Số bắt đầu từ 1 đến 9.999.');
 if(prefix.length>12||!/^[\p{L}\p{N} ._-]*$/u.test(prefix))throw Error('Tiền tố tối đa 12 ký tự, chỉ gồm chữ, số, dấu cách, chấm, gạch ngang hoặc gạch dưới.');
 const batchId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${++generationSequence}`;
 const used=new Set(existing.map(roomKey)),rooms=[];let skipped=0;
 const width=Math.max(2,String(begin+size-1).length);
 for(let floor=first;floor<=last;floor++)for(let number=begin;number<begin+size;number++){
  const roomNumber=prefix+floor+String(number).padStart(width,'0');
  if(roomNumber.length>30)throw Error('Số phòng không được dài quá 30 ký tự.');
  if(used.has(roomKey(roomNumber))){skipped++;continue;}
  used.add(roomKey(roomNumber));rooms.push({id:`${batchId}:${roomNumber}`,roomNumber,floor:`Tầng ${floor}`,roomTypeId:null});
 }
 return {rooms,skipped};
}
export function layoutErrors(rows,types,existing=[]) {
 const used=new Set(existing.map(roomKey)),validTypes=new Set(types.map(type=>type.roomTypeId)),errors={};
 for(const row of rows){const number=roomKey(row.roomNumber);
  if(!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u.test(number))errors[row.id]='Số phòng không hợp lệ.';
  else if(used.has(number))errors[row.id]='Trùng số phòng.';
  used.add(number);
  if(!row.floor?.trim()||row.floor.length>50)errors[row.id]='Thiếu tầng / khu vực hợp lệ.';
  if(!validTypes.has(row.roomTypeId))errors[row.id] ||= 'Chưa chọn loại phòng.';
 }
 return errors;
}
export function applyLayoutPattern(rows,ids,pattern) {
 if(!pattern.length||pattern.some(id=>!Number.isSafeInteger(id)))throw Error('Chọn đầy đủ các loại phòng trong mẫu so le.');
 let index=0;return rows.map(row=>ids.has(row.id)?{...row,roomTypeId:pattern[index++%pattern.length]}:row);
}
export function selectLayoutNumbers(rows,text) {
 const requested=new Set(String(text).split(/[,;\n]+/).map(roomKey).filter(Boolean));
 if(!requested.size)throw Error('Nhập các số phòng, ngăn cách bằng dấu phẩy hoặc xuống dòng.');
 const available=new Set(rows.map(row=>roomKey(row.roomNumber)));
 const missing=[...requested].filter(number=>!available.has(number));
 if(missing.length)throw Error(`Không tìm thấy trong bản nháp: ${missing.slice(0,6).join(', ')}. Chưa thay đổi lựa chọn.`);
 return new Set(rows.filter(row=>requested.has(roomKey(row.roomNumber))).map(row=>row.id));
}
export function copyFloorLayout(rows,source,targets) {
 const original=rows.filter(row=>row.floor===source);
 const destinations=[...new Set(targets)].filter(floor=>floor!==source);
 if(!original.length||original.some(row=>!row.roomTypeId))throw Error('Gán đủ loại phòng cho tầng nguồn trước khi sao chép.');
 if(destinations.some(floor=>rows.filter(row=>row.floor===floor).length!==original.length))throw Error('Các tầng nhận cần có cùng số phòng với tầng nguồn. Chưa thay đổi tầng nào.');
 const positions=new Map();return rows.map(row=>{
  if(!destinations.includes(row.floor))return row;
  const index=positions.get(row.floor)||0;positions.set(row.floor,index+1);
  return {...row,roomTypeId:original[index].roomTypeId};
 });
}
