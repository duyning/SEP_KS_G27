import { ApiError, request } from './auth.js';

function pendingRegistration(data) {
  if (!data || !Number.isInteger(data.registrationId) || data.registrationId < 1 || !['PENDING', 'NEEDS_SUPPLEMENT'].includes(data.status) || typeof data.name !== 'string') throw new ApiError('Phản hồi hồ sơ không hợp lệ. Vui lòng tải lại để kiểm tra trạng thái.', 502);
  return data;
}

export const hostApi = {
  async confirmAvailability(id, signal) {
    const value = await request(`/room-types/${roomTypeId(id)}/availability-confirmation`, {basePath:'/api/host', method:'POST', signal});
    if (!value || value.roomTypeId !== Number(id) || value.availabilityConfirmationStatus !== 'CURRENT'
      || !value.availabilityConfirmedAt || !Number.isFinite(Date.parse(value.availabilityConfirmedAt))
      || value.availabilityStale !== false || !Number.isInteger(value.vacantRooms) || !Number.isInteger(value.totalRooms)
      || value.vacantRooms < 0 || value.vacantRooms > value.totalRooms || value.totalRooms < 1)
      throw new ApiError('Chưa xác nhận được kết quả đã lưu. Vui lòng tải lại danh sách.', 502);
    return value;
  },
  async propertyEdit(id,signal){
    const data=await request(`/property-registrations/${roomTypeId(id)}/edit`,{basePath:'/api/host',signal});
    if(!data||data.registrationId!==Number(id)||!data.details||!['editableFields','requestedFields','photos','documents'].every(key=>Array.isArray(data[key]))||typeof data.versionToken!=='string')throw new ApiError('Dữ liệu chỉnh sửa không hợp lệ.',502);
    return data;
  },
  async resubmitProperty(id,edit,photos,documents,signal){
    const body=new FormData();body.append('edit',new Blob([JSON.stringify(edit)],{type:'application/json'}));
    for(const file of photos)body.append('photos',file);
    for(const key of ['ownership','idCard','fireSafety'])if(documents[key])body.append(key,documents[key]);
    return pendingRegistration(await request(`/property-registrations/${roomTypeId(id)}/resubmit`,{basePath:'/api/host',method:'POST',body,signal}));
  },
  async rooms(signal, propertyId, typeId) {
    const query=new URLSearchParams();
    if(propertyId!=null)query.set('propertyId',roomTypeId(propertyId));
    if(typeId!=null)query.set('roomTypeId',roomTypeId(typeId));
    const data=await request(`/rooms${query.size?`?${query}`:''}`,{basePath:'/api/host',signal});
    if(!data||!['properties','roomTypes','rooms'].every(key=>Array.isArray(data[key]))||!Number.isInteger(data.pendingRegistrationCount)||!data.rooms.every(validRoom))throw new ApiError('Danh sách phòng không hợp lệ.',502);
    return data;
  },
  async saveRoom(id, data, signal) {
    const result=await request(`/rooms${id==null?'':`/${roomTypeId(id)}`}`,{basePath:'/api/host',method:id==null?'POST':'PUT',body:data,signal});
    if(!validRoom(result))throw new ApiError('Chưa xác nhận được phòng đã lưu. Vui lòng tải lại danh sách.',502);
    return result;
  },
  deleteRoom(id, signal) {return request(`/rooms/${roomTypeId(id)}`,{basePath:'/api/host',method:'DELETE',signal});},
  async registrationEligibility(signal) {
    const data = await request('/property-registrations/eligibility', { basePath: '/api/host', signal });
    if (!data || typeof data.canRegister !== 'boolean' || !['HAS_PROPERTY','PENDING','NEEDS_SUPPLEMENT','ELIGIBLE'].includes(data.reason) || data.canRegister !== (data.reason === 'ELIGIBLE')) throw new ApiError('Không thể xác minh quyền đăng ký nhà trọ.', 502);
    return data;
  },
  async createRoomType(data, signal, photos = []) {
    return this.saveRoomType(null, data, photos, signal);
  },
  async createRoomTypeWithRooms(data, layout, photos, signal) {
    const body=new FormData();body.append('details',new Blob([JSON.stringify(data)],{type:'application/json'}));
    body.append('layout',new Blob([JSON.stringify(layout)],{type:'application/json'}));for(const photo of photos)body.append('photos',photo);
    const result=await request('/room-types/with-rooms',{basePath:'/api/host',method:'POST',body,signal});
    if(!result||!Number.isInteger(result.roomTypeId)||result.propertyId!==data.propertyId||!Array.isArray(result.amenities)||!Array.isArray(result.rooms)||result.rooms.length!==layout.rooms.length||result.rooms.some(room=>room.roomTypeId!==result.roomTypeId||room.propertyId!==data.propertyId))throw new ApiError('Chưa xác nhận được toàn bộ loại phòng và danh sách phòng. Vui lòng tải lại trước khi gửi lại.',502);
    return result;
  },
  async saveRoomType(id, data, photos, signal) {
    const body = new FormData();
    body.append('details', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    for (const photo of photos) body.append('photos', photo);
    const result = await request(`/room-types${id == null ? '' : `/${roomTypeId(id)}`}`, { basePath: '/api/host', method: id == null ? 'POST' : 'PUT', body, signal });
    if (!result || !Number.isInteger(result.roomTypeId) || result.propertyId !== data.propertyId || !Array.isArray(result.amenities)) throw new ApiError('Chưa xác nhận được loại phòng đã tạo. Vui lòng tải lại danh sách.', 502);
    return result;
  },
  async roomTypeDetail(id, signal) {
    const result = await request(`/room-types/${roomTypeId(id)}`, { basePath: '/api/host', signal });
    if (!result || result.roomTypeId !== Number(id) || !Array.isArray(result.images) || !Array.isArray(result.amenities)) throw new ApiError('Thông tin loại phòng không hợp lệ.',502);
    return result;
  },
  async roomTypeImage(id, imageId, signal) {
    const blob=await request(`/room-types/${roomTypeId(id)}/images/${roomTypeId(imageId)}`,{basePath:'/api/host',signal,responseType:'blob'});
    if (!['image/jpeg','image/png','image/webp'].includes(blob.type) || !blob.size) throw new ApiError('Không tải được ảnh loại phòng.',502);
    return blob;
  },
  deleteRoomType(id, signal) { return request(`/room-types/${roomTypeId(id)}`,{basePath:'/api/host',method:'DELETE',signal}); },
  async property(signal, id) {
    if (id != null && (!/^\d+$/.test(String(id)) || Number(id) < 1 || Number(id) > 2147483647)) throw new ApiError('Mã nhà trọ không hợp lệ.', 400);
    const query = id == null ? '' : `?${new URLSearchParams({ id })}`;
    const data = await request(`/property${query}`, { basePath: '/api/host', signal });
    if (!data || !Array.isArray(data.records) || data.records.some(record => !record || typeof record.name !== 'string'
      || !['VISIBLE', 'PENDING', 'NEEDS_SUPPLEMENT', 'REJECTED', 'INACTIVE', 'APPROVED'].includes(record.displayStatus)
      || !['amenities', 'selectedRules', 'photos', 'documents'].every(key => Array.isArray(record[key]))
      || !Number.isInteger(record.roomTypeCount) || record.roomTypeCount < 0
      || !Number.isInteger(record.pendingViewingCount) || record.pendingViewingCount < 0)) throw new ApiError('Thông tin nhà trọ không hợp lệ. Vui lòng tải lại.', 502);
    return data;
  },
  async propertyPhoto(id, signal) {
    const blob = await request(`/property/photos/${id}`, { basePath: '/api/host', signal, responseType: 'blob' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size === 0) throw new ApiError('Không thể tải ảnh nhà trọ.', 502);
    return blob;
  },
  async currentRegistration(signal) {
    const data = await request('/property-registrations/current', { basePath: '/api/host', signal });
    return data === null ? null : pendingRegistration(data);
  },
  async submitRegistration(data, signal) {
    const { photos, documents, ...details } = data;
    const body = new FormData();
    body.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
    for (const file of photos) body.append('photos', file);
    for (const key of ['ownership', 'idCard', 'fireSafety']) if (documents[key]) body.append(key, documents[key]);
    return pendingRegistration(await request('/property-registrations', { basePath: '/api/host', method: 'POST', body, signal }));
  },
  async viewings(signal) {
    const data = await request('/viewings', { basePath: '/api/host', signal });
    if (!data || !Array.isArray(data.properties) || !Array.isArray(data.viewings)
        || !Number.isInteger(data.pendingRegistrationCount) || data.pendingRegistrationCount < 0) {
      throw new ApiError('Dữ liệu yêu cầu xem phòng không hợp lệ. Vui lòng tải lại.', 502);
    }
    return data;
  },
  async roomTypes(signal, propertyId) {
    if (propertyId != null && (!/^\d+$/.test(String(propertyId)) || Number(propertyId) < 1 || Number(propertyId) > 2147483647)) {
      throw new ApiError('Mã nhà trọ không hợp lệ.', 400);
    }
    const query = propertyId == null ? '' : `?${new URLSearchParams({ propertyId })}`;
    const data = await request(`/room-types${query}`, { basePath: '/api/host', signal });
    if (!data || !Array.isArray(data.properties) || !Array.isArray(data.roomTypes)
        || !Number.isInteger(data.pendingRegistrationCount) || data.pendingRegistrationCount < 0) {
      throw new ApiError('Dữ liệu loại phòng không hợp lệ. Vui lòng tải lại.', 502);
    }
    return data;
  },
  async dashboard(signal) {
    const data = await request('/dashboard', { basePath: '/api/host', signal });
    if (!data || !Array.isArray(data.properties) || !Array.isArray(data.recentViewings)
        || !['roomTypeCount', 'pendingViewingCount', 'pendingRegistrationCount'].every(key => Number.isInteger(data[key]) && data[key] >= 0)) {
      throw new ApiError('Dữ liệu bảng điều khiển không hợp lệ. Vui lòng tải lại.', 502);
    }
    return data;
  },
};

function roomTypeId(id) {
  if (!/^\d+$/.test(String(id)) || Number(id)<1 || Number(id)>2147483647) throw new ApiError('Mã loại phòng hoặc ảnh không hợp lệ.',400);
  return id;
}
function validRoom(room) {return room&&Number.isInteger(room.roomId)&&Number.isInteger(room.roomTypeId)&&Number.isInteger(room.propertyId)&&typeof room.roomNumber==='string'&&typeof room.floor==='string'&&['VACANT','OCCUPIED'].includes(room.status)&&Array.isArray(room.amenities);}
