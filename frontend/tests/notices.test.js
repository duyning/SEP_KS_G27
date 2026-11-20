import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {noticesApi} from '../src/services/notices.js';
const original={fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage};
globalThis.sessionStorage={getItem:()=> 'notice-token'};globalThis.localStorage={getItem:()=>null};after(()=>Object.assign(globalThis,original));
test('notification cursor, category and subtype use authenticated API',async()=>{
 globalThis.fetch=async(url,options)=>{const parsed=new URL(url,'http://localhost');assert.equal(parsed.pathname,'/api/notifications');assert.equal(parsed.searchParams.get('kind'),'REPLY');assert.equal(parsed.searchParams.get('before'),'2026-11-20T10:00|n2');assert.equal(options.headers.Authorization,'Bearer notice-token');return new Response(JSON.stringify({success:true,data:{items:[],unreadCount:3}}));};
 assert.equal((await noticesApi.feed({category:'COMMUNITY',kind:'REPLY',before:'2026-11-20T10:00|n2'})).unreadCount,3);
});
test('read and read-all are persisted by PUT, not local-only flags',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push([url,options.method]);return new Response(JSON.stringify({success:true,data:null}));};
 await noticesApi.read('v12');await noticesApi.readAll();assert.deepEqual(calls,[['/api/notifications/v12/read','PUT'],['/api/notifications/read-all','PUT']]);
});
test('unauthorized viewing detail is surfaced instead of a fake dialog',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Không tìm thấy thông báo'}),{status:404});
 await assert.rejects(noticesApi.viewing('v999'),error=>error.status===404);
});
