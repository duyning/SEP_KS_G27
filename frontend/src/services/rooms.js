export const roomStatusLabels={VACANT:'Còn trống',OCCUPIED:'Đã có người thuê'};
export const emptyRoom=(typeId='')=>({roomTypeId:String(typeId),roomNumber:'',floor:'Tầng 1',status:'VACANT',overridePrice:false,customPrice:'',leaseStartDate:'',leaseEndDate:''});
export const editRoom=room=>({...emptyRoom(room.roomTypeId),roomNumber:room.roomNumber,floor:room.floor,status:room.status,overridePrice:room.customPrice!=null,customPrice:room.customPrice==null?'':String(room.customPrice),leaseStartDate:room.leaseStartDate||'',leaseEndDate:room.leaseEndDate||''});
export function validateLeaseDates(data){
  if(data.status!=='OCCUPIED')return {};
  const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&value.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
  const errors={};
  if(!valid(data.leaseStartDate))errors.leaseStartDate='Nhập ngày bắt đầu ở hợp lệ.';
  if(!valid(data.leaseEndDate))errors.leaseEndDate='Nhập ngày kết thúc ở hợp lệ.';
  if(!Object.keys(errors).length&&data.leaseEndDate<data.leaseStartDate)errors.leaseEndDate='Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.';
  return errors;
}
export const leaseDateLabel=value=>value?value.split('-').reverse().join('/'):'Chưa cập nhật';
export function validateRoom(data,types) {
  const errors={};
  const type=types.find(type=>String(type.roomTypeId)===data.roomTypeId);
  if(!type)errors.roomTypeId='Vui lòng chọn một loại phòng đã có trong nhà trọ.';
  if(!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,29}$/u.test(data.roomNumber.trim()))errors.roomNumber='Nhập số phòng từ 1 đến 30 ký tự, chỉ gồm chữ, số, dấu cách, chấm, gạch ngang hoặc gạch dưới.';
  if(!data.floor.trim()||data.floor.trim().length>50)errors.floor='Vui lòng chọn tầng / khu vực hợp lệ.';
  if(!['VACANT','OCCUPIED'].includes(data.status))errors.status='Vui lòng chọn tình trạng thực tế.';
  if(data.overridePrice&&(!/^\d+$/.test(data.customPrice)||+data.customPrice<1||+data.customPrice>999999999))errors.customPrice='Giá riêng phải là số nguyên từ 1 đến 999.999.999 đ.';
  if(type&&!data.overridePrice&&!(Number(type.price)>0))errors.customPrice='Loại phòng chưa có giá hợp lệ. Hãy cập nhật loại phòng hoặc nhập giá riêng.';
  return {...errors,...validateLeaseDates(data)};
}
export const roomPayload=data=>({roomTypeId:Number(data.roomTypeId),roomNumber:data.roomNumber.trim().toUpperCase(),floor:data.floor.trim(),status:data.status,customPrice:data.overridePrice?Number(data.customPrice):null,leaseStartDate:data.status==='OCCUPIED'?data.leaseStartDate||null:null,leaseEndDate:data.status==='OCCUPIED'?data.leaseEndDate||null:null});
