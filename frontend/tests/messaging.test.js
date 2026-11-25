import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeMessages,messagePayload,messagingApi} from '../src/services/messaging.js';

test('realtime and retry results merge without duplicates or changing order',()=>{
 const old=[{sequence:1,id:10},{sequence:2,id:11}],latest=[{sequence:2,id:11},{sequence:3,id:12}];
 assert.deepEqual(mergeMessages(old,latest).map(m=>m.sequence),[1,2,3]);
 assert.deepEqual(mergeMessages(old,[{sequence:80,id:99}]).map(m=>m.sequence),[80]);
 assert.deepEqual(mergeMessages(old,[]),old);
});
test('retry payload has a stable client key and only supported reference fields',()=>{
 const payload=messagePayload('  hello  ',{kind:'COMMUNITY_POST',referenceId:8,title:'Do not trust this title',url:'javascript:bad'},'fixed-key');
 assert.deepEqual(payload,{clientMessageId:'fixed-key',content:'hello',context:{kind:'COMMUNITY_POST',referenceId:8}});
 assert.equal(messagePayload('text',null,'retry-key').clientMessageId,'retry-key');
});
test('messaging API uses authenticated routes and stable send payload',async()=>{
 const requests=[];globalThis.sessionStorage={getItem:()=> 'test-token',removeItem(){}};globalThis.localStorage={getItem:()=>null,removeItem(){}};
 const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({success:true,data:{id:1}})};};
 try{
  await messagingApi.open(7,{kind:'COMMUNITY_POST',referenceId:8});
  await messagingApi.send(1,messagePayload('Hello',null,'stable-key'));
  await messagingApi.history(1,50);
  await messagingApi.read(1,49);
  assert.equal(requests[0].url,'/api/messaging/conversations');
  assert.equal(requests[0].options.headers.Authorization,'Bearer test-token');
  assert.equal(JSON.parse(requests[1].options.body).clientMessageId,'stable-key');
  assert.equal(requests[2].url,'/api/messaging/conversations/1/messages?before=50');
  assert.deepEqual(JSON.parse(requests[3].options.body),{through:49});
 }finally{globalThis.fetch=original;}
});

test('chat GET recovers from a temporary fetch failure while sends are never retried automatically',async()=>{
 const original=globalThis.fetch;let attempts=0;
 try{
  globalThis.fetch=async()=>{if(++attempts===1)throw new TypeError('Failed to fetch');return {ok:true,json:async()=>({success:true,data:{items:[]}})};};
  assert.deepEqual(await messagingApi.inbox(),{items:[]});assert.equal(attempts,2);
  attempts=0;globalThis.fetch=async()=>{attempts++;throw new TypeError('Failed to fetch');};
  await assert.rejects(messagingApi.send(1,messagePayload('draft',null,'same-key')),error=>error.status===0);
  assert.equal(attempts,1);
  const controller=new AbortController();controller.abort();attempts=0;
  await assert.rejects(messagingApi.history(1,null,controller.signal),error=>error.name==='AbortError');assert.equal(attempts,0);
 }finally{globalThis.fetch=original;}
});

test('media sends preserve reply and retry IDs in multipart while private file reads use authentication',async()=>{
 const original=globalThis.fetch,requests=[];
 globalThis.sessionStorage={getItem:()=> 'private-token',removeItem(){}};globalThis.localStorage={getItem:()=>null,removeItem(){}};
 globalThis.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,blob:async()=>new Blob(['private']),json:async()=>({success:true,data:{id:1}})};};
 try{
  const file=new File(['image bytes'],'ban.png',{type:'image/png'}),payload=messagePayload('',null,'same-key',27);
  await messagingApi.send(3,payload,undefined,[file]);
  const sent=requests[0].options;
  assert.ok(sent.body instanceof FormData);assert.equal(sent.headers['Content-Type'],undefined);
  assert.deepEqual(JSON.parse(await sent.body.get('details').text()),{clientMessageId:'same-key',content:'',context:null,replyToId:27});
  assert.equal(sent.body.get('files').name,'ban.png');
  await messagingApi.attachment(3,8);
  assert.equal(requests[1].url,'/api/messaging/conversations/3/attachments/8');assert.equal(requests[1].options.headers.Authorization,'Bearer private-token');
 }finally{globalThis.fetch=original;}
});
