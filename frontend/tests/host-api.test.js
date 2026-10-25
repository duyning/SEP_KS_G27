import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { hostApi } from '../src/services/host.js';
const original = { fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage };
globalThis.sessionStorage = { getItem: () => 'test-token' };
globalThis.localStorage = { getItem: () => null };
after(() => Object.assign(globalThis, original));

test('eligibility is authoritative and malformed data never grants access', async()=>{
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'/api/host/property-registrations/eligibility');
    assert.equal(options.headers.Authorization,'Bearer test-token');
    return new Response(JSON.stringify({success:true,data:{canRegister:false,reason:'HAS_PROPERTY'}}));
  };
  assert.equal((await hostApi.registrationEligibility()).canRegister,false);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{canRegister:true,reason:'HAS_PROPERTY'}}));
  await assert.rejects(hostApi.registrationEligibility(),error=>error.status===502);
});
test('creating room type uses actual POST and rejects unconfirmed success',async()=>{
  const payload={propertyId:12,roomType:'Studio',price:2200000};
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'/api/host/room-types');assert.equal(options.method,'POST');
    assert.ok(options.body instanceof FormData);
    assert.deepEqual(JSON.parse(await options.body.get('details').text()),payload);
    return new Response(JSON.stringify({success:true,data:{...payload,roomTypeId:34,amenities:[]}}));
  };
  assert.equal((await hostApi.createRoomType(payload)).roomTypeId,34);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{}}));
  await assert.rejects(hostApi.createRoomType(payload),error=>error.status===502);
});

test('room type update uploads only selected images and retains explicitly owned image IDs',async()=>{
  const payload={propertyId:12,roomType:'Edited studio',retainedImageIds:[5]};
  const file=new File(['png-content'],'room.png',{type:'image/png'});
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'/api/host/room-types/34');assert.equal(options.method,'PUT');
    assert.equal(options.headers.Authorization,'Bearer test-token');
    assert.deepEqual(JSON.parse(await options.body.get('details').text()),payload);
    assert.equal(options.body.getAll('photos').length,1);
    return new Response(JSON.stringify({success:true,data:{...payload,roomTypeId:34,amenities:[],images:[]}}));
  };
  assert.equal((await hostApi.saveRoomType(34,payload,[file])).roomTypeId,34);
});
test('detail, image and deletion calls are scoped to the actual room type',async()=>{
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'/api/host/room-types/34');assert.equal(options.headers.Authorization,'Bearer test-token');
    return new Response(JSON.stringify({success:true,data:{roomTypeId:34,images:[],amenities:[]}}));
  };
  assert.equal((await hostApi.roomTypeDetail(34)).roomTypeId,34);
  globalThis.fetch=async(url)=>{assert.equal(url,'/api/host/room-types/34/images/5');return new Response(new Blob(['png'],{type:'image/png'}));};
  assert.equal((await hostApi.roomTypeImage(34,5)).type,'image/png');
  globalThis.fetch=async(url,options)=>{assert.equal(options.method,'DELETE');assert.equal(url,'/api/host/room-types/34');return new Response(JSON.stringify({success:true,data:null}));};
  assert.equal(await hostApi.deleteRoomType(34),null);
  await assert.rejects(hostApi.roomTypeDetail('bad'),error=>error.status===400);
});

test('property details use the owned endpoint and never replace errors with empty records', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/host/property?id=123');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(JSON.stringify({ success: true, data: { records: [] } }));
  };
  assert.deepEqual(await hostApi.property(undefined, '123'), { records: [] });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: { records: [{ name: 'Invalid' }] } }));
  await assert.rejects(hostApi.property(), error => error.status === 502);
  globalThis.fetch = async () => { throw new Error('Must not request invalid IDs'); };
  await assert.rejects(hostApi.property(undefined, 'abc'), error => error.status === 400);
});
test('property image requests carry authentication and validate the returned image type', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/host/property/photos/456');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(new Blob(['test bitmap'], { type: 'image/png' }));
  };
  assert.equal((await hostApi.propertyPhoto(456)).type, 'image/png');
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false }), { headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(hostApi.propertyPhoto(456), error => error.status === 502);
});

test('registration sends actual multipart files and accepts only a persisted pending record', async () => {
  const pending = { registrationId: 123, name: 'Owned registration', status: 'PENDING' };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/host/property-registrations');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.getAll('photos').length, 1);
    assert.equal(JSON.parse(await options.body.get('details').text()).name, pending.name);
    assert.ok(options.body.get('ownership'));
    return new Response(JSON.stringify({ success: true, data: pending }));
  };
  const file = new File(['content'], 'test.png', { type: 'image/png' });
  assert.deepEqual(await hostApi.submitRegistration({ name: pending.name, photos: [file], documents: { ownership: file, idCard: file } }), pending);
});
test('registration status distinguishes no pending record from errors and invalid success', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: null }));
  assert.equal(await hostApi.currentRegistration(), null);
  for (const data of [{}, { registrationId: 1, name: 'x', status: 'ACTIVE' }]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data }));
    await assert.rejects(hostApi.currentRegistration(), error => error.status === 502);
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Cannot save' }), { status: 500 });
  await assert.rejects(hostApi.submitRegistration({ photos: [], documents: {} }), error => error.status === 500);
});

test('viewings loads the authenticated owner endpoint without sample fallback', async () => {
  const empty = { properties: [], viewings: [], pendingRegistrationCount: 0 };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/host/viewings');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(JSON.stringify({ success: true, data: empty }));
  };
  assert.deepEqual(await hostApi.viewings(), empty);
});

test('invalid viewing payloads and failures never become no-property data', async () => {
  for (const data of [null, {}, { properties: [], viewings: [] }, { properties: [], viewings: [], pendingRegistrationCount: -1 }]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data }));
    await assert.rejects(hostApi.viewings(), error => error.status === 502);
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Database unavailable' }), { status: 500 });
  await assert.rejects(hostApi.viewings(), error => error.status === 500);
});
test('dashboard calls the implemented authenticated host endpoint', async () => {
  let called;
  const empty = { properties: [], recentViewings: [], roomTypeCount: 0, pendingViewingCount: 0, pendingRegistrationCount: 0 };
  globalThis.fetch = async (url, options) => { called = { url, options }; return new Response(JSON.stringify({ success: true, data: empty })); };
  assert.deepEqual(await hostApi.dashboard(), empty);
  assert.equal(called.url, '/api/host/dashboard');
  assert.equal(called.options.headers.Authorization, 'Bearer test-token');
});
test('invalid and failed responses never become empty dashboard data', async () => {
  for (const data of [null, {}, { properties: [], recentViewings: [] }]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data }));
    await assert.rejects(hostApi.dashboard(), error => error.status === 502);
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Server failure' }), { status: 500 });
  await assert.rejects(hostApi.dashboard(), error => error.status === 500);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(hostApi.dashboard(), error => error.status === 0);
});
test('room type list uses the real owner-scoped endpoint and selected property', async () => {
  let called;
  const empty = { properties: [], roomTypes: [], pendingRegistrationCount: 0 };
  globalThis.fetch = async (url, options) => { called = { url, options }; return new Response(JSON.stringify({ success: true, data: empty })); };
  assert.deepEqual(await hostApi.roomTypes(undefined, '123'), empty);
  assert.equal(called.url, '/api/host/room-types?propertyId=123');
  assert.equal(called.options.headers.Authorization, 'Bearer test-token');
});
test('invalid room type response or failed server response is not no-property data', async () => {
  for (const data of [null, {}, { properties: [], roomTypes: [], pendingRegistrationCount: -1 }]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data }));
    await assert.rejects(hostApi.roomTypes(), error => error.status === 502);
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'Database failure' }), { status: 500 });
  await assert.rejects(hostApi.roomTypes(), error => error.status === 500);
});
test('invalid property filters are rejected without issuing an API request', async () => {
  globalThis.fetch = async () => { throw new Error('Must not fetch'); };
  for (const propertyId of ['abc', '-1', '0', '../private', '2147483648']) {
    await assert.rejects(hostApi.roomTypes(undefined, propertyId), error => error.status === 400);
  }
});
