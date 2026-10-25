import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import { emptyRoom,editRoom,roomPayload,validateRoom } from '../src/services/rooms.js';
import {hostApi} from '../src/services/host.js';
const types=[{roomTypeId:12,price:2400000}];
const valid=()=>({...emptyRoom('12'),roomNumber:' p.101 '});
test('room creation must select an existing linked type and has no sample room number',()=>{
  assert.equal(emptyRoom().roomNumber,'');assert.ok(validateRoom(emptyRoom(),types).roomTypeId);assert.deepEqual(validateRoom(valid(),types),{});
  assert.ok(validateRoom({...valid(),roomTypeId:'999'},types).roomTypeId);
});
test('room fields and optional integer custom prices are validated',()=>{
  for(const [key,value]of [['roomNumber','<P.101>'],['roomNumber','x'.repeat(31)],['floor',' '],['status','unknown'],['customPrice','-1'],['customPrice','1.5']])assert.ok(validateRoom({...valid(),overridePrice:true,customPrice:'2400000',[key]:value},types)[key]);
  assert.ok(validateRoom(valid(),[{roomTypeId:12,price:null}]).customPrice);
  assert.deepEqual(roomPayload(valid()),{roomTypeId:12,roomNumber:'P.101',floor:'Tầng 1',status:'VACANT',customPrice:null});
  assert.equal(editRoom({roomTypeId:12,roomNumber:'P.102',floor:'Tầng 1',status:'OCCUPIED',customPrice:2500000}).overridePrice,true);
});
const original={fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage};
globalThis.sessionStorage={getItem:()=> 'room-token'};globalThis.localStorage={getItem:()=>null};after(()=>Object.assign(globalThis,original));
const room={roomId:34,propertyId:1,roomTypeId:12,roomNumber:'P.101',floor:'Tầng 1',status:'VACANT',amenities:[]};
test('room list, save and delete use real owner endpoints',async()=>{
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/host/rooms?propertyId=1&roomTypeId=12');assert.equal(options.headers.Authorization,'Bearer room-token');return new Response(JSON.stringify({success:true,data:{properties:[],roomTypes:[],pendingRegistrationCount:0,rooms:[room]}}));};
  assert.equal((await hostApi.rooms(undefined,1,12)).rooms[0].roomId,34);
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/host/rooms');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),roomPayload(valid()));return new Response(JSON.stringify({success:true,data:room}));};
  assert.equal((await hostApi.saveRoom(null,roomPayload(valid()))).roomId,34);
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/host/rooms/34');assert.equal(options.method,'PUT');return new Response(JSON.stringify({success:true,data:room}));};await hostApi.saveRoom(34,roomPayload(valid()));
  globalThis.fetch=async(url,options)=>{assert.equal(options.method,'DELETE');return new Response(JSON.stringify({success:true,data:null}));};await hostApi.deleteRoom(34);
});
test('invalid filters and server failures never become empty room data',async()=>{
  await assert.rejects(hostApi.rooms(undefined,'bad'),error=>error.status===400);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{}}));await assert.rejects(hostApi.rooms(),error=>error.status===502);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Duplicate room'}),{status:409});await assert.rejects(hostApi.saveRoom(null,roomPayload(valid())),error=>error.status===409);
});
