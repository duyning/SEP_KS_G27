import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { getApiBase } from './accommodations';
import type { RegistrationFiles, RegistrationValues } from './property-registration';
export async function uploadRegistration(values:RegistrationValues,files:RegistrationFiles,token:string,signal:AbortSignal):Promise<number>{
 const details=new File(Paths.cache,`hlrcs-registration-${Date.now()}.json`);try{
 await details.write(JSON.stringify(values));const form=new FormData();form.append('details',details,'details.json');
 for(const photo of files.photos)form.append('photos',new File(photo.uri),photo.fileName||'photo.jpg');
 for(const key of ['ownership','idCard','fireSafety'] as const){const asset=files[key];if(asset)form.append(key,new File(asset.uri),asset.fileName||key+'.jpg');}
 const response=await fetch(`${getApiBase()}/api/host/property-registrations`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form,signal});const result=await response.json().catch(()=>null);if(!response.ok||result?.success!==true||!Number.isSafeInteger(result?.data?.registrationId))throw new Error(result?.message||'Chưa thể gửi hồ sơ đăng ký.');return result.data.registrationId;
 }finally{try{if(details.exists)await details.delete();}catch{/* Do not report a committed registration as failed because cache cleanup failed. */}}
}
