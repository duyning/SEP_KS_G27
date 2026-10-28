import test from 'node:test';
import assert from 'node:assert/strict';
import {toDetailPrototype} from '../src/services/detail-prototype.js';
const base={propertyId:8,roomTypeId:2,propertyName:'Nhà trọ thật',roomTypeName:'Studio',address:'Tân Xã, Hà Nội',price:3100000,areaSqm:28,capacity:2,availableRooms:0,gallery:[],imageUrl:null,amenities:[],propertyAmenities:[],selectedRules:[],reviews:{totalReviews:0,averageRating:null,ratingCounts:[0,0,0,0,0],latest:[]},publicContact:null};
test('top gallery uses property photos exclusively, independently of the selected room type',()=>{
 const propertyGallery=[{url:'/api/public/properties/photos/10',caption:'Nhà trọ'}];
 const roomGallery=[{url:'/api/properties/8/room-types/2/images/9'}];
 assert.deepEqual(toDetailPrototype({...base,propertyGallery,gallery:roomGallery}).gallery,propertyGallery);
 assert.equal(toDetailPrototype({...base,propertyGallery,gallery:roomGallery}).image,propertyGallery[0].url);
 assert.deepEqual(toDetailPrototype({...base,gallery:roomGallery,imageUrl:roomGallery[0].url}).gallery,[]);
 assert.equal(toDetailPrototype({...base,gallery:roomGallery,imageUrl:roomGallery[0].url}).image,null);
});
test('detail preserves unknown fees, contacts and reviews rather than filling prototype values',()=>{const room=toDetailPrototype(base);assert.equal(room.priceDisplay,'3.100.000 đ');assert.equal(room.electric,'Chưa cập nhật');assert.equal(room.deposit,'Chưa cập nhật');assert.equal(room.estimateDisplay,'Cần xác nhận thêm');assert.equal(room.hostInfo.phone,'');assert.equal(room.hostInfo.zalo,'');assert.equal(room.rating,'—');assert.deepEqual(room.reviews,[]);assert.deepEqual(room.gallery,[]);assert.equal(room.availability,'Hết phòng')});
test('detail uses approved public contacts and exact known charges, including a zero deposit',()=>{const room=toDetailPrototype({...base,deposit:0,electricityPrice:0,publicContact:{phone:'0912345678',zaloPhone:'+84987654321'},reviews:{totalReviews:2,averageRating:4.5,latest:[{reviewId:4,content:'Nội dung thật'}]}});assert.equal(room.deposit,'0 đ');assert.equal(room.electric,'0 đ/kWh');assert.equal(room.estimateDisplay,'3.100.000 đ');assert.equal(room.hostInfo.phone,'0912345678');assert.equal(room.hostInfo.zalo,'84987654321');assert.equal(room.rating,'4.5');assert.equal(room.reviews[0].content,'Nội dung thật')});
test('database description and unknown amenity text remain text without HTML interpretation',()=>{const room=toDetailPrototype({...base,description:'<img src=x onerror=alert(1)>',amenities:['unrecognizedAmenity'],selectedRules:['quietHours']});assert.equal(room.description,'<img src=x onerror=alert(1)>');assert.ok(room.amenities.includes('unrecognizedAmenity'));assert.ok(room.rules.length>0)});
