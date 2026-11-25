import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPageWithRetry,isPageLoadError} from '../src/routing/lazy-page.js';

test('temporary route fetch failure recovers without reloading or retrying successful modules',async()=>{
  let attempts=0;const waits=[],page={default:()=>null};
  const result=await loadPageWithRetry(async()=>{if(++attempts===1)throw new TypeError('Failed to fetch dynamically imported module: /home.js');return page;},{wait:async ms=>waits.push(ms)});
  assert.equal(result,page);assert.equal(attempts,2);assert.deepEqual(waits,[350]);
  attempts=0;await loadPageWithRetry(async()=>{attempts++;return page;},{wait:async()=>assert.fail('Successful import must not wait')});assert.equal(attempts,1);
});
test('persistent route fetch failure stops after three attempts and preserves original error',async()=>{
  let attempts=0;const error=new TypeError('error loading dynamically imported module'),waits=[];
  await assert.rejects(loadPageWithRetry(async()=>{attempts++;throw error;},{wait:async ms=>waits.push(ms)}),e=>e===error);
  assert.equal(attempts,3);assert.deepEqual(waits,[350,1000]);
});
test('syntax and runtime failures are not mistaken for network failures',async()=>{
  for(const error of [new SyntaxError('Unexpected token'),new TypeError('Cannot read properties of null'),new Error('Access denied')]){
    let attempts=0;assert.equal(isPageLoadError(error),false);
    await assert.rejects(loadPageWithRetry(async()=>{attempts++;throw error;},{wait:async()=>assert.fail('Do not retry application bugs')}),e=>e===error);
    assert.equal(attempts,1);
  }
  assert.equal(isPageLoadError(new TypeError('Importing a module script failed.')),true);
});
