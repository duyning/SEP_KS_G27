import test from 'node:test';
import assert from 'node:assert/strict';
import { readCommunityStream, startCommunityRealtime } from '../src/services/community-live.js';

test('SSE decoder handles partial UTF-8 frames, CRLF and multiple events', async () => {
  const bytes = new TextEncoder().encode('event: community\r\ndata:{"type":"heartbeat"}\r\n\r\nevent: community\ndata:{"type":"posts","postId":7}\n\ndata:{"type":"notifications","label":"Cộng đồng"}\n\n');
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i+1)); controller.close(); } });
  const events = [];
  await readCommunityStream(stream, event => events.push(event), new AbortController().signal);
  assert.deepEqual(events, [{ type: 'posts', postId: 7 }, { type: 'notifications', label: 'Cộng đồng' }]);
});

test('Malformed frames do not prevent a later valid resync event', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data:broken\n\ndata:{"type":"resync"}\n\n')); controller.close(); } });
  const events = [];
  await readCommunityStream(stream, event => events.push(event), new AbortController().signal);
  assert.deepEqual(events, [{ type: 'resync' }]);
});

test('returning to a tab dispatches one server resync instead of duplicate refreshes and cancels the old stream',async()=>{
 const names=['window','document','navigator','fetch','sessionStorage','localStorage'];
 const originals=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 const browser=new EventTarget(),doc=new EventTarget();doc.hidden=false;
 Object.defineProperty(globalThis,'window',{configurable:true,value:browser});
 Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 globalThis.sessionStorage=globalThis.localStorage={getItem:()=>null};
 const signals=[],events=[];let nextEvent;
 browser.addEventListener('hlrcs:community-live',e=>{events.push(e.detail);nextEvent?.();});
 globalThis.fetch=async(_url,{signal})=>{
  signals.push(signal);
  return {ok:true,status:200,headers:new Headers({'content-type':'text/event-stream'}),body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data:{"type":"resync"}\n\n'));signal.addEventListener('abort',()=>{try{c.error(new DOMException('Aborted','AbortError'));}catch{}},{once:true});}})};
 };
 let stop;
 try{
  const first=new Promise(resolve=>{nextEvent=resolve;});stop=startCommunityRealtime();await first;
  assert.equal(events.length,1);
  const second=new Promise(resolve=>{nextEvent=resolve;});doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(events.length,1,'Visibility itself must not emit another resync');
  await second;assert.equal(events.length,2);assert.equal(signals.length,2);assert.equal(signals[0].aborted,true);
  stop();assert.equal(signals[1].aborted,true);
 }finally{stop?.();for(const [name,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});
