import { request } from './auth.js';
const basePath='/api/notifications';
export const noticesApi={
 feed:(filters={},signal)=>request('?'+new URLSearchParams(filters),{basePath,signal}),
 read:id=>request(`/${id}/read`,{basePath,method:'PUT'}),
 readAll:()=>request('/read-all',{basePath,method:'PUT'}),
 viewing:(id,signal)=>request(`/${id}/viewing`,{basePath,signal}),
};
