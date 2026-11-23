/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/services/accommodations.ts', import.meta.url), 'utf8');
function load(fetcher: typeof fetch, token: string | null = null) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, require: () => ({ tokenStore: { get: async () => token } }),
    process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.test/' } }, URLSearchParams, URL, AbortController, setTimeout, clearTimeout, fetch: fetcher,
  });
  return module.exports as typeof import('../src/services/accommodations');
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

test('a slow AI response can finish after the default timeout when given a longer deadline', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const api = load(async (_input, init) => new Promise((resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    setTimeout(() => resolve(json({ success: true, data: { description: 'Gợi ý mô tả nhà trọ.' } })), 22_000);
  }));

  const slowDefault = assert.rejects(api.requestJson('https://api.example.test/slow', {}), /Máy chủ phản hồi quá lâu/);
  const aiResponse = api.requestJson('https://api.example.test/api/property-writing/description', { method: 'POST' }, { timeoutMs: 40_000 });
  context.mock.timers.tick(15_000);
  await slowDefault;
  context.mock.timers.tick(7_000);
  assert.equal((await aiResponse).result.data.description, 'Gợi ý mô tả nhà trọ.');
});

test('the longer deadline still bounds AI response-body parsing with a specific message', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const api = load(async (_input, init) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
      },
    });
    return new Response(body);
  });
  const result = assert.rejects(api.requestJson('https://api.example.test/api/property-writing/description', { method: 'POST' }, {
    timeoutMs: 40_000,
    timeoutMessage: 'AI phản hồi quá lâu.',
  }), /AI phản hồi quá lâu/);
  await Promise.resolve();
  context.mock.timers.tick(40_000);
  await result;
});

test('search sends server pagination and exact filter/sort contracts', async () => {
  const api = load(async input => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/api/properties/search');
    assert.equal(url.searchParams.get('page'), '2'); assert.equal(url.searchParams.get('size'), '15');
    assert.equal(url.searchParams.get('sort'), 'price-asc'); assert.equal(url.searchParams.get('price'), '15-25');
    assert.equal(url.searchParams.get('amenities'), 'airConditioner'); assert.equal(url.searchParams.get('q'), 'Tân Xã');
    return json({ success: true, data: { items: [], page: 2, size: 15, totalElements: 37, totalPages: 3 } });
  });
  const page = await api.fetchAccommodations({ page: 2, size: 15, sort: 'price-asc', price: '15-25', amenities: 'airConditioner', q: ' Tân Xã ' });
  assert.equal(page.totalElements, 37); assert.equal(page.totalPages, 3);
});
test('detail addresses the exact property and room type and rejects invalid or withdrawn links', async () => {
  let calls = 0;
  const api = load(async input => { calls++; assert.equal(String(input), 'https://api.example.test/api/properties/7/room-types/19/details'); return json({ success: false, message: 'Đã ngừng công khai' }, 404); });
  await assert.rejects(api.fetchAccommodationDetail(7, NaN), /không hợp lệ/); assert.equal(calls, 0);
  await assert.rejects(api.fetchAccommodationDetail(7, 19), /Đã ngừng công khai/);
});
test('favorite state batches over 50 IDs and merges all responses', async () => {
  const sizes: number[] = [];
  const api = load(async input => {
    const ids = new URL(String(input)).searchParams.get('roomTypeIds')!.split(',').map(Number); sizes.push(ids.length);
    return json({ success: true, data: { items: ids.map(id => ({ roomTypeId: id, favoriteId: id + 1000 })) } });
  }, 'token');
  const states = await api.fetchFavoriteStates(Array.from({ length: 121 }, (_, i) => i + 1));
  assert.deepEqual(sizes.sort((a, b) => a - b), [21, 50, 50]); assert.equal(Object.keys(states).length, 121); assert.equal(states[121], 1121);
});
test('favorite mutations require a session and reject false success envelopes', async () => {
  const guest = load(async () => { throw new Error('must not fetch'); });
  await assert.rejects(guest.toggleFavoriteApi(19), /đăng nhập/);
  const api = load(async () => json({ success: false }), 'token');
  await assert.rejects(api.toggleFavoriteApi(19), /Chưa thể lưu/);
  await assert.rejects(api.toggleFavoriteApi(19, 42), /Chưa thể xóa/);
});
test('viewing sends bearer and exact backend body; backend conflict remains visible', async () => {
  const input = { propertyId: 7, roomTypeId: 19, scheduledDate: '2026-11-13T09:00:00', contactName: 'Nguyễn An', contactPhone: '0912345678' };
  const api = load(async (url, init) => {
    assert.equal(url, 'https://api.example.test/api/viewings'); assert.equal(init?.method, 'POST');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer token'); assert.deepEqual(JSON.parse(String(init?.body)), input);
    return json({ success: false, message: 'Bạn đã có lịch chờ xác nhận.' }, 409);
  }, 'token');
  await assert.rejects(api.createViewing(input), /lịch chờ xác nhận/);
});
test('viewing dates use Vietnam calendar boundaries and reject invalid dates and past times', () => {
  const api = load(fetch);
  const now = Date.parse('2026-11-12T23:00:00+07:00');
  assert.equal(api.validateViewingTime('2026-11-13', '09:30', now), null);
  assert.ok(api.validateViewingTime('2026-11-12', '22:00', now));
  assert.ok(api.validateViewingTime('2026-12-13', '09:00', now));
  assert.ok(api.validateViewingTime('2026-02-30', '09:00', now));
  assert.ok(api.validateViewingTime('2026-11-13', '25:00', now));
});
test('caller cancellation is passed through to the network', async () => {
  const api = load(async (_, init) => new Promise((_, reject) => {
    const fail = () => reject(new Error('cancelled'));
    if (init?.signal?.aborted) fail(); else init?.signal?.addEventListener('abort', fail);
  }));
  const controller = new AbortController();
  const request = api.fetchAccommodations({}, controller.signal); controller.abort();
  await assert.rejects(request, /cancelled/);
});
