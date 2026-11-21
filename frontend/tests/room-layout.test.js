import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRoomLayout,layoutIssues,nextRoomSequence,applyLayoutPattern,copyFloorLayout,selectLayoutNumbers} from '../src/services/room-layout.js';

test('generate many floors with leading zeroes and skip existing room numbers without overwriting',()=>{
 const result=generateRoomLayout({from:1,to:20,count:20,start:1,prefix:'P.'},['p.101']);
 assert.equal(result.rooms.length,399);assert.equal(result.skipped,1);
 assert.equal(result.rooms[0].roomNumber,'P.102');assert.equal(result.rooms.at(-1).roomNumber,'P.2020');
 assert.ok(result.rooms.every(row=>row.roomTypeId===null));
 assert.throws(()=>generateRoomLayout({from:1,to:200,count:100,start:1}));
 assert.throws(()=>generateRoomLayout({from:1,to:2,count:-1,start:1}));
});

test('select arbitrary pasted room numbers across floors and keep unique draft identities after renaming',()=>{
 const rows=generateRoomLayout({from:1,to:3,count:4}).rooms;
 const selected=selectLayoutNumbers(rows,'101, 104\n201;304,101');
 assert.equal(selected.size,4);assert.deepEqual(rows.filter(row=>selected.has(row.id)).map(row=>row.roomNumber),['101','104','201','304']);
 assert.throws(()=>selectLayoutNumbers(rows,'101,999'));
 const another=generateRoomLayout({from:1,to:1,count:1}).rooms;
 assert.notEqual(rows[0].id,another[0].id);
 assert.throws(()=>generateRoomLayout({from:'',to:1,count:4}));
});
test('arbitrary selections and repeating three-type patterns leave other rooms untouched',()=>{
 const rows=generateRoomLayout({from:1,to:1,count:6}).rooms,ids=new Set(rows.slice(0,5).map(row=>row.id));
 const assigned=applyLayoutPattern(rows,ids,[1,2,3]);
 assert.deepEqual(assigned.map(row=>row.roomTypeId),[1,2,3,1,2,null]);
 assert.ok(rows.every(row=>row.roomTypeId===null));
 assert.throws(()=>applyLayoutPattern(rows,ids,[]));
});
test('copy by position preserves target assignments and names unless overwrite is chosen',()=>{
 let rows=generateRoomLayout({from:1,to:3,count:4}).rooms;
 rows=applyLayoutPattern(rows,new Set(rows.filter(row=>row.floor==='Tầng 1').map(row=>row.id)),[1,2,3]);
 const copied=copyFloorLayout(rows,'Tầng 1',['Tầng 2','Tầng 3']);
 assert.deepEqual(copied.filter(row=>row.floor==='Tầng 2').map(row=>row.roomTypeId),[1,2,3,1]);
 assert.deepEqual(copied.map(row=>row.roomNumber),rows.map(row=>row.roomNumber));
 const shorter=rows.slice(0,-1);
 shorter[4]={...shorter[4],roomNumber:'Tên riêng',roomTypeId:9};
 const kept=copyFloorLayout(shorter,'Tầng 1',['Tầng 2','Tầng 3']);
 assert.deepEqual(kept.filter(row=>row.floor==='Tầng 3').map(row=>row.roomTypeId),[1,2,3]);
 assert.equal(kept[4].roomTypeId,9);
 const overwritten=copyFloorLayout(shorter,'Tầng 1',['Tầng 2'],true);
 assert.equal(overwritten[4].roomNumber,'Tên riêng');
 assert.equal(overwritten[4].roomTypeId,1);
 assert.ok(rows.filter(row=>row.floor==='Tầng 2').every(row=>row.roomTypeId===null));
});
test('validate missing/foreign types, duplicated edited names and collisions with existing inventory',()=>{
 const rows=generateRoomLayout({from:1,to:1,count:3}).rooms;
 rows[0].roomTypeId=1;rows[1].roomTypeId=99;rows[2].roomTypeId=1;rows[2].roomNumber='101';
 const issues=layoutIssues(rows,[{roomTypeId:1,price:2000000}],['102']);
 assert.ok(issues.get(rows[1].id).duplicate);
 assert.equal(issues.get(rows[1].id).assigned,false);
 assert.ok(issues.get(rows[0].id).duplicate);
 assert.ok(issues.get(rows[2].id).duplicate);
 assert.deepEqual(layoutIssues(rows.slice(0,1),[{roomTypeId:1,price:2000000}]).get(rows[0].id).messages,[]);
 assert.deepEqual(layoutIssues(rows.slice(0,1),[{roomTypeId:1,price:0}]).get(rows[0].id).messages,['Loại phòng chưa có giá hợp lệ']);
});
test('append follows the floor and chosen prefix, with explicit odd or even generation',()=>{
 const saved=[{floor:'2',roomNumber:'P.204'},{floor:'Tầng 2',roomNumber:'P.207'},{floor:'Tầng 3',roomNumber:'P.299'}];
 const start=nextRoomSequence(saved,'Tầng 2','p.');
 assert.equal(start,8);
 const appended=generateRoomLayout({from:2,to:2,count:2,start,prefix:'P.',numbering:'ODD',floorLabel:'2'},saved.map(row=>row.roomNumber));
 assert.deepEqual(appended.rooms.map(({roomNumber,floor})=>[roomNumber,floor]),[['P.209','2'],['P.211','2']]);
 assert.deepEqual(generateRoomLayout({from:1,to:1,count:2,numbering:'EVEN'}).rooms.map(row=>row.roomNumber),['102','104']);
});
