import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { availabilityPresentation, roomAvailability } from '../src/services/availability.js';
import { hostApi } from '../src/services/host.js';

test('availability labels distinguish missing, fresh, expired and invalid dates without inventing counts', () => {
  assert.equal(availabilityPresentation({}).state, 'UNCONFIRMED');
  assert.equal(availabilityPresentation({availabilityConfirmedAt:'invalid',availabilityConfirmationStatus:'CURRENT'}).state, 'UNCONFIRMED');
  const value={availabilityConfirmedAt:'2026-11-11T13:00:00Z',availabilityConfirmationStatus:'CURRENT'};
  assert.match(availabilityPresentation(value).text, /20:00/);
  assert.match(availabilityPresentation({...value,availabilityConfirmationStatus:'STALE',availableRooms:0}).text, /Quá 7 ngày/);
  assert.equal(availabilityPresentation({...value,availabilityConfirmationStatus:'UNKNOWN'}).state,'UNCONFIRMED');
});

const original={fetch:globalThis.fetch, sessionStorage:globalThis.sessionStorage, localStorage:globalThis.localStorage};
test('physical room confirmation handles old Vietnam dates, the seven-day boundary and server status', () => {
  const now=Date.parse('2026-11-11T13:00:00Z');
  assert.equal(roomAvailability({confirmedAt:'2026-10-25T22:39:00'},now).availabilityConfirmationStatus,'STALE');
  assert.match(availabilityPresentation(roomAvailability({confirmedAt:'2026-10-25T22:39:00'},now)).text,/25\/10\/2026/);
  assert.equal(roomAvailability({confirmedAt:'2026-11-04T20:00:00'},now).availabilityConfirmationStatus,'CURRENT');
  assert.equal(roomAvailability({confirmedAt:'2026-11-04T19:59:59'},now).availabilityConfirmationStatus,'STALE');
  assert.equal(roomAvailability({confirmedAt:null},now).availabilityConfirmationStatus,'UNCONFIRMED');
  assert.equal(roomAvailability({confirmedAt:'invalid'},now).availabilityConfirmationStatus,'UNCONFIRMED');
  assert.equal(roomAvailability({confirmedAt:'2026-10-25T22:39:00',confirmationStatus:'CURRENT'},now).availabilityConfirmationStatus,'CURRENT');
});
after(()=>Object.assign(globalThis,original));
test('confirmation uses authenticated POST without trusting client counts and rejects malformed success or server failure', async () => {
  globalThis.sessionStorage={getItem:()=> 'availability-test-token'};
  globalThis.localStorage={getItem:()=>null};
  const value={roomTypeId:12,totalRooms:5,vacantRooms:2,availabilityConfirmedAt:'2026-11-11T13:00:00Z',availabilityConfirmationStatus:'CURRENT',availabilityStale:false};
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'/api/host/room-types/12/availability-confirmation');
    assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer availability-test-token');assert.equal(options.body,undefined);
    return new Response(JSON.stringify({success:true,data:value}));
  };
  assert.deepEqual(await hostApi.confirmAvailability(12),value);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{...value,availabilityConfirmedAt:null}}));
  await assert.rejects(hostApi.confirmAvailability(12),error=>error.status===502);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Không có quyền'}),{status:403});
  await assert.rejects(hostApi.confirmAvailability(12),error=>error.status===403);
});
