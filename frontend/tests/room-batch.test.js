import test from 'node:test';
import assert from 'node:assert/strict';
import {blankRoomGroup,generateRoomDrafts,validateRoomDrafts,roomBatchPayload} from '../src/services/room-batch.js';
test('new groups contain no generated sample rooms',()=>{assert.deepEqual(blankRoomGroup(),{floor:'',prefix:'P.',start:'',count:''});assert.ok(generateRoomDrafts([blankRoomGroup()]).errors.groups[0]);});
test('groups generate ordered editable room drafts and preserve zero padding',()=>{
 const result=generateRoomDrafts([{floor:' Tầng 1 ',prefix:'p.',start:'001',count:'2'},{floor:'Khu B',prefix:'B-',start:'20',count:'1'}]);
 assert.deepEqual(result.rows,[{roomNumber:'P.001',floor:'Tầng 1'},{roomNumber:'P.002',floor:'Tầng 1'},{roomNumber:'B-20',floor:'Khu B'}]);
 assert.deepEqual(validateRoomDrafts(result.rows),{rows:{},list:''});
});
test('empty lists, excessive batches and invalid numeric configuration are blocked',()=>{
 assert.ok(validateRoomDrafts([]).list);
 for(const count of ['0','201','1.5','-1'])assert.ok(generateRoomDrafts([{floor:'A',prefix:'',start:'1',count}]).errors.groups[0].count);
 assert.ok(generateRoomDrafts([{floor:'A',prefix:'',start:'999999999',count:'2'}]).errors.groups[0].start);
 assert.ok(generateRoomDrafts(Array.from({length:2},()=>({floor:'A',prefix:'',start:'1',count:'101'}))).errors.list);
});
test('duplicate preview and existing database room names are blocked case insensitively',()=>{
 const errors=validateRoomDrafts([{roomNumber:' p.101 ',floor:'1'},{roomNumber:'P.101',floor:'2'},{roomNumber:'b-2',floor:''}],['B-2']);
 assert.ok(errors.rows[0].roomNumber);assert.ok(errors.rows[1].roomNumber);assert.ok(errors.rows[2].roomNumber);assert.ok(errors.rows[2].floor);
});
test('only the final edited preview becomes the API payload',()=>{
 assert.deepEqual(roomBatchPayload([{roomNumber:' a.03 ',floor:' Tầng 3 ',status:'OCCUPIED',propertyId:9}]),{rooms:[{roomNumber:'A.03',floor:'Tầng 3'}]});
});
