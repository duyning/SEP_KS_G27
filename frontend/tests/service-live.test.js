import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('service background updates pause when hidden, coalesce reads and abort on unmount', async () => {
  let cleanup, tick, resolve, signal, calls = 0, applied = 0;
  const window = new EventTarget(), document = new EventTarget(); document.visibilityState = 'visible';
  const source = readFileSync(new URL('../src/hooks/useServiceLive.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export default function', 'function');
  const context = vm.createContext({ window, document, AbortController, SERVICE_UPDATED: 'changed', useRef: () => ({}), useEffect: effect => { cleanup = effect(); }, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => {} });
  vm.runInContext(source + '\nthis.hook = useServiceLive;', context);
  context.hook(s => { calls++; signal = s; return new Promise(r => { resolve = r; }); }, () => { applied++; });
  document.visibilityState = 'hidden'; await tick(); assert.equal(calls, 0);
  document.visibilityState = 'visible'; const pending = tick(); await tick(); assert.equal(calls, 1);
  resolve({}); await pending; assert.equal(applied, 1);
  const late = tick(); cleanup(); assert.equal(signal.aborted, true);
  resolve({}); await late; assert.equal(applied, 1);
  window.dispatchEvent(new Event('focus')); assert.equal(calls, 2);
});
