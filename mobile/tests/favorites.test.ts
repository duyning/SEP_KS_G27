/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import type { FavoriteItem, FavoritesApi } from '../src/services/favorites';
const require = createRequire(import.meta.url), ts = require('typescript');
function compile(path: string, bindings: Record<string, unknown>) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, Error, AbortController, setTimeout, clearTimeout, ...bindings });
  return module.exports;
}
function apiModule(client: (url: string, init: RequestInit) => Promise<{ response: Response; result: unknown }> = async () => { throw new Error('unexpected HTTP'); }) {
  return compile('../src/services/favorites.ts', { require: () => ({ getApiBase: () => 'https://api.example.test', requestJson: client }) }) as typeof import('../src/services/favorites');
}
const item = (id: number): FavoriteItem => ({ favoriteId: id + 100, roomTypeId: id, available: true, accommodation: { propertyId: 7, roomTypeId: id, roomTypeName: `Type ${id}`, propertyName: 'Property', price: 3000000, areaSqm: 25, availableRooms: 1, verificationStatus: 'APPROVED' } });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function fixture(count = 3, getToken = async (): Promise<string | null> => 'account-A-token') {
  const models = apiModule();
  const { FavoritesStore } = compile('../src/services/favorites-store.ts', { require: (name: string) => name === './favorites' ? models : { tokenStore: { get: getToken } } }) as typeof import('../src/services/favorites-store');
  let rows = Array.from({ length: count }, (_, i) => item(i + 1));
  const pages: number[] = [], removed: number[] = [], saved: number[] = [];
  let unauthorized = 0;
  const api: FavoritesApi = {
    list: async page => { pages.push(page); return { items: rows.slice(page * 15, (page + 1) * 15), page, size: 15, totalElements: rows.length, totalPages: Math.ceil(rows.length / 15) }; },
    states: async ids => Object.fromEntries(rows.filter(row => ids.includes(row.roomTypeId)).map(row => [row.roomTypeId, row.favoriteId])),
    save: async id => { saved.push(id); const value = item(id); rows.push(value); return value; },
    remove: async id => { removed.push(id); rows = rows.filter(row => row.favoriteId !== id); },
  };
  const store = new FavoritesStore(true, api, getToken, () => { unauthorized++; }, 'account-A');
  return { store, api, models, pages, removed, saved, FavoritesStore, unauthorized: () => unauthorized };
}
test('list API uses bearer pagination and preserves unavailable saved references', async () => {
  const models = apiModule(async (url, init) => {
    assert.equal(url, 'https://api.example.test/api/favorites?page=2&size=15');
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer token'); assert.equal(init.credentials, 'omit');
    return { response: new Response(null, { status: 200 }), result: { success: true, data: { items: [{ favoriteId: 9, roomTypeId: 2, available: false, accommodation: null }], page: 2, size: 15, totalElements: 31, totalPages: 3 } } };
  });
  const data = await models.favoritesApi.list(2, 'token'); assert.equal(data.totalElements, 31); assert.equal(data.items[0].accommodation, null); assert.equal(data.items[0].favoriteId, 9);
});
test('state queries batch at 50 and server rejection is never treated as an empty success', async () => {
  const sizes: number[] = [];
  const models = apiModule(async url => {
    const ids = new URL(url).searchParams.get('roomTypeIds')!.split(',').map(Number); sizes.push(ids.length);
    return { response: new Response(null, { status: 200 }), result: { success: true, data: { items: ids.map(id => ({ roomTypeId: id, favoriteId: id + 100 })) } } };
  });
  const states = await models.favoritesApi.states(Array.from({ length: 121 }, (_, i) => i + 1), 'token'); assert.deepEqual(sizes, [50, 50, 21]); assert.equal(states[121], 221);
  const failed = apiModule(async () => ({ response: new Response(null, { status: 401 }), result: { success: false, message: 'Expired' } }));
  await assert.rejects(failed.favoritesApi.list(0, 'token'), { status: 401 });
});
test('all subscribers receive one shared optimistic state and authoritative favorite ID', async () => {
  const f = fixture(0); let changesA = 0, changesB = 0;
  f.store.subscribe(() => changesA++); f.store.subscribe(() => changesB++);
  const pending = deferred<FavoriteItem>(); f.api.save = async () => pending.promise;
  const request = f.store.toggle(7); assert.equal(f.store.getSnapshot().states[7], -1); assert.equal(f.store.getSnapshot().pending[7], true);
  pending.resolve(item(7)); await request;
  assert.equal(f.store.getSnapshot().states[7], 107); assert.equal(f.store.getSnapshot().pending[7], undefined); assert.equal(changesA, changesB); assert.ok(changesA > 1);
});
test('rapid repeated taps issue a single save and never DELETE an optimistic -1', async () => {
  const f = fixture(0); const pending = deferred<FavoriteItem>(); let calls = 0;
  f.api.save = async () => { calls++; return pending.promise; };
  const first = f.store.toggle(1); await f.store.toggle(1); await tick(); assert.equal(calls, 1); assert.equal(f.removed.length, 0);
  pending.resolve(item(1)); await first;
});
test('failed removal restores the heart and keeps the original list and total', async () => {
  const f = fixture(); await f.store.refresh(); f.api.remove = async () => { throw new Error('offline'); };
  await assert.rejects(f.store.toggle(1), /offline/);
  assert.equal(f.store.getSnapshot().states[1], 101); assert.equal(f.store.getSnapshot().items.length, 3); assert.equal(f.store.getSnapshot().total, 3); assert.ok(f.store.getSnapshot().mutationError);
});
test('stale state hydration cannot resurrect a successfully removed favorite', async () => {
  const f = fixture(); await f.store.refresh(); const pending = deferred<Record<number, number>>(); f.api.states = async () => pending.promise;
  const hydrate = f.store.hydrate([1]); await tick(); await f.store.toggle(1); pending.resolve({ 1: 101 }); await hydrate;
  assert.equal(f.store.getSnapshot().states[1], undefined); assert.equal(f.store.getSnapshot().items.some(value => value.roomTypeId === 1), false);
});
test('stopping an account invalidates pending token acquisition before any mutation is sent', async () => {
  const token = deferred<string | null>(); const f = fixture(0, () => token.promise);
  const request = f.store.toggle(1); f.store.stop(); token.resolve('account-B-token'); await request;
  assert.equal(f.saved.length, 0); assert.equal(Object.keys(f.store.getSnapshot().states).length, 0);
  const other = new f.FavoritesStore(true, f.api, async () => 'account-B-token', undefined, 'account-B'); assert.equal(other.getSnapshot().items.length, 0);
});
test('refresh failure retains cached records and is distinct from a real empty list', async () => {
  const f = fixture(); await f.store.refresh(); f.api.list = async () => { throw new Error('offline'); }; await f.store.refresh();
  assert.equal(f.store.getSnapshot().items.length, 3); assert.equal(f.store.getSnapshot().loaded, true); assert.ok(f.store.getSnapshot().error);
  const empty = fixture(0); await empty.store.refresh(); assert.equal(empty.store.getSnapshot().items.length, 0); assert.equal(empty.store.getSnapshot().error, null);
});
test('offset pagination revalidates loaded pages after removal without skipping shifted rows', async () => {
  const f = fixture(32); await f.store.refresh(); await f.store.loadMore(); assert.equal(f.store.getSnapshot().items.length, 30);
  await f.store.toggle(1); await f.store.loadMore(); await f.store.loadMore();
  const ids = [...f.store.getSnapshot().items].map(value => value.roomTypeId);
  assert.deepEqual(ids, Array.from({ length: 31 }, (_, i) => i + 2)); assert.deepEqual(f.pages, [0, 1, 0, 1, 2]); assert.equal(f.store.getSnapshot().total, 31);
});
test('simultaneous pagination callbacks do not duplicate a page request', async () => {
  const f = fixture(20); await f.store.refresh(); await Promise.all([f.store.loadMore(), f.store.loadMore(), f.store.loadMore()]); assert.deepEqual(f.pages, [0, 1]); assert.equal(f.store.getSnapshot().items.length, 20);
});
test('expired token asks the existing auth flow to revalidate and shows an error', async () => {
  const f = fixture(); f.api.list = async () => { throw new f.models.FavoritesError('Expired', 401); }; await f.store.refresh(); assert.equal(f.unauthorized(), 1); assert.equal(f.store.getSnapshot().loaded, false); assert.ok(f.store.getSnapshot().error);
});
test('disabled roles and guests never call Favorites API', async () => {
  const f = fixture(); const store = new f.FavoritesStore(false, f.api, async () => 'staff-token'); await store.refresh(); await store.hydrate([1]); await store.toggle(1); assert.equal(f.pages.length, 0); assert.equal(f.saved.length, 0);
});

test('initial list invalidated by an overlapping mutation is automatically retried after it settles', async () => {
  const f = fixture(1); const page = deferred<Awaited<ReturnType<FavoritesApi['list']>>>(); let calls = 0;
  const original = f.api.list;
  f.api.list = async (...args) => { calls++; if (calls === 1) return page.promise; return original(...args); };
  await f.store.hydrate([1]); const load = f.store.refresh(); await tick(); await f.store.toggle(1);
  page.resolve({ items: [item(1)], page: 0, size: 15, totalElements: 1, totalPages: 1 }); await load; await tick();
  assert.equal(calls, 2); assert.equal(f.store.getSnapshot().loaded, true); assert.equal(f.store.getSnapshot().items.length, 0); assert.equal(f.store.getSnapshot().loading, false);
});

