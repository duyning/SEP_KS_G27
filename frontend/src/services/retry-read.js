// Only use for idempotent reads. Never retry a write automatically here.
export async function retryRead(load, signal, wait = ms => new Promise((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Aborted','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
})) {
  for(let attempt=0;;attempt++){
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');
    try{return await load();}catch(error){
      if(error.name==='AbortError'||attempt>=2||!(error.status===0||error.status===200||error.status>=500&&error.status<=599))throw error;
      await wait(attempt===0?500:1500);
    }
  }
}
