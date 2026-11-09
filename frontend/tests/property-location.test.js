import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {applyLocationSuggestion,lookupPropertyLocation,nearbyPlaces} from '../src/services/property-location.js';
const fetch=globalThis.fetch;
after(()=>globalThis.fetch=fetch);

test('location suggestions update only editable fields and preserve missing suggestions and unrelated data',()=>{
  const form={latitude:'21',longitude:'105',addressDetail:'Old address',commune:'Thạch Hòa',nearby:'Owner note',photos:['keep'],price:2500000};
  const data={latitude:21.01,longitude:105.02,addressDetail:'OSM address',commune:null,nearby:''};
  const next=applyLocationSuggestion(form,data,['latitude','longitude','addressDetail','commune','nearby']);
  assert.equal(next.addressDetail,'OSM address');assert.equal(next.commune,'Thạch Hòa');assert.equal(next.nearby,'Owner note');assert.equal(next.latitude,'21.01');
  assert.equal(next.photos,form.photos);assert.equal(next.price,form.price);assert.equal(form.addressDetail,'Old address');
  assert.deepEqual(applyLocationSuggestion(form,data,[]),form);
  assert.equal(applyLocationSuggestion(form,data,['latitude']).latitude,'21');
});
test('host lookup uses the authenticated existing API client; nearby reads are public and cancellable',async()=>{
  globalThis.sessionStorage={getItem:()=>null};globalThis.localStorage={getItem:()=>null};
  const controller=new AbortController();
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/host/property-registrations/location/resolve');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{input:'https://maps.app.goo.gl/example'});return new Response(JSON.stringify({success:true,data:{latitude:21,longitude:105,places:[],warnings:[]}}));};
  assert.equal((await lookupPropertyLocation('https://maps.app.goo.gl/example',controller.signal)).latitude,21);
  globalThis.fetch=async(url,options)=>{assert.ok(url.startsWith('/api/properties/location/nearby?'));assert.equal(options.signal,undefined);assert.equal(options.headers.Authorization,undefined);return new Response(JSON.stringify({success:true,data:{places:[]}}));};
  assert.deepEqual(await nearbyPlaces(21,105,controller.signal),{places:[]});
});

test('automatic maps share nearby requests and one cancelled consumer cannot cancel another map',async()=>{
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({success:true,data:{places:[]}}));};
  const controller=new AbortController();
  const first=nearbyPlaces(22.1234,106.1234,controller.signal);
  const second=nearbyPlaces(22.1234,106.1234);
  controller.abort();await assert.rejects(first,error=>error.name==='AbortError');
  assert.deepEqual(await second,{places:[]});
  assert.deepEqual(await nearbyPlaces(22.1234,106.1234),{places:[]});
  assert.equal(calls,1);
});
