import test from 'node:test';
import assert from 'node:assert/strict';
import {proxyFailureRecord} from '../scripts/api-proxy.mjs';

test('proxy diagnostics identify upstream socket failures without recording private credentials or content',()=>{
 const entry=proxyFailureRecord({code:'EACCES',message:'private error'},
   {method:'GET',url:'/api/community/posts/feed?q=private+search',headers:{Authorization:'Bearer secret'},body:'private content'},
   'http://user:password@127.0.0.1:8081/private?key=secret');
 assert.equal(entry.code,'EACCES');assert.equal(entry.path,'/api/community/posts/feed');assert.equal(entry.target,'http://127.0.0.1:8081');
 assert.equal(entry.method,'GET');assert.equal(Number.isNaN(Date.parse(entry.at)),false);
 assert.doesNotMatch(JSON.stringify(entry),/secret|password|private|Authorization/);
});
