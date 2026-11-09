import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {favoritesApi} from '../src/services/favorites.js';
const original=globalThis.fetch;
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();globalThis.window=new EventTarget();
after(()=>{globalThis.fetch=original;});
const favorite={favoriteId:8,roomTypeId:34,createdAt:'2026-11-05T10:00:00',available:false,accommodation:null};
const ok=data=>new Response(JSON.stringify({success:true,data}));
test('favorites use authenticated room type references and owned favorite IDs',async()=>{
 sessionStorage.setItem('hlrcs_access_token','test-member');const signal=new AbortController().signal;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/favorites');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer test-member');assert.deepEqual(JSON.parse(options.body),{roomTypeId:34});assert.equal(options.signal,signal);return ok(favorite)};
 assert.deepEqual(await favoritesApi.save(34,signal),favorite);
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/favorites/8');assert.equal(options.method,'DELETE');assert.equal(options.body,undefined);return ok(null)};
 await favoritesApi.remove(8);
});
test('favorites preserve pagination, unavailable entries and current server saved state',async()=>{
 const page={items:[favorite],page:1,size:6,totalElements:7,totalPages:2};
 globalThis.fetch=async url=>{assert.equal(url,'/api/favorites?page=1&size=6');return ok(page)};
 assert.deepEqual(await favoritesApi.list(1),page);
 globalThis.fetch=async url=>{assert.equal(url,'/api/favorites/state?roomTypeIds=34,35');return ok({items:[{roomTypeId:34,favoriteId:8}],total:7})};
 assert.deepEqual(await favoritesApi.state([34,35]),{items:[{roomTypeId:34,favoriteId:8}],total:7});
});
test('errors, offline and malformed payloads never become fake saved state',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Không có quyền'}),{status:403});
 await assert.rejects(favoritesApi.save(34),e=>e.status===403);
 globalThis.fetch=async()=>{throw Error('Offline')};await assert.rejects(favoritesApi.list(),e=>e.status===0);
 globalThis.fetch=async()=>ok({items:[{...favorite,available:false,accommodation:{private:'must not render'}}],page:0,size:6,totalElements:1,totalPages:1});
 await assert.rejects(favoritesApi.list(),e=>e.status===502);
 globalThis.fetch=async()=>ok({...favorite,roomTypeId:99});await assert.rejects(favoritesApi.save(34),e=>e.status===502);
 globalThis.fetch=async()=>ok({items:[],total:'7'});await assert.rejects(favoritesApi.state([]),e=>e.status===502);
});
