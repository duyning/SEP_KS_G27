/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript'), module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/services/room-search.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports });
const api = module.exports as typeof import('../src/services/room-search');
test('counts advanced filter groups rather than amenities, keyword or sort', () => {
  assert.equal(api.filterGroupCount({ q: 'Tân Xã', sort: 'price-asc', amenities: 'camera,elevator', type: 'khep-kin', price: '15-25', location: 'tan-xa', availableOnly: true }), 5);
  assert.equal(api.filterGroupCount({ q: 'Tân Xã', sort: 'price-asc' }), 0);
});
test('canonical keys deduplicate amenity order and preserve accented keywords', () => {
  assert.equal(api.searchKey({ q: '  Tân Xã ', amenities: 'camera,elevator,camera' }), api.searchKey({ amenities: 'elevator,camera', q: 'Tân Xã' }));
  assert.equal(JSON.parse(api.searchKey({ q: 'Tân Xã' })).q, 'Tân Xã');
});
test('category changes preserve price, location, amenities and availability', () => {
  const original = { type: 'gac-lung', price: '25-35', location: 'tan-xa', amenities: 'camera', availableOnly: true };
  const all = api.applyCategory(original, 'all');
  assert.equal(all.type, 'all'); assert.equal(all.price, '25-35'); assert.equal(all.location, 'tan-xa'); assert.equal(all.amenities, 'camera'); assert.equal(all.availableOnly, true); assert.equal(original.type, 'gac-lung');
  assert.equal(api.applyCategory(original, 'con-phong').type, 'gac-lung');
});
test('unsupported filter values never enter applied query', () => {
  const normalized = api.normalizeFilters({ type: 'studio', amenities: 'laundry,camera,wifi', price: '0-6000000', sort: 'area-asc' as never });
  assert.equal(normalized.type, 'all'); assert.equal(normalized.price, 'all'); assert.equal(normalized.sort, 'newest'); assert.equal(normalized.amenities, 'camera');
});
test('draft changes and reset cannot mutate applied filters', () => {
  const applied = Object.freeze({ ...api.defaultFilters(), type: 'khep-kin', price: 'under-15' }); const draft: import('../src/services/accommodations').SearchFilters = { ...applied }; draft.type = 'gac-lung';
  assert.equal(applied.type, 'khep-kin'); assert.equal(applied.price, 'under-15'); assert.equal(api.filterGroupCount(api.defaultFilters()), 0);
});

