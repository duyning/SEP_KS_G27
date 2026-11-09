import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {parseComparisonIds,comparisonRows,loadComparison} from '../src/services/room-comparison.js';
const original=globalThis.fetch;
after(()=>{globalThis.fetch=original;});
globalThis.sessionStorage={getItem:()=> 'comparison-test-token'};
globalThis.localStorage={getItem:()=>null};
const summary={propertyId:12,roomTypeId:34,propertyName:'Công khai',roomTypeName:'Studio',address:'Tân Xã',price:2000000,areaSqm:25,verificationStatus:'APPROVED',availableRooms:1,imageUrl:null};
const favorite={favoriteId:8,roomTypeId:34,createdAt:'2026-11-05T10:00:00',available:true,accommodation:summary};
const detail={summary,gallery:[],amenities:[],propertyAmenities:[],selectedRules:[],similar:[],reviews:{totalReviews:0,averageRating:null,ratingCounts:[0,0,0,0,0],latest:[]},publicContact:null};
const ok=data=>new Response(JSON.stringify({success:true,data}));

test('comparison accepts at most four unique positive safe IDs and rejects crafted oversized selections',()=>{
 assert.deepEqual(parseComparisonIds('1,2,3,4'),{ids:[1,2,3,4],error:''});
 assert.deepEqual(parseComparisonIds('1,1,2').ids,[1,2]);
 for(const value of ['1,2,3,4,5','0,2','-1,2','abc,2','1.2,2','9007199254740992,2'])assert.ok(parseComparisonIds(value).error);
});
test('reads the owned favorite before fetching current public detail, with authorization only on private API',async()=>{
 const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push(url);if(url==='/api/favorites/8'){assert.equal(options.headers.Authorization,'Bearer comparison-test-token');return ok(favorite);}assert.equal(options.headers.Authorization,undefined);return ok(detail);};
 const column=await loadComparison(8);
 assert.deepEqual(calls,['/api/favorites/8','/api/properties/12/room-types/34/details']);assert.equal(column.status,'ready');assert.equal(column.data.price,2000000);
});
test('hidden or other-account favorites and newly hidden detail yield no retained private or stale summary',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return ok({...favorite,available:false,accommodation:null});};
 assert.deepEqual(await loadComparison(8),{favoriteId:8,status:'unavailable'});assert.equal(calls,1);
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false}),{status:404});
 assert.deepEqual(await loadComparison(8),{favoriteId:8,status:'unavailable'});
 globalThis.fetch=async url=>url==='/api/favorites/8'?ok(favorite):new Response(JSON.stringify({success:false}),{status:404});
 assert.deepEqual(await loadComparison(8),{favoriteId:8,status:'unavailable'});
});
test('API errors are retryable errors; abort stays an abort',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Thử lại'}),{status:500});
 assert.deepEqual(await loadComparison(8),{favoriteId:8,status:'error',error:'Thử lại'});
 globalThis.fetch=async()=>{throw new DOMException('Aborted','AbortError');};
 await assert.rejects(loadComparison(8),error=>error.name==='AbortError');
});
test('cost comparison preserves missing fees and a zero deposit, highlights only actual comparable numbers',()=>{
 const columns=[{status:'ready',data:{...summary,deposit:0,capacity:null,amenities:['balcony'],propertyAmenities:[],selectedRules:[]}},
  {status:'ready',data:{...summary,price:2500000,areaSqm:30,deposit:null,capacity:2,amenities:[],propertyAmenities:[],selectedRules:[]}}];
 const rows=comparisonRows(columns),row=key=>rows.find(row=>row.key===key);
 assert.equal(row('price').cells[0].best,true);assert.equal(row('areaSqm').cells[1].best,true);
 assert.equal(row('deposit').cells[0].text,'0 đ');assert.equal(row('deposit').cells[1].text,'Chưa cập nhật');
 assert.equal(row('upfront').cells[0].text,'2.000.000 đ');assert.equal(row('upfront').cells[1].text,'Chưa cập nhật');assert.equal(row('upfront').cells[0].best,false);
 assert.equal(row('electricityPrice').different,false);assert.equal(row('amenity-balcony').different,true);assert.equal(row('amenity-balcony').cells[1].text,'Chưa ghi nhận');
 assert.equal(row('availableRooms').different,false);
});
