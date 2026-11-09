import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionDestination} from '../src/routing/session-destination.js';
test('new actor never resumes another role portal after authentication',()=>{
 assert.equal(sessionDestination({role:'STAFF'},'/host/property'),'/staff');
 assert.equal(sessionDestination({role:'ROOM_HOST'},'/staff/verifications/detail?id=3'),'/host');
 assert.equal(sessionDestination({role:'USER'},'/admin'),'/');
 assert.equal(sessionDestination({role:'ADMIN'}),'/admin');
 assert.equal(sessionDestination({role:'STAFF'},'/admin?view=accounts'),'/staff');
});
test('authorized deep links preserve query/hash, while unsafe and auth targets return home',()=>{
 assert.equal(sessionDestination({role:'STAFF'},'/staff/verifications/detail?id=3#docs'),'/staff/verifications/detail?id=3#docs');
 assert.equal(sessionDestination({role:'ADMIN'},'/staff/verifications/detail?id=3'),'/staff/verifications/detail?id=3');
 assert.equal(sessionDestination({role:'ROOM_HOST'},'/host-property.html?id=3'),'/host/property?id=3');
 for(const from of ['//evil.test','https://evil.test','/\\evil.test','/login','/register?from=/admin','/unknown','/admin\n/secret','/%2f%2fevil.test'])assert.equal(sessionDestination({role:'ADMIN'},from),'/admin',from);
});
