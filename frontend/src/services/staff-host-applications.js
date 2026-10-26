import {request} from './auth.js';
const basePath='/api/host-applications';
export const staffHostApi={
 list:async(filters={},signal)=>{const result=await request('?'+new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==undefined&&value!==null)),{basePath,signal});if(!Array.isArray(result?.content)||!result.stats)throw Error('Dữ liệu từ backend chưa đúng phiên bản. Vui lòng khởi động lại backend sau khi cập nhật code.');return result;},
 detail:(id,signal)=>request('/'+id,{basePath,signal}),
 review:(id,body)=>request('/'+id+'/review',{basePath,method:'POST',body}),
};
