import {appendFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

// Keep upstream socket failures separate from application HTTP 500s. No JWT,
// query strings, request bodies or response content are written to this log.
export function proxyFailureRecord(error,request,target){
  let origin='invalid-target';try{origin=new URL(target).origin;}catch{}
  return {at:new Date().toISOString(),method:request.method,path:(request.url||'').split('?')[0],target:origin,code:error.code||'UPSTREAM_ERROR'};
}
export function configureApiProxy(proxy,target){
  const directory=resolve(process.cwd(),'../logs');
  proxy.on('error',(error,request)=>{
    const record=proxyFailureRecord(error,request,target);
    void mkdir(directory,{recursive:true}).then(()=>appendFile(resolve(directory,'local-proxy-errors.log'),JSON.stringify(record)+'\n')).catch(()=>{});
  });
}
