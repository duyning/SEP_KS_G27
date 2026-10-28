import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { accommodationApi, accommodationQuery } from '../src/services/accommodations.js';
import { paginationRange } from '../src/services/pagination.js';
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; });

test('public listing preserves zero-based page and encodes filters without requiring a session', async () => {
  const controller = new AbortController();
  const query = accommodationQuery({page:0,size:6,q:'Tân Xã & Studio',location:'tan-xa',sort:'price-asc'});
  const page = {items:[],page:0,size:6,totalElements:0,totalPages:0};
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url, 'http://test.local');
    assert.equal(parsed.pathname, '/api/properties/search');
    assert.equal(parsed.searchParams.get('page'), '0');
    assert.equal(parsed.searchParams.get('q'), 'Tân Xã & Studio');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.signal, controller.signal);
    return new Response(JSON.stringify({success:true,data:page}));
  };
  assert.deepEqual(await accommodationApi.list(query, controller.signal), page);
});
test('errors and malformed responses never become fixture results', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({success:false,message:'Server failure'}), {status:500});
  await assert.rejects(accommodationApi.list(''), error => error.status === 500);
  globalThis.fetch = async () => new Response(JSON.stringify({success:true,data:[]}));
  await assert.rejects(accommodationApi.list(''), error => error.status === 502);
  globalThis.fetch = async () => new Response(JSON.stringify({success:true,data:{items:[null],page:0,size:6,totalElements:1,totalPages:1}}));
  await assert.rejects(accommodationApi.list(''), error => error.status === 502);
  globalThis.fetch = async () => { throw new Error('Offline'); };
  await assert.rejects(accommodationApi.list(''), error => error.status === 0);
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
  await assert.rejects(accommodationApi.list(''), error => error.name === 'AbortError');
});
test('summary links address actual property and room type IDs; hidden records remain 404', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/properties/12/room-types/34/details');
    return new Response(JSON.stringify({success:false,message:'No longer public'}), {status:404});
  };
  await assert.rejects(accommodationApi.detail(12,34), error => error.status === 404);
  for (const id of [null, 'abc', -1, '0']) await assert.rejects(accommodationApi.detail(12,id), error => error.status === 400);
});

test('detail uses the extended database contract without fabricating missing fields', async () => {
  const summary = {propertyId:12,roomTypeId:34,propertyName:'Actual property',roomTypeName:'Actual room',address:'Public address',imageUrl:null,price:2000000,areaSqm:25,verificationStatus:'APPROVED',availableRooms:0};
  const details = {summary,gallery:[],capacity:null,deposit:null,amenities:[],propertyAmenities:[],selectedRules:[],similar:[],publicContact:null,reviews:{averageRating:null,totalReviews:0,ratingCounts:[0,0,0,0,0],latest:[]}};
  globalThis.fetch = async (url, options) => {
    assert.equal(url,'/api/properties/12/room-types/34/details');
    assert.equal(options.headers.Authorization,undefined);
    return new Response(JSON.stringify({success:true,data:details}));
  };
  const data = await accommodationApi.detail(12,34);
  assert.equal(data.propertyName,'Actual property');
  assert.equal(data.deposit,null);
  assert.equal(data.reviews.averageRating,null);
  const publicContact = {phone:'0900000001',zaloPhone:'+84900000002'};
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{...details,publicContact}}));
  assert.deepEqual((await accommodationApi.detail(12,34)).publicContact,publicContact);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{...details,publicContact:{phone:'javascript:alert(1)',zaloPhone:null}}}));
  await assert.rejects(accommodationApi.detail(12,34),error=>error.status===502);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{...details,reviews:{}}}));
  await assert.rejects(accommodationApi.detail(12,34), error=>error.status===502);
});
test('pagination stays bounded for large database result sets', () => {
  const pages = paginationRange(50000,100000);
  assert.ok(pages.length <= 9);
  assert.equal(pages[0],1);
  assert.equal(pages.at(-1),100000);
  assert.ok(pages.includes(50000));
  assert.deepEqual(paginationRange(1,1),[1]);
});
