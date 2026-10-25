export const MAX_BATCH_ROOMS=200;
export const blankRoomGroup=()=>({floor:'',prefix:'P.',start:'',count:''});
export function validateRoomDrafts(rows,existingNumbers=[]) {
  const errors={rows:{},list:''};
  if(!rows.length||rows.length>MAX_BATCH_ROOMS)errors.list=`Cần từ 1 đến ${MAX_BATCH_ROOMS} phòng trong danh sách xem trước.`;
  const seen=new Map();const existing=new Set(existingNumbers.map(value=>value.trim().toUpperCase()));
  rows.forEach((room,index)=>{
    const invalid={};const number=room.roomNumber.trim().toUpperCase();
    if(!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u.test(number))invalid.roomNumber='Mã phòng cần 1–30 ký tự hợp lệ.';
    if(existing.has(number))invalid.roomNumber='Mã phòng đã có trong nhà trọ.';
    if(seen.has(number)){invalid.roomNumber='Trùng mã phòng trong danh sách.';errors.rows[seen.get(number)]={...errors.rows[seen.get(number)],roomNumber:invalid.roomNumber};}
    seen.set(number,index);
    if(!room.floor.trim()||room.floor.trim().length>50)invalid.floor='Tầng / khu vực cần 1–50 ký tự.';
    if(Object.keys(invalid).length)errors.rows[index]={...errors.rows[index],...invalid};
  });
  return errors;
}
export function generateRoomDrafts(groups) {
  const errors={groups:{},list:''};let total=0;
  if(!groups.length||groups.length>20)errors.list='Cần từ 1 đến 20 nhóm tầng / khu.';
  groups.forEach((group,index)=>{
    const invalid={};
    if(!group.floor.trim()||group.floor.trim().length>50)invalid.floor='Nhập tầng / khu vực (1–50 ký tự).';
    if(group.prefix&&!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,19}$/u.test(group.prefix))invalid.prefix='Tiền tố tối đa 20 ký tự hợp lệ.';
    if(!/^\d{1,9}$/.test(group.start)||Number(group.start)>999999999)invalid.start='Nhập số bắt đầu từ 0 đến 999999999.';
    if(!/^\d+$/.test(group.count)||Number(group.count)<1||Number(group.count)>MAX_BATCH_ROOMS)invalid.count=`Số lượng từ 1 đến ${MAX_BATCH_ROOMS}.`;
    if(!invalid.start&&!invalid.count&&Number(group.start)+Number(group.count)-1>999999999)invalid.start='Dãy số vượt giới hạn cho phép.';
    total+=Number(group.count)||0;if(Object.keys(invalid).length)errors.groups[index]=invalid;
  });
  if(total>MAX_BATCH_ROOMS)errors.list=`Tổng số phòng không được vượt quá ${MAX_BATCH_ROOMS}.`;
  if(errors.list||Object.keys(errors.groups).length)return {rows:[],errors};
  return {rows:groups.flatMap(group=>Array.from({length:Number(group.count)},(_,index)=>({roomNumber:`${group.prefix}${String(Number(group.start)+index).padStart(group.start.length,'0')}`.trim().toUpperCase(),floor:group.floor.trim()}))),errors};
}
export const roomBatchPayload=rows=>({rooms:rows.map(room=>({roomNumber:room.roomNumber.trim().toUpperCase(),floor:room.floor.trim()}))});
