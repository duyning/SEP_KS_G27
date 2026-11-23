import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {vietmapLocation} from '../src/services/vietmap-location.js';
const previousFetch=globalThis.fetch;
after(()=>globalThis.fetch=previousFetch);
globalThis.sessionStorage={getItem:()=> 'fixture-token'};globalThis.localStorage={getItem:()=>null};
test('location search sends focus in latitude/longitude order to authenticated backend only',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/property-location/autocomplete');assert.equal(options.headers.Authorization,'Bearer fixture-token');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{text:'Nhà trọ',latitude:21.1,longitude:105.2});return new Response(JSON.stringify({success:true,data:[{refId:'auto:opaque+value',display:'Địa chỉ'}]}));};
 assert.equal((await vietmapLocation.autocomplete('Nhà trọ',[21.1,105.2]))[0].refId,'auto:opaque+value');
});
test('place preserves opaque reference and reverse preserves exact requested coordinates',async()=>{
 const data={latitude:21.0196169,longitude:105.5517238,places:[],warnings:[]};
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/property-location/place');assert.deepEqual(JSON.parse(options.body),{refId:'auto:opaque+value'});return new Response(JSON.stringify({success:true,data}));};
 assert.deepEqual(await vietmapLocation.place('auto:opaque+value'),data);
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/property-location/reverse');assert.deepEqual(JSON.parse(options.body),{latitude:data.latitude,longitude:data.longitude});return new Response(JSON.stringify({success:true,data}));};
 assert.deepEqual(await vietmapLocation.reverse([data.latitude,data.longitude]),data);
});
test('malformed coordinates, results and upstream errors do not turn into a successful selection',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{latitude:null,longitude:null,places:[],warnings:[]}}));await assert.rejects(vietmapLocation.place('auto:bad'),error=>error.status===502);
 globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{}}));await assert.rejects(vietmapLocation.autocomplete('test'),error=>error.status===502);
 globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Hết hạn mức'}),{status:503});await assert.rejects(vietmapLocation.place('auto:bad'),error=>error.status===503&&error.message==='Hết hạn mức');
});
