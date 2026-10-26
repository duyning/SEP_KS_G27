import {request} from './auth.js';
const basePath='/api/host-applications';
export const hostApplicationApi={
 current:signal=>request('/current',{basePath,signal}),
 submit:body=>request('',{basePath,method:'POST',body}),
};
