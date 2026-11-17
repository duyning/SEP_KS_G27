import {request,ApiError} from './auth.js';
const basePath='/api/host-onboarding';
function registration(data){if(!data||!Number.isInteger(data.registrationId)||!['PENDING','NEEDS_SUPPLEMENT','APPROVED','REJECTED'].includes(data.status))throw new ApiError('Không đọc được trạng thái đăng ký.',502);return data;}
export const onboardingApi={
 async current(signal){const data=await request('/current',{basePath,signal});if(!data||!Object.hasOwn(data,'registration'))throw new ApiError('Không đọc được hồ sơ đăng ký.',502);if(data.registration)registration(data.registration);return data;},
 async submit(account,data,signal){const {photos,documents,...details}=data;const body=new FormData();for(const [key,value] of Object.entries({account,details}))body.append(key,new Blob([JSON.stringify(value)],{type:'application/json'}));for(const file of photos)body.append('photos',file);for(const key of ['ownership','fireSafety'])if(documents[key])body.append(key,documents[key]);return registration(await request('',{basePath,method:'POST',body,signal}));},
 async propertyEdit(id,signal){const data=await request(`/${id}/edit`,{basePath,signal});if(!data?.details||typeof data.versionToken!=='string'||!Array.isArray(data.editableFields))throw new ApiError('Không đọc được hồ sơ bổ sung.',502);return data;},
 async resubmitProperty(id,edit,photos,documents,signal){const body=new FormData();body.append('edit',new Blob([JSON.stringify(edit)],{type:'application/json'}));for(const file of photos)body.append('photos',file);for(const key of ['ownership','idCard','idCardBack','fireSafety'])if(documents[key])body.append(key,documents[key]);return registration(await request(`/${id}/resubmit`,{basePath,method:'POST',body,signal}));},
 propertyPhoto(id,signal){return request(`/photos/${id}`,{basePath,signal,responseType:'blob'});},
 lookup(input,signal){return request('/location/resolve',{basePath,method:'POST',body:{input},signal});}
};
