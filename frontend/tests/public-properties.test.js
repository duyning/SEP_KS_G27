import test from 'node:test';
import assert from 'node:assert/strict';
import {filterPublicProperties,normalizeLocation,fetchPublicProperties} from '../src/services/public-properties.js';
const rows=[{propertyId:1,commune:'Tân Xã',propertyType:'Chung cư mini',minPrice:2200000,amenities:['wifi'],roomTypes:[{amenities:['airConditioner']}]},{propertyId:2,address:'Bình Yên',minPrice:null,amenities:[],roomTypes:[]}];
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
