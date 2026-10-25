import test from 'node:test';import assert from 'node:assert/strict';
import {verificationLocation,attachmentSize} from '../src/services/verification-detail.js';
test('staff map uses only explicit valid coordinates, never a default neighborhood pin',()=>{
 for(const value of [null,{}, {latitude:'',longitude:''},{latitude:'NaN',longitude:'105'},{latitude:'91',longitude:'105'},{latitude:'21',longitude:''}]){
  const result=verificationLocation({address:'Địa chỉ chủ trọ'},value);assert.equal(result.coordinates,null);assert.ok(result.mapsUrl.includes(encodeURIComponent('Địa chỉ chủ trọ')));
 }
 const result=verificationLocation({address:'Actual address'},{latitude:'21.0188',longitude:'105.5215'});assert.deepEqual(result.coordinates,[21.0188,105.5215]);assert.ok(result.mapsUrl.includes('21.0188%2C105.5215'));
 assert.equal(verificationLocation({},null).mapsUrl,null);
});
test('map links encode untrusted address text as a query rather than opening supplied URLs',()=>{const result=verificationLocation({address:'javascript:alert(1)&query=other'},null);assert.ok(result.mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query=javascript'));assert.ok(result.mapsUrl.includes('%26query%3Dother'));});
test('file sizes reflect actual persisted bytes and keep missing legacy metadata unknown',()=>{for(const value of [undefined,null,-1,'2048',NaN,Infinity])assert.equal(attachmentSize(value),null);assert.equal(attachmentSize(0),'0 B');assert.equal(attachmentSize(512),'512 B');assert.equal(attachmentSize(2048),'2 KB');assert.equal(attachmentSize(2621440),'2,5 MB');});
