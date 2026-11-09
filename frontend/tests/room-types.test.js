import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_AMENITIES, ROOM_AMENITY_GROUPS, editRoomType, emptyRoomType, roomTypePayload, validateRoomPhotos, validateRoomType } from '../src/services/room-types.js';
const valid = () => ({...emptyRoomType(),roomType:'Studio ban công',areaSqm:'25.5',price:'2200000',capacity:'2',amenities:['wifi']});

test('expanded room amenities validate, persist in payloads and restore for editing',()=>{
  const keys=ROOM_AMENITIES.map(([key])=>key);
  const grouped=ROOM_AMENITY_GROUPS.flatMap(([,values])=>values);
  assert.deepEqual([...grouped].sort(),[...keys].sort());
  assert.equal(new Set(grouped).size,keys.length);
  const data={...valid(),amenities:keys};
  assert.deepEqual(validateRoomType(data),{});
  assert.deepEqual(roomTypePayload(data,12).amenities,keys);
  assert.deepEqual(editRoomType({...roomTypePayload(data,12),images:[]}).amenities,keys);
  assert.ok(validateRoomType({...data,amenities:[...keys,'unknown']}).amenities);
  assert.ok(validateRoomType({...data,amenities:['ceilingFan','ceilingFan']}).amenities);
});
test('room type starts without sample content and requires name, area, capacity and price',()=>{
  const form=emptyRoomType();
  assert.deepEqual(form.amenities,[]);
  assert.equal(form.imageUrl,'');
  assert.deepEqual(Object.keys(validateRoomType(form)).sort(),['areaSqm','price','roomType']);
  assert.deepEqual(validateRoomType(valid()),{});
});
test('room type bounds, integer money, HTTPS image and amenities are validated',()=>{
  for(const [key,value] of [['roomType','  '],['areaSqm','0'],['areaSqm','1e2'],['areaSqm','25.555'],['capacity','21'],['price','-1'],['deposit','1.5'],['waterPrice','free'],['imageUrl','javascript:alert(1)'],['imageUrl','https://a:b@example.com/x'],['description','x'.repeat(2001)],['amenities',['fake']]]) assert.ok(validateRoomType({...valid(),[key]:value})[key],key);
  assert.deepEqual(validateRoomType({...valid(),deposit:'0',imageUrl:'https://example.com/image.jpg'}),{});
});
test('payload preserves optional unknown fees as null, not invented free fees',()=>{
  const payload=roomTypePayload(valid(),12);
  assert.equal(payload.propertyId,12);
  assert.equal(payload.price,2200000);
  assert.equal(payload.areaSqm,25.5);
  assert.equal(payload.deposit,null);
  assert.equal(payload.electricityPrice,null);
  assert.equal(roomTypePayload({...valid(),deposit:'0'},12).deposit,0);
});

test('multi-image validation limits size, count, type and never serializes files into JSON',()=>{
  const file=new File(['image'],'room.png',{type:'image/png'});
  assert.equal(validateRoomPhotos([file]),'');
  assert.ok(validateRoomPhotos(Array(11).fill(file)));
  assert.ok(validateRoomPhotos([new File(['bad'],'room.svg',{type:'image/svg+xml'})]));
  assert.ok(validateRoomPhotos([new File([],'empty.png',{type:'image/png'})]));
  assert.ok(validateRoomPhotos([{type:'image/png',size:5*1024*1024+1}]));
  const form=editRoomType({roomType:'Studio',price:2200000,areaSqm:25,capacity:2,images:[{imageId:5}],amenities:['wifi']});
  form.photos=[file];
  const payload=roomTypePayload(form,12);
  assert.deepEqual(payload.retainedImageIds,[5]);assert.equal('photos' in payload,false);assert.equal('retainedImages' in payload,false);
});
