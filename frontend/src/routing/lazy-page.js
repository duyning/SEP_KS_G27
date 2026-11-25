import {lazy} from 'react';

export function isPageLoadError(error){
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module|Unable to preload CSS for/i.test(error?.message||'');
}

// Retry only loading failures, before React.lazy retains the rejected promise.
// Never reload automatically or retry a component's syntax/runtime exception.
export async function loadPageWithRetry(load,{delays=[350,1000],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
  for(let attempt=0;;attempt++){
    try{return await load();}
    catch(error){
      if(!isPageLoadError(error)||attempt>=delays.length)throw error;
      await wait(delays[attempt]);
    }
  }
}

export const lazyPage=load=>lazy(()=>loadPageWithRetry(load));
