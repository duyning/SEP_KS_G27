import { request } from './auth.js';
import {retryRead} from './retry-read.js';
const basePath='/api/messaging';
const call=(path,options={})=>request(path,{basePath,...options});
export const messagingApi={
  inbox:(page=0,q='',signal)=>retryRead(()=>call(`/conversations?page=${page}&q=${encodeURIComponent(q)}`,{signal}),signal),
  open:(recipientId,context,signal)=>call('/conversations',{method:'POST',body:{recipientId,context},signal}),
  history:(id,before,signal)=>retryRead(()=>call(`/conversations/${id}/messages${before?`?before=${before}`:''}`,{signal}),signal),
  send:(id,payload,signal,files=[])=>{
    let body=payload;
    if(files.length){body=new FormData();body.append('details',new Blob([JSON.stringify(payload)],{type:'application/json'}));files.forEach(file=>body.append('files',file));}
    return call(`/conversations/${id}/messages`,{method:'POST',body,signal});
  },
  attachment:(id,attachmentId,signal)=>call(`/conversations/${id}/attachments/${attachmentId}`,{responseType:'blob',signal}),
  read:(id,through,signal)=>call(`/conversations/${id}/read`,{method:'PUT',body:{through},signal}),
};
export function mergeMessages(current,incoming){
  if(!incoming.length)return current;
  // Reconnect after a long absence: start from a contiguous latest window.
  const last=current.at(-1)?.sequence;
  const base=last!=null&&incoming[0].sequence>last+1?[]:current;
  return [...new Map([...base,...incoming].map(m=>[m.sequence,m])).values()].sort((a,b)=>a.sequence-b.sequence);
}
export function messagePayload(text,context,key=crypto.randomUUID(),replyToId=null){
  return {clientMessageId:key,content:text.trim(),context:context?{kind:context.kind,referenceId:context.referenceId}:null,...(replyToId?{replyToId}:{})};
}
export const messageTime=value=>new Date(value).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
export const messageDay=value=>new Date(value).toLocaleDateString('vi-VN');
