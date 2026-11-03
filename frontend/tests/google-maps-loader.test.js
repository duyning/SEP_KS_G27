import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const keys=['document','google','dispatchEvent','gm_authFailure','__hlrcsGoogleMapsReady'];
const originals=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
afterEach(()=>{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
let sequence=0;
async function loader(){
 const source=(await readFile(new URL('../src/services/google-maps.js',import.meta.url),'utf8'))
  .replace(/^export const GOOGLE_MAPS_KEY = .*;$/m,"export const GOOGLE_MAPS_KEY = 'test-only';");
 return import(`data:text/javascript;base64,${Buffer.from(source+'\n// isolated test '+(++sequence)).toString('base64')}`);
}
function browser(){
 const scripts=[],events=[];
 globalThis.document={createElement(){return {remove(){this.removed=true;}};},head:{append(script){scripts.push(script);}}};
 globalThis.dispatchEvent=event=>{events.push(event.type);return true;};
 delete globalThis.google;
 return {scripts,events};
}

test('auth rejection blocks reuse of the SDK namespace left behind by Google',async()=>{
 const {scripts,events}=browser();const {loadGoogleMaps}=await loader();
 const pending=loadGoogleMaps();assert.equal(scripts.length,1);
 const maps={importLibrary:async()=>({})};globalThis.google={maps};
 globalThis.__hlrcsGoogleMapsReady();assert.equal(await pending,maps);
 globalThis.gm_authFailure();assert.deepEqual(events,['hlrcs:google-maps-auth-error']);
 assert.equal(globalThis.google.maps,maps,'The rejected SDK still exists, just as it does in a real browser');
 await assert.rejects(loadGoogleMaps(),/Bản đồ chưa khả dụng/);
 assert.equal(scripts.length,1,'Do not reconstruct a map from the rejected SDK on the next step');
});

test('temporary script load failure permits retry and shares a pending load',async()=>{
 const {scripts}=browser();const {loadGoogleMaps}=await loader();
 const first=loadGoogleMaps();assert.equal(first,loadGoogleMaps());
 scripts[0].onerror();await assert.rejects(first,/Không tải được Google Maps/);assert.equal(scripts[0].removed,true);
 const retry=loadGoogleMaps();assert.equal(scripts.length,2);
 const maps={importLibrary:async()=>({})};globalThis.google={maps};globalThis.__hlrcsGoogleMapsReady();
 assert.equal(await retry,maps);
});
