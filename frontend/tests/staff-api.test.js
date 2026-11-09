import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { staffApi } from '../src/services/staff.js';
const original = { fetch: globalThis.fetch, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage };
globalThis.sessionStorage = { getItem: () => 'staff-token' };
globalThis.localStorage = { getItem: () => null };
after(() => Object.assign(globalThis, original));
const detail = { summary: { registrationId: 12, name: 'Real record contract', status: 'PENDING' }, photos: [], documents: [], history: [] };
test('staff detail and binary files use authenticated implemented routes', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/staff/verifications/12');
    assert.equal(options.headers.Authorization, 'Bearer staff-token');
    return new Response(JSON.stringify({ success: true, data: detail }));
  };
  assert.deepEqual(await staffApi.detail(undefined, '12'), detail);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/staff/verifications/12/files/34');
    assert.equal(options.headers.Authorization, 'Bearer staff-token');
    return new Response(new Blob(['%PDF-test'], { type: 'application/pdf' }));
  };
  assert.equal((await staffApi.file(12,34)).type,'application/pdf');
});
test('staff reviews are POSTed, not local fake mutations', async () => {
  globalThis.fetch = async (url,options) => {
    assert.equal(url,'/api/staff/verifications/12/review');
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{decision:'APPROVE',note:'Checked',assignmentVersion:3});
    return new Response(JSON.stringify({success:true,data:{...detail,summary:{...detail.summary,status:'APPROVED'}}}));
  };
  assert.equal((await staffApi.review(12,'APPROVE','Checked',undefined,undefined,3)).summary.status,'APPROVED');
});

test('review cannot omit the server assignment version and preserves authorization failures', async () => {
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({success:false,message:'Bạn không còn được phân công.'}),{status:404});};
  for(const version of [undefined,null,-1,'1']) await assert.rejects(staffApi.review(12,'APPROVE','Checked',undefined,undefined,version),error=>error.status===409);
  assert.equal(calls,0);
  await assert.rejects(staffApi.review(12,'APPROVE','Checked',undefined,undefined,2),error=>error.status===404);
  assert.equal(calls,1);
});
test('invalid IDs and malformed/error responses never fall back to sample records', async () => {
  globalThis.fetch = async () => { throw new Error('Must not fetch'); };
  for(const id of [null,'VR-101','abc','0','-1']) await assert.rejects(staffApi.detail(undefined,id),error=>error.status===400);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:true,data:{}}));
  await assert.rejects(staffApi.dashboard(),error=>error.status===502);
  await assert.rejects(staffApi.verifications(),error=>error.status===502);
  await assert.rejects(staffApi.detail(undefined,12),error=>error.status===502);
  globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Failure'}),{status:500});
  await assert.rejects(staffApi.detail(undefined,12),error=>error.status===500);
});

test('supplement requests persist via review API and accept the new status', async () => {
  const reply = { ...detail, summary: { ...detail.summary, status: 'NEEDS_SUPPLEMENT' }, reasonNote: 'Vui lòng chụp rõ giấy tờ sở hữu.' };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/staff/verifications/12/review');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer staff-token');
    assert.deepEqual(JSON.parse(options.body), { decision: 'REQUEST_SUPPLEMENT', note: reply.reasonNote, assignmentVersion:3 });
    return new Response(JSON.stringify({ success: true, data: reply }));
  };
  assert.deepEqual(await staffApi.review(12, 'REQUEST_SUPPLEMENT', reply.reasonNote,undefined,undefined,3), reply);
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: [reply.summary] }));
  assert.equal((await staffApi.verifications())[0].status, 'NEEDS_SUPPLEMENT');
});
