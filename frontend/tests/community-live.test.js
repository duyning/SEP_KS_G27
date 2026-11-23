import test from 'node:test';
import assert from 'node:assert/strict';
import { readCommunityStream } from '../src/services/community-live.js';

test('SSE decoder handles partial UTF-8 frames, CRLF and multiple events', async () => {
  const bytes = new TextEncoder().encode('event: community\r\ndata:{"type":"heartbeat"}\r\n\r\nevent: community\ndata:{"type":"posts","postId":7}\n\ndata:{"type":"notifications","label":"Cộng đồng"}\n\n');
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i+1)); controller.close(); } });
  const events = [];
  await readCommunityStream(stream, event => events.push(event), new AbortController().signal);
  assert.deepEqual(events, [{ type: 'posts', postId: 7 }, { type: 'notifications', label: 'Cộng đồng' }]);
});

test('Malformed frames do not prevent a later valid resync event', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data:broken\n\ndata:{"type":"resync"}\n\n')); controller.close(); } });
  const events = [];
  await readCommunityStream(stream, event => events.push(event), new AbortController().signal);
  assert.deepEqual(events, [{ type: 'resync' }]);
});
