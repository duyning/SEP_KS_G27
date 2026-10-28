import test from 'node:test';
import assert from 'node:assert/strict';
import {filterPublicProperties,normalizeLocation,fetchPublicProperties,homeRoomType,homeDetailUrl} from '../src/services/public-properties.js';
const rows=[{propertyId:1,commune:'Tân Xã',propertyType:'Chung cư mini',minPrice:2200000,amenities:['wifi'],roomTypes:[{amenities:['airConditioner']}]},{propertyId:2,address:'Bình Yên',minPrice:null,amenities:[],roomTypes:[]}];

test('Home detail links use a real available room type with matching card pricing',()=>{
 const property={propertyId:9,roomTypes:[{roomTypeId:2,price:1000000,area:20,vacantRooms:0},{roomTypeId:8,price:3000000,area:25,vacantRooms:1},{roomTypeId:7,price:2500000,area:22,vacantRooms:2}]};
 assert.equal(homeRoomType(property).roomTypeId,7);
 assert.equal(homeRoomType(property).price,2500000);
 assert.equal(homeDetailUrl(property),'/properties/detail?propertyId=9&roomTypeId=7');
 assert.equal(homeDetailUrl(property,true),'/properties/detail?propertyId=9&roomTypeId=7#host-contact');
 assert.equal(property.roomTypes[0].roomTypeId,2,'Never reorder API data in place');
});
test('Home can show sold-out types but never invents a link for an incomplete property',()=>{
 assert.equal(homeDetailUrl({propertyId:3,roomTypes:[]}),null);
 assert.equal(homeDetailUrl({propertyId:3,roomTypes:[{roomTypeId:2,price:0,area:25}]}),null);
 assert.equal(homeDetailUrl({propertyId:3,roomTypes:[{roomTypeId:2,price:2000000,area:25,vacantRooms:0}]}),'/properties/detail?propertyId=3&roomTypeId=2');
 assert.equal(homeDetailUrl({propertyId:'<script>',roomTypes:[{roomTypeId:2,price:2000000,area:25}]}),null);
});
test('Public listing filters use actual location, price and room amenities',()=>{
 assert.equal(normalizeLocation('Đường Tân Xã'),'duong tan xa');
 assert.deepEqual(filterPublicProperties(rows,{area:'tan-xa',price:'15-25',amenity:'airConditioner',type:'Chung cư mini'}),[rows[0]]);
 assert.deepEqual(filterPublicProperties(rows,{area:'binh-yen'}),[rows[1]]);
 assert.equal(filterPublicProperties(rows,{price:'under-15'}).length,0);
 assert.equal(filterPublicProperties(rows,{amenity:'balcony'}).length,0);
});
test('Home makes anonymous API requests and never falls back to fixtures',async()=>{
 const previous=globalThis.fetch;
 try{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/public/properties');assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,undefined);return {ok:true,json:async()=>({success:true,data:[]})};};
 assert.deepEqual(await fetchPublicProperties(),[]);
 globalThis.fetch=async()=>({ok:false,json:async()=>({success:false})});
 await assert.rejects(fetchPublicProperties(),/Chưa thể tải/);
 }finally{globalThis.fetch=previous;}
});
