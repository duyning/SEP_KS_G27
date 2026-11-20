import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiBase } from './accommodations';
import { HostError } from './host';
export async function updateHostType(id:number,details:unknown,token:string,signal:AbortSignal){
 const file=new File(Paths.cache,`hlrcs-room-type-${Date.now()}.json`);
 try{await file.write(JSON.stringify(details));const form=new FormData();form.append('details',file,'details.json');
 const response=await fetch(`${getApiBase()}/api/host/room-types/${id}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`},body:form,signal});const result=await response.json().catch(()=>null);if(!response.ok||result?.success!==true)throw new HostError(result?.message||'Chưa thể lưu loại phòng.',response.status);return result.data;
 }finally{try{if(file.exists)await file.delete();}catch{/* Cache cleanup must not mask a committed update. */}}
}
